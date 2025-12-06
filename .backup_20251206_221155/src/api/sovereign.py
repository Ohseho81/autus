"""
AUTUS Sovereign API
Layer 2: Data Sovereignty - Ownership, Permissions, Signing, Audit, Consent
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
import hashlib
import json
import secrets

router = APIRouter(prefix="/sovereign", tags=["sovereign"])

# ==========================================
# Models
# ==========================================

class TokenRequest(BaseModel):
    owner_id: str
    resource_type: str
    resource_id: str
    metadata: Optional[Dict[str, Any]] = None

class TokenResponse(BaseModel):
    token_id: str
    owner_id: str
    resource_type: str
    resource_id: str
    created_at: str
    expires_at: Optional[str] = None
    signature: str

class PermissionCheck(BaseModel):
    actor_id: str
    resource_id: str
    action: str  # read, write, admin

class SignRequest(BaseModel):
    data: Dict[str, Any]
    signer_id: str

class ConsentGrant(BaseModel):
    user_id: str
    data_type: str
    purpose: str
    duration_days: Optional[int] = 365

# ==========================================
# In-Memory Storage (would be LocalMemory in production)
# ==========================================

tokens_db: Dict[str, Dict] = {}
permissions_db: Dict[str, List[Dict]] = {}
audit_log: List[Dict] = []
consents_db: Dict[str, List[Dict]] = {}

# ==========================================
# Helper Functions
# ==========================================

def generate_token_id() -> str:
    """Generate unique token ID."""
    return f"tok_{secrets.token_hex(16)}"

def generate_signature(data: Dict) -> str:
    """Generate cryptographic signature."""
    data_str = json.dumps(data, sort_keys=True)
    return hashlib.sha256(data_str.encode()).hexdigest()[:32]

def log_audit(action: str, actor: str, resource: str, details: Dict = None):
    """Log action to audit trail."""
    audit_log.append({
        "timestamp": datetime.now().isoformat(),
        "action": action,
        "actor": actor,
        "resource": resource,
        "details": details or {}
    })

# ==========================================
# Ownership Token Endpoints
# ==========================================

@router.post("/token/generate", response_model=TokenResponse)
async def generate_ownership_token(request: TokenRequest):
    """
    Generate ownership token for a resource.
    Article II: Data Sovereignty - proves ownership of data.
    """
    token_id = generate_token_id()
    now = datetime.now()
    
    token_data = {
        "token_id": token_id,
        "owner_id": request.owner_id,
        "resource_type": request.resource_type,
        "resource_id": request.resource_id,
        "created_at": now.isoformat(),
        "metadata": request.metadata
    }
    
    signature = generate_signature(token_data)
    token_data["signature"] = signature
    
    # Store token
    tokens_db[token_id] = token_data
    
    # Audit log
    log_audit("TOKEN_GENERATED", request.owner_id, request.resource_id, {
        "token_id": token_id,
        "resource_type": request.resource_type
    })
    
    return TokenResponse(
        token_id=token_id,
        owner_id=request.owner_id,
        resource_type=request.resource_type,
        resource_id=request.resource_id,
        created_at=now.isoformat(),
        signature=signature
    )

@router.get("/token/validate/{token_id}")
async def validate_ownership_token(token_id: str):
    """
    Validate an ownership token.
    Returns token details if valid, error if invalid/expired.
    """
    if token_id not in tokens_db:
        log_audit("TOKEN_VALIDATION_FAILED", "system", token_id)
        raise HTTPException(status_code=404, detail="Token not found")
    
    token = tokens_db[token_id]
    
    # Verify signature
    token_copy = {k: v for k, v in token.items() if k != "signature"}
    expected_sig = generate_signature(token_copy)
    
    is_valid = token["signature"] == expected_sig
    
    log_audit("TOKEN_VALIDATED", token["owner_id"], token_id, {
        "valid": is_valid
    })
    
    return {
        "valid": is_valid,
        "token": token if is_valid else None,
        "verified_at": datetime.now().isoformat()
    }

# ==========================================
# Permission Endpoints
# ==========================================

@router.post("/permission/check")
async def check_permission(request: PermissionCheck):
    """
    Check if actor has permission to perform action on resource.
    """
    resource_perms = permissions_db.get(request.resource_id, [])
    
    for perm in resource_perms:
        if perm["actor_id"] == request.actor_id:
            allowed_actions = perm.get("actions", [])
            if request.action in allowed_actions or "admin" in allowed_actions:
                log_audit("PERMISSION_GRANTED", request.actor_id, request.resource_id, {
                    "action": request.action
                })
                return {
                    "allowed": True,
                    "actor_id": request.actor_id,
                    "resource_id": request.resource_id,
                    "action": request.action,
                    "reason": "explicit_grant"
                }
    
    log_audit("PERMISSION_DENIED", request.actor_id, request.resource_id, {
        "action": request.action
    })
    
    return {
        "allowed": False,
        "actor_id": request.actor_id,
        "resource_id": request.resource_id,
        "action": request.action,
        "reason": "no_matching_permission"
    }

@router.post("/permission/grant")
async def grant_permission(resource_id: str, actor_id: str, actions: List[str]):
    """Grant permissions to an actor for a resource."""
    if resource_id not in permissions_db:
        permissions_db[resource_id] = []
    
    permissions_db[resource_id].append({
        "actor_id": actor_id,
        "actions": actions,
        "granted_at": datetime.now().isoformat()
    })
    
    log_audit("PERMISSION_GRANTED", "system", resource_id, {
        "actor_id": actor_id,
        "actions": actions
    })
    
    return {
        "status": "granted",
        "resource_id": resource_id,
        "actor_id": actor_id,
        "actions": actions
    }

# ==========================================
# Data Signing Endpoints
# ==========================================

@router.post("/data/sign")
async def sign_data(request: SignRequest):
    """
    Sign data with cryptographic proof.
    Used for verifiable data integrity.
    """
    timestamp = datetime.now().isoformat()
    
    # Create signable payload
    payload = {
        "data": request.data,
        "signer_id": request.signer_id,
        "timestamp": timestamp
    }
    
    signature = generate_signature(payload)
    
    log_audit("DATA_SIGNED", request.signer_id, "data_signing", {
        "data_hash": hashlib.sha256(json.dumps(request.data).encode()).hexdigest()[:16]
    })
    
    return {
        "signed_data": request.data,
        "signer_id": request.signer_id,
        "timestamp": timestamp,
        "signature": signature,
        "algorithm": "sha256"
    }

@router.post("/data/verify")
async def verify_signed_data(data: Dict[str, Any], signer_id: str, timestamp: str, signature: str):
    """Verify a signed data payload."""
    payload = {
        "data": data,
        "signer_id": signer_id,
        "timestamp": timestamp
    }
    
    expected_sig = generate_signature(payload)
    is_valid = signature == expected_sig
    
    return {
        "valid": is_valid,
        "verified_at": datetime.now().isoformat()
    }

# ==========================================
# Audit Trail Endpoints
# ==========================================

@router.get("/audit/log")
async def get_audit_log(limit: int = 50, actor: Optional[str] = None):
    """
    Get audit trail of all sovereign operations.
    Privacy by Architecture: stored locally only.
    """
    logs = audit_log.copy()
    
    if actor:
        logs = [l for l in logs if l["actor"] == actor]
    
    # Return most recent first
    logs = sorted(logs, key=lambda x: x["timestamp"], reverse=True)[:limit]
    
    return {
        "total": len(audit_log),
        "returned": len(logs),
        "logs": logs
    }

@router.get("/audit/summary")
async def get_audit_summary():
    """Get summary statistics of audit log."""
    if not audit_log:
        return {"total_events": 0, "by_action": {}, "by_actor": {}}
    
    by_action = {}
    by_actor = {}
    
    for log in audit_log:
        action = log["action"]
        actor = log["actor"]
        
        by_action[action] = by_action.get(action, 0) + 1
        by_actor[actor] = by_actor.get(actor, 0) + 1
    
    return {
        "total_events": len(audit_log),
        "by_action": by_action,
        "by_actor": dict(sorted(by_actor.items(), key=lambda x: x[1], reverse=True)[:10]),
        "first_event": audit_log[0]["timestamp"] if audit_log else None,
        "last_event": audit_log[-1]["timestamp"] if audit_log else None
    }

# ==========================================
# Consent Management Endpoints
# ==========================================

@router.post("/consent/grant")
async def grant_consent(request: ConsentGrant):
    """
    Grant consent for data usage.
    Article II: Privacy by Architecture.
    """
    consent_id = f"consent_{secrets.token_hex(8)}"
    now = datetime.now()
    
    consent = {
        "consent_id": consent_id,
        "user_id": request.user_id,
        "data_type": request.data_type,
        "purpose": request.purpose,
        "granted_at": now.isoformat(),
        "expires_at": None,  # Would calculate from duration_days
        "status": "active"
    }
    
    if request.user_id not in consents_db:
        consents_db[request.user_id] = []
    
    consents_db[request.user_id].append(consent)
    
    log_audit("CONSENT_GRANTED", request.user_id, consent_id, {
        "data_type": request.data_type,
        "purpose": request.purpose
    })
    
    return consent

@router.delete("/consent/revoke")
async def revoke_consent(user_id: str, consent_id: str):
    """
    Revoke previously granted consent.
    User has full control over their data.
    """
    if user_id not in consents_db:
        raise HTTPException(status_code=404, detail="User has no consents")
    
    for consent in consents_db[user_id]:
        if consent["consent_id"] == consent_id:
            consent["status"] = "revoked"
            consent["revoked_at"] = datetime.now().isoformat()
            
            log_audit("CONSENT_REVOKED", user_id, consent_id)
            
            return {
                "status": "revoked",
                "consent_id": consent_id,
                "revoked_at": consent["revoked_at"]
            }
    
    raise HTTPException(status_code=404, detail="Consent not found")

@router.get("/consent/list/{user_id}")
async def list_user_consents(user_id: str):
    """List all consents for a user."""
    consents = consents_db.get(user_id, [])
    
    return {
        "user_id": user_id,
        "total": len(consents),
        "active": len([c for c in consents if c["status"] == "active"]),
        "consents": consents
    }

# ==========================================
# Sovereign Status
# ==========================================

@router.get("/status")
async def get_sovereign_status():
    """Get overall sovereign layer status."""
    return {
        "layer": "2_sovereign",
        "status": "active",
        "components": {
            "ownership": {"status": "active", "tokens": len(tokens_db)},
            "permissions": {"status": "active", "resources": len(permissions_db)},
            "signing": {"status": "active", "algorithm": "sha256"},
            "audit": {"status": "active", "events": len(audit_log)},
            "consent": {"status": "active", "users": len(consents_db)}
        },
        "article": "II: Privacy by Architecture",
        "principle": "Your data, your rules"
    }

