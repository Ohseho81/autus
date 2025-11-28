#!/usr/bin/env python3
"""
AUTUS Auto-Fix Loop: 테스트 실패 자동 분석 및 수정 제안
"""

import subprocess
import re
import sys
import os

VENV_PYTHON = os.path.expanduser("~/Desktop/autus/.venv/bin/python3")

def run_tests(test_path="tests/protocols/identity/"):
    """테스트 실행 및 결과 파싱"""
    env = os.environ.copy()
    env["PYTHONPATH"] = "."
    result = subprocess.run(
        [VENV_PYTHON, "-m", "pytest", test_path, "-v", "--tb=short"],
        capture_output=True, text=True,
        cwd=os.path.expanduser("~/Desktop/autus"),
        env=env
    )
    return result.stdout + result.stderr

def parse_errors(output):
    """에러 메시지에서 문제 추출"""
    errors = []
    
    # AttributeError 패턴
    for match in re.finditer(r"AttributeError: '(\w+)' object has no attribute '(\w+)'", output):
        errors.append({"type": "missing_attr", "class": match.group(1), "attr": match.group(2)})
    
    # IndentationError 패턴
    for match in re.finditer(r'File "([^"]+)", line (\d+).*Indentation', output, re.DOTALL):
        errors.append({"type": "indent", "file": match.group(1), "line": match.group(2)})
    
    # AssertionError 패턴
    for match in re.finditer(r"AssertionError: (.+)", output):
        errors.append({"type": "assert", "msg": match.group(1)[:100]})
    
    return errors

def get_summary(output):
    """테스트 요약"""
    m = re.search(r"(\d+) failed.*?(\d+) passed", output)
    if m: return int(m.group(1)), int(m.group(2))
    m = re.search(r"(\d+) passed", output)
    if m: return 0, int(m.group(1))
    return -1, -1

def main():
    print("🔄 AUTUS Auto-Fix Loop\n")
    
    test_path = sys.argv[1] if len(sys.argv) > 1 else "tests/protocols/identity/"
    
    output = run_tests(test_path)
    failed, passed = get_summary(output)
    
    print(f"📊 결과: {passed} passed, {failed} failed\n")
    
    if failed == 0 and passed > 0:
        print("✅ 모든 테스트 통과!")
        return
    
    errors = parse_errors(output)
    
    if errors:
        print(f"🔍 발견된 문제 ({len(errors)}개):")
        seen = set()
        for err in errors:
            key = str(err)
            if key not in seen:
                seen.add(key)
                if err["type"] == "missing_attr":
                    print(f"  • {err['class']}에 '{err['attr']}' 없음")
                elif err["type"] == "indent":
                    print(f"  • {err['file']}:{err['line']} 들여쓰기 오류")
                elif err["type"] == "assert":
                    print(f"  • 단언 실패: {err['msg']}")
    else:
        # 실패 목록 출력
        print("실패한 테스트:")
        for line in output.split("\n"):
            if "FAILED" in line:
                print(f"  {line}")

if __name__ == "__main__":
    main()
