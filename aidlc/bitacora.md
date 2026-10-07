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
esta etapa se demoro bastante, el agente presento problemas en el formato de algunos archivos por la migración desde kiro IDE al generar traceability.json dejo el arreglo de cobertura vacio lo que hizo que el flujo se empezara a romper