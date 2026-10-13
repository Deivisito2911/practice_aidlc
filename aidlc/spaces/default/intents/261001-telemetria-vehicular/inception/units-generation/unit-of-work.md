# Unidades de trabajo de telemetría vehicular

## Decisión de descomposición

Las tres unidades son incrementos comprobables y desplegables de una sola solución. `TelemetryService` sigue siendo el único componente lógico y propietario de `TelemetryEvent` y `OutboxEntry`. Los dos incrementos de tipo `service` modifican la misma Lambda; ninguno introduce una función, cola de ingreso o propietario de datos adicional.

| Unit ID | Directory | Nombre | Kind | Complejidad | Modelo de despliegue | Historias principales |
|---|---|---|---|---|---|---|
| U1 | `u1-telemetry-core` | Núcleo integrado de telemetría | `service` | L | Primera versión autónoma de la única Lambda y su CDK base | US1.1, US2.1, US3.1, US3.2, US4.1, US6.1 |
| U2 | `u2-telemetry-operations` | Ampliación operativa | `service` | M | Incremento desplegable de la misma Lambda y configuración operativa | US1.2, US4.2, US5.1, US5.2 |
| U3 | `u3-delivery-controls` | Controles de entrega | `packaging` | M | Pipeline y configuración de seguridad/despliegue sobre el CDK y servicio existentes | US6.2, US6.3 |

## U1 — Núcleo integrado de telemetría

- **Límite:** API Gateway REST activa la única Lambda para HTTP; EventBridge activa esa misma Lambda para recuperar salidas `PENDING`. La Lambda valida antes de escribir, guarda el evento y la salida Outbox en una transacción DynamoDB cuando `battery.value < 20`, publica en la SQS de alertas y marca `PUBLISHED` solo tras confirmación.
- **Entrega:** contrato HTTP mínimo de `POST /telemetry-events`, idempotencia por `eventId`, `alertId` determinista, errores básicos sin efectos, recuperación periódica, dos tablas y una cola, IAM y KMS mínimos, y prueba crítica de integración con servicios AWS simulados. `202` se devuelve después de confirmar la transacción. `value = 20` no genera alerta; los fallos de publicación conservan `PENDING`.
- **Comprobación:** la prueba crítica cubre entrada HTTP válida e inválida y activación EventBridge, incluidos atomicidad, umbral de batería, reintento con el mismo `alertId` y ausencia de SQS de ingreso. El resultado puede demostrarse antes de U2 y U3.
- **Restricción:** el CDK crea API Gateway REST, una Lambda, dos tablas DynamoDB, una SQS de alertas y la regla EventBridge. La protección CloudTrail de US6.2 empieza aquí y se verifica junto con los controles de U3.

## U2 — Ampliación operativa

- **Límite:** amplía el mismo `TelemetryService` y sus configuraciones; no cambia la propiedad de datos ni separa la Lambda.
- **Entrega:** matriz completa de validación y errores HTTP, tasa/ráfaga/cuota, procedimiento de reintento manual con alcance y autorización, medición de latencia, procesamiento, disponibilidad y TTL, señales operativas y alarmas.
- **Comprobación:** pruebas de límites y fallos, reintento manual autorizado, medidas del perfil de carga y configuración verificable de cada alarma. U1 debe existir para ejercitar estos caminos.
- **Restricción:** conserva los invariantes de transacción, idempotencia y recuperación de U1; la frecuencia de EventBridge y los umbrales de alarmas se concretan en diseño de infraestructura.

## U3 — Controles de entrega

- **Límite:** pipeline, configuración de identidad y auditoría sobre el mismo servicio y los recursos CDK; no añade lógica de negocio ni un ejecutable independiente.
- **Entrega:** roles temporales OIDC, verificación de CloudTrail protegido, formato, *lint*, tipos, pruebas unitarias e integración AWS simulada, análisis de dependencias y secretos, protección de `main`, despliegue automático a *staging* y aprobación manual de producción.
- **Comprobación:** el pipeline rechaza una comprobación fallida, ejecuta la prueba crítica de U1, audita identidad y cambios, y exige el paso manual para producción. Puede prepararse mientras se construye U1, pero su cierre depende de comprobar U1 funcionando.
- **Restricción:** no usa credenciales AWS persistentes en CI ni despliega SQS de entrada o DLQ de ingreso.

## Límites entre unidades

U1 fija el contrato HTTP, el esquema de evento/Outbox y la identidad de alerta publicada en SQS. U2 consume esos contratos para ampliar validación, operación y observabilidad; U3 consume los artefactos CDK y la prueba de integración para proteger la entrega. Contract Design formalizará los campos y fallos externos, incluida la respuesta ante duplicados y `IDEMPOTENCY_CONFLICT`.

## Assumptions & Open Questions

- La misma Lambda y las dos tablas pueden evolucionar entre U1 y U2 mediante cambios compatibles; los detalles de migración se concretarán en diseño.
- El consumidor externo se representa mediante un consumidor contractual de prueba que deduplica por `alertId`; construirlo como servicio de producción queda fuera de estas unidades.

## Sources

- `inception/domain-design/components.md`
- `inception/domain-design/decisions.md`
- `inception/requirements-analysis/requirements.md`
- `inception/user-stories/stories.md`
- `inception/units-generation/units-generation-questions.md`
