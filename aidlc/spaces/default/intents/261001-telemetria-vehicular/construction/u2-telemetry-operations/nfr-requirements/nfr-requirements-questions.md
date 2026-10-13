# Preguntas NFR — U2 Operaciones de telemetría

## Evaluación

No quedan preguntas que bloqueen los requisitos NFR de U2. Rendimiento, disponibilidad, procesamiento y retención están cuantificados en los requisitos de origen. Se proponen umbrales iniciales verificables para las alarmas; Infrastructure Design concretará su configuración por entorno y el destino operativo existente. La autorización queda limitada al rol P3 establecido por US4.2.

## Supuestos confirmables en diseño

- Los umbrales y ventanas son políticas revisables, no garantías contractuales de entrega o disponibilidad.
- El destino es el canal de guardia configurado para el entorno.
- Las pruebas de rendimiento se ejecutan en staging y no declaran cumplimiento sin mediciones reales.
