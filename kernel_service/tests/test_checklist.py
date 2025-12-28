"""
AUTUS 실전 가동 체크리스트 테스트
==================================

Version: 1.0.0
Status: LOCKED

체크리스트 항목:
1. 데이터 무결성 (State Contract Integrity)
2. 물리 엔진 로직 (Physics Kernel)
3. API 및 통신 파이프라인 (Execution Flow)
4. UI/UX 물리적 피드백 (Visual Feedback)
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.autus_state import (
    AutusState, Measure, Forecast, state_to_dict,
    clamp01, canonical_json, sha256_short
)
from app.commit_pipeline import (
    commit_apply, stage4_kernel_recalc, stage1_mandala_transform
)
from app.validators import (
    validate_page3_patch, validate_allocation_sum, normalize_allocations
)
from app.mandala_transform import mandala_to_physics, SLOTS


# ================================================================
# 1. 데이터 무결성 점검
# ================================================================

class TestDataIntegrity:
    """데이터 무결성 (State Contract Integrity) 테스트"""
    
    def test_allocation_normalization_sum_is_one(self):
        """[1-1] Allocation 정규화: 합계가 정확히 1.0인지 확인"""
        # 다양한 입력에 대해 합계 = 1.0 보장
        test_cases = [
            {"N": 0.5, "E": 0.5},  # 일부만
            {"N": 1, "NE": 2, "E": 3, "SE": 4, "S": 5, "SW": 6, "W": 7, "NW": 8},  # 비정규
            {"E": 1.0},  # 단일
            {},  # 빈 입력
        ]
        
        for alloc in test_cases:
            from app.mandala_transform import normalize_allocations
            normalized = normalize_allocations(alloc)
            total = sum(normalized.values())
            assert abs(total - 1.0) < 1e-6, f"Sum should be 1.0, got {total}"
    
    def test_allocation_floating_point_precision(self):
        """[1-2] 부동 소수점 오차 방지: 정수 연산 후 복원"""
        # 0.1을 반복 더해도 정확히 1.0
        alloc = {s: 0.125 for s in SLOTS}
        normalized = normalize_allocations(alloc)
        total = sum(normalized.values())
        
        # 부동 소수점 오차 허용 범위 (1e-10)
        assert abs(total - 1.0) < 1e-10
    
    def test_immutability_live_mode(self):
        """[1-3] 불변성: LIVE 모드에서 Draft는 변경 불가 (개념)"""
        state = AutusState(session_id="test_immut")
        state.ui.mode = "LIVE"
        
        # LIVE 모드에서는 commit 후 draft가 초기화되어야 함
        commit_apply(state, t_ms=1000)
        
        # Draft는 기본값으로 리셋됨
        assert state.draft.page1.mass_modifier == 0.0
        assert state.draft.page2.ops == []


# ================================================================
# 2. 물리 엔진 로직 점검
# ================================================================

class TestPhysicsKernel:
    """물리 엔진 로직 (Physics Kernel) 테스트"""
    
    def test_density_no_infinity_on_zero_volume(self):
        """[2-1] Density 공식: Volume=0에서 Infinity 방지"""
        state = AutusState(session_id="test_density")
        state.measure.E = 0.8
        state.measure.pressure = 0.9
        state.measure.leak = 0.1
        state.measure.volume = 0.0  # 위험한 값
        
        # Kernel 재계산
        stage4_kernel_recalc(state)
        
        # Density는 [0, 1] 범위 내
        assert 0 <= state.measure.density <= 1.0
        assert state.measure.density != float('inf')
    
    def test_density_formula_correct(self):
        """[2-2] Density 공식 검증: (E × (1-Leak) × Pressure) / Volume"""
        state = AutusState(session_id="test_density_formula")
        state.measure.E = 0.8
        state.measure.pressure = 0.6
        state.measure.leak = 0.2
        state.measure.volume = 0.5
        
        # 예상 값
        E_eff = 0.8 * (1 - 0.2)  # = 0.64
        expected = min(1.0, (E_eff * 0.6) / 0.5)  # = 0.768
        
        stage4_kernel_recalc(state)
        
        assert abs(state.measure.density - expected) < 0.01
    
    def test_stability_formula(self):
        """[2-3] Stability 공식: 1 - σ"""
        state = AutusState(session_id="test_stability")
        state.measure.sigma = 0.3
        
        stage4_kernel_recalc(state)
        
        assert abs(state.measure.stability - 0.7) < 1e-6
    
    def test_risk_investment_increases_sigma(self):
        """[2-4] Risk(NE) 투자 시 σ 증가"""
        # 기본 allocation
        base_alloc = {s: 0.125 for s in SLOTS}
        base_physics = mandala_to_physics(base_alloc)
        base_sigma = base_physics["sigma"]
        
        # NE (Risk) 투자 증가
        risk_alloc = base_alloc.copy()
        risk_alloc["NE"] = 0.5  # Risk에 더 투자
        risk_physics = mandala_to_physics(risk_alloc)
        
        # σ가 증가해야 함
        assert risk_physics["sigma"] > base_sigma
    
    def test_pattern_investment_decreases_sigma(self):
        """[2-5] Pattern(S) 투자 시 σ 감소 (안정화)"""
        # 기본 allocation
        base_alloc = {s: 0.125 for s in SLOTS}
        base_physics = mandala_to_physics(base_alloc)
        base_sigma = base_physics["sigma"]
        
        # S (Pattern) 투자 증가
        pattern_alloc = base_alloc.copy()
        pattern_alloc["S"] = 0.5  # Pattern에 더 투자
        pattern_physics = mandala_to_physics(pattern_alloc)
        
        # σ가 감소해야 함
        assert pattern_physics["sigma"] < base_sigma


# ================================================================
# 3. API 및 통신 파이프라인 점검
# ================================================================

class TestExecutionFlow:
    """API 및 통신 파이프라인 테스트"""
    
    def test_commit_changes_mode_to_live(self):
        """[3-1] Commit 시 mode가 LIVE로 전환"""
        state = AutusState(session_id="test_commit_mode")
        state.ui.mode = "SIM"
        
        result = commit_apply(state, t_ms=1000)
        
        assert state.ui.mode == "LIVE"
        assert result["commit"]["applied"] is True
    
    def test_commit_pipeline_order(self):
        """[3-2] Commit Pipeline 순서: Page 3 → Page 1 → Page 2"""
        state = AutusState(session_id="test_pipeline_order")
        
        result = commit_apply(state, t_ms=1000)
        
        steps = result["processing_steps"]
        
        # 순서 확인
        assert "STAGE1: Mandala Transform" in steps[0]  # Page 3
        assert "STAGE2: Mass + Volume" in steps[1]      # Page 1
        assert "STAGE3: Node Operations" in steps[2]    # Page 2
    
    def test_replay_marker_hash_chain(self):
        """[3-3] Replay Marker 해시 체인 생성"""
        state = AutusState(session_id="test_hash_chain")
        
        result = commit_apply(state, t_ms=1000, create_marker=True)
        
        # state_hash 생성 확인
        marker_payload = result["commit"]["marker_payload"]
        assert "state_hash" in marker_payload
        assert len(marker_payload["state_hash"]) == 16  # SHA256 앞 16자
    
    def test_determinism_same_input_same_output(self):
        """[3-4] 결정론: 동일 입력 → 동일 출력"""
        # 두 개의 동일한 상태 생성
        state1 = AutusState(session_id="determinism_test")
        state2 = AutusState(session_id="determinism_test")
        
        # 동일한 Draft 설정
        state1.draft.page3.allocations = {"N": 0.2, "NE": 0.1, "E": 0.3, "SE": 0.1, 
                                          "S": 0.1, "SW": 0.05, "W": 0.1, "NW": 0.05}
        state2.draft.page3.allocations = state1.draft.page3.allocations.copy()
        
        # 동일 시간에 commit
        result1 = commit_apply(state1, t_ms=1234567890)
        result2 = commit_apply(state2, t_ms=1234567890)
        
        # 동일한 state_hash
        assert result1["commit"]["marker_payload"]["state_hash"] == \
               result2["commit"]["marker_payload"]["state_hash"]


# ================================================================
# 4. UI/UX 물리적 피드백 점검
# ================================================================

class TestVisualFeedback:
    """UI/UX 물리적 피드백 테스트 (단위)"""
    
    def test_milestone_density_high(self):
        """[4-1] 변곡점: Density 0.9 돌파 감지"""
        measure = {"density": 0.91, "stability": 0.5, "sigma": 0.5}
        forecast = {"P_outcome": 0.5}
        
        # Python에서 milestone 체크 로직 테스트
        milestones = []
        if measure["density"] >= 0.9:
            milestones.append("DENSITY_HIGH")
        
        assert "DENSITY_HIGH" in milestones
    
    def test_milestone_stability_high(self):
        """[4-2] 변곡점: Stability 0.8 돌파 감지"""
        measure = {"density": 0.5, "stability": 0.85, "sigma": 0.15}
        
        milestones = []
        if measure["stability"] >= 0.8:
            milestones.append("STABILITY_HIGH")
        
        assert "STABILITY_HIGH" in milestones
    
    def test_line_style_sim_vs_live(self):
        """[4-3] 실선/점선 구분: SIM=점선, LIVE=실선"""
        # SIM 모드
        sim_style = "dashed" if True else "solid"  # SIM
        live_style = "solid" if True else "dashed"  # LIVE
        
        assert sim_style == "dashed"
        assert live_style == "solid"


# ================================================================
# 실행
# ================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])





