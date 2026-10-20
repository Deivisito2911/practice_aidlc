# GatherLeads (GL) — Manual y Documentación Técnica Exhaustiva

**CarConnect · GatherLeads Docs v1.0**  
*Actualizado: Septiembre 2026*

---

## Tabla de Contenidos

1. [Módulo General: Introducción y Arquitectura de GatherLeads](#1-módulo-general-introducción-y-arquitectura-de-gatherleads)
   - 1.1 ¿Qué es GatherLeads?
   - 1.2 Objetivo Principal y Problema que Resuelve
   - 1.3 Posición en el Funnel Comercial
   - 1.4 Cobertura de Canales
   - 1.5 Modelo de Roles y Permisos
   - 1.6 Propuesta de Valor y Diferenciadores
2. [Módulo 01: Integraciones & API — Webhooks](#2-módulo-01-integraciones--api--webhooks)
   - 2.1 Descripción General y Arquitectura de Red
   - 2.2 Flujo de Datos y Versionado (v1 vs v2)
   - 2.3 Acceso y Registro de Endpoints
   - 2.4 Catálogo de Recursos y Eventos Suscribibles
   - 2.5 Estructura Técnica del Payload (Raíz, Changes y Metadata)
   - 2.6 Casos Reales y Ejemplos de Payloads JSON
   - 2.7 Seguridad, Secret Key y Autenticación HMAC
   - 2.8 Buenas Prácticas de Consumo e Idempotencia
   - 2.9 Códigos de Respuesta HTTP y Troubleshooting
   - 2.10 Pipelines y Etapas (Contact Center vs Ventas)
3. [Módulo 02: Administración — Gestión de Usuarios y Accesos](#3-módulo-02-administración--gestión-de-usuarios-y-accesos)
   - 3.1 Introducción y Objetivos de Seguridad
   - 3.2 Acceso al Panel de Administración de Compañía
   - 3.3 Creación de Usuarios y Campos Obligatorios
   - 3.4 Matriz de Roles y Reglas de Asignación de Agencias
   - 3.5 Edición, Desactivación y Auditoría de Cuentas
4. [Módulo 03: Configuración — Propiedades y Catálogos](#4-módulo-03-configuración--propiedades-y-catálogos)
   - 4.1 Arquitectura del Modelo de Datos de Negocio
   - 4.2 Propiedades de Sistema (12 Campos Base Inmutables)
   - 4.3 Paquetes Modulares Activables e Irreversibilidad
   - 4.4 Propiedades Personalizadas (Custom) e Inmutabilidad
   - 4.5 Configuración de Identidad Principal y Obligatoriedad
   - 4.6 Catálogo de Agencia (IDs Internos y Traducción Externa)
   - 4.7 Catálogo de Producto (Modelos, Versiones y Segmentación)
5. [Módulo 04: Integraciones — Conexión con Output y CRM](#5-módulo-04-integraciones--conexión-con-output-y-crm)
   - 5.1 Opciones de Salida: Nativo vs Puente
   - 5.2 Integración Nativa con HubSpot (Token, Mapeo y Sincronización)
   - 5.3 GatherSync CRM Bridge (Middleware para CRMs Externos)
   - 5.4 Mapeo de Pipelines, Etapas y Diccionario de Propiedades
   - 5.5 URL de Actualización de Leads y Autenticación Bearer
6. [Módulo 05: Configuración — Políticas de Privacidad](#6-módulo-05-configuración--políticas-de-privacidad)
   - 6.1 Marco Legal y Cumplimiento de Protección de Datos
   - 6.2 Comportamiento de Consentimiento por Canal
   - 6.3 Proceso de Configuración en 5 Pasos
   - 6.4 Motor de Purga Automática (1 a 90 Días) y Excepciones
   - 6.5 Automatización de Correos de Consentimiento y Variables
7. [Módulo 06: Canales — Canal Digital](#7-módulo-06-canales--canal-digital)
   - 7.1 Fuentes del Canal Digital
   - 7.2 Integración con Meta Ads (Facebook e Instagram)
   - 7.3 Enrutamiento Multi-Licencia y Multi-Pipeline en Meta
   - 7.4 Integración con TikTok Ads e Instant Forms
   - 7.5 Fuente Web: Orígenes, Endpoints e Inmutabilidad
   - 7.6 Reglas de Duplicidad del Canal Digital
8. [Módulo 07: Canales — Tráfico y Showroom Físico](#8-módulo-07-canales--tráfico-y-showroom-físico)
   - 8.1 Objetivos de la Operación en Punto de Venta
   - 8.2 Distinción Conceptual: Tráfico vs Visita
   - 8.3 Operación Diaria del Anfitrión y Panel de Citas
   - 8.4 Flujo de Lead con Cita Previa vs Lead Sin Cita (Walk-in)
   - 8.5 Clasificación de Llegada: Adelantado, Atrasado y En Gestión
   - 8.6 Reglas de Duplicidad en Showroom
9. [Módulo 08: Canales — Gestión Externa (Campo y Ferias)](#9-módulo-08-canales--gestión-externa-campo-y-ferias)
   - 9.1 Estructura del Canal: Fuentes y Orígenes
   - 9.2 Horarios de Vigencia y Margen de Cierre Post-Gestión
   - 9.3 Ciclo de Vida: Estados de una Gestión Externa
   - 9.4 Experiencia del Asesor Comercial
   - 9.5 Aplicación Móvil Offline y Advertencias Críticas de Datos
   - 9.6 Reglas de Duplicidad en Gestión Externa
10. [Módulo 09: Canales — Programa de Referidos](#10-módulo-09-canales--programa-de-referidos)
    - 10.1 Concepto y Actores: Afiliado vs Referido
    - 10.2 Términos y Condiciones y Catálogo de Beneficios
    - 10.3 Creación y Administración de Códigos de Afiliado
    - 10.4 Ciclo de Vida y Congelamiento de Datos de Códigos
    - 10.5 Flujo Completo del Lead Referido y Activación de Recompensa
    - 10.6 Reglas de Duplicidad Intra e Inter-Canal
11. [Módulo 10: Analítica — BI Captación](#11-módulo-10-analítica--bi-captación)
    - 11.1 Reemplazo Arquitectónico del Motor Antiguo
    - 11.2 Funcionamiento en Tiempo Real
    - 11.3 El Filtro Global Multidimensional
    - 11.4 Pestaña Overview (6 Metric Cards y Gráficos)
    - 11.5 Pestaña Calidad de Captación (Inválido vs Faltante, Sunburst y Reproceso)
    - 11.6 Pestaña Tendencias (Métricas YoY y Heatmap de Estacionalidad)
    - 11.7 Pestaña Leads Entregados (Errores 4xx, 5xx y Antigüedad de Cola)
    - 11.8 Preguntas Frecuentes de Soporte
12. [Módulo 11: Analítica — Funnel de Conversión](#12-módulo-11-analítica--funnel-de-conversión)
    - 12.1 Justificación Comercial frente a Hojas de Cálculo
    - 12.2 Estructura: Funnel Builder vs Funnel Viewer
    - 12.3 Wizard del Builder: Fases, Etapas, Métricas de Entrada y Filtros
    - 12.4 Propiedad y Gobernanza: Privado vs Compartido
    - 12.5 Funnel Viewer: KPIs, Barras Proporcionales y Segmentación
    - 12.6 Diagnóstico de Anomalías: Lectura del Chip `> 100% (REVISAR)`
    - 12.7 Argumentario de Venta y Guion de Demostración
13. [Módulo 12: Analítica — Rendimiento (CPL Declarado vs Real)](#13-módulo-12-analítica--rendimiento-cpl-declarado-vs-real)
    - 13.1 Propósito y Cálculo del Costo por Lead
    - 13.2 Configuración del Período en 3 Pasos y Control de Solapamiento
    - 13.3 Presupuesto Declarado y Distribución Jerárquica
    - 13.4 Registro del Gasto Real e Integración con Captación
    - 13.5 Regla Estadística: Consolidado Ponderado
    - 13.6 Estados del Período: Programado, Vigente y Vencido
14. [Glosario Maestro de Términos de GatherLeads](#14-glosario-maestro-de-términos-de-gatherleads)

---

## 1. Módulo General: Introducción y Arquitectura de GatherLeads

### 1.1 ¿Qué es GatherLeads?
GatherLeads es un sistema **B2B comercializado bajo la modalidad SaaS (Software as a Service)** enfocado en la gestión centralizada y unificada de prospectos de venta (leads). Diseñado inicialmente para resolver las necesidades complejas del **sector automotriz** (concesionarios y distribuidores), cuenta con la flexibilidad técnica para ser implementado en cualquier sector de alto volumen comercial, como el inmobiliario o el financiero.

La plataforma opera bajo un modelo de **licencias independientes**. Cada licencia representa una persona jurídica, unidad de negocio, marca vehicular o línea de productos aislada (por ejemplo, `iEGaTL-AU-MA`). Todos los usuarios, canales, catálogos, configuraciones de duplicidad, políticas y pipelines pertenecen a una licencia específica.

### 1.2 Objetivo Principal y Problema que Resuelve
En la operación tradicional de marketing y ventas, los prospectos provienen de orígenes dispersos: formularios en redes sociales, pautas publicitarias, landing pages, mensajería instantánea, visitas a salas de exhibición, eventos en centros comerciales y recomendaciones personales. 

Esto genera dos problemas críticos:
1. **Gestión en Silos:** Los prospectos se atienden de forma desordenada en planillas locales o canales aislados, provocando la pérdida de leads sin atención comercial oportuna.
2. **Ceguera de Retorno de Inversión (ROI):** Las empresas no pueden comparar objetivamente qué canal o campaña genera clientes rentables frente a los que solo generan prospectos basura o duplicados.

GatherLeads centraliza todos los puntos de contacto en un único motor de ingesta, aplica reglas automáticas de validación y deduplicación, y despacha los datos normalizados hacia el output del cliente, ofreciendo visibilidad 360° del rendimiento económico por fuente.

### 1.3 Posición en el Funnel Comercial
GatherLeads se sitúa estratégicamente en la **parte superior del embudo de ventas (Top of the Funnel)**:
- **Captación Multicanal (GatherLeads):** Ingesta, estandarización de campos, validación estructural, deduplicación, consentimiento de datos y entrega inmediata.
- **Seguimiento y Calificación (Nutrición / BDC):** Ejecutado en las herramientas del cliente o en servicios de Contact Center aliados (como CCT CarConnect), realizando tipificación, sondeo y agendamiento.
- **Cierre de Ventas (CRM Externo):** Gestión en plataformas como HubSpot, Salesforce o CRMs propios donde se emiten cotizaciones, se tramitan créditos y se formaliza la entrega del bien.

### 1.4 Cobertura de Canales
La plataforma cubre dos grandes familias de canales:
- **Canales Digitales:** Meta Ads (Facebook e Instagram Lead Ads), TikTok Ads (Instant Forms), Sitios Web (Formularios y Landing Pages vía API Web) y WhatsApp.
- **Canales Físicos y Presenciales:** Showroom / Tráfico (registro de visitas en concesionario), Gestión Externa (fuerza de venta en calle y ferias) y Referidos (planes de afiliación por código).

### 1.5 Modelo de Roles y Permisos
El sistema administra la seguridad y el alcance operativo a través de tres roles clave del lado del cliente:
1. **Administrador (Admin):** Acceso total a la compañía. Configura licencias, catálogos de agencias y productos, reglas de duplicidad, políticas de privacidad, integraciones con CRM, webhooks y alta de personal.
2. **Asesor Comercial:** Rol de campo. Opera exclusivamente en el módulo de *Gestión Externa* para registrar prospectos en ferias (vía web o app móvil offline). Está **restringido a una única agencia**. En el Showroom no tiene acceso operativo, aunque puede ser asignado por el anfitrión.
3. **Anfitrión:** Opera el módulo de *Tráfico / Showroom*. Se encarga de la recepción física, control de citas, registro de llegadas sin cita y asignación de prospectos a los asesores disponibles. Puede estar asignado a **múltiples agencias**.
4. **Multirol:** Un usuario puede combinar roles (por ejemplo, ser Anfitrión y Asesor en una misma sede), sumando sus privilegios.

### 1.6 Propuesta de Valor y Diferenciadores
- **Unifica:** Elimina los silos de datos centralizando canales online y offline.
- **Estandariza:** Aplica validaciones estrictas para que ningún prospecto ingrese con datos corruptos.
- **Visibiliza:** Mide el costo por lead (CPL) y el embudo comercial nativamente.
- **Integra:** Entrega leads en tiempo real con historial de trazabilidad completo.

---

## 2. Módulo 01: Integraciones & API — Webhooks

### 2.1 Descripción General y Arquitectura de Red
Los webhooks de GatherLeads permiten a servidores externos recibir notificaciones push en tiempo real ante cualquier evento comercial en la plataforma, eliminando la necesidad de realizar consultas periódicas (polling).

- **Protocolo de Transporte:** Exclusivamente `HTTP POST` sobre URLs públicas con cifrado `https://`. Endpoints insecure (`http://`) son rechazados en el registro.
- **Tiempos de Espera:** El servidor del cliente debe responder con un código HTTP `2xx` en un plazo menor a **10 segundos**.
- **Límite de Conexiones:** Cada licencia permite registrar un máximo de **5 webhooks activos**.

### 2.2 Flujo de Datos y Versionado (v1 vs v2)
El flujo del webhook viaja desde GatherLeads (Trigger) mediante un POST hacia el endpoint del cliente, esperando una confirmación `HTTP 200`.

GatherLeads soporta dos esquemas de entrega configurables por webhook (`schemaVersion`):
- **Versión 1 (v1):** Sin reintentos. Si el endpoint del cliente responde con error (4xx/5xx) o agota el tiempo de espera, el evento se descarta definitivamente.
- **Versión 2 (v2):** Implementa reintentos automáticos mediante **backoff exponencial** ante fallas transitorias de red o caídas del servidor destino.

### 2.3 Acceso y Registro de Endpoints
Para configurar un webhook:
1. Iniciar sesión como Administrador en `console.gatherleads.io/login`.
2. Seleccionar la licencia a gestionar.
3. Navegar a **Canales y Outputs → Webhook** en el menú de configuración y hacer clic en **Crear Webhook**.
4. Completar los campos requeridos:
   - **Nombre del Webhook:** Etiqueta descriptiva (ej. "Conexión a Sistema ERP").
   - **URL del Destino:** Dirección pública HTTPS (ej. `https://api.empresa.com/leads`).
   - **Secret Key:** Cadena alfanumérica utilizada para autenticar y firmar criptográficamente los paquetes de datos.

### 2.4 Catálogo de Recursos y Eventos Suscribibles
El formulario de suscripción permite seleccionar eventos por recurso:
- **Negocio (`deal`):**
  - `deal.created`: Disparado cuando un nuevo lead es registrado en la plataforma.
  - `deal.updated`: Disparado cuando cambia cualquier campo, estado, tipificación o etapa del lead.
  - `Duplicado`: Cuando el motor detecta que un lead entrante ya existe bajo las reglas activas.
  - `Fallido`: Cuando un prospecto no supera las validaciones obligatorias de datos.
- **Origen:** Creación y Actualización de fuentes y orígenes.
- **Agencia, Producto, Versión:** Creación de nuevos registros en los catálogos base.

### 2.5 Estructura Técnica del Payload

#### Campos Raíz (Presentes en todo evento)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `eventId` | string | Identificador único del evento. **Clave obligatoria de idempotencia**. |
| `timestamp` | integer | Marca de tiempo Unix en milisegundos (`new Date(timestamp)`). |
| `eventType` | string | Identificador de acción. Ejemplos: `deal.created`, `deal.updated`. |
| `resourceType` | string | Tipo de entidad afectada (generalmente `deal`). |
| `resourceId` | string | ID único del negocio/deal en GatherLeads. Permanece idéntico en todas sus actualizaciones. |
| `changes` | object | Contenedor de datos. En creaciones contiene `newValue`; en actualizaciones contiene `oldValue`, `newValue` y `updatedFields`. |
| `metadata` | object | Contexto operativo: `licenseId`, `ownerId`, `contactId`, `originId`. |

#### Campos de Negocio (`changes.newValue`)
- **Datos de Contacto:** `firstName`, `lastName`, `email`, `phone` (formato E.164, ej: `+593988999889`), `identification` (cédula o DNI).
- **Origen del Lead:** `channel` (ej: `digital`), `source` (ej: `web`), `origin` (nombre asignado al origen), `correlationId` (trazabilidad técnica).
- **Asignación Comercial:** `agency` (código de agencia), `agencyName`, `product` (código de modelo), `status` (ej: `validated`), `type` (ej: `new`).
- **Estados de Pipeline y Salida:** `isSalesPipeline` (booleano), `isIntegrated` (booleano, indica éxito de entrega al CRM), `isDataConsentProcessActive` (booleano), `lastPipelineCC` (ID del pipeline actual), `lastStageCC` (ID de la etapa actual).

### 2.6 Casos Reales y Ejemplos de Payloads JSON

#### 1. `deal.created` (Ingreso de nuevo lead)
```json
{
  "eventId": "nX8vt1az5CSmuyUG7eG9FU",
  "timestamp": 1778707706688,
  "eventType": "deal.created",
  "resourceType": "deal",
  "resourceId": "6a04ecfa18bc541094f824db",
  "changes": {
    "newValue": {
      "firstName": "TEST1",
      "lastName": "MORAN VERA",
      "email": "testtest@hotmail.com",
      "phone": "+593988999889",
      "identification": "1724821887",
      "channel": "digital",
      "source": "web",
      "origin": "Página Web",
      "product": "M_C 100",
      "agency": "001",
      "agencyName": "AMB ATAHUALPA",
      "status": "validated",
      "type": "new",
      "isSalesPipeline": true,
      "lastPipelineCC": "q46SQsc5wyFRnSCxczD6qs",
      "lastStageCC": "5VNG5NmmcDJZsRoUD6uQrk",
      "correlationId": "1d42aefe-9ef6-9c8b-7a91-4c76247247f7",
      "createdAt": 1778707706307,
      "updatedAt": 1778707706307,
      "historyCrmExecutionStatus": []
    }
  },
  "metadata": {
    "licenseId": "iEGaTL-AU-MA",
    "ownerId": "682fd26ab55499faa70873bf",
    "contactId": "6a04ecf9ebe76ead9114f978",
    "originId": "9cR8gZ7yBdp4NAdRD8EgTb"
  }
}
```

#### 2. `deal.updated` (Confirmación de integración con CRM externo)
```json
{
  "eventId": "tjFR4eSqfHWvMMpSXLXTW2",
  "timestamp": 1778707719221,
  "eventType": "deal.updated",
  "resourceId": "6a04ecfa18bc541094f824db",
  "changes": {
    "oldValue": { "status": "validated" },
    "newValue": {
      "status": "validated",
      "integrationCrm": { "crmStatusCode": 200 },
      "isIntegrated": true
    },
    "updatedFields": {
      "updatedAt": 1778707718800,
      "integrationCrm": {
        "crmStatusCode": 200,
        "crmPayload": "{\"statusCode\":200,\"data\":{\"result\":\"Lead 592697 creado correctamente.\",\"detail\":\"ok\"}}"
      },
      "isIntegrated": true
    }
  },
  "metadata": {
    "licenseId": "iEGaTL-AU-MA",
    "ownerId": "682fd26ab55499faa70873bf",
    "contactId": "6a04ecf9ebe76ead9114f978",
    "originId": "9cR8gZ7yBdp4NAdRD8EgTb"
  }
}
```

#### 3. `deal.updated` (Tipificación manual del asesor en Contact Center)
```json
{
  "eventId": "oFppL8U2W9pdwticedcL2C",
  "timestamp": 1778707889208,
  "eventType": "deal.updated",
  "resourceId": "6a04ecfa18bc541094f824db",
  "changes": {
    "oldValue": {},
    "newValue": {},
    "updatedFields": {
      "updatedAt": 1778707888768,
      "advisor": "Admincontactcenter@carconnect.com.ec",
      "cctAdvisor": "aksel cueva",
      "cctObservation": "Cliente interesado en prueba de manejo",
      "typification": "C1_GESCONAGECIT",
      "contactability": "contacted",
      "leadQualification": "AAA",
      "temperature": "warm",
      "numberOfCalls": "2",
      "appointmentTime": "10:30",
      "appointmentConfirmation": true,
      "attendance": false,
      "civilStatus": "married",
      "estimatedIncome": "lessThan1000",
      "estimatedPurchaseTime": "INMEDIATE",
      "typeOfFinancing": "credit",
      "entrancePayment": "5000",
      "carAsPaymentMethod": "true",
      "carLicense": "PCN2025",
      "bureauRating": "750",
      "bureauAcceptance": true
    }
  },
  "metadata": {
    "licenseId": "iEGaTL-AU-MA",
    "ownerId": "682fd26ab55499faa70873bf",
    "contactId": "6a04ecf9ebe76ead9114f978",
    "originId": "9cR8gZ7yBdp4NAdRD8EgTb"
  }
}
```

#### 4. `deal.updated` (Avance de etapa en pipeline)
```json
{
  "eventId": "4YKYcuNyh8QeQz1AXZyPmg",
  "timestamp": 1778708721668,
  "eventType": "deal.updated",
  "resourceId": "6a04ecfa18bc541094f824db",
  "changes": {
    "oldValue": { "lastStageCC": "5VNG5NmmcDJZsRoUD6uQrk" },
    "newValue": { "lastStageCC": "m2n2bKqnMGEAjqMVChbJrS" },
    "updatedFields": {
      "lastStageCC": "m2n2bKqnMGEAjqMVChbJrS",
      "updatedAt": 1778708721212
    }
  },
  "metadata": {
    "licenseId": "iEGaTL-AU-MA",
    "ownerId": "682fd26ab55499faa70873bf",
    "contactId": "6a04ecf9ebe76ead9114f978",
    "originId": "9cR8gZ7yBdp4NAdRD8EgTb"
  }
}
```

### 2.7 Seguridad, Secret Key y Autenticación HMAC
La Secret Key ingresada al registrar el webhook es utilizada por GatherLeads para generar una firma criptográfica en el encabezado de cada request HTTP. El servidor receptor debe calcular la firma utilizando la misma clave secreta y el cuerpo crudo de la petición para verificar que el paquete proviene legítimamente de GatherLeads.

### 2.8 Buenas Prácticas de Consumo e Idempotencia
1. **Detección de Cambios mediante `updatedFields`:** En lugar de procesar todo el objeto, el sistema receptor debe inspeccionar `changes.updatedFields`:
   - Si contiene `isIntegrated` → Notificación de despacho a CRM.
   - Si contiene `typification` → Registro de gestión por asesor.
   - Si contiene `lastStageCC` → Notificación de movimiento de etapa.
2. **Idempotencia Obligatoria:** Un evento puede reenviarse por fluctuaciones de red. El receptor debe almacenar en base de datos cada `eventId` procesado y descartar cualquier mensaje futuro con un `eventId` idéntico.
3. **Parseo de `crmPayload`:** El campo `changes.updatedFields.integrationCrm.crmPayload` es una **cadena JSON serializada** (string), por lo que se debe aplicar `JSON.parse()` antes de acceder a sus propiedades internas.

### 2.9 Códigos de Respuesta HTTP y Troubleshooting
- `200 / 204 OK`: El evento fue recibido satisfactoriamente.
- `4xx / 5xx`: Falla de recepción. Si el webhook está en v2, entrará en cola de reintentos.
- **Problema: Múltiples `deal.updated` inmediatos:** Es el comportamiento estándar de la plataforma (activación de consentimiento + integración a CRM ocurren en milisegundos tras la creación).
- **Problema: Webhook activo pero sin eventos:** Comprobar que la URL sea accesible públicamente en internet y que utilice HTTPS con certificado válido.

### 2.10 Pipelines y Etapas (Contact Center vs Ventas)
Cada licencia cuenta con dos estructuras de embudo:
1. **Pipeline de Contact Center (CCT):** Exclusivo para licencias que contraten el servicio de Contact Center de CarConnect. Etapas: `Prospección Bruta → Base Prospección → Gestión → Prospección → Cita → Cita Confirmada`.
2. **Pipeline de Ventas:** Presente en todas las cuentas de GatherLeads. Etapas: `Tráfico → Test Drive → Cotización → Reservas → Solicitudes Crédito → Solicitudes Aprobadas → Cierre → Perdido`.

---

## 3. Módulo 02: Administración — Gestión de Usuarios y Accesos

### 3.1 Introducción y Objetivos de Seguridad
El módulo de Gestión de Usuarios permite definir qué colaboradores tienen acceso a la plataforma, delimitar sus funciones según su cargo y restringir la visibilidad de prospectos a las sedes geográficas (agencias) correspondientes.

### 3.2 Acceso al Panel de Administración de Compañía
Para acceder:
1. Iniciar sesión en `console.gatherleads.io/login` con perfil Administrador.
2. Hacer clic en el avatar del usuario en la esquina superior derecha.
3. Seleccionar **Administración de Compañía**.
4. Se desplegará el panel con el listado de usuarios, correos, roles, agencias asignadas y estado (`Activo` / `Inactivo`).

### 3.3 Creación de Usuarios y Campos Obligatorios
Al presionar el botón **+ Crear Usuario**, se solicitan los siguientes datos:
- **Nombre y Apellido:** Datos personales del colaborador.
- **Email:** Correo corporativo, utilizado como identificador para el inicio de sesión.
- **CRM ID (Opcional):** Identificador del asesor en el CRM externo para mantener la correspondencia en integraciones.
- **Posición:** Título o cargo interno (ej. "Jefe de Ventas", "Asesor Senior").
- **Roles:** Selección de uno o más roles (`Administrador`, `Anfitrión`, `Asesor`).

### 3.4 Matriz de Roles y Reglas de Asignación de Agencias
- **Regla Estricta del Asesor Comercial:** Si se asigna el rol Asesor, el sistema obliga a seleccionar **una única agencia**. El asesor solo podrá ver y registrar gestiones vinculadas a esa sucursal.
- **Regla del Anfitrión:** Puede estar asignado a **múltiples agencias** simultáneamente para dar cobertura a varias salas de exhibición.
- **Asignación en Showroom:** Un Asesor no puede manipular la agenda ni registrar visitas en el módulo Tráfico; únicamente aparece disponible para ser elegido por el Anfitrión.

### 3.5 Edición, Desactivación y Auditoría de Cuentas
Las cuentas de usuarios que abandonan la organización no deben eliminarse físicamente para no romper la trazabilidad histórica de los leads que atendieron. En su lugar, el Administrador edita el perfil y conmuta su estado a **Inactivo**, lo cual revoca inmediatamente el acceso a la plataforma.

---

## 4. Módulo 03: Configuración — Propiedades y Catálogos

### 4.1 Arquitectura del Modelo de Datos de Negocio
Las propiedades representan las variables o campos que definen la ficha de cada prospecto dentro de GatherLeads. Se estructuran en tres capas jerárquicas: Sistema, Paquetes y Custom.

### 4.2 Propiedades de Sistema (12 Campos Base Inmutables)
Son el núcleo de la plataforma, presentes en todas las cuentas. No pueden eliminarse ni desactivarse:
1. `advisor`: Correo o identificador del asesor asignado.
2. `channel`: Canal de entrada (`digital`, `showroom`, etc.). Autocalculable.
3. `dealConsent`: Estado del consentimiento legal de datos.
4. `email`: Correo electrónico del contacto.
5. `firstName`: Nombre de pila del contacto.
6. `identification`: Cédula, RUC o pasaporte.
7. `lastName`: Apellido del contacto.
8. `origin`: Nombre específico del origen de entrada. Autocalculable.
9. `phone`: Número celular en formato internacional.
10. `source`: Fuente técnica (`meta`, `web`, etc.). Autocalculable.
11. `agency`: Agencia comercial asignada (vinculada a catálogo).
12. `product`: Vehículo o producto de interés (vinculado a catálogo).

### 4.3 Paquetes Modulares Activables e Irreversibilidad
Son grupos de propiedades que se activan según los servicios contratados con CarConnect:
- **Motor de Leads (11 propiedades):** Predicciones de intención de compra y scoring mediante modelos de Inteligencia Artificial.
- **Posventa Automotriz (10 propiedades):** Seguimiento de talleres, revisiones por kilometraje y repuestos.
- **CCT CarConnect (29 propiedades):** Operación de Contact Center, llamadas, citas, financiamiento y buró de crédito.
- **Referidos (17 propiedades):** Códigos de afiliado, seguimiento de promotores y liquidación de incentivos.
- **Tráfico / Showroom (3 propiedades):** Variables de recepción en punto de venta.

> [!WARNING]
> **Regla de No Reversibilidad:** Una vez activado un paquete en una licencia, **no existe mecanismo para desactivarlo**. Sus propiedades quedan permanentemente incorporadas a la base de datos de esa cuenta.

### 4.4 Propiedades Personalizadas (Custom) e Inmutabilidad
Permiten a la empresa crear campos adicionales adaptados a sus procesos de venta.
- **Tipos Disponibles:** Texto, Número, Email, Teléfono, Múltiple (lista desplegable con opciones activables/desactivables), Identificación, Fecha y Hora.
- **Key Técnico Automático:** Se genera a partir del nombre en formato camelCase (ej: "Año de Graduación" → `anoDeGraduacion`).
- **Propagación:** Permite la opción de replicar automáticamente la propiedad hacia otras licencias de la empresa.

> [!WARNING]
> **Regla de Inmutabilidad:** Las propiedades personalizadas **no se pueden eliminar** una vez creadas. Si se comete un error en el tipo de dato o clave técnica, permanecerá en el sistema.

### 4.5 Configuración de Identidad Principal y Obligatoriedad
Mediante el botón de engranaje (⚙️), el Administrador puede:
- **Definir la Propiedad de Identidad Principal:** Identificador único de las personas en la base de datos (por defecto es `identification` - cédula). Es obligatoria por sistema y no puede modificarse su obligatoriedad.
- **Configurar Obligatoriedad:** Seleccionar qué propiedades serán requeridas para admitir la creación de un nuevo prospecto en la licencia.

### 4.6 Catálogo de Agencia (IDs Internos y Traducción Externa)
Permite definir los puntos de venta de la empresa:
- **Campos:** Nombre de la agencia, Ciudad, Dirección física, `ID de agencia` (código de coincidencia en el CRM del cliente).
- **IDs Externos:** Lista de nombres alternativos con los que sistemas de terceros (campañas de Meta, sistemas legados) envían la agencia. GatherLeads realiza la traducción automática hacia el ID principal.
- **Personal Asignado:** Permite asignar qué asesores y anfitriones operan en dicha sucursal.

### 4.7 Catálogo de Producto (Modelos, Versiones y Segmentación)
Gestiona la oferta comercial vehicular en dos niveles:
1. **Creación de Modelo:** Nombre del modelo, Marca (permite crear marcas dinámicamente con Enter), Tipo de carrocería (Sedán, SUV, 4x4, etc.), Segmento (Liviano/Pesado), `ID de integración interna` y `IDs Externos` para homologación.
2. **Creación de Versiones:** Año de fabricación, código de integración específico por versión y **Tipo de Proceso** (Venta, Posventa o ambos).

---

## 5. Módulo 04: Integraciones — Conexión con Output y CRM

### 5.1 Opciones de Salida: Nativo vs Puente
GatherLeads no retiene los prospectos como un CRM de cierre; su función es despacharlos hacia la plataforma de gestión del cliente. Para esto ofrece dos modalidades de integración de salida:
- **Nativa:** Conector directo integrado sin desarrollo (HubSpot).
- **Puente (Bridge):** Conexión vía API para CRMs propios o terceros (GatherSync CRM Bridge).

### 5.2 Integración Nativa con HubSpot
HubSpot es la **única integración de salida nativa** provista de fábrica.
- **Requisito:** Crear una Aplicación Privada en la cuenta de HubSpot y generar un Token de Acceso con permisos sobre contactos y negocios.
- **Proceso de Conexión:**
  1. Ir a **Canales y Outputs → CRM → HubSpot** y presionar **Integrar**.
  2. Pegar el Token de Acceso.
  3. **Mapeo de Propiedades:** Enlazar cada campo de GatherLeads con su homólogo en HubSpot.
  4. **Enlace de Pipelines:** Asociar los embudos de GatherLeads con los pipelines de HubSpot.
- **Sincronización Bidireccional:** Todo cambio de etapa realizado en GatherLeads se actualiza automáticamente en la tarjeta del negocio en HubSpot.

### 5.3 GatherSync CRM Bridge (Middleware para CRMs Externos)
Para clientes que operan con Salesforce, Zoho, Microsoft Dynamics o sistemas desarrollados a medida, se utiliza GatherSync.

> [!IMPORTANT]
> **Requisitos Operativos:** GatherSync no es plug-and-play. Exige que el cliente mantenga un endpoint público con disponibilidad 24/7, capacidad de procesar peticiones HTTP entrantes y personal de desarrollo para programar la lógica en su propio CRM.

### 5.4 Mapeo de Pipelines, Etapas y Diccionario de Propiedades
Dentro de GatherSync se configuran:
- **Propiedad para Pipeline y Etapa:** Nombres de los campos en el CRM destino donde se volcarán estos datos (ej. `pipeline_id`, `stage_code`).
- **Etapa Inicial Obligatoria:** Nombre e identificador de la fase de entrada del lead en el CRM externo.
- **Etapas Opcionales:** Definición de fases subsiguientes, ordenables mediante arrastre visual.
- **Mapeo de Propiedades:** Solo las propiedades mapeadas formalmente serán transferidas. **Cualquier propiedad enviada por el webhook que no conste en la matriz de mapeo será ignorada y descartada**.

### 5.5 URL de Actualización de Leads y Autenticación Bearer
Para que el CRM del cliente pueda informar cambios de regreso a GatherLeads (actualizar datos de cotización o tipificaciones), el sistema genera:
- **URL de Actualización:** `https://api.gatherleads.io/api/v1/deals/{dealId}` (se invoca mediante peticiones HTTP `PUT` o `PATCH`).
- **Credencial de Seguridad:** Un **API Key** que debe viajar en la cabecera HTTP:  
  `Authorization: Bearer <apiKey>`

---

## 6. Módulo 05: Configuración — Políticas de Privacidad

### 6.1 Marco Legal y Cumplimiento de Protección de Datos
Permite automatizar el consentimiento informado de tratamiento de datos personales exigido por regulaciones internacionales y leyes locales. El indicador central es la propiedad booleana de sistema `dealConsent`.

### 6.2 Comportamiento de Consentimiento por Canal
| Canal | Mecanismo de Consentimiento | Solicitud Automática | Eliminación por Vencimiento |
| :--- | :--- | :--- | :--- |
| **Meta Ads / TikTok** | Nativo en el formulario de la red social. | No aplica. | No aplica. |
| **Web / Marca** | Requiere consentimiento. | Correo electrónico automático. | Sí (según plazo). |
| **Showroom / Campo** | Obtenido en físico por anfitrión o asesor. | No requiere envío de correo. | Sí (según plazo si falta). |
| **Referidos** | Aceptado al llenar el formulario del afiliado. | No aplica. | No aplica. |

### 6.3 Proceso de Configuración en 5 Pasos
1. **Canales:** Seleccionar el canal. Para el canal Digital, habilitar el selector a "Activado" y marcar las fuentes aplicables (Marca y/o Web).
2. **Archivo de Política de Privacidad:** Cargar el documento legal en PDF (máximo 10 MB) o proveer una URL pública accesible. El sistema almacena un historial inmutable de versiones con fecha y autor.
3. **Plazo de Eliminación:** Slider para definir entre **1 y 90 días** para purgar leads que no confirmen su consentimiento. (Si se marca "No eliminar leads", se muestra una advertencia formal de riesgo legal).
4. **Excepciones de Pipeline:** Permite seleccionar combinaciones de Pipeline y Etapa donde el lead **no será eliminado**, protegiendo negociaciones avanzadas.
5. **Configuración del Correo:** Redacción del correo que se enviará desde `no-reply@gatherleads.io`. Soporta variables dinámicas: `[nombre]`, `[nombre de empresa]`, `[link_policy]`. *(Nota: la opción de envío vía WhatsApp Business está planificada para fases futuras; actualmente solo opera por Email)*.

---

## 7. Módulo 06: Canales — Canal Digital

### 7.1 Fuentes del Canal Digital
Centraliza leads provenientes de marketing digital a través de tres fuentes:
1. **Meta (Facebook e Instagram)**
2. **TikTok**
3. **Web (Formularios propios y bots)**

### 7.2 Integración con Meta Ads
- Se vincula mediante OAuth desactivando previamente cualquier bloqueador de anuncios en el navegador.
- En la pestaña **Cuentas Publicitarias** se vinculan las cuentas comerciales.
- En la pestaña **Sincronización de Leads** se conectan las Fan Pages oficiales desde las cuales se publican los formularios instantáneos.
- Las fallas de sincronización por campos incompatibles se reportan en el módulo de Auditoría.

### 7.3 Enrutamiento Multi-Licencia y Multi-Pipeline en Meta
Si una corporación utiliza una sola cuenta publicitaria de Meta para alimentar varias marcas (licencias) o para dividir leads entre ventas y posventa, debe agregar **parámetros de seguimiento ocultos** en el formulario de Meta Ads:
- Parámetro `license`: Valor con el ID exacto de la licencia (ej. `iEGaTL-AU-MA`).
- Parámetro `pipeline`: Valor `postsales` para dirigir a posventa. (Los prospectos sin este parámetro son asignados automáticamente al pipeline de ventas).

### 7.4 Integración con TikTok Ads e Instant Forms
- Requiere cuenta activa de TikTok Business y campañas de generación de leads con *Instant Forms*.
- **Mapeo Obligatorio de Nombres de Campo (Field Names):** Al diseñar el formulario en TikTok Ads Manager, en `Settings → Field names`, se debe renombrar cada campo para que coincida exactamente con la clave técnica de GatherLeads (`email`, `phone`, `identification`, `product`).
  > [!CAUTION]
  > TikTok **no permite editar los Field names de formularios ya publicados**. Si un formulario tiene nombres erróneos, debe duplicarse, corregirse y relanzarse en la campaña.
- Soporta igualmente los parámetros de seguimiento ocultos `license` y `pipeline`.

### 7.5 Fuente Web: Orígenes, Endpoints e Inmutabilidad
A diferencia de las redes sociales, la fuente Web genera endpoints dedicados para formularios propios, landings o chatbots.
- Se define el nombre descriptivo y se seleccionan las propiedades del sistema y personalizadas requeridas.
  > [!WARNING]
  > **Inmutabilidad Absoluta:** Un Origen Web **no se puede editar ni eliminar una vez confirmado**. Debe revisarse detalladamente antes de crearlo.

### 7.6 Reglas de Duplicidad del Canal Digital
- Se eligen las propiedades a contrastar (Cédula, Email, Teléfono, Agencia, Modelo).
- Se define el periodo de bloqueo (30, 60, 90 días o personalizado).
- Se configuran excepciones por etapa comercial para permitir que un cliente con un negocio ya cerrado pueda reingresar como nueva oportunidad.

---

## 8. Módulo 07: Canales — Tráfico y Showroom Físico

### 8.1 Objetivos de la Operación en Punto de Venta
El módulo Tráfico digitaliza el flujo de clientes en las salas de exhibición:
1. Registrar la llegada física de clientes que tenían cita previa agendada por marketing o Contact Center.
2. Registrar visitas recurrentes de prospectos existentes.
3. Dar de alta y asignar asesores a prospectos espontáneos que llegan sin cita (*walk-ins*).

### 8.2 Distinción Conceptual: Tráfico vs Visita
- **Tráfico:** El evento de la **primera llegada física o cita** de un cliente a la sucursal. Crea el negocio en el pipeline de ventas.
- **Visita:** Cualquier llegada física posterior del mismo prospecto que ocurra **dentro del periodo de duplicidad activo**. No crea negocios nuevos, sino que suma un contador de visitas a la ficha comercial.

### 8.3 Operación Diaria del Anfitrión y Panel de Citas
El Anfitrión utiliza una pantalla táctil o interfaz de escritorio donde visualiza:
- Buscador por Cédula para identificación inmediata.
- Listado de citas del día con estados visuales: `Agendado` (esperando llegada), `Asistió` (llegó a tiempo), `Atrasado` (hora rebasada).
- Gráfico diario que discrimina entre leads de Showroom (nuevos), leads Digitales con cita y Visitas recurrentes.

### 8.4 Flujo de Lead con Cita Previa vs Lead Sin Cita (Walk-in)
- **Con Cita:** El anfitrión ingresa la cédula, el sistema precarga sus datos y permite: asignar el asesor disponible, ratificar el vehículo de interés y registrar la placa si el cliente entregará su auto actual como parte de pago. Al confirmar, el negocio se envía al CRM y se asigna al asesor.
- **Sin Cita (Walk-in):** Se despliega el formulario rápido solicitando: Cédula, Nombres, Email, Teléfono, Modelo, Asesor asignado, canal de referencia ("¿Cómo se enteró de nosotros?") y placa de vehículo usado.

### 8.5 Clasificación de Llegada: Adelantado, Atrasado y En Gestión
| Situación del Cliente | Condición en Sistema | Clasificación | Acción Automática |
| :--- | :--- | :--- | :--- |
| **Lead Adelantado** | Llega antes de la fecha pactada y está en etapa "Cita por confirmar" en CCT. | Digital | Se cambia a etapa *Asistió* y se envía al funnel de ventas. |
| **Lead Atrasado** | Llega después de la hora o fecha agendada. | Digital | Se ingresa a la campaña automática de *Reagendamiento*. |
| **Lead en Gestión** | Llega mientras el Contact Center lo estaba llamando (antes de agendar). | Digital | Se marca como *Asistió*, se sella la fecha de contacto y pasa a ventas con tipificación auditada. |

---

## 9. Módulo 08: Canales — Gestión Externa (Campo y Ferias)

### 9.1 Estructura del Canal: Fuentes y Orígenes
Permite coordinar actividades de venta fuera de la agencia:
- **Fuente:** Agrupador estratégico (ej. "Activaciones BTL", "Ferias Agrícolas").
  > [!NOTE]
  > Si se crea una Fuente sin asignarle un Origen de inmediato, la fuente no se guarda.
- **Origen (Gestión Externa concreta):** Parámetros específicos: Nombre, Fechas (Desde/Hasta), Horario de operación (Hora inicio/fin que controla el bloqueo del formulario), Agencias y Asesores asignados, Pipeline y Etapa de destino.

### 9.2 Horarios de Vigencia y Margen de Cierre Post-Gestión
El formulario de captura se bloquea estrictamente fuera de las horas pactadas. Sin embargo, se puede configurar un **Margen de Cierre Post-Gestión** (tiempo de gracia en horas o días) para que los asesores puedan digitar prospectos captados en zonas rurales o con baja señal tras culminar la feria.

### 9.3 Ciclo de Vida: Estados de una Gestión Externa
- `📝 Borrador`: En diseño. No notifica ni permite captura de prospectos. Editable.
- `📢 Publicada`: Activa. Notifica a los asesores por correo y habilita los formularios web y móviles.
- `✅ Finalizada`: Cumplió la fecha final o fue forzada por el admin. Habilita el tiempo de gracia para carga rezagada. No editable.
- `📦 Archivada`: Congelada para mantener orden visual. No altera estadísticas ni borra registros.

### 9.4 Experiencia del Asesor Comercial
El asesor asignado recibe una notificación y accede a una vista de calendario (semanal o mensual) con sus eventos autorizados, accediendo directamente al formulario de alta de prospectos.

### 9.5 Aplicación Móvil Offline y Advertencias Críticas de Datos
GatherLeads dispone de una aplicación para dispositivos móviles que permite registrar prospectos sin internet.
- **Compatibilidad:** Exclusivamente **teléfonos inteligentes (iOS y Android)**. No está soportada en tablets.
- **Acceso:** Exclusivo para usuarios con rol *Asesor Comercial*.
- **Indicadores en Pantalla:** Semáforo de conectividad a internet y contador de leads pendientes de sincronización local.
- **Sincronización:** En cuanto el dispositivo recupera acceso a internet, los leads viajan automáticamente al servidor central.

> [!CAUTION]
> **Riesgos de Pérdida de Datos en Modo Offline:**
> 1. **No cerrar sesión:** Si el asesor presiona "Cerrar Sesión" (*Logout*) en la app teniendo leads sin sincronizar, **se borran irremediablemente**.
> 2. **No usar limpiadores de memoria:** Herramientas de optimización del teléfono pueden eliminar la memoria caché donde residen los datos locales.
> 3. **Pérdida del terminal:** Si el teléfono sufre daño total o extravío antes de sincronizar, los datos son irrecuperables.
> 4. **Fecha de Creación:** La fecha oficial de ingreso del lead será **la fecha en que se sincronizó con el servidor**, no la hora en que se ingresó en modo offline.

---

## 10. Módulo 09: Canales — Programa de Referidos

### 10.1 Concepto y Actores: Afiliado vs Referido
Permite convertir a clientes satisfechos y empleados en promotores de la marca:
- **Afiliado (Promotor):** Persona registrada que difunde un código único de recomendación.
- **Referido (Prospecto):** Cliente potencial que accede a un formulario web ingresando el código del afiliado.

### 10.2 Términos y Condiciones y Catálogo de Beneficios
- **Términos Legales:** Carga obligatoria del documento legal en PDF o URL que regula el programa. GatherLeads deslinda responsabilidad por incumplimiento de premios entre concesionario y cliente.
- **Tipos de Beneficios:**
  - *Descuento:* Rebaja porcentual o fija en servicios o compra.
  - *Gift Card:* Tarjeta de regalo canjeable.
  - *Monto Monetario:* Transferencia económica directa al concretar la venta.

### 10.3 Creación y Administración de Códigos de Afiliado
Al dar de alta un código se parametriza:
- Marcador de **Usuario Interno** (si el afiliado es empleado de la empresa).
- Nombres, Apellidos, Email y Cédula del afiliado.
- **Vigencia:** Fecha de caducidad o marcado como "Sin vigencia".
- **Límite de Referidos:** Cupo máximo de prospectos que puede aportar el código o "Sin límite".
- **Beneficio del Referido:** Incentivo que recibirá el comprador por utilizar dicho código.

> [!NOTE]
> Una vez que un código genera su primer lead, **los datos de contacto del afiliado y los beneficios asociados quedan bloqueados para edición**.

### 10.4 Ciclo de Vida y Estados del Código
- `BORRADOR`: En preparación. No apto para captación.
- `PUBLICADA`: Operativo y difundible. Genera leads.
- `FINALIZADA`: Fecha límite alcanzada. Bloquea nuevos ingresos.
- `ARCHIVADA`: Desactivado manualmente.

### 10.5 Flujo Completo del Lead Referido y Activación de Recompensa
1. El Administrador genera el código y el sistema lo envía por correo al afiliado.
2. El afiliado comparte su código por mensajería o redes sociales.
3. El interesado abre el enlace y se registra en el formulario web dedicado.
4. GatherLeads envía automáticamente el lead al pipeline y etapa del CRM asignado.
5. El afiliado recibe una alerta de confirmación del registro de su referido.
6. **Disparador del Beneficio:** Cuando el lead alcanza la etapa de **Cierre Exitoso** en el pipeline de ventas, el motor de GatherLeads notifica al afiliado y sella la orden para la entrega de su recompensa.

---

## 11. Módulo 10: Analítica — BI Captación

### 11.1 Reemplazo Arquitectónico del Motor Antiguo
Históricamente (2023), GatherLeads incluía un panel basado en *MongoDB Charts* que presentaba lentitud, fallas de renderizado y cifras estáticas. El nuevo módulo **BI Captación** fue construido íntegramente de forma propietaria sobre una arquitectura orientada a eventos para responder con exactitud a la gerencia de marketing.

### 11.2 Funcionamiento en Tiempo Real
A diferencia de los paneles tradicionales que dependen de procesos por lotes nocturnos (batch processing), BI Captación mantiene contadores en memoria que se incrementan o recalculan al instante en que un lead entra, se invalida, se duplica o se despacha al CRM. Si un prospecto ingresa a las 14:05, a las 14:05 ya forma parte de las métricas.

### 11.3 El Filtro Global Multidimensional
Gobierna todas las gráficas y componentes del módulo mediante cuatro filtros:
1. **Período (Obligatorio):** Rango de fechas (por defecto últimos 7 días).
2. **Canal / Fuente / Origen:** Selector jerárquico que solo expone opciones con datos reales en el período.
3. **Agencia:** Desglose territorial `Ciudad → Concesionario`.
4. **Producto:** Desglose jerárquico `Marca → Modelo → Versión`.

### 11.4 Pestaña Overview
Ofrece una lectura ejecutiva inmediata del rendimiento:
- **6 Metric Cards (con indicador delta porcentual verde/rojo vs período anterior):**
  1. *Leads Totales:* Todo intento de ingreso bruto.
  2. *Leads Únicos:* Prospectos legítimos que superaron las validaciones de datos.
  3. *Leads Fallidos:* Intentos que violaron reglas estructurales (ej. cédula trunca).
  4. *Leads Duplicados:* Prospectos válidos pero con documento ya existente dentro del período de duplicidad.
  5. *Leads Integrados:* Prospectos únicos aceptados exitosamente por el CRM (`HTTP 200`). *(Solo visible con output activo)*.
  6. *Leads No Integrados:* Prospectos rechazados o no procesados por el CRM destino. *(Solo visible con output activo)*.
- **Gráficos:** Barras apiladas de volumen en el tiempo y gráfico donut de composición porcentual con el total en el centro.

### 11.5 Pestaña Calidad de Captación (Diferenciador Clave)
Permite auditar técnicamente por qué se pierden prospectos antes de llegar a ventas:
- **Inválido vs Faltante:**
  - *Inválido (Rojo Oscuro):* El dato llegó pero no cumple el formato (ej. teléfono con 8 dígitos o caracteres alfabéticos). Denota error en el diseño del anuncio o falta de validación en la landing page.
  - *Faltante (Rosa Claro):* La variable directamente no viajó en el payload (ej. campo `email` omitido). Denota un error de mapeo o configuración en el origen técnico.
- **Gráfico Sunburst (Distribución concéntrica):** El anillo interno expone el Canal u Origen; el anillo externo muestra el tipo de error específico.
- **Tabla de Orígenes Problemáticos:** Lista campañas y formularios con más de un 10% de tasa de fallo sobre al menos 20 leads.
- **Cola de Reproceso Manual:** Concentra prospectos fallidos para permitir su reenvío masivo tras solucionar la inconsistencia técnica en el origen.

### 11.6 Pestaña Tendencias
- **Indicadores:** Variación porcentual, promedio diario de captación, día de mayor tráfico y canal con mayor aceleración.
- **Comparativa Interanual (YoY):** Gráfico de líneas que contrasta los últimos 3 años (año en curso en azul continuo; anteriores en gris).
- **Mapa de Calor de Estacionalidad (Heatmap):** Grilla estilo calendario de 52 semanas donde la intensidad del color azul denota la densidad de captación.
  > [!IMPORTANT]
  > Tanto la Comparativa YoY como el Heatmap **no responden al filtro de período temporal**; siempre representan el año completo de forma independiente para revelar estacionalidad. Sí responden a filtros de Canal, Agencia y Producto.

### 11.7 Pestaña Leads Entregados
Monitorea la comunicación entre GatherLeads y el CRM comercial.
- **Visibilidad Condicional:** Solo se muestra en el menú si la licencia tiene configurado un output activo (HubSpot o GatherSync).
- **Clasificación de Errores:**
  - *Rechazados por el CRM (4xx):* Causa técnica en el mapeo (campos no reconocidos o tipos incompatibles en el CRM).
  - *Error del CRM (5xx):* Caída o saturación del servidor del cliente.
- **Antigüedad de Leads en Cola:** Segmentación de prospectos no integrados: *Hoy* (en proceso), *1 a 3 días* (atención requerida) y *Más de 3 días* (estado crítico de pérdida comercial).

---

## 12. Módulo 11: Analítica — Funnel de Conversión

### 12.1 Justificación Comercial frente a Hojas de Cálculo
Los equipos comerciales suelen exportar datos de múltiples sistemas para armar embudos en Excel, generando atrasos y cifras divergentes. El módulo **Funnel de Conversión** digitaliza este proceso permitiendo cruzar la captación de GatherLeads con las etapas reales de los pipelines comerciales de forma nativa.

### 12.2 Estructura: Funnel Builder vs Funnel Viewer
- **Funnel Builder:** Asistente interactivo en 4 pasos para configurar el embudo.
- **Funnel Viewer:** Interfaz de visualización analítica con indicadores clave y segmentación.

### 12.3 Wizard del Builder: Fases, Etapas, Métricas y Filtros
1. **Paso 1 — Fases:** Creación de bloques visuales con nombres y colores distintivos (ej. "Atracción", "Evaluación", "Cierre"). Mínimo una fase requerida.
2. **Paso 2 — Construir:** Selección y arrastre de etapas reales del CRM hacia las fases de color. Permite combinar etapas de pipelines diferentes (Ventas y Contact Center). Exige un mínimo de 2 etapas en total.
   - *Métricas de Entrada (Opcionales):* Universo denominador de referencia (*Total leads*, *Únicos* o *Integrados*). Si se omiten, la primera etapa actúa como techo (100%).
3. **Paso 3 — Filtros Predeterminados:** Define condiciones lógicas fijas (`Campo → Operador → Valor`) para que el embudo se abra pre-filtrado por canales o agencias específicas.
   > [!NOTE]
   > La fecha de análisis **no se configura aquí**, sino dinámicamente en el Viewer.
4. **Paso 4 — Guardado:** Nombre (máximo 80 caracteres), descripción opcional y asignación de Visibilidad:
   - *Privado:* Exclusivo del usuario creador.
   - *Compartido:* Visible para todos los administradores de la cuenta.

### 12.4 Propiedad y Gobernanza: Privado vs Compartido
> [!IMPORTANT]
> **Regla de Autoría (Ownership):** Un embudo Compartido puede ser consultado por cualquier administrador, pero **únicamente el usuario que lo creó tiene los permisos para editarlo o eliminarlo**. Si otro usuario intenta modificarlo, el sistema bloqueará la acción.

### 12.5 Funnel Viewer: KPIs, Barras Proporcionales y Segmentación
- **KPI Cards:** Leads totales en embudo, Conversión End-to-End (% del inicio al fin), Mayor Caída (etapa con mayor fuga absoluta de prospectos) y Tiempo promedio de cierre comercial.
- **Tira "Por Fase":** Resumen horizontal superior con cápsulas de color y porcentaje de paso entre fases.
- **Gráfica de Barras:** Barras horizontales proporcionales a la etapa mayor, acompañadas de chips de conversión (`% de retención` y `delta absoluto de caída`).
- **Segmentación:** Selector que divide visualmente cada barra en franjas cromáticas según **Agencia**, **Producto** o **Asesor**, manteniendo idéntico el total numérico.

### 12.6 Diagnóstico de Anomalías: Lectura del Chip `> 100% (REVISAR)`
En un flujo comercial normal, cada etapa retiene un porcentaje menor o igual al 100% de la anterior. Si una etapa presenta más prospectos que la que le antecede, GatherLeads **no trunca ni oculta la cifra**; expone el porcentaje real y tiñe el chip de naranja con la etiqueta **`⚠ REVISAR`** (ej. `114.3% REVISAR`).
- **Explicación técnica:** Indica que el usuario ordenó las etapas del embudo en el Builder de forma discordante frente a la realidad operativa del pipeline (ej. ubicó "Aprobación de Crédito" antes de "Solicitud de Crédito"). A estas etapas anómalas se les desactiva automáticamente el badge de "Mayor Caída".

---

## 13. Módulo 12: Analítica — Rendimiento (CPL Declarado vs Real)

### 13.1 Propósito y Cálculo del Costo por Lead
Cierra la suite de analítica respondiendo a la pregunta financiera: **¿Cuánto costó efectivamente cada lead captado?**  
Permite contrastar lo que el área de marketing planificaba pagar por prospecto frente al costo real final, desglosado por canal, fuente y campaña publicitaria.

### 13.2 Configuración del Período en 3 Pasos y Control de Solapamiento
El **Período** es la unidad de análisis temporal y presupuestaria:
- **Paso 1 — Metas:** Nombre de la campaña, Alcance (toda la licencia o canales específicos), Meta u objetivo de volumen de leads y Fechas de inicio y fin.
  > [!WARNING]
  > **Control de Superposición:** El asistente bloquea la creación de un período si sus fechas y canales colisionan con otro período preexistente, garantizando consistencia contable.
- **Paso 2 — Presupuesto Declarado:** Monto económico planificado. Permite desglosar el dinero jerárquicamente en un árbol de canales, fuentes y orígenes, asistido por un gráfico donut en tiempo real que indica el importe pendiente de asignación.
- **Paso 3 — Preview:** Muestra el resumen y calcula de forma automática el **CPL Esperado / Declarado**:
  $$\text{CPL Declarado} = \frac{\text{Presupuesto Total Declarado}}{\text{Meta de Leads}}$$

### 13.3 Registro del Gasto Real e Integración con Captación
Una vez que el período entra en vigencia o concluye, el administrador ingresa al dashboard y hace clic en **Registrar Gasto Real**.
- El conteo de leads obtenidos **no es editable**: es extraído directamente por el sistema desde el motor de *BI Captación*.
- El usuario digita el importe real consumido en las plataformas publicitarias (Meta Ads Manager, Google Ads, facturas de eventos).
- El sistema recalcula inmediatamente el **CPL Real**:
  $$\text{CPL Real} = \frac{\text{Gasto Real Ejecutado}}{\text{Leads Únicos Captados}}$$

### 13.4 Regla Estadística: Consolidado Ponderado
> [!TIP]
> El CPL global del dashboard se obtiene mediante una **suma ponderada** ($\frac{\text{Gasto Total}}{\text{Leads Totales}}$) y **nunca mediante un promedio aritmético de los CPL de cada canal**. Esto evita que canales con presupuestos marginales distorsionen la realidad económica del consolidado general.

### 13.5 Estados del Período: Programado, Vigente y Vencido
- `Programado`: Fechas a futuro. Totalmente editable. No permite carga de gasto real hasta su fecha de inicio.
- `Vigente`: La fecha actual se encuentra dentro del rango de la campaña. Admite edición completa y registro dinámico de gasto real.
- `Vencido`: La fecha de fin ha expirado. Entra en modo **solo lectura con cifras congeladas** para servir como histórico inalterable de auditoría financiera.

---

## 14. Glosario Maestro de Términos de GatherLeads

- **Licencia:** Entidad fundamental que agrupa configuraciones, usuarios y canales para una marca o concesionario independiente.
- **Deal / Negocio:** Registro central de un prospecto que avanza por los embudos de la plataforma.
- **Idempotencia:** Propiedad técnica garantizada por el campo `eventId` que previene el doble procesamiento de un mismo mensaje en webhooks.
- **dealConsent:** Variable booleana mandatoria que valida si el titular autorizó el tratamiento legal de sus datos personales.
- **Tráfico:** Evento de la primera llegada presencial de un prospecto al salón comercial.
- **Visita:** Concurrencia recurrente de un mismo lead al punto de venta dentro de la ventana de duplicidad activa.
- **Walk-in:** Cliente que arriba al concesionario de forma espontánea sin cita previa.
- **Margen de Cierre Post-Gestión:** Tiempo de gracia posterior a un evento externo para permitir la sincronización de leads captados en zonas sin cobertura.
- **Inválido (Calidad BI):** Lead cuyo dato incumple la estructura técnica (error de campaña o formulario).
- **Faltante (Calidad BI):** Lead al que le falta una variable obligatoria (error de configuración en origen).
- **REVISAR (>100%):** Alerta en el Funnel de Conversión que indica desorden en la secuencia lógica de etapas configuradas por el usuario.
- **CPL Ponderado:** Métrica que divide el gasto monetario global entre la masa total de leads captados para evitar distorsiones estadísticas.
