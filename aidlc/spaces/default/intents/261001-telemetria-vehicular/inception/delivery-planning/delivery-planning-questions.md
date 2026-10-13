# Preguntas para planificar la entrega de telemetría

## Decisiones ya fijadas

- U1 `u1-telemetry-core` es la primera unidad y debe entregar un recorrido completo: API Gateway REST → única Lambda → transacción DynamoDB evento/Outbox → SQS de alertas, más recuperación de `PENDING` por EventBridge en esa misma Lambda. Una respuesta ficticia `202` o solo infraestructura no cuentan como primera entrega.
- U2 `u2-telemetry-operations` y U3 `u3-delivery-controls` dependen de U1 y no dependen entre sí. El servicio lógico, la Lambda y las tablas siguen siendo únicos.
- La configuración registrada para Construcción es trabajo por unidad y serial, con puntos de comprobación; ya existe un comando de verificación autorizado: `npm run test:integration -- tests/integration/telemetry-flow.test.ts`.
- Un Bolt es una pasada de construcción sobre una o más unidades que termina en un resultado ejecutable y comprobable. La primera unidad es el *walking skeleton*: la mínima rebanada funcional de extremo a extremo, comprobada antes de ampliar el trabajo.

## 1. Orden económico después de U1

Una vez aprobada la rebanada integrada de U1, ¿qué aporta más valor o reduce más riesgo primero?

A. U3 antes de U2: establecer CI, identidad OIDC, auditoría y promoción protegida antes de ampliar operaciones; ambas unidades se entregan.
B. U2 antes de U3: completar observabilidad, reintento manual y SLO antes de establecer los controles de entrega; ambas unidades se entregan.
C. No fijar preferencia entre U2 y U3; decidir tras la demostración de U1.
X. Other (please specify)

[Answer]: A. U3 primero (Recommended)

## 2. Forma de priorizar

Para tres unidades con U1 obligatorio primero, ¿quieres un modelo numérico de prioridad?

A. No: justificar U1 por prueba integrada y U2/U3 por riesgo y valor, sin puntuación inventada.
B. Sí: usar WSJF (valor, urgencia y reducción de riesgo divididos por tamaño) con los tres beneficios de igual peso y estimaciones explícitas.
C. Sí, con pesos propios que debes indicar.
X. Other (please specify)

[Answer]: A. Sin puntuación (Recommended)

## 3. Tamaño de cada Bolt

¿Cómo agrupamos las unidades en entregas comprobables?

A. Un Bolt por unidad: U1, U3 y U2 en el orden que confirmes; cada una tiene sus propias condiciones de terminado y demostración.
B. Dos Bolts: U1 y después U2+U3 juntos, con una sola revisión del resultado final.
C. Más de tres Bolts: dividir unidades en rebanadas menores; habría que revisar la descomposición aprobada.
X. Other (please specify)

[Answer]: A. Uno por unidad (Recommended)

## 4. Trabajo simultáneo

U2 y U3 son independientes una vez terminado U1. ¿Mantener el trabajo serial ya registrado o pedir ejecución simultánea?

A. Mantener serial y por unidad; empezar el siguiente Bolt tras comprobar el anterior.
B. Tras U1, ejecutar U2 y U3 simultáneamente; cambiar explícitamente la iteración y la ejecución registradas.
C. Mantener cierre serial, pero preparar documentación o configuración de U3 mientras U2 avanza.
X. Other (please specify)

[Answer]: A. Serial (Recommended)

## 5. Preparación externa

Para desplegar en `staging` se necesita una cuenta AWS preparada, permisos de provisión y conexión OIDC de CI. ¿En qué estado están?

A. Preparados y verificables antes de U1.
B. Pendientes; indicar responsable y plazo conocido para ponerlos en el mapa de dependencias.
C. Estado desconocido; registrar responsable y plazo por confirmar, con bloqueo explícito antes del despliegue real.
X. Other (please specify)

[Answer]: C. Desconocido (Recommended)

## 6. Riesgo que más preocupa

¿Qué incertidumbre quieres comprobar de forma especialmente visible en el primer resultado integrado?

A. Pérdida o duplicación lógica de alertas al fallar DynamoDB, SQS o la recuperación.
B. Permisos, cifrado, auditoría y despliegue reproducible en AWS.
C. Latencia y rendimiento bajo 100 solicitudes válidas por segundo.
X. Other (please specify)

[Answer]: A. Alertas duraderas (Recommended)

## 7. Responsabilidad de Construcción

¿Quién debe llevar las tres entregas?

A. Este asistente y sus roles especializados en una sesión de trabajo, con tus aprobaciones en los puntos previstos.
B. Varios equipos independientes, cada uno dueño de una unidad; requiere elegir el ritmo de sus aprobaciones.
C. Aún no se decide; mantener provisionalmente la opción de una sesión.
X. Other (please specify)

[Answer]: A. Una sesión (Recommended)

## 8. Resultado de U1

Propuesta: U1 termina cuando un envío real obtiene `202` **después** de la transacción, batería `20` no alerta, batería menor que `20` crea y publica alerta identificable, y una falla de SQS deja `PENDING` recuperable por EventBridge; la prueba integrada con AWS simulado cubre ambos disparadores. Su hipótesis: el diseño de una Lambda y Outbox evita pérdida lógica sin cola de entrada. ¿Qué ajuste necesita?

A. Aceptar esa condición de terminado, hipótesis y demostración integrada.
B. Cambiar la condición de terminado, hipótesis o demostración; especificar el cambio.
X. Other (please specify)

[Answer]: A. Aceptar U1 (Recommended)

## 9. Resultado de U3

Propuesta: U3 termina con CI que bloquea fallos de formato, *lint*, tipos, pruebas y análisis; despliegue a `staging` por fusión a `main`, OIDC, CloudTrail protegido y aprobación manual de producción. Su hipótesis: los controles permiten promover la misma Lambda con trazabilidad sin credenciales persistentes. ¿Qué ajuste necesita?

A. Aceptar esa condición de terminado, hipótesis y demostración del pipeline.
B. Cambiar la condición de terminado, hipótesis o demostración; especificar el cambio.
X. Other (please specify)

[Answer]: A. Aceptar U3 (Recommended)

## 10. Resultado de U2

Propuesta: U2 termina con matriz completa de errores y cuotas, reintento manual autorizado, métricas/ alarmas, prueba de carga p95 ≤ 500 ms a 100 solicitudes válidas/s y fórmula mensual de disponibilidad verificable. Su hipótesis: el servicio puede operarse y medirse sin alterar los contratos de U1. El objetivo de disponibilidad de 99,9 % requiere observar un mes calendario real y se registra como evidencia pendiente hasta entonces. ¿Qué ajuste necesita?

A. Aceptar esa condición de terminado, hipótesis y demostración operativa.
B. Cambiar la condición de terminado, hipótesis o demostración; especificar el cambio.
X. Other (please specify)

[Answer]: A. Aceptar U2 (Recommended)
