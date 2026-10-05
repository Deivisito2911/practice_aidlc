# External Dependency Map

## Dependencies
1. **IoT Devices (Clients)**
   - **Constraint**: Devices will begin sending traffic as soon as the endpoint is live. They must support the `429 Too Many Requests` response for retry logic.
   - **Mitigation**: Documented explicitly in the OpenAPI contract.
2. **AWS Cloud Environment**
   - **Constraint**: Requires permissions to provision API Gateway, Lambda, DynamoDB, and SQS.
   - **Mitigation**: Defined early in Bolt 1 (Walking Skeleton).
3. **Downstream Consumers (SQS `vehicle-alerts` readers)**
   - **Constraint**: External systems reading the alerts rely on the defined AsyncAPI contract.
   - **Mitigation**: Contract is finalized. Bolt 3 will enforce structural compliance.
