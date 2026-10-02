# Requisitos del servicio de telemetría vehicular

## Intent Analysis

El objetivo es construir una primera versión desplegable de un servicio gestionado en AWS que reciba telemetría de vehículos por HTTP, desacople su procesamiento mediante SQS, persista cada evento una sola vez en DynamoDB y publique una alerta cuando el nivel de batería sea estrictamente inferior al 20 %. La entrega debe demostrar el recorrido completo API REST → SQS → Lambda → DynamoDB → salida duradera → SQS de alertas, con límites operativos, seguridad básica, recuperación ante fallos y observabilidad verificables.

El valor principal es aceptar telemetría rápidamente sin acoplar al productor con el procesamiento posterior, conservar los eventos de forma fiable y detectar niveles bajos de batería sin perder alertas. Las posibles reentregas físicas de una alerta conservan un identificador estable para representar una única alerta lógica.

## Functional Requirements

### Ingestión HTTP

#### FR1 — Recibir eventos de telemetría

- **FR1.1** — El sistema SHALL exponer `POST /telemetry-events` y aceptar un cuerpo JSON. **Priority:** Must. **Verification:** una solicitud válida alcanza la integración de API Gateway y una ruta distinta devuelve que el recurso no existe. **Source:** [desc], [Q1].
- **FR1.2** — El cuerpo SHALL incluir `eventId`, `vehicleId`, `eventType`, `timestamp` y `value`; los identificadores SHALL ser cadenas no vacías, `timestamp` SHALL ser una fecha ISO 8601 UTC y `value` SHALL ser numérico finito. **Priority:** Must. **Verification:** cada campo ausente, vacío o con tipo inválido produce `400` y no publica ningún mensaje. **Source:** [Q3], [Q9].
- **FR1.3** — `eventType` SHALL admitir únicamente `battery`, `temperature` y `speed` en esta versión. **Priority:** Must. **Verification:** esos tres valores pasan la validación y cualquier otro produce `400` sin publicar. **Source:** [Q3].
- **FR1.4** — Para `battery`, `value` SHALL estar entre 0 y 100 inclusive; para `temperature`, entre −50 y 150 °C inclusive; para `speed`, entre 0 y 300 km/h inclusive. **Priority:** Must. **Verification:** se aceptan ambos límites de cada intervalo y se rechazan valores inmediatamente inferiores o superiores. **Source:** [Q3], [Q9].
- **FR1.5** — `timestamp` SHALL representar un instante UTC que no esté más de cinco minutos en el futuro respecto del reloj del servicio. **Priority:** Must. **Verification:** un evento situado exactamente cinco minutos en el futuro se acepta y uno posterior se rechaza con `400`. **Source:** [Q9].
- **FR1.6** — Tras validar y publicar el evento en la SQS de entrada, la API SHALL responder `202 Accepted` con un identificador de correlación; si la validación o publicación falla, SHALL no responder `202`. **Priority:** Must. **Verification:** una publicación confirmada devuelve `202` y correlación; una entrada inválida devuelve `400` sin mensaje; un fallo simulado de SQS devuelve un error no exitoso y queda registrado. **Source:** [Q1].

### Control de acceso y consumo

#### FR2 — Controlar el acceso de los productores

- **FR2.1** — API Gateway SHALL exigir una clave de API válida para `POST /telemetry-events`. **Priority:** Must. **Verification:** una clave válida permite continuar; una clave ausente o inválida es rechazada por API Gateway y no publica en SQS. **Source:** [Q2].
- **FR2.2** — Cada clave SHALL tener un límite sostenido de 100 solicitudes por segundo, una ráfaga máxima de 200 y una cuota de 5.000.000 de solicitudes por día. **Priority:** Must. **Verification:** las solicitudes dentro de los límites se admiten y las que exceden tasa, ráfaga o cuota reciben la respuesta de limitación de API Gateway. **Source:** [Q2], [Q10].

### Encolado, procesamiento y persistencia

#### FR3 — Desacoplar la ingestión mediante SQS

- **FR3.1** — La API SHALL publicar cada evento válido en una cola SQS estándar de entrada, conservando el contenido validado y el identificador de correlación. **Priority:** Must. **Verification:** por cada respuesta `202` existe un mensaje con los campos validados y la correlación correspondiente. **Source:** [desc], [Q1].
- **FR3.2** — Ninguna solicitud rechazada por validación o control de acceso SHALL publicar un mensaje en la cola de entrada. **Priority:** Must. **Verification:** los casos `400` y los rechazos de clave o cuota dejan inalterado el contador de mensajes publicados. **Source:** [Q1], [Q2].

#### FR4 — Procesar y persistir eventos de forma idempotente

- **FR4.1** — Una función Lambda SHALL consumir los mensajes de la SQS de entrada y persistir los eventos válidos en DynamoDB. **Priority:** Must. **Verification:** un mensaje válido produce un registro recuperable con `eventId`, `vehicleId`, `eventType`, `timestamp` y `value`. **Source:** [desc], [memory:M1].
- **FR4.2** — `eventId` SHALL ser la clave de idempotencia global; la persistencia SHALL usar una escritura condicional para que cada `eventId` se almacene como máximo una vez. **Priority:** Must. **Verification:** entregar dos o más veces el mismo mensaje deja un solo registro de evento. **Source:** [Q4].
- **FR4.3** — Cuando un evento requiera alerta, la misma operación duradera SHALL registrar atómicamente el evento y una salida pendiente con `alertId` determinista derivado de `eventId`. **Priority:** Must. **Verification:** una interrupción en cualquier punto de la escritura deja ambos registros confirmados o ninguno, sin estado «evento persistido sin alerta pendiente». **Source:** [Q11].
- **FR4.4** — Una entrega duplicada del evento SHALL no crear nuevos registros de evento ni de salida; si la salida existente sigue pendiente, SHALL conservarse para que el publicador continúe su recuperación. **Priority:** Must. **Verification:** repetir un evento de batería baja deja un evento y una salida con el mismo `alertId`, y una salida pendiente no se marca como completada por el duplicado. **Source:** [Q4], [Q11].

### Alertas de batería

#### FR5 — Publicar alertas de batería baja sin pérdidas lógicas

- **FR5.1** — Cuando `eventType` sea `battery` y `value < 20`, el sistema SHALL crear una salida duradera para publicar una alerta en una SQS de alertas. **Priority:** Must. **Verification:** valores 0 y 19,99 crean la salida; el valor 20 y cualquier valor superior válido no la crean. **Source:** [desc], [memory:M1], [Q11].
- **FR5.2** — La alerta SHALL contener `alertId`, `eventId`, `vehicleId`, `alertType`, `batteryValue` y `occurredAt`; `alertType` SHALL identificar batería baja y `occurredAt` SHALL usar ISO 8601 UTC. **Priority:** Must. **Verification:** cada alerta publicada contiene todos los campos con tipos válidos y referencia el evento originador. **Source:** [Q6].
- **FR5.3** — Todas las publicaciones o reentregas del mismo evento SHALL usar el mismo `alertId`; el contrato SHALL exigir que el consumidor trate ese identificador como una única alerta lógica. **Priority:** Must. **Verification:** ante un resultado incierto y un reintento, los mensajes observados tienen el mismo `alertId` y el consumidor de prueba aplica el efecto una sola vez. **Source:** [Q11].
- **FR5.4** — El publicador SHALL mantener la salida en estado pendiente hasta confirmar una publicación satisfactoria; ante un fallo o resultado incierto SHALL reintentar con el mismo `alertId`, y solo después de una confirmación SHALL marcarla como publicada. **Priority:** Must. **Verification:** un fallo simulado no elimina la salida; al restaurar SQS se publica la alerta, y un resultado incierto puede reentregarse sin cambiar su identidad lógica. **Source:** [Q6], [Q11].

### Recuperación ante fallos

#### FR6 — Reintentar y aislar mensajes fallidos

- **FR6.1** — Lambda SHALL informar fallos parciales de lote para reintentar únicamente los mensajes fallidos. **Priority:** Must. **Verification:** en un lote con mensajes exitosos y fallidos, solo los fallidos reaparecen en la cola. **Source:** [Q5].
- **FR6.2** — Cada mensaje fallido SHALL admitir hasta cinco recepciones y, tras alcanzar ese máximo sin éxito, SHALL moverse a una DLQ. **Priority:** Must. **Verification:** las primeras cuatro recepciones fallidas reintentan y la quinta deriva el mensaje a la DLQ según la política de redrive configurada. **Source:** [Q5].
- **FR6.3** — Cada fallo SHALL registrar el identificador de correlación, `eventId` cuando esté disponible, contador de recepción y causa, sin exponer claves ni otros secretos. **Priority:** Must. **Verification:** los logs de un fallo contienen esos datos y no contienen la clave de API. **Source:** [Q5], [memory:M1].

## Non-Functional Requirements

- **NFR1 — Latencia de ingestión.** La API SHALL mantener una latencia p95 menor o igual a 500 ms en `staging` bajo una carga sostenida de 100 solicitudes válidas por segundo. **Verification:** una prueba de carga representativa calcula p95 ≤ 500 ms. **Source:** [Q7].
- **NFR2 — Tiempo de procesamiento.** Al menos el 99 % de los eventos aceptados SHALL quedar persistido y, cuando aplique, con su salida de alerta creada, en menos de 30 segundos desde la respuesta `202`. **Verification:** métricas correlacionadas de una prueba integral muestran cumplimiento ≥ 99 %. **Source:** [Q7], [Q11].
- **NFR3 — Disponibilidad.** El endpoint de ingestión en `staging` SHALL alcanzar 99,9 % de disponibilidad por mes calendario, calculada como minutos en los que acepta solicitudes válidas dentro de cuota divididos entre todos los minutos del mes, sin excluir ventanas de mantenimiento. **Verification:** la métrica mensual calculada con ese denominador alcanza ≥ 99,9 %. **Source:** [Q7].
- **NFR4 — Retención.** Cada registro de telemetría SHALL conservar el instante de aceptación HTTP asociado a la respuesta `202 Accepted`; `expiresAt` SHALL calcularse exactamente 90 días después de ese instante y el registro SHALL quedar entonces elegible para eliminación mediante TTL de DynamoDB. La eliminación física posterior SHALL ser eventual, supervisada y sin un plazo máximo propio. **Verification:** una prueba correlaciona la respuesta `202` con el registro persistido, comprueba que `expiresAt` equivale al instante de aceptación más 90 días, confirma TTL habilitado y verifica una métrica/alarma para acumulación anómala de registros elegibles aún no eliminados. **Source:** [Q7], [Q12], [Q13].
- **NFR5 — Cifrado y privilegios.** SQS y DynamoDB SHALL cifrarse con KMS, las comunicaciones SHALL usar TLS y cada rol IAM SHALL limitarse a los recursos y acciones requeridos. **Verification:** las plantillas IaC y comprobaciones de seguridad no contienen recursos sin cifrado ni permisos comodín innecesarios. **Source:** [memory:M1].
- **NFR6 — Credenciales de despliegue.** CI/CD SHALL acceder a AWS mediante roles temporales OIDC y SHALL no almacenar claves AWS persistentes. **Verification:** la configuración del pipeline usa federación OIDC y el escaneo de secretos no encuentra claves persistentes. **Source:** [memory:M1].
- **NFR7 — Observabilidad.** El servicio SHALL emitir logs estructurados y métricas para solicitudes aceptadas/rechazadas, errores Lambda, edad y profundidad de SQS, salidas de alerta pendientes, mensajes en DLQ, errores DynamoDB y fallos de publicación; SHALL configurar alarmas para condiciones operativas críticas. **Verification:** una comprobación desplegada provoca cada señal y confirma su presencia en logs, métricas o alarmas. **Source:** [memory:M1], [Q11], [Q12].
- **NFR8 — Calidad de entrega.** Todo cambio SHALL superar en CI Prettier, ESLint, comprobación de tipos, pruebas unitarias, prueba de integración crítica y análisis de dependencias y secretos antes de integrarse. **Verification:** una comprobación fallida bloquea el pull request y el recorrido verde permite continuar. **Source:** [memory:M1].
- **NFR9 — Infraestructura reproducible.** Todos los recursos AWS de la solución SHALL definirse con TypeScript y AWS CDK, sin configuración manual necesaria para reproducir `staging`. **Verification:** desplegar la pila desde una cuenta preparada crea API Gateway, colas, Lambda, DynamoDB, KMS, roles, logs, alarmas y auditoría requeridos. **Source:** [memory:M1].
- **NFR10 — Auditoría CloudTrail.** CloudTrail SHALL registrar eventos de administración de API Gateway, Lambda, SQS, DynamoDB, KMS, IAM y CloudFormation/CDK de la solución; los logs SHALL cifrarse con KMS, protegerse contra eliminación por roles de aplicación y conservarse al menos 90 días. **Verification:** pruebas de creación, cambio de configuración y eliminación autorizada en cada servicio producen eventos consultables con identidad, acción, recurso y fecha, y las políticas impiden que los roles de aplicación borren el trail o sus logs. **Source:** [memory:M1].

## Constraints

- **C1. Plataforma:** la solución usa AWS API Gateway, SQS, Lambda y DynamoDB. **Source:** [desc].
- **C2. Tecnología:** el código de aplicación y AWS CDK se implementan en TypeScript; los identificadores del contrato y del código permanecen en inglés. **Source:** [memory:M1].
- **C3. Flujo de trabajo:** cada cambio usa una rama corta, pull request y fusión *squash* a `main`. **Source:** [memory:M1].
- **C4. Despliegue:** la fusión a `main` despliega automáticamente a `staging`; producción exige aprobación manual. **Source:** [memory:M1].
- **C5. Pruebas:** se aplica `test-after`, con pruebas unitarias por capa y una prueba integrada del recorrido crítico con AWS simulado. **Source:** [memory:M1].
- **C6. Primera rebanada:** la primera versión integrada incluye ingestión, SQS de entrada, Lambda, DynamoDB, salida duradera y alertas de batería; ninguno de esos elementos puede diferirse. **Source:** [memory:M1], [Q11].
- **C7. Auditoría:** CloudTrail forma parte obligatoria de la infraestructura de `staging` y producción. **Source:** [memory:M1].

## Out of Scope

- Paneles de usuario u operación.
- Consulta histórica de telemetría mediante API.
- Alta, baja o administración del inventario de vehículos.
- Aplicaciones móviles.
- Envío de notificaciones externas por correo, SMS o *push*.
- Analítica avanzada, agregaciones o aprendizaje automático.
- Autorización granular por vehículo o productor más allá de la clave de API inicial.
- Despliegue automático a producción sin aprobación humana.

**Source:** [Q2], [Q8], [memory:M1].

## Assumptions & Open Questions

### Assumptions

- **A1.** La clave de API identifica una credencial de consumo, pero no demuestra identidad fuerte ni limita vehículos concretos; una autenticación más robusta puede incorporarse en una versión posterior. **Rationale:** [Q2] eligió la clave de API como único control inicial.
- **A2.** SQS ofrece entrega al menos una vez, por lo que la identidad lógica estable mediante `eventId` y `alertId` es obligatoria aunque existan reentregas físicas. **Rationale:** [Q4] y [Q11].
- **A3.** Los objetivos operativos se evalúan primero en `staging`; su adopción en producción requerirá la aprobación de despliegue correspondiente. **Rationale:** [Q7], [memory:M1].
- **A4.** La retención CloudTrail mínima de 90 días alinea la auditoría con el horizonte de telemetría; una política organizacional posterior puede ampliarla. **Rationale:** [memory:M1], [Q12].

### Open Questions

- **OQ1.** Contract Design debe fijar el formato exacto y longitud máxima de `eventId`, `vehicleId`, el identificador de correlación, `alertId` y los sobres de error.
- **OQ2.** Contract Design debe decidir cómo responder cuando el mismo `eventId` llega con un contenido diferente al evento ya persistido.
- **OQ3.** Infrastructure Design debe fijar tiempos de visibilidad SQS, tamaño de lote, concurrencia Lambda, retención de DLQ, umbrales de alarma y estrategia de reversión.
- **OQ4.** Code Generation debe seleccionar el framework de pruebas y el simulador AWS compatibles con la prueba integrada acordada.
- **OQ5.** Domain Design e Infrastructure Design deben concretar la estructura del registro de salida duradero y el mecanismo de publicación/reintento, preservando las garantías FR4.3–FR5.4.

Estas preguntas no contradicen las decisiones confirmadas y quedan asignadas a etapas posteriores antes de implementar los contratos correspondientes.

## Sources

- [desc] Initial description: Servicio de telemetría vehicular con API REST, SQS, Lambda, DynamoDB y alertas de batería por debajo del 20 por ciento.
- [scope] Workflow-selected scope: `workshop`.
- [Q1] Contrato HTTP y respuesta asíncrona confirmados en `requirements-analysis-questions.md`.
- [Q2] Control mediante clave de API confirmado en `requirements-analysis-questions.md`.
- [Q3] Tipos y campos comunes del evento confirmados en `requirements-analysis-questions.md`.
- [Q4] Idempotencia por `eventId` confirmada en `requirements-analysis-questions.md`.
- [Q5] Reintentos parciales y DLQ confirmados en `requirements-analysis-questions.md`.
- [Q6] Contrato y recuperación de alertas confirmados en `requirements-analysis-questions.md`.
- [Q7] Rendimiento, procesamiento, disponibilidad y retención confirmados en `requirements-analysis-questions.md`.
- [Q8] Límites de alcance confirmados en `requirements-analysis-questions.md`.
- [Q9] Unidades, rangos y tolerancia temporal confirmados en `requirements-analysis-questions.md`.
- [Q10] Tasa, ráfaga y cuota por clave confirmadas en `requirements-analysis-questions.md`.
- [Q11] Salida duradera, identidad lógica y reentregas de alertas confirmadas en `requirements-analysis-questions.md`.
- [Q12] Elegibilidad TTL a 90 días y eliminación física eventual confirmadas en `requirements-analysis-questions.md`.
- [Q13] Instante de aceptación HTTP como base única para calcular `expiresAt` confirmado en `requirements-analysis-questions.md`.
- [memory:M1] Prácticas afirmadas en `inception/practices-discovery/team-practices.md`.
