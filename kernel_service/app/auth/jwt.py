"""
AUTUS JWT Authentication
========================

JWT 토큰 생성 및 검증

Version: 1.0.0
Status: PRODUCTION
"""

import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import jwt

# ================================================================
# CONFIGURATION
# ================================================================

SECRET_KEY = os.getenv("SECRET_KEY", "autus-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24시간


# ================================================================
# PASSWORD FUNCTIONS (SHA256 + Salt)
# ================================================================

def get_password_hash(password: str) -> str:
    """비밀번호 해시 생성 (SHA256 + Salt)"""
    salt = secrets.token_hex(16)
    pw_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return f"{salt}${pw_hash}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """비밀번호 검증"""
    try:
        salt, stored_hash = hashed_password.split("$")
        pw_hash = hashlib.sha256((plain_password + salt).encode()).hexdigest()
        return secrets.compare_digest(pw_hash, stored_hash)
    except ValueError:
        return False


# ================================================================
# JWT FUNCTIONS
# ================================================================

def create_access_token(
    data: Dict[str, Any], 
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    JWT 액세스 토큰 생성
    
    Args:
        data: 토큰에 포함할 데이터 (sub: user_id 필수)
        expires_delta: 만료 시간
    
    Returns:
        JWT 토큰 문자열
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    })
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """
    JWT 토큰 검증
    
    Args:
        token: JWT 토큰 문자열
    
    Returns:
        토큰 페이로드 또는 None (검증 실패 시)
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def create_refresh_token(user_id: int) -> str:
    """리프레시 토큰 생성 (7일)"""
    expire = datetime.utcnow() + timedelta(days=7)
    
    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    }
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """토큰 디코딩 (검증 없이)"""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
    except jwt.InvalidTokenError:
        return None





