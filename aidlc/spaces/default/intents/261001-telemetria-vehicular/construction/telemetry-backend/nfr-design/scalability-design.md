# Diseño de escalabilidad

## Desacoplamiento

API Gateway y SQS estándar absorben ráfagas sin exigir que el procesamiento escale al mismo instante. Lambda consume horizontalmente desde la cola; DynamoDB usa capacidad ajustable al patrón de carga. La clave global eventId distribuye eventos, y la salida usa alertId determinista como identidad; se comprueba que las claves no concentren escrituras (NFR1.3, NFR2.3).

## Control de capacidad

El perfil de referencia es 100 solicitudes válidas/s con p95 ≤ 500 ms y ≥99 % de escrituras en <30 s. La edad de mensaje, profundidad de cola, duración Lambda, throttling y errores DynamoDB señalan saturación; el diseño de infraestructura fija lote, concurrencia, visibilidad y capacidad después de medir. Revisar cuotas de API Gateway, SQS, Lambda, DynamoDB y KMS antes de la prueba de carga (NFR1.3, NFR2.3).

## Crecimiento y costo

CDK parametriza límites por entorno con topología equivalente y escala distinta. DynamoDB TTL marca elegibilidad a 90 días, pero la eliminación física es eventual. El presupuesto de almacenamiento se calcula con tasa y tamaño observados; 100 solicitudes/s es un perfil de prueba, no un pronóstico permanente. Aplicar etiquetas de costo y revisar costo por evento aceptado (NFR9.1, NFR4.2).
