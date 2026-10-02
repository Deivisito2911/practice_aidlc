## Way of Working

Trabajamos con desarrollo basado en tronco. Cada cambio se realiza en una rama de corta duración, pasa por *pull request* y se integra mediante fusión *squash* a `main`.

## Walking Skeleton

Construiremos primero una rebanada mínima de extremo a extremo que incluya la recepción por API REST, la publicación en la SQS de entrada, el consumo por Lambda, la persistencia en DynamoDB y la publicación en la SQS de alertas cuando un evento de batería tenga un valor inferior al 20 %. Esta rebanada debe demostrar que todas las piezas se conectan antes de ampliar las funcionalidades.

## Testing Posture

- **Methodology**: test-after
- **Ordering**: implementaremos cada capa comprobable antes de escribir y ejecutar sus pruebas unitarias; después de integrar las capas, ejecutaremos la prueba crítica del recorrido completo.
- Escribiremos pruebas unitarias por capa para la validación de la API, la publicación en SQS, el procesamiento de Lambda, la persistencia en DynamoDB y la regla estricta de alerta de batería (`value < 20`; el valor `20` no genera alerta).
- Mantendremos una prueba de integración crítica con servicios AWS simulados que cubra API REST → SQS → Lambda → DynamoDB → SQS de alertas.
- La integración continua ejecutará formato, *lint*, comprobación de tipos, pruebas y análisis de dependencias y secretos.
- No se fija todavía un porcentaje numérico de cobertura; la estrategia mínima exige pruebas trazables a los requisitos y que el recorrido crítico permanezca verde.

## Deployment

Desplegamos automáticamente a *staging* después de integrar en `main` y exigimos aprobación manual antes de promover a producción. Definimos la infraestructura como código, usamos roles temporales mediante OIDC e IAM de mínimo privilegio, cifrado con KMS, auditoría con CloudTrail, alarmas operativas, DLQ y un plan de reversión. La estrategia concreta de despliegue de Lambda, los umbrales de alarma y reversión y la configuración detallada de entornos se concretarán en las etapas de diseño y despliegue.

## Code Style

Usamos TypeScript y AWS CDK para la infraestructura como código. Los identificadores del contrato y del código se escriben en inglés y siguen las convenciones de TypeScript, incluidos `vehicleId`, `eventType`, `timestamp` y `value`. Prettier, ESLint y la comprobación de tipos son obligatorios y se ejecutan en CI antes de integrar cambios.