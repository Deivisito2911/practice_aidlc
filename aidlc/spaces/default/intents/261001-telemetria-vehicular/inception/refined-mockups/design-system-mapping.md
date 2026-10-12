# Mapeo del sistema de diseño

No hay sistema visual de producto porque el Walking Skeleton expone una API sin interfaz. La experiencia se materializa en documentación técnica y contrato OpenAPI.

| Necesidad | Convención aplicada |
|---|---|
| Identificar operación | Método HTTP y ruta explícitos: `POST /telemetry-events`. |
| Describir campos | Esquemas JSON tipados con unidades, rangos, obligatoriedad y formato UTC. |
| Expresar resultados | Códigos HTTP y sobres JSON explícitos; `202` significa persistencia, no entrega de alerta. |
| Correlacionar soporte | `X-Correlation-Id` en solicitud y respuesta, también presente en logs estructurados. |
| Evitar fugas | No mostrar API keys, cuerpo crudo ni detalles internos en errores/logs. |
| Reintentar | Idempotencia basada en `eventId`; `alertId` estable en la entrega de alertas. |

La etapa Contract Design establecerá los esquemas y formatos exactos. La documentación debe derivarse del contrato aprobado para evitar divergencia.
