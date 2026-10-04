# Día 1
- **Qué etapas pasaste:** Instalación y comprobación con `aidlc --doctor`. Lectura de la guía.
- **Qué cambiaste o rechazaste:** Sin cambios en código; solo configuración inicial del entorno.
- **Qué no entendiste:** Todo claro con la lectura inicial de las páginas.

# Día 2
- **Qué etapas pasaste:** Desde Inicio (0.1) hasta la revisión final de Requirements Analysis (2.3).
- **Qué cambiaste o rechazaste:** Rechacé la arquitectura inicial por falta de deduplicación en SQS y forcé límites estrictos de QA. Cambié a GPT 5.6 Sol porque Terra alucinaba, y apliqué workarounds para reparar la configuración y evitar bucles en los hooks de Kiro en Windows.
- **Qué no entendiste:** Por qué los modelos de menor capacidad (Terra) fallan tanto estructurando orquestaciones complejas y la causa del bucle del hook `execute_pwsh` en Windows.