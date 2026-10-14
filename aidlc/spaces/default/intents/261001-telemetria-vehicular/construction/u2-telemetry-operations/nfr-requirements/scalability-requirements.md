# Capacidad y escalabilidad — U2

| ID | Requisito comprobable | Comprobación | Fuente |
|---|---|---|---|
| NFR9.7 | Mantener una única Lambda y el contrato de ingesta; cada preview/ejecución CLI queda bajo un máximo operativo explícito y procesa solo candidatos mostrados. | Revisar topología y probar lotes bajo y sobre el máximo. | NFR9, FR2.2, AC1.2.5, AC4.2.1 |
| NFR9.8 | Métricas, alarmas y recuperación no dependen de una lectura ilimitada del Outbox; barrido y reintento manual tienen límite por ejecución y presupuesto global de tiempo. Antes de reclamar otra salida se verifica tiempo restante con reserva para devolver evidencia; al agotarse se informa resultado parcial y cantidad no iniciada. | Cargar más pendientes que el límite y agotar el tiempo a mitad del lote; no iniciar trabajo adicional, reconciliar conteos y verificar que el resto sigue recuperable. | NFR9, FR6.1, AC5.2.2 |
| NFR9.9 | La concurrencia HTTP y de recuperación comparte TelemetryService y permite sostener 100 RPS sin que el proceso de pendientes bloquee la ingesta. | Prueba mixta en staging; reportar tasa HTTP, errores, p95, backlog y throttling. | NFR1, NFR9, AC5.1.1 |

## Crecimiento y límites

No hay proyección anual ni número de vehículos aprobado. Dimensionar por el perfil de 100 RPS, distribución observada de batería baja, retención de 90 días y backlog. Infrastructure Design fija frecuencia, concurrencia y límite numérico de lote/preview con base en la prueba mixta; no se introduce cola de ingreso ni propietario de datos adicional.

## Fuentes

`inception/requirements-analysis/requirements.md`, `inception/contract-design/contract-summary.md`, `inception/units-generation/unit-of-work.md`, `functional-design/functional-spec.md` y `functional-design/rules.md`.
