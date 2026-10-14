# Guía Oficial de Configuración de AWS CLI y Perfiles SSO

Este documento describe la arquitectura, estructura y procedimiento estándar para configurar la autenticación en AWS mediante **sesiones temporales de AWS IAM Identity Center (AWS SSO)** y el **AWS CLI v2**, según las directrices oficiales de AWS y los requisitos de seguridad corporativa.

---

> [!CAUTION]
> **REGLAS DE AISLAMIENTO Y SEGURIDAD OPERATIVA**
> * **ID de Cuenta:** `745708001009` (Cuenta corporativa compartida).
> * **Región Obligatoria:** `sa-east-1` (São Paulo). Existen proyectos de producción en otras regiones; **queda terminantemente prohibido** ejecutar comandos sin especificar `--region sa-east-1` o interactuar con recursos fuera del prefijo `Telemetry-*`.
> * **Cero comandos destructivos:** No ejecutar `delete-stack`, borrado de tablas DynamoDB o `cdk destroy`.

---

## 1. Archivos de Configuración de AWS en Windows

AWS CLI y el AWS SDK buscan la configuración en el directorio de perfil del usuario del sistema operativo:

* **Directorio base:** `%USERPROFILE%\.aws\` (Ruta física: `C:\Users\Deivisito\.aws\`)
* **Archivos requeridos:**
  1. `credentials`: Almacena claves de acceso y tokens criptográficos temporales.
  2. `config`: Almacena configuraciones de entorno (región, formato de salida, perfiles).

> [!IMPORTANT]
> Ambos archivos son de **texto plano con formato INI** y **NO deben tener ninguna extensión** (ni `.txt`, ni `.ini`).

---

## 2. Formato del Archivo `credentials`

* **Ruta:** `C:\Users\Deivisito\.aws\credentials`
* **Sintaxis:** Secciones entre corchetes `[nombre_perfil]` con pares `clave = valor`.

```ini
[745708001009_AdministratorAccess]
aws_access_key_id = ASIAXXXXXXXXXXXXXXXX
aws_secret_access_key = XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
aws_session_token = IQoJb3JpZ2luX2VjE...[token criptográfico largo]...==

[default]
aws_access_key_id = ASIAXXXXXXXXXXXXXXXX
aws_secret_access_key = XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
aws_session_token = IQoJb3JpZ2luX2VjE...[token criptográfico largo]...==
```

> [!TIP]
> **Recomendación:** Mantener el bloque con el nombre oficial del rol (`745708001009_AdministratorAccess`) y, opcionalmente, duplicarlo bajo `[default]` para que las herramientas que no reciban el parámetro `--profile` funcionen de forma transparente.

---

## 3. Formato del Archivo `config`

* **Ruta:** `C:\Users\Deivisito\.aws\config`
* **Sintaxis:** Los perfiles nombrados llevan la palabra clave `profile ` antes del nombre.

```ini
[profile 745708001009_AdministratorAccess]
region = sa-east-1
output = json

[default]
region = sa-east-1
output = json
```

---

## 4. Procedimiento de Renovación de Sesión Temporal

Las credenciales otorgadas por AWS SSO son de corta duración (típicamente entre 1 y 8 horas). Cuando expiren, el procedimiento formal para renovarlas es:

1. **Ingresar al portal de AWS SSO:** Acceder con tu usuario (`dzanella@carconnect.com.ec`).
2. **Seleccionar la cuenta:** Cuenta `745708001009` y hacer clic en **`Access keys 🗝️`** al lado del rol `AdministratorAccess`.
3. **Copiar el bloque de la Opción 2:**
   * En la ventana modal, ir a la sección: **"Opción 2: agregar un perfil a su archivo de credenciales de AWS"**.
   * Hacer clic en el botón de copiar.
4. **Actualizar el archivo:**
   * Abrir `C:\Users\Deivisito\.aws\credentials`.
   * Reemplazar los valores de `aws_access_key_id`, `aws_secret_access_key` y `aws_session_token`.
   * Guardar el archivo.

---

## 5. Verificación de Conectividad

Para comprobar que el perfil está activo, autenticado y apuntando a la cuenta y región correctas, ejecutar en PowerShell:

```powershell
aws sts get-caller-identity --profile 745708001009_AdministratorAccess --region sa-east-1
```

**Respuesta esperada (exit code 0):**
```json
{
    "UserId": "AROA23H5JC3YQ7O6XBIFB:dzanella@carconnect.com.ec",
    "Account": "745708001009",
    "Arn": "arn:aws:sts::745708001009:assumed-role/AWSReservedSSO_AdministratorAccess_b7bb9694c2939bb0/dzanella@carconnect.com.ec"
}
```

---

## 6. Uso con AWS CDK y AI-DLC

Cuando el framework de AI-DLC o AWS CDK requiera interactuar con la infraestructura, se pueden utilizar las siguientes alternativas estándar:

* **Pasando el flag de perfil:**
  ```powershell
  npx cdk diff --profile 745708001009_AdministratorAccess
  ```
* **Fijando la variable de entorno de perfil en la terminal:**
  ```powershell
  $env:AWS_PROFILE = "745708001009_AdministratorAccess"
  $env:AWS_REGION = "sa-east-1"
  npx cdk synth
  ```
