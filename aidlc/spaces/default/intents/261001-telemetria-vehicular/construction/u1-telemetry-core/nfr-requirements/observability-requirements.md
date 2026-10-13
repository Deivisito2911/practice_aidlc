# Observabilidad — U1

| ID | Señal o control verificable | Evidencia | Fuente |
|---|---|---|---|
| NFR7.1 | Logs estructurados distinguirán entrada HTTP aceptada/rechazada, fallo de validación, fallo o incertidumbre DynamoDB, fallo o incertidumbre SQS, reclamación perdida y recuperación programada. Llevarán correlationId y eventId cuando exista, sin clave API ni cuerpo crudo. | Inducir cada camino y buscar campos/tipos de evento en logs con prueba de ausencia de secretos. | NFR7, FR6.3 |
| NFR7.2 | Métricas contarán solicitudes 202/400/409/5xx, intentos y fallos de transacción, salidas PENDING/PUBLISHED, envíos SQS confirmados/fallidos/inciertos e invocaciones/fallos EventBridge. | Provocar cada evento y comprobar incremento correcto de la serie correspondiente. | NFR7 |
| NFR7.3 | Medir antigüedad máxima y cantidad de PENDING, profundidad de SQS de alertas y acumulación de eventos elegibles TTL aún presentes; alarmar una condición anómala para cada una. | Crear condiciones sintéticas controladas y observar señal y alarma; Infrastructure Design fija umbral, ventana, severidad y destino. | NFR7, NFR4 |
| NFR7.4 | Un operador autorizado podrá correlacionar petición API → Lambda única → evento/Outbox → SQS de alertas y EventBridge → la misma Lambda mediante correlationId y alertId, con acceso restringido a trazas. | Caso integrado con SQS fallida, barrido posterior y búsqueda por identificadores. | NFR7 |
| NFR7.5 | SLI de latencia p95, tiempo desde recepción hasta commit, disponibilidad mensual y edad de PENDING usarán definiciones estables y distinguirán errores de productor, limitación de cuota y fallos del servicio. | Panel de staging con denominadores documentados y datos de prueba; NFR Design concreta instrumentación. | NFR1, NFR2, NFR3, NFR7 |

## Alarmas y visualización

La configuración final de cada alarma declarará indicador, umbral, ventana, severidad, destino y acción de recuperación. U1 aporta las señales mínimas del recorrido integrado; U2 completa el catálogo de alarmas, la medición SLO y el procedimiento operativo. No se crean métricas o paneles para SQS de entrada o DLQ de ingreso.
