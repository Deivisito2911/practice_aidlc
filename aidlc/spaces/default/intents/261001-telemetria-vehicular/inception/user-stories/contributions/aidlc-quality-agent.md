**Collaborator:** aidlc-quality-agent

## Contribution

La segunda revisión resuelve las objeciones principales de calidad. `AC3.1.1` ahora incluye batería `0` y `19,99` como casos que generan salida `PENDING`, frente al `20` que no genera alerta en `AC3.1.2`. `US3.2` conserva la salida ante publicación fallida, incierta o aceptada por SQS sin actualización posterior a `PUBLISHED`; `US4.1` implementa el barrido periódico y la reclamación condicional previa al envío. La dependencia `US4.1 → US3.2` y la dependencia de `US6.3` en `US4.1` permiten cerrar las historias en ese orden sin ciclo.

`AC5.1.3` usa datos sintéticos solo para verificar el cálculo, mientras `AC5.1.5` exige un mes calendario real en `staging` para afirmar `NFR3`. `AC1.2.5` establece clave y reloj controlados para probar los límites de tasa, ráfaga y cuota. `US4.2` delimita el rol operativo, el alcance previo, la autorización y el resultado verificable del reintento. `AC1.1.6` aclara que `202` significa persistencia confirmada, no entrega al consumidor externo. Se mantienen pruebas de `400` sin efectos, `202` posterior a la transacción, duplicados HTTP, salida Outbox atómica, fallo de publicación y recuperación `PENDING` con la misma Lambda invocada por EventBridge. La matriz de trazabilidad incluye todos los FR/NFR y ahora también relaciona C1–C7 con historias.

Queda una referencia de trazabilidad obsoleta tras la separación de responsabilidades: `US3.2` todavía declara `FR6.1` en **Requirements** y `traceability.json` apunta `FR6.1` a `US3.2, US4.1`. `FR6.1` exige específicamente la invocación periódica de EventBridge y la consulta de salidas vencidas, criterio que ahora solo está en `US4.1`. Retirar `FR6.1` de `US3.2` y dejar el destino `US4.1` en esa fila evita atribuir cobertura a una historia que no implementa el barrido.

Las respuestas HTTP para duplicados exactos/conflictivos y el horizonte después de TTL siguen asignados a Contract Design. La frecuencia, consulta acotada y alarmas siguen asignadas a Infrastructure Design. La prueba mensual de disponibilidad requiere tiempo de observación real; mientras tanto, `AC5.1.3` solo valida la fórmula y `AC5.1.5` queda pendiente de evidencia.

## Positions

- AGREE: Las objeciones anteriores sobre batería `0`, dependencias de recuperación, perfil controlado de cuotas, fallo posterior a aceptación SQS, alcance operativo y separación entre cálculo sintético y disponibilidad observada están resueltas.
- AGREE: `AC3.2.4` y `AC4.1.2` verifican responsabilidades distintas: conservación ante fallo de actualización frente a barrido periódico con SQS restablecida.
- AGREE: `AC4.2.3` pide un resultado verificable de herramienta o procedimiento al terminar, sin imponer GUI ni progreso en tiempo real.
- OBJECT: `US3.2` y la fila `FR6.1` de `traceability.json` aún atribuyen a `US3.2` el barrido periódico que ahora pertenece a `US4.1`.
