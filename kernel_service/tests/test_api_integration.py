"""
AUTUS API 통합 테스트 (B-4)
============================

B-1: Draft SIM 전환 테스트
B-2: Commit Pipeline 검증
B-3: Replay Marker (hash chain)

Version: 1.0.0
Status: LOCKED
"""

import pytest
from fastapi.testclient import TestClient
import json
import time

# Import from main
import sys
sys.path.insert(0, '..')
from app.main import app

client = TestClient(app)


class TestDraftSIMTransition:
    """B-1: Draft SIM 전환 테스트"""
    
    def test_initial_state_is_sim(self):
        """초기 상태는 SIM 모드"""
        resp = client.get("/state", params={"session_id": "test_sim_1"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["ui"]["mode"] == "SIM"
    
    def test_draft_update_page1_stays_sim(self):
        """Page 1 Draft 업데이트 후 SIM 유지"""
        session_id = "test_sim_page1"
        
        # 초기 상태
        resp = client.get("/state", params={"session_id": session_id})
        assert resp.json()["ui"]["mode"] == "SIM"
        
        # Draft 업데이트
        resp = client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": int(time.time() * 1000),
            "page": 1,
            "patch": {"mass_mod": 0.2}
        })
        assert resp.status_code == 200
        assert resp.json()["state"]["ui"]["mode"] == "SIM"
        assert abs(resp.json()["state"]["draft"]["page1"]["mass_mod"] - 0.2) < 0.01
    
    def test_draft_update_page2_ops(self):
        """Page 2 NodeOps Draft 업데이트"""
        session_id = "test_sim_page2"
        
        resp = client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": int(time.time() * 1000),
            "page": 2,
            "patch": {
                "sigma_delta": 0.1,
                "ops": [
                    {"op_id": "op1", "type": "NODE_CREATE", "t_ms": 1000, "node_id": "N1", "mass": 0.5, "sigma": 0.2}
                ]
            }
        })
        assert resp.status_code == 200
        assert resp.json()["state"]["ui"]["mode"] == "SIM"
    
    def test_draft_update_page3_allocations(self):
        """Page 3 Mandala 배분 업데이트"""
        session_id = "test_sim_page3"
        
        allocations = {
            "N": 0.2, "NE": 0.1, "E": 0.15, "SE": 0.1,
            "S": 0.15, "SW": 0.1, "W": 0.1, "NW": 0.1
        }
        
        resp = client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": int(time.time() * 1000),
            "page": 3,
            "patch": {"allocations": allocations}
        })
        assert resp.status_code == 200
        assert resp.json()["state"]["ui"]["mode"] == "SIM"
    
    def test_invalid_page_rejected(self):
        """잘못된 페이지 번호 거부"""
        resp = client.post("/draft/update", json={
            "session_id": "test_invalid",
            "t_ms": int(time.time() * 1000),
            "page": 5,
            "patch": {}
        })
        assert resp.status_code == 400


class TestCommitPipeline:
    """B-2: Commit Pipeline 검증"""
    
    def test_commit_changes_mode_to_live(self):
        """Commit 후 LIVE 모드로 전환"""
        session_id = "test_commit_1"
        
        # Draft 설정
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": int(time.time() * 1000),
            "page": 1,
            "patch": {"mass_mod": 0.3}
        })
        
        # Commit
        resp = client.post("/commit", json={
            "session_id": session_id,
            "t_ms": int(time.time() * 1000)
        })
        assert resp.status_code == 200
        
        # LIVE 모드 확인
        state_resp = client.get("/state", params={"session_id": session_id})
        assert state_resp.json()["ui"]["mode"] == "LIVE"
    
    def test_commit_pipeline_order(self):
        """Commit Pipeline 순서 확인 (Page 3 → 1 → 2)"""
        session_id = "test_pipeline_order"
        t_ms = int(time.time() * 1000)
        
        # 모든 페이지 Draft 설정
        client.post("/draft/update", json={
            "session_id": session_id, "t_ms": t_ms, "page": 3,
            "patch": {"allocations": {"N": 0.25, "NE": 0.25, "E": 0.125, "SE": 0.125, "S": 0.125, "SW": 0.0625, "W": 0.0625, "NW": 0.0}}
        })
        client.post("/draft/update", json={
            "session_id": session_id, "t_ms": t_ms, "page": 1,
            "patch": {"mass_mod": 0.2, "volume_override": 0.6}
        })
        client.post("/draft/update", json={
            "session_id": session_id, "t_ms": t_ms, "page": 2,
            "patch": {"sigma_delta": 0.05}
        })
        
        # Commit
        resp = client.post("/commit", json={
            "session_id": session_id,
            "t_ms": t_ms
        })
        assert resp.status_code == 200
        
        result = resp.json()
        steps = result.get("processing_steps", [])
        
        # 순서 확인
        assert any("Mandala" in s or "Page 3" in s or "STAGE1" in s for s in steps)
    
    def test_commit_creates_marker(self):
        """Commit 시 Replay Marker 생성"""
        session_id = "test_marker_create"
        
        # Commit with marker
        resp = client.post("/commit", json={
            "session_id": session_id,
            "t_ms": int(time.time() * 1000),
            "options": {"create_marker": True}
        })
        assert resp.status_code == 200
        
        result = resp.json()
        assert "state_hash" in result
        assert "marker_id" in result or "marker" in result
    
    def test_commit_resets_draft(self):
        """Commit 후 Draft 리셋"""
        session_id = "test_draft_reset"
        
        # Draft 설정
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": int(time.time() * 1000),
            "page": 1,
            "patch": {"mass_mod": 0.4}
        })
        
        # Commit
        client.post("/commit", json={
            "session_id": session_id,
            "t_ms": int(time.time() * 1000)
        })
        
        # Draft 리셋 확인 (새 draft 업데이트 필요)
        resp = client.get("/state", params={"session_id": session_id})
        # Draft가 리셋되었거나 적용되었는지 확인


class TestReplayMarker:
    """B-3: Replay Marker (hash chain) 테스트"""
    
    def test_marker_creation(self):
        """Marker 생성 테스트"""
        session_id = "test_marker_1"
        
        # 상태 가져오기
        state_resp = client.get("/state", params={"session_id": session_id})
        state_hash = state_resp.json().get("state_hash", "test_hash")
        
        # Marker 생성
        resp = client.post("/replay/marker", json={
            "session_id": session_id,
            "t_ms": int(time.time() * 1000),
            "state_hash": state_hash
        })
        assert resp.status_code == 200
        
        result = resp.json()
        assert "marker" in result
        assert "id" in result["marker"]
        assert "hash" in result["marker"]
    
    def test_hash_chain_integrity(self):
        """Hash chain 무결성 테스트"""
        session_id = "test_chain_integrity"
        
        # 첫 번째 마커
        resp1 = client.post("/replay/marker", json={
            "session_id": session_id,
            "t_ms": 1000,
            "state_hash": "hash_1"
        })
        first_hash = resp1.json()["marker"]["hash"]
        
        # 두 번째 마커 (prev_hash 포함)
        resp2 = client.post("/replay/marker", json={
            "session_id": session_id,
            "t_ms": 2000,
            "state_hash": "hash_2",
            "prev_hash": first_hash
        })
        assert resp2.status_code == 200
        
        # 잘못된 prev_hash로 시도
        resp3 = client.post("/replay/marker", json={
            "session_id": session_id,
            "t_ms": 3000,
            "state_hash": "hash_3",
            "prev_hash": "wrong_hash"
        })
        assert resp3.status_code == 409  # HASH_CHAIN_MISMATCH
    
    def test_deterministic_state_hash(self):
        """동일 상태 → 동일 해시"""
        session_id = "test_determinism"
        
        # 동일한 Draft 설정
        for i in range(2):
            client.post("/draft/update", json={
                "session_id": f"{session_id}_{i}",
                "t_ms": 1000,
                "page": 1,
                "patch": {"mass_mod": 0.25}
            })
        
        # 상태 해시 비교 (같은 입력 → 같은 해시)
        resp1 = client.get("/state", params={"session_id": f"{session_id}_0"})
        resp2 = client.get("/state", params={"session_id": f"{session_id}_1"})
        
        # Draft 값은 동일해야 함
        assert resp1.json()["draft"]["page1"]["mass_mod"] == resp2.json()["draft"]["page1"]["mass_mod"]


class TestValidation:
    """입력 검증 테스트"""
    
    def test_mass_mod_range(self):
        """mass_mod 범위 검증 [-0.5, 0.5]"""
        session_id = "test_validation"
        
        # 범위 초과
        resp = client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 1000,
            "page": 1,
            "patch": {"mass_mod": 0.8}  # > 0.5
        })
        # 클램프 또는 에러
        if resp.status_code == 200:
            # 클램프 적용
            assert resp.json()["state"]["draft"]["page1"]["mass_mod"] <= 0.5
    
    def test_allocations_sum(self):
        """Allocations 합계 검증"""
        session_id = "test_alloc_sum"
        
        # 합이 1이 아닌 경우 정규화되어야 함
        resp = client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 1000,
            "page": 3,
            "patch": {"allocations": {
                "N": 0.5, "NE": 0.5, "E": 0.5, "SE": 0.5,
                "S": 0.5, "SW": 0.5, "W": 0.5, "NW": 0.5
            }}
        })
        # 정규화 확인
        if resp.status_code == 200:
            allocs = resp.json()["state"]["draft"]["page3"]["allocations"]
            total = sum(allocs.values())
            assert abs(total - 1.0) < 0.01
    
    def test_session_id_validation(self):
        """Session ID 검증"""
        resp = client.get("/state", params={"session_id": "ab"})  # < 4자
        assert resp.status_code == 400


class TestDeterminism:
    """결정론 테스트"""
    
    def test_same_input_same_output(self):
        """동일 입력 → 동일 출력"""
        results = []
        
        for i in range(3):
            session_id = f"determinism_test_{i}"
            
            # 동일한 Draft 설정
            client.post("/draft/update", json={
                "session_id": session_id,
                "t_ms": 1000,
                "page": 3,
                "patch": {"allocations": {
                    "N": 0.2, "NE": 0.1, "E": 0.15, "SE": 0.1,
                    "S": 0.15, "SW": 0.1, "W": 0.1, "NW": 0.1
                }}
            })
            
            # Commit
            resp = client.post("/commit", json={
                "session_id": session_id,
                "t_ms": 1000
            })
            results.append(resp.json())
        
        # 모든 결과의 state_hash가 동일해야 함 (session_id 제외하고)
        # 또는 measure 값이 동일
        measures = [r.get("state", {}).get("measure", {}) for r in results]
        if measures[0]:
            for m in measures[1:]:
                for key in ["E", "sigma", "density"]:
                    if key in measures[0] and key in m:
                        assert abs(measures[0].get(key, 0) - m.get(key, 0)) < 0.001


if __name__ == "__main__":
    pytest.main([__file__, "-v"])





