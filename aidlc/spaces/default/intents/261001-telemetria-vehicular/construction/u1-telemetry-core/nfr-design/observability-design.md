# Diseño de observabilidad — U1

## Instrumentación

Un correlationId acompaña solicitud HTTP, registro TelemetryEvent, OutboxEntry y atributo SQS; una invocación programada añade su identificador de barrido y registra alertId por intento. Los logs son JSON con timestamp, nivel, tipo, correlationId, eventId cuando existe, alertId, resultado y clase de error. Nunca incluyen clave API, rawPayload ni cuerpo crudo.

| Requisito | Diseño | Comprobación |
|---|---|---|
| NFR7.1 | Eventos estructurados separados para validación, transacción, publicación, reclamación y barrido; niveles coherentes para éxito, recuperación y fallo. | Inyectar cada resultado y comprobar campos y ausencia de secretos. |
| NFR7.2 | Contadores de HTTP 202/400/409/5xx, commit, SQS confirmado/fallido/incierto, transición PUBLISHED, barridos y reclamaciones perdidas. | Comparar incrementos con eventos de prueba. |
| NFR7.3 | Indicadores de cantidad/edad máxima PENDING, profundidad SQS y elegibles TTL. Alarmas de acumulación y fallos de barrido, con umbrales/ventanas/destinos parametrizados en Infrastructure Design. | Provocar umbral y observar notificación. |
| NFR7.4 | Búsqueda correlacionada entre API, Lambda, DynamoDB/Outbox, SQS y EventBridge mediante correlationId y alertId. Trazas restringidas por rol. | Recorrido con fallo SQS y recuperación posterior. |
| NFR7.5 | Panel de staging con p95, tasa válida, tiempo a commit, disponibilidad mensual y edad PENDING; publicar definición de denominador de cada SLI. | Contrastar panel con logs y resultados de carga. |

No se crean señales de cola de ingreso o DLQ de ingreso. U2 amplía alarmas y operación; U1 instrumenta el camino integrado y deja cada salida pendiente visible. Un mes sintético prueba la fórmula de disponibilidad, pero solo un mes real acredita NFR3.1.
