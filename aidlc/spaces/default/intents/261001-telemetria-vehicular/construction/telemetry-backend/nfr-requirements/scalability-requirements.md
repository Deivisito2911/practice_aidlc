# Requisitos de escalabilidad

| ID | Requisito verificable | Evidencia |
|---|---|---|
| NFR1.3 | La ruta de ingreso sostiene 100 solicitudes válidas/s sin superar p95 de 500 ms. | Carga sostenida representativa en staging. |
| NFR2.3 | El consumo de cola y la escritura escalan hasta mantener ≥99 % de persistencias en <30 s bajo la carga NFR1.3. | Prueba integral y medición de edad/profundidad de cola. |
| NFR9.1 | La capacidad y límites de API Gateway, SQS, Lambda, DynamoDB y KMS se parametrizan en CDK y se reproducen sin pasos manuales en staging. | Despliegue en una segunda cuenta preparada y revisión de cuotas. |

La capacidad mínima se dimensiona contra el perfil aprobado de 100 solicitudes/s. No se presenta ese perfil como pronóstico de uso continuo durante 90 días; el costo y el crecimiento se calculan con datos reales cuando existan. Un incremento de profundidad o edad de cola indica que el consumo no sigue el ingreso y debe activar investigación.
