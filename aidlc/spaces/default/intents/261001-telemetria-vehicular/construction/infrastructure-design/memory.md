<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

## Interpretations
- 2026-10-08T04:16:32Z — La validación por tipo y reloj exige una función de ingreso antes de SQS. Se alineó el catálogo de componentes y el contrato con esta decisión para que la implementación no dependa de una integración directa incapaz de expresar toda la validación.

## Tradeoffs
- 2026-10-08T04:16:32Z — Se eligieron tablas separadas para evento y salida, unidas por transacción, para mantener eventId como PK del evento y permitir recuperación de PENDING por índice.
