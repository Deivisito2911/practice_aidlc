# Code Generation Questions — U3 Delivery Controls

## Known dependency and ambiguity

The repository/CI provider, OIDC issuer and subject format, protected branch/environment names, and staging/production AWS account mapping are not specified. The plan therefore defines provider-neutral release controls and avoids provider-specific workflow or trust-policy configuration. A deployable pipeline cannot be activated until the repository owner confirms those inputs and selects a provider capable of credential-free PR validation, OIDC role assumption, required checks, immutable artifacts, and protected environment approval.

The plan selects pinned Gitleaks as a provider-independent secret scanner (`gitleaks detect --source .`). The runner must install that pinned CLI; provider-specific installation syntax waits for the CI platform choice.

## Plan Approval

Review `code-generation-plan.md`, its embedded Testing Contract, and `unit-test-instructions.md`.

[Approval Fingerprint]: sha256:v3:e5d85a24726d44a74617d44400a8e469a8a1b56d0091a9f7f5a1d8fcf9cb4a1c
[Planned Source]: cc438173d2cc39a9c9cc56eda1919add9023a3e83b286e1a4e50cb01432f5ccc
[Answer]: Approve Plan

## CI platform for the following pipeline stage

The user selected GitHub Actions after approving the provider-neutral Code Generation plan. Repository owner/name, AWS account mapping, OIDC trust subjects, and protected environment configuration remain to be supplied for activation in the CI pipeline stage.

[Answer]: GitHub Actions
