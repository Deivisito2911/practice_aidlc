# Preguntas de aprovisionamiento de entornos

## Contexto resuelto por diseño

| Pregunta de la etapa | Respuesta fundamentada |
| --- | --- |
| VPC, subredes, grupos de seguridad y NACL | La Lambda no está adjunta a una VPC y usa servicios administrados por endpoints AWS; no hay red privada propia que validar. Diseño U3, `infrastructure-specification.md`. |
| Secretos y parámetros | CI no recibe claves AWS persistentes. Los despliegues requieren OIDC y el parámetro `OperationsAlarmTopicArn`; los valores reales de ambos entornos y la protección de API key deben verificarse en AWS/GitHub, no inferirse del CDK. |
| Conectividad entre cuentas/VPC | No se diseñó tráfico de aplicación entre VPCs ni cuentas. Staging y producción usan identidades OIDC separadas; la confianza real por cuenta y entorno está pendiente de verificación. |

## Acceso pendiente

¿Están disponibles ahora las cuentas de staging y producción y un acceso autenticado para aprovisionar y validar los recursos? Si eliges A, proporciona después IDs de cuenta, regiones y método de acceso sin compartir claves secretas (por ejemplo, perfil AWS SSO o sesión de consola con roles).

- A. Sí, proporcionaré los datos y acceso necesarios.
- B. No; documentar entornos no aprovisionados y continuar con el bloqueo visible.
- X. Other (please specify).

[Answer]: A. Sí, proporcionaré los datos y acceso necesarios.

## Coordenadas de los entornos y acceso

Indica para staging y producción el ID de cuenta AWS de 12 dígitos y la región. Indica también el método de acceso autenticado disponible para esta sesión (por ejemplo, nombres de perfiles AWS SSO o roles de consola) y el rol autorizado para administrar la auditoría. No compartas contraseñas, claves de acceso ni tokens.

[Answer]: Corrección posterior del usuario: staging y producción usan la cuenta 745708001009 en sa-east-1, con stacks separados. La sesión temporal declarada usa IAM Identity Center y el rol arn:aws:sts::745708001009:assumed-role/AWSReservedSSO_AdministratorAccess_b7bb9694c2939bb0/dzanella@carconnect.com.ec. CI/CD usará OIDC sin claves fijas. CloudTrail será administrado por arn:aws:iam::745708001009:role/aws-reserved/sso.amazonaws.com/sa-east-1/AWSReservedSSO_AdministratorAccess_b7bb9694c2939bb0. La cuenta 139592264545 y los ARN asociados de la respuesta anterior quedan sustituidos.

## Sesión autenticada para validación

La pestaña del navegador integrado abrió la página de inicio de sesión IAM, no una consola autenticada. Inicia sesión tú mediante AWS SSO en esa pestaña y confirma cuando esté lista; si el portal SSO usa otra URL, indica únicamente esa URL. No compartas credenciales ni códigos.

[Answer]: Usaremos AWS CLI. El usuario confirmó «listo» y luego corrigió la cuenta a 745708001009, pero en esta sesión `aws sts get-caller-identity --region sa-east-1` devuelve NoCredentials; no existe `~/.aws/config` ni `~/.aws/credentials` en el perfil Windows de esta sesión. No se ha validado identidad ni provisionado recursos.

## Perfil CLI compartido

¿Qué nombre de perfil AWS SSO y ruta de configuración usa la sesión que devolvió el ARN de IAM Identity Center? No compartas archivos de credenciales, claves ni tokens. Si se ejecutó en otra máquina o usuario de Windows, indícalo.

[Answer]: Perfil AWS SSO `745708001009_AdministratorAccess` del usuario Windows Deivisito; configuración en `C:\Users\Deivisito\.aws\config`, credenciales en `C:\Users\Deivisito\.aws\credentials`, región `sa-east-1`. Se confirmó con `sts get-caller-identity`: cuenta `745708001009`, ARN `arn:aws:sts::745708001009:assumed-role/AWSReservedSSO_AdministratorAccess_b7bb9694c2939bb0/dzanella@carconnect.com.ec`.

## Destino de alarmas

El stack exige `OperationsAlarmTopicArn` en staging y producción. En sa-east-1 no hay temas SNS. Indica un ARN SNS existente o el correo/endpoint autorizado para suscribir un tema de cada entorno; si todavía no hay canal de guardia, dilo expresamente. No compartas secretos.

[Answer]: Sin canal de guardia aún. No hay ARN SNS ni correo/endpoint autorizado para staging o producción; los stacks de aplicación no se desplegarán hasta definir y verificar ese destino.

## Evidencia actual

El ejecutable AWS CLI está en `C:\Program Files\Amazon\AWSCLIV2\aws.exe` y el perfil SSO indicado devolvió la identidad de la cuenta 745708001009. Las plantillas CDK locales de staging y producción ya no contienen CloudTrail; una plantilla separada `TelemetryAudit` lo administra a nivel de cuenta. La cuenta aún no tiene stacks CloudFormation, trail, temas SNS, proveedor OIDC de GitHub ni bootstrap CDK. No se declara entorno provisionado ni salud de aplicación validada.
