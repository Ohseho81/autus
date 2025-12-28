"""
AUTUS Unified System Engine Tests
=================================

통합 시스템 엔진 테스트
"""

import pytest
import math
import random
from datetime import datetime

# 모듈 임포트
import sys
sys.path.insert(0, '..')

from backend.core import (
    UnifiedSystemEngine,
    UnifiedNode,
    SystemState,
    ClusterType,
    OrbitType,
    QuantumState,
    Entanglement,
    UncertaintyPrinciple,
    UnifiedPhysicsFormulas,
    create_engine,
)


# ================================================================
# QUANTUM VARIABLES TESTS
# ================================================================

class TestQuantumState:
    """양자 상태 테스트"""
    
    def test_creation(self):
        """생성 테스트"""
        state = QuantumState(
            node_id="test_001",
            role_probabilities={
                "leader": 0.3,
                "executor": 0.5,
                "observer": 0.2
            }
        )
        
        assert state.node_id == "test_001"
        assert state.is_superposition is True
        assert state.collapsed_role is None
        assert sum(state.role_probabilities.values()) == pytest.approx(1.0)
    
    def test_measure(self):
        """측정 테스트"""
        state = QuantumState(
            node_id="test_002",
            role_probabilities={"leader": 1.0}  # 확정적
        )
        
        role = state.measure()
        
        assert role == "leader"
        assert state.is_superposition is False
        assert state.collapsed_role == "leader"
    
    def test_expected_value(self):
        """기대값 테스트"""
        state = QuantumState(
            node_id="test_003",
            role_probabilities={
                "leader": 0.5,
                "executor": 0.5
            }
        )
        
        role_values = {"leader": 100, "executor": 50}
        expected = state.get_expected_value(role_values)
        
        assert expected == pytest.approx(75.0)
    
    def test_entropy(self):
        """엔트로피 테스트"""
        # 균등 분포 = 최대 엔트로피
        state_uniform = QuantumState(
            node_id="test_004",
            role_probabilities={"a": 0.5, "b": 0.5}
        )
        
        # 확정적 = 0 엔트로피
        state_certain = QuantumState(
            node_id="test_005",
            role_probabilities={"a": 1.0}
        )
        
        assert state_uniform.get_entropy() == pytest.approx(1.0)
        assert state_certain.get_entropy() == pytest.approx(0.0)


class TestEntanglement:
    """얽힘 테스트"""
    
    def test_creation(self):
        """생성 테스트"""
        ent = Entanglement(
            node_a="a",
            node_b="b",
            intensity=0.8,
            correlation=0.9
        )
        
        assert ent.node_a == "a"
        assert ent.node_b == "b"
        assert ent.intensity == 0.8
        assert ent.correlation == 0.9
    
    def test_propagate_change(self):
        """변화 전파 테스트"""
        ent = Entanglement("a", "b", intensity=0.8, correlation=0.9)
        
        target, propagated = ent.propagate_change("a", 1.0)
        
        assert target == "b"
        assert propagated == pytest.approx(0.72)  # 0.8 * 0.9 * 1.0
    
    def test_coupling_strength(self):
        """결합 강도 테스트"""
        ent = Entanglement("a", "b", intensity=0.5, correlation=0.8)
        
        assert ent.get_coupling_strength() == pytest.approx(0.4)


class TestUncertaintyPrinciple:
    """불확실성 원리 테스트"""
    
    def test_violation(self):
        """위반 테스트"""
        result = UncertaintyPrinciple.calculate_uncertainty(0.05, 0.05)
        
        assert result[2] is True  # violated
        assert result[0] == pytest.approx(math.sqrt(0.1))
        assert result[1] == pytest.approx(math.sqrt(0.1))
    
    def test_no_violation(self):
        """비위반 테스트"""
        result = UncertaintyPrinciple.calculate_uncertainty(0.5, 0.5)
        
        assert result[2] is False  # not violated
        assert result[0] == 0.5
        assert result[1] == 0.5
    
    def test_confidence(self):
        """신뢰도 테스트"""
        confidence = UncertaintyPrinciple.get_prediction_confidence(0, 0)
        assert confidence == 1.0
        
        confidence_low = UncertaintyPrinciple.get_prediction_confidence(1, 1)
        assert confidence_low < 1.0


# ================================================================
# PHYSICS FORMULAS TESTS
# ================================================================

class TestPhysicsFormulas:
    """물리 공식 테스트"""
    
    def test_boltzmann_entropy(self):
        """볼츠만 엔트로피"""
        # S = k * ln(W)
        s = UnifiedPhysicsFormulas.boltzmann_entropy(100)
        assert s == pytest.approx(math.log(100))
        
        # W = 0 -> S = 0
        assert UnifiedPhysicsFormulas.boltzmann_entropy(0) == 0
    
    def test_shannon_entropy(self):
        """섀넌 엔트로피"""
        # 균등 분포
        probs = [0.25, 0.25, 0.25, 0.25]
        h = UnifiedPhysicsFormulas.shannon_entropy(probs)
        assert h == pytest.approx(2.0)  # log2(4)
        
        # 확정적
        probs_certain = [1.0]
        h_certain = UnifiedPhysicsFormulas.shannon_entropy(probs_certain)
        assert h_certain == pytest.approx(0.0)
    
    def test_autus_entropy(self):
        """AUTUS 엔트로피"""
        s = UnifiedPhysicsFormulas.autus_entropy(2, 3, 1, 1)
        expected = math.log(3 * 4 * 2 * 2)  # (2+1) * (3+1) * (1+1) * (1+1)
        assert s == pytest.approx(expected)
    
    def test_money_efficiency(self):
        """돈 생산 효율"""
        # 엔트로피 0 -> 100%
        assert UnifiedPhysicsFormulas.money_efficiency_from_entropy(0) == pytest.approx(1.0)
        
        # 엔트로피 5 -> ~37%
        assert UnifiedPhysicsFormulas.money_efficiency_from_entropy(5) == pytest.approx(math.exp(-1))
    
    def test_synergy_strength(self):
        """시너지 강도"""
        # 높은 시너지
        high = UnifiedPhysicsFormulas.synergy_strength(1.0, 1.0, 1.0, 0.0)
        assert high > 0.5
        
        # 낮은 시너지
        low = UnifiedPhysicsFormulas.synergy_strength(0.0, 0.0, 0.0, 1.0)
        assert low < 0
    
    def test_gravity_value(self):
        """중력 가치"""
        masses = [1.0, 1.0]
        distances = [[0, 1.0], [1.0, 0]]
        
        value = UnifiedPhysicsFormulas.gravity_value(masses, distances)
        assert value == pytest.approx(1.0)  # G * m1 * m2 / r^2 = 1 * 1 * 1 / 1 = 1


# ================================================================
# UNIFIED SYSTEM ENGINE TESTS
# ================================================================

class TestUnifiedSystemEngine:
    """통합 시스템 엔진 테스트"""
    
    @pytest.fixture
    def engine(self):
        """테스트용 엔진"""
        return create_engine()
    
    def test_create_engine(self, engine):
        """엔진 생성"""
        assert engine is not None
        assert len(engine.nodes) == 0
        assert len(engine.entanglements) == 0
    
    def test_add_node(self, engine):
        """노드 추가"""
        node = engine.add_node(
            id="test_001",
            name="Test Node",
            revenue=1000000,
            time_spent=50,
            fitness=0.8,
            density=0.7,
            frequency=0.6,
            penalty=0.1
        )
        
        assert node is not None
        assert node.id == "test_001"
        assert node.name == "Test Node"
        assert len(engine.nodes) == 1
        
        # 좌표 계산됨
        assert node.x >= 0
        assert node.y >= 0
        assert -1 <= node.z <= 1
    
    def test_update_node(self, engine):
        """노드 업데이트"""
        engine.add_node(id="test_001", name="Original")
        
        updated = engine.update_node("test_001", revenue=5000000, fitness=0.9)
        
        assert updated is not None
        assert updated.revenue == 5000000
        assert updated.fitness == 0.9
    
    def test_remove_node(self, engine):
        """노드 제거"""
        engine.add_node(id="test_001", name="To Remove")
        
        assert len(engine.nodes) == 1
        
        result = engine.remove_node("test_001")
        
        assert result is True
        assert len(engine.nodes) == 0
    
    def test_cluster_classification(self, engine):
        """클러스터 분류"""
        # Golden (고수익 + 고시너지)
        golden = engine.add_node(
            id="golden",
            name="Golden",
            revenue=8000000,
            fitness=1.0,
            density=1.0,
            frequency=1.0,
            penalty=0.0
        )
        assert golden.cluster == ClusterType.GOLDEN
        
        # Removal (저수익)
        removal = engine.add_node(
            id="removal",
            name="Removal",
            revenue=100000,
            fitness=0.1,
            density=0.1,
            frequency=0.1,
            penalty=0.9
        )
        assert removal.cluster == ClusterType.REMOVAL
    
    def test_create_entanglement(self, engine):
        """얽힘 생성"""
        engine.add_node(id="a", name="Node A")
        engine.add_node(id="b", name="Node B")
        
        ent = engine.create_entanglement("a", "b", intensity=0.8, correlation=0.9)
        
        assert ent is not None
        assert len(engine.entanglements) == 1
        assert "b" in engine.nodes["a"].entanglements
        assert "a" in engine.nodes["b"].entanglements
    
    def test_quantum_state(self, engine):
        """양자 상태"""
        node = engine.add_node(
            id="quantum",
            name="Quantum Node",
            role_probabilities={"leader": 0.3, "executor": 0.5, "observer": 0.2}
        )
        
        assert node.quantum_state is not None
        assert "quantum" in engine.quantum_states
        assert engine.quantum_states["quantum"].is_superposition is True
    
    def test_calculate_entropy(self, engine):
        """엔트로피 계산"""
        # 빈 시스템
        assert engine.calculate_entropy() == 0
        
        # 노드 추가
        for i in range(10):
            engine.add_node(
                id=f"node_{i}",
                name=f"Node {i}",
                fitness=0.3 if i < 3 else 0.8  # 3개 미스매치
            )
        
        entropy = engine.calculate_entropy()
        assert entropy > 0
    
    def test_calculate_system_value(self, engine):
        """시스템 가치 계산"""
        for i in range(5):
            engine.add_node(
                id=f"node_{i}",
                name=f"Node {i}",
                revenue=1000000 * (i + 1),
                fitness=0.8
            )
        
        value = engine.calculate_system_value()
        assert value > 0
    
    def test_auto_optimization(self, engine):
        """자동 최적화"""
        # 다양한 노드 추가
        engine.add_node(
            id="high_synergy",
            name="High Synergy",
            fitness=1.0, density=1.0, frequency=1.0, penalty=0.0
        )
        engine.add_node(
            id="low_synergy",
            name="Low Synergy",
            revenue=-100000,
            fitness=0.1, density=0.1, frequency=0.1, penalty=0.9
        )
        
        result = engine.run_auto_optimization()
        
        assert result["status"] == "optimization_queued"
        assert result["actions_queued"] >= 2
        assert len(engine.pending_actions) >= 2
    
    def test_execute_actions(self, engine):
        """액션 실행"""
        engine.add_node(id="test", name="Test", fitness=0.5)
        
        engine.queue_action("amplify", "test")
        
        executed = engine.execute_pending_actions()
        
        assert len(executed) == 1
        assert executed[0]["status"] == "executed"
        assert engine.nodes["test"].fitness > 0.5
    
    def test_system_state(self, engine):
        """시스템 상태"""
        for i in range(10):
            engine.add_node(id=f"node_{i}", name=f"Node {i}")
        
        state = engine.get_system_state()
        
        assert state.total_nodes == 10
        assert state.entropy >= 0
        assert 0 <= state.money_efficiency <= 1
    
    def test_export_graph_data(self, engine):
        """그래프 데이터 내보내기"""
        engine.add_node(id="a", name="A")
        engine.add_node(id="b", name="B")
        engine.create_entanglement("a", "b")
        
        data = engine.export_graph_data()
        
        assert "nodes" in data
        assert "links" in data
        assert len(data["nodes"]) == 2
        assert len(data["links"]) == 1
    
    def test_event_system(self, engine):
        """이벤트 시스템"""
        events_received = []
        
        def handler(data):
            events_received.append(data)
        
        engine.on("node_added", handler)
        engine.add_node(id="test", name="Test")
        
        assert len(events_received) == 1
        assert events_received[0]["node"]["id"] == "test"


# ================================================================
# INTEGRATION TESTS
# ================================================================

class TestIntegration:
    """통합 테스트"""
    
    def test_full_workflow(self):
        """전체 워크플로우"""
        engine = create_engine()
        
        # 1. 노드 추가
        for i in range(50):
            engine.add_node(
                id=f"person_{i}",
                name=f"Person {i}",
                revenue=random.randint(-500000, 5000000),
                time_spent=random.randint(10, 180),
                fitness=random.uniform(0.2, 1.0),
                density=random.uniform(0.1, 0.9),
                frequency=random.uniform(0.2, 0.9),
                penalty=random.uniform(0, 0.5),
                role_probabilities={
                    "leader": 0.3,
                    "executor": 0.5,
                    "observer": 0.2
                }
            )
        
        assert len(engine.nodes) == 50
        
        # 2. 얽힘 생성
        for i in range(20):
            a = f"person_{random.randint(0, 49)}"
            b = f"person_{random.randint(0, 49)}"
            if a != b:
                engine.create_entanglement(a, b)
        
        assert len(engine.entanglements) > 0
        
        # 3. 상태 확인
        state_before = engine.get_system_state()
        assert state_before.total_nodes == 50
        
        # 4. 최적화
        engine.run_auto_optimization()
        engine.execute_pending_actions()
        
        # 5. 최적화 후 상태
        state_after = engine.get_system_state()
        
        # 노드가 줄어들 수 있음 (이탈 액션)
        assert state_after.total_nodes <= state_before.total_nodes
        
        # 6. 내보내기
        graph_data = engine.export_graph_data()
        assert "nodes" in graph_data
        assert "links" in graph_data


# ================================================================
# PERFORMANCE TESTS
# ================================================================

class TestPerformance:
    """성능 테스트"""
    
    def test_large_node_count(self):
        """대량 노드"""
        engine = create_engine()
        
        # 500개 노드
        for i in range(500):
            engine.add_node(
                id=f"node_{i}",
                name=f"Node {i}",
                revenue=random.randint(0, 5000000),
                fitness=random.uniform(0.3, 1.0)
            )
        
        assert len(engine.nodes) == 500
        
        # 계산 시간 측정
        import time
        
        start = time.time()
        engine.calculate_system_value()
        value_time = time.time() - start
        
        start = time.time()
        engine.calculate_entropy()
        entropy_time = time.time() - start
        
        start = time.time()
        engine.get_system_state()
        state_time = time.time() - start
        
        # 각각 1초 이내
        assert value_time < 1.0
        assert entropy_time < 1.0
        assert state_time < 1.0


# ================================================================
# RUN
# ================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
