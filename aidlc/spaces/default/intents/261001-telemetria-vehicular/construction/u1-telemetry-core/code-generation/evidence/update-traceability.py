import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
path = root / 'traceability.json'
data = json.loads(path.read_text(encoding='utf-8-sig'))
deferred = {
    'AC1.1.4': 'Unverified: p95 ≤500 ms a 100 solicitudes válidas/s requiere staging real.',
    'AC1.1.5': 'Unverified: rechazo de ruta en API Gateway sin invocar Lambda requiere prueba desplegada; handler local solo acredita 404.',
    'AC2.1.3': 'F5/F7: conflicto local comprobado; métrica/correlación completa pendiente en U2.',
    'AC6.1.1': 'Unverified: plantilla local comprobada; falta despliegue en cuenta preparada.',
    'AC6.1.2': 'Unverified: KMS/TLS y permisos locales parciales; falta inspección negativa de recursos desplegados.',
    'AC6.1.3': 'Unverified: falta despliegue reproducible en segunda cuenta preparada.',
    'AC6.1.4': 'Unverified: integración simulada y topología local; falta walking skeleton desplegado.',
    'NFR1.1': 'Unverified: carga y p95 reales en staging pendientes.',
    'NFR1.3': 'Unverified: capacidad bajo perfil 100/s y ráfaga 200 requiere staging.',
    'NFR2.2': 'Unverified: ≥99 % persistido antes de 30 s requiere carga real correlacionada.',
    'NFR2.3': 'Unverified: capacidad mixta HTTP/EventBridge y ausencia de backlog creciente requieren carga real.',
    'NFR3.1': 'Unverified: disponibilidad ≥99,9 % requiere mes calendario completo, incluido mantenimiento.',
    'NFR4.2': 'F2/F3/F7: elegibilidad eventual documentada; supervisión efectiva TTL pendiente U2 y cuenta real.',
    'NFR5.1': 'Unverified: ApiKeyRequired local; falta rechazo real sin invocar Lambda.',
    'NFR5.2': 'Unverified: plantilla KMS/TLS local; falta inspección y rechazo TLS desplegados.',
    'NFR5.3': 'F3/F7: permisos U1 inspeccionados; GSI TTL operativo y pruebas negativas pendientes U2 y cuenta real.',
    'NFR5.4': 'Unverified: restricción/auditoría de acceso humano y prueba completa de no divulgación pendientes.',
    'NFR7.1': 'F5/F7: logs locales parciales; no cubren cada camino requerido.',
    'NFR7.2': 'F2/F5/F7: contadores completos y series efectivas pendientes U2.',
    'NFR7.3': 'F2/F3/F5/F7: alarmas y señales efectivas PENDING/TTL pendientes U2 y cuenta real.',
    'NFR7.4': 'Unverified: búsqueda correlacionada y acceso restringido a trazas requieren cuenta real.',
    'NFR7.5': 'F5/F7: panel y definiciones SLI completos pendientes U2; resultados reales Unverified.',
    'NFR8.1': 'F1/F7: checks locales verdes; CI obligatorio, audit y secretos pendientes U3.',
    'NFR9.2': 'Unverified: síntesis local ejecutada; comparación/despliegue en dos cuentas pendientes.',
    'NFR10.1': 'Unverified: trail local definido; consultas de cambios reales pendientes.',
    'NFR10.2': 'Unverified: KMS/retención local; prueba negativa de borrado real pendiente U3.',
}
gaps = {
    'AC1.1.3': 'F7: modelo prueba varios límites, pero no todos (p. ej. speed=0); matriz completa pendiente.',
    'AC2.1.2': 'F7: duplicado secuencial cubierto; falta prueba de solicitudes simultáneas.',
    'AC2.1.4': 'F7: se verifica forma de transacción y fallo de save, sin interrupción/atomicidad de tablas simulada.',
    'AC3.1.1': 'F7: 19,99 crea PENDING; value=0 solo se valida, sin assertion de salida.',
    'AC3.1.3': 'F7: falta assertion de ausencia de Outbox/SQS para temperature y speed.',
    'AC3.1.4': 'F7: falta assertion de los seis campos completos de alerta y atributo correlationId.',
    'AC3.1.6': 'F7: falta escenario de eventos de batería fuera de orden.',
    'AC3.2.4': 'F7: falta escenario SQS confirmado seguido de fallo al marcar PUBLISHED y reentrega.',
    'AC4.1.1': 'F7: integración recupera PENDING, sin candidata PUBLISHED para demostrar exclusión.',
    'AC4.1.3': 'F5/F7: no hay assertions completas de logs/secretos para los tres tipos de fallo.',
    'AC4.1.4': 'F7: condition/token inspeccionados; falta carrera concurrente con dos invocaciones.',
    'NFR1.2': 'F7: timeout de 150 ms implementado; falta test de agotamiento y 202/PENDING.',
    'NFR2.1': 'F7: código espera save y el recorrido final está verde; falta barrera antes/después de commit.',
    'NFR3.2': 'F7: fallo de persistencia cubierto parcialmente; falta commit incierto y atomicidad simulada.',
    'NFR3.4': 'F7: condiciones y tokens inspeccionados; falta vencimiento/propietario antiguo y concurrencia.',
    'NFR4.3': 'F7: Outbox tiene datos independientes; falta publicar tras eliminar evento de prueba.',
}
for item in data['coverage']:
    key = item['id']
    if key in deferred:
        item.update(status='Deferred', target=deferred[key], evidence_status='Unverified')
    elif key in gaps:
        item.update(status='GAP', target=gaps[key], evidence_status='Unverified')
    elif item['status'] == 'OK':
        item['evidence_status'] = 'Local only'
        item['note'] = 'Vínculo a implementación/assertions existentes; no acredita AWS desplegado ni objetivos externos.'
data['evidence'] = 'evidence/revalidation-results.json'
direct_targets = {
    'FR1.1': 'infra/telemetry-stack.ts', 'FR1.2': 'src/telemetry/model.ts',
    'FR1.3': 'src/telemetry/model.ts', 'FR1.4': 'src/telemetry/model.ts',
    'FR1.5': 'src/telemetry/model.ts', 'FR1.6': 'src/telemetry/handlers.ts',
    'FR2.1': 'infra/telemetry-stack.ts', 'FR2.2': 'infra/telemetry-stack.ts',
    'FR3.1': 'infra/telemetry-stack.ts', 'FR3.2': 'src/telemetry/handlers.ts',
    'FR4.1': 'src/telemetry/adapters.ts', 'FR4.2': 'src/telemetry/adapters.ts',
    'FR4.3': 'src/telemetry/adapters.ts', 'FR4.4': 'src/telemetry/service.ts',
    'FR5.1': 'src/telemetry/model.ts', 'FR5.2': 'src/telemetry/model.ts',
    'FR5.3': 'tests/integration/telemetry-flow.test.ts', 'FR5.4': 'src/telemetry/service.ts',
    'FR6.1': 'src/telemetry/service.ts', 'FR6.2': 'src/telemetry/service.ts',
}
for key, target in direct_targets.items():
    if key not in data['upstream_ids']:
        data['upstream_ids'].append(key)
        data['coverage'].append({'id': key, 'status': 'OK', 'target': target,
            'evidence_status': 'Local only',
            'note': 'Implementación inspeccionada; cobertura parcial de assertions se detalla en los AC/NFR y evidencia. No acredita ejecución AWS real.'})
if 'FR6.3' not in data['upstream_ids']:
    data['upstream_ids'].append('FR6.3')
    data['coverage'].append({'id':'FR6.3','status':'Deferred',
        'target':'F5/F7: registro completo de validación, persistencia y publicación pendiente U2.',
        'evidence_status':'Unverified'})
for key in ['NFR' + str(n) for n in range(1,11)]:
    if key not in data['upstream_ids']:
        data['upstream_ids'].append(key)
        data['coverage'].append({'id':key,'status':'Deferred',
            'target':'Verificación integral pendiente: consultar NFR detallados y F1–F7; checks locales no acreditan carga, operación, CI ni AWS desplegado.',
            'evidence_status':'Unverified'})
data['known_pending_findings'] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7']
data['scope_note'] = 'Revalidación sin cambios de aplicación. GAP describe assertions ausentes, no un defecto nuevo demostrado. Deferred conserva obligaciones futuras; Unverified es estado de evidencia, no status JSON.'
path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
