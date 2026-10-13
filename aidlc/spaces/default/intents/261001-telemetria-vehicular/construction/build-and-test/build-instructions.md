# Instrucciones de compilación

## Dependencias y entorno

En checkout nuevo, ejecutar npm ci con package-lock.json versionado. En esta ejecución se conserva la instalación existente: Node v26.7.0, npm 12.0.2, Bun 1.4.2. Revisar package.json, tsconfig.json, vitest.config.ts y cdk.json. Las comprobaciones locales no requieren servicios ni credenciales AWS; no cargar claves persistentes.

## Comandos y verificación

Ejecutar npm run build, npm run typecheck, npm run lint, npm run format:check y npm run cdk:synth. tsc produce dist/; CDK empaqueta la Lambda y produce cdk.out/. Guardar exit code y salida bajo evidence/. Ejecutar cada comando exacto de command-inventory.json una sola vez en esta etapa.

## Diagnóstico

Ante dependencia ausente, usar npm ci y conservar el lockfile. Ante formato o configuración fallida, leer la salida y aplicar solo una corrección justificada (máximo dos intentos internos). Un defecto de código/pruebas requiere el procedimiento de retorno a Code Generation. No desplegar durante una prueba local.

## Sources

- aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u1-telemetry-core/code-generation/code-generation-plan.md
- aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u2-telemetry-operations/code-generation/code-generation-plan.md
- aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u3-delivery-controls/code-generation/code-generation-plan.md
