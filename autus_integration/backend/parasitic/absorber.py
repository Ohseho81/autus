# backend/parasitic/absorber.py
# Parasitic Flywheel Absorption - 기존 SaaS 기생 → 흡수 → 대체

from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import asyncio

class AbsorptionStage(Enum):
    """흡수 단계"""
    PARASITIC = "parasitic"      # 기생: 연동만, 데이터 미러링
    ABSORBING = "absorbing"      # 흡수: 기능 복제 시작
    REPLACING = "replacing"      # 대체: 기존 시스템 비활성화 준비
    REPLACED = "replaced"        # 완료: 완전 대체

class SaaSConnector:
    """
    기존 SaaS 연동 커넥터
    
    지원 시스템:
    - POS: 토스, 카카오페이, 배민포스
    - 예약: 네이버예약, 카카오예약, 테이블매니저
    - 회원: 짐앤짐, 에이블리, 자체 DB
    - 회계: 퀵북스, 제로, 더존
    """
    
    SUPPORTED_SAAS = {
        # POS 시스템
        "toss_pos": {
            "name": "토스 POS",
            "webhook": True,
            "api": True,
            "data_types": ["payments", "refunds", "daily_summary"]
        },
        "kakao_pos": {
            "name": "카카오페이 POS",
            "webhook": True,
            "api": True,
            "data_types": ["payments", "refunds"]
        },
        "baemin_pos": {
            "name": "배민포스",
            "webhook": False,
            "api": True,
            "data_types": ["orders", "payments", "menu"]
        },
        
        # 예약 시스템
        "naver_booking": {
            "name": "네이버예약",
            "webhook": True,
            "api": True,
            "data_types": ["reservations", "customers", "reviews"]
        },
        "table_manager": {
            "name": "테이블매니저",
            "webhook": True,
            "api": True,
            "data_types": ["reservations", "tables", "waitlist"]
        },
        
        # 회원 관리
        "gym_system": {
            "name": "짐앤짐",
            "webhook": False,
            "api": True,
            "data_types": ["members", "attendance", "payments"]
        },
        
        # 회계
        "quickbooks": {
            "name": "QuickBooks",
            "webhook": True,
            "api": True,
            "data_types": ["invoices", "payments", "expenses", "customers"]
        },
        "xero": {
            "name": "Xero",
            "webhook": True,
            "api": True,
            "data_types": ["invoices", "payments", "contacts"]
        }
    }
    
    def __init__(self, saas_type: str, credentials: Dict):
        self.saas_type = saas_type
        self.credentials = credentials
        self.config = self.SUPPORTED_SAAS.get(saas_type, {})
        self.stage = AbsorptionStage.PARASITIC
        self.absorbed_data = {}
        self.sync_count = 0
    
    async def connect(self) -> bool:
        """연결 테스트"""
        # TODO: 실제 API 연결
        return True
    
    async def sync_data(self, data_type: str) -> List[Dict]:
        """데이터 동기화 (기생 단계)"""
        if data_type not in self.config.get('data_types', []):
            return []
        
        # TODO: 실제 API 호출
        # 여기서는 Mock 데이터
        self.sync_count += 1
        return []


class ParasiticAbsorber:
    """
    Parasitic Flywheel Absorption 엔진
    
    단계:
    1. PARASITIC (기생): Webhook/API로 실시간 데이터 미러링
    2. ABSORBING (흡수): 기능 복제 + 데이터 100% 이전
    3. REPLACING (대체): 기존 시스템 비활성화 준비
    4. REPLACED (완료): 완전 대체
    """
    
    def __init__(self):
        self.connectors: Dict[str, SaaSConnector] = {}
        self.absorption_status: Dict[str, AbsorptionStage] = {}
        self.data_store: Dict[str, List[Dict]] = {}
    
    def add_connector(self, saas_type: str, credentials: Dict) -> str:
        """SaaS 커넥터 추가"""
        connector_id = f"{saas_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.connectors[connector_id] = SaaSConnector(saas_type, credentials)
        self.absorption_status[connector_id] = AbsorptionStage.PARASITIC
        return connector_id
    
    async def start_parasitic(self, connector_id: str) -> Dict:
        """
        기생 시작 - 데이터 미러링
        
        초기 비용: 0 (Webhook 수신만)
        효과: 실시간 데이터 흡수
        """
        connector = self.connectors.get(connector_id)
        if not connector:
            return {"success": False, "error": "Connector not found"}
        
        # Webhook 설정 또는 폴링 시작
        connected = await connector.connect()
        
        if connected:
            self.absorption_status[connector_id] = AbsorptionStage.PARASITIC
            return {
                "success": True,
                "stage": "PARASITIC",
                "message": f"기생 시작: {connector.config.get('name', connector_id)}",
                "data_types": connector.config.get('data_types', [])
            }
        
        return {"success": False, "error": "Connection failed"}
    
    async def absorb_data(self, connector_id: str) -> Dict:
        """
        흡수 단계 - 데이터 + 기능 복제
        
        조건: 동기화 10회 이상 완료
        효과: AUTUS로 데이터 완전 이전
        """
        connector = self.connectors.get(connector_id)
        if not connector:
            return {"success": False, "error": "Connector not found"}
        
        if connector.sync_count < 10:
            return {
                "success": False,
                "error": f"동기화 부족: {connector.sync_count}/10",
                "stage": "PARASITIC"
            }
        
        # 전체 데이터 동기화
        absorbed = {}
        for data_type in connector.config.get('data_types', []):
            data = await connector.sync_data(data_type)
            absorbed[data_type] = len(data)
            self.data_store[f"{connector_id}_{data_type}"] = data
        
        self.absorption_status[connector_id] = AbsorptionStage.ABSORBING
        
        return {
            "success": True,
            "stage": "ABSORBING",
            "message": "흡수 중: 데이터 이전 진행",
            "absorbed_counts": absorbed
        }
    
    async def prepare_replacement(self, connector_id: str) -> Dict:
        """
        대체 준비 - 기존 시스템 비활성화 안내
        
        조건: 흡수 완료 + 사용자 확인
        효과: 기존 SaaS 구독 해지 안내
        """
        if self.absorption_status.get(connector_id) != AbsorptionStage.ABSORBING:
            return {"success": False, "error": "흡수 단계 미완료"}
        
        connector = self.connectors.get(connector_id)
        
        self.absorption_status[connector_id] = AbsorptionStage.REPLACING
        
        return {
            "success": True,
            "stage": "REPLACING",
            "message": f"대체 준비 완료: {connector.config.get('name', '')}",
            "actions": [
                f"1. {connector.config.get('name', '')} 구독 해지 예약",
                "2. AUTUS로 전체 전환 확인",
                "3. 기존 시스템 데이터 백업",
                "4. 최종 전환 실행"
            ],
            "estimated_monthly_savings": self._estimate_savings(connector)
        }
    
    async def complete_replacement(self, connector_id: str) -> Dict:
        """
        대체 완료 - 완전 전환
        """
        if self.absorption_status.get(connector_id) != AbsorptionStage.REPLACING:
            return {"success": False, "error": "대체 준비 미완료"}
        
        self.absorption_status[connector_id] = AbsorptionStage.REPLACED
        
        return {
            "success": True,
            "stage": "REPLACED",
            "message": "🎉 완전 대체 완료!",
            "benefits": [
                "기존 SaaS 비용 100% 절감",
                "데이터 통합 완료",
                "AUTUS 단일 엔진 운영"
            ]
        }
    
    def get_absorption_status(self) -> Dict:
        """전체 흡수 상태"""
        return {
            "connectors": {
                cid: {
                    "type": c.saas_type,
                    "name": c.config.get('name', ''),
                    "stage": self.absorption_status.get(cid, AbsorptionStage.PARASITIC).value,
                    "sync_count": c.sync_count
                }
                for cid, c in self.connectors.items()
            },
            "total_absorbed": len([
                s for s in self.absorption_status.values()
                if s in [AbsorptionStage.ABSORBING, AbsorptionStage.REPLACING, AbsorptionStage.REPLACED]
            ]),
            "total_replaced": len([
                s for s in self.absorption_status.values()
                if s == AbsorptionStage.REPLACED
            ])
        }
    
    def _estimate_savings(self, connector: SaaSConnector) -> int:
        """월 절약 비용 추정"""
        # 대략적인 SaaS 월 비용
        cost_estimates = {
            "toss_pos": 50000,
            "kakao_pos": 30000,
            "baemin_pos": 88000,
            "naver_booking": 30000,
            "table_manager": 50000,
            "gym_system": 100000,
            "quickbooks": 50000,
            "xero": 40000
        }
        return cost_estimates.get(connector.saas_type, 50000)


# 글로벌 인스턴스
absorber = ParasiticAbsorber()



# backend/parasitic/absorber.py
# Parasitic Flywheel Absorption - 기존 SaaS 기생 → 흡수 → 대체

from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import asyncio

class AbsorptionStage(Enum):
    """흡수 단계"""
    PARASITIC = "parasitic"      # 기생: 연동만, 데이터 미러링
    ABSORBING = "absorbing"      # 흡수: 기능 복제 시작
    REPLACING = "replacing"      # 대체: 기존 시스템 비활성화 준비
    REPLACED = "replaced"        # 완료: 완전 대체

class SaaSConnector:
    """
    기존 SaaS 연동 커넥터
    
    지원 시스템:
    - POS: 토스, 카카오페이, 배민포스
    - 예약: 네이버예약, 카카오예약, 테이블매니저
    - 회원: 짐앤짐, 에이블리, 자체 DB
    - 회계: 퀵북스, 제로, 더존
    """
    
    SUPPORTED_SAAS = {
        # POS 시스템
        "toss_pos": {
            "name": "토스 POS",
            "webhook": True,
            "api": True,
            "data_types": ["payments", "refunds", "daily_summary"]
        },
        "kakao_pos": {
            "name": "카카오페이 POS",
            "webhook": True,
            "api": True,
            "data_types": ["payments", "refunds"]
        },
        "baemin_pos": {
            "name": "배민포스",
            "webhook": False,
            "api": True,
            "data_types": ["orders", "payments", "menu"]
        },
        
        # 예약 시스템
        "naver_booking": {
            "name": "네이버예약",
            "webhook": True,
            "api": True,
            "data_types": ["reservations", "customers", "reviews"]
        },
        "table_manager": {
            "name": "테이블매니저",
            "webhook": True,
            "api": True,
            "data_types": ["reservations", "tables", "waitlist"]
        },
        
        # 회원 관리
        "gym_system": {
            "name": "짐앤짐",
            "webhook": False,
            "api": True,
            "data_types": ["members", "attendance", "payments"]
        },
        
        # 회계
        "quickbooks": {
            "name": "QuickBooks",
            "webhook": True,
            "api": True,
            "data_types": ["invoices", "payments", "expenses", "customers"]
        },
        "xero": {
            "name": "Xero",
            "webhook": True,
            "api": True,
            "data_types": ["invoices", "payments", "contacts"]
        }
    }
    
    def __init__(self, saas_type: str, credentials: Dict):
        self.saas_type = saas_type
        self.credentials = credentials
        self.config = self.SUPPORTED_SAAS.get(saas_type, {})
        self.stage = AbsorptionStage.PARASITIC
        self.absorbed_data = {}
        self.sync_count = 0
    
    async def connect(self) -> bool:
        """연결 테스트"""
        # TODO: 실제 API 연결
        return True
    
    async def sync_data(self, data_type: str) -> List[Dict]:
        """데이터 동기화 (기생 단계)"""
        if data_type not in self.config.get('data_types', []):
            return []
        
        # TODO: 실제 API 호출
        # 여기서는 Mock 데이터
        self.sync_count += 1
        return []


class ParasiticAbsorber:
    """
    Parasitic Flywheel Absorption 엔진
    
    단계:
    1. PARASITIC (기생): Webhook/API로 실시간 데이터 미러링
    2. ABSORBING (흡수): 기능 복제 + 데이터 100% 이전
    3. REPLACING (대체): 기존 시스템 비활성화 준비
    4. REPLACED (완료): 완전 대체
    """
    
    def __init__(self):
        self.connectors: Dict[str, SaaSConnector] = {}
        self.absorption_status: Dict[str, AbsorptionStage] = {}
        self.data_store: Dict[str, List[Dict]] = {}
    
    def add_connector(self, saas_type: str, credentials: Dict) -> str:
        """SaaS 커넥터 추가"""
        connector_id = f"{saas_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.connectors[connector_id] = SaaSConnector(saas_type, credentials)
        self.absorption_status[connector_id] = AbsorptionStage.PARASITIC
        return connector_id
    
    async def start_parasitic(self, connector_id: str) -> Dict:
        """
        기생 시작 - 데이터 미러링
        
        초기 비용: 0 (Webhook 수신만)
        효과: 실시간 데이터 흡수
        """
        connector = self.connectors.get(connector_id)
        if not connector:
            return {"success": False, "error": "Connector not found"}
        
        # Webhook 설정 또는 폴링 시작
        connected = await connector.connect()
        
        if connected:
            self.absorption_status[connector_id] = AbsorptionStage.PARASITIC
            return {
                "success": True,
                "stage": "PARASITIC",
                "message": f"기생 시작: {connector.config.get('name', connector_id)}",
                "data_types": connector.config.get('data_types', [])
            }
        
        return {"success": False, "error": "Connection failed"}
    
    async def absorb_data(self, connector_id: str) -> Dict:
        """
        흡수 단계 - 데이터 + 기능 복제
        
        조건: 동기화 10회 이상 완료
        효과: AUTUS로 데이터 완전 이전
        """
        connector = self.connectors.get(connector_id)
        if not connector:
            return {"success": False, "error": "Connector not found"}
        
        if connector.sync_count < 10:
            return {
                "success": False,
                "error": f"동기화 부족: {connector.sync_count}/10",
                "stage": "PARASITIC"
            }
        
        # 전체 데이터 동기화
        absorbed = {}
        for data_type in connector.config.get('data_types', []):
            data = await connector.sync_data(data_type)
            absorbed[data_type] = len(data)
            self.data_store[f"{connector_id}_{data_type}"] = data
        
        self.absorption_status[connector_id] = AbsorptionStage.ABSORBING
        
        return {
            "success": True,
            "stage": "ABSORBING",
            "message": "흡수 중: 데이터 이전 진행",
            "absorbed_counts": absorbed
        }
    
    async def prepare_replacement(self, connector_id: str) -> Dict:
        """
        대체 준비 - 기존 시스템 비활성화 안내
        
        조건: 흡수 완료 + 사용자 확인
        효과: 기존 SaaS 구독 해지 안내
        """
        if self.absorption_status.get(connector_id) != AbsorptionStage.ABSORBING:
            return {"success": False, "error": "흡수 단계 미완료"}
        
        connector = self.connectors.get(connector_id)
        
        self.absorption_status[connector_id] = AbsorptionStage.REPLACING
        
        return {
            "success": True,
            "stage": "REPLACING",
            "message": f"대체 준비 완료: {connector.config.get('name', '')}",
            "actions": [
                f"1. {connector.config.get('name', '')} 구독 해지 예약",
                "2. AUTUS로 전체 전환 확인",
                "3. 기존 시스템 데이터 백업",
                "4. 최종 전환 실행"
            ],
            "estimated_monthly_savings": self._estimate_savings(connector)
        }
    
    async def complete_replacement(self, connector_id: str) -> Dict:
        """
        대체 완료 - 완전 전환
        """
        if self.absorption_status.get(connector_id) != AbsorptionStage.REPLACING:
            return {"success": False, "error": "대체 준비 미완료"}
        
        self.absorption_status[connector_id] = AbsorptionStage.REPLACED
        
        return {
            "success": True,
            "stage": "REPLACED",
            "message": "🎉 완전 대체 완료!",
            "benefits": [
                "기존 SaaS 비용 100% 절감",
                "데이터 통합 완료",
                "AUTUS 단일 엔진 운영"
            ]
        }
    
    def get_absorption_status(self) -> Dict:
        """전체 흡수 상태"""
        return {
            "connectors": {
                cid: {
                    "type": c.saas_type,
                    "name": c.config.get('name', ''),
                    "stage": self.absorption_status.get(cid, AbsorptionStage.PARASITIC).value,
                    "sync_count": c.sync_count
                }
                for cid, c in self.connectors.items()
            },
            "total_absorbed": len([
                s for s in self.absorption_status.values()
                if s in [AbsorptionStage.ABSORBING, AbsorptionStage.REPLACING, AbsorptionStage.REPLACED]
            ]),
            "total_replaced": len([
                s for s in self.absorption_status.values()
                if s == AbsorptionStage.REPLACED
            ])
        }
    
    def _estimate_savings(self, connector: SaaSConnector) -> int:
        """월 절약 비용 추정"""
        # 대략적인 SaaS 월 비용
        cost_estimates = {
            "toss_pos": 50000,
            "kakao_pos": 30000,
            "baemin_pos": 88000,
            "naver_booking": 30000,
            "table_manager": 50000,
            "gym_system": 100000,
            "quickbooks": 50000,
            "xero": 40000
        }
        return cost_estimates.get(connector.saas_type, 50000)


# 글로벌 인스턴스
absorber = ParasiticAbsorber()








