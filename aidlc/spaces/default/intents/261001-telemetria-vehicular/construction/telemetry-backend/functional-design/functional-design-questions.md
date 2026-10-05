# Functional Design Questions - Bolt 1: Walking Skeleton

1. **Estructura del Registro Dummy en DynamoDB**
   Para este primer Bolt (Esqueleto Caminante), la Lambda debe probar la escritura en DynamoDB sin lógica compleja. ¿Prefieres que el registro dummy inserte el payload tal cual llega de API Gateway (para validar la recepción), o que inserte un campo estático tipo `{"status": "skeleton-test", "timestamp": "..."}` para distinguir fácilmente estas pruebas iniciales?
   - [Answer]: 

2. **Cuerpo de la Respuesta HTTP 202**
   El contrato especifica una respuesta HTTP 202 Accepted. Para facilitar las pruebas de este esqueleto end-to-end (Postman/cURL), ¿quieres que devolvamos un JSON con un mensaje como `{"status": "accepted", "msg_id": "..."}` (útil para debug), o mantenemos el cuerpo estrictamente vacío?
   - [Answer]: 
