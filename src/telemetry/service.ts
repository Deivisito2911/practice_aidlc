import type { EventStore, Queue } from './adapters.js';
import { toAlert, toEventRecord, toOutbox, type InboundMessage } from './model.js';

export class IdempotencyConflict extends Error {
  constructor() {
    super('IDEMPOTENCY_CONFLICT');
  }
}
export async function processMessage(message: InboundMessage, store: EventStore): Promise<void> {
  const record = toEventRecord(message);
  const outcome = await store.save(record, toOutbox(record));
  if (outcome === 'conflict') throw new IdempotencyConflict();
}
export async function publishPending(
  store: EventStore,
  queue: Queue,
  now: string,
): Promise<number> {
  const pending = await store.pending(now);
  let published = 0;
  for (const outbox of pending) {
    await queue.send(JSON.stringify(toAlert(outbox)), outbox.correlationId);
    await store.published(outbox.alertId);
    published++;
  }
  return published;
}
export interface RedriveRequest {
  actor: string;
  authorizedActors: string[];
  scope: string[];
  ratePerSecond: number;
  destination: string;
  confirmed: boolean;
}
export function authorizeRedrive(request: RedriveRequest): void {
  if (
    !request.authorizedActors.includes(request.actor) ||
    request.scope.length === 0 ||
    !request.confirmed ||
    request.ratePerSecond <= 0 ||
    !request.destination
  )
    throw new Error('Redrive no autorizado o incompleto');
}
