# Diseño de monitoreo — U3

## Metrics & KPIs

| Metric | Source | Threshold | Why it matters |
|---|---|---|---|
| Resultado de cada check obligatorio | Proveedor CI | Cualquier check requerido fallido bloquea integración. | Evita promover código sin validar. |
| Despliegues por ambiente y digest | Proveedor CI y registro de despliegue | Todo despliegue debe apuntar a commit/digest identificable; staging y producción deben compartir digest. | Permite reconstruir y revertir la promoción. |
| Estado de entrega de CloudTrail | Eventos de servicio CloudTrail y verificación de estado del trail | Cualquier fallo de entrega o trail detenido genera alerta inmediata. | La pérdida de eventos administrativos compromete la evidencia. |
| Cambios en trail o archivo de auditoría | CloudTrail vía EventBridge | `StopLogging`, `DeleteTrail`, `UpdateTrail`, cambios de política/retención o eliminación de objetos protegidos generan alerta crítica. | Detecta cambios que debiliten auditoría o retención. |
| Antigüedad del evento más reciente del trail | Consulta periódica del archivo de auditoría / evidencia de entrega | Sin evento nuevo dentro de la ventana operativa acordada se investiga; fijar la ventana en el runbook de cuenta. | Detecta interrupción de entrega cuando no hay errores explícitos. |

## Alerts

| Alert | Condition | Severity | Routes to |
|---|---|---|---|
| Pipeline validation failed | Un check obligatorio falla o se omite. | High | Equipo propietario del repositorio; bloquear merge. |
| Unauthorized deployment attempt | Intento desde fork, rama, entorno o sujeto OIDC no permitido. | Critical | Seguridad/plataforma; bloquear credenciales y revisar el evento. |
| CloudTrail stopped or changed | Evento `StopLogging`, `DeleteTrail` o cambio no aprobado a trail/destino. | Critical | Guardia de seguridad y administrador de auditoría. |
| Audit delivery/retention degraded | Error de entrega, acceso denegado, retención insuficiente o evento más reciente fuera de la ventana acordada. | Critical | Administrador de auditoría; verificar cuenta y almacenamiento. |
| Production promotion pending/failed | Aprobación humana ausente, despliegue fallido o digest distinto al de staging. | High | Responsable de release; no repetir hasta comparar digest y stack. |

## SLIs / SLOs

| SLI | SLO target | Measurement window |
|---|---|---|
| Cambios integrados con todas las verificaciones obligatorias aprobadas | 100% de cambios integrados tienen checks requeridos verdes y revisión registrada. | Por pull request y revisión mensual de configuración. |
| Promociones de producción con aprobación y digest idéntico a staging | 100% de promociones cumplen ambos controles. | Por despliegue. |
| Disponibilidad de evidencia CloudTrail | Trail habilitado, destino KMS protegido y retención configurada a ≥90 días. | Verificación diaria de configuración; prueba de evento real después de cambios de infraestructura. |

## Logs & Tracing

Conservar logs de ejecución de CI según la retención del proveedor y evitar que incluyan tokens, claves API o secretos. Guardar para cada promoción commit, digest, resultado de síntesis, identidad OIDC no sensible, aprobador y entorno. CloudTrail se entrega al bucket cifrado con KMS y retención protegida. El dashboard de release muestra estado de checks, despliegues por ambiente, digest promovido, errores de entrega de auditoría y cambios sensibles detectados. El monitoreo de métricas y alertas runtime de la Lambda sigue siendo responsabilidad de U2.

## Fuentes

- `construction/u3-delivery-controls/nfr-design/security-design.md` (NFR6, NFR8, NFR10)
- `construction/u3-delivery-controls/nfr-requirements/security-requirements.md`
- `inception/contract-design/contract-summary.md` (C4–C5)
