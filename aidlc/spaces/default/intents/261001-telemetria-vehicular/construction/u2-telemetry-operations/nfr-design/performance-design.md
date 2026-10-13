# Diseño de rendimiento — U2

## Presupuesto y perfil

Se conserva el objetivo de `POST /telemetry-events` en staging: 100 solicitudes válidas/s sostenidas, p95 ≤500 ms, y al menos 99 % durable en menos de 30 s desde recepción. La operación de publicación de alertas continúa después del commit y permanece acotada por el presupuesto existente; el resultado SQS no altera el `202` durable.

Esta sección materializa **NFR1.4, NFR1.5, NFR1.6 y NFR2.4**.

| Camino | Diseño | Evidencia |
|---|---|---|
| Ingesta HTTP | Validar en memoria antes de escribir; una transacción confirma evento y Outbox; evitar lecturas completas. Mantener cliente/conexiones reutilizables dentro de la única Lambda. | Carga staging con medición cliente p50/p95/p99, tasa efectiva y errores. |
| Recuperación programada | Consultar solo PENDING elegibles por acceso indexado y procesar lotes limitados por tiempo restante; el tamaño/frecuencia se configura en Infrastructure Design. | Carga mixta HTTP + EventBridge con backlog controlado. |
| Preview CLI | Consultar candidatos acotados, producir vista ordenada de IDs, contar y calcular huella; devolver solo resumen sin payload. | Caso de preview pequeño y de límite máximo; medir su duración aparte de ingesta. |
| Ejecución CLI | Confirmación incluye huella/alcance de preview; Lambda vuelve a consultar/recalcular y rechaza cambios antes de publicar. Procesar secuencialmente o en concurrencia limitada por el mismo presupuesto de reintento. | Simulación de candidatos añadidos/eliminados, límite y timeout; no procesar elementos no confirmados. |

No añadir caché a escrituras de estado ni a cuotas. La latencia de un canal operativo no debe degradar el p95 de productores; la capacidad de invocaciones Lambda y límites de concurrencia se asignan por separado donde la plataforma lo permita, sin crear otra función.

## Decisión y tradeoff

Se prioriza trabajo por lotes acotados y consulta selectiva frente a previsualizar todo el Outbox: mantiene tiempo y memoria previsibles, aunque requiere que el operador repita la recuperación para pendientes fuera del límite.

## Fuentes

`nfr-requirements/performance-requirements.md`, `nfr-requirements/scalability-requirements.md`, `nfr-requirements/tech-stack-decisions.md`, `functional-design/functional-spec.md` y `inception/contract-design/contract-summary.md`.
