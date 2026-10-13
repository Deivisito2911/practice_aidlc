# Telemetría vehicular

Servicio Node.js 22 desplegado con AWS CDK. API Gateway REST y EventBridge invocan la misma Lambda. La Lambda valida telemetría, guarda evento y Outbox de manera transaccional, y publica alertas de batería baja en una única cola SQS.

## Desarrollo y verificación

Requiere Node.js 22 y npm. Instale con `npm ci`. Los comandos principales son `npm run typecheck`, `npm run test:unit`, `npm run test:integration -- tests/integration/telemetry-flow.test.ts`, `npm run lint`, `npm run format:check`, `npm run build` y `npm run cdk:synth`. `npm run audit:deps` revisa dependencias de producción. La síntesis usa `staging` por defecto; para producción ejecute `npm run cdk:synth -- -c stage=production`.

## API

`POST /telemetry-events` requiere una API key válida de API Gateway. El encabezado opcional `X-Correlation-Id` se conserva cuando cumple `^[A-Za-z0-9._:-]{1,128}$`; en otro caso se genera un UUID. El cuerpo debe contener exactamente cinco campos: `eventId`, `vehicleId`, `eventType`, `timestamp` y `value`. Los identificadores usan de 1 a 128 caracteres ASCII de letras, dígitos, punto, guion bajo, dos puntos o guion. `eventType` es `battery`, `temperature` o `speed`; los rangos inclusivos son 0–100, −50–150 y 0–300 respectivamente. `timestamp` debe ser UTC ISO 8601 y no superar cinco minutos en el futuro.

Una solicitud válida nueva devuelve `202` con `{ "status": "accepted", "eventId": "…", "acceptedAt": "…Z", "correlationId": "…" }` solo después de confirmar la escritura durable. Un eventId repetido con el mismo contenido devuelve la respuesta original; si el contenido canónico difiere, responde `409 IDEMPOTENCY_CONFLICT`. Validación responde `400 VALIDATION_ERROR`; si no se puede comprobar una escritura, responde `503 PERSISTENCE_UNAVAILABLE`. El intento inmediato de alerta sucede después del commit y tiene un presupuesto máximo de 150 ms. Su fallo no revoca el `202`: la alerta permanece en Outbox para recuperación.

## Persistencia y alertas

DynamoDB conserva eventos con `eventId`, hash canónico y TTL de 90 días calculado desde `acceptedAt`. Para `eventType=battery` y `value < 20`, una transacción condicional también crea una salida Outbox `PENDING`; `value=20` no alerta. La salida incluye sus propios `vehicleId` y `correlationId`, `createdAt`, `alertId=LOW_BATTERY:{eventId}`, contador de intentos y atributos de recuperación, así que no depende de que el TTL del evento siga presente.

La cola SQS solo transporta alertas. Cada mensaje tiene `alertId`, `eventId`, `vehicleId`, `alertType`, `batteryValue` y `occurredAt`; `correlationId` viaja como atributo SQS. Se marca `PUBLISHED` después de confirmación SQS y con el token de reclamación vigente. Un resultado incierto puede repetir la entrega física con el mismo alertId; el consumidor debe deduplicar por esa identidad.

EventBridge ejecuta la misma Lambda cada minuto. La recuperación consulta el GSI `DueByShard`, reparte el trabajo en 16 particiones, reclama salidas con un lease de 30 segundos, procesa hasta 25 por invocación y respeta el tiempo restante. Los fallos se difieren con retroceso de 1 a 15 minutos y jitter. Los valores iniciales se pasan mediante `ALERT_SEND_BUDGET_MS`, `OUTBOX_BATCH_SIZE`, `OUTBOX_LEASE_SECONDS` y `OUTBOX_MAX_BACKOFF_MINUTES`.

## Despliegue y operación

Ejecute `npx cdk deploy -c stage=staging` o `npx cdk deploy -c stage=production`. Cada entorno incluye una Lambda de 512 MiB y timeout de 20 segundos, API REST, regla EventBridge, dos tablas DynamoDB con cifrado KMS/PITR, la cola SQS de alertas, CloudTrail y alarmas base. El rol Lambda limita las acciones de DynamoDB a las tablas e índice requeridos. Las tablas, el log group y el bucket CloudTrail se retienen al eliminar el stack.

No registre API keys, cuerpos crudos ni secretos. Los logs de fallos incluyen la operación, clase de error, eventId cuando existe y correlationId. Los objetivos de p95 ≤500 ms a 100 solicitudes/s y disponibilidad mensual ≥99,9 % requieren medición en staging; las pruebas locales no demuestran esos SLO.

### Recuperación operativa Outbox y migración TTL

La CLI `bin/telemetry-operations.ts` invoca de forma síncrona el ARN de la Lambda existente; necesita credenciales AWS IAM con `lambda:InvokeFunction` solo sobre ese ARN y `TELEMETRY_FUNCTION_ARN`. Despliegue el rol P3 con `TELEMETRY_OPERATOR_ROLE_ARN` (o contexto CDK `operatorRoleArn`); `TELEMETRY_ALARM_TOPIC_ARN` (o `alarmTopicArn`) conecta alarmas al canal del entorno. La CLI no recibe acceso DynamoDB o SQS.

`npx tsx bin/telemetry-operations.ts preview --limit 25` muestra el alcance `due-pending`, IDs, cantidad, límite y huella SHA-256 sin payload. `npx tsx bin/telemetry-operations.ts execute --limit 25` vuelve a consultar la vista previa y exige escribir `EXECUTE <huella>` para procesar ese conjunto; cada envío reutiliza el alertId y la reclamación condicional normal. Una ejecución parcial informa confirmados/fallidos/pendientes y mantiene los no confirmados en `PENDING`. `npx tsx bin/telemetry-operations.ts backfill` requiere confirmación `BACKFILL` y migra lotes de hasta 25 elementos; solo añade el shard TTL derivado de eventId si sigue ausente y conserva `expiresAt`. Ejecute y observe el backfill en staging antes de habilitar la alarma TTL en producción; se puede pausar entre lotes y reanudar consultando la página siguiente.
