# Inventario de entornos — 2026-10-14

## Alcance y estado real

Staging y producción están previstos como stacks separados en la **misma cuenta** `745708001009`, región `sa-east-1`. Esto aporta separación lógica de recursos, no aislamiento entre cuentas. La identidad de sesión fue comprobada con `sts get-caller-identity` mediante el perfil SSO `745708001009_AdministratorAccess`: `arn:aws:sts::745708001009:assumed-role/AWSReservedSSO_AdministratorAccess_b7bb9694c2939bb0/dzanella@carconnect.com.ec`.

| Recurso | Staging | Producción | Auditoría de cuenta | Evidencia |
| --- | --- | --- | --- | --- |
| Stack CloudFormation | No existe | No existe | No existe | `cloudformation list-stacks` devolvió `[]`. |
| VPC, subred, SG, NACL dedicados | No aplica | No aplica | No aplica | Las Lambda diseñadas no se adjuntan a VPC. |
| Tema SNS de alarmas | No existe ni hay destino autorizado | No existe ni hay destino autorizado | No aplica | `sns list-topics` devolvió `[]`; usuario: «Sin canal de guardia aún». |
| Trail CloudTrail | Compartido, aún inexistente | Compartido, aún inexistente | No existe | `cloudtrail list-trails` y `describe-trails` devolvieron `[]`. |
| Proveedor OIDC de GitHub | Ausente | Ausente | No aplica | `iam list-open-id-connect-providers` mostró solo un proveedor EKS. |
| Rol GitHub de despliegue | Ausente | Ausente | No aplica | `iam list-roles` no encontró roles de telemetría/GitHub. |
| Bootstrap CDK | Ausente | Ausente | No requerido por la plantilla de auditoría sin assets | SSM `/cdk-bootstrap/hnb659fds/version`: `ParameterNotFound`; la plantilla auditada no contiene `BootstrapVersion`. |
| Secrets Manager / SSM de aplicación | No verificado | No verificado | No aplica | No hay stack de aplicación ni valores de entorno aprobados para inyectar. |

## Diseño preparado

`cdk.staging.out/Telemetry-staging.template.json` y `cdk.production.out/Telemetry-production.template.json` contienen cada una una Lambda, dos tablas DynamoDB y una cola SQS; ninguna contiene `AWS::CloudTrail::Trail` ni `AWS::S3::Bucket`. `cdk.audit.out/TelemetryAudit.template.json` contiene un trail multirregión, un bucket S3 con cifrado KMS, versionado y Object Lock COMPLIANCE de 90 días, y una clave KMS. El selector de eventos de datos cubre las Lambda de ambos entornos por nombre. Ninguno de esos recursos se ha creado aún.

El rol administrador SSO puede gestionar recursos de cuenta; el diseño separa los stacks y deja la auditoría fuera de los workflows de aplicación, pero la segregación IAM efectiva no se ha demostrado. Los futuros roles OIDC de aplicación deberán carecer de permisos para administrar CloudTrail, el bucket y la clave de auditoría.

## Dependencias para completar el aprovisionamiento

1. Desplegar y validar `TelemetryAudit` como recurso de cuenta mediante la sesión administradora, tras aprobar el impacto de Object Lock y costos.
2. Definir destinos autorizados de alarmas y crear o indicar temas SNS de staging y producción; ambos stacks exigen `OperationsAlarmTopicArn`.
3. Crear proveedor OIDC, roles separados y políticas IAM acotadas, configurar variables y protecciones GitHub y bootstrap CDK para los assets Lambda.
4. Desplegar cada stack de aplicación desde su ensamblado validado y ejecutar los checks de salud y seguridad. Los workflows locales aún no aportan ejecuciones remotas.

Fuente de diseño: `construction/u3-delivery-controls/infrastructure-design/infrastructure-specification.md` y `operation/deployment-pipeline/cd-config.md`.
