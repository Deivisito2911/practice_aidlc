# Diseño de fiabilidad — U2

## Reintento durable

Este diseño cubre **NFR3.6 y NFR3.7**; la medición mensual y TTL se especifican en la sección siguiente bajo **NFR3.5 y NFR4.4**.

La CLI y EventBridge comparten el caso de uso de reclamación/publicación. Cada candidato se reclama condicionalmente; pérdida de carrera significa omitir sin enviar. Solo confirmación SQS seguida de actualización condicional permite `PUBLISHED`. Error, timeout, caída o resultado incierto deja la salida `PENDING`, con el mismo `alertId`, elegible después de liberar o vencer el arrendamiento.

La recuperación manual es parcial por diseño: el resultado distingue confirmados, fallidos e inconclusos, y cada inconcluso conserva PENDING. Repetir una ejecución con la misma selección no crea otro evento/salida. La siguiente invocación periódica continúa el trabajo no confirmado.

## Aislamiento y degradación

- Fallo al generar preview: no se ejecutan efectos.
- Preview vacía, caducada o con huella distinta: rechazar y solicitar nueva preview/confirmación.
- Error de una salida: registrar el fallo y continuar solo si existe tiempo de ejecución suficiente; en otro caso detener el lote dejando el resto elegible.
- Error temporal SQS/DynamoDB: no declarar confirmación; reintentar según política compartida del Outbox y conservar evidencia.
- Falla de canal de guardia: conservar métrica/log de alarma y seguir disponible la investigación en el servicio de monitoreo.

Los límites temporales de arrendamiento, presupuesto por invocación, frecuencia EventBridge y retroceso se fijan en Infrastructure Design con el perfil de staging. No se promete RTO/RPO, replicación regional ni demora máxima de borrado TTL ausentes del alcance.

## Objetivos de disponibilidad y recuperación

La disponibilidad mensual de staging se mide con denominador de mes completo, mantenimiento incluido, objetivo ≥99.9 %. La fórmula sintética prueba el cálculo, no reemplaza el periodo real. PENDING es la evidencia de durabilidad lógica; entrega física puede repetirse y el consumidor conserva deduplicación por alertId.

## Fuentes

`nfr-requirements/reliability-requirements.md`, `nfr-requirements/security-requirements.md`, `nfr-requirements/observability-requirements.md`, `functional-design/functional-spec.md` y `inception/contract-design/contract-summary.md`.
