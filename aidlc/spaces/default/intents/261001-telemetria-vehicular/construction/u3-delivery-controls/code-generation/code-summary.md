# Resumen de generación de código — U3

## Resultado del plan aprobado

Se ejecutaron los doce pasos del plan de esta unidad de empaquetado. Se añadieron pruebas CDK y documentación de controles de entrega sobre el servicio existente. El plan y sus instrucciones de prueba conservaron el contenido aprobado. GitHub Actions fue elegido por el usuario durante esta etapa para configurar el pipeline posteriormente.

## Archivos de la entrega

| Archivo | Cambio |
|---|---|
| `infra/telemetry-stack-delivery-controls.test.ts` | Cuatro pruebas de topología/activadores, CloudTrail y archivo protegido, permisos efectivos de Lambda y dependencias de identidad/CI. |
| `docs/telemetry-delivery-controls.md` | Contrato de calidad, federación OIDC, promoción por digest y aprobación de producción; Gitleaks v8.30.1 con salida redactada; configuración pendiente identificada explícitamente. |
| `docs/telemetry-verification.md` | Diferencia entre evidencia estática CDK y comprobación de eventos y permisos en una cuenta real. |
| `source-manifest.json` | Enumera toda ruta de aplicación escrita por U3, incluidas correcciones de formato y generación `cdk.out/`. |

La configuración de auditoría del stack ya tenía KMS, Object Lock en modo COMPLIANCE por 90 días, versionado y bloqueo público; no se introdujeron cambios funcionales al stack. Las pruebas comprueban logging activo, eventos administrativos, vínculo al bucket, cifrado, retención y denegación de transporte inseguro. La comprobación IAM inspecciona los documentos de política vinculados al rol real de Lambda, exige permisos operativos presentes y rechaza privilegios administrativos, NotAction y comodines amplios.

## Verificación

| Comando | Resultado |
|---|---|
| `npx vitest run infra/telemetry-stack-delivery-controls.test.ts` | 4 pruebas aprobadas. |
| `npm run test:unit` | 6 archivos / 37 pruebas existentes aprobadas. |
| `npm run test:integration -- tests/integration/telemetry-flow.test.ts` | 2 archivos / 2 pruebas aprobadas: el script base incluye todo `tests/integration`, por lo que el argumento adicional también conserva la integración operativa existente. |
| `npm run lint` | Exit 0. |
| `npm run typecheck` | Exit 0. |
| `npm run format:check` | Exit 0 tras corregir el formato de los archivos existentes señalados por Prettier. |
| `npm run cdk:synth` | Exit 0; evidencia de configuración estática. |

Las pruebas se escribieron después de comprobar la configuración CDK existente, según `test-after`. Se corrigió una extracción vacía de políticas IAM detectada en la revisión de las pruebas y se volvió a ejecutar la comprobación antes de registrar el resultado.

Los sensores de secciones, lint y tipos pasaron. El sensor advisory de trazabilidad identifica 15 requisitos/criterios pendientes de CI o evidencia en cuenta real; no detecta IDs faltantes, huérfanos ni destinos inválidos. Se conservaron los GAP y no se cambiaron por resultados locales sin evidencia.

## Desviaciones y pendientes

La corrección de formato incluyó once archivos existentes de U1/U2: `README.md`, `bin/telemetry.ts`, `bin/telemetry-operations.ts`, `infra/telemetry-stack.ts`, `infra/telemetry-stack-operations.test.ts`, `src/telemetry/adapters.ts`, `src/telemetry/handlers.ts`, `src/telemetry/handlers-operations.test.ts`, `src/telemetry/manual-recovery.ts`, `src/telemetry/manual-recovery.test.ts` y `tests/integration/telemetry-operations.test.ts`. Se preservó su comportamiento y se incluyeron en el manifiesto de fuentes.

Los controles de GitHub Actions, confianza OIDC, protecciones de rama y despliegue no están implementados en esta entrega local; se mantienen como GAP en `traceability.json` para la etapa CI Pipeline. La consulta de eventos CloudTrail reales necesita acceso a la cuenta AWS. Gitleaks no se ejecutó localmente porque su binario no está instalado; su ejecución es un control pendiente del pipeline. Aprobar el alcance local no verifica esos controles externos.

## Sources

- `code-generation-plan.md` y `unit-test-instructions.md` (contenido aprobado).
- `code-generation-questions.md` (Approve Plan y selección posterior de GitHub Actions).
- `../nfr-requirements/security-requirements.md`.
- `../nfr-design/security-design.md`.
- `../infrastructure-design/infrastructure-specification.md`.
- `inception/contract-design/contract-summary.md` y `inception/user-stories/stories.md`.
