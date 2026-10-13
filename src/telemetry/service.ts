import type { EventStore, Queue } from './adapters.js';
import {
  toAlert,
  toEventRecord,
  toOutbox,
  type AcceptedResponse,
  type AlertOutbox,
  type InboundMessage,
} from './model.js';

export class IdempotencyConflict extends Error {
  constructor() {
    super('IDEMPOTENCY_CONFLICT');
  }
}
export interface ServiceOptions {
  clock?: () => Date;
  uuid?: () => string;
  immediateBudgetMs?: number;
  maxBatch?: number;
  remainingTimeMs?: () => number;
  random?: () => number;
  leaseSeconds?: number;
  maxBackoffMinutes?: number;
}

export async function acceptMessage(
  message: InboundMessage,
  store: EventStore,
  queue: Queue,
  options: ServiceOptions = {},
): Promise<AcceptedResponse> {
  const record = toEventRecord(message);
  const saved = await store.save(record, toOutbox(record));
  if (saved.outcome === 'conflict') throw new IdempotencyConflict();
  const persisted = saved.record ?? record;
  const response: AcceptedResponse = {
    status: 'accepted',
    eventId: persisted.eventId,
    acceptedAt: persisted.acceptedAt,
    correlationId: persisted.correlationId,
  };
  const outbox = toOutbox(persisted);
  if (saved.outcome === 'created' && outbox) await publishOne(store, queue, outbox, options, true);
  return response;
}

async function publishOne(
  store: EventStore,
  queue: Queue,
  outbox: NonNullable<ReturnType<typeof toOutbox>>,
  options: ServiceOptions,
  immediate = false,
): Promise<boolean> {
  const now = (options.clock ?? (() => new Date()))();
  let claimed: AlertOutbox | undefined;
  try {
    claimed = await store.claim(outbox, now.toISOString(), options.leaseSeconds ?? 30);
  } catch (error) {
    logPublishFailure(outbox, error);
    return false;
  }
  if (!claimed?.claimToken) return false;
  const token = claimed.claimToken;
  if (!token) return false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const send = queue.send(JSON.stringify(toAlert(claimed)), claimed.correlationId);
    if (immediate) {
      const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('SQS immediate budget exceeded')),
          options.immediateBudgetMs ?? 150,
        );
      });
      await Promise.race([send, timedOut]);
    } else await send;
    return await store.published(
      claimed,
      token,
      (options.clock ?? (() => new Date()))().toISOString(),
    );
  } catch (error) {
    logPublishFailure(claimed, error);
    const maxBackoffMinutes = options.maxBackoffMinutes ?? 15;
    const baseMinutes = Math.min(
      maxBackoffMinutes,
      Math.max(1, 2 ** Math.min(claimed.attempts - 1, 4)),
    );
    const jitter = Math.max(0, Math.min(1, options.random?.() ?? Math.random())) * 0.2;
    const delayMs = Math.min(maxBackoffMinutes * 60_000, baseMinutes * 60_000 * (1 + jitter));
    const next = new Date(now.getTime() + delayMs).toISOString();
    try {
      await store.defer(claimed, token, next);
    } catch (deferError) {
      logPublishFailure(claimed, deferError, 'outbox-defer');
    }
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function recoverPending(
  store: EventStore,
  queue: Queue,
  options: ServiceOptions = {},
): Promise<number> {
  const clock = options.clock ?? (() => new Date());
  const limit = Math.min(25, options.maxBatch ?? 25);
  const candidates = await store.due(clock().toISOString(), limit);
  let published = 0;
  for (const item of candidates) {
    if ((options.remainingTimeMs?.() ?? Number.POSITIVE_INFINITY) < 2_000) break;
    try {
      if (await publishOne(store, queue, item, options)) published++;
    } catch (error) {
      logPublishFailure(item, error, 'outbox-recovery');
    }
  }
  return published;
}

function logPublishFailure(item: AlertOutbox, error: unknown, operation = 'alert-publish'): void {
  console.error(
    JSON.stringify({
      level: 'ERROR',
      operation,
      correlationId: item.correlationId,
      eventId: item.eventId,
      alertId: item.alertId,
      cause: error instanceof Error ? error.name : 'unknown',
    }),
  );
}
