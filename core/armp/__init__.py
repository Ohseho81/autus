"""
AUTUS Risk Management Policy (ARMP)

Zero Trust, Maximum Defense
"""

from core.armp.enforcer import enforcer, Risk, Severity, RiskCategory, ConstitutionViolationError
from core.armp.monitor import monitor, ARMPMonitor
from core.armp.performance import PerformanceBudget, PerformanceBudgetExceeded

# 모든 리스크 자동 등록
from core.armp import risks  # noqa: F401
from core.armp import risks_security_advanced  # noqa: F401
from core.armp import risks_files_network  # noqa: F401
from core.armp import risks_data_integrity  # noqa: F401
from core.armp import risks_performance_advanced  # noqa: F401
from core.armp import risks_api_external  # noqa: F401
from core.armp import risks_data_management  # noqa: F401
from core.armp import risks_performance_monitoring  # noqa: F401
from core.armp import risks_protocol_compliance  # noqa: F401
from core.armp import risks_final  # noqa: F401

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
