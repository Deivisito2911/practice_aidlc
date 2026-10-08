# Verificación local — telemetry-backend

Ejecutada el 2026-10-08 con Node.js 26.7.0 y npm 12.0.2.

| Comprobación | Resultado |
|---|---|
| `npm run test:unit -- src/telemetry` | 23 pruebas, 4 archivos, correctas |
| `npm run test:integration -- tests/integration/telemetry-flow.test.ts` | 1 prueba correcta; incluye entrega física repetida y deduplicación por `alertId` |
| `npx vitest run infra/telemetry-stack.test.ts` | 3 aserciones CDK correctas |
| `npm run typecheck` | Correcto |
| `npm run lint` | Correcto |
| `npm run format:check` | Correcto |
| `npm run build` | Correcto |
| `npm run cdk:synth` | Correcto para staging |
| `npm run audit:deps` / `npm audit --audit-level=high` | Fallan: vulnerabilidad alta en `brace-expansion@5.0.9` empaquetada dentro de `aws-cdk-lib@2.272.0`. `npm audit fix` informa que no puede reemplazar la dependencia empaquetada automáticamente. |

Se comprobaron lógica, contratos y configuración local. No se ha medido en staging p95 ≤500 ms a 100 solicitudes/s, persistencia de ≥99 % en menos de 30 s ni disponibilidad mensual ≥99,9 %. Esas metas permanecen vigentes y requieren pruebas de carga y observación real. El escaneo de secretos dedicado y el pipeline CI siguen pendientes de sus etapas respectivas. No se desplegó infraestructura.
