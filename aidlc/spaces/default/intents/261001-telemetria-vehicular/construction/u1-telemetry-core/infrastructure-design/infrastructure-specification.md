# Especificación de infraestructura — U1

## Deployment

| Facet | Choice | Rationale |
|---|---|---|
| Modelo de cómputo | Una Lambda TypeScript con dos adaptadores de entrada: API Gateway REST y regla EventBridge. | Mantiene validación, transacción, publicación y recuperación dentro del mismo despliegue. |
| Ingreso y salida | POST /telemetry-events en API Gateway REST; llamadas TLS a DynamoDB y SQS de alertas. Sin SQS ni DLQ de ingreso. | Validación y 400 síncronos; Outbox absorbe fallo de publicación. |
| Red | Endpoint público gestionado de API Gateway. Lambda sin VPC dedicada inicialmente; acceso a servicios AWS mediante endpoints gestionados y TLS. | Evita NAT y latencia/coste sin un requisito de red privada. Si política de cuenta exige VPC, se parametriza y se vuelve a medir p95. |
| Almacenamiento | Tabla TelemetryEvent por eventId con TTL expiresAt; tabla OutboxEntry por alertId, índice disperso de PENDING por dueShard y nextAttemptAt. | Condición fuerte en tabla base; consulta acotada de vencidos. |
| Entornos | Misma definición CDK en dev, staging y producción; cuenta y región suministradas por contexto de despliegue. | Paridad de topología; staging mide NFR. Cuenta y permisos aún por confirmar. |
| IaC | AWS CDK v2 en TypeScript; parámetros por entorno, sin IDs de cuenta ni secretos en código. | Reproducibilidad y prácticas afirmadas. |
| Tamaño inicial | DynamoDB bajo demanda; memoria Lambda inicial 512 MiB y timeout 20 s, sujetos a prueba de carga. Sin reserva fija de concurrencia hasta medir cuota de cuenta. | Arranque medible sin asumir capacidad AWS disponible; 100 solicitudes válidas/s y p95 ≤500 ms son gates de staging. |
| Publicación HTTP | Presupuesto inicial máximo de 150 ms para intento SQS tras commit, configurable; el timeout deja PENDING y no cambia el 202. | Limita la parte opcional de la latencia; ajuste final por prueba real. |
| Recuperación | EventBridge cada minuto; hasta 25 PENDING vencidos por invocación; 16 dueShard configurables, consulta paginada y tiempo restante protegido. | Trabajo acotado con reintento periódico; ningún barrido completo. |
| Arrendamiento | claimToken condicional y leaseUntil inicial 30 s; nextAttemptAt durante posesión = leaseUntil. Fallo confirmado programa retroceso exponencial con dispersión, inicial 1 min y tope 15 min. | Recuperación de caídas; el mismo alertId en reenvíos. Configuración ajustable. |
| Reversión | Publicar versión Lambda anterior compatible; conservar tablas, claves KMS y todo PENDING; revertir CDK sin destruir datos. | La reversión no pierde alertas. |

La configuración inicial no afirma que se cumpla p95 o disponibilidad: son hipótesis para validar en staging. El plazo SQS de 150 ms es un máximo operativo inicial, no un plazo de entrega al consumidor. La salida pendiente conserva vehicleId y correlationId para publicar aunque TTL elimine el evento.

## Infrastructure Services

| Service | Role | Configuration | Notes |
|---|---|---|---|
| API Gateway REST | ingreso | Ruta POST /telemetry-events con x-api-key requerido; plan por clave 100/s, ráfaga 200, cuota 5.000.000/día. | AWS aplica cuota/tasa de forma aproximada; rechazos previos a Lambda. |
| Lambda TelemetryService | cómputo | Un artefacto, dos disparadores, timeout inicial 20 s, memoria inicial 512 MiB; variables de entorno con nombres de tablas, cola y parámetros de recuperación. | No guardar credenciales persistentes ni secretos en variables. |
| DynamoDB TelemetryEvent | base de datos | PK eventId, KMS, TTL expiresAt, recuperación puntual y política de retención en borrado de pila. | Transacción condicional con Outbox para batería baja. |
| DynamoDB OutboxEntry | base de datos | PK alertId; GSI disperso solo para PENDING, PK dueShard, SK nextAttemptAt con desempate estable; KMS y recuperación puntual. | Consulta de 16 shards y paginación; condición de claim en tabla base. PENDING no tiene TTL de evento. |
| SQS battery-alerts | cola | Cola estándar cifrada KMS; política TLS y SendMessage solo desde rol Lambda. | Única cola del flujo; no hay consumidor propio en U1 ni DLQ de ingreso. |
| EventBridge scheduled rule | programación | Frecuencia inicial 1 minuto; invoca la misma Lambda con evento programado distinguible. | Permiso de invocación específico; fallos se alarman. |
| CloudWatch Logs/Metrics/Alarms | observabilidad | Logs estructurados con retención parametrizada, métricas de HTTP, Outbox, SQS y regla; alarmas base en monitoring-design.md. | Sin cuerpo crudo ni claves API. |
| KMS | cifrado | Claves administradas con políticas mínimas para tablas, SQS, trail y logs donde se requiera. | Separar acceso de aplicación y administración. |
| CloudTrail + almacenamiento | auditoría | Trail de eventos de administración verificable, logs KMS y retención ≥90 días; usar trail organizacional comprobado o crear uno gestionado por la pila. | Roles de aplicación no pueden borrar trail ni logs; U3 verifica identidad y protección. |

## Shared Infrastructure

| Shared Resource | Owner Unit | Consumer Units | Access Boundary |
|---|---|---|---|
| Una Lambda y CDK base | U1 | U2, U3 | U2 amplía el mismo artefacto; U3 lo entrega, sin otra Lambda. |
| Tablas TelemetryEvent y OutboxEntry | U1 | U2 | U1 mantiene el esquema; U2 añade observabilidad/operación compatible. |
| SQS de alertas y regla EventBridge | U1 | U2 | Solo rol TelemetryService publica y recupera; consumidor externo deduplica. |
| CloudTrail y claves KMS base | U1 | U3 | U3 verifica protección y permisos OIDC; rol de aplicación sin administración. |

## Dependencias previas al despliegue

La cuenta, región, cuotas de Lambda y DynamoDB, permisos CDK/KMS/CloudTrail y rol OIDC no están confirmados. CDK puede sintetizarse y probarse localmente; desplegar staging requiere cuenta preparada. No se afirma que U1 esté desplegada hasta obtener evidencia de la cuenta y una prueba integrada real.
