# Plan de revisión de infraestructura — telemetry-backend

## Alcance de esta decisión

La decisión humana más reciente fija una sola Lambda de aplicación detrás de API Gateway: validación BVA síncrona con 400 temprano y persistencia DynamoDB para solicitudes válidas. La SQS de entrada se elimina; SQS queda para alertas mediante el outbox. El ADR inicial `domain-design/decisions.md` proponía API Gateway → SQS directo, por lo que también requiere actualización. El CDK y la prueba integrada actuales aún no implementan esta arquitectura. La decisión humana sobre la revisión precede a cualquier `report` de cierre.

## Arquitectura propuesta

| Tramo | Recurso y responsabilidad | Comprobación necesaria |
|---|---|---|
| Ingreso | API Gateway exige clave y límites e invoca la única Lambda. La función valida BVA y usa `eventId` para escritura condicional; batería <20 crea evento y salida PENDING atómicos. | Cada fallo BVA devuelve 400 sin DynamoDB/SQS. Para válidos, el 202 conserva el cuerpo existente y sale tras confirmar DynamoDB. |
| Persistencia | DynamoDB guarda el evento y la salida PENDING; no existe SQS de entrada ni DLQ de ingreso. | Idempotencia por `eventId`, rawPayload intacto, `acceptedAt` estable y salida transaccional. |
| Alerta | EventBridge invoca periódicamente esa misma Lambda para recuperar PENDING y publicar en SQS de alertas con `alertId` estable. | Fallo o resultado incierto conserva PENDING; consumidor deduplica por `alertId`. |
| Control | KMS, IAM por función, CloudTrail, métricas, alarmas y despliegue CDK por entorno. | Políticas mínimas, auditoría protegida, señales entregadas a guardia operativa. |

## Ajustes realizados en los entregables de diseño

| Entregable | Ajuste | Motivo |
|---|---|---|
| `infrastructure-specification.md` | Define API Gateway → Lambda única → DynamoDB, BVA y 400 síncronos, 202 tras persistencia y barrido del outbox por la misma función. | Refleja la última dirección humana sin añadir Lambdas ni SQS de ingreso. |
| `monitoring-design.md` | Mide 400 temprano, 202 posterior a DynamoDB, persistencia y publicación; retira las métricas de cola/DLQ de ingreso. | Los inválidos nunca entran en el denominador de eventos aceptados ni se encolan. |
| `cicd-pipeline.md` | Exige exactamente una Lambda de aplicación, ninguna SQS de entrada y pruebas BVA síncronas, DynamoDB y recuperación del outbox. | La prueba integrada actual de tres handlers no verifica la arquitectura solicitada. |

## Diferencias entre el diseño y la implementación actual

| Prioridad | Diferencia observada | Acción propuesta y evidencia de cierre |
|---|---|---|
| Crítica | `infra/telemetry-stack.ts` despliega Lambdas `Ingest`, `Processor` y `Publisher` y una SQS de entrada; `tests/integration/telemetry-flow.test.ts` llama tres handlers. | Refactorizar CDK y código en la siguiente fase de codificación a una Lambda HTTP/EventBridge, sin SQS de ingreso; rehacer la prueba integrada antes de afirmar que el walking skeleton cumple. |
| Crítica | FR1.6, FR3.1, FR6.1, NFR1.2, NFR2.3, NFR7.1, NFR9.3, el contrato HTTP y el ADR-001 anterior presuponen SQS de entrada y 202 después de encolar. | Conservar 400 BVA y el cuerpo 202; actualizar únicamente las cláusulas que atribuyen 202 a SQS de entrada o requieren su DLQ/lote. Atribuir 202 a persistencia DynamoDB confirmada. |
| Alta | `infra/telemetry-stack.ts` crea tres alarmas sin acciones ni destino SNS; faltan métricas, panel y alarmas para PENDING, publicación y TTL. | Completar IaC y pruebas de síntesis; inducir señales en staging y comprobar la entrega al destino operativo. |
| Alta | No existe medición en staging del p95 a 100 solicitudes válidas/s, del ≥99 % de persistencias en <30 s ni de disponibilidad mensual. | Ejecutar carga e instrumentación con `acceptedAt` y sonda sintética; guardar cálculo, población y resultados antes de producción. |
| Alta | El escaneo de dependencias detectó una vulnerabilidad alta transitiva en la cadena CDK. | Resolver la dependencia y repetir el escaneo; mantener bloqueada la puerta de seguridad del pipeline mientras falle. |
| Media | El CDK usa `grantReadWriteData` para procesador y publicador y no expone aún todos los límites de capacidad como parámetros por entorno. | Crear un solo rol mínimo, añadir pruebas negativas y parametrizar concurrencia, timeout y barrido; verificar cuotas en staging. |
| Media | `api.addApiKey` genera la clave del productor, pero falta el mecanismo operativo de entrega y rotación; no hay pipeline CI desplegado todavía. | Definir custodia y rotación de clave fuera de repositorio/CI; implementar OIDC, controles y aprobación de producción en sus etapas de entrega. |
| Media | El ADR-001 inicial propone API Gateway → SQS directo; el catálogo posterior usa Lambda de ingreso, procesadora y publicadora. Ninguno coincide por completo con la decisión actual de una Lambda HTTP/DynamoDB. | Reconciliar los documentos aguas arriba con la última decisión humana; no presentar el CDK vigente como cumplimiento del diseño. |

## Criterios para aceptar el diseño de esta etapa

1. La dirección de infraestructura usa una sola Lambda de aplicación, ninguna SQS de entrada y deduplicación lógica por `eventId` en DynamoDB; SQS estándar solo entrega alertas.
2. Cada fallo BVA devuelve 400 antes de persistir o publicar. Para válidos, 202 conserva su cuerpo, pero confirma DynamoDB en vez de una SQS de entrada; NFR2.1 conserva como denominador los aceptados con 202.
3. El CDK, la implementación y la prueba integrada actuales de tres Lambdas se registran como discrepancia para la siguiente fase de codificación; no se declara que el walking skeleton mínimo ya esté construido.
4. La promoción a producción sigue bloqueada hasta reconciliar contratos y código, probar alarmas, medir staging, resolver el fallo de dependencias y obtener aprobación manual.

## Fuentes revisadas

- `inception/domain-design/decisions.md`, `inception/domain-design/components.md`, `functional-design/functional-spec.md`, `nfr-design/`, `nfr-requirements/` y `inception/contract-design/contract-summary.md`.
- `infra/telemetry-stack.ts`, `infra/telemetry-stack.test.ts`, `README.md` y `code-generation/code-summary.md`.
- Entregables de esta etapa: `infrastructure-specification.md`, `monitoring-design.md`, `cicd-pipeline.md` y `traceability.json`.
