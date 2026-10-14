# Verificación de fase: Construcción → Operación

## Veredicto

**FAIL — continuación excepcional autorizada.** Los tres Units tienen código y archivos `code-generation/traceability.json`, y la regresión local pasó, pero Build and Test conserva 39 de 95 IDs sin `OK` vigente, 6 objetivos Not Met y 51 Unverified. La configuración de CI existe y sus comandos corresponden a las pruebas registradas, pero aún no hay un run de GitHub ni ruleset efectiva. La autorización de continuar no constituye un pase de fase ni convierte los faltantes en evidencia verificada.

## Cadena arquitectura, código y pruebas

| Unidad | Trazabilidad de Code Generation | Estado local |
| --- | --- | --- |
| `u1-telemetry-core` | 61 OK, 16 GAP, 37 Deferred; 7 hallazgos pendientes declarados | Skeleton e integración crítica revalidados; evidencia externa pendiente. |
| `u2-telemetry-operations` | 77 OK, 35 Deferred; 2 hallazgos pendientes declarados | Regresión compartida local verde; evidencia externa pendiente. |
| `u3-delivery-controls` | 6 OK, 18 GAP | Código y controles locales verdes; GitHub/OIDC, protección y despliegue pendientes. |

Los recuentos anteriores son por reclamo de cada Unit y se solapan; el agregado deduplicado es `construction/build-and-test/cross-unit-traceability.md`: 39/95 IDs sin OK vigente. Los archivos de trazabilidad están presentes, pero sus GAP, Deferred y `known_pending_findings` impiden afirmar cobertura completa. Build and Test fue aceptado como fallo para continuar preparando los controles de entrega; esa decisión no cambia el veredicto de esta frontera.

## CI y consistencia

`.github/workflows/ci.yml` ejecuta `npm ci`, formato, lint, tipos, auditorías, tests de aplicación/CDK/integración, build, synth y Gitleaks, en concordancia con `construction/build-and-test/test-results.md` y `construction/ci-pipeline/quality-gates.md`. El YAML parseó localmente. La ejecución remota, los checks obligatorios, PR negativo/verde, artifact publicado y restricciones reales de `main` siguen sin comprobarse. No hay contradicción entre la arquitectura de una Lambda y el pipeline propuesto; la protección efectiva de GitHub/AWS no puede inferirse del YAML.

## Acciones para cerrar la frontera

- F7: completar vínculos FR/AC locales solo con evidencia existente y dejar explícitos los criterios que requieren entorno real; revisar las tablas de Code Generation y repetir Build and Test.
- F8: ejecutar CI en GitHub, exigir `quality-gates` en la ruleset de `main`, verificar PR fallido y verde, y configurar OIDC/entornos en las etapas de entrega correspondientes.
- F9: desplegar y medir los objetivos operativos, CloudTrail y alarmas en AWS; los resultados locales no sustituyen esas mediciones.

El requisito de contar con evidencia desplegada antes de entrar en Operación crea una dependencia circular para F8/F9: las etapas de Operación son las que la obtienen. La decisión humana siguiente permite obtener esa evidencia durante Operación, sin cambiar el estado de los objetivos a Met sin medición. F7 sigue siendo trabajo local pendiente y debe corregirse y volver a verificarse.

## Revisión humana

- [ ] Aprobar la transición después de cerrar los hallazgos y comprobar CI real.
- [x] 2026-10-14: el usuario eligió «Continuar con fallo documentado» para preparar y obtener evidencia en Operación. Excepción de avance explícita; el veredicto técnico permanece FAIL y F7, F8 y F9 siguen abiertos.

Fuentes: `construction/build-and-test/build-and-test-summary.md`, `construction/build-and-test/test-results.md`, `construction/build-and-test/cross-unit-traceability.md`, `construction/u1-telemetry-core/code-generation/traceability.json`, `construction/u2-telemetry-operations/code-generation/traceability.json`, `construction/u3-delivery-controls/code-generation/traceability.json`, `construction/ci-pipeline/ci-config.md` y `construction/ci-pipeline/quality-gates.md`.
