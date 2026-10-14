import { describe, expect, it, vi } from 'vitest';
import type { AlertOutbox, EventRecord } from '../../src/telemetry/model.js';
import type { EventStore, Queue, SaveResult } from '../../src/telemetry/adapters.js';
import { createTelemetryHandler } from '../../src/telemetry/handlers.js';

describe('flujo crítico API Gateway → DynamoDB → SQS y EventBridge', () => {
  it('persiste atómicamente, acepta, recupera PENDING y deduplica por alertId', async () => {
    let instant = new Date('2026-10-08T12:00:00.000Z');
    const events = new Map<string, EventRecord>();
    const outboxes = new Map<string, AlertOutbox>();
    const store: EventStore = {
      async save(record, outbox): Promise<SaveResult> {
        const prior = events.get(record.eventId);
        if (prior)
          return {
            outcome: prior.canonicalHash === record.canonicalHash ? 'duplicate' : 'conflict',
            record: prior,
          };
        events.set(record.eventId, record);
        if (outbox) outboxes.set(outbox.alertId, { ...outbox });
        return { outcome: 'created', record };
      },
      async due(now, limit) {
        return [...outboxes.values()]
          .filter((item) => item.status === 'PENDING' && item.nextAttemptAt! <= now)
          .slice(0, limit);
      },
      async claim(item, now, leaseSeconds) {
        const stored = outboxes.get(item.alertId)!;
        if (stored.nextAttemptAt! > now || (stored.leaseUntil && stored.leaseUntil > now))
          return undefined;
        stored.claimToken = `claim-${stored.attempts + 1}`;
        stored.leaseUntil = new Date(Date.parse(now) + leaseSeconds * 1000).toISOString();
        stored.lastAttemptAt = now;
        stored.nextAttemptAt = stored.leaseUntil;
        stored.attempts++;
        return { ...stored };
      },
      async published(item, token, now) {
        const stored = outboxes.get(item.alertId)!;
        if (stored.claimToken !== token || stored.leaseUntil! <= now) return false;
        stored.status = 'PUBLISHED';
        delete stored.dueShard;
        delete stored.nextAttemptAt;
        delete stored.claimToken;
        delete stored.leaseUntil;
        return true;
      },
      async defer(item, token, nextAttemptAt) {
        const stored = outboxes.get(item.alertId)!;
        if (stored.claimToken !== token) return false;
        stored.nextAttemptAt = nextAttemptAt;
        delete stored.claimToken;
        delete stored.leaseUntil;
        return true;
      },
    };
    const delivered: { alertId: string }[] = [];
    let failInitial = true;
    const queue: Queue = {
      async send(body) {
        delivered.push(JSON.parse(body) as { alertId: string });
        if (failInitial) {
          failInitial = false;
          throw new Error('SQS response uncertain');
        }
      },
    };
    const handler = createTelemetryHandler(store, queue, {
      clock: () => instant,
      uuid: () => 'generated',
      random: () => 0,
    });
    const http = (eventId: string, value: number, timestamp = instant.toISOString()) => ({
      httpMethod: 'POST',
      path: '/telemetry-events',
      headers: { 'X-Correlation-Id': 'corr' },
      body: JSON.stringify({
        eventId,
        vehicleId: 'vehicle',
        eventType: 'battery',
        timestamp,
        value,
      }),
      isBase64Encoded: false,
    });

    const invalid = (await handler(http('invalid', 101))) as { statusCode: number };
    expect(invalid.statusCode).toBe(400);
    expect(events.size).toBe(0);
    expect(delivered).toHaveLength(0);
    const failedStore = {
      ...store,
      save: vi.fn(async () => {
        throw new Error('transaction unavailable');
      }),
    } as EventStore;
    const failedHandler = createTelemetryHandler(failedStore, queue, {
      clock: () => instant,
      random: () => 0,
    });
    expect(((await failedHandler(http('failed', 10))) as { statusCode: number }).statusCode).toBe(
      503,
    );
    expect(events.size).toBe(0);

    const response = (await handler(http('event-1', 19.99))) as {
      statusCode: number;
      body: string;
    };
    expect(response.statusCode).toBe(202);
    expect(events.has('event-1')).toBe(true);
    expect(outboxes.has('LOW_BATTERY:event-1')).toBe(true);
    expect(outboxes.get('LOW_BATTERY:event-1')?.status).toBe('PENDING');
    const duplicate = (await handler(http('event-1', 19.99, instant.toISOString()))) as {
      statusCode: number;
      body: string;
    };
    expect(duplicate.statusCode).toBe(202);
    expect(JSON.parse(duplicate.body)).toMatchObject({
      acceptedAt: '2026-10-08T12:00:00Z',
      correlationId: 'corr',
    });
    const conflict = (await handler(http('event-1', 18))) as { statusCode: number };
    expect(conflict.statusCode).toBe(409);
    const noAlert = (await handler(http('event-20', 20))) as { statusCode: number };
    expect(noAlert.statusCode).toBe(202);
    expect(outboxes.has('LOW_BATTERY:event-20')).toBe(false);

    instant = new Date('2026-10-08T12:01:00.000Z');
    const scheduled = {
      source: 'aws.events',
      'detail-type': 'Scheduled Event',
      id: 'schedule',
      time: instant.toISOString(),
      version: '0',
      account: 'a',
      region: 'r',
      resources: [],
      detail: {},
    };
    expect(await handler(scheduled)).toEqual({ processed: 1 });
    const seen = new Set<string>();
    const logicalEffects = delivered.filter(({ alertId }) => {
      if (seen.has(alertId)) return false;
      seen.add(alertId);
      return true;
    });
    expect(delivered).toHaveLength(2);
    expect(logicalEffects).toHaveLength(1);
    expect(outboxes.get('LOW_BATTERY:event-1')?.status).toBe('PUBLISHED');
  });
});

import { DynamoEventStore } from '../../src/telemetry/adapters.js';
import {
  TransactWriteCommand,
  GetCommand,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
describe('causalidad y atomicidad del adaptador integrado', () => {
  const instant = new Date('2026-10-08T12:00:00Z');
  const request = {
    httpMethod: 'POST',
    path: '/telemetry-events',
    headers: {},
    body: JSON.stringify({
      eventId: 'atomic',
      vehicleId: 'v',
      eventType: 'battery',
      timestamp: instant.toISOString(),
      value: 10,
    }),
    isBase64Encoded: false,
  };
  it.each(['before', 'during', 'after'])(
    'fallo %s del commit nunca deja estado parcial ni 202 falso',
    async (mode) => {
      const rows = new Map<string, Record<string, unknown>>();
      const send = vi.fn(async (command: unknown) => {
        if (command instanceof TransactWriteCommand) {
          const items = (command.input as TransactWriteCommandInput).TransactItems!;
          if (mode === 'before' || mode === 'during') throw new Error('transaction failed');
          for (const item of items) rows.set(item.Put!.TableName!, item.Put!.Item!);
          throw new Error('response lost after commit');
        }
        if (command instanceof GetCommand) {
          expect(command.input.ConsistentRead).toBe(true);
          return { Item: rows.get('events') };
        }
        throw new Error('unexpected effect');
      });
      const observations: string[] = [];
      const handler = createTelemetryHandler(
        new DynamoEventStore({ send } as never, 'events', 'outbox'),
        { send: vi.fn() },
        { clock: () => instant, observe: (event) => observations.push(event.name) },
      );
      const result = await handler(request);
      expect(rows.size).toBe(mode === 'after' ? 2 : 0);
      expect(result.statusCode).toBe(mode === 'after' ? 202 : 503);
      if (mode === 'after') expect(observations).toContain('CommitUncertain');
    },
  );
  it('barrera de commit impide respuesta 202 antes de escritura conjunta', async () => {
    let release: () => void = () => undefined;
    let responded = false;
    const rows = new Map<string, unknown>();
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const store = {
      save: async (record: EventRecord, outbox: AlertOutbox) => {
        await gate;
        rows.set('event', record);
        rows.set('outbox', outbox);
        return { outcome: 'created' as const, record };
      },
      due: async () => [],
      claim: async () => undefined,
      published: async () => false,
      defer: async () => false,
    } as EventStore;
    const pending = createTelemetryHandler(
      store,
      { send: vi.fn() },
      { clock: () => instant },
    )(request).then((result) => {
      responded = true;
      return result;
    });
    await Promise.resolve();
    expect(responded).toBe(false);
    expect(rows.size).toBe(0);
    release();
    expect(await pending).toMatchObject({ statusCode: 202 });
    expect(rows.size).toBe(2);
  });
});

it('solicitudes HTTP concurrentes idénticas dejan un evento y una sola salida', async () => {
  const now = new Date('2026-10-08T12:00:00Z');
  const rows = new Map<string, Record<string, unknown>>();
  let commits = 0;
  const send = vi.fn(async (command: unknown) => {
    if (command instanceof TransactWriteCommand) {
      if (rows.size)
        throw Object.assign(new Error('collision'), {
          name: 'TransactionCanceledException',
          CancellationReasons: [{ Code: 'ConditionalCheckFailed' }],
        });
      for (const item of command.input.TransactItems!)
        rows.set(item.Put!.TableName!, item.Put!.Item!);
      commits++;
      return {};
    }
    if (command instanceof GetCommand) return { Item: rows.get('events') };
    throw Object.assign(new Error('claim lost'), { name: 'ConditionalCheckFailedException' });
  });
  const queue = { send: vi.fn() };
  const handler = createTelemetryHandler(
    new DynamoEventStore({ send } as never, 'events', 'outbox'),
    queue,
    { clock: () => now },
  );
  const request = {
    httpMethod: 'POST',
    path: '/telemetry-events',
    headers: {},
    body: JSON.stringify({
      eventId: 'concurrent',
      vehicleId: 'v',
      eventType: 'battery',
      timestamp: now.toISOString(),
      value: 10,
    }),
  };
  const replies = await Promise.all([handler(request), handler(request)]);
  expect(replies.map((row) => row.statusCode)).toEqual([202, 202]);
  expect(commits).toBe(1);
  expect(rows.size).toBe(2);
  expect(rows.get('outbox')?.alertId).toBe('LOW_BATTERY:concurrent');
  expect(queue.send).not.toHaveBeenCalled();
});
