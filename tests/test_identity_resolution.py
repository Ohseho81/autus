#!/usr/bin/env python3
"""
AUTUS Identity Resolution Tests
100% 정확도 보장 테스트
"""

import pytest
import sys
import os

# 상위 디렉토리 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from identity_resolver import (
    IdentityResolver,
    IdentityMerger,
    IdentityMergeConflict,
    UniversalProfile
)
from datetime import datetime


# ============================================================
# Test Suite 1: 전화번호 해싱
# ============================================================

class TestPhoneHashing:
    """전화번호 해싱 테스트"""

    def test_same_phone_same_hash(self):
        """같은 전화번호 → 같은 해시"""
        hash1 = IdentityResolver.hash_phone("010-1234-5678")
        hash2 = IdentityResolver.hash_phone("01012345678")
        hash3 = IdentityResolver.hash_phone("010 1234 5678")

        assert hash1 == hash2 == hash3

    def test_different_phone_different_hash(self):
        """다른 전화번호 → 다른 해시"""
        hash1 = IdentityResolver.hash_phone("010-1234-5678")
        hash2 = IdentityResolver.hash_phone("010-8765-4321")

        assert hash1 != hash2

    def test_hash_length(self):
        """해시 길이 = 64자 (SHA-256)"""
        hash_value = IdentityResolver.hash_phone("010-1234-5678")
        assert len(hash_value) == 64

    def test_invalid_phone_raises_error(self):
        """잘못된 전화번호 → ValueError"""
        with pytest.raises(ValueError):
            IdentityResolver.hash_phone("011-1234-5678")  # 010이 아님

        with pytest.raises(ValueError):
            IdentityResolver.hash_phone("010-123-4567")  # 11자리 아님

        with pytest.raises(ValueError):
            IdentityResolver.hash_phone("")  # 빈 문자열

    def test_phone_normalization(self):
        """전화번호 정규화 테스트"""
        assert IdentityResolver.normalize_phone("010-1234-5678") == "01012345678"
        assert IdentityResolver.normalize_phone("010 1234 5678") == "01012345678"
        assert IdentityResolver.normalize_phone("01012345678") == "01012345678"


# ============================================================
# Test Suite 2: 이메일 해싱
# ============================================================

class TestEmailHashing:
    """이메일 해싱 테스트"""

    def test_same_email_same_hash(self):
        """같은 이메일 → 같은 해시"""
        hash1 = IdentityResolver.hash_email("parent@example.com")
        hash2 = IdentityResolver.hash_email("PARENT@EXAMPLE.COM")
        hash3 = IdentityResolver.hash_email(" parent@example.com ")

        assert hash1 == hash2 == hash3

    def test_different_email_different_hash(self):
        """다른 이메일 → 다른 해시"""
        hash1 = IdentityResolver.hash_email("parent@example.com")
        hash2 = IdentityResolver.hash_email("student@example.com")

        assert hash1 != hash2

    def test_hash_length(self):
        """해시 길이 = 64자"""
        hash_value = IdentityResolver.hash_email("test@example.com")
        assert len(hash_value) == 64

    def test_invalid_email_raises_error(self):
        """잘못된 이메일 → ValueError"""
        with pytest.raises(ValueError):
            IdentityResolver.hash_email("invalid")

        with pytest.raises(ValueError):
            IdentityResolver.hash_email("@example.com")

        with pytest.raises(ValueError):
            IdentityResolver.hash_email("")

    def test_email_normalization(self):
        """이메일 정규화 테스트"""
        assert IdentityResolver.normalize_email("TEST@Example.COM") == "test@example.com"
        assert IdentityResolver.normalize_email(" user@test.com ") == "user@test.com"


# ============================================================
# Test Suite 3: 동일인 비교
# ============================================================

class TestIdentityComparison:
    """동일인 비교 테스트"""

    def test_same_phone_same_email(self):
        """전화번호 + 이메일 모두 같음 → 100% 신뢰"""
        identity1 = {'phone': '010-1234-5678', 'email': 'parent@example.com'}
        identity2 = {'phone': '010-1234-5678', 'email': 'parent@example.com'}

        result = IdentityResolver.compare_identity(identity1, identity2)

        assert result['is_same_person'] is True
        assert result['confidence'] == 1.0
        assert result['matched_by'] == 'both'
        assert result['conflicts'] == []

    def test_same_phone_different_email(self):
        """전화번호 같음, 이메일 다름 → 99% 신뢰 (경고)"""
        identity1 = {'phone': '010-1234-5678', 'email': 'parent1@example.com'}
        identity2 = {'phone': '010-1234-5678', 'email': 'parent2@example.com'}

        result = IdentityResolver.compare_identity(identity1, identity2)

        assert result['is_same_person'] is True
        assert result['confidence'] == 0.99
        assert result['matched_by'] == 'phone'
        assert 'email_mismatch' in result['conflicts']

    def test_different_phone_same_email(self):
        """전화번호 다름, 이메일 같음 → 95% 신뢰 (경고)"""
        identity1 = {'phone': '010-1111-1111', 'email': 'parent@example.com'}
        identity2 = {'phone': '010-2222-2222', 'email': 'parent@example.com'}

        result = IdentityResolver.compare_identity(identity1, identity2)

        assert result['is_same_person'] is True
        assert result['confidence'] == 0.95
        assert result['matched_by'] == 'email'
        assert 'phone_mismatch' in result['conflicts']

    def test_different_phone_different_email(self):
        """전화번호 + 이메일 모두 다름 → 다른 사람"""
        identity1 = {'phone': '010-1111-1111', 'email': 'parent1@example.com'}
        identity2 = {'phone': '010-2222-2222', 'email': 'parent2@example.com'}

        result = IdentityResolver.compare_identity(identity1, identity2)

        assert result['is_same_person'] is False
        assert result['confidence'] == 0.0
        assert result['matched_by'] is None


# ============================================================
# Test Suite 4: V-Index 계산
# ============================================================

class TestVIndexCalculation:
    """V-Index 계산 테스트"""

    def test_basic_calculation(self):
        """기본 V-Index 계산"""
        v_index = IdentityResolver.calculate_v_index(
            attendance_count=10,
            payment_count=5,
            absence_count=1,
            overdue_count=0,
            service_count=1,
            months_active=1
        )

        # V = 100 × (10+5-1-0) × (1 + 0.1×1)^1
        #   = 100 × 14 × 1.1
        #   = 1540
        assert v_index == 1540.0

    def test_multi_service_boost(self):
        """여러 학원 이용 시 V-Index 상승"""
        v_single = IdentityResolver.calculate_v_index(
            attendance_count=10,
            payment_count=5,
            absence_count=0,
            overdue_count=0,
            service_count=1,
            months_active=1
        )

        v_triple = IdentityResolver.calculate_v_index(
            attendance_count=10,
            payment_count=5,
            absence_count=0,
            overdue_count=0,
            service_count=3,
            months_active=1
        )

        assert v_triple > v_single

    def test_time_multiplier(self):
        """시간 경과에 따른 V-Index 증폭"""
        v_month1 = IdentityResolver.calculate_v_index(
            attendance_count=10,
            payment_count=5,
            absence_count=0,
            overdue_count=0,
            service_count=2,
            months_active=1
        )

        v_month6 = IdentityResolver.calculate_v_index(
            attendance_count=10,
            payment_count=5,
            absence_count=0,
            overdue_count=0,
            service_count=2,
            months_active=6
        )

        assert v_month6 > v_month1

    def test_negative_actions_reduce_index(self):
        """부정 액션 시 V-Index 감소"""
        v_positive = IdentityResolver.calculate_v_index(
            attendance_count=20,
            payment_count=10,
            absence_count=0,
            overdue_count=0,
            service_count=1,
            months_active=1
        )

        v_with_negatives = IdentityResolver.calculate_v_index(
            attendance_count=20,
            payment_count=10,
            absence_count=5,
            overdue_count=2,
            service_count=1,
            months_active=1
        )

        assert v_with_negatives < v_positive


# ============================================================
# Test Suite 5: 프로필 병합
# ============================================================

class TestProfileMerging:
    """프로필 병합 테스트"""

    def test_can_merge_same_phone(self):
        """같은 전화번호 → 병합 가능"""
        profile1 = UniversalProfile(
            id='uuid-1',
            phone_hash='hash-abc',
            email_hash='hash-xyz',
            v_index=1000.0,
            total_services=2,
            total_interactions=50,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        profile2 = UniversalProfile(
            id='uuid-2',
            phone_hash='hash-abc',  # 같은 전화번호
            email_hash='hash-xyz',
            v_index=500.0,
            total_services=1,
            total_interactions=20,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        can_merge, conflicts = IdentityMerger.can_merge(profile1, profile2)
        assert can_merge is True
        assert len(conflicts) == 0

    def test_cannot_merge_different_phone_and_email(self):
        """전화번호 + 이메일 모두 다름 → 병합 불가"""
        profile1 = UniversalProfile(
            id='uuid-1',
            phone_hash='hash-abc',
            email_hash='hash-xyz',
            v_index=1000.0,
            total_services=2,
            total_interactions=50,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        profile2 = UniversalProfile(
            id='uuid-2',
            phone_hash='hash-def',  # 다른 전화번호
            email_hash='hash-uvw',  # 다른 이메일
            v_index=500.0,
            total_services=1,
            total_interactions=20,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        can_merge, conflicts = IdentityMerger.can_merge(profile1, profile2)
        assert can_merge is False
        assert len(conflicts) > 1

    def test_merge_aggregates_stats(self):
        """병합 시 통계 합산"""
        primary = UniversalProfile(
            id='uuid-1',
            phone_hash='hash-abc',
            email_hash='hash-xyz',
            v_index=1000.0,
            total_services=2,
            total_interactions=50,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        secondary = UniversalProfile(
            id='uuid-2',
            phone_hash='hash-abc',
            email_hash='hash-xyz',
            v_index=500.0,
            total_services=3,
            total_interactions=70,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        result = IdentityMerger.merge_profiles(primary, secondary)

        assert result['merged_id'] == 'uuid-1'
        assert result['deleted_id'] == 'uuid-2'
        assert result['total_services'] == 5  # 2 + 3
        assert result['total_interactions'] == 120  # 50 + 70


# ============================================================
# Test Suite 6: 실전 시나리오
# ============================================================

class TestRealWorldScenarios:
    """실전 시나리오 테스트"""

    def test_same_student_two_academies(self):
        """같은 학생이 2개 학원 등록"""
        # 온리쌤 등록
        onlyssam_identity = {
            'phone': '010-1234-5678',
            'email': 'parent@example.com',
            'name': '김철수'
        }

        # BCC 등록
        bcc_identity = {
            'phone': '010-1234-5678',
            'email': 'parent@example.com',
            'name': '김철수'
        }

        result = IdentityResolver.compare_identity(onlyssam_identity, bcc_identity)

        assert result['is_same_person'] is True
        assert result['confidence'] == 1.0
        assert result['matched_by'] == 'both'

    def test_siblings_same_phone(self):
        """형제가 같은 전화번호 (학부모) 사용"""
        brother1 = {
            'phone': '010-1234-5678',
            'email': 'parent@example.com',
            'name': '김철수'
        }

        brother2 = {
            'phone': '010-1234-5678',
            'email': 'parent@example.com',
            'name': '김영희'
        }

        result = IdentityResolver.compare_identity(brother1, brother2)

        # 전화번호 + 이메일은 같지만 이름이 다름
        # → 시스템은 "같은 학부모"로 인식
        # → 관리자가 수동으로 형제 관계 설정 필요
        assert result['is_same_person'] is True
        assert result['matched_by'] == 'both'

    def test_phone_number_change(self):
        """전화번호 변경 케이스"""
        old_identity = {
            'phone': '010-1111-1111',
            'email': 'parent@example.com'
        }

        new_identity = {
            'phone': '010-2222-2222',
            'email': 'parent@example.com'
        }

        result = IdentityResolver.compare_identity(old_identity, new_identity)

        # 전화번호는 다르지만 이메일은 같음
        # → 95% 신뢰도로 같은 사람
        # → 관리자 확인 필요
        assert result['is_same_person'] is True
        assert result['confidence'] == 0.95
        assert result['matched_by'] == 'email'


# ============================================================
# Run Tests
# ============================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
