# Resumen de generación de código — U3 Controles de entrega

## Resultado

Se completaron los ocho pasos del plan U3 bajo el contrato `test-after` y la estrategia mínima. La corrección local de F1 fijó `aws-cdk-lib@2.273.0`; `npm ci`, la auditoría de producción y la auditoría del árbol completo pasaron con cero vulnerabilidades. No se cambió la lógica de negocio U1/U2.

El stack ahora concede al servicio CloudTrail `kms:GenerateDataKey*` con SourceArn del trail y contexto de cifrado, además de `kms:DescribeKey` con SourceArn sin contexto. Un nombre determinista permite calcular el ARN sin dependencia circular. Fijar el nombre puede reemplazar un trail previo al desplegar; se debe revisar la continuidad de auditoría antes de cualquier despliegue. Las pruebas CDK comprueban enlaces trail/bucket/KMS, retención Object Lock COMPLIANCE de 90 días, TLS, permisos efectivos del rol Lambda y topología de una Lambda, dos tablas y una SQS de alertas.

La distribución oficial Gitleaks v8.30.1 se verificó por SHA256 fuera del repositorio. Los primeros escaneos de aplicación e historial dieron exit 1 por identificadores de artefactos CDK, conservados en `evidence/scanner-classification.json`. `.gitleaks.toml` conserva reglas incorporadas y exceptúa solo matches `generic-api-key` de `S3Key`/`objectKey` con SHA256 hexadecimal y `.zip` en los JSON CDK exactos. No hay baseline, reglas deshabilitadas ni exclusiones de archivos completos. Los escaneos finales de la proyección manifestada de 78 archivos y del historial completo disponible (12 commits, clon no superficial) dieron exit 0. Fixtures de los tres namespaces confirmaron que credenciales AWS y genéricas, otro campo y valores sin `.zip` siguen detectándose; los hashes legítimos no se reportan.

## Verificación local

- Pruebas CDK U3 y dos archivos compartidos: 13 aprobadas, exit 0; U3 aislada tras el cambio documental: 5 aprobadas, exit 0.
- Integración crítica: 2 archivos y 7 pruebas aprobadas, exit 0. El script `test:integration` descubre ambos archivos.
- Regresión explícita de 15 archivos en `src/telemetry`, `infra` y `tests/integration`: 159 pruebas aprobadas, exit 0.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run build` y `npm run cdk:synth`: exit 0.
- Auditorías npm de producción y árbol completo: exit 0, cero vulnerabilidades. Escaneos Gitleaks de aplicación e historial: exit 0, cero hallazgos finales.

`evidence/commands.json` guarda los comandos y salidas de construcción; `evidence/scanner-final.json` guarda los fixtures, la proyección con hashes, historial, versión y exits. Un reintento de Vitest tras editar la comprobación documental falló al arrancar por `spawn EPERM` del sandbox; la misma prueba pasó fuera de ese límite con exit 0.

## Límites y pendientes

Estos resultados acreditan instalación, pruebas, escaneo y síntesis **locales**. GitHub Actions fue seleccionado por el usuario, pero su workflow y checks obligatorios aún no existen en esta entrega. Confianza OIDC real, protección de `main`/entornos, segregación efectiva de roles de despliegue, promoción del mismo digest y aprobación de producción pertenecen a CI Pipeline/Environment Provisioning. La recepción, cifrado y retención de logs CloudTrail reales y la consulta de eventos administrativos requieren una cuenta AWS. Permanecen `GAP`/Unverified en `traceability.json`; F7 conserva estos límites. No hubo despliegue ni promoción.

El manifiesto enumera solo rutas de aplicación U3 y archivos generados concretos de CDK; evita declarar `cdk.out/` como directorio fuente. `dist/` fue regenerado por build y no se reclama como escritura versionada.
