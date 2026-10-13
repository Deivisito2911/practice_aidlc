import fs from 'node:fs';
const record = 'aidlc/spaces/default/intents/261001-telemetria-vehicular';
const dir = `${record}/construction/build-and-test`;
const units = ['u1-telemetry-core', 'u2-telemetry-operations', 'u3-delivery-controls'];
const read = p => fs.readFileSync(p, 'utf8');
const write = (name, text) => fs.writeFileSync(`${dir}/${name}`, text, 'utf8');
const esc = s => String(s).replaceAll('|', '\\|').replaceAll('\n', '<br>');
const targets = JSON.parse(read(`${dir}/target-inventory.json`));
const results = JSON.parse(read(`${dir}/evidence/check-results.json`));
const failures = [
  { id: 'F1', target: 'NFR8.3 / dependencias', owner: 'u3-delivery-controls', actual: 'npm run audit:deps exit 1: aws-cdk-lib 2.272.0 incluye brace-expansion 5.0.9 afectado por tres advisories; la distribución oficial 2.273.0 incluye 5.0.12 corregido.', fix: 'Actualizar dependencia y lockfile a aws-cdk-lib 2.273.0; comprobar instalación limpia, audit y compatibilidad CDK.', effort: '30–90 min', risk: 'Bajo/medio: nueva versión CDK puede cambiar síntesis.' },
  { id: 'F2', target: 'NFR7.3 / NFR7.8 / NFR7.9', owner: 'u2-telemetry-operations', actual: 'EMF emite Dimensions=[[Service]], Service=TelemetryService; todas las Metric de VehicleTelemetry en el stack omiten esa dimensión. Alarmas consultan una serie distinta.', fix: 'Añadir dimensionsMap exacto y assertions por métrica; comprobar unidad Seconds en edad (hoy se emite Count).', effort: '1–2 h', risk: 'Bajo: configuración y formato EMF.' },
  { id: 'F3', target: 'NFR4.4 / NFR7.7', owner: 'u2-telemetry-operations', actual: 'ttlEligible consulta EventsTable/index/TtlByShard; el rol solo permite Query sobre OutboxTable/index/DueByShard. Falta el permiso mínimo al GSI TTL.', fix: 'Permitir Query solo en el ARN TtlByShard y comprobar enlace efectivo al rol con prueba negativa para otros recursos.', effort: '30–60 min', risk: 'Bajo: ampliación acotada y necesaria de Query.' },
  { id: 'F4', target: 'NFR7.9', owner: 'u2-telemetry-operations', actual: 'Alarma de errores usa GREATER_THAN_THRESHOLD con threshold=1; exactamente 1% no alerta aunque el objetivo exige ≥1%.', fix: 'Comparador >=1 y prueba en 100 requests / 1 error, bajo 100, y exclusión 4xx/cuotas del error de servicio.', effort: '30–60 min', risk: 'Bajo: corrige frontera acordada.' },
  { id: 'F5', target: 'NFR7.1 / NFR7.2 / NFR7.6 / NFR7.7 / NFR7.11', owner: 'u2-telemetry-operations', actual: 'HTTP emite solo HttpRequests/HttpServiceErrors sin status/correlación; no hay métricas completas de commit/SQS/conflicto ni medición recepción-a-commit. No hay dashboard, fórmula mensual ni su prueba sintética.', fix: 'Instrumentar señales por resultado y latencias sin payload/secretos; añadir dashboard/definiciones SLI y cálculo mensual puro probado con todos los minutos, incluido mantenimiento. Conservar objetivos reales Unverified.', effort: '4–8 h', risk: 'Medio: cambios de instrumentación en handler/servicio; comprobar regresión de ambos disparadores.' },
  { id: 'F6', target: 'NFR5.7 / NFR5.8 / operación manual', owner: 'u2-telemetry-operations', actual: 'Huella solo liga scope+IDs; no tiene caducidad ni liga límite. Handler manual no transmite remainingTime de Context y logs no contienen requestId para enlazar identidad IAM auditable. No hay pruebas de conjunto alterado/no autorizado/expirado/repetido ni backfill condicional.', fix: 'Completar contrato de preview con límite/tiempo de vigencia comprobable, presupuesto global y salida parcial; enlazar requestId con auditoría real de Invoke sin confiar en actor del payload; añadir los casos de frontera y regresiones del contrato operativo.', effort: '3–6 h', risk: 'Medio: cambia la solicitud CLI; actualizar CLI y pruebas conjuntamente, sin confiar en una identidad declarada por el cliente.' },
  { id: 'F7', target: 'Trazabilidad final / Testing Contract', owner: 'u2-telemetry-operations / u3-delivery-controls', actual: 'Los mapas actuales marcan como OK carga real, disponibilidad mensual y assertions inexistentes. Los IDs FR/NFR directos no tienen todos cobertura vigente. Una ruta existente no demuestra el objetivo.', fix: 'Corregir referencias/estados con evidencia real; mapear FR directos verificables y conservar GAP/Unverified para controles externos o pruebas aún ausentes. No alterar documentos históricos para aparentar cumplimiento.', effort: '1–2 h', risk: 'Bajo: corrección de evidencia; los GAP seguirán visibles.' },
];
write('findings.json', JSON.stringify(failures, null, 2) + '\n');
const evidenceLocal = 'evidence/check-results.json; evidence/check-01.log a check-19.log (salida/exit por comando)';
const met = new Set([
  'u1-telemetry-core:NFR2.1', 'u1-telemetry-core:NFR3.2', 'u1-telemetry-core:NFR3.3', 'u1-telemetry-core:NFR3.4',
  'u1-telemetry-core:NFR4.1', 'u1-telemetry-core:NFR4.3', 'u1-telemetry-core:NFR5.3', 'u1-telemetry-core:NFR5.5',
  'u1-telemetry-core:NFR9.1', 'u1-telemetry-core:NFR9.5', 'u1-telemetry-core:NFR9.6',
  'u2-telemetry-operations:NFR3.6', 'u2-telemetry-operations:NFR9.7', 'u2-telemetry-operations:NFR9.8',
  'u2-telemetry-operations:NFR9.10', 'u2-telemetry-operations:NFR9.11', 'u2-telemetry-operations:NFR9.12',
  'u3-delivery-controls:NFR5.2', 'u3-delivery-controls:NFR9.2', 'u3-delivery-controls:NFR10.2', 'u3-delivery-controls:NFR10.4', 'NFR5',
]);
const notMet = new Map([
  ['NFR4', 'F2/F3: configuración no puede emitir/alertar TTL como se exige.'], ['NFR7', 'F2/F4/F5: series, frontera y señales incompletas.'], ['NFR8', 'F1: auditoría high falla; CI obligatorio ausente.'],
  ['u1-telemetry-core:NFR7.1', 'F5: caminos 400/202 no registran status y correlación.'],
  ['u1-telemetry-core:NFR7.2', 'F5: contadores completos ausentes.'],
  ['u1-telemetry-core:NFR7.3', 'F2/F3: alarmas consultan dimensiones incorrectas y TTL carece de permiso.'],
  ['u1-telemetry-core:NFR7.5', 'F5: dashboard/SLI ausentes.'],
  ['u2-telemetry-operations:NFR4.4', 'F3: TTL GSI no autorizado.'],
  ['u2-telemetry-operations:NFR5.7', 'F6: preview sin caducidad ni vínculo de límite.'],
  ['u2-telemetry-operations:NFR5.8', 'F6: auditoría operacional no registra identidad consultable.'],
  ['u2-telemetry-operations:NFR7.6', 'F5/F6: correlación/cause incompletas.'],
  ['u2-telemetry-operations:NFR7.7', 'F2/F3/F5: unidades/serie/permisos incompletos.'],
  ['u2-telemetry-operations:NFR7.8', 'F2: dimensiones desalineadas. TTL cutoff >24h sí existe en adapter.'],
  ['u2-telemetry-operations:NFR7.9', 'F2/F4: series incorrectas y comparador >1%.'],
  ['u2-telemetry-operations:NFR7.11', 'F5: no existe cálculo mensual ni prueba sintética.'],
  ['u2:observability-design:dashboard', 'F5: no existe AWS::CloudWatch::Dashboard.'],
  ['u2:security-design:actor', 'F6: falta enlace requestId/Invoke consultable.'],
  ['u3-delivery-controls:NFR8.3', 'F1: vulnerabilidad high, exit 1.'],
]);
for (const t of targets) {
  const performance = /^NFR[123](?:\.|$)/.test(t.requirement ?? t.id) || /NFR9.9$/.test(t.id);
  const ci = /^NFR[68](?:\.|$)/.test(t.requirement ?? t.id);
  const observability = /^NFR7(?:\.|$)/.test(t.requirement ?? t.id);
  t.owner ??= performance ? 'performance-validation' : ci ? 'ci-pipeline / deployment-pipeline' : observability ? 'observability-setup' : 'deployment-execution';
  t.verdict = notMet.has(t.id) ? 'Not Met' : met.has(t.id) ? 'Met' : 'Unverified';
  t.actual = notMet.get(t.id) ?? (t.verdict === 'Met' ? 'Mecanismo/configuración y assertions locales comprobados; sin afirmar un resultado AWS desplegado.' : 'No hay evidencia completa del objetivo. Resultados locales parciales no sustituyen carga/mes, enforcement CI, IAM real o assertions faltantes.');
  t.evidence = t.verdict === 'Not Met' ? 'findings.json; infra/telemetry-stack.ts; src/telemetry/handlers.ts; src/telemetry/manual-recovery.ts; evidence/check-18.log' : t.verdict === 'Met' ? evidenceLocal : `${evidenceLocal}; evidencia pendiente en ${t.owner.startsWith('ci') ? 'construction/ci-pipeline/' : 'operation/' + t.owner.split(' / ')[0] + '/'}`;
  if (t.verdict === 'Met') t.owner = 'build-and-test';
}
const matrix = '| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |\n|---|---|---|---|---|---|---|\n' + targets.map(t => `| ${esc(t.id)} | ${esc(t.sources.join('; '))} | ${esc(t.expected.join('; '))} | ${esc(t.actual)} | ${esc(t.evidence)} | ${esc(t.owner)} | ${t.verdict} |`).join('\n');
write('target-verification.json', JSON.stringify(targets, null, 2) + '\n');
const counts = Object.fromEntries(['Met', 'Not Met', 'Unverified'].map(v => [v, targets.filter(t => t.verdict === v).length]));
const commandTable = '| Check | Comando | Exit | Evidencia |\n|---|---|---|---|\n' + results.map(r => `| ${r.id} | ${r.command} | ${r.exit} | ${r.evidence} |`).join('\n');
const diagnosis = 'Build and Test FAILED: 18/19 comandos del inventario pasan; audit:deps falla con una vulnerabilidad high. Dos scans Gitleaks pasan tras revisión documentada de 13 falsos positivos (hashes SHA256 de objetos CDK); informes originales redactados y exclusiones por fingerprint exacto conservados. Se aprobaron 49 pruebas distintas: 37 aplicación +10 CDK +2 integración. Las ejecuciones solapadas no suman casos nuevos.';
const findings = failures.map(f => `### ${f.id} — ${f.target}\n\n${f.actual}\n\nCorrección: ${f.fix} Responsable: ${f.owner}. Estimación: ${f.effort}; coste financiero: sin servicios adicionales para reparación local; riesgo: ${f.risk}`).join('\n\n');
const readiness = `## Preparación y límites\n\nCompilación local reproducible: sí. Pruebas existentes: verdes. Calidad completa/deployment-ready: no. Matriz: ${counts.Met} Met, ${counts['Not Met']} Not Met, ${counts.Unverified} Unverified. Los objetivos staging y el mes calendario siguen vigentes; su diferimiento no convierte esta etapa en exitosa. GitHub Actions está elegido, pero workflow, OIDC, protecciones y promoción no están implementados en esta entrega. Historial telemetry-backend se leyó como evidencia histórica de topología sustituida; sus comandos ejecutables se incluyeron, su SQS/DLQ no es una exigencia vigente. Se leyeron fuentes NFR Requirements/Design, los tres Testing Contracts actuales y todos los summaries/instructions.\n`;
write('build-and-test-summary.md', `# Resumen de Build and Test\n\n## Resultado\n\n${diagnosis}\n\n## Inventario de pruebas y cobertura\n\nMinimal/test-after, sin piso porcentual. Unitarias por capa, integración obligatoria AWS simulada, CDK, calidad, dependencias y secretos. Instrucciones adicionales de rendimiento y seguridad por objetivos expresos. Cobertura porcentual no solicitada ni medida. Testing Contract completo aún Unverified por pruebas/requisitos ausentes; una suite verde no acredita su cobertura.\n\n## Target Verification Matrix\n\n${matrix}\n\n${readiness}\n## Hallazgos y siguiente acción\n\n${findings}\n\nRetorno autónomo acotado a Code Generation para reparar código/configuración generada y dependencia vulnerable. No se aprueba esta ejecución fallida. Su protocolo exige nueva Plan Approval en el intento de reparación.\n`);
const existing = fs.existsSync(`${dir}/test-results.md`) ? read(`${dir}/test-results.md`) : '';
const oldLog = existing.includes('## Loop-Back Log') ? existing.slice(existing.indexOf('## Loop-Back Log')) : '';
const loopNumber = (oldLog.match(/^### Loop-back \d+/gm) ?? []).length + 1;
const log = oldLog || '## Loop-Back Log\n';
write('test-results.md', `# Resultados de Build and Test\n\n## Estado de ejecución\n\n${diagnosis}\n\nTotal único:49, aprobados:49, fallidos:0, omitidos:0. Hay un comando de seguridad fallido y objetivos no satisfechos/no verificados. Sin excepción de vulnerabilidad ni reducción de umbral. Gitleaks 8.30.1 SHA256 verificado d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e.\n\n## Comandos y salida\n\n${commandTable}\n\nVer evidence/gitleaks-history-reviewed.log, evidence/gitleaks-tree-reviewed.log, evidence/secret-finding-assessment.json y los dos informes redactados.\n\n## Fallos y clasificación\n\n${findings}\n\nNo procede consumir los dos intentos internos de Build and Test para cambiar versión/lógica: F1–F7 corresponden a código/enfoque/pruebas/evidencia de Code Generation. El falso positivo del scanner se diagnosticó y corrigió en un intento de configuración interna, manteniendo reglas activas. La reparación identificada es factible; no se descarta por esfuerzo. Estimación conjunta:1–3 jornadas; coste local adicional $0; riesgo medio por compatibilidad CDK e instrumentación/CLI. Coste AWS de validación posterior depende de cuenta/carga, aún desconocido.\n\n## Target Verification Matrix\n\n${matrix}\n\n${readiness}\n${log}\n### Loop-back ${loopNumber} — ${new Date().toISOString()}\n\n- Diagnosis: audit high fallido, defectos verificables de IAM/series/alarma/operación y trazabilidad; resultados reales ausentes.\n- Root-cause stage: code-generation (U2 lógica/IAM/observabilidad y U3 versión de dependencia; U1 conserva núcleo y se revalida).\n- Planned fix: F1–F7. Modify U2/U3; Keep núcleo U1; ajustar solo unidades/rutas diagnosticadas, conservar este registro y objetivos externos Unverified.\n- Estimated impact:1–3 jornadas, coste reparación local $0 adicional, riesgo medio. Nueva Plan Approval obligatoria y regresión completa relevante; sin despliegue ni excepción de vulnerabilidad.\n`);

const req = read(`${record}/inception/requirements-analysis/requirements.md`);
const stories = read(`${record}/inception/user-stories/stories.md`);
const ids = [...new Set([...req.matchAll(/\b((?:N?FR)\d+(?:\.\d+)?)(?![\d.])/g)].map(m => m[1]).concat([...stories.matchAll(/\b(AC\d+\.\d+\.\d+)\b/g)].map(m => m[1])))].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const ledgers = [];
for (const child of fs.readdirSync(`${record}/construction`)) {
  const file = `${record}/construction/${child}/code-generation/traceability.json`;
  if (!fs.existsSync(file)) continue;
  const ledger = JSON.parse(read(file));
  for (const entry of ledger.coverage ?? []) ledgers.push({ ...entry, unit: child, source: file, current: units.includes(child) });
}
const stageFile = `${record}/construction/code-generation/traceability.json`;
if (fs.existsSync(stageFile)) for (const e of JSON.parse(read(stageFile)).coverage ?? []) ledgers.push({ ...e, source: stageFile, unit: 'stage-level', current: true });
const coverage = ids.map(id => {
  const entries = ledgers.filter(e => e.id === id);
  const ok = entries.filter(e => e.current && e.status === 'OK' && typeof e.target === 'string' && fs.existsSync(e.target) && fs.statSync(e.target).isFile());
  return { id, status: ok.length ? 'OK' : 'GAP', targets: ok.map(e => `${e.unit}: ${e.target}`), reported: entries.map(e => `${e.unit} ${e.status}${e.current ? '' : ' (histórico)'}`) };
});
const gaps = coverage.filter(c => c.status === 'GAP');
write('cross-unit-traceability.json', JSON.stringify(coverage, null, 2) + '\n');
write('cross-unit-traceability.md', `# Trazabilidad final entre unidades\n\n## Veredicto\n\nFAIL: ${gaps.length}/${coverage.length} IDs sin cobertura OK vigente con archivo existente. Se enumeraron todos los FR, NFR directos y todos los AC de tres segmentos de las fuentes de Inception. Los mapas históricos de telemetry-backend fueron leídos pero no sirven para certificar la topología vigente; sus claims se muestran. La existencia de un destino no demuestra una medición real: los OK puramente estructurales quedan contrastados con la matriz y findings.json, que prevalecen para calidad.\n\n## Cobertura por ID\n\n| ID | Estado estructural vigente | Unidad/destino existente | Claims leídos |\n|---|---|---|---|\n${coverage.map(c => `| ${c.id} | ${c.status} | ${esc(c.targets.join('; ') || 'Sin target OK vigente')} | ${esc(c.reported.join('; ') || 'Sin entrada directa')} |`).join('\n')}\n\n## Elementos sin cubrir y límites semánticos\n\n${gaps.map(c => '- ' + c.id).join('\n')}\n\nNo se convirtió N/A/GAP en OK por tener un dueño posterior. AC1.1.4/AC5.1.1/AC5.1.2/AC5.1.5 no tienen evidencia staging/mes; AC5.1.3 tampoco tiene cálculo sintético probado; varios claims operativos remiten a pruebas que no contienen sus assertions (ver F2–F7). AC6.2.1/2/4 y AC6.3.1/2/3 requieren CI/AWS reales. Todos se conservan visibles en el resultado fallido.\n\n## Sources\n\n- inception/requirements-analysis/requirements.md\n- inception/user-stories/stories.md\n- construction/u1-telemetry-core/code-generation/traceability.json\n- construction/u2-telemetry-operations/code-generation/traceability.json\n- construction/u3-delivery-controls/code-generation/traceability.json\n- construction/telemetry-backend/code-generation/traceability.json (histórico)\n- build-and-test-summary.md; findings.json\n`);
console.log(JSON.stringify({ counts, coverage: coverage.length, structuralGaps: gaps.length, loopNumber, failedCommands: results.filter(r => r.exit !== 0).map(r => r.command) }));
