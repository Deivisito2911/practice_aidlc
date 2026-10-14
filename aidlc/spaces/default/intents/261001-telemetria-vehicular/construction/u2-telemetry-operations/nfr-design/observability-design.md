# Diseño de observabilidad — U2

## Instrumentación

Usar logs estructurados correlacionados con correlationId, alertId/eventId cuando existan, actor P3 para la CLI, run ID, alcance, límite, huella, duración y conteos. Nunca registrar API keys, secretos, cuerpo crudo o payload de telemetría. Métricas de baja cardinalidad cuentan estado HTTP, fallos de persistencia/publicación, commits, transiciones PENDING/PUBLISHED, invocaciones EventBridge, preview/ejecución manual y resultados de lote. IDs individuales permanecen en logs restringidos, no como dimensiones de métricas.

Todas las métricas propias y sus consumidores usan namespace VehicleTelemetry y dimensión exacta Service=TelemetryService; cada unidad física es explícita: duraciones y edades en Seconds, cantidades en Count. Emitir estados HTTP y clases de resultado por nombres de métrica estables, sin identificadores como dimensiones. Capturar recepción y commit por separado con reloj coherente; el tiempo hasta commit se observa solo cuando existe confirmación durable. Registrar requestId de plataforma para recuperación manual; actor del payload no es evidencia de identidad.

Esta arquitectura implementa **NFR7.6, NFR7.7, NFR7.8, NFR7.9, NFR7.10 y NFR7.11**.

| Alarma | Indicador y umbral inicial | Ventana | Severidad / destino | Respuesta |
|---|---|---|---|---|
| PENDING antiguo | Antigüedad máxima PENDING >10 min | 5 min | Alta / canal guardia staging | Revisar SQS, EventBridge y causa; autorizar CLI solo tras preview. |
| PENDING acumulado | Cantidad PENDING >100 | 10 min | Media / canal guardia staging | Inspeccionar ritmo de publicación y backlog; procesar lotes controlados. |
| SQS alertas acumulada | Mensajes visibles >100 | 5 min | Media / canal guardia staging | Revisar consumidor/cola, publicación y efecto de reintentos. |
| TTL elegible pendiente | >1,000 registros elegibles y más antiguos que 24 h | 1 h | Baja / canal guardia staging | Investigar configuración/ritmo de TTL; no anunciar fallo por un registro individual. |
| EventBridge error | ≥1 fallo de invocación | 5 min | Alta / canal guardia staging | Revisar regla, permiso e invocación; confirmar próxima recuperación. |
| Errores de servicio | ≥1 % de error entre ≥100 solicitudes | 5 min | Alta / canal guardia staging | Segmentar Lambda/DynamoDB/SQS; excluir 4xx y limitación del denominador de errores de servicio. |

Infrastructure Design vincula estos indicadores a las métricas y dimensiones físicas disponibles, destino y permisos por ambiente. El dashboard presenta SLI de p95, durable <30s, disponibilidad mensual completa, backlog, señales TTL y tasa de fallos, con fórmulas/denominadores visibles. El detalle mensual conserva sus datos fuente y versión de cálculo.

F2/F4 requieren assertions del namespace, dimensión, unidad, ventana y comparador inclusive para errores de servicio: 1 error entre 100 solicitudes elegibles produce 1 % y alarma; menos de 100 no satisface el mínimo. Los 4xx/cuotas se clasifican aparte, conservando el conteo total para conciliación. F5 exige pruebas de cada evento de commit/publicación/fallo y del dashboard; una ruta de código existente no es evidencia de una alarma emitida. F7 mantiene pruebas locales, mediciones reales y brechas con estados separados.

## Correlación de diagnóstico

La secuencia observable es API Gateway → TelemetryService → transacción TelemetryEvent/Outbox → SQS, más EventBridge → misma Lambda → recuperación PENDING. Para manual recovery, agregar identidad efectiva, correlationId y RecoveryRunId al rastro; no usar PII ni dimensionar métricas con identificadores individuales.

## Fuentes

`nfr-requirements/observability-requirements.md`, `nfr-requirements/performance-requirements.md`, `nfr-requirements/reliability-requirements.md`, `nfr-requirements/security-requirements.md`, `functional-design/functional-spec.md` y `inception/contract-design/contract-summary.md`.
