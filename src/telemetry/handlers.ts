import { randomUUID } from 'node:crypto';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  EventBridgeEvent,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SQSClient } from '@aws-sdk/client-sqs';
import { DynamoEventStore, SqsQueue, type EventStore, type Queue } from './adapters.js';
import { validateEvent, ValidationError, type InboundMessage } from './model.js';
import {
  acceptMessage,
  IdempotencyConflict,
  recoverPending,
  type ServiceOptions,
} from './service.js';
import { operateManually, type ManualOperation } from './manual-recovery.js';

type ScheduledEvent = EventBridgeEvent<'Scheduled Event', Record<string, never>>;
type HandlerEvent = APIGatewayProxyEvent | ScheduledEvent;
const validCorrelation = /^[A-Za-z0-9._:-]{1,128}$/;

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  const error = statusCode >= 500 ? 1 : 0;
  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: 'VehicleTelemetry',
            Dimensions: [['Service']],
            Metrics: [
              { Name: 'HttpRequests', Unit: 'Count' },
              { Name: 'HttpServiceErrors', Unit: 'Count' },
            ],
          },
        ],
      },
      Service: 'TelemetryService',
      HttpRequests: 1,
      HttpServiceErrors: error,
    }),
  );
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}
function errorBody(code: string, message: string, correlationId: string) {
  return { code, message, correlationId };
}

export function createTelemetryHandler(
  store: EventStore,
  queue: Queue,
  options: ServiceOptions = {},
) {
  const clock = options.clock ?? (() => new Date());
  const uuid = options.uuid ?? randomUUID;
  return async (
    event: HandlerEvent | Record<string, unknown>,
    context?: Context,
  ): Promise<APIGatewayProxyResult | { processed: number } | Record<string, unknown>> => {
    if (isScheduled(event)) {
      const runOptions = {
        ...options,
        clock,
        remainingTimeMs: () => context?.getRemainingTimeInMillis() ?? 20_000,
      };
      if (store.pendingSnapshot) {
        const snapshot = await store.pendingSnapshot(clock().toISOString());
        metric('OutboxPendingCount', snapshot.count);
        metric('OutboxOldestPendingAge', snapshot.oldestAgeSeconds);
      }
      const processed = await recoverPending(store, queue, runOptions);
      let ttlEligible: number | undefined;
      if (clock().getUTCMinutes() === 0 && store.ttlEligible) {
        ttlEligible = await store.ttlEligible(Math.floor(clock().getTime() / 1000), 1001);
        metric('TtlEligibleUndeleted', ttlEligible);
      }
      metric('ScheduledRecoveryInvocation', 1);
      return { processed, ...(ttlEligible === undefined ? {} : { ttlEligible }) };
    }
    if (isManualOperation(event)) {
      try {
        const result = await operateManually(event, store, queue, { ...options, clock });
        metric(
          event.action === 'preview'
            ? 'ManualPreview'
            : event.action === 'execute'
              ? 'ManualExecution'
              : 'TtlBackfill',
          1,
        );
        console.info(
          JSON.stringify({
            level: 'INFO',
            operation: event.action,
            category: 'telemetry-operations',
            correlationId: event.correlationId,
            ...safeManualLog(result),
          }),
        );
        return result;
      } catch (error) {
        console.warn(
          JSON.stringify({
            level: 'WARN',
            operation: event.action,
            category: 'telemetry-operations',
            correlationId: event.correlationId,
            cause: error instanceof Error ? error.message : 'unknown',
          }),
        );
        throw error;
      }
    }
    if (!isHttpEvent(event))
      return response(400, errorBody('UNRECOGNIZED_EVENT', 'Evento no reconocido', uuid()));
    const correlationId = correlationFrom(event.headers, uuid);
    if (event.httpMethod !== 'POST' || event.path !== '/telemetry-events') {
      return response(404, errorBody('NOT_FOUND', 'Ruta no encontrada', correlationId));
    }
    let message: InboundMessage;
    try {
      if (!event.body) throw new ValidationError('Cuerpo requerido');
      const rawPayload = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
      const currentTime = clock();
      const acceptedAt = `${currentTime.toISOString().slice(0, 19)}Z`;
      message = {
        event: validateEvent(rawPayload, currentTime),
        rawPayload,
        acceptedAt,
        correlationId,
      };
    } catch (error) {
      if (error instanceof ValidationError)
        return response(400, errorBody('VALIDATION_ERROR', error.message, correlationId));
      return response(400, errorBody('VALIDATION_ERROR', 'Solicitud inválida', correlationId));
    }
    try {
      const accepted = await acceptMessage(message, store, queue, { ...options, clock });
      return response(202, accepted);
    } catch (error) {
      const conflict = error instanceof IdempotencyConflict;
      const statusCode = conflict ? 409 : 503;
      const code = conflict ? 'IDEMPOTENCY_CONFLICT' : 'PERSISTENCE_UNAVAILABLE';
      console.error(
        JSON.stringify({
          level: 'ERROR',
          operation: 'telemetry-accept',
          correlationId,
          eventId: message.event.eventId,
          cause: error instanceof Error ? error.name : 'unknown',
        }),
      );
      return response(
        statusCode,
        errorBody(
          code,
          conflict
            ? 'El eventId ya existe con otro contenido'
            : 'Persistencia temporalmente no disponible',
          correlationId,
        ),
      );
    }
  };
}

function isManualOperation(event: unknown): event is ManualOperation {
  if (!event || typeof event !== 'object') return false;
  const value = event as Record<string, unknown>;
  return (
    value.operation === 'manual-recovery' &&
    ['preview', 'execute', 'backfill'].includes(String(value.action)) &&
    typeof value.correlationId === 'string'
  );
}

function metric(name: string, value: number): void {
  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: 'VehicleTelemetry',
            Dimensions: [['Service']],
            Metrics: [{ Name: name, Unit: 'Count' }],
          },
        ],
      },
      Service: 'TelemetryService',
      [name]: value,
    }),
  );
}

function safeManualLog(result: Record<string, unknown>): Record<string, unknown> {
  const { status, scope, count, limit, fingerprint, confirmed, failed, pending, scanned, updated } =
    result;
  return { status, scope, count, limit, fingerprint, confirmed, failed, pending, scanned, updated };
}

function correlationFrom(
  headers: Record<string, string | undefined> | null,
  uuid: () => string,
): string {
  const entry = Object.entries(headers ?? {}).find(
    ([key]) => key.toLowerCase() === 'x-correlation-id',
  )?.[1];
  return entry && validCorrelation.test(entry) ? entry : uuid();
}
function isScheduled(event: unknown): event is ScheduledEvent {
  if (!event || typeof event !== 'object') return false;
  const value = event as Record<string, unknown>;
  return value.source === 'aws.events' && value['detail-type'] === 'Scheduled Event';
}
function isHttpEvent(event: unknown): event is APIGatewayProxyEvent {
  if (!event || typeof event !== 'object') return false;
  const value = event as Record<string, unknown>;
  return typeof value.httpMethod === 'string' && typeof value.path === 'string';
}

const sqs = new SQSClient({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const store = new DynamoEventStore(
  dynamo,
  process.env.EVENTS_TABLE ?? '',
  process.env.OUTBOX_TABLE ?? '',
);
const alertsQueue = new SqsQueue(sqs, process.env.ALERT_QUEUE_URL ?? '');
const runtimeOptions: ServiceOptions = {
  immediateBudgetMs: Number(process.env.ALERT_SEND_BUDGET_MS ?? 150),
  maxBatch: Number(process.env.OUTBOX_BATCH_SIZE ?? 25),
  leaseSeconds: Number(process.env.OUTBOX_LEASE_SECONDS ?? 30),
  maxBackoffMinutes: Number(process.env.OUTBOX_MAX_BACKOFF_MINUTES ?? 15),
};
export const telemetryHandler = createTelemetryHandler(store, alertsQueue, runtimeOptions);
