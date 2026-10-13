# Componentes lógicos y dominios de fallo — U1

TelemetryService sigue siendo un solo componente de dominio y una sola Lambda desplegada. Las filas siguientes son módulos internos o dependencias gestionadas, no servicios independientes ni nuevas Lambdas.

| Parte | Responsabilidad | Estado que posee | Falla de forma aislada cómo |
|---|---|---|---|
| Adaptador HTTP | Distinguir petición API, validar contrato y formar respuesta. | Ninguno. | Rechaza antes de escribir; 4xx/5xx observables. |
| Núcleo de aceptación | Canonicalizar, decidir batería baja y coordinar transacción/idempotencia. | TelemetryEvent y creación de OutboxEntry. | Un commit fallido no deja estado parcial. |
| Entregador Outbox | Reclamar, formar mensaje, enviar y confirmar PUBLISHED. | Progreso de OutboxEntry. | Falla SQS sin revocar 202; conserva PENDING. |
| Adaptador programado | Reconocer EventBridge, consultar vencidos y llamar al entregador. | Ninguno adicional. | Un barrido fallido deja pendientes para el siguiente. |
| DynamoDB eventos | Registro aceptado, correlación y TTL. | TelemetryEvent durable. | Sin commit no hay 202 nuevo. |
| DynamoDB Outbox | Intención de alerta y reclamación condicional. | OutboxEntry durable. | Sin escritura conjunta no hay evento de batería baja confirmado. |
| SQS de alertas | Transporte al consumidor externo. | Copias físicas de mensajes. | Caída deja Outbox PENDING; duplicados conservan alertId. |
| API Gateway REST | Ruta, clave y consumo por productor. | Configuración de acceso. | Rechazo previo a Lambda. |
| EventBridge | Activación periódica de la misma Lambda. | Regla programada. | Fallo retrasa recuperación y genera alarma. |

La separación interna permite probar límites de validación, transacción y entrega sin dividir el despliegue. El fallo SQS queda desacoplado del éxito de persistencia; el fallo DynamoDB sí impide una nueva aceptación. El índice de vencidos es una vista de Outbox, no fuente de verdad: la condición en la tabla base arbitra reclamaciones. Todos los recursos se definen en CDK; Infrastructure Design asigna nombres, políticas, capacidad y alarmas.

## Calidad de entrega

NFR8.1 se aplica mediante pruebas unitarias posteriores a cada módulo comprobable y una prueba integrada con AWS simulado que recorre HTTP, transacción, alerta y recuperación programada. U3 incorpora Prettier, ESLint, tipos, pruebas, dependencias y secretos como barreras de CI antes de fusionar a main. Los límites de módulo permiten inyectar fallos sin añadir ejecutables ni recursos de producción.
