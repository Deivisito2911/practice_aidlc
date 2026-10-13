import { describe, expect, it, vi } from 'vitest';
import type { EventStore, Queue } from './adapters.js';
import type { AlertOutbox } from './model.js';
import { operateManually } from './manual-recovery.js';
import { canonicalHash, toEventRecord, ttlShardFor } from './model.js';

const candidate: AlertOutbox = {
  alertId: 'LOW_BATTERY:e1',
  eventId: 'e1',
  vehicleId: 'v1',
  alertType: 'LOW_BATTERY',
  batteryValue: 10,
  occurredAt: '2026-01-01T00:00:00.000Z',
  correlationId: 'corr-1',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00.000Z',
  dueShard: 'PENDING#1',
  nextAttemptAt: '2026-01-01T00:00:00.000Z',
  attempts: 0,
  schemaVersion: 1,
};
function harness() {
  let state = 'PENDING';
  const store: EventStore = {
    save: vi.fn(),
    due: vi.fn(async () => (state === 'PENDING' ? [candidate] : [])),
    claim: vi.fn(async (item) => ({ ...item, claimToken: 'claim-1', attempts: 1 })),
    published: vi.fn(async () => {
      state = 'PUBLISHED';
      return true;
    }),
    defer: vi.fn(async () => true),
  };
  const queue: Queue = { send: vi.fn(async () => undefined) };
  return { store, queue };
}

describe('operación manual Outbox', () => {
  it('preserva expiración acceptedAt +90 días, shard estable y hash canónico', () => {
    const event = {
      eventId: 'e1',
      vehicleId: 'v1',
      eventType: 'battery' as const,
      timestamp: '2026-01-01T00:00:00.000Z',
      value: 19,
    };
    const record = toEventRecord({
      event,
      rawPayload: JSON.stringify(event),
      acceptedAt: '2026-01-01T00:00:00.000Z',
      correlationId: 'c',
    });
    expect(record.expiresAt).toBe(Date.parse('2026-04-01T00:00:00.000Z') / 1000);
    expect(record.ttlShard).toBe(ttlShardFor('e1'));
    expect(canonicalHash(event)).toBe(record.canonicalHash);
  });
  it('previsualiza IDs, cantidad, límite y huella sin datos de payload', async () => {
    const { store, queue } = harness();
    const preview = await operateManually(
      { operation: 'manual-recovery', action: 'preview', limit: 25, correlationId: 'run-1' },
      store,
      queue,
      { clock: () => new Date('2026-01-01T00:01:00Z') },
    );
    expect(preview).toMatchObject({
      status: 'preview',
      ids: ['LOW_BATTERY:e1'],
      count: 1,
      limit: 25,
      scope: 'due-pending',
    });
    expect(preview).not.toHaveProperty('payload');
    expect(store.claim).not.toHaveBeenCalled();
  });

  it('rechaza confirmación ausente o huella obsoleta sin mutar', async () => {
    const { store, queue } = harness();
    await expect(
      operateManually(
        {
          operation: 'manual-recovery',
          action: 'execute',
          limit: 25,
          fingerprint: 'old',
          confirmation: '',
          correlationId: 'r',
        },
        store,
        queue,
      ),
    ).rejects.toThrow('PREVIEW_CHANGED_OR_CONFIRMATION_INVALID');
    expect(store.claim).not.toHaveBeenCalled();
  });

  it('publica el conjunto confirmado reutilizando la identidad estable alertId', async () => {
    const { store, queue } = harness();
    const preview = await operateManually(
      { operation: 'manual-recovery', action: 'preview', limit: 25, correlationId: 'r' },
      store,
      queue,
      { clock: () => new Date('2026-01-01T00:01:00Z') },
    );
    const fingerprint = preview.fingerprint as string;
    const result = await operateManually(
      {
        operation: 'manual-recovery',
        action: 'execute',
        limit: 25,
        fingerprint,
        confirmation: fingerprint,
        correlationId: 'r',
      },
      store,
      queue,
      { clock: () => new Date('2026-01-01T00:01:00Z') },
    );
    expect(queue.send).toHaveBeenCalledWith(expect.stringContaining('LOW_BATTERY:e1'), 'corr-1');
    expect(result).toMatchObject({ status: 'complete', confirmed: 1, failed: 0, pending: 0 });
    expect(store.published).toHaveBeenCalled();
  });

  it('rechaza límites fuera de 1..25 antes de consultar candidatos', async () => {
    const { store, queue } = harness();
    await expect(
      operateManually(
        { operation: 'manual-recovery', action: 'preview', limit: 26, correlationId: 'r' },
        store,
        queue,
      ),
    ).rejects.toThrow('INVALID_RECOVERY_LIMIT');
    expect(store.due).not.toHaveBeenCalled();
  });
});
