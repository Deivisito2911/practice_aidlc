# Unit of Work

| Unit ID | Directory | Description | Boundaries | Responsibilities | Deployment Model | Complexity | Kind | Notes |
|---------|-----------|-------------|------------|------------------|------------------|------------|------|-------|
| U1 | telemetry-backend | Backend API and processor | Receives telemetry via API, processes via Lambda | Validates, persists, emits alerts | Standalone (Serverless) | M | service | Typescript CDK Monolith |
