# Preguntas de diseño NFR — U2

## Evaluación

No quedan preguntas bloqueantes: los objetivos y umbrales iniciales constan en NFR Requirements y la decisión de CLI propia fue elegida en Functional Design. Se diseña la operación para invocar sincrónicamente la misma Lambda mediante identidad IAM P3, recalcular el conjunto de preview antes de ejecutar y rechazar cualquier diferencia. Los recursos y permisos físicos se especificarán en Infrastructure Design.
