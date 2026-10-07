# Business Rules

```yaml source-of-truth
rules:
  - id: BR1.1
    statement: "Battery alerts"
    category: "policy"
    applies_to: "TelemetryEvent"
    trigger: "On incoming telemetry event"
    logic: "IF eventType is 'battery' AND value < 20 THEN generate alert"
    violation_behaviour: "N/A"
    source: "Team Rules"
  - id: BR1.2
    statement: "DynamoDB Partition Key"
    category: "constraint"
    applies_to: "TelemetryEvent"
    trigger: "On insert to DynamoDB"
    logic: "IF inserting record THEN use eventId as PK"
    violation_behaviour: "Fail insert"
    source: "QA Advisor Rule"
  - id: BR1.3
    statement: "HTTP 202 Response Format"
    category: "policy"
    applies_to: "HTTP API Response"
    trigger: "On successful API payload ingestion"
    logic: "IF payload is valid THEN return HTTP 202 with payload {\"status\": \"accepted\", \"msg_id\": \"<X-Correlation-Id>\"}"
    violation_behaviour: "N/A"
    source: "QA Advisor Rule"
```

## Summary Table

| ID | Statement | Category | Source |
|---|---|---|---|
| BR1.1 | Battery alerts | policy | Team Rules |
| BR1.2 | DynamoDB Partition Key | constraint | QA Advisor Rule |
| BR1.3 | HTTP 202 Response Format | policy | QA Advisor Rule |
