import fs from 'node:fs';

const record = 'aidlc/spaces/default/intents/261001-telemetria-vehicular';
const dir = `${record}/construction/build-and-test`;
const readJson = path => JSON.parse(fs.readFileSync(path, 'utf8'));
const write = (name, value) => fs.writeFileSync(`${dir}/${name}`, value, 'utf8');
const esc = value => String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
const u2 = `${record}/construction/u2-telemetry-operations/code-generation/evidence/final-check-results.json`;
const u3 = `${record}/construction/u3-delivery-controls/code-generation/evidence`;
const checks = readJson(`${u3}/commands.json`);
const scanner = readJson(`${u3}/scanner-final.json`);
if (!scanner.overall_pass || checks.some(c => ['npm ci', 'npm run audit:deps', 'npm audit --audit-level=high', 'npm run lint', 'npm run typecheck', 'npm run build', 'npm run cdk:synth'].includes(c.command) && c.exit !== 0)) {
  throw new Error('La evidencia local final no está verde');
}
const regression = checks.find(c => c.exit === 0 && c.command.includes('infra/telemetry-stack-delivery-controls.test.ts') && c.command.includes('tests/integration/telemetry-operations.test.ts'));
if (!regression || !regression.output.includes('Tests  159 passed')) throw new Error('Falta la regresión de 159 pruebas');

const prior = fs.existsSync(`${dir}/test-results.md`) ? fs.readFileSync(`${dir}/test-results.md`, 'utf8') : '';
const loopLog = prior.includes('## Loop-Back Log') ? prior.slice(prior.indexOf('## Loop-Back Log')) : '## Loop-Back Log\n';
const targets = readJson(`${dir}/target-inventory.json`);
const local = new Set([
  'u1-telemetry-core:NFR2.1', 'u1-telemetry-core:NFR3.2', 'u1-telemetry-core:NFR3.3', 'u1-telemetry-core:NFR3.4',
  'u1-telemetry-core:NFR4.1', 'u1-telemetry-core:NFR4.3', 'u1-telemetry-core:NFR5.3', 'u1-telemetry-core:NFR5.5',
  'u1-telemetry-core:NFR9.1', 'u1-telemetry-core:NFR9.3', 'u1-telemetry-core:NFR9.4', 'u1-telemetry-core:NFR9.5', 'u1-telemetry-core:NFR9.6', 'u1-telemetry-core:NFR8.1',
  'u1-telemetry-core:NFR7.1', 'u1-telemetry-core:NFR7.2',
  'u2-telemetry-operations:NFR3.6', 'u2-telemetry-operations:NFR3.7', 'u2-telemetry-operations:NFR4.4',
  'u2-telemetry-operations:NFR5.7', 'u2-telemetry-operations:NFR7.6', 'u2-telemetry-operations:NFR7.11',
  'u2-telemetry-operations:NFR9.7', 'u2-telemetry-operations:NFR9.8', 'u2-telemetry-operations:NFR9.10',
  'u2-telemetry-operations:NFR9.11', 'u2-telemetry-operations:NFR9.12',
  'u3-delivery-controls:NFR5.2', 'u3-delivery-controls:NFR5.3', 'u3-delivery-controls:NFR9.2',
  'u3-delivery-controls:NFR10.2', 'u3-delivery-controls:NFR10.4', 'NFR5',
]);
const absent = new Map([
  ['NFR8', 'La calidad local pasa; aún no hay workflow de GitHub Actions ni checks obligatorios sobre pull requests.'],
  ['u3-delivery-controls:NFR8.1', 'Formato/lint/tipos locales pasan; ejecución y bloqueo en CI pendientes.'],
  ['u3-delivery-controls:NFR8.2', 'Pruebas locales pasan; ejecución y bloqueo en CI pendientes.'],
  ['u3-delivery-controls:NFR8.3', 'Auditorías npm y Gitleaks locales pasan; ejecución y bloqueo en CI pendientes.'],
  ['u3-delivery-controls:NFR8.4', 'Protección de main, revisión y squash no están configurados ni verificados.'],
  ['u3-delivery-controls:NFR6.1', 'Federación OIDC real aún no configurada ni verificada.'],
]);
for (const t of targets) {
  const isLocal = local.has(t.id);
  const missing = absent.get(t.id);
  t.verdict = missing ? 'Not Met' : isLocal ? 'Met' : 'Unverified';
  t.actual = missing ?? (isLocal
    ? 'Implementación y prueba local vigentes; no representa un resultado de AWS/GitHub desplegado.'
    : 'Falta la comprobación en el entorno o la evidencia efectiva completa; las pruebas locales son parciales.');
  const requirement = t.requirement ?? t.id;
  const owner = t.owner ?? (/NFR[123](?:\.|$)/.test(requirement) || /NFR9\.9$/.test(t.id)
    ? 'performance-validation' : /NFR[68](?:\.|$)/.test(requirement)
      ? 'ci-pipeline / deployment-pipeline' : /NFR7(?:\.|$)/.test(requirement)
        ? 'observability-setup' : 'deployment-execution');
  t.owner = isLocal && !missing ? 'build-and-test' : owner;
  t.evidence = isLocal
    ? `${u2}; ${u3}/commands.json; ${u3}/scanner-final.json; tests/integration/telemetry-flow.test.ts`
    : missing
      ? `${u3}/commands.json; ${u3}/scanner-final.json; pendiente en ${owner}`
      : `Evidencia local: ${u2}; ${u3}/commands.json. Medición/enforcement pendiente en ${owner}.`;
}
const counts = Object.fromEntries(['Met', 'Not Met', 'Unverified'].map(v => [v, targets.filter(t => t.verdict === v).length]));
write('target-verification.json', JSON.stringify(targets, null, 2) + '\n');
const matrix = '| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |\n|---|---|---|---|---|---|---|\n' +
  targets.map(t => `| ${esc(t.id)} | ${esc(t.sources.join('; '))} | ${esc(t.expected.join('; '))} | ${esc(t.actual)} | ${esc(t.evidence)} | ${esc(t.owner)} | ${t.verdict} |`).join('\n');

const units = ['u1-telemetry-core', 'u2-telemetry-operations', 'u3-delivery-controls'];
const ledgers = [];
for (const unit of units) {
  const file = `${record}/construction/${unit}/code-generation/traceability.json`;
  for (const entry of readJson(file).coverage ?? []) ledgers.push({ ...entry, unit });
}
const req = fs.readFileSync(`${record}/inception/requirements-analysis/requirements.md`, 'utf8');
const stories = fs.readFileSync(`${record}/inception/user-stories/stories.md`, 'utf8');
const ids = [...new Set([
  ...[...req.matchAll(/\b((?:N?FR)\d+(?:\.\d+)?)(?![\d.])/g)].map(m => m[1]),
  ...[...stories.matchAll(/\b(AC\d+\.\d+\.\d+)\b/g)].map(m => m[1]),
])].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
const coverage = ids.map(id => {
  const entries = ledgers.filter(e => e.id === id);
  const ok = entries.filter(e => e.status === 'OK' && typeof e.target === 'string' && fs.existsSync(e.target) && fs.statSync(e.target).isFile());
  return { id, status: ok.length ? 'OK' : 'GAP', targets: ok.map(e => `${e.unit}: ${e.target}`), reported: entries.map(e => `${e.unit}: ${e.status}`) };
});
const gaps = coverage.filter(c => c.status === 'GAP');
write('cross-unit-traceability.json', JSON.stringify(coverage, null, 2) + '\n');
write('cross-unit-traceability.md', `# Trazabilidad final entre unidades\n\n## Veredicto\n\nFAIL: ${gaps.length}/${coverage.length} IDs sin un OK vigente con archivo existente. La presencia de archivo no acredita mediciones o controles externos; prevalece la matriz de verificación.\n\n## Cobertura por ID\n\n| ID | Estado | Unidad y archivo | Claims vigentes |\n|---|---|---|---|\n${coverage.map(c => `| ${c.id} | ${c.status} | ${esc(c.targets.join('; ') || 'Sin OK vigente')} | ${esc(c.reported.join('; ') || 'Sin entrada')} |`).join('\n')}\n\n## Brechas abiertas\n\n${gaps.map(c => `- ${c.id}`).join('\n')}\n\n## Fuentes\n\n- inception/requirements-analysis/requirements.md\n- inception/user-stories/stories.md\n- construction/u1-telemetry-core/code-generation/traceability.json\n- construction/u2-telemetry-operations/code-generation/traceability.json\n- construction/u3-delivery-controls/code-generation/traceability.json\n`);

const findings = [
  { id: 'F1–F6', status: 'resuelto localmente', actual: 'Correcciones U2/U3 y pruebas locales verificadas; falta confirmar su efecto en entornos reales.', evidence: `${u2}; ${u3}/commands.json; ${u3}/scanner-final.json` },
  { id: 'F7', status: 'abierto', target: 'Trazabilidad final', actual: `${gaps.length} de ${coverage.length} IDs aún carecen de OK vigente con archivo existente; incluye FR directos sin entrada y criterios que requieren evidencia externa.`, owner: 'code-generation / etapas de validación', fix: 'Completar los enlaces FR locales solo con pruebas existentes y mantener GAP para criterios reales hasta verificarlos en las etapas asignadas.', effort: '1–2 h para enlaces locales; plazo externo según F8/F9', cost: 'Sin coste local adicional; externo depende del entorno', risk: 'Bajo para documentación; alto si se etiqueta OK sin prueba.' },
  { id: 'F8', status: 'abierto', target: 'NFR6/NFR8 y AC de entrega', actual: 'No existen todavía workflow GitHub Actions, protección de main, OIDC real ni promoción de mismo digest.', owner: 'ci-pipeline / deployment-pipeline / environment-provisioning', fix: 'Implementar los controles en las etapas asignadas y verificar un PR fallido y uno verde.', effort: '1–3 jornadas más acceso al repositorio/cuentas', cost: 'Uso normal de CI y AWS; precio depende del entorno', risk: 'Medio: políticas OIDC/branch protection requieren validación en servicios reales.' },
  { id: 'F9', status: 'abierto', target: 'NFR1–4/NFR7/NFR10 y controles desplegados', actual: 'No hay staging, mes calendario, carga 100 RPS, CloudTrail real ni alarmas activadas como evidencia.', owner: 'deployment-execution / observability-setup / performance-validation', fix: 'Desplegar entorno preparado y ejecutar las pruebas/sondas especificadas con evidencia real.', effort: 'Días de validación más un mes para disponibilidad mensual', cost: 'AWS/CI según consumo y retención; sin cifra confirmada', risk: 'Medio/alto: depende de permisos, cuota, carga y datos de tiempo real.' },
];
write('findings.json', JSON.stringify(findings, null, 2) + '\n');
const status = `Build and Test FAILED por objetivos y trazabilidad sin cerrar: ${counts.Met} Met, ${counts['Not Met']} Not Met y ${counts.Unverified} Unverified; ${gaps.length} IDs sin OK vigente. La regresión local de 15 archivos/159 pruebas, integración 7/7, auditorías npm, formato, lint, tipos, build, síntesis y escaneos Gitleaks de aplicación/historial pasaron. F1–F6 tienen corrección local; F7 y los controles de CI, despliegue y mediciones reales siguen abiertos.`;
const note = `Se reutilizan las ejecuciones recientes del mismo árbol fuente de U2/U3, sin sumar ejecuciones solapadas como casos nuevos. Después de la última edición documental, U3 aislada pasó 5/5 y el escaneo final pasó. El checkpoint U3 repitió la integración crítica 7/7 con exit 0. Cada comando del inventario queda cubierto por la regresión conjunta o por una ejecución focal; no se repitió una suite verde sin cambios de fuente. La cobertura de tests no equivale a cumplimiento externo. El usuario eligió «Accept failure» el 2026-10-14 para conservar el fallo y continuar con las etapas que pueden producir la evidencia pendiente.`;
const findingsText = findings.filter(f => f.status === 'abierto').map(f => `### ${f.id} — ${f.target}\n\n${f.actual}\n\nCorrección: ${f.fix} Responsable: ${f.owner}. Impacto estimado: ${f.effort}; coste: ${f.cost}; riesgo: ${f.risk}`).join('\n\n');
const common = `## Inventario de pruebas y cobertura\n\nEstrategia Minimal y test-after; pruebas por capa, integración AWS simulada, assertions CDK, auditoría de dependencias y escaneo de secretos. No hay porcentaje numérico impuesto ni medido. ${note}\n\n## Target Verification Matrix\n\n${matrix}\n\n## Preparación y límites\n\nConstrucción local lista; entrega/despliegue no listos. ${findingsText}\n`;
write('build-and-test-summary.md', `# Resumen de Build and Test\n\n## Resultado\n\n${status}\n\n${common}`);
write('test-results.md', `# Resultados de Build and Test\n\n## Estado de ejecución\n\n${status}\n\n## Comandos y salida\n\nFuente verificable: ${u3}/commands.json (16 ejecuciones con exits y salidas, incluidas fallas iniciales corregidas), ${u3}/scanner-final.json (Gitleaks y fixtures), ${u2} (correcciones U2), y prueba de checkpoint U3. Total único de regresión: 159 aprobadas, 0 fallidas, 0 omitidas en 15 archivos. El último test U3: 5/5. npm ci/auditorías, formato, lint, tipos, build, CDK synth y escáner final: exit 0.\n\n${note}\n\n## Fallos y clasificación\n\n${findingsText}\n\nNo hay otra corrección identificable en una dimensión de Code Generation (versión, imagen, algoritmo o flag) que demuestre un mes de disponibilidad, carga real u OIDC/CI efectivo. Esos controles requieren etapas y acceso externos. No se relajan los objetivos.\n\n${common}\n${loopLog}`);
console.log(JSON.stringify({ counts, structuralGaps: gaps.length, coverage: coverage.length, scannerPass: scanner.overall_pass }));
