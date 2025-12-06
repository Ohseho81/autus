from datetime import datetime, timedelta
from typing import Optional, Dict, List
import hashlib
import secrets
import json

class OIDCProvider:
    def __init__(self, issuer: str = "https://autus-ai.com"):
        self.issuer = issuer
        self.tokens: Dict[str, dict] = {}
        self.clients: Dict[str, dict] = {}
        self.auth_codes: Dict[str, dict] = {}

    def register_client(self, client_name: str, redirect_uri: str) -> dict:
        client_id = secrets.token_urlsafe(16)
        client_secret = secrets.token_urlsafe(32)
        self.clients[client_id] = {
            "name": client_name,
            "secret": client_secret,
            "redirect_uri": redirect_uri,
            "created_at": datetime.now().isoformat()
        }
        return {"client_id": client_id, "client_secret": client_secret}

    def authorize(self, client_id: str, scope: List[str], state: str) -> Optional[str]:
        if client_id not in self.clients:
            return None
        code = secrets.token_urlsafe(32)
        self.auth_codes[code] = {
            "client_id": client_id,
            "scope": scope,
            "state": state,
            "expires_at": (datetime.now() + timedelta(minutes=10)).isoformat()
        }
        return code

    def token(self, code: str, client_id: str, client_secret: str) -> Optional[dict]:
        if code not in self.auth_codes:
            return None
        auth = self.auth_codes[code]
        if auth["client_id"] != client_id:
            return None
        client = self.clients.get(client_id)
        if not client or client["secret"] != client_secret:
            return None
        
        access_token = secrets.token_urlsafe(32)
        refresh_token = secrets.token_urlsafe(32)
        id_token = self._create_id_token(client_id, auth["scope"])
        
        self.tokens[access_token] = {
            "client_id": client_id,
            "scope": auth["scope"],
            "expires_at": (datetime.now() + timedelta(hours=1)).isoformat()
        }
        
        del self.auth_codes[code]
        
        return {
            "access_token": access_token,
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": refresh_token,
            "id_token": id_token
        }

    def _create_id_token(self, client_id: str, scope: List[str]) -> str:
        payload = {
            "iss": self.issuer,
            "sub": client_id,
            "aud": client_id,
            "exp": (datetime.now() + timedelta(hours=1)).timestamp(),
            "iat": datetime.now().timestamp(),
            "scope": scope
        }
        return hashlib.sha256(json.dumps(payload).encode()).hexdigest()

    def validate_token(self, token: str) -> Optional[dict]:
        if token not in self.tokens:
            return None
        token_data = self.tokens[token]
        if datetime.fromisoformat(token_data["expires_at"]) < datetime.now():
            del self.tokens[token]
            return None
        return token_data

    def get_stats(self) -> dict:
        return {
            "registered_clients": len(self.clients),
            "active_tokens": len(self.tokens),
            "pending_auth_codes": len(self.auth_codes)
        }

oidc_provider = OIDCProvider()
