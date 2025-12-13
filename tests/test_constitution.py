"""
헌법 테스트 - Raw 저장 차단 등
"""
import pytest
import sys
sys.path.insert(0, '.')

def test_no_raw_storage():
    from core.policy.gate import gate
    
    # 금지 필드 테스트
    with pytest.raises(ValueError):
        gate.check({"raw": "some data"})
    
    with pytest.raises(ValueError):
        gate.check({"raw_value": 123})

def test_shadow_irreversible():
    from core.shadow.soa import ShadowVector32f
    
    features = [{"id": i, "value": 0.5, "conf": 0.9} for i in range(10)]
    shadow = ShadowVector32f.from_features(features)
    
    # 해시 생성 확인
    assert len(shadow.hash()) == 16
    
    # 같은 입력 → 같은 해시
    shadow2 = ShadowVector32f.from_features(features)
    assert shadow.hash() == shadow2.hash()

def test_audit_integrity():
    from core.audit.ledger import AuditLedger
    
    ledger = AuditLedger()
    ledger.append("TEST", "hash123")
    ledger.append("TEST2", "hash456")
    
    result = ledger.verify()
    assert result["valid"] == True

print("✅ 헌법 테스트 정의 완료")
