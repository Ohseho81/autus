"""
AUTUS Final - 테스트 코드
==========================
pytest -v tests/test_autus_final.py
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from autus_final.user_type import UserType, UserTypeManager, ConfidenceValue, Gender, Location
from autus_final.user_constants import UserConstants, ConstantsEngine
from autus_final.user_coefficients import UserCoefficients, CoefficientsEngine
from autus_final.apqc_modules import APQCModulePool, APQCLevel
from autus_final.laplace_predictor import LaplacePredictor
from autus_final.safety_guard import SafetyGuard
from autus_final.state import KScale, GateResult, SafetyStatus, create_initial_state


class TestUserType:
    """사용자 타입 테스트"""
    
    def test_create_user(self):
        """사용자 생성"""
        manager = UserTypeManager()
        
        user_data = {
            "user_id": "test_user_001",
            "basic_info": {
                "name": {"value": "Test User", "confidence": 1.0, "source": "user_input"},
                "gender": {"value": "male", "confidence": 0.9}
            }
        }
        
        user = manager.create_user(user_data)
        
        assert user.user_id == "test_user_001"
        assert user.name.value == "Test User"
        assert user.profile_completeness > 0
    
    def test_identity_hash(self):
        """고유 해시 생성"""
        manager = UserTypeManager()
        
        user_data = {
            "user_id": "test_user_002",
            "basic_info": {
                "name": {"value": "Hash Test", "confidence": 1.0, "source": "user_input"}
            }
        }
        
        user = manager.create_user(user_data)
        hash_value = user.get_identity_hash()
        
        assert len(hash_value) == 16
        assert hash_value.isalnum()


class TestUserConstants:
    """사용자 상수 테스트"""
    
    def test_create_constants(self):
        """상수 생성"""
        engine = ConstantsEngine()
        constants = engine.get_or_create("test_user")
        
        assert constants.user_id == "test_user"
        assert 0 <= constants.stability_score.value <= 1
        assert constants.inertia_debt.value >= 0
    
    def test_k_value(self):
        """K 값 계산"""
        engine = ConstantsEngine()
        constants = engine.get_or_create("test_user")
        
        k = constants.get_k_value()
        
        assert 0 <= k <= 10
    
    def test_gate_score(self):
        """Gate 점수 계산"""
        engine = ConstantsEngine()
        constants = engine.get_or_create("test_user")
        
        gate = engine.calculate_gate_threshold(constants)
        
        assert gate["result"] in ["PASS", "RING", "BOUNCE", "LOCK"]
        assert "score" in gate
    
    def test_activity_update(self):
        """활동 업데이트"""
        engine = ConstantsEngine()
        constants = engine.get_or_create("test_user")
        
        initial_stability = constants.stability_score.value
        
        engine.update_from_activity("test_user", {
            "type": "task_completion",
            "duration_minutes": 60,
            "complexity": 1.5
        })
        
        # 성공적 완료 후 안정성 증가
        assert constants.stability_score.value >= initial_stability


class TestUserCoefficients:
    """사용자 계수 테스트"""
    
    def test_create_coefficients(self):
        """계수 생성"""
        engine = CoefficientsEngine()
        coefficients = engine.get_or_create("test_user")
        
        assert coefficients.user_id == "test_user"
        assert coefficients.core_node is not None
    
    def test_simulate_network(self):
        """네트워크 시뮬레이션"""
        engine = CoefficientsEngine()
        coefficients = engine.simulate_network("test_user", inner_count=10, outer_count=50)
        
        assert len(coefficients.inner_nodes) == 10
        assert len(coefficients.outer_nodes) == 50
        assert coefficients.connectivity_density > 0
    
    def test_synergy_friction(self):
        """시너지/마찰 노드"""
        engine = CoefficientsEngine()
        coefficients = engine.simulate_network("test_user", inner_count=5, outer_count=20)
        
        synergy = coefficients.get_synergy_nodes(3)
        friction = coefficients.get_friction_nodes(3)
        
        assert len(synergy) <= 3
        assert len(friction) <= 3


class TestAPQCModules:
    """APQC 모듈 테스트"""
    
    def test_module_pool(self):
        """모듈 풀 생성"""
        pool = APQCModulePool()
        
        assert len(pool.categories) == 13
        assert len(pool.modules) > 100  # 최소 100개 이상
    
    def test_search_modules(self):
        """모듈 검색"""
        pool = APQCModulePool()
        
        # 카테고리별 검색
        hr_modules = pool.search_modules(category_id="7.0")
        assert len(hr_modules) > 0
        
        # 태그 검색
        training_modules = pool.search_modules(tags=["training"])
        assert len(training_modules) >= 0
    
    def test_recommend_modules(self):
        """모듈 추천"""
        pool = APQCModulePool()
        
        recommendations = pool.get_recommended_modules(
            "HR onboarding process optimization",
            {"stability_score": 0.7},
            top_n=5
        )
        
        assert len(recommendations) <= 5
        if recommendations:
            assert "relevance_score" in recommendations[0]


class TestLaplacePredictor:
    """라플라스 예측기 테스트"""
    
    def test_predict(self):
        """예측 수행"""
        predictor = LaplacePredictor()
        
        result = predictor.predict(
            user_type={"user_id": "test"},
            user_constants={"stability_score": 0.7, "inertia_debt": 0.3},
            user_coefficients={
                "summary": {"connectivity_density": 0.5, "influence_score": 0.6}
            },
            goal="Improve team productivity",
            selected_modules=[]
        )
        
        assert 0 <= result.success_probability <= 1
        assert result.estimated_duration_hours > 0
        assert "expected" in result.outcome_distribution
    
    def test_friction_synergy_nodes(self):
        """마찰/시너지 노드 식별"""
        predictor = LaplacePredictor()
        
        result = predictor.predict(
            user_type={},
            user_constants={},
            user_coefficients={
                "top_friction": [{"node_id": "f1", "friction": 0.5}],
                "top_synergy": [{"node_id": "s1", "synergy": 0.3}]
            },
            goal="Test goal",
            selected_modules=[]
        )
        
        assert len(result.friction_nodes) >= 1
        assert len(result.synergy_nodes) >= 1


class TestSafetyGuard:
    """Safety Guard 테스트"""
    
    def test_safety_check_pass(self):
        """PASS 검사"""
        guard = SafetyGuard()
        
        state = create_initial_state(
            workflow_id="test",
            user_type={},
            user_constants={
                "stability_score": 0.8,
                "inertia_debt": 0.1
            },
            user_coefficients={},
            goal="Test",
            k_scale=KScale.K2
        )
        
        result = guard.check(state)
        
        assert result.status in [SafetyStatus.CONTINUE, SafetyStatus.THROTTLE]
    
    def test_safety_check_high_inertia(self):
        """높은 관성 부채"""
        guard = SafetyGuard()
        
        state = create_initial_state(
            workflow_id="test",
            user_type={},
            user_constants={},
            user_coefficients={},
            goal="Test",
            k_scale=KScale.K2
        )
        state["inertia_debt"] = 9.0  # 매우 높음
        
        result = guard.check(state)
        
        assert result.status in [SafetyStatus.THROTTLE, SafetyStatus.HUMAN_ESCALATION]
    
    def test_safety_check_scale_lock(self):
        """Scale Lock 위반"""
        guard = SafetyGuard()
        
        state = create_initial_state(
            workflow_id="test",
            user_type={},
            user_constants={},
            user_coefficients={},
            goal="Test",
            k_scale=KScale.K2
        )
        state["scale_lock_violated"] = True
        
        result = guard.check(state)
        
        assert result.status == SafetyStatus.HALT
        assert result.gate_result == GateResult.LOCK


class TestIntegration:
    """통합 테스트"""
    
    def test_full_flow(self):
        """전체 흐름"""
        # 1. 사용자 생성
        user_manager = UserTypeManager()
        user = user_manager.create_user({
            "user_id": "integration_test",
            "basic_info": {
                "name": {"value": "Integration Test", "confidence": 1.0, "source": "user_input"}
            }
        })
        
        # 2. 상수 초기화
        constants_engine = ConstantsEngine()
        constants = constants_engine.get_or_create(user.user_id)
        
        # 3. 계수 시뮬레이션
        coefficients_engine = CoefficientsEngine()
        coefficients = coefficients_engine.simulate_network(user.user_id)
        
        # 4. 모듈 추천
        pool = APQCModulePool()
        recommendations = pool.get_recommended_modules(
            "Optimize HR onboarding",
            constants.to_dict()["constants"],
            top_n=5
        )
        
        # 5. 예측
        predictor = LaplacePredictor()
        prediction = predictor.predict(
            user_type=user.get_confidence_weighted_profile(),
            user_constants=constants.to_dict()["constants"],
            user_coefficients=coefficients.to_dict(),
            goal="Optimize HR onboarding",
            selected_modules=[r["module"] for r in recommendations] if recommendations else []
        )
        
        # 검증
        assert prediction.success_probability > 0
        assert len(prediction.recommendations) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
