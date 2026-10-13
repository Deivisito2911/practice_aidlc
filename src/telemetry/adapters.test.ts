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
});
