import fs from 'node:fs';
import path from 'node:path';

const record = 'aidlc/spaces/default/intents/261001-telemetria-vehicular';
const output = `${record}/construction/build-and-test`;
const units = ['u1-telemetry-core', 'u2-telemetry-operations', 'u3-delivery-controls'];
const read = p => fs.readFileSync(p, 'utf8');
const write = (name, body) => fs.writeFileSync(`${output}/${name}`, body, 'utf8');
const cell = s => String(s).replaceAll('|', '\\|').replaceAll('\n', '<br>');
const targets = new Map();
for (const unit of units) {
  for (const stage of ['nfr-requirements', 'nfr-design']) {
    const dir = `${record}/construction/${unit}/${stage}`;
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith('.md') || file === 'memory.md') continue;
      const source = `${dir}/${file}`;
      let section = '';
      for (const line of read(source).split(/\r?\n/)) {
        if (line.startsWith('## ')) section = line.slice(3);
        const match = line.match(/^\|\s*(NFR\d+\.\d+)\s*\|\s*(.*?)\s*\|/);
        if (!match) continue;
        const id = `${unit}:${match[1]}`;
        const target = targets.get(id) ?? { id, unit, requirement: match[1], expected: [], sources: [] };
        target.sources.push(`${source}#${section || 'tabla de objetivos'}`);
        target.expected.push(match[2]);
        targets.set(id, target);
      }
    }
  }
  targets.set(`${unit}:testing-contract`, {
    id: `${unit}:testing-contract`, unit, requirement: 'Testing Contract',
    sources: [`${record}/construction/${unit}/code-generation/code-generation-plan.md#Testing Contract`, `${record}/construction/${unit}/code-generation/unit-test-instructions.md`],
    expected: ['test-after; una prueba verificable por requisito al nivel efectivo; caso feliz por componente; suite existente verde; integración crítica AWS simulada; sin porcentaje de cobertura impuesto.'],
  });
}
const add = (id, source, expected, owner) => targets.set(id, { id, sources: [source], expected: [expected], owner });
const requirements = read(`${record}/inception/requirements-analysis/requirements.md`);
for (const m of requirements.matchAll(/^- \*\*(NFR\d+) — (.*?)\*\* (.*)$/gm))
  add(m[1], `${record}/inception/requirements-analysis/requirements.md#${m[1]}`, `${m[2]} ${m[3]}`, undefined);
add('u1:reliability-design:restore', `${record}/construction/u1-telemetry-core/nfr-design/reliability-design.md#Reversión y protección de datos`, 'Restauración de tablas comprobada en entorno aislado antes de producción.', 'deployment-execution');
add('u3:security-design:immutable-artifact', `${record}/construction/u3-delivery-controls/nfr-design/security-design.md#NFR8 — Puertas de calidad`, 'Producción promueve el mismo digest validado y desplegado en staging sin reconstruir.', 'deployment-pipeline');
add('u2:observability-design:dashboard', `${record}/construction/u2-telemetry-operations/nfr-design/observability-design.md#Instrumentación`, 'Dashboard de p95, durable <30s, disponibilidad mensual completa, backlog, TTL y fallos, con fórmulas y denominadores visibles.', 'observability-setup');
add('u2:security-design:actor', `${record}/construction/u2-telemetry-operations/nfr-design/security-design.md#Autorización de recuperación`, 'Evidencia de actor efectivo, operación, confirmación, correlación y resumen; denegación IAM comprobada.', 'observability-setup');

const commandSources = new Map();
const codeDirs = fs.readdirSync(`${record}/construction`).filter(name => fs.existsSync(`${record}/construction/${name}/code-generation/unit-test-instructions.md`));
for (const unit of codeDirs) {
  const source = `${record}/construction/${unit}/code-generation/unit-test-instructions.md`;
  for (const match of read(source).matchAll(/`((?:npm |npx )[^`\n]+)`/g)) {
    if (!/vitest run|npm run test:/.test(match[1])) continue;
    const sources = commandSources.get(match[1]) ?? [];
    sources.push(source);
    commandSources.set(match[1], sources);
  }
}
for (const command of ['npm run build', 'npm run typecheck', 'npm run lint', 'npm run format:check', 'npm run test:unit', 'npm run test:integration', 'npm run audit:deps', 'npm run cdk:synth']) {
  if (!commandSources.has(command)) commandSources.set(command, ['package.json / contrato de pruebas']);
}
write('command-inventory.json', JSON.stringify([...commandSources].map(([command, sources], index) => ({ id: `check-${String(index + 1).padStart(2, '0')}`, command, sources })), null, 2) + '\n');
write('target-inventory.json', JSON.stringify([...targets.values()], null, 2) + '\n');
write('build-instructions.md', `# Instrucciones de compilación\n\n## Dependencias y entorno\n\nEn checkout nuevo, ejecutar npm ci con package-lock.json versionado. En esta ejecución se conserva la instalación existente: Node v26.7.0, npm 12.0.2, Bun 1.4.2. Revisar package.json, tsconfig.json, vitest.config.ts y cdk.json. Las comprobaciones locales no requieren servicios ni credenciales AWS; no cargar claves persistentes.\n\n## Comandos y verificación\n\nEjecutar npm run build, npm run typecheck, npm run lint, npm run format:check y npm run cdk:synth. tsc produce dist/; CDK empaqueta la Lambda y produce cdk.out/. Guardar exit code y salida bajo evidence/. Ejecutar cada comando exacto de command-inventory.json una sola vez en esta etapa.\n\n## Diagnóstico\n\nAnte dependencia ausente, usar npm ci y conservar el lockfile. Ante formato o configuración fallida, leer la salida y aplicar solo una corrección justificada (máximo dos intentos internos). Un defecto de código/pruebas requiere el procedimiento de retorno a Code Generation. No desplegar durante una prueba local.\n\n## Sources\n\n${units.map(u => '- ' + record + '/construction/' + u + '/code-generation/code-generation-plan.md').join('\n')}\n`);
write('integration-test-instructions.md', `# Integración crítica\n\n## Configuración y datos\n\nVitest existente; AWS simulado con relojes/IDs únicos y estado por prueba. Sin contacto AWS ni datos reales. La integración adicional en Minimal responde al Testing Contract explícito.\n\n## Ejecución y alcance\n\nLos comandos exactos están en command-inventory.json: integración U1, U2 y suite completa, deduplicados por texto. npm run test:integration incluye todo tests/integration incluso con argumento de archivo añadido; informar las dos pruebas sin sumar ejecuciones repetidas como cobertura nueva. Comprobar HTTP, commit atómico, 400 sin efectos, 202 después de commit, SQS incierta, identidad alertId y EventBridge; preview/confirmación manual y operación parcial.\n\n## Cobertura y límites\n\nUna prueba verificable por requisito y camino feliz por componente; sin porcentaje numérico. Leer assertions, no inferir cobertura de un exit 0. CDK comprueba configuración; no acredita denegación IAM ni cuotas reales.\n\n## Sources\n\n${units.map(u => '- ' + record + '/construction/' + u + '/code-generation/unit-test-instructions.md').join('\n')}\n`);
write('performance-test-instructions.md', `# Rendimiento, disponibilidad y retención\n\n## Perfil y entorno\n\nRequiere staging desplegado y clave sintética de productor, endpoint y permisos de lectura de evidencia. No se dispone aquí de endpoint/cuenta. performance-validation está programada y conserva la titularidad de las mediciones; el objetivo permanece Unverified hasta recibir evidencia real.\n\n## Método reproducible\n\nGenerar IDs globalmente únicos a 100 solicitudes válidas/s sostenidas, documentar duración, mezcla battery/temperature/speed y porcentaje batería <20; medir reloj monotónico de cliente, p50/p95/p99, tasa efectiva, 202/4xx/5xx y cuotas por separado. Ejecutar también carga concurrente EventBridge/recuperación manual con backlog controlado. Conciliar recepción, commit y respuesta por correlación: 100% de 202 tras commit y ≥99% durable en <30s, p95 ≤500ms. No usar las latencias de Vitest como resultado de staging. El runner de carga se configura cuando exista endpoint; no hay comando ejecutable inventado.\n\n## Disponibilidad y TTL\n\nConservar sondas de todos los minutos de un mes calendario, mantenimiento incluido; disponibilidad ≥99.9%. Datos sintéticos comprueban solo fórmula. Verificar expiresAt=acceptedAt+7776000 segundos; TTL habilitado y borrado eventual sin plazo físico propio. No acelerar el reloj para afirmar cumplimiento mensual. Restauración aislada se verifica antes de producción en deployment-execution.\n\n## Evidencia y cobertura\n\nGuardar configuración, perfil, distribución de latencias, población correlacionada, errores y export de sondas bajo operation/performance-validation/. Objetivos con staging siguen Unverified y hacen fallar Build and Test según su protocolo aunque tengan dueño posterior.\n\n## Sources\n\nconstruction/u1-telemetry-core/nfr-requirements/performance-requirements.md; construction/u2-telemetry-operations/nfr-requirements/performance-requirements.md; ambos reliability-requirements.md y nfr-design/.\n`);
write('security-test-instructions.md', `# Seguridad y controles de entrega\n\n## Verificaciones locales\n\nEjecutar npm run audit:deps (umbral high, producción según script aprobado), lint, tipos y todas las pruebas CDK del inventario. Ejecutar Gitleaks v8.30.1 obtenido de su release oficial y verificar SHA256 contra checksums.txt antes de ejecutarlo: gitleaks detect --source . --redact (historial) y gitleaks dir . --redact (árbol actual). Capturar solo salida redactada, nunca tokens. Los informes pueden contener rutas sensibles y se conservan restringidos a esta revisión.\n\n## Fronteras externas\n\nCI Pipeline debe implementar GitHub Actions, checks obligatorios, revisión/squash y test negativo de PR fallido. deployment-pipeline/environment-provisioning/deployment-execution verifican OIDC repo/ref/environment/audience, sesiones temporales, roles separados, aprobación producción y mismo digest. Verificar CloudTrail mediante creación/cambio/eliminación autorizados con identidad, acción, recurso y fecha. Solo síntesis local disponible aquí; no inferir aplicación real.\n\n## Casos IAM y alarmas\n\nComprobar que Lambda puede Query de ambos GSI necesarios y que alarmas usan exactamente Namespace/Dimensions/Units emitidos. Probar actor P3 válido e identidad no autorizada en cuenta preparada, sin permisos para datos o auditoría. Activar cada alarma y verificar canal de guardia real en observability-setup.\n\n## Fuentes\n\n- https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1\n- construction/u3-delivery-controls/nfr-requirements/security-requirements.md y nfr-design/security-design.md\n- construction/u1-telemetry-core/nfr-requirements/security-requirements.md\n- construction/u2-telemetry-operations/nfr-requirements/security-requirements.md\n`);
const matrix = '| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |\n|---|---|---|---|---|---|---|\n' + [...targets.values()].map(t => `| ${cell(t.id)} | ${cell(t.sources.join('; '))} | ${cell(t.expected.join('; '))} | Pending | Pending | ${t.owner ?? 'build-and-test / según entorno'} | Pending |`).join('\n');
write('build-and-test-summary.md', `# Resumen de Build and Test\n\n## Estado inicial y requisitos\n\nEjecución local preparada; evaluación en curso. Inventario completo en target-inventory.json; IDs detallados se prefijan por unidad porque U1 y U3 reutilizan IDs con significados diferentes.\n\n## Tipos de prueba y cobertura\n\nUnitarias por capa, integración crítica, assertions CDK, calidad de código, dependencias y secretos. Instrucciones de rendimiento/seguridad adicionales justificadas por objetivos explícitos aunque la estrategia sea Minimal. Sin piso porcentual de cobertura.\n\n## Target Verification Matrix\n\n${matrix}\n\n## Preparación y límites\n\nNo se declara listo para despliegue. Los objetivos reales requieren staging, cuenta AWS y configuración GitHub. El directorio histórico telemetry-backend documenta topología retirada (SQS entrada/DLQ/tres Lambdas): leído, no se aplica a la topología aprobada U1/U2/U3. Sus comandos ejecutables sí se incluyen por la regla de recopilación de Step 9. Las fuentes stage-level nfr-* contienen únicamente diario gestionado, no objetivos adicionales.\n`);
console.log(JSON.stringify({ targets: targets.size, commands: commandSources.size, output }));
