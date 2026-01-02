#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧪 AUTUS EMPIRE v4.0.0 - Test Suite                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행: pytest tests/test_empire.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main_final import app


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_customer():
    """샘플 고객 데이터"""
    return {
        "user_id": "TEST001",
        "name": "테스트고객",
        "phone": "010-1234-5678",
        "station_id": "STORE-001",
        "m_score": 80.0,
        "t_score": 20.0,
        "s_score": 60.0,
    }


@pytest.fixture
def sample_vip_customer():
    """VIP 고객 데이터 (ORBIT 등급)"""
    return {
        "user_id": "VIP001",
        "name": "VIP고객",
        "phone": "010-9999-9999",
        "station_id": "STORE-001",
        "m_score": 90.0,
        "t_score": 10.0,
        "s_score": 80.0,
    }


@pytest.fixture
def sample_blackhole_customer():
    """위험 고객 데이터 (BLACKHOLE 등급)"""
    return {
        "user_id": "RISK001",
        "name": "주의고객",
        "phone": "010-0000-0000",
        "station_id": "STORE-001",
        "m_score": 30.0,
        "t_score": 80.0,
        "s_score": 20.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Health & Status Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """헬스 체크 테스트"""
    
    def test_health_check(self, client):
        """헬스 체크 기본"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "4.0.0 FINAL FORM"
    
    def test_health_modules(self, client):
        """모든 모듈 활성화 확인"""
        response = client.get("/health")
        data = response.json()
        
        expected_modules = [
            "observer", "bounty_hunter", "physis_map",
            "human_network", "oracle_engine", "gate_keeper",
            "legal_shield", "rpg_system", "war_game"
        ]
        
        for module in expected_modules:
            assert module in data["modules"]
            assert data["modules"][module] == "active"
    
    def test_root_redirect(self, client):
        """루트 페이지 리다이렉트"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "AUTUS EMPIRE" in response.text


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Customer API Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestCustomers:
    """고객 관리 API 테스트"""
    
    def test_create_customer(self, client, sample_customer):
        """고객 생성"""
        response = client.post("/api/v1/customers", json=sample_customer)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["customer"]["user_id"] == sample_customer["user_id"]
    
    def test_create_vip_customer_rank(self, client, sample_vip_customer):
        """VIP 고객 등급 자동 분류 (ORBIT)"""
        response = client.post("/api/v1/customers", json=sample_vip_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "ORBIT"
    
    def test_create_blackhole_customer_rank(self, client, sample_blackhole_customer):
        """위험 고객 등급 자동 분류 (BLACKHOLE)"""
        response = client.post("/api/v1/customers", json=sample_blackhole_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "BLACKHOLE"
    
    def test_list_customers(self, client):
        """고객 목록 조회"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
    
    def test_get_customer(self, client, sample_customer):
        """고객 상세 조회"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 조회
        response = client.get(f"/api/v1/customers/{sample_customer['user_id']}")
        assert response.status_code == 200
    
    def test_get_customer_not_found(self, client):
        """존재하지 않는 고객 조회"""
        response = client.get("/api/v1/customers/NONEXISTENT")
        assert response.status_code == 404
    
    def test_update_scores(self, client, sample_customer):
        """M-T-S 점수 업데이트"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 점수 업데이트
        response = client.put(
            f"/api/v1/customers/{sample_customer['user_id']}/scores",
            params={"m": 95, "t": 5, "s": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer"]["m_score"] == 95
        assert data["customer"]["rank"] == "ORBIT"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. Human Network Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHumanNetwork:
    """인맥 분석 API 테스트"""
    
    def test_add_relationship(self, client, sample_customer, sample_vip_customer):
        """관계 추가"""
        # 고객들 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        client.post("/api/v1/customers", json=sample_vip_customer)
        
        # 관계 추가
        response = client.post("/api/v1/network/relationship", json={
            "source_id": sample_customer["user_id"],
            "target_id": sample_vip_customer["user_id"],
            "rel_type": "FRIEND",
            "strength": 1.0,
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_get_pagerank(self, client):
        """PageRank 조회"""
        response = client.get("/api/v1/network/pagerank")
        assert response.status_code == 200
        assert "ranking" in response.json()
    
    def test_get_queen_bees(self, client):
        """여왕벌 탐색"""
        response = client.get("/api/v1/network/queen-bees")
        assert response.status_code == 200
        assert "queen_bees" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Oracle Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestOracleEngine:
    """예측 AI 테스트"""
    
    def test_predict_tomorrow(self, client):
        """내일 예측"""
        response = client.get("/api/v1/oracle/tomorrow/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "weather" in data
        assert "expected_revenue" in data
        assert data["expected_revenue"] > 0
    
    def test_weekly_forecast(self, client):
        """주간 예보"""
        response = client.get("/api/v1/oracle/weekly/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "forecasts" in data
        assert len(data["forecasts"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. War Game Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestWarGame:
    """시뮬레이터 테스트"""
    
    def test_simulate_coupon(self, client):
        """쿠폰 시뮬레이션"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 20.0,
            "target_group": "all",
            "budget": 1000000,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "expected_profit" in data
        assert "risk_level" in data
    
    def test_optimal_discount(self, client):
        """최적 할인율 탐색"""
        response = client.get("/api/v1/wargame/optimal-discount")
        assert response.status_code == 200
        
        data = response.json()
        assert "optimal_discount" in data
        assert 0 <= data["optimal_discount"] <= 50
    
    def test_high_discount_warning(self, client):
        """과도한 할인 경고"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 50.0,
            "target_group": "all",
        })
        data = response.json()
        
        # 50% 할인은 적자 예상
        assert data["risk_level"] == "HIGH"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. RPG System Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestRPGSystem:
    """게이미피케이션 테스트"""
    
    def test_create_player(self, client):
        """플레이어 생성"""
        response = client.post(
            "/api/v1/rpg/player",
            params={"employee_id": "EMP001", "name": "TestPlayer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["player"]["level"] == 1
        assert data["player"]["xp"] == 0
    
    def test_complete_quest(self, client):
        """퀘스트 완료"""
        # 플레이어 생성
        client.post("/api/v1/rpg/player", params={"employee_id": "EMP002", "name": "QuestPlayer"})
        
        # 퀘스트 완료
        response = client.post("/api/v1/rpg/quest/complete", json={
            "employee_id": "EMP002",
            "quest_id": "d1",  # 정시 출근
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["xp_gained"] == 20
        assert data["gold_gained"] == 1000
    
    def test_leaderboard(self, client):
        """랭킹 조회"""
        response = client.get("/api/v1/rpg/leaderboard")
        assert response.status_code == 200
        assert "leaderboard" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. Gate Keeper Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGateKeeper:
    """입장 관리 테스트"""
    
    def test_log_entry(self, client):
        """입장 기록"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "GATE001",
            "name": "방문자",
            "rank": "NORMAL",
            "station_id": "STORE-001",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_vip_entry_alert(self, client):
        """VIP 입장 알림"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "VIPGATE001",
            "name": "VIP방문자",
            "rank": "ORBIT",
            "station_id": "STORE-001",
        })
        data = response.json()
        
        assert len(data["alerts"]) > 0
        assert data["alerts"][0]["type"] == "VIP"
    
    def test_today_count(self, client):
        """오늘 입장 수"""
        response = client.get("/api/v1/gate/today-count")
        assert response.status_code == 200
        assert "count" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. Legal Shield Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestLegalShield:
    """동의 시스템 테스트"""
    
    def test_record_consent(self, client):
        """동의 기록"""
        response = client.post("/api/v1/legal/consent", json={
            "name": "동의자",
            "phone": "010-1111-2222",
            "station_id": "STORE-001",
            "agreed_items": {
                "개인정보수집": True,
                "마케팅활용": False,
            },
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
    
    def test_verify_consent(self, client):
        """동의 확인"""
        # 먼저 동의 기록
        client.post("/api/v1/legal/consent", json={
            "name": "확인자",
            "phone": "010-3333-4444",
            "station_id": "STORE-001",
            "agreed_items": {"개인정보수집": True},
        })
        
        # 확인
        response = client.get("/api/v1/legal/verify/010-3333-4444")
        assert response.status_code == 200
        assert response.json()["has_consent"] is True


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. God Mode Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGodMode:
    """관리자 대시보드 테스트"""
    
    def test_overview(self, client):
        """전체 현황"""
        response = client.get("/api/v1/godmode/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "rank_distribution" in data
    
    def test_alerts(self, client):
        """실시간 알림"""
        response = client.get("/api/v1/godmode/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. Statistics Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestStatistics:
    """통계 테스트"""
    
    def test_daily_stats(self, client):
        """일별 통계"""
        response = client.get("/api/v1/stats/daily/2025-01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-01"
        assert "total_entries" in data
    
    def test_weekly_stats(self, client):
        """주간 통계"""
        response = client.get("/api/v1/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert "weekly_stats" in data
        assert len(data["weekly_stats"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧪 AUTUS EMPIRE v4.0.0 - Test Suite                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행: pytest tests/test_empire.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main_final import app


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_customer():
    """샘플 고객 데이터"""
    return {
        "user_id": "TEST001",
        "name": "테스트고객",
        "phone": "010-1234-5678",
        "station_id": "STORE-001",
        "m_score": 80.0,
        "t_score": 20.0,
        "s_score": 60.0,
    }


@pytest.fixture
def sample_vip_customer():
    """VIP 고객 데이터 (ORBIT 등급)"""
    return {
        "user_id": "VIP001",
        "name": "VIP고객",
        "phone": "010-9999-9999",
        "station_id": "STORE-001",
        "m_score": 90.0,
        "t_score": 10.0,
        "s_score": 80.0,
    }


@pytest.fixture
def sample_blackhole_customer():
    """위험 고객 데이터 (BLACKHOLE 등급)"""
    return {
        "user_id": "RISK001",
        "name": "주의고객",
        "phone": "010-0000-0000",
        "station_id": "STORE-001",
        "m_score": 30.0,
        "t_score": 80.0,
        "s_score": 20.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Health & Status Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """헬스 체크 테스트"""
    
    def test_health_check(self, client):
        """헬스 체크 기본"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "4.0.0 FINAL FORM"
    
    def test_health_modules(self, client):
        """모든 모듈 활성화 확인"""
        response = client.get("/health")
        data = response.json()
        
        expected_modules = [
            "observer", "bounty_hunter", "physis_map",
            "human_network", "oracle_engine", "gate_keeper",
            "legal_shield", "rpg_system", "war_game"
        ]
        
        for module in expected_modules:
            assert module in data["modules"]
            assert data["modules"][module] == "active"
    
    def test_root_redirect(self, client):
        """루트 페이지 리다이렉트"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "AUTUS EMPIRE" in response.text


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Customer API Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestCustomers:
    """고객 관리 API 테스트"""
    
    def test_create_customer(self, client, sample_customer):
        """고객 생성"""
        response = client.post("/api/v1/customers", json=sample_customer)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["customer"]["user_id"] == sample_customer["user_id"]
    
    def test_create_vip_customer_rank(self, client, sample_vip_customer):
        """VIP 고객 등급 자동 분류 (ORBIT)"""
        response = client.post("/api/v1/customers", json=sample_vip_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "ORBIT"
    
    def test_create_blackhole_customer_rank(self, client, sample_blackhole_customer):
        """위험 고객 등급 자동 분류 (BLACKHOLE)"""
        response = client.post("/api/v1/customers", json=sample_blackhole_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "BLACKHOLE"
    
    def test_list_customers(self, client):
        """고객 목록 조회"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
    
    def test_get_customer(self, client, sample_customer):
        """고객 상세 조회"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 조회
        response = client.get(f"/api/v1/customers/{sample_customer['user_id']}")
        assert response.status_code == 200
    
    def test_get_customer_not_found(self, client):
        """존재하지 않는 고객 조회"""
        response = client.get("/api/v1/customers/NONEXISTENT")
        assert response.status_code == 404
    
    def test_update_scores(self, client, sample_customer):
        """M-T-S 점수 업데이트"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 점수 업데이트
        response = client.put(
            f"/api/v1/customers/{sample_customer['user_id']}/scores",
            params={"m": 95, "t": 5, "s": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer"]["m_score"] == 95
        assert data["customer"]["rank"] == "ORBIT"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. Human Network Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHumanNetwork:
    """인맥 분석 API 테스트"""
    
    def test_add_relationship(self, client, sample_customer, sample_vip_customer):
        """관계 추가"""
        # 고객들 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        client.post("/api/v1/customers", json=sample_vip_customer)
        
        # 관계 추가
        response = client.post("/api/v1/network/relationship", json={
            "source_id": sample_customer["user_id"],
            "target_id": sample_vip_customer["user_id"],
            "rel_type": "FRIEND",
            "strength": 1.0,
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_get_pagerank(self, client):
        """PageRank 조회"""
        response = client.get("/api/v1/network/pagerank")
        assert response.status_code == 200
        assert "ranking" in response.json()
    
    def test_get_queen_bees(self, client):
        """여왕벌 탐색"""
        response = client.get("/api/v1/network/queen-bees")
        assert response.status_code == 200
        assert "queen_bees" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Oracle Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestOracleEngine:
    """예측 AI 테스트"""
    
    def test_predict_tomorrow(self, client):
        """내일 예측"""
        response = client.get("/api/v1/oracle/tomorrow/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "weather" in data
        assert "expected_revenue" in data
        assert data["expected_revenue"] > 0
    
    def test_weekly_forecast(self, client):
        """주간 예보"""
        response = client.get("/api/v1/oracle/weekly/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "forecasts" in data
        assert len(data["forecasts"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. War Game Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestWarGame:
    """시뮬레이터 테스트"""
    
    def test_simulate_coupon(self, client):
        """쿠폰 시뮬레이션"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 20.0,
            "target_group": "all",
            "budget": 1000000,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "expected_profit" in data
        assert "risk_level" in data
    
    def test_optimal_discount(self, client):
        """최적 할인율 탐색"""
        response = client.get("/api/v1/wargame/optimal-discount")
        assert response.status_code == 200
        
        data = response.json()
        assert "optimal_discount" in data
        assert 0 <= data["optimal_discount"] <= 50
    
    def test_high_discount_warning(self, client):
        """과도한 할인 경고"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 50.0,
            "target_group": "all",
        })
        data = response.json()
        
        # 50% 할인은 적자 예상
        assert data["risk_level"] == "HIGH"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. RPG System Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestRPGSystem:
    """게이미피케이션 테스트"""
    
    def test_create_player(self, client):
        """플레이어 생성"""
        response = client.post(
            "/api/v1/rpg/player",
            params={"employee_id": "EMP001", "name": "TestPlayer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["player"]["level"] == 1
        assert data["player"]["xp"] == 0
    
    def test_complete_quest(self, client):
        """퀘스트 완료"""
        # 플레이어 생성
        client.post("/api/v1/rpg/player", params={"employee_id": "EMP002", "name": "QuestPlayer"})
        
        # 퀘스트 완료
        response = client.post("/api/v1/rpg/quest/complete", json={
            "employee_id": "EMP002",
            "quest_id": "d1",  # 정시 출근
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["xp_gained"] == 20
        assert data["gold_gained"] == 1000
    
    def test_leaderboard(self, client):
        """랭킹 조회"""
        response = client.get("/api/v1/rpg/leaderboard")
        assert response.status_code == 200
        assert "leaderboard" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. Gate Keeper Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGateKeeper:
    """입장 관리 테스트"""
    
    def test_log_entry(self, client):
        """입장 기록"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "GATE001",
            "name": "방문자",
            "rank": "NORMAL",
            "station_id": "STORE-001",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_vip_entry_alert(self, client):
        """VIP 입장 알림"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "VIPGATE001",
            "name": "VIP방문자",
            "rank": "ORBIT",
            "station_id": "STORE-001",
        })
        data = response.json()
        
        assert len(data["alerts"]) > 0
        assert data["alerts"][0]["type"] == "VIP"
    
    def test_today_count(self, client):
        """오늘 입장 수"""
        response = client.get("/api/v1/gate/today-count")
        assert response.status_code == 200
        assert "count" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. Legal Shield Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestLegalShield:
    """동의 시스템 테스트"""
    
    def test_record_consent(self, client):
        """동의 기록"""
        response = client.post("/api/v1/legal/consent", json={
            "name": "동의자",
            "phone": "010-1111-2222",
            "station_id": "STORE-001",
            "agreed_items": {
                "개인정보수집": True,
                "마케팅활용": False,
            },
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
    
    def test_verify_consent(self, client):
        """동의 확인"""
        # 먼저 동의 기록
        client.post("/api/v1/legal/consent", json={
            "name": "확인자",
            "phone": "010-3333-4444",
            "station_id": "STORE-001",
            "agreed_items": {"개인정보수집": True},
        })
        
        # 확인
        response = client.get("/api/v1/legal/verify/010-3333-4444")
        assert response.status_code == 200
        assert response.json()["has_consent"] is True


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. God Mode Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGodMode:
    """관리자 대시보드 테스트"""
    
    def test_overview(self, client):
        """전체 현황"""
        response = client.get("/api/v1/godmode/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "rank_distribution" in data
    
    def test_alerts(self, client):
        """실시간 알림"""
        response = client.get("/api/v1/godmode/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. Statistics Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestStatistics:
    """통계 테스트"""
    
    def test_daily_stats(self, client):
        """일별 통계"""
        response = client.get("/api/v1/stats/daily/2025-01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-01"
        assert "total_entries" in data
    
    def test_weekly_stats(self, client):
        """주간 통계"""
        response = client.get("/api/v1/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert "weekly_stats" in data
        assert len(data["weekly_stats"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧪 AUTUS EMPIRE v4.0.0 - Test Suite                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행: pytest tests/test_empire.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main_final import app


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_customer():
    """샘플 고객 데이터"""
    return {
        "user_id": "TEST001",
        "name": "테스트고객",
        "phone": "010-1234-5678",
        "station_id": "STORE-001",
        "m_score": 80.0,
        "t_score": 20.0,
        "s_score": 60.0,
    }


@pytest.fixture
def sample_vip_customer():
    """VIP 고객 데이터 (ORBIT 등급)"""
    return {
        "user_id": "VIP001",
        "name": "VIP고객",
        "phone": "010-9999-9999",
        "station_id": "STORE-001",
        "m_score": 90.0,
        "t_score": 10.0,
        "s_score": 80.0,
    }


@pytest.fixture
def sample_blackhole_customer():
    """위험 고객 데이터 (BLACKHOLE 등급)"""
    return {
        "user_id": "RISK001",
        "name": "주의고객",
        "phone": "010-0000-0000",
        "station_id": "STORE-001",
        "m_score": 30.0,
        "t_score": 80.0,
        "s_score": 20.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Health & Status Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """헬스 체크 테스트"""
    
    def test_health_check(self, client):
        """헬스 체크 기본"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "4.0.0 FINAL FORM"
    
    def test_health_modules(self, client):
        """모든 모듈 활성화 확인"""
        response = client.get("/health")
        data = response.json()
        
        expected_modules = [
            "observer", "bounty_hunter", "physis_map",
            "human_network", "oracle_engine", "gate_keeper",
            "legal_shield", "rpg_system", "war_game"
        ]
        
        for module in expected_modules:
            assert module in data["modules"]
            assert data["modules"][module] == "active"
    
    def test_root_redirect(self, client):
        """루트 페이지 리다이렉트"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "AUTUS EMPIRE" in response.text


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Customer API Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestCustomers:
    """고객 관리 API 테스트"""
    
    def test_create_customer(self, client, sample_customer):
        """고객 생성"""
        response = client.post("/api/v1/customers", json=sample_customer)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["customer"]["user_id"] == sample_customer["user_id"]
    
    def test_create_vip_customer_rank(self, client, sample_vip_customer):
        """VIP 고객 등급 자동 분류 (ORBIT)"""
        response = client.post("/api/v1/customers", json=sample_vip_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "ORBIT"
    
    def test_create_blackhole_customer_rank(self, client, sample_blackhole_customer):
        """위험 고객 등급 자동 분류 (BLACKHOLE)"""
        response = client.post("/api/v1/customers", json=sample_blackhole_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "BLACKHOLE"
    
    def test_list_customers(self, client):
        """고객 목록 조회"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
    
    def test_get_customer(self, client, sample_customer):
        """고객 상세 조회"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 조회
        response = client.get(f"/api/v1/customers/{sample_customer['user_id']}")
        assert response.status_code == 200
    
    def test_get_customer_not_found(self, client):
        """존재하지 않는 고객 조회"""
        response = client.get("/api/v1/customers/NONEXISTENT")
        assert response.status_code == 404
    
    def test_update_scores(self, client, sample_customer):
        """M-T-S 점수 업데이트"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 점수 업데이트
        response = client.put(
            f"/api/v1/customers/{sample_customer['user_id']}/scores",
            params={"m": 95, "t": 5, "s": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer"]["m_score"] == 95
        assert data["customer"]["rank"] == "ORBIT"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. Human Network Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHumanNetwork:
    """인맥 분석 API 테스트"""
    
    def test_add_relationship(self, client, sample_customer, sample_vip_customer):
        """관계 추가"""
        # 고객들 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        client.post("/api/v1/customers", json=sample_vip_customer)
        
        # 관계 추가
        response = client.post("/api/v1/network/relationship", json={
            "source_id": sample_customer["user_id"],
            "target_id": sample_vip_customer["user_id"],
            "rel_type": "FRIEND",
            "strength": 1.0,
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_get_pagerank(self, client):
        """PageRank 조회"""
        response = client.get("/api/v1/network/pagerank")
        assert response.status_code == 200
        assert "ranking" in response.json()
    
    def test_get_queen_bees(self, client):
        """여왕벌 탐색"""
        response = client.get("/api/v1/network/queen-bees")
        assert response.status_code == 200
        assert "queen_bees" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Oracle Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestOracleEngine:
    """예측 AI 테스트"""
    
    def test_predict_tomorrow(self, client):
        """내일 예측"""
        response = client.get("/api/v1/oracle/tomorrow/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "weather" in data
        assert "expected_revenue" in data
        assert data["expected_revenue"] > 0
    
    def test_weekly_forecast(self, client):
        """주간 예보"""
        response = client.get("/api/v1/oracle/weekly/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "forecasts" in data
        assert len(data["forecasts"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. War Game Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestWarGame:
    """시뮬레이터 테스트"""
    
    def test_simulate_coupon(self, client):
        """쿠폰 시뮬레이션"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 20.0,
            "target_group": "all",
            "budget": 1000000,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "expected_profit" in data
        assert "risk_level" in data
    
    def test_optimal_discount(self, client):
        """최적 할인율 탐색"""
        response = client.get("/api/v1/wargame/optimal-discount")
        assert response.status_code == 200
        
        data = response.json()
        assert "optimal_discount" in data
        assert 0 <= data["optimal_discount"] <= 50
    
    def test_high_discount_warning(self, client):
        """과도한 할인 경고"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 50.0,
            "target_group": "all",
        })
        data = response.json()
        
        # 50% 할인은 적자 예상
        assert data["risk_level"] == "HIGH"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. RPG System Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestRPGSystem:
    """게이미피케이션 테스트"""
    
    def test_create_player(self, client):
        """플레이어 생성"""
        response = client.post(
            "/api/v1/rpg/player",
            params={"employee_id": "EMP001", "name": "TestPlayer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["player"]["level"] == 1
        assert data["player"]["xp"] == 0
    
    def test_complete_quest(self, client):
        """퀘스트 완료"""
        # 플레이어 생성
        client.post("/api/v1/rpg/player", params={"employee_id": "EMP002", "name": "QuestPlayer"})
        
        # 퀘스트 완료
        response = client.post("/api/v1/rpg/quest/complete", json={
            "employee_id": "EMP002",
            "quest_id": "d1",  # 정시 출근
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["xp_gained"] == 20
        assert data["gold_gained"] == 1000
    
    def test_leaderboard(self, client):
        """랭킹 조회"""
        response = client.get("/api/v1/rpg/leaderboard")
        assert response.status_code == 200
        assert "leaderboard" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. Gate Keeper Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGateKeeper:
    """입장 관리 테스트"""
    
    def test_log_entry(self, client):
        """입장 기록"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "GATE001",
            "name": "방문자",
            "rank": "NORMAL",
            "station_id": "STORE-001",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_vip_entry_alert(self, client):
        """VIP 입장 알림"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "VIPGATE001",
            "name": "VIP방문자",
            "rank": "ORBIT",
            "station_id": "STORE-001",
        })
        data = response.json()
        
        assert len(data["alerts"]) > 0
        assert data["alerts"][0]["type"] == "VIP"
    
    def test_today_count(self, client):
        """오늘 입장 수"""
        response = client.get("/api/v1/gate/today-count")
        assert response.status_code == 200
        assert "count" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. Legal Shield Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestLegalShield:
    """동의 시스템 테스트"""
    
    def test_record_consent(self, client):
        """동의 기록"""
        response = client.post("/api/v1/legal/consent", json={
            "name": "동의자",
            "phone": "010-1111-2222",
            "station_id": "STORE-001",
            "agreed_items": {
                "개인정보수집": True,
                "마케팅활용": False,
            },
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
    
    def test_verify_consent(self, client):
        """동의 확인"""
        # 먼저 동의 기록
        client.post("/api/v1/legal/consent", json={
            "name": "확인자",
            "phone": "010-3333-4444",
            "station_id": "STORE-001",
            "agreed_items": {"개인정보수집": True},
        })
        
        # 확인
        response = client.get("/api/v1/legal/verify/010-3333-4444")
        assert response.status_code == 200
        assert response.json()["has_consent"] is True


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. God Mode Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGodMode:
    """관리자 대시보드 테스트"""
    
    def test_overview(self, client):
        """전체 현황"""
        response = client.get("/api/v1/godmode/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "rank_distribution" in data
    
    def test_alerts(self, client):
        """실시간 알림"""
        response = client.get("/api/v1/godmode/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. Statistics Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestStatistics:
    """통계 테스트"""
    
    def test_daily_stats(self, client):
        """일별 통계"""
        response = client.get("/api/v1/stats/daily/2025-01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-01"
        assert "total_entries" in data
    
    def test_weekly_stats(self, client):
        """주간 통계"""
        response = client.get("/api/v1/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert "weekly_stats" in data
        assert len(data["weekly_stats"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧪 AUTUS EMPIRE v4.0.0 - Test Suite                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행: pytest tests/test_empire.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main_final import app


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_customer():
    """샘플 고객 데이터"""
    return {
        "user_id": "TEST001",
        "name": "테스트고객",
        "phone": "010-1234-5678",
        "station_id": "STORE-001",
        "m_score": 80.0,
        "t_score": 20.0,
        "s_score": 60.0,
    }


@pytest.fixture
def sample_vip_customer():
    """VIP 고객 데이터 (ORBIT 등급)"""
    return {
        "user_id": "VIP001",
        "name": "VIP고객",
        "phone": "010-9999-9999",
        "station_id": "STORE-001",
        "m_score": 90.0,
        "t_score": 10.0,
        "s_score": 80.0,
    }


@pytest.fixture
def sample_blackhole_customer():
    """위험 고객 데이터 (BLACKHOLE 등급)"""
    return {
        "user_id": "RISK001",
        "name": "주의고객",
        "phone": "010-0000-0000",
        "station_id": "STORE-001",
        "m_score": 30.0,
        "t_score": 80.0,
        "s_score": 20.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Health & Status Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """헬스 체크 테스트"""
    
    def test_health_check(self, client):
        """헬스 체크 기본"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "4.0.0 FINAL FORM"
    
    def test_health_modules(self, client):
        """모든 모듈 활성화 확인"""
        response = client.get("/health")
        data = response.json()
        
        expected_modules = [
            "observer", "bounty_hunter", "physis_map",
            "human_network", "oracle_engine", "gate_keeper",
            "legal_shield", "rpg_system", "war_game"
        ]
        
        for module in expected_modules:
            assert module in data["modules"]
            assert data["modules"][module] == "active"
    
    def test_root_redirect(self, client):
        """루트 페이지 리다이렉트"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "AUTUS EMPIRE" in response.text


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Customer API Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestCustomers:
    """고객 관리 API 테스트"""
    
    def test_create_customer(self, client, sample_customer):
        """고객 생성"""
        response = client.post("/api/v1/customers", json=sample_customer)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["customer"]["user_id"] == sample_customer["user_id"]
    
    def test_create_vip_customer_rank(self, client, sample_vip_customer):
        """VIP 고객 등급 자동 분류 (ORBIT)"""
        response = client.post("/api/v1/customers", json=sample_vip_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "ORBIT"
    
    def test_create_blackhole_customer_rank(self, client, sample_blackhole_customer):
        """위험 고객 등급 자동 분류 (BLACKHOLE)"""
        response = client.post("/api/v1/customers", json=sample_blackhole_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "BLACKHOLE"
    
    def test_list_customers(self, client):
        """고객 목록 조회"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
    
    def test_get_customer(self, client, sample_customer):
        """고객 상세 조회"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 조회
        response = client.get(f"/api/v1/customers/{sample_customer['user_id']}")
        assert response.status_code == 200
    
    def test_get_customer_not_found(self, client):
        """존재하지 않는 고객 조회"""
        response = client.get("/api/v1/customers/NONEXISTENT")
        assert response.status_code == 404
    
    def test_update_scores(self, client, sample_customer):
        """M-T-S 점수 업데이트"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 점수 업데이트
        response = client.put(
            f"/api/v1/customers/{sample_customer['user_id']}/scores",
            params={"m": 95, "t": 5, "s": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer"]["m_score"] == 95
        assert data["customer"]["rank"] == "ORBIT"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. Human Network Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHumanNetwork:
    """인맥 분석 API 테스트"""
    
    def test_add_relationship(self, client, sample_customer, sample_vip_customer):
        """관계 추가"""
        # 고객들 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        client.post("/api/v1/customers", json=sample_vip_customer)
        
        # 관계 추가
        response = client.post("/api/v1/network/relationship", json={
            "source_id": sample_customer["user_id"],
            "target_id": sample_vip_customer["user_id"],
            "rel_type": "FRIEND",
            "strength": 1.0,
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_get_pagerank(self, client):
        """PageRank 조회"""
        response = client.get("/api/v1/network/pagerank")
        assert response.status_code == 200
        assert "ranking" in response.json()
    
    def test_get_queen_bees(self, client):
        """여왕벌 탐색"""
        response = client.get("/api/v1/network/queen-bees")
        assert response.status_code == 200
        assert "queen_bees" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Oracle Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestOracleEngine:
    """예측 AI 테스트"""
    
    def test_predict_tomorrow(self, client):
        """내일 예측"""
        response = client.get("/api/v1/oracle/tomorrow/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "weather" in data
        assert "expected_revenue" in data
        assert data["expected_revenue"] > 0
    
    def test_weekly_forecast(self, client):
        """주간 예보"""
        response = client.get("/api/v1/oracle/weekly/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "forecasts" in data
        assert len(data["forecasts"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. War Game Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestWarGame:
    """시뮬레이터 테스트"""
    
    def test_simulate_coupon(self, client):
        """쿠폰 시뮬레이션"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 20.0,
            "target_group": "all",
            "budget": 1000000,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "expected_profit" in data
        assert "risk_level" in data
    
    def test_optimal_discount(self, client):
        """최적 할인율 탐색"""
        response = client.get("/api/v1/wargame/optimal-discount")
        assert response.status_code == 200
        
        data = response.json()
        assert "optimal_discount" in data
        assert 0 <= data["optimal_discount"] <= 50
    
    def test_high_discount_warning(self, client):
        """과도한 할인 경고"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 50.0,
            "target_group": "all",
        })
        data = response.json()
        
        # 50% 할인은 적자 예상
        assert data["risk_level"] == "HIGH"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. RPG System Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestRPGSystem:
    """게이미피케이션 테스트"""
    
    def test_create_player(self, client):
        """플레이어 생성"""
        response = client.post(
            "/api/v1/rpg/player",
            params={"employee_id": "EMP001", "name": "TestPlayer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["player"]["level"] == 1
        assert data["player"]["xp"] == 0
    
    def test_complete_quest(self, client):
        """퀘스트 완료"""
        # 플레이어 생성
        client.post("/api/v1/rpg/player", params={"employee_id": "EMP002", "name": "QuestPlayer"})
        
        # 퀘스트 완료
        response = client.post("/api/v1/rpg/quest/complete", json={
            "employee_id": "EMP002",
            "quest_id": "d1",  # 정시 출근
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["xp_gained"] == 20
        assert data["gold_gained"] == 1000
    
    def test_leaderboard(self, client):
        """랭킹 조회"""
        response = client.get("/api/v1/rpg/leaderboard")
        assert response.status_code == 200
        assert "leaderboard" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. Gate Keeper Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGateKeeper:
    """입장 관리 테스트"""
    
    def test_log_entry(self, client):
        """입장 기록"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "GATE001",
            "name": "방문자",
            "rank": "NORMAL",
            "station_id": "STORE-001",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_vip_entry_alert(self, client):
        """VIP 입장 알림"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "VIPGATE001",
            "name": "VIP방문자",
            "rank": "ORBIT",
            "station_id": "STORE-001",
        })
        data = response.json()
        
        assert len(data["alerts"]) > 0
        assert data["alerts"][0]["type"] == "VIP"
    
    def test_today_count(self, client):
        """오늘 입장 수"""
        response = client.get("/api/v1/gate/today-count")
        assert response.status_code == 200
        assert "count" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. Legal Shield Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestLegalShield:
    """동의 시스템 테스트"""
    
    def test_record_consent(self, client):
        """동의 기록"""
        response = client.post("/api/v1/legal/consent", json={
            "name": "동의자",
            "phone": "010-1111-2222",
            "station_id": "STORE-001",
            "agreed_items": {
                "개인정보수집": True,
                "마케팅활용": False,
            },
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
    
    def test_verify_consent(self, client):
        """동의 확인"""
        # 먼저 동의 기록
        client.post("/api/v1/legal/consent", json={
            "name": "확인자",
            "phone": "010-3333-4444",
            "station_id": "STORE-001",
            "agreed_items": {"개인정보수집": True},
        })
        
        # 확인
        response = client.get("/api/v1/legal/verify/010-3333-4444")
        assert response.status_code == 200
        assert response.json()["has_consent"] is True


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. God Mode Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGodMode:
    """관리자 대시보드 테스트"""
    
    def test_overview(self, client):
        """전체 현황"""
        response = client.get("/api/v1/godmode/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "rank_distribution" in data
    
    def test_alerts(self, client):
        """실시간 알림"""
        response = client.get("/api/v1/godmode/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. Statistics Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestStatistics:
    """통계 테스트"""
    
    def test_daily_stats(self, client):
        """일별 통계"""
        response = client.get("/api/v1/stats/daily/2025-01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-01"
        assert "total_entries" in data
    
    def test_weekly_stats(self, client):
        """주간 통계"""
        response = client.get("/api/v1/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert "weekly_stats" in data
        assert len(data["weekly_stats"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧪 AUTUS EMPIRE v4.0.0 - Test Suite                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행: pytest tests/test_empire.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main_final import app


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_customer():
    """샘플 고객 데이터"""
    return {
        "user_id": "TEST001",
        "name": "테스트고객",
        "phone": "010-1234-5678",
        "station_id": "STORE-001",
        "m_score": 80.0,
        "t_score": 20.0,
        "s_score": 60.0,
    }


@pytest.fixture
def sample_vip_customer():
    """VIP 고객 데이터 (ORBIT 등급)"""
    return {
        "user_id": "VIP001",
        "name": "VIP고객",
        "phone": "010-9999-9999",
        "station_id": "STORE-001",
        "m_score": 90.0,
        "t_score": 10.0,
        "s_score": 80.0,
    }


@pytest.fixture
def sample_blackhole_customer():
    """위험 고객 데이터 (BLACKHOLE 등급)"""
    return {
        "user_id": "RISK001",
        "name": "주의고객",
        "phone": "010-0000-0000",
        "station_id": "STORE-001",
        "m_score": 30.0,
        "t_score": 80.0,
        "s_score": 20.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Health & Status Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """헬스 체크 테스트"""
    
    def test_health_check(self, client):
        """헬스 체크 기본"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "4.0.0 FINAL FORM"
    
    def test_health_modules(self, client):
        """모든 모듈 활성화 확인"""
        response = client.get("/health")
        data = response.json()
        
        expected_modules = [
            "observer", "bounty_hunter", "physis_map",
            "human_network", "oracle_engine", "gate_keeper",
            "legal_shield", "rpg_system", "war_game"
        ]
        
        for module in expected_modules:
            assert module in data["modules"]
            assert data["modules"][module] == "active"
    
    def test_root_redirect(self, client):
        """루트 페이지 리다이렉트"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "AUTUS EMPIRE" in response.text


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Customer API Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestCustomers:
    """고객 관리 API 테스트"""
    
    def test_create_customer(self, client, sample_customer):
        """고객 생성"""
        response = client.post("/api/v1/customers", json=sample_customer)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["customer"]["user_id"] == sample_customer["user_id"]
    
    def test_create_vip_customer_rank(self, client, sample_vip_customer):
        """VIP 고객 등급 자동 분류 (ORBIT)"""
        response = client.post("/api/v1/customers", json=sample_vip_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "ORBIT"
    
    def test_create_blackhole_customer_rank(self, client, sample_blackhole_customer):
        """위험 고객 등급 자동 분류 (BLACKHOLE)"""
        response = client.post("/api/v1/customers", json=sample_blackhole_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "BLACKHOLE"
    
    def test_list_customers(self, client):
        """고객 목록 조회"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
    
    def test_get_customer(self, client, sample_customer):
        """고객 상세 조회"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 조회
        response = client.get(f"/api/v1/customers/{sample_customer['user_id']}")
        assert response.status_code == 200
    
    def test_get_customer_not_found(self, client):
        """존재하지 않는 고객 조회"""
        response = client.get("/api/v1/customers/NONEXISTENT")
        assert response.status_code == 404
    
    def test_update_scores(self, client, sample_customer):
        """M-T-S 점수 업데이트"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 점수 업데이트
        response = client.put(
            f"/api/v1/customers/{sample_customer['user_id']}/scores",
            params={"m": 95, "t": 5, "s": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer"]["m_score"] == 95
        assert data["customer"]["rank"] == "ORBIT"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. Human Network Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHumanNetwork:
    """인맥 분석 API 테스트"""
    
    def test_add_relationship(self, client, sample_customer, sample_vip_customer):
        """관계 추가"""
        # 고객들 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        client.post("/api/v1/customers", json=sample_vip_customer)
        
        # 관계 추가
        response = client.post("/api/v1/network/relationship", json={
            "source_id": sample_customer["user_id"],
            "target_id": sample_vip_customer["user_id"],
            "rel_type": "FRIEND",
            "strength": 1.0,
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_get_pagerank(self, client):
        """PageRank 조회"""
        response = client.get("/api/v1/network/pagerank")
        assert response.status_code == 200
        assert "ranking" in response.json()
    
    def test_get_queen_bees(self, client):
        """여왕벌 탐색"""
        response = client.get("/api/v1/network/queen-bees")
        assert response.status_code == 200
        assert "queen_bees" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Oracle Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestOracleEngine:
    """예측 AI 테스트"""
    
    def test_predict_tomorrow(self, client):
        """내일 예측"""
        response = client.get("/api/v1/oracle/tomorrow/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "weather" in data
        assert "expected_revenue" in data
        assert data["expected_revenue"] > 0
    
    def test_weekly_forecast(self, client):
        """주간 예보"""
        response = client.get("/api/v1/oracle/weekly/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "forecasts" in data
        assert len(data["forecasts"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. War Game Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestWarGame:
    """시뮬레이터 테스트"""
    
    def test_simulate_coupon(self, client):
        """쿠폰 시뮬레이션"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 20.0,
            "target_group": "all",
            "budget": 1000000,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "expected_profit" in data
        assert "risk_level" in data
    
    def test_optimal_discount(self, client):
        """최적 할인율 탐색"""
        response = client.get("/api/v1/wargame/optimal-discount")
        assert response.status_code == 200
        
        data = response.json()
        assert "optimal_discount" in data
        assert 0 <= data["optimal_discount"] <= 50
    
    def test_high_discount_warning(self, client):
        """과도한 할인 경고"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 50.0,
            "target_group": "all",
        })
        data = response.json()
        
        # 50% 할인은 적자 예상
        assert data["risk_level"] == "HIGH"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. RPG System Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestRPGSystem:
    """게이미피케이션 테스트"""
    
    def test_create_player(self, client):
        """플레이어 생성"""
        response = client.post(
            "/api/v1/rpg/player",
            params={"employee_id": "EMP001", "name": "TestPlayer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["player"]["level"] == 1
        assert data["player"]["xp"] == 0
    
    def test_complete_quest(self, client):
        """퀘스트 완료"""
        # 플레이어 생성
        client.post("/api/v1/rpg/player", params={"employee_id": "EMP002", "name": "QuestPlayer"})
        
        # 퀘스트 완료
        response = client.post("/api/v1/rpg/quest/complete", json={
            "employee_id": "EMP002",
            "quest_id": "d1",  # 정시 출근
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["xp_gained"] == 20
        assert data["gold_gained"] == 1000
    
    def test_leaderboard(self, client):
        """랭킹 조회"""
        response = client.get("/api/v1/rpg/leaderboard")
        assert response.status_code == 200
        assert "leaderboard" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. Gate Keeper Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGateKeeper:
    """입장 관리 테스트"""
    
    def test_log_entry(self, client):
        """입장 기록"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "GATE001",
            "name": "방문자",
            "rank": "NORMAL",
            "station_id": "STORE-001",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_vip_entry_alert(self, client):
        """VIP 입장 알림"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "VIPGATE001",
            "name": "VIP방문자",
            "rank": "ORBIT",
            "station_id": "STORE-001",
        })
        data = response.json()
        
        assert len(data["alerts"]) > 0
        assert data["alerts"][0]["type"] == "VIP"
    
    def test_today_count(self, client):
        """오늘 입장 수"""
        response = client.get("/api/v1/gate/today-count")
        assert response.status_code == 200
        assert "count" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. Legal Shield Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestLegalShield:
    """동의 시스템 테스트"""
    
    def test_record_consent(self, client):
        """동의 기록"""
        response = client.post("/api/v1/legal/consent", json={
            "name": "동의자",
            "phone": "010-1111-2222",
            "station_id": "STORE-001",
            "agreed_items": {
                "개인정보수집": True,
                "마케팅활용": False,
            },
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
    
    def test_verify_consent(self, client):
        """동의 확인"""
        # 먼저 동의 기록
        client.post("/api/v1/legal/consent", json={
            "name": "확인자",
            "phone": "010-3333-4444",
            "station_id": "STORE-001",
            "agreed_items": {"개인정보수집": True},
        })
        
        # 확인
        response = client.get("/api/v1/legal/verify/010-3333-4444")
        assert response.status_code == 200
        assert response.json()["has_consent"] is True


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. God Mode Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGodMode:
    """관리자 대시보드 테스트"""
    
    def test_overview(self, client):
        """전체 현황"""
        response = client.get("/api/v1/godmode/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "rank_distribution" in data
    
    def test_alerts(self, client):
        """실시간 알림"""
        response = client.get("/api/v1/godmode/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. Statistics Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestStatistics:
    """통계 테스트"""
    
    def test_daily_stats(self, client):
        """일별 통계"""
        response = client.get("/api/v1/stats/daily/2025-01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-01"
        assert "total_entries" in data
    
    def test_weekly_stats(self, client):
        """주간 통계"""
        response = client.get("/api/v1/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert "weekly_stats" in data
        assert len(data["weekly_stats"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧪 AUTUS EMPIRE v4.0.0 - Test Suite                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행: pytest tests/test_empire.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main_final import app


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_customer():
    """샘플 고객 데이터"""
    return {
        "user_id": "TEST001",
        "name": "테스트고객",
        "phone": "010-1234-5678",
        "station_id": "STORE-001",
        "m_score": 80.0,
        "t_score": 20.0,
        "s_score": 60.0,
    }


@pytest.fixture
def sample_vip_customer():
    """VIP 고객 데이터 (ORBIT 등급)"""
    return {
        "user_id": "VIP001",
        "name": "VIP고객",
        "phone": "010-9999-9999",
        "station_id": "STORE-001",
        "m_score": 90.0,
        "t_score": 10.0,
        "s_score": 80.0,
    }


@pytest.fixture
def sample_blackhole_customer():
    """위험 고객 데이터 (BLACKHOLE 등급)"""
    return {
        "user_id": "RISK001",
        "name": "주의고객",
        "phone": "010-0000-0000",
        "station_id": "STORE-001",
        "m_score": 30.0,
        "t_score": 80.0,
        "s_score": 20.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Health & Status Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """헬스 체크 테스트"""
    
    def test_health_check(self, client):
        """헬스 체크 기본"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "4.0.0 FINAL FORM"
    
    def test_health_modules(self, client):
        """모든 모듈 활성화 확인"""
        response = client.get("/health")
        data = response.json()
        
        expected_modules = [
            "observer", "bounty_hunter", "physis_map",
            "human_network", "oracle_engine", "gate_keeper",
            "legal_shield", "rpg_system", "war_game"
        ]
        
        for module in expected_modules:
            assert module in data["modules"]
            assert data["modules"][module] == "active"
    
    def test_root_redirect(self, client):
        """루트 페이지 리다이렉트"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "AUTUS EMPIRE" in response.text


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Customer API Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestCustomers:
    """고객 관리 API 테스트"""
    
    def test_create_customer(self, client, sample_customer):
        """고객 생성"""
        response = client.post("/api/v1/customers", json=sample_customer)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["customer"]["user_id"] == sample_customer["user_id"]
    
    def test_create_vip_customer_rank(self, client, sample_vip_customer):
        """VIP 고객 등급 자동 분류 (ORBIT)"""
        response = client.post("/api/v1/customers", json=sample_vip_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "ORBIT"
    
    def test_create_blackhole_customer_rank(self, client, sample_blackhole_customer):
        """위험 고객 등급 자동 분류 (BLACKHOLE)"""
        response = client.post("/api/v1/customers", json=sample_blackhole_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "BLACKHOLE"
    
    def test_list_customers(self, client):
        """고객 목록 조회"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
    
    def test_get_customer(self, client, sample_customer):
        """고객 상세 조회"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 조회
        response = client.get(f"/api/v1/customers/{sample_customer['user_id']}")
        assert response.status_code == 200
    
    def test_get_customer_not_found(self, client):
        """존재하지 않는 고객 조회"""
        response = client.get("/api/v1/customers/NONEXISTENT")
        assert response.status_code == 404
    
    def test_update_scores(self, client, sample_customer):
        """M-T-S 점수 업데이트"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 점수 업데이트
        response = client.put(
            f"/api/v1/customers/{sample_customer['user_id']}/scores",
            params={"m": 95, "t": 5, "s": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer"]["m_score"] == 95
        assert data["customer"]["rank"] == "ORBIT"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. Human Network Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHumanNetwork:
    """인맥 분석 API 테스트"""
    
    def test_add_relationship(self, client, sample_customer, sample_vip_customer):
        """관계 추가"""
        # 고객들 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        client.post("/api/v1/customers", json=sample_vip_customer)
        
        # 관계 추가
        response = client.post("/api/v1/network/relationship", json={
            "source_id": sample_customer["user_id"],
            "target_id": sample_vip_customer["user_id"],
            "rel_type": "FRIEND",
            "strength": 1.0,
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_get_pagerank(self, client):
        """PageRank 조회"""
        response = client.get("/api/v1/network/pagerank")
        assert response.status_code == 200
        assert "ranking" in response.json()
    
    def test_get_queen_bees(self, client):
        """여왕벌 탐색"""
        response = client.get("/api/v1/network/queen-bees")
        assert response.status_code == 200
        assert "queen_bees" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Oracle Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestOracleEngine:
    """예측 AI 테스트"""
    
    def test_predict_tomorrow(self, client):
        """내일 예측"""
        response = client.get("/api/v1/oracle/tomorrow/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "weather" in data
        assert "expected_revenue" in data
        assert data["expected_revenue"] > 0
    
    def test_weekly_forecast(self, client):
        """주간 예보"""
        response = client.get("/api/v1/oracle/weekly/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "forecasts" in data
        assert len(data["forecasts"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. War Game Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestWarGame:
    """시뮬레이터 테스트"""
    
    def test_simulate_coupon(self, client):
        """쿠폰 시뮬레이션"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 20.0,
            "target_group": "all",
            "budget": 1000000,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "expected_profit" in data
        assert "risk_level" in data
    
    def test_optimal_discount(self, client):
        """최적 할인율 탐색"""
        response = client.get("/api/v1/wargame/optimal-discount")
        assert response.status_code == 200
        
        data = response.json()
        assert "optimal_discount" in data
        assert 0 <= data["optimal_discount"] <= 50
    
    def test_high_discount_warning(self, client):
        """과도한 할인 경고"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 50.0,
            "target_group": "all",
        })
        data = response.json()
        
        # 50% 할인은 적자 예상
        assert data["risk_level"] == "HIGH"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. RPG System Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestRPGSystem:
    """게이미피케이션 테스트"""
    
    def test_create_player(self, client):
        """플레이어 생성"""
        response = client.post(
            "/api/v1/rpg/player",
            params={"employee_id": "EMP001", "name": "TestPlayer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["player"]["level"] == 1
        assert data["player"]["xp"] == 0
    
    def test_complete_quest(self, client):
        """퀘스트 완료"""
        # 플레이어 생성
        client.post("/api/v1/rpg/player", params={"employee_id": "EMP002", "name": "QuestPlayer"})
        
        # 퀘스트 완료
        response = client.post("/api/v1/rpg/quest/complete", json={
            "employee_id": "EMP002",
            "quest_id": "d1",  # 정시 출근
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["xp_gained"] == 20
        assert data["gold_gained"] == 1000
    
    def test_leaderboard(self, client):
        """랭킹 조회"""
        response = client.get("/api/v1/rpg/leaderboard")
        assert response.status_code == 200
        assert "leaderboard" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. Gate Keeper Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGateKeeper:
    """입장 관리 테스트"""
    
    def test_log_entry(self, client):
        """입장 기록"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "GATE001",
            "name": "방문자",
            "rank": "NORMAL",
            "station_id": "STORE-001",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_vip_entry_alert(self, client):
        """VIP 입장 알림"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "VIPGATE001",
            "name": "VIP방문자",
            "rank": "ORBIT",
            "station_id": "STORE-001",
        })
        data = response.json()
        
        assert len(data["alerts"]) > 0
        assert data["alerts"][0]["type"] == "VIP"
    
    def test_today_count(self, client):
        """오늘 입장 수"""
        response = client.get("/api/v1/gate/today-count")
        assert response.status_code == 200
        assert "count" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. Legal Shield Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestLegalShield:
    """동의 시스템 테스트"""
    
    def test_record_consent(self, client):
        """동의 기록"""
        response = client.post("/api/v1/legal/consent", json={
            "name": "동의자",
            "phone": "010-1111-2222",
            "station_id": "STORE-001",
            "agreed_items": {
                "개인정보수집": True,
                "마케팅활용": False,
            },
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
    
    def test_verify_consent(self, client):
        """동의 확인"""
        # 먼저 동의 기록
        client.post("/api/v1/legal/consent", json={
            "name": "확인자",
            "phone": "010-3333-4444",
            "station_id": "STORE-001",
            "agreed_items": {"개인정보수집": True},
        })
        
        # 확인
        response = client.get("/api/v1/legal/verify/010-3333-4444")
        assert response.status_code == 200
        assert response.json()["has_consent"] is True


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. God Mode Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGodMode:
    """관리자 대시보드 테스트"""
    
    def test_overview(self, client):
        """전체 현황"""
        response = client.get("/api/v1/godmode/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "rank_distribution" in data
    
    def test_alerts(self, client):
        """실시간 알림"""
        response = client.get("/api/v1/godmode/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. Statistics Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestStatistics:
    """통계 테스트"""
    
    def test_daily_stats(self, client):
        """일별 통계"""
        response = client.get("/api/v1/stats/daily/2025-01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-01"
        assert "total_entries" in data
    
    def test_weekly_stats(self, client):
        """주간 통계"""
        response = client.get("/api/v1/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert "weekly_stats" in data
        assert len(data["weekly_stats"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧪 AUTUS EMPIRE v4.0.0 - Test Suite                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행: pytest tests/test_empire.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main_final import app


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_customer():
    """샘플 고객 데이터"""
    return {
        "user_id": "TEST001",
        "name": "테스트고객",
        "phone": "010-1234-5678",
        "station_id": "STORE-001",
        "m_score": 80.0,
        "t_score": 20.0,
        "s_score": 60.0,
    }


@pytest.fixture
def sample_vip_customer():
    """VIP 고객 데이터 (ORBIT 등급)"""
    return {
        "user_id": "VIP001",
        "name": "VIP고객",
        "phone": "010-9999-9999",
        "station_id": "STORE-001",
        "m_score": 90.0,
        "t_score": 10.0,
        "s_score": 80.0,
    }


@pytest.fixture
def sample_blackhole_customer():
    """위험 고객 데이터 (BLACKHOLE 등급)"""
    return {
        "user_id": "RISK001",
        "name": "주의고객",
        "phone": "010-0000-0000",
        "station_id": "STORE-001",
        "m_score": 30.0,
        "t_score": 80.0,
        "s_score": 20.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Health & Status Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """헬스 체크 테스트"""
    
    def test_health_check(self, client):
        """헬스 체크 기본"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "4.0.0 FINAL FORM"
    
    def test_health_modules(self, client):
        """모든 모듈 활성화 확인"""
        response = client.get("/health")
        data = response.json()
        
        expected_modules = [
            "observer", "bounty_hunter", "physis_map",
            "human_network", "oracle_engine", "gate_keeper",
            "legal_shield", "rpg_system", "war_game"
        ]
        
        for module in expected_modules:
            assert module in data["modules"]
            assert data["modules"][module] == "active"
    
    def test_root_redirect(self, client):
        """루트 페이지 리다이렉트"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "AUTUS EMPIRE" in response.text


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Customer API Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestCustomers:
    """고객 관리 API 테스트"""
    
    def test_create_customer(self, client, sample_customer):
        """고객 생성"""
        response = client.post("/api/v1/customers", json=sample_customer)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["customer"]["user_id"] == sample_customer["user_id"]
    
    def test_create_vip_customer_rank(self, client, sample_vip_customer):
        """VIP 고객 등급 자동 분류 (ORBIT)"""
        response = client.post("/api/v1/customers", json=sample_vip_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "ORBIT"
    
    def test_create_blackhole_customer_rank(self, client, sample_blackhole_customer):
        """위험 고객 등급 자동 분류 (BLACKHOLE)"""
        response = client.post("/api/v1/customers", json=sample_blackhole_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "BLACKHOLE"
    
    def test_list_customers(self, client):
        """고객 목록 조회"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
    
    def test_get_customer(self, client, sample_customer):
        """고객 상세 조회"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 조회
        response = client.get(f"/api/v1/customers/{sample_customer['user_id']}")
        assert response.status_code == 200
    
    def test_get_customer_not_found(self, client):
        """존재하지 않는 고객 조회"""
        response = client.get("/api/v1/customers/NONEXISTENT")
        assert response.status_code == 404
    
    def test_update_scores(self, client, sample_customer):
        """M-T-S 점수 업데이트"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 점수 업데이트
        response = client.put(
            f"/api/v1/customers/{sample_customer['user_id']}/scores",
            params={"m": 95, "t": 5, "s": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer"]["m_score"] == 95
        assert data["customer"]["rank"] == "ORBIT"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. Human Network Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHumanNetwork:
    """인맥 분석 API 테스트"""
    
    def test_add_relationship(self, client, sample_customer, sample_vip_customer):
        """관계 추가"""
        # 고객들 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        client.post("/api/v1/customers", json=sample_vip_customer)
        
        # 관계 추가
        response = client.post("/api/v1/network/relationship", json={
            "source_id": sample_customer["user_id"],
            "target_id": sample_vip_customer["user_id"],
            "rel_type": "FRIEND",
            "strength": 1.0,
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_get_pagerank(self, client):
        """PageRank 조회"""
        response = client.get("/api/v1/network/pagerank")
        assert response.status_code == 200
        assert "ranking" in response.json()
    
    def test_get_queen_bees(self, client):
        """여왕벌 탐색"""
        response = client.get("/api/v1/network/queen-bees")
        assert response.status_code == 200
        assert "queen_bees" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Oracle Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestOracleEngine:
    """예측 AI 테스트"""
    
    def test_predict_tomorrow(self, client):
        """내일 예측"""
        response = client.get("/api/v1/oracle/tomorrow/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "weather" in data
        assert "expected_revenue" in data
        assert data["expected_revenue"] > 0
    
    def test_weekly_forecast(self, client):
        """주간 예보"""
        response = client.get("/api/v1/oracle/weekly/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "forecasts" in data
        assert len(data["forecasts"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. War Game Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestWarGame:
    """시뮬레이터 테스트"""
    
    def test_simulate_coupon(self, client):
        """쿠폰 시뮬레이션"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 20.0,
            "target_group": "all",
            "budget": 1000000,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "expected_profit" in data
        assert "risk_level" in data
    
    def test_optimal_discount(self, client):
        """최적 할인율 탐색"""
        response = client.get("/api/v1/wargame/optimal-discount")
        assert response.status_code == 200
        
        data = response.json()
        assert "optimal_discount" in data
        assert 0 <= data["optimal_discount"] <= 50
    
    def test_high_discount_warning(self, client):
        """과도한 할인 경고"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 50.0,
            "target_group": "all",
        })
        data = response.json()
        
        # 50% 할인은 적자 예상
        assert data["risk_level"] == "HIGH"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. RPG System Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestRPGSystem:
    """게이미피케이션 테스트"""
    
    def test_create_player(self, client):
        """플레이어 생성"""
        response = client.post(
            "/api/v1/rpg/player",
            params={"employee_id": "EMP001", "name": "TestPlayer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["player"]["level"] == 1
        assert data["player"]["xp"] == 0
    
    def test_complete_quest(self, client):
        """퀘스트 완료"""
        # 플레이어 생성
        client.post("/api/v1/rpg/player", params={"employee_id": "EMP002", "name": "QuestPlayer"})
        
        # 퀘스트 완료
        response = client.post("/api/v1/rpg/quest/complete", json={
            "employee_id": "EMP002",
            "quest_id": "d1",  # 정시 출근
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["xp_gained"] == 20
        assert data["gold_gained"] == 1000
    
    def test_leaderboard(self, client):
        """랭킹 조회"""
        response = client.get("/api/v1/rpg/leaderboard")
        assert response.status_code == 200
        assert "leaderboard" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. Gate Keeper Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGateKeeper:
    """입장 관리 테스트"""
    
    def test_log_entry(self, client):
        """입장 기록"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "GATE001",
            "name": "방문자",
            "rank": "NORMAL",
            "station_id": "STORE-001",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_vip_entry_alert(self, client):
        """VIP 입장 알림"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "VIPGATE001",
            "name": "VIP방문자",
            "rank": "ORBIT",
            "station_id": "STORE-001",
        })
        data = response.json()
        
        assert len(data["alerts"]) > 0
        assert data["alerts"][0]["type"] == "VIP"
    
    def test_today_count(self, client):
        """오늘 입장 수"""
        response = client.get("/api/v1/gate/today-count")
        assert response.status_code == 200
        assert "count" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. Legal Shield Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestLegalShield:
    """동의 시스템 테스트"""
    
    def test_record_consent(self, client):
        """동의 기록"""
        response = client.post("/api/v1/legal/consent", json={
            "name": "동의자",
            "phone": "010-1111-2222",
            "station_id": "STORE-001",
            "agreed_items": {
                "개인정보수집": True,
                "마케팅활용": False,
            },
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
    
    def test_verify_consent(self, client):
        """동의 확인"""
        # 먼저 동의 기록
        client.post("/api/v1/legal/consent", json={
            "name": "확인자",
            "phone": "010-3333-4444",
            "station_id": "STORE-001",
            "agreed_items": {"개인정보수집": True},
        })
        
        # 확인
        response = client.get("/api/v1/legal/verify/010-3333-4444")
        assert response.status_code == 200
        assert response.json()["has_consent"] is True


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. God Mode Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGodMode:
    """관리자 대시보드 테스트"""
    
    def test_overview(self, client):
        """전체 현황"""
        response = client.get("/api/v1/godmode/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "rank_distribution" in data
    
    def test_alerts(self, client):
        """실시간 알림"""
        response = client.get("/api/v1/godmode/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. Statistics Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestStatistics:
    """통계 테스트"""
    
    def test_daily_stats(self, client):
        """일별 통계"""
        response = client.get("/api/v1/stats/daily/2025-01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-01"
        assert "total_entries" in data
    
    def test_weekly_stats(self, client):
        """주간 통계"""
        response = client.get("/api/v1/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert "weekly_stats" in data
        assert len(data["weekly_stats"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧪 AUTUS EMPIRE v4.0.0 - Test Suite                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행: pytest tests/test_empire.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main_final import app


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_customer():
    """샘플 고객 데이터"""
    return {
        "user_id": "TEST001",
        "name": "테스트고객",
        "phone": "010-1234-5678",
        "station_id": "STORE-001",
        "m_score": 80.0,
        "t_score": 20.0,
        "s_score": 60.0,
    }


@pytest.fixture
def sample_vip_customer():
    """VIP 고객 데이터 (ORBIT 등급)"""
    return {
        "user_id": "VIP001",
        "name": "VIP고객",
        "phone": "010-9999-9999",
        "station_id": "STORE-001",
        "m_score": 90.0,
        "t_score": 10.0,
        "s_score": 80.0,
    }


@pytest.fixture
def sample_blackhole_customer():
    """위험 고객 데이터 (BLACKHOLE 등급)"""
    return {
        "user_id": "RISK001",
        "name": "주의고객",
        "phone": "010-0000-0000",
        "station_id": "STORE-001",
        "m_score": 30.0,
        "t_score": 80.0,
        "s_score": 20.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Health & Status Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """헬스 체크 테스트"""
    
    def test_health_check(self, client):
        """헬스 체크 기본"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "4.0.0 FINAL FORM"
    
    def test_health_modules(self, client):
        """모든 모듈 활성화 확인"""
        response = client.get("/health")
        data = response.json()
        
        expected_modules = [
            "observer", "bounty_hunter", "physis_map",
            "human_network", "oracle_engine", "gate_keeper",
            "legal_shield", "rpg_system", "war_game"
        ]
        
        for module in expected_modules:
            assert module in data["modules"]
            assert data["modules"][module] == "active"
    
    def test_root_redirect(self, client):
        """루트 페이지 리다이렉트"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "AUTUS EMPIRE" in response.text


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Customer API Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestCustomers:
    """고객 관리 API 테스트"""
    
    def test_create_customer(self, client, sample_customer):
        """고객 생성"""
        response = client.post("/api/v1/customers", json=sample_customer)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["customer"]["user_id"] == sample_customer["user_id"]
    
    def test_create_vip_customer_rank(self, client, sample_vip_customer):
        """VIP 고객 등급 자동 분류 (ORBIT)"""
        response = client.post("/api/v1/customers", json=sample_vip_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "ORBIT"
    
    def test_create_blackhole_customer_rank(self, client, sample_blackhole_customer):
        """위험 고객 등급 자동 분류 (BLACKHOLE)"""
        response = client.post("/api/v1/customers", json=sample_blackhole_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "BLACKHOLE"
    
    def test_list_customers(self, client):
        """고객 목록 조회"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
    
    def test_get_customer(self, client, sample_customer):
        """고객 상세 조회"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 조회
        response = client.get(f"/api/v1/customers/{sample_customer['user_id']}")
        assert response.status_code == 200
    
    def test_get_customer_not_found(self, client):
        """존재하지 않는 고객 조회"""
        response = client.get("/api/v1/customers/NONEXISTENT")
        assert response.status_code == 404
    
    def test_update_scores(self, client, sample_customer):
        """M-T-S 점수 업데이트"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 점수 업데이트
        response = client.put(
            f"/api/v1/customers/{sample_customer['user_id']}/scores",
            params={"m": 95, "t": 5, "s": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer"]["m_score"] == 95
        assert data["customer"]["rank"] == "ORBIT"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. Human Network Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHumanNetwork:
    """인맥 분석 API 테스트"""
    
    def test_add_relationship(self, client, sample_customer, sample_vip_customer):
        """관계 추가"""
        # 고객들 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        client.post("/api/v1/customers", json=sample_vip_customer)
        
        # 관계 추가
        response = client.post("/api/v1/network/relationship", json={
            "source_id": sample_customer["user_id"],
            "target_id": sample_vip_customer["user_id"],
            "rel_type": "FRIEND",
            "strength": 1.0,
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_get_pagerank(self, client):
        """PageRank 조회"""
        response = client.get("/api/v1/network/pagerank")
        assert response.status_code == 200
        assert "ranking" in response.json()
    
    def test_get_queen_bees(self, client):
        """여왕벌 탐색"""
        response = client.get("/api/v1/network/queen-bees")
        assert response.status_code == 200
        assert "queen_bees" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Oracle Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestOracleEngine:
    """예측 AI 테스트"""
    
    def test_predict_tomorrow(self, client):
        """내일 예측"""
        response = client.get("/api/v1/oracle/tomorrow/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "weather" in data
        assert "expected_revenue" in data
        assert data["expected_revenue"] > 0
    
    def test_weekly_forecast(self, client):
        """주간 예보"""
        response = client.get("/api/v1/oracle/weekly/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "forecasts" in data
        assert len(data["forecasts"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. War Game Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestWarGame:
    """시뮬레이터 테스트"""
    
    def test_simulate_coupon(self, client):
        """쿠폰 시뮬레이션"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 20.0,
            "target_group": "all",
            "budget": 1000000,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "expected_profit" in data
        assert "risk_level" in data
    
    def test_optimal_discount(self, client):
        """최적 할인율 탐색"""
        response = client.get("/api/v1/wargame/optimal-discount")
        assert response.status_code == 200
        
        data = response.json()
        assert "optimal_discount" in data
        assert 0 <= data["optimal_discount"] <= 50
    
    def test_high_discount_warning(self, client):
        """과도한 할인 경고"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 50.0,
            "target_group": "all",
        })
        data = response.json()
        
        # 50% 할인은 적자 예상
        assert data["risk_level"] == "HIGH"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. RPG System Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestRPGSystem:
    """게이미피케이션 테스트"""
    
    def test_create_player(self, client):
        """플레이어 생성"""
        response = client.post(
            "/api/v1/rpg/player",
            params={"employee_id": "EMP001", "name": "TestPlayer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["player"]["level"] == 1
        assert data["player"]["xp"] == 0
    
    def test_complete_quest(self, client):
        """퀘스트 완료"""
        # 플레이어 생성
        client.post("/api/v1/rpg/player", params={"employee_id": "EMP002", "name": "QuestPlayer"})
        
        # 퀘스트 완료
        response = client.post("/api/v1/rpg/quest/complete", json={
            "employee_id": "EMP002",
            "quest_id": "d1",  # 정시 출근
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["xp_gained"] == 20
        assert data["gold_gained"] == 1000
    
    def test_leaderboard(self, client):
        """랭킹 조회"""
        response = client.get("/api/v1/rpg/leaderboard")
        assert response.status_code == 200
        assert "leaderboard" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. Gate Keeper Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGateKeeper:
    """입장 관리 테스트"""
    
    def test_log_entry(self, client):
        """입장 기록"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "GATE001",
            "name": "방문자",
            "rank": "NORMAL",
            "station_id": "STORE-001",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_vip_entry_alert(self, client):
        """VIP 입장 알림"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "VIPGATE001",
            "name": "VIP방문자",
            "rank": "ORBIT",
            "station_id": "STORE-001",
        })
        data = response.json()
        
        assert len(data["alerts"]) > 0
        assert data["alerts"][0]["type"] == "VIP"
    
    def test_today_count(self, client):
        """오늘 입장 수"""
        response = client.get("/api/v1/gate/today-count")
        assert response.status_code == 200
        assert "count" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. Legal Shield Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestLegalShield:
    """동의 시스템 테스트"""
    
    def test_record_consent(self, client):
        """동의 기록"""
        response = client.post("/api/v1/legal/consent", json={
            "name": "동의자",
            "phone": "010-1111-2222",
            "station_id": "STORE-001",
            "agreed_items": {
                "개인정보수집": True,
                "마케팅활용": False,
            },
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
    
    def test_verify_consent(self, client):
        """동의 확인"""
        # 먼저 동의 기록
        client.post("/api/v1/legal/consent", json={
            "name": "확인자",
            "phone": "010-3333-4444",
            "station_id": "STORE-001",
            "agreed_items": {"개인정보수집": True},
        })
        
        # 확인
        response = client.get("/api/v1/legal/verify/010-3333-4444")
        assert response.status_code == 200
        assert response.json()["has_consent"] is True


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. God Mode Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGodMode:
    """관리자 대시보드 테스트"""
    
    def test_overview(self, client):
        """전체 현황"""
        response = client.get("/api/v1/godmode/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "rank_distribution" in data
    
    def test_alerts(self, client):
        """실시간 알림"""
        response = client.get("/api/v1/godmode/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. Statistics Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestStatistics:
    """통계 테스트"""
    
    def test_daily_stats(self, client):
        """일별 통계"""
        response = client.get("/api/v1/stats/daily/2025-01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-01"
        assert "total_entries" in data
    
    def test_weekly_stats(self, client):
        """주간 통계"""
        response = client.get("/api/v1/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert "weekly_stats" in data
        assert len(data["weekly_stats"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧪 AUTUS EMPIRE v4.0.0 - Test Suite                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행: pytest tests/test_empire.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main_final import app


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_customer():
    """샘플 고객 데이터"""
    return {
        "user_id": "TEST001",
        "name": "테스트고객",
        "phone": "010-1234-5678",
        "station_id": "STORE-001",
        "m_score": 80.0,
        "t_score": 20.0,
        "s_score": 60.0,
    }


@pytest.fixture
def sample_vip_customer():
    """VIP 고객 데이터 (ORBIT 등급)"""
    return {
        "user_id": "VIP001",
        "name": "VIP고객",
        "phone": "010-9999-9999",
        "station_id": "STORE-001",
        "m_score": 90.0,
        "t_score": 10.0,
        "s_score": 80.0,
    }


@pytest.fixture
def sample_blackhole_customer():
    """위험 고객 데이터 (BLACKHOLE 등급)"""
    return {
        "user_id": "RISK001",
        "name": "주의고객",
        "phone": "010-0000-0000",
        "station_id": "STORE-001",
        "m_score": 30.0,
        "t_score": 80.0,
        "s_score": 20.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Health & Status Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """헬스 체크 테스트"""
    
    def test_health_check(self, client):
        """헬스 체크 기본"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "4.0.0 FINAL FORM"
    
    def test_health_modules(self, client):
        """모든 모듈 활성화 확인"""
        response = client.get("/health")
        data = response.json()
        
        expected_modules = [
            "observer", "bounty_hunter", "physis_map",
            "human_network", "oracle_engine", "gate_keeper",
            "legal_shield", "rpg_system", "war_game"
        ]
        
        for module in expected_modules:
            assert module in data["modules"]
            assert data["modules"][module] == "active"
    
    def test_root_redirect(self, client):
        """루트 페이지 리다이렉트"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "AUTUS EMPIRE" in response.text


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Customer API Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestCustomers:
    """고객 관리 API 테스트"""
    
    def test_create_customer(self, client, sample_customer):
        """고객 생성"""
        response = client.post("/api/v1/customers", json=sample_customer)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["customer"]["user_id"] == sample_customer["user_id"]
    
    def test_create_vip_customer_rank(self, client, sample_vip_customer):
        """VIP 고객 등급 자동 분류 (ORBIT)"""
        response = client.post("/api/v1/customers", json=sample_vip_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "ORBIT"
    
    def test_create_blackhole_customer_rank(self, client, sample_blackhole_customer):
        """위험 고객 등급 자동 분류 (BLACKHOLE)"""
        response = client.post("/api/v1/customers", json=sample_blackhole_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "BLACKHOLE"
    
    def test_list_customers(self, client):
        """고객 목록 조회"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
    
    def test_get_customer(self, client, sample_customer):
        """고객 상세 조회"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 조회
        response = client.get(f"/api/v1/customers/{sample_customer['user_id']}")
        assert response.status_code == 200
    
    def test_get_customer_not_found(self, client):
        """존재하지 않는 고객 조회"""
        response = client.get("/api/v1/customers/NONEXISTENT")
        assert response.status_code == 404
    
    def test_update_scores(self, client, sample_customer):
        """M-T-S 점수 업데이트"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 점수 업데이트
        response = client.put(
            f"/api/v1/customers/{sample_customer['user_id']}/scores",
            params={"m": 95, "t": 5, "s": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer"]["m_score"] == 95
        assert data["customer"]["rank"] == "ORBIT"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. Human Network Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHumanNetwork:
    """인맥 분석 API 테스트"""
    
    def test_add_relationship(self, client, sample_customer, sample_vip_customer):
        """관계 추가"""
        # 고객들 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        client.post("/api/v1/customers", json=sample_vip_customer)
        
        # 관계 추가
        response = client.post("/api/v1/network/relationship", json={
            "source_id": sample_customer["user_id"],
            "target_id": sample_vip_customer["user_id"],
            "rel_type": "FRIEND",
            "strength": 1.0,
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_get_pagerank(self, client):
        """PageRank 조회"""
        response = client.get("/api/v1/network/pagerank")
        assert response.status_code == 200
        assert "ranking" in response.json()
    
    def test_get_queen_bees(self, client):
        """여왕벌 탐색"""
        response = client.get("/api/v1/network/queen-bees")
        assert response.status_code == 200
        assert "queen_bees" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Oracle Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestOracleEngine:
    """예측 AI 테스트"""
    
    def test_predict_tomorrow(self, client):
        """내일 예측"""
        response = client.get("/api/v1/oracle/tomorrow/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "weather" in data
        assert "expected_revenue" in data
        assert data["expected_revenue"] > 0
    
    def test_weekly_forecast(self, client):
        """주간 예보"""
        response = client.get("/api/v1/oracle/weekly/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "forecasts" in data
        assert len(data["forecasts"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. War Game Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestWarGame:
    """시뮬레이터 테스트"""
    
    def test_simulate_coupon(self, client):
        """쿠폰 시뮬레이션"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 20.0,
            "target_group": "all",
            "budget": 1000000,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "expected_profit" in data
        assert "risk_level" in data
    
    def test_optimal_discount(self, client):
        """최적 할인율 탐색"""
        response = client.get("/api/v1/wargame/optimal-discount")
        assert response.status_code == 200
        
        data = response.json()
        assert "optimal_discount" in data
        assert 0 <= data["optimal_discount"] <= 50
    
    def test_high_discount_warning(self, client):
        """과도한 할인 경고"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 50.0,
            "target_group": "all",
        })
        data = response.json()
        
        # 50% 할인은 적자 예상
        assert data["risk_level"] == "HIGH"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. RPG System Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestRPGSystem:
    """게이미피케이션 테스트"""
    
    def test_create_player(self, client):
        """플레이어 생성"""
        response = client.post(
            "/api/v1/rpg/player",
            params={"employee_id": "EMP001", "name": "TestPlayer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["player"]["level"] == 1
        assert data["player"]["xp"] == 0
    
    def test_complete_quest(self, client):
        """퀘스트 완료"""
        # 플레이어 생성
        client.post("/api/v1/rpg/player", params={"employee_id": "EMP002", "name": "QuestPlayer"})
        
        # 퀘스트 완료
        response = client.post("/api/v1/rpg/quest/complete", json={
            "employee_id": "EMP002",
            "quest_id": "d1",  # 정시 출근
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["xp_gained"] == 20
        assert data["gold_gained"] == 1000
    
    def test_leaderboard(self, client):
        """랭킹 조회"""
        response = client.get("/api/v1/rpg/leaderboard")
        assert response.status_code == 200
        assert "leaderboard" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. Gate Keeper Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGateKeeper:
    """입장 관리 테스트"""
    
    def test_log_entry(self, client):
        """입장 기록"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "GATE001",
            "name": "방문자",
            "rank": "NORMAL",
            "station_id": "STORE-001",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_vip_entry_alert(self, client):
        """VIP 입장 알림"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "VIPGATE001",
            "name": "VIP방문자",
            "rank": "ORBIT",
            "station_id": "STORE-001",
        })
        data = response.json()
        
        assert len(data["alerts"]) > 0
        assert data["alerts"][0]["type"] == "VIP"
    
    def test_today_count(self, client):
        """오늘 입장 수"""
        response = client.get("/api/v1/gate/today-count")
        assert response.status_code == 200
        assert "count" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. Legal Shield Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestLegalShield:
    """동의 시스템 테스트"""
    
    def test_record_consent(self, client):
        """동의 기록"""
        response = client.post("/api/v1/legal/consent", json={
            "name": "동의자",
            "phone": "010-1111-2222",
            "station_id": "STORE-001",
            "agreed_items": {
                "개인정보수집": True,
                "마케팅활용": False,
            },
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
    
    def test_verify_consent(self, client):
        """동의 확인"""
        # 먼저 동의 기록
        client.post("/api/v1/legal/consent", json={
            "name": "확인자",
            "phone": "010-3333-4444",
            "station_id": "STORE-001",
            "agreed_items": {"개인정보수집": True},
        })
        
        # 확인
        response = client.get("/api/v1/legal/verify/010-3333-4444")
        assert response.status_code == 200
        assert response.json()["has_consent"] is True


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. God Mode Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGodMode:
    """관리자 대시보드 테스트"""
    
    def test_overview(self, client):
        """전체 현황"""
        response = client.get("/api/v1/godmode/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "rank_distribution" in data
    
    def test_alerts(self, client):
        """실시간 알림"""
        response = client.get("/api/v1/godmode/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. Statistics Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestStatistics:
    """통계 테스트"""
    
    def test_daily_stats(self, client):
        """일별 통계"""
        response = client.get("/api/v1/stats/daily/2025-01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-01"
        assert "total_entries" in data
    
    def test_weekly_stats(self, client):
        """주간 통계"""
        response = client.get("/api/v1/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert "weekly_stats" in data
        assert len(data["weekly_stats"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧪 AUTUS EMPIRE v4.0.0 - Test Suite                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행: pytest tests/test_empire.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

# 프로젝트 루트 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main_final import app


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═══════════════════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def client():
    """테스트 클라이언트"""
    return TestClient(app)


@pytest.fixture
def sample_customer():
    """샘플 고객 데이터"""
    return {
        "user_id": "TEST001",
        "name": "테스트고객",
        "phone": "010-1234-5678",
        "station_id": "STORE-001",
        "m_score": 80.0,
        "t_score": 20.0,
        "s_score": 60.0,
    }


@pytest.fixture
def sample_vip_customer():
    """VIP 고객 데이터 (ORBIT 등급)"""
    return {
        "user_id": "VIP001",
        "name": "VIP고객",
        "phone": "010-9999-9999",
        "station_id": "STORE-001",
        "m_score": 90.0,
        "t_score": 10.0,
        "s_score": 80.0,
    }


@pytest.fixture
def sample_blackhole_customer():
    """위험 고객 데이터 (BLACKHOLE 등급)"""
    return {
        "user_id": "RISK001",
        "name": "주의고객",
        "phone": "010-0000-0000",
        "station_id": "STORE-001",
        "m_score": 30.0,
        "t_score": 80.0,
        "s_score": 20.0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. Health & Status Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHealth:
    """헬스 체크 테스트"""
    
    def test_health_check(self, client):
        """헬스 체크 기본"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "4.0.0 FINAL FORM"
    
    def test_health_modules(self, client):
        """모든 모듈 활성화 확인"""
        response = client.get("/health")
        data = response.json()
        
        expected_modules = [
            "observer", "bounty_hunter", "physis_map",
            "human_network", "oracle_engine", "gate_keeper",
            "legal_shield", "rpg_system", "war_game"
        ]
        
        for module in expected_modules:
            assert module in data["modules"]
            assert data["modules"][module] == "active"
    
    def test_root_redirect(self, client):
        """루트 페이지 리다이렉트"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 200
        assert "AUTUS EMPIRE" in response.text


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. Customer API Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestCustomers:
    """고객 관리 API 테스트"""
    
    def test_create_customer(self, client, sample_customer):
        """고객 생성"""
        response = client.post("/api/v1/customers", json=sample_customer)
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["customer"]["user_id"] == sample_customer["user_id"]
    
    def test_create_vip_customer_rank(self, client, sample_vip_customer):
        """VIP 고객 등급 자동 분류 (ORBIT)"""
        response = client.post("/api/v1/customers", json=sample_vip_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "ORBIT"
    
    def test_create_blackhole_customer_rank(self, client, sample_blackhole_customer):
        """위험 고객 등급 자동 분류 (BLACKHOLE)"""
        response = client.post("/api/v1/customers", json=sample_blackhole_customer)
        data = response.json()
        
        assert data["customer"]["rank"] == "BLACKHOLE"
    
    def test_list_customers(self, client):
        """고객 목록 조회"""
        response = client.get("/api/v1/customers")
        assert response.status_code == 200
        
        data = response.json()
        assert "customers" in data
        assert "total" in data
    
    def test_get_customer(self, client, sample_customer):
        """고객 상세 조회"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 조회
        response = client.get(f"/api/v1/customers/{sample_customer['user_id']}")
        assert response.status_code == 200
    
    def test_get_customer_not_found(self, client):
        """존재하지 않는 고객 조회"""
        response = client.get("/api/v1/customers/NONEXISTENT")
        assert response.status_code == 404
    
    def test_update_scores(self, client, sample_customer):
        """M-T-S 점수 업데이트"""
        # 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        
        # 점수 업데이트
        response = client.put(
            f"/api/v1/customers/{sample_customer['user_id']}/scores",
            params={"m": 95, "t": 5, "s": 90}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["customer"]["m_score"] == 95
        assert data["customer"]["rank"] == "ORBIT"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. Human Network Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestHumanNetwork:
    """인맥 분석 API 테스트"""
    
    def test_add_relationship(self, client, sample_customer, sample_vip_customer):
        """관계 추가"""
        # 고객들 먼저 생성
        client.post("/api/v1/customers", json=sample_customer)
        client.post("/api/v1/customers", json=sample_vip_customer)
        
        # 관계 추가
        response = client.post("/api/v1/network/relationship", json={
            "source_id": sample_customer["user_id"],
            "target_id": sample_vip_customer["user_id"],
            "rel_type": "FRIEND",
            "strength": 1.0,
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_get_pagerank(self, client):
        """PageRank 조회"""
        response = client.get("/api/v1/network/pagerank")
        assert response.status_code == 200
        assert "ranking" in response.json()
    
    def test_get_queen_bees(self, client):
        """여왕벌 탐색"""
        response = client.get("/api/v1/network/queen-bees")
        assert response.status_code == 200
        assert "queen_bees" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. Oracle Engine Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestOracleEngine:
    """예측 AI 테스트"""
    
    def test_predict_tomorrow(self, client):
        """내일 예측"""
        response = client.get("/api/v1/oracle/tomorrow/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "date" in data
        assert "weather" in data
        assert "expected_revenue" in data
        assert data["expected_revenue"] > 0
    
    def test_weekly_forecast(self, client):
        """주간 예보"""
        response = client.get("/api/v1/oracle/weekly/STORE-001")
        assert response.status_code == 200
        
        data = response.json()
        assert "forecasts" in data
        assert len(data["forecasts"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. War Game Simulator Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestWarGame:
    """시뮬레이터 테스트"""
    
    def test_simulate_coupon(self, client):
        """쿠폰 시뮬레이션"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 20.0,
            "target_group": "all",
            "budget": 1000000,
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "expected_profit" in data
        assert "risk_level" in data
    
    def test_optimal_discount(self, client):
        """최적 할인율 탐색"""
        response = client.get("/api/v1/wargame/optimal-discount")
        assert response.status_code == 200
        
        data = response.json()
        assert "optimal_discount" in data
        assert 0 <= data["optimal_discount"] <= 50
    
    def test_high_discount_warning(self, client):
        """과도한 할인 경고"""
        response = client.post("/api/v1/wargame/simulate/coupon", json={
            "discount_rate": 50.0,
            "target_group": "all",
        })
        data = response.json()
        
        # 50% 할인은 적자 예상
        assert data["risk_level"] == "HIGH"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. RPG System Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestRPGSystem:
    """게이미피케이션 테스트"""
    
    def test_create_player(self, client):
        """플레이어 생성"""
        response = client.post(
            "/api/v1/rpg/player",
            params={"employee_id": "EMP001", "name": "TestPlayer"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["player"]["level"] == 1
        assert data["player"]["xp"] == 0
    
    def test_complete_quest(self, client):
        """퀘스트 완료"""
        # 플레이어 생성
        client.post("/api/v1/rpg/player", params={"employee_id": "EMP002", "name": "QuestPlayer"})
        
        # 퀘스트 완료
        response = client.post("/api/v1/rpg/quest/complete", json={
            "employee_id": "EMP002",
            "quest_id": "d1",  # 정시 출근
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert data["xp_gained"] == 20
        assert data["gold_gained"] == 1000
    
    def test_leaderboard(self, client):
        """랭킹 조회"""
        response = client.get("/api/v1/rpg/leaderboard")
        assert response.status_code == 200
        assert "leaderboard" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. Gate Keeper Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGateKeeper:
    """입장 관리 테스트"""
    
    def test_log_entry(self, client):
        """입장 기록"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "GATE001",
            "name": "방문자",
            "rank": "NORMAL",
            "station_id": "STORE-001",
        })
        assert response.status_code == 200
        assert response.json()["success"] is True
    
    def test_vip_entry_alert(self, client):
        """VIP 입장 알림"""
        response = client.post("/api/v1/gate/entry", json={
            "user_id": "VIPGATE001",
            "name": "VIP방문자",
            "rank": "ORBIT",
            "station_id": "STORE-001",
        })
        data = response.json()
        
        assert len(data["alerts"]) > 0
        assert data["alerts"][0]["type"] == "VIP"
    
    def test_today_count(self, client):
        """오늘 입장 수"""
        response = client.get("/api/v1/gate/today-count")
        assert response.status_code == 200
        assert "count" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. Legal Shield Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestLegalShield:
    """동의 시스템 테스트"""
    
    def test_record_consent(self, client):
        """동의 기록"""
        response = client.post("/api/v1/legal/consent", json={
            "name": "동의자",
            "phone": "010-1111-2222",
            "station_id": "STORE-001",
            "agreed_items": {
                "개인정보수집": True,
                "마케팅활용": False,
            },
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "consent_id" in data
    
    def test_verify_consent(self, client):
        """동의 확인"""
        # 먼저 동의 기록
        client.post("/api/v1/legal/consent", json={
            "name": "확인자",
            "phone": "010-3333-4444",
            "station_id": "STORE-001",
            "agreed_items": {"개인정보수집": True},
        })
        
        # 확인
        response = client.get("/api/v1/legal/verify/010-3333-4444")
        assert response.status_code == 200
        assert response.json()["has_consent"] is True


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. God Mode Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestGodMode:
    """관리자 대시보드 테스트"""
    
    def test_overview(self, client):
        """전체 현황"""
        response = client.get("/api/v1/godmode/overview")
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data
        assert "rank_distribution" in data
    
    def test_alerts(self, client):
        """실시간 알림"""
        response = client.get("/api/v1/godmode/alerts")
        assert response.status_code == 200
        assert "alerts" in response.json()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. Statistics Tests
# ═══════════════════════════════════════════════════════════════════════════════════════════

class TestStatistics:
    """통계 테스트"""
    
    def test_daily_stats(self, client):
        """일별 통계"""
        response = client.get("/api/v1/stats/daily/2025-01-01")
        assert response.status_code == 200
        
        data = response.json()
        assert data["date"] == "2025-01-01"
        assert "total_entries" in data
    
    def test_weekly_stats(self, client):
        """주간 통계"""
        response = client.get("/api/v1/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        assert "weekly_stats" in data
        assert len(data["weekly_stats"]) == 7


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])





















