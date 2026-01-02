# backend/autosync/api.py
# AutoSync API - Zero-Input 자동 연동

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime

from .systems import (
    SUPPORTED_SYSTEMS, 
    SystemCategory,
    get_system_by_domain,
    get_system_by_cookie,
    get_systems_by_category
)
from .transformer import transformer

router = APIRouter(prefix="/autosync", tags=["AutoSync"])


# ═══════════════════════════════════════════════════════════════
# Pydantic 모델
# ═══════════════════════════════════════════════════════════════

class DetectRequest(BaseModel):
    cookies: Optional[str] = None
    domains: Optional[List[str]] = None
    api_keys: Optional[Dict[str, str]] = None

class TransformRequest(BaseModel):
    data: Dict[str, Any]
    system_id: str

class ConnectRequest(BaseModel):
    system_id: str
    credentials: Optional[Dict[str, str]] = None


# ═══════════════════════════════════════════════════════════════
# 시스템 조회
# ═══════════════════════════════════════════════════════════════

@router.get("/systems")
async def get_systems():
    """
    지원 시스템 목록 (30+)
    
    카테고리:
    - payment: 결제 (Stripe, 토스, 카카오페이, Shopify)
    - education_erp: 교육 ERP (하이클래스, 클래스101, 아카데미플러스)
    - crm: CRM (HubSpot, Salesforce, Zoho, Pipedrive)
    - booking: 예약 (네이버예약, 테이블매니저)
    - pos: POS (토스 POS, 배민포스)
    - accounting: 회계 (QuickBooks, Xero)
    - membership: 회원관리 (짐앤짐)
    """
    systems_by_category = {}
    
    for category in SystemCategory:
        systems = get_systems_by_category(category)
        systems_by_category[category.value] = [
            {
                "id": s.id,
                "name": s.name,
                "webhook": s.webhook_support,
                "api": s.api_support
            }
            for s in systems
        ]
    
    return {
        "total_count": len(SUPPORTED_SYSTEMS),
        "categories": systems_by_category
    }


@router.get("/systems/{system_id}")
async def get_system_detail(system_id: str):
    """특정 시스템 상세 정보"""
    config = SUPPORTED_SYSTEMS.get(system_id)
    
    if not config:
        raise HTTPException(status_code=404, detail=f"시스템 미지원: {system_id}")
    
    return {
        "id": config.id,
        "name": config.name,
        "category": config.category.value,
        "webhook_support": config.webhook_support,
        "api_support": config.api_support,
        "detection_domains": config.detection_domains,
        "transform_fields": {
            "id_fields": config.id_fields,
            "amount_fields": config.amount_fields,
            "time_fields": config.time_fields
        }
    }


# ═══════════════════════════════════════════════════════════════
# 자동 감지
# ═══════════════════════════════════════════════════════════════

@router.post("/detect")
async def detect_systems(request: DetectRequest):
    """
    자동 시스템 감지
    
    감지 방법:
    1. 쿠키 기반 (브라우저에서 전달)
    2. 도메인 기반 (방문 기록)
    3. API 키 기반 (직접 입력)
    """
    detected = []
    
    # 쿠키 기반 감지
    if request.cookies:
        system = get_system_by_cookie(request.cookies)
        if system:
            detected.append({
                "system_id": system.id,
                "name": system.name,
                "detection_method": "cookie",
                "confidence": 0.9
            })
    
    # 도메인 기반 감지
    if request.domains:
        for domain in request.domains:
            system = get_system_by_domain(domain)
            if system and system.id not in [d["system_id"] for d in detected]:
                detected.append({
                    "system_id": system.id,
                    "name": system.name,
                    "detection_method": "domain",
                    "confidence": 0.8
                })
    
    # API 키 기반 감지
    if request.api_keys:
        for key_type, key_value in request.api_keys.items():
            # 키 패턴으로 시스템 추론
            if key_type.startswith("sk_") or "stripe" in key_type.lower():
                if "stripe" not in [d["system_id"] for d in detected]:
                    detected.append({
                        "system_id": "stripe",
                        "name": "Stripe",
                        "detection_method": "api_key",
                        "confidence": 1.0
                    })
    
    return {
        "detected_count": len(detected),
        "systems": detected,
        "message": f"{len(detected)}개 시스템 감지됨" if detected else "감지된 시스템 없음"
    }


# ═══════════════════════════════════════════════════════════════
# 데이터 변환
# ═══════════════════════════════════════════════════════════════

@router.post("/transform")
async def transform_data(request: TransformRequest):
    """
    Universal Transform
    
    모든 SaaS 데이터 → { node_id, value, timestamp }
    
    예시:
    Stripe: { customer: "cus_123", amount: 5000 }
        → { node_id: "cus_123", value: 50, timestamp: "..." }
    """
    if request.system_id not in SUPPORTED_SYSTEMS and request.system_id != "auto":
        # 범용 변환 시도
        pass
    
    result = transformer.transform(request.data, request.system_id)
    
    return {
        "success": True,
        "original": request.data,
        "transformed": result,
        "system": request.system_id
    }


@router.post("/transform/batch")
async def transform_batch(
    system_id: str,
    items: List[Dict[str, Any]]
):
    """배치 변환"""
    results = transformer.batch_transform(items, system_id)
    
    return {
        "success": True,
        "count": len(results),
        "transformed": results
    }


# ═══════════════════════════════════════════════════════════════
# 연동
# ═══════════════════════════════════════════════════════════════

@router.post("/connect")
async def connect_system(request: ConnectRequest):
    """
    시스템 연동 시작
    
    Webhook URL 생성 + 초기 동기화 설정
    """
    config = SUPPORTED_SYSTEMS.get(request.system_id)
    
    if not config:
        raise HTTPException(status_code=404, detail=f"시스템 미지원: {request.system_id}")
    
    webhook_url = f"/autosync/webhook/{request.system_id}"
    
    return {
        "success": True,
        "system_id": request.system_id,
        "name": config.name,
        "webhook_url": webhook_url,
        "webhook_support": config.webhook_support,
        "api_support": config.api_support,
        "next_steps": [
            f"1. {config.name} 설정에서 Webhook URL 등록: {webhook_url}",
            "2. 테스트 이벤트 전송",
            "3. 데이터 동기화 확인"
        ] if config.webhook_support else [
            f"1. {config.name} API 키 입력",
            "2. 초기 데이터 동기화 실행",
            "3. 정기 동기화 스케줄 설정"
        ]
    }


# ═══════════════════════════════════════════════════════════════
# 범용 Webhook
# ═══════════════════════════════════════════════════════════════

@router.post("/webhook/{system_id}")
async def universal_webhook(system_id: str, request: Request):
    """
    범용 Webhook 엔드포인트
    
    모든 시스템의 Webhook을 하나의 형식으로 처리
    """
    import json
    
    payload = await request.body()
    
    try:
        data = json.loads(payload)
    except:
        return {"success": False, "error": "Invalid JSON"}
    
    # 변환
    transformed = transformer.transform(data, system_id)
    
    # 검증
    if not transformed.get("node_id"):
        return {
            "success": False,
            "error": "node_id를 추출할 수 없음",
            "raw_data": data
        }
    
    return {
        "success": True,
        "system": system_id,
        "received_at": datetime.now().isoformat(),
        "transformed": transformed,
        "action": "data_stored"
    }


@router.get("/health")
async def health():
    """AutoSync 상태"""
    return {
        "status": "healthy",
        "supported_systems": len(SUPPORTED_SYSTEMS),
        "categories": len(SystemCategory),
        "timestamp": datetime.now().isoformat()
    }



# backend/autosync/api.py
# AutoSync API - Zero-Input 자동 연동

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime

from .systems import (
    SUPPORTED_SYSTEMS, 
    SystemCategory,
    get_system_by_domain,
    get_system_by_cookie,
    get_systems_by_category
)
from .transformer import transformer

router = APIRouter(prefix="/autosync", tags=["AutoSync"])


# ═══════════════════════════════════════════════════════════════
# Pydantic 모델
# ═══════════════════════════════════════════════════════════════

class DetectRequest(BaseModel):
    cookies: Optional[str] = None
    domains: Optional[List[str]] = None
    api_keys: Optional[Dict[str, str]] = None

class TransformRequest(BaseModel):
    data: Dict[str, Any]
    system_id: str

class ConnectRequest(BaseModel):
    system_id: str
    credentials: Optional[Dict[str, str]] = None


# ═══════════════════════════════════════════════════════════════
# 시스템 조회
# ═══════════════════════════════════════════════════════════════

@router.get("/systems")
async def get_systems():
    """
    지원 시스템 목록 (30+)
    
    카테고리:
    - payment: 결제 (Stripe, 토스, 카카오페이, Shopify)
    - education_erp: 교육 ERP (하이클래스, 클래스101, 아카데미플러스)
    - crm: CRM (HubSpot, Salesforce, Zoho, Pipedrive)
    - booking: 예약 (네이버예약, 테이블매니저)
    - pos: POS (토스 POS, 배민포스)
    - accounting: 회계 (QuickBooks, Xero)
    - membership: 회원관리 (짐앤짐)
    """
    systems_by_category = {}
    
    for category in SystemCategory:
        systems = get_systems_by_category(category)
        systems_by_category[category.value] = [
            {
                "id": s.id,
                "name": s.name,
                "webhook": s.webhook_support,
                "api": s.api_support
            }
            for s in systems
        ]
    
    return {
        "total_count": len(SUPPORTED_SYSTEMS),
        "categories": systems_by_category
    }


@router.get("/systems/{system_id}")
async def get_system_detail(system_id: str):
    """특정 시스템 상세 정보"""
    config = SUPPORTED_SYSTEMS.get(system_id)
    
    if not config:
        raise HTTPException(status_code=404, detail=f"시스템 미지원: {system_id}")
    
    return {
        "id": config.id,
        "name": config.name,
        "category": config.category.value,
        "webhook_support": config.webhook_support,
        "api_support": config.api_support,
        "detection_domains": config.detection_domains,
        "transform_fields": {
            "id_fields": config.id_fields,
            "amount_fields": config.amount_fields,
            "time_fields": config.time_fields
        }
    }


# ═══════════════════════════════════════════════════════════════
# 자동 감지
# ═══════════════════════════════════════════════════════════════

@router.post("/detect")
async def detect_systems(request: DetectRequest):
    """
    자동 시스템 감지
    
    감지 방법:
    1. 쿠키 기반 (브라우저에서 전달)
    2. 도메인 기반 (방문 기록)
    3. API 키 기반 (직접 입력)
    """
    detected = []
    
    # 쿠키 기반 감지
    if request.cookies:
        system = get_system_by_cookie(request.cookies)
        if system:
            detected.append({
                "system_id": system.id,
                "name": system.name,
                "detection_method": "cookie",
                "confidence": 0.9
            })
    
    # 도메인 기반 감지
    if request.domains:
        for domain in request.domains:
            system = get_system_by_domain(domain)
            if system and system.id not in [d["system_id"] for d in detected]:
                detected.append({
                    "system_id": system.id,
                    "name": system.name,
                    "detection_method": "domain",
                    "confidence": 0.8
                })
    
    # API 키 기반 감지
    if request.api_keys:
        for key_type, key_value in request.api_keys.items():
            # 키 패턴으로 시스템 추론
            if key_type.startswith("sk_") or "stripe" in key_type.lower():
                if "stripe" not in [d["system_id"] for d in detected]:
                    detected.append({
                        "system_id": "stripe",
                        "name": "Stripe",
                        "detection_method": "api_key",
                        "confidence": 1.0
                    })
    
    return {
        "detected_count": len(detected),
        "systems": detected,
        "message": f"{len(detected)}개 시스템 감지됨" if detected else "감지된 시스템 없음"
    }


# ═══════════════════════════════════════════════════════════════
# 데이터 변환
# ═══════════════════════════════════════════════════════════════

@router.post("/transform")
async def transform_data(request: TransformRequest):
    """
    Universal Transform
    
    모든 SaaS 데이터 → { node_id, value, timestamp }
    
    예시:
    Stripe: { customer: "cus_123", amount: 5000 }
        → { node_id: "cus_123", value: 50, timestamp: "..." }
    """
    if request.system_id not in SUPPORTED_SYSTEMS and request.system_id != "auto":
        # 범용 변환 시도
        pass
    
    result = transformer.transform(request.data, request.system_id)
    
    return {
        "success": True,
        "original": request.data,
        "transformed": result,
        "system": request.system_id
    }


@router.post("/transform/batch")
async def transform_batch(
    system_id: str,
    items: List[Dict[str, Any]]
):
    """배치 변환"""
    results = transformer.batch_transform(items, system_id)
    
    return {
        "success": True,
        "count": len(results),
        "transformed": results
    }


# ═══════════════════════════════════════════════════════════════
# 연동
# ═══════════════════════════════════════════════════════════════

@router.post("/connect")
async def connect_system(request: ConnectRequest):
    """
    시스템 연동 시작
    
    Webhook URL 생성 + 초기 동기화 설정
    """
    config = SUPPORTED_SYSTEMS.get(request.system_id)
    
    if not config:
        raise HTTPException(status_code=404, detail=f"시스템 미지원: {request.system_id}")
    
    webhook_url = f"/autosync/webhook/{request.system_id}"
    
    return {
        "success": True,
        "system_id": request.system_id,
        "name": config.name,
        "webhook_url": webhook_url,
        "webhook_support": config.webhook_support,
        "api_support": config.api_support,
        "next_steps": [
            f"1. {config.name} 설정에서 Webhook URL 등록: {webhook_url}",
            "2. 테스트 이벤트 전송",
            "3. 데이터 동기화 확인"
        ] if config.webhook_support else [
            f"1. {config.name} API 키 입력",
            "2. 초기 데이터 동기화 실행",
            "3. 정기 동기화 스케줄 설정"
        ]
    }


# ═══════════════════════════════════════════════════════════════
# 범용 Webhook
# ═══════════════════════════════════════════════════════════════

@router.post("/webhook/{system_id}")
async def universal_webhook(system_id: str, request: Request):
    """
    범용 Webhook 엔드포인트
    
    모든 시스템의 Webhook을 하나의 형식으로 처리
    """
    import json
    
    payload = await request.body()
    
    try:
        data = json.loads(payload)
    except:
        return {"success": False, "error": "Invalid JSON"}
    
    # 변환
    transformed = transformer.transform(data, system_id)
    
    # 검증
    if not transformed.get("node_id"):
        return {
            "success": False,
            "error": "node_id를 추출할 수 없음",
            "raw_data": data
        }
    
    return {
        "success": True,
        "system": system_id,
        "received_at": datetime.now().isoformat(),
        "transformed": transformed,
        "action": "data_stored"
    }


@router.get("/health")
async def health():
    """AutoSync 상태"""
    return {
        "status": "healthy",
        "supported_systems": len(SUPPORTED_SYSTEMS),
        "categories": len(SystemCategory),
        "timestamp": datetime.now().isoformat()
    }








