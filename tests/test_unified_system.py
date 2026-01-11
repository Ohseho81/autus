"""
AUTUS Unified System 테스트
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Unified System 임포트 시도
try:
    from core.unified import UnifiedEngine
    UNIFIED_AVAILABLE = True
except ImportError:
    UNIFIED_AVAILABLE = False


@pytest.mark.skipif(not UNIFIED_AVAILABLE, reason="unified engine not available")
class TestUnifiedEngine:
    """Unified Engine 테스트"""
    
    def test_engine_init(self):
        """엔진 초기화"""
        engine = UnifiedEngine()
        assert engine is not None
    
    def test_get_state(self):
        """상태 조회"""
        engine = UnifiedEngine()
        state = engine.get_state()
        
        assert len(state) == 6
        for key, value in state.items():
            assert 0 <= value <= 1


class TestUnifiedSystemConcepts:
    """Unified System 개념 테스트 (모의)"""
    
    def test_six_dimensions(self):
        """6차원 시스템"""
        dimensions = ["BIO", "CAPITAL", "COGNITION", "RELATION", "ENVIRONMENT", "LEGACY"]
        
        state = {dim: 0.5 for dim in dimensions}
        
        assert len(state) == 6
        assert all(dim in state for dim in dimensions)
    
    def test_motion_application(self):
        """모션 적용"""
        state = {"CAPITAL": 0.5}
        motion = {"type": "ACQUIRE", "delta": 0.1}
        
        # 모션 적용
        new_value = state["CAPITAL"] + motion["delta"]
        new_value = max(0, min(1, new_value))  # 클램핑
        
        assert new_value == 0.6
    
    def test_decay_over_time(self):
        """시간에 따른 감쇠"""
        initial = 0.8
        decay_rate = 0.02
        ticks = 5
        
        value = initial
        for _ in range(ticks):
            value *= (1 - decay_rate)
        
        expected = initial * ((1 - decay_rate) ** ticks)
        
        assert abs(value - expected) < 0.0001
        assert value < initial  # 감쇠됨
    
    def test_gate_evaluation(self):
        """게이트 평가"""
        state = {"BIO": 0.7, "CAPITAL": 0.5, "COGNITION": 0.8}
        
        # 게이트 조건: 모든 값이 threshold 이상
        threshold = 0.6
        gate_open = all(v >= threshold for v in state.values())
        
        assert gate_open is False  # CAPITAL이 0.5로 미달
    
    def test_synergy_calculation(self):
        """시너지 계산"""
        state = {"BIO": 0.6, "CAPITAL": 0.7, "COGNITION": 0.8}
        
        # 시너지: 값들의 곱의 제곱근
        product = 1.0
        for v in state.values():
            product *= v
        
        synergy = product ** (1 / len(state))  # 기하평균
        
        assert 0.6 < synergy < 0.8  # 대략 0.7 근처
    
    def test_physics_formula(self):
        """물리 공식 V = (M - T) × (1 + s)^t"""
        M = 100  # Money
        T = 20   # Time cost
        s = 0.1  # Synergy factor
        t = 2    # Time period
        
        V = (M - T) * ((1 + s) ** t)
        
        assert V == pytest.approx(96.8)
    
    def test_sq_formula(self):
        """SQ 공식 = (Mint - Burn) / Time × Synergy"""
        Mint = 1000
        Burn = 200
        Time = 30
        Synergy = 1.2
        
        SQ = (Mint - Burn) / Time * Synergy
        
        assert SQ == pytest.approx(32.0)
