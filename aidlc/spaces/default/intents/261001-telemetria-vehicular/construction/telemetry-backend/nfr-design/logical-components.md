# Componentes lógicos e aislamiento

| Componente | Responsabilidad | Dominio de fallo | Dependencias |
|---|---|---|---|
| Borde de ingreso | Clave API, límites, validación, acceptedAt, correlación y respuesta 202. | Una solicitud HTTP; fallos de SQS producen error sin falso 202. | API Gateway, SQS de entrada. |
| Cola de entrada | Amortiguar tráfico y reintentos; entregar al menos una vez. | Mensaje o lote; DLQ a cinco recepciones. | KMS, Lambda procesadora. |
| Procesador de telemetría | Validar mensaje, persistir idempotentemente y crear salida atómica. | Mensaje; respuesta parcial aísla fallos. | SQS de entrada, DynamoDB. |
| Almacén de evento y salida | Conservar rawPayload, metadatos y estados PENDING/PUBLISHED. | Escritura transaccional; no hay estado evento-sin-salida. | DynamoDB, KMS. |
| Publicador de alertas | Recuperar PENDING, publicar con alertId estable y marcar PUBLISHED. | Una salida; el fallo no elimina intención. | DynamoDB, SQS de alertas. |
| Observabilidad y auditoría | Correlación, métricas, alarmas y cambios administrativos. | Independiente del procesamiento; no contiene secretos ni payload crudo. | CloudWatch, CloudTrail, KMS. |

## Flujo y límites

API Gateway → SQS entrada → Lambda procesadora → DynamoDB evento/salida → publicador → SQS alertas. El contrato externo de alertas requiere deduplicación por alertId. La cola separa la disponibilidad del productor de la del procesador; la salida separa la transacción de persistencia de la publicación. CDK define todos los recursos y permisos, con topología común para staging y producción.
