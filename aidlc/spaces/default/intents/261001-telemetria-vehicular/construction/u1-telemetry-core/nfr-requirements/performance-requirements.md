# Rendimiento — U1

## Alcance

La medición cubre POST /telemetry-events en staging con eventos válidos, incluido el caso de batería baja que intenta publicar tras el commit. La respuesta 202 confirma persistencia, no entrega externa.

| ID | Requisito medible | Comprobación | Fuente |
|---|---|---|---|
| NFR1.1 | Bajo 100 solicitudes válidas/s sostenidas en staging, la latencia HTTP de extremo a extremo tendrá p95 ≤ 500 ms. | Prueba de carga sobre API Gateway con mezcla declarada de tipos y proporción de batería baja; medir desde cliente y reportar p50/p95/p99, errores y tasa real. | NFR1, AC1.1.4 |
| NFR1.2 | La primera publicación SQS de batería baja se intentará después del commit dentro de un presupuesto que permita cumplir NFR1.1; si se agota, la salida seguirá PENDING y la API devolverá 202. | Inyectar latencia/timeout SQS y demostrar respuesta 202, salida durable y p95 del perfil aprobado. El presupuesto numérico se fija en NFR Design. | NFR1, BR3.4 |
| NFR2.1 | El 100 % de respuestas 202 nuevas corresponderá a eventos confirmados y, cuando aplique, a salidas PENDING creadas atómicamente antes de la respuesta. | Prueba integrada con barrera antes/después del commit; ninguna respuesta 202 aparece antes de confirmar. | NFR2, FR1.6 |
| NFR2.2 | Al menos 99 % de eventos HTTP válidos alcanzará persistencia confirmada en menos de 30 s desde la recepción, sin usar el envío SQS como condición. | Correlacionar reloj de entrada, aceptación y commit en la prueba de carga; contar éxitos y fallos explícitos por separado. | NFR2 |

## Perfil y límites de medición

- Ejecutar con claves y datos sintéticos únicos para evitar que duplicados alteren el perfil. Publicar la mezcla de battery/temperature/speed y proporción de valores bajo 20.
- Verificar la transacción de evento/Outbox con servicio AWS simulado en integración y medir NFR1.1/NFR2.2 en staging real. Una simulación local no prueba latencia de staging.
- Informar porcentaje de respuestas 202/4xx/5xx y saturación de la única Lambda, DynamoDB y SQS. Las llamadas limitadas por plan de API Gateway se cuentan aparte; ese plan es de aplicación aproximada.
- No declarar cumplimiento de los objetivos hasta ejecutar el perfil y conservar resultados reproducibles.
