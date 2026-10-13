# Día 1
- **Qué etapas pasaste:** Instalación y comprobación con `aidlc --doctor`. Lectura de la guía.
- **Qué cambiaste o rechazaste:** Sin cambios en código; solo configuración inicial del entorno.
- **Qué no entendiste:** Todo claro con la lectura inicial de las páginas.

# Día 2
- **Qué etapas pasaste:** Desde Inicio (0.1) hasta la aprobación de User Stories (2.4).
- **Qué cambiaste o rechazaste:** (1) Rechacé la arquitectura inicial en Requirements Analysis por deduplicación. (2) Rechacé la historia US3.1 en User Stories exigiendo el uso estricto de `MessageDeduplicationId` en SQS para hacerla testeable (Completando 2 de 3 rechazos del taller). Al agotarse los créditos de Kiro, pasé a motor híbrido usando Antigravity y la terminal para forzar la aprobación del estado de AI-DLC.
- **Qué no entendiste:** Por qué Kiro no maneja de forma segura los fallos de sus propios hooks en Windows, llevándolo a bucles infinitos que agotaron la cuota mensual de créditos de forma precipitada.

# Día 3
- **Qué etapas pasaste:** Desde Domain Design (2.6) hasta Delivery Planning (2.9), finalizando con éxito la fase de Inception.
- **Qué cambiaste o rechazaste:** (1) En 2.6 hubo contradicciones arquitectónicas: la opción A impedía ciertos tests unitarios y la B creaba múltiples Lambdas que contradecían el Walking Skeleton acordado en el Día 2; optamos por una única Lambda directa. (2) En 2.8 rechacé el contrato base exigiendo trazas (`X-Correlation-Id`) y el código `429 Too Many Requests` para robustez de Day 2 Operations. 
- **Qué no entendiste:** Aclarar con Ronnie las fricciones en la definición del Walking Skeleton en la etapa 2.6 y cómo la arquitectura impacta la testeabilidad temprana.

# Día 4
- **Qué etapas pasaste:** Inicio de la fase de Construcción (Bolt 1), etapa functional-design (3.1).
- **Qué cambiaste o rechazaste:** El archivo traceability.json generado inicialmente dejó el arreglo de cobertura vacío debido a la migración desde Kiro IDE. Corregí manualmente el archivo mapeando los criterios de aceptación y completé los artefactos documentales.
- **Qué no entendiste:** El flujo se rompió y entró en un bucle infinito en CLI (run-stage). Descubrí que el motor requiere obligatoriamente la ejecución de una revisión interna (log review por parte de aidlc-architecture-reviewer-agent) para emitir el recibo de unidad completada y abrir la puerta humana, lo cual en Kiro sucedía automáticamente pero en consola tuve problemas para replicar.


# Día 5
- **Qué etapas pasaste:** Desde la resolución del bucle en *functional-design* hasta la finalización de la etapa *Code Generation*, logrando que las 23 pruebas unitarias y la prueba integrada de nuestro *Walking Skeleton* pasaran en verde a la primera.
- **Qué cambiaste o rechazaste:** En las puertas de aclaración prioricé los requisitos de negocio (BDD) sobre los contratos: permití IDs flexibles para hardware IoT y forcé el patrón Outbox transaccional para alertas. Además, cambié la estrategia de entorno inyectando manualmente las firmas de *trust* en Codex para evitar los bloqueos del TUI.
- **Qué no entendiste:** Me costó entender por qué el framework entraba en un bucle fantasma de `load-steering`, hasta que descubrí que el motor dependía internamente de `bun` para ejecutar validaciones en TypeScript, el cual fallaba en silencio en Windows al instalarse vía npm.

# Día 6
- **Qué etapas pasaste:** Desde NFR Design (3.3) hasta el rediseño y revisión humana en Infrastructure Design (3.4).
- **Qué cambiaste o rechazaste:** Rechacé tajantemente el diseño de infraestructura porque Codex "alucinó" una arquitectura de 3 Lambdas que rompía la estrategia minimalista. Obligué al agente a regresar a la "Única Lambda procesadora" acordada. También rechacé su intento de cambiar el contrato para aceptar basura asíncrona (código 202), forzándolo a mantener nuestro rechazo síncrono original (código 400).
- **Qué no entendiste:** Me pareció curioso y confuso ver cómo el agente (Codex) intentaba "auto-aprobarse" las etapas sin hacer el trabajo (LLM laziness), y cómo el framework AI-DLC fue tan estricto al final que bloqueó el cierre de la etapa porque la corrección de los documentos de diseño invalidó el checkpoint del código anterior.

# Día 7
- **Qué etapas pasaste:** Desde la puerta de aprobación de Code Generation (3.5) en Construcción hasta la aprobación formal de Domain Design (2.6) en Incepción.
- **Qué cambiaste o rechazaste:** Apliqué Request Changes en Code Generation al detectar que el código ejecutaba 3 Lambdas y SQS de entrada, contradiciendo la especificación de infraestructura aprobada de 1 sola Lambda con Outbox. Al elegir actualizar decisiones anteriores, el motor activó la retropropagación de AI-DLC hasta Practices Discovery (2.2), donde eliminamos la regla heredada en project.md y team.md, realineando y aprobando en cascada Requirements (2.3), User Stories (2.4), Refined Mockups (2.5) y Domain Design (2.6) con el componente único TelemetryService y sus ADRs, rotando tácticamente a Luna por límite de cuota.
- **Qué no entendiste:** La rigidez de la máquina de estados de AI-DLC en Refined Mockups, que bloqueó temporalmente el reporte de cierre hasta que sincronizamos formalmente el registro de la decisión de "Sin cambios pendientes" mediante el comando de reanudación.

# Día 8
- **Qué etapas pasaste:** Desde Units Generation (2.7), Contract Design (2.8) y Delivery Planning (2.9) cerrando formalmente la fase de Inception (Verified), hasta la construcción y generación de código de las 3 unidades de Construcción (U1 núcleo con Walking Skeleton, U2 operaciones y manual recovery, U3 controles de entrega con GitHub Actions), alcanzando la etapa Build and Test (3.6) con 49 pruebas automatizadas aprobadas.
- **Qué cambiaste o rechazaste:** En U1 consolidé la topología estricta de una sola Lambda con Outbox y barrido por EventBridge, descartando colas o DLQ de ingreso. En U2 corregí la discrepancia en la pregunta del checkpoint para incluir el comando de prueba verificado. En U3 seleccioné GitHub Actions con OIDC sin credenciales estáticas y analicé y excluí 13 fingerprints de hashes sintéticos de CDK en Gitleaks 8.30.1, logrando que la auditoría de secretos cerrara con Exit: 0.
- **Qué no entendiste:** La sensibilidad de los guardarraíles criptográficos de AI-DLC en Windows durante la aprobación de checkpoints, donde el motor rechaza temporalmente la aprobación si el texto del prompt interactivo omite el comando exacto de verificación hasta que el agente re-emite la pregunta con el fingerprint completo.

# Día 9
- **Qué etapas pasaste:** El Loop-Back desde Build and Test (3.6) hacia Code Generation (3.5) por los hallazgos F1–F7. Revalidación completa y sellado de U1 (Walking Skeleton) sin cambios de código, ejecución del plan de 15 pasos de U2 (operaciones) con 146 pruebas en verde, y avance en U3 (controles de entrega) hasta resolver las dependencias de CDK.
- **Qué cambiaste o rechazaste:** Rechacé tocar o reconstruir el código del núcleo (U1) durante el retorno de Build and Test, forzando un plan de solo revalidación para aislar los defectos en U2 y U3. En U2 aprobé blindar la herramienta de recuperación manual con firmas KMS HMAC y expiración (300 s) en lugar de permitir reintentos libres. En U3 evité usar un `npm audit fix` indiscriminado y apliqué la actualización quirúrgica a `aws-cdk-lib: 2.273.0`, cerrando el hallazgo F1 con 0 vulnerabilidades.
- **Qué no entendiste:** Al inicio me causó confusión por qué el framework obligaba a revalidar U1 cuando los defectos pertenecían a U2 y U3 (hasta comprender que el modo `unit-major` exige certificar la base de no-regresión antes de tocar las capas superiores), y me causó inquietud ver al agente declarar el "código congelado" (*Code Freeze*) hasta entender que es el paso de seguridad de AI-DLC para garantizar que la evidencia coincida bit a bit con los hashes del repositorio.
