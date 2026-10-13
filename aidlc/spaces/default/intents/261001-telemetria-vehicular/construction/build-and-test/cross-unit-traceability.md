# Trazabilidad final entre unidades

## Veredicto

FAIL: 44/95 IDs sin cobertura OK vigente con archivo existente. Se enumeraron todos los FR, NFR directos y todos los AC de tres segmentos de las fuentes de Inception. Los mapas históricos de telemetry-backend fueron leídos pero no sirven para certificar la topología vigente; sus claims se muestran. La existencia de un destino no demuestra una medición real: los OK puramente estructurales quedan contrastados con la matriz y findings.json, que prevalecen para calidad.

## Cobertura por ID

| ID | Estado estructural vigente | Unidad/destino existente | Claims leídos |
|---|---|---|---|
| AC1.1.1 | OK | u1-telemetry-core: src/telemetry/handlers.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC1.1.2 | OK | u1-telemetry-core: src/telemetry/handlers.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC1.1.3 | OK | u1-telemetry-core: src/telemetry/model.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC1.1.4 | GAP | Sin target OK vigente | telemetry-backend OK (histórico); u1-telemetry-core N/A |
| AC1.1.5 | OK | u1-telemetry-core: src/telemetry/handlers.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC1.1.6 | OK | u1-telemetry-core: src/telemetry/handlers.test.ts | u1-telemetry-core OK |
| AC1.2.1 | OK | u2-telemetry-operations: src/telemetry/handlers-operations.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC1.2.2 | OK | u2-telemetry-operations: src/telemetry/handlers-operations.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC1.2.3 | OK | u2-telemetry-operations: src/telemetry/handlers-operations.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC1.2.4 | OK | u2-telemetry-operations: infra/telemetry-stack-operations.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC1.2.5 | OK | u2-telemetry-operations: infra/telemetry-stack-operations.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC1.2.6 | OK | u2-telemetry-operations: tests/integration/telemetry-operations.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC2.1.1 | OK | u1-telemetry-core: src/telemetry/adapters.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC2.1.2 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC2.1.3 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC2.1.4 | OK | u1-telemetry-core: src/telemetry/adapters.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC2.1.5 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC2.1.6 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC3.1.1 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC3.1.2 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC3.1.3 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC3.1.4 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC3.1.5 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC3.1.6 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC3.2.1 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC3.2.2 | OK | u1-telemetry-core: src/telemetry/service.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC3.2.3 | OK | u1-telemetry-core: src/telemetry/adapters.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC3.2.4 | OK | u1-telemetry-core: src/telemetry/adapters.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC4.1.1 | OK | u1-telemetry-core: src/telemetry/handlers.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC4.1.2 | OK | u1-telemetry-core: src/telemetry/adapters.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC4.1.3 | OK | u1-telemetry-core: src/telemetry/adapters.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC4.1.4 | OK | u1-telemetry-core: src/telemetry/adapters.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC4.2.1 | OK | u2-telemetry-operations: src/telemetry/manual-recovery.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC4.2.2 | OK | u2-telemetry-operations: src/telemetry/manual-recovery.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC4.2.3 | OK | u2-telemetry-operations: src/telemetry/manual-recovery.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC4.2.4 | OK | u2-telemetry-operations: tests/integration/telemetry-operations.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC4.2.5 | OK | u2-telemetry-operations: tests/integration/telemetry-operations.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC5.1.1 | OK | u2-telemetry-operations: src/telemetry/handlers.ts | telemetry-backend GAP (histórico); u2-telemetry-operations OK |
| AC5.1.2 | OK | u2-telemetry-operations: src/telemetry/handlers.ts | telemetry-backend GAP (histórico); u2-telemetry-operations OK |
| AC5.1.3 | OK | u2-telemetry-operations: src/telemetry/handlers.ts | telemetry-backend GAP (histórico); u2-telemetry-operations OK |
| AC5.1.4 | OK | u2-telemetry-operations: src/telemetry/model.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC5.1.5 | OK | u2-telemetry-operations: src/telemetry/handlers.ts | u2-telemetry-operations OK |
| AC5.2.1 | OK | u2-telemetry-operations: infra/telemetry-stack-operations.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC5.2.2 | OK | u2-telemetry-operations: infra/telemetry-stack-operations.test.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC5.2.3 | OK | u2-telemetry-operations: infra/telemetry-stack-operations.test.ts | telemetry-backend GAP (histórico); u2-telemetry-operations OK |
| AC5.2.4 | OK | u2-telemetry-operations: infra/telemetry-stack.ts | telemetry-backend OK (histórico); u2-telemetry-operations OK |
| AC6.1.1 | OK | u1-telemetry-core: infra/telemetry-stack.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC6.1.2 | OK | u1-telemetry-core: infra/telemetry-stack.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC6.1.3 | OK | u1-telemetry-core: infra/telemetry-stack.test.ts | telemetry-backend GAP (histórico); u1-telemetry-core OK |
| AC6.1.4 | OK | u1-telemetry-core: infra/telemetry-stack.test.ts | telemetry-backend OK (histórico); u1-telemetry-core OK |
| AC6.2.1 | GAP | Sin target OK vigente | telemetry-backend GAP (histórico); u3-delivery-controls GAP |
| AC6.2.2 | GAP | Sin target OK vigente | telemetry-backend OK (histórico); u3-delivery-controls GAP |
| AC6.2.3 | OK | u3-delivery-controls: infra/telemetry-stack-delivery-controls.test.ts | telemetry-backend OK (histórico); u3-delivery-controls OK |
| AC6.2.4 | GAP | Sin target OK vigente | telemetry-backend GAP (histórico); u3-delivery-controls GAP |
| AC6.3.1 | GAP | Sin target OK vigente | telemetry-backend GAP (histórico); u3-delivery-controls GAP |
| AC6.3.2 | GAP | Sin target OK vigente | telemetry-backend GAP (histórico); u3-delivery-controls GAP |
| AC6.3.3 | GAP | Sin target OK vigente | telemetry-backend GAP (histórico); u3-delivery-controls GAP |
| AC6.3.4 | OK | u3-delivery-controls: tests/integration/telemetry-flow.test.ts | telemetry-backend OK (histórico); u3-delivery-controls OK |
| FR1 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |
| FR1.1 | GAP | Sin target OK vigente | Sin entrada directa |
| FR1.2 | GAP | Sin target OK vigente | Sin entrada directa |
| FR1.3 | GAP | Sin target OK vigente | Sin entrada directa |
| FR1.4 | GAP | Sin target OK vigente | Sin entrada directa |
| FR1.5 | GAP | Sin target OK vigente | Sin entrada directa |
| FR1.6 | GAP | Sin target OK vigente | Sin entrada directa |
| FR2 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |
| FR2.1 | GAP | Sin target OK vigente | Sin entrada directa |
| FR2.2 | GAP | Sin target OK vigente | Sin entrada directa |
| FR3 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |
| FR3.1 | GAP | Sin target OK vigente | Sin entrada directa |
| FR3.2 | GAP | Sin target OK vigente | Sin entrada directa |
| FR4 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |
| FR4.1 | GAP | Sin target OK vigente | Sin entrada directa |
| FR4.2 | GAP | Sin target OK vigente | Sin entrada directa |
| FR4.3 | GAP | Sin target OK vigente | Sin entrada directa |
| FR4.4 | GAP | Sin target OK vigente | Sin entrada directa |
| FR5 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |
| FR5.1 | GAP | Sin target OK vigente | Sin entrada directa |
| FR5.2 | GAP | Sin target OK vigente | Sin entrada directa |
| FR5.3 | GAP | Sin target OK vigente | Sin entrada directa |
| FR5.4 | GAP | Sin target OK vigente | Sin entrada directa |
| FR6 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |
| FR6.1 | GAP | Sin target OK vigente | Sin entrada directa |
| FR6.2 | GAP | Sin target OK vigente | Sin entrada directa |
| FR6.3 | GAP | Sin target OK vigente | Sin entrada directa |
| NFR1 | GAP | Sin target OK vigente | telemetry-backend GAP (histórico) |
| NFR2 | GAP | Sin target OK vigente | telemetry-backend GAP (histórico) |
| NFR3 | GAP | Sin target OK vigente | telemetry-backend GAP (histórico) |
| NFR4 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |
| NFR5 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |
| NFR6 | GAP | Sin target OK vigente | telemetry-backend GAP (histórico) |
| NFR7 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |
| NFR8 | GAP | Sin target OK vigente | telemetry-backend GAP (histórico) |
| NFR9 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |
| NFR10 | GAP | Sin target OK vigente | telemetry-backend OK (histórico) |

## Elementos sin cubrir y límites semánticos

- AC1.1.4
- AC6.2.1
- AC6.2.2
- AC6.2.4
- AC6.3.1
- AC6.3.2
- AC6.3.3
- FR1
- FR1.1
- FR1.2
- FR1.3
- FR1.4
- FR1.5
- FR1.6
- FR2
- FR2.1
- FR2.2
- FR3
- FR3.1
- FR3.2
- FR4
- FR4.1
- FR4.2
- FR4.3
- FR4.4
- FR5
- FR5.1
- FR5.2
- FR5.3
- FR5.4
- FR6
- FR6.1
- FR6.2
- FR6.3
- NFR1
- NFR2
- NFR3
- NFR4
- NFR5
- NFR6
- NFR7
- NFR8
- NFR9
- NFR10

No se convirtió N/A/GAP en OK por tener un dueño posterior. AC1.1.4/AC5.1.1/AC5.1.2/AC5.1.5 no tienen evidencia staging/mes; AC5.1.3 tampoco tiene cálculo sintético probado; varios claims operativos remiten a pruebas que no contienen sus assertions (ver F2–F7). AC6.2.1/2/4 y AC6.3.1/2/3 requieren CI/AWS reales. Todos se conservan visibles en el resultado fallido.

## Sources

- inception/requirements-analysis/requirements.md
- inception/user-stories/stories.md
- construction/u1-telemetry-core/code-generation/traceability.json
- construction/u2-telemetry-operations/code-generation/traceability.json
- construction/u3-delivery-controls/code-generation/traceability.json
- construction/telemetry-backend/code-generation/traceability.json (histórico)
- build-and-test-summary.md; findings.json
