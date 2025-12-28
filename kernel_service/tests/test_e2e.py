"""
AUTUS E2E Integration Test
==========================

텍스트 → 물리 → UI 전 과정 테스트

Version: 1.0.0
"""

import pytest
import httpx
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.kernel import Kernel
from app.goal_physics import GoalAnalyzer, GoalPhysicsConverter, LeakPressureEstimator


# ================================================================
# E2E: TEXT → PHYSICS PIPELINE
# ================================================================

class TestGoalPhysicsPipeline:
    """Goal Text → Physics 변환 E2E 테스트"""
    
    def test_vague_goal_high_entropy(self):
        """모호한 목표 → 높은 엔트로피"""
        analyzer = GoalAnalyzer()
        result = analyzer.analyze("더 나은 삶을 살고 싶다")
        
        # 모호한 목표는 σ ≈ 1.0
        assert result.physics.sigma >= 0.9
        assert result.physics.stability <= 0.1
        assert result.physics.r >= 0.9
        assert "가스운" in result.physics.physical_state or "Gas" in result.physics.physical_state
    
    def test_specific_goal_low_entropy(self):
        """구체적 목표 → 낮은 엔트로피"""
        analyzer = GoalAnalyzer()
        result = analyzer.analyze("매일 30분, 주5회 운동")
        
        # 구체적 목표는 σ < 0.7
        assert result.physics.sigma < 0.8
        assert result.physics.stability > 0.2
        assert result.physics.r < 0.8
    
    def test_deadline_adds_pressure(self):
        """마감일 포함 → Pressure 증가"""
        analyzer = GoalAnalyzer()
        result = analyzer.analyze("3월 31일까지 매출 1억 달성")
        
        assert result.leak_pressure.pressure > 0
        assert "deadline" in result.leak_pressure.pressure_sources
    
    def test_distraction_adds_leak(self):
        """방해 요소 포함 → Leak 증가"""
        analyzer = GoalAnalyzer()
        result = analyzer.analyze(
            "운동하기",
            behavior_log=["유튜브 시청 3시간", "sns 확인 계속"]
        )
        
        assert result.leak_pressure.leak > 0
        assert len(result.leak_pressure.leak_points) > 0
    
    def test_specificity_dimensions(self):
        """6가지 구체성 차원 측정"""
        analyzer = GoalAnalyzer()
        
        # 완전 구체적 목표
        result = analyzer.analyze(
            "2025년 3월 31일까지 5kg 감량, 매일 30분 운동, "
            "헬스장 등록 완료, 도전적이지만 가능"
        )
        
        spec = result.specificity
        
        # 숫자 있음 → measurable
        assert spec.measurable > 0
        
        # 날짜 있음 → time_bound
        assert spec.time_bound > 0
        
        # 숫자 있음 → quantified
        assert spec.quantified > 0
        
        # 운동 → action_verb
        assert spec.action_verb > 0
    
    def test_physics_bounds(self):
        """물리량 범위 검증"""
        analyzer = GoalAnalyzer()
        
        test_goals = [
            "행복해지기",
            "돈 많이 벌기",
            "매일 코딩 2시간",
            "12월까지 체중 70kg 도달",
        ]
        
        for goal in test_goals:
            result = analyzer.analyze(goal)
            
            # r: [0.1, 1.0]
            assert 0.1 <= result.physics.r <= 1.0
            
            # σ: [0, 1]
            assert 0.0 <= result.physics.sigma <= 1.0
            
            # stability: [0, 1]
            assert 0.0 <= result.physics.stability <= 1.0
            
            # leak: [0, 1]
            assert 0.0 <= result.leak_pressure.leak <= 1.0
            
            # pressure: [0, 1]
            assert 0.0 <= result.leak_pressure.pressure <= 1.0


# ================================================================
# E2E: PHYSICS → KERNEL INTEGRATION
# ================================================================

class TestPhysicsKernelIntegration:
    """Goal Physics → Kernel 연동 테스트"""
    
    def test_goal_to_kernel_state(self):
        """Goal 분석 결과 → Kernel 상태 반영"""
        analyzer = GoalAnalyzer()
        kernel = Kernel()
        
        # 목표 분석
        goal_result = analyzer.analyze("매일 운동 30분")
        
        # 초기 커널 상태
        initial_state = kernel.get_state()
        
        # 목표 기반으로 PUSH 실행
        if goal_result.physics.stability > 0.3:
            # 안정적 목표 → PUSH
            kernel.step("U001")
        else:
            # 불안정 목표 → HOLD
            kernel.step("U002")
        
        # 상태 변화 확인
        final_state = kernel.get_state()
        assert final_state.step > initial_state.step
    
    def test_entropy_affects_kernel(self):
        """높은 엔트로피 목표 → 커널 변동성 증가"""
        analyzer = GoalAnalyzer()
        
        # 모호한 목표
        vague = analyzer.analyze("좋은 일 하기")
        
        # 구체적 목표
        specific = analyzer.analyze("내일 9시 회의 참석")
        
        # 모호한 목표가 더 높은 σ
        assert vague.physics.sigma > specific.physics.sigma


# ================================================================
# E2E: FULL PIPELINE TEST
# ================================================================

class TestFullPipeline:
    """전체 파이프라인 통합 테스트"""
    
    def test_text_to_physics_to_kernel_to_log(self):
        """Text → Physics → Kernel → Log 전체 흐름"""
        from app.chain import Chain
        
        analyzer = GoalAnalyzer()
        kernel = Kernel()
        chain = Chain()
        
        goals = [
            "더 건강해지기",
            "매일 7시 기상",
            "이번 달 책 3권 읽기",
        ]
        
        for goal in goals:
            # 1. Text → Physics
            physics = analyzer.analyze(goal)
            
            # 2. Physics → Motion 선택 (규칙 기반)
            if physics.physics.stability > 0.5:
                motion = "U001"  # PUSH
            elif physics.leak_pressure.net_flow > 0:
                motion = "U002"  # HOLD
            else:
                motion = "U003"  # DRIFT
            
            # 3. Kernel Step
            result = kernel.step(motion)
            
            # 4. Log to Chain
            if result.get("success"):
                chain.append(
                    motion_id=motion,
                    state_snapshot={
                        "kernel": result.get("next_state"),
                        "goal_physics": physics.physics.to_dict()
                    }
                )
        
        # 검증
        assert len(chain.entries) == 3
        assert chain.verify()["valid"]
    
    def test_determinism_with_goal_physics(self):
        """Goal Physics 포함 결정론 검증"""
        analyzer = GoalAnalyzer()
        
        goal = "내일까지 보고서 완성"
        
        results = []
        for _ in range(5):
            result = analyzer.analyze(goal)
            results.append(result.physics.to_dict())
        
        # 모든 결과 동일 (결정론)
        for r in results[1:]:
            assert r == results[0]


# ================================================================
# E2E: API INTEGRATION TEST
# ================================================================

class TestAPIIntegration:
    """API 레벨 통합 테스트 (서버 실행 필요)"""
    
    @pytest.mark.skipif(
        not os.environ.get("RUN_API_TESTS"),
        reason="API tests require running server"
    )
    def test_goal_analyze_api(self):
        """Goal Analyze API 테스트"""
        with httpx.Client() as client:
            response = client.post(
                "http://localhost:8001/goal/analyze",
                json={"goal_text": "매일 운동하기"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "physics" in data
            assert "leak_pressure" in data
            assert "specificity" in data
    
    @pytest.mark.skipif(
        not os.environ.get("RUN_API_TESTS"),
        reason="API tests require running server"
    )
    def test_full_api_flow(self):
        """전체 API 흐름 테스트"""
        with httpx.Client() as client:
            # 1. Goal Analyze
            goal_resp = client.post(
                "http://localhost:8001/goal/analyze",
                json={"goal_text": "3월까지 프로젝트 완료"}
            )
            goal_data = goal_resp.json()
            
            # 2. Kernel Step
            step_resp = client.post(
                "http://localhost:8001/kernel/step",
                json={"motion_id": "U001"}
            )
            step_data = step_resp.json()
            
            # 3. Verify Chain
            verify_resp = client.get("http://localhost:8001/log/verify")
            verify_data = verify_resp.json()
            
            assert goal_data["physics"]["sigma"] is not None
            assert step_data["success"] == True
            assert verify_data["valid"] == True


# ================================================================
# MAIN
# ================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])





