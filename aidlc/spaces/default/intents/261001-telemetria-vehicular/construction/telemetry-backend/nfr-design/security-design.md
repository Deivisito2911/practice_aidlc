# Diseño de seguridad

## Límites de confianza

El borde HTTP comprueba clave API, tasa, ráfaga y cuota antes de publicar; valida los campos y el reloj del evento. La clave API controla consumo, pero no se presenta como identidad fuerte de conductor o vehículo. La Lambda vuelve a validar el sobre recibido desde SQS como frontera separada. El publicador verifica la salida PENDING antes de enviar (NFR5.1, NFR5.4).

## Acceso y cifrado

API Gateway solo publica en la cola de entrada; el procesador solo lee esa cola y escribe los registros de evento/salida; el publicador solo lee y actualiza salidas y publica en la cola de alertas. Cada política IAM se restringe a acciones y ARN concretos. SQS y DynamoDB usan KMS y las conexiones usan TLS; el rol de aplicación no puede administrar ni borrar CloudTrail (NFR5.2–NFR5.3, NFR10.2).

## Datos y auditoría

rawPayload se cifra y se excluye de logs, métricas y trazas. Los logs conservan IDs, estado y causa, nunca x-api-key ni secretos. CloudTrail registra acciones de administración de los servicios exigidos, conserva logs cifrados al menos 90 días y permite comprobar identidad, acción, recurso y fecha (NFR10.1–NFR10.2). La clasificación formal y la residencia de datos quedan pendientes de una política de negocio; no se atribuye una obligación regulatoria específica.

## Cadena de entrega

CI usa federación OIDC con credenciales temporales; los escaneos de secretos y dependencias bloquean el PR si fallan. Producción exige aprobación manual (NFR6.1).
