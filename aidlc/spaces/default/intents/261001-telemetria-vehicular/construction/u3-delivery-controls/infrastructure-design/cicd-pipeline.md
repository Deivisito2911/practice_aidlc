# Pipeline CI/CD — U3

## Flujo

El proveedor CI debe ofrecer jobs sin credenciales AWS para validación de pull requests, protección de rama, intercambio OIDC con AWS, artefactos inmutables y aprobación de entorno. El proveedor concreto queda pendiente de confirmación externa.

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
- Los roles OIDC usan audiencia y sujetos exactos del repositorio, rama/referencia y entorno permitidos. Los tokens se canjean por sesiones STS de duración mínima; nunca se imprimen ni se guardan en caches o artefactos.
- Los permisos de validación, staging, producción y auditoría son roles distintos, restringidos por cuenta, stack, acciones y recursos necesarios. Las políticas no conceden administración de CloudTrail al rol de ejecución de Lambda ni al rol de despliegue de la aplicación.
- La plataforma CI debe enmascarar secretos y exponer logs de auditoría de quién aprobó y ejecutó cada promoción. No almacenar llaves AWS de larga duración.

## Estrategia de despliegue y reversión

Desplegar cambios de aplicación/stack a staging después de la integración y validaciones verdes. Confirmar una prueba del servicio y una consulta de eventos reales CloudTrail posterior al despliegue. La producción usa promoción del mismo artefacto por digest con aprobación explícita; no se reconstruye ni se re-sintetiza una versión diferente. Ante fallo, detener promoción y ejecutar rollback del stack o volver al digest conocido anterior mediante el mismo rol y controles; comprobar luego estado de Lambda, recursos y evidencia CloudTrail. Los despliegues canary/blue-green no se introducen sin soporte demostrado en el contrato y el stack actual.

## Dependencias pendientes

Antes de habilitar el pipeline, el propietario del repositorio debe confirmar plataforma CI, proveedor OIDC, identificador del repositorio, nombres de ramas/entornos protegidos y cuentas AWS de staging/producción. Si la plataforma no permite separar jobs sin credenciales de roles OIDC y aprobación de entorno, no habilitar despliegue automatizado hasta elegir una compatible.

## Fuentes

- `construction/u3-delivery-controls/nfr-design/security-design.md`
- `construction/u3-delivery-controls/nfr-requirements/security-requirements.md`
- `construction/u3-delivery-controls/nfr-requirements/tech-stack-decisions.md`
- `inception/contract-design/contract-summary.md` (C4–C5)
- `inception/domain-design/components.md`
