# Instrucciones de pruebas de U1

## Runner y configuración
Vitest ya figura en `package.json` y `vitest.config.ts`. En Step 1 se comprobará que dependencias y configuración están instaladas y que los comandos siguientes resuelven los archivos. Este intento conserva la implementación U1: inspecciona cada capa existente y después ejecuta sus pruebas, conforme a test-after. No modifica el runner, las pruebas ni la aplicación; cualquier defecto adicional del núcleo requiere revisar el plan. Los defectos F1–F7 ya registrados se corrigen mediante los planes U2/U3.

## Comandos exactos de U1
- Modelo: `npm exec -- vitest run src/telemetry/model.test.ts`
- Acceso a datos: `npm exec -- vitest run src/telemetry/adapters.test.ts`
- Lógica: `npm exec -- vitest run src/telemetry/service.test.ts`
- Handler: `npm exec -- vitest run src/telemetry/handlers.test.ts`
- CDK: `npm exec -- vitest run infra/telemetry-stack.test.ts`
- Todos los archivos unitarios de U1: `npm exec -- vitest run src/telemetry/model.test.ts src/telemetry/adapters.test.ts src/telemetry/service.test.ts src/telemetry/handlers.test.ts infra/telemetry-stack.test.ts`
- Integración crítica aprobada para esta unidad: `npm run test:integration -- tests/integration/telemetry-flow.test.ts`

## Cobertura esperada
Estrategia Minimal: al menos una prueba verificable por requisito al nivel más estrecho efectivo y un caso feliz unitario por componente; aproximadamente 5–15 pruebas unitarias nuevas o ajustadas en U1. Cubrir expresamente validación/HTTP, transacción, idempotencia, batería `< 20`, reclamación condicional, publicación y recuperación PENDING. La suite existente debe seguir verde. No hay porcentaje numérico de cobertura afirmado. La integración AWS simulada debe cubrir ambas formas de invocar la misma Lambda y los fallos críticos.

## Dobles y datos de prueba
Usar clientes AWS inyectables o dobles que modelen condiciones y atomicidad de DynamoDB, respuesta `MessageId`/fallo de SQS y evento EventBridge con `source` y `detail-type` reales; no contactar AWS en pruebas unitarias. Reloj y UUID inyectables para carreras, expiración de lease, TTL y backoff. Crear fixtures por prueba con eventId/correlationId exclusivos y restablecer tablas/colas simuladas tras cada caso. Comprobar estado durable y ausencia de efectos, no solo códigos HTTP. Un consumidor contractual de prueba elimina duplicados lógicos por alertId.
