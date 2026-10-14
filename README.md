# Telemetría vehicular

Servicio Node.js 22 desplegado con AWS CDK. API Gateway REST y EventBridge invocan la misma Lambda. La Lambda valida telemetría, guarda evento y Outbox de manera transaccional, y publica alertas de batería baja en una única cola SQS.

## Desarrollo y verificación

Requiere Node.js 22 y npm. Instale con `npm ci`. Los comandos principales son `npm run typecheck`, `npm run test:unit`, `npm run test:integration -- tests/integration/telemetry-flow.test.ts`, `npm run lint`, `npm run format:check`, `npm run build`, `npm run cdk:synth` y `npm run cdk:synth:audit`. `npm run audit:deps` revisa dependencias de producción. La síntesis de aplicación usa `staging` por defecto; para producción ejecute `npm run cdk:synth -- -c stage=production`.

## API

`POST /telemetry-events` requiere una API key válida de API Gateway. El encabezado opcional `X-Correlation-Id` se conserva cuando cumple `^[A-Za-z0-9._:-]{1,128}$`; en otro caso se genera un UUID. El cuerpo debe contener exactamente cinco campos: `eventId`, `vehicleId`, `eventType`, `timestamp` y `value`. Los identificadores usan de 1 a 128 caracteres ASCII de letras, dígitos, punto, guion bajo, dos puntos o guion. `eventType` es `battery`, `temperature` o `speed`; los rangos inclusivos son 0–100, −50–150 y 0–300 respectivamente. `timestamp` debe ser UTC ISO 8601 y no superar cinco minutos en el futuro.

Una solicitud válida nueva devuelve `202` con `{ "status": "accepted", "eventId": "…", "acceptedAt": "…Z", "correlationId": "…" }` solo después de confirmar la escritura durable. Un eventId repetido con el mismo contenido devuelve la respuesta original; si el contenido canónico difiere, responde `409 IDEMPOTENCY_CONFLICT`. Validación responde `400 VALIDATION_ERROR`; si no se puede comprobar una escritura, responde `503 PERSISTENCE_UNAVAILABLE`. El intento inmediato de alerta sucede después del commit y tiene un presupuesto máximo de 150 ms. Su fallo no revoca el `202`: la alerta permanece en Outbox para recuperación.

## Persistencia y alertas

DynamoDB conserva eventos con `eventId`, hash canónico y TTL de 90 días calculado desde `acceptedAt`. Para `eventType=battery` y `value < 20`, una transacción condicional también crea una salida Outbox `PENDING`; `value=20` no alerta. La salida incluye sus propios `vehicleId` y `correlationId`, `createdAt`, `alertId=LOW_BATTERY:{eventId}`, contador de intentos y atributos de recuperación, así que no depende de que el TTL del evento siga presente.

La cola SQS solo transporta alertas. Cada mensaje tiene `alertId`, `eventId`, `vehicleId`, `alertType`, `batteryValue` y `occurredAt`; `correlationId` viaja como atributo SQS. Se marca `PUBLISHED` después de confirmación SQS y con el token de reclamación vigente. Un resultado incierto puede repetir la entrega física con el mismo alertId; el consumidor debe deduplicar por esa identidad.

EventBridge ejecuta la misma Lambda cada minuto. La recuperación consulta el GSI `DueByShard`, reparte el trabajo en 16 particiones, reclama salidas con un lease de 30 segundos, procesa hasta 25 por invocación y respeta el tiempo restante. Los fallos se difieren con retroceso de 1 a 15 minutos y jitter. Los valores iniciales se pasan mediante `ALERT_SEND_BUDGET_MS`, `OUTBOX_BATCH_SIZE`, `OUTBOX_LEASE_SECONDS` y `OUTBOX_MAX_BACKOFF_MINUTES`.

## Despliegue y operación

Los stacks `Telemetry-staging` y `Telemetry-production` contienen cada uno una Lambda de 512 MiB y timeout de 20 segundos, API REST, regla EventBridge, dos tablas DynamoDB con cifrado KMS/PITR, cola SQS de alertas y alarmas base. El rol Lambda limita las acciones de DynamoDB a las tablas e índices requeridos. El stack independiente `TelemetryAudit`, administrado por auditoría una sola vez por cuenta, contiene CloudTrail, clave KMS y bucket con Object Lock. Las tablas, el log group y los recursos de auditoría tienen retención al eliminar el stack. Antes de desplegar la aplicación se requieren el trail activo, un tema SNS de guardia y roles de despliegue OIDC separados y verificados; consulte el registro de Environment Provisioning.

No registre API keys, cuerpos crudos ni secretos. Los logs de fallos incluyen la operación, clase de error, eventId cuando existe y correlationId. Los objetivos de p95 ≤500 ms a 100 solicitudes/s y disponibilidad mensual ≥99,9 % requieren medición en staging; las pruebas locales no demuestran esos SLO.

### Recuperación operativa Outbox y migración TTL

La CLI `bin/telemetry-operations.ts` invoca de forma síncrona el ARN de la Lambda existente; necesita credenciales AWS IAM con `lambda:InvokeFunction` solo sobre ese ARN y `TELEMETRY_FUNCTION_ARN`. Despliegue el rol P3 con `TELEMETRY_OPERATOR_ROLE_ARN` (o contexto CDK `operatorRoleArn`); `TELEMETRY_ALARM_TOPIC_ARN` (o `alarmTopicArn`) conecta alarmas al canal del entorno. La CLI no recibe acceso DynamoDB o SQS.

`npx tsx bin/telemetry-operations.ts preview --limit 25` muestra el alcance `due-pending`, IDs, cantidad, límite y huella SHA-256 sin payload. `npx tsx bin/telemetry-operations.ts execute --limit 25` vuelve a consultar la vista previa y exige escribir `EXECUTE <huella>` para procesar ese conjunto; cada envío reutiliza el alertId y la reclamación condicional normal. Una ejecución parcial informa confirmados/fallidos/pendientes y mantiene los no confirmados en `PENDING`. `npx tsx bin/telemetry-operations.ts backfill` requiere confirmación `BACKFILL` y migra lotes de hasta 25 elementos; solo añade el shard TTL derivado de eventId si sigue ausente y conserva `expiresAt`. Ejecute y observe el backfill en staging antes de habilitar la alarma TTL en producción; se puede pausar entre lotes y reanudar consultando la página siguiente.

### Vista previa autenticada y presupuesto

La vista previa v1 incluye previewId, alcance, IDs ordenados únicos, límite 1–25, issuedAt/expiresAt del servidor y keyId configurado. El SHA-256 canónico de estos campos (32 bytes) se autentica con KMS HMAC_256/HMAC_SHA_256. El MAC nunca se imprime ni se exporta la clave. La ejecución reenvía el sobre original intacto y confirma su digest: no renueva tiempos ni firma. Vence exactamente a los 300 segundos; cada campo alterado o KMS no disponible impide efectos. Una repetición solo omite IDs cuya salida está comprobada como PUBLISHED; candidatos nuevos requieren otra preview.

Cada invocación limita su trabajo a min(18 s, tiempo de Context menos 2 s de reserva), con un único presupuesto compartido para consulta, MAC, reclamación y publicación. AbortSignal cancela llamadas SDK cuando es posible. Una respuesta perdida sigue siendo incierta: conserva PENDING/lease hasta recuperación y no se presenta como envío rechazado ni confirmado. Antes de cada acción se verifica el presupuesto; no se reclaman candidatos nuevos al agotarlo. El resultado informa confirmed, failed (incluidos inciertos), skipped y unprocessed, cuya suma es count; pending es una observación separada. La CLI muestra estado parcial y no afirma entrega externa.

La CLI conserva invokeRequestId del API y invocationRequestId (awsRequestId) de Lambda como IDs distintos. El rol efectivo se consulta en CloudTrail Invoke habilitado solo para la función; actor del payload no autoriza. El enlace real de identidad/IDs queda por verificar en staging. No se ejecuta la CLI real durante pruebas locales.

### Señales, calendario y límites

EMF, alarmas y widgets usan VehicleTelemetry/Service=TelemetryService, Count para cantidades y Seconds para edad/duración. Se clasifican commits, SQS, reclamación, marcado y HTTP 202/400/409/5xx. El tiempo recepción-a-commit se registra solo con confirmación durable y reloj válido; una medición negativa/no finita se invalida. Los conteos/edades truncados de Outbox y TTL son límites inferiores, nunca una prueba de ausencia de acumulación. TTL consulta TtlByShard con expiresAt estrictamente menor que ahora menos 24 h; KEYS_ONLY basta para eventId. Backfill no cambia expiresAt ni recrea filas eliminadas.

La alarma de error usa >=1 % sobre >=100 solicitudes elegibles; 4xx/cuotas no entran en ese denominador, pero conservan su conteo. HttpQuotaRejected en Lambda no observa los rechazos que API Gateway hace antes de invocarla: se muestran también Count/4XXError nativos y su separación efectiva por cuota requiere logs/datos reales. El dashboard explica los denominadores y marca falta de datos como no demostrados. calculateAvailability usa todos los minutos UTC del mes, incluido mantenimiento; observaciones ausentes producen resultado incompleto, no cumplimiento. Las pruebas sintéticas no acreditan un mes real, p95 ni capacidad staging.

### Claves, reversión y coste por entorno

RECOVERY_MAC_KEY_ID y RECOVERY_MAC_ALLOWED_KEYS fijan claves permitidas; RECOVERY_PREVIEW_TTL_SECONDS=300 y RECOVERY_MAX_EXECUTION_MS=18000 son valores iniciales. La clave MAC se retiene y no usa rotación automática: al reemplazarla manualmente, emitir previews con la nueva y conservar la anterior solo durante los 300 s máximos de vigencia; retirar después su autorización. P3 tiene únicamente InvokeFunction sobre la función; Lambda GenerateMac/VerifyMac sobre la clave exacta y GetItem/Query/escrituras condicionales sobre recursos exactos. OperationsAlarmTopicArn exige el canal de guardia cuando no se suministra por contexto.

Revertir una versión compatible de Lambda/CDK sin destruir tablas, PENDING, auditoría ni claves vigentes; una CLI antigua no debe ejecutar silenciosamente el sobre v1 nuevo. Tras reversión, obtener una nueva preview y comprobar recuperación programada. Revisar el diff CDK antes de desplegar; estas comprobaciones no ejecutan despliegues.

Por staging/producción se añade una clave HMAC, llamadas GenerateMac/VerifyMac, eventos de datos Invoke, GSI TTL y dashboard/métricas. El coste es tarifa regional de clave + operaciones MAC + eventos Invoke + capacidad/almacenamiento del índice + observabilidad. No hay cifra fiable sin región, volumen y retención reales. La corrección local no provisiona recursos. F1 (advisory CDK) permanece bajo U3 hasta resolver y comprobar auditoría, sin excepciones.
