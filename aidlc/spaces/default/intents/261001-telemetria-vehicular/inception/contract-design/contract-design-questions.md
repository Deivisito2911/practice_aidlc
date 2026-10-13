# Preguntas para fijar los contratos de telemetría

## Decisiones ya establecidas

- El productor externo usa `POST /telemetry-events` con clave de API. API Gateway invoca directamente una única Lambda; no existe SQS de ingreso.
- La respuesta `202` confirma que la transacción DynamoDB guardó el evento y, si `battery.value < 20`, una salida Outbox `PENDING`. No confirma que el consumidor haya recibido la alerta.
- La Lambda publica en la SQS de alertas y EventBridge invoca periódicamente la misma Lambda para recuperar salidas pendientes. SQS puede entregar el mismo mensaje más de una vez; el consumidor deduplica por `alertId`.
- U1 define el contrato HTTP, mensaje SQS y esquema evento/Outbox; U2 y U3 consumen esos contratos. U1 mantiene la propiedad de ambas entidades.

## 1. Respuesta a solicitudes repetidas

El mismo `eventId` no puede sustituir un evento confirmado. El contrato aún debe precisar qué recibe el productor cuando reenvía el mismo evento o reutiliza el ID con otros datos. ¿Qué resultado quieres fijar?

A. Duplicado idéntico: `202` con el `acceptedAt` y correlación originales, sin nueva escritura; contenido distinto: `409` con `IDEMPOTENCY_CONFLICT`.
B. Duplicado idéntico: `200` con el evento original, sin nueva escritura; contenido distinto: `409` con `IDEMPOTENCY_CONFLICT`.
C. Duplicado idéntico: `202` con el `acceptedAt` original; contenido distinto: error no exitoso distinto de `409`, que debes precisar.
X. Other (please specify)

[Answer]: A. 202 y 409 (Recommended)

## 2. Formato y longitud de identificadores

Los requisitos aceptan `eventId` y `vehicleId` como cadenas no vacías y no exigen UUID. Para validar el contrato y mantener un `alertId` estable derivado de `eventId`, ¿qué límite aplicamos a los identificadores proporcionados por el productor?

A. Entre 1 y 128 caracteres ASCII de letras, números, punto, guion, guion bajo o dos puntos; el encabezado de correlación usa el mismo límite y se genera si falta.
B. Entre 1 y 256 caracteres UTF-8 no blancos; el encabezado de correlación usa el mismo límite y se genera si falta.
C. Mantener solo «cadena no vacía» para `eventId` y `vehicleId`; aplicar un límite técnico de bytes únicamente cuando la plataforma lo exija y precisar el encabezado de correlación después.
X. Other (please specify)

[Answer]: A. ASCII 1–128 (Recommended)

## 3. Forma de errores HTTP

La Lambda puede devolver errores de validación, conflicto y persistencia; API Gateway rechaza claves y cuotas antes de invocarla. ¿Qué sobre deben usar las respuestas de error de la Lambda?

A. JSON con `code`, `message` y `correlationId`; los rechazos propios de API Gateway se documentan por separado sin prometerles el mismo sobre.
B. JSON con `error`, `details` y `correlationId`; los rechazos de API Gateway se documentan por separado.
C. Ningún sobre común: definir una respuesta diferente para cada error de la Lambda.
X. Other (please specify)

[Answer]: A. code y message (Recommended)

## 4. Evolución de los contratos

La ruta `/telemetry-events` ya está fijada y la cola de alertas tendrá consumidores externos. ¿Qué regla de compatibilidad deben seguir U2 y U3 al ampliar los contratos de U1?

A. Mantener `/telemetry-events` para v1 y añadir solo campos opcionales; ante un cambio incompatible, crear una versión nueva y coordinar su adopción. Los consumidores de alertas ignoran campos desconocidos y deduplican por `alertId`.
B. Permitir cambiar campos obligatorios de v1 en el mismo endpoint y cola, coordinando un despliegue simultáneo de productores y consumidores.
C. Fijar una ruta `/v1/telemetry-events` ahora y migrar los productores antes de implementar el servicio.
X. Other (please specify)

[Answer]: A. Cambios aditivos (Recommended)

## 5. Horizonte de la idempotencia

`eventId` es global entre vehículos, pero el registro del evento queda elegible para TTL 90 días después de `acceptedAt`. Una vez que DynamoDB lo elimine físicamente, la misma tabla ya no puede detectar una reutilización de ese ID. ¿Qué garantía debe publicar el contrato?

A. Idempotencia global entre vehículos mientras exista el registro; tras su eliminación física por TTL, reutilizar `eventId` puede crear un nuevo evento. Se documenta esta ventana y el productor no reutiliza IDs.
B. Idempotencia permanente; añadir un registro duradero de IDs sin TTL y revisar la arquitectura y la retención.
C. Conservar los eventos indefinidamente y revisar el requisito de TTL a 90 días.
X. Other (please specify)

[Answer]: A. Mientras exista (inferido de FR4.2 y NFR4; no hubo respuesta a la pregunta opcional).
