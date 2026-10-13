# Pipeline y promoción de U1

U1 entrega una Lambda, CDK y la prueba integrada; U3 implementa la protección completa de CI y promoción. Este diseño define el contrato que U3 deberá consumir, sin asumir que la cuenta AWS u OIDC ya estén configurados.

| Stage | Gate/evidence |
|---|---|
| Preparar | Instalar dependencias desde lockfile, compilar TypeScript y generar artefacto Lambda inmutable por commit. |
| Calidad | Prettier, ESLint, tipos y pruebas unitarias test-after; cualquier fallo bloquea la integración. |
| Integración | Ejecutar la prueba crítica con AWS simulado: 400 sin efectos, 202 tras transacción, valor 20 sin alerta, batería baja con Outbox, fallo SQS que deja PENDING y EventBridge que recupera con alertId estable. |
| Seguridad | Analizar dependencias, secretos y plantilla CDK; rechazar credenciales persistentes, permisos comodín innecesarios y SQS/DLQ de ingreso. |
| Revisión | Pull request desde rama corta; checks verdes y revisión requerida; fusión squash a main. |
| Staging | Tras fusionar main, desplegar automáticamente el mismo artefacto y CDK con rol temporal OIDC; ejecutar prueba de humo y medir el perfil real. |
| Producción | Promoción de artefacto aprobado con aprobación manual previa, sin reconstruirlo ni introducir nuevos recursos de ingreso. |

## Reversión

Si falla la prueba de humo o alarma crítica, revertir alias/versión de Lambda a una versión compatible y restablecer la plantilla anterior sin destruir tablas, claves o Outbox PENDING. Verificar que la regla EventBridge sigue invocando la misma Lambda y que los PENDING vuelven a publicarse. Cambios incompatibles de esquema requieren migración/versionado y no se incluyen en U1.

## Secretos y credenciales

CI accede a AWS exclusivamente con rol temporal OIDC; no conserva claves AWS persistentes. La clave de API de productores se gestiona fuera del repositorio y no se imprime en logs ni salidas CI. Los identificadores de cuenta y región son parámetros de entorno; la promoción a staging queda pendiente de confirmar permisos y cuenta.
