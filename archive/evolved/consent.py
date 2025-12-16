"""
File: core/sovereign/consent.py
Purpose: Part of Sovereign Layer: Data ownership, permission validation, signed data, and audit trail for AUTUS OS
"""

from typing import Dict, List, Optional, Set, Any, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import json
import logging
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.exceptions import InvalidSignature

logger = logging.getLogger(__name__)


class ConsentType(Enum):
    """Types of consent that can be granted."""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    SHARE = "share"
    PROCESS = "process"
    STORE = "store"


class ConsentStatus(Enum):
    """Status of consent."""
    PENDING = "pending"
    GRANTED = "granted"
    REVOKED = "revoked"
    EXPIRED = "expired"


@dataclass
class ConsentRequest:
    """Represents a consent request."""
    id: str
    requester_id: str
    owner_id: str
    resource_id: str
    consent_types: List[ConsentType]
    purpose: str
    duration: Optional[timedelta] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    
    def __post_init__(self):
        """Initialize expiration time if duration is provided."""
        if self.duration and not self.expires_at:
            self.expires_at = self.created_at + self.duration


@dataclass
class ConsentRecord:
    """Represents a consent record with signature."""
    id: str
    request: ConsentRequest
    status: ConsentStatus
    granted_permissions: Set[ConsentType] = field(default_factory=set)
    signature: Optional[str] = None
    signature_timestamp: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    audit_trail: List[Dict[str, Any]] = field(default_factory=list)
    
    def is_valid(self) -> bool:
        """Check if consent record is currently valid."""
        if self.status != ConsentStatus.GRANTED:
            return False
        
        if self.request.expires_at and datetime.utcnow() > self.request.expires_at:
            return False
        
        return True
    
    def is_expired(self) -> bool:
        """Check if consent has expired."""
        if not self.request.expires_at:
            return False
        return datetime.utcnow() > self.request.expires_at


class ConsentError(Exception):
    """Base exception for consent-related errors."""
    pass


class PermissionDeniedError(ConsentError):
    """Raised when permission is denied."""
    pass


class ConsentExpiredError(ConsentError):
    """Raised when consent has expired."""
    pass


class InvalidSignatureError(ConsentError):
    """Raised when signature validation fails."""
    pass


class ConsentManager:
    """Manages consent requests, validation, and audit trails."""
    
    def __init__(self):
        self._consent_records: Dict[str, ConsentRecord] = {}
        self._private_keys: Dict[str, rsa.RSAPrivateKey] = {}
        self._public_keys: Dict[str, rsa.RSAPublicKey] = {}
    
    def generate_key_pair(self, user_id: str) -> tuple[bytes, bytes]:
        """Generate RSA key pair for user."""
        try:
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048
            )
            public_key = private_key.public_key()
            
            self._private_keys[user_id] = private_key
            self._public_keys[user_id] = public_key
            
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            return private_pem, public_pem
            
        except Exception as e:
            logger.error(f"Failed to generate key pair for user {user_id}: {e}")
            raise ConsentError(f"Key generation failed: {e}")
    
    def load_public_key(self, user_id: str, public_key_pem: bytes) -> None:
        """Load public key for user."""
        try:
            public_key = serialization.load_pem_public_key(public_key_pem)
            self._public_keys[user_id] = public_key
        except Exception as e:
            logger.error(f"Failed to load public key for user {user_id}: {e}")
            raise ConsentError(f"Public key loading failed: {e}")
    
    def create_consent_request(
        self,
        requester_id: str,
        owner_id: str,
        resource_id: str,
        consent_types: List[ConsentType],
        purpose: str,
        duration: Optional[timedelta] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ConsentRequest:
        """Create a new consent request."""
        try:
            request_id = self._generate_id(requester_id, owner_id, resource_id)
            
            request = ConsentRequest(
                id=request_id,
                requester_id=requester_id,
                owner_id=owner_id,
                resource_id=resource_id,
                consent_types=consent_types,
                purpose=purpose,
                duration=duration,
                metadata=metadata or {}
            )
            
            logger.info(f"Created consent request {request_id}")
            return request
            
        except Exception as e:
            logger.error(f"Failed to create consent request: {e}")
            raise ConsentError(f"Consent request creation failed: {e}")
    
    def grant_consent(
        self,
        request: ConsentRequest,
        granted_permissions: Optional[Set[ConsentType]] = None,
        owner_signature: Optional[str] = None
    ) -> ConsentRecord:
        """Grant consent for a request."""
        try:
            if granted_permissions is None:
                granted_permissions = set(request.consent_types)
            
            record = ConsentRecord(
                id=request.id,
                request=request,
                status=ConsentStatus.GRANTED,
                granted_permissions=granted_permissions
            )
            
            # Sign the consent record
            if owner_signature:
                record.signature = owner_signature
                record.signature_timestamp = datetime.utcnow()
            else:
                signature = self._sign_consent(record, request.owner_id)
                record.signature = signature
                record.signature_timestamp = datetime.utcnow()
            
            # Add audit trail entry
            self._add_audit_entry(record, "granted", {
                "granted_permissions": [p.value for p in granted_permissions],
                "signature_timestamp": record.signature_timestamp.isoformat()
            })
            
            self._consent_records[record.id] = record
            
            logger.info(f"Granted consent for request {request.id}")
            return record
            
        except Exception as e:
            logger.error(f"Failed to grant consent for request {request.id}: {e}")
            raise ConsentError(f"Consent granting failed: {e}")
    
    def revoke_consent(self, consent_id: str, owner_id: str) -> None:
        """Revoke consent."""
        try:
            if consent_id not in self._consent_records:
                raise ConsentError(f"Consent record {consent_id} not found")
            
            record = self._consent_records[consent_id]
            
            if record.request.owner_id != owner_id:
                raise PermissionDeniedError("Only the owner can revoke consent")
            
            record.status = ConsentStatus.REVOKED
            record.revoked_at = datetime.utcnow()
            
            # Add audit trail entry
            self._add_audit_entry(record, "revoked", {
                "revoked_at": record.revoked_at.isoformat(),
                "revoked_by": owner_id
            })
            
            logger.info(f"Revoked consent {consent_id}")
            
        except Exception as e:
            logger.error(f"Failed to revoke consent {consent_id}: {e}")
            raise ConsentError(f"Consent revocation failed: {e}")
    
    def validate_permission(
        self,
        requester_id: str,
        resource_id: str,
        permission: ConsentType,
        verify_signature: bool = True
    ) -> bool:
        """Validate if requester has permission for resource."""
        try:
            # Find relevant consent record
            record = self._find_consent_record(requester_id, resource_id)
            if not record:
                return False
            
            # Check if record is valid
            if not record.is_valid():
                if record.is_expired():
                    record.status = ConsentStatus.EXPIRED
                    self._add_audit_entry(record, "expired", {
                        "expired_at": datetime.utcnow().isoformat()
                    })
                return False
            
            # Check if permission is granted
            if permission not in record.granted_permissions:
                return False
            
            # Verify signature if required
            if verify_signature and not self._verify_signature(record):
                raise InvalidSignatureError("Consent signature verification failed")
            
            # Add audit trail entry for access
            self._add_audit_entry(record, "accessed", {
                "permission": permission.value,
                "accessed_by": requester_id,
                "accessed_at": datetime.utcnow().isoformat()
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Permission validation failed: {e}")
            return False
    
    def get_consent_record(self, consent_id: str) -> Optional[ConsentRecord]:
        """Get consent record by ID."""
        return self._consent_records.get(consent_id)
    
    def get_user_consents(self, user_id: str, as_owner: bool = True) -> List[ConsentRecord]:
        """Get all consent records for a user."""
        records = []
        for record in self._consent_records.values():
            if as_owner and record.request.owner_id == user_id:
                records.append(record)
            elif not as_owner and record.request.requester_id == user_id:
                records.append(record)
        return records
    
    def get_audit_trail(self, consent_id: str) -> List[Dict[str, Any]]:
        """Get audit trail for consent record."""
        record = self._consent_records.get(consent_id)
        return record.audit_trail if record else []
    
    def cleanup_expired_consents(self) -> int:
        """Clean up expired consent records."""
        expired_count = 0
        current_time = datetime.utcnow()
        
        for record in self._consent_records.values():
            if (record.status == ConsentStatus.GRANTED and 
                record.request.expires_at and 
                current_time > record.request.expires_at):
                
                record.status = ConsentStatus.EXPIRED
                self._add_audit_entry(record, "expired", {
                    "expired_at": current_time.isoformat()
                })
                expired_count += 1
        
        logger.info(f"Cleaned up {expired_count} expired consents")
        return expired_count
    
    def _generate_id(self, *components: str) -> str:
        """Generate unique ID from components."""
        combined = "|".join(components) + "|" + str(datetime.utcnow().timestamp())
        return hashlib.sha256(combined.encode()).hexdigest()[:16]
    
    def _find_consent_record(self, requester_id: str, resource_id: str) -> Optional[ConsentRecord]:
        """Find consent record for requester and resource."""
        for record in self._consent_records.values():
            if (record.request.requester_id == requester_id and 
                record.request.resource_id == resource_id):
                return record
        return None
    
    def _sign_consent(self, record: ConsentRecord, owner_id: str) -> str:
        """Sign consent record."""
        if owner_id not in self._private_keys:
            raise ConsentError(f"Private key not found for user {owner_id}")
        
        # Create signature payload
        payload = {
            "consent_id": record.id,
            "requester_id": record.request.requester_id,
            "resource_id": record.request.resource_id,
            "permissions": [p.value for p in record.granted_permissions],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        payload_bytes = json.dumps(payload, sort_keys=True).encode()
        
        private_key = self._private_keys[owner_id]
        signature = private_key.sign(
            payload_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        return signature.hex()
    
    def _verify_signature(self, record: ConsentRecord) -> bool:
        """Verify consent record signature."""
        if not record.signature:
            return False
        
        owner_id = record.request.owner_id
        if owner_id not in self._public_keys:
            return False
        
        try:
            # Recreate signature payload
            payload = {
                "consent_id": record.id,
                "requester_id": record.request.requester_id,
                "resource_id": record.request.resource_id,
                "permissions": [p.value for p in record.granted_permissions],
                "timestamp": record.signature_timestamp.isoformat() if record.signature_timestamp else ""
            }
            
            payload_bytes = json.dumps(payload, sort_keys=True).encode()
            signature_bytes = bytes.fromhex(record.signature)
            
            public_key = self._public_keys[owner_id]
            public_key.verify(
                signature_bytes,
                payload_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return True
            
        except InvalidSignature:
            return False
        except Exception as e:
            logger.error(f"Signature verification error: {e}")
            return False
    
    def _add_audit_entry(self, record: ConsentRecord, action: str, metadata: Dict[str, Any]) -> None:
        """Add entry to consent audit trail."""
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action,
            "metadata": metadata
        }
        record.audit_trail.append(entry)
