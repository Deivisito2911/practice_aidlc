# Controles de entrega de telemetría

## Estado y alcance

GitHub Actions está seleccionado y los workflows están versionados, sin ejecución remota verificada. Cada stack de aplicación contiene una Lambda, dos tablas DynamoDB, API Gateway REST, EventBridge y SQS únicamente de alertas. `TelemetryAudit` define un solo CloudTrail multirregión y su archivo KMS protegido para la cuenta compartida de staging y producción. Proveedor y roles OIDC, protección de `main`, staging automático y aprobación de producción siguen **pendientes de aprovisionamiento o verificación externa**.

La validación de pull requests, incluidos forks, no recibe credenciales AWS. No se almacenan claves persistentes en repositorio, variables, cachés, logs ni artefactos. Los roles distintos para staging, producción y auditoría siguen siendo requisito; una sesión SSO administradora local no demuestra esa separación para el pipeline.

## Comprobaciones obligatorias

Antes de integrar, deben pasar instalación reproducible, formato, lint, tipos, unitarias, integración AWS simulada, auditorías de producción y árbol completo, secretos, build y síntesis:

```text
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration -- tests/integration/telemetry-flow.test.ts
npx vitest run infra/telemetry-stack-delivery-controls.test.ts infra/telemetry-stack.test.ts infra/telemetry-stack-operations.test.ts
npm run audit:deps
npm audit --audit-level=high
npm run build
npm run cdk:synth
npm run cdk:synth:audit
gitleaks dir --config .gitleaks.toml --redact=100 --exit-code 1 <proyección-aplicación-con-dist-y-cdk.out>
gitleaks git --config .gitleaks.toml --redact=100 --exit-code 1 --log-opts=--all .
```

Gitleaks v8.30.1 se obtiene de la distribución oficial, con SHA256 y versión comprobados. `.gitleaks.toml` extiende las reglas incorporadas (`useDefault = true`), sin baseline ni reglas deshabilitadas. Su única excepción combina la ruta de los JSON generados por CDK con el *match* `S3Key`/`objectKey` cuyo valor es un SHA256 hexadecimal seguido de `.zip`; no excluye archivos, líneas completas ni otros campos. La proyección enumera cada archivo y hash, incluye fuentes/configuración/documentación y artefactos recién generados; excluye dependencias de terceros y metadatos AI-DLC. El historial cubre todos los commits disponibles y declara si el clon es superficial. Un fixture limpio exige exit 0; los fixtures sintéticos AWS y genéricos deben ser detectados (exit 1) también dentro de esos JSON. Un hallazgo, error, herramienta ausente o escaneo incompleto bloquea.

`npm run test:unit` no descubre `infra/`; por ello las pruebas CDK se ejecutan de forma explícita. La verificación local de estos comandos no acredita que GitHub Actions ya los ejecute ni que los checks sean obligatorios en `main`.

## OIDC y promoción

Antes de activar acceso AWS se verifican identificador del repositorio, formato real del subject, audiencia, issuer, cuentas AWS, regiones y entornos protegidos. El subject puede usar IDs inmutables; no inventar valores. Con un entorno GitHub, el subject identifica el entorno; las ramas/tags autorizadas se restringen mediante reglas de despliegue del entorno, sin suponer que el mismo subject contiene la rama.

main exige revisión y todos los checks verdes; únicamente squash mediante pull request. Fallos u omisiones bloquean integración. Staging recibe el commit y artefacto inmutable validados. Producción requiere aprobación humana independiente y el mismo digest de staging, sin reconstrucción. Se prueban negativas de otro repositorio, fork, PR, referencia o entorno no autorizado.

Los roles temporales OIDC aplican audiencia/subject exactos y duración STS mínima compatible. La validación no obtiene rol AWS. El rol de despliegue de aplicación tampoco puede alterar/borrar auditoría de forma directa ni indirecta mediante CloudFormation, PassRole o una plantilla modificada. Bootstrap y cambios de auditoría pertenecen al responsable de auditoría; provisioning debe demostrar esa separación efectiva.

## Auditoría y límites de evidencia

Las assertions CDK comprueban que los stacks de aplicación no contienen CloudTrail ni bucket de auditoría, y que `TelemetryAudit` enlaza trail/bucket/KMS, TLS, versionado y Object Lock COMPLIANCE de al menos 90 días. La política KMS habilita GenerateDataKey* al principal CloudTrail con SourceArn exacto y contexto de cifrado; DescribeKey usa SourceArn y omite contexto. Un ARN calculado evita dependencias circulares. El nombre determinista `telemetry-audit` requiere comprobar colisiones y continuidad antes de desplegar.

Síntesis y pruebas no acreditan logs recibidos, retención real, bloqueo GitHub, OIDC activo ni promociones reales. En la cuenta se verifican estado/entrega CloudTrail, identidad, acción, recurso y fecha de eventos administrativos reales, cifrado y permisos negativos de aplicación/despliegue, incluidos caminos CloudFormation/PassRole. Registrar solo IDs y metadatos necesarios, sin secretos o payloads ajenos.

Carga p95, persistencia temporal y disponibilidad de un mes calendario permanecen Unverified hasta mediciones desplegadas U1/U2. Costes dependen de región, volumen, retención y runner reales; no hay total aprobado. No hubo despliegue, merge ni commit en la validación local.

## Fuentes

- Diseño U3: aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u3-delivery-controls/nfr-design/security-design.md.
- [Gitleaks v8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) y [uso fijado](https://github.com/gitleaks/gitleaks/blob/v8.30.1/README.md).
- [AWS política KMS CloudTrail](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/create-kms-key-policy-for-cloudtrail.html).
