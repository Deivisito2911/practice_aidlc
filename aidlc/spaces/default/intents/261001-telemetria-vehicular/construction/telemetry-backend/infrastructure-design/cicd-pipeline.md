# Pipeline de CI/CD

## Etapas y controles

| Etapa | Comprobación | Criterio para continuar |
|---|---|---|
| Pull request | Prettier, ESLint y tipos TypeScript | Todas pasan. |
| Pruebas | Unitarias por capa y prueba integrada API Gateway → Lambda única (BVA síncrona y persistencia) → DynamoDB evento/outbox → SQS de alertas con servicios AWS simulados | Cada fallo BVA devuelve 400 antes de DynamoDB/SQS; un válido devuelve 202 solo después de persistir. Probar idempotencia por `eventId`, batería <20 y recuperación PENDING por la misma Lambda. La suite actual de tres handlers no demuestra esta topología. |
| Seguridad | Dependencias, secretos e inspección de CDK sintetizado | Sin vulnerabilidades de severidad alta sin resolver ni secretos expuestos; ninguna clave AWS persistente. La vulnerabilidad transitiva ya detectada en la cadena CDK impide declarar verde esta etapa hasta resolverla. |
| Empaquetado | Un artefacto Lambda y síntesis CDK con API Gateway → Lambda, dos tablas DynamoDB, EventBridge sobre la misma función y SQS solo de alertas | La plantilla contiene exactamente una `AWS::Lambda::Function` de aplicación, ninguna SQS de entrada y ningún mapeo SQS → Lambda; el artefacto se identifica por commit. |
| Integración | Pull request aprobado y fusión squash a main | Protecciones de rama satisfechas. |
| Staging | Despliegue automático y prueba de humo de 400 temprano, 202 posterior a DynamoDB y alerta lógica; carga de 100 solicitudes válidas/s y prueba de notificación de alarmas | Recorrido crítico verde; p95 ≤500 ms de validación y persistencia, ≥99 % de aceptados persistidos en <30 s y alarmas entregadas a la guardia operativa. |
| Producción | Aprobación manual y promoción del artefacto validado | Firma de los responsables y comprobación posterior. |

## Identidad y secretos

El pipeline asume roles AWS temporales por OIDC, con permisos separados de síntesis, despliegue a staging y promoción a producción. No guarda claves persistentes. La clave de API pertenece al productor y se distribuye y rota mediante un canal de secretos; el pipeline no la imprime ni la almacena como variable de repositorio. La credencial de la sonda operativa también se obtiene de un gestor de secretos.

## Despliegue y reversión

Versionar la única Lambda y promover gradualmente la nueva versión con observación de respuestas 400/202, errores DynamoDB, latencia y antigüedad PENDING. Ante regresión, enrutar la integración API Gateway y el barrido EventBridge a la versión anterior y detener la promoción; conservar tablas, SQS de alertas y salidas duraderas. Los cambios de esquema deben permitir que las versiones anterior y nueva lean los registros durante la reversión. No eliminar ni recrear tablas como paso de rollback. La promoción queda bloqueada si faltan pruebas del 400 temprano, destino de alarmas, medición de carga o resolución de un fallo de seguridad bloqueante.

## Evidencia

Guardar resultado de CI, síntesis CDK, prueba crítica, prueba de humo, aprobación de producción y versión desplegada. CloudTrail registra las acciones administrativas de despliegue.

## Cambio de contrato pendiente

La validación BVA ocurre síncronamente en la única Lambda; cada fallo devuelve 400 y no toca DynamoDB ni SQS. Se conserva el 202 para solicitudes válidas, ahora posterior a la confirmación DynamoDB. El contrato vigente aún lo define tras publicar en SQS de entrada y deberá corregirse por esta decisión humana, junto con los requisitos de cola/DLQ de ingreso. El CDK y la prueba integrada actuales implementan tres Lambdas; el pipeline no debe tratarlos como prueba de la arquitectura aprobada.
