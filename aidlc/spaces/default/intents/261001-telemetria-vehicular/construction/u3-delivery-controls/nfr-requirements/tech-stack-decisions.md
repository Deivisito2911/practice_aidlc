# Decisiones de stack — U3 Controles de entrega

## Stack confirmado

| Área | Decisión | Motivo |
|---|---|---|
| Runtime y lenguaje | Node.js y TypeScript existentes | U3 empaqueta el servicio TypeScript sin cambiar su runtime ni sus contratos. |
| Infraestructura como código | AWS CDK existente | Reutiliza el stack y los recursos ya definidos; los cambios se sintetizan y revisan antes de desplegar. |
| Paquetes y verificaciones | npm con scripts existentes | `package.json` ya define build, typecheck, Vitest unitario e integración, lint, formato, síntesis CDK y auditoría de dependencias. |
| Credenciales AWS para CI/CD | OIDC con roles temporales | Cumple NFR6 y evita secretos AWS persistentes. Los permisos y sujetos se restringen por repositorio, referencia y entorno. |
| Repositorio y proveedor de CI | Sin seleccionar todavía | El mapa de dependencias identifica el proveedor de repositorio/OIDC como desconocido. El pipeline se concreta de forma provider-neutral hasta que el equipo suministre ese dato. |

## Política de promoción

Los checks obligatorios se ejecutan antes de integrar. La fusión a `main` es squash y permite el despliegue automático a staging tras las comprobaciones verdes. Producción conserva un paso de aprobación manual independiente. Los roles de aplicación no reciben permisos de administración de CloudTrail ni de sus logs.

## Fuentes

- `package.json` (scripts y dependencias actuales)
- `inception/requirements-analysis/requirements.md` (NFR6, NFR8, NFR10)
- `inception/user-stories/stories.md` (US6.2 y US6.3)
- `inception/delivery-planning/external-dependency-map.md` (proveedor externo por confirmar)
- `construction/u1-telemetry-core/functional-design/functional-spec.md` (comportamiento integrado que U3 debe conservar)
- `construction/u1-telemetry-core/functional-design/rules.md` (invariantes compartidos)
