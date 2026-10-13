import { describe, expect, it, vi } from 'vitest';
import type { EventStore, Queue } from './adapters.js';
import { createTelemetryHandler } from './handlers.js';

const now = new Date('2026-10-08T12:00:00.000Z');
const http = (
  body = JSON.stringify({
    eventId: 'e1',
    vehicleId: 'v1',
    eventType: 'battery',
    timestamp: now.toISOString(),
    value: 20,
  }),
) => ({
  httpMethod: 'POST',
  path: '/telemetry-events',
  headers: { 'x-correlation-id': 'corr-1' },
  body,
  isBase64Encoded: false,
});
function harness(save: EventStore['save'] = async (record) => ({ outcome: 'created', record })) {
  const store = {
    save: vi.fn(save),
    due: vi.fn(async () => []),
    claim: vi.fn(async () => undefined),
    published: vi.fn(async () => true),
    defer: vi.fn(async () => true),
  } as unknown as EventStore;
  const queue = { send: vi.fn(async () => undefined) } as Queue;
  return {
    store,
    queue,
    handler: createTelemetryHandler(store, queue, { clock: () => now, uuid: () => 'generated' }),
  };
}

describe('handler unificado HTTP y EventBridge', () => {
  it('valida antes de persistir y responde 400 con correlación', async () => {
    const { handler, store, queue } = harness();
    const result = (await handler(http('{bad'))) as { statusCode: number; body: string };
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toMatchObject({
      code: 'VALIDATION_ERROR',
      correlationId: 'corr-1',
    });
    expect(store.save).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });
  it('responde 202 después de guardar y conserva respuesta de la primera aceptación', async () => {
    const { handler } = harness();
    const result = (await handler(http())) as { statusCode: number; body: string };
    expect(result.statusCode).toBe(202);
    expect(JSON.parse(result.body)).toEqual({
      status: 'accepted',
      eventId: 'e1',
      acceptedAt: '2026-10-08T12:00:00Z',
      correlationId: 'corr-1',
    });
  });
  it('mapea conflicto a 409 e indisponibilidad a 503', async () => {
    const conflict = harness(async () => ({ outcome: 'conflict' }));
    expect(((await conflict.handler(http())) as { statusCode: number }).statusCode).toBe(409);
    const unavailable = harness(async () => {
      throw new Error('dynamo');
    });
    expect(((await unavailable.handler(http())) as { statusCode: number }).statusCode).toBe(503);
  });
  it('rechaza ruta desconocida y reconoce EventBridge programado', async () => {
    const { handler, store } = harness();
    expect(
      ((await handler({ ...http(), path: '/other' })) as { statusCode: number }).statusCode,
    ).toBe(404);
    await expect(
      handler({
        source: 'aws.events',
        'detail-type': 'Scheduled Event',
        id: 'id',
        time: now.toISOString(),
        version: '0',
        account: 'a',
        region: 'r',
        resources: [],
        detail: {},
      } as never),
    ).resolves.toEqual({ processed: 0 });
    expect(store.due).toHaveBeenCalled();
  });
  it('rechaza evento no reconocido y reemplaza correlación inválida', async () => {
    const { handler } = harness();
    const unknown = (await handler({ source: 'custom', detail: {} })) as { statusCode: number };
    expect(unknown.statusCode).toBe(400);
    const result = (await handler({ ...http(), headers: { 'x-correlation-id': 'has space' } })) as {
      body: string;
    };
    expect(JSON.parse(result.body).correlationId).toBe('generated');
  });
});
