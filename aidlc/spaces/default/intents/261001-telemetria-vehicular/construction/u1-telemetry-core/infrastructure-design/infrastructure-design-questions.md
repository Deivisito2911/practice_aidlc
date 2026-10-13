# Preguntas de infraestructura — U1

No se abre una pregunta nueva: API Gateway REST, una Lambda, dos tablas DynamoDB, EventBridge, SQS solo de alertas, KMS, CloudTrail, TypeScript y CDK ya están decididos. La cuenta, región y permisos OIDC están registrados como preparación externa desconocida; la plantilla usa parámetros de entorno y su despliegue real quedará condicionado a una cuenta preparada.

## Análisis de ambigüedad

La falta de datos de cuenta no cambia la topología y no autoriza inventar identificadores AWS. Frecuencia, lote, arrendamiento y umbrales son configuraciones técnicas que se fijan en el diseño y se ajustan con las pruebas de staging sin alterar los contratos aprobados.
