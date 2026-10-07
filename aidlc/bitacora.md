# DÃ­a 1
- **QuÃ© etapas pasaste:** InstalaciÃ³n y comprobaciÃ³n con `aidlc --doctor`. Lectura de la guÃ­a.
- **QuÃ© cambiaste o rechazaste:** Sin cambios en cÃ³digo; solo configuraciÃ³n inicial del entorno.
- **QuÃ© no entendiste:** Todo claro con la lectura inicial de las pÃ¡ginas.

# DÃ­a 2
- **QuÃ© etapas pasaste:** Desde Inicio (0.1) hasta la aprobaciÃ³n de User Stories (2.4).
- **QuÃ© cambiaste o rechazaste:** (1) RechacÃ© la arquitectura inicial en Requirements Analysis por deduplicaciÃ³n. (2) RechacÃ© la historia US3.1 en User Stories exigiendo el uso estricto de `MessageDeduplicationId` en SQS para hacerla testeable (Completando 2 de 3 rechazos del taller). Al agotarse los crÃ©ditos de Kiro, pasÃ© a motor hÃ­brido usando Antigravity y la terminal para forzar la aprobaciÃ³n del estado de AI-DLC.
- **QuÃ© no entendiste:** Por quÃ© Kiro no maneja de forma segura los fallos de sus propios hooks en Windows, llevÃ¡ndolo a bucles infinitos que agotaron la cuota mensual de crÃ©ditos de forma precipitada.

# DÃ­a 3
- **QuÃ© etapas pasaste:** Desde Domain Design (2.6) hasta Delivery Planning (2.9), finalizando con Ã©xito la fase de Inception.
- **QuÃ© cambiaste o rechazaste:** (1) En 2.6 hubo contradicciones arquitectÃ³nicas: la opciÃ³n A impedÃ­a ciertos tests unitarios y la B creaba mÃºltiples Lambdas que contradecÃ­an el Walking Skeleton acordado en el DÃ­a 2; optamos por una Ãºnica Lambda directa. (2) En 2.8 rechacÃ© el contrato base exigiendo trazas (`X-Correlation-Id`) y el cÃ³digo `429 Too Many Requests` para robustez de Day 2 Operations. 
- **QuÃ© no entendiste:** Aclarar con Ronnie las fricciones en la definiciÃ³n del Walking Skeleton en la etapa 2.6 y cÃ³mo la arquitectura impacta la testeabilidad temprana.



# Día 4
- **Qué etapas pasaste:** Inicio de la fase de Construcción (Bolt 1), etapa functional-design (3.1).
- **Qué cambiaste o rechazaste:** El archivo traceability.json generado inicialmente dejó el arreglo de cobertura vacío debido a la migración desde Kiro IDE. Corregí manualmente el archivo mapeando los criterios de aceptación y completé los artefactos documentales.
- **Qué no entendiste:** El flujo se rompió y entró en un bucle infinito en CLI (run-stage). Descubrí que el motor requiere obligatoriamente la ejecución de una revisión interna (log review por parte de aidlc-architecture-reviewer-agent) para emitir el recibo de unidad completada y abrir la puerta humana, lo cual en Kiro sucedía automáticamente pero en consola tuve problemas para replicar.
