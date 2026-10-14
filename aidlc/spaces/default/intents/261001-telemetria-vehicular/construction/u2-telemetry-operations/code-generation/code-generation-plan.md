# Plan de corrección de código — U2

## Alcance y objetivo

Corregir F2–F7 de construction/build-and-test/findings.json para US1.2, US4.2, US5.1 y US5.2. Mantener una Lambda, API Gateway REST, las dos tablas, EventBridge y SQS únicamente de alertas; conservar transacción, idempotencia, umbral <20, alertId y respuesta 202 durable. U3 conserva F1 (dependencia CDK), el pipeline y la protección externa de entrega.

El cambio incorpora un sobre de preview con vigencia y MAC KMS, presupuesto global y resultado parcial, IDs de invocación auditables, dimensiones/unidades de métricas coherentes, permiso Query al índice TTL, comparador inclusivo y dashboard. La clave KMS HMAC y el selector CloudTrail Invoke forman parte de la plantilla local; no se provisionan ni se despliegan en este plan. Se documentan sus costes incrementales para revisión antes del despliegue.

Las 16 brechas de assertions observadas al revalidar U1 alimentan las regresiones de U2: se añaden comprobaciones en los archivos existentes donde el escenario cruza el núcleo compartido. Se preserva el resumen histórico de U1; el resultado nuevo identifica qué brechas cerró con evidencia. Ninguna ruta existente ni prueba simulada acredita carga real, disponibilidad mensual, IAM desplegado o protección CI.

## Pasos secuenciales y trazabilidad

- [x] **Step 1 — Runner, base y alcance.** Revisar package.json, lockfile, vitest.config.ts y tsconfig.json; usar los comandos exactos por archivo definidos en unit-test-instructions.md. Tomar como baseline la evidencia U1 de este intento (34 unitarias, 2 integración, cinco checks verdes); no repetirla sin una modificación o preocupación nueva. Reusar Vitest sin reducir umbrales. Leer los 20 AC U2 y los hallazgos F2–F7. Historias US1.2, US4.2, US5.1, US5.2.
- [x] **Step 2 — Modelo de preview y medición: implementar.** En manual-recovery.ts y un módulo acotado recovery-preview.ts definir sobre versionado, previewId, alcance, IDs ordenados únicos, límite, issuedAt/expiresAt y keyId configurado. Canonicalizar y autenticar el digest SHA-256 con un puerto MAC inyectable y adaptador KMS HMAC_256/HMAC_SHA_256; añadir @aws-sdk/client-kms compatible y lockfile. El cliente no elige una clave fuera de la lista configurada. Validar finitud/tipos/límites, máximo 25 y vigencia inicial 300 s. Mantener cifrado y secretos fuera del repositorio. F6; AC4.2.1–AC4.2.3; NFR5.6–NFR5.8, NFR9.11.
- [x] **Step 3 — Modelo de preview: probar después.** En recovery-preview.test.ts y manual-recovery.test.ts probar caso válido, cada campo alterado (incluidos límite y tiempos), digest/MAC inválido, clave no permitida, vencimiento exacto y posterior, emisión inválida, conjunto vacío y fallo KMS sin efectos. Las pruebas usan reloj y MAC inyectados y no contactan AWS. Ejecutar comando de esta capa. F6; AC4.2.1–AC4.2.3.
- [x] **Step 4 — Repositorio y medición TTL: implementar.** Ajustar adapters.ts únicamente donde lo requieren las operaciones: Query al índice TtlByShard, corte estricto de antigüedad >24 h, paginación y límite/presupuesto; diferenciar conteo completo de límite inferior o lectura parcial. El backfill condicional no recrea un evento eliminado ni sobrescribe ttlShard/expiresAt. Preservar consulta DueByShard y atomicidad. La exploración Scan existente se conserva solo para backfill administrativo acotado; no se convierte en sondeo programado. F3/F6; AC5.1.4, AC5.2.2, AC4.2.4; NFR4.4, NFR9.8.
- [x] **Step 5 — Repositorio: probar después.** Extender adapters.test.ts con corte exactamente 24 h y superior, múltiples shards/páginas, truncamiento, índice/permisos fallidos, backfill repetido/condición perdida/evento borrado, y escenarios de commit incierto con lectura coherente. Comprobar las llamadas transaccionales conjuntas y que un fallo no se convierte en 202 indebido. Ejecutar el comando exacto. F3/F6/F7; FR1.6, FR4.2–FR4.4, NFR2.4, NFR4.4.
- [x] **Step 6 — Recuperación e instrumentación del servicio: implementar.** Refactorizar manual-recovery.ts y service.ts dentro del alcance: verificar MAC/vigencia y conjunto confirmado antes de efectos; propagar presupuesto global min(18 s, Context restante menos reserva de 2 s), controlar cada nueva reclamación y los plazos de llamadas externas; devolver confirmados, fallidos/inciertos, omitidos y no iniciados reconciliables, además de estado parcial. Una repetición revalida elegibilidad y nunca crea otro evento/salida. Añadir observación inyectable de commit creado/duplicado/conflicto/fallido/incierto, SQS confirmado/fallido/incierto, reclamación y marcado PUBLISHED, sin cambiar aceptación durable. Registrar latencia recepción-a-commit solo para evidencia durable válida. F5/F6; AC4.2.1–AC4.2.5, AC5.1.2, AC5.2.1.
- [x] **Step 7 — Servicio y recuperación: probar después.** En manual-recovery.test.ts y service.test.ts comprobar preview cambiado, confirmación ausente/alterada/vencida/repetida, error parcial, agotamiento global antes y durante el lote, ningún trabajo nuevo tras el presupuesto y conteos sin solapamientos. Extender regresiones compartidas para timeout SQS con 202/PENDING, carrera/lease vencido, fallo de marcado tras SQS confirmado, mismo alertId y publicación con evento ya borrado. Una falla de observabilidad no fabrica aceptación ni borra pendientes; queda señalizada. Ejecutar ambas capas. F5/F6/F7; AC4.2.1–AC4.2.5, FR5.2–FR6.3 y BR2–BR4 aplicables.
- [x] **Step 8 — Entradas y CLI: implementar.** Ajustar handlers.ts y bin/telemetry-operations.ts conjuntamente. Discriminar HTTP/EventBridge/operación manual con validación estricta y no aceptar actor del payload como identidad autorizada. IAM es la frontera real de Invoke; la aplicación recibe awsRequestId y remainingTime desde Context. La CLI usa RequestResponse, conserva también el requestId del API, muestra IDs/cantidad/límite/vigencia, exige confirmación explícita y reenvía el sobre intacto; no imprime MAC/secretos/payload ni accede directamente a tablas. Añadir módulo observability.ts si permite centralizar EMF con VehicleTelemetry y Service=TelemetryService; Count para cantidades y Seconds para duración/edad. Clasificar HTTP 202/400/409/5xx y separar cuota/4xx de errores de servicio sin perder conteo total. F2/F5/F6; US1.2, US4.2, US5.2.
- [x] **Step 9 — Entradas, CLI y EMF: probar después.** Extender handlers-operations.test.ts y handlers.test.ts; agregar operations-cli.test.ts y observability.test.ts en src/telemetry/ (patrón ya incluido por Vitest). Verificar confirmación y expiración, errores Invoke/AccessDenied sin efectos posteriores, Context propagado, IDs reales de invocación, resultados parciales, cada métrica con dimensión/unidad/categoría/correlación y ausencia de API key, MAC y cuerpo crudo. Completar BVA de campos, rangos, UTC +5 min inclusive, umbral 20 y eventos fuera de orden. Una denegación IAM simulada comprueba manejo del error, no acredita IAM AWS real. F2/F5/F6/F7; AC1.2.1–AC1.2.6, AC4.2.1–AC4.2.5, AC5.2.1/4.
- [x] **Step 10 — Disponibilidad mensual: implementar.** Añadir availability.ts con cálculo puro sobre mes calendario UTC, denominador completo y categorías disjuntas disponible/fallida/mantenimiento/no observada. Validar población, finitud y cobertura; devolver estado de observación incompleta cuando corresponda. Los datos sintéticos validan la fórmula, no un SLO real. F5; AC5.1.3/5, NFR3.5, NFR7.11.
- [x] **Step 11 — Disponibilidad mensual: probar después.** En availability.test.ts probar mes de 28/29/30/31 días, mantenimiento incluido, faltantes, categorías solapadas o suma inválida, valores negativos/NaN/Infinity y límites 99.9 %. Ejecutar el comando por archivo y documentar exactamente qué acredita. F5/F7; AC5.1.3/5.
- [x] **Step 12 — CDK y configuración: implementar.** Modificar infra/telemetry-stack.ts: Query sobre EventsTable/index/TtlByShard; dimensiones y unidades exactas en métricas, alarmas y widgets; GREATER_THAN_OR_EQUAL_TO_THRESHOLD para ≥1 % condicionado a ≥100 solicitudes elegibles; dashboard con fórmula/denominadores y estados sin datos. Agregar clave HMAC por entorno con permisos GenerateMac/VerifyMac solo para Lambda, configuración de vigencia/presupuesto/clave permitida y retención/rotación manual documentada. Habilitar eventos de datos CloudTrail Invoke solo para la función y conservar trail de administración y retención. Mantener IAM P3 InvokeFunction sobre función exacta, sin acceso directo a tablas/KMS ni funciones/colas nuevas. F2–F6; NFR5.6–NFR5.8, NFR7.6–NFR7.11, NFR9.7–NFR9.13, NFR10.3.
- [x] **Step 13 — CDK y alarmas: probar después.** Extender infra/telemetry-stack-operations.test.ts y las assertions compartidas necesarias en infra/telemetry-stack.test.ts. Verificar recurso/rol efectivos de Query TTL, exclusión de otros índices, clave HMAC y acciones acotadas, selector CloudTrail, dimensión/unidad/estadística/periodo/evaluaciones/destino de cada señal, dashboard y topología única. Probar fórmula y frontera 100 solicitudes/1 error, 100/0, menos de 100 y 4xx/cuotas separados; no asumir que la existencia de una alarma acredita su serie. Ejecutar el comando por archivo. F2/F3/F4/F5/F6.
- [x] **Step 14 — Integración y regresión críticas.** Extender tests/integration/telemetry-operations.test.ts y telemetry-flow.test.ts con AWS simulado: HTTP→commit transaccional→202, barrera antes/después de commit, fallo/resultado incierto sin estado parcial, seis campos de alerta, umbral 20, timeout/publicación fallida y EventBridge→recuperación. Agregar preview MAC→confirmación→ejecución parcial, cambio de conjunto, repetición y recuperación posterior con identidad estable. Ejecutar la regresión compartida una vez después de los cambios y guardar salidas/códigos. F5/F6/F7; FR1–FR6 aplicables y AC U2.
- [x] **Step 15 — Comprobaciones, documentación y evidencia.** Ejecutar typecheck, lint, format:check, build, cdk:synth, comprobación de dependencias y secretos con controles existentes y reportar F1 si sigue pendiente (sin excepción ni actualización CDK fuera de U3). Ajustar README.md para preview, MAC, vigencia, presupuesto, operación parcial, identidad auditable, backfill, rollback y costes por entorno. Actualizar code-summary.md, source-manifest.json con todas las fuentes/generadores, y traceability.json con AC/BR/NFR asignados y FR/NFR directos soportados. OK exige evidencia local concreta; GAP para assertion ausente; Deferred con justificación para comprobación AWS real posterior. Conservar Loop-Back Log y las evidencias históricas. F7; US1.2, US4.2, US5.1, US5.2.

## Superficie de cambio y riesgos

Archivos existentes afectados: src/telemetry/manual-recovery.ts, service.ts, handlers.ts, adapters.ts, sus pruebas indicadas; bin/telemetry-operations.ts; infra/telemetry-stack.ts y pruebas operaciones/compartidas; tests/integration/telemetry-operations.test.ts y telemetry-flow.test.ts; package.json/package-lock.json para el cliente KMS necesario, y README.md. Archivos nuevos previstos: recovery-preview.ts/.test.ts, observability.ts/.test.ts, availability.ts/.test.ts y operations-cli.test.ts bajo src/telemetry/. Configuración de runner solo si hay una necesidad comprobada, sin debilitar ninguna barrera.

Riesgo medio: se modifican límites compartidos de ingesta/recuperación e instrumentación; toda regresión crítica debe quedar verde. CLI y handler cambian juntos al sobre versionado; una preview anterior no puede ejecutar silenciosamente el formato nuevo. KMS/CloudTrail agregan recursos/operaciones de coste real únicamente cuando se despliegue; esa acción queda fuera del plan. Sin cambios al pipeline, fusión a main, despliegue ni credenciales persistentes.

## Estrategia de pruebas y evidencia

Postura test-after, estrategia Minimal y obligaciones trazables: implementar cada capa y luego escribir/ejecutar su prueba; runner antes del primer test; un caso feliz por componente y al menos una comprobación efectiva por requisito, con errores y límites relevantes. Las regresiones justifican superar la cifra orientativa 5–15; no hay porcentaje de cobertura nuevo para workshop. Toda suite existente permanece verde.

Los comandos exactos por archivo y dobles están en unit-test-instructions.md. Los tests de SDK/plantilla corroboran mecanismo y manejo de error; carga, calendario observado, IAM negativo, CloudTrail y activación real de alarmas mantienen evidencia futura Unverified. Build and Test debe distinguir mecanismos comprobados de resultados externos y de F1 aún pendiente.

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

