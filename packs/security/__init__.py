"""Security Pack - ARMP, Compliance"""
from pathlib import Path
import sys

# 모든 하위 모듈 노출
_dir = Path(__file__).parent
for py_file in _dir.glob("*.py"):
    if py_file.name != "__init__.py":
        module_name = py_file.stem
        try:
            exec(f"from .{module_name} import *")
        except:
            pass

# 모든 리스크 등록 함수 호출 (중복 방지)
try:
    from .risks import register_core_risks
    from .risks_security import register_security_risks
    from .risks_security_advanced import register_security_advanced_risks
    from .risks_data_integrity import register_data_integrity_risks
    from .risks_data_management import register_data_management_risks
    from .risks_api_external import register_api_external_risks
    from .risks_protocol_compliance import register_protocol_compliance_risks
    from .risks_performance_monitoring import register_performance_monitoring_risks
    from .risks_performance_advanced import register_performance_advanced_risks
    from .risks_files_network import register_files_network_risks
    from .risks_final import register_final_risks

    register_core_risks()
    register_security_risks()
    register_security_advanced_risks()
    register_data_integrity_risks()
    register_data_management_risks()
    register_api_external_risks()
    register_protocol_compliance_risks()
    register_performance_monitoring_risks()
    register_performance_advanced_risks()
    register_files_network_risks()
    register_final_risks()
except Exception as e:
    import warnings
    warnings.warn(f"Risk registration failed: {e}")
