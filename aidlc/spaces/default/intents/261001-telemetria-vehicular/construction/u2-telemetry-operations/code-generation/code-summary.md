# Code Generation Summary — U2 Operations

## Files changed

U2 extends the existing TelemetryService and CDK stack. Application paths changed by this unit are enumerated in `source-manifest.json`: the operator CLI, handler/recovery/model/adapters, CDK resources and tests, dependency manifests, and README.

## Implementation decisions

- Added stable sharding for the 90-day TTL index, an indexed bounded query, and conditional idempotent backfill that preserves existing expiry values.
- Added a synchronous operator CLI that invokes only the existing Lambda. It previews up to 25 candidate IDs without payloads and requires confirmation bound to a fresh candidate-set fingerprint. The operator role is scoped to invoking that function; API events cannot enter the operator flow.
- Recovery reuses the existing Outbox claim/publish lifecycle and stable alert identity; confirmed sends become PUBLISHED, while failed or uncertain sends remain recoverable as PENDING.
- Added structured operational metrics, TTL/backlog and Outbox/SQS/EventBridge/service alarms with the configured environment notification topic. Existing HTTP, EventBridge, single-Lambda, and alert-queue topology remains intact.

## Verification

- `npx vitest run src/telemetry/manual-recovery.test.ts src/telemetry/handlers-operations.test.ts infra/telemetry-stack-operations.test.ts` — 3 files, 9 tests passed.
- `npx vitest run tests/integration/telemetry-operations.test.ts` — 1 test passed.
- `npm run typecheck`, `npm run lint`, and `npm run cdk:synth` — passed.
- Existing full suites also passed during generation: 37 unit tests and 2 integration tests. Performance SLO measurement remains a staging activity.

## Assigned coverage

The traceability artifact maps all 20 assigned acceptance criteria (AC1.2.1–AC1.2.6, AC4.2.1–AC4.2.5, AC5.1.1–AC5.1.5, AC5.2.1–AC5.2.4), detailed NFRs (NFR1.4, NFR1.5, NFR1.6, NFR2.4, NFR3.5–NFR3.7, NFR4.4, NFR5.6–NFR5.8, NFR7.6–NFR7.11, NFR9.7–NFR9.13, NFR10.3), and business rules BR6.1–BR6.5, BR7.1–BR7.6, BR8.1–BR8.5, BR9.1–BR9.4 to existing implementation or test files.

## Deviations and limits

No scope deviation. Authorization is enforced at the IAM invocation boundary because Lambda does not expose the caller principal to handler code. The operator's explicit invocation policy and the handler's closed event discriminator keep manual recovery separate from public HTTP ingestion. A production month-long availability observation and the approved load profile must still be measured in staging.
