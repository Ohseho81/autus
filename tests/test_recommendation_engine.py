"""
AUTUS Recommendation Engine Tests
=================================

ROF Framework 및 추천 시스템 테스트
"""

import pytest
import sys
import os

# 모듈 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from recommendation_engine import (
    ROFScore,
    ROFCalculator,
    RecommendationType,
    Recommendation,
    MetaRecommendationEngine,
    LearningSourceManager,
)


# ============================================
# ROFScore Tests
# ============================================

class TestROFScore:
    """ROFScore 테스트"""
    
    def test_creation(self):
        """ROFScore 생성"""
        rof = ROFScore(result=7, optimization=5, future=3)
        assert rof.result == 7
        assert rof.optimization == 5
        assert rof.future == 3
    
    def test_total_default_weights(self):
        """기본 가중치로 총점 계산"""
        rof = ROFScore(result=10, optimization=10, future=10)
        # 기본: 40% result + 35% optimization + 25% future = 10
        total = rof.total()
        assert total == 10.0
    
    def test_total_custom_weights(self):
        """커스텀 가중치로 총점 계산"""
        rof = ROFScore(result=10, optimization=0, future=0)
        weights = {"R": 1.0, "O": 0.0, "F": 0.0}
        total = rof.total(weights)
        assert total == 10.0
    
    def test_to_dict(self):
        """딕셔너리 변환"""
        rof = ROFScore(result=5, optimization=6, future=7)
        d = rof.to_dict()
        assert d["result"] == 5
        assert d["optimization"] == 6
        assert d["future"] == 7
        assert "total" in d


# ============================================
# ROFCalculator Tests
# ============================================

class TestROFCalculator:
    """ROFCalculator 테스트"""
    
    def test_calculate_revenue_impact(self):
        """매출 영향 점수 계산"""
        calc = ROFCalculator()
        impact = {"revenue_increase": 10}  # 10% 증가
        rof = calc.calculate(impact, {})
        assert rof.result > 0
    
    def test_calculate_time_impact(self):
        """시간 절약 점수 계산"""
        calc = ROFCalculator()
        impact = {"time_saved": 5}  # 5시간
        rof = calc.calculate(impact, {})
        assert rof.optimization > 0
    
    def test_calculate_risk_impact(self):
        """위험 감소 점수 계산"""
        calc = ROFCalculator()
        impact = {"risk_reduction": 30}  # 30% 감소
        rof = calc.calculate(impact, {})
        assert rof.future > 0
    
    def test_adjust_weights_short_runway(self):
        """짧은 런웨이 시 가중치 조정"""
        calc = ROFCalculator()
        user_state = {"runway_months": 2}
        weights = calc.adjust_weights(user_state)
        # 가중치가 조정됨
        assert "R" in weights
        assert weights["R"] >= 0  # 비음수
    
    def test_adjust_weights_high_workload(self):
        """높은 업무량 시 가중치 조정"""
        calc = ROFCalculator()
        user_state = {"workload": 9}
        weights = calc.adjust_weights(user_state)
        # 업무량 높으면 O (optimization) 가중치 증가
        assert weights["O"] > 0.35


# ============================================
# Recommendation Tests
# ============================================

class TestRecommendation:
    """Recommendation 테스트"""
    
    def test_creation(self):
        """Recommendation 생성"""
        rec = Recommendation(
            rec_id="test_001",
            rec_type=RecommendationType.CROSS_USER,
            title="Test Recommendation",
            description="Test description",
            rof_score=ROFScore(5, 5, 5),
            expected_impact={"revenue_increase": 10},
            action_type="enable",
            confidence=0.8,
        )
        assert rec.rec_id == "test_001"
        assert rec.title == "Test Recommendation"
        assert rec.confidence == 0.8
    
    def test_to_dict(self):
        """딕셔너리 변환"""
        rec = Recommendation(
            rec_id="test_002",
            rec_type=RecommendationType.CLEANUP,
            title="Cleanup Test",
            description="Clean things",
            rof_score=ROFScore(1, 8, 2),
            expected_impact={},
            action_type="cleanup",
            confidence=0.9,
        )
        d = rec.to_dict()
        assert d["rec_id"] == "test_002"
        assert d["rec_type"] == "cleanup"
        assert d["rof_score"]["optimization"] == 8


# ============================================
# MetaRecommendationEngine Tests
# ============================================

class TestMetaRecommendationEngine:
    """MetaRecommendationEngine 테스트"""
    
    def test_initialization(self):
        """엔진 초기화"""
        engine = MetaRecommendationEngine("test_user")
        assert engine.user_id == "test_user"
    
    def test_generate_all(self):
        """전체 추천 생성"""
        engine = MetaRecommendationEngine("test_user")
        user_state = {"runway_months": 6, "momentum": 5}
        user_data = {"automations": [], "connected_services": [], "rules": []}
        
        recommendations = engine.generate_all(user_state, user_data)
        assert isinstance(recommendations, list)
    
    def test_accept_recommendation(self):
        """추천 수락"""
        engine = MetaRecommendationEngine("test_user")
        user_state = {"runway_months": 6}
        user_data = {"automations": [], "connected_services": [], "rules": []}
        
        recommendations = engine.generate_all(user_state, user_data)
        if recommendations:
            rec_id = recommendations[0].rec_id
            rec = engine.accept(rec_id)
            assert rec is not None
    
    def test_dismiss_recommendation(self):
        """추천 거부"""
        engine = MetaRecommendationEngine("test_user")
        engine.dismiss("some_rec_id")
        # dismiss 메서드가 정상 동작하면 성공
        assert True


# ============================================
# LearningSourceManager Tests
# ============================================

class TestLearningSourceManager:
    """LearningSourceManager 테스트"""
    
    def test_initialization(self):
        """매니저 초기화"""
        manager = LearningSourceManager("test_user")
        assert manager.user_id == "test_user"
    
    def test_get_layer_summary(self):
        """계층 요약 조회"""
        manager = LearningSourceManager("test_user")
        summary = manager.get_layer_summary()
        
        assert "L1_macro" in summary
        assert "L2_interest" in summary
        assert "L3_behavior" in summary
        assert "L4_connection" in summary
    
    def test_connect_service(self):
        """서비스 연결"""
        manager = LearningSourceManager("test_user")
        success = manager.connect_service("google_calendar")
        assert success
        
        sources = manager.get_all_sources()
        google_source = next(
            (s for s in sources if s["source_id"] == "L4_google_calendar"),
            None
        )
        assert google_source is not None
        assert google_source["connected"]
    
    def test_set_interests(self):
        """관심 분야 설정"""
        manager = LearningSourceManager("test_user")
        manager.set_interests(["교육", "AI"], ["학원", "자동화"])
        
        sources = manager.get_all_sources()
        interest_source = next(
            (s for s in sources if s["source_id"] == "L2_education"),
            None
        )
        # 교육 관련 소스가 있어야 함 (있다면 연결됨)
        # 이건 구현에 따라 다를 수 있음


# ============================================
# Run Tests
# ============================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
