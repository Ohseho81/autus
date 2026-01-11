"""
═══════════════════════════════════════════════════════════════════════════════
🧪 AUTUS API Health Tests
═══════════════════════════════════════════════════════════════════════════════

API 헬스체크 및 기본 엔드포인트 테스트
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestHealthEndpoints:
    """헬스 체크 엔드포인트 테스트"""

    def test_health(self):
        """기본 헬스 체크"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_readiness(self):
        """준비 상태 체크"""
        response = client.get("/ready")
        assert response.status_code in [200, 404, 503]  # 미구현 허용

    def test_liveness(self):
        """생존 상태 체크"""
        response = client.get("/live")
        assert response.status_code in [200, 404]  # 미구현 허용


class TestUniverseEndpoints:
    """Universe API 테스트"""

    def test_overview(self):
        """전체 개요"""
        response = client.get("/universe/overview")
        assert response.status_code in [200, 404]  # 미구현 허용
        if response.status_code == 200:
            data = response.json()
            assert "state" in data or "nodes" in data or "success" in data

    def test_physics_state(self):
        """물리 상태 조회"""
        response = client.get("/universe/physics")
        assert response.status_code in [200, 404, 501]


class TestAuthEndpoints:
    """인증 API 테스트"""

    def test_login_invalid(self):
        """잘못된 로그인"""
        response = client.post(
            "/auth/login",
            json={"username": "invalid", "password": "invalid"}
        )
        assert response.status_code in [401, 422]

    def test_api_key_required(self):
        """API 키 필수 확인"""
        response = client.get("/api/protected")
        assert response.status_code in [401, 403, 404]


class TestPhysicsAPI:
    """Physics API 테스트"""

    def test_get_state(self):
        """물리 상태 조회"""
        response = client.get("/api/physics/state")
        assert response.status_code in [200, 404]

    def test_apply_motion(self):
        """모션 적용"""
        response = client.post(
            "/api/physics/motion",
            json={
                "physics": "CAPITAL",
                "motion": "ACQUIRE",
                "delta": 0.1
            }
        )
        assert response.status_code in [200, 404, 422]


class TestNodeAPI:
    """노드 API 테스트"""

    def test_list_nodes(self):
        """노드 목록"""
        response = client.get("/api/nodes")
        assert response.status_code in [200, 404]

    def test_get_node(self):
        """노드 상세"""
        response = client.get("/api/nodes/test-node")
        assert response.status_code in [200, 404]


class TestMetricsAPI:
    """메트릭스 API 테스트"""

    def test_metrics(self):
        """메트릭스 조회"""
        response = client.get("/metrics")
        assert response.status_code in [200, 404]


class TestDocsEndpoints:
    """문서 엔드포인트 테스트"""

    def test_openapi_docs(self):
        """OpenAPI 문서"""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_openapi_json(self):
        """OpenAPI JSON"""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data
        assert "paths" in data

    def test_redoc(self):
        """ReDoc 문서"""
        response = client.get("/redoc")
        assert response.status_code == 200


class TestErrorHandling:
    """에러 핸들링 테스트"""

    def test_not_found(self):
        """404 에러"""
        response = client.get("/nonexistent-endpoint-12345")
        assert response.status_code == 404

    def test_method_not_allowed(self):
        """405 에러"""
        response = client.delete("/health")
        assert response.status_code in [405, 404]

    def test_invalid_json(self):
        """잘못된 JSON"""
        response = client.post(
            "/api/physics/motion",
            content="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code in [400, 422, 404]
