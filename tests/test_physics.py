"""
AUTUS Physics Engine Tests
===========================

Money Physics 엔진 테스트
"""

import pytest
import sys
import os
import tempfile
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.physics import (
    PhysicsEngine,
    PhysicsConstants,
    PhysicsResult,
    Motion,
    Node,
    get_engine,
    SynergyCalculator,
    FlywheelEngine,
)


# ═══════════════════════════════════════════════════════════════════════════
# PhysicsConstants Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestPhysicsConstants:
    """물리 상수 테스트"""
    
    def test_lambda_values(self):
        """감쇠 상수 λ"""
        assert len(PhysicsConstants.LAMBDA) == 6
        for l in PhysicsConstants.LAMBDA:
            assert l > 0
    
    def test_half_lives(self):
        """반감기"""
        assert len(PhysicsConstants.HALF_LIVES) == 6
        assert PhysicsConstants.HALF_LIVES[0] == 3   # BIO: 3일
        assert PhysicsConstants.HALF_LIVES[1] == 365  # CAPITAL: 365일
    
    def test_inertia(self):
        """관성 계수"""
        assert len(PhysicsConstants.INERTIA) == 6
        for i in PhysicsConstants.INERTIA:
            assert 0 <= i <= 1
    
    def test_initial_state(self):
        """초기 상태"""
        assert len(PhysicsConstants.INITIAL_STATE) == 6
        for v in PhysicsConstants.INITIAL_STATE:
            assert v == 0.5
    
    def test_node_names(self):
        """노드 이름"""
        assert "BIO" in PhysicsConstants.NODE_NAMES
        assert "CAPITAL" in PhysicsConstants.NODE_NAMES
        assert "LEGACY" in PhysicsConstants.NODE_NAMES


# ═══════════════════════════════════════════════════════════════════════════
# Node Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestNode:
    """노드 테스트"""
    
    def test_node_enum(self):
        """노드 Enum"""
        assert Node.BIO == 0
        assert Node.CAPITAL == 1
        assert Node.COGNITION == 2
        assert Node.RELATION == 3
        assert Node.ENVIRONMENT == 4
        assert Node.LEGACY == 5
    
    def test_node_count(self):
        """노드 개수"""
        assert len(Node) == 6


# ═══════════════════════════════════════════════════════════════════════════
# Motion Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestMotion:
    """Motion 테스트"""
    
    def test_create_motion(self):
        """Motion 생성"""
        motion = Motion(
            timestamp=int(time.time() * 1000),
            node=Node.CAPITAL,
            delta=0.1,
            friction=0.5,
        )
        
        assert motion.node == Node.CAPITAL
        assert motion.delta == 0.1
        assert motion.friction == 0.5
    
    def test_motion_serialization(self):
        """Motion 직렬화"""
        motion = Motion(
            timestamp=int(time.time() * 1000),
            node=Node.BIO,
            delta=0.05,
            friction=0.3,
        )
        
        # to_bytes / from_bytes 테스트
        data = motion.to_bytes()
        assert len(data) == 32  # 32 bytes
        
        restored = Motion.from_bytes(data)
        assert restored.node == motion.node
        assert abs(restored.delta - motion.delta) < 0.0001
    
    def test_motion_jsonl(self):
        """Motion JSONL 변환"""
        motion = Motion(
            timestamp=1000000,
            node=Node.COGNITION,
            delta=-0.1,
            friction=0.2,
        )
        
        jsonl = motion.to_jsonl()
        restored = Motion.from_jsonl(jsonl)
        
        assert restored.node == motion.node
        assert abs(restored.delta - motion.delta) < 0.0001
    
    def test_motion_bounds(self):
        """Motion delta 경계"""
        # delta는 -1 ~ 1 범위로 제한됨
        motion = Motion(
            timestamp=1000000,
            node=Node.BIO,
            delta=5.0,  # 1.0으로 클램프
            friction=0.5,
        )
        
        assert motion.delta == 1.0
    
    def test_motion_node_name(self):
        """Motion 노드 이름"""
        motion = Motion(
            timestamp=1000000,
            node=Node.LEGACY,
            delta=0.1,
            friction=0.5,
        )
        
        assert motion.node_name == "LEGACY"


# ═══════════════════════════════════════════════════════════════════════════
# PhysicsEngine Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestPhysicsEngine:
    """Physics 엔진 테스트"""
    
    def test_init_default(self):
        """기본 초기화"""
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = PhysicsEngine(data_dir=tmpdir)
            assert engine is not None
    
    def test_get_state(self):
        """상태 조회"""
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = PhysicsEngine(data_dir=tmpdir)
            state = engine.get_state()
            
            assert len(state) == 6
            for v in state:
                assert 0 <= v <= 1
    
    def test_apply_motion(self):
        """Motion 적용"""
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = PhysicsEngine(data_dir=tmpdir)
            
            initial_state = list(engine.get_state())
            
            # CAPITAL +0.1
            motion = Motion(
                timestamp=int(time.time() * 1000),
                node=Node.CAPITAL,
                delta=0.1,
                friction=0.5,
            )
            
            result = engine.apply_motion(motion)
            
            assert result.success
            assert result.affected_node == Node.CAPITAL
    
    def test_apply_multiple_motions(self):
        """여러 Motion 적용"""
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = PhysicsEngine(data_dir=tmpdir)
            ts = int(time.time() * 1000)
            
            engine.apply_motion(Motion(timestamp=ts, node=Node.BIO, delta=0.1, friction=0.5))
            engine.apply_motion(Motion(timestamp=ts+1, node=Node.COGNITION, delta=0.05, friction=0.3))
            engine.apply_motion(Motion(timestamp=ts+2, node=Node.RELATION, delta=-0.05, friction=0.4))
            
            state = engine.get_state()
            assert len(state) == 6
    
    def test_total_energy(self):
        """총 에너지 계산"""
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = PhysicsEngine(data_dir=tmpdir)
            
            state = engine.get_state()
            total = sum(state)
            
            assert total >= 0
            assert total <= 6.0  # 최대 1.0 * 6


# ═══════════════════════════════════════════════════════════════════════════
# PhysicsResult Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestPhysicsResult:
    """PhysicsResult 테스트"""
    
    def test_create_result(self):
        """결과 생성"""
        result = PhysicsResult(
            success=True,
            state=[0.5, 0.6, 0.4, 0.7, 0.3, 0.8],
            affected_node=1,
            effective_delta=0.05,
            decay_applied=0.01,
        )
        
        assert result.success
        assert result.affected_node == 1
    
    def test_result_to_dict(self):
        """결과 딕셔너리 변환"""
        result = PhysicsResult(
            success=True,
            state=[0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
            affected_node=0,
            effective_delta=0.1,
            decay_applied=0.0,
        )
        
        d = result.to_dict()
        
        assert d["success"] is True
        assert d["affected_node_name"] == "BIO"


# ═══════════════════════════════════════════════════════════════════════════
# Synergy Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestSynergyCalculator:
    """시너지 계산기 테스트"""
    
    def test_init(self):
        """초기화"""
        calc = SynergyCalculator()
        assert calc is not None
    
    def test_calculate_synergy(self):
        """시너지 계산"""
        calc = SynergyCalculator()
        
        state = [0.5, 0.7, 0.3, 0.6, 0.4, 0.8]
        
        synergy = calc.calculate(state)
        
        assert synergy >= 0
    
    def test_get_synergy_pairs(self):
        """시너지 쌍"""
        calc = SynergyCalculator()
        
        state = [0.5, 0.7, 0.3, 0.6, 0.4, 0.8]
        
        pairs = calc.get_synergy_pairs(state)
        
        # 6C2 = 15 쌍
        assert len(pairs) == 15
        
        # 정렬 확인
        for i in range(len(pairs) - 1):
            assert pairs[i]["synergy"] >= pairs[i + 1]["synergy"]


# ═══════════════════════════════════════════════════════════════════════════
# Flywheel Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestFlywheelEngine:
    """플라이휠 엔진 테스트"""
    
    def test_init(self):
        """초기화"""
        flywheel = FlywheelEngine()
        assert flywheel is not None
    
    def test_calculate_momentum(self):
        """모멘텀 계산"""
        flywheel = FlywheelEngine()
        
        state = [0.5, 0.7, 0.3, 0.6, 0.4, 0.8]
        momentum = flywheel.calculate_momentum(state)
        
        assert momentum >= 0
    
    def test_calculate_velocity(self):
        """속도 계산"""
        flywheel = FlywheelEngine()
        
        current = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
        previous = [0.4, 0.5, 0.5, 0.5, 0.5, 0.5]
        
        velocity = flywheel.calculate_velocity(current, previous)
        
        assert velocity >= 0
    
    def test_add_momentum(self):
        """모멘텀 추가"""
        flywheel = FlywheelEngine()
        
        flywheel.add_momentum("test_entity", 10.0)
        flywheel.add_momentum("test_entity", 5.0)
        
        total = flywheel.get_total_momentum("test_entity")
        
        assert total > 0


# ═══════════════════════════════════════════════════════════════════════════
# Integration Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestPhysicsIntegration:
    """통합 테스트"""
    
    def test_full_simulation(self):
        """전체 시뮬레이션"""
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = PhysicsEngine(data_dir=tmpdir)
            ts = int(time.time() * 1000)
            
            # 초기 상태
            initial_state = engine.get_state()
            initial_energy = sum(initial_state)
            
            # 여러 Motion 적용
            engine.apply_motion(Motion(timestamp=ts, node=Node.BIO, delta=0.1, friction=0.5))
            engine.apply_motion(Motion(timestamp=ts+1, node=Node.CAPITAL, delta=0.2, friction=0.4))
            engine.apply_motion(Motion(timestamp=ts+2, node=Node.COGNITION, delta=-0.1, friction=0.3))
            
            # 최종 상태
            final_state = engine.get_state()
            final_energy = sum(final_state)
            
            # 에너지 변화 확인
            assert abs(final_energy - initial_energy) < 1.0
    
    def test_physics_with_synergy(self):
        """Physics + Synergy 통합"""
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = PhysicsEngine(data_dir=tmpdir)
            calc = SynergyCalculator()
            
            # 시너지 계산
            synergy = calc.calculate(engine.get_state())
            
            assert synergy >= 0
    
    def test_physics_with_flywheel(self):
        """Physics + Flywheel 통합"""
        with tempfile.TemporaryDirectory() as tmpdir:
            engine = PhysicsEngine(data_dir=tmpdir)
            flywheel = FlywheelEngine()
            
            # 모멘텀 계산
            momentum = flywheel.calculate_momentum(engine.get_state())
            
            assert momentum >= 0
    
    def test_get_engine_singleton(self):
        """엔진 싱글톤"""
        engine1 = get_engine()
        engine2 = get_engine()
        
        assert engine1 is engine2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
