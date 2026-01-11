"""
AUTUS Recommendation Engine 테스트
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Recommendation Engine 임포트 시도
try:
    from engine.recommendation import RecommendationEngine
    RECOMMENDATION_AVAILABLE = True
except ImportError:
    RECOMMENDATION_AVAILABLE = False


@pytest.mark.skipif(not RECOMMENDATION_AVAILABLE, reason="recommendation engine not available")
class TestRecommendationEngine:
    """Recommendation Engine 테스트"""
    
    def test_engine_init(self):
        """엔진 초기화"""
        engine = RecommendationEngine()
        assert engine is not None


class TestRecommendationLogic:
    """추천 로직 테스트 (모의)"""
    
    @pytest.fixture
    def user_profile(self):
        """사용자 프로필"""
        return {
            "id": "u001",
            "tier": "T2",
            "preferences": ["growth", "stability"],
            "risk_tolerance": 0.6,
            "history": [
                {"action": "acquire", "node": "n01", "success": True},
                {"action": "release", "node": "n02", "success": False},
            ]
        }
    
    @pytest.fixture
    def available_actions(self):
        """가능한 액션"""
        return [
            {"id": "a01", "type": "acquire", "target": "n03", "risk": 0.3, "reward": 0.5},
            {"id": "a02", "type": "release", "target": "n04", "risk": 0.7, "reward": 0.9},
            {"id": "a03", "type": "convert", "target": "n05", "risk": 0.5, "reward": 0.6},
        ]
    
    def test_risk_filter(self, user_profile, available_actions):
        """리스크 필터링"""
        # 사용자 리스크 허용도 이하만 추천
        tolerance = user_profile["risk_tolerance"]
        filtered = [a for a in available_actions if a["risk"] <= tolerance]
        
        assert len(filtered) == 2  # a01, a03만 통과
    
    def test_reward_ranking(self, available_actions):
        """보상 기준 랭킹"""
        ranked = sorted(available_actions, key=lambda x: x["reward"], reverse=True)
        
        assert ranked[0]["id"] == "a02"  # 가장 높은 보상
        assert ranked[-1]["id"] == "a01"  # 가장 낮은 보상
    
    def test_history_based_weight(self, user_profile):
        """히스토리 기반 가중치"""
        history = user_profile["history"]
        
        # 성공률 계산
        success_count = sum(1 for h in history if h["success"])
        total_count = len(history)
        success_rate = success_count / total_count if total_count > 0 else 0
        
        # 성공한 액션 타입에 가중치
        action_weights = {}
        for h in history:
            action = h["action"]
            weight = 1.2 if h["success"] else 0.8
            action_weights[action] = action_weights.get(action, 1.0) * weight
        
        assert success_rate == 0.5
        assert action_weights["acquire"] > action_weights["release"]
    
    def test_diversity_score(self, available_actions):
        """다양성 점수"""
        # 다양한 타입의 액션 추천
        types = set(a["type"] for a in available_actions)
        diversity = len(types) / 3  # 3가지 타입 기준
        
        assert diversity == 1.0  # 모든 타입 포함
    
    def test_final_recommendation(self, user_profile, available_actions):
        """최종 추천 생성"""
        tolerance = user_profile["risk_tolerance"]
        
        # 필터링 + 정렬
        candidates = [a for a in available_actions if a["risk"] <= tolerance]
        ranked = sorted(candidates, key=lambda x: x["reward"], reverse=True)
        
        # 상위 1개 추천
        recommendation = ranked[0] if ranked else None
        
        assert recommendation is not None
        assert recommendation["risk"] <= tolerance
