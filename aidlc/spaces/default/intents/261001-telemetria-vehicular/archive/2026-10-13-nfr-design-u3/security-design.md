# Diseño de seguridad y controles de entrega — U3

## Límites de confianza y flujo de cambios

El proveedor CI inicia un trabajo de validación para cada pull request. Ese trabajo no recibe credenciales AWS. Tras la revisión obligatoria y la aprobación de las comprobaciones, la integración por *squash* a `main` puede iniciar la promoción a *staging*. La federación OIDC entrega credenciales temporales únicamente al trabajo de despliegue autorizado. La promoción a producción es un trabajo separado, protegido por aprobación humana del entorno y por un rol distinto.

La identidad OIDC debe restringir `audience`, repositorio, referencia y entorno. Los trabajos de pull request, ramas no protegidas y forks no pueden asumir roles de despliegue. El proveedor del repositorio permanece sin seleccionar; el adaptador concreto deberá demostrar estas restricciones antes de habilitar despliegues.

## NFR6 — Identidad de CI/CD y privilegios

| ID | Diseño verificable |
|---|---|
| NFR6.1 | Configurar una relación de confianza OIDC por repositorio y entorno. El rol de validación solo permite leer artefactos necesarios; el rol de *staging* solo permite desplegar el stack de la aplicación a la cuenta/entorno de staging; el rol de producción solo se asume desde el entorno protegido tras aprobación. Rechazar tokens cuyo sujeto no coincida exactamente con repositorio, rama/tag y entorno autorizados. |
| NFR6.2 | No crear secretos AWS persistentes. Intercambiar el token OIDC por sesión STS con duración mínima compatible con la tarea; no imprimir tokens, credenciales ni variables sensibles. Deshabilitar persistencia de credenciales en cachés y artefactos, y enmascarar los valores temporales del entorno de ejecución. |
| NFR6.3 | Separar roles de validación, despliegue a staging y producción. El rol de aplicación de Lambda queda fuera de esos roles y solo conserva permisos de ejecución sobre sus recursos. La promoción de producción requiere aprobación humana explícita y no comparte las credenciales ni el trabajo que construyó el artefacto. |

## NFR8 — Puertas de calidad

El pipeline ejecuta en el orden siguiente y bloquea la integración si falla cualquier control:

| ID | Diseño verificable |
|---|---|
| NFR8.1 | Instalar dependencias desde el lockfile y ejecutar formato, ESLint y `npm run typecheck`. |
| NFR8.2 | Ejecutar `npm run test:unit` y la integración crítica `npm run test:integration -- tests/integration/telemetry-flow.test.ts` con AWS simulado. |
| NFR8.3 | Ejecutar `npm run audit:deps` y análisis de secretos sobre el cambio y el historial incluido en el pull request. Una credencial detectada o vulnerabilidad por encima del umbral acordado bloquea integración; las excepciones requieren registro y responsable antes de reanudar. |
| NFR8.4 | Proteger `main`: exigir revisión aprobada y todos los checks verdes, permitir solo fusión *squash* y bloquear el despliegue a staging hasta completar esas condiciones. El workflow de producción exige su propia aprobación. |

El artefacto que se promueve a producción debe ser el mismo artefacto inmutable que superó validación y se desplegó a staging, identificado por digest. No reconstruirlo durante la promoción. La configuración final de protección de rama depende del proveedor aún no confirmado.

## NFR5 y NFR9 — Infraestructura y cifrado

| ID | Diseño verificable |
|---|---|
| NFR5.1 | Mantener roles de pipeline separados de los roles de aplicación y limitar cada política IAM a acciones y recursos del entorno correspondiente. Ningún rol de aplicación puede administrar CloudTrail, sus logs o su bucket. |
| NFR5.2 | Mantener KMS para datos y registros, TLS en los límites de servicio y la topología contractual: API Gateway REST, una Lambda, dos tablas DynamoDB, EventBridge y SQS de alertas. No añadir SQS de entrada ni DLQ de ingreso. |
| NFR5.3 | Revisar en cada cambio de CDK las políticas IAM, cifrado, confianza OIDC y límites de recursos; usar la síntesis como evidencia estática y bloquear cualquier ampliación no revisada de privilegios. |
| NFR9.1 | Versionar la infraestructura en TypeScript/AWS CDK. Sintetizar el mismo commit en CI y desplegar a staging sin pasos manuales ocultos; guardar el digest del artefacto y el resultado de síntesis con la ejecución. |
| NFR9.2 | El stack de U3 empaqueta el mismo servicio y conserva el conjunto de recursos acordado. No crear otra Lambda de telemetría ni cambiar las responsabilidades de API, EventBridge o SQS. |

## NFR10 — Auditoría protegida

| ID | Diseño verificable |
|---|---|
| NFR10.1 | Configurar CloudTrail para registrar operaciones administrativas de API Gateway, Lambda, SQS, DynamoDB, KMS, IAM y CloudFormation de la solución, incluyendo identidad, operación, recurso y hora. En la verificación de cuenta, consultar eventos reales de administración posteriores al despliegue. |
| NFR10.2 | Enviar los logs a almacenamiento cifrado con KMS, retención mínima de 90 días y controles que impidan su borrado antes del vencimiento. |
| NFR10.3 | Restringir la administración del trail y del destino de logs a un rol de auditoría separado; denegar a los roles de aplicación y despliegue de la app detener/modificar el trail o eliminar sus evidencias. |
| NFR10.4 | Añadir una comprobación de política/configuración en revisión CDK y una lista de verificación operativa para verificar eventos reales en la cuenta AWS. Marcar la síntesis CDK como evidencia estática, nunca como prueba de actividad CloudTrail. |

## Supuestos y límites

- El proveedor de repositorio/CI y su OIDC no están identificados; las condiciones de confianza se parametrizan para la plataforma que el equipo confirme.
- La cuenta AWS debe ofrecer un CloudTrail protegido y almacenamiento de logs con KMS. La existencia y entrega de eventos reales requiere verificación en la cuenta.
- El diseño cubre controles de entrega y despliegue. Los presupuestos de latencia, disponibilidad, escalado, TTL, métricas de ejecución y recuperación Outbox pertenecen a U1/U2 y quedan fuera del alcance de U3.

## Fuentes

- `construction/u3-delivery-controls/nfr-requirements/security-requirements.md` (NFR5, NFR6, NFR8, NFR9, NFR10)
- `construction/u3-delivery-controls/nfr-requirements/tech-stack-decisions.md` (TypeScript, npm, CDK y OIDC)
- `construction/u3-delivery-controls/nfr-requirements/nfr-requirements-questions.md` (dependencia externa del proveedor)
- `inception/contract-design/contract-summary.md` (C4–C5, artefacto compartido y topología)
- `construction/u1-telemetry-core/functional-design/functional-spec.md` (comportamiento integrado conservado)
- `construction/u1-telemetry-core/functional-design/rules.md` (invariantes de seguridad y topología)
