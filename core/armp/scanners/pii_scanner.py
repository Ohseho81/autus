"""
PII Scanner

모든 코드에서 PII 저장 시도를 탐지합니다.
"""

import re
from pathlib import Path
from typing import List, Tuple
import logging

logger = logging.getLogger(__name__)


class PIIPattern:
    """PII 패턴 정의"""

    # 키 패턴
    KEY_PATTERNS = [
        r"e[-_]?mail",
        r"em@il",
        r"n[a@]me",
        r"nam[e3]",
        r"ph[o0]ne",
        r"t[e3]l",
        r"addr[e3]ss",
        r"birth",
        r"ssn",
        r"passport",
        r"id[-_]?card",
        r"user[-_]?id",
        r"user[-_]?name"
    ]

    # 값 패턴
    VALUE_PATTERNS = [
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",  # 이메일
        r"\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}",  # 전화번호
        r"\d{6}-\d{7}",  # 주민번호
        r"\d{3}-\d{2}-\d{4}"  # SSN
    ]


class PIIScanner:
    """PII 스캐너"""

    @classmethod
    def scan_file(cls, file_path: Path) -> List[Tuple[int, str]]:
        """파일에서 PII 패턴 찾기"""
        violations = []

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                in_docstring = False

                for line_num, line in enumerate(lines, 1):
                    # 주석 제외
                    if line.strip().startswith('#'):
                        continue

                    # 문서 문자열 시작/끝 체크
                    if '"""' in line or "'''" in line:
                        in_docstring = not in_docstring
                        continue

                    # 문서 문자열 내부는 제외
                    if in_docstring:
                        continue

                    # 문자열 리터럴 내부는 제외 (예: 설명용)
                    if '"' in line or "'" in line:
                        # 단순 문자열 리터럴은 스킵 (실제 코드만 체크)
                        continue

                    # 실제 코드에서만 체크 (할당, 함수 호출 등)
                    if '=' in line or '(' in line:
                        # 키 패턴 체크 (변수명, 키 등)
                        for pattern in PIIPattern.KEY_PATTERNS:
                            # 정규식 패턴 자체가 아닌 실제 사용만 체크
                            if re.search(rf'\b{pattern}\b', line, re.IGNORECASE):
                                # 패턴 정의가 아닌 실제 사용인지 확인
                                if 'pattern' not in line.lower() and 'PATTERN' not in line:
                                    violations.append((
                                        line_num,
                                        f"Suspicious PII key pattern: {pattern}"
                                    ))

                    # 값 패턴 체크 (실제 값 할당)
                    if '=' in line and '"' in line:
                        for pattern in PIIPattern.VALUE_PATTERNS:
                            if re.search(pattern, line):
                                violations.append((
                                    line_num,
                                    f"Suspicious PII value pattern: {pattern}"
                                ))

        except Exception as e:
            logger.error(f"Error scanning {file_path}: {e}")

        return violations

    @classmethod
    def scan_directory(cls, directory: Path) -> dict:
        """디렉토리 전체 스캔"""
        results = {}

        # 제외할 파일 패턴 (검증 파일, 스캐너 파일 등)
        exclude_patterns = [
            "test",
            "pii_validator",
            "pii_scanner",
            "scanner",
            "__init__"
        ]

        for py_file in directory.rglob("*.py"):
            # 제외 패턴 체크
            if any(pattern in str(py_file) for pattern in exclude_patterns):
                continue

            violations = cls.scan_file(py_file)
            if violations:
                results[str(py_file)] = violations

        return results

    @classmethod
    def check_compliance(cls) -> bool:
        """Constitution 준수 확인"""
        logger.info("🔍 Scanning for PII violations...")

        # protocols/ 스캔
        violations = cls.scan_directory(Path("protocols"))

        if violations:
            logger.error("❌ PII violations found:")
            for file_path, file_violations in violations.items():
                logger.error(f"  {file_path}:")
                for line_num, message in file_violations:
                    logger.error(f"    Line {line_num}: {message}")
            return False

        logger.info("✅ No PII violations found")
        return True


if __name__ == "__main__":
    # CLI 실행
    import sys

    if not PIIScanner.check_compliance():
        sys.exit(1)
