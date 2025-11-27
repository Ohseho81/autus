from core.compliance.gdpr import GDPRCompliance
import logging

def test_check_minimal_collection():
    gdpr = GDPRCompliance()
    data = {"name": "홍길동", "email": "", "phone": "010-1234-5678"}
    result = gdpr.check_minimal_collection(data)
    assert "email" not in result
    assert "name" in result

def test_mask_all_pii():
    gdpr = GDPRCompliance()
    data = {"name": "홍길동", "email": "user@example.com", "phone": "010-1234-5678"}
    masked = gdpr.mask_all_pii(data)
    assert masked["name"] == "홍*"
    assert masked["email"] == "***@example.com"
    assert masked["phone"] == "***-****-5678"

def test_log_access(caplog):
    gdpr = GDPRCompliance()
    with caplog.at_level(logging.INFO):
        gdpr.log_access("admin", "조회", "email")
        assert any("admin 조회 email" in m for m in caplog.messages)
