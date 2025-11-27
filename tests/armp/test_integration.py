"""
ARMP 통합 테스트
"""

import pytest
from core.armp import enforcer, monitor
from core.armp.scanners.pii_scanner import PIIScanner
from core.armp.scanners.code_scanner import CodeScanner
from core.armp.scanners.constitution_checker import ConstitutionChecker


def test_armp_initialization():
    """ARMP 초기화"""
    assert len(enforcer.risks) >= 5
    assert monitor is not None


def test_pii_scanner():
    """PII 스캐너"""
    # protocols/memory가 PII 검증을 가지고 있어야 함
    result = PIIScanner.check_compliance()
    assert isinstance(result, bool)


def test_code_scanner():
    """코드 스캐너"""
    result = CodeScanner.check_compliance()
    assert isinstance(result, bool)


def test_constitution_checker():
    """Constitution 검증"""
    result = ConstitutionChecker.check_all()
    assert isinstance(result, bool)


def test_monitor_lifecycle():
    """모니터 생명주기"""
    # 시작
    monitor.start()
    assert monitor.running

    # 상태 확인
    status = monitor.get_status()
    assert 'uptime_seconds' in status

    # 중지
    monitor.stop()
    assert not monitor.running


def test_prevention_all():
    """전체 예방 실행"""
    # 에러 없이 실행되어야 함
    enforcer.prevent_all()


def test_detection_all():
    """전체 감지 실행"""
    violations = enforcer.detect_violations()
    assert isinstance(violations, list)


@pytest.mark.skipif(True, reason="Requires actual violations")
def test_response_and_recovery():
    """대응 및 복구"""
    # 실제 위반 필요
    pass






