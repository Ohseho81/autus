from pydantic import BaseModel

class Settings(BaseModel):
    app_name: str = "autus-physics-api"
    version: str = "physics-ui-v1"
    cors_allow_origins: list[str] = ["*"]

settings = Settings()
