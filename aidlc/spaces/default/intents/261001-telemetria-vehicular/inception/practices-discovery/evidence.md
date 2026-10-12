# Evidencia de descubrimiento de prácticas — borrador de revisión

## Contexto y fuentes consultadas

- `aidlc-state.md`: proyecto Greenfield, alcance `workshop`, profundidad Standard y estrategia de pruebas Minimal.
- `aidlc/spaces/default/memory/org.md` y `phases/inception.md`: defaults organizacionales y reglas de calidad, arquitectura y trazabilidad. Los defaults no se trataron como decisiones nuevas del equipo.
- `aidlc/spaces/default/memory/team.md` y `project.md`: prácticas previamente afirmadas. La entrada sobre SQS de ingreso permanece allí hasta una promoción posterior a la nueva aprobación humana.
- `inception/practices-discovery/practices-discovery-questions.md`: respuestas y confirmación de la primera ronda, más la pregunta diferencial 6 respondida `A. Adoptar propuesta.`; las elecciones históricas sobre SQS de entrada se conservan como registro, pero la respuesta 6 las sustituye para este borrador.
- `construction/telemetry-backend/infrastructure-design/infrastructure-specification.md`: especificación de Lambda única, escritura transaccional de evento/Outbox y barrido periódico de salidas `PENDING` por EventBridge.
- Feedback humano posterior a la primera implementación: solicitó reconciliar código y pruebas con esa especificación, eliminar la SQS de entrada y sustituirla por API Gateway → Lambda única → DynamoDB/Outbox, con EventBridge para pendientes. Indicó expresamente que la nueva decisión prevalece sobre requisitos y acuerdos anteriores que exigían SQS de entrada, y eligió **Modify** para actualizar prácticas compatibles.
- `archive/20261012T010158Z-practices-discovery`: copia histórica de los cuatro artefactos y la memoria anteriores a esta revisión.

## Revisiones especialistas integradas

- `contributions/aidlc-quality-agent.md`: ratifica `test-after` y exige comprobar ambas invocaciones de la Lambda, atomicidad de la transacción, respuesta `202` después de persistir, rechazo sin efectos y recuperación de salidas `PENDING` tras fallos. Advierte que la entrega de SQS puede repetirse.
- `contributions/aidlc-developer-agent.md`: confirma un único recurso Lambda con módulos internos separados por responsabilidad; recomienda `alertId` estable, transición condicional del Outbox y consulta acotada de pendientes. La arquitectura no promete entrega exactamente una vez.
- `contributions/aidlc-devsecops-agent.md`: ratifica las puertas de CI y los controles OIDC/IAM/KMS/CloudTrail; recomienda permiso de EventBridge limitado a la regla, acceso DynamoDB y `sqs:SendMessage` solo a recursos necesarios, y evitar permisos de consumo de una cola de ingreso inexistente. Distingue posibles DLQ de invocación EventBridge y de consumidor de alertas, sin sustituir el Outbox.
- Los tres revisores detectaron que `aidlc/spaces/default/memory/project.md` aún exige la SQS de entrada y contiene una obligación genérica de DLQ. La promoción que solo agregue nuevas reglas dejaría `ALWAYS` y `NEVER` incompatibles. Es imprescindible sustituir o retirar esas obligaciones anteriores por la vía autorizada antes de considerar afirmada la revisión.

## Decisiones conservadas de la primera afirmación

- Ramas cortas, *pull request*, fusión *squash* a `main`.
- `test-after`, pruebas unitarias por capa y prueba integrada crítica con AWS simulado; puertas de CI para formato, *lint*, tipos, pruebas, dependencias y secretos.
- Despliegue automático a *staging* tras fusionar y aprobación manual para producción; CDK, OIDC, IAM de mínimo privilegio, KMS, CloudTrail, alarmas y reversión.
- TypeScript, identificadores en inglés, Prettier y ESLint.
- El límite de batería sigue siendo estricto: `value < 20` genera alerta y `20` no.

## Cambio solicitado y alcance

- Sustituir API/SQS de entrada/múltiples Lambdas por API Gateway REST/una Lambda/DynamoDB con evento y salida Outbox escritos atómicamente. EventBridge invoca periódicamente esa misma Lambda para recuperar salidas `PENDING`; SQS permanece solo como cola de alertas.
- La antigua DLQ de ingreso y las prácticas de reintento por lote de esa cola dejan de aplicar. Una DLQ para un eventual consumidor de alertas y una eventual DLQ de invocación asíncrona de EventBridge son decisiones separadas de sus respectivos ámbitos; ninguna reemplaza el Outbox.
- El `202` para eventos válidos debe interpretarse tras confirmación de DynamoDB; la validación BVA inválida conserva el `400` sin escritura ni publicación.
- Requisitos, contrato, diseño funcional, código y pruebas anteriores aún contienen referencias a SQS de entrada. Requieren reconciliación posterior; este borrador no afirma que ya estén actualizados.

## Revisión e incertidumbres pendientes

- La entrevista diferencial adoptó el nuevo recorrido y conservó la postura de pruebas, entrega y estilo. Falta la aprobación final y la promoción determinista; ninguna memoria se modificó durante esta integración.
- El diseño posterior debe fijar la semántica comprobable de petición HTTP repetida, publicación incierta, `alertId` estable, transición condicional y concurrencia de invocaciones, consulta acotada de `PENDING`, frecuencia de EventBridge, antigüedad máxima, reintentos, alarmas y recuperación manual. Se debe probar caída de SQS, timeout tras envío y fallos de DynamoDB sin prometer entrega exactamente una vez.
- El diseño de seguridad debe precisar autenticación y autorización del emisor, límites de tamaño y tasa, permisos IAM/KMS acotados, protección de datos en registros y alcance de eventos CloudTrail. El diseño de CI debe concretar herramientas y umbrales de SAST, análisis de IaC, dependencias y pruebas dinámicas; estas sugerencias no se elevan a `ALWAYS` sin decisión humana.
- Siguen por definir plataforma de CI/CD, simulador AWS, porcentaje de cobertura si aplica y umbrales de despliegue y reversión.
