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

// BVA and silence assertions on the real HTTP boundary.
describe('matriz de validación U2', () => {
  const base = {
    eventId: 'e',
    vehicleId: 'v',
    eventType: 'battery',
    timestamp: now.toISOString(),
    value: 20,
  };
  const bad = [
    {},
    ...Object.keys(base).map((key) =>
      Object.fromEntries(Object.entries(base).filter(([name]) => name !== key)),
    ),
    { ...base, eventId: '' },
    { ...base, vehicleId: 1 },
    { ...base, eventType: 'other' },
    { ...base, value: '20' },
    { ...base, value: null },
    { ...base, value: -0.01 },
    { ...base, value: 100.01 },
    { ...base, eventType: 'temperature', value: -50.01 },
    { ...base, eventType: 'temperature', value: 150.01 },
    { ...base, eventType: 'speed', value: -0.01 },
    { ...base, eventType: 'speed', value: 300.01 },
    { ...base, timestamp: '2026-10-08T12:00:00+00:00' },
    { ...base, timestamp: '2026-02-30T12:00:00Z' },
    { ...base, timestamp: '2026-10-08T12:05:00.001Z' },
    { ...base, extra: 'secret' },
  ];
  it.each(bad)('inválido no escribe ni publica: %j', async (candidate) => {
    const { handler, store, queue } = harness();
    expect(await handler(http(JSON.stringify(candidate)))).toMatchObject({ statusCode: 400 });
    expect(store.save).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });
  it.each([
    ['battery', 0],
    ['battery', 100],
    ['temperature', -50],
    ['temperature', 150],
    ['speed', 0],
    ['speed', 300],
  ])('acepta límite inclusivo %s/%s', async (eventType, value) => {
    const { handler } = harness();
    expect(
      await handler(
        http(JSON.stringify({ ...base, eventType, value, timestamp: '2026-10-08T12:05:00Z' })),
      ),
    ).toMatchObject({ statusCode: 202 });
  });
  it('logs clasifican validación sin API key ni cuerpo crudo', async () => {
    const { handler } = harness();
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await handler({ ...http('{raw-secret'), headers: { 'x-api-key': 'key-secret' } });
      const output = JSON.stringify(spy.mock.calls);
      expect(output).toContain('Http400');
      expect(output).not.toContain('raw-secret');
      expect(output).not.toContain('key-secret');
    } finally {
      spy.mockRestore();
    }
  });
});

it('logs de validación, persistencia y publicación conservan correlación sin cuerpo ni credenciales', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    const invalid = harness();
    await invalid.handler({
      ...http('private-raw-body'),
      headers: { 'x-api-key': 'private-api-key', 'x-correlation-id': 'safe-corr' },
    });
    const failed = harness(async () => {
      throw new Error('private-raw-body');
    });
    await failed.handler({
      ...http(),
      headers: { 'x-api-key': 'private-api-key', 'x-correlation-id': 'safe-corr' },
    });
    const outbox = {
      alertId: 'LOW_BATTERY:e1',
      eventId: 'e1',
      vehicleId: 'private-vehicle',
      alertType: 'LOW_BATTERY' as const,
      batteryValue: 10,
      occurredAt: now.toISOString(),
      correlationId: 'safe-corr',
      status: 'PENDING' as const,
      createdAt: now.toISOString(),
      attempts: 1,
      schemaVersion: 1 as const,
      claimToken: 'token',
    };
    const store = {
      save: async (record: unknown) => ({ outcome: 'created', record }),
      due: async () => [],
      claim: async () => outbox,
      published: async () => true,
      defer: async () => true,
    } as EventStore;
    await createTelemetryHandler(
      store,
      {
        send: async () => {
          throw Object.assign(new Error('private-raw-body'), { name: 'TimeoutError' });
        },
      },
      { clock: () => now },
    )(
      http(
        JSON.stringify({
          eventId: 'e1',
          vehicleId: 'private-vehicle',
          eventType: 'battery',
          timestamp: now.toISOString(),
          value: 10,
        }),
      ),
    );
    const output = JSON.stringify([...log.mock.calls, ...error.mock.calls]);
    expect(output).toContain('VALIDATION_ERROR');
    expect(output).toContain('CommitFailed');
    expect(output).toContain('SqsUncertain');
    expect(output).toContain('safe-corr');
    expect(output).not.toContain('private-api-key');
    expect(output).not.toContain('private-raw-body');
    expect(output).not.toContain('private-vehicle');
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
});
