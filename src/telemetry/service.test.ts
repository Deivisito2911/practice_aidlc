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
    expect(store.due).toHaveBeenCalledWith(expect.any(String), 25, expect.any(AbortSignal));
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

describe('regresiones compartidas de publicación y observación', () => {
  it('timeout de publicación conserva aceptación durable y PENDING sin marcar', async () => {
    const h = setup();
    let signal: AbortSignal | undefined;
    vi.mocked(h.queue.send).mockImplementation(async (_body, _id, abort) => {
      signal = abort;
      await new Promise<void>((_resolve, reject) =>
        abort?.addEventListener('abort', () => reject(new Error('abort'))),
      );
    });
    expect(
      await acceptMessage(message(), h.store, h.queue, { clock: () => now, immediateBudgetMs: 5 }),
    ).toMatchObject({ status: 'accepted' });
    expect(signal?.aborted).toBe(true);
    expect(h.store.published).not.toHaveBeenCalled();
    expect(h.outboxes.get('LOW_BATTERY:e1')?.status).toBe('PENDING');
  });
  it('SQS confirmado seguido de fallo al marcar conserva identidad y recuperación', async () => {
    const h = setup();
    const observations: string[] = [];
    vi.mocked(h.store.published).mockRejectedValueOnce(new Error('mark failed'));
    await acceptMessage(message(), h.store, h.queue, {
      clock: () => now,
      observe: (event) => observations.push(event.name),
    });
    expect(observations).toContain('SqsConfirmed');
    expect(observations).toContain('PublishUncertain');
    expect(observations).not.toContain('SqsFailed');
    h.records.clear();
    expect(await recoverPending(h.store, h.queue, { clock: () => now })).toBe(1);
    const messages = vi.mocked(h.queue.send).mock.calls.map((call) => JSON.parse(call[0]));
    expect(messages[0]).toEqual({
      alertId: 'LOW_BATTERY:e1',
      eventId: 'e1',
      vehicleId: 'v1',
      alertType: 'LOW_BATTERY',
      batteryValue: 19,
      occurredAt: now.toISOString(),
    });
    expect(messages[1].alertId).toBe(messages[0].alertId);
  });
  it('falla claim sin atribuirlo a SQS y observador fallido no altera commit', async () => {
    const h = setup();
    const observations: string[] = [];
    vi.mocked(h.store.claim).mockRejectedValueOnce(new Error('claim'));
    expect(
      await acceptMessage(message(), h.store, h.queue, {
        clock: () => now,
        observe: (event) => observations.push(event.name),
      }),
    ).toMatchObject({ status: 'accepted' });
    expect(observations).toContain('ClaimFailed');
    expect(observations).not.toContain('SqsFailed');
    expect(h.queue.send).not.toHaveBeenCalled();
    const other = setup();
    expect(
      await acceptMessage(message(20), other.store, other.queue, {
        observe: () => {
          throw new Error('observer');
        },
      }),
    ).toMatchObject({ status: 'accepted' });
  });
  it('reloj negativo no acredita latencia ni durable bajo 30 segundos', async () => {
    const h = setup();
    const events: string[] = [];
    await acceptMessage(message(20), h.store, h.queue, {
      clock: () => now,
      receivedAtMs: now.getTime() + 1,
      observe: (event) => events.push(event.name),
    });
    expect(events).toContain('MeasurementInvalid');
    expect(events).not.toContain('DurableWithin30s');
    expect(events).not.toContain('ReceiveToCommit');
  });
  it('eventos fuera de orden producen alertas independientes sin estado acumulativo', async () => {
    const h = setup();
    await acceptMessage(
      { ...message(), event: { ...message().event, eventId: 'newer' } },
      h.store,
      h.queue,
      { clock: () => now },
    );
    await acceptMessage(
      {
        ...message(),
        event: { ...message().event, eventId: 'older', timestamp: '2026-10-08T11:00:00.000Z' },
      },
      h.store,
      h.queue,
      { clock: () => now },
    );
    expect(h.records.size).toBe(2);
    expect(h.outboxes.size).toBe(2);
    expect(h.queue.send).toHaveBeenCalledTimes(2);
  });
});

it.each(['TimeoutError', 'NetworkingError', 'AbortError', 'UnconfirmedSqsSend'])(
  'resultado %s fuera de deadline sigue incierto/PENDING',
  async (name) => {
    const h = setup();
    const events: string[] = [];
    vi.mocked(h.queue.send).mockRejectedValueOnce(
      Object.assign(new Error('response lost'), { name }),
    );
    await acceptMessage(message(), h.store, h.queue, {
      clock: () => now,
      observe: (event) => events.push(event.name),
    });
    expect(events).toContain('SqsUncertain');
    expect(h.store.defer).not.toHaveBeenCalled();
    expect(h.store.published).not.toHaveBeenCalled();
    expect(h.outboxes.get('LOW_BATTERY:e1')?.status).toBe('PENDING');
  },
);
it('rechazo SQS explícito se clasifica fallido y difiere', async () => {
  const h = setup();
  const events: string[] = [];
  vi.mocked(h.queue.send).mockRejectedValueOnce(
    Object.assign(new Error('denied'), { name: 'AccessDeniedException' }),
  );
  await acceptMessage(message(), h.store, h.queue, {
    clock: () => now,
    observe: (event) => events.push(event.name),
  });
  expect(events).toContain('SqsFailed');
  expect(h.store.defer).toHaveBeenCalledOnce();
});

describe('cierre de assertions funcionales U1 bajo U2', () => {
  it.each([0, 19.99])('batería %s crea salida durable determinista', async (value) => {
    const h = setup();
    await acceptMessage(message(value), h.store, h.queue, { clock: () => now });
    expect(h.records.size).toBe(1);
    expect(h.outboxes.get('LOW_BATTERY:e1')).toMatchObject({
      batteryValue: value,
      alertId: 'LOW_BATTERY:e1',
    });
  });
  it.each(['temperature', 'speed'] as const)(
    '%s no crea salida ni publicación',
    async (eventType) => {
      const h = setup();
      const inbound = message(10);
      inbound.event.eventType = eventType;
      await acceptMessage(inbound, h.store, h.queue, { clock: () => now });
      expect(h.records.size).toBe(1);
      expect(h.outboxes.size).toBe(0);
      expect(h.queue.send).not.toHaveBeenCalled();
    },
  );
  it('recuperación posterior no republica la salida PUBLISHED', async () => {
    const h = setup();
    await acceptMessage(message(), h.store, h.queue, { clock: () => now });
    expect(h.outboxes.get('LOW_BATTERY:e1')?.status).toBe('PUBLISHED');
    expect(await recoverPending(h.store, h.queue, { clock: () => now })).toBe(0);
    expect(h.queue.send).toHaveBeenCalledOnce();
  });
});
