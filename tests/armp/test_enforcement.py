"""
ARMP 강제 시스템 테스트
"""
import pytest
from pathlib import Path
from core.armp.enforcer import ARMPEnforcer, Risk, Severity, RiskCategory, enforcer
from core.armp.monitor import ARMPMonitor, monitor


def test_enforcer_initialization():
    """Enforcer 초기화 테스트"""
    assert enforcer is not None
    assert len(enforcer.risks) > 0


def test_risk_registration():
    """리스크 등록 테스트"""
    initial_count = len(enforcer.risks)
    
    def dummy_prevention():
        pass
    
    def dummy_detection():
        return False
    
    def dummy_response():
        pass
    
    def dummy_recovery():
        pass
    
    risk = Risk(
        name="Test Risk",
        category=RiskCategory.SECURITY,
        severity=Severity.LOW,
        description="Test",
        prevention=dummy_prevention,
        detection=dummy_detection,
        response=dummy_response,
        recovery=dummy_recovery
    )
    
    enforcer.register_risk(risk)
    
    assert len(enforcer.risks) == initial_count + 1


def test_pii_prevention():
    """PII 저장 시도 차단 테스트"""
    from protocols.memory.store import MemoryStore
    from protocols.memory.pii_validator import PIIViolationError
    
    store = MemoryStore()
    
    # 정상 케이스
    store.store_preference("timezone", "Asia/Seoul", "system")
    
    # PII 케이스
    with pytest.raises(PIIViolationError):
        store.store_preference("user_email", "test@test.com", "contact")
    
    store.close()


def test_code_injection_detection():
    """Code Injection 감지 테스트"""
    from core.pack.code_validator import CodeValidator
    
    malicious_code = """
import os
os.system("rm -rf /")
"""
    
    is_safe, reason = CodeValidator.validate_code(malicious_code)
    assert not is_safe
    assert "Dangerous import" in reason or "os.system" in reason.lower()


def test_monitor_start_stop():
    """모니터 시작/중지 테스트"""
    test_enforcer = ARMPEnforcer()
    test_monitor = ARMPMonitor(test_enforcer)
    
    assert not test_monitor.running
    
    test_monitor.start()
    assert test_monitor.running
    
    import time
    time.sleep(1)
    
    test_monitor.stop()
    assert not test_monitor.running


def test_performance_budget():
    """성능 예산 테스트"""
    from core.armp.performance import PerformanceBudget
    
    # API 응답 시간 체크
    PerformanceBudget.check_api_response_time(30)  # 정상
    PerformanceBudget.check_api_response_time(250)  # 경고
    
    # DB 쿼리 시간 체크
    PerformanceBudget.check_db_query_time(5)  # 정상
    PerformanceBudget.check_db_query_time(15)  # 경고


def test_enforcer_status():
    """Enforcer 상태 조회 테스트"""
    status = enforcer.get_status()
    
    assert "total_risks" in status
    assert "incidents_count" in status
    assert "safe_mode" in status
    assert isinstance(status["total_risks"], int)
    assert isinstance(status["safe_mode"], bool)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

