# Entidades de U1 — núcleo de telemetría

## Source of truth

```yaml
entities:
  - name: TelemetryEvent
    description: Evento HTTP aceptado; propietario TelemetryService.
    identifier: eventId
    attributes:
      - { name: eventId, type: Identifier, required: true, unique: true, constraints: "ASCII [A-Za-z0-9._:-], 1..128; clave global mientras exista" }
      - { name: vehicleId, type: Identifier, required: true, constraints: "ASCII [A-Za-z0-9._:-], 1..128" }
      - { name: eventType, type: enum, required: true, allowed_values: [battery, temperature, speed] }
      - { name: timestamp, type: UTC-instant, required: true, constraints: "ISO 8601 UTC; no más de 5 minutos futuros" }
      - { name: value, type: finite-number, required: true, constraints: "Rango dependiente de eventType" }
      - { name: acceptedAt, type: UTC-instant-seconds, required: true, constraints: "Instante original e inmutable de aceptación" }
      - { name: correlationId, type: Identifier, required: true, constraints: "Id original de la respuesta 202" }
      - { name: expiresAt, type: unix-epoch-seconds, required: true, constraints: "acceptedAt + 90 días exactos; elegibilidad TTL" }
      - { name: rawPayload, type: JSON-text, required: false, constraints: "Cuerpo aceptado sin modificar; no determina duplicados" }
    constraints:
      - "eventId es inmutable y único mientras el registro exista."
      - "La identidad de un duplicado compara eventId, vehicleId, eventType, timestamp normalizado y value numérico."
      - "La eliminación física tras expiresAt es eventual; no se promete idempotencia después de eliminar el evento."
    relationships:
      - { to: OutboxEntry, direction: "TelemetryEvent -> OutboxEntry", cardinality: "1 -> 0..1", constraint: "Existe exactamente una salida cuando eventType=battery y value<20" }
  - name: OutboxEntry
    description: Intención durable de publicar una alerta de batería; propietario TelemetryService.
    identifier: alertId
    attributes:
      - { name: alertId, type: Identifier, required: true, unique: true, constraints: "'LOW_BATTERY:' + eventId" }
      - { name: eventId, type: Identifier, required: true, references: TelemetryEvent }
      - { name: vehicleId, type: Identifier, required: true, constraints: "Copia inmutable para publicar aun tras TTL del evento" }
      - { name: alertType, type: enum, required: true, allowed_values: [LOW_BATTERY] }
      - { name: batteryValue, type: finite-number, required: true, min: 0, constraints: "menor que 20" }
      - { name: occurredAt, type: UTC-instant, required: true, constraints: "timestamp normalizado del evento" }
      - { name: correlationId, type: Identifier, required: true, constraints: "Atributo de mensaje SQS; copia inmutable" }
      - { name: status, type: enum, required: true, allowed_values: [PENDING, PUBLISHED], default: PENDING }
      - { name: nextAttemptAt, type: UTC-instant, required: true, constraints: "Vencimiento de próximo intento o de arrendamiento" }
      - { name: attempts, type: nonnegative-integer, required: true, default: 0 }
      - { name: createdAt, type: UTC-instant, required: true, constraints: "Instante de creación en la transacción" }
      - { name: lastAttemptAt, type: UTC-instant, required: false }
      - { name: claimToken, type: opaque-token, required: false, constraints: "Identifica al propietario temporal del intento" }
      - { name: leaseUntil, type: UTC-instant, required: false, constraints: "Vencimiento de la reclamación temporal" }
    constraints:
      - "Se crea PENDING en la misma transacción que TelemetryEvent; no existe salida huérfana."
      - "PUBLISHED solo tras confirmación SQS y actualización condicional por propietario."
      - "Un resultado incierto conserva PENDING y el mismo alertId."
      - "Una salida PENDING no expira por TTL del evento y conserva datos suficientes para publicar sin leerlo."
    relationships:
      - { to: TelemetryEvent, direction: "OutboxEntry -> TelemetryEvent", cardinality: "1 -> 1 en creación; referencia histórica tras TTL", constraint: "eventId identifica el evento originador" }
```

## Resumen

TelemetryEvent conserva la entrada aceptada y la identidad de la respuesta original. OutboxEntry conserva la alerta y su progreso independientemente de la vida física del evento. Ambos pertenecen a TelemetryService; no hay entidad de cola de ingreso.

## Fuentes y alcance

Modelo derivado de Inception Domain Design, Contract Design C1–C3 y la decisión de functional-design-questions.md. rawPayload preserva la preferencia previa documentada en construction/telemetry-backend/functional-design/functional-design-questions.md; solo se guarda para solicitudes válidas y no modifica C1. Los atributos de reclamación son internos y su plazo concreto corresponde a Infrastructure Design.
