# Reglas de negocio de U2 — ampliación operativa

## Source of truth

```yaml
rules:
  - id: BR6.1
    statement: La validación completa de una solicitud inválida termina antes de producir efectos duraderos o publicar.
    category: validation
    applies_to: HTTP ingress
    trigger: solicitud admitida por el control de acceso
    logic: "IF falta un campo, un valor tiene tipo inválido, el número no es finito, el timestamp no es UTC o un valor queda fuera de su rango inclusivo THEN rechazar antes de persistir."
    violation_behaviour: "Responder 400 VALIDATION_ERROR; no crear TelemetryEvent ni OutboxEntry ni publicar en SQS."
    source: [FR1.2, FR1.3, FR1.4, FR1.5, FR3.2]
  - id: BR6.2
    statement: El límite temporal de cinco minutos futuros es inclusivo.
    category: validation
    applies_to: TelemetryEvent.timestamp
    trigger: validación temporal
    logic: "IF timestamp <= reloj del servicio + 5 minutos THEN continuar; IF es posterior THEN rechazar."
    violation_behaviour: "El instante exactamente +5 minutos es válido; uno posterior recibe 400 sin efectos."
    source: [FR1.5]
  - id: BR6.3
    statement: API Gateway rechaza una clave de productor ausente o inválida antes de invocar TelemetryService.
    category: authorization
    applies_to: HTTP ingress
    trigger: comprobación de clave API
    logic: "IF la clave no es válida THEN detener la solicitud antes de Lambda y de cualquier escritura."
    violation_behaviour: "Rechazo del límite HTTP; ninguna invocación ni cambio en las tablas."
    source: [FR2.1, FR3.2]
  - id: BR6.4
    statement: El control de consumo se aplica por clave a tasa, ráfaga y cuota diaria configuradas.
    category: constraint
    applies_to: productor HTTP
    trigger: cada solicitud recibida por API Gateway
    logic: "IF la solicitud está dentro de la tasa sostenida de 100/s, ráfaga de 200 y cuota diaria de 5,000,000 para esa clave THEN admitir su evaluación; en el primer exceso THEN limitar esa clave."
    violation_behaviour: "El exceso recibe rechazo de limitación antes de Lambda y no afecta a otras claves; los límites de uso son objetivos aproximados del proveedor."
    source: [FR2.2]
  - id: BR6.5
    statement: La falla transaccional no produce aceptación ni persistencia parcial.
    category: constraint
    applies_to: HTTP ingress
    trigger: fallo de persistencia transaccional
    logic: "IF no se puede confirmar la transacción THEN no responder 202 nuevo ni conservar solo una parte del evento y su salida."
    violation_behaviour: "Responder error no exitoso, dejar ambos registros sin cambios y emitir error correlacionado sin secretos ni payload crudo."
    source: [FR1.6, FR4.3, FR6.3]
  - id: BR7.1
    statement: Solo una identidad operativa autorizada de P3 puede preparar y ejecutar una recuperación manual.
    category: authorization
    applies_to: RecoveryRun
    trigger: solicitud CLI de vista previa o ejecución
    logic: "IF la invocación no tiene autorización operativa efectiva THEN rechazar antes de leer candidatos o mutar; la identidad se demuestra mediante auditoría y el identificador de invocación generado por la plataforma, nunca mediante el actor declarado en el cuerpo."
    violation_behaviour: "Denegar sin cambios; no se acepta la clave de API de productor como autorización operativa."
    source: [FR6.3, NFR7]
  - id: BR7.2
    statement: La vista previa muestra el alcance exacto, candidatos, cantidad y límite antes de pedir confirmación.
    category: policy
    applies_to: RecoveryRun
    trigger: vista previa solicitada por un actor autorizado
    logic: "IF se prepara una recuperación THEN seleccionar solo salidas elegibles PENDING dentro del alcance permitido y del límite; mostrar identificadores, cantidad y límite sin secretos ni payload crudo."
    violation_behaviour: "No ofrecer ejecución si el alcance está vacío, excede el máximo o no puede mostrarse con claridad."
    source: [FR6.1, FR6.2, NFR7]
  - id: BR7.3
    statement: La ejecución requiere confirmación explícita ligada a la vista previa vigente.
    category: authorization
    applies_to: RecoveryRun
    trigger: confirmación CLI
    logic: "IF la invocación sigue autorizada y confirma una referencia verificable de alcance, IDs ordenados, límite, emisión y vencimiento no alcanzado THEN intentar solo los candidatos mostrados; en otro caso no ejecutar. Cada repetición vuelve a comprobar vigencia, elegibilidad y reclamación."
    violation_behaviour: "Sin confirmación o con campos alterados, referencia vencida o alcance vacío, no cambiar entradas. Una repetición no crea otra salida ni vuelve a enviar deliberadamente una ya publicada."
    source: [FR6.1, FR6.2, NFR7]
  - id: BR7.4
    statement: La recuperación manual reutiliza el procesamiento duradero de Outbox y no crea eventos ni salidas nuevas.
    category: constraint
    applies_to: OutboxEntry
    trigger: reintento manual confirmado
    logic: "IF una salida existente se reintenta THEN preservar alertId y aplicar las mismas condiciones de reclamación y confirmación que la recuperación programada."
    violation_behaviour: "Nunca duplicar TelemetryEvent/OutboxEntry, ni cambiar PENDING a PUBLISHED sin confirmación de publicación."
    source: [FR4.2, FR4.3, FR4.4, FR6.2]
  - id: BR7.5
    statement: El resultado de recuperación es correlacionable y reconcilia los resultados confirmados, fallidos y pendientes.
    category: calculation
    applies_to: RecoveryResult
    trigger: finalización o detención de una ejecución
    logic: "IF comenzó la ejecución THEN informar correlación e identificador de invocación, cantidades confirmadas, fallidas, omitidas y no iniciadas cuya suma reconcilia la población previa; reportar PENDING como observación separada y enlazar la auditoría del actor efectivo."
    violation_behaviour: "No declarar éxito para envíos fallidos o inciertos; registrar evidencia sin exponer secretos ni payload crudo."
    source: [FR6.3, NFR7]
  - id: BR7.6
    statement: La ejecución parcial deja evidencia y conserva como PENDING toda salida no confirmada.
    category: policy
    applies_to: OutboxEntry
    trigger: error, interrupción o detención de recuperación
    logic: "IF una salida no recibe confirmación de publicación THEN conservarla PENDING. Antes de iniciar cada candidata comprobar el presupuesto global restante; al agotarlo detener nuevas reclamaciones y devolver resultado parcial con las salidas no iniciadas."
    violation_behaviour: "No borrar, descartar ni marcar PUBLISHED una salida fallida o incierta."
    source: [FR5.4, FR6.2]
  - id: BR8.1
    statement: El indicador de latencia se evalúa con 100 solicitudes válidas por segundo y p95 máximo de 500 ms en staging.
    category: constraint
    applies_to: ServiceMeasurement
    trigger: prueba de carga de staging
    logic: "IF el perfil sostenido alcanza 100 solicitudes válidas/s THEN medir p95 de extremo a extremo contra 500 ms."
    violation_behaviour: "Un p95 superior a 500 ms es incumplimiento del objetivo y debe ser visible en el resultado de medición."
    source: [NFR1]
  - id: BR8.2
    statement: Cada 202 representa persistencia durable previa y el indicador de procesamiento mide el tiempo desde recepción.
    category: constraint
    applies_to: ServiceMeasurement
    trigger: respuesta de aceptación y agregación de cohortes
    logic: "IF la respuesta es 202 THEN evento, y Outbox cuando aplica, ya están confirmados; medir el porcentaje que alcanza persistencia en menos de 30 segundos desde recepción."
    violation_behaviour: "Cualquier 202 anterior al commit es defecto; el porcentaje objetivo es al menos 99%."
    source: [FR1.6, NFR2]
  - id: BR8.3
    statement: La disponibilidad mensual se calcula sobre todo el mes calendario, incluidas las ventanas de mantenimiento.
    category: calculation
    applies_to: ServiceMeasurement
    trigger: cálculo mensual de staging
    logic: "Calcular minutos disponibles / (minutos disponibles + minutos fallidos + minutos de mantenimiento) × 100; no excluir mantenimiento."
    violation_behaviour: "Los datos sintéticos deben reproducir el resultado esperado y los datos reales deben medir el mes completo contra 99.9%."
    source: [NFR3]
  - id: BR8.4
    statement: La elegibilidad de TTL se calcula exactamente 90 días después de acceptedAt y no implica una fecha límite de borrado físico.
    category: calculation
    applies_to: TelemetryEvent
    trigger: persistencia de evento aceptado
    logic: "IF se fija acceptedAt THEN expiresAt = acceptedAt + 90 días exactos; observar por separado registros elegibles que aún no se hayan eliminado."
    violation_behaviour: "No adelantar ni prometer el borrado físico; reportar una acumulación elegible anómala mediante una señal operativa."
    source: [NFR4]
  - id: BR8.5
    statement: Las mediciones usan cohortes y correlaciones que permiten verificar la relación entre recepción, commit, respuesta y expiración.
    category: policy
    applies_to: ServiceMeasurement
    trigger: captura o consulta de un indicador
    logic: "IF se calcula un indicador de ingesta o retención THEN conservar referencias temporales y correlationId suficientes para reconciliar la población medida."
    violation_behaviour: "No contar una observación que carezca de los hitos necesarios como una aceptación durable demostrada."
    source: [NFR2, NFR4]
  - id: BR9.1
    statement: Las solicitudes aceptadas y rechazadas y los fallos de servicio producen señales correlacionables.
    category: policy
    applies_to: TelemetryService observations
    trigger: solicitud, fallo Lambda, DynamoDB, EventBridge o publicación
    logic: "IF ocurre una de estas condiciones THEN emitir evento de log y métrica clasificados con correlación y causa disponible."
    violation_behaviour: "No incluir clave API, secretos ni cuerpo crudo en la señal."
    source: [FR6.3, NFR7]
  - id: BR9.2
    statement: Las señales de acumulación cubren antigüedad y cantidad PENDING, profundidad de SQS y elegibles TTL no eliminados.
    category: policy
    applies_to: AlarmPolicy
    trigger: observación periódica de acumulaciones
    logic: "IF una señal supera el umbral operativo definido para su ventana THEN activar la alarma correspondiente."
    violation_behaviour: "La alarma debe identificar la población afectada y facilitar la acción de recuperación."
    source: [NFR4, NFR7]
  - id: BR9.3
    statement: Cada alarma operativa define indicador, umbral, ventana, severidad, destino y acción de recuperación.
    category: constraint
    applies_to: AlarmPolicy
    trigger: definición o revisión de una alarma
    logic: "IF se configura una alarma THEN los seis campos son obligatorios y la recuperación corresponde al indicador que disparó."
    violation_behaviour: "Una alarma sin cualquiera de esos campos no es una alarma operativa completa."
    source: [NFR7]
  - id: BR9.4
    statement: Una investigación puede recorrer la cadena de ingesta, persistencia, salida, publicación y recuperación mediante correlaciones.
    category: policy
    applies_to: operational investigation
    trigger: investigación de alarma o incidente
    logic: "IF P3 investiga una observación THEN seguir correlación desde API hasta TelemetryService, TelemetryEvent/OutboxEntry, SQS y activación programada EventBridge."
    violation_behaviour: "Señales sin correlación de etapa o causa se consideran insuficientes para el objetivo de diagnóstico."
    source: [NFR7]
```

## Resumen de reglas

| Grupo | Decisión |
|---|---|
| BR6 | Rechazar entradas inválidas, controlar tiempo inclusivo, credenciales y consumo antes de efectos. |
| BR7 | Autorizar reintentos, mostrar una vista previa limitada, exigir confirmación y preservar evidencia y PENDING. |
| BR8 | Medir carga, durabilidad, disponibilidad mensual y elegibilidad TTL con fórmulas explícitas. |
| BR9 | Correlacionar señales y exigir políticas de alarma completas y accionables. |

Los límites de concurrencia, valores finales de umbral/ventana por alarma, frecuencia de recuperación y máximos físicos de lote se parametrizan durante Infrastructure Design; esta etapa define qué deben medir y preservar.

## Fuentes

`inception/units-generation/unit-of-work.md`, `inception/units-generation/unit-of-work-story-map.md`, `inception/requirements-analysis/requirements.md`, `inception/domain-design/components.md` y `inception/contract-design/contract-summary.md`.
