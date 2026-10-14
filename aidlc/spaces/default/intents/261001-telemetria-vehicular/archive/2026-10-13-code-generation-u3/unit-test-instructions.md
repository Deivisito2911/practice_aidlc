# Unit Test Instructions — U3 Delivery Controls

## Runner and exact scoped commands

- Existing test framework/config: Vitest 5 via `vitest.config.ts`; keep the current configuration.
- CDK assertions: `aws-cdk-lib/assertions`, already used by `infra/telemetry-stack.test.ts` and `infra/telemetry-stack-operations.test.ts`.
- Unit-scoped command: `npx vitest run infra/telemetry-stack-delivery-controls.test.ts`.
- Critical integrated behavior: `npm run test:integration -- tests/integration/telemetry-flow.test.ts`.
- These commands use Vitest directly for the infra test because `npm run test:unit` is scoped to `src/telemetry` and does not discover `infra/` tests.

## Planned test file and assertions

Create `infra/telemetry-stack-delivery-controls.test.ts` following existing stack-test setup (`cdk.App`, `TelemetryStack`, `Template.fromStack`, Vitest `describe/it/expect`). Add tests for:

1. **Topology preservation / US6.3 AC6.3.4:** synthesized template contains exactly one Lambda, two DynamoDB tables, and one SQS queue; no ingress queue or DLQ. Assert API Gateway REST method and scheduled EventBridge target still connect to the single telemetry function.
2. **CloudTrail protected archive / US6.2 AC6.2.2–AC6.2.3:** a CloudTrail trail exists, targets its dedicated S3 bucket, and uses KMS; bucket blocks public access, is versioned, has Object Lock/default retention of at least 90 days, and enforces TLS.
3. **IAM separation / US6.2 AC6.2.1, AC6.2.3:** inspect synthesized IAM roles and policies to ensure the Lambda execution role does not administer CloudTrail or delete audit evidence; audit administration is distinct from application execution and app deployment. Ensure no broad wildcard resource grants are introduced for delivery actions. Do not assert provider-specific OIDC trust in CDK while inputs are unknown. Assert that the release-control documentation names the required provider, repository, protected-ref/environment, OIDC issuer/subject/audience, and account inputs before trust can be implemented.
4. **Delivery quality and promotion / US6.2 AC6.2.4, US6.3 AC6.3.1–AC6.3.3:** validate the provider-neutral release-control documentation against a requirements checklist during review; provider-side branch protection, job ordering, immutable digest, and approval enforcement require a concrete provider adapter/account and cannot be proven by local CDK tests.

## Test scope and non-applicable layers

U3 is packaging-only. There is no new model/database behavior, repository, business logic, API endpoint, or frontend. CDK synthesized-template assertions are the narrowest verifiable level for its IAM, CloudTrail, encryption, retention, and resource-topology requirements. The existing AWS-simulated critical integration test is the narrowest level for the inherited telemetry walking skeleton. Do not duplicate U1 behavior in new tests.

## Test-after order

Implement/update the applicable CDK controls first, then write and run the CDK assertions. Integrate the provider-neutral release documentation and run the existing critical integration test. Finally run repository quality gates and CDK synthesis. Use local synthesis as static evidence only; verify actual CloudTrail events and provider-enforced OIDC/branch/environment behavior in their real environments when dependencies are resolved.

