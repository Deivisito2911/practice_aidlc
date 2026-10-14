# Preguntas del pipeline de despliegue

## Decisiones heredadas

| Pregunta | Respuesta y procedencia |
| --- | --- |
| Estrategia de despliegue | CDK/CloudFormation por entorno, sin canary ni blue/green hasta que el stack los soporte; diseño U3 de infraestructura. |
| Promoción de entornos | Integración a `main` y CI verde activan staging; producción requiere aprobación manual; memoria del equipo y diseño U3. |
| Aprobación de producción | Entorno GitHub `production` con revisores obligatorios. Las identidades concretas se configurarán y verificarán en Environment Provisioning; no se inventan nombres. |
| Reversión | Desplegar un ensamblado previo con CI y staging verificados mediante la misma puerta manual, o revertir CloudFormation cuando sea viable; diseño U3. |
| Repositorio de artefactos | GitHub Actions artifacts, elección humana vigente en CI Pipeline; manifiesto de archivos y digest del artefacto. |

## Pregunta pendiente

¿Qué estrategia de feature flags deseas para esta primera entrega? El código actual no integra un servicio de flags.

- A. Sin feature flags por ahora; usar la promoción y reversión del despliegue.
- B. AWS AppConfig antes de activar producción; requiere implementación y nuevas pruebas.
- X. Other (please specify).

[Answer]: A. Sin feature flags por ahora (recomendado)

## Datos de activación posterior

Las cuentas, regiones, roles OIDC, restricciones de confianza, revisores y protecciones reales de GitHub/AWS se recopilarán y verificarán en Environment Provisioning. Los workflows fallan antes de desplegar si faltan variables. La evidencia de CI y staging se verifica por run, commit, digest y manifiesto antes de cada promoción.
