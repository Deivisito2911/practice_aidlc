# Preguntas de CI Pipeline

## Decisiones conservadas

| Pregunta | Respuesta y fuente |
| --- | --- |
| Herramienta de CI | GitHub Actions, confirmado en U3 Code Generation y U3 Infrastructure Design. |
| Estrategia de ramas | Ramas cortas hacia `main`, revisión de PR y fusión squash; `main` protegida, según memoria de equipo. |
| Puertas antes de integrar | `npm ci`, formato, ESLint, tipos, auditoría de dependencias de producción y completa, pruebas unitarias, CDK e integración, build, synth y Gitleaks de árbol e historial. Cualquier fallo bloquea; Build and Test conserva F7-F9. |
| Repositorio | `Deivisito2911/practice_aidlc`, inferido de `git remote -v`; requiere confirmación efectiva en GitHub al configurar reglas. |

## Decisión pendiente

¿Dónde conservar el ensamblado CDK validado para que las etapas de despliegue usen el mismo contenido por digest?

- GitHub Actions artifacts del mismo repositorio, con SHA-256 manifiesto y retención definida.
- Amazon S3 con bucket y política de retención específicos por proporcionar.

[Answer]: GitHub Actions artifacts (recomendado)

## Datos externos para activación posterior

Cuentas AWS, roles OIDC, entornos protegidos y aprobadores de producción no están configurados en esta etapa. Los jobs de PR no reciben credenciales AWS. Las reglas efectivas de protección y la prueba negativa/positiva de PR se verificarán en GitHub cuando haya acceso administrativo.

