# Validación de infraestructura — 2026-10-14

## Veredicto

**PREPARADO LOCALMENTE; APROVISIONAMIENTO PENDIENTE.** La cuenta y región correctas están verificadas, y la plantilla de auditoría pasa la validación de CloudFormation. No existe aún infraestructura de aplicación ni canal de guardia. La ausencia de destino SNS impide suministrar el parámetro obligatorio `OperationsAlarmTopicArn`, así que staging y producción no se despliegan ni se declaran saludables.

## Controles comprobados

| Control | Resultado | Evidencia y límite |
| --- | --- | --- |
| Identidad y región | PASS | AWS STS devolvió cuenta `745708001009` con perfil SSO, región `sa-east-1`. |
| Diseño CDK | PASS local | Tras el ajuste del sintetizador: `npm run typecheck`, `npm run cdk:synth:audit` e infra: 3 archivos/13 pruebas. Lint, build y formato pasaron antes de ese ajuste, limitado al entrypoint de auditoría. |
| Separación de auditoría | PASS local | Plantillas staging y producción: 0 trails y 0 buckets. Plantilla audit: 1 trail, 1 bucket, 1 clave; no assets ni parámetro de bootstrap. |
| Sintaxis CloudFormation de auditoría | PASS | `cloudformation validate-template` en la cuenta y región objetivo, exit 0. Esto no garantiza que la creación de recursos vaya a tener éxito. |
| Infraestructura efectiva | FAIL pendiente | Sin stacks, trail, SNS, GitHub OIDC, roles de deploy ni bootstrap de CDK. |
| Alerta operativa | BLOCKED | No existe canal autorizado para suscribir alarmas ni ARN SNS. |
| Salud y smoke test | NOT RUN | No hay recursos de aplicación desplegados ni API key de prueba aprobada. |
| Aislamiento de auditoría | PARTIAL | Stack separado y guards de workflow preparados; no hay roles OIDC para comprobar privilegios reales. La sesión SSO administradora conserva acceso de cuenta. |

## Seguridad, parámetros y conectividad

La plantilla de auditoría crea KMS con rotación, bucket privado con cifrado KMS, TLS obligatorio, versionado y Object Lock COMPLIANCE 90 días; CloudTrail tiene validación de logs y eventos de datos Lambda de staging/producción. No se ha desactivado un control existente: la cuenta no tenía trail. Deben validarse después del despliegue la política efectiva de KMS/S3, `IsLogging`, la entrega al bucket y la protección real de objetos. Object Lock COMPLIANCE impide acortar la retención de versiones protegidas; puede generar almacenamiento no eliminable durante el plazo. Los eventos de datos CloudTrail, KMS y S3 pueden generar cargos. Véanse [Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html) y [costos CloudTrail](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-trail-manage-costs.html).

No se han creado secretos ni parámetros de aplicación. El perfil SSO usa sesión temporal; los jobs previstos usan OIDC y no claves fijas. `OperationsAlarmTopicArn` sigue sin valor. No hay VPC o conectividad entre cuentas a probar; ambos entornos compartirían la misma cuenta.

## Logs de despliegue y checks de salud

No se ha ejecutado `cdk deploy` ni se han creado change sets; por eso no hay eventos de stack ni checks de salud remotos que registrar. La validación de plantilla fue de solo lectura. Tras cada creación se registrarán ID, estado y eventos de CloudFormation, outputs no sensibles, estado de CloudTrail y comprobaciones de Lambda/alarma.

## Riesgos y reversión

Si falla el despliegue de auditoría, inspeccionar eventos de CloudFormation y detener nuevas creaciones. Si el trail llega a crearse, deshabilitar logging o eliminar el trail detiene entregas futuras, pero elimina la cobertura de auditoría y exige una decisión explícita. La clave KMS y el bucket tienen `Retain`; las versiones protegidas por COMPLIANCE no pueden eliminarse antes de vencer los 90 días. El costo residual de retención debe asumirse incluso tras revertir el stack. No se ejecutará reversión que borre registros de auditoría sin aprobación.

Los stacks de aplicación permanecen bloqueados. Antes de activarlos se deben verificar el destino SNS, roles OIDC y sus límites, protecciones de GitHub, bootstrap, despliegue y pruebas de salud. El fallo documentado F7–F9 de Construcción→Operación sigue abierto; no se presenta esta preparación como cierre de esa frontera.
