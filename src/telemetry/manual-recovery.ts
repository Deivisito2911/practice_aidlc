import { createHash } from 'node:crypto';
import type { EventStore, Queue } from './adapters.js';
import { recoverPending, type ServiceOptions } from './service.js';

export type ManualOperation =
  | { operation: 'manual-recovery'; action: 'preview'; limit: number; correlationId: string }
  | {
      operation: 'manual-recovery';
      action: 'execute';
      limit: number;
      fingerprint: string;
      confirmation: string;
      correlationId: string;
    }
  | {
      operation: 'manual-recovery';
      action: 'backfill';
      cursor?: Record<string, unknown>;
      correlationId: string;
    };

export interface RecoveryPreview {
  status: 'preview';
  scope: 'due-pending';
  ids: string[];
  count: number;
  limit: number;
  fingerprint: string;
  correlationId: string;
}

export async function operateManually(
  operation: ManualOperation,
  store: EventStore,
  queue: Queue,
  options: ServiceOptions = {},
): Promise<Record<string, unknown>> {
  if (operation.action === 'backfill') {
    if (!store.backfillTtl) throw new Error('TTL_BACKFILL_UNAVAILABLE');
    const result = await store.backfillTtl(operation.cursor);
    return { status: 'backfill', ...result, correlationId: operation.correlationId };
  }
  if (!Number.isInteger(operation.limit) || operation.limit < 1 || operation.limit > 25)
    throw new Error('INVALID_RECOVERY_LIMIT');
  const { preview, candidates } = await buildPreview(
    operation.limit,
    operation.correlationId,
    store,
    options,
  );
  if (operation.action === 'preview') return { ...preview };
  if (
    !operation.confirmation ||
    operation.confirmation !== preview.fingerprint ||
    operation.fingerprint !== preview.fingerprint
  )
    throw new Error('PREVIEW_CHANGED_OR_CONFIRMATION_INVALID');
  if (preview.count === 0) throw new Error('EMPTY_RECOVERY_SCOPE');

  const outcomes: Array<{ alertId: string; correlationId: string; published: boolean }> = [];
  // Reuse the same conditional claim, SQS send and PUBLISHED transition as scheduled recovery.
  for (const candidate of candidates) {
    const published =
      (await recoverPending(new SingleCandidateStore(store, candidate), queue, {
        ...options,
        maxBatch: 1,
      })) > 0;
    outcomes.push({
      alertId: candidate.alertId,
      correlationId: candidate.correlationId,
      published,
    });
  }
  const confirmed = outcomes.filter((item) => item.published).length;
  return {
    status: 'complete',
    scope: preview.scope,
    fingerprint: preview.fingerprint,
    count: preview.count,
    confirmed,
    failed: outcomes.filter((item) => !item.published).length,
    pending: preview.count - confirmed,
    outcomes,
    correlationId: operation.correlationId,
  };
}

async function buildPreview(
  limit: number,
  correlationId: string,
  store: EventStore,
  options: ServiceOptions,
): Promise<{ preview: RecoveryPreview; candidates: Awaited<ReturnType<EventStore['due']>> }> {
  const candidates = await store.due((options.clock ?? (() => new Date()))().toISOString(), limit);
  const ordered = [...new Map(candidates.map((item) => [item.alertId, item])).values()]
    .sort((a, b) => a.alertId.localeCompare(b.alertId))
    .slice(0, limit);
  const ids = ordered.map((item) => item.alertId);
  const fingerprint = createHash('sha256')
    .update(JSON.stringify({ scope: 'due-pending', ids }))
    .digest('hex');
  return {
    preview: {
      status: 'preview',
      scope: 'due-pending',
      ids,
      count: ids.length,
      limit,
      fingerprint,
      correlationId,
    },
    candidates: ordered,
  };
}

/** Adapts one candidate while preserving the underlying conditional state transitions. */
class SingleCandidateStore implements EventStore {
  ttlEligible?: EventStore['ttlEligible'];
  backfillTtl?: EventStore['backfillTtl'];
  constructor(
    private readonly source: EventStore,
    private readonly candidate: Awaited<ReturnType<EventStore['due']>>[number],
  ) {
    this.ttlEligible = source.ttlEligible?.bind(source);
    this.backfillTtl = source.backfillTtl?.bind(source);
  }
  save: EventStore['save'] = (...args) => this.source.save(...args);
  due: EventStore['due'] = async () => [this.candidate];
  claim: EventStore['claim'] = (...args) => this.source.claim(...args);
  published: EventStore['published'] = (...args) => this.source.published(...args);
  defer: EventStore['defer'] = (...args) => this.source.defer(...args);
}
