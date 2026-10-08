# Resumen de generación de código — telemetry-backend

## Archivos y comportamiento

- `src/telemetry/`: modelos, validación, adaptadores SQS/DynamoDB, casos de uso y tres handlers Lambda; pruebas unitarias junto a cada capa.
- `infra/telemetry-stack.ts`, `infra/telemetry-stack.test.ts` y `bin/telemetry.ts`: API Gateway con clave y cuota, colas cifradas y DLQ, tablas con TTL y salida pendiente, tres Lambdas, KMS, CloudTrail y alarmas; aserciones de síntesis.
- `tests/integration/telemetry-flow.test.ts`: recorrido crítico simulado, incluido fallo de publicación, recuperación y deduplicación contractual por `alertId`.
- `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `.prettierrc.json` y `cdk.json`: compilación y controles locales.
- `README.md` y `docs/telemetry-verification.md`: API, mensajes, despliegue, runbook y evidencia de verificación. El inventario completo está en `source-manifest.json`.

## Decisiones de implementación

La API responde `202` solo después de confirmar SQS y conserva `rawPayload`, `acceptedAt` y `correlationId`. El procesador usa la clave `eventId` y una huella canónica para distinguir reentrega de conflicto. Para batería inferior a 20, una transacción escribe el evento y una salida `PENDING`; el publicador conserva un `alertId` estable, confirma SQS y cambia condicionalmente la salida a `PUBLISHED`. La deduplicación por `alertId` corresponde al consumidor. La cola de entrada reintenta fallos parciales y envía a DLQ tras cinco recepciones fallidas.

## Pruebas y brechas

Pasaron 23 pruebas unitarias, una prueba integrada y tres aserciones CDK. También pasaron tipos, lint, formato, build y síntesis CDK para staging. Los comandos y resultados constan en `docs/telemetry-verification.md`.

El escaneo de dependencias falló por una vulnerabilidad alta en `brace-expansion@5.0.9` empaquetada en `aws-cdk-lib@2.272.0`; `npm audit fix` no pudo sustituirla. Los objetivos de p95 ≤500 ms a 100 solicitudes/s, ≥99 % de persistencia en menos de 30 s y disponibilidad mensual ≥99,9 % siguen sin medición en staging. El pipeline CI, el escaneo dedicado de secretos y el despliegue corresponden a etapas posteriores. No se redujo ningún objetivo.

## Desviaciones del plan

Se completaron los pasos de implementación y sus controles locales. La vulnerabilidad transitiva y las mediciones que requieren staging permanecen abiertas con evidencia explícita; no se presenta la síntesis local como validación de rendimiento o disponibilidad.
