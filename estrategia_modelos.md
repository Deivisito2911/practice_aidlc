# Estrategia de Modelos para AI-DLC (Optimización de Créditos)

El objetivo de esta guía es evitar el consumo excesivo de créditos asignando el modelo de Codex adecuado a la complejidad de cada fase dentro del ciclo de vida estructurado de AI-DLC.

## 📊 Modelos Disponibles (Catálogo Codex)

Basado en tu entorno, tienes acceso a la siguiente familia de modelos:
*   **GPT-6.1-Sol:** Último "caballo de batalla", balance perfecto para el día a día.
*   **GPT-6-Astra:** Inteligencia de frontera (el más caro y capaz).
*   **GPT-6-Luna:** Modelo rápido y económico para tareas sencillas.
*   *(Opciones Legacy: GPT-6-Sol, GPT-5.6-Sol, GPT-5.6-Terra, GPT-5.6-Luna - **Se recomienda evitarlas** ya que las versiones 6.1 y 6 son más eficientes en costo/beneficio).*

---

## 🛠️ Recomendación por Fases de AI-DLC

### 1. Fase de Ideación (Ideation)
*Etapas: `intent-capture`, `scope-definition`, `feasibility`, `team-formation`.*
*   **Qué hace:** Procesa lenguaje natural, estructura ideas y define el alcance general de tu intención. No requiere razonamiento profundo de código.
*   **Modelo Recomendado:** 🟢 **GPT-6-Luna**
*   **Por qué:** Es rápido y asequible. Capturar requerimientos y estructurar historias de usuario es un trabajo de bajo riesgo técnico donde un modelo eficiente brilla sin quemar créditos.

### 2. Fase de Incepción / Diseño (Inception)
*Etapas: `requirements-analysis`, `domain-design`, `contract-design`, `architecture-review`.*
*   **Qué hace:** Toma las decisiones críticas del proyecto, diseña las estructuras de datos, interfaces (contratos) y la arquitectura base.
*   **Modelo Recomendado:** 🔴 **GPT-6-Astra** (o **GPT-6.1-Sol** si el proyecto es pequeño)
*   **Por qué:** ¡Aquí es donde quieres gastar tus créditos! Un error en el diseño de arquitectura cuesta muchísimo resolverlo en la etapa de código. Utilizar la "inteligencia de frontera" aquí garantiza cimientos sólidos.

### 3. Fase de Construcción (Construction)
*Etapas: `code-generation`, `functional-design`, `build-and-test`, `ci-pipeline`.*
*   **Qué hace:** Escribe el código fuente real, refactoriza y elabora las pruebas unitarias.
*   **Modelo Recomendado:**
    *   Para la lógica central del negocio y algoritmos: 🟡 **GPT-6.1-Sol**.
    *   Para escribir tests unitarios, documentación, o código "boilerplate" repetitivo: 🟢 **GPT-6-Luna**.
*   **Por qué:** *Sol* es el desarrollador mid/senior ideal para el día a día (80% del trabajo). Para trabajo repetitivo, puedes bajar la capacidad a *Luna* y ahorrar bastante.

### 4. Fase de Operación (Operation)
*Etapas: `deployment-execution`, `observability-setup`, `incident-response`.*
*   **Qué hace:** Tareas de infraestructura, scripts de despliegue, Dockerfiles, configuración de monitoreo.
*   **Modelo Recomendado:** 🟡 **GPT-6.1-Sol**
*   **Por qué:** Tareas de DevOps y bash/YAML requieren precisión rigurosa, por lo que *Luna* puede cometer errores sintácticos, pero rara vez requieren la capacidad deductiva de *Astra*. *Sol* es el punto dulce.

---

## 💡 Reglas de Oro para Ahorrar Créditos (Resumen)

1.  **Cambia dinámicamente:** No dejes `GPT-6-Astra` encendido por defecto. Configura tu Codex en `GPT-6.1-Sol` para trabajar, y cuando llegues a una puerta de aprobación (*gate*) de AI-DLC que involucre un rediseño, interrumpe un momento, sube a Astra, corre el rediseño y vuelve a bajar a Sol.
2.  **Cuidado con los reintentos infinitos:** Si un test está fallando y `GPT-6.1-Sol` ya intentó arreglarlo 3 veces sin éxito, en lugar de seguir gastando créditos en bucle, detén la ejecución y pide ayuda a `GPT-6-Astra` en un comando específico.
3.  **Harness Headless vs Interactivo:** Recuerda que las etapas que despachan delegaciones múltiples en paralelo (el modo enjambre/swarm de AI-DLC) multiplicarán el consumo. Asegúrate de usar `GPT-6.1-Sol` o `Luna` si las delegaciones (subagents) son tareas pequeñas.
