# Seguridad y controles de entrega

## Verificaciones locales

Ejecutar npm run audit:deps (umbral high, producción según script aprobado), lint, tipos y todas las pruebas CDK del inventario. Ejecutar Gitleaks v8.30.1 obtenido de su release oficial y verificar SHA256 contra checksums.txt antes de ejecutarlo: gitleaks detect --source . --redact (historial) y gitleaks dir . --redact (árbol actual). Capturar solo salida redactada, nunca tokens. Los informes pueden contener rutas sensibles y se conservan restringidos a esta revisión.

## Fronteras externas

CI Pipeline debe implementar GitHub Actions, checks obligatorios, revisión/squash y test negativo de PR fallido. deployment-pipeline/environment-provisioning/deployment-execution verifican OIDC repo/ref/environment/audience, sesiones temporales, roles separados, aprobación producción y mismo digest. Verificar CloudTrail mediante creación/cambio/eliminación autorizados con identidad, acción, recurso y fecha. Solo síntesis local disponible aquí; no inferir aplicación real.

## Casos IAM y alarmas

Comprobar que Lambda puede Query de ambos GSI necesarios y que alarmas usan exactamente Namespace/Dimensions/Units emitidos. Probar actor P3 válido e identidad no autorizada en cuenta preparada, sin permisos para datos o auditoría. Activar cada alarma y verificar canal de guardia real en observability-setup.

## Fuentes

- https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1
- construction/u3-delivery-controls/nfr-requirements/security-requirements.md y nfr-design/security-design.md
- construction/u1-telemetry-core/nfr-requirements/security-requirements.md
- construction/u2-telemetry-operations/nfr-requirements/security-requirements.md
