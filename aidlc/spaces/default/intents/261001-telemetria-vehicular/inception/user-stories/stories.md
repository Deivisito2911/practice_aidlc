# Historias de usuario del servicio de telemetría vehicular

Todas las historias son `Must Have`. El backlog contiene 12 historias pequeñas organizadas como rebanadas verticales.

## US1 — Aceptar telemetría

### US1.1 — Enviar un evento válido

**Como** Integrador de telemetría, **quiero** enviar un evento válido a `POST /telemetry-events`, **para** que el servicio lo acepte rápidamente y lo procese de forma asíncrona.

- **Priority:** Must Have
- **Depends on:** US6.1
- **Requirements:** FR1.1, FR1.2, FR1.3, FR1.4, FR1.5, FR1.6, FR3.1, NFR1

**Acceptance Criteria**

- **AC1.1.1:** Given una clave válida y un evento válido, When P1 lo envía, Then la API publica en SQS y responde `202 Accepted` con correlación y `acceptedAt` en UTC.
- **AC1.1.2:** Given una respuesta `202`, When se inspecciona el mensaje, Then contiene los campos validados, correlación y el mismo `acceptedAt` canónico.
- **AC1.1.3:** Given cada tipo permitido en sus límites válidos, When se envía, Then se acepta.
- **AC1.1.4:** Given carga sostenida de 100 solicitudes válidas/s en `staging`, When se mide con el perfil aprobado, Then p95 es ≤ 500 ms.
- **AC1.1.5:** Given una ruta distinta de `POST /telemetry-events`, When se invoca, Then devuelve recurso inexistente y no publica en SQS.

**INVEST:** Rebanada de entrada valiosa, estimable y automatizable; depende solo de la infraestructura base.

### US1.2 — Recibir errores y límites predecibles

**Como** Integrador de telemetría, **quiero** errores claros ante rutas, credenciales, datos, publicación o cuota inválidos, **para** corregir el envío sin crear mensajes defectuosos.

- **Priority:** Must Have
- **Depends on:** US1.1
- **Requirements:** FR1.1–FR1.6, FR2.1, FR2.2, FR3.2

**Acceptance Criteria**

- **AC1.2.1:** Given una matriz de campos ausentes/vacíos, tipos inválidos, `value` no finito, timestamp no UTC y valores fuera de cada límite, When se envía cada caso, Then devuelve `400` y no publica.
- **AC1.2.2:** Given un reloj controlado y un timestamp exactamente `+5 min`, When se envía, Then se acepta.
- **AC1.2.3:** Given un reloj controlado y un timestamp posterior a `+5 min`, When se envía, Then devuelve `400` sin publicar.
- **AC1.2.4:** Given clave ausente o inválida, When se invoca, Then API Gateway rechaza sin publicar.
- **AC1.2.5:** Given los valores fronterizos configurados para tasa, ráfaga y cuota, When se envía el último permitido y el primero excedente, Then el primero se admite y el segundo se limita.
- **AC1.2.6:** Given un fallo o resultado incierto al publicar en la SQS de entrada, When la API procesa la solicitud, Then no responde `202` y registra el error con correlación.

**INVEST:** Camino de error separado, pequeño y verificable por matriz de contrato.

## US2 — Persistir telemetría

### US2.1 — Persistir de forma idempotente

**Como** Ingeniero de plataforma, **quiero** persistir cada evento y su salida de alerta de forma atómica e idempotente, **para** mantener datos consistentes ante reintentos y carreras.

- **Priority:** Must Have
- **Depends on:** US1.1
- **Requirements:** FR4.1–FR4.4, NFR2, NFR4

**Acceptance Criteria**

- **AC2.1.1:** Given un mensaje válido, When Lambda lo procesa, Then DynamoDB contiene un único evento con sus campos y `acceptedAt`.
- **AC2.1.2:** Given entregas secuenciales o simultáneas con el mismo `eventId` y payload canónico idéntico, When compiten, Then queda un evento y como máximo una salida con `alertId` determinista.
- **AC2.1.3:** Given un `eventId` ya persistido y un payload canónico diferente, When llega el conflicto, Then el primer evento permanece inmutable, no se crea ni modifica una alerta y se registra `IDEMPOTENCY_CONFLICT` con métrica y correlación.
- **AC2.1.4:** Given batería baja, When la transacción termina o se interrumpe, Then quedan evento y salida `PENDING` o ninguno, nunca un estado parcial.
- **AC2.1.5:** Given `acceptedAt`, When se persiste, Then `expiresAt = acceptedAt + 90 días` y TTL está habilitado sobre ese atributo.
- **AC2.1.6:** Given una salida ya pendiente y un duplicado idéntico, When se reintenta, Then no se sustituye ni completa la salida existente.

**INVEST:** Capacidad transaccional acotada; Contract Design formalizará el error `IDEMPOTENCY_CONFLICT` y el horizonte idempotente tras TTL sin cambiar estos resultados.

## US3 — Alertar batería baja

### US3.1 — Entregar una alerta lógica completa

**Como** Operador de flota, **quiero** recibir mediante el sistema externo una alerta identificable cuando la batería sea inferior al 20 %, **para** actuar sin confundir reentregas con incidentes nuevos.

- **Priority:** Must Have
- **Depends on:** US2.1
- **Requirements:** FR5.1, FR5.2, FR5.3

**Acceptance Criteria**

- **AC3.1.1:** Given `battery.value = 19,99`, When se procesa, Then se crea una alerta con `alertId` derivado criptográficamente de `eventId` y `eventType` para garantizar unicidad.
- **AC3.1.2:** Given `battery.value = 20`, When se procesa, Then no se crea ninguna alerta ni se encola ningún mensaje en SQS.
- **AC3.1.3:** Given un evento `temperature` o `speed`, When se procesa, Then se ignora silenciosamente para las alertas de batería.
- **AC3.1.4:** Given una alerta publicada, When un consumidor contractual la lee, Then contiene `vehicleId`, `battery.value`, `timestamp` original y `alertId` rastreable.
- **AC3.1.5:** Given dos entregas de un evento con el mismo `eventId` y `battery.value < 20`, When Lambda intenta publicar la alerta en SQS, Then inyecta el `alertId` como `MessageDeduplicationId` nativo en la cola SQS, garantizando que el sistema externo reciba exactamente una (1) alerta y SQS descarte el duplicado.
- **AC3.1.6:** Given eventos de batería fuera de orden cronológico, When llegan a la cola, Then se procesan sin estado acumulativo: cada evento dispara su alerta independiente si `value < 20`, sin cancelar alertas previas ni bloquear el hilo.

**INVEST:** Valor para P2 a través del límite externo; duplicados y orden de llegada tienen resultados deterministas y verificables sin implementar al consumidor real.

### US3.2 — Recuperar una alerta pendiente

**Como** Ingeniero de plataforma, **quiero** conservar y reintentar una publicación de alerta fallida o incierta, **para** evitar pérdidas lógicas.

- **Priority:** Must Have
- **Depends on:** US2.1, US3.1
- **Requirements:** FR4.3, FR4.4, FR5.3, FR5.4, NFR7

**Acceptance Criteria**

- **AC3.2.1:** Given salida `PENDING`, When la publicación falla antes de aceptación, Then permanece pendiente con el mismo `alertId`.
- **AC3.2.2:** Given resultado incierto después de aceptación, When se reintenta, Then se reutiliza el mismo `alertId`.
- **AC3.2.3:** Given confirmación satisfactoria de SQS, When se actualiza la salida, Then transiciona condicionalmente a `PUBLISHED`.
- **AC3.2.4:** Given SQS restaurada, When se procesa una salida pendiente, Then se publica y la prueba contractual conserva un único efecto lógico.

**INVEST:** Recuperación independiente y verificable con fallos inducidos.

## US4 — Recuperar mensajes fallidos

### US4.1 — Aislar fallos mediante DLQ

**Como** Ingeniero de plataforma, **quiero** reintentar solo mensajes fallidos y aislarlos en la quinta recepción, **para** que no bloqueen eventos sanos.

- **Priority:** Must Have
- **Depends on:** US2.1
- **Requirements:** FR6.1, FR6.2, FR6.3, NFR7

**Acceptance Criteria**

- **AC4.1.1:** Given un lote mixto, When Lambda responde parcialmente, Then solo los mensajes fallidos reaparecen.
- **AC4.1.2:** Given un mensaje que falla cinco recepciones, When alcanza `maxReceiveCount`, Then pasa a DLQ.
- **AC4.1.3:** Given un fallo, When se registra, Then contiene correlación, `eventId`, contador y causa sin secretos.
- **AC4.1.4:** Given un mensaje venenoso, When vuelve a fallar tras redrive, Then regresa a DLQ sin bloquear mensajes sanos.

**INVEST:** Aislamiento de fallos pequeño, independiente y automatizable.

### US4.2 — Ejecutar redrive controlada

**Como** Ingeniero de plataforma, **quiero** confirmar y ejecutar una redrive con alcance y velocidad controlados, **para** recuperar mensajes sin duplicar efectos.

- **Priority:** Must Have
- **Depends on:** US4.1, US2.1
- **Requirements:** FR4.2–FR4.4, FR6.2, FR6.3, NFR7

**Acceptance Criteria**

- **AC4.2.1:** Given un alcance de redrive permitido por la herramienta o procedimiento, When P3 lo prepara, Then muestra selección, cantidad, velocidad y destino antes de confirmar.
- **AC4.2.2:** Given alcance vacío o actor no autorizado, When intenta ejecutar, Then se rechaza sin mover mensajes.
- **AC4.2.3:** Given confirmación autorizada, When se ejecuta, Then muestra progreso y resultado por lote, incluidos fallos parciales.
- **AC4.2.4:** Given una redrive repetida, When procesa eventos existentes, Then no duplica eventos, salidas ni efectos lógicos.
- **AC4.2.5:** Given una redrive fallida o parcial, When se detiene, Then conserva evidencia y permite recuperación segura sin asumir éxito total.

**INVEST:** Experiencia operativa acotada; no presupone selección arbitraria mensaje a mensaje ni GUI.

## US5 — Medir y observar

### US5.1 — Medir SLO y retención

**Como** Ingeniero de plataforma, **quiero** medir latencia, tiempo de procesamiento, disponibilidad y retención, **para** demostrar los objetivos operativos.

- **Priority:** Must Have
- **Depends on:** US1.1, US2.1
- **Requirements:** NFR1, NFR2, NFR3, NFR4

**Acceptance Criteria**

- **AC5.1.1:** Given el perfil de carga aprobado, When se ejecuta en `staging`, Then sostiene 100 solicitudes válidas/s y p95 ≤ 500 ms.
- **AC5.1.2:** Given una población correlacionada, When se mide desde `acceptedAt`, Then ≥ 99 % queda persistido y con salida cuando aplica en <30 s.
- **AC5.1.3:** Given datos mensuales o sintéticos equivalentes, When se calcula disponibilidad sobre todos los minutos sin excluir mantenimiento, Then el resultado es ≥ 99,9 %.
- **AC5.1.4:** Given un evento persistido, When se inspecciona TTL, Then `expiresAt` usa `acceptedAt + 90 días`; la eliminación posterior se trata como eventual.

**INVEST:** Indicadores delimitados y verificables sin mezclar alarmas de fallos.

### US5.2 — Detectar fallos y acumulaciones

**Como** Ingeniero de plataforma, **quiero** señales y alarmas completas, **para** detectar y correlacionar degradaciones antes de perder datos.

- **Priority:** Must Have
- **Depends on:** US3.2, US4.1, US5.1
- **Requirements:** NFR7

**Acceptance Criteria**

- **AC5.2.1:** Given solicitudes aceptadas/rechazadas, errores Lambda/DynamoDB y fallos de publicación, When ocurren, Then existen logs y métricas correlacionables.
- **AC5.2.2:** Given edad/profundidad de cola, DLQ, salidas pendientes o registros TTL elegibles anómalos, When superan la política definida, Then se activa una alarma.
- **AC5.2.3:** Given cada alarma, When se inspecciona su configuración, Then declara indicador, umbral, ventana, severidad, destino y recuperación.
- **AC5.2.4:** Given una alerta operativa, When P3 investiga, Then puede recorrer API → SQS → Lambda → DynamoDB → salida → alerta por correlación.

**INVEST:** Observabilidad de fallos separada de SLO; criterios configurables pero verificables.

## US6 — Desplegar y asegurar

### US6.1 — Desplegar infraestructura base reproducible

**Como** Ingeniero de plataforma, **quiero** desplegar la infraestructura base mediante AWS CDK, **para** habilitar el recorrido completo sin configuración manual posterior.

- **Priority:** Must Have
- **Depends on:** None
- **Requirements:** NFR5, NFR9, C1, C2, C6

**Acceptance Criteria**

- **AC6.1.1:** Given una cuenta preparada, When se despliega CDK, Then crea API Gateway, colas, Lambda, DynamoDB, salida duradera, KMS, roles y logs.
- **AC6.1.2:** Given recursos desplegados, When se inspeccionan, Then SQS/DynamoDB usan KMS, comunicaciones TLS y roles de mínimo privilegio.
- **AC6.1.3:** Given una segunda cuenta preparada, When se repite el despliegue, Then reproduce `staging` sin cambios manuales.
- **AC6.1.4:** Given el walking skeleton, When se despliega, Then habilita API → SQS → Lambda → DynamoDB → salida → SQS de alertas.

**INVEST:** Base pequeña que desbloquea las rebanadas funcionales.

### US6.2 — Auditar y proteger el despliegue

**Como** Ingeniero de plataforma, **quiero** identidad temporal y auditoría protegida, **para** desplegar y rastrear cambios sin credenciales persistentes.

- **Priority:** Must Have
- **Depends on:** US6.1
- **Requirements:** NFR6, NFR10, C4, C7

**Acceptance Criteria**

- **AC6.2.1:** Given el pipeline, When accede a AWS, Then usa OIDC y no contiene claves persistentes.
- **AC6.2.2:** Given acciones de creación, cambio y eliminación en los servicios requeridos, When se consulta CloudTrail, Then registra identidad, acción, recurso y fecha.
- **AC6.2.3:** Given logs CloudTrail, When se inspeccionan, Then usan KMS, retención mínima de 90 días y los roles de aplicación no pueden borrarlos.
- **AC6.2.4:** Given una fusión a `main`, When termina CI, Then despliega a `staging`; producción exige aprobación manual.

**INVEST:** Seguridad, auditoría e identidad agrupadas como una rebanada verificable.

### US6.3 — Bloquear cambios que incumplen calidad

**Como** Ingeniero de plataforma, **quiero** comprobaciones obligatorias en cada pull request, **para** impedir que cambios defectuosos lleguen a `main`.

- **Priority:** Must Have
- **Depends on:** US1.1, US2.1, US3.2, US6.1
- **Requirements:** NFR8, C3, C5

**Acceptance Criteria**

- **AC6.3.1:** Given un pull request, When ejecuta CI, Then corre Prettier, ESLint, tipos, unitarias, integración AWS simulada y análisis de dependencias/secretos.
- **AC6.3.2:** Given una comprobación fallida, When se evalúa la protección de `main`, Then la fusión queda bloqueada.
- **AC6.3.3:** Given todas las comprobaciones verdes y revisión aprobada, When se fusiona, Then usa *squash* y despliega a `staging`.
- **AC6.3.4:** Given el walking skeleton completo, When corre la prueba crítica, Then cubre API → SQS → Lambda → DynamoDB → salida → SQS de alertas.

**INVEST:** Pipeline de calidad acotado y verificable tras el recorrido crítico.

## Story Map

| Rebanada | Historias | Persona principal |
|---|---|---|
| Aceptar | US1.1, US1.2 | P1 |
| Persistir | US2.1 | P3 |
| Alertar | US3.1, US3.2 | P2, P3 |
| Recuperar | US4.1, US4.2 | P3 |
| Medir y observar | US5.1, US5.2 | P3 |
| Desplegar y asegurar | US6.1, US6.2, US6.3 | P3 |

## Assumptions & Open Questions

- El sistema externo aplica deduplicación por `alertId`; la entrega demuestra conformidad mediante un consumidor de prueba.
- Contract Design debe formalizar el contrato de `IDEMPOTENCY_CONFLICT` y decidir el horizonte idempotente después del TTL sin permitir que un payload conflictivo sustituya el primer evento.
- Contract Design debe precisar cómo un fallo de publicación de alerta afecta al mensaje de entrada, su contador y DLQ, sin debilitar la salida duradera.
- Infrastructure Design debe fijar tiempos SQS, lotes, concurrencia y valores completos de alarmas.
- La redrive usa el alcance que permita la herramienta o procedimiento aprobado; no presupone selección arbitraria mensaje a mensaje.

## Sources

- `inception/requirements-analysis/requirements.md`
- `inception/user-stories/user-stories-questions.md`
- `inception/practices-discovery/team-practices.md`
