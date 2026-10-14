# Seguimiento de las 16 brechas históricas de U1

## Evidencia local de U2

El archivo histórico U1 permanece intacto. OK significa assertion local ejecutada; no acredita AWS desplegado ni objetivos reales. Los nombres describen los casos y sus assertions efectivas, incluidos los casos parametrizados.

| ID | Estado nuevo | Archivo y caso | Assertion concreta |
|---|---|---|---|
| AC1.1.3 | OK local | `src/telemetry/handlers.test.ts`: acepta límite inclusivo (battery0/100,temperature-50/150,speed0/300 y UTC+5min) | Se aceptan todos los límites sin ampliar rangos. |
| AC2.1.2 | OK local | `tests/integration/telemetry-flow.test.ts`: solicitudes HTTP concurrentes idénticas dejan un evento y una sola salida | Dos respuestas202; una transacción comprometida y dos filas conjuntas. |
| AC2.1.4 | OK local | `tests/integration/telemetry-flow.test.ts`: fallo before/during/after del commit nunca deja estado parcial ni 202 falso | Antes/durante:0 filas / 503; después:2 filas / 202 tras lectura coherente. |
| AC3.1.1 | OK local | `src/telemetry/service.test.ts`: batería 0 y 19,99 crea salida durable determinista | Registro y salida LOW_BATTERY:e1 con batteryValue exacto. |
| AC3.1.3 | OK local | `src/telemetry/service.test.ts`: temperature/speed no crea salida ni publicación | Un evento, cero Outbox y cero llamadasSQS. |
| AC3.1.4 | OK local | `src/telemetry/service.test.ts`: SQS confirmado seguido de fallo al marcar conserva identidad y recuperación | Assertion de los seis campos completos e instante UTC del mensaje. |
| AC3.1.6 | OK local | `src/telemetry/service.test.ts`: eventos fuera de orden producen alertas independientes sin estado acumulativo | Dos eventos/salidas/envíos; no se cancela el evento anterior. |
| AC3.2.4 | OK local | `src/telemetry/service.test.ts`: SQS confirmado seguido de fallo al marcar conserva identidad y recuperación | PENDING recuperable, segundo envío con mismo alertId y publicación confirmada. |
| AC4.1.1 | OK local | `src/telemetry/service.test.ts`: recuperación posterior no republica la salida PUBLISHED | Barrido devuelve0 y no agrega otro envío; adapters prueba condicion de elegibilidad temporal. |
| AC4.1.3 | OK local | `src/telemetry/handlers.test.ts`: logs de validación,persistencia y publicación conservan correlación sin cuerpo ni credenciales | VALIDATION_ERROR/CommitFailed/SqsUncertain y correlación; exclusiones de claves,cuerpo y vehicleId privado. |
| AC4.1.4 | OK local | `src/telemetry/adapters.test.ts`: propietario vencido no confirma y dos reclamantes no obtienen posesión simultánea | Promise.all produce un ganador; token/lease condicionan confirmación. |
| NFR1.2 | OK local | `src/telemetry/service.test.ts`: timeout de publicación conserva aceptación durable y PENDING sin marcar | AbortSignal efectivo,202lógico,estado PENDING y ninguna confirmación indebida. |
| NFR2.1 | OK local | `tests/integration/telemetry-flow.test.ts`: barrera de commit impide respuesta 202 antes de escritura conjunta | Antes de release:0 filas/sin respuesta; después:2 filas / 202. |
| NFR3.2 | OK local | `tests/integration/telemetry-flow.test.ts`: fallo before/during/after del commit nunca deja estado parcial ni 202 falso | Resultado incierto después del commit se confirma coherentemente; no exitos nuevos sin persistencia. |
| NFR3.4 | OK local | `src/telemetry/adapters.test.ts`: lease vencido vuelve a ser reclamable y el propietario anterior no confirma | Un arrendamiento vivo impide otra posesión; vencido permite nuevo token; antiguo falla y vigente confirma. |
| NFR4.3 | OK local | `src/telemetry/service.test.ts`: SQS confirmado seguido de fallo al marcar conserva identidad y recuperación | Se elimina mapa de eventos y se publica nuevamente desde Outbox con identidad/datos completos. |

## Límites

Se usan clientes, relojes y estado AWS simulados. P95, disponibilidad real, denegación IAM, CloudTrail y cuotas anteriores a Lambda siguen Unverified. No se modifica el resumen ni la trazabilidad históricos de U1.
