def test_risk_registration():
    from core.armp.enforcer import enforcer, Severity
    
    # 실제 등록된 risk 이름으로 테스트
    risks = enforcer.get_all_risks()
    assert len(risks) > 0, "No risks registered"
    
    # 첫 번째 risk 확인
    first_risk = risks[0]
    assert hasattr(first_risk, "name")
    assert hasattr(first_risk, "severity")
    
    # get_risk 메서드 테스트
    found = enforcer.get_risk(first_risk.name)
    assert found is not None
    assert found.name == first_risk.name

def test_risk_severity():
    from core.armp.enforcer import enforcer, Severity
    
    # 등록된 모든 risk가 유효한 severity를 가지는지 확인
    for risk in enforcer.get_all_risks():
        assert isinstance(risk.severity, Severity)
