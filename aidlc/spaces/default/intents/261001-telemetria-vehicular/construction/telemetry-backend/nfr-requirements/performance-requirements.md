# Requisitos de rendimiento

| ID | Requisito verificable | Método |
|---|---|---|
| NFR1.1 | En staging, 100 solicitudes válidas por segundo sostenidas con latencia HTTP p95 ≤ 500 ms para POST /telemetry-events. | Prueba de carga sostenida con eventos válidos, percentil calculado sobre todas las respuestas. |
| NFR1.2 | El objetivo de latencia solo cuenta aceptación tras confirmación de publicación en SQS; un fallo no puede responder 202. | Inyectar fallo de SQS y medir respuesta y ausencia de falso éxito. |
| NFR2.1 | Al menos 99 % de los eventos aceptados queda persistido, y con salida PENDING cuando corresponda, en menos de 30 segundos desde acceptedAt. | Correlacionar aceptación y escritura por eventId; incluir batería baja y otros tipos. |
| NFR2.2 | El cálculo usa el mismo acceptedAt transportado desde la API; se informa el percentil y el porcentaje de incumplimiento. | Prueba integrada con reloj controlado y métricas correlacionadas. |

El presupuesto de 500 ms incluye validación y publicación confirmada en la cola de entrada. Los 30 segundos incluyen espera de cola, procesamiento y escritura, sin confundir una respuesta 202 con persistencia completada.
