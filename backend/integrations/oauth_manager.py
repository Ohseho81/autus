"""
AUTUS OAuth Manager v14.0
==========================
모든 외부 서비스 OAuth 통합 관리

지원 서비스:
- Google (Gmail, Calendar, Drive, Sheets)
- Microsoft (Outlook, OneDrive, Teams)
- Slack
- Notion
- GitHub
- Stripe
- Shopify
- 카카오
- 네이버
"""

import os
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum
import aiohttp
import json
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

# ============================================
# OAuth Provider 정의
# ============================================

class OAuthProvider(str, Enum):
    # 글로벌
    GOOGLE = "google"
    MICROSOFT = "microsoft"
    SLACK = "slack"
    NOTION = "notion"
    GITHUB = "github"
    STRIPE = "stripe"
    SHOPIFY = "shopify"
    DISCORD = "discord"
    DROPBOX = "dropbox"
    ZOOM = "zoom"
    HUBSPOT = "hubspot"
    SALESFORCE = "salesforce"
    
    # 한국
    KAKAO = "kakao"
    NAVER = "naver"
    TOSS = "toss"

@dataclass
class OAuthConfig:
    """OAuth 설정"""
    provider: OAuthProvider
    client_id: str
    client_secret: str
    auth_url: str
    token_url: str
    scopes: List[str]
    redirect_uri: str = ""
    
    # 추가 설정
    extra_params: Dict[str, str] = field(default_factory=dict)

@dataclass
class OAuthToken:
    """OAuth 토큰"""
    provider: OAuthProvider
    access_token: str
    refresh_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    token_type: str = "Bearer"
    scope: str = ""
    
    @property
    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return datetime.utcnow() >= self.expires_at

# ============================================
# Provider 설정
# ============================================

OAUTH_CONFIGS: Dict[OAuthProvider, Dict] = {
    OAuthProvider.GOOGLE: {
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scopes": [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/spreadsheets",
        ],
        "extra_params": {"access_type": "offline", "prompt": "consent"}
    },
    
    OAuthProvider.MICROSOFT: {
        "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "userinfo_url": "https://graph.microsoft.com/v1.0/me",
        "scopes": [
            "openid",
            "email",
            "profile",
            "offline_access",
            "User.Read",
            "Mail.Read",
            "Mail.Send",
            "Calendars.ReadWrite",
            "Files.Read.All",
        ]
    },
    
    OAuthProvider.SLACK: {
        "auth_url": "https://slack.com/oauth/v2/authorize",
        "token_url": "https://slack.com/api/oauth.v2.access",
        "userinfo_url": "https://slack.com/api/users.identity",
        "scopes": [
            "channels:read",
            "channels:history",
            "chat:write",
            "users:read",
            "users:read.email",
            "files:read",
            "reactions:read",
        ]
    },
    
    OAuthProvider.NOTION: {
        "auth_url": "https://api.notion.com/v1/oauth/authorize",
        "token_url": "https://api.notion.com/v1/oauth/token",
        "scopes": [],  # Notion은 scope 없이 전체 접근
        "extra_params": {"owner": "user"}
    },
    
    OAuthProvider.GITHUB: {
        "auth_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "scopes": ["user", "repo", "read:org"]
    },
    
    OAuthProvider.KAKAO: {
        "auth_url": "https://kauth.kakao.com/oauth/authorize",
        "token_url": "https://kauth.kakao.com/oauth/token",
        "userinfo_url": "https://kapi.kakao.com/v2/user/me",
        "scopes": ["profile_nickname", "profile_image", "account_email"]
    },
    
    OAuthProvider.NAVER: {
        "auth_url": "https://nid.naver.com/oauth2.0/authorize",
        "token_url": "https://nid.naver.com/oauth2.0/token",
        "userinfo_url": "https://openapi.naver.com/v1/nid/me",
        "scopes": []
    },
    
    OAuthProvider.STRIPE: {
        "auth_url": "https://connect.stripe.com/oauth/authorize",
        "token_url": "https://connect.stripe.com/oauth/token",
        "scopes": ["read_write"]
    },
    
    OAuthProvider.SHOPIFY: {
        "auth_url": "https://{shop}.myshopify.com/admin/oauth/authorize",
        "token_url": "https://{shop}.myshopify.com/admin/oauth/access_token",
        "scopes": [
            "read_products",
            "read_orders",
            "read_customers",
            "read_inventory",
        ]
    },
    
    OAuthProvider.HUBSPOT: {
        "auth_url": "https://app.hubspot.com/oauth/authorize",
        "token_url": "https://api.hubapi.com/oauth/v1/token",
        "scopes": ["crm.objects.contacts.read", "crm.objects.deals.read"]
    },
    
    OAuthProvider.ZOOM: {
        "auth_url": "https://zoom.us/oauth/authorize",
        "token_url": "https://zoom.us/oauth/token",
        "scopes": ["meeting:read", "meeting:write", "user:read"]
    },
}

# ============================================
# OAuth Manager
# ============================================

class OAuthManager:
    """통합 OAuth 관리자"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.tokens: Dict[str, Dict[OAuthProvider, OAuthToken]] = {}  # user_id -> provider -> token
        self.states: Dict[str, Dict] = {}  # state -> {user_id, provider}
        
    def _get_config(self, provider: OAuthProvider) -> Dict:
        """Provider 설정 가져오기"""
        base_config = OAUTH_CONFIGS.get(provider, {})
        
        # 환경변수에서 client_id, client_secret 가져오기
        prefix = provider.value.upper()
        client_id = os.getenv(f"{prefix}_CLIENT_ID", "")
        client_secret = os.getenv(f"{prefix}_CLIENT_SECRET", "")
        
        return {
            **base_config,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": f"{self.base_url}/oauth/callback/{provider.value}"
        }
    
    def get_auth_url(
        self, 
        provider: OAuthProvider, 
        user_id: str,
        extra_scopes: List[str] = None
    ) -> str:
        """인증 URL 생성"""
        config = self._get_config(provider)
        
        # State 생성 (CSRF 방지)
        state = secrets.token_urlsafe(32)
        self.states[state] = {
            "user_id": user_id,
            "provider": provider,
            "created_at": datetime.utcnow()
        }
        
        # Scopes
        scopes = config.get("scopes", [])
        if extra_scopes:
            scopes = list(set(scopes + extra_scopes))
        
        # Parameters
        params = {
            "client_id": config["client_id"],
            "redirect_uri": config["redirect_uri"],
            "response_type": "code",
            "state": state,
        }
        
        if scopes:
            params["scope"] = " ".join(scopes)
        
        # Extra params
        if "extra_params" in config:
            params.update(config["extra_params"])
        
        return f"{config['auth_url']}?{urlencode(params)}"
    
    async def exchange_code(
        self, 
        provider: OAuthProvider,
        code: str,
        state: str
    ) -> Optional[OAuthToken]:
        """Authorization code를 토큰으로 교환"""
        # State 검증
        if state not in self.states:
            logger.error(f"Invalid state: {state}")
            return None
        
        state_data = self.states.pop(state)
        user_id = state_data["user_id"]
        
        config = self._get_config(provider)
        
        # Token 요청
        data = {
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "code": code,
            "redirect_uri": config["redirect_uri"],
            "grant_type": "authorization_code",
        }
        
        headers = {"Accept": "application/json"}
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                config["token_url"],
                data=data,
                headers=headers
            ) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    logger.error(f"Token exchange failed: {text}")
                    return None
                
                result = await resp.json()
        
        # Token 저장
        expires_in = result.get("expires_in", 3600)
        token = OAuthToken(
            provider=provider,
            access_token=result["access_token"],
            refresh_token=result.get("refresh_token"),
            expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
            token_type=result.get("token_type", "Bearer"),
            scope=result.get("scope", "")
        )
        
        # 사용자별 토큰 저장
        if user_id not in self.tokens:
            self.tokens[user_id] = {}
        self.tokens[user_id][provider] = token
        
        logger.info(f"Token saved for user {user_id}, provider {provider.value}")
        return token
    
    async def refresh_token(
        self, 
        user_id: str,
        provider: OAuthProvider
    ) -> Optional[OAuthToken]:
        """토큰 갱신"""
        if user_id not in self.tokens:
            return None
        if provider not in self.tokens[user_id]:
            return None
        
        current_token = self.tokens[user_id][provider]
        if not current_token.refresh_token:
            return None
        
        config = self._get_config(provider)
        
        data = {
            "client_id": config["client_id"],
            "client_secret": config["client_secret"],
            "refresh_token": current_token.refresh_token,
            "grant_type": "refresh_token",
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                config["token_url"],
                data=data,
                headers={"Accept": "application/json"}
            ) as resp:
                if resp.status != 200:
                    return None
                result = await resp.json()
        
        expires_in = result.get("expires_in", 3600)
        new_token = OAuthToken(
            provider=provider,
            access_token=result["access_token"],
            refresh_token=result.get("refresh_token", current_token.refresh_token),
            expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
            token_type=result.get("token_type", "Bearer"),
        )
        
        self.tokens[user_id][provider] = new_token
        return new_token
    
    async def get_token(
        self, 
        user_id: str,
        provider: OAuthProvider
    ) -> Optional[OAuthToken]:
        """유효한 토큰 가져오기 (필요시 자동 갱신)"""
        if user_id not in self.tokens:
            return None
        if provider not in self.tokens[user_id]:
            return None
        
        token = self.tokens[user_id][provider]
        
        # 만료 확인 및 갱신
        if token.is_expired and token.refresh_token:
            token = await self.refresh_token(user_id, provider)
        
        return token
    
    def get_connected_providers(self, user_id: str) -> List[OAuthProvider]:
        """연결된 서비스 목록"""
        if user_id not in self.tokens:
            return []
        return list(self.tokens[user_id].keys())
    
    def disconnect(self, user_id: str, provider: OAuthProvider) -> bool:
        """서비스 연결 해제"""
        if user_id in self.tokens and provider in self.tokens[user_id]:
            del self.tokens[user_id][provider]
            return True
        return False


# ============================================
# Singleton
# ============================================

_oauth_manager: Optional[OAuthManager] = None

def get_oauth_manager() -> OAuthManager:
    global _oauth_manager
    if _oauth_manager is None:
        base_url = os.getenv("BASE_URL", "http://localhost:8000")
        _oauth_manager = OAuthManager(base_url)
    return _oauth_manager
