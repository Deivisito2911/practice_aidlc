# Contract Summary

| # | Provider Unit | Consumer | Mechanism | Owner |
|---|---|---|---|---|
| 1 | `telemetry-backend` | External: IoT Devices / Flota | Synchronous REST/HTTP | Equipo Telemetría |
| 2 | `telemetry-backend` | External: Sistema Operativo de Alertas | Asynchronous SQS (Alerts) | Equipo Telemetría |

## Contract Ownership Rules
- El equipo de Telemetría es el dueño de ambos contratos.
- Cualquier cambio destructivo (renombrar o eliminar campos, cambiar formato de UUID) requerirá un salto de versión principal (v1 a v2).
- Los cambios aditivos (nuevos campos opcionales) se consideran seguros. Los consumidores deben ignorar los campos no reconocidos.

## 1. REST API Contract (Ingestion)

Especificación formal para la entrada de datos. Se requiere validación estricta de UUIDv4. La respuesta es rápida (`202 Accepted`). 
**Actualización (Day 2 Ops):** Se ha agregado soporte para la cabecera `X-Correlation-Id` para trazabilidad cruzada (se autogenera en API Gateway si el cliente no la envía) y la respuesta `429 Too Many Requests` para aplicar Throttling/Rate Limiting.

```yaml
openapi: 3.0.3
info:
  title: Telemetry Ingestion API
  version: 1.0.0
  description: API for ingesting vehicle telemetry events.
paths:
  /telemetry:
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
          description: Client-provided trace ID. If omitted, API Gateway generates one automatically.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/TelemetryEvent'
      responses:
        '202':
          description: Event accepted and queued successfully.
        '400':
          description: Bad Request (Invalid UUID, out of bounds BVA limit).
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
          format: uuid
          description: Unique identifier for the event (UUIDv4 strict).
        vehicleId:
          type: string
          format: uuid
          description: Unique identifier for the vehicle (UUIDv4 strict).
        eventType:
          type: string
          enum: [BATTERY_LEVEL, SPEED, LOCATION]
        timestamp:
          type: string
          format: date-time
        value:
          type: number
          description: Event value (e.g. 0-100 for battery, 0-300 for speed).
```

## 2. AsyncAPI Contract (Alerts Queue)

Especificación formal para la publicación de alertas en la cola SQS de salida.
**Actualización (Day 2 Ops):** Se propaga el `correlationId` en las cabeceras/atributos del mensaje SQS para trazar errores desde el cliente origen hasta la DLQ.

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
          - timestamp
          - batteryLevel
        properties:
          alertId:
            type: string
            format: uuid
            description: Unique alert ID (used as SQS MessageDeduplicationId).
          eventId:
            type: string
            format: uuid
            description: The UUIDv4 of the event that triggered this alert.
          vehicleId:
            type: string
            format: uuid
            description: The UUIDv4 of the vehicle.
          timestamp:
            type: string
            format: date-time
            description: When the critical event was recorded.
          batteryLevel:
            type: number
            description: The battery percentage that triggered the alert.
```

## Open Questions
| Contract | Question | Blocks |
|---|---|---|
| None | All questions resolved. | N/A |
