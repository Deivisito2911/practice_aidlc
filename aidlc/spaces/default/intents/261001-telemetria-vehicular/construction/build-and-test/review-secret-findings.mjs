import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
const dir = 'aidlc/spaces/default/intents/261001-telemetria-vehicular/construction/build-and-test/evidence';
const assessed = [];
for (const name of ['gitleaks-history-redacted.json', 'gitleaks-tree-redacted.json']) {
  for (const finding of JSON.parse(fs.readFileSync(`${dir}/${name}`, 'utf8'))) {
    const text = finding.Commit
      ? execFileSync('git', ['show', `${finding.Commit}:${finding.File}`], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
      : fs.readFileSync(finding.File, 'utf8');
    const line = text.split(/\r?\n/)[finding.StartLine - 1];
    const assetKeys = [...line.matchAll(/(?:objectKey|s3Key|S3Key)["']?\s*:\s*["']?([a-f0-9]{64}\.(?:zip|json))/gi)];
    const structuralAsset = assetKeys.length > 0 && /^((?:objectKey|s3Key|S3Key)["']?\s*:)/i.test(finding.Match);
    assessed.push({ file: finding.File, line: finding.StartLine, fingerprint: finding.Fingerprint, structuralAsset, rationale: structuralAsset ? 'Nombre de objeto CDK: digest hexadecimal SHA256 de 64 caracteres y extensión zip/json; no es una clave de autenticación.' : 'Revisión adicional requerida; no se permite exclusión.' });
  }
}
fs.writeFileSync(`${dir}/secret-finding-assessment.json`, JSON.stringify(assessed, null, 2) + '\n');
if (assessed.some(f => !f.structuralAsset)) throw new Error('Hay hallazgos sin clasificar; no generar exclusiones');
fs.writeFileSync(`${dir}/reviewed-false-positives.ignore`, [...new Set(assessed.map(f => f.fingerprint))].join('\n') + '\n');
console.log(JSON.stringify({ reviewed: assessed.length, falsePositives: assessed.filter(f => f.structuralAsset).length, scope: 'fingerprints exactos; no reglas/path/entropía globales excluidos' }));
