# Fiabilidad, disponibilidad y retención — U2

| ID | Requisito comprobable | Evidencia | Fuente |
|---|---|---|---|
| NFR3.5 | Staging reportará disponibilidad ≥99.9 % por mes calendario: minutos que aceptan solicitudes válidas dentro de cuota / todos los minutos; mantenimiento permanece en el denominador. | Validar fórmula con datos sintéticos y conservar el cálculo de un mes real completo. | NFR3, AC5.1.3, AC5.1.5 |
| NFR3.6 | Una recuperación manual completa, fallida o parcial conserva identidad Outbox; solo publicación confirmada cierra una salida. Fallos/ incertidumbre dejan `PENDING` para intento posterior, incluido EventBridge. | Inyectar error antes, durante y después del envío; comparar alertId, estado y respuesta. | NFR3, FR5.4, FR6.2, AC4.2.4, AC4.2.5 |
| NFR4.4 | Cada evento usa `expiresAt = acceptedAt + 90 días` exactos. La señal TTL separa registros elegibles que permanecen de la eliminación física eventual, sin plazo máximo de borrado. | Revisar igualdad temporal/TTL habilitado; crear elegibles retenidos y comprobar señal. | NFR4, AC5.1.4, AC5.2.2 |
| NFR3.7 | La repetición del comando manual no crea evento/Outbox adicional ni sustituye `alertId`; entradas no confirmadas siguen disponibles para el barrido programado. | Repetir ejecución y simular caída parcial; verificar idempotencia y recuperación periódica. | NFR3, FR4.2, FR4.4, AC4.2.4, AC4.2.5 |

## Política y recuperación

El objetivo mensual exige un mes de datos real; una ventana breve solo valida el cálculo. La entrega lógica es eventual mediante Outbox, sin garantía de tiempo máximo ni de entrega física exactamente una vez. La CLI complementa la recuperación programada y una operación parcial no sustituye el siguiente barrido.

## Fuentes

`inception/requirements-analysis/requirements.md`, `inception/user-stories/stories.md`, `functional-design/entities.md`, `functional-design/rules.md` y `functional-design/functional-spec.md`.
