# Especificación de interacción de la API

## Cliente integrador

| Elemento | Comportamiento |
|---|---|
| Método y ruta | `POST /telemetry-events` |
| Autenticación | Encabezado `x-api-key`; API Gateway rechaza credenciales inválidas antes de invocar Lambda. |
| Correlación | Acepta `X-Correlation-Id` válido o genera uno; devuelve el identificador en encabezado y cuerpo. |
| Cuerpo | Un evento JSON por solicitud; sin lotes ni SQS de ingreso. |
| Éxito | `202 Accepted` solo después de persistir evento y Outbox aplicable en una transacción DynamoDB. |
| Rechazo de datos | `400 Bad Request`, respuesta estable y sin escrituras. |
| Error de persistencia | Error de servicio sin `202`; respuesta genérica correlacionable, sin detalles internos. |
| Reintento | Repetir la solicitud con el mismo `eventId`; identidad idempotente y conflicto para contenido canónico distinto. |

## Ejemplos cURL

```sh
curl --request POST "$BASE_URL/telemetry-events" \
  --header "Content-Type: application/json" \
  --header "x-api-key: $API_KEY" \
  --header "X-Correlation-Id: 6ce1a87c-85ae-4eb9-bec6-280e2c0e15fa" \
  --data '{"eventId":"evt-001","vehicleId":"veh-042","type":"battery","value":19.5,"occurredAt":"2026-10-12T14:30:00Z"}'
```

## Estados observables

1. El cliente envía el evento.
2. API Gateway valida ruta y clave de API.
3. La Lambda valida el cuerpo y límites de negocio de forma síncrona. Si falla, devuelve `400`; no escribe ni publica.
4. La Lambda realiza una escritura transaccional: evento y, para batería menor a 20, salida `PENDING` con `alertId` determinista.
5. Tras confirmación de DynamoDB, devuelve `202`. El cliente puede dejar de reintentar por indisponibilidad de alertas; el éxito no representa entrega externa.
6. La misma Lambda procesa la salida al publicar o en la recuperación periódica. `PENDING` persiste ante fallo; `PUBLISHED` se registra condicionalmente tras confirmación de SQS.

## Errores y recuperación del cliente

| Condición | Resultado esperado | Acción del integrador |
|---|---|---|
| JSON/campo/tipo/rango/fecha inválidos | `400`, sin efectos persistidos | Corregir solicitud; no reintentar sin cambios. |
| Clave ausente o inválida | Rechazo de API Gateway | Verificar credencial y configuración. |
| Mismo `eventId`, mismo contenido | Resultado idempotente; no duplica evento ni Outbox | Puede reintentar ante resultado HTTP incierto. |
| Mismo `eventId`, contenido distinto | Conflicto de idempotencia; evento original inmutable | Corregir usando un nuevo identificador si es un evento distinto. |
| Error de persistencia o respuesta HTTP incierta | No asumir `202`; correlacionar y reintentar con el mismo `eventId` | Aplicar reintento con espera y límite del cliente. |
| Alerta aún `PENDING` después de `202` | Ingesta aceptada; entrega de alerta pendiente | No reenviar el evento solo para reactivar la alerta. |

## Accesibilidad y ergonomía

Para documentación del integrador: encabezados y ejemplos con etiquetas textuales, fragmentos copiables, explicación junto al campo, errores en texto y contraste legible. El contrato OpenAPI y los ejemplos no dependen de color para indicar éxito o error. No aplica navegación por teclado de una aplicación porque no existe UI propia.
