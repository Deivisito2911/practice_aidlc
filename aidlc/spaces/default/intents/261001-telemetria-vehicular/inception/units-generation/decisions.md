# Architecture Decision Records (Units Generation)

## ADR-003: Single Service Deployment Unit
- **Context:** Solo tenemos un componente (TelemetryProcessor).
- **Decision:** Agrupar en una única unidad de despliegue `telemetry-backend`.
- **Consequences:** Despliegue simple.
- **Alternatives Rejected:** N/A.
