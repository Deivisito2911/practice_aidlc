# Requisitos de confiabilidad

| ID | Requisito verificable | Evidencia |
|---|---|---|
| NFR3.1 | El endpoint de ingreso en staging mantiene disponibilidad mensual ≥99,9 %, con todos los minutos del mes en el denominador y sin excluir mantenimiento. | Métrica mensual o prueba sintética equivalente documentada. |
| NFR4.1 | Cada evento conserva acceptedAt del 202 y expiresAt exactamente 90 días después; TTL está habilitado sobre expiresAt. | Prueba correlacionada y comprobación de configuración. |
| NFR4.2 | La eliminación física posterior a expiresAt es eventual y se supervisa sin prometer plazo máximo. | Métrica y alarma de acumulación anómala de elegibles. |
| NFR7.1 | Fallos parciales de lote reintentan solo mensajes fallidos; maxReceiveCount es cinco y la quinta recepción fallida lleva a DLQ. | Lote mixto y mensaje venenoso. |
| NFR7.2 | Evento y salida PENDING de batería baja se escriben atómicamente; un fallo de publicación mantiene PENDING y un reintento usa el mismo alertId. | Inyección de fallos en transacción y publicación. |
| NFR7.3 | Un resultado incierto puede ocasionar varias entregas físicas; el consumidor contractual produce un solo efecto lógico por alertId. | Prueba de duplicados y conformidad de consumo. |

La restauración desde DLQ requiere autorización, previsualización de alcance y evidencia de resultados por lote. No se fijan RTO/RPO adicionales porque el alcance aprobado solo define disponibilidad, procesamiento, retención y recuperación mediante DLQ/salida.
