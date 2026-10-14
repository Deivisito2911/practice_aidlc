import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Context } from 'aws-lambda';
import type { EventStore, Queue } from './adapters.js';
import { createTelemetryHandler } from './handlers.js';
import type { MacPort } from './recovery-preview.js';
const mac: MacPort = {
  generate: async (value) => createHmac('sha256', 'synthetic-key').update(value).digest('base64'),
  verify: async (value, key, signature) => signature === (await mac.generate(value, key)),
};
const context = {
  awsRequestId: 'lambda-request',
  getRemainingTimeInMillis: () => 20000,
} as Context;
describe('handler operativo', () => {
  it('preview devuelve ID de plataforma y no imprime MAC; exige contexto real y forma cerrada', async () => {
    const store = {
      save: vi.fn(),
      due: vi.fn(async () => []),
      claim: vi.fn(),
      published: vi.fn(),
      defer: vi.fn(),
    } as unknown as EventStore;
    const queue = { send: vi.fn() } as Queue;
    const handler = createTelemetryHandler(store, queue, {
      preview: { mac, keyId: 'test', allowedKeyIds: ['test'] },
    });
    const operation = {
      operation: 'manual-recovery',
      action: 'preview',
      limit: 25,
      correlationId: 'run',
    };
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      const result = await handler(operation, context);
      expect(result).toMatchObject({
        status: 'preview',
        ids: [],
        count: 0,
        invocationRequestId: 'lambda-request',
      });
      expect(JSON.stringify(spy.mock.calls)).not.toContain('mac');
      await expect(handler({ ...operation, actor: 'admin' }, context)).rejects.toThrow('SHAPE');
      await expect(handler(operation)).rejects.toThrow('CONTEXT');
      expect(store.due).toHaveBeenCalledOnce();
    } finally {
      spy.mockRestore();
    }
  });
  it('Context sin presupuesto no inicia consultas ni reclamaciones', async () => {
    const store = {
      save: vi.fn(),
      due: vi.fn(),
      claim: vi.fn(),
      published: vi.fn(),
      defer: vi.fn(),
    } as unknown as EventStore;
    const handler = createTelemetryHandler(
      store,
      { send: vi.fn() },
      { preview: { mac, keyId: 'test', allowedKeyIds: ['test'] } },
    );
    await expect(
      handler(
        { operation: 'manual-recovery', action: 'preview', limit: 25, correlationId: 'run' },
        { ...context, getRemainingTimeInMillis: () => 1000 } as Context,
      ),
    ).rejects.toThrow('BUDGET');
    expect(store.due).not.toHaveBeenCalled();
  });
  it('snapshot truncado y TTL parcial nunca se presentan como medidas completas', async () => {
    const store = {
      save: vi.fn(),
      due: vi.fn(async () => []),
      claim: vi.fn(),
      published: vi.fn(),
      defer: vi.fn(),
      pendingSnapshot: vi.fn(async () => ({ count: 101, oldestAgeSeconds: 20, complete: false })),
      ttlEligible: vi.fn(async () => ({ count: 1001, complete: false, lowerBound: true })),
    } as unknown as EventStore;
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await createTelemetryHandler(
        store,
        { send: vi.fn() },
        { clock: () => new Date('2026-01-01T00:00:00Z') },
      )({ source: 'aws.events', 'detail-type': 'Scheduled Event' }, context);
      const logs = JSON.stringify(spy.mock.calls);
      expect(logs).toContain('PendingMeasurementPartial');
      expect(logs).toContain('TtlMeasurementPartial');
      expect(logs).toContain('Seconds');
    } finally {
      spy.mockRestore();
    }
  });
});
