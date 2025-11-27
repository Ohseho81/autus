from core.utils.privacy import mask_pii

def test_mask_email():
    assert mask_pii("user@example.com") == "***@example.com"

def test_mask_phone():
    assert mask_pii("010-1234-5678") == "***-****-5678"

def test_mask_korean_name():
    assert mask_pii("홍길동") == "홍*"
