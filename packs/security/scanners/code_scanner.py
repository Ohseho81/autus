"""
Code Scanner

AI 생성 코드의 악의적 패턴을 탐지합니다.
"""

from __future__ import annotations
import ast
from pathlib import Path
from typing import List, Tuple
import logging
import loggi

logger = logging.getLogger(__name__)


class CodeScanner:
    """코드 보안 스캐너"""

    DANGEROUS_IMPORTS = [
        "os.system",
        "subprocess.call",
        "subprocess.run",
        "eval",
        "exec",
        "__import__",
        "compile"
    ]

    DANGEROUS_FUNCTIONS = [
        "eval",
        "exec",
        "compile",
        "execfile",
        "__import__"
    ]

    @classmethod
    def scan_file(cls, file_path: Path) -> List[Tuple[int, str]]:
        """파일에서 위험한 코드 패턴 찾기"""
        violations = []

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                code = f.read()

            # AST 파싱
            try:
                tree = ast.parse(code)
            except SyntaxError:
                return []  # 문법 오류는 다른 도구가 처리

            # AST 순회
            for node in ast.walk(tree):
                # Import 체크
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if any(d in alias.name for d in cls.DANGEROUS_IMPORTS):
                            violations.append((
                                node.lineno,
                                f"Dangerous import: {alias.name}"
                            ))

                # ImportFrom 체크
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        for dangerous in cls.DANGEROUS_IMPORTS:
                            if dangerous in node.module:
                                violations.append((
                                    node.lineno,
                                    f"Dangerous import from: {node.module}"
                                ))

                # 함수 호출 체크
                elif isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Name):
                        if node.func.id in cls.DANGEROUS_FUNCTIONS:
                            violations.append((
                                node.lineno,
                                f"Dangerous function call: {node.func.id}"
                            ))

        except Exception as e:
            logger.error(f"Error scanning {file_path}: {e}")

        return violations

    @classmethod
    def scan_directory(cls, directory: Path) -> Dict[str, List[Tuple[int, str]]]:
        """디렉토리 전체 스캔"""
        results: Dict[str, List[Tuple[int, str]]] = {}

        for py_file in directory.rglob("*.py"):
            violations = cls.scan_file(py_file)
            if violations:
                results[str(py_file)] = violations

        return results

    @classmethod
    def check_compliance(cls) -> bool:
        """코드 보안 확인"""
        logger.info("🔍 Scanning for dangerous code patterns...")

        # protocols/ 스캔
        violations = cls.scan_directory(Path("protocols"))

        if violations:
            logger.error("❌ Dangerous code patterns found:")
            for file_path, file_violations in violations.items():
                logger.error(f"  {file_path}:")
                for line_num, message in file_violations:
                    logger.error(f"    Line {line_num}: {message}")
            return False

        logger.info("✅ No dangerous code patterns found")
        return True


if __name__ == "__main__":
    # CLI 실행
    import sys

    if not CodeScanner.check_compliance():
        sys.exit(1)



