# Decisiones de prácticas del equipo

Estas decisiones establecen cómo se construirá, comprobará y desplegará el servicio de telemetría. Las recomendaciones provienen de las prácticas organizacionales y de las revisiones independientes; no se considerarán acordadas hasta que el equipo las confirme.

## 1. Forma de integrar cambios

¿Cómo quieres que se integren los cambios al proyecto?

A. Desarrollo basado en tronco: ramas cortas, pull request y fusión *squash* a `main`.
B. Desarrollo basado en tronco: ramas cortas y fusión normal/rebase a `main`.
C. Usar una estrategia de ramas distinta; especificar cuál.
X. Other (please specify)

[Answer]: A. Desarrollo basado en tronco: ramas cortas, pull request y fusión *squash* a `main`.

## 2. Primera rebanada integrada

¿Construimos primero una rebanada integrada mínima? Una *walking skeleton* es una versión pequeña que recorre todo el sistema para comprobar que las piezas se conectan antes de añadir el resto de funcionalidades.

A. Sí: incluir API REST, SQS de entrada, Lambda, DynamoDB y también la alerta de batería.
B. Sí: incluir API REST, SQS de entrada, Lambda y DynamoDB; añadir la alerta de batería después.
C. No: implementar los componentes por separado y posponer la comprobación integrada.
X. Other (please specify)

[Answer]: A. Sí: incluir API REST, SQS de entrada, Lambda, DynamoDB y también la alerta de batería.

## 3. Pruebas y calidad

¿Qué postura de pruebas adoptamos para este taller?

A. `test-after`: pruebas unitarias por capa y una prueba de integración crítica con AWS simulado (API–SQS–Lambda–DynamoDB–alerta), ejecutadas en CI junto con formato, lint y análisis de dependencias/secretos.
B. `test-after`: solo pruebas unitarias por capa en esta primera entrega; la integración simulada se planificará más adelante.
C. TDD: escribir primero las pruebas unitarias e incluir la integración crítica simulada antes de la entrega.
X. Other (please specify)

[Answer]: A. `test-after`: pruebas unitarias por capa y una prueba de integración crítica con AWS simulado (API–SQS–Lambda–DynamoDB–alerta), ejecutadas en CI junto con formato, lint y análisis de dependencias/secretos.

## 4. Entrega y seguridad operativa

¿Cómo se desplegará y protegerá el servicio?

A. Desplegar automáticamente a *staging* al fusionar a `main`; exigir aprobación manual para producción; usar IaC, roles temporales OIDC, IAM de mínimo privilegio, KMS, CloudTrail, alarmas, DLQ y un plan de reversión.
B. Desplegar solo un entorno de demostración para el taller; conservar IaC, roles temporales, mínimo privilegio, cifrado, logs y DLQ, sin promoción a producción todavía.
C. Diseñar una estrategia de despliegue diferente; especificar entornos, aprobaciones y controles.
X. Other (please specify)

[Answer]: A. Desplegar automáticamente a *staging* al fusionar a `main`; exigir aprobación manual para producción; usar IaC, roles temporales OIDC, IAM de mínimo privilegio, KMS, CloudTrail, alarmas, DLQ y un plan de reversión.

## 5. Lenguaje y convenciones de código

¿Qué ecosistema y convenciones se usarán?

A. TypeScript con infraestructura como código en AWS CDK; identificadores en inglés (`vehicleId`, `eventType`, `timestamp`, `value`), Prettier, ESLint y comprobación de tipos obligatorios en CI.
B. Python con infraestructura como código en AWS CDK; identificadores en inglés (`vehicle_id`, `event_type`, `timestamp`, `value`), Black, Ruff y comprobación de tipos obligatoria en CI.
C. Elegir otro lenguaje y herramientas; especificar lenguaje, IaC, formateador, linter, comprobación de tipos y convención de identificadores.
X. Other (please specify)

[Answer]: A. TypeScript con infraestructura como código en AWS CDK; identificadores en inglés (`vehicleId`, `eventType`, `timestamp`, `value`), Prettier, ESLint y comprobación de tipos obligatoria en CI.

## Decisiones aún por concretar en requisitos

Después de confirmar estas prácticas, se definirán el contrato detallado de la API y los eventos, autenticación, límites de tasa, idempotencia, reintentos y DLQ, así como el contenido de las alertas.

## Consolidated Summary Confirmation

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct