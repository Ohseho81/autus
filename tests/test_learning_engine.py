"""
AUTUS Learning Engine Tests
===========================

학습 엔진 핵심 테스트
"""

import pytest
import sys
import os
import tempfile
import shutil

# 모듈 경로 추가
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from learning_engine import (
    LearningLoop,
    IntegratedLearningLoop,
)


# ============================================
# Fixtures
# ============================================

@pytest.fixture
def temp_data_dir():
    """임시 데이터 디렉토리"""
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


# ============================================
# LearningLoop Tests
# ============================================

class TestLearningLoop:
    """LearningLoop 테스트"""
    
    def test_initialization(self, temp_data_dir):
        """루프 초기화"""
        loop = LearningLoop("test_user", temp_data_dir)
        assert loop.user_id == "test_user"
    
    def test_get_state(self, temp_data_dir):
        """상태 조회"""
        loop = LearningLoop("test_user", temp_data_dir)
        state = loop.get_state()
        
        assert state is not None
    
    def test_metrics(self, temp_data_dir):
        """메트릭 조회"""
        loop = LearningLoop("test_user", temp_data_dir)
        
        # metrics 속성 확인
        assert hasattr(loop, 'metrics')
        assert isinstance(loop.metrics, dict)


# ============================================
# IntegratedLearningLoop Tests
# ============================================

class TestIntegratedLearningLoop:
    """IntegratedLearningLoop 테스트"""
    
    def test_initialization(self, temp_data_dir):
        """통합 루프 초기화"""
        loop = IntegratedLearningLoop("test_user", temp_data_dir)
        assert loop.user_id == "test_user"
    
    def test_get_state(self, temp_data_dir):
        """상태 조회"""
        loop = IntegratedLearningLoop("test_user", temp_data_dir)
        state = loop.get_state()
        
        assert state is not None
    
    def test_get_recommendations(self, temp_data_dir):
        """추천 조회"""
        loop = IntegratedLearningLoop("test_user", temp_data_dir)
        recommendations = loop.get_recommendations()
        
        assert isinstance(recommendations, list)
    
    def test_get_recommendations_simple(self, temp_data_dir):
        """간단 추천 조회"""
        loop = IntegratedLearningLoop("test_user", temp_data_dir)
        recommendations = loop.get_recommendations_simple()
        
        assert isinstance(recommendations, list)
    
    def test_get_learning_sources(self, temp_data_dir):
        """학습 소스 조회"""
        loop = IntegratedLearningLoop("test_user", temp_data_dir)
        sources = loop.get_learning_sources()
        
        assert "layers" in sources


# ============================================
# Run Tests
# ============================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
