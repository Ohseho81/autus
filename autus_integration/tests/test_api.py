# tests/test_api.py
# AUTUS API 테스트

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
import sys
import os

# 경로 설정
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app


# ═══════════════════════════════════════════════════════════════════════════
# 클라이언트 픽스처
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    with TestClient(app) as c:
        yield c


# ═══════════════════════════════════════════════════════════════════════════
# 기본 엔드포인트 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestBasicEndpoints:
    """기본 API 테스트"""
    
    def test_root(self, client):
        """루트 엔드포인트"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "AUTUS Integration Hub"
        assert "version" in data
        assert "endpoints" in data
    
    def test_health(self, client):
        """헬스체크"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data
    
    def test_strategy(self, client):
        """전략 엔드포인트"""
        response = client.get("/strategy")
        assert response.status_code == 200
        data = response.json()
        assert "core_strategies" in data
        assert "projected_roi" in data


# ═══════════════════════════════════════════════════════════════════════════
# CrewAI 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestCrewAI:
    """CrewAI 엔드포인트 테스트"""
    
    def test_quick_delete(self, client):
        """삭제 대상 분석"""
        nodes = [
            {"id": "node_1", "value": -100},
            {"id": "node_2", "value": 500},
            {"id": "node_3", "value": 0}
        ]
        
        response = client.post("/crewai/quick-delete", json={"nodes": nodes})
        assert response.status_code == 200
        data = response.json()
        assert "targets" in data
        # 음수/0 value 노드가 타겟에 포함되어야 함
        target_ids = [t["id"] for t in data["targets"]]
        assert "node_1" in target_ids or "node_3" in target_ids
    
    def test_quick_automate(self, client):
        """자동화 대상 분석"""
        motions = [
            {"source": "a", "target": "b", "amount": 100},
            {"source": "a", "target": "b", "amount": 100},
            {"source": "a", "target": "b", "amount": 100},
            {"source": "x", "target": "y", "amount": 50}
        ]
        
        response = client.post("/crewai/quick-automate", json={"motions": motions})
        assert response.status_code == 200
        data = response.json()
        assert "targets" in data


# ═══════════════════════════════════════════════════════════════════════════
# Parasitic 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestParasitic:
    """Parasitic 엔드포인트 테스트"""
    
    def test_supported_saas(self, client):
        """지원 SaaS 목록"""
        response = client.get("/parasitic/supported")
        assert response.status_code == 200
        data = response.json()
        assert "supported" in data
        # 최소 5개 이상 지원
        assert len(data["supported"]) >= 5
    
    def test_flywheel_status(self, client):
        """플라이휠 상태"""
        response = client.get("/parasitic/flywheel")
        assert response.status_code == 200
        data = response.json()
        assert "stages" in data
        assert "message" in data


# ═══════════════════════════════════════════════════════════════════════════
# AutoSync 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestAutoSync:
    """AutoSync 엔드포인트 테스트"""
    
    def test_systems_list(self, client):
        """시스템 목록"""
        response = client.get("/autosync/systems")
        assert response.status_code == 200
        data = response.json()
        assert "systems" in data
        assert "count" in data
        # 다양한 시스템 타입 포함
        types = [s.get("type") for s in data["systems"]]
        assert len(set(types)) >= 2  # 최소 2개 타입
    
    def test_detect_cookies(self, client):
        """쿠키 기반 감지"""
        response = client.post("/autosync/detect", json={
            "cookies": "stripe_session=abc123; hubspot_token=xyz"
        })
        assert response.status_code == 200
        data = response.json()
        assert "detected_count" in data
    
    def test_detect_domains(self, client):
        """도메인 기반 감지"""
        response = client.post("/autosync/detect", json={
            "domains": ["dashboard.stripe.com", "app.hubspot.com", "unknown.example.com"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "systems" in data
    
    def test_transform(self, client):
        """Zero Meaning 변환"""
        response = client.post("/autosync/transform", json={
            "system_id": "stripe",
            "data": {
                "customer": "cus_123",
                "amount": 10000,
                "name": "이 필드는 삭제되어야 함",
                "email": "삭제@example.com"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert "transformed" in data
        # Zero Meaning: 의미 있는 필드는 제거
        transformed = data["transformed"]
        assert "node_id" in transformed
        assert "value" in transformed


# ═══════════════════════════════════════════════════════════════════════════
# Webhook 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestWebhooks:
    """Webhook 엔드포인트 테스트"""
    
    def test_stripe_webhook(self, client):
        """Stripe webhook"""
        payload = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_123",
                    "customer": "cus_456",
                    "amount": 5000
                }
            }
        }
        
        response = client.post("/webhook/stripe", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["received"] == True
    
    def test_toss_webhook(self, client):
        """토스 webhook"""
        payload = {
            "status": "DONE",
            "orderId": "customer123_order456",
            "totalAmount": 30000,
            "method": "가상계좌"
        }
        
        response = client.post("/webhook/toss", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["received"] == True
    
    def test_universal_webhook(self, client):
        """범용 webhook - 자동 감지"""
        # Stripe 스타일 페이로드
        payload = {
            "livemode": True,
            "type": "customer.created",
            "data": {
                "object": {
                    "id": "cus_new",
                    "amount": 0
                }
            }
        }
        
        response = client.post("/webhook/universal", json=payload)
        assert response.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# Zero Meaning 철학 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestZeroMeaning:
    """Zero Meaning 철학 검증"""
    
    def test_removes_meaningful_fields(self, client):
        """의미 있는 필드 제거 확인"""
        response = client.post("/autosync/transform", json={
            "system_id": "stripe",
            "data": {
                "id": "cus_789",
                "amount": 25000,
                # 아래 필드들은 모두 제거되어야 함
                "name": "홍길동",
                "email": "hong@test.com",
                "phone": "010-1234-5678",
                "description": "프리미엄 멤버십",
                "metadata": {"plan": "enterprise"},
                "address": {"city": "서울"}
            }
        })
        
        data = response.json()
        transformed = data.get("transformed", {})
        
        # 핵심 필드만 존재해야 함
        allowed_keys = {"node_id", "value", "timestamp", "source"}
        actual_keys = set(transformed.keys())
        
        # 의미 있는 필드는 없어야 함
        forbidden = {"name", "email", "phone", "description", "metadata", "address"}
        assert actual_keys.isdisjoint(forbidden), f"의미 있는 필드가 남아있음: {actual_keys & forbidden}"


# ═══════════════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])


# tests/test_api.py
# AUTUS API 테스트

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
import sys
import os

# 경로 설정
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from main import app


# ═══════════════════════════════════════════════════════════════════════════
# 클라이언트 픽스처
# ═══════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    with TestClient(app) as c:
        yield c


# ═══════════════════════════════════════════════════════════════════════════
# 기본 엔드포인트 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestBasicEndpoints:
    """기본 API 테스트"""
    
    def test_root(self, client):
        """루트 엔드포인트"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "AUTUS Integration Hub"
        assert "version" in data
        assert "endpoints" in data
    
    def test_health(self, client):
        """헬스체크"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data
    
    def test_strategy(self, client):
        """전략 엔드포인트"""
        response = client.get("/strategy")
        assert response.status_code == 200
        data = response.json()
        assert "core_strategies" in data
        assert "projected_roi" in data


# ═══════════════════════════════════════════════════════════════════════════
# CrewAI 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestCrewAI:
    """CrewAI 엔드포인트 테스트"""
    
    def test_quick_delete(self, client):
        """삭제 대상 분석"""
        nodes = [
            {"id": "node_1", "value": -100},
            {"id": "node_2", "value": 500},
            {"id": "node_3", "value": 0}
        ]
        
        response = client.post("/crewai/quick-delete", json={"nodes": nodes})
        assert response.status_code == 200
        data = response.json()
        assert "targets" in data
        # 음수/0 value 노드가 타겟에 포함되어야 함
        target_ids = [t["id"] for t in data["targets"]]
        assert "node_1" in target_ids or "node_3" in target_ids
    
    def test_quick_automate(self, client):
        """자동화 대상 분석"""
        motions = [
            {"source": "a", "target": "b", "amount": 100},
            {"source": "a", "target": "b", "amount": 100},
            {"source": "a", "target": "b", "amount": 100},
            {"source": "x", "target": "y", "amount": 50}
        ]
        
        response = client.post("/crewai/quick-automate", json={"motions": motions})
        assert response.status_code == 200
        data = response.json()
        assert "targets" in data


# ═══════════════════════════════════════════════════════════════════════════
# Parasitic 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestParasitic:
    """Parasitic 엔드포인트 테스트"""
    
    def test_supported_saas(self, client):
        """지원 SaaS 목록"""
        response = client.get("/parasitic/supported")
        assert response.status_code == 200
        data = response.json()
        assert "supported" in data
        # 최소 5개 이상 지원
        assert len(data["supported"]) >= 5
    
    def test_flywheel_status(self, client):
        """플라이휠 상태"""
        response = client.get("/parasitic/flywheel")
        assert response.status_code == 200
        data = response.json()
        assert "stages" in data
        assert "message" in data


# ═══════════════════════════════════════════════════════════════════════════
# AutoSync 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestAutoSync:
    """AutoSync 엔드포인트 테스트"""
    
    def test_systems_list(self, client):
        """시스템 목록"""
        response = client.get("/autosync/systems")
        assert response.status_code == 200
        data = response.json()
        assert "systems" in data
        assert "count" in data
        # 다양한 시스템 타입 포함
        types = [s.get("type") for s in data["systems"]]
        assert len(set(types)) >= 2  # 최소 2개 타입
    
    def test_detect_cookies(self, client):
        """쿠키 기반 감지"""
        response = client.post("/autosync/detect", json={
            "cookies": "stripe_session=abc123; hubspot_token=xyz"
        })
        assert response.status_code == 200
        data = response.json()
        assert "detected_count" in data
    
    def test_detect_domains(self, client):
        """도메인 기반 감지"""
        response = client.post("/autosync/detect", json={
            "domains": ["dashboard.stripe.com", "app.hubspot.com", "unknown.example.com"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "systems" in data
    
    def test_transform(self, client):
        """Zero Meaning 변환"""
        response = client.post("/autosync/transform", json={
            "system_id": "stripe",
            "data": {
                "customer": "cus_123",
                "amount": 10000,
                "name": "이 필드는 삭제되어야 함",
                "email": "삭제@example.com"
            }
        })
        assert response.status_code == 200
        data = response.json()
        assert "transformed" in data
        # Zero Meaning: 의미 있는 필드는 제거
        transformed = data["transformed"]
        assert "node_id" in transformed
        assert "value" in transformed


# ═══════════════════════════════════════════════════════════════════════════
# Webhook 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestWebhooks:
    """Webhook 엔드포인트 테스트"""
    
    def test_stripe_webhook(self, client):
        """Stripe webhook"""
        payload = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_123",
                    "customer": "cus_456",
                    "amount": 5000
                }
            }
        }
        
        response = client.post("/webhook/stripe", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["received"] == True
    
    def test_toss_webhook(self, client):
        """토스 webhook"""
        payload = {
            "status": "DONE",
            "orderId": "customer123_order456",
            "totalAmount": 30000,
            "method": "가상계좌"
        }
        
        response = client.post("/webhook/toss", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["received"] == True
    
    def test_universal_webhook(self, client):
        """범용 webhook - 자동 감지"""
        # Stripe 스타일 페이로드
        payload = {
            "livemode": True,
            "type": "customer.created",
            "data": {
                "object": {
                    "id": "cus_new",
                    "amount": 0
                }
            }
        }
        
        response = client.post("/webhook/universal", json=payload)
        assert response.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════
# Zero Meaning 철학 테스트
# ═══════════════════════════════════════════════════════════════════════════

class TestZeroMeaning:
    """Zero Meaning 철학 검증"""
    
    def test_removes_meaningful_fields(self, client):
        """의미 있는 필드 제거 확인"""
        response = client.post("/autosync/transform", json={
            "system_id": "stripe",
            "data": {
                "id": "cus_789",
                "amount": 25000,
                # 아래 필드들은 모두 제거되어야 함
                "name": "홍길동",
                "email": "hong@test.com",
                "phone": "010-1234-5678",
                "description": "프리미엄 멤버십",
                "metadata": {"plan": "enterprise"},
                "address": {"city": "서울"}
            }
        })
        
        data = response.json()
        transformed = data.get("transformed", {})
        
        # 핵심 필드만 존재해야 함
        allowed_keys = {"node_id", "value", "timestamp", "source"}
        actual_keys = set(transformed.keys())
        
        # 의미 있는 필드는 없어야 함
        forbidden = {"name", "email", "phone", "description", "metadata", "address"}
        assert actual_keys.isdisjoint(forbidden), f"의미 있는 필드가 남아있음: {actual_keys & forbidden}"


# ═══════════════════════════════════════════════════════════════════════════
# 실행
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])







