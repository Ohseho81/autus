"""
from __future__ import annotations

강화된 PII (Personally Identifiable Information) 검증 시스템

Article II: Privacy by Architecture 준수
"""
import re
from typing import Any, Tuple, List


class PIIViolationError(ValueError):
    """PII 저장 시도 예외"""
    pass


class PIIValidator:
    """
    강화된 PII 검증 클래스

    키워드 기반 검사뿐만 아니라 패턴 매칭, 변형 탐지 등을 수행합니다.
    """

    # 의심스러운 키 패턴 (정규식)
    KEY_PATTERNS = [
        r"e[-_]?mail",
        r"em@il",
        r"e[-_]?m@il",
        r"n[a@]me",
        r"nam[e3]",
        r"ph[o0]ne",
        r"t[e3]l",
        r"tel[-_]?phone",
        r"addr[e3]ss",
        r"adr[e3]ss",
        r"birth",
        r"birth[-_]?date",
        r"dob",  # Date of Birth
        r"ssn",  # Social Security Number
        r"social[-_]?security",
        r"passport",
        r"id[-_]?card",
        r"credit[-_]?card",
        r"card[-_]?number",
        r"cvv",
        r"cvc",
        r"password",
        r"passwd",
        r"pwd",
        r"user[-_]?id",
        r"userid",
        r"account[-_]?id",
        r"driver[-_]?license",
        r"license[-_]?number",
        r"national[-_]?id",
        r"tax[-_]?id",
        r"ip[-_]?address",
        r"mac[-_]?address"
    ]

    # 값 패턴 (정규식)
    VALUE_PATTERNS = [
        # 이메일
        r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
        # 전화번호 (더 구체적인 패턴 - 시간 형식 제외)
        r"\+?\d{1,3}[-.\s]?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4,9}",  # 최소 10자리
        r"\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}",  # 10-11자리 전화번호
        # 주민번호 (한국) - 6-7 형식만
        r"\d{6}-\d{7}",
        # SSN (미국) - 3-2-4 형식만
        r"\d{3}-\d{2}-\d{4}",
        # 신용카드 (간단한 패턴) - 16자리
        r"\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}",
        # IP 주소
        r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}",
        # MAC 주소
        r"([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})"
    ]

    # 허용된 패턴 (PII가 아닌 것들)
    ALLOWED_PATTERNS = [
        r"\d{2}:\d{2}",  # 시간 형식 (HH:MM)
        r"\d{2}:\d{2}-\d{2}:\d{2}",  # 시간 범위 (HH:MM-HH:MM)
        r"UTC",  # 타임존
        r"[A-Z][a-z]+/[A-Z][a-z]+",  # 타임존 (Asia/Seoul)
    ]

    # 문자 대체 패턴 (우회 시도 탐지)
    SUBSTITUTIONS = {
        '@': 'a',
        '3': 'e',
        '0': 'o',
        '1': 'i',
        '5': 's',
        '7': 't',
        '$': 's',
        '!': 'i'
    }

    @classmethod
    def normalize_key(cls, key: str) -> str:
        """
        키 정규화 (우회 시도 탐지)

        Args:
            key: 원본 키

        Returns:
            정규화된 키
        """
        if not isinstance(key, str) or not key:
            raise ValueError("Preference key must be a non-empty string.")
        normalized = key.lower()

        # 특수 문자를 일반 문자로 변환
        for symbol, letter in cls.SUBSTITUTIONS.items():
            normalized = normalized.replace(symbol, letter)

        # 공백, 하이픈, 언더스코어 제거
        normalized = re.sub(r'[-_\s]', '', normalized)

        return normalized

    @classmethod
    def contains_pii_in_key(cls, key: str) -> Tuple[bool, str]:
        """
        키에 PII 패턴이 포함되어 있는지 확인

        Args:
            key: 검사할 키

        Returns:
            (is_pii, reason) 튜플
        """
        normalized_key = cls.normalize_key(key)

        for pattern in cls.KEY_PATTERNS:
            if re.search(pattern, normalized_key, re.IGNORECASE):
                return True, f"Suspicious key pattern detected: '{pattern}' in '{key}'"

        return False, ""

    @classmethod
    def contains_pii_in_value(cls, value: Any) -> Tuple[bool, str]:
        """
        값에 PII 패턴이 포함되어 있는지 확인

        Args:
            value: 검사할 값

        Returns:
            (is_pii, reason) 튜플
        """
        value_str = str(value)

        # 허용된 패턴 먼저 체크
        for allowed_pattern in cls.ALLOWED_PATTERNS:
            if re.search(allowed_pattern, value_str):
                return False, ""  # 허용된 패턴이면 PII 아님

        # PII 패턴 체크
        for pattern in cls.VALUE_PATTERNS:
            if re.search(pattern, value_str):
                return True, f"Suspicious value pattern detected: '{pattern}'"

        return False, ""

    @classmethod
    def validate(cls, key: str, value: Any) -> None:
        """
        PII 검증

        Args:
            key: 저장하려는 키
            value: 저장하려는 값

        Raises:
            PIIViolationError: PII가 감지된 경우
        """
        # 키 검사
        is_pii_key, key_reason = cls.contains_pii_in_key(key)
        if is_pii_key:
            raise PIIViolationError(
                f"PII detected in key: {key_reason}\n"
                f"Key: '{key}'\n"
                f"Article II: Privacy by Architecture - No PII allowed"
            )

        # 값 검사
        is_pii_value, value_reason = cls.contains_pii_in_value(value)
        if is_pii_value:
            raise PIIViolationError(
                f"PII detected in value: {value_reason}\n"
                f"Key: '{key}'\n"
                f"Article II: Privacy by Architecture - No PII allowed"
            )

    @classmethod
    def validate_batch(cls, items: List[Tuple[str, Any]]) -> List[Tuple[str, str]]:
        """
        여러 항목 일괄 검증

        Args:
            items: (key, value) 튜플 리스트

        Returns:
            [(key, error_message)] 리스트 (에러가 있는 경우만)
        """
        errors = []

        for key, value in items:
            try:
                cls.validate(key, value)
            except PIIViolationError as e:
                errors.append((key, str(e)))

        return errors
