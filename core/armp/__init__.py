"""
AUTUS Risk Management Policy (ARMP)

Zero Trust, Maximum Defense
"""

from core.armp.enforcer import enforcer, Risk, Severity, RiskCategory, ConstitutionViolationError
from core.armp.monitor import monitor, ARMPMonitor
from core.armp.performance import PerformanceBudget, PerformanceBudgetExceeded

# 모든 리스크 자동 등록
from core.armp import risks  # noqa: F401

__all__ = [
    'enforcer',
    'monitor',
    'ARMPMonitor',
    'Risk',
    'Severity',
    'RiskCategory',
    'ConstitutionViolationError',
    'PerformanceBudget',
    'PerformanceBudgetExceeded'
]

__version__ = '1.0.0'
