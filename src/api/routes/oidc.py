from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from api.oidc_auth import oidc_provider

router = APIRouter(prefix="/oidc", tags=["oidc"])

class ClientRegister(BaseModel):
    name: str
    redirect_uri: str

class AuthorizeRequest(BaseModel):
    client_id: str
    scope: List[str]
    state: str

class TokenRequest(BaseModel):
    code: str
    client_id: str
    client_secret: str

@router.post("/client/register")
async def register_client(data: ClientRegister):
    result = oidc_provider.register_client(data.name, data.redirect_uri)
    return result

@router.post("/authorize")
async def authorize(data: AuthorizeRequest):
    code = oidc_provider.authorize(data.client_id, data.scope, data.state)
    if not code:
        raise HTTPException(status_code=400, detail="Invalid client")
    return {"code": code}

@router.post("/token")
async def get_token(data: TokenRequest):
    result = oidc_provider.token(data.code, data.client_id, data.client_secret)
    if not result:
        raise HTTPException(status_code=400, detail="Invalid request")
    return result

@router.get("/validate/{token}")
async def validate_token(token: str):
    result = oidc_provider.validate_token(token)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"valid": True, "data": result}

@router.get("/stats")
async def get_stats():
    return oidc_provider.get_stats()
