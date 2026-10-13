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

## U3 — Evidencia estática de controles de entrega (2026-10-12)

La pila CDK sintetizada mantiene una Lambda de telemetría, dos tablas DynamoDB y una cola SQS de alertas; EventBridge sigue apuntando a la misma Lambda y la cola no tiene política de redrive. La plantilla contiene CloudTrail con un bucket cifrado con KMS, acceso público bloqueado, TLS obligatorio, versionado y Object Lock en modo compliance por 90 días. Las políticas en línea de la función se limitan a DynamoDB, KMS y SQS, y su rol no recibe acciones de administración de CloudTrail ni eliminación del archivo de auditoría. Estos son resultados estáticos de CDK; no prueban el estado de una cuenta desplegada.

El documento `telemetry-delivery-controls.md` define el orden de gates, el comando de escaneo de historial Gitleaks fijado a v8.30.1 y las comprobaciones manuales necesarias. GitHub Actions fue seleccionado para la siguiente etapa de pipeline; no se afirma que exista hoy un workflow, una relación de confianza OIDC desplegada, protección de `main`, promoción a staging/producción ni eventos CloudTrail reales comprobados. Esos controles requieren el owner/name del repositorio, refs y entornos, claims OIDC exactos, cuentas y roles AWS.
