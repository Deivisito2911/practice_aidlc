import type { EventStore, Queue } from './adapters.js';
import { createBudget, withinBudget, publishCandidate, type ServiceOptions } from './service.js';
import {
  issuePreview,
  verifyPreview,
  type PreviewEnvelope,
  type PreviewOptions,
} from './recovery-preview.js';

export type ManualOperation =
  | { operation: 'manual-recovery'; action: 'preview'; limit: number; correlationId: string }
  | {
      operation: 'manual-recovery';
      action: 'execute';
      preview: PreviewEnvelope;
      confirmation: string;
      correlationId: string;
    }
  | {
      operation: 'manual-recovery';
      action: 'backfill';
      confirmation: 'BACKFILL';
      cursor?: Record<string, unknown>;
      correlationId: string;
    };

export async function operateManually(
  operation: ManualOperation,
  store: EventStore,
  queue: Queue,
  options: ServiceOptions = {},
): Promise<Record<string, unknown>> {
  const budget = options.budget ?? createBudget(options);
  const owned = !options.budget;
  const now = options.clock ?? (() => new Date());
  const common = {
    correlationId: operation.correlationId,
    invocationRequestId: options.invocationRequestId,
  };
  try {
    if (operation.action === 'backfill') {
      if (operation.confirmation !== 'BACKFILL') throw new Error('CONFIRMATION_REQUIRED');
      if (!store.backfillTtl) throw new Error('TTL_BACKFILL_UNAVAILABLE');
      return {
        status: 'backfill',
        ...(await withinBudget(budget, (signal) => store.backfillTtl!(operation.cursor, signal))),
        ...common,
      };
    }
    const configured = options.preview;
    if (!configured) throw new Error('PREVIEW_MAC_NOT_CONFIGURED');
    const previewOptions: PreviewOptions = { ...configured, clock: now, signal: budget.signal };
    if (operation.action === 'preview') {
      if (!Number.isInteger(operation.limit) || operation.limit < 1 || operation.limit > 25)
        throw new Error('INVALID_RECOVERY_LIMIT');
      const candidates = await withinBudget(budget, (signal) =>
        store.due(now().toISOString(), operation.limit, signal),
      );
      const ids = [
        ...new Set(candidates.filter((row) => row.status === 'PENDING').map((row) => row.alertId)),
      ]
        .sort()
        .slice(0, operation.limit);
      const envelope = await withinBudget(budget, () =>
        issuePreview(ids, operation.limit, previewOptions),
      );
      return {
        status: 'preview',
        scope: envelope.scope,
        ids,
        count: ids.length,
        limit: envelope.limit,
        issuedAt: envelope.issuedAt,
        expiresAt: envelope.expiresAt,
        fingerprint: envelope.digest,
        envelope,
        ...common,
      };
    }
    const envelope = operation.preview;
    if (!envelope || operation.confirmation !== envelope.digest)
      throw new Error('PREVIEW_CHANGED_OR_CONFIRMATION_INVALID');
    await withinBudget(budget, () => verifyPreview(envelope, previewOptions));
    if (envelope.ids.length === 0) throw new Error('EMPTY_RECOVERY_SCOPE');
    const rows = await withinBudget(budget, (signal) =>
      store.due(now().toISOString(), envelope.limit, signal),
    );
    const current = new Map(
      rows.filter((row) => row.status === 'PENDING').map((row) => [row.alertId, row]),
    );
    if ([...current.keys()].some((id) => !envelope.ids.includes(id)))
      throw new Error('PREVIEW_CHANGED_OR_CONFIRMATION_INVALID');
    // Missing IDs are permissible only when their terminal state proves a safe repeat.
    for (const id of envelope.ids.filter((id) => !current.has(id))) {
      const previous = store.readOutbox
        ? await withinBudget(budget, (signal) => store.readOutbox!(id, signal))
        : undefined;
      if (previous?.status !== 'PUBLISHED')
        throw new Error('PREVIEW_CHANGED_OR_CONFIRMATION_INVALID');
    }
    const outcomes: Array<{
      alertId: string;
      outcome: 'confirmed' | 'failed' | 'skipped' | 'not-started';
    }> = [];
    for (const id of envelope.ids) {
      const row = current.get(id);
      if (!row) {
        outcomes.push({ alertId: id, outcome: 'skipped' });
        continue;
      }
      if (budget.remaining() <= 0 || budget.signal.aborted) {
        outcomes.push({ alertId: id, outcome: 'not-started' });
        continue;
      }
      outcomes.push({
        alertId: id,
        outcome: await publishCandidate(store, queue, row, { ...options, budget }),
      });
    }
    const count = (outcome: string) => outcomes.filter((item) => item.outcome === outcome).length;
    const confirmed = count('confirmed'),
      failed = count('failed'),
      skipped = count('skipped'),
      unprocessed = count('not-started');
    return {
      status: unprocessed ? 'partial' : 'complete',
      partial: unprocessed > 0,
      scope: envelope.scope,
      previewId: envelope.previewId,
      fingerprint: envelope.digest,
      count: envelope.ids.length,
      confirmed,
      failed,
      skipped,
      unprocessed,
      pending: failed + unprocessed,
      pendingObservation: 'nonconfirmed-lower-bound',
      outcomes,
      ...common,
    };
  } finally {
    if (owned) budget.close();
  }
}
