# Preguntas de diseño no funcional — U3

## Decisiones y ambigüedades

No quedan decisiones arquitectónicas bloqueantes. El proveedor de repositorio/CI y su proveedor OIDC siguen sin confirmarse en el mapa de dependencias, así que el diseño define capacidades y límites provider-neutral y deja la sintaxis concreta del workflow para cuando se conozca la plataforma.

## Supuestos y preguntas abiertas

- La plataforma elegida debe admitir protección de rama, validaciones obligatorias, federación OIDC con AWS y aprobación de entorno para producción. Si alguna capacidad no está disponible, se debe elegir una plataforma compatible antes de implementar el pipeline.
- La cuenta AWS de destino debe tener CloudTrail de organización o de cuenta configurado con almacén de logs protegido y retención mínima de 90 días. La síntesis local de CDK solo comprueba configuración declarada; no prueba que existan eventos reales en la cuenta.

## Sources

- `inception/delivery-planning/external-dependency-map.md` (proveedor de repositorio/OIDC por confirmar)
- `construction/u3-delivery-controls/nfr-requirements/security-requirements.md`
- `construction/u3-delivery-controls/nfr-requirements/tech-stack-decisions.md`
- `inception/contract-design/contract-summary.md` (C4 y C5)
