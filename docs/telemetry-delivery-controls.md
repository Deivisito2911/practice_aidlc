# Vehicle telemetry delivery controls

## Status and scope

This document defines the provider-neutral release contract for the existing single-Lambda telemetry service. GitHub Actions has now been selected for the later CI pipeline stage. The infrastructure stack currently defines the service resources and CloudTrail archive. It does not configure GitHub workflows, OIDC trust roles for CI, branch protection, an automated staging deployment, or a production approval environment. Those controls are **NOT implemented or verified**; concrete enforcement is deferred to the CI stage and depends on repository and AWS environment inputs below.

Selected repository/CI provider: GitHub Actions. This selection does not itself enable or verify the required controls.

No pull-request validation job may receive AWS credentials. A future deployment job must exchange a short-lived OIDC token for an STS session. Never store long-lived AWS access keys in repository settings, secrets, build caches, logs, or artifacts. Validation, staging deployment, production deployment, application execution, and audit administration must use distinct identities. Production must require a separate human approval and promote the exact immutable artifact digest already deployed to staging.

The telemetry topology remains API Gateway REST → one `TelemetryService` Lambda → the existing DynamoDB event and Outbox tables, with EventBridge invoking that same Lambda for recovery and SQS used only for outgoing alerts. No ingress queue, ingress DLQ, extra telemetry Lambda, or independent rebuild for production promotion is permitted.

## Required validation sequence

The provider adapter must install dependencies from `package-lock.json`, execute these gates in order, and block merge or promotion on any failure:

1. `npm ci`
2. `npm run format:check`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run test:unit`
6. `npm run test:integration -- tests/integration/telemetry-flow.test.ts`
7. `npm run audit:deps`
8. Install the pinned Gitleaks CLI **v8.30.1** from the official [Gitleaks v8.30.1 release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1), then scan the checkout and Git history with `gitleaks detect --source . --redact`. Do not print unredacted findings into job logs.
9. `npm run cdk:synth`; retain the synthesized template and review IAM, CloudTrail, KMS, retention, and resource changes before deployment.

Gitleaks is run as a pinned standalone CLI so its use does not select a CI provider. The `detect` alias remains available in v8.30.1; Gitleaks documents it as deprecated in favor of the newer `git` and `dir` commands. The required release gate preserves the approved command for compatibility. Keep `--redact` enabled for console output and configure any report artifact so findings cannot expose a secret. See the [official Gitleaks usage documentation](https://github.com/gitleaks/gitleaks#usage).

## Merge and promotion contract

The future provider configuration must enforce all of the following:

- Pull requests, including fork-originated changes, run validation without AWS credentials.
- `main` accepts only reviewed changes with every required check green and squash-only merge enabled. A failed or missing check blocks merge.
- Merge to protected `main` may deploy the validated commit to staging using only the staging OIDC role and account.
- Preserve the immutable digest from validation through staging and production. Production must not rebuild or re-synthesize a different artifact.
- Production promotion runs separately, requires explicit human approval, and uses a distinct production OIDC role and AWS account.
- OIDC trust restricts token audience, repository identity, ref, and protected environment to exact approved values. Forks, unprotected refs, validation jobs, and unrelated repositories cannot assume deployment roles.
- Audit administration is separate from application execution and app deployment. Application and deployment roles cannot stop or alter CloudTrail or delete/shorten retained audit evidence.

These are release requirements, not claims that the provider currently enforces them.

## Inputs required before provider implementation

The repository owner must provide and approve:

- GitHub repository identifier (owner/name) and confirmation of repository visibility/settings;
- protected refs and environments, including exact staging and production environment names;
- OIDC issuer, subject claim format/values, and audience;
- staging and production AWS account IDs and target regions;
- the role boundaries and permitted deployment actions/resources for each environment;
- provider support for credential-free pull-request validation, protected required checks, immutable artifact promotion, and human-gated production deployment.

If a proposed provider cannot enforce each boundary, do not enable automated AWS deployment until an alternative is selected. Scanner findings and allowlist exceptions require security review and a recorded owner; never suppress a finding solely to make a gate pass.

## Evidence boundaries

`npm run cdk:synth` and the CDK assertions are static evidence about the template produced from the source commit. They do not prove that CloudTrail is enabled in an account, that an event was emitted or delivered, that the real OIDC principal can or cannot assume a role, or that provider-side branch/environment protections are active.

Before a real deployment is considered verified, record the commit and synthesized artifact digest, target account/region, deployment identity, and result. In the AWS account, verify the trail is logging and query management events for the deployed API Gateway, Lambda, SQS, DynamoDB, KMS, IAM, and CloudFormation resources. Confirm a returned event includes event time, event name, user identity, event source, and affected resources. Separately verify the audit bucket's KMS encryption, Object Lock default retention, and access boundary. Record only event IDs and the minimum metadata needed for evidence; do not copy unrelated event payloads into build logs.

## References

- U3 security design: `aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u3-delivery-controls/nfr-design/security-design.md`.
- U3 infrastructure: `aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u3-delivery-controls/infrastructure-design/infrastructure-specification.md` and `cicd-pipeline.md`.
- U3 NFRs: `aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u3-delivery-controls/nfr-requirements/security-requirements.md`.
- [Gitleaks v8.30.1 release](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) and [official usage](https://github.com/gitleaks/gitleaks#usage).
