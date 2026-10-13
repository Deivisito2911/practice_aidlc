# Monitoreo de plataforma — U1

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| Latencia HTTP p95 | API Gateway/sonda cliente | Objetivo ≤500 ms a 100 solicitudes válidas/s en staging | NFR1; incluye intento SQS acotado. |
| Commit antes de 202 | métrica/log correlacionado Lambda | 100 % de respuestas 202 nuevas | Invariante de durabilidad NFR2. |
| Tiempo recepción→commit | Lambda | ≥99 % <30 s | Procesamiento NFR2, independiente de entrega SQS. |
| Disponibilidad mensual | sonda externa | ≥99,9 % por mes calendario | NFR3; incluye mantenimiento. |
| PENDING cantidad y edad máxima | Outbox + métrica custom de barrido | Inicial: >100 pendientes o edad >10 min durante 5 min; ajustar con carga | Detección de salida atascada, sin prometer entrega en 10 min. |
| SQS mensajes visibles | SQS CloudWatch | Inicial: >1000 durante 5 min; ajustar con consumidor externo | Detectar acumulación posterior a publicación. |
| Fallos de publicación | Lambda | ≥1 durante 5 min | Correlacionar degradación SQS. |
| Fallos de regla/invocación | EventBridge y Lambda | ≥1 durante 5 min | Sin barridos no se recupera PENDING. |
| DynamoDB fallos de transacción | Lambda/DynamoDB | ≥1 durante 5 min | Puede impedir 202. |
| Elegibles TTL aún presentes | muestreo acotado de tabla de eventos | Umbral a fijar por U2 tras observar línea base | NFR4 exige supervisar eliminación eventual sin inventar plazo máximo. |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Persistencia indisponible | Fallo transaccional sostenido o 5xx de ingesta | P1 | Operación de plataforma |
| Recuperación detenida | Fallos de EventBridge o de la entrada programada en ventana de 5 min | P1 | Operación de plataforma |
| PENDING acumulado | Edad o cantidad inicial supera umbral de la tabla | P2 | Operación de plataforma; U2 añade runbook |
| SQS de alertas acumulada | Mensajes visibles superan umbral inicial | P2 | Operación de plataforma y propietario consumidor |
| Publicación fallida | Fallos SQS ≥1 en 5 min | P2 | Operación de plataforma |
| TTL anómalo | U2 fija umbral tras línea base | P2 | Operación de plataforma |

Cada alarma en CDK declara indicador, ventana, severidad, destino y recuperación. Los umbrales iniciales no son SLO de entrega; U2 los calibra con datos reales y completa catálogo/runbooks.

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Latencia p95 de solicitudes válidas | ≤500 ms con 100/s | Prueba sostenida de staging |
| Proporción de 202 con commit previo | 100 % | Pruebas e instrumentación continua |
| Eventos válidos confirmados antes de 30 s | ≥99 % | Prueba de carga y ventana operacional |
| Disponibilidad de ingesta | ≥99,9 % | Mes calendario completo en staging |
| Edad máxima PENDING | Sin objetivo máximo de entrega aprobado | Observación y alarma |

## Logs & Tracing

CloudWatch recibe JSON con correlationId, eventId y alertId cuando existan, tipo de entrada, resultado, duración y clase de fallo. Trazas de la misma Lambda enlazan API, transacción DynamoDB, SQS y barrido EventBridge; se restringe su acceso. No registrar x-api-key, rawPayload, cuerpo de petición ni mensaje SQS completo. El panel inicial muestra las métricas anteriores y los enlaces de investigación; U2 termina el catálogo operacional.
