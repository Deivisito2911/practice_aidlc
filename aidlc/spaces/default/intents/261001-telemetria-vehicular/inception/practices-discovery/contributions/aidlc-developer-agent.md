**Collaborator:** aidlc-developer-agent

## Contribution

Los borradores definen correctamente el flujo mínimo API REST → SQS de entrada → Lambda → DynamoDB y la alerta por batería inferior al 20 %, pero aún no establecen convenciones de implementación que puedan aplicarse de forma uniforme. Para que la futura construcción sea mantenible, la entrevista debe confirmar lo siguiente:

- **Nombres y contrato:** decidir el idioma y estilo de identificadores; proponer `vehicleId`, `eventType`, `timestamp` y `value` para el contrato JSON, rutas REST con sustantivos plurales y kebab-case, y códigos de error estables. Debe definirse también si el evento `bateria` usa porcentaje numérico y su rango permitido.
- **Separación de capas:** mantener el handler REST limitado a autenticación, parseo, validación y mapeo HTTP; aislar la lógica de negocio —incluida la regla `bateria < 20`— en un caso de uso/servicio; encapsular SQS y DynamoDB tras adaptadores o repositorios. El consumidor Lambda debe repetir la validación de mensajes como frontera de confianza y no depender exclusivamente de la validación HTTP.
- **Errores y reintentos:** diferenciar errores de entrada (respuesta 400 con sobre de error y detalle por campo) de fallos transitorios de infraestructura. Definir reintentos acotados para DynamoDB, política de visibilidad de SQS, cola de mensajes no procesables (DLQ), registro estructurado con `requestId` o identificador de correlación, e idempotencia para evitar persistencias y alertas duplicadas tras reintentos.
- **Organización de archivos:** elegir lenguaje y herramienta IaC antes de fijar nombres concretos. Se recomienda agrupar por la capacidad de telemetría: contrato/modelo de evento, validación, caso de uso de ingestión, adaptadores SQS/DynamoDB, handlers API/Lambda e infraestructura; colocar pruebas junto al código o en una estructura espejo coherente. Evitar un directorio global por capa que disperse el cambio de una misma capacidad.
- **Estilo y pruebas:** adoptar formateador y linter obligatorios en CI, funciones pequeñas y de responsabilidad única, validación en límites y logging JSON sin datos sensibles. La postura propuesta `test-after` debe concretar pruebas unitarias de validación y regla de alerta, integración de publicación/consumo/persistencia y casos de reintento, error y duplicado.

## Positions

- AGREE: La rebanada integrada inicial propuesta —evento REST válido, SQS, Lambda y DynamoDB— es una base adecuada para validar la separación de responsabilidades y el recorrido principal en un proyecto greenfield.
- AGREE: Tratar las convenciones de ramas, estilo, lenguaje, pruebas y despliegue como propuestas pendientes evita presentar recomendaciones organizacionales como prácticas ya acordadas.
- AGREE: La respuesta Bad Request para solicitudes inválidas y los reintentos ante fallos de DynamoDB son restricciones que deben preservarse en el contrato y en las pruebas.
- OBJECT: None
