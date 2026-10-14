# Plan de generación de código — U2 Operaciones de telemetría

## Alcance de la unidad

Implementar US1.2, US4.2, US5.1 y US5.2 sobre el `TelemetryService` y el stack CDK existentes. La CLI operativa propia muestra preview explícita y exige confirmación ligada al conjunto vigente. Se conservan contrato HTTP, transacción evento/Outbox, `alertId`, y topología de una Lambda. No se agrega UI, Lambda ni SQS de ingreso.

## Plan de implementación

- [x] **Step 1 — Revisar base y prueba ejecutable:** confirmar Vitest/configuración existente y preparar los archivos de prueba U2 y comandos exactos del unit-test-instructions.
- [x] **Step 2 — Modelo y esquema:** agregar el shard de expiración calculado establemente; definir tipos/estados de preview, ejecución, resultados y backfill TTL sin alterar campos HTTP, idempotencia ni identidad Outbox. **Historias:** US5.1, US5.2, US4.2.
- [x] **Step 3 — Persistencia de la capa de modelo:** actualizar el mapeo de `TelemetryEvent` y revisar CDK/GSI sharded TTL; escribir y ejecutar pruebas de modelo y síntesis asociadas después de implementar la capa. **Criterios:** AC5.1.4, AC5.2.2.
- [x] **Step 4 — Repositorio/acceso a datos:** implementar consulta indexada y limitada de pendientes vencidos, candidatos TTL elegibles, escritura condicional del backfill y actualización por reclamación existente; fallar de forma segura ante índice o permisos no disponibles. **Historias:** US4.2, US5.2.
- [x] **Step 5 — Pruebas de repositorio/infraestructura:** comprobar preview de conjunto vacío/lleno, máximo 25, filtro de vencimiento, backfill idempotente y migración compatible; correr tests después de la implementación. **Criterios:** AC4.2.1, AC4.2.2, AC5.2.2.
- [x] **Step 6 — Lógica de negocio:** implementar preview, huella del conjunto ordenado, comprobación de autorización por la frontera IAM, confirmación explícita, recálculo antes de ejecutar y contadores confirmados/fallidos/pendientes. Reutilizar reclamación/publicación de Outbox y conservar `PENDING` ante incertidumbre. **Historias:** US4.2, US1.2.
- [x] **Step 7 — Pruebas de lógica:** autorización denegada, alcance vacío, preview alterada, confirmación ausente, ejecución repetida, error parcial y correlaciones; correr pruebas después de implementar. **Criterios:** AC4.2.1–AC4.2.5, AC1.2.6.
- [x] **Step 8 — Interfaz CLI y manejador:** incorporar comando de operaciones que invoque sincronizadamente el ARN existente con AWS SDK/IAM, identifique `preview`/`execute`/backfill, imprima IDs/cantidad/límite y pida confirmación explícita. No imprimir payload, secretos ni usar acceso directo del CLI a DynamoDB/SQS. El handler conserva las rutas de API Gateway y EventBridge actuales. **Historias:** US4.2, US1.2.
- [x] **Step 9 — Pruebas CLI/handler:** comprobar formato de preview, confirmación exacta, salida correlacionada y validación HTTP (UTC +5 min inclusive, superior rechazado, clave/429 previos a Lambda); ejecutar después de implementar. **Criterios:** AC1.2.1–AC1.2.5, AC4.2.1–AC4.2.5.
- [x] **Step 10 — Infraestructura y configuración:** extender el stack existente con GSI TTL, política IAM del rol P3 para invocar solo la función, permiso del handler al índice/backfill acotado, parámetros de máximo/ARN, métricas y alarmas especificadas. Integrar destino guardia del entorno y mantener KMS/TLS/CloudTrail. **Historias:** US5.1, US5.2, US4.2.
- [x] **Step 11 — Pruebas CDK y señales:** verificar una sola Lambda, ninguna cola de ingreso, consultas indexadas, acceso mínimo, thresholds/window/destination y configuración de cuotas; correr pruebas tras implementar. **Criterios:** AC1.2.4, AC1.2.5, AC5.2.1–AC5.2.3.
- [x] **Step 12 — Integración crítica:** añadir prueba AWS simulada para preview→confirm→publicación y falla parcial/PENDING; conservar prueba de ingesta HTTP y recuperación EventBridge. Verificar métricas/logs correlacionables y no exposición de secretos. **Historias:** US1.2, US4.2, US5.1, US5.2; todos los AC de U2.
- [x] **Step 13 — Configuración, documentación y trazabilidad:** actualizar scripts/dependencias estrictamente necesarias, documentar uso/autorización/rollback/backfill, generar `source-manifest.json`, `code-summary.md` y mapa de los 20 criterios asignados. Mantener la revisión CI de U3 como dueño del pipeline.

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

## Capas no aplicables

No existe frontend ni interacción visual; la interfaz operativa es una CLI. Los pasos de frontend del contrato de prueba no aplican. La configuración de test existente es Vitest; se reutiliza sin añadir un framework.

