import os
from typing import Optional
from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "AUTUS"
    version: str = "2.0.0"
    debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # API
    api_prefix: str = "/api"
    api_v1_prefix: str = "/api/v1"
    api_v2_prefix: str = "/api/v2"
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///autus.db")
    
    # External APIs
    anthropic_api_key: Optional[str] = os.getenv("ANTHROPIC_API_KEY")
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    # SMTP
    smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port: int = int(os.getenv("SMTP_PORT", "587"))
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_pass: str = os.getenv("SMTP_PASS", "")
    
    # Rate Limiting
    rate_limit_requests: int = 100
    rate_limit_window: int = 60
    
    # Workers
    worker_concurrency: int = 4
    
    class Config:
        env_file = ".env"

settings = Settings()
