# Decisiones de tecnología

| ID | Selección | Razón y comprobación |
|---|---|---|
| NFR9.2 | TypeScript para aplicación y AWS CDK para infraestructura. | Práctica afirmada por el equipo y despliegue reproducible en staging. |
| NFR9.3 | API Gateway, SQS estándar de entrada, Lambda y DynamoDB. | Satisfacen el recorrido requerido de aceptación rápida, desacoplamiento y persistencia; prueba integrada del flujo. |
| NFR7.8 | Registro de salida duradero en DynamoDB y publicación recuperable en SQS de alertas. | Evita perder una alerta lógica entre persistencia y publicación; conserva alertId estable. |
| NFR8.1 | Prettier, ESLint, comprobación de tipos, pruebas unitarias y prueba integrada con servicios AWS simulados. | CI bloquea la integración ante fallo. |
| NFR8.2 | Escaneos de dependencias y secretos en CI; roles AWS temporales OIDC. | La revisión de PR bloquea fallos y no contiene claves persistentes. |
| NFR10.3 | CloudTrail y KMS definidos mediante CDK. | Auditoría y cifrado reproducibles con acceso mínimo. |

No se selecciona un framework de aplicación ni un simulador AWS concreto en esta etapa; Code Generation escogerá herramientas compatibles con la prueba crítica. Las elecciones preservan el contrato HTTP, el payload original y la alerta lógica acordados.
