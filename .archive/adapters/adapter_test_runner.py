"""
AUTUS 어댑터 자동 테스트 러너
- adapters/ 내 모든 어댑터에 대해 run/rollback/status mock 테스트 자동 실행
- 결과를 json(log)/대시보드/Slack 등으로 연동 가능
"""
import importlib
import os
import json
from typing import Any, Dict

ADAPTERS_DIR = os.path.dirname(__file__)
LOG_PATH = os.path.join(ADAPTERS_DIR, 'adapter_test_results.json')

# 테스트할 어댑터 클래스명과 mock 인자 예시
ADAPTER_TESTS = {
    'ShellAdapter': {
        'run': {'command': 'echo "hello"'},
        'rollback': {'rollback_cmd': 'echo "rollback"'},
        'status': {}
    },
    'ERPAdapter': {
        'run': {'command': '', 'args': {'url': 'http://example.com/api', 'payload': {}}},
        'rollback': {'rollback_url': 'http://example.com/rollback', 'rollback_payload': {}},
        'status': {'status_url': 'http://example.com/status'}
    },
    'SaaSAdapter': {
        'run': {'command': '', 'args': {'url': 'http://example.com/api', 'payload': {}, 'headers': {}}},
        'rollback': {'rollback_url': 'http://example.com/rollback', 'rollback_payload': {}, 'headers': {}},
        'status': {'status_url': 'http://example.com/status', 'headers': {}}
    },
    'HomepageAdapter': {
        'run': {'command': '', 'args': {'url': 'http://example.com', 'method': 'GET', 'payload': {}}},
        'rollback': {'rollback_url': 'http://example.com/rollback', 'rollback_payload': {}},
        'status': {'status_url': 'http://example.com/status'}
    }
}

def find_adapters():
    adapters = []
    for fname in os.listdir(ADAPTERS_DIR):
        if fname.endswith('_adapter.py') or fname == 'adapter_template.py':
            modname = fname[:-3]
            adapters.append(modname)
    return adapters

def run_tests():
    results = []
    for modname in find_adapters():
        try:
            mod = importlib.import_module(f'adapters.{modname}')
        except Exception as e:
            results.append({'adapter': modname, 'error': f'Import error: {e}'})
            continue
        for clsname, tests in ADAPTER_TESTS.items():
            if hasattr(mod, clsname):
                cls = getattr(mod, clsname)
                inst = cls()
                for method in ['run', 'rollback', 'status']:
                    if hasattr(inst, method):
                        try:
                            args = tests.get(method, {})
                            res = getattr(inst, method)(**args) if args else getattr(inst, method)()
                            results.append({'adapter': clsname, 'method': method, 'args': args, 'result': res})
                        except Exception as e:
                            results.append({'adapter': clsname, 'method': method, 'args': args, 'error': str(e)})
    with open(LOG_PATH, 'w') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"[AUTUS] 어댑터 테스트 결과 저장: {LOG_PATH}")

if __name__ == '__main__':
    run_tests()
