"""
AUTUS Configuration
환경 설정 관리
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # App
    APP_NAME: str = "AUTUS API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Database - PostgreSQL
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "autus"
    POSTGRES_PASSWORD: str = "autus_password"
    POSTGRES_DB: str = "autus_db"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    @property
    def DATABASE_URL_SYNC(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Neo4j - Graph DB
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "neo4j_password"
    
    # Redis - Cache
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # JWT Auth
    JWT_SECRET_KEY: str = "autus-secret-key-change-in-production-2025"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    
    # Physics Engine Settings
    SYNERGY_RATE: float = 0.1          # 시너지율 기본값 (10%)
    ENTROPY_THRESHOLD: float = 0.0     # 엔트로피 컷 기준 (V ≤ 0)
    TIME_COST_RATE: float = 50000      # 시급 (₩50,000)
    MAX_SYNERGY_DEPTH: int = 2         # 시너지 계산 최대 깊이
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """설정 싱글톤"""
    return Settings()


settings = get_settings()

    ENTROPY_THRESHOLD: float = 0.0     # 엔트로피 컷 기준 (V ≤ 0)
    TIME_COST_RATE: float = 50000      # 시급 (₩50,000)
    MAX_SYNERGY_DEPTH: int = 2         # 시너지 계산 최대 깊이
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """설정 싱글톤"""
    return Settings()

