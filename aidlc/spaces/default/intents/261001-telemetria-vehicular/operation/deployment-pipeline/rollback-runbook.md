# Runbook de reversión

## Señales y decisión

Detener la promoción si falla el despliegue, la prueba funcional autorizada, la entrega a SQS, la recuperación de Outbox, CloudTrail o una alarma de severidad alta. El operador identifica el commit y artifact en los archivos `staging-evidence.json` o `production-evidence.json` del run, guarda el estado de CloudFormation y avisa al responsable de guardia. La reversión no se ejecuta automáticamente sobre datos; primero se determina si cambió el esquema o si hay recursos con política `Retain`.

## Producción: volver a una entrega validada

1. Seleccionar el último run CI verde de `main` conocido como sano y su run verde de staging correspondiente. Confirmar que el artifact `telemetry-<SHA>` sigue disponible, que el digest y manifiestos coinciden y que no hay bloqueo de seguridad nuevo.
2. Iniciar `Deploy production` con esos dos IDs. La puerta del entorno `production` vuelve a exigir aprobación manual; registrar el incidente, el motivo y el aprobador. Nunca descargar un artifact arbitrario ni reconstruir desde una rama.
3. Verificar el stack `Telemetry-production`, Lambda `Active`, la prueba funcional con API key, las alarmas y CloudTrail. Registrar el nuevo run, el digest y la hora de recuperación. Si la entrega previa no está disponible o los recursos persistentes son incompatibles, detenerse y ejecutar un plan de recuperación aprobado por el responsable de datos/auditoría.

## Staging y fallos de CloudFormation

Ante un update fallido, revisar los eventos del stack y el estado de rollback de CloudFormation. No borrar el stack ni tablas, claves o trail para forzar un resultado verde. Para volver staging a una entrega anterior se requiere una ejecución operativa controlada del ensamblado CI anterior bajo el rol de staging, con la misma verificación de run, digest y manifiestos; el workflow automático de staging aún no ofrece despacho manual de reversión. Registrar esa limitación como trabajo pendiente antes de declarar un procedimiento automático completo.

## Prueba del runbook y pendientes

Environment Provisioning debe asignar roles y revisores, preparar el canal SNS y desplegar/verificar el stack de CloudTrail separado antes de la aplicación. Deployment Execution debe ensayar al menos un fallo de despliegue o reversión controlada en staging y registrar tiempos, artefacto, estado de recursos y salud. Performance Validation debe medir objetivos posteriores. Hasta entonces el runbook es una instrucción preparada, no una reversión probada; F8/F9 y la puerta de fase FAIL permanecen abiertos.

Referencias: `operation/deployment-pipeline/cd-config.md`, `operation/deployment-pipeline/deployment-strategy.md`, `construction/u3-delivery-controls/infrastructure-design/cicd-pipeline.md` y `verification/phase-check-construction.md`.
