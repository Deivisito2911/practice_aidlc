# Reglas de negocio de U1

## Source of truth

```yaml
rules:
  - id: BR1.1
    statement: Solo POST /telemetry-events con clave de API válida llega al caso de uso HTTP.
    category: authorization
    applies_to: HTTP ingress
    trigger: solicitud entrante
    logic: "IF ruta/método o clave no son válidos THEN el límite HTTP rechaza antes de invocar TelemetryService."
    violation_behaviour: "Ruta inexistente o rechazo de API Gateway; sin escrituras ni envío."
    source: [FR1.1, FR2.1, FR3.2]
  - id: BR1.2
    statement: El cuerpo JSON contiene exactamente los cinco campos contractuales y sus tipos válidos.
    category: validation
    applies_to: TelemetryEvent
    trigger: solicitud HTTP admitida
    logic: "IF JSON, campos, identificadores ASCII de 1..128 o número finito fallan THEN rechazar."
    violation_behaviour: "400 VALIDATION_ERROR; sin efectos."
    source: [FR1.2, FR3.2]
  - id: BR1.3
    statement: Solo battery, temperature y speed se admiten con sus rangos inclusivos.
    category: validation
    applies_to: TelemetryEvent
    trigger: validación de evento
    logic: "IF battery fuera de 0..100, temperature fuera de -50..150 o speed fuera de 0..300 THEN rechazar."
    violation_behaviour: "400 VALIDATION_ERROR; sin efectos."
    source: [FR1.3, FR1.4]
  - id: BR1.4
    statement: timestamp es UTC ISO 8601 y no supera el reloj del servicio más cinco minutos.
    category: validation
    applies_to: TelemetryEvent
    trigger: validación de evento
    logic: "IF instante inválido, no UTC o estrictamente posterior al límite inclusivo THEN rechazar."
    violation_behaviour: "400 VALIDATION_ERROR; sin efectos."
    source: [FR1.5]
  - id: BR1.5
    statement: Los rechazos de validación no alteran eventos, Outbox ni SQS.
    category: constraint
    applies_to: HTTP ingress
    trigger: error de validación
    logic: "IF falla cualquier validación THEN terminar antes de transacción o publicación."
    violation_behaviour: "400; registrar causa y correlación sin datos sensibles."
    source: [FR1.6, FR3.2]
  - id: BR2.1
    statement: Un eventId nuevo se persiste una vez; batería baja crea su salida en la misma transacción condicional.
    category: constraint
    applies_to: [TelemetryEvent, OutboxEntry]
    trigger: evento válido nuevo
    logic: "IF eventId no existe THEN escribir evento y, si corresponde, Outbox PENDING de forma atómica."
    violation_behaviour: "Fallo o resultado incierto no devuelve 202; el reintento consulta la identidad."
    source: [FR1.6, FR4.1, FR4.2, FR4.3]
  - id: BR2.2
    statement: Un duplicado exacto conserva el evento y su salida originales.
    category: policy
    applies_to: [TelemetryEvent, OutboxEntry]
    trigger: eventId ya existente
    logic: "IF los cinco campos canónicos coinciden THEN responder 202 con acceptedAt y correlationId originales."
    violation_behaviour: "No reescribir ni disparar publicación por el duplicado."
    source: [FR4.2, FR4.4]
  - id: BR2.3
    statement: Reutilizar eventId con contenido contractual distinto es conflicto.
    category: constraint
    applies_to: TelemetryEvent
    trigger: eventId ya existente
    logic: "IF difiere cualquiera de los cinco campos canónicos THEN responder 409 IDEMPOTENCY_CONFLICT."
    violation_behaviour: "Conservar evento y salida iniciales; registrar correlación."
    source: [FR4.2, FR4.4]
  - id: BR2.4
    statement: La respuesta 202 sigue a la confirmación durable y no acredita entrega de alerta.
    category: policy
    applies_to: HTTP response
    trigger: transacción confirmada o duplicado exacto
    logic: "IF se confirma persistencia o identidad original THEN responder 202; un fallo SQS posterior no revoca 202."
    violation_behaviour: "Fallo de persistencia o confirmación incierta responde 503 o 500, nunca 202 nuevo."
    source: [FR1.6, NFR2]
  - id: BR2.5
    statement: expiresAt del evento es acceptedAt más 90 días exactos a precisión de segundos.
    category: calculation
    applies_to: TelemetryEvent
    trigger: creación del evento
    logic: "IF se asigna acceptedAt THEN calcular expiresAt desde ese mismo instante; TTL solo da elegibilidad."
    violation_behaviour: "No persistir un evento con metadatos temporales incoherentes."
    source: [NFR4]
  - id: BR3.1
    statement: Solo battery con value estrictamente menor que 20 genera una alerta.
    category: constraint
    applies_to: OutboxEntry
    trigger: evento validado
    logic: "IF eventType=battery AND value<20 THEN crear una salida; ELSE ninguna."
    violation_behaviour: "value=20, temperature y speed no producen mensaje."
    source: [FR5.1]
  - id: BR3.2
    statement: La identidad de alerta es LOW_BATTERY seguida de dos puntos y eventId.
    category: calculation
    applies_to: OutboxEntry
    trigger: creación y cada intento de envío
    logic: "IF se forma o reenvía alerta THEN usar siempre alertId=LOW_BATTERY:{eventId}."
    violation_behaviour: "Nunca generar una identidad nueva en reintento."
    source: [FR5.3]
  - id: BR3.3
    statement: El mensaje contiene los seis campos obligatorios y la correlación como atributo.
    category: constraint
    applies_to: SQS alert message
    trigger: publicación
    logic: "IF se publica THEN formar el mensaje desde la salida durable, con occurredAt del timestamp original."
    violation_behaviour: "No enviar mensaje incompleto; dejar PENDING y registrar error."
    source: [FR5.2]
  - id: BR3.4
    statement: El primer intento sucede tras el commit durante la solicitud inicial; queda limitado en tiempo.
    category: policy
    applies_to: HTTP low-battery flow
    trigger: nueva transacción confirmada
    logic: "IF hay Outbox PENDING nuevo THEN intentar reclamarlo y publicarlo antes del 202 dentro del presupuesto."
    violation_behaviour: "Fallo o falta de tiempo deja PENDING; responder 202 por la transacción."
    source: [FR1.6, FR5.4]
  - id: BR4.1
    statement: Solo una reclamación condicional vigente puede poseer una salida pendiente.
    category: constraint
    applies_to: OutboxEntry
    trigger: intento HTTP o barrido programado
    logic: "IF status=PENDING y nextAttemptAt venció y no hay arrendamiento vigente THEN asignar token y plazo condicionalmente."
    violation_behaviour: "Perdedor no publica; la expiración permite recuperación."
    source: [FR6.1, FR6.2]
  - id: BR4.2
    statement: PUBLISHED requiere confirmación SQS y posesión condicional de la salida.
    category: constraint
    applies_to: OutboxEntry
    trigger: resultado de envío confirmado
    logic: "IF SQS confirma y token sigue siendo propietario THEN marcar PUBLISHED sin crear otra salida."
    violation_behaviour: "Si falla actualización, PENDING sigue recuperable con el mismo alertId."
    source: [FR5.4, FR6.2]
  - id: BR4.3
    statement: Fallo o resultado incierto mantiene PENDING para reintento.
    category: policy
    applies_to: OutboxEntry
    trigger: fallo, timeout o respuesta incierta de SQS
    logic: "IF el envío no queda confirmado THEN liberar o dejar expirar la reclamación y fijar próxima elegibilidad."
    violation_behaviour: "Nunca descartar la salida ni marcar PUBLISHED; reusar alertId."
    source: [FR5.3, FR5.4, FR6.2]
  - id: BR4.4
    statement: El barrido programado procesa solo pendientes vencidos en lotes acotados.
    category: policy
    applies_to: scheduled recovery
    trigger: evento EventBridge programado
    logic: "IF se recibe activación programada THEN consultar índice de PENDING vencidos y reclamar hasta el límite de trabajo."
    violation_behaviour: "PUBLISHED y pendientes futuros no se envían; fallos quedan para otra ronda."
    source: [FR6.1]
  - id: BR4.5
    statement: Cada fallo observable lleva correlación y causa sin secretos.
    category: policy
    applies_to: [HTTP ingress, scheduled recovery]
    trigger: error de validación, DynamoDB o SQS
    logic: "IF ocurre fallo THEN registrar clase, correlationId y eventId disponible."
    violation_behaviour: "No registrar clave API ni cuerpo crudo."
    source: [FR6.3]
  - id: BR5.1
    statement: Una sola Lambda atiende HTTP y recuperación; la única cola es la de alertas.
    category: constraint
    applies_to: service topology
    trigger: despliegue
    logic: "IF se despliega U1 THEN crear API REST, una Lambda, dos tablas, regla EventBridge y SQS de alertas."
    violation_behaviour: "No desplegar SQS ni DLQ de ingreso ni otra Lambda de telemetría."
    source: [FR3.1, NFR9]
  - id: BR5.2
    statement: Las tablas y SQS usan KMS, TLS y permisos mínimos.
    category: policy
    applies_to: service topology
    trigger: despliegue
    logic: "IF se aprovisionan recursos THEN cifrar y limitar acciones del rol a recursos requeridos."
    violation_behaviour: "Configuración insegura impide aceptación del despliegue."
    source: [NFR5]
```

## Resumen de reglas

| Grupo | Decisión |
|---|---|
| BR1 | Admitir solo solicitudes autorizadas y válidas; todo rechazo ocurre antes de los efectos. |
| BR2 | Transacción condicional, idempotencia y respuesta ligada a la persistencia original. |
| BR3 | Umbral estricto, alerta estable y primer intento inmediato limitado. |
| BR4 | Reclamar, confirmar y recuperar publicaciones sin perder PENDING. |
| BR5 | Una Lambda y una sola SQS de alertas, con seguridad mínima. |

El consumidor contractual deduplica por alertId; las reentregas físicas son posibles. Las reglas de índice, intervalo de EventBridge, tiempo de arrendamiento y presupuesto de publicación reciben valores concretos en Infrastructure Design.
