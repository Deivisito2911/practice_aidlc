# Architecture Decision Records (Domain Design)

## ADR-001: Direct Ingestion via API Gateway to SQS

- **Context:** La historia US1.1 requiere procesar hasta 100 req/s con baja latencia y encolar el evento de manera asíncrona (NFR1, NFR2).
- **Decision:** Utilizar la integración directa de AWS API Gateway a SQS sin código intermedio.
- **Consequences:** 
  - *Positivo:* Reduce la latencia de ingestión, elimina los costos y arranques en frío (cold starts) de una Lambda inicial y simplifica la arquitectura.
  - *Negativo:* Las validaciones complejas de negocio no pueden realizarse de forma síncrona en la capa API; se deben manejar de forma asíncrona y utilizar el esquema de API Gateway para validación de forma.
- **Alternatives Rejected:** Se rechazó crear un componente de software `TelemetryApi` (Lambda detrás de API Gateway) porque añadiría sobrecarga operativa y costo sin beneficios críticos para este flujo.

## ADR-002: Unified Processing and Alerting

- **Context:** La historia US3.1 requiere publicar una alerta en SQS cuando el nivel de batería es inferior al 20%.
- **Decision:** El `TelemetryProcessor` evaluará la regla de batería y publicará directamente en la cola SQS de alertas.
- **Consequences:**
  - *Positivo:* Simplifica el diseño de componentes, consolida la lógica de telemetría en un único bloque de despliegue y evita buses de eventos adicionales (EventBridge/SNS).
  - *Negativo:* El `TelemetryProcessor` adquiere múltiples responsabilidades (guardar y alertar), lo que podría requerir segregación futura si las reglas de alerta se vuelven muy complejas.
- **Alternatives Rejected:** Se rechazó crear un componente independiente `BatteryAlertService` suscrito a un bus de eventos, debido a que añade una complejidad prematura para la rebanada funcional inicial ("Walking Skeleton").
