**Collaborator:** aidlc-devsecops-agent

## Contribution

### Hallazgos

- El borrador de desarrollo basado en tronco, ramas cortas, *squash merge* a `main`, despliegue a *staging* tras la fusión y aprobación humana antes de producción es una base adecuada, pero aún no define controles verificables para permitir una fusión o promoción.
- La decisión de herramientas de formato y *lint* está pendiente. El equipo debe seleccionar formatter y linter según el lenguaje, ejecutarlos localmente y en CI, y decidir si ambos bloquean la fusión. Las configuraciones y versiones deben quedar versionadas y las dependencias fijadas mediante archivo de bloqueo.
- Faltan controles de análisis estático y de infraestructura: SAST en cada PR, análisis de IaC antes del despliegue, y umbrales explícitos. Se recomienda bloquear la fusión por hallazgos Critical/High sin excepción vigente, conservar hallazgos Medium como advertencias rastreables y exigir excepciones justificadas, aprobadas y con fecha de expiración.
- Faltan escaneo de secretos y de dependencias. Deben ejecutarse detección de secretos antes del *commit* y en CI —incluido el historial en la incorporación inicial—, escaneo de CVE de dependencias y transitivas en cada compilación, generación de SBOM y un proceso de rotación/revocación inmediata si se detecta una credencial. Los secretos deben residir en AWS Secrets Manager o SSM Parameter Store, nunca en código, archivos `.env` versionados ni variables de CI expuestas.
- DAST debe ejecutarse solamente contra *staging* o entornos efímeros con datos de prueba, después del despliegue y antes de la promoción. Debe cubrir autenticación, validación de esquema, límites de tamaño/rango, respuestas de error y abuso de la API; las vulnerabilidades High/Critical sin mitigación deben impedir producción.
- Para la cadena de suministro y AWS, el pipeline debe usar roles temporales mediante OIDC en lugar de claves AWS persistentes, permisos IAM de mínimo privilegio separados por entorno, acciones/dependencias de CI fijadas a revisiones verificables, artefactos inmutables y firmados, y trazabilidad de la versión desplegada. Deben habilitarse CloudTrail, registros estructurados sin `vehicleId` completo ni otros datos sensibles, cifrado KMS para DynamoDB y SQS, TLS en tránsito, y alarmas de fallo de Lambda, edad/profundidad de cola, mensajes en DLQ y errores de DynamoDB.
- La API pública y el flujo asíncrono requieren decisiones de seguridad operativa todavía ausentes: autenticación/autorización de productores, API Gateway con limitación de tasa y, si queda expuesta a Internet, WAF; validación estricta de `vehicleId`, `tipo`, `timestamp` y `valor`; idempotencia para reintentos y entregas duplicadas de SQS; DLQ y política de redrive; y una alerta de batería que no filtre identificadores ni contenido sensible.

### Preocupaciones y decisiones para confirmar durante la entrevista

1. Lenguaje, paquete de formato/lint y severidades que bloquean el PR; confirmar si el incumplimiento de formato es bloqueante.
2. Herramientas SAST, DAST, SCA, escaneo de secretos e IaC, sus umbrales, propietarios de las excepciones y vencimiento máximo de las dispensas.
3. Plataforma de CI/CD, protección de `main`, revisiones requeridas, comprobaciones obligatorias, estrategia de firma/procedencia y custodia/retención de SBOM.
4. Autenticación de la API y modelo de autorización por productor/vehículo; límites de tasa/cuotas, uso de WAF y política de CORS si aplica.
5. Esquema versionado y límites concretos de cada campo, tolerancia de reloj, política de idempotencia y comportamiento ante eventos duplicados o fuera de orden.
6. Reintentos de Lambda/DynamoDB, configuración de visibilidad SQS, DLQ/redrive, límite de reintentos, alertas, runbook y propiedad operativa de los mensajes fallidos.
7. Cuentas y entornos AWS, regiones, separación de roles IAM, claves KMS, retención de logs/auditoría, clasificación y minimización de datos de telemetría.
8. Estrategia de promoción y reversión de Lambda, criterios y umbrales cuantificados para detener o revertir, y los responsables de la aprobación de producción.

## Positions

AGREE: La propuesta de ramas cortas, fusión *squash* a `main`, despliegue automático a *staging* y aprobación manual para producción es adecuada como base, siempre que se complemente con comprobaciones obligatorias y una reversión definida.

AGREE: Adoptar formatter, linter y convenciones idiomáticas del lenguaje seleccionado es correcto, pero su configuración y el modo de fallo deben afirmarse antes de implementación.

OBJECT: No debe afirmarse la práctica de CI/CD sin controles explícitos de SAST, DAST en *staging*, SCA, detección de secretos, escaneo de IaC y criterios de bloqueo/excepción.

OBJECT: No debe afirmarse el despliegue AWS sin decidir identidad de la API, roles temporales OIDC, privilegio mínimo, cifrado KMS, auditoría, observabilidad, DLQ/reintentos e idempotencia.
