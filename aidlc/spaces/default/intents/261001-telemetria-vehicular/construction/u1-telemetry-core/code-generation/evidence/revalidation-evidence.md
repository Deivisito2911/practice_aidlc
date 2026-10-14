# Evidencia de revalidación U1

## Ejecución

Se inspeccionaron package.json, tsconfig.json y vitest.config.ts antes de ejecutar el runner Vitest 5.0.3 sobre Node 26.7.0. Se inspeccionó cada archivo de modelo, adapters, service, handlers e infraestructura y sus pruebas antes de ejecutar el comando correspondiente, en el orden aprobado. La salida y código de cada comando figuran en revalidation-results.json; la salida del modelo está además en step-02-model.log.

| Comprobación | Resultado |
|---|---|
| Modelo | 11 pruebas; exit 0 |
| Adapters | 6 pruebas; exit 0 |
| Service | 8 pruebas; exit 0 |
| Handlers | 5 pruebas; exit 0 |
| IaC | 4 pruebas; exit 0 |
| Integración | 2 archivos / 2 pruebas; exit 0 |
| typecheck / lint / format:check / build / cdk:synth | exit 0 en cada comando |

El comando exacto npm run test:integration -- tests/integration/telemetry-flow.test.ts añade el argumento a vitest run tests/integration; por ello ejecuta también el archivo operativo existente. No se repitió ninguna suite verde.

## Límites y hallazgos pendientes

Las pruebas son locales, con AWS simulado y síntesis CDK. No hubo despliegue, cambio de dependencias, edición de aplicación ni merge. dist/ es una salida ignorada de build; cdk.out/ es salida de síntesis y contiene performance-counters.json rastreado, modificado por el comando. El manifiesto declara esa escritura del generador.

F1–F7 siguen pendientes de los planes U2/U3. El éxito de estos comandos no ejecuta audit:deps ni resuelve vulnerabilidades, IAM TTL, dimensiones EMF, frontera de alarma, instrumentación, contrato manual o barreras CI. El warning de Vite por ESM/CommonJS no bloqueó las pruebas y se preservó sin modificar configuración. CDK informa 83 feature flags no configurados.

La trazabilidad distingue assertions existentes, GAP por pruebas ausentes y Deferred para verificación futura. No se probó todo el contrato: faltan escenarios completos de commit incierto/interrumpido con atomicidad simulada, barrera temporal de commit/202, timeout SQS, concurrencia/vencimiento, fallo tras SQS confirmado, publicación tras borrar evento, alerta completa y algunos límites. Esta inspección identifica falta de evidencia ya encuadrada en F7; no demuestra un nuevo defecto de implementación. La revalidación no autoriza crear esas pruebas.

Objetivos p95 ≤500 ms a 100 solicitudes válidas/s, persistencia ≥99 % antes de 30 s y disponibilidad ≥99,9 % por mes calendario permanecen Unverified. También requieren verificación externa recursos desplegados, IAM negativo, auditoría CloudTrail, dashboards y bloqueo real de CI.
