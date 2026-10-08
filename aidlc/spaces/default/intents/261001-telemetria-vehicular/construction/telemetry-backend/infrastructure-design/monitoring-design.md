# Diseño de monitoreo

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| Latencia p95 de POST /telemetry-events | API Gateway + Lambda única + confirmación DynamoDB | ≤500 ms a 100 solicitudes válidas/s | NFR1.1; incluye BVA y persistencia síncrona. |
| Persistencia antes de 30 s | `acceptedAt` de la Lambda a confirmación DynamoDB | ≥99 % de solicitudes válidas aceptadas con 202 | NFR2.1; cada 202 confirma ya la escritura del evento y de la salida PENDING cuando corresponde. |
| Disponibilidad mensual de ingreso | Minutos con sonda sintética válida que recibe 202 tras confirmar DynamoDB / todos los minutos del mes | ≥99,9 % | NFR3.1 y NFR3.2; un minuto sin resultado cuenta como no disponible, incluido mantenimiento. |
| Rechazos de validación BVA | Métrica `400` de la Lambda por causa | Investigar si ≥1 por minuto durante 5 min | Demuestra rechazo temprano sin escritura DynamoDB ni publicación SQS. |
| Salida PENDING más antigua | Índice de salidas / métrica propia | Investigar si supera 60 s durante 5 min | Detecta publicador detenido. |
| Errores de Lambda/DynamoDB/publicación | CloudWatch/métricas propias | ≥1 error por minuto durante 5 min; revisar contra línea base después de carga | Distinguir fallo HTTP/DB de reintento del outbox y de SQS de alertas. |
| Registros TTL elegibles presentes | Métrica programada | Tendencia creciente anómala, comparada con línea base | TTL es eventual; no se promete borrado puntual. |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Fallo de persistencia HTTP | Error DynamoDB o Lambda en solicitudes válidas durante 5 min | Alta | Tema SNS de guardia operativa; ningún fallo devuelve 202. |
| Rechazos BVA sostenidos | ≥1 respuesta 400 por minuto durante 5 min | Media | Tema SNS de revisión operativa; revisar productor y motivos, sin redrive. |
| Salidas detenidas | PENDING más antigua >60 s durante 5 min | Alta | Tema SNS de guardia operativa; revisar publicador/SQS. |
| Error persistente | ≥1 error por minuto durante 5 min en Lambda única, DynamoDB o publicación | Alta | Tema SNS de guardia operativa y procedimiento del tramo afectado. |
| TTL anómalo | Elegibles presentes aumentan en tres muestras diarias consecutivas frente a línea base | Media | Tema SNS de revisión operativa; sin SLO de borrado físico. |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Disponibilidad de ingreso y persistencia | ≥99,9 % de minutos con 202 posterior a DynamoDB confirmado por sonda | Mes calendario completo en staging, sin excluir mantenimiento ni muestras ausentes. |
| Latencia de aceptación p95 | ≤500 ms a 100 solicitudes/s | Prueba sostenida en staging. |
| Persistencia con salida PENDING cuando corresponde | ≥99 % en <30 s desde acceptedAt | Población correlacionada de solicitudes válidas aceptadas con 202. |

## Logs & Tracing

Logs JSON en CloudWatch con correlationId y eventId, sin payload crudo ni secretos. Propagar correlationId desde API Gateway a la Lambda, al evento, a la salida y a la alerta. El panel muestra API → Lambda única (BVA y persistencia) → DynamoDB evento/outbox → SQS de alertas; el barrido EventBridge invoca esa misma Lambda. Separar respuestas 400, persistencias 202 y publicación de alertas. Cada alarma enlaza a indicador, ventana, severidad, destino y recuperación. La sonda sintética emplea un evento identificable y credencial administrada como secreto; sus eventos se separan de métricas de negocio. Probar alarmas y entrega a SNS antes de producción.

## Alcance de la medición

NFR2.1 conserva «aceptados» como denominador: la Lambda solo devuelve 202 después de validar BVA y confirmar DynamoDB. Las respuestas 400 se cuentan por separado y nunca entran en la población aceptada. No existen métricas de SQS de entrada ni DLQ de ingreso en esta arquitectura; las referencias previas a ellas se corrigen en los artefactos aguas arriba.
