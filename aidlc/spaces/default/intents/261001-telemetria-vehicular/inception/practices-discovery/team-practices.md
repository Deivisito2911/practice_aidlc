## Way of Working

Trabajamos con desarrollo basado en tronco. Cada cambio se realiza en una rama de corta duración, pasa por *pull request* y se integra mediante fusión *squash* a `main`.

## Walking Skeleton

La primera rebanada integrada recorre API Gateway REST → una única Lambda de telemetría → DynamoDB. La Lambda valida antes de escribir y persiste atómicamente el evento y, para una batería con `value < 20`, una salida `PENDING` del patrón Outbox. La misma Lambda publica las salidas pendientes en la SQS de alertas; una regla periódica de EventBridge la invoca para recuperar las que sigan `PENDING`. No hay SQS de entrada ni funciones Lambda separadas para ingreso y publicación. El valor `20` no genera alerta.

## Testing Posture

- **Methodology**: test-after
- **Ordering**: implementaremos cada capa comprobable antes de escribir y ejecutar sus pruebas unitarias; después de integrar las capas, ejecutaremos la prueba crítica del recorrido completo.
- Escribiremos pruebas unitarias para validación y respuesta HTTP, idempotencia, escritura transaccional de evento y salida, publicación y recuperación de salidas `PENDING`, y el límite estricto de batería (`value < 20`; `20` no genera alerta).
- Mantendremos una prueba de integración crítica con servicios AWS simulados que cubra las dos formas de invocación de la misma Lambda: API Gateway REST → DynamoDB con evento y Outbox transaccionales → SQS de alertas, y EventBridge periódico → recuperación de salidas `PENDING`. Comprobaremos que una solicitud inválida no produce escritura ni publicación, que una transacción fallida no deja registros parciales ni devuelve éxito, que `202` llega solo después de confirmar la transacción y que un fallo de publicación conserva la salida para reintento.
- La integración continua ejecutará formato, *lint*, comprobación de tipos, pruebas y análisis de dependencias y secretos.
- No se fija todavía un porcentaje numérico de cobertura; la estrategia mínima exige pruebas trazables a los requisitos y que el recorrido crítico permanezca verde.

## Deployment

Desplegamos automáticamente a *staging* después de integrar en `main` y exigimos aprobación manual antes de promover a producción. Definimos la infraestructura como código mediante AWS CDK, usamos roles temporales OIDC e IAM de mínimo privilegio, cifrado KMS, auditoría CloudTrail, alarmas operativas y un plan de reversión. El despliegue incluye API Gateway, una única Lambda de telemetría, DynamoDB para eventos y Outbox, la regla periódica de EventBridge y la SQS de alertas; no incluye SQS de entrada ni DLQ de ingreso. Si se despliega un consumidor de alertas, su DLQ y política de recuperación se definirán para ese consumidor. La estrategia concreta de despliegue de Lambda y los umbrales de alarma y reversión se concretarán en las etapas de diseño y despliegue.

## Code Style

Usamos TypeScript y AWS CDK para la infraestructura como código. Los identificadores del contrato y del código se escriben en inglés y siguen las convenciones de TypeScript, incluidos `vehicleId`, `eventType`, `timestamp` y `value`. Prettier, ESLint y la comprobación de tipos son obligatorios y se ejecutan en CI antes de integrar cambios.
