# Configuración de CI

## Resultado y alcance

El workflow versionado `.github/workflows/ci.yml` valida PR hacia `main`, grupos de merge y pushes a `main` mediante GitHub Actions. El job `quality-gates` tiene `contents: read`, no solicita `id-token: write`, no recibe credenciales AWS y no despliega. La configuración local pasó análisis sintáctico YAML; todavía no hay ejecución ni protección efectiva verificada en GitHub.

## Flujo y artefacto

El job usa checkout de historial completo sin persistir credenciales, Node 22 y `npm ci` con lockfile. Ejecuta formato, ESLint, tipos, auditoría de dependencias de producción y árbol completo, pruebas unitarias de aplicación, tests CDK, integración crítica, build y `cdk synth`. Además genera ensamblados separados `cdk.staging.out/` y `cdk.production.out/` desde el mismo commit: el stack define nombres y recursos por entorno y no puede reutilizar una única plantilla. Descarga Gitleaks 8.30.1, comprueba el SHA-256 publicado, realiza controles sintéticos positivo/negativo y escanea una proyección de aplicación/ensamblados y todo el historial Git. Cualquier comando fallido bloquea el job.

En un push a `main` que pase todas las verificaciones, genera `artifact-files.sha256`, `source-commit.txt` y `artifact-manifest.sha256`, comprueba los hashes y publica `cdk.staging.out/`, `cdk.production.out/` y `dist/` como `telemetry-<commit SHA>` mediante GitHub Actions artifacts con retención de 30 días. El digest de la subida queda en el resumen del run. Deployment Pipeline descarga ese mismo artifact por run/commit, verifica los manifiestos y fija el digest observado en staging para la promoción de producción. Cada entorno consume su ensamblado ya validado, sin volver a sintetizar. Si el artifact caduca, no se reconstruye silenciosamente: se requiere una nueva validación y una nueva aprobación.

La elección humana vigente es GitHub Actions artifacts. CDK publicará assets en S3 durante el despliegue AWS, pero S3 no se usa como repositorio de CI ni se configura con credenciales en este workflow.

## Protección de rama y activación

La configuración de repositorio, fuera del YAML, debe exigir PR con revisión, el check `quality-gates` emitido por GitHub Actions, rama al día antes del merge, historial lineal/squash, sin force-push y sin bypass ordinario. Activar `merge_group` permite que una merge queue ejecute el mismo check. Confirmar en `Deivisito2911/practice_aidlc` un PR que falla una prueba y queda bloqueado y un PR verde que puede fusionarse. La rama protegida, los entornos, los aprobadores y los roles OIDC aún no se han verificado en GitHub/AWS; producción sigue su puerta manual en Deployment Pipeline.

## Fuentes y límites

- `construction/u3-delivery-controls/code-generation/code-summary.md`: versión, escáner y comprobaciones U3.
- `construction/build-and-test/build-and-test-summary.md` y `construction/build-and-test/test-results.md`: comandos y fallos F7-F9 conservados.
- `construction/u3-delivery-controls/infrastructure-design/cicd-pipeline.md`: proveedor, ramas, OIDC y promoción previstos.
- [GitHub Actions: sintaxis de workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax).
- [GitHub: reglas disponibles para proteger ramas](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
- [Gitleaks v8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1).
