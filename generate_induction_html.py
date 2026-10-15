import json
import openpyxl

# Load test matrix
wb = openpyxl.load_workbook('Matriz_Requisitos_vs_Tests.xlsx')
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
headers = rows[0]
matrix_data = [dict(zip(headers, r)) for r in rows[1:]]

# User Stories definition
user_stories = [
    {
        "id": "US1.1",
        "title": "Enviar un evento válido",
        "slice": "Aceptar telemetría",
        "persona": "P1 - Integrador de telemetría IoT",
        "priority": "Must Have",
        "depends_on": "US2.1",
        "requirements": ["FR1.1", "FR1.2", "FR1.3", "FR1.4", "FR1.5", "FR1.6", "FR3.1", "NFR1"],
        "summary": "Enviar un evento válido a POST /telemetry-events para obtener confirmación de persistencia sin esperar la entrega de alertas externas.",
        "criteria": [
            {"ac": "AC1.1.1", "desc": "Given clave válida y evento válido, When P1 lo envía, Then la Lambda confirma el evento en DynamoDB antes de responder 202 Accepted con correlación y acceptedAt UTC.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "persiste atómicamente, acepta, recupera PENDING y deduplica por alertId"},
            {"ac": "AC1.1.2", "desc": "Given respuesta 202, When se inspecciona DynamoDB, Then contiene campos validados y acceptedAt; si requiere alerta, la salida PENDING quedó escrita en la misma transacción.", "test_file": "src/telemetry/handlers.test.ts", "test_case": "acepta evento válido de batería con HTTP 202 y payload Outbox"},
            {"ac": "AC1.1.3", "desc": "Given cada tipo permitido (battery, temperature, speed) en sus límites válidos, When se envía, Then se acepta.", "test_file": "src/telemetry/model.test.ts", "test_case": "valida tipos permitidos battery (0-100), temperature (-50 a 150), speed (0 a 300)"},
            {"ac": "AC1.1.4", "desc": "Given carga sostenida de 100 solicitudes válidas/s en staging, When se mide con perfil aprobado, Then p95 es <= 500 ms.", "test_file": "Fase 4 - Operación", "test_case": "Diferido a entorno real de AWS Staging (Gap F9)"},
            {"ac": "AC1.1.5", "desc": "Given una ruta distinta de POST /telemetry-events, When se invoca, Then devuelve recurso inexistente (404/400) sin invocar la Lambda ni escribir en DynamoDB.", "test_file": "src/telemetry/handlers.test.ts", "test_case": "rechaza rutas o métodos no reconocidos con 400"},
            {"ac": "AC1.1.6", "desc": "Given respuesta 202 para batería baja, When la alerta aún figura PENDING, Then el contrato indica aceptación y persistencia, sin afirmar entrega al consumidor externo.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "respuesta 202 causalmente atada al commit conjunto"}
        ]
    },
    {
        "id": "US1.2",
        "title": "Recibir errores y límites predecibles (BVA)",
        "slice": "Aceptar telemetría",
        "persona": "P1 - Integrador de telemetría IoT",
        "priority": "Must Have",
        "depends_on": "US1.1",
        "requirements": ["FR1.1–FR1.6", "FR2.1", "FR2.2", "FR3.2"],
        "summary": "Errores claros ante rutas, credenciales, datos inválidos, desbordamiento de frontera BVA o cuota excedida sin dejar registros parciales en base de datos.",
        "criteria": [
            {"ac": "AC1.2.1", "desc": "Given matriz de campos ausentes/vacíos, tipos inválidos, value no finito, timestamp no UTC y valores fuera de BVA, When se envía, Then devuelve 400 sin escribir en DynamoDB ni SQS.", "test_file": "src/telemetry/handlers.test.ts", "test_case": "validación BVA de campos y rangos numéricos"},
            {"ac": "AC1.2.2", "desc": "Given reloj controlado y timestamp exactamente +5 min (300 s), When se envía, Then se acepta.", "test_file": "src/telemetry/handlers.test.ts", "test_case": "acepta timestamp en el límite superior de +300s"},
            {"ac": "AC1.2.3", "desc": "Given reloj controlado y timestamp posterior a +5 min, When se envía, Then devuelve 400 sin escritura.", "test_file": "src/telemetry/handlers.test.ts", "test_case": "rechaza timestamp con más de 300s en el futuro con 400"},
            {"ac": "AC1.2.4", "desc": "Given clave ausente o inválida, When se invoca, Then API Gateway rechaza sin invocar la Lambda.", "test_file": "infra/telemetry-stack.test.ts", "test_case": "API Gateway requiere API Key y Usage Plan obligatorio"},
            {"ac": "AC1.2.5", "desc": "Given perfil aislado con clave y cuota controladas, When se excede la tasa, Then responde 429 Too Many Requests.", "test_file": "src/telemetry/handlers.test.ts", "test_case": "código de error 429 para rate limiting"},
            {"ac": "AC1.2.6", "desc": "Given un fallo en la transacción DynamoDB, When la Lambda procesa la solicitud, Then no responde 202, no deja evento ni salida parcial y devuelve 503.", "test_file": "src/telemetry/adapters.test.ts", "test_case": "fallo before/during/after del commit nunca deja estado parcial ni 202 falso"}
        ]
    },
    {
        "id": "US2.1",
        "title": "Persistir de forma atómica e idempotente",
        "slice": "Persistir telemetría",
        "persona": "P3 - Ingeniero de plataforma",
        "priority": "Must Have",
        "depends_on": "US6.1",
        "requirements": ["FR4.1–FR4.4", "NFR2", "NFR4"],
        "summary": "Persistir cada evento y su salida de alerta de forma atómica e idempotente con TTL de 90 días en DynamoDB.",
        "criteria": [
            {"ac": "AC2.1.1", "desc": "Given solicitud HTTP válida, When la única Lambda la procesa, Then DynamoDB contiene un único evento con acceptedAt antes del 202.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "persiste atómicamente"},
            {"ac": "AC2.1.2", "desc": "Given solicitudes HTTP con mismo eventId y payload idéntico, When compiten, Then queda 1 evento y como máximo 1 salida con alertId determinista.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "solicitudes HTTP concurrentes idénticas dejan un evento y una sola salida"},
            {"ac": "AC2.1.3", "desc": "Given un eventId ya persistido y payload diferente, When llega conflicto, Then el primer evento es inmutable y se registra IDEMPOTENCY_CONFLICT (409).", "test_file": "src/telemetry/adapters.test.ts", "test_case": "colisión de payload con mismo eventId genera TransactionCanceledException 409"},
            {"ac": "AC2.1.4", "desc": "Given batería baja, When la transacción termina o se interrumpe, Then quedan evento y salida PENDING o ninguno, nunca parcial.", "test_file": "src/telemetry/adapters.test.ts", "test_case": "causalidad y atomicidad del adaptador integrado"},
            {"ac": "AC2.1.5", "desc": "Given acceptedAt, When se persiste, Then expiresAt = acceptedAt + 90 días y TTL está habilitado.", "test_file": "src/telemetry/adapters.test.ts", "test_case": "calcula expiresAt a 90 días exactos y activa TTL en tabla CDK"},
            {"ac": "AC2.1.6", "desc": "Given salida ya pendiente y duplicado idéntico, When se reintenta, Then no se sustituye la salida existente.", "test_file": "src/telemetry/service.test.ts", "test_case": "preserva estado PENDING previo ante reintento de creación idéntico"}
        ]
    },
    {
        "id": "US3.1",
        "title": "Entregar una alerta lógica completa",
        "slice": "Alertar batería baja",
        "persona": "P2 - Operador de flota",
        "priority": "Must Have",
        "depends_on": "US2.1",
        "requirements": ["FR5.1", "FR5.2", "FR5.3"],
        "summary": "Emitir una alerta identificable cuando la batería sea inferior al 20%, con deduplicación determinista en SQS.",
        "criteria": [
            {"ac": "AC3.1.1", "desc": "Given battery.value = 0 o 19.99, When se confirma transacción, Then crea salida PENDING con alertId determinista LOW_BATTERY:{eventId}.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "batería 19.99 crea alerta en outbox; valor 20 no crea alerta"},
            {"ac": "AC3.1.2", "desc": "Given battery.value = 20.00 exacto, When se procesa, Then persiste evento SIN salida Outbox ni mensaje en SQS.", "test_file": "src/telemetry/service.test.ts", "test_case": "batería en frontera 20.0 no genera registro Outbox"},
            {"ac": "AC3.1.3", "desc": "Given evento temperature o speed, When se procesa, Then se ignora silenciosamente para alertas de batería.", "test_file": "src/telemetry/service.test.ts", "test_case": "eventos no-batería omiten creación de alertas"},
            {"ac": "AC3.1.4", "desc": "Given alerta publicada, When un consumidor la lee, Then contiene alertId, eventId, vehicleId, alertType, batteryValue y occurredAt UTC.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "payload de SQS cumple con contrato canónico de alerta"},
            {"ac": "AC3.1.5", "desc": "Given dos entregas de un evento con battery.value < 20, When se publica o reintenta, Then conservan el mismo alertId para un único efecto lógico.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "reentrega de SQS mantiene alertId único para deduplicación en consumidor"},
            {"ac": "AC3.1.6", "desc": "Given eventos fuera de orden cronológico, When llegan, Then se procesan sin estado acumulativo: cada evento crea alerta independiente si < 20.", "test_file": "src/telemetry/service.test.ts", "test_case": "procesamiento sin estado acumulativo cronológico"}
        ]
    },
    {
        "id": "US3.2",
        "title": "Conservar una alerta pendiente ante fallos",
        "slice": "Alertar batería baja",
        "persona": "P3 - Ingeniero de plataforma",
        "priority": "Must Have",
        "depends_on": "US2.1, US3.1",
        "requirements": ["FR4.3", "FR4.4", "FR5.3", "FR5.4", "FR6.2", "NFR7"],
        "summary": "Conservar y reintentar una publicación de alerta fallida o incierta en estado PENDING para evitar pérdidas lógicas.",
        "criteria": [
            {"ac": "AC3.2.1", "desc": "Given salida PENDING, When la publicación en SQS falla antes de aceptación, Then permanece PENDING con el mismo alertId.", "test_file": "src/telemetry/service.test.ts", "test_case": "mantiene PENDING cuando SQS lanza error de red"},
            {"ac": "AC3.2.2", "desc": "Given resultado incierto después de aceptación, When se reintenta, Then se reutiliza el mismo alertId determinista.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "reintento ante incertidumbre conserva alertId"},
            {"ac": "AC3.2.3", "desc": "Given confirmación de SQS, When se actualiza la salida, Then transiciona condicionalmente a PUBLISHED.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "actualización condicional a PUBLISHED con token de reclamo"},
            {"ac": "AC3.2.4", "desc": "Given que SQS aceptó pero falló la actualización a PUBLISHED, Then permanece recuperable sin duplicar efecto lógico en consumidor.", "test_file": "src/telemetry/adapters.test.ts", "test_case": "recuperación idempotente de salidas inconsistentes"}
        ]
    },
    {
        "id": "US4.1",
        "title": "Reintentar salidas pendientes automáticamente",
        "slice": "Recuperar salidas",
        "persona": "P3 - Ingeniero de plataforma",
        "priority": "Must Have",
        "depends_on": "US3.2, US6.1",
        "requirements": ["FR6.1", "FR6.2", "FR6.3", "NFR7"],
        "summary": "La misma Lambda procesadora barre periódicamente vía EventBridge las salidas pendientes para despacharlas a SQS.",
        "criteria": [
            {"ac": "AC4.1.1", "desc": "Given salidas PENDING vencidas y una PUBLISHED, When EventBridge invoca la Lambda, Then consulta solo pendientes y no republica PUBLISHED.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "recupera PENDING tras fallo de SQS en la siguiente invocación programada"},
            {"ac": "AC4.1.2", "desc": "Given salida PENDING tras fallo de SQS, When llega invocación con SQS restablecida, Then reintenta y marca PUBLISHED.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "confirmación y cierre de ciclo Outbox"},
            {"ac": "AC4.1.3", "desc": "Given logs de recuperación, Then distinguen causa y contienen correlación y eventId sin fugar secretos ni payload crudo.", "test_file": "src/telemetry/observability.test.ts", "test_case": "logs estructurados de barrido con correlación sin secretos"},
            {"ac": "AC4.1.4", "desc": "Given invocaciones concurrentes de recuperación, When compiten, Then reclamo condicional evita dos propietarios activos.", "test_file": "src/telemetry/adapters.test.ts", "test_case": "reclamo atómico con claimToken y leaseUntil"}
        ]
    },
    {
        "id": "US4.2",
        "title": "Ejecutar recuperación controlada (Manual CLI)",
        "slice": "Recuperar salidas",
        "persona": "P3 - Ingeniero de plataforma",
        "priority": "Must Have",
        "depends_on": "US4.1, US2.1",
        "requirements": ["FR4.2–FR4.4", "FR6.2", "FR6.3", "NFR7"],
        "summary": "Herramienta CLI de recuperación con preview limitado a 25 registros, firma HMAC KMS con 300s TTL y confirmación explícita.",
        "criteria": [
            {"ac": "AC4.2.1", "desc": "Given salidas PENDING, When prepara reintento, Then muestra preview con IDs, cantidad (máximo 25) y fingerprint sin secretos.", "test_file": "src/telemetry/manual-recovery.test.ts", "test_case": "preview limitado a 25 registros con sobre criptográfico"},
            {"ac": "AC4.2.2", "desc": "Given confirmación ausente o actor no autorizado, When intenta ejecutar, Then rechaza sin mutar salidas.", "test_file": "src/telemetry/recovery-preview.test.ts", "test_case": "rechaza ejecución con firma HMAC inválida o expirada >300s"},
            {"ac": "AC4.2.3", "desc": "Given confirmación autorizada EXECUTE <digest>, When termina, Then reporta confirmadas, fallidas y pendientes con correlación.", "test_file": "tests/integration/telemetry-operations.test.ts", "test_case": "flujo integrado de recuperación con Context awsRequestId"},
            {"ac": "AC4.2.4", "desc": "Given reintento repetido, When procesa salidas existentes, Then conserva alertId sin duplicar eventos.", "test_file": "src/telemetry/manual-recovery.test.ts", "test_case": "idempotencia estricta en reintento manual"},
            {"ac": "AC4.2.5", "desc": "Given fallo parcial, When se detiene, Then salidas no confirmadas permanecen PENDING para siguiente barrido.", "test_file": "src/telemetry/operations-cli.test.ts", "test_case": "reporte CLI de estados y aislamiento de fallos"}
        ]
    },
    {
        "id": "US5.1",
        "title": "Medir SLO y retención",
        "slice": "Medir y observar",
        "persona": "P3 - Ingeniero de plataforma",
        "priority": "Must Have",
        "depends_on": "US1.1, US2.1",
        "requirements": ["NFR1", "NFR2", "NFR3", "NFR4"],
        "summary": "Medir latencia, tiempo de procesamiento durable ReceiveToCommit, disponibilidad mensual 99.9% y retención TTL.",
        "criteria": [
            {"ac": "AC5.1.1", "desc": "Given perfil de carga aprobado en staging, When sostiene 100 req/s, Then p95 <= 500 ms.", "test_file": "Fase 4 - Operación", "test_case": "Diferido a entorno real de AWS Staging (Gap F9)"},
            {"ac": "AC5.1.2", "desc": "Given medición desde recepción HTTP a commit en DynamoDB, Then >= 99% llega a ese estado en < 30 s.", "test_file": "src/telemetry/observability.test.ts", "test_case": "métrica durable ReceiveToCommit emitida en CloudWatch EMF"},
            {"ac": "AC5.1.3", "desc": "Given datos sintéticos con minutos disponibles, fallidos y de mantenimiento, When aplica fórmula mensual, Then mantenimiento no se excluye del denominador.", "test_file": "src/telemetry/availability.test.ts", "test_case": "cálculo de disponibilidad mensual rigurosa sin exclusión de mantenimiento"},
            {"ac": "AC5.1.4", "desc": "Given evento persistido, When se inspecciona TTL, Then expiresAt usa acceptedAt + 90 días exactos.", "test_file": "src/telemetry/adapters.test.ts", "test_case": "verificación de TTL de 90 días en segundos"},
            {"ac": "AC5.1.5", "desc": "Given mes calendario en staging, When se calcula disponibilidad con datos reales, Then resultado es >= 99.9%.", "test_file": "Fase 4 - Operación", "test_case": "Monitoreo continuo de SLO durante mes calendario en AWS (Gap F9)"}
        ]
    },
    {
        "id": "US5.2",
        "title": "Detectar fallos y acumulaciones (Alarmas)",
        "slice": "Medir y observar",
        "persona": "P3 - Ingeniero de plataforma",
        "priority": "Must Have",
        "depends_on": "US3.2, US4.1, US5.1",
        "requirements": ["NFR7"],
        "summary": "Métricas nativas CloudWatch EMF bajo namespace VehicleTelemetry y alarmas con umbrales declarados.",
        "criteria": [
            {"ac": "AC5.2.1", "desc": "Given solicitudes aceptadas/rechazadas o errores Lambda/DynamoDB, Then existen logs y métricas EMF correlacionables.", "test_file": "src/telemetry/observability.test.ts", "test_case": "CloudWatch EMF VehicleTelemetry / Service=TelemetryService"},
            {"ac": "AC5.2.2", "desc": "Given antigüedad de salidas PENDING o profundidad SQS anómala, Then se activa alarma de CloudWatch.", "test_file": "infra/telemetry-stack-operations.test.ts", "test_case": "alarma de salidas PENDING estancadas con umbral y período"},
            {"ac": "AC5.2.3", "desc": "Given cada alarma, Then declara indicador, umbral >= 1% en >= 100 req, ventana, severidad y recuperación.", "test_file": "infra/telemetry-stack-operations.test.ts", "test_case": "alarma de tasa de errores con comparador GreaterThanOrEqualToThreshold"},
            {"ac": "AC5.2.4", "desc": "Given alerta operativa, When P3 investiga, Then recorre API Gateway -> Lambda -> DynamoDB -> SQS por X-Correlation-Id.", "test_file": "tests/integration/telemetry-operations.test.ts", "test_case": "trazabilidad end-to-end por correlationId"}
        ]
    },
    {
        "id": "US6.1",
        "title": "Desplegar infraestructura base reproducible (CDK)",
        "slice": "Desplegar y asegurar",
        "persona": "P3 - Ingeniero de plataforma",
        "priority": "Must Have",
        "depends_on": "None",
        "requirements": ["NFR5", "NFR9", "C1", "C2", "C6"],
        "summary": "Infraestructura como código mediante AWS CDK v2 para desplegar la topología estricta de 1 sola Lambda.",
        "criteria": [
            {"ac": "AC6.1.1", "desc": "Given cuenta preparada, When se despliega CDK, Then crea API REST, 1 sola Lambda, 2 tablas DynamoDB, 1 regla EventBridge y solo SQS de alertas.", "test_file": "infra/telemetry-stack.test.ts", "test_case": "comprueba plantilla CDK: exactamente 1 Lambda, 2 Tablas, 1 SQS y cifrado KMS"},
            {"ac": "AC6.1.2", "desc": "Given recursos desplegados, Then SQS y DynamoDB usan KMS, TLS y roles de mínimo privilegio, sin colas de ingreso.", "test_file": "infra/telemetry-stack.test.ts", "test_case": "políticas IAM de mínimo privilegio y restricción de colas no autorizadas"},
            {"ac": "AC6.1.3", "desc": "Given segunda cuenta preparada, When se repite despliegue, Then reproduce staging sin cambios manuales.", "test_file": "infra/telemetry-stack.ts", "test_case": "parametrización de entorno staging y producción"},
            {"ac": "AC6.1.4", "desc": "Given walking skeleton, Then habilita API -> Lambda -> DynamoDB -> SQS y EventBridge sin DLQ de entrada sobrante.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "flujo crítico completo del Walking Skeleton"}
        ]
    },
    {
        "id": "US6.2",
        "title": "Auditar y proteger el despliegue (CloudTrail)",
        "slice": "Desplegar y asegurar",
        "persona": "P3 - Ingeniero de plataforma",
        "priority": "Must Have",
        "depends_on": "US6.1",
        "requirements": ["NFR6", "NFR10", "C4", "C7"],
        "summary": "Identidad temporal OIDC en GitHub Actions y stack de auditoría CloudTrail con KMS y retención inmutable de 90 días.",
        "criteria": [
            {"ac": "AC6.2.1", "desc": "Given pipeline en GitHub Actions, When accede a AWS, Then usa rol federado OIDC sin credenciales estáticas.", "test_file": ".github/workflows/ci.yml", "test_case": "definición de permisos id-token: write y configure-aws-credentials"},
            {"ac": "AC6.2.2", "desc": "Given acciones en AWS, When se consulta CloudTrail, Then registra identidad, acción, recurso y fecha.", "test_file": "infra/telemetry-audit-stack.ts", "test_case": "trail multirregión en TelemetryAuditStack"},
            {"ac": "AC6.2.3", "desc": "Given logs CloudTrail, Then usan clave KMS, retención mínima de 90 días y roles de aplicación no pueden borrarlos.", "test_file": "infra/telemetry-stack-delivery-controls.test.ts", "test_case": "comprueba configuración CloudTrail, retención inmutable y clave KMS"},
            {"ac": "AC6.2.4", "desc": "Given fusión a main, When termina CI verde, Then despliega a staging; producción exige aprobación manual.", "test_file": ".github/workflows/ci.yml", "test_case": "declaración de entornos staging y production con gate manual"}
        ]
    },
    {
        "id": "US6.3",
        "title": "Bloquear cambios que incumplen calidad (Quality Gate)",
        "slice": "Desplegar y asegurar",
        "persona": "P3 - Ingeniero de plataforma",
        "priority": "Must Have",
        "depends_on": "US1.1, US2.1, US3.2, US4.1, US6.1",
        "requirements": ["NFR8", "C3", "C5"],
        "summary": "Comprobaciones obligatorias en cada pull request (lint, types, vitest, cdk synth, Gitleaks) para blindar main.",
        "criteria": [
            {"ac": "AC6.3.1", "desc": "Given pull request, When corre CI, Then ejecuta Prettier, ESLint, TypeScript, Unit/Integration tests, npm audit y Gitleaks.", "test_file": ".github/workflows/ci.yml", "test_case": "ejecución secuencial de quality-gates sin fallos tolerados"},
            {"ac": "AC6.3.2", "desc": "Given una comprobación fallida, When se evalúa protección de main, Then la fusión queda bloqueada.", "test_file": ".github/workflows/ci.yml", "test_case": "fail-fast estricto en cada paso del workflow"},
            {"ac": "AC6.3.3", "desc": "Given comprobaciones verdes, When se fusiona, Then usa squash y artefacto inmutable con hash SHA-256.", "test_file": ".github/workflows/ci.yml", "test_case": "subida de cdk.out con SHA-256 digest para build-once-deploy-anywhere"},
            {"ac": "AC6.3.4", "desc": "Given walking skeleton completo, When corre prueba crítica en CI, Then cubre API -> Lambda -> DynamoDB -> SQS y EventBridge.", "test_file": "tests/integration/telemetry-flow.test.ts", "test_case": "suite integral de flujo crítico (7/7 tests en verde)"}
        ]
    }
]

# Detailed 15 Test Suites Inventory (159 Tests)
test_suites_data = [
    {
        "file": "src/telemetry/handlers.test.ts",
        "title": "Handlers HTTP & Validación Exhaustiva BVA",
        "count": 34,
        "type": "Caja Negra / BVA / HTTP",
        "summary": "Valida todas las combinaciones de frontera BVA numéricas, desbordamientos, tipos inválidos, códigos HTTP de respuesta y regla anti-futuro.",
        "cases": [
            "Batería en frontera válida: 0, 0.01, 50, 99.99, 100 aceptados con 202",
            "Batería fuera de rango BVA: -0.01 y 100.01 rechazados con 400 Bad Request",
            "Temperatura en frontera válida: -50.0 y 150.0 aceptados con 202",
            "Temperatura fuera de rango BVA: -50.01 y 150.01 rechazados con 400 Bad Request",
            "Velocidad en frontera válida: 0.0 y 300.0 aceptados con 202",
            "Velocidad fuera de rango BVA: -0.01 y 300.01 rechazados con 400 Bad Request",
            "Valores no finitos: NaN, Infinity y -Infinity rechazados con 400 Bad Request",
            "Timestamp UTC exacto en frontera anti-futuro (+300s / 5 min) aceptado",
            "Timestamp con desvío mayor a +300s en el futuro rechazado con 400 Bad Request",
            "Campos obligatorios ausentes (eventId, vehicleId, timestamp, eventType, value) dan 400",
            "Rutas o verbos HTTP no soportados rechazados con 400 Bad Request",
            "Exceso de tasa de peticiones responde 429 Too Many Requests (Rate Limit)",
            "Fallo de transacción en DynamoDB responde 503 Service Unavailable sin datos parciales"
        ]
    },
    {
        "file": "src/telemetry/recovery-preview.test.ts",
        "title": "Criptografía AWS KMS & Firma HMAC-SHA256",
        "count": 24,
        "type": "Seguridad / Criptografía",
        "summary": "Valida la generación de sobre criptográfico para la CLI de operaciones, firmas KMS HMAC, expiración y blindaje contra manipulación.",
        "cases": [
            "Generación determinista de firmas HMAC-SHA256 usando clave KMS autorizada",
            "Verificación exitosa de sobre digital íntegro con digest y timestamp válidos",
            "Expiración forzosa: rechaza sobres con más de 300 segundos (5 minutos) de antigüedad",
            "Blindaje anti-tampering: alteración de 1 solo bit en el digest invalida la ejecución",
            "Control de acceso KMS: rechazo inmediato si la clave no está en la lista blanca de permitidas",
            "Aislamiento por requestId: sobre enlazado causalmente al contexto de ejecución"
        ]
    },
    {
        "file": "src/telemetry/service.test.ts",
        "title": "Lógica de Negocio, Reglas de Alerta & Outbox",
        "count": 23,
        "type": "Caja Negra / Dominio",
        "summary": "Valida la regla de negocio para alertas de batería, deduplicación inyectiva determinista, y ciclo de vida del Outbox.",
        "cases": [
            "Regla BVA batería baja: valor 19.99% genera registro Outbox PENDING para SQS",
            "Regla BVA frontera: valor 20.00% exacto persiste el evento pero NO genera alerta",
            "Eventos de tipo temperature y speed se persisten pero omiten la creación de alertas",
            "Identificador lógico determinista: alertId = LOW_BATTERY:{eventId} para deduplicación",
            "Transición condicional de estado: PENDING pasa a PUBLISHED únicamente tras confirmación SQS",
            "Resiliencia ante fallo de SQS: la alerta permanece PENDING sin pérdida de datos",
            "Procesamiento asíncrono sin estado acumulativo ante llegada de eventos desordenados",
            "Idempotencia de reintento: reintentar la creación de una alerta idéntica no duplica registros"
        ]
    },
    {
        "file": "src/telemetry/adapters.test.ts",
        "title": "Adaptador DynamoDB, Atomicidad & Retención TTL",
        "count": 15,
        "type": "Atomicidad / Base de Datos",
        "summary": "Valida el comportamiento transaccional con DynamoDB TransactWriteItems, causalidad estricta y cálculo de TTL de 90 días.",
        "cases": [
            "Escritura conjunta atómica en tabla Events y Outbox en una sola transacción",
            "Barrera de commit: fallo antes, durante o después del commit nunca devuelve un 202 falso",
            "Detección de colisión concurrente: mismo eventId con payload distinto produce 409 Conflict",
            "Idempotencia estricta: reintento concurrente con payload idéntico no duplica filas",
            "Cálculo exacto del atributo expiresAt: acceptedAt + 7,776,000 segundos (90 días)",
            "Control de concurrencia optimista en Outbox mediante claimToken y leaseUntil"
        ]
    },
    {
        "file": "src/telemetry/availability.test.ts",
        "title": "Cálculo Matemático de Disponibilidad Mensual (SLO)",
        "count": 13,
        "type": "Matemática / Disponibilidad",
        "summary": "Valida la fórmula del 99.9% de disponibilidad mensual sin deducciones engañosas de mantenimiento (NFR3).",
        "cases": [
            "Fórmula estricta: minutos disponibles divididos para minutos totales del mes",
            "Inclusión obligatoria de ventanas de mantenimiento en el denominador",
            "Validación para meses de 28, 29, 30 y 31 días (incluyendo años bisiestos)",
            "Ponderación exacta de minutos con degradación o indisponibilidad total"
        ]
    },
    {
        "file": "src/telemetry/model.test.ts",
        "title": "Modelo de Datos & Esquema Estricto TypeScript",
        "count": 11,
        "type": "Tipado & Esquema",
        "summary": "Valida la integridad del modelo de datos de telemetría, tipado discriminado y serialización canónica.",
        "cases": [
            "Parseo y validación de tipos permitidos (battery, temperature, speed)",
            "Serialización JSON canónica sin mutación de atributos",
            "Formato de fechas ISO-8601 estricto con zona horaria UTC",
            "Inmutabilidad de objetos de dominio tras su creación"
        ]
    },
    {
        "file": "src/telemetry/manual-recovery.test.ts",
        "title": "Herramienta CLI de Recuperación Manual",
        "count": 7,
        "type": "Operaciones / CLI",
        "summary": "Valida las reglas de seguridad de la consola de recuperación: límites de registros y sanitización.",
        "cases": [
            "Acotación estricta a un máximo de 25 registros por lote para evitar timeouts",
            "Filtrado exclusivo por scope due-pending (solo alertas no confirmadas)",
            "Sanitización de salida: no expone credenciales ni payloads crudos en terminal",
            "Comportamiento idempotente ante reintentos repetidos del mismo lote"
        ]
    },
    {
        "tests_count": 6,
        "file": "tests/integration/telemetry-flow.test.ts",
        "title": "Walking Skeleton E2E (Flujo Crítico Completo)",
        "count": 6,
        "type": "Integración E2E",
        "summary": "Valida el recorrido completo del Walking Skeleton de punta a punta con emulación de servicios AWS.",
        "cases": [
            "Flujo crítico E2E: Ingesta HTTP -> Lambda única -> DynamoDB Transaccional -> Outbox -> SQS",
            "Recuperación de alertas: simula caída transitoria de SQS y recuperación en siguiente barrido",
            "Regla periódica EventBridge (rate 1 min) invoca la misma Lambda y despacha alertas pendientes",
            "Deduplicación determinista: reentregas en SQS conservan alertId único",
            "Rechazo síncrono 400 sin escribir en DynamoDB ante violaciones de contrato",
            "Causalidad transaccional: 202 devuelto únicamente tras la confirmación en base de datos"
        ]
    },
    {
        "file": "src/telemetry/observability.test.ts",
        "title": "Observabilidad CloudWatch EMF & Sanitización de Logs",
        "count": 6,
        "type": "Métricas & Logs",
        "summary": "Valida la emisión de métricas nativas CloudWatch EMF y la trazabilidad distribuida sin fugas de información.",
        "cases": [
            "Emisión nativa en formato Embedded Metric Format (EMF) bajo VehicleTelemetry",
            "Métrica durable ReceiveToCommit que mide latencia real hasta el commit en DynamoDB",
            "Inyección y propagación de X-Correlation-Id en cada log estructurado",
            "Sanitización automática: exclusión de tokens o payloads crudos en los streams de log"
        ]
    },
    {
        "file": "infra/telemetry-stack-delivery-controls.test.ts",
        "title": "Aserciones CDK: Auditoría, CloudTrail & KMS",
        "count": 5,
        "type": "Infraestructura CDK",
        "summary": "Aserciones sobre la plantilla CloudFormation generada para verificar CloudTrail, KMS y políticas de retención.",
        "cases": [
            "Sintetiza CloudTrail con registro multirregión activo",
            "Sintetiza clave KMS CMK para cifrado en reposo de logs de auditoría",
            "Aplica política de bucket S3 que impide el borrado de logs por roles de la aplicación",
            "Desacoplamiento arquitectónico en TelemetryAuditStack para evitar sobrecostos"
        ]
    },
    {
        "file": "infra/telemetry-stack-operations.test.ts",
        "title": "Aserciones CDK: Alarmas CloudWatch & Permisos IAM",
        "count": 4,
        "type": "Infraestructura CDK",
        "summary": "Aserciones CDK sobre alarmas de umbral de errores y permisos de mínimo privilegio.",
        "cases": [
            "Alarma CloudWatch de tasa de fallos HTTP con comparador GreaterThanOrEqualToThreshold (>= 1%)",
            "Evaluación de umbral sobre mínimo 100 peticiones elegibles",
            "Permiso IAM Query restringido exclusivamente al ARN del índice TtlByShard en DynamoDB",
            "Configuración opcional de SNS para alarmas sin bloquear síntesis"
        ]
    },
    {
        "file": "infra/telemetry-stack.test.ts",
        "title": "Aserciones CDK: Topología Minimal (1 Sola Lambda)",
        "count": 4,
        "type": "Infraestructura CDK",
        "summary": "Aserciones que garantizan que la arquitectura CDK cumpla con el principio Minimal acordado.",
        "cases": [
            "Verificación de exactamente 1 sola función Lambda en el stack",
            "Verificación de exactamente 2 tablas DynamoDB (Events y Outbox) con cifrado KMS",
            "Verificación de exactamente 1 cola SQS de alertas con cifrado KMS",
            "Prohibición estricta de colas de entrada o DLQs no aprobadas por la arquitectura"
        ]
    },
    {
        "file": "src/telemetry/handlers-operations.test.ts",
        "title": "Enrutamiento Operativo & Presupuesto de Tiempo",
        "count": 3,
        "type": "Routing Interno",
        "summary": "Valida que las operaciones manuales respeten el presupuesto de tiempo del Lambda Context.",
        "cases": [
            "Enrutamiento interno de tareas operativas dentro de la misma función Lambda",
            "Cancelación segura de la operación si getRemainingTimeInMillis() es menor a 5000 ms",
            "Manejo ordenado de errores operacionales y emisión de métricas de rechazo"
        ]
    },
    {
        "file": "src/telemetry/operations-cli.test.ts",
        "title": "Consola Operativa & Confirmación Explícita",
        "count": 3,
        "type": "CLI / Seguridad",
        "summary": "Valida la seguridad interactiva de la CLI mediante confirmación obligatoria.",
        "cases": [
            "Rechazo de ejecución si el operador no escribe exactamente EXECUTE <digest>",
            "Validación del digest criptográfico contra el sobre generado",
            "Generación de reporte tabular de salidas confirmadas, pendientes y fallidas"
        ]
    },
    {
        "file": "tests/integration/telemetry-operations.test.ts",
        "title": "Integración Operativa con Lambda Context",
        "count": 1,
        "type": "Integración Operativa",
        "summary": "Valida el ciclo operativo completo integrando el awsRequestId de AWS Lambda.",
        "cases": [
            "Ejecución preview -> confirmación con firma KMS y trazabilidad atada a CloudTrail"
        ]
    }
]

# Days definition from bitacora
days_data = [
    {
        "day": 1,
        "title": "Bootstrap & Onboarding Inicial",
        "stages": "Instalación y comprobación con aidlc --doctor. Lectura y estudio de la guía del taller.",
        "changes": "Sin cambios en código; configuración inicial de herramientas y preparación del entorno de trabajo.",
        "understand": "Comprensión del flujo general de AI-DLC y la estructura de directorios.",
        "highlight": "Inicio limpio del entorno con verificación de dependencias base."
    },
    {
        "day": 2,
        "title": "Incepción: De Inicio a User Stories",
        "stages": "Desde Inicio (0.1) hasta la aprobación formal de User Stories (2.4).",
        "changes": "(1) Rechacé la arquitectura inicial en Requirements Analysis por falta de deduplicación. (2) Rechacé la historia US3.1 en User Stories exigiendo el uso estricto de MessageDeduplicationId en SQS para hacerla testeable (Completando 2 de 3 rechazos mandatorios del taller). Migración táctica a motor híbrido con Antigravity.",
        "understand": "Diagnóstico de los límites de hooks en Kiro bajo Windows y adopción de gobierno híbrido por consola.",
        "highlight": "2/3 Rechazos justificados completados; BDD y testabilidad blindadas."
    },
    {
        "day": 3,
        "title": "Incepción: De Domain Design a Delivery Planning",
        "stages": "Desde Domain Design (2.6) hasta Delivery Planning (2.9), finalizando con éxito la fase de Inception.",
        "changes": "(1) En 2.6 resolví contradicciones arquitectónicas: rechacé opciones con múltiples Lambdas y fijé la ÚNICA Lambda directa acordada. (2) En 2.8 rechacé el contrato base exigiendo trazas (X-Correlation-Id) y el código 429 Too Many Requests para Day 2 Operations (Completando 3/3 rechazos del taller).",
        "understand": "Clarificación de cómo la arquitectura impacta la testeabilidad temprana y la observabilidad distribuida.",
        "highlight": "3/3 Rechazos obligatorios completados. Incepción cerrada formalmente."
    },
    {
        "day": 4,
        "title": "Construcción (Bolt 1): Functional Design",
        "stages": "Inicio de la fase de Construcción (Bolt 1), etapa functional-design (3.1).",
        "changes": "El archivo traceability.json generado inicialmente dejó el arreglo de cobertura vacío. Corregí manualmente el mapeo de criterios de aceptación y completé los artefactos documentales.",
        "understand": "Descubrimiento de que el motor de AI-DLC requiere obligatoriamente una revisión interna de arquitectura (aidlc-architecture-reviewer-agent) para emitir el recibo de unidad y abrir la puerta humana.",
        "highlight": "Superación de bucles en consola y restauración de trazabilidad 100% íntegra."
    },
    {
        "day": 5,
        "title": "Construcción: Code Generation del Walking Skeleton",
        "stages": "Desde la resolución del bucle en functional-design hasta la finalización de Code Generation.",
        "changes": "En las puertas de aclaración prioricé los requisitos de negocio (BDD): permití IDs flexibles para hardware IoT y forcé el patrón Outbox transaccional para alertas. Inyección manual de firmas de trust en Codex.",
        "understand": "Identificación de dependencia interna en bun para validaciones TypeScript en Windows y su estabilización.",
        "highlight": "23 pruebas unitarias y la prueba de integración del Walking Skeleton en verde a la primera."
    },
    {
        "day": 6,
        "title": "Construcción: NFR e Infrastructure Design",
        "stages": "Desde NFR Design (3.3) hasta el rediseño y revisión humana en Infrastructure Design (3.4).",
        "changes": "Rechacé tajantemente el diseño de infraestructura porque Codex alucinó una arquitectura de 3 Lambdas que rompía la estrategia minimalista. Obligué al agente a regresar a la 'Única Lambda procesadora'. Rechacé su intento de cambiar el contrato a 202 asíncrono prematuro (forzándolo a mantener el 400 síncrono ante datos corruptos).",
        "understand": "Manejo del LLM Laziness: cuando el agente intenta auto-aprobarse etapas, el framework bloquea el avance porque los documentos invalidaron el checkpoint.",
        "highlight": "Gobierno humano implacable contra alucinaciones arquitectónicas de la IA."
    },
    {
        "day": 7,
        "title": "Construcción a Incepción: Loop-Back de Dominio",
        "stages": "Desde la puerta de aprobación de Code Generation (3.5) en Construcción hasta la aprobación formal de Domain Design (2.6) en Incepción.",
        "changes": "Apliqué Request Changes en Code Generation al detectar que el código ejecutaba 3 Lambdas y SQS de entrada, contradiciendo la especificación aprobada. Se activó la retropropagación de AI-DLC hasta Practices Discovery (2.2), purgando reglas obsoletas en project.md y realineando en cascada Requirements (2.3), User Stories (2.4), Mockups (2.5) y Domain (2.6) con el componente único TelemetryService.",
        "understand": "Comprensión de la rigidez de la máquina de estados de AI-DLC y cómo reanudar estados tras cambios estructurales.",
        "highlight": "Demostración de maestría en AI-DLC ejecutando un retorno ordenado en cascada."
    },
    {
        "day": 8,
        "title": "Construcción Integral: U1, U2 y U3",
        "stages": "Cierre formal de Inception (Verified) y generación de código de las 3 unidades de Construcción (U1 núcleo con Walking Skeleton, U2 operaciones y manual recovery, U3 controles de entrega con GitHub Actions). Entrada a Build and Test (3.6) con 49 pruebas.",
        "changes": "En U1 consolidé la topología estricta de una sola Lambda con Outbox y barrido por EventBridge. En U2 corregí discrepancias en el prompt del checkpoint. En U3 seleccioné GitHub Actions con OIDC sin credenciales estáticas y analicé y clasifiqué falsos positivos de hashes sintéticos de CDK en Gitleaks 8.30.1.",
        "understand": "Sensibilidad de los guardarraíles criptográficos de AI-DLC en Windows durante la aprobación de checkpoints.",
        "highlight": "U1, U2 y U3 compilando con 49 pruebas automatizadas y Gitleaks en Exit 0."
    },
    {
        "day": 9,
        "title": "Loop-Back de Construcción: Resolución F1-F6 y Code Freeze",
        "stages": "Loop-Back desde Build and Test (3.6) hacia Code Generation (3.5) por los hallazgos F1–F7. Revalidación completa de U1, ejecución del plan de 15 pasos de U2 con 146 pruebas y avance en U3.",
        "changes": "Rechacé tocar el código del núcleo (U1), forzando un plan de solo revalidación para aislar defectos en U2 y U3. En U2 aprobé blindar la herramienta de recuperación manual con firmas KMS HMAC y expiración (300 s). En U3 apliqué la actualización quirúrgica a aws-cdk-lib: 2.273.0, cerrando el hallazgo F1 con 0 vulnerabilidades.",
        "understand": "Por qué el framework en modo unit-major exige certificar la base de no-regresión de U1 antes de tocar capas superiores, y el rol del Code Freeze para sellar evidencia bit a bit.",
        "highlight": "Defecto F1 resuelto a 0 vulnerabilidades y blindaje criptográfico de operaciones."
    },
    {
        "day": 10,
        "title": "100% Construcción Cerrada, CI Pipeline y Entrada a Operación",
        "stages": "Aprobación del Checkpoint Skeleton de U1 (7/7 tests de integración), revalidación de U2 y cierre formal de U3 con 159 tests en verde, 0 vulnerabilidades y Gitleaks limpio. Cierre formal de Build and Test (3.6) y CI Pipeline (3.7) completando el 100% de Construcción con .github/workflows/ci.yml. Entrada a Operación: 4.2 (Deployment Pipeline) y 4.1 (Environment Provisioning con autenticación de cuenta corporativa 745708001009 en sa-east-1).",
        "changes": "(1) Rechacé la sugerencia de integrar AWS AppConfig, forzando 'Sin feature flags por ahora' para proteger el principio Minimal del Walking Skeleton. (2) En Build and Test, autoricé continuar con frontera en FAIL documentado en lugar de loop infinito en local (Trazabilidad Honesta: 100 RPS y disponibilidad 30d corresponden a la nube). (3) Rechacé institucionalizar el bypass como política permanente. (4) Ante la solicitud de desplegar TelemetryAudit con KMS y Object Lock de 90 días, frené el despliegue para consultarlo con Ronnie (validado y felicitado por Ronnie: 'genial!, dejale ahí, con eso estamos'). (5) Establecí aislamiento de seguridad estricto a sa-east-1 y namespace Telemetry-*.",
        "understand": "Clarificación de dos Lambdas (Staging y Producción conviviendo en cuenta compartida), variables de entorno en Windows vs ~/.aws/credentials, y roles de SNS (alarmas) y OIDC (despliegue sin contraseñas fijas).",
        "highlight": "100% de Construcción verificado, CI Pipeline completado y gobierno humano que salvó la cuenta corporativa de bloqueos de 90 días."
    }
]

html_template = f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Inducción y Trazabilidad AI-DLC | Telemetría Vehicular CarConnect</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {{
      --bg: #0d1322;
      --bg-surface: #131b2e;
      --panel: #18233c;
      --panel-alt: #1f2c4b;
      --border: rgba(255, 255, 255, 0.12);
      --border-focus: rgba(148, 214, 0, 0.6);
      --accent: #94D600;       /* CarConnect Lime Green */
      --accent-rgb: 148, 214, 0;
      --accent-gold: #ffb547;  /* Warning / Human Review */
      --accent-blue: #38bdf8;  /* Cloud / Architecture */
      --accent-rose: #f43f5e;  /* Security / Rejections */
      --ink: #ffffff;
      --ink2: rgba(255, 255, 255, 0.76);
      --ink-dim: rgba(255, 255, 255, 0.45);
      --font-display: "Kanit", system-ui, -apple-system, sans-serif;
      --font-body: "Kanit", system-ui, -apple-system, sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, Menlo, monospace;
      color-scheme: dark;
    }}
    * {{ box-sizing: border-box; }}
    html, body {{ min-height: 100%; margin: 0; padding: 0; }}
    body {{
      background: var(--bg);
      color: var(--ink);
      font: 300 16px/1.6 var(--font-body);
      -webkit-font-smoothing: antialiased;
    }}
    a {{ color: var(--accent); text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    
    /* Layout */
    .app {{
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px 20px 80px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }}

    /* Top Brand & Header */
    header.hero {{
      background: linear-gradient(135deg, rgba(29, 42, 77, 0.7) 0%, rgba(13, 19, 34, 0.9) 100%);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 32px 36px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }}
    header.hero::after {{
      content: "";
      position: absolute;
      top: -60px;
      right: -60px;
      width: 260px;
      height: 260px;
      background: radial-gradient(circle, rgba(148, 214, 0, 0.15) 0%, transparent 70%);
      pointer-events: none;
    }}
    .brand-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 14px;
    }}
    .brand-title {{
      display: flex;
      align-items: center;
      gap: 12px;
      font: 700 24px/1 var(--font-display);
      letter-spacing: 0.02em;
    }}
    .brand-badge {{
      background: rgba(148, 214, 0, 0.15);
      border: 1px solid var(--accent);
      color: var(--accent);
      padding: 4px 12px;
      border-radius: 999px;
      font: 600 12px var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }}
    .hero-h1 {{
      margin: 0 0 10px;
      font: 700 clamp(30px, 4vw, 48px)/1.08 var(--font-display);
      letter-spacing: -0.01em;
    }}
    .hero-lead {{
      margin: 0;
      color: var(--ink2);
      font-size: clamp(16px, 1.3vw, 18px);
      max-width: 90ch;
    }}

    /* KPI Bar */
    .kpi-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 14px;
      margin-top: 24px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
    }}
    .kpi-card {{
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 14px 16px;
      transition: transform 0.2s, border-color 0.2s;
    }}
    .kpi-card:hover {{
      transform: translateY(-2px);
      border-color: var(--accent);
    }}
    .kpi-num {{
      font: 700 28px/1 var(--font-display);
      color: var(--accent);
      margin-bottom: 4px;
    }}
    .kpi-num.gold {{ color: var(--accent-gold); }}
    .kpi-num.blue {{ color: var(--accent-blue); }}
    .kpi-num.rose {{ color: var(--accent-rose); }}
    .kpi-lbl {{
      font: 500 12px var(--font-mono);
      color: var(--ink2);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}

    /* Tab Navigation */
    .nav-container {{
      position: sticky;
      top: 12px;
      z-index: 100;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      background: rgba(13, 19, 34, 0.85);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 6px;
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }}
    .nav-container::-webkit-scrollbar {{ display: none; }}
    .nav-btn {{
      background: none;
      border: none;
      color: var(--ink2);
      font: 600 14px var(--font-display);
      padding: 10px 20px;
      border-radius: 999px;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .nav-btn:hover {{
      color: var(--ink);
      background: rgba(255, 255, 255, 0.08);
    }}
    .nav-btn.active {{
      background: var(--accent);
      color: #0b1424;
      font-weight: 700;
      box-shadow: 0 2px 12px rgba(148, 214, 0, 0.4);
    }}

    /* Tab Panels */
    .tab-panel {{
      display: none;
      animation: fadeIn 0.35s ease forwards;
    }}
    .tab-panel.active {{
      display: block;
    }}
    @keyframes fadeIn {{
      from {{ opacity: 0; transform: translateY(8px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}

    /* Generic Section Styles */
    .sec-card {{
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    }}
    .sec-h2 {{
      margin: 0 0 12px;
      font: 700 clamp(24px, 2.5vw, 34px)/1.15 var(--font-display);
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--ink);
    }}
    .sec-lead {{
      color: var(--ink2);
      font-size: 16px;
      margin: 0 0 24px;
      max-width: 85ch;
    }}

    /* Search & Filter Bar */
    .filter-bar {{
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 24px;
      background: rgba(255,255,255,0.03);
      padding: 12px 16px;
      border-radius: 14px;
      border: 1px solid var(--border);
    }}
    .search-input {{
      flex: 1;
      min-width: 240px;
      background: var(--panel);
      border: 1px solid var(--border);
      color: var(--ink);
      padding: 10px 18px;
      border-radius: 999px;
      font: 400 14px var(--font-body);
      outline: none;
      transition: border-color 0.2s;
    }}
    .search-input:focus {{
      border-color: var(--accent);
    }}
    .chip-group {{
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }}
    .chip {{
      background: var(--panel);
      border: 1px solid var(--border);
      color: var(--ink2);
      font: 500 12px var(--font-mono);
      padding: 6px 14px;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s;
    }}
    .chip:hover {{
      border-color: var(--ink);
      color: var(--ink);
    }}
    .chip.active {{
      background: var(--accent);
      color: #0b1424;
      border-color: var(--accent);
      font-weight: 700;
    }}

    /* View Switcher Bar (For Tab 4) */
    .view-toggle-bar {{
      display: flex;
      gap: 8px;
      margin-bottom: 18px;
      background: rgba(0,0,0,0.25);
      padding: 6px;
      border-radius: 12px;
      border: 1px solid var(--border);
      align-self: flex-start;
      display: inline-flex;
    }}
    .view-toggle-btn {{
      background: none;
      border: none;
      color: var(--ink2);
      font: 600 13px var(--font-display);
      padding: 8px 18px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }}
    .view-toggle-btn:hover {{
      color: var(--ink);
    }}
    .view-toggle-btn.active {{
      background: var(--panel-alt);
      color: var(--accent);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }}

    /* Architecture Visualizer */
    .arch-container {{
      display: grid;
      grid-template-columns: minmax(0, 1.8fr) minmax(0, 1.2fr);
      gap: 24px;
      align-items: start;
    }}
    @media (max-width: 980px) {{
      .arch-container {{ grid-template-columns: 1fr; }}
    }}
    .arch-svg-wrapper {{
      background: #0a0f1d;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px;
      overflow: hidden;
    }}
    .arch-node {{
      cursor: pointer;
      transition: transform 0.2s, filter 0.2s;
    }}
    .arch-node:hover {{
      filter: brightness(1.25);
    }}
    .arch-details {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 24px;
      min-height: 400px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }}
    .arch-details-badge {{
      display: inline-block;
      align-self: flex-start;
      padding: 4px 10px;
      border-radius: 6px;
      font: 600 11px var(--font-mono);
      text-transform: uppercase;
      background: rgba(148,214,0,0.15);
      color: var(--accent);
      border: 1px solid var(--accent);
    }}

    /* User Stories Accordion Cards */
    .us-grid {{
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }}
    .us-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      transition: border-color 0.2s, box-shadow 0.2s;
    }}
    .us-card:hover {{
      border-color: rgba(148, 214, 0, 0.4);
    }}
    .us-header {{
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.02);
      user-select: none;
      gap: 16px;
      flex-wrap: wrap;
    }}
    .us-header-left {{
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      min-width: 280px;
    }}
    .us-id {{
      background: rgba(148, 214, 0, 0.15);
      color: var(--accent);
      border: 1px solid var(--accent);
      padding: 4px 10px;
      border-radius: 8px;
      font: 700 13px var(--font-mono);
    }}
    .us-title {{
      font: 600 18px var(--font-display);
      margin: 0;
      color: var(--ink);
    }}
    .us-meta {{
      display: flex;
      gap: 10px;
      align-items: center;
    }}
    .badge-slice {{
      font: 500 11px var(--font-mono);
      background: rgba(56, 189, 248, 0.15);
      color: var(--accent-blue);
      border: 1px solid var(--accent-blue);
      padding: 3px 8px;
      border-radius: 999px;
      text-transform: uppercase;
    }}
    .badge-persona {{
      font: 500 12px var(--font-body);
      color: var(--ink2);
    }}
    .us-body {{
      padding: 20px 24px;
      border-top: 1px solid var(--border);
      display: none;
      flex-direction: column;
      gap: 16px;
      background: rgba(0, 0, 0, 0.15);
    }}
    .us-card.open .us-body {{
      display: flex;
    }}
    .us-chevron {{
      transition: transform 0.25s;
      font-size: 16px;
      color: var(--ink-dim);
    }}
    .us-card.open .us-chevron {{
      transform: rotate(180deg);
      color: var(--accent);
    }}
    .ac-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 10px;
    }}
    .ac-table th, .ac-table td {{
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      text-align: left;
      vertical-align: top;
    }}
    .ac-table th {{
      color: var(--ink-dim);
      font: 600 11px var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    .ac-badge {{
      font: 700 11px var(--font-mono);
      color: var(--accent-gold);
      background: rgba(255, 181, 71, 0.12);
      padding: 2px 6px;
      border-radius: 4px;
      white-space: nowrap;
    }}
    .file-tag {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: 500 11px var(--font-mono);
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: var(--accent-blue);
      padding: 3px 8px;
      border-radius: 6px;
      margin-top: 4px;
      cursor: pointer;
    }}
    .file-tag:hover {{
      background: rgba(56, 189, 248, 0.15);
      border-color: var(--accent-blue);
    }}

    /* Table Styles for Traceability Matrix */
    .matrix-table-wrap {{
      overflow-x: auto;
      border-radius: 14px;
      border: 1px solid var(--border);
      background: var(--panel);
    }}
    .matrix-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }}
    .matrix-table th, .matrix-table td {{
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      text-align: left;
      vertical-align: top;
    }}
    .matrix-table th {{
      background: rgba(0, 0, 0, 0.25);
      font: 600 11px var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--ink2);
      position: sticky;
      top: 0;
    }}
    .matrix-table tbody tr:hover {{
      background: rgba(255, 255, 255, 0.02);
    }}
    .badge-status-green {{
      display: inline-block;
      font: 600 11px var(--font-mono);
      color: var(--accent);
      background: rgba(148, 214, 0, 0.12);
      border: 1px solid var(--accent);
      padding: 3px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }}
    .badge-status-pending {{
      display: inline-block;
      font: 600 11px var(--font-mono);
      color: var(--accent-gold);
      background: rgba(255, 181, 71, 0.12);
      border: 1px solid var(--accent-gold);
      padding: 3px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }}

    /* Suite Inventory Cards (15 Suites) */
    .suites-grid {{
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }}
    .suite-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      transition: border-color 0.2s;
    }}
    .suite-card:hover {{
      border-color: var(--accent);
    }}
    .suite-header {{
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      background: rgba(255, 255, 255, 0.02);
      gap: 14px;
      flex-wrap: wrap;
    }}
    .suite-title-row {{
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 260px;
    }}
    .suite-count-badge {{
      background: rgba(148, 214, 0, 0.15);
      border: 1px solid var(--accent);
      color: var(--accent);
      font: 700 14px var(--font-mono);
      padding: 4px 10px;
      border-radius: 8px;
      min-width: 70px;
      text-align: center;
    }}
    .suite-body {{
      padding: 18px 20px;
      border-top: 1px solid var(--border);
      display: none;
      flex-direction: column;
      gap: 12px;
      background: rgba(0, 0, 0, 0.2);
    }}
    .suite-card.open .suite-body {{
      display: flex;
    }}
    .suite-card.open .suite-chevron {{
      transform: rotate(180deg);
      color: var(--accent);
    }}
    .suite-chevron {{
      transition: transform 0.25s;
      font-size: 14px;
      color: var(--ink-dim);
    }}

    /* Timeline Día a Día */
    .timeline {{
      position: relative;
      padding-left: 32px;
      border-left: 2px solid var(--border);
      margin-left: 12px;
    }}
    .timeline-item {{
      position: relative;
      margin-bottom: 32px;
    }}
    .timeline-item::before {{
      content: "";
      position: absolute;
      left: -40px;
      top: 6px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--accent);
      border: 3px solid var(--bg);
      box-shadow: 0 0 0 2px var(--accent);
    }}
    .timeline-item.highlight::before {{
      background: var(--accent-gold);
      box-shadow: 0 0 0 2px var(--accent-gold);
    }}
    .timeline-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 22px 26px;
      transition: border-color 0.2s;
    }}
    .timeline-card:hover {{
      border-color: var(--accent);
    }}
    .timeline-day {{
      font: 700 22px var(--font-display);
      color: var(--ink);
      margin: 0 0 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }}
    .timeline-badge {{
      font: 600 11px var(--font-mono);
      text-transform: uppercase;
      background: rgba(255,255,255,0.08);
      color: var(--accent);
      padding: 3px 10px;
      border-radius: 999px;
    }}
    .timeline-section-title {{
      font: 600 12px var(--font-mono);
      color: var(--accent-gold);
      text-transform: uppercase;
      margin: 10px 0 4px;
      letter-spacing: 0.05em;
    }}
    .timeline-text {{
      margin: 0 0 10px;
      color: var(--ink2);
      font-size: 15px;
    }}

    /* Copy Toast */
    .toast {{
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--accent);
      color: #0b1424;
      font: 700 13px var(--font-mono);
      padding: 10px 18px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      opacity: 0;
      transform: translateY(16px);
      transition: all 0.25s ease;
      pointer-events: none;
      z-index: 9999;
    }}
    .toast.show {{
      opacity: 1;
      transform: translateY(0);
    }}

    /* Code Blocks */
    pre, code {{
      font-family: var(--font-mono);
    }}
    .code-pill {{
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: var(--accent-blue);
    }}

    /* Responsive */
    @media (max-width: 768px) {{
      .app {{ padding: 14px 12px 60px; gap: 18px; }}
      .sec-card {{ padding: 20px 16px; }}
      .hero {{ padding: 24px 20px; }}
      .us-header {{ padding: 14px 16px; }}
      .timeline {{ padding-left: 24px; margin-left: 6px; }}
      .timeline-item::before {{ left: -31px; }}
    }}
  </style>
</head>
<body>

  <div class="toast" id="toast">Copiado al portapapeles</div>

  <div class="app">

    <!-- HERO HEADER -->
    <header class="hero">
      <div class="brand-row">
        <div class="brand-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94D600" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 10.9 2 11v5c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
          CARCONNECT <span style="color:var(--accent); font-weight:300;">TELEMETRY</span>
        </div>
        <div class="brand-badge">AI-DLC Greenfield Workshop</div>
      </div>

      <h1 class="hero-h1">Inducción y Trazabilidad del Sistema de Telemetría</h1>
      <p class="hero-lead">
        Portal interactivo de arquitectura, historias de usuario, inventario completo de los 159 tests automatizados y bitácora técnica del servicio de telemetría vehicular. Construido bajo la metodología <strong>AI-Driven Development Life Cycle (AI-DLC)</strong> con estricto gobierno humano y liderazgo de aseguramiento de calidad (QA).
      </p>

      <!-- KPI COUNTERS -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-num">159</div>
          <div class="kpi-lbl">Tests Automatizados (100% Verde)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-num">100%</div>
          <div class="kpi-lbl">Fase 3 Construcción (Bolt 1)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-num blue">1</div>
          <div class="kpi-lbl">Única Lambda Procesadora</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-num gold">12</div>
          <div class="kpi-lbl">Historias de Usuario (US)</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-num">0</div>
          <div class="kpi-lbl">Vulnerabilidades en Auditoría</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-num gold">10</div>
          <div class="kpi-lbl">Días de Bitácora y Gobernanza</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-num rose">$0</div>
          <div class="kpi-lbl">Cargos Innecesarios en AWS</div>
        </div>
      </div>
    </header>

    <!-- INTERACTIVE TAB NAV -->
    <nav class="nav-container" aria-label="Secciones del portal">
      <button class="nav-btn active" onclick="switchTab('proposito', this)">
        <span>🎯</span> Propósito & Visión
      </button>
      <button class="nav-btn" onclick="switchTab('arquitectura', this)">
        <span>🏛️</span> Arquitectura & Walking Skeleton
      </button>
      <button class="nav-btn" onclick="switchTab('historias', this)">
        <span>📋</span> Historias de Usuario
      </button>
      <button class="nav-btn" onclick="switchTab('matriz', this)">
        <span>🧪</span> Tests & Trazabilidad (159 Tests)
      </button>
      <button class="nav-btn" onclick="switchTab('bitacora', this)">
        <span>📅</span> Bitácora Día a Día
      </button>
      <button class="nav-btn" onclick="switchTab('gobernanza', this)">
        <span>🔐</span> Gobernanza AWS & Seguridad
      </button>
    </nav>

    <!-- ========================================== -->
    <!-- TAB 1: PROPÓSITO & VISIÓN                  -->
    <!-- ========================================== -->
    <section id="tab-proposito" class="tab-panel active">
      <div class="sec-card">
        <h2 class="sec-h2"><span>🎯</span> Propósito del Proyecto y Metodología AI-DLC</h2>
        <p class="sec-lead">
          El objetivo central de este proyecto es construir un servicio de ingestión de telemetría vehicular IoT de alta resiliencia y bajo acoplamiento para <strong>CarConnect</strong>, capaz de procesar señales críticas (batería, temperatura, velocidad) y emitir alertas inmediatas e inmutables cuando el nivel de batería desciende por debajo del 20%.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 24px;">
          <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <h3 style="font: 600 18px var(--font-display); color: var(--accent); margin: 0 0 10px;">
              El Problema de Negocio
            </h3>
            <p style="margin: 0; color: var(--ink2); font-size: 14.5px;">
              Las flotas vehiculares modernas emiten miles de eventos por segundo. Los fallos transitorios de red o caídas de los servicios de notificación no pueden significar la pérdida silenciosa de un evento crítico de batería baja. Se requería una solución que confirmara la recepción atómicamente, garantizara deduplicación determinista y auto-recuperara alertas atascadas sin depender de costosas arquitecturas distribuidas sobrediseñadas.
            </p>
          </div>

          <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <h3 style="font: 600 18px var(--font-display); color: var(--accent-gold); margin: 0 0 10px;">
              El Principio Minimal (Walking Skeleton)
            </h3>
            <p style="margin: 0; color: var(--ink2); font-size: 14.5px;">
              En lugar de adoptar patrones inflados con múltiples microservicios o colas de ingreso redundantes (que los LLM suelen alucinar), establecimos la regla arquitectónica de <strong>1 sola función Lambda procesadora</strong>, transacción atómica conjunta en DynamoDB con patrón <em>Outbox</em>, y barrido programado por EventBridge para reintentos sin fugas.
            </p>
          </div>

          <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <h3 style="font: 600 18px var(--font-display); color: var(--accent-blue); margin: 0 0 10px;">
              Gobierno Humano en el Bucle (Human-in-the-Loop QA)
            </h3>
            <p style="margin: 0; color: var(--ink2); font-size: 14.5px;">
              AI-DLC no es generación descontrolada de código: cada etapa exige aprobación explícita humana. Durante los 10 días se ejercieron <strong>rechazos fundamentales</strong> (frenando arquitecturas de 3 Lambdas, evitando 202 falsos, actualizando quirúrgicamente dependencias y bloqueando despliegues con Object Lock irreversible en AWS), demostrando cómo el liderazgo de QA guía la IA hacia la excelencia.
            </p>
          </div>
        </div>

        <div style="margin-top: 28px; background: rgba(148,214,0,0.05); border: 1px dashed var(--accent); border-radius: 14px; padding: 20px;">
          <h4 style="margin: 0 0 6px; font: 600 16px var(--font-display); color: var(--accent);">
            Trazabilidad Honesta (§10 AI-DLC)
          </h4>
          <p style="margin: 0; font-size: 14px; color: var(--ink2);">
            En la etapa 3.6 (Build & Test), identificamos honestamente que los criterios NFR de 100 RPS sostenidos y disponibilidad mensual de 99.9% requieren la nube real y no pueden falsificarse localmente con mocks. Se registraron como brechas conocidas (Gaps F8/F9) y se autorizó el pase a CI Pipeline documentando la frontera con integridad técnica total.
          </p>
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- TAB 2: ARQUITECTURA & WALKING SKELETON     -->
    <!-- ========================================== -->
    <section id="tab-arquitectura" class="tab-panel">
      <div class="sec-card">
        <h2 class="sec-h2"><span>🏛️</span> Arquitectura del Sistema & Walking Skeleton</h2>
        <p class="sec-lead">
          Topología física y lógica desplegable sintetizada mediante AWS CDK v2. Haz clic en cualquiera de los componentes del diagrama para inspeccionar su responsabilidad, archivo en el repositorio y suite de pruebas asociada.
        </p>

        <div class="arch-container">
          <!-- SVG DIAGRAM -->
          <div class="arch-svg-wrapper">
            <svg viewBox="0 0 680 440" style="width:100%; height:auto; display:block;" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="grad-lambda" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#ff9900" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#ff9900" stop-opacity="0.05"/>
                </linearGradient>
                <linearGradient id="grad-dynamo" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.05"/>
                </linearGradient>
                <linearGradient id="grad-sqs" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.05"/>
                </linearGradient>
                <linearGradient id="grad-event" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#94D600" stop-opacity="0.25"/>
                  <stop offset="100%" stop-color="#94D600" stop-opacity="0.05"/>
                </linearGradient>
              </defs>

              <!-- Conexiones -->
              <path d="M 90 200 L 170 200" stroke="#ffffff" stroke-width="2" stroke-dasharray="4" opacity="0.6"/>
              <path d="M 270 200 L 350 140" stroke="#38bdf8" stroke-width="2" opacity="0.8"/>
              <path d="M 270 200 L 350 260" stroke="#38bdf8" stroke-width="2" opacity="0.8"/>
              <path d="M 220 70 L 220 150" stroke="#94D600" stroke-width="2" opacity="0.8"/>
              <path d="M 270 200 L 530 200" stroke="#f43f5e" stroke-width="2" opacity="0.8"/>
              <path d="M 440 260 L 530 200" stroke="#ffb547" stroke-width="1.5" stroke-dasharray="3" opacity="0.7"/>

              <!-- Node: IoT Client -->
              <g class="arch-node" onclick="showArchInfo('client')">
                <rect x="10" y="165" width="80" height="70" rx="10" fill="#18233c" stroke="var(--border)" stroke-width="1.5"/>
                <text x="50" y="196" fill="#fff" font-family="Kanit" font-size="12" font-weight="600" text-anchor="middle">DISPOSITIVO</text>
                <text x="50" y="214" fill="#94D600" font-family="Kanit" font-size="11" text-anchor="middle">IoT Vehicular</text>
              </g>

              <!-- Node: API Gateway -->
              <g class="arch-node" onclick="showArchInfo('apigw')">
                <rect x="170" y="165" width="100" height="70" rx="10" fill="#18233c" stroke="#38bdf8" stroke-width="1.5"/>
                <text x="220" y="195" fill="#fff" font-family="Kanit" font-size="12" font-weight="600" text-anchor="middle">API GATEWAY</text>
                <text x="220" y="212" fill="#7fd1ff" font-family="JetBrains Mono" font-size="10" text-anchor="middle">POST /events</text>
              </g>

              <!-- Node: Lambda Única -->
              <g class="arch-node" onclick="showArchInfo('lambda')">
                <rect x="160" y="280" width="120" height="95" rx="12" fill="url(#grad-lambda)" stroke="#ff9900" stroke-width="2"/>
                <text x="220" y="310" fill="#ffb547" font-family="Kanit" font-size="14" font-weight="700" text-anchor="middle">LAMBDA ÚNICA</text>
                <text x="220" y="328" fill="#fff" font-family="Kanit" font-size="12" text-anchor="middle">TelemetryService</text>
                <text x="220" y="348" fill="rgba(255,255,255,0.7)" font-family="JetBrains Mono" font-size="10" text-anchor="middle">Node 22 / TS</text>
              </g>
              <path d="M 220 235 L 220 280" stroke="#ff9900" stroke-width="2"/>

              <!-- Node: EventBridge Sweeper -->
              <g class="arch-node" onclick="showArchInfo('eventbridge')">
                <rect x="160" y="20" width="120" height="55" rx="10" fill="url(#grad-event)" stroke="#94D600" stroke-width="1.5"/>
                <text x="220" y="44" fill="#94D600" font-family="Kanit" font-size="12" font-weight="600" text-anchor="middle">EVENTBRIDGE</text>
                <text x="220" y="60" fill="#fff" font-family="JetBrains Mono" font-size="10" text-anchor="middle">Cron: rate(1 min)</text>
              </g>

              <!-- Node: DynamoDB Events -->
              <g class="arch-node" onclick="showArchInfo('dynamo-events')">
                <rect x="350" y="105" width="120" height="70" rx="10" fill="url(#grad-dynamo)" stroke="#38bdf8" stroke-width="1.5"/>
                <text x="410" y="134" fill="#fff" font-family="Kanit" font-size="12" font-weight="600" text-anchor="middle">DYNAMODB</text>
                <text x="410" y="152" fill="#7fd1ff" font-family="Kanit" font-size="11" text-anchor="middle">Tabla de Eventos</text>
                <text x="410" y="166" fill="rgba(255,255,255,0.5)" font-family="JetBrains Mono" font-size="9" text-anchor="middle">TTL 90 días</text>
              </g>

              <!-- Node: DynamoDB Outbox -->
              <g class="arch-node" onclick="showArchInfo('dynamo-outbox')">
                <rect x="350" y="225" width="120" height="70" rx="10" fill="url(#grad-dynamo)" stroke="#38bdf8" stroke-width="1.5"/>
                <text x="410" y="254" fill="#fff" font-family="Kanit" font-size="12" font-weight="600" text-anchor="middle">DYNAMODB</text>
                <text x="410" y="272" fill="#7fd1ff" font-family="Kanit" font-size="11" text-anchor="middle">Tabla Outbox</text>
                <text x="410" y="286" fill="rgba(255,255,255,0.5)" font-family="JetBrains Mono" font-size="9" text-anchor="middle">PENDING / PUBLISHED</text>
              </g>

              <!-- Node: SQS Alertas -->
              <g class="arch-node" onclick="showArchInfo('sqs')">
                <rect x="530" y="165" width="120" height="75" rx="10" fill="url(#grad-sqs)" stroke="#f43f5e" stroke-width="1.5"/>
                <text x="590" y="196" fill="#f43f5e" font-family="Kanit" font-size="13" font-weight="700" text-anchor="middle">SQS ALERTS</text>
                <text x="590" y="214" fill="#fff" font-family="Kanit" font-size="11" text-anchor="middle">LOW_BATTERY</text>
                <text x="590" y="228" fill="rgba(255,255,255,0.5)" font-family="JetBrains Mono" font-size="9" text-anchor="middle">Deduplicada</text>
              </g>

              <!-- Node: CloudTrail & KMS -->
              <g class="arch-node" onclick="showArchInfo('security')">
                <rect x="350" y="340" width="300" height="60" rx="10" fill="#131b2e" stroke="var(--border)" stroke-width="1.5"/>
                <text x="500" y="365" fill="#ffb547" font-family="Kanit" font-size="13" font-weight="600" text-anchor="middle">SEGURIDAD & AUDITORÍA</text>
                <text x="500" y="385" fill="rgba(255,255,255,0.7)" font-family="JetBrains Mono" font-size="11" text-anchor="middle">AWS KMS CMK + CloudTrail Multi-Region</text>
              </g>
            </svg>
          </div>

          <!-- DETAILS CARD -->
          <div class="arch-details" id="arch-details-box">
            <span class="arch-details-badge" id="arch-badge">Componente</span>
            <h3 style="font: 700 22px var(--font-display); margin: 0; color: var(--ink);" id="arch-title">
              Selecciona un componente del diagrama
            </h3>
            <p style="color: var(--ink2); font-size: 15px; margin: 0;" id="arch-desc">
              Haz clic en cualquiera de las cajas del diagrama arquitectónico para visualizar su implementación en TypeScript, ubicación exacta en el repositorio y cobertura de pruebas asociada.
            </p>
            <div id="arch-links" style="display: flex; flex-direction: column; gap: 8px; margin-top: auto;">
              <!-- Dynamic links injected via JS -->
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- TAB 3: HISTORIAS DE USUARIO               -->
    <!-- ========================================== -->
    <section id="tab-historias" class="tab-panel">
      <div class="sec-card">
        <h2 class="sec-h2"><span>📋</span> Historias de Usuario & Criterios de Aceptación</h2>
        <p class="sec-lead">
          Backlog formal de las 12 historias de usuario (`Must Have`) generadas en la fase de Incepción (etapa 2.4). Cada historia incluye sus criterios de aceptación BDD (Given / When / Then) y la suite de pruebas que valida su conformidad objetiva.
        </p>

        <!-- Filter Bar -->
        <div class="filter-bar">
          <input type="text" class="search-input" id="us-search" placeholder="Buscar por ID (ej. US3.1), palabra clave o criterio..." oninput="filterUserStories()">
          <div class="chip-group">
            <button class="chip active" onclick="filterSlice('all', this)">Todas</button>
            <button class="chip" onclick="filterSlice('Aceptar telemetría', this)">Aceptar</button>
            <button class="chip" onclick="filterSlice('Persistir telemetría', this)">Persistir</button>
            <button class="chip" onclick="filterSlice('Alertar batería baja', this)">Alertar</button>
            <button class="chip" onclick="filterSlice('Recuperar salidas', this)">Recuperar</button>
            <button class="chip" onclick="filterSlice('Medir y observar', this)">Medir/SLO</button>
            <button class="chip" onclick="filterSlice('Desplegar y asegurar', this)">Desplegar/CI</button>
          </div>
        </div>

        <!-- US Cards Container -->
        <div class="us-grid" id="us-container">
          <!-- Dynamically populated via JS -->
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- TAB 4: TESTS & TRAZABILIDAD (159 TESTS)   -->
    <!-- ========================================== -->
    <section id="tab-matriz" class="tab-panel">
      <div class="sec-card">
        <h2 class="sec-h2"><span>🧪</span> Tests Automatizados & Matriz de Trazabilidad</h2>
        <p class="sec-lead">
          Inspecciona tanto la <strong>Matriz de Requisitos Funcionales del Taller</strong> (los 13 requisitos de la guía) como el <strong>Inventario Exhaustivo de los 159 Tests Automatizados</strong> distribuidos en 15 suites de Vitest.
        </p>

        <!-- VIEW TOGGLE BUTTONS -->
        <div class="view-toggle-bar">
          <button class="view-toggle-btn active" id="btn-view-matrix" onclick="switchTestView('matrix')">
            📑 Matriz de Requisitos Ronnie (13 Requisitos)
          </button>
          <button class="view-toggle-btn" id="btn-view-suites" onclick="switchTestView('suites')">
            🔬 Inventario Completo de 159 Tests (15 Suites)
          </button>
        </div>

        <!-- VIEW A: REQUIREMENTS MATRIX (13 REQUIREMENTS) -->
        <div id="view-matrix-container">
          <div class="filter-bar">
            <input type="text" class="search-input" id="matrix-search" placeholder="Filtrar por Requisito (ej. FR5.1), archivo de test o descripción..." oninput="filterMatrix()">
            <div class="chip-group">
              <button class="chip active" onclick="filterMatrixType('all', this)">Todos los Tipos</button>
              <button class="chip" onclick="filterMatrixType('Caja Negra', this)">Caja Negra</button>
              <button class="chip" onclick="filterMatrixType('BVA', this)">BVA</button>
              <button class="chip" onclick="filterMatrixType('Idempotencia', this)">Idempotencia</button>
              <button class="chip" onclick="filterMatrixType('CDK', this)">CDK / Infra</button>
              <button class="chip" onclick="filterMatrixType('Nube', this)">Fase 4 (Nube)</button>
            </div>
          </div>

          <div class="matrix-table-wrap">
            <table class="matrix-table" id="matrix-table">
              <thead>
                <tr>
                  <th style="width: 110px;">ID Requisito</th>
                  <th style="min-width: 220px;">Descripción</th>
                  <th style="min-width: 240px;">Archivo de Test (Suite)</th>
                  <th style="min-width: 240px;">Caso de Prueba Validado</th>
                  <th style="min-width: 140px;">Tipo</th>
                  <th style="width: 120px;">Estado</th>
                </tr>
              </thead>
              <tbody id="matrix-tbody">
                <!-- Dynamically populated via JS -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- VIEW B: FULL 159 TESTS INVENTORY (15 SUITES) -->
        <div id="view-suites-container" style="display:none;">
          <div class="filter-bar">
            <input type="text" class="search-input" id="suite-search" placeholder="Buscar por nombre de archivo, suite o caso de prueba..." oninput="filterSuites()">
            <div style="font: 600 13px var(--font-mono); color: var(--accent);">
              TOTAL: 15 SUITES / 159 TESTS EN VERDE
            </div>
          </div>

          <div class="suites-grid" id="suites-container">
            <!-- Dynamically populated via JS -->
          </div>
        </div>

      </div>
    </section>

    <!-- ========================================== -->
    <!-- TAB 5: BITÁCORA DÍA A DÍA (DÍAS 1-10)      -->
    <!-- ========================================== -->
    <section id="tab-bitacora" class="tab-panel">
      <div class="sec-card">
        <h2 class="sec-h2"><span>📅</span> Bitácora Cronológica Día a Día (Días 1 al 10)</h2>
        <p class="sec-lead">
          Registro histórico de las sesiones del taller según el formato obligatorio de 3 viñetas exigido por Ronnie: <strong>(1) Qué etapas pasaste</strong>, <strong>(2) Qué cambiaste o rechazaste</strong>, y <strong>(3) Qué no entendiste y cómo se resolvió</strong>.
        </p>

        <div class="timeline" id="timeline-container">
          <!-- Dynamically populated via JS -->
        </div>
      </div>
    </section>

    <!-- ========================================== -->
    <!-- TAB 6: GOBERNANZA AWS & SEGURIDAD          -->
    <!-- ========================================== -->
    <section id="tab-gobernanza" class="tab-panel">
      <div class="sec-card">
        <h2 class="sec-h2"><span>🔐</span> Gobernanza en AWS & Seguridad Corporativa</h2>
        <p class="sec-lead">
          Directrices de contención, autenticación federada y políticas de no-interferencia aplicadas en la cuenta compartida de CarConnect durante la fase de Operación.
        </p>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;">
          <!-- Card 1 -->
          <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <div style="font: 600 12px var(--font-mono); color: var(--accent); margin-bottom: 8px;">COORDINADAS OFICIALES</div>
            <h3 style="font: 700 20px var(--font-display); color: var(--ink); margin: 0 0 12px;">Cuenta Compartida UAT</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 14.5px; color: var(--ink2); line-height: 1.6;">
              <li><strong>Cuenta AWS:</strong> <code class="code-pill">745708001009</code> (Aislamiento UAT)</li>
              <li><strong>Región Estricta:</strong> <code class="code-pill">sa-east-1</code> (São Paulo)</li>
              <li><strong>Perfil AWS SSO:</strong> <code class="code-pill">745708001009_AdministratorAccess</code></li>
              <li><strong>Namespace Obligatorio:</strong> <code class="code-pill">Telemetry-*</code></li>
            </ul>
          </div>

          <!-- Card 2 -->
          <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <div style="font: 600 12px var(--font-mono); color: var(--accent-rose); margin-bottom: 8px;">GUARDARRAÍLES DE SEGURIDAD</div>
            <h3 style="font: 700 20px var(--font-display); color: var(--ink); margin: 0 0 12px;">Blindaje Contra Daños</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 14.5px; color: var(--ink2); line-height: 1.6;">
              <li><strong>Cero Comandos Destructivos:</strong> Prohibido <code class="code-pill">cdk destroy</code> global o <code class="code-pill">delete-stack</code> sin prefijo.</li>
              <li><strong>Aislamiento de Producción:</strong> La cuenta alberga cargas productivas en otras regiones (us-east-1); toda llamada CDK debe fijar explícitamente <code class="code-pill">--region sa-east-1</code>.</li>
              <li><strong>Mínimo Privilegio IAM:</strong> Roles específicos sin permisos para crear colas de entrada o acceder a otros namespaces.</li>
            </ul>
          </div>

          <!-- Card 3 -->
          <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 16px; padding: 22px;">
            <div style="font: 600 12px var(--font-mono); color: var(--accent-gold); margin-bottom: 8px;">DECISIÓN MAESTRA DE QA</div>
            <h3 style="font: 700 20px var(--font-display); color: var(--ink); margin: 0 0 12px;">S3 Object Lock COMPLIANCE 90 Días</h3>
            <p style="margin: 0; font-size: 14.5px; color: var(--ink2); line-height: 1.6;">
              Codex propuso crear un bucket S3 con Object Lock COMPLIANCE de 90 días y clave KMS para CloudTrail. En este modo, <strong>ni siquiera la cuenta root puede borrar el bucket durante 3 meses</strong>. Frenamos el despliegue para consultar con Ronnie, quien validó tajantemente la decisión:
              <br><br>
              <em style="color: var(--accent-gold); font-weight: 500;">"dejale ahí, con eso estamos, operación le vemos luego xq eso es productivo, genial!"</em>
            </p>
          </div>
        </div>

        <div style="margin-top: 24px; background: rgba(56, 189, 248, 0.05); border: 1px solid var(--accent-blue); border-radius: 16px; padding: 22px;">
          <h3 style="font: 700 18px var(--font-display); color: var(--accent-blue); margin: 0 0 10px;">
            Arquitectura de Despliegue CI/CD: OIDC vs SNS
          </h3>
          <p style="margin: 0 0 12px; font-size: 14.5px; color: var(--ink2);">
            En la etapa 3.7 y 4.2 se establecieron dos conceptos fundamentales para la entrega continua segura:
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            <div style="background: var(--panel); padding: 14px 18px; border-radius: 10px;">
              <strong style="color:#fff;">OIDC (GitHub Actions):</strong>
              <p style="margin:4px 0 0; font-size:13.5px; color:var(--ink2);">
                Permite a los runners de GitHub asumir roles IAM temporales en AWS mediante intercambio de tokens criptográficos JWT, eliminando la necesidad de guardar contraseñas fijas o AWS_SECRET_ACCESS_KEY en GitHub Secrets.
              </p>
            </div>
            <div style="background: var(--panel); padding: 14px 18px; border-radius: 10px;">
              <strong style="color:#fff;">SNS (Canal de Alarmas):</strong>
              <p style="margin:4px 0 0; font-size:13.5px; color:var(--ink2);">
                Tópico de difusión al que CloudWatch envía notificaciones ante anomalías de tasa de fallos (&gt;=1%). Al confirmarse con Ronnie <em>"sin canal"</em>, se configuró como opcional para no bloquear la síntesis de CDK.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

  </div>

  <!-- EMBEDDED DATA & JAVASCRIPT -->
  <script>
    const userStoriesData = {json.dumps(user_stories, ensure_ascii=False)};
    const matrixData = {json.dumps(matrix_data, ensure_ascii=False)};
    const suitesData = {json.dumps(test_suites_data, ensure_ascii=False)};
    const daysData = {json.dumps(days_data, ensure_ascii=False)};

    // Tab Switching
    function switchTab(tabId, btn) {{
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      
      const target = document.getElementById('tab-' + tabId);
      if (target) {{
        target.classList.add('active');
      }}
      if (btn) {{
        btn.classList.add('active');
      }}
      window.scrollTo({{ top: 0, behavior: 'smooth' }});
    }}

    // View Switcher (Matrix vs Suites in Tab 4)
    function switchTestView(view) {{
      const btnMatrix = document.getElementById('btn-view-matrix');
      const btnSuites = document.getElementById('btn-view-suites');
      const viewMatrix = document.getElementById('view-matrix-container');
      const viewSuites = document.getElementById('view-suites-container');

      if (view === 'matrix') {{
        btnMatrix.classList.add('active');
        btnSuites.classList.remove('active');
        viewMatrix.style.display = 'block';
        viewSuites.style.display = 'none';
      }} else {{
        btnSuites.classList.add('active');
        btnMatrix.classList.remove('active');
        viewMatrix.style.display = 'none';
        viewSuites.style.display = 'block';
      }}
    }}

    // Clipboard Copy
    function copyText(text) {{
      navigator.clipboard.writeText(text).then(() => {{
        const toast = document.getElementById('toast');
        toast.textContent = 'Copiado: ' + text;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2200);
      }});
    }}

    // Architecture Info Box
    const archDetailsMap = {{
      'client': {{
        badge: 'Emisor IoT',
        title: 'Dispositivo IoT Vehicular',
        desc: 'Sensores a bordo del automóvil que recolectan nivel de batería (0-100%), temperatura del motor (-50 a 150°C) y velocidad (0 a 300 km/h). Emite payloads JSON con timestamp en formato UTC.',
        links: [
          {{ label: 'Modelo de Datos: src/telemetry/model.ts', path: 'src/telemetry/model.ts' }},
          {{ label: 'Tests de Validación BVA: src/telemetry/model.test.ts', path: 'src/telemetry/model.test.ts' }}
        ]
      }},
      'apigw': {{
        badge: 'Frontera HTTP',
        title: 'API Gateway REST',
        desc: 'Punto de entrada HTTPS con clave de API y Usage Plan. Aplica validación sintáctica de esquemas y rate limiting con código 429 Too Many Requests.',
        links: [
          {{ label: 'Definición CDK: infra/telemetry-stack.ts', path: 'infra/telemetry-stack.ts' }},
          {{ label: 'Tests Aserciones CDK: infra/telemetry-stack.test.ts', path: 'infra/telemetry-stack.test.ts' }}
        ]
      }},
      'lambda': {{
        badge: 'Núcleo de Cómputo',
        title: 'Lambda Procesadora Única (TelemetryService)',
        desc: 'El corazón del Walking Skeleton. Atiende las peticiones POST de la API Gateway, valida con BVA, ejecuta la transacción atómica en DynamoDB y también atiende la invocación periódica de EventBridge para despachar alertas atascadas.',
        links: [
          {{ label: 'Handler Principal: src/telemetry/handlers.ts', path: 'src/telemetry/handlers.ts' }},
          {{ label: 'Lógica de Dominio: src/telemetry/service.ts', path: 'src/telemetry/service.ts' }},
          {{ label: 'Adaptadores AWS: src/telemetry/adapters.ts', path: 'src/telemetry/adapters.ts' }},
          {{ label: 'Integración E2E: tests/integration/telemetry-flow.test.ts', path: 'tests/integration/telemetry-flow.test.ts' }}
        ]
      }},
      'eventbridge': {{
        badge: 'Resiliencia / Sweeper',
        title: 'Regla Programada EventBridge',
        desc: 'Invoca a la Lambda cada 1 minuto (rate(1 minute)) para recuperar alertas en estado PENDING que no pudieron publicarse a SQS por microcortes, garantizando at-least-once sin colas de entrada.',
        links: [
          {{ label: 'Regla CDK: infra/telemetry-stack.ts', path: 'infra/telemetry-stack.ts' }},
          {{ label: 'Test de Barrido: tests/integration/telemetry-flow.test.ts', path: 'tests/integration/telemetry-flow.test.ts' }}
        ]
      }},
      'dynamo-events': {{
        badge: 'Almacenamiento Canónico',
        title: 'Tabla DynamoDB: TelemetryEvents',
        desc: 'Persiste los eventos de telemetría validados de forma inmutable. Posee TTL nativo habilitado a 90 días exactos (expiresAt = acceptedAt + 7,776,000s). Clave primaria eventId.',
        links: [
          {{ label: 'Adaptador DynamoDB: src/telemetry/adapters.ts', path: 'src/telemetry/adapters.ts' }},
          {{ label: 'Tests de Retención: src/telemetry/adapters.test.ts', path: 'src/telemetry/adapters.test.ts' }}
        ]
      }},
      'dynamo-outbox': {{
        badge: 'Patrón Transaccional',
        title: 'Tabla DynamoDB: TelemetryOutbox',
        desc: 'Mantiene las alertas pendientes o confirmadas. Se escribe en la misma llamada TransactWriteItems que el evento. Controla concurrencia con claimToken y leaseUntil.',
        links: [
          {{ label: 'Outbox Model: src/telemetry/model.ts', path: 'src/telemetry/model.ts' }},
          {{ label: 'Pruebas Causalidad Transaccional: src/telemetry/adapters.test.ts', path: 'src/telemetry/adapters.test.ts' }}
        ]
      }},
      'sqs': {{
        badge: 'Notificación Externa',
        title: 'Cola SQS: VehicleAlertsQueue',
        desc: 'Cola destino cifrada con KMS donde se publican las alertas cuando la batería baja de 20%. Utiliza deduplicación inyectiva determinista con formato LOW_BATTERY:{{eventId}}.',
        links: [
          {{ label: 'Configuración CDK: infra/telemetry-stack.ts', path: 'infra/telemetry-stack.ts' }},
          {{ label: 'Test Deduplicación SQS: tests/integration/telemetry-flow.test.ts', path: 'tests/integration/telemetry-flow.test.ts' }}
        ]
      }},
      'security': {{
        badge: 'Gobernanza & Auditoría',
        title: 'Seguridad, KMS & CloudTrail',
        desc: 'Claves KMS administradas por el cliente (CMK) para cifrado en reposo de DynamoDB y SQS. Stack de auditoría independiente TelemetryAuditStack con CloudTrail multi-región.',
        links: [
          {{ label: 'Stack de Auditoría: infra/telemetry-audit-stack.ts', path: 'infra/telemetry-audit-stack.ts' }},
          {{ label: 'Aserciones de Seguridad: infra/telemetry-stack-delivery-controls.test.ts', path: 'infra/telemetry-stack-delivery-controls.test.ts' }}
        ]
      }}
    }};

    function showArchInfo(key) {{
      const data = archDetailsMap[key];
      if (!data) return;
      document.getElementById('arch-badge').textContent = data.badge;
      document.getElementById('arch-title').textContent = data.title;
      document.getElementById('arch-desc').textContent = data.desc;
      
      const linkBox = document.getElementById('arch-links');
      linkBox.innerHTML = '';
      data.links.forEach(l => {{
        const btn = document.createElement('div');
        btn.className = 'file-tag';
        btn.innerHTML = '📄 ' + l.label + ' <span style="opacity:0.6; font-size:10px;">📋 Copiar</span>';
        btn.onclick = () => copyText(l.path);
        linkBox.appendChild(btn);
      }});
    }}

    // Render User Stories
    let currentSliceFilter = 'all';
    function renderUserStories(stories) {{
      const container = document.getElementById('us-container');
      container.innerHTML = '';
      
      stories.forEach(us => {{
        const card = document.createElement('div');
        card.className = 'us-card';
        card.id = 'card-' + us.id;
        
        let reqsBadges = us.requirements.map(r => '<span class="code-pill">' + r + '</span>').join(' ');
        
        let acRows = us.criteria.map(c => `
          <tr>
            <td style="width: 85px;"><span class="ac-badge">${{c.ac}}</span></td>
            <td>${{c.desc}}</td>
            <td style="min-width: 200px;">
              <strong style="color:#fff;">${{c.test_case}}</strong>
              <div class="file-tag" onclick="copyText('${{c.test_file}}')">
                📄 ${{c.test_file}}
              </div>
            </td>
          </tr>
        `).join('');

        card.innerHTML = `
          <div class="us-header" onclick="toggleUS('${{us.id}}')">
            <div class="us-header-left">
              <span class="us-id">${{us.id}}</span>
              <div>
                <h3 class="us-title">${{us.title}}</h3>
                <div style="font-size: 13px; color: var(--ink2); margin-top: 2px;">${{us.summary}}</div>
              </div>
            </div>
            <div class="us-meta">
              <span class="badge-slice">${{us.slice}}</span>
              <span class="badge-persona">${{us.persona}}</span>
              <span class="us-chevron">▼</span>
            </div>
          </div>
          <div class="us-body">
            <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:13px; color:var(--ink2);">
              <div><strong>Prioridad:</strong> <span style="color:var(--accent);">${{us.priority}}</span></div>
              <div><strong>Depende de:</strong> ${{us.depends_on}}</div>
              <div><strong>Requisitos Asociados:</strong> ${{reqsBadges}}</div>
            </div>
            <table class="ac-table">
              <thead>
                <tr>
                  <th>Criterio</th>
                  <th>Definición BDD (Given / When / Then)</th>
                  <th>Caso de Prueba Automatizado (Vitest)</th>
                </tr>
              </thead>
              <tbody>
                ${{acRows}}
              </tbody>
            </table>
          </div>
        `;
        container.appendChild(card);
      }});
    }}

    function toggleUS(id) {{
      const card = document.getElementById('card-' + id);
      card.classList.toggle('open');
    }}

    function filterSlice(slice, btn) {{
      currentSliceFilter = slice;
      if (btn) {{
        document.querySelectorAll('.chip-group .chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      }}
      filterUserStories();
    }}

    function filterUserStories() {{
      const query = document.getElementById('us-search').value.toLowerCase();
      const filtered = userStoriesData.filter(us => {{
        const matchesSlice = (currentSliceFilter === 'all' || us.slice === currentSliceFilter);
        const matchesQuery = us.id.toLowerCase().includes(query) ||
                             us.title.toLowerCase().includes(query) ||
                             us.summary.toLowerCase().includes(query) ||
                             us.criteria.some(c => c.desc.toLowerCase().includes(query) || c.test_case.toLowerCase().includes(query));
        return matchesSlice && matchesQuery;
      }});
      renderUserStories(filtered);
    }}

    // Render Matrix Table (View A)
    let currentMatrixType = 'all';
    function renderMatrix(items) {{
      const tbody = document.getElementById('matrix-tbody');
      tbody.innerHTML = '';
      
      items.forEach(row => {{
        const isGreen = row['Estado de Cobertura'].includes('100%') || row['Estado de Cobertura'].includes('Cubierto');
        const badgeClass = isGreen ? 'badge-status-green' : 'badge-status-pending';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong style="color:var(--accent); font-family:var(--font-mono);">${{row['ID Requisito']}}</strong></td>
          <td>${{row['Descripción del Requisito']}}</td>
          <td>
            <div class="file-tag" onclick="copyText('${{row['Archivo de Test (Suite)']}}')">
              📄 ${{row['Archivo de Test (Suite)']}}
            </div>
          </td>
          <td><strong style="color:#fff;">${{row['Nombre del Test (Caso de Prueba)']}}</strong><br>
              <small style="color:var(--ink2);">${{row['Comportamiento Observable Validado (NO detalle interno)']}}</small>
          </td>
          <td><span class="code-pill">${{row['Tipo de Comprobación']}}</span></td>
          <td><span class="${{badgeClass}}">${{row['Estado de Cobertura']}}</span></td>
        `;
        tbody.appendChild(tr);
      }});
    }}

    function filterMatrixType(type, btn) {{
      currentMatrixType = type;
      if (btn) {{
        btn.parentElement.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
      }}
      filterMatrix();
    }}

    function filterMatrix() {{
      const query = document.getElementById('matrix-search').value.toLowerCase();
      const filtered = matrixData.filter(row => {{
        const matchesType = (currentMatrixType === 'all' || row['Tipo de Comprobación'].toLowerCase().includes(currentMatrixType.toLowerCase()));
        const matchesQuery = row['ID Requisito'].toLowerCase().includes(query) ||
                             row['Descripción del Requisito'].toLowerCase().includes(query) ||
                             row['Archivo de Test (Suite)'].toLowerCase().includes(query) ||
                             row['Nombre del Test (Caso de Prueba)'].toLowerCase().includes(query);
        return matchesType && matchesQuery;
      }});
      renderMatrix(filtered);
    }}

    // Render 15 Suites Inventory (View B)
    function renderSuites(suites) {{
      const container = document.getElementById('suites-container');
      container.innerHTML = '';

      suites.forEach((s, idx) => {{
        const card = document.createElement('div');
        card.className = 'suite-card';
        card.id = 'suite-card-' + idx;

        let casesList = s.cases.map(c => `
          <li style="margin-bottom:6px; color:var(--ink2); font-size:13.5px;">
            <span style="color:var(--accent); margin-right:6px;">✓</span> ${{c}}
          </li>
        `).join('');

        card.innerHTML = `
          <div class="suite-header" onclick="toggleSuite(${{idx}})">
            <div class="suite-title-row">
              <span class="suite-count-badge">${{s.count}} Tests</span>
              <div>
                <h4 style="margin:0; font:600 17px var(--font-display); color:#fff;">${{s.title}}</h4>
                <div class="file-tag" onclick="event.stopPropagation(); copyText('${{s.file}}')">
                  📄 ${{s.file}}
                </div>
              </div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <span class="code-pill">${{s.type}}</span>
              <span class="badge-status-green">${{s.count}}/${{s.count}} Verde</span>
              <span class="suite-chevron">▼</span>
            </div>
          </div>
          <div class="suite-body">
            <div style="font-size:14px; color:var(--ink2); background:rgba(255,255,255,0.03); padding:10px 14px; border-radius:8px; border-left:3px solid var(--accent);">
              <strong>Objetivo y Comportamiento Validado:</strong> ${{s.summary}}
            </div>
            <div style="margin-top:6px;">
              <strong style="font-size:12px; font-family:var(--font-mono); text-transform:uppercase; color:var(--accent-gold);">
                Aserciones y Casos Clave Ejecutados:
              </strong>
              <ul style="margin:8px 0 0; padding-left:18px; list-style:none;">
                ${{casesList}}
              </ul>
            </div>
          </div>
        `;
        container.appendChild(card);
      }});
    }}

    function toggleSuite(idx) {{
      const card = document.getElementById('suite-card-' + idx);
      card.classList.toggle('open');
    }}

    function filterSuites() {{
      const query = document.getElementById('suite-search').value.toLowerCase();
      const filtered = suitesData.filter(s => {{
        return s.file.toLowerCase().includes(query) ||
               s.title.toLowerCase().includes(query) ||
               s.summary.toLowerCase().includes(query) ||
               s.cases.some(c => c.toLowerCase().includes(query));
      }});
      renderSuites(filtered);
    }}

    // Render Timeline
    function renderTimeline(days) {{
      const container = document.getElementById('timeline-container');
      container.innerHTML = '';
      
      days.forEach(d => {{
        const isDay10 = (d.day === 10);
        const item = document.createElement('div');
        item.className = 'timeline-item' + (isDay10 ? ' highlight' : '');
        
        item.innerHTML = `
          <div class="timeline-card">
            <div class="timeline-day">
              <span>Día ${{d.day}} — ${{d.title}}</span>
              <span class="timeline-badge">${{d.highlight}}</span>
            </div>
            
            <div class="timeline-section-title">1. Qué etapas pasaste</div>
            <p class="timeline-text">${{d.stages}}</p>
            
            <div class="timeline-section-title" style="color:var(--accent);">2. Qué cambiaste o rechazaste</div>
            <p class="timeline-text" style="color:#fff;">${{d.changes}}</p>
            
            <div class="timeline-section-title" style="color:var(--accent-blue);">3. Qué no entendiste y cómo se resolvió</div>
            <p class="timeline-text">${{d.understand}}</p>
          </div>
        `;
        container.appendChild(item);
      }});
    }}

    // Init
    document.addEventListener('DOMContentLoaded', () => {{
      renderUserStories(userStoriesData);
      renderMatrix(matrixData);
      renderSuites(suitesData);
      renderTimeline(daysData);
      showArchInfo('lambda');
    }});
  </script>
</body>
</html>
"""

with open('Induccion_Telemetria_AIDLC.html', 'w', encoding='utf-8') as f:
    f.write(html_template)

print("Induccion_Telemetria_AIDLC.html updated with 159 tests inventory successfully!")
