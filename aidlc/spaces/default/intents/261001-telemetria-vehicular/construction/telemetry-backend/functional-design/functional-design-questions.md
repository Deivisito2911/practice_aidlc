# Preguntas de Diseño Funcional

Para avanzar con el diseño funcional del backend de telemetría, necesitamos clarificar los siguientes puntos:

1. **Estructura del registro dummy en DynamoDB**
   ¿Cuál debe ser la estructura exacta de los datos (por ejemplo: Partition Key, Sort Key y campos adicionales) del registro dummy que se va a insertar en DynamoDB?

   [Answer]: Insertar el payload exactamente tal cual llega desde API Gateway, utilizando el `eventId` como Partition Key (PK). Queremos asegurar la trazabilidad del dato crudo.

2. **Cuerpo de la respuesta HTTP 202**
   ¿Cuál debe ser el formato y contenido del payload de la respuesta HTTP 202 (Accepted) que retornará la API al encolar o procesar correctamente los datos de telemetría?

   [Answer]: El cuerpo de la respuesta debe ser un JSON que incluya el ID de correlación para facilitar el rastreo E2E. Ejemplo: `{"status": "accepted", "msg_id": "<X-Correlation-Id>"}`.
