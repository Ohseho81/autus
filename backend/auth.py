"""
AUTUS Backend Authentication
============================

JWT 기반 인증
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import settings


security = HTTPBearer(auto_error=False)


class AuthHandler:
    """JWT 인증 핸들러"""
    
    def __init__(self):
        self.secret = settings.JWT_SECRET
        self.algorithm = settings.JWT_ALGORITHM
        self.expiration_hours = settings.JWT_EXPIRATION_HOURS
    
    def create_token(self, payload: Dict[str, Any]) -> str:
        """JWT 토큰 생성"""
        to_encode = payload.copy()
        
        expire = datetime.utcnow() + timedelta(hours=self.expiration_hours)
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
        })
        
        token = jwt.encode(to_encode, self.secret, algorithm=self.algorithm)
        return token
    
    def decode_token(self, token: str) -> Dict[str, Any]:
        """JWT 토큰 디코딩"""
        try:
            payload = jwt.decode(token, self.secret, algorithms=[self.algorithm])
            return payload
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    def verify_token(self, token: str) -> bool:
        """토큰 유효성 검증"""
        try:
            self.decode_token(token)
            return True
        except HTTPException:
            return False


# 인스턴스
auth_handler = AuthHandler()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Dict[str, Any]:
    """현재 사용자 조회 (의존성)"""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = auth_handler.decode_token(credentials.credentials)
        return payload
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[Dict[str, Any]]:
    """현재 사용자 조회 (선택적)"""
    if credentials is None:
        return None
    
    try:
        return auth_handler.decode_token(credentials.credentials)
    except HTTPException:
        return None

