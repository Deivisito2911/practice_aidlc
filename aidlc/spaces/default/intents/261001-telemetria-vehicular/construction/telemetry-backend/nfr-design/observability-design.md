# Diseño de observabilidad

## Correlación y logs

El mismo correlationId acompaña HTTP, SQS de entrada, Lambda, evento, salida y alerta. Cada registro estructurado lleva timestamp, componente, nivel, correlationId, eventId disponible, resultado y causa; los fallos agregan contador de recepción. Se excluyen rawPayload, clave API y secretos (NFR7.4, NFR7.7).

## Métricas e indicadores

Medir solicitudes aceptadas/rechazadas, p95 de HTTP, porcentaje de eventos persistidos en <30 s desde acceptedAt, disponibilidad mensual con todos los minutos, edad/profundidad de colas, DLQ, salidas PENDING, errores Lambda/DynamoDB, conflictos y fallos de publicación. La métrica de TTL cuenta elegibles aún presentes; se presenta como indicador de acumulación, no como plazo de borrado (NFR7.5, NFR3.2).

## Alarmas y panel

El panel operativo muestra ingestión, procesamiento, salidas y alertas en una secuencia correlacionable. Cada alarma declara indicador, umbral, ventana, severidad, destino y runbook; cubrir DLQ no vacía, edad de cola, crecimiento PENDING, errores y TTL anómalo. Infrastructure Design concreta números de umbral y ventana antes de desplegar. Una prueba induce cada señal y comprueba notificación (NFR7.6).
