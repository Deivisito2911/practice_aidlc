# Diseño de monitoreo

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| Latencia p95 de POST /telemetry-events | API Gateway/Lambda de ingreso | ≤500 ms a 100 solicitudes válidas/s | NFR1.1. |
| Persistencia antes de 30 s | Métrica de acceptedAt a transacción | ≥99 % de aceptados | NFR2.1. |
| Disponibilidad mensual de ingreso | Solicitudes válidas aceptadas / minutos totales del mes | ≥99,9 % | NFR3.1, sin excluir mantenimiento. |
| Edad de mensaje de entrada | SQS | Investigar si supera 30 s durante 5 min | Señala riesgo para NFR2.1. |
| Mensajes DLQ | SQS | Alarma con cualquier mensaje durante 1 min | Requiere recuperación operativa. |
| Salida PENDING más antigua | Índice de salidas / métrica propia | Investigar si supera 60 s durante 5 min | Detecta publicador detenido. |
| Errores de Lambda/DynamoDB/publicación | CloudWatch/métricas propias | Cualquier tasa sostenida anómala en 5 min | Localiza fallo por componente. |
| Registros TTL elegibles presentes | Métrica programada | Tendencia creciente anómala, comparada con línea base | TTL es eventual; no se promete borrado puntual. |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| DLQ con mensajes | Profundidad >0 | Alta | Guardia operativa y procedimiento de redrive. |
| Atraso de ingreso | Edad >30 s durante 5 min | Alta | Guardia operativa; revisar Lambda y DynamoDB. |
| Salidas detenidas | PENDING más antigua >60 s durante 5 min | Alta | Guardia operativa; revisar publicador/SQS. |
| Error persistente | Errores Lambda/DynamoDB o publicación por 5 min | Alta | Guardia operativa. |
| TTL anómalo | Acumulación creciente frente a línea base | Media | Revisión operativa; sin SLO de borrado físico. |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Disponibilidad de ingestión | 99,9 % | Mes calendario completo en staging. |
| Latencia de aceptación p95 | ≤500 ms a 100 solicitudes/s | Prueba sostenida en staging. |
| Persistencia y salida oportuna | ≥99 % en <30 s | Población correlacionada de prueba integral. |

## Logs & Tracing

Logs JSON en CloudWatch con correlationId y eventId, sin payload crudo ni secretos. Propagar correlationId en atributos SQS y registros de evento/salida/alerta. El panel muestra API → entrada → procesamiento → persistencia → salida → alertas; cada alarma enlaza a un procedimiento con indicador, ventana, severidad, destino y recuperación. Los umbrales iniciales se revisan con la primera línea base de carga.
