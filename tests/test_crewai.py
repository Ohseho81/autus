"""
AUTUS CrewAI 모듈 테스트
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# CrewAI 모듈 임포트 시도
try:
    from crewai.agents import rule_based_analysis, create_summary
    CREWAI_AVAILABLE = True
except ImportError:
    CREWAI_AVAILABLE = False


@pytest.fixture
def sample_nodes():
    """샘플 노드 데이터"""
    return [
        {"id": "n01", "value": 100, "tier": "T1"},
        {"id": "n02", "value": -50, "tier": "T3"},
        {"id": "n03", "value": 200, "tier": "T2"},
    ]


@pytest.fixture
def sample_motions():
    """샘플 모션 데이터"""
    return [
        {"node": "n01", "motion": "ACQUIRE", "delta": 0.1},
        {"node": "n02", "motion": "RELEASE", "delta": -0.2},
    ]


@pytest.mark.skipif(not CREWAI_AVAILABLE, reason="crewai module not available")
class TestRuleBasedAnalysis:
    """규칙 기반 분석 테스트"""
    
    def test_analysis_runs(self, sample_nodes, sample_motions):
        """분석 실행"""
        result = rule_based_analysis(sample_nodes, sample_motions)
        assert result is not None
        assert "success" in result


@pytest.mark.skipif(not CREWAI_AVAILABLE, reason="crewai module not available")
class TestSummaryCreation:
    """요약 생성 테스트"""
    
    def test_summary_creation(self, sample_nodes):
        """요약 생성"""
        summary = create_summary(sample_nodes)
        assert summary is not None


class TestCrewAIFallback:
    """CrewAI Fallback 테스트 (모의)"""
    
    def test_fallback_analysis(self, sample_nodes):
        """Fallback 분석"""
        # CrewAI 없이도 기본 분석 가능
        total_value = sum(n["value"] for n in sample_nodes)
        negative_nodes = [n for n in sample_nodes if n["value"] < 0]
        
        result = {
            "success": True,
            "total_value": total_value,
            "negative_count": len(negative_nodes),
            "recommendations": []
        }
        
        if negative_nodes:
            result["recommendations"].append("음수 가치 노드 점검 필요")
        
        assert result["success"] is True
        assert result["total_value"] == 250
        assert result["negative_count"] == 1
    
    def test_tier_analysis(self, sample_nodes):
        """티어 분석"""
        tier_counts = {}
        for node in sample_nodes:
            tier = node["tier"]
            tier_counts[tier] = tier_counts.get(tier, 0) + 1
        
        assert tier_counts["T1"] == 1
        assert tier_counts["T2"] == 1
        assert tier_counts["T3"] == 1
