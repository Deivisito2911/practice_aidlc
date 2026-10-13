# Diseño de seguridad — U1

## Límites de confianza

API Gateway controla clave, ruta y cuota antes de la Lambda. La clave de API no equivale a identidad fuerte ni autorización por vehículo. La Lambda vuelve a validar el JSON y distingue la entrada programada por su forma EventBridge esperada. DynamoDB y SQS se tratan como límites externos: errores y respuestas inciertas se registran por clase, sin datos crudos.

| Requisito | Control diseñado | Evidencia |
|---|---|---|
| NFR5.1 | Método POST protegido con clave de API y plan de uso; rechazo previo a Lambda. | Solicitudes sin clave/clave inválida no producen invocación ni escrituras. |
| NFR5.2 | KMS para ambas tablas y SQS; TLS para cliente/API y llamadas a servicios; políticas que impiden transporte no cifrado cuando aplique. | CDK sintetizado y recurso desplegado. |
| NFR5.3 | Un rol Lambda con acciones precisas de transacción/consulta/actualización en tablas y SendMessage en la cola de alertas; ninguna acción ReceiveMessage/DeleteMessage ni cola de ingreso. La regla EventBridge solo puede invocar esa Lambda. | Análisis IAM positivo y negativo. |
| NFR5.4 | Datos confidenciales en evento/Outbox; acceso humano solo por rol autorizado. rawPayload se conserva cifrado con el evento, sin registrarlo en logs/trazas/métricas. Los identificadores de correlación se exponen solo a operadores autorizados. | Revisión de permisos y prueba de no divulgación en logs. |
| NFR5.5 | Validación de esquema cerrado, identificadores, rangos y reloj antes de escribir; entrada EventBridge inválida no entra al caso HTTP. | Matriz de entradas sin efectos. |
| NFR10.1 | Usar un trail de administración verificable para los servicios de la solución; el CDK provee la base si no existe una opción organizacional comprobada. | Eventos consultables de cambios de prueba. |
| NFR10.2 | Entrega de CloudTrail a almacenamiento KMS con retención ≥90 días y denegación de borrado al rol de aplicación; separar su administración de la Lambda. | Configuración y prueba negativa; U3 comprueba la identidad OIDC y protección del pipeline. |

## Amenazas y respuesta

- Un productor con clave robada puede consumir cuota y enviar datos válidos; la limitación y rotación operativa reducen alcance, pero no prometen identidad fuerte. Una autorización por vehículo queda fuera del alcance.
- Una solicitud malformada no cruza a persistencia. Un evento EventBridge falsificado no se trata como HTTP ni publica por sí mismo sin salida PENDING.
- Una carrera por la misma salida usa condición y claimToken; un propietario vencido no actualiza el estado.
- La auditoría de control y los registros de aplicación son distintos. Ninguno contiene la clave API ni el JSON crudo.

No se presume una obligación GDPR, HIPAA o equivalente sin jurisdicción y naturaleza de datos confirmadas. La clasificación confidencial es la decisión operativa aprobada.
