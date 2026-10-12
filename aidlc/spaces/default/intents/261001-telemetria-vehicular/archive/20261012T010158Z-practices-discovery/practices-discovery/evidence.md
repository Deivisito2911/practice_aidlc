# Evidencia de descubrimiento de prácticas

## Contexto y fuentes consultadas

- `d:\guide_aidlc\aidlc\spaces\default\intents\261001-telemetria-vehicular\aidlc-state.md`: confirma proyecto Greenfield, alcance `workshop`, profundidad Standard, estrategia de pruebas Minimal y Practices Discovery en curso.
- `d:\guide_aidlc\aidlc\spaces\default\memory\org.md`: proporcionó las prácticas organizacionales sugeridas para ramas, primera rebanada integrada, pruebas, despliegue y estilo. Se trataron como propuestas, no como decisiones del equipo.
- `d:\guide_aidlc\aidlc\spaces\default\memory\phases\inception.md`: aportó las reglas obligatorias de calidad, arquitectura, trazabilidad e historias para la fase.
- `d:\guide_aidlc\aidlc\spaces\default\intents\261001-telemetria-vehicular\inception\practices-discovery\practices-discovery-questions.md`: contiene las cinco respuestas humanas como opción A y la confirmación consolidada `[Answer]: Looks correct`.
- La confirmación consolidada quedó registrada mediante `SUMMARY_CONFIRMATION_RECORDED` con `summary_authorization_id` `52772d1366e2c2f9c9941a932f233f463aaa37d65b512fa7e5426749e68da049`.

## Contribuciones especialistas

- `d:\guide_aidlc\aidlc\spaces\default\intents\261001-telemetria-vehicular\inception\practices-discovery\contributions\aidlc-quality-agent.md`: revisó la postura `test-after`, los casos unitarios, el límite estricto de batería, la integración AWS simulada, los reintentos y las puertas de calidad.
- `d:\guide_aidlc\aidlc\spaces\default\intents\261001-telemetria-vehicular\inception\practices-discovery\contributions\aidlc-developer-agent.md`: revisó nombres, límites entre capas, validación en fronteras, errores, idempotencia, organización por capacidad y convenciones de código.
- `d:\guide_aidlc\aidlc\spaces\default\intents\261001-telemetria-vehicular\inception\practices-discovery\contributions\aidlc-devsecops-agent.md`: revisó controles de CI/CD, secretos y dependencias, identidad OIDC, IAM, cifrado, auditoría, DLQ, observabilidad y cadena de suministro.

## Decisiones humanas confirmadas

- Usar desarrollo basado en tronco con ramas cortas, *pull request* y fusión *squash* a `main`.
- Construir primero una rebanada integrada que incluya API REST, SQS de entrada, Lambda, DynamoDB y la alerta de batería.
- Adoptar `test-after`, pruebas unitarias por capa y una prueba crítica de integración con AWS simulado; ejecutar en CI formato, *lint* y análisis de dependencias y secretos.
- Desplegar automáticamente a *staging* al fusionar a `main`, mantener una aprobación manual para producción y aplicar IaC, OIDC, IAM de mínimo privilegio, KMS, CloudTrail, alarmas, DLQ y reversión.
- Usar TypeScript, AWS CDK, identificadores en inglés, Prettier, ESLint y comprobación de tipos obligatoria en CI.

## Integración de hallazgos

- La recomendación de calidad sobre el límite estricto quedó reflejada en las prácticas: un valor de batería inferior a `20` genera alerta y `20` no la genera.
- La prueba de integración con AWS simulado fue afirmada pese a que la estrategia general es Minimal; se conserva como excepción crítica para demostrar el recorrido distribuido.
- Las propuestas especialistas no incluidas en las opciones confirmadas —por ejemplo, herramientas concretas de SAST/DAST, SBOM, firma de artefactos o estructura interna detallada— no se elevaron a prácticas afirmadas.
- Las restricciones seleccionadas sobre OIDC, mínimo privilegio, KMS, CloudTrail, alarmas, DLQ y reversión sí se incorporaron porque forman parte explícita de la respuesta humana de despliegue.

## Incertidumbres pendientes

- Definir el contrato detallado de la API y de los eventos: autenticación y autorización, límites de tasa, rangos y formatos, versionado y respuestas de error.
- Precisar idempotencia, tratamiento de duplicados, reintentos, visibilidad SQS, procesamiento parcial de lotes, política de redrive y configuración de DLQ.
- Definir el contenido de las alertas, su deduplicación y el comportamiento ante fallos de publicación.
- Elegir el framework de pruebas, el simulador AWS, las herramientas exactas de análisis y la plataforma CI/CD.
- Fijar, si corresponde, porcentaje de cobertura, umbrales de vulnerabilidad, tratamiento de pruebas inestables y proceso de excepciones.
- Concretar estrategia de despliegue de Lambda, umbrales automáticos de reversión, cuentas, regiones, retención y responsables operativos.