# Code Generation Plan — U3 Delivery Controls

## Unit scope

Deliver US6.2 and US6.3 as packaging controls around the existing TypeScript/AWS CDK service. This unit adds no business logic, application endpoint, database model/repository, frontend, or additional Lambda. It preserves one `TelemetryService` Lambda, the existing API Gateway REST, DynamoDB, EventBridge, and alert-only SQS topology, with no inbound SQS or ingress DLQ. The CI/repository provider and its OIDC issuer/claims are unconfirmed; therefore this plan does not select a provider or define provider-specific workflow, branch-protection, or trust-policy syntax. Provider-specific deployment activation remains blocked until repository owner supplies provider, repository identifier, protected refs/environments, and AWS account mapping.

## Implementation steps (test-after)

1. **Inspect and bound the existing package.** Confirm `package.json`, `package-lock.json`, `vitest.config.ts`, `infra/telemetry-stack.ts`, `infra/telemetry-stack.test.ts`, `infra/telemetry-stack-operations.test.ts`, `tests/integration/telemetry-flow.test.ts`, and `docs/telemetry-verification.md`. Reuse Vitest and current scripts; do not install another runner or alter shared test configuration.
2. **Bootstrap the runner command.** Runner is already configured. Record the unit-scoped command `npx vitest run infra/telemetry-stack-delivery-controls.test.ts` and integration command `npm run test:integration -- tests/integration/telemetry-flow.test.ts`. Confirm Vitest discovers the planned new file before writing its assertions (a no-test-file discovery check may return nonzero and is not a product test).
3. **Production/IaC skeleton.** No new application or production entrypoint is warranted. Make narrowly scoped changes to the existing CDK stack only if needed to encode the security-design requirements without changing ownership/topology, especially the protected KMS-encrypted 90-day CloudTrail archive and least-privilege application/audit boundary. Do not synthesize provider-specific OIDC trust or CI roles while issuer, claims, and account mapping are unknown; document the required separate validation, staging, production, and audit identities and the exact provider inputs needed to implement them. Keep the Lambda execution role separate from delivery roles. Do not create permanent AWS keys or embed credentials.
4. **Data model/database layer — not applicable.** U3 is a packaging unit; U1 owns event and Outbox models, tables, indexes, TTL, and transactions. Do not modify schema or data access. Verify the existing resources through synthesized-template assertions instead.
5. **Repository/data-access layer — not applicable.** No repository or database access behavior belongs to U3.
6. **Business logic layer — not applicable.** U3 adds no telemetry behavior. Runtime and Outbox semantics remain owned by U1/U2.
7. **API/endpoint layer — not applicable.** U3 adds no endpoint and preserves the existing API Gateway integration and single Lambda.
8. **Frontend layer — not applicable.** There is no frontend in this packaging unit.
9. **CDK/IAM assertion tests (write and run after infrastructure implementation).** Add `infra/telemetry-stack-delivery-controls.test.ts` using `aws-cdk-lib/assertions` and the established Vitest conventions. Assert (a) exactly one `AWS::Lambda::Function`, exactly two DynamoDB tables and exactly one SQS queue; (b) no ingress queue or DLQ resource; (c) CloudTrail delivery to the dedicated KMS-encrypted S3 bucket with Object Lock/default retention of at least 90 days and blocked public access; (d) application and delivery IAM policies do not grant CloudTrail administration or audit-object deletion, and trust/role separation is represented without granting wildcard deployment access; and (e) no provider-specific OIDC issuer, claim, or trust constants are introduced before the provider inputs exist; documentation identifies the required inputs and leaves real trust enforcement as an external follow-up. Run `npx vitest run infra/telemetry-stack-delivery-controls.test.ts` after implementation.
10. **Provider-neutral delivery controls and documentation.** Add `docs/telemetry-delivery-controls.md` with the required quality gate order (lockfile install, format, ESLint, typecheck, unit tests, critical AWS-simulated integration, dependency audit, `gitleaks detect --source .`, CDK synth/review), protected-main requirements, squash-only merge, immutable digest promotion to staging, separate human-approved production promotion, and explicit no-AWS-credentials PR validation. Use a pinned Gitleaks release as a provider-independent scanner; the provider runner installs that pinned CLI and runs it against the repository history. Define capability/claim inputs the provider adapter must supply, state provider choice is pending, and distinguish CDK synthesis evidence from verification of real CloudTrail events. Update `docs/telemetry-verification.md` only where needed to document real-account CloudTrail checks and evidence; never claim synthesis proves activity. Do not add provider-specific CI files.
11. **Environment/build configuration.** Keep `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration -- tests/integration/telemetry-flow.test.ts`, `npm run audit:deps`, `gitleaks detect --source .`, and `npm run cdk:synth` as the provider-neutral release gates. Pin and document the Gitleaks version outside provider-specific workflow syntax; do not add a new npm test runner or global test configuration.
12. **Integrated verification and traceability.** After the CDK controls and documentation are integrated, run the scoped CDK assertion test and critical U1 flow test above; then run the existing quality gates applicable to changed artifacts. Trace every US6.2/US6.3 acceptance criterion to an assertion or documented provider/account verification in the code summary and traceability artifact produced during code generation. Do not mark real-account CloudTrail, OIDC assumption, branch protection, or deployment promotion as verified by local tests.

## Story-to-step traceability

| Story / acceptance criteria | Planned evidence |
|---|---|
| US6.2 AC6.2.1 — OIDC, no persistent keys | Steps 3, 10; provider-neutral role/trust requirements documented; concrete OIDC claim enforcement requires provider confirmation. |
| US6.2 AC6.2.2 — CloudTrail identity/action/resource/time | Steps 3, 10, 12; CDK trail assertion plus documented real-account event query. Local synthesis cannot prove emitted events. |
| US6.2 AC6.2.3 — KMS, 90-day retention, protected evidence | Steps 3, 9, 10; assertions for encrypted locked archive and IAM denial boundary. |
| US6.2 AC6.2.4 — staging deploy and manual production approval | Steps 10, 11; provider-neutral promotion contract documented; runtime enforcement awaits provider/account inputs. |
| US6.3 AC6.3.1 — quality, tests, dependency/secret scans | Steps 10, 11; existing repository quality commands plus pinned provider-neutral Gitleaks scan. |
| US6.3 AC6.3.2 — failed check blocks main | Step 10; protected-main required-check contract documented; provider-side evidence deferred. |
| US6.3 AC6.3.3 — review, squash, staging | Steps 10, 12; documented contract and later provider-side evidence. |
| US6.3 AC6.3.4 — critical walking-skeleton flow | Steps 9, 12; run existing `tests/integration/telemetry-flow.test.ts` with simulated AWS. |

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implementaremos cada capa comprobable antes de escribir y ejecutar sus pruebas unitarias; después de integrar las capas, ejecutaremos la prueba crítica del recorrido completo.",
  "scope": "workshop",
  "test_strategy": "minimal",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implementaremos cada capa comprobable antes de escribir y ejecutar sus pruebas unitarias; después de integrar las capas, ejecutaremos la prueba crítica del recorrido completo.\n- Escribiremos pruebas unitarias para validación y respuesta HTTP, idempotencia, escritura transaccional de evento y salida, publicación y recuperación de salidas `PENDING`, y el límite estricto de batería (`value < 20`; `20` no genera alerta).\n- Mantendremos una prueba de integración crítica con servicios AWS simulados que cubra las dos formas de invocación de la misma Lambda: API Gateway REST → DynamoDB con evento y Outbox transaccionales → SQS de alertas, y EventBridge periódico → recuperación de salidas `PENDING`. Comprobaremos que una solicitud inválida no produce escritura ni publicación, que una transacción fallida no deja registros parciales ni devuelve éxito, que `202` llega solo después de confirmar la transacción y que un fallo de publicación conserva la salida para reintento.\n- La integración continua ejecutará formato, *lint*, comprobación de tipos, pruebas y análisis de dependencias y secretos.\n- No se fija todavía un porcentaje numérico de cobertura; la estrategia mínima exige pruebas trazables a los requisitos y que el recorrido crítico permanezca verde."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:53d865b6dafcd3035c42697643318474092fa6ba9827e84c89ec912b9acb7bf1",
  "contract_sha256": "sha256:79373e9495d6b18f14b166d7e4b09eac05c1bdf8b660a2879d9a91bdd9abef75"
}
```

## Unit test instructions

Use the existing Vitest runner and synthesized-template assertions; avoid real AWS accounts/credentials. The scoped unit command is `npx vitest run infra/telemetry-stack-delivery-controls.test.ts`. After integration, run the critical flow command `npm run test:integration -- tests/integration/telemetry-flow.test.ts`. Required project checks remain the existing formatting, lint, types, full unit/integration suites, dependency audit, and CDK synthesis; no percentage coverage target is introduced by workshop scope.

