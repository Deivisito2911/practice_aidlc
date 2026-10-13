# Instrucciones de pruebas de U1

## Runner y configuración
Vitest ya figura en `package.json` y `vitest.config.ts`. En Step 1 se comprobará que dependencias y configuración están instaladas y que los comandos siguientes resuelven los archivos; cualquier cambio mínimo del runner se realiza antes de escribir la primera prueba. Metodología test-after: implementar modelo, repositorio, servicio, handler e IaC, escribiendo y ejecutando las pruebas de cada capa inmediatamente después.

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
