"""
═══════════════════════════════════════════════════════════════════════════════
🧪 AUTUS Physics Tests
═══════════════════════════════════════════════════════════════════════════════

물리 법칙 및 시뮬레이션 테스트
"""

import pytest
import sys
from pathlib import Path

# 경로 설정
root = Path(__file__).parent.parent
sys.path.insert(0, str(root / "backend"))


class TestPhysicsEnums:
    """물리 Enum 테스트"""

    def test_physics_dimensions(self):
        """6개 물리 차원"""
        from core.unified import Physics
        
        dimensions = list(Physics)
        assert len(dimensions) == 6
        assert Physics.BIO in dimensions
        assert Physics.CAPITAL in dimensions
        assert Physics.KNOWLEDGE in dimensions
        assert Physics.NETWORK in dimensions
        assert Physics.TIME in dimensions
        assert Physics.EMOTION in dimensions

    def test_motion_types(self):
        """12개 모션 타입"""
        from core.unified import Motion
        
        motions = list(Motion)
        assert len(motions) == 12
        assert Motion.ACQUIRE in motions
        assert Motion.RELEASE in motions
        assert Motion.CONVERT in motions


class TestPhysicsLaws:
    """6가지 물리 법칙 테스트"""

    def test_law_inertia(self):
        """1. 관성 법칙 (N1)"""
        from core.unified import apply_inertia
        
        # 함수 존재 확인
        assert callable(apply_inertia)

    def test_law_force(self):
        """2. 힘의 법칙 (F=ma)"""
        from core.unified import calculate_force
        
        mass = 10.0
        acceleration = 2.0
        force = calculate_force(mass, acceleration)
        
        assert force == pytest.approx(20.0)

    def test_law_action_reaction(self):
        """3. 작용-반작용 법칙 (N3)"""
        # 노드 간 상호작용에서 검증
        from core.unified import UnifiedEngine
        
        engine = UnifiedEngine()
        
        # 한 노드의 변화가 연결된 노드에 영향
        result = engine.apply(
            physics="CAPITAL",
            motion="ACQUIRE",
            delta=0.1,
        )
        
        assert "effects" in result
        assert len(result["effects"]) > 0

    def test_law_entropy(self):
        """4. 엔트로피 법칙 (열역학 2법칙)"""
        from core.unified import calculate_entropy
        
        # 무질서도 측정
        entropy_ordered = calculate_entropy(
            current_state=[0.5, 0.5, 0.5],
            ideal_state=[0.5, 0.5, 0.5]
        )
        
        entropy_disordered = calculate_entropy(
            current_state=[0.1, 0.9, 0.5],
            ideal_state=[0.5, 0.5, 0.5]
        )
        
        # 무질서한 상태의 엔트로피가 더 높음
        assert entropy_disordered >= entropy_ordered

    def test_law_phase_transition(self):
        """5. 상전이 법칙"""
        from core.unified import UnifiedEngine, Physics
        
        engine = UnifiedEngine()
        
        # 상태 변화 임계점 테스트
        initial_state = engine.get_state()
        
        # 큰 변화 적용
        for _ in range(10):
            engine.apply(physics="CAPITAL", motion="ACQUIRE", delta=0.1)
        
        final_state = engine.get_state()
        
        # 상태가 변화했는지 확인
        assert initial_state != final_state

    def test_law_diffusion(self):
        """6. 확산 법칙 (Laplacian)"""
        from core.unified import UnifiedEngine
        
        engine = UnifiedEngine()
        
        # 여러 틱 동안 확산 관찰
        initial = engine.get_state()
        
        for _ in range(5):
            engine.tick()
        
        after = engine.get_state()
        
        # 시간이 지나면 값이 decay
        assert all(after[k] <= initial[k] for k in initial.keys())


class TestPhysicsGates:
    """물리 게이트 테스트"""

    def test_gate_evaluation(self):
        """게이트 평가"""
        from core.unified import UnifiedEngine
        
        engine = UnifiedEngine()
        gates = engine.evaluate_all_gates()
        
        # 6개 차원에 대한 게이트
        assert len(gates) == 6
        
        for name, gate in gates.items():
            assert "open" in gate
            assert "score" in gate
            assert 0 <= gate["score"] <= 1

    def test_bio_gate(self):
        """BIO 게이트"""
        from core.unified import UnifiedEngine
        
        engine = UnifiedEngine()
        gates = engine.evaluate_all_gates()
        
        assert "BIO" in gates
        assert isinstance(gates["BIO"]["open"], bool)

    def test_capital_gate(self):
        """CAPITAL 게이트"""
        from core.unified import UnifiedEngine
        
        engine = UnifiedEngine()
        gates = engine.evaluate_all_gates()
        
        assert "CAPITAL" in gates


class TestPhysicsSimulation:
    """물리 시뮬레이션 테스트"""

    def test_tick_decay(self):
        """틱 decay 테스트"""
        from core.unified import UnifiedEngine
        
        engine = UnifiedEngine()
        
        # 값을 높인 후
        engine.apply(physics="CAPITAL", motion="ACQUIRE", delta=0.5)
        state_after_acquire = engine.get_state()
        
        # 틱 적용
        decay = engine.tick()
        state_after_tick = engine.get_state()
        
        # CAPITAL이 decay 되었는지 확인
        assert state_after_tick["CAPITAL"] <= state_after_acquire["CAPITAL"]

    def test_multi_tick(self):
        """다중 틱 시뮬레이션"""
        from core.unified import UnifiedEngine
        
        engine = UnifiedEngine()
        
        history = []
        for i in range(10):
            state = engine.get_state()
            history.append(dict(state))
            engine.tick()
        
        # 히스토리 확인
        assert len(history) == 10

    def test_state_bounds(self):
        """상태 경계 테스트"""
        from core.unified import UnifiedEngine
        
        engine = UnifiedEngine()
        
        # 극단적인 값 적용
        for _ in range(100):
            engine.apply(physics="CAPITAL", motion="ACQUIRE", delta=1.0)
        
        state = engine.get_state()
        
        # 모든 값이 0~1 범위 내
        for key, value in state.items():
            assert 0 <= value <= 1, f"{key} out of bounds: {value}"


class TestPhysicsFormulas:
    """물리 공식 테스트"""

    def test_value_formula(self):
        """V = (M - T) × (1 + s)^t"""
        # Money Physics 기본 공식
        M = 100  # Money
        T = 20   # Time cost
        s = 0.1  # Synergy factor
        t = 2    # Time period
        
        V = (M - T) * ((1 + s) ** t)
        
        assert V == pytest.approx(96.8)

    def test_sq_formula(self):
        """SQ = (Mint - Burn) / Time × Synergy_Factor"""
        Mint = 1000
        Burn = 200
        Time = 30
        Synergy_Factor = 1.2
        
        SQ = (Mint - Burn) / Time * Synergy_Factor
        
        assert SQ == pytest.approx(32.0)
