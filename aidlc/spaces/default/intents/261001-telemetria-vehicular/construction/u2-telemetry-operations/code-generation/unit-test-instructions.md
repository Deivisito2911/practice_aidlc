# Instrucciones de pruebas — U2 Operaciones

## Marco y alcance

- Reutilizar Vitest y `vitest.config.ts` ya presentes. No cambiar configuración global para hacer pasar el unit.
- Probar primero la capa implementada y ejecutar la prueba unitaria de esa capa; después integrar y correr el caso AWS simulado.
- Pruebas nuevas previstas: `src/telemetry/manual-recovery.test.ts`, `src/telemetry/handlers-operations.test.ts`, `infra/telemetry-stack-operations.test.ts` y `tests/integration/telemetry-operations.test.ts`.
- Comando unitario exacto, limitado a archivos U2: `npx vitest run src/telemetry/manual-recovery.test.ts src/telemetry/handlers-operations.test.ts infra/telemetry-stack-operations.test.ts`.
- Comando de integración crítico exacto: `npx vitest run tests/integration/telemetry-operations.test.ts`.

## Requisitos de verificación

La estrategia Minimal exige pruebas verificables de los requisitos y al menos un camino exitoso por componente, sin piso de cobertura porcentual nuevo para workshop. Cubrir como mínimo:

1. Modelo y TTL: cálculo exacto acceptedAt +90 días, shard estable, y sin cambio al hash canónico/idempotencia.
2. Persistencia/repository: consulta solo PENDING elegibles acotada a 25; backfill repetible no altera expiresAt ni sobreescribe un valor existente.
3. Recuperación: actor no autorizado/alcance vacío no mutan datos; preview expone IDs/cantidad/límite sin payload; confirmación ausente o conjunto cambiado se rechaza; el autorizado reusa alertId; SQS confirmado pasa a PUBLISHED; fallo/resultado incierto queda PENDING con conteos/correlaciones correctos.
4. HTTP: cada caso inválido/ausente/tipo/rango/non-finite/no UTC responde 400 sin efectos; exactamente +5 min se acepta y >+5 min se rechaza; API key y rate/quota se rechazan antes de Lambda; transacción fallida no produce 202 ni registro parcial.
5. Observabilidad/infra: categorías de métrica/log correctas y ausencia de secretos/payload; CDK conserva una Lambda y no añade SQS/DLQ de ingreso, configura IAM acotado, GSI TTL, alarmas con todos los campos y usage plan requerido.
6. Integración: preview→confirmación→publicación y recuperación parcial; EventBridge conserva ruta previa; toda respuesta 202 mantiene commit previo.

Usar fakes deterministas para reloj, almacenamiento, SQS y principal de invocación. Para CDK, inspeccionar plantilla sintetizada. No depender de cuenta AWS ni credenciales reales. Las pruebas no deben incluir API keys o datos crudos en snapshots/logs.
