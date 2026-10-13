# Entidades de U2 — ampliación operativa

## Source of truth

```yaml
entities:
  - name: TelemetryEvent
    description: Evento HTTP aceptado; entidad existente propiedad de TelemetryService y ampliada por U2 sin alterar su contrato.
    identifier: eventId
    attributes:
      - { name: eventId, type: Identifier, required: true, unique: true }
      - { name: vehicleId, type: Identifier, required: true }
      - { name: eventType, type: enum, required: true, allowed_values: [battery, temperature, speed] }
      - { name: timestamp, type: UTC-instant, required: true }
      - { name: value, type: finite-number, required: true }
      - { name: acceptedAt, type: UTC-instant, required: true }
      - { name: correlationId, type: Identifier, required: true }
      - { name: expiresAt, type: UTC-instant-seconds, required: true, constraints: "acceptedAt + 90 días exactos; elegible para eliminación eventual" }
    constraints:
      - "Los campos contractuales, la identidad idempotente y la aceptación durable definidos por U1 permanecen estables."
    relationships:
      - { to: OutboxEntry, direction: "TelemetryEvent -> OutboxEntry", cardinality: "1 -> 0..1", constraint: "Solo batería con value < 20 origina una salida" }
  - name: OutboxEntry
    description: Intención durable de alerta propiedad de TelemetryService; U2 añade observabilidad y recuperación controlada sin cambiar identidad ni estado.
    identifier: alertId
    attributes:
      - { name: alertId, type: Identifier, required: true, unique: true, constraints: "LOW_BATTERY:{eventId}; estable en cada reintento" }
      - { name: eventId, type: Identifier, required: true, references: TelemetryEvent }
      - { name: correlationId, type: Identifier, required: true }
      - { name: status, type: enum, required: true, allowed_values: [PENDING, PUBLISHED] }
      - { name: nextAttemptAt, type: UTC-instant, required: true }
      - { name: attempts, type: nonnegative-integer, required: true }
      - { name: createdAt, type: UTC-instant, required: true }
    constraints:
      - "Manual or scheduled recovery never creates an event or another OutboxEntry."
      - "Only confirmed publication can move PENDING to PUBLISHED; unconfirmed entries remain recoverable."
    relationships:
      - { to: TelemetryEvent, direction: "OutboxEntry -> TelemetryEvent", cardinality: "1 -> 1 at creation", constraint: "The originating event may later expire; the Outbox retains sufficient delivery identity" }
  - name: RecoveryRun
    description: Auditable bounded operator request to preview and optionally retry eligible Outbox entries.
    identifier: recoveryRunId
    attributes:
      - { name: recoveryRunId, type: Identifier, required: true, unique: true }
      - { name: requestedBy, type: OperatorIdentity, required: true, constraints: "Authorized P3 platform operator" }
      - { name: requestedAt, type: UTC-instant, required: true }
      - { name: scope, type: RecoveryScope, required: true, constraints: "Visible, explicit, and limited to eligible PENDING entries" }
      - { name: processingLimit, type: positive-integer, required: true, constraints: "Explicit upper bound; maximum is configured by operations policy" }
      - { name: previewIds, type: list<Identifier>, required: true, constraints: "Only identifiers; no secret or raw payload" }
      - { name: previewCount, type: nonnegative-integer, required: true }
      - { name: previewFingerprint, type: OpaqueIdentifier, required: true, constraints: "Binds confirmation to the displayed candidate set" }
      - { name: confirmedAt, type: UTC-instant, required: false }
      - { name: correlationId, type: Identifier, required: true }
    constraints:
      - "Execution requires an authorized actor and explicit confirmation of the still-current bounded preview."
      - "An empty candidate set, stale preview, or missing confirmation has no effect on OutboxEntry."
    relationships:
      - { to: RecoveryResult, direction: "RecoveryRun -> RecoveryResult", cardinality: "1 -> 0..1", constraint: "A result exists after execution begins" }
  - name: RecoveryResult
    description: Summary of one confirmed manual recovery attempt.
    identifier: recoveryRunId
    attributes:
      - { name: recoveryRunId, type: Identifier, required: true, references: RecoveryRun }
      - { name: confirmedCount, type: nonnegative-integer, required: true }
      - { name: failedCount, type: nonnegative-integer, required: true }
      - { name: stillPendingCount, type: nonnegative-integer, required: true }
      - { name: correlationIds, type: list<Identifier>, required: true }
      - { name: evidenceReference, type: EvidenceReference, required: true, constraints: "Auditable summary without raw payload or credentials" }
    constraints:
      - "Counts reconcile to the confirmed preview population; unconfirmed or failed entries remain PENDING."
    relationships: []
  - name: ServiceMeasurement
    description: Time-bounded observation used to calculate ingestion performance, durable processing, availability, and retention indicators.
    identifier: measurementWindow
    attributes:
      - { name: measurementWindow, type: TimeInterval, required: true }
      - { name: environment, type: Environment, required: true }
      - { name: acceptedRequestCount, type: nonnegative-integer, required: true }
      - { name: validRequestRate, type: rate, required: false }
      - { name: ingestionLatencyP95, type: duration, required: false }
      - { name: durableWithin30SecondsPercent, type: percentage, required: false }
      - { name: availableMinutes, type: nonnegative-number, required: false }
      - { name: failedMinutes, type: nonnegative-number, required: false }
      - { name: maintenanceMinutes, type: nonnegative-number, required: false }
      - { name: ttlEligibleUndeletedCount, type: nonnegative-integer, required: false }
    constraints:
      - "A calendar-month availability window includes maintenance minutes in its denominator."
      - "TTL eligibility is measured separately from eventual physical deletion."
    relationships: []
  - name: AlarmPolicy
    description: Operational policy describing how a signal becomes an actionable alarm and how responders recover.
    identifier: alarmId
    attributes:
      - { name: alarmId, type: Identifier, required: true, unique: true }
      - { name: indicator, type: SignalName, required: true }
      - { name: threshold, type: Threshold, required: true }
      - { name: evaluationWindow, type: TimeInterval, required: true }
      - { name: severity, type: Severity, required: true }
      - { name: destination, type: ResponseDestination, required: true }
      - { name: recoveryAction, type: RecoveryProcedure, required: true }
    constraints:
      - "Every configured alarm has all six operational fields and is traceable to a supported service signal."
    relationships: []
```

## Resumen

TelemetryEvent y OutboxEntry conservan las entidades y garantías establecidas por U1. RecoveryRun representa la vista previa limitada y la confirmación autorizada; RecoveryResult conserva el resultado y su evidencia. ServiceMeasurement reúne observaciones de SLO y TTL, mientras AlarmPolicy especifica los campos que necesita cada alarma. Todo sigue bajo el límite lógico de TelemetryService; U2 no incorpora otra Lambda, cola de ingreso ni propietario de datos.

## Fuentes

`inception/units-generation/unit-of-work.md`, `inception/units-generation/unit-of-work-story-map.md`, `inception/requirements-analysis/requirements.md`, `inception/domain-design/components.md` y `inception/contract-design/contract-summary.md`.
