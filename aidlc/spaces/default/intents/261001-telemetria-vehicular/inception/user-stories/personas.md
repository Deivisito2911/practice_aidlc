# Personas del servicio de telemetría vehicular

## P1 — Integrador de telemetría

- **Rol:** equipo o sistema responsable de conectar productores de telemetría vehicular con la API.
- **Prioridad:** Primaria.
- **Objetivos:** enviar eventos válidos con baja latencia; recibir respuestas y errores predecibles; respetar cuotas sin duplicar efectos.
- **Puntos de dolor:** contratos ambiguos, errores sin correlación, límites desconocidos y reintentos que producen duplicados.
- **Contexto:** integración máquina a máquina mediante `POST /telemetry-events`, clave de API y JSON.
- **Comodidad técnica:** Alta.
- **Frecuencia:** Continua, hasta 100 solicitudes por segundo sostenidas por clave.

## P2 — Operador de flota

- **Rol:** persona responsable de reaccionar ante alertas operativas de los vehículos.
- **Prioridad:** Primaria para la capacidad de alertas.
- **Objetivos:** recibir, a través del sistema externo de operaciones, alertas de batería baja completas; reconocer una única alerta lógica aunque haya reentregas; correlacionar la alerta con el evento y el vehículo.
- **Puntos de dolor:** alertas perdidas, duplicados que provocan acciones repetidas y datos insuficientes para actuar.
- **Contexto:** P2 no lee SQS directamente. Un sistema externo consume la cola y presenta la alerta al operador. La implementación de ese consumidor queda fuera de alcance; el contrato, `alertId` estable y una prueba de conformidad sí forman parte de la entrega.
- **Comodidad técnica:** Media.
- **Frecuencia:** Por evento de batería con `value < 20`.

## P3 — Ingeniero de plataforma

- **Rol:** persona responsable de desplegar, asegurar, observar y recuperar el servicio.
- **Prioridad:** Primaria para operación y entrega.
- **Objetivos:** desplegar infraestructura reproducible; cumplir SLO; detectar fallos; inspeccionar DLQ y salidas pendientes; ejecutar redrive idempotente; conservar auditoría.
- **Puntos de dolor:** fallos sin correlación, secretos expuestos, permisos excesivos, alertas pendientes invisibles y recuperación manual insegura.
- **Contexto:** opera API Gateway, SQS, Lambda, DynamoDB, KMS, CloudTrail, alarmas y CI/CD en `staging`, con aprobación manual para producción. La experiencia puede implementarse con CLI, consola o procedimiento documentado; no requiere una GUI.
- **Comodidad técnica:** Alta.
- **Frecuencia:** Despliegues frecuentes, supervisión continua y recuperación bajo demanda.

## Relaciones y límites

- P1 produce eventos; P3 opera el servicio que los acepta y procesa.
- P2 obtiene valor por medio del sistema consumidor externo; ese sistema es el límite técnico de integración.
- P1, el sistema consumidor y P3 dependen de `eventId`/`alertId` para correlación e idempotencia.
- La administración de vehículos, las interfaces gráficas, las notificaciones externas y la implementación del consumidor quedan fuera de alcance.

## Sources

- `inception/requirements-analysis/requirements.md`
- `inception/user-stories/user-stories-questions.md`
- `inception/practices-discovery/team-practices.md`
