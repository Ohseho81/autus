"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS K/I API 테스트
═══════════════════════════════════════════════════════════════════════════════
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# main 앱 import
try:
    from main import app
    client = TestClient(app)
except ImportError:
    client = None
    pytestmark = pytest.mark.skip(reason="main app not available")


class TestKIStateAPI:
    """K/I 상태 API 테스트"""
    
    def test_get_state(self):
        """K/I 상태 조회 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/state/test-entity-001")
        
        assert response.status_code == 200
        data = response.json()
        
        # 필수 필드 확인
        assert "entity_id" in data
        assert "k_index" in data
        assert "i_index" in data
        assert "dk_dt" in data
        assert "di_dt" in data
        assert "phase" in data
        
        # 값 범위 확인
        assert -1 <= data["k_index"] <= 1
        assert -1 <= data["i_index"] <= 1
    
    def test_get_state_history(self):
        """K/I 히스토리 조회 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/state/test-entity-001/history?days=7")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "entity_id" in data
        assert "data" in data
        assert isinstance(data["data"], list)


class TestNodes48API:
    """48노드 API 테스트"""
    
    def test_get_nodes(self):
        """48노드 전체 조회 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/nodes/test-entity-001")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "entity_id" in data
        assert "nodes" in data
        assert "k_index" in data
        assert "domain_scores" in data
        
        # 노드 수 확인 (최대 48개)
        assert len(data["nodes"]) <= 48
        
        # 도메인 스코어 확인
        domains = ["SURVIVE", "GROW", "RELATE", "EXPRESS"]
        for domain in domains:
            assert domain in data["domain_scores"]
    
    def test_get_node_detail(self):
        """개별 노드 상세 조회 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/nodes/test-entity-001/CASH_A")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "entity_id" in data
        assert "node_id" in data


class TestSlots144API:
    """144슬롯 API 테스트"""
    
    def test_get_slots(self):
        """144슬롯 전체 조회 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/slots/test-entity-001")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "entity_id" in data
        assert "slots" in data
        assert "i_index" in data
        assert "fill_rate" in data
        
        # 슬롯 수 확인 (최대 144개)
        assert len(data["slots"]) <= 144
        
        # 채움률 범위
        assert 0 <= data["fill_rate"] <= 1


class TestPredictionAPI:
    """궤적 예측 API 테스트"""
    
    def test_get_prediction(self):
        """궤적 예측 조회 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/predict/test-entity-001?horizon_days=30")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "entity_id" in data
        assert "current" in data
        assert "trajectory" in data
        assert "horizon_days" in data
        assert "predicted_phase" in data
        assert "risk_level" in data
        
        # 예측 포인트 확인
        assert len(data["trajectory"]) == 30
        
        # 리스크 레벨 유효값
        assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class TestAutomationAPI:
    """자동화 API 테스트"""
    
    def test_get_tasks(self):
        """자동화 태스크 목록 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/automation/tasks/test-entity-001")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            task = data[0]
            assert "task_id" in task
            assert "stage" in task
            assert "status" in task
            assert "title" in task


class TestAlertsAPI:
    """경고 API 테스트"""
    
    def test_get_alerts(self):
        """경고 목록 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/alerts/test-entity-001")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            alert = data[0]
            assert "alert_id" in alert
            assert "severity" in alert
            assert "title" in alert


class TestMetaAPI:
    """메타데이터 API 테스트"""
    
    def test_get_nodes_meta(self):
        """노드 메타데이터 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/meta/nodes")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert data["total"] == 48
        assert "structure" in data
    
    def test_get_slots_meta(self):
        """슬롯 메타데이터 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/meta/slots")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "total" in data
        assert data["total"] == 144
    
    def test_get_phases_meta(self):
        """페이즈 메타데이터 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/ki/meta/phases")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "phases" in data
        
        # 4개 페이즈 확인
        phase_names = [p["name"] for p in data["phases"]]
        assert "GROWTH" in phase_names
        assert "STABLE" in phase_names
        assert "DECLINE" in phase_names
        assert "CRISIS" in phase_names


class TestOAuthAPI:
    """OAuth API 테스트"""
    
    def test_get_status(self):
        """연결 상태 조회 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/oauth/status")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        # 지원 소스 확인
        source_types = [s["source_type"] for s in data]
        assert "gmail" in source_types
        assert "calendar" in source_types
        assert "slack" in source_types
    
    def test_connect_gmail(self):
        """Gmail 연결 시작 테스트"""
        if not client:
            pytest.skip("client not available")
            
        response = client.get("/api/oauth/connect/gmail")
        
        # OAuth URL 반환 확인
        assert response.status_code == 200
        data = response.json()
        
        assert "auth_url" in data
        assert "state" in data
        assert "google.com" in data["auth_url"]


# 단위 테스트 실행
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
