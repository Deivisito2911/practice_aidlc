# Requisitos de observabilidad

| ID | Requisito verificable | Evidencia |
|---|---|---|
| NFR7.4 | Emitir logs estructurados de aceptación/rechazo, fallo Lambda, conflicto de idempotencia, error DynamoDB, publicación fallida y transición de salida. Incluir correlationId, eventId disponible, recepción y causa; omitir secretos y rawPayload. | Inyectar cada condición y consultar logs. |
| NFR7.5 | Medir solicitudes aceptadas/rechazadas, latencia HTTP, tiempo desde acceptedAt hasta persistencia, edad/profundidad de SQS, mensajes DLQ, salidas PENDING, errores y publicaciones. | Inventario de métricas con dimensiones y unidades. |
| NFR7.6 | Cada alarma crítica documenta indicador, umbral, ventana, severidad, destino y procedimiento de recuperación. Cubrir atraso de cola, DLQ, PENDING anómalo, errores y acumulación TTL. | Revisar alarmas desplegadas y provocar una señal de prueba. |
| NFR7.7 | Un operador puede seguir API → SQS → Lambda → DynamoDB → salida → alerta mediante correlationId y eventId. | Recorrido integral con correlación conservada. |
| NFR3.2 | La disponibilidad mensual se calcula con el denominador de NFR3.1, sin excluir ventanas de mantenimiento. | Consulta reproducible de la métrica. |

Los valores concretos de umbral y ventana de las alarmas operativas se fijarán en Infrastructure Design. No se registra el cuerpo crudo en trazas ni logs.
