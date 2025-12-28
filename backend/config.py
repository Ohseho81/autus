"""
AUTUS Backend Configuration
===========================

환경 변수 및 설정 관리
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # 앱 정보
    APP_NAME: str = "AUTUS"
    APP_VERSION: str = "3.0.0"
    DEBUG: bool = False
    
    # 서버
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # 데이터베이스
    DATABASE_URL: str = "postgresql+asyncpg://autus:autus2025@localhost:5432/autus"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT
    JWT_SECRET: str = "autus-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS
    CORS_ORIGINS: str = "*"
    
    # 스케줄러
    SCHEDULER_ENABLED: bool = True
    
    # 로깅
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# 설정 인스턴스
settings = Settings()


def get_settings() -> Settings:
    """설정 인스턴스 반환"""
    return settings

