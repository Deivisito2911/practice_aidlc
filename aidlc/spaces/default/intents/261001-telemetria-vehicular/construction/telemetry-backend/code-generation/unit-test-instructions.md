# Instrucciones de pruebas unitarias — telemetry-backend

## Configuración

Vitest ejecuta pruebas TypeScript en `src/telemetry/**/*.test.ts`. El proyecto debe crear package.json, vitest.config.ts y los adaptadores de prueba antes de ejecutar el primer caso. El script `test:unit` llama `vitest run`; el argumento posterior limita la ejecución a esta unidad.

## Comando de esta unidad

`npm run test:unit -- src/telemetry`

La primera ejecución válida ocurre después de Step 2. Para la prueba integrada de esta unidad, usar `npm run test:integration -- tests/integration/telemetry-flow.test.ts`; ese script se crea antes de Step 13. Ambos comandos están acotados a telemetry-backend.

## Cobertura y casos

Estrategia Minimal: una comprobación verificable por requisito, más una prueba unitaria de éxito por componente. No hay porcentaje numérico de cobertura añadido por el scope workshop; mantener verde la suite existente. Probar validación y fronteras, aceptación solo tras SQS confirmada, TTL, idempotencia y conflicto, transacción evento/salida, alerta estricta menor que 20, reentrega lógica, lote parcial, DLQ y recuperación de pendientes.

## Dobles y datos

Usar reloj inyectado, IDs y JSON sintéticos, y dobles de SQS/DynamoDB en unitarias. La integración crítica usa servicios AWS simulados y verifica el contrato del consumidor externo mediante deduplicación por alertId. Cada prueba controla su estado y limpieza; no reutilizar datos mutables entre casos.
