# Rendimiento, disponibilidad y retención

## Perfil y entorno

Requiere staging desplegado y clave sintética de productor, endpoint y permisos de lectura de evidencia. No se dispone aquí de endpoint/cuenta. performance-validation está programada y conserva la titularidad de las mediciones; el objetivo permanece Unverified hasta recibir evidencia real.

## Método reproducible

Generar IDs globalmente únicos a 100 solicitudes válidas/s sostenidas, documentar duración, mezcla battery/temperature/speed y porcentaje batería <20; medir reloj monotónico de cliente, p50/p95/p99, tasa efectiva, 202/4xx/5xx y cuotas por separado. Ejecutar también carga concurrente EventBridge/recuperación manual con backlog controlado. Conciliar recepción, commit y respuesta por correlación: 100% de 202 tras commit y ≥99% durable en <30s, p95 ≤500ms. No usar las latencias de Vitest como resultado de staging. El runner de carga se configura cuando exista endpoint; no hay comando ejecutable inventado.

## Disponibilidad y TTL

Conservar sondas de todos los minutos de un mes calendario, mantenimiento incluido; disponibilidad ≥99.9%. Datos sintéticos comprueban solo fórmula. Verificar expiresAt=acceptedAt+7776000 segundos; TTL habilitado y borrado eventual sin plazo físico propio. No acelerar el reloj para afirmar cumplimiento mensual. Restauración aislada se verifica antes de producción en deployment-execution.

## Evidencia y cobertura

Guardar configuración, perfil, distribución de latencias, población correlacionada, errores y export de sondas bajo operation/performance-validation/. Objetivos con staging siguen Unverified y hacen fallar Build and Test según su protocolo aunque tengan dueño posterior.

## Sources

construction/u1-telemetry-core/nfr-requirements/performance-requirements.md; construction/u2-telemetry-operations/nfr-requirements/performance-requirements.md; ambos reliability-requirements.md y nfr-design/.
