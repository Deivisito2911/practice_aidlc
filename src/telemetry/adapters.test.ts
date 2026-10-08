import { describe, expect, it, vi } from 'vitest';
import { DynamoEventStore, SqsQueue } from './adapters.js';
import { toEventRecord, toOutbox, validateEvent } from './model.js';

const body = JSON.stringify({
  eventId: 'event-1',
  vehicleId: 'vehicle-1',
  eventType: 'battery',
  timestamp: '2026-10-08T12:00:00Z',
  value: 19,
});
const record = toEventRecord({
  event: validateEvent(body, new Date('2026-10-08T12:00:00Z')),
  rawPayload: body,
  acceptedAt: '2026-10-08T12:00:00.000Z',
  correlationId: 'c',
});
describe('adaptadores AWS', () => {
  it('exige confirmación de MessageId de SQS', async () => {
    const send = vi.fn().mockResolvedValueOnce({ MessageId: 'm' }).mockResolvedValueOnce({});
    const queue = new SqsQueue({ send } as never, 'queue-url');
    await expect(queue.send('{}', 'c')).resolves.toBeUndefined();
    await expect(queue.send('{}', 'c')).rejects.toThrow('no confirmó');
  });
  it('crea evento y salida en una transacción y detecta duplicado', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Object.assign(new Error(), { name: 'TransactionCanceledException' }))
      .mockResolvedValueOnce({ Item: record });
    const store = new DynamoEventStore({ send } as never, 'events', 'outbox');
    expect(await store.save(record, toOutbox(record))).toBe('created');
    expect(send.mock.calls[0][0].input.TransactItems).toHaveLength(2);
    expect(await store.save(record, toOutbox(record))).toBe('duplicate');
  });
  it('identifica conflicto sin nueva escritura tras fallo condicional', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error(), { name: 'ConditionalCheckFailedException' }),
      )
      .mockResolvedValueOnce({ Item: { ...record, canonicalHash: 'different' } });
    expect(await new DynamoEventStore({ send } as never, 'events', 'outbox').save(record)).toBe(
      'conflict',
    );
  });
  it('mantiene pendiente si falla la transición', async () => {
    const send = vi.fn().mockRejectedValue(new Error('Dynamo unavailable'));
    await expect(
      new DynamoEventStore({ send } as never, 'events', 'outbox').published('a'),
    ).rejects.toThrow('Dynamo unavailable');
  });
});
