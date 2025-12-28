# tests/test_state_pipeline.py
"""
AUTUS State Pipeline Tests (정본)
=================================

4 Endpoints + Commit Pipeline + Hash Chain

Version: 1.0.0
Status: LOCKED

처리 순서 검증:
1. Page 3 (Mandala) → 물리량 변환
2. Page 1 (Goal) → Mass/Volume 적용
3. Page 2 (Route) → Node Operations
4. Kernel 재계산
5. Forecast 갱신
6. Marker 생성
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.autus_state import (
    AutusState, state_to_dict, canonical_json, sha256_hex, sha256_short,
    STORE, clamp01, round_f, Measure, Draft
)
from app.mandala_transform import (
    normalize_allocations, mandala_to_physics,
    E_BASE, P_BASE, L_BASE, V_BASE, SIGMA_BASE
)
from app.validators import (
    validate_page1_patch, validate_page2_patch, validate_page3_patch,
    HORIZON_VALUES
)
from app.commit_pipeline import commit_apply
from app.node_classifier import classify_node


class TestCanonicalHash:
    """Canonical JSON + Hash 결정론 테스트"""
    
    def test_canonical_json_deterministic(self):
        """동일 입력 → 동일 JSON (키 순서 무관)"""
        obj1 = {"b": 1, "a": 2, "c": 3}
        obj2 = {"a": 2, "c": 3, "b": 1}
        
        json1 = canonical_json(obj1)
        json2 = canonical_json(obj2)
        
        assert json1 == json2
        assert json1 == '{"a":2,"b":1,"c":3}'
    
    def test_float_rounding(self):
        """Float 6자리 라운딩 결정론"""
        assert round_f(0.123456789) == 0.123457
        # Float 정밀도 문제 해결
        assert round_f(0.1 + 0.2) == round_f(0.3)
    
    def test_state_hash_deterministic(self):
        """동일 상태 → 동일 해시"""
        state1 = AutusState(session_id="test")
        state2 = AutusState(session_id="test")
        
        hash1 = sha256_hex(canonical_json(state_to_dict(state1)))
        hash2 = sha256_hex(canonical_json(state_to_dict(state2)))
        
        assert hash1 == hash2
    
    def test_sha256_short(self):
        """SHA256 short (16자)"""
        full = sha256_hex("test")
        short = sha256_short("test")
        
        assert len(short) == 16
        assert full.startswith(short)


class TestMandalaTransform:
    """만다라 변환 테스트"""
    
    def test_normalize_allocations(self):
        """Allocations 정규화 (sum = 1)"""
        raw = {"E": 0.6, "S": 0.2, "NW": 0.2}
        normalized = normalize_allocations(raw)
        
        assert abs(sum(normalized.values()) - 1.0) < 1e-6
    
    def test_normalize_empty(self):
        """빈 입력 → E=1.0 기본값"""
        normalized = normalize_allocations({})
        assert normalized["E"] == 1.0
        assert all(normalized[k] == 0.0 for k in ["N", "NE", "SE", "S", "SW", "W", "NW"])
    
    def test_mandala_to_physics_bounds(self):
        """물리량 범위 [0, 1]"""
        alloc = normalize_allocations({"E": 1.0})
        phy = mandala_to_physics(alloc)
        
        for key in ["E", "pressure", "leak", "volume", "sigma", "density", "stability"]:
            assert 0.0 <= phy[key] <= 1.0
    
    def test_mandala_base_values(self):
        """균등 배분 → Base Values에 가까움"""
        alloc = {k: 0.125 for k in ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]}
        phy = mandala_to_physics(alloc)
        
        # E slot이 0.125일 때: E = E_BASE + K_E * 0.125
        assert phy["E"] > E_BASE
        assert phy["pressure"] > 0
        assert phy["volume"] > 0
    
    def test_mandala_e_dominant(self):
        """E 슬롯 지배 → 높은 에너지"""
        alloc = {"E": 1.0}  # normalize 후 E=1
        phy = mandala_to_physics(alloc)
        
        assert phy["E"] == clamp01(E_BASE + 0.65 * 1.0)
        assert phy["E"] == 1.0  # 0.35 + 0.65 = 1.0


class TestValidators:
    """Draft 검증 테스트"""
    
    def test_page1_valid(self):
        """Page1 유효한 패치"""
        patch = {"mass_modifier": 0.3, "horizon_override": "D30"}
        result = validate_page1_patch(patch)
        
        assert result["mass_modifier"] == 0.3
        assert result["horizon_override"] == "D30"
    
    def test_page1_clamp(self):
        """Page1 범위 클램핑"""
        patch = {"mass_modifier": 10.0}  # 범위 초과
        result = validate_page1_patch(patch)
        
        assert result["mass_modifier"] == 0.5  # 최대값으로 클램핑
    
    def test_page1_invalid_key(self):
        """Page1 잘못된 키"""
        with pytest.raises(ValueError, match="INVALID_PATCH_KEY"):
            validate_page1_patch({"invalid_key": 1})
    
    def test_page1_horizon_values(self):
        """Page1 Horizon 값 검증"""
        for h in HORIZON_VALUES:
            result = validate_page1_patch({"horizon_override": h})
            assert result["horizon_override"] == h
        
        with pytest.raises(ValueError, match="INVALID_ENUM"):
            validate_page1_patch({"horizon_override": "INVALID"})
    
    def test_page2_valid(self):
        """Page2 유효한 패치"""
        patch = {
            "mass_filter": 0.5,
            "virtual_anchor_shift": [0.1, -0.2]
        }
        result = validate_page2_patch(patch)
        
        assert result["mass_filter"] == 0.5
        assert result["virtual_anchor_shift"] == (0.1, -0.2)
    
    def test_page2_ops(self):
        """Page2 NodeOps 검증 (4종)"""
        patch = {
            "ops": [
                {"op_id": "op_001", "type": "NODE_CREATE", "t_ms": 1001,
                 "node": {"id": "A", "mass": 0.5}},
                {"op_id": "op_002", "type": "NODE_DELETE", "t_ms": 1002,
                 "node_id": "B"}
            ]
        }
        result = validate_page2_patch(patch)
        
        assert len(result["ops"]) == 2
        assert result["ops"][0]["type"] == "NODE_CREATE"
        assert result["ops"][1]["type"] == "NODE_DELETE"
    
    def test_page3_normalization(self):
        """Page3 allocations 정규화"""
        patch = {"allocations": {"E": 0.6, "S": 0.2, "NW": 0.2}}
        result = validate_page3_patch(patch)
        
        assert abs(sum(result["allocations"].values()) - 1.0) < 1e-6


class TestNodeClassifier:
    """NodeType 분류 테스트"""
    
    def test_threshold(self):
        """THRESHOLD: Density > 0.75 AND σ < 0.25"""
        node_type = classify_node(M=0.5, E=0.8, sigma=0.2, density=0.8)
        assert node_type == "THRESHOLD"
    
    def test_entropy_dominant(self):
        """ENTROPY_DOMINANT: σ > 0.60"""
        node_type = classify_node(M=0.5, E=0.5, sigma=0.7, density=0.5)
        assert node_type == "ENTROPY_DOMINANT"
    
    def test_stable(self):
        """STABLE: Stability > 0.70"""
        node_type = classify_node(M=0.5, E=0.4, sigma=0.25, density=0.5, stability=0.75)
        assert node_type == "STABLE"
    
    def test_potential(self):
        """POTENTIAL: E < 0.30 AND σ < 0.50"""
        node_type = classify_node(M=0.5, E=0.2, sigma=0.3, density=0.3)
        assert node_type == "POTENTIAL"


class TestCommitPipeline:
    """Commit 파이프라인 테스트"""
    
    def test_commit_order(self):
        """Commit 순서: Page3 → Page1 → Page2"""
        state = AutusState(session_id="test_commit")
        
        # Draft 설정
        state.draft.page1.mass_modifier = 0.2
        state.draft.page3.allocations = normalize_allocations({"E": 0.8, "S": 0.2})
        
        result = commit_apply(state, t_ms=1000)
        
        assert result["commit"]["applied"] == True
        assert state.ui.mode == "LIVE"
        
        # Processing steps 순서 확인
        steps = result.get("processing_steps", [])
        assert "STAGE1: Mandala Transform" in steps[0]
        assert "STAGE2: Mass" in steps[1]
    
    def test_commit_resets_draft(self):
        """Commit 후 Draft 리셋"""
        state = AutusState(session_id="test_reset")
        state.draft.page1.mass_modifier = 0.5
        state.draft.page3.allocations = {"E": 1.0}
        
        commit_apply(state, t_ms=1000)
        
        # Draft가 기본값으로 리셋
        assert state.draft.page1.mass_modifier == 0.0
        assert abs(state.draft.page3.allocations["E"] - 0.125) < 0.01
    
    def test_sim_to_live(self):
        """SIM → LIVE 전환"""
        state = AutusState(session_id="test_mode")
        state.ui.mode = "SIM"
        
        commit_apply(state, t_ms=1000)
        
        assert state.ui.mode == "LIVE"
    
    def test_state_hash_in_result(self):
        """Commit 결과에 state_hash 포함"""
        state = AutusState(session_id="test_hash")
        result = commit_apply(state, t_ms=1000)
        
        assert "state_hash" in result["commit"]["marker_payload"]
        assert len(result["commit"]["marker_payload"]["state_hash"]) == 16  # sha256_short
    
    def test_mandala_affects_physics(self):
        """Page3 Mandala → 물리량 변화"""
        state = AutusState(session_id="test_mandala")
        initial_E = state.measure.E
        
        # E slot을 높게 설정
        state.draft.page3.allocations = normalize_allocations({"E": 1.0})
        
        commit_apply(state, t_ms=1000)
        
        # E가 증가해야 함
        assert state.measure.E > initial_E
    
    def test_mass_modifier_affects_M(self):
        """Page1 mass_modifier → M 변화"""
        state = AutusState(session_id="test_mass")
        state.measure.M = 0.5
        state.draft.page1.mass_modifier = 0.2  # +20%
        
        commit_apply(state, t_ms=1000)
        
        # M이 증가해야 함 (damping 적용)
        assert state.measure.M > 0.5


class TestStateStore:
    """StateStore 테스트"""
    
    def test_get_or_create(self):
        """세션 생성/조회"""
        STORE.clear()
        
        state1 = STORE.get_or_create("session_1")
        state2 = STORE.get_or_create("session_1")
        
        assert state1 is state2
    
    def test_multiple_sessions(self):
        """여러 세션 독립성"""
        STORE.clear()
        
        state1 = STORE.get_or_create("session_1")
        state2 = STORE.get_or_create("session_2")
        
        state1.measure.M = 0.8
        
        assert state2.measure.M != 0.8


class TestDeterminism:
    """결정론 테스트 (핵심)"""
    
    def test_same_input_same_output(self):
        """동일 입력 → 동일 출력"""
        results = []
        
        for _ in range(5):
            state = AutusState(session_id="test_det")
            state.draft.page3.allocations = normalize_allocations({"E": 0.5, "S": 0.3, "NW": 0.2})
            
            result = commit_apply(state, t_ms=1000)
            results.append(result["commit"]["marker_payload"]["state_hash"])
        
        # 모든 해시 동일
        assert all(h == results[0] for h in results)
    
    def test_different_input_different_output(self):
        """다른 입력 → 다른 출력"""
        state1 = AutusState(session_id="test_diff1")
        state1.draft.page3.allocations = normalize_allocations({"E": 0.8})
        result1 = commit_apply(state1, t_ms=1000)
        
        state2 = AutusState(session_id="test_diff2")
        state2.draft.page3.allocations = normalize_allocations({"S": 0.8})
        result2 = commit_apply(state2, t_ms=1000)
        
        # 해시가 다름
        assert result1["commit"]["marker_payload"]["state_hash"] != \
               result2["commit"]["marker_payload"]["state_hash"]
    
    def test_replay_produces_same_state(self):
        """Replay: 동일 시퀀스 → 동일 상태 (session_id 포함)"""
        # First run
        state1 = AutusState(session_id="replay_test")
        state1.draft.page1.mass_modifier = 0.1
        state1.draft.page3.allocations = normalize_allocations({"E": 0.6, "S": 0.4})
        result1 = commit_apply(state1, t_ms=1000)
        hash1 = result1["commit"]["marker_payload"]["state_hash"]
        
        # Second run (replay) - 동일 session_id
        state2 = AutusState(session_id="replay_test")
        state2.draft.page1.mass_modifier = 0.1
        state2.draft.page3.allocations = normalize_allocations({"E": 0.6, "S": 0.4})
        result2 = commit_apply(state2, t_ms=1000)
        hash2 = result2["commit"]["marker_payload"]["state_hash"]
        
        # session_id가 같으면 해시도 같아야 함
        assert hash1 == hash2


class TestPhysicsFormulas:
    """물리 공식 테스트 (정본)"""
    
    def test_density_formula(self):
        """Density = (E × (1-Leak) × Pressure) / Volume"""
        state = AutusState(session_id="test_formula")
        state.measure.E = 0.8
        state.measure.leak = 0.2
        state.measure.pressure = 0.6
        state.measure.volume = 0.5
        
        # Commit으로 재계산
        commit_apply(state, t_ms=1000)
        
        # Density 범위 확인
        assert 0.0 <= state.measure.density <= 1.0
    
    def test_stability_formula(self):
        """Stability = 1 - σ"""
        state = AutusState(session_id="test_stability")
        state.measure.sigma = 0.3
        
        commit_apply(state, t_ms=1000)
        
        # Stability = 1 - sigma (after damping)
        assert state.measure.stability == clamp01(1.0 - state.measure.sigma)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])





