# Diseño de seguridad — U2

## Autorización de recuperación

La CLI usa credenciales temporales de una sesión/rol operativo P3. Un permiso IAM explícito `lambda:InvokeFunction` sobre el ARN de la única Lambda autoriza la invocación síncrona del caso de uso operacional; el handler acepta esa forma únicamente con el contexto de operación y correlación esperados. La política no permite `dynamodb:*`, `sqs:*`, cambios CDK ni administración de API Gateway. La invocación no se publica en el endpoint de productores y la clave API nunca habilita recuperación.

Esta sección implementa **NFR5.6, NFR5.7, NFR5.8 y NFR10.3**.

Flujo de confianza:

1. La identidad del operador obtiene la sesión P3 por el proveedor corporativo ya configurado.
2. IAM decide si esa identidad puede invocar el caso operacional sobre la función exacta.
3. TelemetryService valida la forma de solicitud, el alcance permitido y el límite configurado; en ejecución vuelve a obtener el conjunto y compara su huella con la preview confirmada.
4. El servicio procesa Outbox usando reclamación condicional y actualiza estado solo después de confirmación SQS.
5. Logs/auditoría registran actor efectivo, operación, confirmación, correlación y resumen, sin credenciales ni datos crudos.

## Protección y amenazas

| Amenaza | Control de diseño | Evidencia esperada |
|---|---|---|
| Actor no autorizado o uso de clave de productor | IAM de rol P3 sobre solo InvokeFunction de la Lambda; denegación antes de procesar candidatos. | Pruebas de actor válido/no autorizado. |
| Confusión de preview o ejecución sobre candidatos distintos | Preview muestra alcance, IDs/cantidad/límite; ejecución recalcula y compara huella; cualquier diferencia exige preview y confirmación nuevas. | Alterar el conjunto entre operaciones y demostrar rechazo sin cambios. |
| Exposición de secreto/payload | La respuesta CLI expone identificadores y conteos mínimos; los registros nunca serializan headers de clave ni payload crudo. | Prueba de salida/log con búsqueda de secretos. |
| Repetición, carrera o resultado incierto | Reutilizar alertId, reclamación condicional, estado PENDING hasta confirmación, y registro de resultado incierto. | Pruebas concurrentes y de fallo parcial. |
| Manipulación de auditoría funcional | Logs de aplicación y CloudTrail protegidos según baseline; rol de aplicación sin permiso para borrar trail/logs. | Prueba IAM negativa e inspección de eventos de invocación. |

Los datos persistidos mantienen KMS/TLS y los permisos mínimos de U1. La autorización IAM y la autorización funcional P3 se verifican en sus respectivas fronteras. No se afirma certificación regulatoria no identificada.

## Fuentes

`nfr-requirements/security-requirements.md`, `nfr-requirements/tech-stack-decisions.md`, `functional-design/entities.md`, `functional-design/rules.md`, `functional-design/functional-spec.md` y `inception/contract-design/contract-summary.md`.
