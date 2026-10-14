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

## Open questions
- 2026-10-14T16:06:20Z — La frontera Construcción→Operación exige cero hallazgos sin resolver, pero F8/F9 requieren despliegue y mediciones de etapas de Operación. El informe de fase conserva FAIL y solicita una decisión explícita de revisión del criterio o del alcance antes de avanzar.


## Deviations
- 2026-10-14T16:40:00Z — La revisión humana autorizó continuar con la frontera en FAIL para obtener evidencia externa en Operación; F7, F8 y F9 permanecen abiertos. El informe de verificación registra la excepción sin cambiar objetivos a Met ni cerrar hallazgos.
