#!/usr/bin/env python3
"""
AUTUS Constitution Validator
Article II: Privacy by Architecture - No PII in exports

이 스크립트는 CI/CD에서 실행되어 Constitution 위반을 방지합니다.
"""
import ast
import sys
from pathlib import Path

# PII 관련 금지 패턴
FORBIDDEN_IN_EXPORTS = [
    'seed',      # Raw seed는 export 금지
    'email',
    'name', 
    'phone',
    'address',
    'user_id',
    'password',
]

# 허용 패턴 (hash는 OK)
ALLOWED_PATTERNS = [
    'seed_hash',
    'core_hash',
]

def check_export_methods(filepath: Path) -> list:
    """Check export methods for PII"""
    violations = []
    
    with open(filepath) as f:
        content = f.read()
    
    try:
        tree = ast.parse(content)
    except SyntaxError:
        return [f"Syntax error in {filepath}"]
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            if 'export' in node.name.lower() or 'to_dict' in node.name.lower():
                # Check function body for forbidden patterns
                func_source = ast.get_source_segment(content, node)
                if func_source:
                    for forbidden in FORBIDDEN_IN_EXPORTS:
                        # Skip if it's an allowed pattern
                        is_allowed = any(allowed in func_source for allowed in ALLOWED_PATTERNS if forbidden in allowed)
                        
                        # Check for standalone forbidden term
                        import re
                        pattern = rf"['\"]({forbidden})['\"](?!_hash)"
                        matches = re.findall(pattern, func_source)
                        
                        if matches and not is_allowed:
                            violations.append(
                                f"Article II Violation in {filepath}:{node.name}() - "
                                f"Found '{forbidden}' in export method"
                            )
    
    return violations

def validate_constitution():
    """Run full Constitution validation"""
    root = Path(__file__).parent.parent
    violations = []
    
    # Check all Python files in protocols/
    for py_file in (root / "protocols").rglob("*.py"):
        violations.extend(check_export_methods(py_file))
    
    if violations:
        print("❌ CONSTITUTION VIOLATIONS DETECTED:")
        for v in violations:
            print(f"  - {v}")
        return False
    
    print("✅ Constitution validation passed - No PII in exports")
    return True

if __name__ == "__main__":
    success = validate_constitution()
    sys.exit(0 if success else 1)
