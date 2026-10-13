# Preguntas para definir las unidades de trabajo

La arquitectura aprobada tiene un solo componente `TelemetryService`, una sola Lambda y dos entradas: HTTP y la invocación periódica de EventBridge. La primera unidad debe poder demostrar el recorrido integrado API Gateway REST → Lambda → transacción DynamoDB de evento y Outbox → SQS de alertas, además de la recuperación de salidas `PENDING` mediante la misma Lambda. No se crea SQS de ingreso.

## 1. Límite y tamaño de las unidades

Los archivos anteriores agrupan las doce historias en `telemetry-backend`. Para conservar una primera rebanada integrada pequeña y dejar las capacidades ampliadas para después, ¿cómo prefieres dividir el trabajo sobre el mismo componente y despliegue?

A. Dividirlo en tres incrementos: servicio integrado mínimo, ampliaciones funcionales y operativas del mismo servicio, y controles de entrega/CI. Cada incremento puede probarse y desplegarse al estar listo.
B. Dividirlo en dos incrementos: servicio integrado mínimo y ampliaciones funcionales, operativas y de entrega juntas.
C. Mantener una sola unidad para todas las historias, aceptando que la primera unidad abarque todo el alcance del taller.
X. Other (please specify)

[Answer]: A. Tres incrementos (Recommended)

## 2. Dependencia de los controles de entrega

El recorrido integrado necesita recursos CDK desde la primera unidad; las comprobaciones de CI y la promoción a entornos se verifican con código funcional. Si hay más de una unidad, ¿qué dependencia debe constar en el grafo?

A. La unidad de controles de entrega depende de la rebanada integrada; puede prepararse antes en paralelo, pero solo se considera terminada después de verificar el servicio y sus pruebas.
B. La unidad de controles de entrega es independiente de la rebanada integrada y puede darse por terminada con pruebas simuladas propias.
C. Incluir todos los controles de entrega dentro de la primera unidad; no habrá unidad separada para ellos.
X. Other (please specify)

[Answer]: A. Tras integrar servicio (Recommended)

## Plan de descomposición propuesto

| Unidad | Tipo | Historias principales | Límite y resultado comprobable | Dependencia |
|---|---|---|---|---|
| U1 `u1-telemetry-core` | `service` | US1.1, US2.1, US3.1, US3.2, US4.1, US6.1 | Primera rebanada integrada: API Gateway REST, una Lambda con entradas HTTP y EventBridge, transacción DynamoDB de evento y Outbox, publicación y recuperación de alertas por SQS. Incluye rechazo básico sin efectos, `value < 20`, idempotencia, fallo de publicación recuperable y prueba crítica con AWS simulado. | Ninguna. |
| U2 `u2-telemetry-operations` | `service` | US1.2, US4.2, US5.1, US5.2 | Amplía la misma Lambda y su operación: matriz completa de validación y errores, recuperación manual controlada, mediciones, métricas y alarmas. No crea otro componente de dominio ni otra Lambda. | U1. |
| U3 `u3-delivery-controls` | `packaging` | US6.2, US6.3 | Completa controles de entrega: OIDC y CloudTrail protegidos, CI con formato, *lint*, tipos, pruebas y análisis de dependencias/secretos, protección de `main`, despliegue a *staging* y aprobación de producción. Reutiliza el CDK base de U1. | U1. |

U2 y U3 pueden prepararse en paralelo después de U1. U3 requiere el servicio y su prueba integrada para considerarse terminada; U2 no depende de U3. La secuencia económica de entrega se decidirá después. Cada unidad entrega un incremento comprobable y desplegable de la misma solución; las unidades `service` son incrementos del mismo ejecutable, no servicios separados.

Los contratos entre unidades son el contrato HTTP, el esquema evento/Outbox y la alerta SQS con `alertId` estable; U2 y U3 consumen esos contratos sin crear tablas, colas o funciones adicionales. La alternativa de una unidad única conserva una sola entrega, pero vuelve demasiado grande la primera rebanada. Separar por recurso AWS rompería los invariantes de la transacción y añadiría límites de despliegue innecesarios.
