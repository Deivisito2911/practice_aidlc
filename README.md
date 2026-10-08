# Telemetría vehicular

Servicio TypeScript y AWS CDK para aceptar eventos vehiculares, persistirlos de forma idempotente y producir alertas de batería baja.

## Desarrollo

Requiere Node.js 22 y npm. Ejecute `npm ci`, `npm run typecheck`, `npm run test:unit -- src/telemetry`, `npm run test:integration -- tests/integration/telemetry-flow.test.ts`, `npx vitest run infra/telemetry-stack.test.ts`, `npm run lint`, `npm run format:check`, `npm run build` y `npm run cdk:synth`. `npm run audit:deps` comprueba dependencias de producción. La síntesis CDK usa `staging` por defecto; para producción, `npx cdk synth -c stage=production`.

## API

`POST /telemetry-events` requiere `x-api-key` de API Gateway. La cabecera opcional `X-Correlation-Id` se conserva o se genera. El cuerpo JSON requiere `eventId`, `vehicleId`, `eventType` (`battery`, `temperature`, `speed`), `timestamp` UTC ISO 8601 y `value` finito. Los rangos inclusivos son batería 0–100, temperatura −50–150 y velocidad 0–300. Se acepta un tiempo futuro de hasta cinco minutos. La API responde `202 {"status":"accepted","msg_id":"<correlationId>","acceptedAt":"<UTC>"}` solamente tras confirmación de SQS; no promete persistencia en ese momento. Errores de validación responden 400; publicación no confirmada, 503; API Gateway aplica acceso y cuota de 100 solicitudes/s, ráfaga 200, 5.000.000/día.

## Mensajes y persistencia

La cola de entrada lleva `{event,rawPayload,acceptedAt,correlationId}`; `rawPayload` conserva el cuerpo recibido exactamente. DynamoDB usa `eventId` como clave, hash canónico de los campos validados para idempotencia, y `expiresAt` Unix en segundos igual a `acceptedAt + 90 días`. Para `battery.value < 20`, la transacción crea evento y salida `PENDING` con `alertId` estable. El publicador consulta pendientes y envía `{alertId,eventId,vehicleId,alertType:"LOW_BATTERY",batteryValue,occurredAt}`; `correlationId` va como atributo SQS. Tras confirmación, cambia condicionalmente a `PUBLISHED`. La entrega física puede repetirse y el consumidor debe deduplicar por `alertId`.

## Despliegue y operación

`npx cdk deploy -c stage=staging` y `npx cdk deploy -c stage=production` crean recursos separados. Use credenciales temporales OIDC en CI. Producción requiere la aprobación manual del proceso de entrega. Las tablas y el depósito CloudTrail se retienen al retirar el stack. La DLQ recibe mensajes tras cinco fallos; la salida pendiente se barre cada minuto. Las alarmas iniciales cubren DLQ, edad de entrada y errores de ingreso. El destino operativo de alarmas y el panel se configurarán en observabilidad.

### Runbook de DLQ

1. Revisar profundidad, edad, `correlationId`, `eventId` y causa en logs sin volcar el payload ni secretos.
2. Identificar alcance, cantidad, velocidad y destino de redrive; verificar autorización del operador y confirmar el lote. `authorizeRedrive` valida esos datos para una herramienta de operación; el redrive operativo se ejecuta mediante AWS SQS con registro de resultados por lote.
3. Corregir causa raíz, repetir en lotes acotados y observar fallos parciales, pendientes y alerta. La escritura condicional evita reemplazar eventos y el `alertId` permite deduplicar.
4. Escalar conflictos de idempotencia: el primer evento gana y el mensaje conflictivo permanece fallido. No reescribir registros para vaciar la DLQ.

Los objetivos de p95 ≤500 ms a 100 solicitudes/s, ≥99 % persistidos en menos de 30 s y disponibilidad mensual ≥99,9 % requieren medición real de staging; las pruebas locales comprueban contratos y configuración, no esos resultados.
