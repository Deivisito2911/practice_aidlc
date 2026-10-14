# Pipeline CI/CD — U3

## Flujo

GitHub Actions está confirmado por el usuario. Los trabajos de PR validan sin credenciales AWS; despliegues usan OIDC, artefactos por digest y entornos protegidos. Repositorio, cuentas y protecciones efectivas siguen pendientes de concreción antes de activar despliegues.

| Stage | Gate | AWS identity | Output |
|---|---|---|---|
| Pull request: checkout y dependencias | Usar lockfile; rechazar cambios no revisados de dependencias. | Ninguna. | Dependencias reproducibles. |
| Calidad estática | Formato, ESLint, `npm run typecheck`, `npm run audit:deps` y escaneo de secretos. Cualquier fallo bloquea. | Ninguna. | Resultados de checks ligados al commit. |
| Pruebas | `npm run test:unit` y `npm run test:integration -- tests/integration/telemetry-flow.test.ts`. | Ninguna; AWS simulado. | Reportes de pruebas ligados al commit. |
| Síntesis y revisión de infraestructura | `npm run cdk:synth`; revisar cambios CDK de IAM, cifrado, OIDC, trail y recursos. | Ninguna para síntesis. | Plantilla sintetizada y diff revisable. |
| Integración a `main` | Revisión aprobada, checks requeridos verdes; squash obligatorio. | Ninguna. | Commit integrado y artefacto versionado con digest. |
| Despliegue a staging | Asumir rol de staging por OIDC; desplegar exactamente el artefacto y commit validados. Verificar health/readiness y CloudTrail en la cuenta. | Rol temporal restringido a staging. | Resultado del despliegue y digest observado. |
| Promoción a producción | Aprobación humana del entorno; confirmar que el digest coincide con staging; desplegar mismo artefacto. | Rol temporal independiente de producción. | Evidencia de aprobador, commit, digest y resultado. |

## Credenciales y protección

- La validación de pull request, incluidas las solicitudes desde forks, no obtiene sesión AWS.
- Los roles OIDC usan audiencia y sujeto exactos del formato realmente emitido por GitHub. Con entorno, el sujeto identifica el entorno y las ramas/tags se restringen con sus reglas de despliegue; no se supone un sujeto que contenga ambos. Se verifican los IDs inmutables cuando correspondan. Los tokens se canjean por sesiones STS acotadas; nunca se imprimen ni se guardan en cachés o artefactos.
- Los permisos de validación, staging, producción y auditoría son roles distintos, restringidos por cuenta, stack, acciones y recursos necesarios. Las políticas no conceden administración de CloudTrail al rol de ejecución de Lambda ni al rol de despliegue de la aplicación.
- La plataforma CI debe enmascarar secretos y exponer logs de auditoría de quién aprobó y ejecutó cada promoción. No almacenar llaves AWS de larga duración.

## Estrategia de despliegue y reversión

Desplegar cambios de aplicación/stack a staging después de la integración y validaciones verdes. Confirmar una prueba del servicio y una consulta de eventos reales CloudTrail posterior al despliegue. La producción usa promoción del mismo artefacto por digest con aprobación explícita; no se reconstruye ni se re-sintetiza una versión diferente. Ante fallo, detener promoción y ejecutar rollback del stack o volver al digest conocido anterior mediante el mismo rol y controles; comprobar luego estado de Lambda, recursos y evidencia CloudTrail. Los despliegues canary/blue-green no se introducen sin soporte demostrado en el contrato y el stack actual.

## Dependencias pendientes

Antes de activar el pipeline, el propietario suministra identidad del repositorio, formato/IDs de sujetos OIDC, ramas/tags y entornos protegidos, cuentas AWS y responsables de aprobación. No se vuelve a elegir proveedor: GitHub Actions ya está registrado. Se verifica que el plan/configuración del repositorio permite aplicar las protecciones; si no están efectivas, los despliegues permanecen deshabilitados.

## Corrección local y evidencia del intento

F1 requiere actualización acotada de CDK/lockfile, npm ci y auditorías npm sin high/critical, además de revisión de síntesis y regresión de controles de U1/U2. El escáner de secretos versionado debe ejecutarse realmente; herramienta ausente o exit fallido no equivale a pase. La validación local prepara evidencia para CI, pero no acredita un workflow ejecutado ni protección de main/entornos. No se reduce ninguna barrera ni se integra mientras falle un control obligatorio.

El responsable de auditoría controla bootstrap y cambios de trail/evidencias; los roles de despliegue de aplicación no pueden obtener ese permiso indirectamente mediante CloudFormation, PassRole o plantillas alteradas. La comprobación de cuentas debe incluir ese camino de escalación.

## Fuentes

- `construction/u3-delivery-controls/nfr-design/security-design.md`
- `construction/u3-delivery-controls/nfr-requirements/security-requirements.md`
- `construction/u3-delivery-controls/nfr-requirements/tech-stack-decisions.md`
- `inception/contract-design/contract-summary.md` (C4–C5)
- `inception/domain-design/components.md`
- `construction/u3-delivery-controls/code-generation/code-generation-questions.md` (GitHub Actions confirmado)
- `construction/build-and-test/findings.json` (F1 y F7)
- [GitHub OIDC con AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), consultada el 2026-10-13: sujeto de entorno y protección de ramas.
