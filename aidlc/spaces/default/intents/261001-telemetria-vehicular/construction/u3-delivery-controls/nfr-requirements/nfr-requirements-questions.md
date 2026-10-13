# Preguntas de requisitos no funcionales — U3

## Ambigüedades revisadas

No se encontraron objetivos NFR contradictorios ni cuantificadores vagos en NFR6, NFR8 y NFR10. El proveedor y el alojamiento del repositorio siguen como dependencias externas desconocidas; los requisitos se expresan de forma neutral y la decisión de plataforma queda para el diseño del pipeline.

## Assumptions & Open Questions

- El administrador del repositorio y de identidad AWS debe proporcionar el proveedor OIDC confiable y la protección de ramas antes de comprobar el pipeline real. La implementación puede preparar los contratos y controles sin afirmar que esa dependencia está disponible.

## Sources

- `inception/requirements-analysis/requirements.md` (NFR6, NFR8, NFR10)
- `inception/user-stories/stories.md` (US6.2, US6.3; AC6.2.1–AC6.2.4, AC6.3.1–AC6.3.4)
- `inception/delivery-planning/external-dependency-map.md` (proveedor de repositorio/OIDC desconocido)
