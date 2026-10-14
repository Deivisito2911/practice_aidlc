import json
from pathlib import Path
import re
import subprocess

record = Path(__file__).resolve().parent
data=json.loads((record/'scanner-projection-3e507260.json').read_text(encoding='utf-8'))
rows=[]
for finding in data['results'][3]['findings_metadata']:
    text=subprocess.check_output(['git','show',finding['Commit']+':'+finding['File']]).decode('utf-8')
    line=text.splitlines()[finding['StartLine']-1]
    if finding['File']=='cdk.out/tree.json':
        field='árbol CDK minificado; propiedades de artefactos anidadadas'
        shape='contiene nombres de artefacto SHA256 ZIP y UUID de API Gateway; requiere clasificación contextual'
    else:
        field=re.search(r'"([^"]+)"\s*:',line).group(1)
        shape='SHA256 hexadecimal 64 caracteres + .zip' if re.search(r'[a-f0-9]{64}\.zip',line) else ('UUID' if re.search(r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}',line) else 'referencia CDK; revisar contexto sin mostrar valor')
    rows.append({**finding,'field':field,'value_shape':shape,'classification':'Identificador generado CDK; no se acredita credencial real por el detector. Scanner conserva exit 1.'})
(record/'scanner-classification.json').write_text(json.dumps({'rows':rows,'counts':{'projection':3,'history':12},'security_gate':'Blocked: sin supresión ni baseline','candidate':'Revisión futura de regla limitada a campos CDK SHA256 ZIP confirmados, manteniendo detector AWS y fixture sintético; no aplicada. No reescribir historial.'},ensure_ascii=False,indent=2),encoding='utf-8')
for row in rows:
    print(row['File'],row['StartLine'],row['field'],row['value_shape'])
