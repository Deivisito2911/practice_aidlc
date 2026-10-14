# Resumen de corrección de código — U2

## Archivos y alcance

Este intento implementa el plan aprobado de 15 pasos sobre el mismo TelemetryService. `source-manifest.json` enumera 25 superficies de escritura: fuentes y pruebas compartidas, módulos nuevos de preview/EMF/disponibilidad, CLI, CDK, package.json/package-lock.json para el cliente KMS y README. La superficie `cdk.out/` incluye plantillas, metadatos, manifiesto, árbol, assets nuevos y la creación/modificación/eliminación de performance-counters.json por los generadores. `dist/` es salida ignorada del build. Los registros históricos U1 y Build and Test se preservan.

No hubo merge, commit, despliegue ni operación AWS real. U3 conserva F1 y sus archivos/pipeline. Se mantiene una Lambda, dos tablas, API Gateway REST, EventBridge y SQS únicamente de alertas.

## Decisiones implementadas

- F2: EMF, métricas, alarmas y widgets usan VehicleTelemetry/Service=TelemetryService; Count para cantidades y Seconds para edades/duraciones. Los IDs quedan en logs, fuera de las dimensiones.
- F3: Query al ARN exacto TtlByShard y GetItem de Outbox están ligados al rol Lambda. TTL usa corte estrictamente superior a 24 h; paginación y medidas truncadas distinguen límites inferiores. El backfill condicional no recrea filas ni modifica expiresAt.
- F4: error de servicio ≥1 % entre ≥100 solicitudes elegibles, con comparador inclusivo; 4xx/cuotas se separan del denominador y conservan conteos.
- F5: clasificación de HTTP, commit creado/duplicado/conflicto/fallido/incierto, claim, envío SQS confirmado/fallido/incierto y marcado. Un error de claim no se atribuye a SQS; un fallo tras envío confirmado se registra como publicación incierta. Relojes inválidos no producen latencia cero ni cumplimiento ficticio. ValidationRejected usa Count y causa fija, sin entrada cruda. Dashboard y fórmula mensual explican denominadores; mantenimiento y minutos no observados no desaparecen del mes.
- F6: preview v1 con IDs únicos ordenados, límite máximo 25 y vigencia de 300 s; digest canónico SHA-256 autenticado con KMS HMAC_256/HMAC_SHA_256. Ejecución verifica el sobre original, clave permitida, MAC y vencimiento antes de efectos. Presupuesto único min(18 s, Context menos 2 s), AbortSignal en SDK y resultado parcial reconciliable. Un resultado SQS ambiguo conserva PENDING/lease sin presentarlo como rechazo definitivo. CLI exige consentimiento, oculta MAC y conserva los IDs API Invoke/Lambda como identificadores distintos.
- F7: trazabilidad del intento corregida y mapa explícito de las 16 brechas históricas U1 a assertions nuevas locales. El histórico U1 no se reescribe para aparentar que esas pruebas existían.

## Verificación y evidencia

La regresión completa de 14 archivos cerró con 146 pruebas verdes antes del cierre adicional de assertions. Después, los cuatro archivos modificados para cerrar F7/ValidationRejected pasaron 78 pruebas; handler operativo/EMF pasaron 9 pruebas; CDK operativo y compartido pasaron 8. Estos son conteos reales por ejecución, no una suma presentada como otra suite ejecutada.

Los comandos, salidas y exits se conservan en [el registro histórico](evidence/check-results.json) y [el cierre de la fuente final](evidence/final-check-results.json); incluyen los fallos iniciales de tipos/lint/formato y el test que detectó ausencia de causa en validación, seguidos de sus correcciones. No se eliminaron pruebas, redujeron objetivos ni desactivaron reglas. Los últimos checks de tipos, lint, formato, build y síntesis terminaron con exit 0. La última ejecución de adapters pasó 15 pruebas. No quedan comandos pendientes; la fuente está congelada. Los resultados anteriores se conservan como históricos cuando cambió la fuente.

`npm run audit:deps` y `npm audit --audit-level=high` fallaron con la vulnerabilidad high de brace-expansion en aws-cdk-lib: F1 sigue pendiente U3. No se ejecutó audit fix ni una actualización CDK fuera de alcance. El escaneo local de patrones AWS/private-key no halló archivos; es heurístico y no acredita Gitleaks ni enforcement CI.

## Cobertura y límites

`traceability.json` conserva los 20 AC U2, NFR/BR asignados, FR/NFR directos y los 16 IDs del seguimiento U1. Cada OK tiene archivo existente y assertions locales; Deferred conserva una obligación externa con justificación. `evidence/u1-gap-follow-up.json` y `.md` describen cada una de las 16 assertions concretas.

Las correcciones F2–F6 y la parte local de F7 no prueban cumplimiento externo. Siguen Unverified p95 ≤500 ms a 100 solicitudes válidas/s, ≥99 % durable antes de 30 s y disponibilidad ≥99,9 % de un mes calendario real. También quedan pendientes IAM negativo desplegado, consultas CloudTrail/identidad efectiva, activación real de alarmas, dos cuentas y controles CI/secretos de U3.

HttpQuotaRejected emitido por Lambda no observa los rechazos anteriores a invocarla: el dashboard muestra además Count/4XXError nativos y la conciliación efectiva de cuota/4xx Gateway queda Deferred. Las medidas parciales de PENDING/TTL son límites inferiores; estar bajo umbral con una muestra no prueba ausencia de backlog. La clave HMAC, GSI, eventos Invoke y observabilidad agregan coste por entorno solo cuando se desplieguen; README documenta cálculo y rotación manual/retención/reversión.

## Próximos pasos

U3 debe resolver F1 y los controles de entrega/secretos; Build and Test debe verificar las evidencias locales actuales y conservar separados los objetivos reales pendientes. No se declara finalizado el workflow ni preparado un despliegue por haber generado o sintetizado infraestructura.
