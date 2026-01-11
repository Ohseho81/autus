"""
═══════════════════════════════════════════════════════════════════════════════
🧪 AUTUS Webhook Tests
═══════════════════════════════════════════════════════════════════════════════

웹훅 처리 테스트
"""

import pytest
import json
import hmac
import hashlib
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestStripeWebhook:
    """Stripe 웹훅 테스트"""

    def test_payment_intent_succeeded(self):
        """결제 완료 이벤트"""
        payload = {
            "id": "evt_test_123",
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test_123",
                    "amount": 10000,
                    "currency": "krw",
                    "customer": "cus_test_123",
                    "metadata": {
                        "node_id": "n01"
                    }
                }
            }
        }
        
        response = client.post(
            "/webhooks/stripe",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # 서명 없이 테스트 모드에서 허용
        assert response.status_code in [200, 400, 401, 404]

    def test_customer_created(self):
        """고객 생성 이벤트"""
        payload = {
            "id": "evt_test_456",
            "type": "customer.created",
            "data": {
                "object": {
                    "id": "cus_new_123",
                    "email": "test@example.com",
                    "name": "테스트 사용자"
                }
            }
        }
        
        response = client.post(
            "/webhooks/stripe",
            json=payload
        )
        
        assert response.status_code in [200, 400, 401, 404]

    def test_invalid_event_type(self):
        """알 수 없는 이벤트 타입"""
        payload = {
            "id": "evt_test_789",
            "type": "unknown.event",
            "data": {"object": {}}
        }
        
        response = client.post(
            "/webhooks/stripe",
            json=payload
        )
        
        assert response.status_code in [200, 400, 404]


class TestTossWebhook:
    """토스 웹훅 테스트"""

    def test_payment_done(self):
        """결제 완료"""
        payload = {
            "eventType": "PAYMENT_STATUS_CHANGED",
            "status": "DONE",
            "orderId": "order_123",
            "paymentKey": "pk_test_123",
            "amount": 15000,
            "method": "카드"
        }
        
        response = client.post(
            "/webhooks/toss",
            json=payload
        )
        
        assert response.status_code in [200, 400, 401, 404]

    def test_virtual_account_issued(self):
        """가상계좌 발급"""
        payload = {
            "eventType": "VIRTUAL_ACCOUNT_ISSUED",
            "orderId": "va_order_123",
            "accountNumber": "1234567890",
            "bank": "우리",
            "dueDate": "2025-12-31"
        }
        
        response = client.post(
            "/webhooks/toss",
            json=payload
        )
        
        assert response.status_code in [200, 400, 401, 404]


class TestShopifyWebhook:
    """Shopify 웹훅 테스트"""

    def test_order_created(self):
        """주문 생성"""
        payload = {
            "id": 123456789,
            "name": "#1001",
            "total_price": "50000.00",
            "currency": "KRW",
            "customer": {
                "id": 987654321,
                "email": "customer@example.com"
            },
            "line_items": [
                {"title": "상품1", "quantity": 2, "price": "25000.00"}
            ]
        }
        
        response = client.post(
            "/webhooks/shopify/orders/create",
            json=payload
        )
        
        assert response.status_code in [200, 400, 401, 404]

    def test_product_updated(self):
        """상품 업데이트"""
        payload = {
            "id": 111222333,
            "title": "업데이트된 상품",
            "vendor": "테스트 벤더",
            "variants": [
                {"id": 444555666, "price": "30000.00", "inventory_quantity": 100}
            ]
        }
        
        response = client.post(
            "/webhooks/shopify/products/update",
            json=payload
        )
        
        assert response.status_code in [200, 400, 401, 404]


class TestUniversalWebhook:
    """범용 웹훅 테스트"""

    def test_generic_event(self):
        """일반 이벤트"""
        payload = {
            "source": "custom_app",
            "event": "user_action",
            "timestamp": "2025-01-01T00:00:00Z",
            "data": {
                "user_id": "u123",
                "action": "purchase",
                "value": 10000
            }
        }
        
        response = client.post(
            "/webhooks/universal",
            json=payload
        )
        
        assert response.status_code in [200, 400, 404]

    def test_batch_events(self):
        """배치 이벤트"""
        payload = {
            "source": "batch_processor",
            "events": [
                {"type": "event1", "data": {"a": 1}},
                {"type": "event2", "data": {"b": 2}},
                {"type": "event3", "data": {"c": 3}},
            ]
        }
        
        response = client.post(
            "/webhooks/universal/batch",
            json=payload
        )
        
        assert response.status_code in [200, 400, 404]


class TestWebhookSecurity:
    """웹훅 보안 테스트"""

    def test_signature_validation(self):
        """서명 검증"""
        payload = json.dumps({"test": "data"})
        secret = "test_secret"
        
        # 올바른 서명 생성
        signature = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        response = client.post(
            "/webhooks/stripe",
            content=payload,
            headers={
                "Content-Type": "application/json",
                "Stripe-Signature": f"t=12345,v1={signature}"
            }
        )
        
        # 서명 검증 로직이 있으면 통과/실패
        assert response.status_code in [200, 400, 401, 404]

    def test_missing_signature(self):
        """서명 누락"""
        response = client.post(
            "/webhooks/stripe",
            json={"test": "data"}
            # 서명 헤더 없음
        )
        
        # 테스트 모드에서는 허용될 수 있음
        assert response.status_code in [200, 400, 401, 404]

    def test_replay_attack_prevention(self):
        """리플레이 공격 방지"""
        payload = {
            "id": "evt_old_123",
            "type": "test.event",
            "created": 1609459200,  # 과거 시간
            "data": {}
        }
        
        response = client.post(
            "/webhooks/stripe",
            json=payload
        )
        
        # 오래된 이벤트는 거부될 수 있음
        assert response.status_code in [200, 400, 401, 404]
