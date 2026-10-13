# Pregunta de diseño funcional — U1

## 1. Primer intento de publicación

La transacción confirma el evento y su salida `PENDING` antes del `202`. ¿Cuándo debe la misma Lambda intentar por primera vez publicar la alerta en SQS? La respuesta HTTP seguirá siendo `202` después de la transacción aunque falle la publicación; EventBridge recuperará toda salida pendiente.

A. Justo después de confirmar la transacción y antes de responder; limitar el tiempo del intento para proteger la latencia de la API.
B. Solo durante la siguiente invocación periódica de EventBridge; la API responde inmediatamente tras confirmar la transacción.
X. Other (please specify)

[Answer]: A. Justo después de confirmar la transacción y antes de responder; limitar el tiempo del intento para proteger la latencia de la API. (Tras guardar (Recommended))
