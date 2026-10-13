# Preguntas de requisitos no funcionales — U1

Los objetivos aprobados de latencia, disponibilidad, retención, cifrado, auditoría y calidad se conservan. Quedan dos decisiones específicas para U1.

## 1. Objetivo temporal de alerta

Ya se exige guardar la salida pendiente antes del 202, pero no existe un plazo máximo de entrega de alertas tras una caída de SQS. ¿Qué objetivo debe regir la recuperación automática? El intervalo real de EventBridge se concretará en el diseño de infraestructura.

A. No añadir un máximo de entrega en U1; medir edad de PENDING, alarmar acumulación y verificar recuperación eventual con el siguiente barrido.
B. Exigir que una alerta pendiente se publique en un máximo de 5 minutos después de restablecerse SQS, bajo carga nominal.
X. Other (please specify)

[Answer]: A. No añadir un máximo de entrega en U1; medir edad de PENDING, alarmar acumulación y verificar recuperación eventual con el siguiente barrido. (Sin máximo nuevo (Recommended))

## 2. Protección de los datos de telemetría

La salida y el evento guardan vehicleId, y el evento puede guardar el JSON recibido para trazabilidad. ¿Qué clasificación operativa aplicamos a esos datos en esta primera entrega?

A. Confidencial: acceso restringido por rol, cifrado KMS y exclusión del contenido crudo de logs.
B. Interna: acceso a roles del servicio y operación, cifrado KMS y exclusión del contenido crudo de logs.
X. Other (please specify)

[Answer]: A. Confidencial: acceso restringido por rol, cifrado KMS y exclusión del contenido crudo de logs. (Confidencial (Recommended))

## Análisis de ambigüedad

Ambas respuestas son concretas y coherentes con los requisitos aprobados. La primera no modifica los objetivos de persistencia ni disponibilidad: solo evita inventar un plazo de entrega de alerta. La segunda fija una clasificación operativa sin atribuir un marco regulatorio no confirmado.
