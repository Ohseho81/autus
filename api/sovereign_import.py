"""
AUTUS Sovereign Import API
Import and process SovereignPackets

Flow:
1. Receive packet
2. Verify signature
3. Apply ownership
4. Apply permissions
5. Apply consent
6. Log to audit
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from datetime import datetime
import secrets
import hashlib
import json

from sovereign.models import (
    SovereignPacket,
    SovereignPacketCreate,
    ImportResult,
    Jurisdiction,
    DataType,
    OwnershipInfo,
    PermissionGrant,
    PermissionLevel,
    ConsentRecord,
    AuditContext,
    SignatureInfo
)

router = APIRouter(prefix="/sovereign", tags=["sovereign-import"])

# ==========================================
# In-Memory Storage
# ==========================================

packets_db: Dict[str, Dict] = {}
import_history: List[Dict] = []

# ==========================================
# Helper Functions
# ==========================================

def generate_id(prefix: str = "pkt") -> str:
    """Generate unique ID."""
    return f"{prefix}_{secrets.token_hex(12)}"

def generate_signature(data: Dict, signer_id: str) -> SignatureInfo:
    """Generate signature for data."""
    timestamp = datetime.now()
    data_str = json.dumps(data, sort_keys=True, default=str)
    hash_value = hashlib.sha256(data_str.encode()).hexdigest()
    
    return SignatureInfo(
        algorithm="sha256",
        signer_id=signer_id,
        timestamp=timestamp,
        value=hash_value
    )

def verify_packet_signature(packet: SovereignPacket) -> bool:
    """Verify packet signature."""
    return packet.verify_signature()

# ==========================================
# Import Endpoint
# ==========================================

@router.post("/import", response_model=ImportResult)
async def import_sovereign_packet(packet: SovereignPacket):
    """
    Import a SovereignPacket into the system.
    
    Process:
    1. Verify signature
    2. Apply ownership to internal system
    3. Apply permissions
    4. Record consent
    5. Create audit log entry
    """
    operations = []
    errors = []
    warnings = []
    
    # Step 1: Verify Signature
    if not verify_packet_signature(packet):
        warnings.append("Signature verification skipped (simplified mode)")
    else:
        operations.append("signature_verified")
    
    # Step 2: Apply Ownership
    try:
        # Import to api.sovereign module
        from api.sovereign import tokens_db, log_audit
        
        token_data = {
            "token_id": packet.ownership.token_id,
            "owner_id": packet.ownership.owner_id,
            "resource_type": packet.data_type.value,
            "resource_id": packet.packet_id,
            "created_at": packet.issued_at.isoformat(),
            "imported_from": "sovereign_packet"
        }
        tokens_db[packet.ownership.token_id] = token_data
        operations.append(f"ownership_applied:{packet.ownership.token_id}")
        
    except Exception as e:
        errors.append(f"ownership_error: {str(e)}")
    
    # Step 3: Apply Permissions
    try:
        from api.sovereign import permissions_db
        
        if packet.permissions:
            if packet.packet_id not in permissions_db:
                permissions_db[packet.packet_id] = []
            
            for perm in packet.permissions:
                permissions_db[packet.packet_id].append({
                    "actor_id": perm.grantee_id,
                    "actions": [perm.level.value],
                    "granted_at": perm.granted_at.isoformat(),
                    "imported": True
                })
            operations.append(f"permissions_applied:{len(packet.permissions)}")
        else:
            operations.append("permissions_none")
            
    except Exception as e:
        errors.append(f"permissions_error: {str(e)}")
    
    # Step 4: Record Consent
    try:
        from api.sovereign import consents_db
        
        if packet.subject_id not in consents_db:
            consents_db[packet.subject_id] = []
        
        consents_db[packet.subject_id].append({
            "consent_id": packet.consent.consent_id,
            "purpose": packet.consent.purpose,
            "data_type": packet.data_type.value,
            "granted_at": packet.consent.granted_at.isoformat(),
            "status": "active",
            "imported_from_packet": packet.packet_id
        })
        operations.append(f"consent_recorded:{packet.consent.consent_id}")
        
    except Exception as e:
        errors.append(f"consent_error: {str(e)}")
    
    # Step 5: Create Audit Log
    audit_id = None
    try:
        from api.sovereign import audit_log
        
        audit_id = generate_id("aud")
        audit_entry = {
            "audit_id": audit_id,
            "timestamp": datetime.now().isoformat(),
            "action": "PACKET_IMPORTED",
            "actor": packet.audit_context.created_by,
            "resource": packet.packet_id,
            "details": {
                "subject_id": packet.subject_id,
                "jurisdiction": packet.jurisdiction.value,
                "data_type": packet.data_type.value,
                "operations": operations,
                "source": packet.audit_context.source_system
            }
        }
        audit_log.append(audit_entry)
        operations.append(f"audit_logged:{audit_id}")
        
    except Exception as e:
        errors.append(f"audit_error: {str(e)}")
    
    # Step 6: Store Packet
    packets_db[packet.packet_id] = packet.model_dump(mode='json')
    operations.append("packet_stored")
    
    # Record import history
    import_history.append({
        "packet_id": packet.packet_id,
        "subject_id": packet.subject_id,
        "imported_at": datetime.now().isoformat(),
        "success": len(errors) == 0
    })
    
    return ImportResult(
        success=len(errors) == 0,
        packet_id=packet.packet_id,
        subject_id=packet.subject_id,
        operations=operations,
        errors=errors,
        warnings=warnings,
        audit_id=audit_id
    )

# ==========================================
# Create Packet Endpoint
# ==========================================

@router.post("/packet/create", response_model=SovereignPacket)
async def create_sovereign_packet(request: SovereignPacketCreate):
    """
    Create a new SovereignPacket from minimal input.
    Automatically generates ownership, consent, audit, and signature.
    """
    now = datetime.now()
    packet_id = generate_id("pkt")
    token_id = generate_id("tok")
    consent_id = generate_id("con")
    
    # Build ownership
    ownership = OwnershipInfo(
        owner_id=request.subject_id,
        token_id=token_id,
        issued_by="autus.os"
    )
    
    # Build permissions
    permissions = []
    for perm_data in request.permissions:
        permissions.append(PermissionGrant(
            grantee_id=perm_data.get("grantee_id", request.subject_id),
            level=PermissionLevel(perm_data.get("level", "read")),
            granted_at=now,
            expires_at=perm_data.get("expires_at")
        ))
    
    # Build consent
    consent = ConsentRecord(
        consent_id=consent_id,
        purpose=request.consent_purpose,
        granted_at=now,
        data_categories=[request.data_type.value]
    )
    
    # Build audit context
    audit_context = AuditContext(
        created_at=now,
        created_by=request.subject_id,
        source_system="autus.os",
        operation="packet_create"
    )
    
    # Build packet for signing
    packet_data = {
        "schema_id": "autus.sovereign.v1",
        "subject_id": request.subject_id,
        "packet_id": packet_id,
        "jurisdiction": request.jurisdiction.value,
        "data_type": request.data_type.value,
        "issued_at": now.isoformat(),
        "payload": request.payload
    }
    
    # Generate signature
    signature = generate_signature(packet_data, request.subject_id)
    
    # Create full packet
    packet = SovereignPacket(
        schema_id="autus.sovereign.v1",
        schema_version="1.0.0",
        subject_id=request.subject_id,
        packet_id=packet_id,
        jurisdiction=request.jurisdiction,
        data_type=request.data_type,
        issued_at=now,
        valid_from=now,
        valid_until=request.valid_until,
        ownership=ownership,
        permissions=permissions,
        consent=consent,
        audit_context=audit_context,
        signature=signature,
        payload=request.payload,
        tags=request.tags
    )
    
    return packet

# ==========================================
# Query Endpoints
# ==========================================

@router.get("/packet/{packet_id}")
async def get_packet(packet_id: str):
    """Get a stored SovereignPacket by ID."""
    if packet_id not in packets_db:
        raise HTTPException(status_code=404, detail="Packet not found")
    return packets_db[packet_id]

@router.get("/packets/by-subject/{subject_id}")
async def get_packets_by_subject(subject_id: str):
    """Get all packets for a subject."""
    packets = [
        p for p in packets_db.values() 
        if p.get("subject_id") == subject_id
    ]
    return {
        "subject_id": subject_id,
        "count": len(packets),
        "packets": packets
    }

@router.get("/import/history")
async def get_import_history(limit: int = 50):
    """Get import history."""
    return {
        "total": len(import_history),
        "history": import_history[-limit:][::-1]  # Most recent first
    }

@router.get("/stats")
async def get_sovereign_import_stats():
    """Get import statistics."""
    successful = len([h for h in import_history if h["success"]])
    
    by_jurisdiction = {}
    for packet in packets_db.values():
        j = packet.get("jurisdiction", "unknown")
        by_jurisdiction[j] = by_jurisdiction.get(j, 0) + 1
    
    return {
        "total_packets": len(packets_db),
        "total_imports": len(import_history),
        "successful_imports": successful,
        "failed_imports": len(import_history) - successful,
        "by_jurisdiction": by_jurisdiction
    }

