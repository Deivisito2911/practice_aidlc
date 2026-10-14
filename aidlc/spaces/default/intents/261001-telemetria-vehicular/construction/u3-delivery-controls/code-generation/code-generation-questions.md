# Preguntas de generación de código — U3 Controles de entrega

## Decisiones y dependencias vigentes

Se conserva GitHub Actions como proveedor elegido. Este intento corrige F1 mediante actualización dirigida a aws-cdk-lib 2.273.0, verificación reproducible y evidencia local de Gitleaks v8.30.1. F7 exige separar pruebas locales y controles externos pendientes. El plan anterior está archivado; su aprobación no cubre este nuevo intento.

La identidad del repositorio, cuentas AWS, sujetos OIDC y reglas efectivas de ramas/entornos se concretarán antes de activar CI/despliegues. Su ausencia mantiene controles Deferred/Unverified.

## Plan Approval

¿Apruebas el plan de U3, su Testing Contract y las instrucciones de pruebas para corregir F1 y verificar los controles locales de entrega?

- Approve Plan — ejecutar los ocho pasos.
- Request Changes — revisar el plan antes de generar código.

[Approval Fingerprint]: sha256:v3:680fee863549f070e2ca314614daf2abd73f4220626abeeb27d6e3abe4cd1449
[Planned Source]: 96aab4a03f364add36ec4afe164795bc976395c14fe106f4f833c8b7c94d0afb
[Answer]: Approve Plan

## CI platform for the following pipeline stage

Decisión humana conservada del intento anterior: GitHub Actions. El cambio de plan no modifica esa elección.

[Answer]: GitHub Actions
