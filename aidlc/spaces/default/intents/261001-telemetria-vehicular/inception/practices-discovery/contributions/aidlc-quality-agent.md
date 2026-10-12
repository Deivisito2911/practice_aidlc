**Collaborator:** aidlc-quality-agent

## Contribution

La postura `test-after` y su orden explícito coinciden con la primera decisión humana y con la estrategia mínima del taller. El borrador conserva pruebas unitarias por capa y una prueba integrada crítica con AWS simulado. La cobertura propuesta verifica el límite estricto `value < 20`, el rechazo sin efectos de entradas inválidas y la respuesta de error cuando DynamoDB no confirma la persistencia. La respuesta `202` debe comprobarse solo después de que la transacción de evento y salida Outbox se haya confirmado.

Para la arquitectura revisada, la prueba integrada debe invocar la misma Lambda en sus dos modalidades: solicitud HTTP de API Gateway y barrido periódico de EventBridge. Debe comprobar que la transacción crea juntos el evento y la salida `PENDING`, que un fallo transaccional no deja ninguno, y que la publicación en SQS de alertas no ocurre antes de confirmar la transacción. Las pruebas de recuperación deben cubrir publicación fallida, salida que permanece `PENDING`, reintento posterior y transición a estado enviado solo después de un envío confirmado.

El borrador menciona idempotencia, pero la entrevista debe precisar el resultado esperado ante eventos HTTP repetidos, barridos concurrentes y un resultado incierto del envío a SQS. Una entrega SQS puede repetirse; se necesita una decisión comprobable sobre `alertId`, reclamación condicional de salidas y deduplicación o tolerancia a duplicados del consumidor. Preguntar también por el intervalo de EventBridge, el máximo tiempo aceptable de una salida `PENDING` y la alarma correspondiente; esos valores permitirán convertir la recuperación en criterios verificables. No trasladar pruebas de reintento por lote ni DLQ de la SQS de entrada retirada.

La puerta de CI propuesta cubre formato, ESLint, tipos, pruebas y análisis de dependencias y secretos. La evidencia disponible no identifica aún la plataforma, el simulador AWS, los comandos de prueba ni un umbral porcentual de cobertura. Mantener explícita esa incertidumbre y confirmar si el equipo desea fijar tales valores; la estrategia mínima no impone por sí sola un porcentaje. Toda comprobación que el equipo afirme debe ejecutarse y bloquear la integración cuando falle.

Existe una contradicción de promoción que requiere atención antes de afirmar este borrador: `memory/project.md` todavía contiene reglas `ALWAYS` de SQS de entrada y de DLQ genérica. La promoción descrita para esta etapa agrega restricciones nuevas, mientras la nueva arquitectura prohíbe SQS de entrada. No basta con añadir `NEVER` de SQS de entrada: hay que retirar o sustituir la obligación antigua mediante el mecanismo autorizado, o la memoria resultante conservará reglas incompatibles. La respuesta humana reciente resolvió que prevalece la arquitectura nueva, pero la memoria vigente aún no refleja esa resolución.

## Positions

AGREE: Conservar `test-after`, pruebas unitarias por capa, integración crítica con AWS simulado y puertas de CI ya afirmadas, adaptando el recorrido a API Gateway REST → una Lambda → DynamoDB/Outbox → SQS de alertas, con EventBridge para `PENDING`.

OBJECT: Afirmar la nueva prohibición de SQS de entrada sin resolver la regla `ALWAYS` anterior de `memory/project.md`; las dos instrucciones quedarían en conflicto.

OBJECT: Dar por completa la cobertura del Outbox solo con la ruta feliz. La atomicidad, fallos de publicación, reintentos, concurrencia e incertidumbre de entrega necesitan resultados observables en pruebas y decisiones explícitas donde el contrato aún no está definido.
