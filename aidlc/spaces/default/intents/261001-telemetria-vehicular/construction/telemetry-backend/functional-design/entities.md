# Entidades de telemetría

El registro de evento conserva el cuerpo JSON recibido sin transformarlo. Los campos interpretados y los metadatos se almacenan fuera de `rawPayload`; el identificador del evento es la clave de partición del registro de telemetría. La salida de alerta es un registro duradero separado.

```yaml source-of-truth
entities:
  - name: TelemetryEvent
    description: Evento aceptado y persistido una sola vez.
    attributes:
      - name: eventId
        logical_type: string
        required: true
        unique: true
        constraints: Cadena no vacía; clave de partición del registro de evento; sin formato UUID obligatorio.
      - name: rawPayload
        logical_type: string
        required: true
        constraints: Cuerpo JSON original recibido por HTTP, conservado sin modificar.
      - name: vehicleId
        logical_type: string
        required: true
        constraints: Cadena no vacía extraída para validación y consultas.
      - name: eventType
        logical_type: string
        required: true
        allowed_values: [battery, temperature, speed]
      - name: timestamp
        logical_type: datetime
        required: true
        constraints: Instante ISO 8601 UTC del evento.
      - name: value
        logical_type: number
        required: true
        constraints: Finito y dentro del intervalo correspondiente al tipo.
      - name: correlationId
        logical_type: string
        required: true
        constraints: Identificador efectivo de la solicitud HTTP.
      - name: acceptedAt
        logical_type: datetime
        required: true
        constraints: Instante UTC canónico asociado con la respuesta HTTP 202.
      - name: expiresAt
        logical_type: datetime
        required: true
        constraints: acceptedAt más exactamente 90 días; atributo de elegibilidad TTL.
    constraints:
      - La primera escritura por eventId gana; una entrega duplicada idéntica no modifica el evento.
      - Un mismo eventId con contenido canónico distinto produce IDEMPOTENCY_CONFLICT.
    relationships:
      - target: AlertOutbox
        cardinality: 0..1
        direction: TelemetryEvent -> AlertOutbox
        constraint: Se crea atómicamente cuando battery.value es menor que 20.
  - name: AlertOutbox
    description: Intención duradera de publicar una única alerta lógica.
    attributes:
      - name: alertId
        logical_type: string
        required: true
        unique: true
        constraints: Identificador determinista derivado de eventId y eventType.
      - name: eventId
        logical_type: string
        required: true
        references: TelemetryEvent.eventId
      - name: vehicleId
        logical_type: string
        required: true
      - name: alertType
        logical_type: string
        required: true
        allowed_values: [LOW_BATTERY]
      - name: batteryValue
        logical_type: number
        required: true
        constraints: Valor menor que 20.
      - name: occurredAt
        logical_type: datetime
        required: true
        constraints: timestamp UTC del evento originador.
      - name: correlationId
        logical_type: string
        required: true
      - name: status
        logical_type: string
        required: true
        allowed_values: [PENDING, PUBLISHED]
        defaults: PENDING
    constraints:
      - El estado PENDING se conserva hasta confirmar SQS.
      - Una transición condicional PENDING -> PUBLISHED no altera el alertId.
    relationships:
      - target: TelemetryEvent
        cardinality: 1
        direction: AlertOutbox -> TelemetryEvent
```

## Resumen

`TelemetryEvent` guarda la entrada original y sus metadatos de aceptación. `AlertOutbox` contiene el trabajo de publicación recuperable. La relación es opcional para eventos sin batería baja y única para cada evento que sí la requiere.
