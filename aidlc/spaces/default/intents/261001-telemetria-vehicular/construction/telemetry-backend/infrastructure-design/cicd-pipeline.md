# Pipeline de CI/CD

## Etapas y controles

| Etapa | Comprobación | Criterio para continuar |
|---|---|---|
| Pull request | Prettier, ESLint y tipos TypeScript | Todas pasan. |
| Pruebas | Unitarias por capa, contrato HTTP/SQS y prueba integrada API → SQS → Lambda → DynamoDB → salida → SQS alertas con servicios AWS simulados | La prueba crítica y la suite pasan. |
| Seguridad | Dependencias, secretos e inspección de CDK sintetizado | Sin fallos bloqueantes; ninguna clave persistente. |
| Empaquetado | Artefactos Lambda y síntesis CDK con revisión de cambios | Artefactos identificados por commit y cambios esperados. |
| Integración | Pull request aprobado y fusión squash a main | Protecciones de rama satisfechas. |
| Staging | Despliegue automático y prueba de humo de aceptación, persistencia y alerta lógica | Recorrido crítico verde y alarmas operativas visibles. |
| Producción | Aprobación manual y promoción del artefacto validado | Firma de los responsables y comprobación posterior. |

## Identidad y secretos

El pipeline asume roles AWS temporales por OIDC, con permisos separados de síntesis, despliegue a staging y promoción a producción. No guarda claves persistentes. La clave de API de productores se configura como secreto del entorno, no en código ni en logs.

## Despliegue y reversión

Versionar las Lambdas y promover gradualmente la nueva versión con observación de errores, latencia y edad de cola. Ante regresión, enrutar invocaciones a la versión anterior y detener la promoción; conservar tablas, colas y salidas duraderas. Los cambios de esquema deben permitir que las versiones anterior y nueva lean los registros durante la reversión. No eliminar ni recrear tablas como paso de rollback.

## Evidencia

Guardar resultado de CI, síntesis CDK, prueba crítica, prueba de humo, aprobación de producción y versión desplegada. CloudTrail registra las acciones administrativas de despliegue.
