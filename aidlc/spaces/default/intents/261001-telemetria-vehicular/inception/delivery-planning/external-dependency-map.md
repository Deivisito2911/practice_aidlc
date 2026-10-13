# Dependencias externas de la entrega

Un **Bolt** es una pasada de construcción que produce una unidad ejecutable y comprobable. El plan ordena Bolt 1/U1, Bolt 2/U3 y Bolt 3/U2. Una dependencia marcada «por confirmar» no se trata como disponible ni recibe una fecha inventada. La prueba integrada con servicios AWS simulados puede probar código, pero no acredita un despliegue o una alarma en AWS real.

| Dependencia | Estado | Responsable externo o por designar | Plazo | Bloquea | Acción si se retrasa |
|---|---|---|---|---|---|
| Cuenta AWS preparada y permisos para CDK, API Gateway, Lambda, dos tablas DynamoDB, EventBridge, SQS de alertas y KMS | Desconocido | Administrador de la cuenta AWS, por identificar | Por confirmar | Despliegue real de U1 en `staging`; pruebas reales de U2/U3 | Mantener síntesis CDK y prueba AWS simulada; no declarar despliegue real hasta validar permisos y recursos. |
| Repositorio con protección de `main` y proveedor OIDC confiable para roles temporales | Desconocido | Administrador del repositorio y de identidad AWS, por identificar | Por confirmar | CI/promoción y comprobación OIDC de U3 | Preparar definición del pipeline; no usar claves persistentes ni afirmar que la promoción automática funciona. |
| Permisos y destino de logs CloudTrail protegidos con KMS | Desconocido | Administrador de seguridad/cuenta AWS, por identificar | Por confirmar | Verificación de NFR10 y cierre de U3 en AWS real | Sintetizar políticas y validarlas al obtener acceso; no sustituir eventos reales por una plantilla. |
| Aprobador humano de producción | Necesario; persona no designada | Responsable de producto/operación, por designar | Antes de cada promoción | Despliegue de producción, no `staging` | Mantener el paso manual cerrado hasta aprobación expresa. |
| Productores de telemetría externos y sus claves API | Integración productiva fuera del primer recorrido | Equipo integrador externo, por identificar | Por confirmar | Tráfico productivo, no la prueba sintética de U1 | Entregar OpenAPI C1 y ejemplos válidos; probar con clave de ensayo sin depender de dispositivos reales. |
| Consumidor real de la SQS de alertas | Fuera del alcance actual | Equipo consumidor externo, por identificar | No requerido para cerrar U1–U3 | Efecto productivo de alertas, no publicación ni prueba contractual | Usar consumidor contractual de prueba que deduplica por `alertId`; acordar adopción de C2 antes de operar con consumidor real. |
| Mes calendario real en `staging` | No observado aún | Operación del servicio | Un mes calendario desde la instrumentación y disponibilidad | Afirmar el 99,9 % mensual de NFR3; no bloquea implementar U2 | Validar fórmula con datos sintéticos y conservar la evidencia mensual como pendiente hasta completar la observación. |

## Puertas de salida

- **Antes del despliegue real de U1:** confirmar cuenta, región, permisos de CDK y KMS y una clave API de ensayo. Responsable y fecha se registran cuando se conozcan; hasta entonces el despliegue sigue bloqueado.
- **Antes de cerrar U3 como entregado en AWS:** demostrar OIDC, CI obligatorio, CloudTrail protegido y despliegue automático a `staging` con evidencia real. Producción conserva aprobación manual independiente.
- **Antes de afirmar NFR1/NFR3 en `staging`:** disponer del entorno y de tráfico de carga representativo; NFR3 requiere el mes calendario completo. No se infieren resultados de una simulación local.
- **Antes de integrar productores/consumidores reales:** distribuir C1 y C2, exigir IDs no reutilizados y deduplicación por `alertId`; su calendario no altera la construcción del servicio.

## Sources

- `inception/contract-design/contract-summary.md` (C1–C5)
- `inception/requirements-analysis/requirements.md` (FR2, FR5, NFR1–NFR10)
- `inception/units-generation/unit-of-work-dependency.md`
- `inception/delivery-planning/delivery-planning-questions.md`
