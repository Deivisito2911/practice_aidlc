# Seguridad y controles de entrega

## Verificaciones locales

Ejecutar `npm run audit:deps` (producción), `npm audit --audit-level=high` (árbol completo), lint, tipos y las pruebas CDK del inventario. Usar Gitleaks v8.30.1 oficial con SHA256 comprobado contra checksums.txt y la configuración versionada `.gitleaks.toml`: `gitleaks dir --config .gitleaks.toml --redact=100 --exit-code 1 <proyección-aplicación>` y `gitleaks git --config .gitleaks.toml --redact=100 --exit-code 1 --log-opts=--all .`. La proyección manifestada incluye fuente, pruebas, documentación, dist y cdk.out generados; excluye dependencias de terceros y metadatos internos. `construction/u3-delivery-controls/code-generation/evidence/scanner-final.json` conserva los escaneos completos y controles positivos/negativos tras el último cambio. Capturar solo salida redactada, nunca tokens.

## Fronteras externas

CI Pipeline debe implementar GitHub Actions, checks obligatorios, revisión/squash y test negativo de PR fallido. deployment-pipeline/environment-provisioning/deployment-execution verifican OIDC repo/ref/environment/audience, sesiones temporales, roles separados, aprobación producción y mismo digest. Verificar CloudTrail mediante creación/cambio/eliminación autorizados con identidad, acción, recurso y fecha. Solo síntesis local disponible aquí; no inferir aplicación real.

## Casos IAM y alarmas

Comprobar que Lambda puede Query de ambos GSI necesarios y que alarmas usan exactamente Namespace/Dimensions/Units emitidos. Probar actor P3 válido e identidad no autorizada en cuenta preparada, sin permisos para datos o auditoría. Activar cada alarma y verificar canal de guardia real en observability-setup.

## Fuentes

- https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1
- construction/u3-delivery-controls/nfr-requirements/security-requirements.md y nfr-design/security-design.md
- construction/u1-telemetry-core/nfr-requirements/security-requirements.md
- construction/u2-telemetry-operations/nfr-requirements/security-requirements.md
