# ═══════════════════════════════════════════════════════════════════════════
# AUTUS Sovereign Module - 삭제 기반 최적화
# ═══════════════════════════════════════════════════════════════════════════
"""
Sovereign: 삭제를 통한 자율적 최적화

핵심 철학:
- "추가보다 삭제가 더 큰 가치를 창출한다"
- "복잡성 제거가 효율의 핵심이다"
- "관성을 측정하고 줄여라"

Components:
1. DeleteScanner - 삭제 대상 스캔
2. InertiaCalculator - 관성 계산
3. OptimizationEngine - 최적화 실행
"""

from .delete_scanner import (
    DeleteScanner,
    DeleteCategory,
    DeleteTarget,
    ScanResult,
    get_scanner,
    CATEGORY_PRIORITIES,
    REPLACEMENT_TEMPLATES,
    INDUSTRY_TEMPLATES,
)

from .inertia_calc import (
    InertiaCalculator,
    InertiaType,
    InertiaSource,
    InertiaReport,
    INERTIA_FRICTION,
)

from .optimization import (
    OptimizationEngine,
    OptimizationStrategy,
    OptimizationAction,
    OptimizationPlan,
    OptimizationResult,
)

from .clark_corndog import (
    ClarkCorndogProtocol,
    ClarkNode,
    ClarkProtocolResult,
    NodeStatus,
    get_clark,
)


__all__ = [
    # Scanner
    "DeleteScanner",
    "DeleteCategory",
    "DeleteTarget",
    "ScanResult",
    "get_scanner",
    "CATEGORY_PRIORITIES",
    "REPLACEMENT_TEMPLATES",
    "INDUSTRY_TEMPLATES",
    
    # Inertia
    "InertiaCalculator",
    "InertiaType",
    "InertiaSource",
    "InertiaReport",
    "INERTIA_FRICTION",
    
    # Optimization
    "OptimizationEngine",
    "OptimizationStrategy",
    "OptimizationAction",
    "OptimizationPlan",
    "OptimizationResult",
]
