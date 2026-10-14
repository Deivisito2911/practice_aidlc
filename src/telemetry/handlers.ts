import { randomUUID } from 'node:crypto';
import type { Context } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SQSClient } from '@aws-sdk/client-sqs';
import { KMSClient } from '@aws-sdk/client-kms';
import { DynamoEventStore, SqsQueue, type EventStore, type Queue } from './adapters.js';
import { validateEvent, ValidationError, type InboundMessage } from './model.js';
import {
  acceptMessage,
  IdempotencyConflict,
  recoverPending,
  createBudget,
  withinBudget,
  type ServiceOptions,
} from './service.js';
import { operateManually, type ManualOperation } from './manual-recovery.js';
import { KmsMac } from './recovery-preview.js';
import { emitMetric, observeHttp, observeService } from './observability.js';

const validIdentifier = /^[A-Za-z0-9._:-]{1,128}$/;
export function createTelemetryHandler(
  store: EventStore,
  queue: Queue,
  options: ServiceOptions = {},
) {
  const clock = options.clock ?? (() => new Date()),
    uuid = options.uuid ?? randomUUID;
  return async (event: unknown, context?: Context): Promise<Record<string, unknown>> => {
    const receivedAtMs = clock().getTime();
    const value = event && typeof event === 'object' ? (event as Record<string, unknown>) : {};
    const observer = options.observe ?? observeService;
    const invocationRequestId = context?.awsRequestId;
    const reply = (statusCode: number, body: unknown, correlationId: string) => {
      const seconds = (clock().getTime() - receivedAtMs) / 1000;
      if (!Number.isFinite(seconds) || seconds < 0)
        emitMetric('MeasurementInvalid', 1, { correlationId, invocationRequestId });
      observeHttp(
        statusCode,
        correlationId,
        invocationRequestId,
        Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined,
      );
      return {
        statusCode,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      };
    };
    if (value.source === 'aws.events' && value['detail-type'] === 'Scheduled Event') {
      const runOptions = {
        ...options,
        clock,
        observe: observer,
        remainingTimeMs: () => context?.getRemainingTimeInMillis() ?? 20000,
      };
      const budget = createBudget(runOptions);
      try {
        if (store.pendingSnapshot) {
          const snapshot = await withinBudget(budget, (signal) =>
            store.pendingSnapshot!(clock().toISOString(), signal),
          );
          emitMetric('OutboxPendingCount', snapshot.count, {
            partial: snapshot.complete === false,
          });
          emitMetric('OutboxOldestPendingAge', snapshot.oldestAgeSeconds, {
            partial: snapshot.complete === false,
          });
          if (snapshot.complete === false)
            emitMetric('PendingMeasurementPartial', 1, { partial: true });
        }
        const processed = await recoverPending(store, queue, { ...runOptions, budget });
        let ttlEligible: number | undefined;
        if (clock().getUTCMinutes() === 0 && store.ttlEligible) {
          const ttl = await withinBudget(budget, (signal) =>
            store.ttlEligible!(Math.floor(clock().getTime() / 1000), 1001, signal),
          );
          ttlEligible = ttl.count;
          emitMetric('TtlEligibleUndeleted', ttl.count, { partial: !ttl.complete });
          if (!ttl.complete) emitMetric('TtlMeasurementPartial', 1, { partial: true });
        }
        emitMetric('ScheduledRecoveryInvocation', 1, { invocationRequestId });
        return { processed, ...(ttlEligible === undefined ? {} : { ttlEligible }) };
      } catch (error) {
        emitMetric('ScheduledRecoveryFailed', 1, {
          invocationRequestId,
          cause: error instanceof Error ? error.name : 'unknown',
        });
        throw error;
      } finally {
        budget.close();
      }
    }
    if (value.operation === 'manual-recovery') {
      if (!isManual(value) || !invocationRequestId)
        throw new Error('INVALID_OPERATION_CONTEXT_OR_SHAPE');
      const manual = value as unknown as ManualOperation;
      try {
        const result = await operateManually(manual, store, queue, {
          ...options,
          clock,
          observe: observer,
          invocationRequestId,
          remainingTimeMs: () => context!.getRemainingTimeInMillis(),
        });
        emitMetric(
          manual.action === 'preview'
            ? 'ManualPreview'
            : manual.action === 'execute'
              ? 'ManualExecution'
              : 'TtlBackfill',
          1,
          { correlationId: manual.correlationId, invocationRequestId },
        );
        for (const [field, name] of Object.entries({
          confirmed: 'ManualConfirmed',
          failed: 'ManualFailed',
          skipped: 'ManualSkipped',
          unprocessed: 'ManualUnprocessed',
        }))
          if (typeof result[field] === 'number')
            emitMetric(name, result[field] as number, {
              correlationId: manual.correlationId,
              invocationRequestId,
            });
        const {
          status,
          scope,
          count,
          limit,
          confirmed,
          failed,
          pending,
          skipped,
          unprocessed,
          partial,
          scanned,
          updated,
        } = result;
        console.info(
          JSON.stringify({
            timestamp: clock().toISOString(),
            operation: manual.action,
            category: 'telemetry-operations',
            confirmation: manual.action === 'execute',
            correlationId: manual.correlationId,
            invocationRequestId,
            status,
            scope,
            count,
            limit,
            confirmed,
            failed,
            pending,
            skipped,
            unprocessed,
            partial,
            scanned,
            updated,
          }),
        );
        return result;
      } catch (error) {
        emitMetric('ManualRejected', 1, {
          correlationId: manual.correlationId,
          invocationRequestId,
          cause: error instanceof Error ? error.name : 'unknown',
        });
        throw error;
      }
    }
    const headers =
      value.headers && typeof value.headers === 'object'
        ? (value.headers as Record<string, unknown>)
        : {};
    const supplied = Object.entries(headers).find(
      ([key]) => key.toLowerCase() === 'x-correlation-id',
    )?.[1];
    const correlationId =
      typeof supplied === 'string' && validIdentifier.test(supplied) ? supplied : uuid();
    const error = (code: string, message: string) => ({ code, message, correlationId });
    if (typeof value.httpMethod !== 'string' || typeof value.path !== 'string')
      return reply(400, error('UNRECOGNIZED_EVENT', 'Evento no reconocido'), correlationId);
    if (value.httpMethod !== 'POST' || value.path !== '/telemetry-events')
      return reply(404, error('NOT_FOUND', 'Ruta no encontrada'), correlationId);
    let message: InboundMessage;
    try {
      if (typeof value.body !== 'string' || !value.body)
        throw new ValidationError('Cuerpo requerido');
      const rawPayload = value.isBase64Encoded
        ? Buffer.from(value.body, 'base64').toString('utf8')
        : value.body;
      const current = clock();
      message = {
        event: validateEvent(rawPayload, current),
        rawPayload,
        acceptedAt: `${current.toISOString().slice(0, 19)}Z`,
        correlationId,
      };
    } catch (failure) {
      emitMetric('ValidationRejected', 1, {
        cause: 'VALIDATION_ERROR',
        correlationId,
        invocationRequestId,
      });
      return reply(
        400,
        error(
          'VALIDATION_ERROR',
          failure instanceof ValidationError ? failure.message : 'Solicitud inválida',
        ),
        correlationId,
      );
    }
    try {
      return reply(
        202,
        await acceptMessage(message, store, queue, {
          ...options,
          clock,
          observe: observer,
          receivedAtMs,
        }),
        correlationId,
      );
    } catch (failure) {
      const conflict = failure instanceof IdempotencyConflict;
      console.error(
        JSON.stringify({
          operation: 'telemetry-accept',
          correlationId,
          eventId: message.event.eventId,
          cause: failure instanceof Error ? failure.name : 'unknown',
        }),
      );
      return reply(
        conflict ? 409 : 503,
        error(
          conflict ? 'IDEMPOTENCY_CONFLICT' : 'PERSISTENCE_UNAVAILABLE',
          conflict
            ? 'El eventId ya existe con otro contenido'
            : 'Persistencia temporalmente no disponible',
        ),
        correlationId,
      );
    }
  };
}
function isManual(value: Record<string, unknown>): boolean {
  if (typeof value.correlationId !== 'string' || !validIdentifier.test(value.correlationId))
    return false;
  const keys =
    value.action === 'preview'
      ? ['operation', 'action', 'limit', 'correlationId']
      : value.action === 'execute'
        ? ['operation', 'action', 'preview', 'confirmation', 'correlationId']
        : value.action === 'backfill'
          ? ['operation', 'action', 'confirmation', 'cursor', 'correlationId']
          : [];
  return keys.length > 0 && Object.keys(value).every((key) => keys.includes(key));
}
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const store = new DynamoEventStore(
  dynamo,
  process.env.EVENTS_TABLE ?? '',
  process.env.OUTBOX_TABLE ?? '',
);
const queue = new SqsQueue(new SQSClient({}), process.env.ALERT_QUEUE_URL ?? '');
export const telemetryHandler = createTelemetryHandler(store, queue, {
  immediateBudgetMs: Number(process.env.ALERT_SEND_BUDGET_MS ?? 150),
  maxBatch: Number(process.env.OUTBOX_BATCH_SIZE ?? 25),
  leaseSeconds: Number(process.env.OUTBOX_LEASE_SECONDS ?? 30),
  maxBackoffMinutes: Number(process.env.OUTBOX_MAX_BACKOFF_MINUTES ?? 15),
  maxExecutionMs: Number(process.env.RECOVERY_MAX_EXECUTION_MS ?? 18000),
  responseReserveMs: 2000,
  preview: {
    mac: new KmsMac(new KMSClient({})),
    keyId: process.env.RECOVERY_MAC_KEY_ID ?? '',
    allowedKeyIds: (process.env.RECOVERY_MAC_ALLOWED_KEYS ?? '').split(',').filter(Boolean),
    previewTtlSeconds: Number(process.env.RECOVERY_PREVIEW_TTL_SECONDS ?? 300),
  },
});
