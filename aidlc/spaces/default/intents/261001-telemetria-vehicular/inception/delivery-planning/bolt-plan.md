# Bolt Plan: Telemetry Backend

## Strategy
- **Sequencing**: Walking Skeleton (Infrastructure and basic plumbing first to prove end-to-end connectivity).
- **Sizing**: Functional Increments (2-3 days per bolt).

## Bolts

### Bolt 1: Walking Skeleton (Infrastructure & Basic Plumbing)
**Goal**: Establish the end-to-end cloud infrastructure without complex business logic. Prove that API Gateway can trigger Lambda, and Lambda can write to DynamoDB.
- **Scope**:
  - CDK/Terraform scripts for API Gateway, IAM Roles, base Lambda, DynamoDB table, and SQS queues (Target + DLQ).
  - Lambda deployed with dummy successful response (202 Accepted).
  - Dummy write to DynamoDB.
- **Acceptance Criteria**:
  - A test payload sent to the API GW endpoint results in a 202 response.
  - An entry is successfully created in DynamoDB.
  - All IAM least-privilege permissions are verified.

### Bolt 2: Core Logic, Validation & Idempotency
**Goal**: Implement the core business rules, OpenAPI contract validation, and exact-once processing.
- **Scope**:
  - Implement request validation against the OpenAPI schema.
  - Implement Rate Limiting logic (returning 429 Too Many Requests if exceeded).
  - Implement Idempotency validation using DynamoDB conditional puts to prevent duplicates.
- **Acceptance Criteria**:
  - Invalid requests return 400 Bad Request.
  - Exceeding limit returns 429 Too Many Requests.
  - Duplicate `msg_id` within the TTL returns 202 without creating duplicate records.

### Bolt 3: SQS Integration & Poison Pill Handling
**Goal**: Connect the async event flow and secure the failure paths.
- **Scope**:
  - Implement logic to evaluate thresholds and publish messages to SQS (`vehicle-alerts`).
  - Implement Poison Pill handling (pushing unprocessable messages to DLQ).
- **Acceptance Criteria**:
  - High-priority alerts are successfully published to SQS with valid AsyncAPI structure.
  - Unprocessable valid payloads are routed to the DLQ.

### Bolt 4: Observability & Day 2 Operations
**Goal**: Production-readiness.
- **Scope**:
  - Propagate `X-Correlation-Id` across API GW, Lambda, DynamoDB, and SQS.
  - Implement structured logging and CloudWatch metrics.
- **Acceptance Criteria**:
  - Logs are fully searchable via `X-Correlation-Id`.
  - Metrics for ingestion rate, error rate, and SQS queue depth are available.
