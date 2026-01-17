# ═══════════════════════════════════════════════════════════════════════════════
#
#                     AUTUS OAuth 라우터
#                     
#                     Part 4: FastAPI 라우터 + 수집기 관리
#
# ═══════════════════════════════════════════════════════════════════════════════

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import os
import secrets
import json

# 수집기 임포트
# from collectors.gmail_collector import GmailCollector
# from collectors.calendar_collector import CalendarCollector
# from collectors.slack_collector import SlackCollector

router = APIRouter(prefix="/api/oauth", tags=["OAuth Integration"])


# ═══════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════

class OAuthConfig:
    """OAuth 설정 (환경변수에서 로드)"""
    
    # Google (Gmail, Calendar)
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    
    # Slack
    SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID", "")
    SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET", "")
    
    # GitHub
    GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
    
    # Notion
    NOTION_CLIENT_ID = os.getenv("NOTION_CLIENT_ID", "")
    NOTION_CLIENT_SECRET = os.getenv("NOTION_CLIENT_SECRET", "")
    
    # Base URL
    BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class DataSourceType(str, Enum):
    GMAIL = "gmail"
    CALENDAR = "calendar"
    SLACK = "slack"
    GITHUB = "github"
    NOTION = "notion"


# ═══════════════════════════════════════════════════════════════════════════════
# Pydantic 모델
# ═══════════════════════════════════════════════════════════════════════════════

class OAuthInitResponse(BaseModel):
    """OAuth 시작 응답"""
    auth_url: str
    state: str


class DataSourceStatus(BaseModel):
    """데이터 소스 상태"""
    source_type: str
    is_connected: bool
    last_sync: Optional[datetime]
    last_status: Optional[str]
    node_mappings: Dict[str, float] = {}
    error: Optional[str] = None


class SyncRequest(BaseModel):
    """동기화 요청"""
    source_type: DataSourceType
    since_days: int = 7


class SyncResult(BaseModel):
    """동기화 결과"""
    source_type: str
    status: str
    items_collected: int
    node_contributions: Dict[str, float]
    slot_candidates: int
    duration_seconds: float


# ═══════════════════════════════════════════════════════════════════════════════
# 상태 저장 (실제로는 DB/Redis 사용)
# ═══════════════════════════════════════════════════════════════════════════════

# In-memory 저장 (데모용)
_oauth_states: Dict[str, Dict] = {}  # state -> {entity_id, source_type, created_at}
_entity_tokens: Dict[str, Dict[str, Dict]] = {}  # entity_id -> {source_type -> tokens}
_sync_results: Dict[str, Dict[str, SyncResult]] = {}  # entity_id -> {source_type -> result}


def get_current_entity_id() -> str:
    """현재 사용자 ID (실제로는 인증에서 가져옴)"""
    # TODO: Clerk 등 인증 시스템 연동
    return "entity_demo_001"


# ═══════════════════════════════════════════════════════════════════════════════
# OAuth 시작
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/connect/{source_type}", response_model=OAuthInitResponse)
async def start_oauth(
    source_type: DataSourceType,
    entity_id: str = Depends(get_current_entity_id)
):
    """
    OAuth 연결 시작
    
    1. state 생성
    2. 인증 URL 반환
    3. 프론트엔드에서 해당 URL로 리다이렉트
    """
    # State 생성 (CSRF 방지)
    state = secrets.token_urlsafe(32)
    
    # State 저장
    _oauth_states[state] = {
        "entity_id": entity_id,
        "source_type": source_type.value,
        "created_at": datetime.now(),
    }
    
    # 리다이렉트 URI
    redirect_uri = f"{OAuthConfig.BASE_URL}/api/oauth/callback/{source_type.value}"
    
    # 소스별 인증 URL 생성
    if source_type == DataSourceType.GMAIL:
        auth_url = _build_google_auth_url(
            redirect_uri=redirect_uri,
            state=state,
            scopes=[
                "https://www.googleapis.com/auth/gmail.readonly",
                "https://www.googleapis.com/auth/gmail.metadata",
            ]
        )
    
    elif source_type == DataSourceType.CALENDAR:
        auth_url = _build_google_auth_url(
            redirect_uri=redirect_uri,
            state=state,
            scopes=[
                "https://www.googleapis.com/auth/calendar.readonly",
                "https://www.googleapis.com/auth/calendar.events.readonly",
            ]
        )
    
    elif source_type == DataSourceType.SLACK:
        auth_url = _build_slack_auth_url(
            redirect_uri=redirect_uri,
            state=state,
        )
    
    elif source_type == DataSourceType.GITHUB:
        auth_url = _build_github_auth_url(
            redirect_uri=redirect_uri,
            state=state,
        )
    
    elif source_type == DataSourceType.NOTION:
        auth_url = _build_notion_auth_url(
            redirect_uri=redirect_uri,
            state=state,
        )
    
    else:
        raise HTTPException(400, f"Unsupported source type: {source_type}")
    
    return OAuthInitResponse(auth_url=auth_url, state=state)


def _build_google_auth_url(redirect_uri: str, state: str, scopes: List[str]) -> str:
    """Google OAuth URL 생성"""
    from urllib.parse import urlencode
    
    params = {
        "client_id": OAuthConfig.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": " ".join(scopes),
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


def _build_slack_auth_url(redirect_uri: str, state: str) -> str:
    """Slack OAuth URL 생성"""
    from urllib.parse import urlencode
    
    scopes = [
        "channels:history", "channels:read",
        "groups:history", "groups:read",
        "im:history", "im:read",
        "users:read", "users:read.email",
        "reactions:read", "team:read",
    ]
    
    params = {
        "client_id": OAuthConfig.SLACK_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": ",".join(scopes),
        "state": state,
    }
    
    return f"https://slack.com/oauth/v2/authorize?{urlencode(params)}"


def _build_github_auth_url(redirect_uri: str, state: str) -> str:
    """GitHub OAuth URL 생성"""
    from urllib.parse import urlencode
    
    params = {
        "client_id": OAuthConfig.GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "repo read:user user:email",
        "state": state,
    }
    
    return f"https://github.com/login/oauth/authorize?{urlencode(params)}"


def _build_notion_auth_url(redirect_uri: str, state: str) -> str:
    """Notion OAuth URL 생성"""
    from urllib.parse import urlencode
    
    params = {
        "client_id": OAuthConfig.NOTION_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "owner": "user",
        "state": state,
    }
    
    return f"https://api.notion.com/v1/oauth/authorize?{urlencode(params)}"


# ═══════════════════════════════════════════════════════════════════════════════
# OAuth 콜백
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/callback/{source_type}")
async def oauth_callback(
    source_type: str,
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
):
    """
    OAuth 콜백 처리
    
    1. state 검증
    2. code → token 교환
    3. 토큰 저장
    4. 프론트엔드로 리다이렉트
    """
    # 에러 체크
    if error:
        return RedirectResponse(
            f"{OAuthConfig.FRONTEND_URL}/settings/integrations?error={error}"
        )
    
    # State 검증
    state_data = _oauth_states.pop(state, None)
    if not state_data:
        return RedirectResponse(
            f"{OAuthConfig.FRONTEND_URL}/settings/integrations?error=invalid_state"
        )
    
    # State 만료 체크 (10분)
    if datetime.now() - state_data["created_at"] > timedelta(minutes=10):
        return RedirectResponse(
            f"{OAuthConfig.FRONTEND_URL}/settings/integrations?error=state_expired"
        )
    
    entity_id = state_data["entity_id"]
    redirect_uri = f"{OAuthConfig.BASE_URL}/api/oauth/callback/{source_type}"
    
    try:
        # 토큰 교환
        if source_type in ["gmail", "calendar"]:
            tokens = await _exchange_google_code(code, redirect_uri)
        elif source_type == "slack":
            tokens = await _exchange_slack_code(code, redirect_uri)
        elif source_type == "github":
            tokens = await _exchange_github_code(code, redirect_uri)
        elif source_type == "notion":
            tokens = await _exchange_notion_code(code, redirect_uri)
        else:
            raise HTTPException(400, f"Unknown source type: {source_type}")
        
        # 토큰 저장
        if entity_id not in _entity_tokens:
            _entity_tokens[entity_id] = {}
        _entity_tokens[entity_id][source_type] = tokens
        
        # 성공 리다이렉트
        return RedirectResponse(
            f"{OAuthConfig.FRONTEND_URL}/settings/integrations?connected={source_type}"
        )
        
    except Exception as e:
        print(f"OAuth error for {source_type}: {e}")
        return RedirectResponse(
            f"{OAuthConfig.FRONTEND_URL}/settings/integrations?error=token_exchange_failed"
        )


async def _exchange_google_code(code: str, redirect_uri: str) -> Dict:
    """Google 토큰 교환"""
    import aiohttp
    
    async with aiohttp.ClientSession() as session:
        data = {
            "client_id": OAuthConfig.GOOGLE_CLIENT_ID,
            "client_secret": OAuthConfig.GOOGLE_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
        
        async with session.post("https://oauth2.googleapis.com/token", data=data) as response:
            if response.status != 200:
                error = await response.text()
                raise Exception(f"Google token exchange failed: {error}")
            
            result = await response.json()
            
            return {
                "access_token": result["access_token"],
                "refresh_token": result.get("refresh_token"),
                "expires_at": datetime.now() + timedelta(seconds=result.get("expires_in", 3600)),
                "token_type": result.get("token_type", "Bearer"),
            }


async def _exchange_slack_code(code: str, redirect_uri: str) -> Dict:
    """Slack 토큰 교환"""
    import aiohttp
    
    async with aiohttp.ClientSession() as session:
        data = {
            "client_id": OAuthConfig.SLACK_CLIENT_ID,
            "client_secret": OAuthConfig.SLACK_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        }
        
        async with session.post("https://slack.com/api/oauth.v2.access", data=data) as response:
            result = await response.json()
            
            if not result.get("ok"):
                raise Exception(f"Slack token exchange failed: {result.get('error')}")
            
            return {
                "access_token": result.get("access_token") or result.get("authed_user", {}).get("access_token"),
                "refresh_token": result.get("refresh_token"),
                "team_id": result.get("team", {}).get("id"),
                "user_id": result.get("authed_user", {}).get("id"),
            }


async def _exchange_github_code(code: str, redirect_uri: str) -> Dict:
    """GitHub 토큰 교환"""
    import aiohttp
    
    async with aiohttp.ClientSession() as session:
        data = {
            "client_id": OAuthConfig.GITHUB_CLIENT_ID,
            "client_secret": OAuthConfig.GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
        }
        headers = {"Accept": "application/json"}
        
        async with session.post(
            "https://github.com/login/oauth/access_token",
            data=data,
            headers=headers
        ) as response:
            result = await response.json()
            
            if "error" in result:
                raise Exception(f"GitHub token exchange failed: {result['error']}")
            
            return {
                "access_token": result["access_token"],
                "token_type": result.get("token_type", "bearer"),
                "scope": result.get("scope"),
            }


async def _exchange_notion_code(code: str, redirect_uri: str) -> Dict:
    """Notion 토큰 교환"""
    import aiohttp
    import base64
    
    async with aiohttp.ClientSession() as session:
        # Notion은 Basic Auth 사용
        auth = base64.b64encode(
            f"{OAuthConfig.NOTION_CLIENT_ID}:{OAuthConfig.NOTION_CLIENT_SECRET}".encode()
        ).decode()
        
        headers = {
            "Authorization": f"Basic {auth}",
            "Content-Type": "application/json",
        }
        
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
        }
        
        async with session.post(
            "https://api.notion.com/v1/oauth/token",
            json=data,
            headers=headers
        ) as response:
            if response.status != 200:
                error = await response.text()
                raise Exception(f"Notion token exchange failed: {error}")
            
            result = await response.json()
            
            return {
                "access_token": result["access_token"],
                "workspace_id": result.get("workspace_id"),
                "workspace_name": result.get("workspace_name"),
            }


# ═══════════════════════════════════════════════════════════════════════════════
# 연결 상태 조회
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/status", response_model=List[DataSourceStatus])
async def get_connection_status(
    entity_id: str = Depends(get_current_entity_id)
):
    """연결된 데이터 소스 상태 조회"""
    statuses = []
    
    entity_tokens = _entity_tokens.get(entity_id, {})
    entity_syncs = _sync_results.get(entity_id, {})
    
    for source_type in DataSourceType:
        is_connected = source_type.value in entity_tokens
        sync_result = entity_syncs.get(source_type.value)
        
        statuses.append(DataSourceStatus(
            source_type=source_type.value,
            is_connected=is_connected,
            last_sync=sync_result.duration_seconds if sync_result else None,  # 임시
            last_status=sync_result.status if sync_result else None,
            node_mappings=sync_result.node_contributions if sync_result else {},
        ))
    
    return statuses


@router.delete("/disconnect/{source_type}")
async def disconnect_source(
    source_type: DataSourceType,
    entity_id: str = Depends(get_current_entity_id)
):
    """데이터 소스 연결 해제"""
    if entity_id in _entity_tokens:
        _entity_tokens[entity_id].pop(source_type.value, None)
    
    if entity_id in _sync_results:
        _sync_results[entity_id].pop(source_type.value, None)
    
    return {"status": "disconnected", "source_type": source_type.value}


# ═══════════════════════════════════════════════════════════════════════════════
# 데이터 동기화
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/sync", response_model=SyncResult)
async def sync_data_source(
    request: SyncRequest,
    background_tasks: BackgroundTasks,
    entity_id: str = Depends(get_current_entity_id)
):
    """
    데이터 소스 동기화 실행
    
    1. 토큰 확인
    2. 수집기 생성
    3. 데이터 수집
    4. 노드/슬롯 매핑
    5. 결과 저장
    """
    # 토큰 확인
    entity_tokens = _entity_tokens.get(entity_id, {})
    tokens = entity_tokens.get(request.source_type.value)
    
    if not tokens:
        raise HTTPException(400, f"{request.source_type.value} is not connected")
    
    start_time = datetime.now()
    since = datetime.now() - timedelta(days=request.since_days)
    
    try:
        # 수집기 생성 및 실행
        result = await _run_collector(
            source_type=request.source_type,
            tokens=tokens,
            since=since
        )
        
        duration = (datetime.now() - start_time).total_seconds()
        
        sync_result = SyncResult(
            source_type=request.source_type.value,
            status="SUCCESS",
            items_collected=result.get("items_collected", 0),
            node_contributions=result.get("node_contributions", {}),
            slot_candidates=result.get("slot_candidates", 0),
            duration_seconds=duration,
        )
        
        # 결과 저장
        if entity_id not in _sync_results:
            _sync_results[entity_id] = {}
        _sync_results[entity_id][request.source_type.value] = sync_result
        
        # 백그라운드: K/I 재계산
        # background_tasks.add_task(recalculate_ki, entity_id)
        
        return sync_result
        
    except Exception as e:
        return SyncResult(
            source_type=request.source_type.value,
            status="FAILED",
            items_collected=0,
            node_contributions={},
            slot_candidates=0,
            duration_seconds=(datetime.now() - start_time).total_seconds(),
        )


async def _run_collector(
    source_type: DataSourceType,
    tokens: Dict,
    since: datetime
) -> Dict[str, Any]:
    """수집기 실행"""
    
    # 임시 목업 (실제로는 수집기 클래스 사용)
    # collector = None
    # 
    # if source_type == DataSourceType.GMAIL:
    #     collector = GmailCollector(
    #         client_id=OAuthConfig.GOOGLE_CLIENT_ID,
    #         client_secret=OAuthConfig.GOOGLE_CLIENT_SECRET,
    #         redirect_uri=f"{OAuthConfig.BASE_URL}/api/oauth/callback/gmail",
    #         tokens=OAuthTokens(**tokens)
    #     )
    # elif source_type == DataSourceType.CALENDAR:
    #     collector = CalendarCollector(...)
    # elif source_type == DataSourceType.SLACK:
    #     collector = SlackCollector(...)
    # 
    # if collector:
    #     result = await collector.collect(since=since)
    #     await collector.close()
    #     return {
    #         "items_collected": result.metadata.get("collected_count", 0),
    #         "node_contributions": result.node_mappings,
    #         "slot_candidates": len(result.slot_mappings.get("candidates", [])),
    #     }
    
    # 목업 데이터
    mock_results = {
        DataSourceType.GMAIL: {
            "items_collected": 150,
            "node_contributions": {
                "TIME_D": 0.12,
                "TIME_E": 0.35,
                "NET_A": 0.28,
                "NET_D": 0.15,
                "WORK_D": 0.22,
            },
            "slot_candidates": 25,
        },
        DataSourceType.CALENDAR: {
            "items_collected": 45,
            "node_contributions": {
                "TIME_A": 0.42,
                "TIME_D": -0.08,
                "TIME_E": 0.55,
                "WORK_A": 0.38,
                "NET_A": 0.18,
            },
            "slot_candidates": 15,
        },
        DataSourceType.SLACK: {
            "items_collected": 320,
            "node_contributions": {
                "NET_A": 0.45,
                "NET_D": 0.22,
                "NET_E": 0.30,
                "TEAM_A": 0.52,
                "TEAM_D": 0.18,
            },
            "slot_candidates": 35,
        },
    }
    
    return mock_results.get(source_type, {
        "items_collected": 0,
        "node_contributions": {},
        "slot_candidates": 0,
    })


@router.post("/sync-all")
async def sync_all_sources(
    background_tasks: BackgroundTasks,
    since_days: int = Query(7, ge=1, le=30),
    entity_id: str = Depends(get_current_entity_id)
):
    """연결된 모든 소스 동기화"""
    entity_tokens = _entity_tokens.get(entity_id, {})
    
    if not entity_tokens:
        raise HTTPException(400, "No connected data sources")
    
    results = []
    
    for source_type in entity_tokens.keys():
        try:
            result = await sync_data_source(
                SyncRequest(
                    source_type=DataSourceType(source_type),
                    since_days=since_days
                ),
                background_tasks,
                entity_id
            )
            results.append(result)
        except Exception as e:
            results.append({
                "source_type": source_type,
                "status": "FAILED",
                "error": str(e)
            })
    
    return {"synced": len(results), "results": results}


# ═══════════════════════════════════════════════════════════════════════════════
# 토큰 갱신 (백그라운드 작업)
# ═══════════════════════════════════════════════════════════════════════════════

async def refresh_all_tokens():
    """모든 만료 임박 토큰 갱신"""
    for entity_id, sources in _entity_tokens.items():
        for source_type, tokens in sources.items():
            expires_at = tokens.get("expires_at")
            
            if expires_at and expires_at < datetime.now() + timedelta(minutes=10):
                refresh_token = tokens.get("refresh_token")
                
                if refresh_token and source_type in ["gmail", "calendar"]:
                    try:
                        new_tokens = await _refresh_google_token(refresh_token)
                        _entity_tokens[entity_id][source_type].update(new_tokens)
                    except Exception as e:
                        print(f"Failed to refresh token for {entity_id}/{source_type}: {e}")


async def _refresh_google_token(refresh_token: str) -> Dict:
    """Google 토큰 갱신"""
    import aiohttp
    
    async with aiohttp.ClientSession() as session:
        data = {
            "client_id": OAuthConfig.GOOGLE_CLIENT_ID,
            "client_secret": OAuthConfig.GOOGLE_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        
        async with session.post("https://oauth2.googleapis.com/token", data=data) as response:
            if response.status != 200:
                raise Exception(f"Token refresh failed: {await response.text()}")
            
            result = await response.json()
            
            return {
                "access_token": result["access_token"],
                "expires_at": datetime.now() + timedelta(seconds=result.get("expires_in", 3600)),
            }


# ═══════════════════════════════════════════════════════════════════════════════
# main.py 등록
# ═══════════════════════════════════════════════════════════════════════════════

"""
# main.py에 추가:

from routers.oauth_router import router as oauth_router

app.include_router(oauth_router)

# 환경변수 설정 (.env):
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret
BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
"""
