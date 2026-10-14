import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { EventStore, Queue } from './adapters.js';
import type { AlertOutbox } from './model.js';
import { operateManually } from './manual-recovery.js';
import type { MacPort, PreviewEnvelope } from './recovery-preview.js';

const now = new Date('2026-01-01T00:01:00Z');
const mac: MacPort = {
  generate: async (digest) => createHmac('sha256', 'synthetic-key').update(digest).digest('base64'),
  verify: async (digest, key, value) => value === (await mac.generate(digest, key)),
};
const options = {
  clock: () => now,
  preview: { mac, keyId: 'test', allowedKeyIds: ['test'], uuid: () => 'preview-1' },
  random: () => 0,
};
function harness(size = 2) {
  const rows: AlertOutbox[] = Array.from({ length: size }, (_, n) => ({
    alertId: `LOW_BATTERY:e${n}`,
    eventId: `e${n}`,
    vehicleId: 'v',
    alertType: 'LOW_BATTERY',
    batteryValue: 10,
    occurredAt: now.toISOString(),
    correlationId: `c${n}`,
    status: 'PENDING',
    createdAt: now.toISOString(),
    nextAttemptAt: now.toISOString(),
    attempts: 0,
    schemaVersion: 1,
  }));
  const store: EventStore = {
    save: vi.fn(),
    due: vi.fn(async () => rows.filter((row) => row.status === 'PENDING')),
    readOutbox: vi.fn(async (id) => rows.find((row) => row.alertId === id)),
    claim: vi.fn(async (row) => ({ ...row, claimToken: 'token', attempts: 1 })),
    published: vi.fn(async (row) => {
      rows.find((item) => item.alertId === row.alertId)!.status = 'PUBLISHED';
      return true;
    }),
    defer: vi.fn(async () => true),
  };
  const queue: Queue = { send: vi.fn(async () => undefined) };
  const preview = async () =>
    (
      await operateManually(
        { operation: 'manual-recovery', action: 'preview', limit: 25, correlationId: 'run' },
        store,
        queue,
        options,
      )
    ).envelope as PreviewEnvelope;
  const execute = (envelope: PreviewEnvelope, extra = {}) =>
    operateManually(
      {
        operation: 'manual-recovery',
        action: 'execute',
        preview: envelope,
        confirmation: envelope.digest,
        correlationId: 'run',
      },
      store,
      queue,
      { ...options, ...extra },
    );
  return { rows, store, queue, preview, execute };
}
describe('recuperación manual autenticada y acotada', () => {
  it('previsualiza sin efectos y ejecuta/repite sin crear eventos ni reenviar publicados', async () => {
    const h = harness();
    const envelope = await h.preview();
    expect(envelope.ids).toEqual(['LOW_BATTERY:e0', 'LOW_BATTERY:e1']);
    expect(h.store.claim).not.toHaveBeenCalled();
    expect(await h.execute(envelope)).toMatchObject({
      count: 2,
      confirmed: 2,
      failed: 0,
      skipped: 0,
      unprocessed: 0,
    });
    expect(await h.execute(envelope)).toMatchObject({ confirmed: 0, skipped: 2 });
    expect(h.queue.send).toHaveBeenCalledTimes(2);
    expect(h.store.save).not.toHaveBeenCalled();
  });
  it('rechaza confirmación ausente, envelope alterado y conjunto cambiado sin reclamar', async () => {
    const h = harness();
    const envelope = await h.preview();
    await expect(
      operateManually(
        {
          operation: 'manual-recovery',
          action: 'execute',
          preview: envelope,
          confirmation: '',
          correlationId: 'r',
        },
        h.store,
        h.queue,
        options,
      ),
    ).rejects.toThrow('CONFIRMATION');
    await expect(h.execute({ ...envelope, limit: 24 })).rejects.toThrow();
    h.rows.push({ ...h.rows[0], alertId: 'LOW_BATTERY:extra' });
    await expect(h.execute(envelope)).rejects.toThrow('PREVIEW_CHANGED');
    expect(h.store.claim).not.toHaveBeenCalled();
  });
  it('rechaza vacío, expiración exacta y fallo KMS antes de efectos', async () => {
    const h = harness(0);
    await expect(h.execute(await h.preview())).rejects.toThrow('EMPTY');
    const active = harness();
    const envelope = await active.preview();
    await expect(
      active.execute(envelope, { clock: () => new Date(now.getTime() + 300000) }),
    ).rejects.toThrow('EXPIRED');
    await expect(
      active.execute(envelope, {
        preview: {
          ...options.preview,
          mac: {
            ...mac,
            verify: async () => {
              throw new Error('KMS unavailable');
            },
          },
        },
      }),
    ).rejects.toThrow('KMS');
    expect(active.store.claim).not.toHaveBeenCalled();
  });
  it('reconcilia confirmados, fallidos y omitidos sin solapamientos', async () => {
    const h = harness(3);
    const envelope = await h.preview();
    vi.mocked(h.queue.send).mockRejectedValueOnce(new Error('SQS'));
    vi.mocked(h.store.claim)
      .mockResolvedValueOnce({ ...h.rows[0], claimToken: 'x', attempts: 1 })
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ ...h.rows[2], claimToken: 'x', attempts: 1 });
    const result = await h.execute(envelope);
    expect(result).toMatchObject({ confirmed: 1, failed: 1, skipped: 1, unprocessed: 0, count: 3 });
    expect(h.rows[0].status).toBe('PENDING');
  });
  it('presupuesto global no se reinicia y detiene toda nueva reclamación', async () => {
    const h = harness(3);
    const envelope = await h.preview();
    let elapsed = 0;
    vi.mocked(h.queue.send).mockImplementation(async () => {
      elapsed = 18000;
    });
    const result = await h.execute(envelope, { monotonicNow: () => elapsed });
    expect(result).toMatchObject({ status: 'partial', failed: 1, unprocessed: 2, confirmed: 0 });
    expect(h.store.claim).toHaveBeenCalledOnce();
    expect(h.store.published).not.toHaveBeenCalled();
  });
  it('aborta envío pendiente al vencer presupuesto y conserva el resto', async () => {
    const h = harness();
    const envelope = await h.preview();
    let signal: AbortSignal | undefined;
    vi.mocked(h.queue.send).mockImplementation(async (_body, _correlation, abort) => {
      signal = abort;
      await new Promise<void>((_resolve, reject) =>
        abort?.addEventListener('abort', () => reject(new Error('aborted'))),
      );
    });
    expect(await h.execute(envelope, { maxExecutionMs: 10 })).toMatchObject({
      failed: 1,
      unprocessed: 1,
      status: 'partial',
    });
    expect(signal?.aborted).toBe(true);
    expect(h.store.claim).toHaveBeenCalledOnce();
    expect(h.rows.every((row) => row.status === 'PENDING')).toBe(true);
  });
  it('deniega límite inválido, backfill sin confirmación y presupuesto inicialmente vacío', async () => {
    const h = harness();
    await expect(
      operateManually(
        { operation: 'manual-recovery', action: 'preview', limit: 26, correlationId: 'r' },
        h.store,
        h.queue,
        options,
      ),
    ).rejects.toThrow('LIMIT');
    expect(h.store.due).not.toHaveBeenCalled();
    await expect(
      operateManually(
        {
          operation: 'manual-recovery',
          action: 'backfill',
          confirmation: '' as never,
          correlationId: 'r',
        },
        h.store,
        h.queue,
        options,
      ),
    ).rejects.toThrow('CONFIRMATION');
    await expect(h.execute(await h.preview(), { remainingTimeMs: () => 1000 })).rejects.toThrow(
      'BUDGET',
    );
    expect(h.store.claim).not.toHaveBeenCalled();
  });
});
