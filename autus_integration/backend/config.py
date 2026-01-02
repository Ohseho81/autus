# backend/config.py
# AUTUS 환경변수 관리

from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """
    AUTUS 환경변수 설정
    
    우선순위: 환경변수 > .env 파일 > 기본값
    """
    
    # ═══════════════════════════════════════════════════════════════
    # 앱 설정
    # ═══════════════════════════════════════════════════════════════
    APP_NAME: str = "AUTUS Integration Hub"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development, staging, production
    
    # ═══════════════════════════════════════════════════════════════
    # 서버 설정
    # ═══════════════════════════════════════════════════════════════
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # ═══════════════════════════════════════════════════════════════
    # 데이터베이스
    # ═══════════════════════════════════════════════════════════════
    # PostgreSQL
    DATABASE_URL: str = "postgresql://autus:password@localhost:5432/autus"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    
    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # ═══════════════════════════════════════════════════════════════
    # 결제 연동
    # ═══════════════════════════════════════════════════════════════
    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # Shopify
    SHOPIFY_API_SECRET: Optional[str] = None
    
    # 토스페이먼츠
    TOSS_SECRET_KEY: Optional[str] = None
    TOSS_CLIENT_KEY: Optional[str] = None
    
    # 카카오페이
    KAKAOPAY_ADMIN_KEY: Optional[str] = None
    KAKAOPAY_CID: Optional[str] = None
    
    # ═══════════════════════════════════════════════════════════════
    # AI/LLM
    # ═══════════════════════════════════════════════════════════════
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    
    # CrewAI
    CREWAI_MODEL: str = "gpt-4o"
    
    # ═══════════════════════════════════════════════════════════════
    # 알림
    # ═══════════════════════════════════════════════════════════════
    SLACK_WEBHOOK_URL: Optional[str] = None
    SLACK_CHANNEL: str = "#autus-alerts"
    
    # ═══════════════════════════════════════════════════════════════
    # n8n
    # ═══════════════════════════════════════════════════════════════
    N8N_URL: str = "http://localhost:5678"
    N8N_API_KEY: Optional[str] = None
    
    # ═══════════════════════════════════════════════════════════════
    # CORS
    # ═══════════════════════════════════════════════════════════════
    CORS_ORIGINS: str = "*"
    
    # ═══════════════════════════════════════════════════════════════
    # 보안
    # ═══════════════════════════════════════════════════════════════
    SECRET_KEY: str = "autus-secret-key-change-in-production"
    API_KEY_HEADER: str = "X-API-Key"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """설정 싱글톤"""
    return Settings()


# 전역 설정 인스턴스
settings = get_settings()


# backend/config.py
# AUTUS 환경변수 관리

from pydantic_settings import BaseSettings
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """
    AUTUS 환경변수 설정
    
    우선순위: 환경변수 > .env 파일 > 기본값
    """
    
    # ═══════════════════════════════════════════════════════════════
    # 앱 설정
    # ═══════════════════════════════════════════════════════════════
    APP_NAME: str = "AUTUS Integration Hub"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development, staging, production
    
    # ═══════════════════════════════════════════════════════════════
    # 서버 설정
    # ═══════════════════════════════════════════════════════════════
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # ═══════════════════════════════════════════════════════════════
    # 데이터베이스
    # ═══════════════════════════════════════════════════════════════
    # PostgreSQL
    DATABASE_URL: str = "postgresql://autus:password@localhost:5432/autus"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    
    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # ═══════════════════════════════════════════════════════════════
    # 결제 연동
    # ═══════════════════════════════════════════════════════════════
    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # Shopify
    SHOPIFY_API_SECRET: Optional[str] = None
    
    # 토스페이먼츠
    TOSS_SECRET_KEY: Optional[str] = None
    TOSS_CLIENT_KEY: Optional[str] = None
    
    # 카카오페이
    KAKAOPAY_ADMIN_KEY: Optional[str] = None
    KAKAOPAY_CID: Optional[str] = None
    
    # ═══════════════════════════════════════════════════════════════
    # AI/LLM
    # ═══════════════════════════════════════════════════════════════
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    
    # CrewAI
    CREWAI_MODEL: str = "gpt-4o"
    
    # ═══════════════════════════════════════════════════════════════
    # 알림
    # ═══════════════════════════════════════════════════════════════
    SLACK_WEBHOOK_URL: Optional[str] = None
    SLACK_CHANNEL: str = "#autus-alerts"
    
    # ═══════════════════════════════════════════════════════════════
    # n8n
    # ═══════════════════════════════════════════════════════════════
    N8N_URL: str = "http://localhost:5678"
    N8N_API_KEY: Optional[str] = None
    
    # ═══════════════════════════════════════════════════════════════
    # CORS
    # ═══════════════════════════════════════════════════════════════
    CORS_ORIGINS: str = "*"
    
    # ═══════════════════════════════════════════════════════════════
    # 보안
    # ═══════════════════════════════════════════════════════════════
    SECRET_KEY: str = "autus-secret-key-change-in-production"
    API_KEY_HEADER: str = "X-API-Key"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """설정 싱글톤"""
    return Settings()


# 전역 설정 인스턴스
settings = get_settings()







