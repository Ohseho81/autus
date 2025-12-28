"""
AUTUS Authentication Middleware
===============================

FastAPI 인증 미들웨어

Version: 1.0.0
Status: PRODUCTION
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .jwt import verify_token
from ..db.repository import Repository, get_db

# ================================================================
# SECURITY SCHEME
# ================================================================

security = HTTPBearer(auto_error=False)


# ================================================================
# DEPENDENCY FUNCTIONS
# ================================================================

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db)
) -> dict:
    """
    현재 인증된 사용자 반환 (필수)
    
    Raises:
        HTTPException: 인증 실패 시
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="인증이 필요합니다",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않은 토큰입니다",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰에 사용자 정보가 없습니다"
        )
    
    # 사용자 조회
    repo = Repository(db)
    user = repo.get_user_by_id(int(user_id))
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없습니다"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정입니다"
        )
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email
    }


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db = Depends(get_db)
) -> Optional[dict]:
    """
    현재 인증된 사용자 반환 (선택적)
    
    인증 실패해도 예외 발생하지 않음 (None 반환)
    """
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = verify_token(token)
    
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    repo = Repository(db)
    user = repo.get_user_by_id(int(user_id))
    
    if not user or not user.is_active:
        return None
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email
    }





