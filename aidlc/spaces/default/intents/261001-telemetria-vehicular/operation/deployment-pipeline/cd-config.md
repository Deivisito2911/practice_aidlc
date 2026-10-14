# Configuración del pipeline de despliegue

## Resultado

`.github/workflows/deploy-staging.yml` se activa al terminar con éxito el workflow `CI` de un push propio a `main`. `.github/workflows/deploy-production.yml` se inicia manualmente con los IDs del run de CI y del run de staging y usa el entorno GitHub `production`. La configuración existe localmente y la identidad SSO de la cuenta 745708001009 fue verificada en sa-east-1; no hay ejecución remota, roles OIDC ni protecciones GitHub verificados. La frontera Construcción→Operación conserva el veredicto FAIL y los hallazgos F7–F9.

## Identidad inmutable de la entrega

CI genera `cdk.staging.out/`, `cdk.production.out/` y `cdk.audit.out/` desde el mismo commit, más `dist/`. Publica un solo artifact `telemetry-<SHA>` con `source-commit.txt`, hashes por archivo y hash del manifiesto. El ensamblado de auditoría se administra aparte; no lo despliegan los jobs de aplicación. Staging valida que el run `CI` fue un push verde a `main` en este repositorio, consulta el digest de GitHub, descarga el artifact por ID de run y comprueba ambos manifiestos antes de asumir un rol AWS. Después guarda commit, ID del run de CI, digest, hash de plantilla de staging, stack y cuenta en `staging-evidence-<SHA>`.

Producción comprueba el run verde de staging, su evidencia, el mismo ID de CI, commit, digest y hash de la plantilla de staging. Descarga de nuevo el mismo artifact y usa el ensamblado de producción ya sintetizado; no ejecuta `cdk synth` ni `npm run build`. La elección de GitHub Actions artifacts tiene retención de 30 días. Un artifact caducado o manifiesto distinto detiene la promoción y obliga a validar de nuevo una entrega.

## Entornos, permisos y controles previos

| Entorno GitHub | Activación | Identidad AWS | Variables de entorno obligatorias |
| --- | --- | --- | --- |
| `staging` | Run CI verde en `main`; serializado. | Rol OIDC de staging. | `AWS_ACCOUNT_ID`, `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`, `OPERATIONS_ALARM_TOPIC_ARN`. |
| `production` | `workflow_dispatch` y aprobación manual de revisores obligatorios; serializado. | Rol OIDC independiente de producción. | Las mismas claves, con valores de producción. |

Ambos jobs conceden `actions: read`, `contents: read` e `id-token: write` solo en el job de despliegue. La validación de PR en CI permanece con `contents: read` y sin AWS. La política de confianza IAM debe comprobar `aud=sts.amazonaws.com` y el `sub` real de cada entorno GitHub; en repositorios con sujeto inmutable también deben coincidir los IDs efectivos de propietario y repositorio. La protección de entorno debe restringir ramas y exigir revisores en producción. Las políticas IAM acotan cuenta, región, stack, bootstrap y acciones; el rol de aplicación no administra CloudTrail ni puede obtener ese permiso mediante CloudFormation o PassRole.

Cada workflow valida formato de cuenta, región, ARN del rol y ARN del tema SNS antes de asumir el rol. El parámetro CDK obligatorio `OperationsAlarmTopicArn` toma el tema del entorno, nunca un valor supuesto. Tras `cdk deploy --app <ensamblado>` comprueba estado `CREATE_COMPLETE`/`UPDATE_COMPLETE` y Lambda `Active`, y guarda la evidencia del run. Estos checks son preparación y disponibilidad básica, no la prueba funcional con API key ni la medición de NFR; Deployment Execution y Performance Validation deben aportar esas pruebas.

## Bloqueos de activación

`TelemetryAudit` separa en CDK el trail, la clave KMS y el bucket protegido del stack de aplicación. Las plantillas locales de staging y producción ya no contienen CloudTrail; ambos workflows conservan ese control y además consultan `IsLogging` del trail `telemetry-audit` después de asumir el rol. CI sintetiza el ensamblado de auditoría dentro del mismo artifact validado, pero su despliegue pertenece al administrador de auditoría, fuera de los jobs de aplicación. En la cuenta 745708001009 todavía no hay trail, bootstrap CDK, tema SNS, proveedor OIDC de GitHub ni roles de despliegue; faltan además variables por entorno, ruleset de `main`, entornos protegidos y runs remotos. El rol de aplicación necesitará solo lectura `cloudtrail:GetTrailStatus` para el guard, sin administración de auditoría. Ninguna de estas evidencias externas se marca verificada por la existencia del YAML.

## Fuentes

- `construction/ci-pipeline/ci-config.md` y `quality-gates.md`.
- `construction/u3-delivery-controls/infrastructure-design/cicd-pipeline.md` y `infrastructure-specification.md`.
- `construction/build-and-test/findings.json` y `verification/phase-check-construction.md`.
- [GitHub OIDC y sujetos de entorno](https://docs.github.com/en/actions/reference/security/oidc).
- [AWS CDK: desplegar un ensamblado ya sintetizado](https://docs.aws.amazon.com/cdk/v2/guide/deploy.html).
- [AWS configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials).
