# Seguridad — U2

## Límites de confianza y datos

El ingreso de productores conserva la clave API y los planes por clave. La nueva CLI es un canal operativo separado, autorizado por identidad/rol P3, nunca por la clave API de productor. La CLI solicita la operación a TelemetryService y no adquiere propiedad de las tablas.

| ID | Requisito verificable | Evidencia | Fuente |
|---|---|---|---|
| NFR5.6 | La vista previa y ejecución manual requieren identidad P3 autorizada. Sus permisos se limitan a preparar la recuperación y solicitar la operación; no conceden administración de API, despliegue ni acceso general a tablas. | Pruebas positivas P3 y negativas de productor/no autorizado; inspección de permisos. | NFR5, AC4.2.1, AC4.2.2 |
| NFR5.7 | La CLI muestra solo IDs, cantidad, límite y correlaciones necesarias; no devuelve secretos ni payload crudo. La confirmación se liga a la vista previa actual. | Inspección de salida y rechazo de confirmación ausente, vencida o con candidatos distintos. | NFR5, AC4.2.1, AC4.2.3 |
| NFR5.8 | Las acciones registran actor, hora, alcance, límite, confirmación, correlación y conteos; logs y métricas excluyen claves API, secretos y cuerpo crudo. | Pruebas completa, fallida y parcial; búsqueda automatizada de secretos y contenido crudo. | NFR5, NFR7, AC4.2.3, AC4.2.5 |
| NFR10.3 | Las invocaciones administrativas conservan evidencia consultable junto al RecoveryRun/RecoveryResult; retención y protección siguen el baseline CloudTrail de la solución. | Consultar actor/acción/fecha/recurso en staging y verificar que el rol de aplicación no puede borrar auditoría protegida. | NFR10, AC4.2.3 |

## Controles de datos y abuso

- Mantener cifrado KMS y TLS para datos y señales según el baseline de U1.
- El alcance y tamaño de preview/lote tienen máximos explícitos; autorización se comprueba de nuevo al ejecutar.
- Un resultado incierto no se presenta como confirmado; la salida conserva `PENDING` y `alertId`.
- `eventId`, `vehicleId` y correlationId aparecen en evidencia solo cuando sean necesarios para diagnóstico y con acceso restringido.
- No se identificó un régimen regulatorio adicional ni datos de pago o salud; no se declara cumplimiento de marcos no seleccionados.

## Fuentes

`inception/requirements-analysis/requirements.md`, `inception/contract-design/contract-summary.md`, `inception/user-stories/stories.md`, `functional-design/entities.md`, `functional-design/rules.md` y `functional-design/functional-spec.md`.
