"""Reproduce the U3 scanner gate without persisting synthetic credentials."""

import datetime
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import string
import subprocess
import sys


record = Path(__file__).resolve().parent
workspace = Path.cwd().resolve()
temporary = Path((record / 'scanner-temp-path.txt').read_text(encoding='utf-8-sig').strip()).resolve()
tool = temporary / 'tool/gitleaks.exe'
config = workspace / '.gitleaks.toml'
root = temporary / ('final-' + secrets.token_hex(4))
root.mkdir()
env = os.environ.copy()
for variable in ('GITLEAKS_CONFIG', 'GITLEAKS_CONFIG_TOML'):
    if env.get(variable):
        raise RuntimeError(f'{variable} overrides the explicit config')

results = []


def scan(name, arguments, expected):
    report = root / (name + '-report.json')
    command = [str(tool), *arguments, '--config', str(config), '--redact=100', '--exit-code', '1',
               '--report-format', 'json', '--report-path', str(report)]
    process = subprocess.run(command, cwd=workspace, env=env, stdout=subprocess.PIPE,
                             stderr=subprocess.STDOUT, check=False)
    findings = json.loads(report.read_text(encoding='utf-8')) if report.exists() else []
    metadata = [{key: finding.get(key) for key in ('RuleID', 'File', 'StartLine', 'Commit')}
                for finding in findings]
    result = {'name': name, 'command': ['gitleaks', *arguments, '--config', '.gitleaks.toml',
                                       '--redact=100', '--exit-code', '1'],
              'exit': process.returncode, 'expected_exit': expected, 'findings': metadata,
              'output_tail': process.stdout.decode('utf-8', errors='replace')[-1000:]}
    results.append(result)
    print(f'{name}: exit={process.returncode}, expected={expected}, findings={len(findings)}', flush=True)
    return process.returncode == expected


def fixture(name, relative, content):
    directory = root / name
    file = directory / relative
    file.parent.mkdir(parents=True)
    file.write_text(content, encoding='utf-8')
    return directory


hex_key = secrets.token_hex(32)
generic = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(48))
aws = 'AKIA' + ''.join(secrets.choice(string.ascii_uppercase + '234567') for _ in range(16))
namespaces = ('Telemetry-staging.assets.json', 'Telemetry-staging.template.json', 'tree.json')
ok = True
for namespace in namespaces:
    suffix = namespace.replace('.', '-').replace('_', '-')
    cdk_path = Path('cdk.out') / namespace
    ok = scan('cdk-hash-' + suffix, ['dir', str(fixture('cdk-hash-' + suffix, cdk_path,
              json.dumps({'S3Key': hex_key + '.zip'})))], 0) and ok
    ok = scan('aws-' + suffix, ['dir', str(fixture('aws-' + suffix, cdk_path,
              json.dumps({'aws_access_key_id': aws})))], 1) and ok
    ok = scan('generic-' + suffix, ['dir', str(fixture('generic-' + suffix, cdk_path,
              json.dumps({'api_key': generic})))], 1) and ok
    ok = scan('wrong-field-' + suffix, ['dir', str(fixture('wrong-field-' + suffix, cdk_path,
              json.dumps({'api_key': hex_key + '.zip'})))], 1) and ok
    ok = scan('no-zip-' + suffix, ['dir', str(fixture('no-zip-' + suffix, cdk_path,
              json.dumps({'S3Key': hex_key})))], 1) and ok

ok = scan('clean', ['dir', str(fixture('clean', Path('clean.txt'),
           'Documento sin credenciales.'))], 0) and ok
ok = scan('synthetic-aws', ['dir', str(fixture('synthetic-aws', Path('aws.txt'),
           'aws_access_key_id = "' + aws + '"'))], 1) and ok
ok = scan('synthetic-generic', ['dir', str(fixture('synthetic-generic', Path('generic.txt'),
           'api_key = "' + generic + '"'))], 1) and ok

projection = root / 'projection'
projection.mkdir()
paths = []
for directory in ('src/telemetry', 'infra', 'bin', 'tests/integration', 'dist', 'cdk.out'):
    paths.extend(path for path in (workspace / directory).rglob('*') if path.is_file())
paths.extend((workspace / 'docs').glob('telemetry*.md'))
paths.extend(workspace / name for name in ('README.md', 'package.json', 'package-lock.json',
             'tsconfig.json', 'vitest.config.ts', 'cdk.json', 'eslint.config.mjs',
             '.prettierrc.json', '.gitleaks.toml'))
manifest = []
for source in sorted(set(paths)):
    relative = source.relative_to(workspace)
    destination = projection / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if hashlib.sha256(destination.read_bytes()).hexdigest() != digest:
        raise RuntimeError('Projection copy differs from workspace')
    manifest.append({'path': relative.as_posix(), 'sha256': digest, 'bytes': source.stat().st_size})
ok = scan('application', ['dir', str(projection)], 0) and ok
ok = scan('history', ['git', '--log-opts=--all', str(workspace)], 0) and ok
history = {'commits_available': subprocess.check_output(['git', 'rev-list', '--all', '--count'],
           cwd=workspace).decode().strip(),
           'shallow': subprocess.check_output(['git', 'rev-parse', '--is-shallow-repository'],
           cwd=workspace).decode().strip()}
data = {'date_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'version': subprocess.check_output([str(tool), 'version']).decode().strip(),
        'release_archive_sha256': 'd29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e',
        'config': '.gitleaks.toml', 'config_sha256': hashlib.sha256(config.read_bytes()).hexdigest(),
        'manifest': manifest, 'history': history, 'results': results, 'overall_pass': ok}
(record / 'scanner-final.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
sys.exit(0 if ok else 1)
