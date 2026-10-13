# Requisitos de seguridad y calidad de entrega — U3

## NFR5 — Cifrado y privilegios de la solución

| ID | Requisito verificable |
|---|---|
| NFR5.1 | Los roles de pipeline y despliegue tienen permisos mínimos; ningún rol de aplicación recibe permisos administrativos sobre CloudTrail o sus logs. |
| NFR5.2 | Los cambios de U3 preservan cifrado KMS, TLS y la topología acordada; no añaden SQS de entrada ni DLQ de ingreso. |
| NFR5.3 | La revisión de CDK verifica políticas de IAM y cifrado para los recursos modificados; los permisos de operación quedan separados de los roles del servicio. |

## NFR9 — Infraestructura reproducible

| ID | Requisito verificable |
|---|---|
| NFR9.1 | Los recursos y cambios de infraestructura se definen con TypeScript y AWS CDK; staging se reproduce mediante síntesis/despliegue sin ajustes manuales ocultos. |
| NFR9.2 | U3 empaqueta el mismo servicio y conserva API Gateway REST, una Lambda, dos tablas, EventBridge y SQS de alertas únicamente. |

## NFR6 — Credenciales temporales de despliegue

| ID | Requisito verificable |
|---|---|
| NFR6.1 | El pipeline debe autenticarse en AWS mediante federación OIDC y roles temporales; el sujeto confiable debe limitarse al repositorio y a las referencias de rama/entorno autorizadas. |
| NFR6.2 | No se guardan claves AWS de larga duración en código, variables persistentes, artefactos, registros ni cachés del pipeline. Los tokens y sesiones se limitan a la duración y acciones necesarias. |
| NFR6.3 | El rol de CI y cada rol de despliegue deben aplicar mínimo privilegio y separar acciones de validación, despliegue a staging y promoción a producción. La promoción de producción requiere aprobación humana explícita. |

## NFR8 — Puertas obligatorias de calidad

| ID | Requisito verificable |
|---|---|
| NFR8.1 | Antes de integrar un pull request, CI ejecuta formato, ESLint y comprobación TypeScript con los scripts versionados del proyecto. |
| NFR8.2 | CI ejecuta las pruebas unitarias y la prueba crítica de integración con AWS simulado. Cualquier fallo bloquea la integración. |
| NFR8.3 | CI analiza dependencias y secretos; un hallazgo que supere los umbrales configurados o una credencial persistente bloquea la integración. |
| NFR8.4 | La rama `main` exige todas las comprobaciones obligatorias y revisión aprobada; la integración usa squash. Un resultado fallido no puede promoverse a staging. |

## NFR10 — Auditoría CloudTrail protegida

| ID | Requisito verificable |
|---|---|
| NFR10.1 | CloudTrail registra creación, modificación y eliminación administrativa de API Gateway, Lambda, SQS, DynamoDB, KMS, IAM y CloudFormation usados por la solución, con identidad, acción, recurso y fecha consultables. |
| NFR10.2 | Los logs se cifran con KMS y se conservan al menos 90 días; la política de retención protege la evidencia frente al borrado prematuro. |
| NFR10.3 | Los roles de aplicación no pueden detener o modificar el trail, cambiar su cifrado/retención ni eliminar los logs o su bucket protegido. |
| NFR10.4 | Las comprobaciones de U3 verifican la política de auditoría y documentan cualquier validación que requiera una cuenta AWS real; una síntesis CDK no se presenta como evidencia de eventos reales. |

## Supuestos y límites

La plataforma de repositorio/CI y el proveedor OIDC no están identificados en los artefactos de Inception. Los requisitos anteriores son independientes del proveedor; la configuración concreta debe usar la plataforma que el equipo confirme y nunca sustituir OIDC por claves persistentes.

## Sources

- `inception/requirements-analysis/requirements.md` (NFR6, NFR8, NFR10)
- `inception/user-stories/stories.md` (AC6.2.1–AC6.2.4, AC6.3.1–AC6.3.4)
- `inception/contract-design/contract-summary.md` (C3–C5 y propiedad de U3)
- `inception/delivery-planning/external-dependency-map.md`
- `construction/u1-telemetry-core/functional-design/functional-spec.md` (comportamiento integrado que U3 debe conservar)
- `construction/u1-telemetry-core/functional-design/rules.md` (invariantes compartidos)
