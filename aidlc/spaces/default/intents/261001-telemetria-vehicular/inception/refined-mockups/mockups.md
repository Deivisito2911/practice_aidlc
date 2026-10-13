# Experiencia de integración de telemetría

## Alcance

Este producto no incluye una interfaz gráfica. La experiencia del usuario integrador se define mediante el endpoint HTTP, ejemplos ejecutables y el contrato OpenAPI. La única ruta de escritura es `POST /telemetry-events`; el flujo es API Gateway REST → Lambda única → transacción DynamoDB (evento y, si aplica, Outbox). EventBridge invoca periódicamente esa misma Lambda para recuperar salidas `PENDING`. SQS se usa solo para alertas.

## Ejemplo de envío válido

```http
POST /telemetry-events HTTP/1.1
Content-Type: application/json
x-api-key: <API_KEY>
X-Correlation-Id: 6ce1a87c-85ae-4eb9-bec6-280e2c0e15fa

{
  "eventId": "evt-001",
  "vehicleId": "veh-042",
  "eventType": "battery",
  "value": 19.5,
  "timestamp": "2026-10-12T14:30:00Z"
}
```

Respuesta después de confirmar la escritura transaccional:

```http
HTTP/1.1 202 Accepted
Content-Type: application/json
X-Correlation-Id: 6ce1a87c-85ae-4eb9-bec6-280e2c0e15fa

{
  "eventId": "evt-001",
  "status": "accepted",
  "acceptedAt": "2026-10-12T14:30:02Z",
  "correlationId": "6ce1a87c-85ae-4eb9-bec6-280e2c0e15fa"
}
```

`202` confirma persistencia del evento y, para batería menor a 20, la creación atómica de la salida Outbox `PENDING`. No confirma que SQS o un consumidor externo ya hayan recibido la alerta.

## Límite y rechazo

Un valor de batería exactamente `20` se acepta y no crea alerta. Batería `0` y valores menores que `20` crean una salida pendiente. Un payload mal formado o fuera de los límites devuelve `400` síncronamente antes de cualquier escritura. Credenciales ausentes o inválidas son rechazadas por API Gateway. Ante fallo de la transacción, no se devuelve `202` y no queda escritura parcial.

## Recuperación y operación

La recuperación es interna al servicio: la regla periódica EventBridge invoca la misma Lambda, que reclama de forma condicional un conjunto acotado de salidas `PENDING` vencidas y publica las alertas con el mismo `alertId`. Solo una confirmación de SQS permite transicionar a `PUBLISHED`; los fallos y resultados inciertos conservan la salida para reintento. No existe una pantalla operativa en el alcance inicial; las operaciones controladas se realizan mediante procedimiento o CLI autorizado con vista previa del alcance y resultado correlacionable.

## Decisiones de presentación

- Se priorizan tanto ejemplos HTTP/cURL como un contrato OpenAPI.
- Se muestran los límites de aceptación junto al ejemplo para prevenir errores antes del envío.
- Los estados de alerta se describen como estados de entrega separados de la aceptación HTTP.
- Los identificadores de ejemplo son sintéticos; las claves y el cuerpo sensible no deben aparecer en logs.
