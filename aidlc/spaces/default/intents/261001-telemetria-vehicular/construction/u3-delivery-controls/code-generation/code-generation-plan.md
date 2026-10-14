# Plan de generación de código — U3 Controles de entrega

## Objetivo y alcance de este intento

Corregir F1 y actualizar la evidencia F7 del retorno desde Build and Test. US6.2 y US6.3 son las historias responsables de U3. GitHub Actions ya fue elegido por el usuario; la configuración efectiva de repositorio, cuentas, sujetos OIDC y entornos corresponde a CI Pipeline y Environment Provisioning y sigue pendiente.

El estado inicial conserva la corrección local de U2 y sus pruebas. La auditoría de dependencias continúa fallida por aws-cdk-lib 2.272.0 y brace-expansion 5.0.9. La versión candidata 2.273.0 está publicada y requiere Node >=20; su compatibilidad y auditorías se demostrarán durante la ejecución. No se anticipa un pase. Las evidencias anteriores quedan archivadas en `archive/2026-10-13-code-generation-u3/`; el Loop-Back Log y la selección de GitHub Actions se conservan.

## Pasos secuenciales y trazabilidad

- [x] **Step 1 — Confirmar estructura y configuración de producción vigente.** Registrar el estado inicial de package.json/lockfile, stack, pruebas y documentación. Preservar la Lambda única, las dos tablas, API Gateway REST, EventBridge y SQS de alertas. U3 no añade capas de modelo, acceso a datos, negocio, endpoint o interfaz; esas capas no requieren nueva implementación. Relación: US6.2/US6.3, NFR5.2, NFR9.1–NFR9.2.
- [x] **Step 2 — Preparar el ejecutor y la configuración de pruebas.** Verificar Vitest y `vitest.config.ts` antes de la primera prueba; el comando acotado disponible es `npx vitest run infra/telemetry-stack-delivery-controls.test.ts`. Conservar la configuración existente si sigue ejecutando el archivo. Registrar la línea base, incluso fallos; corregir un problema real del ejecutor sin bajar objetivos. Relación: US6.3, NFR8.2 y Testing Contract.
- [x] **Step 3 — Implementar la corrección de dependencias y construcción.** Fijar exactamente `aws-cdk-lib: "2.273.0"` en package.json y regenerar el lockfile mediante una actualización dirigida. No usar audit fix ni actualizar indiscriminadamente dependencias. Ejecutar `npm ci`, `npm run audit:deps` y `npm audit --audit-level=high`; guardar comandos, fecha, versión y exits. Exigir cero high/critical en ambos alcances; cualquier hallazgo permanece bloqueante. Relación: US6.3/AC6.3.1, NFR8.3, F1.
- [x] **Step 4 — Verificar controles CDK y escribir/ejecutar sus pruebas tras la implementación.** Corregir en `infra/telemetry-stack.ts` el permiso KMS preexistente ausente para CloudTrail: añadir GenerateDataKey y DescribeKey al principal del servicio con SourceArn acotado al trail; fijar un trailName determinista y calcular su ARN sin referencias circulares. Mantener el contexto de cifrado en la operación criptográfica y separarlo de DescribeKey. No añadir privilegios de auditoría al rol Lambda. Registrar que fijar el nombre puede reemplazar un trail previo al desplegar, aunque no se ejecuta despliegue aquí. Después actualizar `infra/telemetry-stack-delivery-controls.test.ts` cuando la nueva síntesis lo requiera y retirar la apariencia de que una comprobación de texto prueba controles externos. Comprobar enlaces reales en la plantilla entre trail, bucket y claves KMS, retención COMPLIANCE >=90 días, TLS, permisos efectivos del rol Lambda y topología. Preservar las comprobaciones operativas de U2 (KMS HMAC, Invoke auditado, Query TTL y alarmas). Ejecutar el archivo U3 y los dos archivos CDK compartidos indicados en las instrucciones. Revisar diferencias de síntesis, sin aceptar ampliaciones IAM o nuevas funciones/colas inadvertidas. Relación: US6.2/AC6.2.2–AC6.2.3, US6.3/AC6.3.4, NFR5.1–NFR5.3, NFR9.1–NFR9.2, NFR10.1–NFR10.4.
- [x] **Step 5 — Ejecutar el control de secretos real y sus comprobaciones.** Obtener el binario oficial Gitleaks v8.30.1 para esta máquina en un directorio temporal exclusivo fuera del repositorio, verificar SHA256 contra los checksums oficiales y registrar `gitleaks version`. No instalar globalmente. Usar reglas incorporadas con una configuración versionada `.gitleaks.toml` que conserva `useDefault = true`, sin baseline ni reglas deshabilitadas. Corregir exclusivamente el falso positivo confirmado de generic-api-key en identificadores de artefactos CDK: condición AND entre ruta exacta bajo cdk.out (Telemetry-staging/production.assets.json, sus template.json y tree.json) y match del campo S3Key/s3Key/objectKey con 64 caracteres hexadecimales y sufijo .zip. Nunca excluir archivos completos, líneas completas de tree.json, otros campos o credenciales reales. Implementar esta clasificación y después probar hash legítimo permitido, AWS sintético detectado y secreto genérico detectado dentro de cada namespace de artefacto; un hex de credencial sin .zip o en otro campo no queda exceptuado. Conservar los escaneos iniciales exit 1 y la clasificación de cada hallazgo como evidencia del defecto corregido; la excepción reconoce identificadores públicos no credenciales, sin rebajar el objetivo. Pasar el archivo de configuración versionado explícitamente a todos los escaneos. Ejecutar `gitleaks dir --redact=100 --exit-code 1 <proyección-aplicación>` sobre una copia exacta manifestada de src/telemetry, infra, bin, tests/integration, documentación de telemetría, README.md, package.json, package-lock.json y configuración de compilación/pruebas/CDK/lint; incluir dist y cdk.out generados, excluyendo dependencias de terceros y metadatos internos de AI-DLC de esta proyección. Ejecutar también `gitleaks git --redact=100 --exit-code 1 --log-opts=--all .` sobre el historial disponible completo del repositorio. Documentar archivos y commits realmente examinados y límites de clon superficial si existen. Comprobar exit 0 con un archivo temporal limpio y exit 1 con credenciales sintéticas AWS y genéricas de prueba, fuera de la fuente y redactada. La herramienta ausente, error, escaneo incompleto o hallazgo sin resolver permanece bloqueante; no sustituirla por búsqueda heurística ni añadir excepciones para obtener verde. Relación: US6.2/AC6.2.1, US6.3/AC6.3.1, NFR6.2, NFR8.3.
- [x] **Step 6 — Actualizar documentación y comprobaciones de sus límites.** Actualizar `docs/telemetry-delivery-controls.md` en español: GitHub Actions elegido, comandos actuales del escáner, checks obligatorios, artefacto inmutable y aprobación de producción. Explicar que el subject OIDC real debe verificarse; con entornos, ramas/tags se restringen mediante sus reglas de despliegue. Documentar segregación de roles y restricciones directas e indirectas de CloudFormation/PassRole sobre auditoría. Actualizar la comprobación documental existente solo para verificar claridad, sin atribuirle enforcement. Añadir resultados fechados a `docs/telemetry-verification.md` conservando su historia. Relación: US6.2/AC6.2.1–AC6.2.4, US6.3/AC6.3.1–AC6.3.3, NFR6.1–NFR6.3, NFR8.1–NFR8.4, NFR10.4.
- [x] **Step 7 — Verificar integración y compatibilidad tras el cambio compartido.** Ejecutar `npm run test:integration -- tests/integration/telemetry-flow.test.ts` después de integrar. Por el cambio de biblioteca compartida, realizar una regresión completa una vez mediante los archivos actuales de src/telemetry, infra y tests/integration; registrar la expansión exacta de archivos. Ejecutar formato, lint, tipos, build y síntesis CDK. Revisar la plantilla y registrar exits reales. Repetir solo las verificaciones afectadas por cambios nuevos o fallos pendientes. Relación: US6.3/AC6.3.1 y AC6.3.4, NFR8.1–NFR8.3, NFR9.1–NFR9.2.
- [x] **Step 8 — Consolidar resumen, manifiesto y trazabilidad honesta.** Escribir code-summary.md, source-manifest.json, traceability.json y evidencia fechada con cada comando, exit y alcance. Enumerar los ocho AC asignados y los dieciséis NFR detallados de U3; incluir FR/NFR directos aplicables sin inventar cumplimiento. OK exige implementación/prueba existente y evidencia suficiente para el criterio, no una mera ruta. OIDC activo, protección de main/entornos, ejecución CI, promoción y consulta real de CloudTrail permanecen Deferred/Unverified hasta su demostración. F1 solo queda resuelto si instalación/auditorías/compatibilidad pasan. F7 conserva límites y hallazgos abiertos. Relación: US6.2/US6.3, NFR10.4, F1 y F7.

## Archivos y límites de verificación

Escrituras previstas de aplicación: package.json, package-lock.json, .gitleaks.toml, infra/telemetry-stack-delivery-controls.test.ts, infra/telemetry-stack.ts, docs/telemetry-delivery-controls.md y docs/telemetry-verification.md. `vitest.config.ts` solo si Step 2 demuestra un defecto real de configuración. El manifiesto enumera archivos concretos de `cdk.out` regenerados por la síntesis; no declara el directorio completo como fuente. `dist/` se regenera con `npm run build`, pero no se declara como escritura versionada. La corrección planificada no cambia el comportamiento de la aplicación ni despliega recursos. Un cambio de plantilla no explicado o una necesidad de ampliar el alcance se presenta como hallazgo antes de ejecutarla.

Se mantienen las barreras de calidad acordadas; workshop no añade un porcentaje de cobertura. Las pruebas mínimas corresponden a requisitos verificables y la suite existente permanece verde. El análisis de dependencias cubre producción y árbol completo, pues CDK es dependencia de desarrollo. El escaneo local no acredita el pipeline. El historial Git puede contener hallazgos ajenos a telemetría: se registrarán sin supresión silenciosa. Un bloqueo impide declarar éxito; no autoriza una excepción.

## Fuentes y decisiones conservadas

- Requisitos e historias: `inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md`, `inception/units-generation/unit-of-work-story-map.md`.
- Diseño actual U3: nfr-requirements/security-requirements.md, nfr-design/security-design.md e infrastructure-design/{infrastructure-specification,cicd-pipeline,monitoring-design}.md.
- Retorno de verificación: `construction/build-and-test/findings.json` (F1 y F7), evidencia actual U2 y selección humana de GitHub Actions en code-generation-questions.md.
- [Uso oficial de Gitleaks v8.30.1](https://github.com/gitleaks/gitleaks/blob/v8.30.1/README.md): comandos dir/git, redacción y exit de detección; [distribución fijada](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1).
- Publicación de CDK candidata confirmada con `npm view aws-cdk-lib@2.273.0 version engines dist.integrity --json`; la validación local sigue pendiente.

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
