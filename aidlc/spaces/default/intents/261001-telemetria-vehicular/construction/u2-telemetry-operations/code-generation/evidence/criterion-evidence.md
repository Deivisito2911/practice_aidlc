# Assertions de la corrección U2

## Hallazgos locales

| Hallazgo | Assertions y archivos ejecutados | Límite |
|---|---|---|
| F2 | observability.test.ts itera cada métrica y comprueba namespace, Service exacto, unidad y whitelist; telemetry-stack-operations.test.ts inspecciona las series consumidoras. | No prueba emisión/activación AWS real. |
| F3 | adapters.test.ts comprueba corte estricto, páginas/shards, truncamiento, AccessDenied y backfill sin recreación; CDK liga Query TTL y GetItem Outbox al rol efectivo y ARNs precisos. | Backfill e IAM desplegados pendientes. |
| F4 | serviceErrorRate prueba 100/1, 100/0 y menos de 100; HTTP separa total/elegibles/4xx/429/5xx; CDK comprueba comparador >= y ventana/destino. | Cuota anterior a Lambda requiere Gateway real. |
| F5 | Tests de servicio distinguen claim/SQS/mark, commit incierto y reloj inválido; handler comprueba los tres fallos sin secretos; availability prueba meses 28/29/30/31, mantenimiento, faltantes y solapamientos. Dashboard y severidades son assertions de plantilla. | Carga, mes real, IAM/logs/dashboard y alarmas reales siguen Unverified. |
| F6 | recovery-preview prueba campos alterados, MAC/digest, clave permitida, vencimiento y KMS; manual prueba conjunto cambiado, repetición, vacío, error parcial y deadline/abort; CLI prueba consentimiento/AccessDenied e IDs distintos; CDK comprueba KMS y selector Invoke. | SDK denegado simulado no acredita IAM ni enlace CloudTrail reales. |
| F7 | u1-gap-follow-up.json/.md enumeran los 16 IDs históricos, archivo/caso y assertion nueva; FR/NFR directos conservan las obligaciones externas. | F1/CI/secretos y comprobaciones externas siguen pendientes U3/operación. |

## Calidad y seguridad

Los comandos y salidas históricos están en [check-results.json](check-results.json); los resultados posteriores y exits de la fuente final congelada están en [final-check-results.json](final-check-results.json). Tipos, lint, formato, build y síntesis finales pasaron; F1 conserva exit 1.

Los fallos iniciales de tipos/lint/formato y del nuevo test de causa de validación se conservan junto a sus correcciones. No se rebajaron objetivos ni se borraron pruebas. F1 sigue fallando en auditoría; el escaneo local de patrones solo demuestra que ese patrón no encontró archivos en su superficie. Gitleaks/CI y cumplimiento real permanecen GAP/Deferred bajo U3.

## Diagrama textual del presupuesto

Una invocación fija un deadline una sola vez → consulta y MAC → verificación del conjunto → reclamaciones/envíos/marcados secuenciales dentro del mismo presupuesto → agotamiento aborta SDK y detiene trabajo nuevo → resultados confirmados/fallidos/omitidos/no iniciados reconcilian la población; toda salida no confirmada conserva su recuperación.
