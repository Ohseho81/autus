"""
AUTUS Integration Router v14.0
================================
OAuth 연동 및 데이터 수집 API
"""

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

from integrations.oauth_manager import (
    OAuthProvider,
    get_oauth_manager
)
from integrations.data_hub import (
    DataType,
    get_data_hub
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integration", tags=["Integration"])

# ============================================
# Models
# ============================================

class ConnectRequest(BaseModel):
    provider: str
    user_id: str = "default"

class DataRequest(BaseModel):
    user_id: str = "default"
    data_type: Optional[str] = None
    provider: Optional[str] = None

class SearchRequest(BaseModel):
    user_id: str = "default"
    query: str
    data_type: Optional[str] = None

# ============================================
# OAuth Endpoints
# ============================================

@router.get("/providers")
async def list_providers():
    """
    지원하는 OAuth Provider 목록
    """
    providers = []
    
    for p in OAuthProvider:
        providers.append({
            "id": p.value,
            "name": p.value.title(),
            "icon": get_provider_icon(p),
            "description": get_provider_description(p)
        })
    
    return {"providers": providers}

@router.post("/connect")
async def initiate_connection(request: ConnectRequest):
    """
    OAuth 연결 시작 - 인증 URL 반환
    """
    try:
        provider = OAuthProvider(request.provider)
    except ValueError:
        raise HTTPException(400, f"Unknown provider: {request.provider}")
    
    oauth = get_oauth_manager()
    auth_url = oauth.get_auth_url(provider, request.user_id)
    
    return {
        "auth_url": auth_url,
        "provider": provider.value,
        "message": "이 URL로 이동하여 인증을 완료하세요"
    }

@router.get("/callback/{provider}")
async def oauth_callback(
    provider: str,
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = None
):
    """
    OAuth 콜백 처리
    """
    if error:
        return RedirectResponse(f"/integrations?error={error}")
    
    try:
        provider_enum = OAuthProvider(provider)
    except ValueError:
        return RedirectResponse(f"/integrations?error=unknown_provider")
    
    oauth = get_oauth_manager()
    token = await oauth.exchange_code(provider_enum, code, state)
    
    if not token:
        return RedirectResponse(f"/integrations?error=token_exchange_failed")
    
    # 성공 시 프론트엔드로 리다이렉트
    return RedirectResponse(f"/integrations?success={provider}&connected=true")

@router.get("/status/{user_id}")
async def get_connection_status(user_id: str = "default"):
    """
    사용자의 연결 상태 확인
    """
    oauth = get_oauth_manager()
    connected = oauth.get_connected_providers(user_id)
    
    all_providers = []
    for p in OAuthProvider:
        all_providers.append({
            "id": p.value,
            "name": p.value.title(),
            "connected": p in connected,
            "icon": get_provider_icon(p)
        })
    
    return {
        "user_id": user_id,
        "connected_count": len(connected),
        "total_count": len(OAuthProvider),
        "providers": all_providers
    }

@router.post("/disconnect")
async def disconnect_provider(request: ConnectRequest):
    """
    연결 해제
    """
    try:
        provider = OAuthProvider(request.provider)
    except ValueError:
        raise HTTPException(400, f"Unknown provider: {request.provider}")
    
    oauth = get_oauth_manager()
    result = oauth.disconnect(request.user_id, provider)
    
    return {
        "success": result,
        "message": f"{provider.value} 연결이 해제되었습니다" if result else "연결된 서비스가 없습니다"
    }

# ============================================
# Data Collection Endpoints
# ============================================

@router.post("/sync")
async def sync_all_data(user_id: str = "default"):
    """
    모든 연동 서비스에서 데이터 동기화
    """
    hub = get_data_hub()
    
    try:
        data = await hub.collect_all(user_id)
        summary = hub.get_summary(user_id)
        
        return {
            "success": True,
            "synced_count": len(data),
            "summary": summary,
            "message": f"{len(data)}개 데이터 동기화 완료"
        }
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        raise HTTPException(500, f"동기화 실패: {str(e)}")

@router.post("/sync/{provider}")
async def sync_provider_data(provider: str, user_id: str = "default"):
    """
    특정 서비스에서만 데이터 동기화
    """
    try:
        provider_enum = OAuthProvider(provider)
    except ValueError:
        raise HTTPException(400, f"Unknown provider: {provider}")
    
    hub = get_data_hub()
    
    try:
        data = await hub.collect_by_provider(user_id, provider_enum)
        
        return {
            "success": True,
            "provider": provider,
            "synced_count": len(data),
            "data": [serialize_data(d) for d in data[:20]]  # 20개만
        }
    except Exception as e:
        logger.error(f"Sync failed for {provider}: {e}")
        raise HTTPException(500, f"동기화 실패: {str(e)}")

@router.get("/data")
async def get_data(
    user_id: str = "default",
    data_type: Optional[str] = None,
    limit: int = 50
):
    """
    수집된 데이터 조회
    """
    hub = get_data_hub()
    data = hub.get_cached(user_id)
    
    if data_type:
        try:
            dt = DataType(data_type)
            data = [d for d in data if d.type == dt]
        except ValueError:
            pass
    
    return {
        "total": len(data),
        "data": [serialize_data(d) for d in data[:limit]]
    }

@router.post("/search")
async def search_data(request: SearchRequest):
    """
    데이터 검색
    """
    hub = get_data_hub()
    
    data_type = None
    if request.data_type:
        try:
            data_type = DataType(request.data_type)
        except ValueError:
            pass
    
    results = hub.search(request.user_id, request.query, data_type)
    
    return {
        "query": request.query,
        "count": len(results),
        "results": [serialize_data(d) for d in results[:30]]
    }

@router.get("/summary/{user_id}")
async def get_data_summary(user_id: str = "default"):
    """
    데이터 요약
    """
    hub = get_data_hub()
    summary = hub.get_summary(user_id)
    
    return summary

# ============================================
# Data Types
# ============================================

@router.get("/data-types")
async def list_data_types():
    """
    지원하는 데이터 타입
    """
    return {
        "types": [
            {"id": "email", "name": "이메일", "icon": "📧"},
            {"id": "calendar", "name": "캘린더", "icon": "📅"},
            {"id": "message", "name": "메시지", "icon": "💬"},
            {"id": "document", "name": "문서", "icon": "📄"},
            {"id": "task", "name": "할일", "icon": "✅"},
            {"id": "contact", "name": "연락처", "icon": "👤"},
            {"id": "transaction", "name": "결제", "icon": "💳"},
            {"id": "code", "name": "코드", "icon": "💻"},
        ]
    }

# ============================================
# Helpers
# ============================================

def get_provider_icon(provider: OAuthProvider) -> str:
    icons = {
        OAuthProvider.GOOGLE: "🔵",
        OAuthProvider.MICROSOFT: "🟦",
        OAuthProvider.SLACK: "💜",
        OAuthProvider.NOTION: "⬛",
        OAuthProvider.GITHUB: "🐙",
        OAuthProvider.STRIPE: "💳",
        OAuthProvider.SHOPIFY: "🛍️",
        OAuthProvider.DISCORD: "🎮",
        OAuthProvider.DROPBOX: "📦",
        OAuthProvider.ZOOM: "📹",
        OAuthProvider.HUBSPOT: "🧡",
        OAuthProvider.SALESFORCE: "☁️",
        OAuthProvider.KAKAO: "💛",
        OAuthProvider.NAVER: "💚",
        OAuthProvider.TOSS: "🔷",
    }
    return icons.get(provider, "🔗")

def get_provider_description(provider: OAuthProvider) -> str:
    descriptions = {
        OAuthProvider.GOOGLE: "Gmail, Calendar, Drive, Sheets",
        OAuthProvider.MICROSOFT: "Outlook, OneDrive, Teams",
        OAuthProvider.SLACK: "메시지, 채널, 파일",
        OAuthProvider.NOTION: "페이지, 데이터베이스",
        OAuthProvider.GITHUB: "레포, 이슈, PR",
        OAuthProvider.STRIPE: "결제, 구독, 고객",
        OAuthProvider.SHOPIFY: "주문, 상품, 고객",
        OAuthProvider.DISCORD: "서버, 채널, 메시지",
        OAuthProvider.DROPBOX: "파일, 폴더",
        OAuthProvider.ZOOM: "미팅, 녹화",
        OAuthProvider.HUBSPOT: "CRM, 연락처, 딜",
        OAuthProvider.SALESFORCE: "리드, 기회, 계정",
        OAuthProvider.KAKAO: "프로필, 메시지",
        OAuthProvider.NAVER: "프로필, 카페",
        OAuthProvider.TOSS: "결제, 송금",
    }
    return descriptions.get(provider, "데이터 연동")

def serialize_data(data) -> Dict[str, Any]:
    """UnifiedData를 JSON으로 직렬화"""
    return {
        "id": data.id,
        "type": data.type.value,
        "source": data.source.value,
        "title": data.title,
        "content": data.content[:200] if data.content else "",
        "metadata": data.metadata,
        "timestamp": data.timestamp.isoformat() if data.timestamp else None,
    }
