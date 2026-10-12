# Preguntas de diseño — Respuestas

1. **¿Qué formato debe priorizar la experiencia de integración de la API?** Ambos: ejemplos HTTP/cURL y contrato OpenAPI. Confirmado por el usuario en esta etapa.
2. **¿Qué UI propia requiere cada historia?** Ninguna; no se incluye interfaz gráfica en el alcance. La experiencia es el endpoint y su documentación.
3. **¿Qué estados debe manejar el integrador?** Éxito `202` tras persistencia, rechazo `400`, rechazo de autenticación, conflicto de idempotencia y error de servicio; entrega de alerta pendiente se comunica como estado independiente.
4. **¿Qué pautas de accesibilidad aplican?** La API no tiene UI; documentación futura debe usar texto semántico, ejemplos copiables y WCAG 2.1 AA si se presenta en web.
5. **¿Qué breakpoints o componentes visuales se requieren?** Ninguno en el Walking Skeleton; no se crea UI.
6. **¿Cómo se recuperan las alertas?** EventBridge invoca la misma Lambda periódicamente para recuperar salidas Outbox `PENDING`; SQS solo recibe alertas.
