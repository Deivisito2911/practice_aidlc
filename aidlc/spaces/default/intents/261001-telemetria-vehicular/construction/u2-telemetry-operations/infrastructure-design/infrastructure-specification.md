# Especificación de infraestructura — U2

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Compute model | AWS Lambda existente `TelemetryService`, Node.js 22/TypeScript, baseline 512 MiB y timeout 20 s. | C1–C5 exigen un único propietario y una sola Lambda. Ajustar tamaño con evidencia de carga, no crear función nueva. |
| Networking topology | API Gateway REST público TLS para productores; CLI administrativa invoca el ARN de Lambda con IAM desde el entorno corporativo. No introducir VPC/NAT sin dependencia privada que lo requiera. | La operación CLI no se expone en la API de productores; evitar costo/latencia de red innecesaria. |
| Storage strategy | Tablas DynamoDB evento y Outbox existentes, billing on-demand, KMS, PITR; TTL de eventos 90 días y GSI Outbox DueByShard existente. Añadir GSI TTL sharded para consultas de elegibles antiguos. | Mantiene propiedad/invariantes. El índice TTL soporta la alarma sin escanear toda la tabla. |
| Environments | Staging y producción conservan el stack por entorno y región AWS configurada. Topología igual; parámetros de capacidad, alarmas, IDs de rol y destino varían por entorno. | Paridad de forma, diferencias explícitas de configuración. Staging valida objetivos antes de promoción. |
| IaC approach | AWS CDK TypeScript dentro del stack actual; cambios revisables por PR y síntesis. Ninguna configuración manual para reproducir los recursos. | Práctica del proyecto y despliegue existente. |
| Resource sizing | Mantener Lambda 512 MiB/20 s; lote programado 25 y frecuencia 1 min. Preview/retry manual máximo 25 IDs por llamada, con timeout y presupuesto compartidos. API plan 100/s, burst 200, 5,000,000/día por clave. | Valores actuales comprobados en `infra/telemetry-stack.ts`; ajustar tras prueba mixta, no antes. |
| Cost estimate | Sin monto monetario fiable hasta fijar región, horas de uso, tráfico mensual, retención de logs y tasa de alertas. Estimar por entorno con Lambda GB-s/invocaciones, API Gateway solicitudes, DynamoDB lecturas/escrituras/GSI/PITR, SQS solicitudes, CloudWatch métricas/logs/alarma y KMS. El índice TTL es el principal costo incremental de U2; comparar con costo de escaneo antes de aprobar. | Las tasas y uso varían por región y perfil; el test staging de 15 min a 100 RPS produce 90,000 solicitudes por ejecución y queda bajo la cuota diaria de una clave. |

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| API Gateway REST | ingress | Mantener POST actual, API key/usage plan 100 RPS, burst 200 y cuota diaria 5M; habilitar métricas y logs de acceso sin cabecera de credencial. | No agregar ruta operacional. El proveedor aplica usage plan como best-effort. |
| Lambda `TelemetryService` | compute | Misma función para API, EventBridge y operación manual IAM; reconocer eventos separados por forma, usar timeout 20 s y máximo lote 25 como baseline. | El evento manual exige autorización y discriminador específico; no tratarlo como proxy HTTP. |
| DynamoDB Events | database | Tabla existente con TTL `expiresAt`, KMS, PITR y nueva GSI sharded `ttlShard` (PK) + `expiresAt` (SK), proyección mínima `eventId`, `expiresAt`. | `ttlShard` se deriva establemente del eventId y permite consultar elementos con expiración <= ahora−24 h por shards sin Scan. Migración compatible para filas existentes que carezcan del atributo; más abajo. |
| DynamoDB Outbox | database | Tabla existente, KMS/PITR/on-demand, índice DueByShard actual, reclamación condicional. | Manual y programado comparten consulta y transición PENDING/PUBLISHED. |
| SQS alerts | queue | Cola existente cifrada KMS, TLS, retención 14 días y visibilidad 60 s; publicar con mismo alertId. | No crear SQS de ingreso ni DLQ de ingreso. |
| EventBridge | scheduler | La regla actual cada minuto invoca la misma Lambda; el handler realiza la consulta TTL una vez por hora y en un ciclo de calendario determinista, sin agregar regla/función. | Evitar invocaciones adicionales; el handler separa scheduled recovery de TTL measurement. |
| CloudWatch | observability | Métricas de servicio/operación; alarmas de NFR7.8–NFR7.9; dashboard por entorno; logs existentes con retención 90 días. | No incluir IDs de evento como dimensions; alarmas envían a destino de guardia importado por ARN. |
| CloudTrail + S3 Object Lock | audit | Trail multi-región ya existente, KMS, Object Lock compliance 90 días y bucket retenido. | Registrar invocaciones Lambda administrativas; preservar controles U1/U3. |
| IAM | authorization | Rol P3 existente (ARN de entorno) obtiene `lambda:InvokeFunction` solo sobre función exacta; rol Lambda consulta índices, hace escrituras condicionales de Outbox y backfill TTL acotado en Events, envía SQS, publica métricas/logs; KMS solo en clave de servicio. | Ningún permiso de lectura/escritura directo en tablas para CLI. Infraestructura comprueba principals y políticas negativas. |

## Migración de índice TTL

La GSI sharded aplica a eventos nuevos y a existentes. Antes de activar la consulta, la misma Lambda ejecuta una operación administrativa de backfill por lotes limitados e idempotentes para escribir `ttlShard` en eventos vigentes mediante condición; el backfill no cambia campos contractuales ni `expiresAt`. El valor de shard es estable por eventId. Consultar cada shard por `expiresAt <= ahora−24 h` y publicar únicamente el conteo agregado. Dimensionar shards y ritmo del backfill en staging, observar throttling y pausar al detectar impacto en ingesta. No usar Scan recurrente ni exponer registros individuales en métricas. La alerta TTL no se habilita como señal completa hasta completar el backfill.

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| Lambda TelemetryService, tablas evento/Outbox, cola alerts, regla EventBridge, KMS, CloudTrail y alarmas de servicio | U1 | U2, U3 | TelemetryService es único propietario de escrituras; U2 extiende compatiblemente. U3 despliega y audita sin cambiar semántica. |
| Rol P3 de operación y tópico/canal de guardia por entorno | Plataforma AWS existente | U2 | ARN y permisos configurados desde el entorno; CLI invoca función por IAM, no accede a tablas/SQS. |

## Justificación de decisiones

La GSI de TTL agrega costo de escritura/almacenamiento, pero evita escaneo periódico de toda la tabla y hace posible medir la acumulación elegible con consulta acotada. El backfill debe completar antes de declarar válida esa alarma. Los recursos y cambios permanecen en el stack actual y no cambian contratos externos ni crean propietarios nuevos.

## Fuentes

`nfr-design/performance-design.md`, `nfr-design/security-design.md`, `nfr-design/scalability-design.md`, `nfr-design/reliability-design.md`, `nfr-design/observability-design.md`, `nfr-design/logical-components.md`, `inception/domain-design/components.md`, `functional-design/functional-spec.md` e `inception/contract-design/contract-summary.md`.
