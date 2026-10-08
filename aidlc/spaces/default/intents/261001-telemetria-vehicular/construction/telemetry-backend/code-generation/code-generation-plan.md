# Plan de generación de código — telemetry-backend

## Alcance y estructura

Implementar en la raíz del workspace una aplicación TypeScript con API Gateway REST, Lambda de ingreso, SQS estándar de entrada, Lambda procesadora, dos tablas DynamoDB (evento y salida), Lambda publicadora, SQS de alertas y CDK. Conservar rawPayload, acceptedAt, expiresAt y alertId estable. No hay interfaz gráfica.

Rutas previstas: `src/telemetry/` para modelos, validación, handlers, persistencia y publicación; `infra/` y `bin/` para CDK; `tests/integration/` para el recorrido crítico. Los nombres definitivos se reflejarán en source-manifest.json.

## Pasos de implementación y trazabilidad

- [x] **Step 1.** Crear package.json, tsconfig, configuración de Prettier/ESLint y estructura TypeScript; documentar scripts de build y test. Historias: US6.3.
- [x] **Step 2.** Configurar Vitest y el comando unitario `npm run test:unit -- src/telemetry` antes de la primera prueba; definir dobles AWS y datos sintéticos. Historias: US1.1–US3.2, US4.1.
- [x] **Step 3.** Implementar tipos de evento, sobre de SQS, registro DynamoDB y salida de alerta; conservar rawPayload, acceptedAt y expiresAt. Historias: US1.1, US2.1, US3.1.
- [x] **Step 4.** Escribir y ejecutar pruebas unitarias de modelos y fechas: campos, JSON crudo, TTL a 90 días y límites de valor. Historias: US1.2, US2.1.
- [x] **Step 5.** Implementar adaptadores de SQS y DynamoDB: publicación confirmada, escritura condicional, transacción evento/salida, índice de pendientes y transición condicional. Historias: US1.1, US2.1, US3.2.
- [x] **Step 6.** Escribir y ejecutar pruebas unitarias de adaptadores con fallos, duplicados concurrentes y transacción atómica. Historias: US2.1, US3.2.
- [x] **Step 7.** Implementar reglas y casos de uso: validación por tipo, ventana UTC, idempotencia/conflicto, alerta `value < 20`, publicación recuperable, lotes parciales y redrive seguro. Historias: US1.2, US2.1, US3.1, US3.2, US4.1, US4.2.
- [x] **Step 8.** Escribir y ejecutar pruebas unitarias de casos de uso, incluyendo 19,99/20, reentregas, conflictos, quinto intento y autorización de redrive. Historias: US1.2, US2.1, US3.1, US3.2, US4.1, US4.2.
- [x] **Step 9.** Implementar Lambda de ingreso y respuesta HTTP 202 con status, msg_id y acceptedAt; fallos HTTP sin falso 202. Implementar Lambda procesadora y publicadora. Historias: US1.1, US1.2, US3.2.
- [x] **Step 10.** Escribir y ejecutar pruebas unitarias de handlers: clave/ruta, validación, SQS fallida, lote parcial y salida recuperable. Historias: US1.1, US1.2, US3.2.
- [x] **Step 11.** Implementar CDK para API Gateway, tres Lambdas, dos colas, DLQ, dos tablas, KMS, IAM mínimo, CloudTrail, CloudWatch, TTL y alarmas; definir parámetros de staging/producción. Historias: US5.2, US6.1, US6.2.
- [x] **Step 12.** Escribir y ejecutar aserciones CDK de ruta, cuota, cifrado, TTL, DLQ, transacción y permisos; sintetizar infraestructura. Historias: US6.1, US6.2.
- [x] **Step 13.** Integrar el flujo crítico con servicios AWS simulados y un consumidor contractual que deduplica por alertId; probar también fallo de publicación y recuperación. Historias: US1.1, US2.1, US3.1, US3.2, US6.3.
- [x] **Step 14.** Ejecutar el conjunto unitario, integración, build, formato, lint, tipos, síntesis CDK y escaneos disponibles; no bajar objetivos medibles ante fallos. Historias: US5.1, US5.2, US6.3.
- [x] **Step 15.** Documentar API, mensajes, configuración, despliegue y runbook de DLQ; crear source-manifest.json, code-summary.md y traceability.json. Historias: todas las asignadas.

## Matriz mínima de pruebas

Cada requisito funcional FR1–FR6 y no funcional NFR1–NFR10 tendrá al menos una comprobación verificable en el nivel más estrecho eficaz. Cada componente de código (ingreso, procesador y publicador) tendrá al menos una prueba unitaria de éxito. La prueba integrada crítica recorre API → SQS → Lambda → DynamoDB → salida → SQS de alertas con servicios AWS simulados. Los objetivos de p95, tiempo a persistencia y disponibilidad se miden en sus etapas de validación; no se simulan como si fueran resultados reales.

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
      "text": "- **Methodology**: test-after\n- **Ordering**: implementaremos cada capa comprobable antes de escribir y ejecutar sus pruebas unitarias; después de integrar las capas, ejecutaremos la prueba crítica del recorrido completo.\n- Escribiremos pruebas unitarias por capa para la validación de la API, la publicación en SQS, el procesamiento de Lambda, la persistencia en DynamoDB y la regla estricta de alerta de batería (`value < 20`; el valor `20` no genera alerta).\n- Mantendremos una prueba de integración crítica con servicios AWS simulados que cubra API REST → SQS → Lambda → DynamoDB → SQS de alertas.\n- La integración continua ejecutará formato, *lint*, comprobación de tipos, pruebas y análisis de dependencias y secretos.\n- No se fija todavía un porcentaje numérico de cobertura; la estrategia mínima exige pruebas trazables a los requisitos y que el recorrido crítico permanezca verde."
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
  "input_sha256": "sha256:5fd4ad12ebebababe5f3a3dc5803f1d5438f6b3064890e9baa718c236e79cce4",
  "contract_sha256": "sha256:f8ce212cd8ac4c10b362b5b8f68fc7aaa6c224641934894cb503712925c718cb"
}
```




