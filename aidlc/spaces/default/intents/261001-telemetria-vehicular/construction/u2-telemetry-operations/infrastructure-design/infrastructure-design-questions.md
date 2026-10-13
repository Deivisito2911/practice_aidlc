# Preguntas de infraestructura — U2

## Evaluación

No quedan preguntas que bloqueen el diseño. Se conserva la cuenta/región configuradas en el entorno de despliegue y se recibe el ARN del canal de guardia y del rol P3 desde parámetros de entorno protegidos; ninguno se codifica como constante. El stack existente ya define una Lambda de 512 MiB/20 s, barrido de 1 min y lote Outbox de 25; se mantienen como baseline hasta medir staging. El lote CLI máximo inicial será 25, igual al lote configurado del Outbox.

## Límites confirmados

- No crear Lambda ni cola de ingreso adicionales, ni exponer operación administrativa en el endpoint público.
- El test de 100 RPS se ejecuta 15 minutos con datos válidos y perfil de prueba dentro de la cuota diaria por clave.
- Coste en moneda se calcula cuando se conozcan región, horas activas por entorno, retención de logs y tráfico real; registrar esos datos antes del aprovisionamiento.
