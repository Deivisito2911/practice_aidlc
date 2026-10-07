# Entities

```yaml source-of-truth
entities:
  - name: TelemetryEvent
    description: "The primary entity representing a reading from a vehicle."
    attributes:
      - name: eventId
        logical_type: string
        required: true
        unique: true
        description: "Unique identifier for the event. Used as Partition Key (PK) in DynamoDB."
      - name: vehicleId
        logical_type: string
        required: true
        description: "Identifier for the vehicle."
      - name: eventType
        logical_type: string
        required: true
        description: "The type of event (e.g., 'battery')."
      - name: timestamp
        logical_type: datetime
        required: true
        description: "When the event occurred."
      - name: value
        logical_type: number
        required: true
        description: "The value associated with the event."
    constraints: []
    relationships: []
```

## Summary
The `TelemetryEvent` entity captures all necessary telemetry data points. Crucially, the `eventId` is defined as a unique required attribute because it serves as the Partition Key (PK) in DynamoDB persistence.
