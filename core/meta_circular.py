#!/usr/bin/env python3
"""
AUTUS Meta-Circular Engine v3.0
Article III: AUTUS develops AUTUS

완전 자동화 + Constitution 검증
"""
import subprocess
import os
import sys
import re
import json
from pathlib import Path
from datetime import datetime

class MetaCircularEngine:
    """AUTUS 메타-순환 개발 엔진"""
    
    def __init__(self, root_path=None):
        self.root = Path(root_path or os.path.expanduser("~/Desktop/autus"))
        self.venv_python = self.root / ".venv/bin/python3"
        self.max_iterations = 20
        self.fixed_count = 0
        (self.root / "outputs").mkdir(exist_ok=True)
        
    def log(self, msg):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")
    
    def run_cmd(self, cmd, timeout=120):
        env = os.environ.copy()
        env["PYTHONPATH"] = str(self.root)
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=self.root, env=env, timeout=timeout)
            return result.returncode, result.stdout + result.stderr
        except:
            return -1, "ERROR"
    
    def validate_constitution(self):
        """Article II 검증 - PII 체크"""
        self.log("📜 Constitution 검증 중...")
        code, output = self.run_cmd(f"{self.venv_python} core/constitution_validator.py")
        if code == 0:
            self.log("  ✓ Constitution 준수")
            return True
        else:
            self.log(f"  ✗ Constitution 위반: {output}")
            return False
    
    def git_restore(self, file_path):
        code, _ = self.run_cmd(f"git checkout {file_path}")
        return code == 0
    
    def run_tests(self, test_path):
        code, output = self.run_cmd(f"{self.venv_python} -m pytest {test_path} -v --tb=short 2>&1")
        
        if "IndentationError" in output or "SyntaxError" in output:
            match = re.search(r'File "([^"]+)".*?(?:Indentation|Syntax)Error', output, re.DOTALL)
            if match:
                rel_path = os.path.relpath(match.group(1), self.root)
                self.log(f"🔧 파일 손상: {rel_path} → 복원")
                self.git_restore(rel_path)
                return self.run_tests(test_path)
        
        failed = int(m.group(1)) if (m := re.search(r"(\d+) failed", output)) else 0
        passed = int(m.group(1)) if (m := re.search(r"(\d+) passed", output)) else 0
        
        return {"failed": failed, "passed": passed, "output": output}
    
    def extract_errors(self, output):
        """에러 추출"""
        errors = []
        
        # AttributeError
        for m in re.finditer(r"'(\w+)' object has no attribute '(\w+)'", output):
            errors.append({"type": "AttributeError", "class": m.group(1), "attr": m.group(2)})
        
        # KeyError
        for m in re.finditer(r"KeyError: ['\"](\w+)['\"]", output):
            errors.append({"type": "KeyError", "key": m.group(1)})
        
        # NameError
        for m in re.finditer(r"NameError: name '(\w+)' is not defined", output):
            errors.append({"type": "NameError", "name": m.group(1)})
        
        # AssertionError with context
        for m in re.finditer(r"assert ['\"]([^'\"]+)['\"] not in", output):
            errors.append({"type": "PIIViolation", "pii": m.group(1)})
        
        return errors
    
    def apply_fix(self, error, test_output):
        """에러 유형별 자동 수정"""
        if error["type"] == "AttributeError":
            return self._fix_missing_attribute(error, test_output)
        elif error["type"] == "KeyError":
            return self._fix_missing_key(error, test_output)
        elif error["type"] == "NameError":
            return self._fix_undefined_name(error, test_output)
        elif error["type"] == "PIIViolation":
            return self._fix_pii_violation(error, test_output)
        return False
    
    def _fix_missing_attribute(self, error, output):
        """누락된 속성/메서드 추가"""
        # 파일 찾기
        file_match = re.search(r'File "([^"]+)".*?' + error["class"], output, re.DOTALL)
        if not file_match:
            return False
        
        file_path = file_match.group(1)
        attr = error["attr"]
        
        self.log(f"  → {error['class']}.{attr} 추가 시도")
        # 실제 수정은 codegen_pack 호출 또는 템플릿 사용
        return False  # 복잡한 경우 수동 개입 필요
    
    def _fix_missing_key(self, error, output):
        """누락된 dict 키 처리"""
        self.log(f"  → KeyError '{error['key']}' - .get() 사용 권장")
        return False
    
    def _fix_undefined_name(self, error, output):
        """정의되지 않은 변수 수정"""
        self.log(f"  → NameError '{error['name']}' - import 또는 정의 필요")
        return False
    
    def _fix_pii_violation(self, error, output):
        """PII 위반 수정 - Article II"""
        self.log(f"  → Article II 위반: '{error['pii']}' export에서 제거 필요")
        return False
    
    def run_loop(self, test_path="tests/"):
        """메타-순환 루프 실행"""
        self.log("=" * 60)
        self.log("🚀 AUTUS Meta-Circular Engine v3.0")
        self.log(f"📁 테스트: {test_path}")
        self.log("=" * 60)
        
        # Constitution 사전 검증
        if not self.validate_constitution():
            self.log("⚠️ Constitution 위반 상태로 시작")
        
        for iteration in range(1, self.max_iterations + 1):
            self.log(f"\n━━━ 반복 {iteration}/{self.max_iterations} ━━━")
            
            result = self.run_tests(test_path)
            total = result['passed'] + result['failed']
            pct = (result['passed'] / total * 100) if total > 0 else 0
            
            self.log(f"📊 {result['passed']}/{total} ({pct:.1f}%) passed")
            
            if result["failed"] == 0 and result["passed"] > 0:
                self.log("\n🎉 모든 테스트 통과!")
                self.validate_constitution()
                return True
            
            # 에러 분석
            errors = self.extract_errors(result["output"])
            if not errors:
                self.log("⚠️ 파싱 가능한 에러 없음")
                continue
            
            # 수정 시도
            for error in errors[:3]:
                self.log(f"🔍 {error['type']}: {error}")
                if self.apply_fix(error, result["output"]):
                    self.fixed_count += 1
        
        # 최종 결과
        self.log("\n" + "=" * 60)
        result = self.run_tests(test_path)
        total = result['passed'] + result['failed']
        pct = (result['passed'] / total * 100) if total > 0 else 0
        self.log(f"📈 최종: {result['passed']}/{total} ({pct:.1f}%)")
        self.log(f"🔧 총 수정: {self.fixed_count}개")
        
        return result["failed"] == 0

def main():
    test_path = sys.argv[1] if len(sys.argv) > 1 else "tests/"
    engine = MetaCircularEngine()
    success = engine.run_loop(test_path)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
