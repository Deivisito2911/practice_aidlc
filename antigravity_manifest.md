# Antigravity Manifest - Asistente AI-DLC

## 1. Rol y Capacidades
- **Rol:** Asistente experto en IA agéntica, framework AI-DLC, entorno Kiro IDE, creación de agentes y modelos (GPT/Claude).
- **Especialidad:** Aseguramiento de Calidad (QA), resolución de problemas de entorno, y guía estratégica para el desarrollo de proyectos complejos.
- **Regla Estricta:** No modificar, crear o eliminar archivos del proyecto sin autorización explícita (excepto este manifiesto).

## 2. Contexto del Proyecto
- **Proyecto:** Servicio de telemetría vehicular.
- **Arquitectura:** API REST, AWS SQS (con deduplicación/idempotencia), AWS Lambda (procesamiento y DLQ), DynamoDB (retención TTL de 90 días).
- **Reglas de QA:** Límites estrictos para variables (BVA) como batería (0-100) y velocidad (0-300). Rechazo temprano de datos inválidos (400 Bad Request).
- **Modelo Principal AI-DLC:** GPT 5.6 Sol (Recomendado para Inception). Se rotará a Terra en la fase de Construcción para ahorrar créditos.

## 3. Historial de Sesiones y Progreso

### Día 1 y 2 (Recuperados)
- **Estado Inicial:** Proyecto atascado en el Día 2/4.
- **Acciones:**
  - Reformateamos `aidlc/bitacora.md` para cumplir con la regla de 3 líneas exigida por el líder (Ronnie).
  - Confirmamos que la deduplicación de SQS y el análisis de valores límite (BVA) son correctos.

### Día 3 (Actual)
- **Fase actual de AI-DLC:** INCEPTION -> User Stories (2.4).
- **Bloqueo Técnico Resuelto:** El IDE Kiro (Windows) fallaba al ejecutar comandos automáticos (`Exit Code -1`) y obligaba al usuario a gastar créditos en reintentos manuales. 
- **Solución Aplicada:** Modificamos los 3 hooks de Kiro (`aidlc-rebuild-stage-graph.json`, `aidlc-sync-workflow-state.json`, `aidlc-terminal-command-guard.json`) para que usen `aidlc.cmd` en lugar de `aidlc`, restaurando la automatización nativa en Windows.
- **Git:** Se realizó exitosamente el `git push` de la bitácora del Día 2. Los cambios del manifiesto y reparación de hooks se reservan para el commit de cierre del Día 3.
- **Próximo Paso:** El usuario reinició Kiro IDE y le pedirá al agente interno (GPT Sol) que ejecute los comandos pendientes para avanzar de etapa.

---
*Nota para futuras sesiones: Lee este archivo al iniciar para recuperar todo el contexto.*

### Registro de Decisiones e Impacto (Interacciones del Día 3)

- **Interacción 1 (Reanudación manual):** El usuario reportó que Kiro IDE seguía atascándose en la reanudación automática debido a un hook, y decidió continuar el flujo de forma manual para no gastar más créditos.
  - *Mi acción:* Ejecuté por terminal el comando `aidlc engine orchestrate next --resume` para extraer la respuesta que el IDE no podía procesar.
  - *Impacto en el proyecto:* Destrabó el progreso del flujo AI-DLC sin consumir intentos del agente interno, permitiendo continuar desde el punto exacto.

- **Interacción 2 (Directiva run-stage):** El usuario proporcionó el extenso JSON devuelto por el comando de reanudación.
  - *Mi acción:* Interpreté la directiva y le indiqué al usuario cómo alimentar esta información al agente interno de Kiro para que asuma el rol de Product Manager y comience a redactar las historias.
  - *Impacto en el proyecto:* Permitió inicializar correctamente la etapa `user-stories`, asegurando que el agente de Kiro lea las prácticas del equipo y los requisitos funcionales correctos.

- **Interacción 3 (Organización de historias):** El agente interno de Kiro preguntó cómo estructurar las historias de usuario (por rebanadas de valor, por componente, etc.).
  - *Mi acción:* Analicé las políticas en `team.md` y recomendé la opción **1 (Rebanadas verticales de valor)**.
  - *Impacto en el proyecto:* Garantizó que la planificación respete la regla arquitectónica de crear un *Walking Skeleton* de extremo a extremo (API > SQS > Lambda > DynamoDB > Alertas), manteniendo la coherencia de la metodología ágil.

- **Interacción 4 (Granularidad del backlog):** El usuario estaba indeciso entre la opción 1 (8-12 historias entregables) y la opción 3 (13-18 historias separando casos de éxito y errores).
  - *Mi acción:* Recomendé la opción **1** respaldándome en la regla de `inception.md` que exige que las historias sean *independientemente testeables* y no dependan de una secuencia.
  - *Impacto en el proyecto:* Evitó la fragmentación del backlog. Separar el camino feliz de los errores rompería el concepto de entrega de valor completa (rebanada vertical) y violaría las reglas BDD del proyecto.

### 4. Objetivo Estratégico del Aprendizaje
- **Meta Principal:** Comprender profundamente el flujo de AI-DLC, las interacciones entre los agentes (como el rol de QA), la generación documental y las metodologías de prueba.
- **Criterio de Éxito:** El código no será evaluado rigurosamente; lo vital es entregar una aplicación funcional demostrando dominio de la arquitectura, estrategias de pruebas, casos de uso y justificación de decisiones (por qué se elige un scope, cómo operan los agentes).

- **Interacción 5 (Priorización de la primera entrega):** El agente preguntó qué capacidades deben ser "Must Have".
  - *Mi acción:* Recomendé la opción **1** (marcar como Must Have a IaC, CI, CloudTrail, DLQ, etc., no solo el recorrido principal).
  - *Impacto en el proyecto:* Aseguró el cumplimiento de las reglas "ALWAYS" definidas en `team.md`. En AI-DLC, las políticas establecidas en la fase de descubrimiento (como CI, IaC o auditoría obligatorias) no pueden ser degradadas a "Should Have". Además, consolida el objetivo del usuario de aprender cómo el framework exige calidad y operación desde la primera rebanada.

- **Interacción 6 (Consumidor de alertas):** El agente preguntó quién consumirá la SQS de alertas (sistema externo, el equipo de pruebas, o una nueva Lambda a construir).
  - *Mi acción:* Recomendé la opción **1 (Sistema externo de operaciones de flota)**.
  - *Impacto en el proyecto:* Mantuvo el *scope* (alcance) estricto. La arquitectura original exigía publicar en la SQS, pero no construir su consumidor. Al elegir la opción 1, se justifica el valor de negocio de la cola (desacoplamiento para un sistema externo) sin introducir componentes no planificados (como una segunda Lambda) ni limitar el caso de uso a una simple prueba de taller (opción 2).

- **Interacción 7 (Gestión de créditos y modelo):** Ante la advertencia de bajo saldo de créditos en Kiro, debatimos si Antigravity debía asumir el rol de agente conversacional.
  - *Decisión del usuario:* Continuar la etapa actual de historias de usuario en Kiro para vivir la experiencia nativa de AI-DLC. Al finalizar la etapa, se rotará el modelo (probablemente a Terra, como se planeó en el Día 1) para reducir el consumo, y se reevaluará la estrategia de créditos.
  - *Impacto en el proyecto:* Mantiene la integridad de la práctica pedagógica dictada por el líder técnico, asegurando que el usuario experimente de primera mano el flujo, los bloqueos y los *gates* de calidad del framework oficial, mientras se aplica una estrategia responsable de consumo de cómputo.

- **Interacción 8 (Recuperación operativa / DLQ):** El agente preguntó qué capacidades operativas incluir respecto a la DLQ (redrive manual y seguro, solo alertas sin redrive, o recuperación 100% automática).
  - *Mi acción:* Recomendé la opción **1** (detección por alarmas e inspección segura con proceso de *redrive* documentado e idempotente).
  - *Impacto en el proyecto:* Asegura que el "Walking Skeleton" nazca con características reales de grado de producción (Day 2 operations) requeridas por las políticas `ALWAYS` de alarmas y DLQ. Evita el sobre-esfuerzo de la opción 3 (automatización total prematura) y la insuficiencia de la opción 2 (tener DLQ pero no poder reprocesar los mensajes).

- **Progreso actual:** El agente consolidó las decisiones y el motor AI-DLC requiere ejecutar el comando `review-brief summary` para mostrar el plan antes de escribir las historias. El usuario ejecutará esto manualmente.

- **Interacción 9 (Aprobación del plan de historias):** El motor AI-DLC presentó el resumen formal con las 6 decisiones acordadas (rebanadas verticales, Must Have para DevOps, redrive de DLQ, etc.).
  - *Mi acción:* Confirmé que el resumen es exacto a nuestra estrategia.
  - *Impacto en el proyecto:* Al aprobar este *gate*, el motor bloquea las decisiones (evitando cambios de alcance tardíos) y autoriza el gasto de tokens para la generación masiva de los 4 artefactos documentales, asegurando que se escriban con la arquitectura correcta.

### 5. Objetivo Específico del Taller (Día 2/3 - Historias de Usuario)
- **Criterio de Evaluación:** Dedicar esfuerzo a revisar las Historias de Usuario (HU). Cada criterio de aceptación generado debe ser 100% testeable (formato Given/When/Then).
- **Mandato Estricto:** Al momento de revisar las HU, **debemos corregir obligatoriamente al menos un criterio de aceptación** antes de dar la aprobación final, para demostrar la capacidad de revisión crítica del alcance.

### 6. Seguimiento de Puertas Rechazadas (Meta del Taller: 3)
Según la guía `guia-aidlc-deivith.html`, para aprobar el taller se requieren **al menos tres puertas donde se soliciten cambios o se rechacen justificadamente**.
- [x] **Rechazo 1 (Día 2):** Se rechazó la arquitectura inicial por falta de deduplicación en SQS y se forzaron los límites estrictos de QA (BVA).
- [ ] **Rechazo 2 (Día 3 - Actual):** Se realizará en la etapa *User Stories*, forzando la corrección de un criterio de aceptación no testeable.
- [ ] **Rechazo 3 (Futuro):** Se reservará estratégicamente para la etapa *NFR Requirements* (3.2) o *Build and Test* (3.6), asegurando la cobertura de pruebas.

- **Progreso actual:** El agente de Kiro finalizó exitosamente la redacción de `stories.md` y demás documentos tras dos rondas de revisión interna (Mob programming). Ahora el framework exige ejecutar `log review` para la revisión del Product Lead antes de pasarnos el control a nosotros para la aprobación final humana.

- **Interacción 10 (Fallo de Hooks y Veredicto NOT-READY):** Los hooks de Kiro ocultaron la solicitud de revisión del Product Lead. Al reintentar por terminal (`--retry-pending`), el motor AI-DLC bloqueó la acción por agotar el presupuesto de reintentos internos.
  - *Mi acción:* Ejecuté los comandos de recuperación en la terminal local y le entregué al usuario el JSON de error exacto (`Refusing review retry... record the bounded incomplete-review NOT-READY`) para inyectarlo en Kiro.
  - *Impacto en el proyecto:* Al forzar al agente a tragar el error real del motor, evitamos que Kiro entre en un bucle infinito de alucinaciones consumiendo los últimos créditos del usuario. Además, forzar el estado "NOT-READY" acelera la apertura de la puerta humana, dándonos la oportunidad perfecta para ejecutar el "Rechazo 2" obligatorio del taller.

- **Interacción 11 (Cierre del Rechazo #2 - Historias de Usuario):** El usuario solicitó auditar la modificación de la historia de usuario US3.1 antes de aprobarla.
  - *Estado Anterior (AC3.1.5 original):* "Given dos o más entregas del mismo `eventId`... Then existe una sola salida lógica... y la prueba contractual aplica un único efecto." (Ambiguo y difícil de probar a nivel de infraestructura).
  - *Estado Modificado (AC3.1.5 nuevo):* "...When Lambda intenta publicar la alerta en SQS, Then inyecta el `alertId` como `MessageDeduplicationId` nativo en la cola SQS, garantizando que el sistema externo reciba exactamente una (1) alerta y SQS descarte el duplicado."
  - *Razón de la modificación:* El texto original dejaba a libre interpretación del desarrollador cómo evitar el duplicado ("una sola salida lógica"). Al exigir el uso explícito de `MessageDeduplicationId` de SQS, el requerimiento se vuelve 100% auditable y testeable en integraciones (integration tests), forzando el cumplimiento estricto del NFR de idempotencia. Esto completó con éxito el hito del "Rechazo #2" exigido por el Día 2 del taller.

### 7. Resumen de Cierre (Día 2)
- **Estado del Taller:** El Día 2 concluye exitosamente. Las Historias de Usuario (etapa 2.4) fueron generadas, revisadas y aprobadas. 
- **Hito logrado:** Se completó el Rechazo 2/3 (exigido por Ronnie) al forzar la reescritura de la historia de alerta de batería (US3.1) para incluir deduplicación nativa de SQS, asegurando su testabilidad.
- **Transición Operativa:** Debido al agotamiento del límite de créditos mensuales en Kiro IDE, el proyecto ha transicionado a modo híbrido (Agente Antigravity interactuando directamente con el motor CLI de AI-DLC). Kiro ya no será necesario para avanzar las etapas restantes.
- **Siguiente paso pendiente:** Iniciar la etapa de Diseño (Refined Mockups o Domain Design) cuando el usuario retome el chat para el Día 3.
