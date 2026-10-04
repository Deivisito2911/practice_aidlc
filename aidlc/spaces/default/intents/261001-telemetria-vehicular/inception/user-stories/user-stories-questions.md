# Plan de historias de usuario

Las respuestas definirán las personas, el tamaño y la organización de las historias. Los requisitos funcionales y no funcionales ya aprobados permanecen como fuente obligatoria.

## Q1. Personas principales

¿Qué conjunto de personas debe organizar el backlog?

A. Tres personas: Integrador de telemetría (productor API), Operador de flota (consumidor de alertas) e Ingeniero de plataforma (operación, seguridad y auditoría).
B. Dos personas: Sistema productor y Equipo de plataforma; el consumo de alertas se trata como integración técnica.
C. Cuatro personas: Integrador de telemetría, Operador de flota, Ingeniero de plataforma y Responsable de seguridad separados.
X. Other (please specify)

[Answer]: A. Tres personas: Integrador de telemetría (productor API), Operador de flota (consumidor de alertas) e Ingeniero de plataforma (operación, seguridad y auditoría).

## Q2. Organización de las historias

¿Cómo se divide el trabajo?

A. Por rebanadas verticales de valor: aceptar telemetría, procesar y persistir, alertar, recuperar fallos y operar/auditar.
B. Por componente técnico: API Gateway, SQS, Lambda, DynamoDB, alertas y observabilidad.
C. Por persona, agrupando todas las necesidades de cada actor aunque crucen el mismo flujo.
X. Other (please specify)

[Answer]: A. Por rebanadas verticales de valor: aceptar telemetría, procesar y persistir, alertar, recuperar fallos y operar/auditar.

## Q3. Granularidad del backlog

¿Qué nivel de detalle prefieres?

A. Entre 8 y 12 historias pequeñas, cada una entregable y con 3-6 criterios Given/When/Then.
B. Entre 5 y 7 historias amplias, cada una cubriendo una capacidad completa.
C. Entre 13 y 18 historias muy pequeñas, separando casos principales, errores y operación.
X. Other (please specify)

[Answer]: A. Entre 8 y 12 historias pequeñas, cada una entregable y con 3-6 criterios Given/When/Then.

## Q4. Prioridad de la primera entrega

¿Cómo priorizamos las capacidades?

A. Must Have para ingestión, persistencia idempotente, alerta, reintentos/DLQ, seguridad básica, observabilidad, IaC y CI; CloudTrail y objetivos operativos también son Must Have porque los requisitos los hacen obligatorios.
B. Must Have solo para el recorrido API–SQS–Lambda–DynamoDB–alerta; seguridad avanzada, observabilidad, CloudTrail y CI quedan como Should Have.
C. Must Have para el recorrido y seguridad; rendimiento, disponibilidad, auditoría y automatización quedan como Should Have.
X. Other (please specify)

[Answer]: A. Must Have para ingestión, persistencia idempotente, alerta, reintentos/DLQ, seguridad básica, observabilidad, IaC y CI; CloudTrail y objetivos operativos también son Must Have porque los requisitos los hacen obligatorios.

## Q5. Consumidor de alertas

¿Quién obtiene valor directo de la SQS de alertas en esta entrega?

A. Un sistema de operaciones de flota externo consume alertas lógicas identificadas por `alertId`; su implementación queda fuera, pero el contrato y la deduplicación son parte de la entrega.
B. El equipo de plataforma inspecciona la cola durante el taller; no se define todavía un consumidor externo.
C. Una nueva Lambda consumidora procesa las alertas dentro de esta entrega, aunque no envíe notificaciones externas.
X. Other (please specify)

[Answer]: A. Un sistema de operaciones de flota externo consume alertas lógicas identificadas por `alertId`; su implementación queda fuera, pero el contrato y la deduplicación son parte de la entrega.

## Q6. Recuperación operativa

¿Qué capacidad debe tener el Ingeniero de plataforma ante mensajes en DLQ o salidas de alerta pendientes?

A. Detectar mediante alarmas, correlacionar el fallo, inspeccionar sin exponer secretos y ejecutar una redrive controlada e idempotente mediante un procedimiento documentado.
B. Recibir alarmas e investigar logs; la redrive manual queda fuera de esta entrega.
C. Recuperación totalmente automática, sin intervención humana ni procedimiento manual.
X. Other (please specify)

[Answer]: A. Detectar mediante alarmas, correlacionar el fallo, inspeccionar sin exponer secretos y ejecutar una redrive controlada e idempotente mediante un procedimiento documentado.

## Consolidated Summary Confirmation

- El backlog se organiza para tres personas: Integrador de telemetría, Operador de flota e Ingeniero de plataforma.
- Las historias se dividen en rebanadas verticales de valor: aceptar telemetría, procesar y persistir, alertar, recuperar fallos y operar/auditar.
- Se crearán entre 8 y 12 historias pequeñas, entregables y con 3-6 criterios Given/When/Then.
- Todas las capacidades obligatorias de los requisitos se clasifican como Must Have.
- Un sistema externo de operaciones consume las alertas; su implementación queda fuera, pero el contrato y la deduplicación forman parte de la entrega.
- El Ingeniero de plataforma puede detectar, correlacionar, inspeccionar y ejecutar una redrive controlada e idempotente mediante un procedimiento documentado.

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct