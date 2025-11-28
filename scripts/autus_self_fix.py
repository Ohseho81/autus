#!/usr/bin/env python3
"""
AUTUS Self-Fix Loop: Article III Meta-Circular Development
테스트 실패 → 분석 → 코드 생성 → 적용 → 재테스트 자동화
"""
import subprocess
import os
import sys
import re
import json

ROOT = os.path.expanduser("~/Desktop/autus")
VENV_PYTHON = f"{ROOT}/.venv/bin/python3"

def run_cmd(cmd, capture=True):
    """명령 실행"""
    env = os.environ.copy()
    env["PYTHONPATH"] = ROOT
    result = subprocess.run(cmd, shell=True, capture_output=capture, text=True, cwd=ROOT, env=env)
    return result.stdout + result.stderr if capture else ""

def run_tests(test_path="tests/protocols/identity/"):
    """테스트 실행"""
    output = run_cmd(f"{VENV_PYTHON} -m pytest {test_path} -q --tb=short")
    
    # 결과 파싱
    match = re.search(r"(\d+) failed.*?(\d+) passed", output)
    if match:
        return int(match.group(1)), int(match.group(2)), output
    match = re.search(r"(\d+) passed", output)
    if match:
        return 0, int(match.group(1)), output
    return -1, -1, output

def extract_error(output):
    """에러 추출"""
    # KeyError
    match = re.search(r"KeyError: ['\"](\w+)['\"]", output)
    if match:
        return f"KeyError: {match.group(1)}"
    
    # AttributeError
    match = re.search(r"AttributeError: '(\w+)' object has no attribute '(\w+)'", output)
    if match:
        return f"AttributeError: {match.group(1)} missing {match.group(2)}"
    
    # 파일/라인 추출
    match = re.search(r'File "([^"]+)", line (\d+)', output)
    if match:
        return f"Error in {match.group(1)}:{match.group(2)}"
    
    return "Unknown error"

def run_fixer_pack(error_msg, file_path):
    """AUTUS fixer_pack 실행"""
    inputs = json.dumps({
        "error_message": error_msg,
        "file_path": file_path
    })
    output = run_cmd(f'{VENV_PYTHON} core/pack/runner.py fixer_pack \'{inputs}\' --provider openai')
    return output

def apply_simple_fix(error_msg, file_path):
    """간단한 수정 직접 적용"""
    if "KeyError" in error_msg:
        key = re.search(r"KeyError: (\w+)", error_msg)
        if key:
            key_name = key.group(1)
            print(f"  🔧 {key_name} 키 누락 - .get() 메서드로 수정 시도")
            
            # 파일 읽기
            full_path = os.path.join(ROOT, file_path)
            if os.path.exists(full_path):
                with open(full_path, 'r') as f:
                    content = f.read()
                
                # pattern['position'] → pattern.get('position', {})
                new_content = re.sub(
                    rf"\[(['\"]){key_name}\1\]",
                    f".get('{key_name}', {{}})",
                    content
                )
                
                if new_content != content:
                    with open(full_path, 'w') as f:
                        f.write(new_content)
                    return True
    return False

def main():
    print("🔄 AUTUS Self-Fix Loop (Meta-Circular Development)\n")
    print("=" * 50)
    
    max_iterations = 5
    test_path = sys.argv[1] if len(sys.argv) > 1 else "tests/protocols/identity/"
    
    for i in range(max_iterations):
        print(f"\n━━━ 반복 {i+1}/{max_iterations} ━━━")
        
        # 1. 테스트 실행
        failed, passed, output = run_tests(test_path)
        print(f"📊 테스트: {passed} passed, {failed} failed")
        
        if failed == 0 and passed > 0:
            print("\n✅ 모든 테스트 통과! 메타-순환 완료!")
            break
        
        if failed <= 0:
            print("❌ 테스트 실행 실패")
            print(output[-1000:])
            break
        
        # 2. 에러 분석
        error = extract_error(output)
        print(f"🔍 에러: {error}")
        
        # 파일 경로 추출
        file_match = re.search(r'protocols/identity/\w+\.py', output)
        file_path = file_match.group(0) if file_match else "protocols/identity/pattern_tracker.py"
        print(f"📁 파일: {file_path}")
        
        # 3. 간단한 수정 시도
        print("🔧 자동 수정 시도...")
        fixed = apply_simple_fix(error, file_path)
        
        if fixed:
            print("  ✓ 수정 적용됨")
        else:
            print("  → AUTUS fixer_pack 호출...")
            fixer_output = run_fixer_pack(error, file_path)
            print(fixer_output[-500:] if fixer_output else "  (출력 없음)")
    
    # 최종 결과
    print("\n" + "=" * 50)
    failed, passed, _ = run_tests(test_path)
    print(f"📈 최종: {passed} passed, {failed} failed")

if __name__ == "__main__":
    main()
