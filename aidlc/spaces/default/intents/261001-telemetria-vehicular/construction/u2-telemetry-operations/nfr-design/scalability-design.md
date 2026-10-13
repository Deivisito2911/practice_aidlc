# Diseño de escalabilidad — U2

## Ingesta y cuotas

Los requisitos **NFR9.7, NFR9.8 y NFR9.9** se resuelven con el siguiente diseño.

La entrada permanece stateless entre invocaciones y escala dentro de los límites configurados de la única Lambda, DynamoDB transaccional y API Gateway. Configurar los objetivos por clave de 100/s, burst 200 y 5,000,000/día. Como los usage plans de API Gateway son best-effort, los informes registran tasa/admisión real; no tratar la cuota como aislamiento duro.

## Outbox y recuperación

- Mantener consulta selectiva de PENDING vencidos mediante índice definido en Infrastructure Design; evitar Scan de tabla.
- Limitar lote por cantidad y tiempo restante. Paginación mantiene el cursor de trabajo efímero y cualquier elemento no reclamado queda elegible para otra invocación.
- Reclamación condicional y arrendamiento previenen propietarios concurrentes; retraso/lease, frecuencia, particionamiento de índice y concurrencia se concretan con la topología física.
- La CLI solicita el límite máximo permitido antes de preview y nunca puede aumentar el tamaño mediante la confirmación. La consulta se trunca exactamente al límite visible y comunica que existen más candidatos cuando corresponda.
- No agregar cola de ingreso, Lambda adicional ni acceso a datos desde una herramienta fuera del propietario TelemetryService.

## Capacidad y señales

Dimensionar con 100 RPS sostenidos, burst 200, distribución de alertas, retención de 90 días y carga simultánea de recuperación. Observar throttling y backlog y ajustar capacidad por configuración tras pruebas mixtas; no se inventa proyección anual ni cantidad de vehículos.

## Fuentes

`nfr-requirements/scalability-requirements.md`, `nfr-requirements/performance-requirements.md`, `nfr-requirements/observability-requirements.md`, `functional-design/functional-spec.md` y `inception/contract-design/contract-summary.md`.
