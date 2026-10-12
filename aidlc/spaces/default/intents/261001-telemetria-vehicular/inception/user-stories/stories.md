# Historias de usuario del servicio de telemetría vehicular

Todas las historias son `Must Have`. El backlog contiene 12 historias pequeñas organizadas como rebanadas verticales.

## US1 — Aceptar telemetría

### US1.1 — Enviar un evento válido

**Como** Integrador de telemetría, **quiero** enviar un evento válido a `POST /telemetry-events`, **para** obtener una confirmación de que ya quedó persistido sin esperar la entrega de alertas.

- **Priority:** Must Have
- **Depends on:** US2.1
- **Requirements:** FR1.1, FR1.2, FR1.3, FR1.4, FR1.5, FR1.6, FR3.1, NFR1

**Acceptance Criteria**

- **AC1.1.1:** Given una clave válida y un evento válido, When P1 lo envía, Then la Lambda confirma el evento en DynamoDB antes de que la API responda `202 Accepted` con correlación y `acceptedAt` en UTC.
- **AC1.1.2:** Given una respuesta `202`, When se inspecciona DynamoDB, Then el evento contiene los campos validados, correlación y el mismo `acceptedAt` canónico; si requiere alerta, la salida `PENDING` quedó escrita en la misma transacción.
- **AC1.1.3:** Given cada tipo permitido en sus límites válidos, When se envía, Then se acepta.
- **AC1.1.4:** Given carga sostenida de 100 solicitudes válidas/s en `staging`, When se mide con el perfil aprobado, Then p95 es ≤ 500 ms.
- **AC1.1.5:** Given una ruta distinta de `POST /telemetry-events`, When se invoca, Then devuelve recurso inexistente sin invocar la Lambda ni escribir en DynamoDB.
- **AC1.1.6:** Given una respuesta `202` para batería baja, When la alerta aún figura `PENDING`, Then el contrato indica aceptación y persistencia, sin afirmar que el consumidor externo ya recibió la alerta.

**INVEST:** Rebanada de entrada valiosa, estimable y automatizable; depende de la persistencia transaccional de US2.1.

### US1.2 — Recibir errores y límites predecibles

**Como** Integrador de telemetría, **quiero** errores claros ante rutas, credenciales, datos, persistencia o cuota inválidos, **para** corregir el envío sin dejar registros parciales.

- **Priority:** Must Have
- **Depends on:** US1.1
- **Requirements:** FR1.1–FR1.6, FR2.1, FR2.2, FR3.2

**Acceptance Criteria**

- **AC1.2.1:** Given una matriz de campos ausentes/vacíos, tipos inválidos, `value` no finito, timestamp no UTC y valores fuera de cada límite, When se envía cada caso, Then devuelve `400` sin escribir evento ni Outbox ni publicar en SQS de alertas.
- **AC1.2.2:** Given un reloj controlado y un timestamp exactamente `+5 min`, When se envía, Then se acepta.
- **AC1.2.3:** Given un reloj controlado y un timestamp posterior a `+5 min`, When se envía, Then devuelve `400` sin escritura ni publicación.
- **AC1.2.4:** Given clave ausente o inválida, When se invoca, Then API Gateway rechaza sin invocar la Lambda ni escribir en DynamoDB.
- **AC1.2.5:** Given un perfil aislado con una clave y reloj controlados para tasa, ráfaga y cuota, When se envía el último pedido permitido y el primero excedente, Then el primero se admite y el segundo se limita sin interferencia de otras claves o tráfico.
- **AC1.2.6:** Given un fallo de la transacción DynamoDB, When la Lambda procesa la solicitud, Then la API no responde `202`, no deja evento ni salida parcial y registra el error con correlación.

**INVEST:** Camino de error separado, pequeño y verificable por matriz de contrato.

## US2 — Persistir telemetría

### US2.1 — Persistir de forma idempotente

**Como** Ingeniero de plataforma, **quiero** persistir cada evento y su salida de alerta de forma atómica e idempotente, **para** mantener datos consistentes ante reintentos y carreras.

- **Priority:** Must Have
- **Depends on:** US6.1
- **Requirements:** FR4.1–FR4.4, NFR2, NFR4

**Acceptance Criteria**

- **AC2.1.1:** Given una solicitud HTTP válida, When la única Lambda la procesa, Then DynamoDB contiene un único evento con sus campos y `acceptedAt` antes del `202`.
- **AC2.1.2:** Given solicitudes HTTP secuenciales o simultáneas con el mismo `eventId` y payload canónico idéntico, When compiten, Then queda un evento y como máximo una salida con `alertId` determinista.
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

- **AC3.1.1:** Given `battery.value = 0` o `19,99`, When se confirma la transacción, Then cada evento crea una salida `PENDING` con `alertId` determinista derivado de su `eventId` para publicar la alerta.
- **AC3.1.2:** Given `battery.value = 20`, When se procesa, Then se persiste el evento sin salida Outbox ni mensaje en SQS de alertas.
- **AC3.1.3:** Given un evento `temperature` o `speed`, When se procesa, Then se ignora silenciosamente para las alertas de batería.
- **AC3.1.4:** Given una alerta publicada, When un consumidor contractual la lee, Then contiene `alertId`, `eventId`, `vehicleId`, `alertType`, `batteryValue` y `occurredAt` en ISO 8601 UTC, rastreables al evento original.
- **AC3.1.5:** Given dos entregas de un evento con el mismo `eventId` y `battery.value < 20`, When se publica o reintenta la alerta, Then todas las entregas conservan el mismo `alertId` y el consumidor contractual aplica un único efecto lógico; se permiten reentregas físicas.
- **AC3.1.6:** Given eventos de batería fuera de orden cronológico, When llegan por HTTP, Then se procesan sin estado acumulativo: cada evento crea su alerta independiente si `value < 20`, sin cancelar alertas previas.

**INVEST:** Valor para P2 a través del límite externo; duplicados y orden de llegada tienen resultados deterministas y verificables sin implementar al consumidor real.

### US3.2 — Conservar una alerta pendiente ante fallos

**Como** Ingeniero de plataforma, **quiero** conservar y reintentar una publicación de alerta fallida o incierta, **para** evitar pérdidas lógicas.

- **Priority:** Must Have
- **Depends on:** US2.1, US3.1
- **Requirements:** FR4.3, FR4.4, FR5.3, FR5.4, FR6.2, NFR7

**Acceptance Criteria**

- **AC3.2.1:** Given salida `PENDING`, When la publicación falla antes de aceptación, Then permanece pendiente con el mismo `alertId`.
- **AC3.2.2:** Given resultado incierto después de aceptación, When se reintenta, Then se reutiliza el mismo `alertId`.
- **AC3.2.3:** Given confirmación satisfactoria de SQS, When se actualiza la salida, Then transiciona condicionalmente a `PUBLISHED`.
- **AC3.2.4:** Given que SQS aceptó la alerta pero falló la actualización a `PUBLISHED`, When se observa la salida, Then permanece recuperable con el mismo `alertId`; un reintento físico posterior permite un único efecto lógico en el consumidor contractual.

**INVEST:** Recuperación independiente y verificable con fallos inducidos.

## US4 — Recuperar salidas pendientes

### US4.1 — Reintentar salidas pendientes automáticamente

**Como** Ingeniero de plataforma, **quiero** que la misma Lambda recupere periódicamente las salidas pendientes, **para** entregar alertas después de una interrupción sin perder eventos ni depender de una cola de ingreso.

- **Priority:** Must Have
- **Depends on:** US3.2, US6.1
- **Requirements:** FR6.1, FR6.2, FR6.3, NFR7

**Acceptance Criteria**

- **AC4.1.1:** Given salidas `PENDING` vencidas y una salida `PUBLISHED`, When EventBridge invoca la Lambda, Then consulta de forma acotada solo las pendientes elegibles y no vuelve a publicar la ya confirmada.
- **AC4.1.2:** Given una salida pendiente tras fallar SQS de alertas, When llega la siguiente invocación periódica con SQS restablecida, Then la misma Lambda reintenta con el mismo `alertId` y la marca `PUBLISHED` solo tras confirmación.
- **AC4.1.3:** Given fallos de validación, DynamoDB o publicación, When se registran, Then los logs distinguen la causa y contienen correlación y `eventId` disponible sin secretos ni cuerpo crudo.
- **AC4.1.4:** Given invocaciones concurrentes de recuperación, When compiten por una salida, Then una reclamación condicional anterior al envío evita dos propietarios activos; si un resultado incierto provoca reentrega física, todas las copias conservan el mismo `alertId`.

**INVEST:** Recuperación automática acotada y verificable; la frecuencia y el límite de consulta se fijan en Infrastructure Design.

### US4.2 — Ejecutar recuperación controlada

**Como** Ingeniero de plataforma, **quiero** inspeccionar y reintentar salidas Outbox atascadas con alcance controlado, **para** recuperarlas sin duplicar efectos lógicos.

- **Priority:** Must Have
- **Depends on:** US4.1, US2.1
- **Requirements:** FR4.2–FR4.4, FR6.2, FR6.3, NFR7

**Acceptance Criteria**

- **AC4.2.1:** Given un conjunto de salidas `PENDING` dentro del alcance permitido para el rol operativo de P3, When prepara un reintento, Then la herramienta o procedimiento muestra identificadores, cantidad y límite de procesamiento antes de confirmarlo, sin exponer secretos ni payload crudo.
- **AC4.2.2:** Given alcance vacío o actor no autorizado, When intenta reintentar, Then se rechaza sin cambiar ninguna salida.
- **AC4.2.3:** Given confirmación autorizada, When termina el reintento, Then la salida verificable de la herramienta o procedimiento informa identificadores de correlación y cantidades de publicaciones confirmadas, fallidas y aún pendientes.
- **AC4.2.4:** Given un reintento repetido, When procesa salidas existentes, Then no crea eventos ni salidas nuevos y conserva el `alertId` para deduplicación lógica.
- **AC4.2.5:** Given una recuperación fallida o parcial, When se detiene, Then conserva evidencia y las salidas no confirmadas permanecen `PENDING` para la siguiente invocación periódica.

**INVEST:** Experiencia operativa acotada; puede resolverse con CLI o procedimiento y no requiere GUI ni DLQ de ingreso.

## US5 — Medir y observar

### US5.1 — Medir SLO y retención

**Como** Ingeniero de plataforma, **quiero** medir latencia, tiempo de procesamiento, disponibilidad y retención, **para** demostrar los objetivos operativos.

- **Priority:** Must Have
- **Depends on:** US1.1, US2.1
- **Requirements:** NFR1, NFR2, NFR3, NFR4

**Acceptance Criteria**

- **AC5.1.1:** Given el perfil de carga aprobado, When se ejecuta en `staging`, Then sostiene 100 solicitudes válidas/s y p95 ≤ 500 ms.
- **AC5.1.2:** Given una población correlacionada, When se mide desde la recepción HTTP, Then cada `202` corresponde a un evento ya persistido y a su salida cuando aplica, y ≥ 99 % llega a ese estado en <30 s.
- **AC5.1.3:** Given datos sintéticos que incluyen minutos disponibles, fallidos y de mantenimiento, When se aplica la fórmula mensual, Then se comprueba que todos los minutos cuentan en el denominador y se obtiene el porcentaje esperado.
- **AC5.1.4:** Given un evento persistido, When se inspecciona TTL, Then `expiresAt` usa `acceptedAt + 90 días`; la eliminación posterior se trata como eventual.
- **AC5.1.5:** Given un mes calendario observado en `staging`, When se calcula la disponibilidad con datos reales y sin excluir mantenimiento, Then el resultado es ≥ 99,9 %.

**INVEST:** Indicadores delimitados y verificables sin mezclar alarmas de fallos.

### US5.2 — Detectar fallos y acumulaciones

**Como** Ingeniero de plataforma, **quiero** señales y alarmas completas, **para** detectar y correlacionar degradaciones antes de perder datos.

- **Priority:** Must Have
- **Depends on:** US3.2, US4.1, US5.1
- **Requirements:** NFR7

**Acceptance Criteria**

- **AC5.2.1:** Given solicitudes aceptadas/rechazadas, errores de la única Lambda o DynamoDB, fallos de EventBridge y fallos de publicación, When ocurren, Then existen logs y métricas correlacionables.
- **AC5.2.2:** Given antigüedad/cantidad de salidas `PENDING`, profundidad de SQS de alertas o registros TTL elegibles anómalos, When superan la política definida, Then se activa una alarma.
- **AC5.2.3:** Given cada alarma, When se inspecciona su configuración, Then declara indicador, umbral, ventana, severidad, destino y recuperación.
- **AC5.2.4:** Given una alerta operativa, When P3 investiga, Then puede recorrer API Gateway → Lambda única → DynamoDB evento/Outbox → SQS de alertas y la invocación periódica de EventBridge por correlación.

**INVEST:** Observabilidad de fallos separada de SLO; criterios configurables pero verificables.

## US6 — Desplegar y asegurar

### US6.1 — Desplegar infraestructura base reproducible

**Como** Ingeniero de plataforma, **quiero** desplegar la infraestructura base mediante AWS CDK, **para** habilitar el recorrido completo sin configuración manual posterior.

- **Priority:** Must Have
- **Depends on:** None
- **Requirements:** NFR5, NFR9, C1, C2, C6

**Acceptance Criteria**

- **AC6.1.1:** Given una cuenta preparada, When se despliega CDK, Then crea API Gateway REST, una Lambda de telemetría, tablas DynamoDB de eventos y Outbox, regla periódica EventBridge, solo la SQS de alertas, KMS, roles y logs.
- **AC6.1.2:** Given recursos desplegados, When se inspeccionan, Then la SQS de alertas y DynamoDB usan KMS, comunicaciones TLS y roles de mínimo privilegio, sin permisos para consumir una cola de ingreso.
- **AC6.1.3:** Given una segunda cuenta preparada, When se repite el despliegue, Then reproduce `staging` sin cambios manuales.
- **AC6.1.4:** Given el walking skeleton, When se despliega, Then habilita API Gateway REST → Lambda única → DynamoDB evento/Outbox → SQS de alertas y la recuperación periódica de `PENDING` por EventBridge, sin SQS ni DLQ de ingreso.

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
- **Depends on:** US1.1, US2.1, US3.2, US4.1, US6.1
- **Requirements:** NFR8, C3, C5

**Acceptance Criteria**

- **AC6.3.1:** Given un pull request, When ejecuta CI, Then corre Prettier, ESLint, tipos, unitarias, integración AWS simulada y análisis de dependencias/secretos.
- **AC6.3.2:** Given una comprobación fallida, When se evalúa la protección de `main`, Then la fusión queda bloqueada.
- **AC6.3.3:** Given todas las comprobaciones verdes y revisión aprobada, When se fusiona, Then usa *squash* y despliega a `staging`.
- **AC6.3.4:** Given el walking skeleton completo, When corre la prueba crítica con AWS simulado, Then cubre tanto API Gateway REST → Lambda única → transacción DynamoDB evento/Outbox → SQS de alertas como EventBridge periódico → la misma Lambda → recuperación de `PENDING`; también verifica `400` sin efectos, `202` posterior a la transacción y fallo de publicación con salida recuperable.

**INVEST:** Pipeline de calidad acotado y verificable tras el recorrido crítico.

## Story Map

| Rebanada | Historias | Persona principal |
|---|---|---|
| Aceptar | US1.1, US1.2 | P1 |
| Persistir | US2.1 | P3 |
| Alertar | US3.1, US3.2 | P2, P3 |
| Recuperar salidas | US4.1, US4.2 | P3 |
| Medir y observar | US5.1, US5.2 | P3 |
| Desplegar y asegurar | US6.1, US6.2, US6.3 | P3 |

## Assumptions & Open Questions

- El sistema externo aplica deduplicación por `alertId`; la entrega demuestra conformidad mediante un consumidor de prueba.
- Contract Design debe formalizar el contrato de `IDEMPOTENCY_CONFLICT` y decidir el horizonte idempotente después del TTL sin permitir que un payload conflictivo sustituya el primer evento.
- Contract Design debe precisar la respuesta HTTP a duplicados exactos o conflictivos y el resultado de publicación incierta sin debilitar la salida duradera.
- Infrastructure Design debe fijar frecuencia EventBridge, consulta acotada de `PENDING`, concurrencia de la única Lambda, transición condicional y valores completos de alarmas.
- El reintento manual usa el alcance y rol autorizado que permita la herramienta o procedimiento aprobado; no presupone selección arbitraria salida a salida.
- La conformidad de NFR3 requiere observar un mes calendario real en `staging`; los datos sintéticos solo validan la fórmula antes de completar ese periodo.

## Sources

- `inception/requirements-analysis/requirements.md`
- `inception/user-stories/user-stories-questions.md`
- `inception/practices-discovery/team-practices.md`
