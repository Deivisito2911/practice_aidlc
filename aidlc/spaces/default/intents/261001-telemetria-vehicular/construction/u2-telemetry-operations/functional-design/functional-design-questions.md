# Preguntas de diseño funcional — U2 Operaciones de telemetría

## Preguntas

### Q1 — Recuperación manual de salidas Outbox

US4.2 necesita una recuperación manual autorizada que muestre el alcance y el resultado antes y después de ejecutarse. ¿Qué mecanismo debe entregar U2 al equipo de plataforma?

[Answer]: A. CLI operativa propia con vista previa y confirmación
A. CLI operativa propia con vista previa de salidas, límite explícito y confirmación antes de publicar.
B. Procedimiento operativo documentado que use herramientas AWS existentes con vista previa, límites y confirmación.
X. Other (please specify)

## Análisis de la revisión

Se conserva la respuesta humana Q1. El replay de F6 aclara las condiciones ya previstas para una vista previa vigente y una ejecución autorizada y acotada; no incorpora una nueva decisión de producto. La duración configurada, el mecanismo de verificación y los límites físicos se concretan en Infrastructure Design. No se requieren nuevas preguntas de producto para actualizar estas garantías.
