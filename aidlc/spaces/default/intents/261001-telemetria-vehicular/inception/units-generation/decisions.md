# Decisiones de arquitectura de las unidades

## ADR-003: Tres incrementos del mismo servicio

- **Context:** Domain Design estableció un único `TelemetryService` y una sola Lambda para HTTP y recuperación periódica. La primera rebanada debe demostrar API Gateway REST → Lambda → transacción DynamoDB evento/Outbox → SQS de alertas y recuperación por EventBridge. Los archivos anteriores agrupaban todo el taller en `telemetry-backend`, lo que hacía demasiado grande esa primera rebanada.
- **Decision:** Dividir la entrega en U1 `u1-telemetry-core` (`service`), U2 `u2-telemetry-operations` (`service`) y U3 `u3-delivery-controls` (`packaging`). U2 y U3 dependen de U1 y no dependen entre sí. U1 y U2 evolucionan la misma Lambda; U3 protege su entrega.
- **Consequences:** El recorrido integrado se comprueba pronto y las capacidades operativas y de CI tienen límites verificables. Habrá coordinación sobre el mismo repositorio y el mismo artefacto Lambda; los contratos y pruebas de U1 deben mantenerse compatibles al ampliar U2 y U3. El CDK de U1 incluye la infraestructura mínima segura y U3 completa OIDC, CloudTrail y controles de promoción.
- **Alternatives Rejected:** Una sola unidad para las doce historias habría demorado la comprobación de la rebanada mínima. Separar unidades por cada recurso AWS o en varias Lambdas habría añadido coordinación, debilitado la propiedad única del evento y Outbox y contravenido la arquitectura aprobada.
- **Seguridad y cumplimiento:** U1 requiere IAM mínimo y KMS; U3 verifica OIDC, CloudTrail protegido, revisión y aprobación manual de producción. Ninguna unidad crea SQS de ingreso ni DLQ de ingreso.

## Sources

- `inception/domain-design/components.md`
- `inception/domain-design/decisions.md`
- `inception/units-generation/units-generation-questions.md`
