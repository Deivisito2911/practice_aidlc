import { describe, expect, it, vi } from 'vitest';
import type { EventStore, Queue } from './adapters.js';
import { createTelemetryHandler } from './handlers.js';

describe('handler operativo', () => {
  it('mantiene la invocación manual separada del endpoint HTTP', async () => {
    const store = {
      save: vi.fn(),
      due: vi.fn(async () => []),
      claim: vi.fn(),
      published: vi.fn(),
      defer: vi.fn(),
    } as unknown as EventStore;
    const queue = { send: vi.fn() } as unknown as Queue;
    const handler = createTelemetryHandler(store, queue);
    const result = await handler({
      operation: 'manual-recovery',
      action: 'preview',
      limit: 25,
      correlationId: 'run-1',
    });
    expect(result).toMatchObject({ status: 'preview', ids: [], count: 0, scope: 'due-pending' });
    expect(store.due).toHaveBeenCalledOnce();
  });

  it('sigue rechazando una petición HTTP inválida sin efectos', async () => {
    const store = {
      save: vi.fn(),
      due: vi.fn(),
      claim: vi.fn(),
      published: vi.fn(),
      defer: vi.fn(),
    } as unknown as EventStore;
    const queue = { send: vi.fn() } as unknown as Queue;
    const handler = createTelemetryHandler(store, queue);
    const response = await handler({
      httpMethod: 'POST',
      path: '/telemetry-events',
      headers: {},
      body: '{',
      isBase64Encoded: false,
    } as never);
    expect(response).toMatchObject({ statusCode: 400 });
    expect(store.save).not.toHaveBeenCalled();
    expect(queue.send).not.toHaveBeenCalled();
  });
});
