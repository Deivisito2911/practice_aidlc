# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Guard Policy

<!-- Project-specific. Mode: strict, relaxed, or off. Strict here holds for every intent and cannot be changed from chat. A section under the retired Change Control heading, written by an earlier release, is still read. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

- NEVER integrar cambios directamente en `main` sin *pull request* ni fusión *squash*. (affirmed 2026-10-02)

- NEVER promover un despliegue a producción sin aprobación manual. (affirmed 2026-10-02)

- NEVER usar credenciales AWS persistentes en CI cuando el acceso debe realizarse mediante roles temporales OIDC. (affirmed 2026-10-02)

- NEVER integrar cambios si fallan las comprobaciones obligatorias de formato, *lint*, tipos, pruebas, dependencias o secretos. (affirmed 2026-10-02)

- NEVER excluir de la primera rebanada integrada la generación de alertas para valores de batería inferiores al 20 %. (affirmed 2026-10-02)

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

- ALWAYS trabajar con desarrollo basado en tronco mediante ramas de corta duración. (affirmed 2026-10-02)

- ALWAYS someter cada cambio a *pull request* y fusionarlo mediante *squash* a `main`. (affirmed 2026-10-02)

- ALWAYS construir primero una rebanada integrada que recorra API REST, SQS de entrada, Lambda, DynamoDB y la SQS de alertas de batería. (affirmed 2026-10-02)

- ALWAYS aplicar la metodología `test-after`, con pruebas unitarias por capa y una prueba de integración crítica con servicios AWS simulados. (affirmed 2026-10-02)

- ALWAYS ejecutar en CI formato, *lint*, comprobación de tipos, pruebas y análisis de dependencias y secretos antes de integrar cambios. (affirmed 2026-10-02)

- ALWAYS desplegar automáticamente a *staging* después de fusionar a `main` y exigir aprobación manual para producción. (affirmed 2026-10-02)

- ALWAYS definir la infraestructura como código mediante AWS CDK y autenticar el pipeline en AWS con roles temporales OIDC. (affirmed 2026-10-02)

- ALWAYS aplicar IAM de mínimo privilegio, cifrado KMS, auditoría CloudTrail, alarmas, DLQ y un plan de reversión. (affirmed 2026-10-02)

- ALWAYS implementar en TypeScript, usar identificadores en inglés y aplicar Prettier y ESLint. (affirmed 2026-10-02)

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- Verificar que el modelo en Kiro en caso de no tener Claude Opus 4.8 sea GPT 5.6 Sol o superior, ya que con el modelo Terra o menores el razonamiento no rendía para todas las instrucciones de aidlc. (learned 2026-10-02) <!-- cid:261001-telemetria-vehicular:practices-discovery:263cd0f8ac99a5375c3692ad5c555959a81f8b7895ea2c3ec92fef3eb81b6b9b -->
