# Asignación de historias a unidades

Cada historia tiene una unidad responsable principal. «Orden interno» expresa dependencias de trabajo dentro de la unidad; la secuencia económica entre unidades se decidirá en Delivery Planning.

| Story ID | Unit ID | Directory | Orden interno | Entrega principal |
|---|---|---|---|---|
| US6.1 | U1 | `u1-telemetry-core` | 1 | CDK base: API Gateway REST, una Lambda, DynamoDB evento/Outbox, EventBridge y solo SQS de alertas. |
| US2.1 | U1 | `u1-telemetry-core` | 2 | Persistencia transaccional e idempotente, salida `PENDING` y TTL. |
| US1.1 | U1 | `u1-telemetry-core` | 3 | Entrada HTTP validada y respuesta `202` tras confirmar la transacción. |
| US3.1 | U1 | `u1-telemetry-core` | 4 | Alerta lógica de batería con `value < 20` y `alertId` estable. |
| US3.2 | U1 | `u1-telemetry-core` | 5 | Publicación y salida recuperable ante fallos o resultados inciertos. |
| US4.1 | U1 | `u1-telemetry-core` | 6 | Recuperación programada de `PENDING` por la misma Lambda. |
| US1.2 | U2 | `u2-telemetry-operations` | 1 | Matriz completa de validación, cuota y errores sin efectos. |
| US4.2 | U2 | `u2-telemetry-operations` | 2 | Reintento manual controlado, autorizado y auditable. |
| US5.1 | U2 | `u2-telemetry-operations` | 3 | Métricas de SLO, carga, procesamiento y retención. |
| US5.2 | U2 | `u2-telemetry-operations` | 4 | Alarmas y correlación de fallos/acumulación. |
| US6.2 | U3 | `u3-delivery-controls` | 1 | OIDC, verificación CloudTrail y promoción protegida. |
| US6.3 | U3 | `u3-delivery-controls` | 2 | CI y protección de `main` con todas las comprobaciones obligatorias. |

## Historias que abarcan varias unidades

- **US1.2:** U1 incluye el rechazo básico de una solicitud inválida sin escritura ni publicación para demostrar el recorrido; U2 completa la matriz BVA, credenciales, cuota y demás errores. U2 es la responsable principal de la historia completa.
- **US6.2:** U1 instala los elementos CDK mínimos de cifrado y registro que necesita el despliegue seguro; U3 completa identidad OIDC, protección y verificación de CloudTrail y promoción. U3 es la responsable principal.
- **US6.3:** U1 aporta la prueba crítica del recorrido con servicios AWS simulados; U3 la incorpora a CI junto con formato, *lint*, tipos, análisis y protección de `main`. U3 es la responsable principal.

## Comprobación de cobertura

Las doce historias `US1.1`, `US1.2`, `US2.1`, `US3.1`, `US3.2`, `US4.1`, `US4.2`, `US5.1`, `US5.2`, `US6.1`, `US6.2` y `US6.3` están asignadas una vez como responsabilidad principal. U1 tiene seis historias, U2 cuatro y U3 dos. Cada unidad tiene historias y un resultado comprobable. Ninguna historia requiere una SQS de ingreso ni una Lambda adicional.

## Sources

- `inception/user-stories/stories.md`
- `inception/requirements-analysis/requirements.md`
- `inception/units-generation/units-generation-questions.md`
