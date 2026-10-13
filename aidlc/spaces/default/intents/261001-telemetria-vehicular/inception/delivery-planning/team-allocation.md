# Asignación de responsables para los Bolts

Un **Bolt** es una pasada de construcción que entrega una unidad ejecutable y comprobable. Un **mob** es el grupo pequeño de roles que diseña, implementa y revisa esa entrega en una misma sesión de trabajo. Team Formation no se ejecutó para este alcance; no se atribuyen equipos humanos inexistentes. El asistente coordina los roles especializados y la persona usuaria conserva las aprobaciones previstas.

| Orden | Bolt y unidad | Responsable de implementación | Roles que colaboran | Revisión y decisión |
|---|---|---|---|---|
| 1 | `b1-telemetry-core` / U1 | `aidlc-developer-agent` | Arquitectura para transacción y contratos; plataforma AWS para CDK/IAM/KMS; calidad para la prueba integrada | La persona usuaria aprueba el primer resultado integrado tras verificación real |
| 2 | `b2-delivery-controls` / U3 | `aidlc-developer-agent` | Pipeline y despliegue para CI/OIDC/promoción; DevSecOps para secretos y permisos; plataforma para CloudTrail | La persona usuaria revisa los puntos aplicables; la promoción a producción requiere aprobación manual independiente |
| 3 | `b3-telemetry-operations` / U2 | `aidlc-developer-agent` | Operaciones para alarmas/SLO; calidad para matriz y carga; arquitectura para compatibilidad con U1 | La persona usuaria revisa los puntos aplicables y distingue evidencia medida de evidencia pendiente |

Los roles son responsabilidades de trabajo, no servicios desplegables ni equipos adicionales. Cada Bolt usa una rama corta desde `main`, *pull request*, comprobaciones y fusión *squash* a `main`. La ejecución queda serial y por unidad; U2 y U3 no se desarrollan como ramas de larga duración simultáneas. Las dependencias externas y sus responsables por confirmar se registran en `external-dependency-map.md`.

## Relevo entre Bolts

- U1 entrega la Lambda única, CDK base, C1–C5 y la prueba crítica. U3 consume ese artefacto y la prueba; U2 consume los modelos de evento/Outbox y los contratos HTTP/SQS.
- U3 añade los controles de integración y despliegue sobre U1; la misma verificación corre al incorporar U2.
- Si la cuenta AWS u OIDC no están listos, quien administre la cuenta o el repositorio debe confirmar el acceso. El equipo de trabajo puede demostrar el recorrido con servicios simulados, pero no declarar verificado el despliegue real.

## Sources

- `inception/units-generation/unit-of-work.md` y `unit-of-work-dependency.md`
- `inception/contract-design/contract-summary.md`
- `inception/practices-discovery/team-practices.md`
- `inception/delivery-planning/delivery-planning-questions.md`
