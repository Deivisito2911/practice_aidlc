# Plan de generación de código — U1 núcleo de telemetría

## Alcance y decisiones de prueba

Se modifica la aplicación TypeScript existente. U1 sustituye el ingreso SQS, su DLQ y tres Lambdas por API Gateway REST y EventBridge sobre una sola Lambda, dos tablas DynamoDB y una única SQS de alertas. No se crean copias paralelas de clases o módulos; U2 y U3 amplían esta base.

La postura es `test-after`: implementar cada capa comprobable, luego escribir y ejecutar sus pruebas; al integrar las capas, ejecutar la prueba crítica. El frontend no aplica. El alcance es `workshop`, la estrategia es `Minimal`, no hay porcentaje mínimo de cobertura. La suite existente debe quedar verde. El objetivo p95 y la disponibilidad mensual requieren medición en staging y no se declaran cumplidos por pruebas locales.

## Pasos secuenciales aprobados

- [x] **Step 1 — Estructura y configuración base.** Revisar `package.json`, `tsconfig.json` y `vitest.config.ts`; conservar Vitest y fijar comandos U1 en `unit-test-instructions.md` antes de la primera prueba. Retirar configuración obsoleta de la cola de ingreso. Historias: US6.1, US6.3.
- [x] **Step 2 — Modelo y esquema: implementar.** Ajustar `src/telemetry/model.ts`: cinco campos exactos, identificadores ASCII de 1 a 128, UTC y rangos; canonicalización; `acceptedAt` en segundos y TTL de 90 días; Outbox con `alertId=LOW_BATTERY:{eventId}`, datos completos, 16 shards de vencimiento y estado/arrendamiento. Umbral estricto `value < 20`. Historias: US1.1, US2.1, US3.1.
- [x] **Step 3 — Modelo y esquema: probar después.** Revisar `src/telemetry/model.test.ts` para límites, errores antes de efectos, identidad canónica, TTL, umbral 19.99/20 y datos de salida; ejecutar el comando indicado. Historias: US1.1, US2.1, US3.1.
- [x] **Step 4 — Repositorio y acceso a datos: implementar.** Refactorizar `src/telemetry/adapters.ts` para transacción condicional evento+Outbox, lectura coherente ante duplicado/commit incierto, consulta indexada y paginada de PENDING vencidos por shard, reclamación condicional con token/lease, confirmación PUBLISHED solo tras SQS y diferimiento de fallos. SQS solo de alertas; sin barrido completo. Historias: US2.1, US3.2, US4.1.
- [x] **Step 5 — Repositorio y acceso a datos: probar después.** Actualizar `src/telemetry/adapters.test.ts` con AWS SDK simulado: atomicidad, duplicado/conflicto, lectura fallida, consulta paginada, carrera de claim, token vencido, confirmación y fallo de envío. Ejecutar su comando. Historias: US2.1, US3.2, US4.1.
- [x] **Step 6 — Lógica de negocio: implementar.** Refactorizar `src/telemetry/service.ts`: aceptar solo tras commit verificable; conservar respuesta original en duplicados; primer intento tras commit limitado a 150 ms; PENDING en fallo/resultado incierto; recuperar hasta 25 vencidos por invocación con tiempo restante protegido, backoff de 1 a 15 minutos y el mismo alertId. Historias: US1.1, US2.1, US3.1, US3.2, US4.1.
- [x] **Step 7 — Lógica de negocio: probar después.** Actualizar `src/telemetry/service.test.ts` para aceptación, idempotencia, fallo transaccional, límite 20, publicación inmediata, carreras y recuperación. Ejecutar su comando. Historias: US1.1, US2.1, US3.1, US3.2, US4.1.
- [x] **Step 8 — API y disparador programado: implementar.** Refactorizar `src/telemetry/handlers.ts` a un handler: distinguir proxy REST de EventBridge; códigos y cuerpos C1; correlación válida; logs sin clave ni rawPayload. No aceptar antes de la transacción. Historias: US1.1, US3.2, US4.1.
- [x] **Step 9 — API y disparador programado: probar después.** Actualizar `src/telemetry/handlers.test.ts`: 400/202/409/503, ruta desconocida, duplicado con respuesta original, evento programado y forma no reconocida; comprobar ausencia de efectos en entradas inválidas. Ejecutar su comando. Historias: US1.1, US2.1, US4.1.
- [x] **Step 10 — IaC y configuración de entorno: implementar.** Refactorizar `infra/telemetry-stack.ts` y configuración aplicable: una Lambda Node.js, API REST, EventBridge cada minuto sobre la misma Lambda, dos tablas con TTL/PITR/KMS, GSI disperso por `dueShard`/`nextAttemptAt`, SQS de alertas, permisos acotados, CloudTrail y alarmas base. Eliminar cola/DLQ de ingreso, stream trigger y Lambdas extra. Iniciales: 512 MiB, 20 s, 16 shards, lote 25 y lease 30 s. Historias: US6.1, US2.1, US4.1.
- [x] **Step 11 — IaC: probar después.** Actualizar `infra/telemetry-stack.test.ts` para comprobar topología sintetizada, conteo de recursos, dos disparadores, índice, TTL, KMS y ausencia de cola/DLQ de ingreso. Ejecutar su comando. Historias: US6.1, US4.1.
- [x] **Step 12 — Integración crítica.** Reescribir `tests/integration/telemetry-flow.test.ts` con AWS simulado: HTTP → transacción evento/Outbox → SQS y EventBridge → PENDING; invalidación sin efectos, fallo de commit sin parcial ni 202, 202 tras commit, fallo SQS recuperable, umbral 20, copia con mismo alertId y deduplicación contractual. Ejecutar el comando de integración autorizado. Historias: US1.1, US2.1, US3.1, US3.2, US4.1, US6.3.
- [x] **Step 13 — Documentación y verificación.** Actualizar `README.md` con API, semántica de 202, límites de idempotencia/TTL, operación y despliegue. Ejecutar pruebas U1, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build` y `npm run cdk:synth`. No rebajar objetivos para pasar verificaciones. Registrar desvíos y trazabilidad AC/BR/NFR. Historias: US1.1, US2.1, US3.2, US4.1, US6.1, US6.3.

## Archivos y estrategia de pruebas

Archivos de prueba: `src/telemetry/model.test.ts`, `src/telemetry/adapters.test.ts`, `src/telemetry/service.test.ts`, `src/telemetry/handlers.test.ts`, `infra/telemetry-stack.test.ts` y `tests/integration/telemetry-flow.test.ts`. Se requieren pruebas trazables y un caso feliz por componente. No se fija porcentaje numérico de cobertura. La integración crítica es obligatoria según la práctica afirmada del equipo.

Comandos unitarios: `npm exec -- vitest run src/telemetry/model.test.ts`, equivalente para adapters, service y handlers, y `npm exec -- vitest run infra/telemetry-stack.test.ts`. Suite U1: `npm exec -- vitest run src/telemetry/model.test.ts src/telemetry/adapters.test.ts src/telemetry/service.test.ts src/telemetry/handlers.test.ts infra/telemetry-stack.test.ts`. Integración autorizada: `npm run test:integration -- tests/integration/telemetry-flow.test.ts`.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "implementaremos cada capa comprobable antes de escribir y ejecutar sus pruebas unitarias; después de integrar las capas, ejecutaremos la prueba crítica del recorrido completo.",
  "scope": "workshop",
  "test_strategy": "minimal",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Ordering**: implementaremos cada capa comprobable antes de escribir y ejecutar sus pruebas unitarias; después de integrar las capas, ejecutaremos la prueba crítica del recorrido completo.\n- Escribiremos pruebas unitarias para validación y respuesta HTTP, idempotencia, escritura transaccional de evento y salida, publicación y recuperación de salidas `PENDING`, y el límite estricto de batería (`value < 20`; `20` no genera alerta).\n- Mantendremos una prueba de integración crítica con servicios AWS simulados que cubra las dos formas de invocación de la misma Lambda: API Gateway REST → DynamoDB con evento y Outbox transaccionales → SQS de alertas, y EventBridge periódico → recuperación de salidas `PENDING`. Comprobaremos que una solicitud inválida no produce escritura ni publicación, que una transacción fallida no deja registros parciales ni devuelve éxito, que `202` llega solo después de confirmar la transacción y que un fallo de publicación conserva la salida para reintento.\n- La integración continua ejecutará formato, *lint*, comprobación de tipos, pruebas y análisis de dependencias y secretos.\n- No se fija todavía un porcentaje numérico de cobertura; la estrategia mínima exige pruebas trazables a los requisitos y que el recorrido crítico permanezca verde."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:53d865b6dafcd3035c42697643318474092fa6ba9827e84c89ec912b9acb7bf1",
  "contract_sha256": "sha256:79373e9495d6b18f14b166d7e4b09eac05c1bdf8b660a2879d9a91bdd9abef75"
}
```
