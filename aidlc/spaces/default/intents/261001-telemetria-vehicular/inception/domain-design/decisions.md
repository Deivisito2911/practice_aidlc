# Decisiones de arquitectura

## ADR-001: Un componente lógico para el Walking Skeleton

- **Context** — El servicio debe validar HTTP sincrónicamente, guardar evento y Outbox de forma atómica, publicar alertas de batería y recuperar `PENDING` periódicamente. La arquitectura aprobada usa una única Lambda de telemetría y no tiene SQS de ingreso. Domain Design define componentes lógicos de código, no recursos desplegables.
- **Decision** — Mantener un componente `TelemetryService` que posee las entidades `TelemetryEvent` y `OutboxEntry` y atiende dos entradas (HTTP y recuperación programada). DynamoDB y SQS son dependencias externas; API Gateway y EventBridge activan el mismo componente en la única Lambda.
- **Consequences** — Los invariantes de idempotencia, escritura evento/Outbox, identidad de alerta y transición de estado quedan bajo un propietario. La solución inicia con menos coordinación. El componente puede organizar módulos internos por caso de uso; no se introduce un segundo límite de dominio sin evidencia de ciclo de cambio independiente.
- **Alternatives Rejected** — `TelemetryIngestion` y `AlertDelivery` como dos componentes lógicos dentro del despliegue único separarían las rutas HTTP y periódica, pero añadirían coordinación y una frontera de propiedad que el Walking Skeleton no necesita. Dividirlos en Lambdas sería contrario a la arquitectura aprobada.

## ADR-002: Propiedad conjunta de evento y Outbox

- **Context** — Una alerta depende de un evento válido y la salida `PENDING` debe crearse en la misma transacción que el evento. Reintentos físicos pueden ocurrir después de un resultado incierto.
- **Decision** — `TelemetryService` posee ambos registros. `TelemetryEvent` se identifica por `eventId`; `OutboxEntry` por `alertId` determinista y referencia al `eventId` originador.
- **Consequences** — La consistencia se mantiene en una escritura transaccional y la deduplicación lógica conserva una identidad estable. El esquema exacto, las condiciones y el índice de recuperación quedan para diseño funcional/infraestructura y contrato.
- **Alternatives Rejected** — Un propietario separado para Outbox o un flujo que escriba evento y alerta en momentos distintos debilitaría la atomicidad y crearía estados parciales.
