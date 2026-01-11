"""
AUTUS Sovereign Module Tests
=============================

삭제 기반 최적화 모듈 테스트
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.sovereign import (
    DeleteScanner,
    DeleteCategory,
    DeleteTarget,
    get_scanner,
    InertiaCalculator,
    InertiaType,
    InertiaSource,
    OptimizationEngine,
    OptimizationStrategy,
)


# ═══════════════════════════════════════════════════════════════════════════
# DeleteScanner Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestDeleteScanner:
    """삭제 스캐너 테스트"""
    
    def test_init(self):
        """초기화 테스트"""
        scanner = DeleteScanner()
        assert scanner is not None
        assert len(scanner.INDUSTRY_TEMPLATES) > 0
    
    def test_scan_by_industry_startup(self):
        """스타트업 산업 스캔"""
        scanner = DeleteScanner()
        result = scanner.scan_by_industry("test_entity", "startup")
        
        assert result.entity_id == "test_entity"
        assert result.total_count > 0
        assert len(result.targets) > 0
        assert result.total_cost_saved > 0
    
    def test_scan_by_industry_smb(self):
        """SMB 산업 스캔"""
        scanner = DeleteScanner()
        result = scanner.scan_by_industry("smb_entity", "smb")
        
        assert result.entity_id == "smb_entity"
        assert result.total_count > 0
    
    def test_scan_custom(self):
        """커스텀 스캔"""
        scanner = DeleteScanner()
        
        items = [
            {"name": "Test Sub", "category": "subscription", "cost": 100000},
            {"name": "Test Meeting", "category": "meeting", "time": 2},
        ]
        
        result = scanner.scan_custom("custom_entity", items)
        
        assert result.entity_id == "custom_entity"
        assert result.total_count == 2
    
    def test_get_quick_wins(self):
        """빠른 성과 조회"""
        scanner = DeleteScanner()
        scanner.scan_by_industry("quick_entity", "startup")
        
        quick_wins = scanner.get_quick_wins("quick_entity", 3)
        
        assert len(quick_wins) <= 3
    
    def test_delete_category_enum(self):
        """삭제 카테고리 enum"""
        assert DeleteCategory.SUBSCRIPTION.value == "subscription"
        assert DeleteCategory.MEETING.value == "meeting"
        assert DeleteCategory.PROCESS.value == "process"
    
    def test_get_scanner_singleton(self):
        """스캐너 싱글톤"""
        scanner1 = get_scanner()
        scanner2 = get_scanner()
        assert scanner1 is scanner2


# ═══════════════════════════════════════════════════════════════════════════
# InertiaCalculator Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestInertiaCalculator:
    """관성 계산기 테스트"""
    
    def test_init(self):
        """초기화"""
        calc = InertiaCalculator()
        assert calc is not None
    
    def test_add_source(self):
        """관성 원천 추가"""
        calc = InertiaCalculator()
        
        source = InertiaSource(
            id="src_001",
            name="Test Subscription",
            inertia_type=InertiaType.SUBSCRIPTION,
            mass=1200000,  # 연간 비용
            friction=0.3,
            dependency=0.5,
            freed_capital=1000000,
        )
        
        calc.add_source("entity_001", source)
        sources = calc.get_sources("entity_001")
        
        assert len(sources) == 1
        assert sources[0].name == "Test Subscription"
    
    def test_calculate_inertia(self):
        """관성 계산: I = M × F × D"""
        calc = InertiaCalculator()
        
        source = InertiaSource(
            id="src_002",
            name="Test",
            inertia_type=InertiaType.CONTRACT,
            mass=1000,
            friction=0.5,
            dependency=0.4,
        )
        
        inertia = calc.calculate_inertia(source)
        expected = 1000 * 0.5 * 0.4  # 200
        
        assert inertia == expected
    
    def test_calculate_delete_roi(self):
        """삭제 ROI 계산"""
        calc = InertiaCalculator()
        
        source = InertiaSource(
            id="src_003",
            name="Test",
            inertia_type=InertiaType.SUBSCRIPTION,
            removal_cost=100,
            removal_risk=0.1,
            freed_capital=1000,
            efficiency_gain=5,
        )
        
        roi = calc.calculate_delete_roi(source)
        
        # benefit = 1000 + (5 * 1000) = 6000
        # cost = 100 + (0.1 * 1000) + 1 = 201
        # roi = 6000 / 201 ≈ 29.85
        assert roi > 0
    
    def test_analyze_entity(self):
        """엔티티 분석"""
        calc = InertiaCalculator()
        
        # 여러 원천 추가
        for i in range(3):
            source = InertiaSource(
                id=f"src_{i}",
                name=f"Source {i}",
                inertia_type=InertiaType.SUBSCRIPTION,
                mass=100000 * (i + 1),
                friction=0.3,
                dependency=0.5,
                freed_capital=50000 * (i + 1),
            )
            calc.add_source("analyze_entity", source)
        
        report = calc.analyze_entity("analyze_entity", "Test Entity")
        
        assert report is not None
        assert report.entity_id == "analyze_entity"
        assert report.total_inertia > 0
        assert len(report.delete_candidates) == 3
    
    def test_inertia_type_enum(self):
        """관성 유형 enum"""
        assert InertiaType.SUBSCRIPTION.value == "subscription"
        assert InertiaType.LEGACY_SYSTEM.value == "legacy_system"
        assert InertiaType.HUMAN.value == "human"


# ═══════════════════════════════════════════════════════════════════════════
# OptimizationEngine Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestOptimizationEngine:
    """최적화 엔진 테스트"""
    
    def test_init(self):
        """초기화"""
        engine = OptimizationEngine()
        assert engine is not None
        assert engine.scanner is not None
        assert engine.inertia_calc is not None
    
    def test_analyze_startup(self):
        """스타트업 분석"""
        engine = OptimizationEngine()
        
        result = engine.analyze("opt_entity", "startup")
        
        assert result.entity_id == "opt_entity"
        assert result.industry == "startup"
        assert result.total_deletable > 0
        assert result.plan is not None
    
    def test_analyze_with_strategy(self):
        """전략별 분석"""
        engine = OptimizationEngine()
        
        # AGGRESSIVE
        result_agg = engine.analyze(
            "agg_entity", "startup",
            strategy=OptimizationStrategy.AGGRESSIVE
        )
        
        # CONSERVATIVE
        result_con = engine.analyze(
            "con_entity", "startup",
            strategy=OptimizationStrategy.CONSERVATIVE
        )
        
        assert result_agg.plan is not None
        assert result_con.plan is not None
    
    def test_get_plan(self):
        """계획 조회"""
        engine = OptimizationEngine()
        engine.analyze("plan_entity", "smb")
        
        plan = engine.get_plan("plan_entity")
        
        assert plan is not None
        assert len(plan.phases) > 0
    
    def test_calculate_progress(self):
        """진행률 계산"""
        engine = OptimizationEngine()
        engine.analyze("progress_entity", "startup")
        
        progress = engine.calculate_progress("progress_entity")
        
        assert progress["entity_id"] == "progress_entity"
        assert progress["progress"] >= 0
        assert progress["total"] > 0
    
    def test_update_action_status(self):
        """액션 상태 업데이트"""
        engine = OptimizationEngine()
        engine.analyze("status_entity", "startup")
        
        plan = engine.get_plan("status_entity")
        if plan and plan.actions:
            action_id = plan.actions[0].id
            
            result = engine.update_action_status(
                "status_entity",
                action_id,
                "completed"
            )
            
            assert result is True
            assert plan.actions[0].status == "completed"
    
    def test_optimization_strategy_enum(self):
        """최적화 전략 enum"""
        assert OptimizationStrategy.AGGRESSIVE.value == "aggressive"
        assert OptimizationStrategy.BALANCED.value == "balanced"
        assert OptimizationStrategy.QUICK_WIN.value == "quick_win"


# ═══════════════════════════════════════════════════════════════════════════
# Integration Tests
# ═══════════════════════════════════════════════════════════════════════════

class TestSovereignIntegration:
    """통합 테스트"""
    
    def test_full_optimization_flow(self):
        """전체 최적화 플로우"""
        # 1. 스캔
        scanner = get_scanner()
        scan_result = scanner.scan_by_industry("full_test", "startup")
        
        assert scan_result.total_count > 0
        
        # 2. 관성 분석
        calc = InertiaCalculator()
        for target in scan_result.targets:
            source = InertiaSource(
                id=target.id,
                name=target.name,
                inertia_type=InertiaType.SUBSCRIPTION,
                mass=target.current_cost * 12,
            )
            calc.add_source("full_test", source)
        
        report = calc.analyze_entity("full_test")
        assert report is not None
        
        # 3. 최적화
        engine = OptimizationEngine()
        result = engine.analyze("full_test_opt", "startup")
        
        assert result.plan is not None
        assert result.monthly_cost_savings > 0
    
    def test_quick_wins_identification(self):
        """빠른 성과 식별"""
        engine = OptimizationEngine()
        result = engine.analyze("qw_test", "startup")
        
        assert len(result.quick_wins) > 0
        
        # Quick wins should have high ROI
        for qw in result.quick_wins:
            assert qw["roi"] > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
