# Preguntas de infraestructura — U3

## Decisiones y ambigüedades

No quedan decisiones que impidan definir la infraestructura. El proveedor CI/repositorio sigue siendo una dependencia externa desconocida; el pipeline se expresa mediante capacidades obligatorias y no fija sintaxis específica del proveedor.

## Supuestos y preguntas abiertas

- La cuenta de destino permite CloudTrail, KMS, almacenamiento de auditoría con retención protegida y roles IAM federados por OIDC.
- Antes de activar despliegues reales, el administrador confirma proveedor CI/OIDC, identificador de repositorio, ramas/entornos protegidos y cuentas AWS de staging y producción.
- El stack de telemetría conserva API Gateway REST, una Lambda, dos tablas DynamoDB, EventBridge y SQS de alertas; la infraestructura de CI y auditoría no altera esa topología de aplicación.

## Sources

- `construction/u3-delivery-controls/nfr-design/security-design.md`
- `construction/u3-delivery-controls/nfr-requirements/tech-stack-decisions.md`
- `inception/contract-design/contract-summary.md` (C4–C5)
- `inception/domain-design/components.md`
