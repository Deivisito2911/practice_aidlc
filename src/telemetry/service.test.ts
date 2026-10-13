import { describe, expect, it, vi } from 'vitest';
import type { EventStore, Queue, SaveResult } from './adapters.js';
import { acceptMessage, IdempotencyConflict, recoverPending } from './service.js';
import {
  toEventRecord,
  toOutbox,
  validateEvent,
  type AlertOutbox,
  type EventRecord,
  type InboundMessage,
} from './model.js';

const now = new Date('2026-10-08T12:00:00.000Z');
function message(value = 19): InboundMessage {
  const rawPayload = JSON.stringify({
    eventId: 'e1',
    vehicleId: 'v1',
    eventType: 'battery',
    timestamp: now.toISOString(),
    value,
  });
  return {
    event: validateEvent(rawPayload, now),
    rawPayload,
    acceptedAt: now.toISOString(),
    correlationId: 'c1',
  };
}
function setup(saveResult?: SaveResult) {
  const records = new Map<string, EventRecord>();
  const outboxes = new Map<string, AlertOutbox>();
  const store: EventStore = {
    save: vi.fn(async (record) => {
      if (saveResult) return saveResult;
      records.set(record.eventId, record);
      const outbox = toOutbox(record);
      if (outbox) outboxes.set(outbox.alertId, outbox);
      return { outcome: 'created' as const, record };
    }),
    due: vi.fn(async () => [...outboxes.values()].filter((item) => item.status === 'PENDING')),
    claim: vi.fn(async (item, timestamp, leaseSeconds) => ({
      ...item,
      claimToken: 'token',
      attempts: item.attempts + 1,
      leaseUntil: new Date(Date.parse(timestamp) + leaseSeconds * 1000).toISOString(),
    })),
    published: vi.fn(async (item) => {
      const current = outboxes.get(item.alertId);
      if (current) current.status = 'PUBLISHED';
      return true;
    }),
    defer: vi.fn(async (item, _token, nextAttemptAt) => {
      const current = outboxes.get(item.alertId);
      if (current) current.nextAttemptAt = nextAttemptAt;
      return true;
    }),
  };
  const queue: Queue = { send: vi.fn(async () => undefined) };
  return { store, queue, records, outboxes };
}

describe('servicio de telemetría', () => {
  it('confirma la persistencia antes de responder y publica alerta baja', async () => {
    const { store, queue } = setup();
    const result = await acceptMessage(message(), store, queue, { clock: () => now });
    expect(result).toEqual({
      status: 'accepted',
      eventId: 'e1',
      acceptedAt: now.toISOString(),
      correlationId: 'c1',
    });
    expect(store.save).toHaveBeenCalledOnce();
    expect(queue.send).toHaveBeenCalledOnce();
    expect(store.published).toHaveBeenCalledOnce();
  });
  it('devuelve la identidad y acceptedAt originales en duplicado sin republicar', async () => {
    const original = toEventRecord({
      ...message(),
      acceptedAt: '2026-10-08T11:00:00.000Z',
      correlationId: 'original',
    });
    const { store, queue } = setup({ outcome: 'duplicate', record: original });
    await expect(acceptMessage(message(), store, queue)).resolves.toMatchObject({
      acceptedAt: original.acceptedAt,
      correlationId: 'original',
    });
    expect(queue.send).not.toHaveBeenCalled();
  });
  it('rechaza conflicto de idempotencia sin publicar', async () => {
    const { store, queue } = setup({ outcome: 'conflict' });
    await expect(acceptMessage(message(), store, queue)).rejects.toBeInstanceOf(
      IdempotencyConflict,
    );
    expect(queue.send).not.toHaveBeenCalled();
  });
  it('no devuelve aceptación si falla la transacción', async () => {
    const { store, queue } = setup();
    vi.mocked(store.save).mockRejectedValueOnce(new Error('transaction failed'));
    await expect(acceptMessage(message(), store, queue)).rejects.toThrow('transaction failed');
    expect(queue.send).not.toHaveBeenCalled();
  });
  it('deja pendiente y recupera publicación fallida con el mismo alertId', async () => {
    const { store, queue, outboxes } = setup();
    vi.mocked(queue.send).mockRejectedValueOnce(new Error('SQS unavailable'));
    await acceptMessage(message(), store, queue, { clock: () => now });
    const alertId = 'LOW_BATTERY:e1';
    expect(outboxes.get(alertId)?.status).toBe('PENDING');
    await recoverPending(
      store,
      { send: vi.fn(async () => undefined) },
      { clock: () => now, remainingTimeMs: () => 10_000 },
    );
    expect(store.due).toHaveBeenCalled();
  });
  it('no crea alerta para batería exactamente 20 y respeta batch máximo', async () => {
    const { store, queue } = setup();
    await acceptMessage(message(20), store, queue);
    expect(queue.send).not.toHaveBeenCalled();
    expect(await recoverPending(store, queue, { maxBatch: 50 })).toBe(0);
    expect(store.due).toHaveBeenCalledWith(expect.any(String), 25);
  });
  it('preserva 202 lógico ante fallos posteriores de claim, SQS y defer', async () => {
    const claimFailure = setup();
    vi.mocked(claimFailure.store.claim).mockRejectedValueOnce(new Error('claim unavailable'));
    await expect(
      acceptMessage(message(), claimFailure.store, claimFailure.queue, { clock: () => now }),
    ).resolves.toMatchObject({ status: 'accepted' });
    const deferFailure = setup();
    vi.mocked(deferFailure.queue.send).mockRejectedValueOnce(new Error('SQS uncertain'));
    vi.mocked(deferFailure.store.defer).mockRejectedValueOnce(new Error('defer unavailable'));
    await expect(
      acceptMessage(message(), deferFailure.store, deferFailure.queue, { clock: () => now }),
    ).resolves.toMatchObject({ status: 'accepted' });
  });
  it('continúa el lote cuando una candidata de recuperación falla', async () => {
    const { store, queue } = setup();
    const one = toOutbox(toEventRecord(message()))!;
    const two = { ...one, eventId: 'e2', alertId: 'LOW_BATTERY:e2' };
    vi.mocked(store.due).mockResolvedValueOnce([one, two]);
    vi.mocked(store.claim)
      .mockRejectedValueOnce(new Error('first claim failed'))
      .mockResolvedValueOnce({ ...two, claimToken: 'second', attempts: 1 });
    expect(await recoverPending(store, queue, { clock: () => now })).toBe(1);
    expect(queue.send).toHaveBeenCalledOnce();
  });
});
