# Capacidad y escalabilidad — U1

| ID | Requisito comprobable | Comprobación | Fuente |
|---|---|---|---|
| NFR1.3 | El recorrido HTTP y transaccional soportará el perfil aprobado de 100 solicitudes válidas/s sostenidas por clave y ráfaga configurada de 200, sin incumplir NFR1.1. Las cuotas de API Gateway son objetivos aproximados, no una garantía exacta por solicitud. | Prueba de carga en staging; reportar tasa efectiva, errores, limitación y p95. | NFR1, FR2.2 |
| NFR2.3 | La capacidad de la única Lambda y de ambas tablas permitirá confirmar evento y Outbox antes del 202 para el perfil aprobado; la recuperación programada compartirá capacidad sin bloquear la ingesta. | Carga mixta HTTP + EventBridge; comprobar ausencia de eventos parciales y de cola PENDING creciente por falta de capacidad. | NFR2, FR6.1 |
| NFR9.1 | La consulta de recuperación será indexada, paginada y acotada a PENDING vencidos; no dependerá de un escaneo completo de Outbox. | Inspección del plan físico e integración con salidas futuras, vencidas y PUBLISHED. | NFR9, FR6.1 |
| NFR9.2 | El CDK definirá capacidad/concurrencia y parámetros por entorno de forma reproducible; Infrastructure Design fijará tamaño de lote, frecuencia EventBridge, distribución de índice y límites de Lambda. | Síntesis CDK repetible y comparación de plantillas en dos cuentas preparadas. | NFR9 |

## Crecimiento y límites

No se ha aprobado una proyección anual, cantidad de vehículos ni presupuesto de coste. Dimensionar y medir el perfil de 100 solicitudes válidas/s y el trabajo de recuperación simultáneo; registrar el cuello de botella observado antes de fijar capacidad adicional. La cuota de 5.000.000 solicitudes/día por clave se configura en API Gateway y se comprueba en U2.
