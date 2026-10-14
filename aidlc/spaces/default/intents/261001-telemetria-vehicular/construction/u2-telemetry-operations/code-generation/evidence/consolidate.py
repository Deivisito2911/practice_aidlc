import json
from pathlib import Path
root=Path('aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/u2-telemetry-operations/code-generation')
rows=[
('AC1.1.3','src/telemetry/handlers.test.ts','acepta limite inclusivo (battery0/100,temperature-50/150,speed0/300 y UTC+5min)','Se aceptan todos los limites sin ampliar rangos.'),
('AC2.1.2','tests/integration/telemetry-flow.test.ts','solicitudes HTTP concurrentes identicas dejan un evento y una sola salida','Dos respuestas202; una transaccion comprometida y dos filas conjuntas.'),
('AC2.1.4','tests/integration/telemetry-flow.test.ts','fallo before/during/after del commit nunca deja estado parcial ni202 falso','Antes/durante:0 filas/503; despues:2 filas/202 tras lectura coherente.'),
('AC3.1.1','src/telemetry/service.test.ts','bateria0 y19.99 crea salida durable determinista','Registro y salida LOW_BATTERY:e1 con batteryValue exacto.'),
('AC3.1.3','src/telemetry/service.test.ts','temperature/speed no crea salida ni publicacion','Un evento, cero Outbox y cero llamadasSQS.'),
('AC3.1.4','src/telemetry/service.test.ts','SQS confirmado seguido de fallo al marcar conserva identidad y recuperacion','Assertion de los seis campos completos e instante UTC del mensaje.'),
('AC3.1.6','src/telemetry/service.test.ts','eventos fuera de orden producen alertas independientes sin estado acumulativo','Dos eventos/salidas/envios; no se cancela el evento anterior.'),
('AC3.2.4','src/telemetry/service.test.ts','SQS confirmado seguido de fallo al marcar conserva identidad y recuperacion','PENDING recuperable, segundo envio con mismoalertId y publicacion confirmada.'),
('AC4.1.1','src/telemetry/service.test.ts','recuperacion posterior no republica la salida PUBLISHED','Barrido devuelve0 y no agrega otro envio; adapters prueba condicion de elegibilidad temporal.'),
('AC4.1.3','src/telemetry/handlers.test.ts','logs de validacion,persistencia y publicacion conservan correlacion sin cuerpo ni credenciales','VALIDATION_ERROR/CommitFailed/SqsUncertain y correlacion; exclusiones de claves,cuerpo yvehicleId privado.'),
('AC4.1.4','src/telemetry/adapters.test.ts','propietario vencido no confirma y dos reclamantes no obtienen posesion simultanea','Promise.all produce un ganador; token/lease condicionan confirmacion.'),
('NFR1.2','src/telemetry/service.test.ts','timeout de publicacion conserva aceptacion durable y PENDING sin marcar','AbortSignal efectivo,202logico,estadoPENDING y ninguna confirmacion indebida.'),
('NFR2.1','tests/integration/telemetry-flow.test.ts','barrera de commit impide respuesta202 antes de escritura conjunta','Antes de release:0filas/sin respuesta; despues:2filas/202.'),
('NFR3.2','tests/integration/telemetry-flow.test.ts','fallo before/during/after del commit nunca deja estado parcial ni202 falso','Resultado incierto despues del commit se confirma coherentemente; no exitos nuevos sin persistencia.'),
('NFR3.4','src/telemetry/adapters.test.ts','lease vencido vuelve a ser reclamable y el propietario anterior no confirma','Un arrendamiento vivo impide otra posesion; vencido permite nuevo token; antiguo falla y vigente confirma.'),
('NFR4.3','src/telemetry/service.test.ts','SQS confirmado seguido de fallo al marcar conserva identidad y recuperacion','Se elimina mapa de eventos y se publica nuevamente desde Outbox con identidad/datos completos.')]
followup={'unit':'u2-telemetry-operations','historical_source':'construction/u1-telemetry-core/code-generation/traceability.json','scope':'Assertions locales nuevas; historicoU1 preservado y verificacionAWS real pendiente.','rows':[{'id':i,'previous_status':'GAP','status':'OK','target':p,'case':case,'assertion':assertion,'evidence_status':'Local only'}for i,p,case,assertion in rows]}
(root/'evidence/u1-gap-follow-up.json').write_text(json.dumps(followup,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
md='# Seguimiento de las16 brechas historicasU1\n\n## Evidencia local de U2\n\nEl archivo historicoU1 permanece intacto. OK significa assertion local ejecutada; no acredita AWSdesplegado ni SLOreales. Los nombres siguientes describen las assertions efectivas de los casos, incluidos sus casos parametrizados.\n\n| ID | Estado nuevo | Archivo/caso | Assertion concreta |\n|---|---|---|---|\n'
for i,p,case,assertion in rows:md+=f'|{i}|OK local|`{p}`: {case}|{assertion}|\n'
md+='\n## Limites\n\nSe usan clientes/relojes/estadoAWS simulados. P95, disponibilidad real, denegacionIAM, CloudTrail y cuotas anteriores a Lambda siguen Unverified. No se modifica el resumen ni trazabilidad historicosU1.\n'
(root/'evidence/u1-gap-follow-up.md').write_text(md,encoding='utf-8')
# Preserve the assigned element set while replacing the previous overclaims.
trace=json.loads((root/'traceability.json').read_text(encoding='utf-8-sig'))
assigned=list(trace['upstream_ids'])
def target_for(i):
 if i.startswith('AC1.2'):return 'src/telemetry/handlers.test.ts'
 if i.startswith('AC4.2'):return 'src/telemetry/manual-recovery.test.ts'
 if i in ['AC5.1.3','AC5.1.5','NFR3.5','BR8.3']:return 'src/telemetry/availability.test.ts'
 if i in ['AC5.1.4','NFR4.4','BR8.4']:return 'src/telemetry/adapters.test.ts'
 if i.startswith('AC5.2') or i.startswith('NFR7.') or i.startswith('BR9.'):return 'src/telemetry/observability.test.ts' if i.endswith('.1') or i in ['NFR7.6','NFR7.7','BR9.1'] else 'infra/telemetry-stack-operations.test.ts'
 if i.startswith('NFR5.') or i.startswith('BR7.'):return 'src/telemetry/manual-recovery.test.ts'
 if i.startswith('NFR9.'):return 'src/telemetry/manual-recovery.test.ts' if i in ['NFR9.7','NFR9.8','NFR9.11'] else 'infra/telemetry-stack-operations.test.ts'
 if i.startswith('BR6.'):return 'src/telemetry/handlers.test.ts'
 if i in ['NFR3.6','NFR3.7']:return 'tests/integration/telemetry-operations.test.ts'
 return 'tests/integration/telemetry-flow.test.ts'
external={
'AC1.2.4':'RechazoAPI key antes de invocarLambda requiere cuentaAWS.',
'AC1.2.5':'Tasa/rafaga/cuota reales por clave requieren API Gateway desplegado.',
'AC4.2.2':'Alcancevacio probado; denegacionIAM real y actor efectivo pendientes.',
'AC4.2.3':'Conteos/IDs distintos probados; enlaceCloudTrail a identidad real pendiente.',
'AC5.1.1':'P95<=500ms a100solicitudes validas/s requiere stagingreal.',
'AC5.1.2':'Commit/202 local probado; >=99%antes30s requiere cohorte real.',
'AC5.1.5':'Formula sintetica probada; disponibilidad>=99.9% requiere mes real completo.',
'AC5.2.2':'Series/configuracion comprobadas; activacionAWS real pendiente.',
'AC5.2.4':'Correlaciones locales; investigacion/roles/logs desplegados pendientes.',
'NFR1.4':'Carga y percentiles reales pendientes.',
'NFR1.5':'Usage plan local; limite exacto real por clave no acreditado.',
'NFR1.6':'Lambda clasifica su poblacion; cuota/4xx preLambda requieren datosGateway.',
'NFR2.4':'Causalidad local probada; cohorte>=99%antes30s pendiente.',
'NFR3.5':'Mes calendario sintetico validaformula, no mes observado.',
'NFR5.6':'PoliticaP3 acotada y AccessDenied simulado; IAMreal pendiente.',
'NFR5.8':'Identificadores plataforma probados; identidad efectivaCloudTrail pendiente.',
'NFR7.10':'Busqueda/acceso restringido real pendiente.',
'NFR9.9':'Capacidad mixta100RPS y ausencia de interferencia requiere staging.',
'NFR10.3':'SelectorInvoke local; eventos/identidad/retencion reales pendientes.',
'BR6.4':'ControlAPI key/cuota real antesLambda pendiente.',
'BR7.1':'AutorizacionIAM real pendiente; actorpayload nunca autoriza.',
'BR8.1':'P95real a100RPS pendiente.',
'BR8.2':'100%causalidad local probado; indicador>=99%real pendiente.',
}
coverage=[]
for i in assigned:
 coverage.append({'id':i,'status':'Deferred' if i in external else 'OK','target':target_for(i),'evidence_status':'Unverified' if i in external else 'Local only','assertion_evidence':external.get(i,'Mecanismo/assertions locales: consultar evidence/criterion-evidence.md y los casos del archivo destino.')})
for i,p,case,assertion in rows:
 if i not in assigned:assigned.append(i);coverage.append({'id':i,'status':'OK','target':p,'case':case,'assertion_evidence':assertion,'evidence_status':'Local only'})
frs={'FR1.1':'infra/telemetry-stack.test.ts','FR1.2':'src/telemetry/handlers.test.ts','FR1.3':'src/telemetry/handlers.test.ts','FR1.4':'src/telemetry/handlers.test.ts','FR1.5':'src/telemetry/handlers.test.ts','FR1.6':'tests/integration/telemetry-flow.test.ts','FR2.1':'infra/telemetry-stack.test.ts','FR2.2':'infra/telemetry-stack.test.ts','FR3.1':'infra/telemetry-stack.test.ts','FR3.2':'src/telemetry/handlers.test.ts','FR4.1':'tests/integration/telemetry-flow.test.ts','FR4.2':'tests/integration/telemetry-flow.test.ts','FR4.3':'tests/integration/telemetry-flow.test.ts','FR4.4':'tests/integration/telemetry-flow.test.ts','FR5.1':'src/telemetry/service.test.ts','FR5.2':'src/telemetry/service.test.ts','FR5.3':'tests/integration/telemetry-flow.test.ts','FR5.4':'src/telemetry/service.test.ts','FR6.1':'tests/integration/telemetry-operations.test.ts','FR6.2':'src/telemetry/service.test.ts','FR6.3':'src/telemetry/handlers.test.ts'}
for i,p in frs.items():
 assigned.append(i);coverage.append({'id':i,'status':'Deferred' if i in ['FR2.1','FR2.2'] else 'OK','target':p,'evidence_status':'Unverified' if i in ['FR2.1','FR2.2'] else 'Local only','assertion_evidence':'Configuracion/flujo/assertions locales; controlGateway real pendiente.' if i in ['FR2.1','FR2.2'] else 'CasosBVA,causalidad/atomicidad,identidad,recuperacion y mensajes/logs concretos; evidencia local, noAWSreal.'})
for n in range(1,11):
 i=f'NFR{n}';assigned.append(i);coverage.append({'id':i,'status':'Deferred','target':'Verificacion integralAWS/CI/SLO pendiente; consultar NFR detallados y evidence/criterion-evidence.md.','evidence_status':'Unverified'})
trace={'stage':'code-generation','unit':'u2-telemetry-operations','upstream_ids':assigned,'coverage':coverage,'evidence':'evidence/check-results.json','u1_gap_follow_up':'evidence/u1-gap-follow-up.json','known_pending_findings':['F1 (U3)','F7: controlesCI y comprobaciones externas pendientes']}
(root/'traceability.json').write_text(json.dumps(trace,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
paths=['src/telemetry/adapters.ts','src/telemetry/adapters.test.ts','src/telemetry/service.ts','src/telemetry/service.test.ts','src/telemetry/handlers.ts','src/telemetry/handlers.test.ts','src/telemetry/handlers-operations.test.ts','src/telemetry/manual-recovery.ts','src/telemetry/manual-recovery.test.ts','src/telemetry/recovery-preview.ts','src/telemetry/recovery-preview.test.ts','src/telemetry/observability.ts','src/telemetry/observability.test.ts','src/telemetry/availability.ts','src/telemetry/availability.test.ts','src/telemetry/operations-cli.test.ts','bin/telemetry-operations.ts','infra/telemetry-stack.ts','infra/telemetry-stack-operations.test.ts','tests/integration/telemetry-flow.test.ts','tests/integration/telemetry-operations.test.ts','package.json','package-lock.json','README.md','cdk.out/']
manifest={'stage':'code-generation','unit':'u2-telemetry-operations','version':1,'writes':[{'path':p}for p in paths]}
(root/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
plan=root/'code-generation-plan.md';text=plan.read_text(encoding='utf-8-sig')
for step in range(1,15):text=text.replace(f'- [ ] **Step {step} ',f'- [x] **Step {step} ')
plan.write_text(text,encoding='utf-8')
