# Diseño de capacidad — U1

## Escalado y consulta

La Lambda permanece sin estado entre invocaciones; DynamoDB conserva toda identidad y progreso. API Gateway admite el tráfico HTTP; EventBridge envía activaciones periódicas a la misma función. La concurrencia de recuperación comparte el límite de Lambda y se limita por lote/tiempo para que no monopolice la capacidad HTTP. La política exacta de concurrencia se fija y prueba en Infrastructure Design.

| Requisito | Decisión | Validación |
|---|---|---|
| NFR2.3 | Dimensionar Lambda y ambas tablas para 100 solicitudes válidas/s más barrido periódico; si aparece contención, ajustar recursos antes de modificar la topología. | Carga mixta HTTP y recuperación, con tasa, latencia y edad PENDING. |
| NFR9.1 | Índice disperso de salidas PENDING por vencimiento, con particiones distribuidas y paginación. Consultar todos los segmentos debidos en lotes acotados; no hacer Scan de toda la tabla. | Prueba con salidas PUBLISHED, futuras y vencidas, incluyendo varias particiones. |
| NFR9.2 | Configurar frecuencia, lote, concurrencia, tiempo de arrendamiento y límites mediante parámetros CDK por entorno; la misma plantilla conserva la topología. | Síntesis repetible y pruebas de configuración. |

La distribución del índice evita concentrar todos los PENDING en una única clave de partición. La GSI puede mostrar una salida con demora; por ello el barrido es repetitivo y la reclamación se decide condicionalmente en la tabla base, nunca por la sola aparición en el índice. La Lambda no asume orden global de alertas. No se inventa una proyección anual de vehículos o coste: se registra capacidad observada y se ajusta con evidencia.
