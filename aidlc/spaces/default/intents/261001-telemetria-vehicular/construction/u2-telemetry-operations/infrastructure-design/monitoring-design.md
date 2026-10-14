# Diseño de monitoreo — U2

## Metrics & KPIs

Todas las métricas propias usan VehicleTelemetry y `Service=TelemetryService` en EMF, métricas CDK, alarmas y widgets. Edades/duraciones usan Seconds y cantidades Count; IDs individuales nunca son dimensiones. Las métricas nativas de API Gateway, EventBridge y SQS conservan sus dimensiones propias.

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| IngestLatencyP95 | API Gateway/Lambda, 1 min | SLI target p95 ≤500 ms during 100 valid RPS; alert after 5 min above target with sufficient sample | Detecta regresión de latencia sin mezclar trabajos manuales. |
| DurableWithin30sPercent | Recepción/commit correlacionados | Objetivo ≥99 % por cohorte; 100 % de 202 debe tener commit previo | Demuestra aceptación durable y demora de procesamiento. |
| HttpServiceErrorRate | API 5xx/Lambda errors; excluye 4xx y quota | ≥1 % y ≥100 solicitudes en 5 min | Detecta fallos de servicio. |
| OutboxPendingCount | Consulta métricas agregadas de Outbox | >100 por 10 min | Señal de acumulación. |
| OutboxOldestPendingAge | Outbox DueByShard | >600 s por 5 min | Señala retraso de recuperación. |
| SqsVisibleDepth | SQS ApproximateNumberOfMessagesVisible | >100 por 5 min | Detecta cola externa acumulada. |
| TtlEligibleUndeleted | GSI TtlByShard, cada hora | >1,000 con edad >24 h por 1 h | Distingue elegibilidad vencida de retraso TTL inusual. |
| EventBridgeFailedInvocations | Métricas de regla Lambda target | ≥1 en 5 min | Alerta de recuperación/sondeo que no se ejecutó. |
| ManualRecoverySummary | Logs/métricas Lambda | Conteos por estado por ejecución; error si falla autorización/preview | Hace visible la operación autorizada sin alta cardinalidad. |

## Alerts

El comparador de errores es GREATER_THAN_OR_EQUAL_TO_THRESHOLD con umbral 1 %, condicionado a al menos 100 solicitudes elegibles. La prueba de frontera usa 100/1, 100/0, menos de 100, y 4xx/cuotas clasificados aparte. Cada assertion de alarma verifica dimensión, unidad, estadística, periodo, evaluaciones, umbral y destino, además de su existencia.

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Outbox age | Age >600 s durante 5 min | High | Topic ARN de guardia del entorno; revisar publicación/EventoBridge, luego CLI con P3 y preview. |
| Outbox count | Count >100 durante 10 min | Medium | Topic guardia; revisar tasa, índice, IAM y errores SQS. |
| SQS visible backlog | Visible >100 durante 5 min | Medium | Topic guardia; revisar consumidor downstream y envío. |
| TTL delay | Eligible >1,000 y oldest >24 h durante 1 h | Low | Topic guardia; revisar activación métrica, GSI/backfill y actividad TTL; no borrar registros manualmente. |
| EventBridge invocation failure | ≥1 en 5 min | High | Topic guardia; revisar regla, permiso y errores Lambda. |
| Service errors | Error rate ≥1 % sobre ≥100 requests en 5 min | High | Topic guardia; segmentar API/Lambda/DynamoDB/SQS. |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| HTTP latency p95 | ≤500 ms bajo 100 solicitudes válidas/s | Perfil staging reproducible de 15 min; emitir resultado por ejecución. |
| Durable acceptance | 100 % de 202 después de commit; ≥99 % válido persistido en <30 s | Cohorte por prueba y reporte por ventana. |
| Ingestion availability | ≥99.9 %, minutos disponibles / todos los minutos calendario, mantenimiento incluido | Mes calendario completo de staging. |
| TTL eligibility | `expiresAt = acceptedAt + 90 días`; borrado físico eventual | Validación por evento; backlog de elegibles cada hora. |

## Logs & Tracing

Mantener el log group existente con retención 90 días y cifrado de cuenta/clave existente. Loguear JSON con correlationId, actor P3, operation, runId, limit, preview fingerprint, counts, duración y causa. Excluir API key, payload crudo y secretos. Los IDs individuales se quedan en logs de acceso restringido y no como dimensión de métricas. CloudTrail conserva actor/acción/fecha/recurso; el dashboard enlaza por runId/correlationId hacia logs y métricas, sin mostrar payload.

**Dashboards:** uno de staging para latencia, carga válida, tasa de error/quota separada, durable <30s, Outbox count/edad/resultado, SQS visible, evento TTL elegible, invocaciones EventBridge y resultado manual. Producción conserva las mismas vistas con alarmas y destino de producción. Los informes mensuales guardan fórmula y denominadores; los valores sintéticos se etiquetan como prueba de fórmula.

F5 incorpora contadores por HTTP 202/400/409/5xx, commit confirmado/fallido/incierto, envío SQS confirmado/fallido/incierto y marcado PUBLISHED; tiempo recepción-a-commit con reloj coherente, sin contar resultados no confirmados como durables. Un cálculo mensual puro valida población y denominador completo, incluidos mantenimiento y minutos no observados como no demostrados. El widget de mes real no muestra como cumplimiento el resultado sintético. F6 agrega requestId de plataforma, resultados omitidos/no iniciados y marca parcial a los logs manuales sin actor autoritativo del payload.

## Fuentes

`nfr-design/observability-design.md`, `nfr-design/reliability-design.md`, `nfr-design/security-design.md`, `nfr-design/performance-design.md`, `nfr-requirements/observability-requirements.md` y `inception/contract-design/contract-summary.md`.
