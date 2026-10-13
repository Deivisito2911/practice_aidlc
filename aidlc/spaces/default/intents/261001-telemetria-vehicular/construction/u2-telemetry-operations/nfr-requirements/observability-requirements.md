# Observabilidad — U2

| ID | Señal o control verificable | Evidencia | Fuente |
|---|---|---|---|
| NFR7.6 | Logs estructurados correlacionan solicitudes aceptadas/rechazadas, fallos Lambda/DynamoDB, EventBridge, SQS, preview/confirmación manual y conteos finales, sin clave API, secretos ni cuerpo crudo. | Provocar cada caso y validar correlación/causa; buscar contenido prohibido. | NFR7, FR6.3, AC5.2.1 |
| NFR7.7 | Métricas cubren estados HTTP, latencia p95, recepción-a-commit, cantidad/antigüedad PENDING, resultados de recuperación, fallos EventBridge/SQS, profundidad visible SQS y TTL elegible aún presente. | Generar cada señal con datos controlados y verificar unidad y conteo. | NFR7, NFR1–NFR4, AC5.2.1, AC5.2.2 |
| NFR7.8 | Alarmas de acumulación declaran indicador, umbral, ventana, severidad, destino y recuperación. Valores iniciales: edad máxima PENDING >10 min por 5 min (alta); cantidad PENDING >100 por 10 min (media); profundidad visible SQS >100 por 5 min (media); TTL elegible aún presente >1,000 con antigüedad >24 h durante 1 h (baja; investigar demora eventual). | Inspeccionar configuración y activar condiciones sintéticas arriba/abajo del umbral. Infrastructure Design enlaza métrica física y destino por entorno. | NFR7, NFR4, AC5.2.2, AC5.2.3 |
| NFR7.9 | Alarmas de fallo detectan al menos un fallo de invocación EventBridge en 5 min y error de servicio ≥1 % sobre al menos 100 solicitudes en 5 min; rechazos 4xx y límites de cuota se separan. | Probar cada señal y su clasificación; inspeccionar ventana, severidad, destino y recuperación. | NFR7, AC5.2.1, AC5.2.3 |
| NFR7.10 | P3 recorre correlación desde API/solicitud a TelemetryService, evento/Outbox, SQS y EventBridge; puede buscar cada RecoveryRun por correlación. | Caso integrado con fallo SQS y recuperación manual/programada. | NFR7, AC5.2.4 |
| NFR7.11 | SLI de rendimiento, procesamiento, disponibilidad y TTL documentan denominador, exclusiones y periodo; mantenimiento no se excluye de disponibilidad. | Validar con población sintética conocida y conciliación mensual. | NFR1–NFR4, AC5.1.1–AC5.1.5 |

## Operación de alarmas

Las severidades son políticas iniciales revisables con evidencia de staging, no garantías nuevas de SLA. Cada acción empieza con diagnóstico y alcance; la recuperación manual requiere P3, preview y confirmación. El destino es el canal de guardia configurado para el entorno.

## Fuentes

`inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md`, `functional-design/entities.md`, `functional-design/rules.md` y `functional-design/functional-spec.md`.
