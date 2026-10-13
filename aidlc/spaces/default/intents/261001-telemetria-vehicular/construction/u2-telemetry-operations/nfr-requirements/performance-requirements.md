# Rendimiento — U2

## Alcance

U2 mide el contrato HTTP y los hitos de persistencia definidos por U1, además de separar los efectos de cuotas y fallos de servicio. No cambia la respuesta `202` ni exige completar SQS antes de aceptar el evento.

| ID | Requisito medible | Comprobación | Fuente |
|---|---|---|---|
| NFR1.4 | En staging, una carga sostenida de 100 solicitudes válidas/s tendrá latencia HTTP de extremo a extremo p95 ≤ 500 ms. Reportar también p50, p99, tasa efectiva, 4xx/5xx, limitaciones y uso de recursos. | Perfil reproducible con claves y datos únicos; registrar mezcla de tipos y proporción de batería baja. | NFR1, AC5.1.1 |
| NFR2.4 | El 100 % de respuestas `202` seguirá al commit durable del evento y de Outbox cuando corresponda; ≥99 % de eventos válidos alcanzará ese estado en menos de 30 s desde la recepción. | Correlacionar recepción, commit y respuesta; ningún 202 puede preceder a la escritura durable. | NFR2, AC5.1.2 |
| NFR1.5 | La configuración por clave verifica tasa objetivo 100 solicitudes/s, ráfaga 200 y cuota diaria 5,000,000; tasa y limitación se reportan por clave. | Aislar clave y reloj de prueba; verificar el último pedido permitido y el primero excedente por dimensión; separar los resultados de otra clave. | FR2.2, AC1.2.5 |
| NFR1.6 | El informe de carga separa fallos de servicio de errores del productor y respuestas de cuota, sin excluirlos del conteo general de resultado. | Ejecutar casos de límite/credencial aparte del perfil válido y reconciliar cada categoría. | NFR1, FR2.1, FR2.2, AC1.2.4, AC1.2.5 |

## Perfil y límites

- El perfil incluye batería baja y eventos sin Outbox con correlationId consultable.
- Una prueba simulada verifica causalidad y contrato; solo staging representa latencia real.
- Conservar resultados, configuración, tasa efectiva y periodo. No declarar cumplimiento antes de ejecutar y revisar evidencia reproducible.

## Fuentes

`inception/requirements-analysis/requirements.md`, `inception/contract-design/contract-summary.md`, `inception/user-stories/stories.md`, `functional-design/functional-spec.md` y `functional-design/rules.md`.
