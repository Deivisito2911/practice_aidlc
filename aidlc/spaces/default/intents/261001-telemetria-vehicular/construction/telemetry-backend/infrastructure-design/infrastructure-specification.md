# Especificación de infraestructura — telemetry-backend

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Modelo de cómputo | API Gateway REST, Lambda de ingreso, Lambda procesadora y Lambda publicadora. | La validación de rangos y reloj necesita lógica antes de SQS; las tareas asíncronas no bloquean el HTTP. |
| Red | Entrada pública solo por API Gateway con clave API; Lambdas fuera de VPC salvo que una política de cuenta exija lo contrario. | SQS y DynamoDB son servicios gestionados; no se requiere red privada propia para el flujo acordado. TLS en todas las llamadas. |
| Almacenamiento | Tabla de eventos con PK eventId y TTL expiresAt; tabla de salidas con PK alertId y un índice para PENDING por próximo intento. | Conserva rawPayload y permite transacción evento/salida, recuperación y consultas acotadas del publicador. |
| Entornos | Misma definición CDK para staging y producción; parámetros de escala, nombres y claves separados. | Paridad de topología sin compartir datos ni permisos. |
| IaC | TypeScript con AWS CDK y comprobaciones de síntesis. | Práctica afirmada y despliegue repetible. |
| Capacidad | DynamoDB bajo demanda inicialmente; SQS estándar de entrada y salida; límites Lambda y cuotas parametrizados tras prueba de 100 solicitudes/s. | Evita afirmar un pronóstico de uso; se mide p95 y tiempo de procesamiento antes de fijar capacidad. |
| Recuperación | DLQ de entrada con maxReceiveCount=5; salida PENDING recuperable por sondeo programado además del disparo inmediato. | Una publicación incierta o interrumpida no pierde la alerta lógica. |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| API Gateway REST | Ingreso | POST /telemetry-events, clave API, 100 solicitudes/s, ráfaga 200, cuota 5.000.000/día por clave. | Solo invoca Lambda de ingreso; rutas distintas no publican. |
| Lambda de ingreso | Validación y encolado | Comprueba campos, rangos, UTC y futuro máximo; fija acceptedAt/correlationId y espera confirmación de SendMessage. | 202 solo tras confirmación; respuesta JSON con status, msg_id y acceptedAt. |
| SQS de entrada | Cola | Estándar, cifrada KMS, DLQ y maxReceiveCount=5; visibilidad y lote calibrados contra timeout Lambda. | Mensajes con rawPayload y metadatos separados. |
| Lambda procesadora | Consumo | Respuesta parcial de lote y escritura condicional/transaccional. | Idempotencia global por eventId; no publica alerta antes de la transacción. |
| DynamoDB eventos | Base de datos | PK eventId, KMS, TTL expiresAt, recuperación puntual. | Conserva rawPayload, acceptedAt y campos validados. |
| DynamoDB salidas | Base de datos | PK alertId, KMS, índice de PENDING/próximo intento, recuperación puntual. | TransactWrite con el evento; estado PENDING/PUBLISHED. |
| Lambda publicadora | Salida recuperable | Disparo por cambio de salida y barrido programado de pendientes; actualización condicional tras confirmación. | Reintentos usan el mismo alertId. |
| SQS de alertas | Cola | Estándar, KMS, atributo correlationId. | Consumidor deduplica por alertId; no se promete entrega física única. |
| CloudTrail | Auditoría | Eventos de administración de servicios requeridos, cifrado KMS, retención ≥90 días y protección de borrado. | Separar permisos de aplicación y auditoría. |
| CloudWatch | Observabilidad | Logs, métricas, alarmas y panel para API, colas, Lambdas, tablas y salidas. | No registrar rawPayload ni x-api-key. |

## Límite compartido

Solo hay una unidad de trabajo; no hay recursos entre unidades que exijan una tabla de propietarios compartidos. Las dos tablas se mantienen bajo la propiedad de telemetry-backend.
