import yaml
import os
import subprocess

WORKFLOWS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../workflows'))

def load_workflow(name):
    path = os.path.join(WORKFLOWS_DIR, f'{name}.yaml')
    with open(path, encoding='utf-8') as f:
        return yaml.safe_load(f)

def execute_workflow(name, context=None):
    wf = load_workflow(name)
    context = context or {}
    # 조건 평가(간단히 eval 사용, 실제 서비스는 안전하게 구현 필요)
    if 'condition' in wf and not eval(wf['condition'], {}, context):
        return 'skipped'
    results = []
    for action in wf.get('actions', []):
        if action['type'] == 'notify':
            # 실제 알림 연동 대신 print
            msg = action['message'].format(**context)
            print(f"[NOTIFY:{action['channel']}] {msg}")
            results.append(('notify', msg))
        elif action['type'] == 'execute_script':
            script = action['script']
            print(f"[EXEC] {script}")
            try:
                subprocess.run([script], check=True)
                results.append(('exec', script, 'ok'))
            except Exception as e:
                results.append(('exec', script, f'fail:{e}'))
    return results
