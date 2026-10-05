# Risk and Sequencing Rationale

## Selected Strategy
**Walking Skeleton + Functional Increments**

## Rationale
1. **Why Walking Skeleton?**
   In serverless architectures, the highest hidden risk often lies in IAM permissions, network routing, and component integration rather than code logic. By establishing the "plumbing" first (API Gateway -> Lambda -> DynamoDB), we de-risk the deployment pipeline and infrastructure configuration on Day 1. It ensures the team is not blocked by DevOps issues later when testing complex logic.
2. **Why Functional Increments?**
   Grouping tasks into 2-3 day chunks allows for continuous delivery of end-to-end testable features. For example, validating idempotency requires both logic and DB interaction; delivering them together as a functional increment prevents isolated, untestable code from sitting in the repository.

## Mitigated Risks
- **Deployment blockages**: Addressed by Bolt 1.
- **Data corruption/Duplicates**: Addressed early in Bolt 2 before integrating downstream systems.
- **Message Loss**: Addressed in Bolt 3 via DLQ and Poison Pill handling.
