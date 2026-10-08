import { describe, expect, it, vi } from 'vitest';
import type { APIGatewayProxyEvent, SQSEvent } from 'aws-lambda';
import { createIngestHandler, createProcessHandler, createPublishHandler } from './handlers.js';
import type { EventStore, Queue } from './adapters.js';

const rawPayload = JSON.stringify({
  eventId: 'e',
  vehicleId: 'v',
  eventType: 'battery',
  timestamp: '2026-10-08T12:00:00Z',
  value: 19,
});
const request = {
  httpMethod: 'POST',
  path: '/telemetry-events',
  body: rawPayload,
  headers: { 'X-Correlation-Id': 'corr' },
} as unknown as APIGatewayProxyEvent;
const now = () => new Date('2026-10-08T12:00:00Z');
describe('handlers', () => {
  it('confirma 202 solo después de publicar y conserva correlación', async () => {
    const queue: Queue = { send: vi.fn().mockResolvedValue(undefined) };
    const response = await createIngestHandler(queue, now)(request);
    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({
      status: 'accepted',
      msg_id: 'corr',
      acceptedAt: '2026-10-08T12:00:00.000Z',
    });
    expect(JSON.parse(vi.mocked(queue.send).mock.calls[0][0]).rawPayload).toBe(rawPayload);
  });
  it('rechaza ruta y validación sin encolar; SQS fallida devuelve error', async () => {
    const queue: Queue = { send: vi.fn().mockRejectedValue(new Error('SQS down')) };
    const handler = createIngestHandler(queue, now);
    expect((await handler({ ...request, path: '/other' })).statusCode).toBe(404);
    expect((await handler({ ...request, body: '{}' })).statusCode).toBe(400);
    expect(queue.send).not.toHaveBeenCalled();
    expect((await handler(request)).statusCode).toBe(503);
  });
  it('reporta fallo parcial sin bloquear registros sanos, también en quinto intento', async () => {
    const store: EventStore = {
      save: vi.fn().mockResolvedValueOnce('created').mockResolvedValueOnce('conflict'),
      pending: vi.fn(),
      published: vi.fn(),
    };
    const message = JSON.stringify({
      event: JSON.parse(rawPayload),
      rawPayload,
      acceptedAt: now().toISOString(),
      correlationId: 'corr',
    });
    const event = {
      Records: [
        { body: message, messageId: 'ok', attributes: { ApproximateReceiveCount: '1' } },
        { body: message, messageId: 'bad', attributes: { ApproximateReceiveCount: '5' } },
      ],
    } as unknown as SQSEvent;
    expect(await createProcessHandler(store)(event)).toEqual({
      batchItemFailures: [{ itemIdentifier: 'bad' }],
    });
  });
  it('ejecuta publicador de pendientes', async () => {
    const store: EventStore = {
      save: vi.fn(),
      pending: vi.fn().mockResolvedValue([]),
      published: vi.fn(),
    };
    expect(await createPublishHandler(store, { send: vi.fn() }, now)()).toEqual({ published: 0 });
  });
});
