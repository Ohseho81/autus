"""
AUTUS API v1 테스트
"""
import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app

client = TestClient(app)


class TestHealthEndpoints:
    """헬스체크 엔드포인트 테스트"""
    
    def test_root(self):
        response = client.get("/")
        assert response.status_code == 200
        assert "status" in response.json()
    
    def test_health(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
    
    def test_status(self):
        response = client.get("/status")
        assert response.status_code == 200


class TestStateAPI:
    """상태 API 테스트"""
    
    def test_get_state_v1(self):
        response = client.get("/api/v1/state")
        assert response.status_code == 200
        data = response.json()
        assert "planets" in data
        assert "twin" in data
        assert "system" in data
    
    def test_get_state_legacy(self):
        """Legacy alias 테스트"""
        response = client.get("/api/state")
        assert response.status_code == 200


class TestBurnAPI:
    """Burn API 테스트"""
    
    def test_simulate_recover(self):
        response = client.post(
            "/api/v1/burn/simulate",
            json={"impulse": "RECOVER", "magnitude": 1.0}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["impulse"] == "RECOVER"
        assert data["executed"] == False
        assert "predicted" in data
        assert "confidence" in data
    
    def test_simulate_shock_damp(self):
        response = client.post(
            "/api/v1/burn/simulate",
            json={"impulse": "SHOCK_DAMP", "magnitude": 1.0}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["impulse"] == "SHOCK_DAMP"
        assert data["confidence"] == 72  # 명세서 기준
    
    def test_simulate_defriction(self):
        response = client.post(
            "/api/v1/burn/simulate",
            json={"impulse": "DEFRICTION", "magnitude": 0.5}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["magnitude"] == 0.5


class TestPredictAPI:
    """예측 API 테스트"""
    
    def test_predict_branches(self):
        response = client.get("/api/v1/predict/branches")
        assert response.status_code == 200
        data = response.json()
        assert "current" in data
        assert "branches" in data
        assert "recommended" in data
        
        branches = data["branches"]
        assert "shock_damp" in branches
        assert "recover" in branches
        assert "defriction" in branches
        assert "no_action" in branches
    
    def test_no_action_has_warning(self):
        response = client.get("/api/v1/predict/branches")
        data = response.json()
        no_action = data["branches"]["no_action"]
        assert "hours_to_critical" in no_action
        assert "collapse_probability" in no_action


class TestExecuteAPI:
    """실행 API 테스트"""
    
    def test_execute_v1(self):
        response = client.post(
            "/api/v1/execute",
            json={"action": "AUTO_STABILIZE"}
        )
        assert response.status_code == 200
        assert response.json()["ok"] == True
    
    def test_execute_legacy(self):
        """Legacy alias 테스트"""
        response = client.post(
            "/execute",
            json={"action": "AUTO_STABILIZE"}
        )
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
