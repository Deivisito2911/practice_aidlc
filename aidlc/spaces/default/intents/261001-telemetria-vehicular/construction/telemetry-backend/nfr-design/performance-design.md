# Diseño de rendimiento

## Camino de aceptación

La solicitud se valida en el borde, obtiene correlationId y acceptedAt una sola vez, y publica directamente en la cola de entrada. La respuesta 202 llega después de la confirmación de SQS. No hay lectura de DynamoDB en el camino HTTP ni espera del procesador, lo que reserva el presupuesto p95 ≤ 500 ms a validación, autorización, transporte y respuesta (NFR1.1–NFR1.2).

## Camino asíncrono

El procesador consume lotes de SQS y escribe condicionalmente en DynamoDB. La salida PENDING de batería baja se crea en la misma transacción. Se mide desde acceptedAt hasta confirmar la escritura para verificar ≥99 % en <30 s (NFR2.1–NFR2.3). Ajustar tamaño de lote, ventana, concurrencia y capacidad con la prueba sostenida de 100 solicitudes/s; no fijar valores sin medición. La publicación de alertas corre fuera del camino HTTP.

## Optimización

No se añade caché: cada evento es una escritura única y no existe consulta histórica en el alcance. Evitar lecturas previas a la escritura cuando una condición/transacción resuelve la carrera; solo consultar el registro existente para clasificar un conflicto de idempotencia. No hay conexiones persistentes que requieran un pool propio.
