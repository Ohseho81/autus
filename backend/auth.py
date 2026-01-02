#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔐 AUTUS EMPIRE - Authentication System                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

JWT + API Key 인증 시스템
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, APIKeyHeader
from pydantic import BaseModel
import hashlib
import secrets

# JWT 라이브러리 (선택적)
try:
    from jose import jwt, JWTError
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False
    print("⚠️ python-jose 미설치: pip install python-jose[cryptography]")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AuthConfig:
    """인증 설정"""
    # JWT 설정
    SECRET_KEY = os.getenv("JWT_SECRET_KEY", "autus-empire-secret-key-change-in-production")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24시간
    
    # API Key 설정
    API_KEY_HEADER = "X-API-Key"
    MASTER_API_KEY = os.getenv("MASTER_API_KEY", "")  # 마스터 키 (환경변수로 설정)
    
    # 인증 모드
    AUTH_ENABLED = os.getenv("AUTH_ENABLED", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class Token(BaseModel):
    """토큰 응답"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int

class TokenData(BaseModel):
    """토큰 데이터"""
    user_id: str
    station_id: Optional[str] = None
    role: str = "user"
    exp: Optional[datetime] = None

class APIKeyData(BaseModel):
    """API Key 데이터"""
    key_id: str
    station_id: str
    role: str = "station"
    created_at: str


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Key 저장소 (In-Memory, 프로덕션에서는 DB 사용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 등록된 API Keys (key -> data)
API_KEYS: Dict[str, APIKeyData] = {}


def generate_api_key(station_id: str, role: str = "station") -> str:
    """API Key 생성"""
    key = f"ak_{secrets.token_urlsafe(32)}"
    key_id = hashlib.sha256(key.encode()).hexdigest()[:16]
    
    API_KEYS[key] = APIKeyData(
        key_id=key_id,
        station_id=station_id,
        role=role,
        created_at=datetime.now().isoformat(),
    )
    
    return key


def validate_api_key(key: str) -> Optional[APIKeyData]:
    """API Key 검증"""
    # 마스터 키 체크
    if AuthConfig.MASTER_API_KEY and key == AuthConfig.MASTER_API_KEY:
        return APIKeyData(
            key_id="master",
            station_id="*",
            role="admin",
            created_at="system",
        )
    
    return API_KEYS.get(key)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# JWT Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=500, detail="JWT library not available")
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 디코드"""
    if not JWT_AVAILABLE:
        return None
    
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        return TokenData(
            user_id=payload.get("sub", ""),
            station_id=payload.get("station_id"),
            role=payload.get("role", "user"),
        )
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Security Dependencies
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name=AuthConfig.API_KEY_HEADER, auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> Optional[Dict[str, Any]]:
    """
    현재 사용자/클라이언트 인증
    
    인증 방법:
    1. Bearer Token (JWT)
    2. X-API-Key Header
    """
    # 인증 비활성화 시 기본 사용자 반환
    if not AuthConfig.AUTH_ENABLED:
        return {"user_id": "anonymous", "role": "admin", "station_id": "*"}
    
    # 1. JWT Bearer 토큰 체크
    if credentials and credentials.credentials:
        token_data = decode_token(credentials.credentials)
        if token_data:
            return {
                "user_id": token_data.user_id,
                "station_id": token_data.station_id,
                "role": token_data.role,
                "auth_type": "jwt",
            }
    
    # 2. API Key 체크
    if api_key:
        key_data = validate_api_key(api_key)
        if key_data:
            return {
                "user_id": key_data.key_id,
                "station_id": key_data.station_id,
                "role": key_data.role,
                "auth_type": "api_key",
            }
    
    # 인증 실패
    raise HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """관리자 권한 필요"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def require_station(user: dict = Depends(get_current_user)) -> dict:
    """매장 권한 필요 (station 또는 admin)"""
    if user.get("role") not in ["admin", "station"]:
        raise HTTPException(status_code=403, detail="Station privileges required")
    return user


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Auth Router
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_auth_router():
    """인증 라우터 생성"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
    
    @router.post("/token", response_model=Token)
    async def login(user_id: str, password: str, station_id: Optional[str] = None):
        """
        로그인하여 JWT 토큰 발급
        
        (데모용 - 실제 환경에서는 DB 검증 필요)
        """
        # 간단한 검증 (실제로는 DB에서 검증)
        if password != "autus2024":  # 데모 비밀번호
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # 토큰 생성
        access_token = create_access_token(
            data={
                "sub": user_id,
                "station_id": station_id,
                "role": "admin" if user_id == "admin" else "user",
            }
        )
        
        return Token(
            access_token=access_token,
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    
    @router.post("/api-key")
    async def create_api_key_endpoint(
        station_id: str,
        user: dict = Depends(require_admin)
    ):
        """API Key 생성 (관리자 전용)"""
        key = generate_api_key(station_id)
        return {
            "api_key": key,
            "station_id": station_id,
            "message": "⚠️ API Key는 한 번만 표시됩니다. 안전하게 보관하세요.",
        }
    
    @router.get("/me")
    async def get_me(user: dict = Depends(get_current_user)):
        """현재 인증 정보 확인"""
        return user
    
    @router.get("/status")
    async def auth_status():
        """인증 시스템 상태"""
        return {
            "auth_enabled": AuthConfig.AUTH_ENABLED,
            "jwt_available": JWT_AVAILABLE,
            "registered_api_keys": len(API_KEYS),
        }
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_default_api_keys():
    """기본 API Key 초기화 (개발용)"""
    if not AuthConfig.AUTH_ENABLED:
        return
    
    # 개발용 기본 키 생성
    dev_key = generate_api_key("DEV-STATION", "admin")
    print(f"🔐 개발용 API Key 생성: {dev_key[:20]}...")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🔐 AUTUS Auth System Test")
    print("=" * 50)
    
    # API Key 테스트
    print("\n1. API Key 생성...")
    key = generate_api_key("TEST-STORE-001")
    print(f"   생성된 키: {key[:30]}...")
    
    # 검증 테스트
    print("\n2. API Key 검증...")
    data = validate_api_key(key)
    print(f"   검증 결과: {data}")
    
    # JWT 테스트
    if JWT_AVAILABLE:
        print("\n3. JWT 토큰 생성...")
        token = create_access_token({"sub": "user123", "role": "admin"})
        print(f"   토큰: {token[:50]}...")
        
        print("\n4. JWT 토큰 검증...")
        decoded = decode_token(token)
        print(f"   디코드: {decoded}")
    else:
        print("\n3-4. JWT 테스트 스킵 (라이브러리 미설치)")
    
    print("\n✅ 테스트 완료!")

        role=role,
        created_at=datetime.now().isoformat(),
    )
    
    return key


def validate_api_key(key: str) -> Optional[APIKeyData]:
    """API Key 검증"""
    # 마스터 키 체크
    if AuthConfig.MASTER_API_KEY and key == AuthConfig.MASTER_API_KEY:
        return APIKeyData(
            key_id="master",
            station_id="*",
            role="admin",
            created_at="system",
        )
    
    return API_KEYS.get(key)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# JWT Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=500, detail="JWT library not available")
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 디코드"""
    if not JWT_AVAILABLE:
        return None
    
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        return TokenData(
            user_id=payload.get("sub", ""),
            station_id=payload.get("station_id"),
            role=payload.get("role", "user"),
        )
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Security Dependencies
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name=AuthConfig.API_KEY_HEADER, auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> Optional[Dict[str, Any]]:
    """
    현재 사용자/클라이언트 인증
    
    인증 방법:
    1. Bearer Token (JWT)
    2. X-API-Key Header
    """
    # 인증 비활성화 시 기본 사용자 반환
    if not AuthConfig.AUTH_ENABLED:
        return {"user_id": "anonymous", "role": "admin", "station_id": "*"}
    
    # 1. JWT Bearer 토큰 체크
    if credentials and credentials.credentials:
        token_data = decode_token(credentials.credentials)
        if token_data:
            return {
                "user_id": token_data.user_id,
                "station_id": token_data.station_id,
                "role": token_data.role,
                "auth_type": "jwt",
            }
    
    # 2. API Key 체크
    if api_key:
        key_data = validate_api_key(api_key)
        if key_data:
            return {
                "user_id": key_data.key_id,
                "station_id": key_data.station_id,
                "role": key_data.role,
                "auth_type": "api_key",
            }
    
    # 인증 실패
    raise HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """관리자 권한 필요"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def require_station(user: dict = Depends(get_current_user)) -> dict:
    """매장 권한 필요 (station 또는 admin)"""
    if user.get("role") not in ["admin", "station"]:
        raise HTTPException(status_code=403, detail="Station privileges required")
    return user


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Auth Router
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_auth_router():
    """인증 라우터 생성"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
    
    @router.post("/token", response_model=Token)
    async def login(user_id: str, password: str, station_id: Optional[str] = None):
        """
        로그인하여 JWT 토큰 발급
        
        (데모용 - 실제 환경에서는 DB 검증 필요)
        """
        # 간단한 검증 (실제로는 DB에서 검증)
        if password != "autus2024":  # 데모 비밀번호
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # 토큰 생성
        access_token = create_access_token(
            data={
                "sub": user_id,
                "station_id": station_id,
                "role": "admin" if user_id == "admin" else "user",
            }
        )
        
        return Token(
            access_token=access_token,
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    
    @router.post("/api-key")
    async def create_api_key_endpoint(
        station_id: str,
        user: dict = Depends(require_admin)
    ):
        """API Key 생성 (관리자 전용)"""
        key = generate_api_key(station_id)
        return {
            "api_key": key,
            "station_id": station_id,
            "message": "⚠️ API Key는 한 번만 표시됩니다. 안전하게 보관하세요.",
        }
    
    @router.get("/me")
    async def get_me(user: dict = Depends(get_current_user)):
        """현재 인증 정보 확인"""
        return user
    
    @router.get("/status")
    async def auth_status():
        """인증 시스템 상태"""
        return {
            "auth_enabled": AuthConfig.AUTH_ENABLED,
            "jwt_available": JWT_AVAILABLE,
            "registered_api_keys": len(API_KEYS),
        }
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_default_api_keys():
    """기본 API Key 초기화 (개발용)"""
    if not AuthConfig.AUTH_ENABLED:
        return
    
    # 개발용 기본 키 생성
    dev_key = generate_api_key("DEV-STATION", "admin")
    print(f"🔐 개발용 API Key 생성: {dev_key[:20]}...")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🔐 AUTUS Auth System Test")
    print("=" * 50)
    
    # API Key 테스트
    print("\n1. API Key 생성...")
    key = generate_api_key("TEST-STORE-001")
    print(f"   생성된 키: {key[:30]}...")
    
    # 검증 테스트
    print("\n2. API Key 검증...")
    data = validate_api_key(key)
    print(f"   검증 결과: {data}")
    
    # JWT 테스트
    if JWT_AVAILABLE:
        print("\n3. JWT 토큰 생성...")
        token = create_access_token({"sub": "user123", "role": "admin"})
        print(f"   토큰: {token[:50]}...")
        
        print("\n4. JWT 토큰 검증...")
        decoded = decode_token(token)
        print(f"   디코드: {decoded}")
    else:
        print("\n3-4. JWT 테스트 스킵 (라이브러리 미설치)")
    
    print("\n✅ 테스트 완료!")

        role=role,
        created_at=datetime.now().isoformat(),
    )
    
    return key


def validate_api_key(key: str) -> Optional[APIKeyData]:
    """API Key 검증"""
    # 마스터 키 체크
    if AuthConfig.MASTER_API_KEY and key == AuthConfig.MASTER_API_KEY:
        return APIKeyData(
            key_id="master",
            station_id="*",
            role="admin",
            created_at="system",
        )
    
    return API_KEYS.get(key)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# JWT Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=500, detail="JWT library not available")
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 디코드"""
    if not JWT_AVAILABLE:
        return None
    
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        return TokenData(
            user_id=payload.get("sub", ""),
            station_id=payload.get("station_id"),
            role=payload.get("role", "user"),
        )
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Security Dependencies
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name=AuthConfig.API_KEY_HEADER, auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> Optional[Dict[str, Any]]:
    """
    현재 사용자/클라이언트 인증
    
    인증 방법:
    1. Bearer Token (JWT)
    2. X-API-Key Header
    """
    # 인증 비활성화 시 기본 사용자 반환
    if not AuthConfig.AUTH_ENABLED:
        return {"user_id": "anonymous", "role": "admin", "station_id": "*"}
    
    # 1. JWT Bearer 토큰 체크
    if credentials and credentials.credentials:
        token_data = decode_token(credentials.credentials)
        if token_data:
            return {
                "user_id": token_data.user_id,
                "station_id": token_data.station_id,
                "role": token_data.role,
                "auth_type": "jwt",
            }
    
    # 2. API Key 체크
    if api_key:
        key_data = validate_api_key(api_key)
        if key_data:
            return {
                "user_id": key_data.key_id,
                "station_id": key_data.station_id,
                "role": key_data.role,
                "auth_type": "api_key",
            }
    
    # 인증 실패
    raise HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """관리자 권한 필요"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def require_station(user: dict = Depends(get_current_user)) -> dict:
    """매장 권한 필요 (station 또는 admin)"""
    if user.get("role") not in ["admin", "station"]:
        raise HTTPException(status_code=403, detail="Station privileges required")
    return user


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Auth Router
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_auth_router():
    """인증 라우터 생성"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
    
    @router.post("/token", response_model=Token)
    async def login(user_id: str, password: str, station_id: Optional[str] = None):
        """
        로그인하여 JWT 토큰 발급
        
        (데모용 - 실제 환경에서는 DB 검증 필요)
        """
        # 간단한 검증 (실제로는 DB에서 검증)
        if password != "autus2024":  # 데모 비밀번호
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # 토큰 생성
        access_token = create_access_token(
            data={
                "sub": user_id,
                "station_id": station_id,
                "role": "admin" if user_id == "admin" else "user",
            }
        )
        
        return Token(
            access_token=access_token,
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    
    @router.post("/api-key")
    async def create_api_key_endpoint(
        station_id: str,
        user: dict = Depends(require_admin)
    ):
        """API Key 생성 (관리자 전용)"""
        key = generate_api_key(station_id)
        return {
            "api_key": key,
            "station_id": station_id,
            "message": "⚠️ API Key는 한 번만 표시됩니다. 안전하게 보관하세요.",
        }
    
    @router.get("/me")
    async def get_me(user: dict = Depends(get_current_user)):
        """현재 인증 정보 확인"""
        return user
    
    @router.get("/status")
    async def auth_status():
        """인증 시스템 상태"""
        return {
            "auth_enabled": AuthConfig.AUTH_ENABLED,
            "jwt_available": JWT_AVAILABLE,
            "registered_api_keys": len(API_KEYS),
        }
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_default_api_keys():
    """기본 API Key 초기화 (개발용)"""
    if not AuthConfig.AUTH_ENABLED:
        return
    
    # 개발용 기본 키 생성
    dev_key = generate_api_key("DEV-STATION", "admin")
    print(f"🔐 개발용 API Key 생성: {dev_key[:20]}...")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🔐 AUTUS Auth System Test")
    print("=" * 50)
    
    # API Key 테스트
    print("\n1. API Key 생성...")
    key = generate_api_key("TEST-STORE-001")
    print(f"   생성된 키: {key[:30]}...")
    
    # 검증 테스트
    print("\n2. API Key 검증...")
    data = validate_api_key(key)
    print(f"   검증 결과: {data}")
    
    # JWT 테스트
    if JWT_AVAILABLE:
        print("\n3. JWT 토큰 생성...")
        token = create_access_token({"sub": "user123", "role": "admin"})
        print(f"   토큰: {token[:50]}...")
        
        print("\n4. JWT 토큰 검증...")
        decoded = decode_token(token)
        print(f"   디코드: {decoded}")
    else:
        print("\n3-4. JWT 테스트 스킵 (라이브러리 미설치)")
    
    print("\n✅ 테스트 완료!")

        role=role,
        created_at=datetime.now().isoformat(),
    )
    
    return key


def validate_api_key(key: str) -> Optional[APIKeyData]:
    """API Key 검증"""
    # 마스터 키 체크
    if AuthConfig.MASTER_API_KEY and key == AuthConfig.MASTER_API_KEY:
        return APIKeyData(
            key_id="master",
            station_id="*",
            role="admin",
            created_at="system",
        )
    
    return API_KEYS.get(key)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# JWT Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=500, detail="JWT library not available")
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 디코드"""
    if not JWT_AVAILABLE:
        return None
    
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        return TokenData(
            user_id=payload.get("sub", ""),
            station_id=payload.get("station_id"),
            role=payload.get("role", "user"),
        )
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Security Dependencies
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name=AuthConfig.API_KEY_HEADER, auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> Optional[Dict[str, Any]]:
    """
    현재 사용자/클라이언트 인증
    
    인증 방법:
    1. Bearer Token (JWT)
    2. X-API-Key Header
    """
    # 인증 비활성화 시 기본 사용자 반환
    if not AuthConfig.AUTH_ENABLED:
        return {"user_id": "anonymous", "role": "admin", "station_id": "*"}
    
    # 1. JWT Bearer 토큰 체크
    if credentials and credentials.credentials:
        token_data = decode_token(credentials.credentials)
        if token_data:
            return {
                "user_id": token_data.user_id,
                "station_id": token_data.station_id,
                "role": token_data.role,
                "auth_type": "jwt",
            }
    
    # 2. API Key 체크
    if api_key:
        key_data = validate_api_key(api_key)
        if key_data:
            return {
                "user_id": key_data.key_id,
                "station_id": key_data.station_id,
                "role": key_data.role,
                "auth_type": "api_key",
            }
    
    # 인증 실패
    raise HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """관리자 권한 필요"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def require_station(user: dict = Depends(get_current_user)) -> dict:
    """매장 권한 필요 (station 또는 admin)"""
    if user.get("role") not in ["admin", "station"]:
        raise HTTPException(status_code=403, detail="Station privileges required")
    return user


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Auth Router
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_auth_router():
    """인증 라우터 생성"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
    
    @router.post("/token", response_model=Token)
    async def login(user_id: str, password: str, station_id: Optional[str] = None):
        """
        로그인하여 JWT 토큰 발급
        
        (데모용 - 실제 환경에서는 DB 검증 필요)
        """
        # 간단한 검증 (실제로는 DB에서 검증)
        if password != "autus2024":  # 데모 비밀번호
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # 토큰 생성
        access_token = create_access_token(
            data={
                "sub": user_id,
                "station_id": station_id,
                "role": "admin" if user_id == "admin" else "user",
            }
        )
        
        return Token(
            access_token=access_token,
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    
    @router.post("/api-key")
    async def create_api_key_endpoint(
        station_id: str,
        user: dict = Depends(require_admin)
    ):
        """API Key 생성 (관리자 전용)"""
        key = generate_api_key(station_id)
        return {
            "api_key": key,
            "station_id": station_id,
            "message": "⚠️ API Key는 한 번만 표시됩니다. 안전하게 보관하세요.",
        }
    
    @router.get("/me")
    async def get_me(user: dict = Depends(get_current_user)):
        """현재 인증 정보 확인"""
        return user
    
    @router.get("/status")
    async def auth_status():
        """인증 시스템 상태"""
        return {
            "auth_enabled": AuthConfig.AUTH_ENABLED,
            "jwt_available": JWT_AVAILABLE,
            "registered_api_keys": len(API_KEYS),
        }
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_default_api_keys():
    """기본 API Key 초기화 (개발용)"""
    if not AuthConfig.AUTH_ENABLED:
        return
    
    # 개발용 기본 키 생성
    dev_key = generate_api_key("DEV-STATION", "admin")
    print(f"🔐 개발용 API Key 생성: {dev_key[:20]}...")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🔐 AUTUS Auth System Test")
    print("=" * 50)
    
    # API Key 테스트
    print("\n1. API Key 생성...")
    key = generate_api_key("TEST-STORE-001")
    print(f"   생성된 키: {key[:30]}...")
    
    # 검증 테스트
    print("\n2. API Key 검증...")
    data = validate_api_key(key)
    print(f"   검증 결과: {data}")
    
    # JWT 테스트
    if JWT_AVAILABLE:
        print("\n3. JWT 토큰 생성...")
        token = create_access_token({"sub": "user123", "role": "admin"})
        print(f"   토큰: {token[:50]}...")
        
        print("\n4. JWT 토큰 검증...")
        decoded = decode_token(token)
        print(f"   디코드: {decoded}")
    else:
        print("\n3-4. JWT 테스트 스킵 (라이브러리 미설치)")
    
    print("\n✅ 테스트 완료!")

        role=role,
        created_at=datetime.now().isoformat(),
    )
    
    return key


def validate_api_key(key: str) -> Optional[APIKeyData]:
    """API Key 검증"""
    # 마스터 키 체크
    if AuthConfig.MASTER_API_KEY and key == AuthConfig.MASTER_API_KEY:
        return APIKeyData(
            key_id="master",
            station_id="*",
            role="admin",
            created_at="system",
        )
    
    return API_KEYS.get(key)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# JWT Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=500, detail="JWT library not available")
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 디코드"""
    if not JWT_AVAILABLE:
        return None
    
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        return TokenData(
            user_id=payload.get("sub", ""),
            station_id=payload.get("station_id"),
            role=payload.get("role", "user"),
        )
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Security Dependencies
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name=AuthConfig.API_KEY_HEADER, auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> Optional[Dict[str, Any]]:
    """
    현재 사용자/클라이언트 인증
    
    인증 방법:
    1. Bearer Token (JWT)
    2. X-API-Key Header
    """
    # 인증 비활성화 시 기본 사용자 반환
    if not AuthConfig.AUTH_ENABLED:
        return {"user_id": "anonymous", "role": "admin", "station_id": "*"}
    
    # 1. JWT Bearer 토큰 체크
    if credentials and credentials.credentials:
        token_data = decode_token(credentials.credentials)
        if token_data:
            return {
                "user_id": token_data.user_id,
                "station_id": token_data.station_id,
                "role": token_data.role,
                "auth_type": "jwt",
            }
    
    # 2. API Key 체크
    if api_key:
        key_data = validate_api_key(api_key)
        if key_data:
            return {
                "user_id": key_data.key_id,
                "station_id": key_data.station_id,
                "role": key_data.role,
                "auth_type": "api_key",
            }
    
    # 인증 실패
    raise HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """관리자 권한 필요"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def require_station(user: dict = Depends(get_current_user)) -> dict:
    """매장 권한 필요 (station 또는 admin)"""
    if user.get("role") not in ["admin", "station"]:
        raise HTTPException(status_code=403, detail="Station privileges required")
    return user


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Auth Router
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_auth_router():
    """인증 라우터 생성"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
    
    @router.post("/token", response_model=Token)
    async def login(user_id: str, password: str, station_id: Optional[str] = None):
        """
        로그인하여 JWT 토큰 발급
        
        (데모용 - 실제 환경에서는 DB 검증 필요)
        """
        # 간단한 검증 (실제로는 DB에서 검증)
        if password != "autus2024":  # 데모 비밀번호
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # 토큰 생성
        access_token = create_access_token(
            data={
                "sub": user_id,
                "station_id": station_id,
                "role": "admin" if user_id == "admin" else "user",
            }
        )
        
        return Token(
            access_token=access_token,
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    
    @router.post("/api-key")
    async def create_api_key_endpoint(
        station_id: str,
        user: dict = Depends(require_admin)
    ):
        """API Key 생성 (관리자 전용)"""
        key = generate_api_key(station_id)
        return {
            "api_key": key,
            "station_id": station_id,
            "message": "⚠️ API Key는 한 번만 표시됩니다. 안전하게 보관하세요.",
        }
    
    @router.get("/me")
    async def get_me(user: dict = Depends(get_current_user)):
        """현재 인증 정보 확인"""
        return user
    
    @router.get("/status")
    async def auth_status():
        """인증 시스템 상태"""
        return {
            "auth_enabled": AuthConfig.AUTH_ENABLED,
            "jwt_available": JWT_AVAILABLE,
            "registered_api_keys": len(API_KEYS),
        }
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_default_api_keys():
    """기본 API Key 초기화 (개발용)"""
    if not AuthConfig.AUTH_ENABLED:
        return
    
    # 개발용 기본 키 생성
    dev_key = generate_api_key("DEV-STATION", "admin")
    print(f"🔐 개발용 API Key 생성: {dev_key[:20]}...")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🔐 AUTUS Auth System Test")
    print("=" * 50)
    
    # API Key 테스트
    print("\n1. API Key 생성...")
    key = generate_api_key("TEST-STORE-001")
    print(f"   생성된 키: {key[:30]}...")
    
    # 검증 테스트
    print("\n2. API Key 검증...")
    data = validate_api_key(key)
    print(f"   검증 결과: {data}")
    
    # JWT 테스트
    if JWT_AVAILABLE:
        print("\n3. JWT 토큰 생성...")
        token = create_access_token({"sub": "user123", "role": "admin"})
        print(f"   토큰: {token[:50]}...")
        
        print("\n4. JWT 토큰 검증...")
        decoded = decode_token(token)
        print(f"   디코드: {decoded}")
    else:
        print("\n3-4. JWT 테스트 스킵 (라이브러리 미설치)")
    
    print("\n✅ 테스트 완료!")

        role=role,
        created_at=datetime.now().isoformat(),
    )
    
    return key


def validate_api_key(key: str) -> Optional[APIKeyData]:
    """API Key 검증"""
    # 마스터 키 체크
    if AuthConfig.MASTER_API_KEY and key == AuthConfig.MASTER_API_KEY:
        return APIKeyData(
            key_id="master",
            station_id="*",
            role="admin",
            created_at="system",
        )
    
    return API_KEYS.get(key)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# JWT Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=500, detail="JWT library not available")
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 디코드"""
    if not JWT_AVAILABLE:
        return None
    
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        return TokenData(
            user_id=payload.get("sub", ""),
            station_id=payload.get("station_id"),
            role=payload.get("role", "user"),
        )
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Security Dependencies
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name=AuthConfig.API_KEY_HEADER, auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> Optional[Dict[str, Any]]:
    """
    현재 사용자/클라이언트 인증
    
    인증 방법:
    1. Bearer Token (JWT)
    2. X-API-Key Header
    """
    # 인증 비활성화 시 기본 사용자 반환
    if not AuthConfig.AUTH_ENABLED:
        return {"user_id": "anonymous", "role": "admin", "station_id": "*"}
    
    # 1. JWT Bearer 토큰 체크
    if credentials and credentials.credentials:
        token_data = decode_token(credentials.credentials)
        if token_data:
            return {
                "user_id": token_data.user_id,
                "station_id": token_data.station_id,
                "role": token_data.role,
                "auth_type": "jwt",
            }
    
    # 2. API Key 체크
    if api_key:
        key_data = validate_api_key(api_key)
        if key_data:
            return {
                "user_id": key_data.key_id,
                "station_id": key_data.station_id,
                "role": key_data.role,
                "auth_type": "api_key",
            }
    
    # 인증 실패
    raise HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """관리자 권한 필요"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def require_station(user: dict = Depends(get_current_user)) -> dict:
    """매장 권한 필요 (station 또는 admin)"""
    if user.get("role") not in ["admin", "station"]:
        raise HTTPException(status_code=403, detail="Station privileges required")
    return user


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Auth Router
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_auth_router():
    """인증 라우터 생성"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
    
    @router.post("/token", response_model=Token)
    async def login(user_id: str, password: str, station_id: Optional[str] = None):
        """
        로그인하여 JWT 토큰 발급
        
        (데모용 - 실제 환경에서는 DB 검증 필요)
        """
        # 간단한 검증 (실제로는 DB에서 검증)
        if password != "autus2024":  # 데모 비밀번호
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # 토큰 생성
        access_token = create_access_token(
            data={
                "sub": user_id,
                "station_id": station_id,
                "role": "admin" if user_id == "admin" else "user",
            }
        )
        
        return Token(
            access_token=access_token,
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    
    @router.post("/api-key")
    async def create_api_key_endpoint(
        station_id: str,
        user: dict = Depends(require_admin)
    ):
        """API Key 생성 (관리자 전용)"""
        key = generate_api_key(station_id)
        return {
            "api_key": key,
            "station_id": station_id,
            "message": "⚠️ API Key는 한 번만 표시됩니다. 안전하게 보관하세요.",
        }
    
    @router.get("/me")
    async def get_me(user: dict = Depends(get_current_user)):
        """현재 인증 정보 확인"""
        return user
    
    @router.get("/status")
    async def auth_status():
        """인증 시스템 상태"""
        return {
            "auth_enabled": AuthConfig.AUTH_ENABLED,
            "jwt_available": JWT_AVAILABLE,
            "registered_api_keys": len(API_KEYS),
        }
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_default_api_keys():
    """기본 API Key 초기화 (개발용)"""
    if not AuthConfig.AUTH_ENABLED:
        return
    
    # 개발용 기본 키 생성
    dev_key = generate_api_key("DEV-STATION", "admin")
    print(f"🔐 개발용 API Key 생성: {dev_key[:20]}...")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🔐 AUTUS Auth System Test")
    print("=" * 50)
    
    # API Key 테스트
    print("\n1. API Key 생성...")
    key = generate_api_key("TEST-STORE-001")
    print(f"   생성된 키: {key[:30]}...")
    
    # 검증 테스트
    print("\n2. API Key 검증...")
    data = validate_api_key(key)
    print(f"   검증 결과: {data}")
    
    # JWT 테스트
    if JWT_AVAILABLE:
        print("\n3. JWT 토큰 생성...")
        token = create_access_token({"sub": "user123", "role": "admin"})
        print(f"   토큰: {token[:50]}...")
        
        print("\n4. JWT 토큰 검증...")
        decoded = decode_token(token)
        print(f"   디코드: {decoded}")
    else:
        print("\n3-4. JWT 테스트 스킵 (라이브러리 미설치)")
    
    print("\n✅ 테스트 완료!")

        role=role,
        created_at=datetime.now().isoformat(),
    )
    
    return key


def validate_api_key(key: str) -> Optional[APIKeyData]:
    """API Key 검증"""
    # 마스터 키 체크
    if AuthConfig.MASTER_API_KEY and key == AuthConfig.MASTER_API_KEY:
        return APIKeyData(
            key_id="master",
            station_id="*",
            role="admin",
            created_at="system",
        )
    
    return API_KEYS.get(key)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# JWT Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=500, detail="JWT library not available")
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 디코드"""
    if not JWT_AVAILABLE:
        return None
    
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        return TokenData(
            user_id=payload.get("sub", ""),
            station_id=payload.get("station_id"),
            role=payload.get("role", "user"),
        )
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Security Dependencies
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name=AuthConfig.API_KEY_HEADER, auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> Optional[Dict[str, Any]]:
    """
    현재 사용자/클라이언트 인증
    
    인증 방법:
    1. Bearer Token (JWT)
    2. X-API-Key Header
    """
    # 인증 비활성화 시 기본 사용자 반환
    if not AuthConfig.AUTH_ENABLED:
        return {"user_id": "anonymous", "role": "admin", "station_id": "*"}
    
    # 1. JWT Bearer 토큰 체크
    if credentials and credentials.credentials:
        token_data = decode_token(credentials.credentials)
        if token_data:
            return {
                "user_id": token_data.user_id,
                "station_id": token_data.station_id,
                "role": token_data.role,
                "auth_type": "jwt",
            }
    
    # 2. API Key 체크
    if api_key:
        key_data = validate_api_key(api_key)
        if key_data:
            return {
                "user_id": key_data.key_id,
                "station_id": key_data.station_id,
                "role": key_data.role,
                "auth_type": "api_key",
            }
    
    # 인증 실패
    raise HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """관리자 권한 필요"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def require_station(user: dict = Depends(get_current_user)) -> dict:
    """매장 권한 필요 (station 또는 admin)"""
    if user.get("role") not in ["admin", "station"]:
        raise HTTPException(status_code=403, detail="Station privileges required")
    return user


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Auth Router
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_auth_router():
    """인증 라우터 생성"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
    
    @router.post("/token", response_model=Token)
    async def login(user_id: str, password: str, station_id: Optional[str] = None):
        """
        로그인하여 JWT 토큰 발급
        
        (데모용 - 실제 환경에서는 DB 검증 필요)
        """
        # 간단한 검증 (실제로는 DB에서 검증)
        if password != "autus2024":  # 데모 비밀번호
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # 토큰 생성
        access_token = create_access_token(
            data={
                "sub": user_id,
                "station_id": station_id,
                "role": "admin" if user_id == "admin" else "user",
            }
        )
        
        return Token(
            access_token=access_token,
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    
    @router.post("/api-key")
    async def create_api_key_endpoint(
        station_id: str,
        user: dict = Depends(require_admin)
    ):
        """API Key 생성 (관리자 전용)"""
        key = generate_api_key(station_id)
        return {
            "api_key": key,
            "station_id": station_id,
            "message": "⚠️ API Key는 한 번만 표시됩니다. 안전하게 보관하세요.",
        }
    
    @router.get("/me")
    async def get_me(user: dict = Depends(get_current_user)):
        """현재 인증 정보 확인"""
        return user
    
    @router.get("/status")
    async def auth_status():
        """인증 시스템 상태"""
        return {
            "auth_enabled": AuthConfig.AUTH_ENABLED,
            "jwt_available": JWT_AVAILABLE,
            "registered_api_keys": len(API_KEYS),
        }
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_default_api_keys():
    """기본 API Key 초기화 (개발용)"""
    if not AuthConfig.AUTH_ENABLED:
        return
    
    # 개발용 기본 키 생성
    dev_key = generate_api_key("DEV-STATION", "admin")
    print(f"🔐 개발용 API Key 생성: {dev_key[:20]}...")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🔐 AUTUS Auth System Test")
    print("=" * 50)
    
    # API Key 테스트
    print("\n1. API Key 생성...")
    key = generate_api_key("TEST-STORE-001")
    print(f"   생성된 키: {key[:30]}...")
    
    # 검증 테스트
    print("\n2. API Key 검증...")
    data = validate_api_key(key)
    print(f"   검증 결과: {data}")
    
    # JWT 테스트
    if JWT_AVAILABLE:
        print("\n3. JWT 토큰 생성...")
        token = create_access_token({"sub": "user123", "role": "admin"})
        print(f"   토큰: {token[:50]}...")
        
        print("\n4. JWT 토큰 검증...")
        decoded = decode_token(token)
        print(f"   디코드: {decoded}")
    else:
        print("\n3-4. JWT 테스트 스킵 (라이브러리 미설치)")
    
    print("\n✅ 테스트 완료!")

        role=role,
        created_at=datetime.now().isoformat(),
    )
    
    return key


def validate_api_key(key: str) -> Optional[APIKeyData]:
    """API Key 검증"""
    # 마스터 키 체크
    if AuthConfig.MASTER_API_KEY and key == AuthConfig.MASTER_API_KEY:
        return APIKeyData(
            key_id="master",
            station_id="*",
            role="admin",
            created_at="system",
        )
    
    return API_KEYS.get(key)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# JWT Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=500, detail="JWT library not available")
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 디코드"""
    if not JWT_AVAILABLE:
        return None
    
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        return TokenData(
            user_id=payload.get("sub", ""),
            station_id=payload.get("station_id"),
            role=payload.get("role", "user"),
        )
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Security Dependencies
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name=AuthConfig.API_KEY_HEADER, auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> Optional[Dict[str, Any]]:
    """
    현재 사용자/클라이언트 인증
    
    인증 방법:
    1. Bearer Token (JWT)
    2. X-API-Key Header
    """
    # 인증 비활성화 시 기본 사용자 반환
    if not AuthConfig.AUTH_ENABLED:
        return {"user_id": "anonymous", "role": "admin", "station_id": "*"}
    
    # 1. JWT Bearer 토큰 체크
    if credentials and credentials.credentials:
        token_data = decode_token(credentials.credentials)
        if token_data:
            return {
                "user_id": token_data.user_id,
                "station_id": token_data.station_id,
                "role": token_data.role,
                "auth_type": "jwt",
            }
    
    # 2. API Key 체크
    if api_key:
        key_data = validate_api_key(api_key)
        if key_data:
            return {
                "user_id": key_data.key_id,
                "station_id": key_data.station_id,
                "role": key_data.role,
                "auth_type": "api_key",
            }
    
    # 인증 실패
    raise HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """관리자 권한 필요"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def require_station(user: dict = Depends(get_current_user)) -> dict:
    """매장 권한 필요 (station 또는 admin)"""
    if user.get("role") not in ["admin", "station"]:
        raise HTTPException(status_code=403, detail="Station privileges required")
    return user


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Auth Router
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_auth_router():
    """인증 라우터 생성"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
    
    @router.post("/token", response_model=Token)
    async def login(user_id: str, password: str, station_id: Optional[str] = None):
        """
        로그인하여 JWT 토큰 발급
        
        (데모용 - 실제 환경에서는 DB 검증 필요)
        """
        # 간단한 검증 (실제로는 DB에서 검증)
        if password != "autus2024":  # 데모 비밀번호
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # 토큰 생성
        access_token = create_access_token(
            data={
                "sub": user_id,
                "station_id": station_id,
                "role": "admin" if user_id == "admin" else "user",
            }
        )
        
        return Token(
            access_token=access_token,
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    
    @router.post("/api-key")
    async def create_api_key_endpoint(
        station_id: str,
        user: dict = Depends(require_admin)
    ):
        """API Key 생성 (관리자 전용)"""
        key = generate_api_key(station_id)
        return {
            "api_key": key,
            "station_id": station_id,
            "message": "⚠️ API Key는 한 번만 표시됩니다. 안전하게 보관하세요.",
        }
    
    @router.get("/me")
    async def get_me(user: dict = Depends(get_current_user)):
        """현재 인증 정보 확인"""
        return user
    
    @router.get("/status")
    async def auth_status():
        """인증 시스템 상태"""
        return {
            "auth_enabled": AuthConfig.AUTH_ENABLED,
            "jwt_available": JWT_AVAILABLE,
            "registered_api_keys": len(API_KEYS),
        }
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_default_api_keys():
    """기본 API Key 초기화 (개발용)"""
    if not AuthConfig.AUTH_ENABLED:
        return
    
    # 개발용 기본 키 생성
    dev_key = generate_api_key("DEV-STATION", "admin")
    print(f"🔐 개발용 API Key 생성: {dev_key[:20]}...")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🔐 AUTUS Auth System Test")
    print("=" * 50)
    
    # API Key 테스트
    print("\n1. API Key 생성...")
    key = generate_api_key("TEST-STORE-001")
    print(f"   생성된 키: {key[:30]}...")
    
    # 검증 테스트
    print("\n2. API Key 검증...")
    data = validate_api_key(key)
    print(f"   검증 결과: {data}")
    
    # JWT 테스트
    if JWT_AVAILABLE:
        print("\n3. JWT 토큰 생성...")
        token = create_access_token({"sub": "user123", "role": "admin"})
        print(f"   토큰: {token[:50]}...")
        
        print("\n4. JWT 토큰 검증...")
        decoded = decode_token(token)
        print(f"   디코드: {decoded}")
    else:
        print("\n3-4. JWT 테스트 스킵 (라이브러리 미설치)")
    
    print("\n✅ 테스트 완료!")

        role=role,
        created_at=datetime.now().isoformat(),
    )
    
    return key


def validate_api_key(key: str) -> Optional[APIKeyData]:
    """API Key 검증"""
    # 마스터 키 체크
    if AuthConfig.MASTER_API_KEY and key == AuthConfig.MASTER_API_KEY:
        return APIKeyData(
            key_id="master",
            station_id="*",
            role="admin",
            created_at="system",
        )
    
    return API_KEYS.get(key)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# JWT Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=500, detail="JWT library not available")
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 디코드"""
    if not JWT_AVAILABLE:
        return None
    
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        return TokenData(
            user_id=payload.get("sub", ""),
            station_id=payload.get("station_id"),
            role=payload.get("role", "user"),
        )
    except JWTError:
        return None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Security Dependencies
# ═══════════════════════════════════════════════════════════════════════════════════════════

# Security schemes
bearer_scheme = HTTPBearer(auto_error=False)
api_key_header = APIKeyHeader(name=AuthConfig.API_KEY_HEADER, auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    api_key: Optional[str] = Security(api_key_header),
) -> Optional[Dict[str, Any]]:
    """
    현재 사용자/클라이언트 인증
    
    인증 방법:
    1. Bearer Token (JWT)
    2. X-API-Key Header
    """
    # 인증 비활성화 시 기본 사용자 반환
    if not AuthConfig.AUTH_ENABLED:
        return {"user_id": "anonymous", "role": "admin", "station_id": "*"}
    
    # 1. JWT Bearer 토큰 체크
    if credentials and credentials.credentials:
        token_data = decode_token(credentials.credentials)
        if token_data:
            return {
                "user_id": token_data.user_id,
                "station_id": token_data.station_id,
                "role": token_data.role,
                "auth_type": "jwt",
            }
    
    # 2. API Key 체크
    if api_key:
        key_data = validate_api_key(api_key)
        if key_data:
            return {
                "user_id": key_data.key_id,
                "station_id": key_data.station_id,
                "role": key_data.role,
                "auth_type": "api_key",
            }
    
    # 인증 실패
    raise HTTPException(
        status_code=401,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """관리자 권한 필요"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


async def require_station(user: dict = Depends(get_current_user)) -> dict:
    """매장 권한 필요 (station 또는 admin)"""
    if user.get("role") not in ["admin", "station"]:
        raise HTTPException(status_code=403, detail="Station privileges required")
    return user


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Auth Router
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_auth_router():
    """인증 라우터 생성"""
    from fastapi import APIRouter
    
    router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
    
    @router.post("/token", response_model=Token)
    async def login(user_id: str, password: str, station_id: Optional[str] = None):
        """
        로그인하여 JWT 토큰 발급
        
        (데모용 - 실제 환경에서는 DB 검증 필요)
        """
        # 간단한 검증 (실제로는 DB에서 검증)
        if password != "autus2024":  # 데모 비밀번호
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # 토큰 생성
        access_token = create_access_token(
            data={
                "sub": user_id,
                "station_id": station_id,
                "role": "admin" if user_id == "admin" else "user",
            }
        )
        
        return Token(
            access_token=access_token,
            expires_in=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    
    @router.post("/api-key")
    async def create_api_key_endpoint(
        station_id: str,
        user: dict = Depends(require_admin)
    ):
        """API Key 생성 (관리자 전용)"""
        key = generate_api_key(station_id)
        return {
            "api_key": key,
            "station_id": station_id,
            "message": "⚠️ API Key는 한 번만 표시됩니다. 안전하게 보관하세요.",
        }
    
    @router.get("/me")
    async def get_me(user: dict = Depends(get_current_user)):
        """현재 인증 정보 확인"""
        return user
    
    @router.get("/status")
    async def auth_status():
        """인증 시스템 상태"""
        return {
            "auth_enabled": AuthConfig.AUTH_ENABLED,
            "jwt_available": JWT_AVAILABLE,
            "registered_api_keys": len(API_KEYS),
        }
    
    return router


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_default_api_keys():
    """기본 API Key 초기화 (개발용)"""
    if not AuthConfig.AUTH_ENABLED:
        return
    
    # 개발용 기본 키 생성
    dev_key = generate_api_key("DEV-STATION", "admin")
    print(f"🔐 개발용 API Key 생성: {dev_key[:20]}...")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("🔐 AUTUS Auth System Test")
    print("=" * 50)
    
    # API Key 테스트
    print("\n1. API Key 생성...")
    key = generate_api_key("TEST-STORE-001")
    print(f"   생성된 키: {key[:30]}...")
    
    # 검증 테스트
    print("\n2. API Key 검증...")
    data = validate_api_key(key)
    print(f"   검증 결과: {data}")
    
    # JWT 테스트
    if JWT_AVAILABLE:
        print("\n3. JWT 토큰 생성...")
        token = create_access_token({"sub": "user123", "role": "admin"})
        print(f"   토큰: {token[:50]}...")
        
        print("\n4. JWT 토큰 검증...")
        decoded = decode_token(token)
        print(f"   디코드: {decoded}")
    else:
        print("\n3-4. JWT 테스트 스킵 (라이브러리 미설치)")
    
    print("\n✅ 테스트 완료!")

        role=role,
        created_at=datetime.now().isoformat(),
    )
    
    return key


def validate_api_key(key: str) -> Optional[APIKeyData]:
    """API Key 검증"""
    # 마스터 키 체크
    if AuthConfig.MASTER_API_KEY and key == AuthConfig.MASTER_API_KEY:
        return APIKeyData(
            key_id="master",
            station_id="*",
            role="admin",
            created_at="system",
        )
    
    return API_KEYS.get(key)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# JWT Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """JWT 액세스 토큰 생성"""
    if not JWT_AVAILABLE:
        raise HTTPException(status_code=500, detail="JWT library not available")
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=AuthConfig.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    return jwt.encode(to_encode, AuthConfig.SECRET_KEY, algorithm=AuthConfig.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    """JWT 토큰 디코드"""
    if not JWT_AVAILABLE:
        return None
    
    try:
        payload = jwt.decode(token, AuthConfig.SECRET_KEY, algorithms=[AuthConfig.ALGORITHM])
        return TokenData(
            user_id=payload.get("sub", ""),
            station_id=payload.get("station_id"),
            role=payload.get("role", "user"),
        )
    except JWTError:
        return None
