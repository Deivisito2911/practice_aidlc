# Instrucciones de pruebas de la corrección — U2

## Runner y orden

Reutilizar Vitest 5.x instalado y vitest.config.ts. Sus patrones src/**/*.test.ts, infra/**/*.test.ts y tests/integration/**/*.test.ts incluyen todos los archivos previstos; operations-cli.test.ts vive en src/telemetry/ e importa la CLI de bin. No debilitar configuración, excluir pruebas ni reducir objetivos. Postura test-after: implementar una capa, escribir/ajustar sus pruebas y ejecutar el comando correspondiente; integrar al final. La evidencia U1 del intento actual sirve de baseline anterior a cambios.

## Comandos exactos por capa

Cada comando nombra archivos de U2 o regresiones del núcleo que U2 modifica; no usar un comando global sin filtro.

- Preview autenticada: `npm exec -- vitest run src/telemetry/recovery-preview.test.ts src/telemetry/manual-recovery.test.ts`.
- Repositorio y TTL: `npm exec -- vitest run src/telemetry/adapters.test.ts`.
- Negocio y recuperación: `npm exec -- vitest run src/telemetry/service.test.ts src/telemetry/manual-recovery.test.ts`.
- Handler/EMF: `npm exec -- vitest run src/telemetry/handlers.test.ts src/telemetry/handlers-operations.test.ts src/telemetry/observability.test.ts`.
- CLI: `npm exec -- vitest run src/telemetry/operations-cli.test.ts`.
- Disponibilidad: `npm exec -- vitest run src/telemetry/availability.test.ts`.
- CDK operativo: `npm exec -- vitest run infra/telemetry-stack-operations.test.ts infra/telemetry-stack.test.ts`.
- Integración de ambos disparadores y operación manual: `npm exec -- vitest run tests/integration/telemetry-flow.test.ts tests/integration/telemetry-operations.test.ts`.
- Regresión final de fuentes compartidas modificadas: `npm exec -- vitest run src/telemetry/model.test.ts src/telemetry/adapters.test.ts src/telemetry/service.test.ts src/telemetry/handlers.test.ts src/telemetry/handlers-operations.test.ts src/telemetry/manual-recovery.test.ts src/telemetry/recovery-preview.test.ts src/telemetry/observability.test.ts src/telemetry/operations-cli.test.ts src/telemetry/availability.test.ts infra/telemetry-stack.test.ts infra/telemetry-stack-operations.test.ts tests/integration/telemetry-flow.test.ts tests/integration/telemetry-operations.test.ts`.

Durante generación se ejecutan las capas en su orden y la regresión final una vez tras todas las modificaciones; no repetir una suite verde sin cambios o un problema nuevo. Conservar comandos, salida, exit code, counts y nombres de casos en evidencia.

## Casos y criterios de cierre local

- F2: validar VehicleTelemetry/Service=TelemetryService en EMF y todas las métricas/alarma/widgets; duración y edad Seconds, cantidades Count. IDs quedan fuera de dimensiones.
- F3: Query al ARN exacto EventsTable/index/TtlByShard ligado al rol real Lambda, sin permiso extra a otros índices; paginación, corte estrictamente superior a 24 h, conteo completo/parcial y backfill condicional que no recrea un evento borrado ni altera expiresAt.
- F4: 1 error entre 100 solicitudes elegibles es 1 % y alcanza comparador >=; 0/100 o población menor que 100 no dispara; 4xx/cuotas se clasifican aparte y el total se conserva.
- F5: métricas/logs por HTTP 202/400/409/5xx, commit creado/duplicado/conflicto/fallido/incierto, SQS confirmado/fallido/incierto, marcado PUBLISHED, tiempo recepción-a-commit y recuperación. Cada escenario debe comprobar estado y señal concreta, no solo presencia de archivo. Dashboard con métricas y textos de denominador; disponibilidad mensual pura con mes 28/29/30/31, mantenimiento incluido, falta de datos y población inválida.
- F6: preview válida; manipulación de límite, alcance, IDs, tiempos, keyId, digest/MAC; vencimiento exacto/posterior; confirmación ausente; invocación no autorizada vía AccessDenied simulado; conjunto cambiado, repetición, fallo parcial, deadline global y ninguna nueva reclamación tras presupuesto. Verificar Context/awsRequestId y requestId del cliente; actor del payload nunca autoriza. Conteos confirmados+fallidos+omitidos+no iniciados reconcilian la población. KMS falla sin efectos; identidad real CloudTrail queda pendiente de staging.
- F7: cubrir las brechas conocidas de la revalidación U1 al nivel efectivo: timeout SQS deja 202/PENDING, carreras/lease, barrera de commit antes de 202, commit incierto y transacción fallida sin parcial, fallo al marcar tras SQS confirmado, alerta con los seis campos, publicación tras eliminación del evento, BVA de campos/rangos/reloj y orden de eventos. Mantener alertId/deduplicación contractual. Ningún target existente por sí solo basta para cerrar un criterio.

## Dobles, fixtures y seguridad

Clientes AWS y puerto MAC inyectables con fakes deterministas, reloj/UUID/tiempo restante controlados y fixtures aislados. El fake transaccional debe permitir fallos antes/durante/después de commit y lecturas coherentes, comprobando atomicidad y no éxito falso. MAC de prueba puede usar una clave sintética local; el adaptador KMS se prueba con comandos/fallos simulados y nunca llama AWS real. CLI usa terminal/Invoke simulados para probar consentimiento y errores. Inspeccionar roles/principals/recursos y plantilla CDK sintetizada, no asumir permisos por el nombre de un método grant.

No almacenar ni imprimir credenciales, API keys, material de clave MAC o cuerpo crudo. Fixtures usan datos sintéticos. No contactar AWS ni ejecutar la CLI operativa real en estas pruebas.

## Volumen, cobertura y límites de evidencia

Minimal exige una comprobación verificable por requisito y un caso feliz por componente, además de errores/límites pertinentes y la integración crítica del equipo. Los hallazgos justifican superar la cifra orientativa 5–15; workshop no agrega un porcentaje de cobertura. Mantener todas las pruebas existentes verdes. Las comprobaciones locales no prueban p95 de staging, ≥99 % real antes de 30 s, disponibilidad de un mes real, denegación IAM desplegada, identidad CloudTrail consultable o activación de alarmas AWS.

Trazabilidad: OK para mecanismo/assertion local con destino existente y evidencia; GAP para lo aún no probado; Deferred con destino/razón de validación externa posterior. Unverified puede usarse en la prosa de evidencia, no como status JSON. F1 queda en U3 y no se omite ni se acepta como excepción si audit:deps sigue fallando.
