# Contract Summary

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| 1 | `telemetry-backend` | External: IoT Devices / Flota | Synchronous REST/HTTP | Equipo Telemetría |
| 2 | `telemetry-backend` | External: Sistema Operativo de Alertas | Asynchronous SQS (Alerts) | Equipo Telemetría |

## Contract Ownership Rules
- El equipo de Telemetría es el dueño de ambos contratos.
- Cualquier cambio destructivo (renombrar o eliminar campos, o restringir identificadores) requerirá un salto de versión principal (v1 a v2).
- Los cambios aditivos (nuevos campos opcionales) se consideran seguros. Los consumidores deben ignorar los campos no reconocidos.

## 1. REST API Contract (Ingestion)

Especificación formal para la entrada de datos. `eventId` y `vehicleId` son cadenas no vacías, sin requisito UUID. La respuesta `202 Accepted` confirma que SQS aceptó el mensaje, no que el evento ya esté persistido.
La cabecera `X-Correlation-Id` permite trazabilidad cruzada; la función de ingreso la genera si el cliente no la envía. API Gateway aplica la respuesta `429 Too Many Requests` para límites de consumo.

```yaml
openapi: 3.0.3
info:
  title: Telemetry Ingestion API
  version: 1.0.0
  description: API for ingesting vehicle telemetry events.
paths:
  /telemetry-events:
    post:
      summary: Enqueue a telemetry event
      description: Ingests a new telemetry event and queues it for asynchronous processing.
      security:
        - ApiKeyAuth: []
      parameters:
        - in: header
          name: X-Correlation-Id
          schema:
            type: string
          required: false
          description: Client-provided trace ID. If omitted, the ingestion function generates one.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TelemetryEvent'
      responses:
        '202':
          description: Event accepted and queued successfully.
          content:
            application/json:
              schema:
                type: object
                required: [status, msg_id, acceptedAt]
                properties:
                  status:
                    type: string
                    enum: [accepted]
                  msg_id:
                    type: string
                    description: Effective X-Correlation-Id.
                  acceptedAt:
                    type: string
                    format: date-time
                    description: Canonical UTC acceptance instant propagated unchanged to the queue.
        '400':
          description: Bad Request (missing or empty identifier, invalid event type, timestamp or value).
        '401':
          description: Unauthorized (Invalid API Key).
        '413':
          description: Payload Too Large.
        '429':
          description: Too Many Requests. Rate limit exceeded (100 req/s threshold breached). Clients should implement exponential backoff.
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: x-api-key
  schemas:
    TelemetryEvent:
      type: object
      required:
        - eventId
        - vehicleId
        - eventType
        - timestamp
        - value
      properties:
        eventId:
          type: string
          minLength: 1
          description: Globally unique, nonempty event identifier and idempotency key; no UUID format requirement.
        vehicleId:
          type: string
          minLength: 1
          description: Nonempty vehicle identifier; no UUID format requirement.
        eventType:
          type: string
          enum: [battery, temperature, speed]
        timestamp:
          type: string
          format: date-time
          description: UTC ISO 8601 instant, at most five minutes ahead of service time.
        value:
          type: number
          description: Finite number; battery 0-100 percent, temperature -50 to 150 Celsius, speed 0-300 km/h.
```

## 2. AsyncAPI Contract (Alerts Queue)

Especificación formal para la publicación de alertas en la cola SQS de salida.
Se propaga `correlationId` como atributo de mensaje para trazar errores desde el cliente hasta la DLQ. Un `alertId` estable identifica una sola alerta lógica; son posibles varias entregas físicas y el consumidor debe deduplicar por ese identificador.

```yaml
asyncapi: 2.6.0
info:
  title: Battery Alerts SQS Channel
  version: 1.0.0
  description: Asynchronous alerts for critical battery levels (<20%).
servers:
  production:
    url: sqs.{region}.amazonaws.com
    protocol: sqs
channels:
  battery-alerts:
    publish:
      message:
        $ref: '#/components/messages/BatteryAlertMessage'
components:
  messages:
    BatteryAlertMessage:
      name: BatteryAlert
      title: Battery Alert Message
      summary: Emitted when a vehicle's battery level drops below 20%.
      headers:
        type: object
        properties:
          correlationId:
            type: string
            description: The X-Correlation-Id propagated from the ingestion HTTP request. Indispensable for DLQ tracing.
      payload:
        type: object
        required:
          - alertId
          - eventId
          - vehicleId
          - alertType
          - batteryValue
          - occurredAt
        properties:
          alertId:
            type: string
            description: Deterministic stable alert ID derived from eventId.
          eventId:
            type: string
            minLength: 1
            description: Nonempty ID of the triggering event.
          vehicleId:
            type: string
            minLength: 1
            description: Nonempty ID of the vehicle.
          alertType:
            type: string
            enum: [LOW_BATTERY]
          occurredAt:
            type: string
            format: date-time
            description: Original UTC timestamp of the battery event.
          batteryValue:
            type: number
            description: Battery percentage below 20.
```

## 3. Mensaje de entrada y persistencia

- El mensaje de la cola de entrada transporta `rawPayload` como el cuerpo JSON HTTP original sin modificar, los campos validados, `correlationId` y el `acceptedAt` UTC canónico asociado al `202`. Los metadatos no alteran `rawPayload`.
- El registro de evento usa `eventId` como clave de partición y conserva `rawPayload`, `acceptedAt` y `expiresAt = acceptedAt + 90 días`. Una escritura condicional impide reemplazarlo.
- Para batería inferior al 20 %, la misma transacción duradera crea una salida `PENDING` con `alertId` determinista. La publicación posterior reintenta con ese ID hasta confirmar SQS y pasar condicionalmente a `PUBLISHED`.
- SQS puede reentregar físicamente una alerta. El consumidor contractual deduplica por `alertId` para obtener un único efecto lógico; no se promete entrega física exactamente una vez.

## Open Questions
| Contract | Question | Blocks |
|---|---|---|
| None | All questions resolved. | N/A |
