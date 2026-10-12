# Restricciones duras descubiertas

## Mandated

- ALWAYS trabajar con desarrollo basado en tronco mediante ramas de corta duración.
- ALWAYS someter cada cambio a *pull request* y fusionarlo mediante *squash* a `main`.
- ALWAYS construir primero una rebanada integrada que recorra API REST, SQS de entrada, Lambda, DynamoDB y la SQS de alertas de batería.
- ALWAYS aplicar la metodología `test-after`, con pruebas unitarias por capa y una prueba de integración crítica con servicios AWS simulados.
- ALWAYS ejecutar en CI formato, *lint*, comprobación de tipos, pruebas y análisis de dependencias y secretos antes de integrar cambios.
- ALWAYS desplegar automáticamente a *staging* después de fusionar a `main` y exigir aprobación manual para producción.
- ALWAYS definir la infraestructura como código mediante AWS CDK y autenticar el pipeline en AWS con roles temporales OIDC.
- ALWAYS aplicar IAM de mínimo privilegio, cifrado KMS, auditoría CloudTrail, alarmas, DLQ y un plan de reversión.
- ALWAYS implementar en TypeScript, usar identificadores en inglés y aplicar Prettier y ESLint.

## Forbidden

- NEVER integrar cambios directamente en `main` sin *pull request* ni fusión *squash*.
- NEVER promover un despliegue a producción sin aprobación manual.
- NEVER usar credenciales AWS persistentes en CI cuando el acceso debe realizarse mediante roles temporales OIDC.
- NEVER integrar cambios si fallan las comprobaciones obligatorias de formato, *lint*, tipos, pruebas, dependencias o secretos.
- NEVER excluir de la primera rebanada integrada la generación de alertas para valores de batería inferiores al 20 %.