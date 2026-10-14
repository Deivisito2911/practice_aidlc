# Decisiones de stack — U3 Controles de entrega

## Stack confirmado

| Área | Decisión | Motivo |
|---|---|---|
| Runtime y lenguaje | Node.js y TypeScript existentes | U3 empaqueta el servicio TypeScript sin cambiar su runtime ni sus contratos. |
| Infraestructura como código | AWS CDK existente | Reutiliza el stack y los recursos ya definidos; los cambios se sintetizan y revisan antes de desplegar. |
| Paquetes y verificaciones | npm con scripts existentes | `package.json` ya define build, typecheck, Vitest unitario e integración, lint, formato, síntesis CDK y auditoría de dependencias. |
| Credenciales AWS para CI/CD | OIDC con roles temporales | Cumple NFR6 y evita secretos AWS persistentes. Los permisos y sujetos se restringen por repositorio, referencia y entorno. |
| Repositorio y proveedor de CI | GitHub Actions, seleccionado por el usuario | Se conserva la respuesta registrada en Code Generation de U3. La identidad del repositorio, las cuentas y las referencias/entornos protegidos deben fijarse antes de activar OIDC o despliegues. |

## Dependencias y seguridad de entrega

La corrección F1 pertenece a U3: se verificará una actualización acotada de aws-cdk-lib y su lockfile, sin alterar contratos, topología ni los controles operativos corregidos por U2. La versión concreta y los archivos de prueba se fijan en el nuevo plan de Code Generation. npm ci debe reproducir la instalación y las auditorías configuradas deben terminar sin hallazgos high/critical; no se utiliza audit fix indiscriminado ni se reduce la barrera de integración.

El escáner de secretos versionado seleccionado en los controles de entrega debe estar instalado y ejecutarse realmente. Su ausencia es un control pendiente, no un pase. La implementación/activación de workflow, OIDC y protecciones externas conserva los requisitos de CI Pipeline y Environment Provisioning.

## Política de promoción

Los checks obligatorios se ejecutan antes de integrar. La fusión a `main` es squash y permite el despliegue automático a staging tras las comprobaciones verdes. Producción conserva un paso de aprobación manual independiente. Los roles de aplicación no reciben permisos de administración de CloudTrail ni de sus logs.

## Fuentes

- `package.json` (scripts y dependencias actuales)
- `inception/requirements-analysis/requirements.md` (NFR6, NFR8, NFR10)
- `inception/user-stories/stories.md` (US6.2 y US6.3)
- `inception/delivery-planning/external-dependency-map.md` (proveedor externo por confirmar)
- `construction/u1-telemetry-core/functional-design/functional-spec.md` (comportamiento integrado que U3 debe conservar)
- `construction/u1-telemetry-core/functional-design/rules.md` (invariantes compartidos)
- `construction/u3-delivery-controls/code-generation/code-generation-questions.md` (GitHub Actions confirmado)
- `construction/build-and-test/findings.json` (actualización acotada por F1 y trazabilidad honesta por F7)
