# CI/CD e infraestructura — U2

## Flujo de cambio

1. Modificar TypeScript/CDK en rama corta y abrir PR; no desplegar cambios desde consola.
2. CI ejecuta format, lint, typecheck, pruebas unitarias por capa, integración crítica AWS simulada, análisis de dependencias/secretos y `cdk synth`. U3 integra estos controles en su pipeline; U2 no crea un pipeline paralelo.
3. Revisar plantilla CDK para confirmar una Lambda, dos tablas, una SQS solo de alertas y reglas EventBridge; revisar cambios IAM, KMS, GSI TTL y alarmas.
4. Fusionar por squash a `main`; desplegar staging automáticamente con los parámetros del entorno. Verificar backfill/índice, dashboard, IAM P3, preview vacía y no vacía, confirmación, ejecución parcial y métricas/alarms antes de habilitar producción.
5. Promoción a producción requiere aprobación manual; aplicar misma topología y un destino/rol de producción diferentes. No almacenar credenciales AWS persistentes; el pipeline usa los roles temporales OIDC acordados por U3.

## Despliegue y reversión

El cambio compatible se despliega primero con la GSI nueva y el handler preparado para filas viejas. Completar backfill idempotente con métrica de avance; activar la alarma TTL solo cuando todos los elementos vigentes consultables tengan `ttlShard`. El backfill es una operación P3 limitada servida por la misma Lambda, no un acceso de CLI directo a DynamoDB. El rollback puede desactivar la consulta/alarma TTL y conservar la GSI temporalmente; no quitar índice ni atributos mientras una versión activa dependa de ellos. Cambios de código se revierten por nueva fusión/redeploy, preservando Outbox. No borrar tablas, colas, llaves ni objetos CloudTrail.

## Secretos y configuración

Región/cuenta vienen del ambiente CDK. `OperatorRoleArn`, `AlarmTopicArn`, límites por entorno y configuración TTL se inyectan como parámetros validados, no como secretos en el repositorio. El rol P3 se asume con identidad corporativa y credenciales temporales; no se guarda el secreto de productor en CLI ni CI.

La clave MAC de preview permanece en KMS; su ARN es configuración pública de servicio y no se exporta el material. El despliegue coordina CLI y handler para el sobre de confirmación versionado; al reemplazar la clave se conserva la anterior solo mientras existan previews vigentes. CloudTrail registra Invoke mediante selector de eventos de datos limitado a la función. Staging prueba enlace de IDs/auditoría, denegación IAM y MAC inválido antes de habilitar operación real.

## Controles por etapa

| Etapa | Gate |
|---|---|
| PR | formato, lint, tipos, unitarias, integración, dependencias/secretos, synth y revisión de IAM/topología. |
| Staging | despliegue automático; smoke tests de alarmas, autorizaciones, preview/retry y 15 min a 100 RPS. |
| Producción | aprobación manual, parámetros/ARN validados, backfill listo y rollback documentado. |

## Fuentes

`inception/delivery-planning/bolt-plan.md`, `nfr-design/security-design.md`, `nfr-design/observability-design.md`, `nfr-design/logical-components.md`, `inception/contract-design/contract-summary.md` y `inception/requirements-analysis/requirements.md`.
