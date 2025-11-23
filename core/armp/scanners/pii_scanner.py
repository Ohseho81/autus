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
                for line_num, line in enumerate(f, 1):
                    # 주석과 문서는 제외
                    if line.strip().startswith('#') or line.strip().startswith('"""'):
                        continue
                    
                    # 키 패턴 체크
                    for pattern in PIIPattern.KEY_PATTERNS:
                        if re.search(pattern, line, re.IGNORECASE):
                            violations.append((
                                line_num,
                                f"Suspicious PII key pattern: {pattern}"
                            ))
                    
                    # 값 패턴 체크
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
        
        for py_file in directory.rglob("*.py"):
            # 테스트 파일 제외
            if "test" in str(py_file):
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

