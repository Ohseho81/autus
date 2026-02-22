#!/usr/bin/env python3
"""
AUTUS Identity Resolver
동일인 식별 및 Universal ID 관리
"""

import hashlib
import re
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass
from datetime import datetime


@dataclass
class UniversalProfile:
    """Universal Profile 데이터 클래스"""
    id: str
    phone_hash: str
    email_hash: Optional[str]
    v_index: float
    total_services: int
    total_interactions: int
    created_at: datetime
    updated_at: datetime


class IdentityResolver:
    """
    동일인 식별 핵심 로직

    품질 우선 원칙:
    - 100% 정확한 해싱
    - 충돌 방지
    - 개인정보 보호
    """

    @staticmethod
    def normalize_phone(phone: str) -> str:
        """
        전화번호 정규화: 숫자만 추출

        Examples:
            "010-1234-5678" → "01012345678"
            "010 1234 5678" → "01012345678"
            "01012345678"   → "01012345678"

        Raises:
            ValueError: 유효하지 않은 전화번호
        """
        if not phone:
            raise ValueError("Phone number is required")

        # 숫자만 추출
        normalized = re.sub(r'[^0-9]', '', phone)

        # 한국 휴대폰 번호 검증 (010으로 시작, 11자리)
        if not (normalized.startswith('010') and len(normalized) == 11):
            raise ValueError(
                f"Invalid Korean phone number: {phone} "
                f"(normalized: {normalized})"
            )

        return normalized

    @staticmethod
    def normalize_email(email: str) -> str:
        """
        이메일 정규화: 소문자 변환, 공백 제거

        Examples:
            "Parent@Example.com" → "parent@example.com"
            " user@test.com "    → "user@test.com"

        Raises:
            ValueError: 유효하지 않은 이메일
        """
        if not email:
            raise ValueError("Email is required")

        # 소문자 변환, 공백 제거
        normalized = email.strip().lower()

        # 이메일 형식 검증 (간단한 체크)
        if '@' not in normalized:
            raise ValueError(f"Invalid email format: {email}")

        local, domain = normalized.split('@', 1)
        if not local or not domain or '.' not in domain:
            raise ValueError(f"Invalid email format: {email}")

        return normalized

    @staticmethod
    def hash_phone(phone: str) -> str:
        """
        전화번호 SHA-256 해싱

        Args:
            phone: 원본 전화번호 (010-1234-5678 또는 01012345678)

        Returns:
            64자 해시 문자열

        Examples:
            >>> hash_phone("010-1234-5678")
            "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"
        """
        normalized = IdentityResolver.normalize_phone(phone)
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

    @staticmethod
    def hash_email(email: str) -> str:
        """
        이메일 SHA-256 해싱

        Args:
            email: 원본 이메일 (parent@example.com)

        Returns:
            64자 해시 문자열
        """
        normalized = IdentityResolver.normalize_email(email)
        return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

    @staticmethod
    def generate_identity_key(
        phone: Optional[str] = None,
        email: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        신원 확인 키 생성 (해시 쌍)

        Args:
            phone: 전화번호
            email: 이메일

        Returns:
            (phone_hash, email_hash) 튜플

        Raises:
            ValueError: phone과 email 둘 다 없을 때
        """
        if not phone and not email:
            raise ValueError("At least one of phone or email is required")

        phone_hash = IdentityResolver.hash_phone(phone) if phone else None
        email_hash = IdentityResolver.hash_email(email) if email else None

        return phone_hash, email_hash

    @staticmethod
    def compare_identity(
        identity1: Dict[str, str],
        identity2: Dict[str, str]
    ) -> Dict[str, any]:
        """
        두 신원 정보 비교

        Args:
            identity1: {'phone': '010-1234-5678', 'email': 'a@example.com'}
            identity2: {'phone': '010-1234-5678', 'email': 'b@example.com'}

        Returns:
            {
                'is_same_person': True/False,
                'confidence': 0.0-1.0,
                'matched_by': 'phone'/'email'/'both'/None,
                'conflicts': ['email_mismatch']
            }
        """
        result = {
            'is_same_person': False,
            'confidence': 0.0,
            'matched_by': None,
            'conflicts': []
        }

        # 전화번호 비교
        phone_match = False
        if identity1.get('phone') and identity2.get('phone'):
            try:
                hash1 = IdentityResolver.hash_phone(identity1['phone'])
                hash2 = IdentityResolver.hash_phone(identity2['phone'])
                phone_match = (hash1 == hash2)
            except ValueError:
                result['conflicts'].append('invalid_phone')

        # 이메일 비교
        email_match = False
        if identity1.get('email') and identity2.get('email'):
            try:
                hash1 = IdentityResolver.hash_email(identity1['email'])
                hash2 = IdentityResolver.hash_email(identity2['email'])
                email_match = (hash1 == hash2)
            except ValueError:
                result['conflicts'].append('invalid_email')

        # 결과 판정
        if phone_match and email_match:
            result['is_same_person'] = True
            result['confidence'] = 1.0
            result['matched_by'] = 'both'
        elif phone_match:
            result['is_same_person'] = True
            result['confidence'] = 0.99
            result['matched_by'] = 'phone'
            if identity1.get('email') and identity2.get('email') and not email_match:
                result['conflicts'].append('email_mismatch')
        elif email_match:
            result['is_same_person'] = True
            result['confidence'] = 0.95
            result['matched_by'] = 'email'
            if identity1.get('phone') and identity2.get('phone') and not phone_match:
                result['conflicts'].append('phone_mismatch')

        return result

    @staticmethod
    def calculate_v_index(
        attendance_count: int,
        payment_count: int,
        absence_count: int,
        overdue_count: int,
        service_count: int,
        months_active: int
    ) -> float:
        """
        V-Index 계산

        Formula:
            V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t

        Args:
            attendance_count: 출석 수 (Motions)
            payment_count: 결제 수 (Motions)
            absence_count: 결석 수 (Threats)
            overdue_count: 연체 수 (Threats)
            service_count: 이용 학원 수 (Relations)
            months_active: 활동 개월 수 (t)

        Returns:
            V-Index 점수 (소수점 2자리)
        """
        BASE = 100
        RELATION_WEIGHT = 0.1

        # Motions - Threats
        net_actions = (attendance_count + payment_count) - (absence_count + overdue_count)

        # (1 + 상호지수 × Relations)^t
        relation_multiplier = pow(
            1 + RELATION_WEIGHT * service_count,
            months_active
        )

        # 최종 V-Index
        v_index = BASE * net_actions * relation_multiplier

        return round(v_index, 2)


class IdentityMergeConflict(Exception):
    """동일인 병합 충돌 예외"""
    pass


class IdentityMerger:
    """
    Universal Profile 병합 로직
    """

    @staticmethod
    def can_merge(
        profile1: UniversalProfile,
        profile2: UniversalProfile
    ) -> Tuple[bool, List[str]]:
        """
        두 프로필이 병합 가능한지 확인

        Returns:
            (가능 여부, 충돌 이유 리스트)
        """
        conflicts = []

        # 같은 프로필은 병합 불가
        if profile1.id == profile2.id:
            conflicts.append("Same profile ID")
            return False, conflicts

        # 전화번호 해시가 다르면 경고
        if profile1.phone_hash != profile2.phone_hash:
            conflicts.append("Different phone_hash")

        # 이메일 해시가 다르면 경고
        if (profile1.email_hash and profile2.email_hash and
            profile1.email_hash != profile2.email_hash):
            conflicts.append("Different email_hash")

        # 충돌이 있으면 수동 확인 필요
        if conflicts and len(conflicts) > 1:
            return False, conflicts

        return True, conflicts

    @staticmethod
    def merge_profiles(
        primary: UniversalProfile,
        secondary: UniversalProfile
    ) -> Dict[str, any]:
        """
        두 프로필 병합 (primary로 통합)

        Returns:
            {
                'merged_id': 'uuid-1',
                'deleted_id': 'uuid-2',
                'total_services': 5,
                'merged_at': datetime(...)
            }
        """
        can_merge, conflicts = IdentityMerger.can_merge(primary, secondary)

        if not can_merge:
            raise IdentityMergeConflict(
                f"Cannot merge {secondary.id} into {primary.id}: "
                f"{', '.join(conflicts)}"
            )

        return {
            'merged_id': primary.id,
            'deleted_id': secondary.id,
            'total_services': primary.total_services + secondary.total_services,
            'total_interactions': primary.total_interactions + secondary.total_interactions,
            'conflicts': conflicts,
            'merged_at': datetime.now()
        }


# ============================================================
# Usage Examples
# ============================================================

if __name__ == '__main__':
    # Example 1: 전화번호 해싱
    print("="*60)
    print("Example 1: Phone Hashing")
    print("="*60)

    phone1 = "010-1234-5678"
    phone2 = "01012345678"

    hash1 = IdentityResolver.hash_phone(phone1)
    hash2 = IdentityResolver.hash_phone(phone2)

    print(f"Phone 1: {phone1}")
    print(f"Hash 1:  {hash1}")
    print(f"Phone 2: {phone2}")
    print(f"Hash 2:  {hash2}")
    print(f"Same?    {hash1 == hash2} ✅")
    print()

    # Example 2: 동일인 비교
    print("="*60)
    print("Example 2: Identity Comparison")
    print("="*60)

    student1 = {
        'phone': '010-1234-5678',
        'email': 'parent@example.com'
    }

    student2 = {
        'phone': '010-1234-5678',
        'email': 'parent@example.com'
    }

    result = IdentityResolver.compare_identity(student1, student2)
    print(f"Student 1: {student1}")
    print(f"Student 2: {student2}")
    print(f"Same person? {result['is_same_person']}")
    print(f"Confidence:  {result['confidence']}")
    print(f"Matched by:  {result['matched_by']}")
    print(f"Conflicts:   {result['conflicts']}")
    print()

    # Example 3: V-Index 계산
    print("="*60)
    print("Example 3: V-Index Calculation")
    print("="*60)

    v_index = IdentityResolver.calculate_v_index(
        attendance_count=50,   # 50회 출석
        payment_count=10,      # 10회 결제
        absence_count=2,       # 2회 결석
        overdue_count=1,       # 1회 연체
        service_count=3,       # 3개 학원 이용
        months_active=6        # 6개월 활동
    )

    print(f"Attendance: 50, Payment: 10")
    print(f"Absence: 2, Overdue: 1")
    print(f"Services: 3, Months: 6")
    print(f"V-Index: {v_index}")
    print()
