import type { EventStore, Queue } from './adapters.js';
import {
  toAlert,
  toEventRecord,
  toOutbox,
  type AcceptedResponse,
  type AlertOutbox,
  type InboundMessage,
} from './model.js';
import type { PreviewOptions } from './recovery-preview.js';

export class IdempotencyConflict extends Error {
  constructor() {
    super('IDEMPOTENCY_CONFLICT');
  }
}
export interface Observation {
  name: string;
  correlationId?: string;
  eventId?: string;
  alertId?: string;
  seconds?: number;
  cause?: string;
}
export interface Budget {
  signal: AbortSignal;
  remaining(): number;
  close(): void;
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
  monotonicNow?: () => number;
  maxExecutionMs?: number;
  responseReserveMs?: number;
  budget?: Budget;
  preview?: PreviewOptions;
  observe?: (event: Observation) => void;
  receivedAtMs?: number;
  invocationRequestId?: string;
}
export function createBudget(
  options: ServiceOptions,
  maximum = options.maxExecutionMs ?? 18000,
): Budget {
  const now = options.monotonicNow ?? Date.now;
  const reserve = options.responseReserveMs ?? 2000;
  const allowance = Math.max(
    0,
    Math.min(maximum, (options.remainingTimeMs?.() ?? maximum + reserve) - reserve),
  );
  const deadline = now() + allowance;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('EXECUTION_BUDGET_EXHAUSTED')),
    allowance,
  );
  if (allowance === 0) controller.abort(new Error('EXECUTION_BUDGET_EXHAUSTED'));
  return {
    signal: controller.signal,
    remaining: () =>
      Math.max(0, Math.min(deadline - now(), (options.remainingTimeMs?.() ?? Infinity) - reserve)),
    close: () => clearTimeout(timer),
  };
}
export async function withinBudget<T>(
  budget: Budget,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (budget.remaining() <= 0) throw new Error('EXECUTION_BUDGET_EXHAUSTED');
  budget.signal.throwIfAborted();
  let onAbort: () => void = () => undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(new Error('EXECUTION_BUDGET_EXHAUSTED'));
    budget.signal.addEventListener('abort', onAbort, { once: true });
  });
  try {
    return await Promise.race([operation(budget.signal), aborted]);
  } finally {
    budget.signal.removeEventListener('abort', onAbort);
  }
}
export function observe(options: ServiceOptions, event: Observation): void {
  try {
    options.observe?.(event);
  } catch {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        operation: 'observation-failed',
        correlationId: event.correlationId,
        eventId: event.eventId,
      }),
    );
  }
}
export async function acceptMessage(
  message: InboundMessage,
  store: EventStore,
  queue: Queue,
  options: ServiceOptions = {},
): Promise<AcceptedResponse> {
  const record = toEventRecord(message);
  let saved: Awaited<ReturnType<EventStore['save']>>;
  try {
    saved = await store.save(record, toOutbox(record));
  } catch (error) {
    observe(options, {
      name: 'CommitFailed',
      correlationId: message.correlationId,
      eventId: record.eventId,
      cause: error instanceof Error ? error.name : 'unknown',
    });
    throw error;
  }
  if (saved.readAfterFailure)
    observe(options, {
      name: 'CommitUncertain',
      correlationId: message.correlationId,
      eventId: record.eventId,
    });
  observe(options, {
    name:
      saved.outcome === 'created'
        ? 'CommitCreated'
        : saved.outcome === 'duplicate'
          ? 'CommitDuplicate'
          : 'CommitConflict',
    correlationId: message.correlationId,
    eventId: record.eventId,
  });
  if (saved.outcome === 'conflict') throw new IdempotencyConflict();
  if (saved.outcome === 'created' && options.receivedAtMs !== undefined) {
    const seconds = ((options.clock?.() ?? new Date()).getTime() - options.receivedAtMs) / 1000;
    if (!Number.isFinite(seconds) || seconds < 0)
      observe(options, {
        name: 'MeasurementInvalid',
        correlationId: message.correlationId,
        eventId: record.eventId,
      });
    else {
      observe(options, {
        name: 'ReceiveToCommit',
        seconds,
        correlationId: message.correlationId,
        eventId: record.eventId,
      });
      observe(options, {
        name: seconds < 30 ? 'DurableWithin30s' : 'DurableAfter30s',
        correlationId: message.correlationId,
        eventId: record.eventId,
      });
    }
  }
  const persisted = saved.record ?? record;
  const response: AcceptedResponse = {
    status: 'accepted',
    eventId: persisted.eventId,
    acceptedAt: persisted.acceptedAt,
    correlationId: persisted.correlationId,
  };
  const outbox = toOutbox(persisted);
  if (saved.outcome === 'created' && outbox) {
    const budget = createBudget(
      { ...options, responseReserveMs: 0 },
      options.immediateBudgetMs ?? 150,
    );
    try {
      await publishCandidate(store, queue, outbox, { ...options, budget });
    } finally {
      budget.close();
    }
  }
  return response;
}
export type PublishOutcome = 'confirmed' | 'failed' | 'skipped';
export async function publishCandidate(
  store: EventStore,
  queue: Queue,
  outbox: AlertOutbox,
  options: ServiceOptions,
): Promise<PublishOutcome> {
  const owned = !options.budget;
  const budget = options.budget ?? createBudget(options);
  const now = options.clock ?? (() => new Date());
  const metadata = {
    correlationId: outbox.correlationId,
    eventId: outbox.eventId,
    alertId: outbox.alertId,
  };
  let claimed: AlertOutbox | undefined;
  let phase: 'claim' | 'send' | 'mark' = 'claim';
  try {
    claimed = await withinBudget(budget, (signal) =>
      store.claim(outbox, now().toISOString(), options.leaseSeconds ?? 30, signal),
    );
    if (!claimed?.claimToken) {
      observe(options, { name: 'ClaimSkipped', ...metadata });
      return 'skipped';
    }
    observe(options, { name: 'ClaimAcquired', ...metadata });
    phase = 'send';
    await withinBudget(budget, (signal) =>
      queue.send(JSON.stringify(toAlert(claimed!)), claimed!.correlationId, signal),
    );
    observe(options, { name: 'SqsConfirmed', ...metadata });
    phase = 'mark';
    const marked = await withinBudget(budget, (signal) =>
      store.published(claimed!, claimed!.claimToken!, now().toISOString(), signal),
    );
    observe(options, { name: marked ? 'OutboxPublished' : 'PublishUncertain', ...metadata });
    return marked ? 'confirmed' : 'failed';
  } catch (error) {
    const rejected =
      error instanceof Error &&
      [
        'AccessDeniedException',
        'InvalidMessageContents',
        'QueueDoesNotExist',
        'InvalidAddress',
        'UnsupportedOperation',
        'SqsRejected',
      ].includes(error.name);
    const uncertain =
      budget.signal.aborted ||
      budget.remaining() <= 0 ||
      phase === 'mark' ||
      (phase === 'send' && !rejected);
    observe(options, {
      name:
        phase === 'claim'
          ? 'ClaimFailed'
          : phase === 'mark'
            ? 'PublishUncertain'
            : uncertain
              ? 'SqsUncertain'
              : 'SqsFailed',
      ...metadata,
      cause: error instanceof Error ? error.name : 'unknown',
    });
    console.error(
      JSON.stringify({
        level: 'ERROR',
        operation: 'alert-publish',
        ...metadata,
        cause: error instanceof Error ? error.name : 'unknown',
      }),
    );
    if (claimed?.claimToken && !uncertain) {
      const max = options.maxBackoffMinutes ?? 15;
      const delay = Math.min(
        max * 60000,
        Math.max(1, 2 ** Math.min(claimed.attempts - 1, 4)) *
          60000 *
          (1 + Math.max(0, Math.min(1, options.random?.() ?? Math.random())) * 0.2),
      );
      try {
        await withinBudget(budget, (signal) =>
          store.defer(
            claimed!,
            claimed!.claimToken!,
            new Date(now().getTime() + delay).toISOString(),
            signal,
          ),
        );
      } catch {
        observe(options, { name: 'DeferFailed', ...metadata });
      }
    }
    return 'failed';
  } finally {
    if (owned) budget.close();
  }
}
export async function recoverPending(
  store: EventStore,
  queue: Queue,
  options: ServiceOptions = {},
): Promise<number> {
  const owned = !options.budget;
  const budget = options.budget ?? createBudget(options);
  try {
    const candidates = await withinBudget(budget, (signal) =>
      store.due(
        (options.clock?.() ?? new Date()).toISOString(),
        Math.min(25, options.maxBatch ?? 25),
        signal,
      ),
    );
    let published = 0;
    for (const item of candidates) {
      if (budget.remaining() <= 0 || budget.signal.aborted) break;
      if ((await publishCandidate(store, queue, item, { ...options, budget })) === 'confirmed')
        published++;
    }
    return published;
  } finally {
    if (owned) budget.close();
  }
}
