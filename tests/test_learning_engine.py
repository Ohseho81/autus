"""
AUTUS Learning Engine 테스트
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Learning Engine 임포트 시도
try:
    from engine.learning import LearningEngine
    LEARNING_AVAILABLE = True
except ImportError:
    LEARNING_AVAILABLE = False


@pytest.mark.skipif(not LEARNING_AVAILABLE, reason="learning engine not available")
class TestLearningEngine:
    """Learning Engine 테스트"""
    
    def test_engine_init(self):
        """엔진 초기화"""
        engine = LearningEngine()
        assert engine is not None


class TestLearningConcepts:
    """Learning 개념 테스트 (모의)"""
    
    def test_feedback_loop(self):
        """피드백 루프"""
        # 입력 → 처리 → 출력 → 피드백
        input_data = {"action": "acquire", "value": 100}
        
        # 처리
        processed = {
            "original": input_data,
            "normalized": input_data["value"] / 1000,
            "timestamp": 12345
        }
        
        # 출력
        output = {
            "success": True,
            "processed": processed,
            "learning_rate": 0.01
        }
        
        # 피드백
        feedback = {
            "actual_outcome": 0.12,
            "predicted_outcome": 0.10,
            "error": 0.02
        }
        
        assert output["success"] is True
        assert feedback["error"] == 0.02
    
    def test_pattern_recognition(self):
        """패턴 인식"""
        # 시계열 데이터에서 패턴 찾기
        time_series = [100, 110, 105, 115, 108, 120, 112, 125]
        
        # 이동 평균
        window = 3
        moving_avg = []
        for i in range(len(time_series) - window + 1):
            avg = sum(time_series[i:i+window]) / window
            moving_avg.append(round(avg, 2))
        
        # 추세 판단
        trend = "up" if moving_avg[-1] > moving_avg[0] else "down"
        
        assert trend == "up"
        assert len(moving_avg) == 6
    
    def test_adaptive_threshold(self):
        """적응형 임계값"""
        values = [50, 55, 48, 52, 60, 45, 58, 62]
        
        # 평균과 표준편차 계산
        mean = sum(values) / len(values)
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        std_dev = variance ** 0.5
        
        # 적응형 임계값 (평균 + 1.5 * 표준편차)
        upper_threshold = mean + 1.5 * std_dev
        lower_threshold = mean - 1.5 * std_dev
        
        # 이상치 탐지
        outliers = [v for v in values if v > upper_threshold or v < lower_threshold]
        
        assert mean == 53.75
        assert len(outliers) <= 2  # 대부분 정상 범위
