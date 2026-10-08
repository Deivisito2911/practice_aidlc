# Preguntas de Diseño Funcional

Para avanzar con el diseño funcional del backend de telemetría, necesitamos clarificar los siguientes puntos:

1. **Estructura del registro dummy en DynamoDB**
   ¿Cuál debe ser la estructura exacta de los datos (por ejemplo: Partition Key, Sort Key y campos adicionales) del registro dummy que se va a insertar en DynamoDB?

   [Answer]: Insertar el payload exactamente tal cual llega desde API Gateway, utilizando el `eventId` como Partition Key (PK). Queremos asegurar la trazabilidad del dato crudo.

2. **Cuerpo de la respuesta HTTP 202**
   ¿Cuál debe ser el formato y contenido del payload de la respuesta HTTP 202 (Accepted) que retornará la API al encolar o procesar correctamente los datos de telemetría?

   [Answer]: El cuerpo de la respuesta debe ser un JSON que incluya el ID de correlación para facilitar el rastreo E2E. Ejemplo: `{"status": "accepted", "msg_id": "<X-Correlation-Id>"}`.

## Aclaraciones antes del diseño

3. **Contrato HTTP, tipos de evento y alerta.** Los requisitos e historias aprobados usan `POST /telemetry-events`, `battery`/`temperature`/`speed` y la alerta con `alertType`, `batteryValue` y `occurredAt`. El resumen de contratos usa `POST /telemetry`, `BATTERY_LEVEL`/`SPEED`/`LOCATION` y `timestamp`/`batteryLevel`. ¿Qué conjunto debe gobernar la implementación? La opción elegida determinará qué documentos previos hay que corregir.

   A. Mantener requisitos e historias; corregir el contrato para que coincida con ellos.
   B. Mantener el resumen de contratos; revisar requisitos e historias para que coincidan con él.
   C. Definir una combinación concreta de ruta, tipos y campos de alerta.
   X. Other (please specify)

   [Answer]: A

4. **Formato de identificadores.** Los requisitos exigen `eventId` y `vehicleId` no vacíos, mientras el contrato exige UUIDv4 estricto. ¿Qué validación debe aplicar el servicio?

   A. UUIDv4 estricto para ambos identificadores.
   B. Cualquier cadena no vacía para ambos identificadores.
   X. Other (please specify)

   [Answer]: B

5. **Payload crudo y metadatos.** Ya indicó que DynamoDB debe conservar el payload recibido sin cambiarlo y usar `eventId` como PK. Las historias también exigen `acceptedAt`, `expiresAt = acceptedAt + 90 días` y una salida `PENDING` atómica para batería baja. ¿Cómo deben coexistir estos datos?

   A. Guardar el JSON recibido intacto en `rawPayload`, añadir metadatos al registro de evento y crear la salida pendiente en la misma transacción.
   B. Guardar únicamente el JSON recibido, sin metadatos ni salida pendiente; revisar los requisitos afectados.
   X. Other (please specify)

   [Answer]: A
