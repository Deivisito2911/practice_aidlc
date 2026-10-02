# Preguntas de análisis de requisitos

Estas preguntas concretan el contrato observable del servicio, sus límites y los criterios de aceptación. Las prácticas ya afirmadas —TypeScript, AWS CDK, `test-after`, ramas cortas, CI y despliegue— no se vuelven a preguntar.

## Q1. Contrato de entrada HTTP

¿Qué contrato debe exponer la primera versión para recibir telemetría?

A. `POST /telemetry-events` con JSON; devolver `202 Accepted` y un identificador de correlación cuando el evento se valida y publica en SQS; devolver `400` sin publicar si falla la validación.
B. `POST /vehicles/{vehicleId}/telemetry` con JSON; devolver `202 Accepted` al publicar y `400` al validar.
C. Procesamiento síncrono: persistir antes de responder `201 Created`, sin desacoplar la aceptación mediante SQS.
X. Other (please specify)

[Answer]: A. `POST /telemetry-events` con JSON; devolver `202 Accepted` y un identificador de correlación cuando el evento se valida y publica en SQS; devolver `400` sin publicar si falla la validación.

## Q2. Autenticación y autorización de productores

¿Cómo se autentican los sistemas que envían telemetría?

A. OAuth 2.0 `client_credentials` mediante Amazon Cognito; cada cliente solo puede enviar eventos para los vehículos autorizados en sus claims.
B. AWS IAM con firma SigV4 para productores confiables dentro de AWS; las políticas limitan la invocación por productor.
C. Clave de API de API Gateway como único control en esta primera versión, acompañada de cuota y límite de tasa.
D. Sin autenticación solo en un entorno local de demostración; `staging` y producción quedan bloqueados hasta definir autenticación.
X. Other (please specify)

[Answer]: C. Clave de API de API Gateway como único control en esta primera versión, acompañada de cuota y límite de tasa.

## Q3. Tipos de evento y esquema inicial

¿Qué eventos acepta la primera versión?

A. Un esquema común con `eventId`, `vehicleId`, `eventType`, `timestamp` y `value`; `eventType` admite `battery`, `temperature` y `speed`; para `battery`, `value` debe estar entre 0 y 100.
B. Solo eventos `battery` con `eventId`, `vehicleId`, `timestamp` y `value` entre 0 y 100; otros tipos quedan fuera de esta entrega.
C. Un esquema común extensible donde `eventType` es texto libre y `value` no tiene rango global; cada tipo se valida mediante reglas propias.
X. Other (please specify)

[Answer]: A. Un esquema común con `eventId`, `vehicleId`, `eventType`, `timestamp` y `value`; `eventType` admite `battery`, `temperature` y `speed`; para `battery`, `value` debe estar entre 0 y 100.

## Q4. Duplicados e idempotencia

¿Qué debe ocurrir si SQS entrega el mismo evento más de una vez?

A. `eventId` es obligatorio y globalmente único; DynamoDB usa escritura condicional para persistir una sola vez y la alerta asociada se publica como máximo una vez.
B. `eventId` es obligatorio; se permite sobrescribir el mismo registro y publicar alertas repetidas porque los consumidores posteriores deduplicarán.
C. No se garantiza idempotencia en esta primera versión; los duplicados se documentan como limitación.
X. Other (please specify)

[Answer]: A. `eventId` es obligatorio y globalmente único; DynamoDB usa escritura condicional para persistir una sola vez y la alerta asociada se publica como máximo una vez.

## Q5. Reintentos y cola de mensajes fallidos

¿Cómo se gestionan los fallos del consumidor Lambda?

A. SQS estándar con procesamiento parcial de lotes; reintentar mensajes fallidos hasta 5 recepciones y después enviarlos a una DLQ, conservando contexto de correlación y motivo del fallo en logs.
B. SQS estándar; si falla un mensaje, reintentar el lote completo hasta 3 veces y enviarlo a una DLQ.
C. Un solo intento; registrar el error y descartar el mensaje para simplificar el taller.
X. Other (please specify)

[Answer]: A. SQS estándar con procesamiento parcial de lotes; reintentar mensajes fallidos hasta 5 recepciones y después enviarlos a una DLQ, conservando contexto de correlación y motivo del fallo en logs.

## Q6. Contenido y fallo de las alertas

¿Qué debe contener una alerta de batería y qué ocurre si no puede publicarse?

A. Publicar `alertId`, `eventId`, `vehicleId`, `alertType`, `batteryValue` y `occurredAt`; deduplicar por `eventId`; si falla la publicación, el evento original se considera fallido y sigue la política de reintentos/DLQ.
B. Publicar solo `vehicleId`, `batteryValue` y `timestamp`; aceptar alertas duplicadas; registrar los fallos sin reintentar el evento.
C. Persistir primero la alerta en DynamoDB y publicarla posteriormente mediante un proceso separado; definir ese proceso en esta entrega.
X. Other (please specify)

[Answer]: A. Publicar `alertId`, `eventId`, `vehicleId`, `alertType`, `batteryValue` y `occurredAt`; deduplicar por `eventId`; si falla la publicación, el evento original se considera fallido y sigue la política de reintentos/DLQ.

## Q7. Objetivos operativos medibles

¿Qué objetivos debe cumplir la primera versión en `staging`?

A. API con latencia p95 menor o igual a 500 ms a 100 solicitudes por segundo; 99 % de eventos procesados en menos de 30 segundos; disponibilidad mensual de 99,9 %; telemetría retenida 90 días.
B. API con latencia p95 menor o igual a 1 segundo a 20 solicitudes por segundo; 95 % de eventos procesados en menos de 60 segundos; sin objetivo formal de disponibilidad; retención de 30 días.
C. Para el taller, medir latencia y tiempo de procesamiento sin fijar umbrales; conservar telemetría 7 días.
X. Other (please specify)

[Answer]: A. API con latencia p95 menor o igual a 500 ms a 100 solicitudes por segundo; 99 % de eventos procesados en menos de 30 segundos; disponibilidad mensual de 99,9 %; telemetría retenida 90 días.

## Q8. Límites de la primera entrega

¿Qué queda explícitamente fuera de alcance?

A. Paneles, consulta histórica, gestión de vehículos, aplicaciones móviles, notificaciones externas y analítica avanzada; la entrega cubre únicamente ingestión, cola, procesamiento, persistencia y publicación de alertas.
B. Incluir también una API de consulta histórica por vehículo; mantener fuera paneles, móviles, gestión de vehículos y analítica avanzada.
C. Incluir ingestión, consulta histórica y un panel operativo básico en esta primera entrega.
X. Other (please specify)

[Answer]: A. Paneles, consulta histórica, gestión de vehículos, aplicaciones móviles, notificaciones externas y analítica avanzada; la entrega cubre únicamente ingestión, cola, procesamiento, persistencia y publicación de alertas.

## Q9. Unidades, rangos y tiempo del evento

¿Qué semántica se aplicará a los valores y marcas de tiempo?

A. `battery` en porcentaje de 0 a 100; `temperature` en °C de -50 a 150; `speed` en km/h de 0 a 300; `timestamp` en ISO 8601 UTC y no más de 5 minutos en el futuro.
B. Los tres tipos usan números sin límites específicos; `timestamp` acepta cualquier formato ISO 8601 con zona horaria.
C. Mantener `battery` con rango 0-100 y dejar unidades/rangos de `temperature` y `speed` para una versión posterior, aunque los tipos se acepten.
X. Other (please specify)

[Answer]: A. `battery` en porcentaje de 0 a 100; `temperature` en °C de -50 a 150; `speed` en km/h de 0 a 300; `timestamp` en ISO 8601 UTC y no más de 5 minutos en el futuro.

## Q10. Límites de uso por clave de API

¿Qué cuota y límite de tasa se aplican a cada clave?

A. 100 solicitudes por segundo sostenidas, ráfaga de 200 y cuota de 5.000.000 de solicitudes por día.
B. 20 solicitudes por segundo sostenidas, ráfaga de 40 y cuota de 1.000.000 de solicitudes por día.
C. No fijar valores por clave todavía; medir el uso en `staging` y decidirlos antes de producción.
X. Other (please specify)

[Answer]: A. 100 solicitudes por segundo sostenidas, ráfaga de 200 y cuota de 5.000.000 de solicitudes por día.

## Q11. Garantía de entrega de alertas

DynamoDB y SQS no comparten una transacción, por lo que garantizar simultáneamente publicación física exactamente una vez y ausencia total de pérdidas no es realizable. ¿Qué semántica debe prevalecer?

A. Usar un registro de salida duradero y un `alertId` determinista por `eventId`; garantizar que la alerta no se pierda y permitir reentregas físicas con el mismo identificador para que el consumidor las trate como una única alerta lógica.
B. Priorizar publicación física como máximo una vez, aceptando que una respuesta incierta de SQS pueda perder alguna alerta.
C. Priorizar que ninguna alerta se pierda y permitir alertas duplicadas sin exigir deduplicación al consumidor.
X. Other (please specify)

[Answer]: A. Usar un registro de salida duradero y un `alertId` determinista por `eventId`; garantizar que la alerta no se pierda y permitir reentregas físicas con el mismo identificador para que el consumidor las trate como una única alerta lógica.

## Q12. Semántica de retención

El borrado TTL de DynamoDB es asíncrono. ¿Qué significa conservar telemetría durante 90 días?

A. Cada registro queda elegible para eliminación exactamente a los 90 días mediante `expiresAt`; la eliminación física posterior es eventual según DynamoDB, se supervisa y no tiene un plazo máximo propio.
B. Los registros deben eliminarse físicamente como máximo 24 horas después de cumplir 90 días, añadiendo un proceso de limpieza que haga cumplir el límite.
C. Los registros se conservan al menos 90 días y deben eliminarse físicamente dentro de los 7 días siguientes.
X. Other (please specify)

[Answer]: A. Cada registro queda elegible para eliminación exactamente a los 90 días mediante `expiresAt`; la eliminación física posterior es eventual según DynamoDB, se supervisa y no tiene un plazo máximo propio.

## Q13. Instante base para `expiresAt`

¿Desde qué instante se calculan exactamente los 90 días de retención?

A. Desde `timestamp`, el instante en que ocurrió la medición del vehículo; un evento aceptado tarde puede quedar elegible antes de cumplir 90 días almacenado.
B. Desde el instante de aceptación HTTP registrado por el servicio al devolver `202 Accepted`.
C. Desde el instante en que Lambda persiste por primera vez el evento en DynamoDB.
X. Other (please specify)

[Answer]: B. Desde el instante de aceptación HTTP registrado por el servicio al devolver `202 Accepted`.

## Consolidated Summary Confirmation

- La API recibe eventos mediante `POST /telemetry-events`, responde `202 Accepted` tras validar y publicar en SQS, y devuelve `400` sin publicar ante entradas inválidas.
- La primera versión usa una clave de API de API Gateway como único control de acceso, con cuota y límite de tasa.
- El esquema común contiene `eventId`, `vehicleId`, `eventType`, `timestamp` y `value`; admite `battery`, `temperature` y `speed`, con batería entre 0 y 100.
- `eventId` es globalmente único; DynamoDB evita persistencias duplicadas y cada evento representa una única alerta lógica mediante un `alertId` determinista.
- Lambda procesa fallos parciales de lotes; cada mensaje tiene hasta cinco recepciones antes de pasar a DLQ, con correlación y causa en logs.
- Las alertas incluyen `alertId`, `eventId`, `vehicleId`, `alertType`, `batteryValue` y `occurredAt`; un registro de salida duradero evita pérdidas y las reentregas conservan el mismo identificador para permitir deduplicación lógica.
- En `staging`, la API debe alcanzar p95 ≤ 500 ms a 100 solicitudes por segundo; 99 % de eventos en menos de 30 segundos y 99,9 % de disponibilidad mensual. Cada registro queda elegible para eliminación 90 días después del instante de aceptación HTTP asociado al `202 Accepted`; el borrado físico posterior es eventual y supervisado.
- La primera entrega excluye paneles, consulta histórica, gestión de vehículos, aplicaciones móviles, notificaciones externas y analítica avanzada.
- `battery` usa porcentaje de 0 a 100, `temperature` usa °C de -50 a 150, `speed` usa km/h de 0 a 300 y `timestamp` usa ISO 8601 UTC con tolerancia máxima de 5 minutos en el futuro.
- Cada clave permite 100 solicitudes por segundo sostenidas, ráfagas de 200 y una cuota de 5.000.000 de solicitudes diarias.

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct