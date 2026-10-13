# Resumen de generación de código — U1 núcleo de telemetría

## Archivos de aplicación

Se modificaron los archivos reclamados en `source-manifest.json`: README, infraestructura CDK, modelo, adaptadores, servicio, handler HTTP/EventBridge y pruebas unitarias/de integración. `src/telemetry/model.test.ts` ya cubría el modelo y permaneció sin cambios. Se eliminaron del flujo activo los recursos de ingreso anteriores; la pila resultante tiene una sola Lambda y una sola SQS de alertas.

## Decisiones implementadas

- Una transacción condicional guarda TelemetryEvent y, cuando corresponde, Outbox. La Lambda devuelve 202 después de confirmar la persistencia.
- Los duplicados exactos conservan acceptedAt y correlationId originales; los conflictos responden 409.
- Las alertas usan `LOW_BATTERY:{eventId}`; el envío inicial tiene presupuesto de 150 ms y los reintentos mantienen PENDING, token de reclamación y arrendamiento.
- HTTP y recuperación EventBridge comparten el handler; la recuperación consulta el GSI por 16 shards y procesa lotes acotados.
- CDK configura API REST con API key y cuota, DynamoDB cifrado con KMS/PITR, SQS con TLS/KMS, EventBridge, CloudTrail y permisos mínimos de Lambda.

## Verificación

- Pruebas unitarias: 34 pruebas en 5 archivos, correctas.
- Integración crítica `tests/integration/telemetry-flow.test.ts`: 1 prueba, correcta.
- `typecheck`, `lint`, `format:check`, `build` y `cdk:synth`: correctos.
- La prueba de CDK está incluida en la suite de 34 pruebas.

## Desvíos del plan

No hubo cambios de alcance. La prueba de modelo existente se conservó sin edición porque ya cubría los límites relevantes. La síntesis de CDK actualizó archivos bajo `cdk.out/`; no se incluyen en el manifiesto de código fuente.

## Límites y trabajo posterior

Las pruebas locales no demuestran el p95 ≤ 500 ms a 100 solicitudes válidas/s ni el 99,9 % de disponibilidad mensual: ambos objetivos requieren medición en staging. U2 debe completar métricas de negocio, alertas para acumulación PENDING/TTL, paneles SLI y controles de acceso humano. U3 debe incorporar OIDC, controles de CI y análisis de dependencias/secretos. La cobertura detallada pendiente figura como `N/A` en `traceability.json`; esos objetivos siguen vigentes.
