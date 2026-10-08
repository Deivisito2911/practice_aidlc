import { describe, expect, it } from 'vitest';
import type { APIGatewayProxyEvent, SQSEvent } from 'aws-lambda';
import type { AlertOutbox, EventRecord } from '../../src/telemetry/model.js';
import type { EventStore, Queue } from '../../src/telemetry/adapters.js';
import {
  createIngestHandler,
  createProcessHandler,
  createPublishHandler,
} from '../../src/telemetry/handlers.js';

describe('flujo crítico con servicios AWS simulados', () => {
  it('recorre API → SQS → Lambda → DynamoDB → salida → SQS y deduplica alertId tras recuperación', async () => {
    const input: string[] = [];
    const delivered: string[] = [];
    const events = new Map<string, EventRecord>();
    const outboxes = new Map<string, AlertOutbox>();
    const store: EventStore = {
      async save(record, outbox) {
        const prior = events.get(record.eventId);
        if (prior) return prior.canonicalHash === record.canonicalHash ? 'duplicate' : 'conflict';
        events.set(record.eventId, record);
        if (outbox) outboxes.set(outbox.alertId, outbox);
        return 'created';
      },
      async pending() {
        return [...outboxes.values()].filter((item) => item.status === 'PENDING');
      },
      async published(alertId) {
        const item = outboxes.get(alertId)!;
        outboxes.set(alertId, { ...item, status: 'PUBLISHED' });
      },
    };
    const inputQueue: Queue = {
      async send(body) {
        input.push(body);
      },
    };
    let failAfterDelivery = true;
    const alertQueue: Queue = {
      async send(body) {
        delivered.push(body);
        if (failAfterDelivery) {
          failAfterDelivery = false;
          throw new Error('respuesta SQS perdida');
        }
      },
    };
    const clock = () => new Date('2026-10-08T12:00:00Z');
    const request = {
      httpMethod: 'POST',
      path: '/telemetry-events',
      headers: { 'X-Correlation-Id': 'corr' },
      body: JSON.stringify({
        eventId: 'e',
        vehicleId: 'v',
        eventType: 'battery',
        timestamp: clock().toISOString(),
        value: 19.99,
      }),
    } as unknown as APIGatewayProxyEvent;
    expect((await createIngestHandler(inputQueue, clock)(request)).statusCode).toBe(202);
    const batch = {
      Records: [{ messageId: 'm1', body: input[0], attributes: { ApproximateReceiveCount: '1' } }],
    } as unknown as SQSEvent;
    expect(await createProcessHandler(store)(batch)).toEqual({ batchItemFailures: [] });
    expect(events.get('e')?.rawPayload).toBe(request.body);
    await expect(createPublishHandler(store, alertQueue, clock)()).rejects.toThrow(
      'respuesta SQS perdida',
    );
    expect([...outboxes.values()][0].status).toBe('PENDING');
    expect(await createPublishHandler(store, alertQueue, clock)()).toEqual({ published: 1 });
    const seen = new Set<string>();
    const logicalEffects = delivered
      .map((body) => JSON.parse(body) as { alertId: string })
      .filter(({ alertId }) => {
        if (seen.has(alertId)) return false;
        seen.add(alertId);
        return true;
      });
    expect(delivered).toHaveLength(2);
    expect(logicalEffects).toHaveLength(1);
    expect([...outboxes.values()][0].status).toBe('PUBLISHED');
    expect(await createProcessHandler(store)(batch)).toEqual({ batchItemFailures: [] });
    expect(events.size).toBe(1);
    expect(outboxes.size).toBe(1);
  });
});
