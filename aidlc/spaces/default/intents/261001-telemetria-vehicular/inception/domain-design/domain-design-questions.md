# Diseño del dominio — preguntas de decisiones

## Contexto

El Walking Skeleton requiere un único recorrido API Gateway REST → una Lambda de telemetría → DynamoDB con escritura atómica de evento y Outbox; EventBridge invoca periódicamente esa misma Lambda para recuperar `PENDING`, y SQS se usa solo para alertas. Domain Design separa responsabilidades lógicas de código, no funciones Lambda ni infraestructura.

## Q1. Límite del componente

La opción recomendada mantiene validación, persistencia transaccional, creación de Outbox, publicación y recuperación dentro de un solo componente de dominio `TelemetryService`, organizado internamente por casos de uso. Los servicios AWS son dependencias externas.

- **A — Un componente TelemetryService (recomendado):** responsabilidades cohesivas y una sola propiedad del flujo e invariantes. Menos estructura inicial; puede modularizarse más adelante si aparecen ciclos de cambio independientes.
- **B — Separar lógica en TelemetryIngestion y AlertDelivery:** hace explícita la diferencia entre solicitud HTTP y recuperación de alertas, con coordinación adicional y riesgo de introducir límites innecesarios para el Walking Skeleton. Seguiría siendo una sola Lambda; no implica separar el despliegue.

¿Qué opción prefieres?

[Answer]: One TelemetryService component

- A. Un componente TelemetryService
- B. Dos componentes lógicos en el mismo despliegue
- X. Otra opción (describe la alternativa)

## Q2. Propiedad de datos

Se propone que `TelemetryService` sea propietario de `TelemetryEvent` y `OutboxEntry`. Cada evento conserva su `eventId`; una alerta lógica conserva un `alertId` determinista derivado del evento. La salida referencia el evento originador sin crear un componente o tabla de negocio independiente.

¿Confirmas esta propiedad conjunta? Si se eligió B en Q1, propone un propietario único para cada entidad.

[Answer]: Confirmar propiedad conjunta en TelemetryService

- A. Confirmar propiedad conjunta en TelemetryService
- B. Separar los propietarios por responsabilidad
- X. Otra opción (describe la alternativa)

## Q3. Interacción de recuperación

Se propone modelar el trabajo normal y el trabajo periódico como dos entradas del mismo componente: HTTP valida y confirma evento/Outbox antes de `202`; el evento programado consulta y reclama salidas `PENDING`, publica en SQS y marca `PUBLISHED` solo tras confirmación. Ninguna entrada llama a otra Lambda.

¿Confirmas este límite de interacción?

[Answer]: Confirmar dos entradas al mismo componente

- A. Confirmar dos entradas al mismo componente
- B. Otra interacción dentro del mismo límite de despliegue
- X. Otra opción (describe la alternativa)

## Q4. Dependencias externas

Se proponen DynamoDB para eventos y Outbox y SQS solo para alertas. API Gateway y EventBridge activan el componente; no son componentes de dominio ni dependencias llamadas mediante lógica de negocio.

¿Confirmas estas dependencias y límites?

[Answer]: Confirmar

- A. Confirmar
- B. Ajustar dependencias externas
- X. Otra opción (describe la alternativa)

## Consolidated Summary Confirmation

- Looks correct
- Request changes

[Answer]: Looks correct
