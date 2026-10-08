# Diseño de confiabilidad

## Persistencia y publicación

Una escritura condicional impide sustituir el evento por eventId. Para batería <20, una transacción crea evento y salida PENDING o ninguno. El publicador reintenta un fallo o resultado incierto sin cambiar alertId y solo cambia PENDING a PUBLISHED después de confirmación; el consumidor contractual deduplica reentregas físicas por alertId (NFR7.2–NFR7.3).

## Reintentos y aislamiento

El consumidor responde con fallos parciales para que no regresen mensajes sanos. La cola de entrada configura maxReceiveCount=5 y DLQ; un mensaje venenoso no bloquea el lote. La redrive exige alcance y autorización, informa resultados por lote y preserva idempotencia. El publicador de salidas se recupera recorriendo PENDING; su reintento usa retroceso y un límite operativo configurado, pero no abandona la intención duradera (NFR7.1–NFR7.3).

## Disponibilidad, retención y recuperación

Medir disponibilidad sobre todos los minutos del mes para ≥99,9 % en staging, sin excluir mantenimiento (NFR3.1). Guardar acceptedAt y expiresAt=acceptedAt+90 días, habilitar TTL y alertar sobre elegibles anómalos; la eliminación física no tiene plazo fijo (NFR4.1–NFR4.2). DynamoDB conserva copia de seguridad/recuperación configurada y se prueba restauración antes de producción; no se promete un RTO/RPO nuevo sin decisión de negocio.
