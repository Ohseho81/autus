# tests/test_node_ops.py
"""
NodeOps Tests (정본)
====================

4종 ops 테스트:
- NODE_CREATE: 노드 생성
- NODE_DELETE: 노드 삭제
- NODE_MASS_SCALE: 질량 스케일
- EDGE_WEIGHT_SET: 엣지 가중치

Version: 1.0.0
"""

import pytest
from fastapi.testclient import TestClient

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.autus_state import STORE

client = TestClient(app)


class TestNodeOpsValidation:
    """NodeOps 검증 테스트"""
    
    def test_ops_create_valid(self):
        """NODE_CREATE 유효한 op"""
        STORE.clear()
        r = client.post("/draft/update", json={
            "session_id": "ops_test_1",
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [{
                    "op_id": "op_001",
                    "type": "NODE_CREATE",
                    "t_ms": 1001,
                    "node": {"id": "NODE_A", "mass": 0.5, "sigma": 0.3, "density": 0.4}
                }]
            }
        })
        assert r.status_code == 200
        state = r.json()["state"]
        assert len(state["draft"]["page2"]["ops"]) == 1
    
    def test_ops_invalid_type(self):
        """잘못된 type"""
        STORE.clear()
        r = client.post("/draft/update", json={
            "session_id": "ops_test_2",
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [{
                    "op_id": "op_001",
                    "type": "INVALID_TYPE",
                    "t_ms": 1001
                }]
            }
        })
        assert r.status_code == 400
        assert "INVALID_ENUM" in r.json()["detail"]
    
    def test_ops_duplicate_id_ignored(self):
        """중복 op_id는 무시 (idempotent)"""
        STORE.clear()
        r = client.post("/draft/update", json={
            "session_id": "ops_test_3",
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [
                    {"op_id": "op_001", "type": "NODE_CREATE", "t_ms": 1001,
                     "node": {"id": "A", "mass": 0.5}},
                    {"op_id": "op_001", "type": "NODE_CREATE", "t_ms": 1002,
                     "node": {"id": "B", "mass": 0.6}},  # 중복 - 무시됨
                ]
            }
        })
        assert r.status_code == 200
        state = r.json()["state"]
        assert len(state["draft"]["page2"]["ops"]) == 1
    
    def test_ops_sorted_by_t_ms(self):
        """ops는 t_ms, op_id로 정렬됨"""
        STORE.clear()
        r = client.post("/draft/update", json={
            "session_id": "ops_test_4",
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [
                    {"op_id": "op_003", "type": "NODE_CREATE", "t_ms": 3000,
                     "node": {"id": "C"}},
                    {"op_id": "op_001", "type": "NODE_CREATE", "t_ms": 1000,
                     "node": {"id": "A"}},
                    {"op_id": "op_002", "type": "NODE_CREATE", "t_ms": 2000,
                     "node": {"id": "B"}},
                ]
            }
        })
        assert r.status_code == 200
        ops = r.json()["state"]["draft"]["page2"]["ops"]
        assert ops[0]["op_id"] == "op_001"
        assert ops[1]["op_id"] == "op_002"
        assert ops[2]["op_id"] == "op_003"
    
    def test_ops_max_limit(self):
        """ops 최대 200개 제한"""
        STORE.clear()
        ops = [
            {"op_id": f"op_{i:05d}", "type": "NODE_CREATE", "t_ms": i,
             "node": {"id": f"N_{i}"}}
            for i in range(201)
        ]
        r = client.post("/draft/update", json={
            "session_id": "ops_test_5",
            "t_ms": 1000,
            "page": 2,
            "patch": {"ops": ops}
        })
        assert r.status_code == 400
        assert "TOO_MANY_OPS" in r.json()["detail"]


class TestNodeOpsCommit:
    """NodeOps Commit 테스트"""
    
    def test_node_create_on_commit(self):
        """NODE_CREATE - commit 시 노드 생성"""
        STORE.clear()
        session_id = "commit_test_1"
        
        # Draft에 ops 추가
        r = client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [{
                    "op_id": "op_create_1",
                    "type": "NODE_CREATE",
                    "t_ms": 1001,
                    "node": {"id": "NEW_NODE", "mass": 0.6, "sigma": 0.2, "density": 0.5, "type": "ENTITY"}
                }]
            }
        })
        assert r.status_code == 200
        
        # Commit
        r = client.post("/commit", json={
            "session_id": session_id,
            "t_ms": 1100,
            "options": {"create_marker": False}
        })
        assert r.status_code == 200
        
        state = r.json()["state"]
        node_ids = [n["id"] for n in state["graph"]["nodes"]]
        assert "NEW_NODE" in node_ids
        
        # 노드 속성 확인
        new_node = [n for n in state["graph"]["nodes"] if n["id"] == "NEW_NODE"][0]
        assert new_node["mass"] == 0.6
    
    def test_node_delete_on_commit(self):
        """NODE_DELETE - commit 시 노드 삭제"""
        STORE.clear()
        session_id = "commit_test_2"
        
        # 먼저 노드 생성
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [{
                    "op_id": "op_create",
                    "type": "NODE_CREATE",
                    "t_ms": 1001,
                    "node": {"id": "TO_DELETE", "mass": 0.5}
                }]
            }
        })
        client.post("/commit", json={"session_id": session_id, "t_ms": 1100})
        
        # 삭제 ops
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 2000,
            "page": 2,
            "patch": {
                "ops": [{
                    "op_id": "op_delete",
                    "type": "NODE_DELETE",
                    "t_ms": 2001,
                    "node_id": "TO_DELETE"
                }]
            }
        })
        
        r = client.post("/commit", json={
            "session_id": session_id,
            "t_ms": 2100,
            "options": {"create_marker": False}
        })
        
        state = r.json()["state"]
        node_ids = [n["id"] for n in state["graph"]["nodes"]]
        assert "TO_DELETE" not in node_ids
    
    def test_node_delete_self_protected(self):
        """NODE_DELETE - SELF 노드는 삭제 불가"""
        STORE.clear()
        session_id = "commit_test_3"
        
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [{
                    "op_id": "op_delete_self",
                    "type": "NODE_DELETE",
                    "t_ms": 1001,
                    "node_id": "SELF"
                }]
            }
        })
        
        r = client.post("/commit", json={
            "session_id": session_id,
            "t_ms": 1100
        })
        
        state = r.json()["state"]
        node_ids = [n["id"] for n in state["graph"]["nodes"]]
        assert "SELF" in node_ids  # SELF는 보호됨
    
    def test_node_mass_scale(self):
        """NODE_MASS_SCALE - 질량 스케일"""
        STORE.clear()
        session_id = "commit_test_4"
        
        # 노드 생성
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [{
                    "op_id": "op_create",
                    "type": "NODE_CREATE",
                    "t_ms": 1001,
                    "node": {"id": "SCALE_NODE", "mass": 0.4}
                }]
            }
        })
        client.post("/commit", json={"session_id": session_id, "t_ms": 1100})
        
        # 스케일 1.5배
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 2000,
            "page": 2,
            "patch": {
                "ops": [{
                    "op_id": "op_scale",
                    "type": "NODE_MASS_SCALE",
                    "t_ms": 2001,
                    "node_id": "SCALE_NODE",
                    "scale": 1.5
                }]
            }
        })
        
        r = client.post("/commit", json={
            "session_id": session_id,
            "t_ms": 2100
        })
        
        state = r.json()["state"]
        node = [n for n in state["graph"]["nodes"] if n["id"] == "SCALE_NODE"][0]
        assert abs(node["mass"] - 0.6) < 1e-6  # 0.4 * 1.5 = 0.6
    
    def test_edge_weight_set(self):
        """EDGE_WEIGHT_SET - 엣지 가중치 설정"""
        STORE.clear()
        session_id = "commit_test_5"
        
        # 노드 생성 + 엣지 설정
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [
                    {"op_id": "op_create", "type": "NODE_CREATE", "t_ms": 1001,
                     "node": {"id": "EDGE_NODE", "mass": 0.5}},
                    {"op_id": "op_edge", "type": "EDGE_WEIGHT_SET", "t_ms": 1002,
                     "a": "SELF", "b": "EDGE_NODE", "flow": 0.7}
                ]
            }
        })
        
        r = client.post("/commit", json={
            "session_id": session_id,
            "t_ms": 1100
        })
        
        state = r.json()["state"]
        edges = state["graph"]["edges"]
        edge = [e for e in edges if e["a"] == "SELF" and e["b"] == "EDGE_NODE"]
        assert len(edge) == 1
        assert abs(edge[0]["flow"] - 0.7) < 1e-6
    
    def test_full_ops_flow(self):
        """전체 ops 흐름: CREATE → SCALE → EDGE → DELETE"""
        STORE.clear()
        session_id = "commit_test_full"
        
        # 1. 노드 생성 + 엣지
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [
                    {"op_id": "op_001", "type": "NODE_CREATE", "t_ms": 1001,
                     "node": {"id": "X", "mass": 0.4, "sigma": 0.3, "density": 0.2}},
                    {"op_id": "op_002", "type": "EDGE_WEIGHT_SET", "t_ms": 1002,
                     "a": "SELF", "b": "X", "flow": 0.6},
                    {"op_id": "op_003", "type": "NODE_MASS_SCALE", "t_ms": 1003,
                     "node_id": "X", "scale": 1.5}
                ]
            }
        })
        
        r = client.post("/commit", json={"session_id": session_id, "t_ms": 1100})
        assert r.status_code == 200
        
        state = r.json()["state"]
        node_ids = [n["id"] for n in state["graph"]["nodes"]]
        assert "X" in node_ids
        
        x_node = [n for n in state["graph"]["nodes"] if n["id"] == "X"][0]
        assert abs(x_node["mass"] - 0.6) < 1e-6  # 0.4 * 1.5
        
        edges = state["graph"]["edges"]
        assert any(e["a"] == "SELF" and e["b"] == "X" and abs(e["flow"] - 0.6) < 1e-6 for e in edges)
        
        # 2. 삭제
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 2000,
            "page": 2,
            "patch": {
                "ops": [
                    {"op_id": "op_010", "type": "NODE_DELETE", "t_ms": 2001, "node_id": "X"}
                ]
            }
        })
        
        r = client.post("/commit", json={"session_id": session_id, "t_ms": 2100})
        state = r.json()["state"]
        
        node_ids = [n["id"] for n in state["graph"]["nodes"]]
        assert "X" not in node_ids
        
        # 엣지도 함께 삭제됨
        edges = state["graph"]["edges"]
        assert not any(e["b"] == "X" for e in edges)


class TestNodeOpsDeterminism:
    """NodeOps 결정론 테스트"""
    
    def test_same_ops_same_result(self):
        """동일 ops → 동일 결과 (session_id 포함)"""
        results = []
        
        # 동일 session_id로 3회 실행
        for i in range(3):
            STORE.clear()
            session_id = "determinism_test"  # 동일 session_id
            
            client.post("/draft/update", json={
                "session_id": session_id,
                "t_ms": 1000,
                "page": 2,
                "patch": {
                    "ops": [
                        {"op_id": "op_001", "type": "NODE_CREATE", "t_ms": 1001,
                         "node": {"id": "A", "mass": 0.5, "sigma": 0.3}},
                        {"op_id": "op_002", "type": "NODE_CREATE", "t_ms": 1002,
                         "node": {"id": "B", "mass": 0.6, "sigma": 0.2}},
                        {"op_id": "op_003", "type": "EDGE_WEIGHT_SET", "t_ms": 1003,
                         "a": "A", "b": "B", "flow": 0.4}
                    ]
                }
            })
            
            r = client.post("/commit", json={"session_id": session_id, "t_ms": 1100})
            results.append(r.json()["commit"]["marker_payload"]["state_hash"])
        
        # 모든 해시 동일
        assert all(h == results[0] for h in results)
    
    def test_graph_sorted_after_ops(self):
        """ops 적용 후 그래프 정렬됨"""
        STORE.clear()
        session_id = "sort_test"
        
        # 순서 뒤섞어서 생성
        client.post("/draft/update", json={
            "session_id": session_id,
            "t_ms": 1000,
            "page": 2,
            "patch": {
                "ops": [
                    {"op_id": "op_c", "type": "NODE_CREATE", "t_ms": 1003,
                     "node": {"id": "C"}},
                    {"op_id": "op_a", "type": "NODE_CREATE", "t_ms": 1001,
                     "node": {"id": "A"}},
                    {"op_id": "op_b", "type": "NODE_CREATE", "t_ms": 1002,
                     "node": {"id": "B"}},
                ]
            }
        })
        
        r = client.post("/commit", json={"session_id": session_id, "t_ms": 1100})
        state = r.json()["state"]
        
        # 노드가 id 기준 정렬됨
        node_ids = [n["id"] for n in state["graph"]["nodes"]]
        sorted_ids = sorted([nid for nid in node_ids if nid != "SELF"])
        actual_ids = [nid for nid in node_ids if nid != "SELF"]
        assert actual_ids == sorted_ids


if __name__ == "__main__":
    pytest.main([__file__, "-v"])





