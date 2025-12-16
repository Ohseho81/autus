# app/settings.py
"""
AUTUS Settings — Environment Configuration
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/autus"
    
    # App Info
    APP_NAME: str = "AUTUS"
    APP_VERSION: str = "1.0.0"
    APP_DESCRIPTION: str = "The Operating System of Reality"
    
    # Debug
    DEBUG: bool = True
    
    # API
    API_PREFIX: str = "/api/v1"
    
    # CORS
    CORS_ORIGINS: list[str] = ["*"]
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance"""
    return Settings()


settings = get_settings()
