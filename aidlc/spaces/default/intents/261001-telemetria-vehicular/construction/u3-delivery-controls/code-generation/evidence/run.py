import datetime
import json
from pathlib import Path
import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')
command = sys.argv[1]
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
result = subprocess.run(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
output = result.stdout.decode('utf-8', errors='replace')
record = Path(__file__).with_name('commands.json')
rows = json.loads(record.read_text(encoding='utf-8')) if record.exists() else []
rows.append({'date_utc': started, 'command': command, 'exit': result.returncode, 'output': output})
record.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
print(output[-6000:])
print('CAPTURED EXIT', result.returncode)
sys.exit(result.returncode)
