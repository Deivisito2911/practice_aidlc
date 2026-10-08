# Especificación de infraestructura — telemetry-backend

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Modelo de cómputo | API Gateway REST integrado con una única Lambda de telemetría. | La misma función valida BVA en la solicitud HTTP, persiste el evento y recupera/publica salidas PENDING. No hay Lambdas de ingreso ni publicación separadas. |
| Red y límite de confianza | API Gateway público con clave API → Lambda única → DynamoDB evento/salida → SQS de alertas. La Lambda queda fuera de VPC salvo exigencia de cuenta. | BVA sucede antes de cualquier escritura o publicación; un evento inválido recibe 400 y no llega a DynamoDB ni a SQS. TLS en todas las llamadas. |
| Almacenamiento | Tabla de eventos con PK eventId y TTL expiresAt; tabla de salidas con PK alertId y un índice para PENDING por próximo intento. | Conserva rawPayload y permite transacción evento/salida, recuperación y consultas acotadas del publicador. |
| Entornos | Misma definición CDK para staging y producción; parámetros de escala, nombres y claves separados. | Paridad de topología sin compartir datos ni permisos. |
| IaC | TypeScript con AWS CDK y comprobaciones de síntesis. | Práctica afirmada y despliegue repetible. |
| Capacidad | DynamoDB bajo demanda inicialmente; solo SQS estándar de alertas. Parametrizar por entorno concurrencia y timeout de la Lambda, cuota de API y frecuencia del barrido. | La prueba sostenida de 100 solicitudes válidas/s debe medir p95 ≤500 ms incluyendo BVA y persistencia. Comprobar cuotas de API Gateway, Lambda, DynamoDB y KMS antes de producción. |
| Recuperación | Evento y salida PENDING se escriben atómicamente; EventBridge invoca periódicamente la misma Lambda para recorrer pendientes. | Una publicación incierta conserva PENDING y el barrido usa el mismo `alertId`. No existe cola de entrada ni DLQ de ingreso. |
| Acceso de operadores | Roles separados para aplicación, despliegue y auditoría; consulta y reintento de outbox con autorización. | La aplicación no administra CloudTrail; IAM restringe acciones y ARN de DynamoDB, SQS de alertas y KMS. |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| API Gateway REST | Ingreso | POST /telemetry-events invoca la única Lambda; clave API, 100 solicitudes/s, ráfaga 200, cuota 5.000.000/día por clave. | La respuesta 400 de BVA sale antes de persistir. Conservar el cuerpo 202 para válidos, ahora después de confirmar DynamoDB. Distribuir y rotar la clave por un canal de secretos. |
| Lambda única de telemetría | Validación, persistencia y salida | En HTTP valida campos, rangos y reloj; usa `eventId` como clave idempotente; escribe evento y salida PENDING atómicamente cuando corresponde. EventBridge invoca la misma función para drenar PENDING. | Un único despliegue y rol IAM. BVA inválida produce 400 sin escritura ni SQS; un fallo DynamoDB no devuelve 202. |
| DynamoDB eventos | Base de datos | PK eventId, KMS, TTL expiresAt, recuperación puntual. | Conserva rawPayload, acceptedAt y campos validados. |
| DynamoDB salidas | Base de datos | PK alertId, KMS, índice de PENDING/próximo intento, recuperación puntual. | TransactWrite con el evento; estado PENDING/PUBLISHED. |
| EventBridge | Recuperación de outbox | Regla periódica que invoca la misma Lambda para leer PENDING vencidas. | Cierra el caso de fallo tras persistir y antes de publicar, sin otro componente de cómputo. |
| SQS de alertas | Cola | Estándar, KMS, atributo correlationId. | Consumidor deduplica por alertId; no se promete entrega física única. |
| CloudTrail | Auditoría | Eventos de administración de servicios requeridos, cifrado KMS, retención ≥90 días y protección de borrado. | Separar permisos de aplicación y auditoría. |
| CloudWatch y SNS | Observabilidad | Logs, métricas, alarmas y panel para API, Lambda única, tablas, outbox y SQS de alertas; tema SNS para la guardia operativa. | Separar rechazo 400, error de persistencia y publicación de alertas. No registrar rawPayload ni x-api-key. |

## Límite compartido

Solo hay una unidad de trabajo; no hay recursos entre unidades que exijan una tabla de propietarios compartidos. Las dos tablas se mantienen bajo la propiedad de telemetry-backend.

## Contratos que requieren reconciliación

El 400 síncrono de BVA y la prohibición de encolar inválidos se conservan. Para eventos válidos se conserva el código y cuerpo 202, pero ahora significa que DynamoDB confirmó la persistencia, no que una SQS de entrada aceptó el mensaje. FR1.6, FR3.1, FR6.1, NFR1.2, NFR2.3, NFR7.1, NFR9.3, el contrato HTTP y el ADR-001 anterior aún describen la cola de entrada; deben reconciliarse con esta decisión humana antes de declarar trazabilidad completa. El CDK y la prueba integrada actuales despliegan y ejercitan tres Lambdas: deben refactorizarse en la siguiente fase de codificación.
