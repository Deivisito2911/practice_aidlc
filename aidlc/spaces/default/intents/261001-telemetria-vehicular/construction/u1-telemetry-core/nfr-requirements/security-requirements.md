# Seguridad y tratamiento de datos — U1

## Clasificación y límites

El evento, su rawPayload aceptado y el Outbox con vehicleId son **confidenciales**, según nfr-requirements-questions.md. Esta es una clasificación operativa del proyecto; no se afirma que una ley concreta aplique sin datos sobre jurisdicción o identidad de titulares.

| ID | Requisito comprobable | Evidencia |
|---|---|---|
| NFR5.1 | API Gateway exigirá clave de API para POST /telemetry-events. Las claves ausentes o inválidas no invocarán la Lambda. La clave es control de consumo inicial y no autorización granular por vehículo. | Prueba con claves válida/inválida y conteo de invocaciones y escrituras. |
| NFR5.2 | Las dos tablas DynamoDB y la SQS de alertas usarán cifrado KMS; el tránsito entre cliente, API y servicios AWS usará TLS. | Inspección CDK y de recursos desplegados; intento de acceso sin TLS rechazado donde la política lo permita. |
| NFR5.3 | El rol de la única Lambda tendrá permisos mínimos de lectura/escritura condicional y transacción sobre las tablas, SendMessage a la SQS de alertas y logs/métricas necesarios. Carecerá de permisos de recepción/borrado SQS y de recursos de cola de ingreso. | Comprobación de política IAM y pruebas negativas de acción no concedida. |
| NFR5.4 | El acceso humano a evento, rawPayload y Outbox se limitará a roles operativos autorizados y quedará auditable. Logs, métricas y trazas no contendrán clave API, cuerpo crudo ni el rawPayload; vehicleId y eventId se registrarán solo cuando se necesiten para correlación y con acceso restringido. | Revisión IAM y búsqueda automatizada de secretos/cuerpo en logs de pruebas. |
| NFR5.5 | El límite HTTP validará esquema, tipos, identificadores, reloj y rangos antes de cualquier escritura o publicación; la entrada programada se distinguirá por la forma EventBridge esperada. | Matriz de casos inválidos y evento programado inválido sin efectos. |
| NFR10.1 | La infraestructura base de U1 habilitará auditoría CloudTrail de eventos de administración de API Gateway, Lambda, SQS, DynamoDB, KMS, IAM y CloudFormation/CDK. | Inspección del trail y consultas de cambios de prueba en staging. |
| NFR10.2 | Los registros CloudTrail estarán cifrados con KMS, retenidos al menos 90 días y fuera de permisos de borrado del rol de aplicación. U3 completará la verificación de identidad y protección de despliegue. | Configuración de almacenamiento/retención, política IAM y prueba negativa de borrado. |

## Amenazas y límites de la entrega

- **Suplantación/abuso de productor:** clave API y plan de uso; no se presenta como autenticación fuerte. U2 completa la matriz de cuota y throttling.
- **Manipulación o duplicación:** validación estricta, transacción condicional, identidad eventId y actualización Outbox por claimToken.
- **Divulgación:** KMS, TLS, roles restringidos y ausencia de payload crudo en logs. El rawPayload solo existe en el registro aceptado y comparte el TTL de 90 días.
- **Pérdida de auditoría:** el rol de aplicación no puede alterar ni borrar CloudTrail. U3 valida el control en el pipeline y la cuenta desplegada.

NFR6 (OIDC del pipeline) corresponde principalmente a U3; U1 entrega recursos que el pipeline desplegará sin credenciales persistentes. No se inventa un marco regulatorio específico.
