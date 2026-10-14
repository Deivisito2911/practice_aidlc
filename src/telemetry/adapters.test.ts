import { describe, expect, it, vi } from 'vitest';
import { DynamoEventStore, SqsQueue } from './adapters.js';
import { toEventRecord, toOutbox, validateEvent } from './model.js';

const now = '2026-10-08T12:00:00.000Z';
const raw = JSON.stringify({
  eventId: 'event-1',
  vehicleId: 'vehicle-1',
  eventType: 'battery',
  timestamp: now,
  value: 19,
});
const record = toEventRecord({
  event: validateEvent(raw, new Date(now)),
  rawPayload: raw,
  acceptedAt: now,
  correlationId: 'c',
});
const outbox = toOutbox(record)!;

describe('adaptadores AWS', () => {
  it('confirma publicación SQS por MessageId', async () => {
    const send = vi.fn().mockResolvedValueOnce({ MessageId: 'm' }).mockResolvedValueOnce({});
    const queue = new SqsQueue({ send } as never, 'queue-url');
    await expect(queue.send('{}', 'c')).resolves.toBeUndefined();
    await expect(queue.send('{}', 'c')).rejects.toThrow('MessageId');
  });
  it('escribe evento y Outbox en una transacción y lee duplicado coherente', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Object.assign(new Error(), { name: 'TransactionCanceledException' }))
      .mockResolvedValueOnce({ Item: record });
    const store = new DynamoEventStore({ send } as never, 'events', 'outbox');
    expect(await store.save(record, outbox)).toMatchObject({ outcome: 'created' });
    expect(send.mock.calls[0][0].input.TransactItems).toHaveLength(2);
    expect(await store.save(record, outbox)).toMatchObject({ outcome: 'duplicate', record });
    expect(send.mock.calls[2][0].input.ConsistentRead).toBe(true);
  });
  it('propaga fallo transaccional si la lectura coherente también falla', async () => {
    const transactionError = new Error('transaction unavailable');
    const send = vi
      .fn()
      .mockRejectedValueOnce(transactionError)
      .mockRejectedValueOnce(new Error('read unavailable'));
    await expect(
      new DynamoEventStore({ send } as never, 'events', 'outbox').save(record),
    ).rejects.toThrow('read unavailable');
  });
  it('consulta los shards y pagina resultados vencidos', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ Items: [outbox], LastEvaluatedKey: { alertId: 'a' } })
      .mockResolvedValueOnce({ Items: [{ ...outbox, alertId: 'b' }] })
      .mockResolvedValue({ Items: [] });
    const store = new DynamoEventStore({ send } as never, 'events', 'outbox');
    const results = await store.due(now, 25);
    expect(results).toHaveLength(2);
    expect(send.mock.calls[0][0].input.IndexName).toBe('DueByShard');
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ alertId: 'a' });
  });
  it('usa token en claim, confirmación y diferimiento', async () => {
    const send = vi.fn().mockResolvedValue({
      Attributes: {
        ...outbox,
        claimToken: 'claim-token',
        leaseUntil: '2026-10-08T12:00:30.000Z',
        attempts: 1,
      },
    });
    const store = new DynamoEventStore({ send } as never, 'events', 'outbox', () => 'claim-token');
    const claimed = await store.claim(outbox, now, 30);
    expect(claimed?.claimToken).toBe('claim-token');
    expect(claimed?.attempts).toBe(1);
    expect(send.mock.calls[0][0].input.ConditionExpression).toContain('nextAttemptAt <= :now');
    expect(send.mock.calls[0][0].input.UpdateExpression).toContain('lastAttemptAt');
    expect(await store.published(outbox, 'claim-token', now)).toBe(true);
    expect(send.mock.calls[1][0].input.ConditionExpression).toContain('leaseUntil > :now');
    expect(await store.defer(outbox, 'claim-token', '2026-10-08T12:01:00.000Z')).toBe(true);
  });
  it('trata carrera de claim como no reclamado', async () => {
    const send = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error(), { name: 'ConditionalCheckFailedException' }));
    await expect(
      new DynamoEventStore({ send } as never, 'events', 'outbox').claim(outbox, now, 30),
    ).resolves.toBeUndefined();
  });
  it('consulta TTL con corte estricto, pagina y distingue límite inferior', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ Items: [{ eventId: 'a' }], LastEvaluatedKey: { eventId: 'a' } })
      .mockResolvedValueOnce({ Items: [{ eventId: 'b' }] })
      .mockResolvedValue({ Items: [] });
    const store = new DynamoEventStore({ send } as never, 'events', 'outbox');
    expect(await store.ttlEligible(100000, 10)).toEqual({
      count: 2,
      complete: true,
      lowerBound: false,
    });
    expect(send.mock.calls[0][0].input).toMatchObject({
      IndexName: 'TtlByShard',
      KeyConditionExpression: 'ttlShard = :shard AND expiresAt < :cutoff',
      ExpressionAttributeValues: { ':cutoff': 13600 },
    });
    expect(send.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ eventId: 'a' });
    send.mockReset().mockResolvedValue({ Items: [{ eventId: 'a' }] });
    expect(await store.ttlEligible(100000, 1)).toEqual({
      count: 1,
      complete: false,
      lowerBound: true,
    });
  });
  it('incluye superior a 24 h y excluye el corte exacto mediante condición física', async () => {
    const send = vi.fn(async (command) => ({
      Items: [13599, 13600, 13601]
        .filter((expiresAt) => expiresAt < command.input.ExpressionAttributeValues[':cutoff'])
        .map((expiresAt) => ({ eventId: String(expiresAt) })),
    }));
    expect(
      (await new DynamoEventStore({ send } as never, 'events', 'outbox').ttlEligible(100000, 100))
        .count,
    ).toBe(16);
  });
  it('TTL cancelado es parcial y fallo de permisos no se publica como cero', async () => {
    const send = vi.fn().mockRejectedValue(new Error('AccessDenied'));
    const store = new DynamoEventStore({ send } as never, 'events', 'outbox');
    await expect(store.ttlEligible(100000, 25)).rejects.toThrow('AccessDenied');
    expect(await store.ttlEligible(100000, 25, AbortSignal.abort())).toMatchObject({
      complete: false,
    });
  });
  it('backfill condicional repetido o de evento borrado no crea registros ni altera expiresAt', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({
        Items: [
          { eventId: 'gone', expiresAt: 10 },
          { eventId: 'already', expiresAt: 20 },
        ],
      })
      .mockRejectedValue(Object.assign(new Error(), { name: 'ConditionalCheckFailedException' }));
    const store = new DynamoEventStore({ send } as never, 'events', 'outbox');
    expect(await store.backfillTtl()).toMatchObject({ scanned: 2, updated: 0 });
    for (const call of send.mock.calls.slice(1)) {
      expect(call[0].input.ConditionExpression).toContain('attribute_exists(expiresAt)');
      expect(call[0].input.ConditionExpression).toContain('attribute_not_exists(ttlShard)');
      expect(call[0].input.UpdateExpression).toBe('SET ttlShard = :shard');
    }
  });
  it('resultado de commit incierto se comprueba con lectura coherente; sin registro no acepta', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout after commit'))
      .mockResolvedValueOnce({ Item: record });
    const store = new DynamoEventStore({ send } as never, 'events', 'outbox');
    expect(await store.save(record, outbox)).toMatchObject({ outcome: 'duplicate', record });
    expect(send.mock.calls[1][0].input.ConsistentRead).toBe(true);
    send
      .mockReset()
      .mockRejectedValueOnce(new Error('failed before commit'))
      .mockResolvedValueOnce({});
    await expect(store.save(record, outbox)).rejects.toThrow('failed before commit');
  });
});

describe('medición parcial y colisiones confirmadas', () => {
  it('snapshot acotado anuncia límite inferior sin afirmar edad máxima global', async () => {
    const send = vi.fn().mockResolvedValueOnce({
      Items: Array.from({ length: 101 }, (_, n) => ({ ...outbox, alertId: String(n) })),
      LastEvaluatedKey: { alertId: 'more' },
    });
    const snapshot = await new DynamoEventStore(
      { send } as never,
      'events',
      'outbox',
    ).pendingSnapshot(now);
    expect(snapshot).toMatchObject({ count: 101, complete: false, lowerBound: true });
    expect(send).toHaveBeenCalledOnce();
  });
  it('colisión condicional comprobada es duplicado sin CommitUncertain', async () => {
    const error = Object.assign(new Error('conditional'), {
      name: 'TransactionCanceledException',
      CancellationReasons: [{ Code: 'ConditionalCheckFailed' }],
    });
    const send = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce({ Item: record });
    expect(
      await new DynamoEventStore({ send } as never, 'events', 'outbox').save(record, outbox),
    ).toMatchObject({ outcome: 'duplicate', readAfterFailure: false });
  });
  it('propietario vencido no confirma y dos reclamantes no obtienen posesión simultánea', async () => {
    let claimed = false;
    const send = vi.fn(async (command) => {
      if (command.input.ReturnValues === 'ALL_NEW') {
        if (claimed) throw Object.assign(new Error(), { name: 'ConditionalCheckFailedException' });
        claimed = true;
        return {
          Attributes: { ...outbox, claimToken: 'owner', leaseUntil: '2026-10-08T12:00:30.000Z' },
        };
      }
      throw Object.assign(new Error(), { name: 'ConditionalCheckFailedException' });
    });
    const store = new DynamoEventStore({ send } as never, 'events', 'outbox', () => 'owner');
    const [a, b] = await Promise.all([store.claim(outbox, now, 30), store.claim(outbox, now, 30)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(await store.published(outbox, 'old-owner', '2026-10-08T12:00:31.000Z')).toBe(false);
    expect(send.mock.calls[2][0].input.ConditionExpression).toContain('leaseUntil > :now');
  });
});

it('lease vencido vuelve a ser reclamable y el propietario anterior no confirma', async () => {
  let current = { ...outbox };
  let serial = 0;
  const conditional = () =>
    Object.assign(new Error('conditional'), { name: 'ConditionalCheckFailedException' });
  const send = vi.fn(
    async (command: {
      input: { ReturnValues?: string; ExpressionAttributeValues?: Record<string, unknown> };
    }) => {
      const values = command.input.ExpressionAttributeValues!;
      const moment = String(values[':now']);
      if (command.input.ReturnValues === 'ALL_NEW') {
        if (
          current.status !== 'PENDING' ||
          current.nextAttemptAt! > moment ||
          (current.leaseUntil && current.leaseUntil > moment)
        )
          throw conditional();
        current = {
          ...current,
          claimToken: String(values[':token']),
          leaseUntil: String(values[':lease']),
          nextAttemptAt: String(values[':lease']),
          attempts: current.attempts + 1,
        };
        return { Attributes: { ...current } };
      }
      if (
        current.status !== 'PENDING' ||
        current.claimToken !== values[':token'] ||
        current.leaseUntil! <= moment
      )
        throw conditional();
      current.status = 'PUBLISHED';
      return {};
    },
  );
  const store = new DynamoEventStore(
    { send } as never,
    'events',
    'outbox',
    () => `token-${++serial}`,
  );
  current.nextAttemptAt = '2026-10-08T12:00:01.000Z';
  expect(await store.claim(outbox, now, 30)).toBeUndefined();
  current = { ...outbox };
  const first = await store.claim(outbox, now, 30);
  expect(first).toBeDefined();
  expect(await store.claim(outbox, now, 30)).toBeUndefined();
  const later = '2026-10-08T12:00:31.000Z';
  const next = await store.claim(outbox, later, 30);
  expect(next).toBeDefined();
  expect(next?.claimToken).not.toBe(first?.claimToken);
  expect(await store.published(outbox, first!.claimToken!, later)).toBe(false);
  expect(await store.published(outbox, next!.claimToken!, later)).toBe(true);
});
