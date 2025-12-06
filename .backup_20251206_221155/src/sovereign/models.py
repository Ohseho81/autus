"""
AUTUS Sovereign Data Format (SDF)
Standardized packet format for sovereign data exchange

Article II: Privacy by Architecture
- All data carries ownership proof
- Permissions are explicit
- Consent is auditable
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any, List, Optional
from datetime import datetime
from enum import Enum
import hashlib
import json


class Jurisdiction(str, Enum):
    """Supported jurisdictions for data sovereignty."""
    KR = "KR"  # South Korea
    PH = "PH"  # Philippines
    US = "US"  # United States
    EU = "EU"  # European Union
    SG = "SG"  # Singapore
    NP = "NP"  # Nepal
    AE = "AE"  # UAE


class DataType(str, Enum):
    """Types of sovereign data."""
    IDENTITY = "identity"
    MEMORY = "memory"
    PREFERENCE = "preference"
    CREDENTIAL = "credential"
    CONSENT = "consent"
    AUDIT = "audit"
    WORKFLOW = "workflow"


class PermissionLevel(str, Enum):
    """Permission levels for data access."""
    READ = "read"
    WRITE = "write"
    SHARE = "share"
    DELETE = "delete"
    ADMIN = "admin"


class OwnershipInfo(BaseModel):
    """Ownership information for sovereign data."""
    owner_id: str = Field(..., description="Zero ID of the owner")
    token_id: str = Field(..., description="Ownership token ID")
    issued_by: str = Field(default="autus.os")
    proof_type: str = Field(default="sha256_signature")


class PermissionGrant(BaseModel):
    """Single permission grant."""
    grantee_id: str
    level: PermissionLevel
    granted_at: datetime
    expires_at: Optional[datetime] = None
    conditions: Optional[Dict[str, Any]] = None


class ConsentRecord(BaseModel):
    """Consent information."""
    consent_id: str
    purpose: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    revocable: bool = True
    data_categories: List[str] = []


class AuditContext(BaseModel):
    """Audit trail context."""
    created_at: datetime
    created_by: str
    source_system: str = "autus.os"
    operation: str
    previous_hash: Optional[str] = None


class SignatureInfo(BaseModel):
    """Cryptographic signature information."""
    algorithm: str = "sha256"
    signer_id: str
    timestamp: datetime
    value: str
    public_key_hint: Optional[str] = None


class SovereignPacket(BaseModel):
    """
    AUTUS Sovereign Data Packet
    
    Complete self-describing data unit that carries:
    - Ownership proof
    - Permission grants
    - Consent records
    - Audit context
    - Cryptographic signature
    - Actual payload
    """
    # Schema identification
    schema_id: str = Field(default="autus.sovereign.v1")
    schema_version: str = Field(default="1.0.0")
    
    # Subject identification
    subject_id: str = Field(..., description="Zero ID this packet belongs to")
    packet_id: str = Field(..., description="Unique packet identifier")
    
    # Jurisdiction & Type
    jurisdiction: Jurisdiction
    data_type: DataType
    
    # Temporal bounds
    issued_at: datetime
    valid_from: datetime
    valid_until: Optional[datetime] = None
    
    # Sovereign components
    ownership: OwnershipInfo
    permissions: List[PermissionGrant] = []
    consent: ConsentRecord
    audit_context: AuditContext
    signature: SignatureInfo
    
    # Actual data
    payload: Dict[str, Any]
    
    # Metadata
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    
    def compute_hash(self) -> str:
        """Compute hash of packet content (excluding signature)."""
        hashable = {
            "schema_id": self.schema_id,
            "subject_id": self.subject_id,
            "packet_id": self.packet_id,
            "jurisdiction": self.jurisdiction.value,
            "data_type": self.data_type.value,
            "issued_at": self.issued_at.isoformat(),
            "payload": self.payload
        }
        return hashlib.sha256(
            json.dumps(hashable, sort_keys=True).encode()
        ).hexdigest()
    
    def verify_signature(self) -> bool:
        """Verify packet signature (simplified)."""
        expected_hash = self.compute_hash()
        # In production, would use actual cryptographic verification
        return self.signature.value.startswith(expected_hash[:16])
    
    model_config = ConfigDict(
        json_encoders={datetime: lambda v: v.isoformat()}
    )


class SovereignPacketCreate(BaseModel):
    """Request model for creating a new SovereignPacket."""
    subject_id: str
    jurisdiction: Jurisdiction
    data_type: DataType
    payload: Dict[str, Any]
    
    # Optional overrides
    valid_until: Optional[datetime] = None
    permissions: List[Dict[str, Any]] = []
    consent_purpose: str = "data_storage"
    tags: List[str] = []


class ImportResult(BaseModel):
    """Result of importing a SovereignPacket."""
    success: bool
    packet_id: str
    subject_id: str
    operations: List[str]
    errors: List[str] = []
    warnings: List[str] = []
    audit_id: Optional[str] = None

