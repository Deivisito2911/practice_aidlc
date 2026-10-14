# Puertas de calidad de CI

## Controles obligatorios

| Puerta | Comando o mecanismo | Criterio de pase |
| --- | --- | --- |
| Dependencias reproducibles | `npm ci` | Lockfile válido e instalación exit 0. |
| Formato | `npm run format:check` | Exit 0. |
| Lint | `npm run lint` | Cero errores, exit 0. |
| Tipos | `npm run typecheck` | Exit 0. |
| Dependencias de producción | `npm run audit:deps` | Cero high/critical, exit 0. |
| Árbol completo | `npm audit --audit-level=high` | Cero high/critical, exit 0. |
| Unidades de aplicación | `npm run test:unit` | Todos los tests pasan. |
| Infraestructura | `npx vitest run infra` | Todos los assertions CDK pasan. |
| Integración crítica | `npm run test:integration -- tests/integration/telemetry-flow.test.ts` | Ambas formas de invocación y recuperación pasan; cero fallos. |
| Compilación | `npm run build` | Exit 0. |
| Infraestructura sintetizada | `npm run cdk:synth` | Exit 0 y ensamblado producido. |
| Ensamblados de promoción | `npx cdk synth -c stage=staging --output cdk.staging.out` y `npx cdk synth -c stage=production --output cdk.production.out` | Ambos stacks del mismo commit producidos y escaneados. |
| Secretos | Gitleaks 8.30.1 con `.gitleaks.toml` en proyección e historial completo | Distribución verificada; control positivo detecta y negativo pasa; cero hallazgos en aplicación/historial. |
| Artifact de `main` | Hashes de `cdk.staging.out/`, `cdk.production.out/` y `dist/`, commit y `actions/upload-artifact@v6` | Solo tras las puertas verdes; subida exitosa y digest registrado. |

No se inventa un porcentaje de cobertura: la estrategia acordada es Minimal y la integración crítica debe permanecer verde. Ningún resultado local equivale a un run de GitHub. Un error de instalación, descarga del escáner, consulta de auditoría o subida de artifact es fallo de la puerta, no una omisión tolerada.

## Reglas de integración

El check único `quality-gates` debe ser obligatorio en la ruleset activa de `main`. Se requieren PR, revisión y fusión squash; un push directo o bypass administrativo ordinario no satisface el control. Comprobar con un PR deliberadamente fallido y uno verde, sin insertar credenciales reales en el caso negativo. Los jobs de PR usan permisos de solo lectura y nunca asumen roles AWS. El despliegue a staging y la aprobación de producción pertenecen a Deployment Pipeline y a la configuración de entornos; no están habilitados por este archivo.

## Evidencia y pendientes

El YAML fue parseado localmente y contiene los comandos de Build and Test. Las pruebas locales previas terminaron 159/159 y la integración crítica 7/7, mientras la matriz de Build and Test sigue en 33 Met, 6 Not Met y 51 Unverified. F7 (trazabilidad) permanece abierto; F8 (GitHub/OIDC) requiere ejecución y configuración remota; F9 requiere AWS y medición desplegada. La puerta Construction→Operation figura en `verification/phase-check-construction.md` como FAIL hasta resolver los faltantes.

Referencias: `construction/build-and-test/build-and-test-summary.md`, `construction/build-and-test/test-results.md`, `construction/u3-delivery-controls/code-generation/code-summary.md` y `.github/workflows/ci.yml`.
