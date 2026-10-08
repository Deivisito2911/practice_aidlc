import { describe, expect, it, vi } from 'vitest';
import type { EventStore, Queue } from './adapters.js';
import { toEventRecord, toOutbox, validateEvent } from './model.js';
import { authorizeRedrive, processMessage, publishPending } from './service.js';

const rawPayload = JSON.stringify({
  eventId: 'e',
  vehicleId: 'v',
  eventType: 'battery',
  timestamp: '2026-10-08T12:00:00Z',
  value: 19.99,
});
const message = {
  event: validateEvent(rawPayload, new Date('2026-10-08T12:00:00Z')),
  rawPayload,
  acceptedAt: '2026-10-08T12:00:00.000Z',
  correlationId: 'c',
};
function fakeStore(): EventStore {
  return {
    save: vi.fn().mockResolvedValue('created'),
    pending: vi.fn().mockResolvedValue([]),
    published: vi.fn().mockResolvedValue(undefined),
  };
}
describe('casos de uso', () => {
  it('crea salida para 19,99 y no para 20', async () => {
    const store = fakeStore();
    await processMessage(message, store);
    expect(vi.mocked(store.save).mock.calls[0][1]?.batteryValue).toBe(19.99);
    const twenty = { ...message, event: { ...message.event, value: 20 } };
    await processMessage(twenty, store);
    expect(vi.mocked(store.save).mock.calls[1][1]).toBeUndefined();
  });
  it('trata un conflicto como error para reintento y DLQ', async () => {
    const store = fakeStore();
    vi.mocked(store.save).mockResolvedValue('conflict');
    await expect(processMessage(message, store)).rejects.toThrow('IDEMPOTENCY_CONFLICT');
  });
  it('conserva la salida pendiente ante fallo de publicación y recupera con alertId estable', async () => {
    const store = fakeStore();
    vi.mocked(store.pending).mockResolvedValue([toOutbox(toEventRecord(message))!]);
    const queue: Queue = {
      send: vi.fn().mockRejectedValueOnce(new Error('SQS down')).mockResolvedValue(undefined),
    };
    await expect(publishPending(store, queue, message.acceptedAt)).rejects.toThrow('SQS down');
    expect(store.published).not.toHaveBeenCalled();
    expect(await publishPending(store, queue, message.acceptedAt)).toBe(1);
    expect(JSON.parse(vi.mocked(queue.send).mock.calls[0][0]).alertId).toBe(
      JSON.parse(vi.mocked(queue.send).mock.calls[1][0]).alertId,
    );
  });
  it('rechaza redrive no autorizado o sin alcance y permite uno confirmado', () => {
    const request = {
      actor: 'operator',
      authorizedActors: ['operator'],
      scope: ['m1'],
      ratePerSecond: 10,
      destination: 'input',
      confirmed: true,
    };
    expect(() => authorizeRedrive(request)).not.toThrow();
    expect(() => authorizeRedrive({ ...request, scope: [] })).toThrow();
    expect(() => authorizeRedrive({ ...request, actor: 'other' })).toThrow();
  });
});
