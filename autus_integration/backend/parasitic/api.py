# backend/parasitic/api.py
# Parasitic Absorption API

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional, List
from datetime import datetime
from .absorber import absorber, AbsorptionStage

router = APIRouter(prefix="/parasitic", tags=["Parasitic Absorption"])

class ConnectorRequest(BaseModel):
    saas_type: str
    credentials: Optional[Dict] = {}

class ConnectorResponse(BaseModel):
    success: bool
    connector_id: Optional[str] = None
    stage: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None

@router.get("/supported")
async def get_supported_saas():
    """지원하는 SaaS 목록"""
    from .absorber import SaaSConnector
    return {
        "supported": [
            {
                "type": k,
                "name": v["name"],
                "webhook": v["webhook"],
                "api": v["api"],
                "data_types": v["data_types"]
            }
            for k, v in SaaSConnector.SUPPORTED_SAAS.items()
        ]
    }

@router.post("/connect", response_model=ConnectorResponse)
async def connect_saas(request: ConnectorRequest):
    """
    SaaS 연동 시작 (기생 단계)
    
    지원:
    - toss_pos, kakao_pos, baemin_pos
    - naver_booking, table_manager
    - quickbooks, xero
    """
    try:
        connector_id = absorber.add_connector(
            request.saas_type,
            request.credentials
        )
        
        result = await absorber.start_parasitic(connector_id)
        
        return ConnectorResponse(
            success=result["success"],
            connector_id=connector_id,
            stage=result.get("stage"),
            message=result.get("message"),
            error=result.get("error")
        )
    except Exception as e:
        return ConnectorResponse(
            success=False,
            error=str(e)
        )

@router.post("/absorb/{connector_id}")
async def start_absorption(connector_id: str):
    """
    흡수 단계 시작
    
    조건: 동기화 10회 이상
    """
    result = await absorber.absorb_data(connector_id)
    return result

@router.post("/replace/{connector_id}")
async def prepare_replacement(connector_id: str):
    """
    대체 준비
    
    기존 SaaS 구독 해지 안내
    """
    result = await absorber.prepare_replacement(connector_id)
    return result

@router.post("/complete/{connector_id}")
async def complete_replacement(connector_id: str):
    """
    대체 완료
    
    AUTUS 단일 엔진 전환
    """
    result = await absorber.complete_replacement(connector_id)
    return result

@router.get("/status")
async def get_status():
    """전체 흡수 상태"""
    return absorber.get_absorption_status()

@router.get("/status/{connector_id}")
async def get_connector_status(connector_id: str):
    """특정 커넥터 상태"""
    status = absorber.get_absorption_status()
    connector = status["connectors"].get(connector_id)
    
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    return connector

@router.get("/flywheel")
async def get_flywheel_status():
    """
    Parasitic Flywheel 상태
    
    단계별 진행 상황 + 예상 효과
    """
    status = absorber.get_absorption_status()
    
    total = len(status["connectors"])
    absorbed = status["total_absorbed"]
    replaced = status["total_replaced"]
    
    # 예상 절약 계산
    monthly_savings = replaced * 50000  # 대체당 평균 5만원
    
    # 플라이휠 가속 계수
    flywheel_multiplier = 1 + (absorbed * 0.1) + (replaced * 0.2)
    
    return {
        "stages": {
            "parasitic": total - absorbed,
            "absorbing": absorbed - replaced,
            "replaced": replaced
        },
        "progress_percent": (replaced / total * 100) if total > 0 else 0,
        "flywheel_multiplier": flywheel_multiplier,
        "monthly_savings": monthly_savings,
        "projected_12month_savings": monthly_savings * 12 * flywheel_multiplier,
        "message": _get_flywheel_message(total, absorbed, replaced)
    }

def _get_flywheel_message(total: int, absorbed: int, replaced: int) -> str:
    """플라이휠 상태 메시지"""
    if replaced == total and total > 0:
        return "🎉 완전 대체 완료! 모든 SaaS가 AUTUS로 통합됨"
    elif absorbed > 0:
        return f"🔄 흡수 진행 중: {absorbed}개 시스템 데이터 이전"
    elif total > 0:
        return f"🔗 기생 중: {total}개 시스템 연동됨"
    else:
        return "⏳ SaaS 연동을 시작하세요"



# backend/parasitic/api.py
# Parasitic Absorption API

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional, List
from datetime import datetime
from .absorber import absorber, AbsorptionStage

router = APIRouter(prefix="/parasitic", tags=["Parasitic Absorption"])

class ConnectorRequest(BaseModel):
    saas_type: str
    credentials: Optional[Dict] = {}

class ConnectorResponse(BaseModel):
    success: bool
    connector_id: Optional[str] = None
    stage: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None

@router.get("/supported")
async def get_supported_saas():
    """지원하는 SaaS 목록"""
    from .absorber import SaaSConnector
    return {
        "supported": [
            {
                "type": k,
                "name": v["name"],
                "webhook": v["webhook"],
                "api": v["api"],
                "data_types": v["data_types"]
            }
            for k, v in SaaSConnector.SUPPORTED_SAAS.items()
        ]
    }

@router.post("/connect", response_model=ConnectorResponse)
async def connect_saas(request: ConnectorRequest):
    """
    SaaS 연동 시작 (기생 단계)
    
    지원:
    - toss_pos, kakao_pos, baemin_pos
    - naver_booking, table_manager
    - quickbooks, xero
    """
    try:
        connector_id = absorber.add_connector(
            request.saas_type,
            request.credentials
        )
        
        result = await absorber.start_parasitic(connector_id)
        
        return ConnectorResponse(
            success=result["success"],
            connector_id=connector_id,
            stage=result.get("stage"),
            message=result.get("message"),
            error=result.get("error")
        )
    except Exception as e:
        return ConnectorResponse(
            success=False,
            error=str(e)
        )

@router.post("/absorb/{connector_id}")
async def start_absorption(connector_id: str):
    """
    흡수 단계 시작
    
    조건: 동기화 10회 이상
    """
    result = await absorber.absorb_data(connector_id)
    return result

@router.post("/replace/{connector_id}")
async def prepare_replacement(connector_id: str):
    """
    대체 준비
    
    기존 SaaS 구독 해지 안내
    """
    result = await absorber.prepare_replacement(connector_id)
    return result

@router.post("/complete/{connector_id}")
async def complete_replacement(connector_id: str):
    """
    대체 완료
    
    AUTUS 단일 엔진 전환
    """
    result = await absorber.complete_replacement(connector_id)
    return result

@router.get("/status")
async def get_status():
    """전체 흡수 상태"""
    return absorber.get_absorption_status()

@router.get("/status/{connector_id}")
async def get_connector_status(connector_id: str):
    """특정 커넥터 상태"""
    status = absorber.get_absorption_status()
    connector = status["connectors"].get(connector_id)
    
    if not connector:
        raise HTTPException(status_code=404, detail="Connector not found")
    
    return connector

@router.get("/flywheel")
async def get_flywheel_status():
    """
    Parasitic Flywheel 상태
    
    단계별 진행 상황 + 예상 효과
    """
    status = absorber.get_absorption_status()
    
    total = len(status["connectors"])
    absorbed = status["total_absorbed"]
    replaced = status["total_replaced"]
    
    # 예상 절약 계산
    monthly_savings = replaced * 50000  # 대체당 평균 5만원
    
    # 플라이휠 가속 계수
    flywheel_multiplier = 1 + (absorbed * 0.1) + (replaced * 0.2)
    
    return {
        "stages": {
            "parasitic": total - absorbed,
            "absorbing": absorbed - replaced,
            "replaced": replaced
        },
        "progress_percent": (replaced / total * 100) if total > 0 else 0,
        "flywheel_multiplier": flywheel_multiplier,
        "monthly_savings": monthly_savings,
        "projected_12month_savings": monthly_savings * 12 * flywheel_multiplier,
        "message": _get_flywheel_message(total, absorbed, replaced)
    }

def _get_flywheel_message(total: int, absorbed: int, replaced: int) -> str:
    """플라이휠 상태 메시지"""
    if replaced == total and total > 0:
        return "🎉 완전 대체 완료! 모든 SaaS가 AUTUS로 통합됨"
    elif absorbed > 0:
        return f"🔄 흡수 진행 중: {absorbed}개 시스템 데이터 이전"
    elif total > 0:
        return f"🔗 기생 중: {total}개 시스템 연동됨"
    else:
        return "⏳ SaaS 연동을 시작하세요"









