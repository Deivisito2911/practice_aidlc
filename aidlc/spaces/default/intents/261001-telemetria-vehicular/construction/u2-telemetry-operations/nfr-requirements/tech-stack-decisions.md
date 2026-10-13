# Decisiones de tecnología — U2

| ID | Selección | Motivo y condición de aceptación |
|---|---|---|
| NFR9.10 | Mantener TypeScript y AWS CDK del servicio existente. | Sigue las decisiones de U1; la ampliación compila y sintetiza sin cambiar propiedad ni contrato externo. |
| NFR9.11 | Entregar recuperación manual como CLI operativa propia con vista previa y confirmación. | Decisión Q1 de Functional Design. La CLI solicita una operación autorizada del mismo TelemetryService y no crea una Lambda, API pública de productor, cola de ingreso ni propietario independiente. |
| NFR9.12 | Mantener API Gateway REST, única Lambda, tablas evento/Outbox, EventBridge y SQS de alertas; ampliar señales y alarmas operativas. | Conserva C1–C5. Topología física y políticas IAM se concretan en Infrastructure Design. |
| NFR9.13 | Usar los registros/métricas y el servicio de alarmas del entorno existente, con destino de guardia configurado por entorno. | Evita una plataforma operativa paralela; servicios y recursos concretos se verifican en Infrastructure Design. |

Framework de CLI, librerías, esquema exacto de invocación, nombres físicos, versiones y parámetros CDK requieren inspección del repositorio y se deciden en Code Generation/Infrastructure Design.

## Alternativas descartadas

- Procedimiento manual con herramientas AWS genéricas: descartado por la decisión Q1 del usuario.
- Acceso CLI directo e independiente a tablas/SQS: descartado para preservar un propietario de reclamación y publicación.
- Lambda adicional, SQS de ingreso o endpoint de administración disponible para productores: fuera de alcance y contrario a C1–C5.

## Fuentes

`inception/requirements-analysis/requirements.md`, `inception/contract-design/contract-summary.md`, `inception/units-generation/unit-of-work.md`, `inception/user-stories/stories.md` y `functional-design/functional-spec.md`.
