# Diseño de fiabilidad — U1

## Persistencia y recuperación

La transacción condicional escribe TelemetryEvent y OutboxEntry juntos. Ante confirmación incierta, se consulta eventId de forma coherente antes de afirmar un 202; si no puede comprobarse, se devuelve 503 y el productor reintenta con el mismo ID. El Outbox retiene PENDING hasta confirmación SQS y actualización condicional. Su contenido basta para publicar aunque TTL haya eliminado el evento.

| Requisito | Patrón aplicado | Prueba |
|---|---|---|
| NFR3.1 | Servicio gestionado con sondas externas para disponibilidad mensual de staging; cambios de Lambda compatibles y reversibles. No se excluyen ventanas de mantenimiento. | Mes real observado; cálculo sintético solo comprueba fórmula. |
| NFR3.2 | Transacción DynamoDB atómica, condiciones de no existencia y respuesta no exitosa cuando el commit es incierto y no verificable. | Fallos antes/durante/después del commit; sin estado parcial ni 202 indebido. |
| NFR3.3 | Outbox PENDING durable, alertId determinista y barrido EventBridge de la misma Lambda. SQS puede duplicar físicamente; consumidor contractual deduplica por alertId. | Caída y recuperación SQS, mismo alertId en todas las copias. |
| NFR3.4 | Reclamación condicional con claimToken y leaseUntil; solo dueño vigente marca PUBLISHED. Vencimiento recupera una salida abandonada. | Dos invocaciones concurrentes y propietario vencido. |
| NFR4.1 | acceptedAt único a precisión de segundos y expiresAt numérico = acceptedAt + 90 días; TTL habilitado solo en eventos. | Contrato, registro y configuración. |
| NFR4.2 | Vigilar registros elegibles aún presentes; tratar eliminación física como eventual. Documentar que un ID no se reutiliza después de TTL. | Métrica/alarma de elegibilidad y contrato al productor. |
| NFR4.3 | Copiar vehicleId, occurredAt, batteryValue y correlationId en Outbox; PENDING no comparte TTL del evento. | Publicar tras eliminar el evento de prueba. |

## Reintentos y degradación

Cada intento usa una reclamación exclusiva y plazo finito. Un fallo confirmado libera o difiere el siguiente intento con retroceso y dispersión; un timeout incierto puede dejar vencer el lease. Nunca se cambia alertId ni se marca PUBLISHED sin confirmación SQS y actualización condicional. El primer intento HTTP se limita en tiempo y no revoca 202. El barrido procesa pendientes elegibles hasta su límite, dejando el resto para otra invocación.

El usuario no fijó un máximo de entrega después de restablecer SQS. La garantía exigida es recuperación eventual cuando vuelva a haber servicio y barridos; edad y cantidad de PENDING detectan estancamiento. Infrastructure Design fija frecuencia, tiempos y límites medidos, sin convertirlos en una promesa nueva de entrega.

## Reversión y protección de datos

El artefacto Lambda puede revertirse sin cambiar el significado de los campos obligatorios ni deshacer registros PENDING. Las tablas y claves se conservan en una reversión; no se borra Outbox pendiente. El CDK define copia de seguridad/recuperación apropiada para las tablas y se verifica una restauración en un entorno aislado antes de producción.
