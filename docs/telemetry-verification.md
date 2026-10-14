# Verificación local — telemetry-backend

Ejecutada el 2026-10-08 con Node.js 26.7.0 y npm 12.0.2.

| Comprobación | Resultado |
|---|---|
| `npm run test:unit -- src/telemetry` | 23 pruebas, 4 archivos, correctas |
| `npm run test:integration -- tests/integration/telemetry-flow.test.ts` | 1 prueba correcta; incluye entrega física repetida y deduplicación por `alertId` |
| `npx vitest run infra/telemetry-stack.test.ts` | 3 aserciones CDK correctas |
| `npm run typecheck` | Correcto |
| `npm run lint` | Correcto |
| `npm run format:check` | Correcto |
| `npm run build` | Correcto |
| `npm run cdk:synth` | Correcto para staging |
| `npm run audit:deps` / `npm audit --audit-level=high` | Fallan: vulnerabilidad alta en `brace-expansion@5.0.9` empaquetada dentro de `aws-cdk-lib@2.272.0`. `npm audit fix` informa que no puede reemplazar la dependencia empaquetada automáticamente. |

Se comprobaron lógica, contratos y configuración local. No se ha medido en staging p95 ≤500 ms a 100 solicitudes/s, persistencia de ≥99 % en menos de 30 s ni disponibilidad mensual ≥99,9 %. Esas metas permanecen vigentes y requieren pruebas de carga y observación real. El escaneo de secretos dedicado y el pipeline CI siguen pendientes de sus etapas respectivas. No se desplegó infraestructura.

## U3 — Evidencia estática de controles de entrega (2026-10-12)

La pila CDK sintetizada mantiene una Lambda de telemetría, dos tablas DynamoDB y una cola SQS de alertas; EventBridge sigue apuntando a la misma Lambda y la cola no tiene política de redrive. La plantilla contiene CloudTrail con un bucket cifrado con KMS, acceso público bloqueado, TLS obligatorio, versionado y Object Lock en modo compliance por 90 días. Las políticas en línea de la función se limitan a DynamoDB, KMS y SQS, y su rol no recibe acciones de administración de CloudTrail ni eliminación del archivo de auditoría. Estos son resultados estáticos de CDK; no prueban el estado de una cuenta desplegada.

El documento `telemetry-delivery-controls.md` define el orden de gates, el comando de escaneo de historial Gitleaks fijado a v8.30.1 y las comprobaciones manuales necesarias. GitHub Actions fue seleccionado para la siguiente etapa de pipeline; no se afirma que exista hoy un workflow, una relación de confianza OIDC desplegada, protección de `main`, promoción a staging/producción ni eventos CloudTrail reales comprobados. Esos controles requieren el owner/name del repositorio, refs y entornos, claims OIDC exactos, cuentas y roles AWS.

## U3 — Revalidación de construcción y secretos (2026-10-13)

Se fijó `aws-cdk-lib@2.273.0` con actualización dirigida del lockfile. `npm ci`, `npm run audit:deps` (producción) y `npm audit --audit-level=high` (árbol completo) terminaron con exit 0 y cero vulnerabilidades. La primera ejecución de tres archivos CDK falló al revelar el permiso KMS ausente para CloudTrail; tras añadir `GenerateDataKey*` y `DescribeKey` acotados al ARN del trail, la nueva ejecución pasó 13 pruebas (exit 0). La prueba U3 aislada pasó 5 pruebas. Se sintetizó un nombre de trail determinista; desplegar este cambio puede reemplazar un trail anterior, por lo que antes de desplegar se debe revisar la continuidad de la auditoría.

La integración crítica (`npm run test:integration -- tests/integration/telemetry-flow.test.ts`) pasó 2 archivos y 7 pruebas. La regresión completa explícita de `src/telemetry`, `infra` y `tests/integration` pasó 15 archivos y 159 pruebas. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run cdk:synth` terminaron con exit 0. Son verificaciones locales, no ejecuciones de GitHub Actions.

Gitleaks v8.30.1 oficial se descargó fuera del repositorio y se verificó su SHA256. El primer escaneo de aplicación e historial terminó en exit 1: identificadores públicos SHA256 `.zip` de artefactos CDK activaron `generic-api-key`. Se conservó ese resultado y la clasificación de cada hallazgo. La configuración versionada `.gitleaks.toml` extiende las reglas incorporadas y exceptúa solo el par campo/valor `S3Key`/`objectKey` en los JSON CDK identificados. Con configuración explícita, el escaneo final de 78 archivos de aplicación/generados terminó en exit 0, sin hallazgos; el historial completo disponible, 12 commits en un clon no superficial, también terminó en exit 0. Los fixtures de los tres tipos de JSON detectaron credenciales sintéticas AWS y genéricas, así como un campo distinto o un valor sin `.zip` (exit 1); los hashes legítimos y el archivo limpio dieron exit 0. Los fixtures temporales no forman parte de la fuente.

La evidencia reproducible de comandos, alcance y exits está en `construction/u3-delivery-controls/code-generation/evidence/commands.json` y `scanner-final.json`. Continúan pendientes de prueba externa la confianza OIDC real, la protección de ramas/entornos, los checks obligatorios de CI, la promoción del mismo digest y la recepción/consulta de eventos CloudTrail en la cuenta AWS.
