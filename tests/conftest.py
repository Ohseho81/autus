import pytest
from core.armp.enforcer import enforcer
from core.armp.risks import register_core_risks
from core.armp.risks_security_advanced import register_security_advanced_risks
from core.armp.risks_data_integrity import register_data_integrity_risks
from core.armp.risks_performance_monitoring import register_performance_monitoring_risks
from core.armp.risks_api_external import register_api_external_risks
from core.armp.risks_final import register_final_risks
from core.armp.risks_files_network import register_files_network_risks
from core.armp.risks_data_management import register_data_management_risks
from core.armp.risks_performance_advanced import register_performance_advanced_risks
from core.armp.risks_protocol_compliance import register_protocol_compliance_risks

@pytest.fixture(autouse=True)
def register_all_risks():
    """
    pytest fixture: 모든 테스트 시작 전 enforcer.risks를 clear하고 30개 리스크를 명시적으로 등록
    중복 등록 방지 및 테스트 간 격리 보장
    """
    enforcer.risks.clear()
    register_core_risks()
    register_security_advanced_risks()
    register_data_integrity_risks()
    register_performance_monitoring_risks()
    register_api_external_risks()
    register_final_risks()
    register_files_network_risks()
    register_data_management_risks()
    register_performance_advanced_risks()
    register_protocol_compliance_risks()
