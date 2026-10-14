# Especificación de infraestructura — U3 Controles de entrega

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | Servicio serverless AWS existente: API Gateway REST, una Lambda `TelemetryService`; regla EventBridge para recuperación periódica. | Conserva el contrato U1 y empaqueta el mismo artefacto. |
| Networking topology | API Gateway es el ingreso HTTPS; servicios administrados se comunican por endpoints AWS con TLS. La Lambda no se adjunta a una VPC mientras no requiera recursos privados adicionales. | No hay base de datos privada ni dependencia de red privada que justifique NAT/VPC en esta unidad. |
| Storage strategy | Dos tablas DynamoDB: eventos y Outbox; SQS solo para alertas. Bucket de auditoría dedicado para entrega CloudTrail, cifrado con KMS y retención protegida de 90 días. | Separa datos operativos de evidencia administrativa. No crear SQS de ingreso ni DLQ de ingreso. |
| Environments | Desarrollo local/sandbox; staging y producción como destinos aislados con roles y parámetros distintos. El pipeline promueve el digest validado de staging a producción tras aprobación humana. | Reduce el riesgo de cambios y credenciales cruzados entre ambientes. La asignación concreta de cuentas debe confirmarse antes de desplegar. |
| IaC approach | TypeScript y AWS CDK versionados; síntesis reproducible en CI y despliegue por etapas del stack. | Cumple NFR9 y deja cambios de recursos revisables como código. |
| Resource sizing | Lambda, API Gateway, tablas y cola conservan límites y configuración definidos por el stack de telemetría; U3 no altera concurrencia ni presupuesto de latencia. CloudTrail almacena eventos de administración de la cuenta. | La capacidad de servicio pertenece a U1/U2; evitar asignar valores nuevos sin medición o decisión aprobada. |
| Deployment identity | GitHub Actions confirmado; validación de PR sin AWS. Roles temporales de staging/producción separados, con audiencia/sujeto exactos y protección de ramas/tags y aprobación de entorno. | Los sujetos e IDs reales se verifican antes de activar; no se almacenan claves AWS permanentes. |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| API Gateway REST | ingress | HTTPS; integración con la Lambda existente; conserva cuota y clave de API acordadas. | La clave de API no se registra en logs de aplicación. |
| AWS Lambda `TelemetryService` | compute | Mismo artefacto para entrada HTTP y activación programada; rol de ejecución con permisos mínimos a sus tablas y cola. | No desplegar Lambda adicional para CI, auditoría o telemetría. |
| DynamoDB telemetry-events | database | Tabla existente con cifrado KMS, TTL y esquema gobernado por el contrato. | U3 no cambia claves, TTL ni índices de U1/U2. |
| DynamoDB telemetry-outbox | database | Tabla existente cifrada con KMS; conserva estados PENDING/PUBLISHED y campos de recuperación. | No descartar salidas pendientes ni alterar las condiciones de reclamación. |
| EventBridge scheduled rule | other | Invoca periódicamente la misma Lambda con identidad de invocación restringida al recurso. | Frecuencia y límites son propiedad del diseño operativo previo. |
| SQS alert queue | queue | Cola de salida cifrada; acceso de envío limitado al rol de la Lambda. | Es la única cola de la topología contractual. |
| AWS KMS | other | Clave(s) para datos y auditoría; políticas separan uso de aplicación y administración de claves. | Los roles de aplicación no administran las claves ni el trail. |
| CloudTrail | other | Trail de eventos administrativos de los recursos de la solución; entrega cifrada al bucket de auditoría. | Verificar en cuenta real la generación y recepción de eventos. |
| S3 audit archive | other | Bucket dedicado, KMS, bloqueo de acceso público, versionado y retención protegida mínima de 90 días. | La política de retención debe impedir borrado anticipado por roles de aplicación/despliegue. |
| IAM OIDC roles | other | Roles de despliegue distintos; audiencia y sujeto exactos observados en GitHub, combinados con reglas de ramas/tags del entorno. | PR valida sin rol AWS; probar rechazo de repositorios, forks, refs y entornos no autorizados. |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| Lambda y stack CDK de telemetría | U1 | U2 y U3 | U3 consume y promueve el artefacto; no modifica propiedad de modelos o lógica. |
| Tablas DynamoDB y SQS de alertas | U1 | U2 y U3 | U2 opera índices y recuperación; U3 solo define despliegue y controles del stack. |
| Trail y archivo de auditoría | U3 | Unidades de la solución | Rol de auditoría administra; roles de aplicación y despliegue de aplicación no borran ni alteran evidencia. |

## Separación de auditoría

La separación de auditoría también cubre permisos indirectos: los roles y plantillas de ejecución CloudFormation y PassRole se revisan para impedir que un despliegue ordinario cambie o borre evidencia. El bootstrap o cambio de recursos de auditoría pertenece al responsable de auditoría. La separación efectiva de roles y alcance de ejecución es requisito de provisioning; no se declara resuelta por la plantilla actual.

## Coste por entorno y verificación

| Superficie | Estimación revisable | Condición para activar |
|---|---|---|
| Corrección CDK/lockfile | No incorpora recursos runtime nuevos; revisar diff de síntesis para confirmar configuración y topología conservadas. | Auditorías npm verdes, instalación reproducible y pruebas locales del stack. |
| GitHub Actions | Minutos de runner y almacenamiento/retención de artefactos según plan real del repositorio. | Repositorio y protecciones identificados; checks obligatorios ejecutados. |
| Auditoría por staging/producción | Tarifa regional de almacenamiento/solicitudes S3 y KMS, eventos CloudTrail y observabilidad aplicables al volumen/retención definidos. | Región, cuentas y presupuesto revisados antes de provisionar; eventos e IAM reales comprobados después. |
| Mecanismos U2 conservados | Clave HMAC, llamadas MAC, índice TTL, eventos Invoke y panel/métricas ya definidos; conservar su estimación por entorno. | No añadir otra Lambda o cola; mantener las obligaciones U2 y su evidencia externa pendiente. |

No hay total monetario aprobado sin región, volumen y retención reales. La síntesis y pruebas locales no provisionan recursos ni acreditan coste, OIDC o actividad CloudTrail reales. F1 continúa pendiente hasta auditorías verdes y los controles CI/protección pendientes se declaran GAP/Deferred.

## Fuentes

- `construction/u3-delivery-controls/nfr-design/security-design.md`
- `construction/u3-delivery-controls/nfr-requirements/security-requirements.md`
- `construction/u3-delivery-controls/nfr-requirements/tech-stack-decisions.md`
- `inception/domain-design/components.md`
- `inception/contract-design/contract-summary.md` (C4–C5 y topología)
