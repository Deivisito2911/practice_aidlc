# Integración crítica

## Configuración y datos

Vitest existente; AWS simulado con relojes/IDs únicos y estado por prueba. Sin contacto AWS ni datos reales. La integración adicional en Minimal responde al Testing Contract explícito.

## Ejecución y alcance

Los comandos exactos están en command-inventory.json: integración U1, U2 y suite completa, deduplicados por texto. npm run test:integration incluye todo tests/integration incluso con argumento de archivo añadido; informar las dos pruebas sin sumar ejecuciones repetidas como cobertura nueva. Comprobar HTTP, commit atómico, 400 sin efectos, 202 después de commit, SQS incierta, identidad alertId y EventBridge; preview/confirmación manual y operación parcial.

## Cobertura y límites

Una prueba verificable por requisito y camino feliz por componente; sin porcentaje numérico. Leer assertions, no inferir cobertura de un exit 0. CDK comprueba configuración; no acredita denegación IAM ni cuotas reales.

## Sources

- aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u1-telemetry-core/code-generation/unit-test-instructions.md
- aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u2-telemetry-operations/code-generation/unit-test-instructions.md
- aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u3-delivery-controls/code-generation/unit-test-instructions.md
