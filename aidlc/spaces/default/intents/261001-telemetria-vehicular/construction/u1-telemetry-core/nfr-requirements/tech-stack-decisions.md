# Decisiones de tecnología — U1

| ID | Selección | Motivo y condición de aceptación |
|---|---|---|
| NFR9.3 | TypeScript para la única Lambda de telemetría y AWS CDK para infraestructura. | Sigue la práctica aprobada; compilación y tipos obligatorios. CDK debe sintetizar la misma topología en cuentas preparadas. |
| NFR9.4 | API Gateway REST para POST /telemetry-events, con clave y plan de uso. | Mantiene respuesta síncrona 400/202/409 y rechazo de credenciales antes de Lambda. |
| NFR9.5 | DynamoDB con tabla de eventos y tabla Outbox; escritura transaccional condicional y TTL de eventos. | Garantiza evento+salida atómicos y eventId único mientras exista registro. |
| NFR9.6 | Una SQS de alertas y una regla periódica EventBridge que invoca la misma Lambda. | Separa solo la entrega de alertas y recupera PENDING sin cola de ingreso ni segunda Lambda. |
| NFR8.1 | Prettier, ESLint, comprobación de tipos, pruebas unitarias por capa y prueba crítica de integración con AWS simulado. | La metodología test-after aprobada implementa capas y después las prueba; U3 conecta todos los controles a CI. |

La elección de framework de pruebas, simulador AWS y versiones de paquetes corresponde a Code Generation, tras revisar el proyecto y compatibilidad. No se fija una versión sin evidencia del entorno. La infraestructura de U1 incluye KMS, IAM mínimo, logs y base CloudTrail; U3 completa OIDC, protección de main, revisión y promoción. NFR6 corresponde a ese control de entrega, no a un segundo servicio.

## Alternativas descartadas

- SQS o DLQ de ingreso: contradice la validación síncrona y la topología afirmada.
- Separar validación, persistencia y publicación en varias Lambdas: añade límites no aprobados.
- Afirmar entrega exactamente una vez en SQS: los reintentos inciertos permiten copias físicas; el contrato usa alertId estable y deduplicación del consumidor.
