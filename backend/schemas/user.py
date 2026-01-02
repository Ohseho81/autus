"""
User Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """사용자 생성"""
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    """사용자 응답"""
    id: int
    email: str
    is_active: bool
    is_admin: bool
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """로그인 요청"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT 토큰"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    """토큰 페이로드"""
    user_id: Optional[int] = None





"""
User Schemas
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    """사용자 생성"""
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    """사용자 응답"""
    id: int
    email: str
    is_active: bool
    is_admin: bool
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    """로그인 요청"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """JWT 토큰"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    """토큰 페이로드"""
    user_id: Optional[int] = None











