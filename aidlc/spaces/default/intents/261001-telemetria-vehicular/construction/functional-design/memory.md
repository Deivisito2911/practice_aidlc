<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
- 2026-10-13T15:31:50Z — F6 concreta condiciones ya exigidas por la recuperación manual de U2: referencia verificable de alcance, IDs, límite y vigencia, identidad auditada por invocación y presupuesto global. Se preservan reglas BR7 y topología; los valores operativos se asignan en Infrastructure Design y las assertions faltantes permanecen en F7 hasta tener evidencia.
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->

## Interpretations
- 2026-10-08T04:04:03Z — La decisión posterior de alerta lógica prevalece sobre una historia que prometía una sola entrega física. Se corrigió AC3.1.5 para permitir reentregas con alertId estable y deduplicación contractual.

## Tradeoffs
- 2026-10-08T04:04:03Z — rawPayload conserva el cuerpo HTTP original y los metadatos se almacenan aparte. Así se satisface la trazabilidad del dato crudo junto con acceptedAt, TTL y la salida PENDING atómica.
