import type { Observation } from './service.js';
export const METRIC_UNITS: Record<string, 'Count' | 'Seconds'> = {
  ValidationRejected: 'Count',
  HttpRequests: 'Count',
  HttpEligibleRequests: 'Count',
  HttpServiceErrors: 'Count',
  HttpClientErrors: 'Count',
  HttpQuotaRejected: 'Count',
  Http202: 'Count',
  Http400: 'Count',
  Http409: 'Count',
  Http5xx: 'Count',
  IngestLatency: 'Seconds',
  ReceiveToCommit: 'Seconds',
  MeasurementInvalid: 'Count',
  ClaimFailed: 'Count',
  CommitCreated: 'Count',
  CommitDuplicate: 'Count',
  CommitConflict: 'Count',
  CommitFailed: 'Count',
  CommitUncertain: 'Count',
  DurableWithin30s: 'Count',
  DurableAfter30s: 'Count',
  DurableCommitCount: 'Count',
  SqsConfirmed: 'Count',
  SqsFailed: 'Count',
  SqsUncertain: 'Count',
  PublishFailed: 'Count',
  PublishUncertain: 'Count',
  OutboxPublished: 'Count',
  ClaimAcquired: 'Count',
  ClaimSkipped: 'Count',
  DeferFailed: 'Count',
  OutboxPendingCount: 'Count',
  OutboxOldestPendingAge: 'Seconds',
  PendingMeasurementPartial: 'Count',
  TtlEligibleUndeleted: 'Count',
  TtlMeasurementPartial: 'Count',
  ScheduledRecoveryInvocation: 'Count',
  ScheduledRecoveryFailed: 'Count',
  ManualPreview: 'Count',
  ManualExecution: 'Count',
  ManualRejected: 'Count',
  TtlBackfill: 'Count',
  ManualConfirmed: 'Count',
  ManualFailed: 'Count',
  ManualSkipped: 'Count',
  ManualUnprocessed: 'Count',
};
export function emitMetric(
  name: string,
  value: number,
  metadata: Record<string, string | number | boolean | undefined> = {},
): void {
  if (!METRIC_UNITS[name] || !Number.isFinite(value) || value < 0)
    throw new Error('INVALID_METRIC');
  const safe = Object.fromEntries(
    Object.entries(metadata).filter(([key]) =>
      [
        'correlationId',
        'eventId',
        'alertId',
        'invocationRequestId',
        'category',
        'cause',
        'status',
        'partial',
      ].includes(key),
    ),
  );
  console.log(
    JSON.stringify({
      _aws: {
        Timestamp: Date.now(),
        CloudWatchMetrics: [
          {
            Namespace: 'VehicleTelemetry',
            Dimensions: [['Service']],
            Metrics: [{ Name: name, Unit: METRIC_UNITS[name] }],
          },
        ],
      },
      Service: 'TelemetryService',
      [name]: value,
      ...safe,
    }),
  );
}
export function observeService(event: Observation): void {
  const { name, seconds, ...metadata } = event;
  emitMetric(name, seconds ?? 1, { ...metadata, category: 'service' });
  if (name === 'CommitCreated') emitMetric('DurableCommitCount', 1, metadata);
}
export function observeHttp(
  status: number,
  correlationId: string,
  invocationRequestId?: string,
  seconds?: number,
): void {
  const metadata = { correlationId, invocationRequestId, status, category: 'http' };
  emitMetric('HttpRequests', 1, metadata);
  if (status === 202 || status >= 500) emitMetric('HttpEligibleRequests', 1, metadata);
  if (status >= 500) {
    emitMetric('HttpServiceErrors', 1, metadata);
    emitMetric('Http5xx', 1, metadata);
  } else if (status >= 400) {
    emitMetric('HttpClientErrors', 1, metadata);
    if (status === 429) emitMetric('HttpQuotaRejected', 1, metadata);
    if (status === 400 || status === 409) emitMetric(`Http${status}`, 1, metadata);
  } else if (status === 202) {
    emitMetric('Http202', 1, metadata);
    if (seconds !== undefined) emitMetric('IngestLatency', seconds, metadata);
  }
}
export function serviceErrorRate(eligible: number, errors: number): number {
  if (
    !Number.isInteger(eligible) ||
    !Number.isInteger(errors) ||
    eligible < 0 ||
    errors < 0 ||
    errors > eligible
  )
    throw new Error('INVALID_HTTP_POPULATION');
  return eligible >= 100 ? (100 * errors) / eligible : 0;
}
