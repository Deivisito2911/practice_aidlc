# Lista de accesibilidad y claridad de integración

- [x] La experiencia es API-first y no inventa pantallas fuera de alcance.
- [x] Los ejemplos tienen etiquetas textuales y se pueden copiar como texto.
- [x] Éxito, validación, conflicto y fallo se distinguen por códigos HTTP y mensajes, no por color.
- [x] La respuesta `202` explica que el evento quedó persistido y que la alerta puede seguir `PENDING`.
- [x] Los requisitos de fecha UTC, rangos y campos se explican antes del envío.
- [x] Los errores indican cómo corregir o reintentar sin divulgar secretos ni información interna.
- [x] `X-Correlation-Id`, `eventId` y `alertId` se identifican con nombres consistentes para soporte.
- [ ] El contrato OpenAPI final debe incluir descripción de campos, formatos, límites, respuestas de error y ejemplos de cada resultado.
- [ ] Verificar los ejemplos contra el contrato formal durante Contract Design y Build and Test.

Los criterios WCAG de contraste, foco, teclado y lectores de pantalla no aplican a una API sin interfaz. Si se publica documentación web, esa documentación deberá cumplir WCAG 2.1 AA y permitir uso por teclado y lector de pantalla.
