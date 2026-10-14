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

sys.stdout.reconfigure(encoding='utf-8')
record = Path(__file__).resolve().parent
workspace = Path.cwd().resolve()
temporary = Path((record/'scanner-temp-path.txt').read_text(encoding='utf-8-sig').strip()).resolve()
tool = temporary/'tool/gitleaks.exe'
projection = temporary/('projection-'+secrets.token_hex(4))
projection.mkdir()
paths = []
for name in ['src/telemetry', 'infra', 'bin', 'tests/integration', 'dist', 'cdk.out']:
    paths.extend(p for p in (workspace/name).rglob('*') if p.is_file())
paths.extend((workspace/'docs').glob('telemetry*.md'))
paths.extend(workspace/p for p in ['README.md','package.json','package-lock.json','tsconfig.json','vitest.config.ts','cdk.json','eslint.config.mjs','.prettierrc.json'])
manifest = []
for source in sorted(set(paths)):
    relative = source.relative_to(workspace)
    destination = projection/relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, destination)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    assert hashlib.sha256(destination.read_bytes()).hexdigest() == digest
    manifest.append({'path':relative.as_posix(),'sha256':digest,'bytes':source.stat().st_size})
env = os.environ.copy()
override_presence = {key:bool(env.get(key)) for key in ['GITLEAKS_CONFIG','GITLEAKS_CONFIG_TOML']}
if any(override_presence.values()):
    raise RuntimeError('Override Gitleaks presente; requiere revisión sin imprimir valor')
results = []
def run(arguments, expected):
    report = temporary/('report-'+secrets.token_hex(4)+'.json')
    result = subprocess.run([str(tool),*arguments,'--report-format','json','--report-path',str(report)], cwd=temporary, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    output = result.stdout.decode('utf-8',errors='replace')
    findings = json.loads(report.read_text(encoding='utf-8')) if report.exists() else []
    safe = [{key:item.get(key) for key in ['RuleID','File','StartLine','EndLine','Commit','Fingerprint']} for item in findings]
    results.append({'date_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':['gitleaks',*arguments,'--report-format','json','--report-path',str(report)],'exit':result.returncode,'expected_exit':expected,'output':output,'findings_metadata':safe})
    print(json.dumps(safe,ensure_ascii=False))
    print(output[-1800:]); print('EXIT',result.returncode,'EXPECTED',expected)
    return result.returncode == expected
clean=temporary/'clean.txt'; clean.write_text('Documento sin credenciales.',encoding='utf-8')
synthetic=temporary/'synthetic.txt'
synthetic.write_text('aws_access_key_id = "AKIA'+''.join(secrets.choice(string.ascii_uppercase+'234567') for _ in range(16))+'"\n',encoding='utf-8')
ok=run(['dir','--redact=100','--exit-code','1',str(clean)],0)
ok=run(['dir','--redact=100','--exit-code','1',str(synthetic)],1) and ok
ok=run(['dir','--redact=100','--exit-code','1',str(projection)],0) and ok
ok=run(['git','--redact=100','--exit-code','1','--log-opts=--all',str(workspace)],0) and ok
history={}
for name,args in [('available_commits',['rev-list','--all','--count']),('shallow',['rev-parse','--is-shallow-repository'])]:
    history[name]=subprocess.check_output(['git',*args],cwd=workspace).decode().strip()
data={'version':'8.30.1','date_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archive_sha256':'d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e','official_release':'https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1','config_override_presence':override_presence,'config':'Reglas incorporadas; sin baseline/config/ignores añadidos; cwd temporal sin configuración. No .gitleaks detectado en repositorio.','manifest':manifest,'history':history,'results':results,'overall_pass':ok}
(record/('scanner-'+projection.name+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
sys.exit(0 if ok else 1)
