# AUTUS 시스템 상태 리포트 (2025-11-26_00-27-58)\n
## 1. 테스트 결과 요약\n
\n```
 from core.armp import enforcer, monitor E ModuleNotFoundError: No module named 'core' _____________ ERROR collecting tests/armp/test_monitor_advanced.py _____________ ImportError while importing test module '/Users/ohseho/Desktop/autus/tests/armp/test_monitor_advanced.py'. Hint: make sure your test modules/packages have valid Python names. Traceback: /opt/homebrew/Cellar/python@3.11/3.11.14/Frameworks/Python.framework/Versions/3.11/lib/python3.11/importlib/__init__.py:126: in import_module return _bootstrap._gcd_import(name[level:], package, level) ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ tests/armp/test_monitor_advanced.py:12: in <module> from core.armp.monitor import monitor, ARMPMonitor E ModuleNotFoundError: No module named 'core' =========================== short test summary info ============================ ERROR tests/armp/test_all_risks.py ERROR tests/armp/test_enforcement.py ERROR tests/armp/test_enforcer_advanced.py ERROR tests/armp/test_integration.py ERROR tests/armp/test_monitor_advanced.py !!!!!!!!!!!!!!!!!!!!!!!!!! stopping after 5 failures !!!!!!!!!!!!!!!!!!!!!!!!!!! ========================= 1 warning, 5 errors in 0.05s =========================\n```\n
## 2. 최근 복구/알림/수정 이력\n
\n**[Alert Log]**\n
\n```
[ALERT] Critical error detected. See ./logs/last_test.log\n```\n
\n**[Recovery Log]**\n
\n```
\n```\n
## 3. 무한루프/프로세스 상태\n
\n```
\n```\n
