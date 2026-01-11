"""
═══════════════════════════════════════════════════════════════════════════════
🧪 AUTUS Core Tests
═══════════════════════════════════════════════════════════════════════════════

핵심 기능 테스트
"""

import pytest
import sys
from pathlib import Path

# 경로 설정
root = Path(__file__).parent.parent
sys.path.insert(0, str(root / "backend"))


class TestUnifiedEngine:
    """UnifiedEngine 테스트"""
    
    def test_import(self):
        """임포트 테스트"""
        from core.unified import UnifiedEngine
        assert UnifiedEngine is not None
    
    def test_create_engine(self, tmp_path):
        """엔진 생성 테스트"""
        from core.unified import UnifiedEngine
        engine = UnifiedEngine(str(tmp_path))
        assert engine is not None
        assert engine.VERSION == "2.0.0"
    
    def test_get_state(self, tmp_path):
        """상태 조회 테스트"""
        from core.unified import UnifiedEngine
        engine = UnifiedEngine(str(tmp_path))
        
        state = engine.get_state()
        assert len(state) == 6
        assert all(0 <= v <= 1 for v in state)
    
    def test_apply_motion(self, tmp_path):
        """모션 적용 테스트"""
        from core.unified import UnifiedEngine
        engine = UnifiedEngine(str(tmp_path))
        
        result = engine.apply(
            physics="CAPITAL",
            motion="ACQUIRE",
            delta=0.1,
        )
        
        assert result["success"] is True
        assert "effects" in result
    
    def test_tick(self, tmp_path):
        """틱 테스트"""
        from core.unified import UnifiedEngine
        engine = UnifiedEngine(str(tmp_path))
        
        decay = engine.tick()
        assert isinstance(decay, dict)
        assert "CAPITAL" in decay
    
    def test_gates(self, tmp_path):
        """게이트 테스트"""
        from core.unified import UnifiedEngine
        engine = UnifiedEngine(str(tmp_path))
        
        gates = engine.evaluate_all_gates()
        assert len(gates) == 6
        assert "BIO" in gates


class TestPhysicsLaws:
    """물리 법칙 테스트"""
    
    def test_import_physics_laws(self):
        """물리 법칙 임포트"""
        from core.unified import (
            apply_inertia,
            calculate_force,
            calculate_entropy,
        )
        assert apply_inertia is not None
    
    @pytest.mark.skip(reason="apply_inertia 시그니처 확인 필요")
    def test_inertia(self):
        """관성 법칙 테스트"""
        from core.unified import apply_inertia, UserState
        
        state = UserState(position=0.5, mass=1.0)
        new_state = apply_inertia(state)
        
        assert new_state is not None
    
    def test_entropy(self):
        """엔트로피 테스트"""
        from core.unified import calculate_entropy
        
        # 리스트 형태로 전달 (physics_laws.py 시그니처)
        entropy = calculate_entropy(
            current_state=[0.5, 0.4, 0.6],
            ideal_state=[0.3, 0.3, 0.3]
        )
        assert entropy >= 0


class TestTrinityEngine:
    """Trinity Engine 테스트"""
    
    def test_import(self):
        """임포트 테스트"""
        from core.unified import TrinityEngine
        assert TrinityEngine is not None
    
    def test_goal_mapper(self):
        """GoalMapper 테스트"""
        from core.unified import GoalMapper
        
        # 현재 노드 압력 (36개 노드)
        node_pressures = {f"n{i:02d}": 0.3 for i in range(1, 37)}
        
        mapper = GoalMapper(current_node_pressures=node_pressures)
        result = mapper.crystallize("부자가 되고 싶다")
        
        assert result.raw_desire == "부자가 되고 싶다"
        assert result.feasibility > 0


class TestAutusSpec:
    """AUTUS Spec 테스트 (호환성)"""
    
    def test_import(self):
        """임포트 테스트"""
        from core.autus_spec import PhysicsEngine, get_engine
        assert PhysicsEngine is not None
    
    def test_engine(self):
        """엔진 테스트"""
        from core.autus_spec import get_engine
        
        engine = get_engine()
        state = engine.get_state()
        
        assert len(state) == 6
    
    def test_motion(self):
        """모션 테스트"""
        from core.autus_spec import get_engine, reset_engine
        
        reset_engine()
        engine = get_engine()
        
        result = engine.apply_motion(node=1, motion=5, delta=0.1)
        assert result["success"] is True


class TestEfficiency:
    """효율성 모듈 테스트"""
    
    def test_import(self):
        """임포트 테스트"""
        from core.efficiency import EfficiencyEngine, get_efficiency_engine
        assert EfficiencyEngine is not None
    
    def test_analyze(self):
        """분석 테스트"""
        from core.efficiency import analyze_efficiency
        
        result = analyze_efficiency(
            task_id="t1",
            name="테스트 업무",
            time_spent=30,
            time_estimated=60,
        )
        
        assert result.efficiency_score > 50


class TestKernel:
    """커널 모듈 테스트"""
    
    def test_import(self):
        """임포트 테스트"""
        from core.kernel import Kernel, get_kernel
        assert Kernel is not None
    
    def test_submit_task(self):
        """태스크 제출 테스트"""
        from core.kernel import get_kernel
        
        kernel = get_kernel()
        kernel.reset()
        kernel.start()
        
        task = kernel.submit_task("t1", "test_task", priority=1)
        assert task.id == "t1"
        
        metrics = kernel.get_metrics()
        assert metrics["tasks_pending"] == 1


class TestEngineV2:
    """Engine V2 테스트"""
    
    def test_import(self):
        """임포트 테스트"""
        from engine_v2 import EngineV2, get_engine_v2
        assert EngineV2 is not None
    
    def test_tick(self):
        """틱 테스트"""
        from engine_v2 import get_engine_v2
        
        engine = get_engine_v2()
        engine.reset()
        
        result = engine.tick()
        assert result["tick"] == 1


class TestAutusFinal:
    """AUTUS Final 테스트"""
    
    def test_import(self):
        """임포트 테스트"""
        from autus_final import AutusFinal, get_autus_final
        assert AutusFinal is not None
    
    def test_propose(self):
        """제안 테스트"""
        from autus_final import get_autus_final
        
        system = get_autus_final()
        system.reset()
        
        proposal = system.propose_action(
            title="테스트 제안",
            description="테스트입니다",
            confidence=0.8,
            impact=0.5,
        )
        
        assert proposal.title == "테스트 제안"
        assert proposal.accepted is None
    
    def test_status(self):
        """상태 테스트"""
        from autus_final import status
        
        result = status()
        assert result["version"] == "2.1.0"
