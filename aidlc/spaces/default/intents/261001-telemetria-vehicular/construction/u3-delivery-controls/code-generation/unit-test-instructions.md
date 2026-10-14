# Instrucciones de pruebas — U3 Controles de entrega

## Ejecutor y configuración antes de la primera prueba

Vitest existente mediante vitest.config.ts, con assertions de aws-cdk-lib/assertions y síntesis CDK local. Step 2 confirma descubrimiento/configuración y ejecuta la línea base antes de nuevas pruebas. No requiere credenciales ni cuenta AWS. El contrato test-after exige implementar la capa comprobable y después escribir/ejecutar sus pruebas.

Comando exacto U3:

```text
npx vitest run infra/telemetry-stack-delivery-controls.test.ts
```

## Casos mínimos y alcance de la evidencia

Mantener/actualizar infra/telemetry-stack-delivery-controls.test.ts. Comprobar topología de una Lambda, dos tablas y una SQS; enlaces API Gateway/EventBridge a la misma función; trail y bucket relacionados; referencias efectivas a claves KMS, bloqueo público, TLS, versionado y Object Lock COMPLIANCE >=90 días; rol efectivo Lambda sin administración CloudTrail/borrado de auditoría ni acciones de despliegue. Incluir negativas cuando una omisión o referencia incorrecta podría pasar una assertion superficial.

La comprobación de docs/telemetry-delivery-controls.md solo verifica proveedor elegido y controles externos pendientes. No demuestra OIDC, protección de main, aprobación de producción ni retención real. Para cada AC/NFR que exige AWS/GitHub, conservar Deferred/Unverified y describir el mecanismo local por separado.

## Compatibilidad de CDK e integración compartida

Después de actualizar CDK y ejecutar U3:

```text
npx vitest run infra/telemetry-stack-delivery-controls.test.ts infra/telemetry-stack.test.ts infra/telemetry-stack-operations.test.ts
npm run test:integration -- tests/integration/telemetry-flow.test.ts
```

El primer comando acota U3 y dos dependencias CDK explícitas. El segundo verifica el contrato crítico compartido asignado a AC6.3.4. npm run test:unit no descubre infra; no es sustituto. La regresión transversal por actualización de biblioteca se realiza una vez en Step 7 del plan, sin repetirla por unidad.

## Datos, dobles y objetivos

Usar cuentas/ARN ficticios resueltos por CDK; SDK AWS simulado en la integración existente. Conservar datos inválidos sin efectos, transacción fallida sin éxito parcial, 202 después del commit y publicación fallida recuperable. No duplicar el negocio U1/U2 en pruebas de U3.

Workshop/minimal no fija cobertura porcentual; exige pruebas trazables en el nivel más acotado, caso feliz por componente y suite existente verde. No convertir controles externos en pruebas de texto que aparenten cumplimiento. No reducir umbrales o silenciar fallos.

## Evidencia del control de secretos

Step 5 usa Gitleaks v8.30.1 oficial con checksum verificado. Las comprobaciones del detector usan archivos temporales individuales ajenos al repositorio:

```text
gitleaks dir --redact=100 --exit-code 1 <archivo-limpio-U3>
gitleaks dir --redact=100 --exit-code 1 <archivo-sintético-U3>
```

Esperar exit 0 y exit 1 respectivamente; el segundo verifica detección, nunca constituye pase del escaneo de aplicación. No persistir credenciales reales, valores de hallazgos o archivos sintéticos en fuente. Los escaneos de fuente/historial del plan son controles separados; conservar alcance, redacción, exits y límites. Herramienta ausente/ejecución incompleta no equivale a verde.

## Clasificación acotada de identificadores CDK

La configuración .gitleaks.toml conserva reglas incorporadas y excluye únicamente matches de generic-api-key que representan S3Key/s3Key/objectKey con SHA256 hexadecimal de 64 caracteres y .zip, dentro de los JSON CDK de artefactos identificados. Ruta y match deben cumplirse conjuntamente; regexTarget es match, nunca line, para no ocultar otras credenciales en tree.json minificado. No hay baseline, archivos completos excluidos ni reglas deshabilitadas.

Después de implementar la configuración, comprobar con el binario fijado y --config explícito: identificador CDK legítimo exit 0; credencial AWS sintética exit 1; secreto genérico sintético en cada namespace de artefacto exit 1; valor hexadecimal de credencial sin .zip o en otro campo exit 1. Usar archivos temporales individuales bajo cdk.out/Telemetry-staging.assets.json, cdk.out/Telemetry-staging.template.json y cdk.out/tree.json de una carpeta aislada, sin persistir valores sensibles en la aplicación. Conservar el manifest y conteos de cada fixture, sin duplicar resultados ni confundir positivos del detector con controles de aplicación.

Comandos acotados por fixture U3:

```text
gitleaks dir --config .gitleaks.toml --redact=100 --exit-code 1 <fixture-CDK-hash-U3>
gitleaks dir --config .gitleaks.toml --redact=100 --exit-code 1 <fixture-AWS-U3>
gitleaks dir --config .gitleaks.toml --redact=100 --exit-code 1 <fixture-generic-U3>
```

Los escaneos completos de fuente e historial solo pasan con exit 0 después de conservar el alcance y comprobar los negativos de la clasificación. La evidencia inicial fallida se mantiene.
