# Fiabilidad, disponibilidad y retención — U1

| ID | Requisito comprobable | Evidencia | Fuente |
|---|---|---|---|
| NFR3.1 | El endpoint de ingestión en staging alcanzará disponibilidad ≥ 99,9 % en cada mes calendario: minutos que aceptan solicitudes válidas dentro de cuota / todos los minutos del mes, sin excluir mantenimiento. | Cálculo mensual con sondas externas, denominador completo y ventanas de mantenimiento incluidas. Un periodo sintético solo valida la fórmula. | NFR3 |
| NFR3.2 | Fallos transitorios DynamoDB o resultado de commit incierto no producirán un 202 nuevo sin prueba de persistencia; la transacción no dejará evento y Outbox parciales. | Fallos inyectados antes, durante y después del commit; inspección de ambas tablas y respuesta. | NFR3, NFR2, FR4.3 |
| NFR3.3 | Un fallo o resultado incierto de SQS dejará la salida PENDING, recuperable por la misma Lambda cuando EventBridge vuelva a invocarla. Todas las copias usarán el mismo alertId. | Prueba integrada de caída/restauración y consumidor contractual que deduplica por alertId. | NFR3, FR5.4, FR6.2 |
| NFR3.4 | La reclamación condicional tendrá vencimiento; una invocación caída o un propietario antiguo no bloqueará permanentemente PENDING ni podrá marcar PUBLISHED tras perder el token. | Prueba de dos invocaciones concurrentes, vencimiento y actualización condicional. | NFR3, FR6.1 |
| NFR4.1 | Todo evento confirmado conservará acceptedAt canónico a segundos y expiresAt = acceptedAt + 90 días exactos en segundos Unix; TTL estará habilitado sobre expiresAt. | Comparación de respuesta 202, registro y configuración TTL. | NFR4 |
| NFR4.2 | La eliminación física posterior a expiresAt será eventual y supervisada, sin promesa de plazo máximo. La idempotencia por eventId solo está garantizada mientras el registro exista; el productor no debe reutilizar IDs. | Prueba del cálculo de elegibilidad y señal de acumulación de expirados; documentación del límite contractual. | NFR4 |
| NFR4.3 | Una salida PENDING conservará todos los datos para publicar sin leer un TelemetryEvent que TTL ya pudo eliminar; no se eliminará por el TTL del evento. | Prueba con evento ausente y salida PENDING que se publica tras recuperar SQS. | NFR4, FR5.4 |

## Política de recuperación

El usuario eligió no añadir a U1 un máximo temporal nuevo para entregar alertas después de restaurar SQS. Se exige recuperación eventual en el siguiente barrido elegible, medición de la antigüedad de PENDING y alarma por acumulación; la frecuencia concreta, los reintentos y sus umbrales se fijan en Infrastructure Design. No se afirma entrega exactamente una vez a nivel físico. La durabilidad lógica depende de la transacción Outbox y de la deduplicación del consumidor por alertId.

El objetivo mensual NFR3.1 solo puede declararse cumplido tras observar un mes calendario completo de staging; antes de ello, las pruebas verifican mecanismo y fórmula, no el resultado mensual.
