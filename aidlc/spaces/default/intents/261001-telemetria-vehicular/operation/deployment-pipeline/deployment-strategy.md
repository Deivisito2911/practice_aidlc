# Estrategia de despliegue y promoción

## Matriz de promoción

| Paso | Entrada | Puerta | Resultado |
| --- | --- | --- | --- |
| Desarrollo local | Código de rama corta. | Pruebas y revisión de PR. | No hay cuenta `dev` separada en el alcance acordado. |
| CI en `main` | Commit de merge aprobado. | `quality-gates` verde, auditorías y secreto sin hallazgos, ensamblados CDK de staging, producción y auditoría con manifiestos íntegros. | Artifact `telemetry-<SHA>` y digest del run. |
| Staging | Artifact de ese run CI. | Run `push` verde, commit/digest/manifiestos, entorno `staging`, rol OIDC y controles de auditoría listos. | `Telemetry-staging` y evidencia del run; despliegue automático cuando la configuración externa esté lista. |
| Producción | El mismo artifact y evidencia verde de staging. | Despacho manual, entorno `production` con revisores obligatorios, coincidencia de commit/digest, rol OIDC independiente. | `Telemetry-production` y evidencia del run. |

## Comportamiento del despliegue

Cada stack se actualiza mediante CDK/CloudFormation desde el ensamblado específico del entorno. Es una actualización ordinaria del stack; no se declara canary, blue/green ni reparto gradual de tráfico porque el código actual no configura esas capacidades. CI empaqueta ambos ensamblados desde el mismo código fuente, y el workflow de despliegue no vuelve a construir ni sintetizar. El usuario eligió no incorporar feature flags por ahora. Un cambio que los introduzca requiere diseño, pruebas y aprobación propios.

Un run verde de CI no implica despliegue funcional: la plantilla exige un ARN SNS de guardia y el stack de auditoría separado debe estar activo antes del stack de aplicación. La preparación de GitHub/AWS y la separación de permisos son prerrequisitos explícitos. Los jobs comprueban el trail activo, el stack y Lambda `Active`; Deployment Execution deberá hacer una prueba autorizada del API con API key, verificar EventBridge, SQS, entrega CloudTrail y alarmas, y registrar el resultado y el digest realmente desplegado. F7 de trazabilidad sigue abierto y F8/F9 no quedan cerrados por estos workflows.

## Regla de promoción

La aprobación manual de `production` se asigna a revisores concretos en la configuración de GitHub, que Environment Provisioning debe registrar y comprobar. No hay bypass administrativo ordinario. El aprobador compara el run de CI, el run verde de staging, el artifact y su digest, la evidencia funcional, los cambios de CloudFormation y el estado de alarmas. Si falta uno, rechaza la promoción. El digest de GitHub y los hashes internos son complementarios: el primero identifica el artifact almacenado y los segundos sus archivos descargados.

## Referencias

`operation/deployment-pipeline/cd-config.md`, `construction/ci-pipeline/ci-config.md`, `construction/u3-delivery-controls/infrastructure-design/cicd-pipeline.md` y `verification/phase-check-construction.md`.
