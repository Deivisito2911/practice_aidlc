**Collaborator:** aidlc-quality-agent
## Contribution

### Hallazgos

- La postura propuesta (`test-after`, comprobar cada capa antes de integrar la siguiente) es apropiada como punto de partida para el alcance `workshop`, pero sigue siendo un borrador y debe ser afirmada explícitamente.
- El recorrido mínimo debe ser trazable a pruebas: API REST recibe un evento válido → SQS de entrada → Lambda → DynamoDB. La regla de alerta requiere una prueba específica y no debe quedar implícita en la prueba del recorrido normal.
- Cobertura mínima de unidad recomendada:
  - Validación del contrato API: `vehicleId`, tipo, timestamp y valor presentes y válidos; solicitudes inválidas devuelven `400` y no publican en la cola.
  - Lógica Lambda: persistencia del evento, clasificación de batería y umbral estricto (`valor < 20` alerta; `20` no alerta), y ausencia de alerta para otros tipos.
  - Fallos de DynamoDB: reintentos acotados y resultado observable tras agotarlos. La política exacta de reintento todavía no está definida.
- Una prueba de integración del flujo asíncrono con dependencias AWS simuladas (por ejemplo, LocalStack) aportaría confianza sobre publicación/consumo SQS, persistencia DynamoDB y publicación de la alerta. Dado que la estrategia actual es mínima, el equipo debe decidir expresamente si esta excepción crítica se incorpora ahora o queda para una etapa posterior.
- Deben evitarse pruebas dependientes del orden o de estado compartido: usar eventos sintéticos, identificadores únicos y limpieza determinista de colas/tablas.
- No hay lenguaje ni herramientas decididos. Deben seleccionarse el framework de pruebas, formato/linter, comprobación de tipos si aplica, emulador AWS para integración y formato de informes de CI antes de convertir la postura en una puerta ejecutable.
- Propuesta de puertas CI, pendiente de confirmación: en cada cambio, formato/lint, comprobación de tipos cuando aplique, pruebas unitarias y análisis de dependencias/SAST sin hallazgos altos o críticos; antes de promover, pruebas de integración del flujo AWS y publicación de resultados/coverage. No se debe fijar un porcentaje de cobertura sin acordar métrica y umbral.

### Preocupaciones para resolver en la entrevista

1. Confirmar si el alcance mínimo permite una prueba de integración LocalStack para el flujo API–SQS–Lambda–DynamoDB y la alerta, o si se limita estrictamente a pruebas unitarias por requisito.
2. Elegir lenguaje, framework de pruebas, herramientas de lint/formato, type-check, análisis de seguridad/dependencias, emulador AWS y formato de resultados de CI.
3. Definir las puertas obligatorias de CI, las ramas/eventos que las ejecutan, el tratamiento de pruebas inestables y la métrica/umbral de cobertura o calidad.
4. Precisar el contrato de errores de la API: esquema, tipos permitidos, formato y zona horaria del timestamp, validación de rangos de valor y respuesta de error.
5. Precisar semántica de mensajería: número y separación de reintentos, visibilidad de SQS, DLQ, procesamiento parcial de lotes, idempotencia y comportamiento ante mensajes duplicados.
6. Definir contrato de la alerta: atributos/payload, deduplicación y comportamiento si falla la publicación en la cola de alertas.
7. Acordar objetivos no funcionales antes de planificar rendimiento: volumen esperado/pico, latencia API, retraso máximo de procesamiento en cola, tasa de error y criterios de observabilidad. Sin estos objetivos, no procede una puerta de carga ni umbrales de rendimiento.

## Positions

- AGREE: Mantener `test-after` y validar cada capa comprobable antes de integrar la siguiente, sujeto a afirmación del equipo.
- AGREE: Usar la rebanada API REST → SQS → Lambda → DynamoDB como recorrido de referencia inicial.
- OBJECT: La propuesta actual enumera validación, encolado, consumo, persistencia, alerta y reintentos, pero no decide si la estrategia mínima autoriza pruebas de integración ni cómo se ejecutarán; esa brecha debe cerrarse en la entrevista.
- OBJECT: No existen herramientas ni puertas CI afirmadas, por lo que no hay todavía una definición verificable de calidad para bloquear una fusión o promoción.
- OBJECT: Los contratos de API, reintentos, DLQ/idempotencia y alerta carecen de detalles necesarios para casos límite y pruebas repetibles.
