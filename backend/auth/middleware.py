"""
AUTUS Authentication Middleware
===============================

JWT + API Key 인증
- JWT: 사용자 인증
- API Key: 서비스 간 인증
"""

import os
import jwt
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader

# ============================================
# Configuration
# ============================================

SECRET_KEY = os.environ.get("SECRET_KEY", "autus-secret-key-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


# ============================================
# API Key Storage (In-Memory, 프로덕션에서는 DB 사용)
# ============================================

_api_keys: Dict[str, Dict] = {}


# ============================================
# JWT Functions
# ============================================

def create_jwt_token(user_id: str, scopes: List[str] = None) -> str:
    """JWT 토큰 생성"""
    payload = {
        "sub": user_id,
        "scopes": scopes or ["read"],
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS),
        "type": "jwt"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_jwt_token(token: str) -> Optional[Dict]:
    """JWT 토큰 디코딩"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {
            "type": "jwt",
            "user_id": payload.get("sub"),
            "scopes": payload.get("scopes", []),
            "exp": payload.get("exp")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        return None


# ============================================
# API Key Functions
# ============================================

def generate_api_key(client_name: str, scopes: List[str] = None) -> str:
    """API Key 생성"""
    key = f"autus_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    
    _api_keys[key_hash] = {
        "client_name": client_name,
        "scopes": scopes or ["read"],
        "created_at": datetime.utcnow().isoformat()
    }
    
    return key


def verify_api_key(api_key: str) -> Optional[Dict]:
    """API Key 검증"""
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()
    key_data = _api_keys.get(key_hash)
    
    if key_data:
        return {
            "type": "api_key",
            "client_id": key_data["client_name"],
            "scopes": key_data["scopes"]
        }
    return None


# ============================================
# Rate Limiter
# ============================================

class RateLimiter:
    """간단한 Rate Limiter"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = {}
    
    def is_allowed(self, client_id: str) -> bool:
        """요청 허용 여부"""
        now = datetime.utcnow().timestamp()
        window_start = now - self.window_seconds
        
        # 오래된 요청 제거
        if client_id in self._requests:
            self._requests[client_id] = [
                ts for ts in self._requests[client_id]
                if ts > window_start
            ]
        else:
            self._requests[client_id] = []
        
        # 제한 체크
        if len(self._requests[client_id]) >= self.max_requests:
            return False
        
        # 요청 기록
        self._requests[client_id].append(now)
        return True
    
    def get_remaining(self, client_id: str) -> int:
        """남은 요청 수"""
        now = datetime.utcnow().timestamp()
        window_start = now - self.window_seconds
        
        if client_id in self._requests:
            recent = [ts for ts in self._requests[client_id] if ts > window_start]
            return max(0, self.max_requests - len(recent))
        
        return self.max_requests


# Global rate limiter
rate_limiter = RateLimiter(max_requests=100, window_seconds=60)


# ============================================
# Dependencies
# ============================================

async def get_current_auth(
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    api_key: str = Security(api_key_header)
) -> Optional[Dict]:
    """현재 인증 정보 가져오기"""
    
    # API Key 먼저 체크
    if api_key:
        auth = verify_api_key(api_key)
        if auth:
            return auth
    
    # JWT 체크
    if credentials:
        auth = decode_jwt_token(credentials.credentials)
        if auth:
            return auth
    
    return None


def require_auth(auth: Optional[Dict] = Depends(get_current_auth)) -> Dict:
    """인증 필수"""
    if not auth:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Rate limit 체크
    client_id = auth.get("client_id") or auth.get("user_id")
    if not rate_limiter.is_allowed(client_id):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded"
        )
    
    return auth


def require_scope(required_scope: str):
    """특정 스코프 필요"""
    def check_scope(auth: Dict = Depends(require_auth)) -> Dict:
        scopes = auth.get("scopes", [])
        if required_scope not in scopes and "admin" not in scopes:
            raise HTTPException(
                status_code=403,
                detail=f"Scope '{required_scope}' required"
            )
        return auth
    return check_scope


# ============================================
# Init: 기본 API Key 생성
# ============================================

# 개발용 기본 키 (프로덕션에서는 제거)
_default_key = "autus_dev_key_do_not_use_in_production"
_api_keys[hashlib.sha256(_default_key.encode()).hexdigest()] = {
    "client_name": "development",
    "scopes": ["read", "write"],
    "created_at": datetime.utcnow().isoformat()
}
