# Día 1

aidlc instalado y comprobado con aidlc --doctor en el repositorio. Lectura de las páginas realizada.

# Día 2

**Etapas pasadas:** 
Avanzamos desde Inicio (0.1) hasta la revisión final de Requirements Analysis (2.3). Las puertas (gates) tomaron más tiempo del esperado debido al nivel de profundidad técnica y análisis requerido.

**Bloqueos y Resolución de Entorno:**
1. **Capacidad del Modelo:** El modelo inicial (GPT 5.6 Terra) no rendía lo suficiente para la complejidad estructural de AI-DLC, provocando bloqueos y alucinaciones en el formato. Al cambiar a "Sol", el flujo de orquestación funcionó correctamente.
2. **Integridad de Configuración:** Un cambio manual en el archivo de inducción provocó un fallo de firma (Exit Code -1). Lo solucionamos forzando la regeneración de la configuración vía terminal (`aidlc config models` -> guardado `local`).
3. **Hooks en Windows:** El hook de sincronización de Kiro (`aidlc-sync-workflow-state`) generaba bucles infinitos de fallos al usar `execute_pwsh`. Aplicamos un workaround ejecutando los comandos de AI-DLC manualmente en una PowerShell nativa y reanudando la sesión (`/aidlc --resume`).

**Decisiones Arquitectónicas y Correcciones (Enfoque QA):**
- **Idempotencia y SQS:** Aprendizaje clave: SQS usa *at-least-once delivery* (siempre duplicará mensajes eventualmente, no es un bug). AI-DLC detectó un fallo crítico en el diseño inicial (R-01: pérdida de alertas). Lo corregimos forzando un identificador determinista para deduplicación lógica, garantizando entrega sin spam de duplicados.
- **Testabilidad (Límites Estrictos):** Para asegurar que QA pueda hacer pruebas de valores límite (BVA), no permitimos variables abiertas. Forzamos rangos exactos (batería 0-100, velocidad 0-300) y tiempos estrictos en UTC.
- **Retención (NFRs):** Aclaramos que los 90 días de retención (TTL en DynamoDB) deben empezar a contar desde el instante de aceptación HTTP, evitando problemas si el reloj del carro está desfasado.
- **Resiliencia:** Implementamos procesamiento parcial de lotes para Lambda y el uso de una DLQ (Dead Letter Queue) tras 5 reintentos fallidos.

**Nota final:** El Agente de Calidad interno de AI-DLC actúa excelente al recibir correcciones y autoanalizarse. Logró frenar arquitecturas defectuosas antes de escribir una sola línea de código.