# Diseño de seguridad — U2

## Autorización de recuperación

La CLI usa credenciales temporales de una sesión/rol operativo P3. Un permiso IAM explícito `lambda:InvokeFunction` sobre el ARN de la única Lambda autoriza la invocación síncrona del caso de uso operacional; el handler acepta esa forma únicamente con el contexto de operación y correlación esperados. La política no permite `dynamodb:*`, `sqs:*`, cambios CDK ni administración de API Gateway. La invocación no se publica en el endpoint de productores y la clave API nunca habilita recuperación.

Esta sección implementa **NFR5.6, NFR5.7, NFR5.8 y NFR10.3**.

Flujo de confianza:

1. La identidad del operador obtiene la sesión P3 por el proveedor corporativo ya configurado.
2. IAM decide si esa identidad puede invocar el caso operacional sobre la función exacta.
3. TelemetryService valida forma, alcance y límite. Emite un sobre canónico versionado con IDs ordenados únicos, alcance, límite, identificador de preview y tiempos de emisión/vencimiento. Calcula su digest SHA-256 y lo autentica con una clave KMS HMAC_256 mediante GenerateMac/HMAC_SHA_256; la clave nunca se exporta. Al ejecutar verifica el MAC con VerifyMac y la clave configurada, el digest y la vigencia antes de consultar/recomparar candidatos. El cliente no puede alterar límite, tiempos ni conjunto y reutilizar una firma anterior. Un fallo KMS rechaza sin efectos.
4. El servicio procesa Outbox usando reclamación condicional y actualiza estado solo después de confirmación SQS.
5. Logs registran operación, confirmación, correlación, awsRequestId de Context y resumen. La CLI conserva también el requestId de la respuesta del API Invoke. La identidad efectiva se consulta en los eventos de datos Invoke de CloudTrail habilitados solo para la función; no se extrae de actor del payload ni se presume disponible en Context. El enlace entre ambos IDs y la auditoría se comprueba en staging sin asumir que todos los identificadores son iguales. Ningún registro imprime credenciales, MAC ni datos crudos.

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

## Refinamiento de F6

GenerateMac recibe el digest de 32 bytes, no la lista de IDs, para respetar el límite de mensaje de 4096 bytes. Solo Lambda puede GenerateMac/VerifyMac sobre la clave configurada; el rol CLI no tiene acceso KMS directo. La clave HMAC requiere rotación manual; se conservan claves previas únicamente durante la vigencia máxima de previews emitidas antes de retirarlas. Infrastructure Design fija vigencia y permisos; Code Generation prueba digest/MAC inválido, alteración de cada campo, expiración y repetición sin nuevas salidas.

Fuentes técnicas: [AWS KMS HMAC](https://docs.aws.amazon.com/kms/latest/developerguide/hmac.html), [CloudTrail para Lambda](https://docs.aws.amazon.com/lambda/latest/dg/logging-using-cloudtrail.html) y [Context de Node.js](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-context.html). La documentación acredita mecanismos; el comportamiento desplegado sigue pendiente de evidencia.
