# Requisitos de seguridad

| ID | Requisito verificable | Evidencia |
|---|---|---|
| NFR5.1 | API Gateway exige una clave válida para POST /telemetry-events y limita cada clave a 100 solicitudes/s sostenidas, ráfaga 200 y cuota 5.000.000/día. | Solicitudes sin clave, con clave inválida y en cada frontera; ninguna rechazada publica. |
| NFR5.2 | SQS y DynamoDB cifran datos en reposo con KMS; todas las comunicaciones usan TLS. | Plantillas IaC y comprobación de recursos desplegados. |
| NFR5.3 | Cada rol IAM dispone solo de acciones y recursos necesarios para su flujo; los roles de aplicación no administran ni borran CloudTrail. | Revisión de políticas y prueba negativa de acceso. |
| NFR5.4 | La validación de entrada cubre campos, tipos, rangos y timestamp antes de publicar; los logs excluyen claves API, secretos y el rawPayload completo. | Casos de rechazo y búsqueda de secretos en logs. |
| NFR6.1 | CI/CD obtiene credenciales AWS temporales por OIDC y no almacena claves persistentes. | Configuración del pipeline y escaneo de secretos. |
| NFR10.1 | CloudTrail registra creación, cambio y eliminación de API Gateway, Lambda, SQS, DynamoDB, KMS, IAM y CloudFormation/CDK, con identidad, acción, recurso y fecha. | Consultas de eventos inducidos por servicio. |
| NFR10.2 | Logs de CloudTrail usan KMS, retención mínima de 90 días y protección contra borrado por roles de aplicación. | Políticas, retención configurada y prueba negativa. |

`rawPayload` puede contener datos adicionales enviados por productores; se trata como dato sensible del servicio y no se vuelca en logs. No se afirma un marco regulatorio específico sin conocer jurisdicción y clasificación formal.
