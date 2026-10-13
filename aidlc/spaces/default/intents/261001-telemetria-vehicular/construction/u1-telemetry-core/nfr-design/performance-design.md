# Diseño de rendimiento — U1

## Camino de respuesta

La Lambda valida antes de cualquier llamada externa, ejecuta una transacción DynamoDB y solo para batería baja intenta SQS después del commit. Un plazo configurable limita el intento SQS; si vence o falla, deja PENDING y devuelve el 202 correspondiente al commit. La lectura de duplicados no reenvía alertas. La recuperación EventBridge se procesa con lotes y un presupuesto de tiempo separados en la misma Lambda.

| Requisito | Decisión de diseño | Comprobación |
|---|---|---|
| NFR1.1 | Medir desde el cliente p95 ≤ 500 ms a 100 solicitudes válidas/s sostenidas en staging, incluida una mezcla declarada de batería baja. La configuración de memoria, concurrencia y plazo SQS se ajusta con esa prueba. | Carga real de staging; publicar mezcla, p50/p95/p99 y errores. |
| NFR1.2 | El intento SQS tiene un presupuesto configurable menor que el tiempo restante del handler y no participa en la decisión de éxito. Al agotarlo, PENDING queda recuperable. | Inyectar timeout y comprobar 202, PENDING y latencia. |
| NFR1.3 | Configurar el plan de uso por clave a 100 solicitudes/s, ráfaga 200 y cuota diaria 5.000.000, entendiendo que su cumplimiento es aproximado; la capacidad backend se comprueba bajo el perfil efectivo. | Medir admitidas, limitadas y p95; U2 verifica límites. |
| NFR2.1 | El único punto que autoriza un 202 nuevo es el commit transaccional confirmado; la respuesta copia acceptedAt del registro. | Orden de eventos instrumentado y prueba de fallo antes del commit. |
| NFR2.2 | Capturar recepción, commit y respuesta con relojes consistentes y calcular la fracción persistida antes de 30 s; SQS queda fuera del denominador de persistencia. | Prueba de carga y correlación individual. |

No se introduce caché para escrituras o idempotencia: podría devolver 202 sin prueba durable o servir identidad obsoleta. La lectura de un duplicado se hace sobre el registro fuente. Los valores concretos de timeout y concurrencia pasan a Infrastructure Design, donde se validan contra el presupuesto de 500 ms.
