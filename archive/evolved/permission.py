"""
Permission validation and management for Sovereign Layer.

This module provides permission validation, signed data verification,
and audit trail functionality for data ownership in AUTUS OS.
"""

import hashlib
import json
import time
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Set, Any, Union
from dataclasses import dataclass, asdict
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.exceptions import InvalidSignature


class PermissionType(Enum):
    """Types of permissions available in the system."""
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    DELETE = "delete"
    ADMIN = "admin"
    SHARE = "share"


class AccessLevel(Enum):
    """Access levels for permission validation."""
    NONE = 0
    BASIC = 1
    STANDARD = 2
    ELEVATED = 3
    ADMIN = 4


@dataclass
class Permission:
    """Represents a single permission entry."""
    permission_type: PermissionType
    resource_id: str
    subject_id: str
    granted_by: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    conditions: Optional[Dict[str, Any]] = None
    
    def is_valid(self) -> bool:
        """Check if permission is currently valid."""
        now = datetime.now()
        if self.expires_at and now > self.expires_at:
            return False
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert permission to dictionary."""
        data = asdict(self)
        data['permission_type'] = self.permission_type.value
        data['granted_at'] = self.granted_at.isoformat()
        if self.expires_at:
            data['expires_at'] = self.expires_at.isoformat()
        return data


@dataclass
class AuditEntry:
    """Represents an audit trail entry."""
    timestamp: datetime
    action: str
    subject_id: str
    resource_id: str
    permission_type: PermissionType
    success: bool
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert audit entry to dictionary."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        data['permission_type'] = self.permission_type.value
        return data


@dataclass
class SignedData:
    """Represents cryptographically signed data."""
    data: bytes
    signature: bytes
    public_key: bytes
    timestamp: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert signed data to dictionary."""
        return {
            'data': self.data.hex(),
            'signature': self.signature.hex(),
            'public_key': self.public_key.hex(),
            'timestamp': self.timestamp.isoformat()
        }


class PermissionError(Exception):
    """Custom exception for permission-related errors."""
    pass


class SignatureError(Exception):
    """Custom exception for signature-related errors."""
    pass


class PermissionValidator:
    """Validates permissions and manages access control."""
    
    def __init__(self):
        self.permissions: Dict[str, List[Permission]] = {}
        self.audit_trail: List[AuditEntry] = []
        self._private_key: Optional[rsa.RSAPrivateKey] = None
        self._public_key: Optional[rsa.RSAPublicKey] = None
        self._generate_keys()
    
    def _generate_keys(self) -> None:
        """Generate RSA key pair for signing."""
        try:
            self._private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048
            )
            self._public_key = self._private_key.public_key()
        except Exception as e:
            raise SignatureError(f"Failed to generate keys: {e}")
    
    def get_public_key_bytes(self) -> bytes:
        """Get public key as bytes."""
        if not self._public_key:
            raise SignatureError("Public key not available")
        
        return self._public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
    
    def sign_data(self, data: Union[str, bytes, Dict[str, Any]]) -> SignedData:
        """Sign data with private key."""
        if not self._private_key:
            raise SignatureError("Private key not available")
        
        try:
            # Convert data to bytes
            if isinstance(data, str):
                data_bytes = data.encode('utf-8')
            elif isinstance(data, dict):
                data_bytes = json.dumps(data, sort_keys=True).encode('utf-8')
            else:
                data_bytes = data
            
            # Sign the data
            signature = self._private_key.sign(
                data_bytes,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return SignedData(
                data=data_bytes,
                signature=signature,
                public_key=self.get_public_key_bytes(),
                timestamp=datetime.now()
            )
            
        except Exception as e:
            raise SignatureError(f"Failed to sign data: {e}")
    
    def verify_signature(self, signed_data: SignedData) -> bool:
        """Verify signature of signed data."""
        try:
            # Load public key
            public_key = serialization.load_pem_public_key(signed_data.public_key)
            
            # Verify signature
            public_key.verify(
                signed_data.signature,
                signed_data.data,
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
            raise SignatureError(f"Failed to verify signature: {e}")
    
    def grant_permission(
        self,
        permission_type: PermissionType,
        resource_id: str,
        subject_id: str,
        granted_by: str,
        expires_at: Optional[datetime] = None,
        conditions: Optional[Dict[str, Any]] = None
    ) -> Permission:
        """Grant a permission to a subject for a resource."""
        try:
            permission = Permission(
                permission_type=permission_type,
                resource_id=resource_id,
                subject_id=subject_id,
                granted_by=granted_by,
                granted_at=datetime.now(),
                expires_at=expires_at,
                conditions=conditions
            )
            
            # Store permission
            key = f"{subject_id}:{resource_id}"
            if key not in self.permissions:
                self.permissions[key] = []
            
            self.permissions[key].append(permission)
            
            # Add audit entry
            self._add_audit_entry(
                action="grant_permission",
                subject_id=subject_id,
                resource_id=resource_id,
                permission_type=permission_type,
                success=True,
                metadata={"granted_by": granted_by, "expires_at": expires_at.isoformat() if expires_at else None}
            )
            
            return permission
            
        except Exception as e:
            self._add_audit_entry(
                action="grant_permission",
                subject_id=subject_id,
                resource_id=resource_id,
                permission_type=permission_type,
                success=False,
                metadata={"error": str(e)}
            )
            raise PermissionError(f"Failed to grant permission: {e}")
    
    def revoke_permission(
        self,
        permission_type: PermissionType,
        resource_id: str,
        subject_id: str,
        revoked_by: str
    ) -> bool:
        """Revoke a permission from a subject for a resource."""
        try:
            key = f"{subject_id}:{resource_id}"
            
            if key not in self.permissions:
                return False
            
            # Find and remove permission
            permissions = self.permissions[key]
            original_count = len(permissions)
            
            self.permissions[key] = [
                p for p in permissions
                if not (p.permission_type == permission_type and p.subject_id == subject_id)
            ]
            
            revoked = len(self.permissions[key]) < original_count
            
            # Clean up empty lists
            if not self.permissions[key]:
                del self.permissions[key]
            
            # Add audit entry
            self._add_audit_entry(
                action="revoke_permission",
                subject_id=subject_id,
                resource_id=resource_id,
                permission_type=permission_type,
                success=revoked,
                metadata={"revoked_by": revoked_by}
            )
            
            return revoked
            
        except Exception as e:
            self._add_audit_entry(
                action="revoke_permission",
                subject_id=subject_id,
                resource_id=resource_id,
                permission_type=permission_type,
                success=False,
                metadata={"error": str(e)}
            )
            raise PermissionError(f"Failed to revoke permission: {e}")
    
    def check_permission(
        self,
        permission_type: PermissionType,
        resource_id: str,
        subject_id: str
    ) -> bool:
        """Check if subject has permission for resource."""
        try:
            key = f"{subject_id}:{resource_id}"
            
            if key not in self.permissions:
                self._add_audit_entry(
                    action="check_permission",
                    subject_id=subject_id,
                    resource_id=resource_id,
                    permission_type=permission_type,
                    success=False,
                    metadata={"reason": "no_permissions_found"}
                )
                return False
            
            # Check for valid permission
            for permission in self.permissions[key]:
                if (permission.permission_type == permission_type and
                    permission.is_valid() and
                    self._check_conditions(permission.conditions)):
                    
                    self._add_audit_entry(
                        action="check_permission",
                        subject_id=subject_id,
                        resource_id=resource_id,
                        permission_type=permission_type,
                        success=True
                    )
                    return True
            
            self._add_audit_entry(
                action="check_permission",
                subject_id=subject_id,
                resource_id=resource_id,
                permission_type=permission_type,
                success=False,
                metadata={"reason": "no_valid_permissions"}
            )
            return False
            
        except Exception as e:
            self._add_audit_entry(
                action="check_permission",
                subject_id=subject_id,
                resource_id=resource_id,
                permission_type=permission_type,
                success=False,
                metadata={"error": str(e)}
            )
            return False
    
    def _check_conditions(self, conditions: Optional[Dict[str, Any]]) -> bool:
        """Check if permission conditions are met."""
        if not conditions:
            return True
        
        # Implement condition checking logic
        # This is a basic implementation - extend as needed
        current_time = datetime.now()
        
        # Check time-based conditions
        if 'valid_from' in conditions:
            valid_from = datetime.fromisoformat(conditions['valid_from'])
            if current_time < valid_from:
                return False
        
        if 'valid_until' in conditions:
            valid_until = datetime.fromisoformat(conditions['valid_until'])
            if current_time > valid_until:
                return False
        
        # Check IP-based conditions
        if 'allowed_ips' in conditions:
            # This would require actual IP checking in a real implementation
            pass
        
        return True
    
    def get_permissions(self, subject_id: str) -> List[Permission]:
        """Get all permissions for a subject."""
        permissions = []
        for key, perms in self.permissions.items():
            if key.startswith(f"{subject_id}:"):
                permissions.extend(perms)
        return permissions
    
    def get_resource_permissions(self, resource_id: str) -> List[Permission]:
        """Get all permissions for a resource."""
        permissions = []
        for key, perms in self.permissions.items():
            if key.endswith(f":{resource_id}"):
                permissions.extend(perms)
        return permissions
    
    def _add_audit_entry(
        self,
        action: str,
        subject_id: str,
        resource_id: str,
        permission_type: PermissionType,
        success: bool,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add entry to audit trail."""
        entry = AuditEntry(
            timestamp=datetime.now(),
            action=action,
            subject_id=subject_id,
            resource_id=resource_id,
            permission_type=permission_type,
            success=success,
            metadata=metadata
        )
        self.audit_trail.append(entry)
    
    def get_audit_trail(
        self,
        subject_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[AuditEntry]:
        """Get audit trail entries with optional filters."""
        entries = self.audit_trail
        
        if subject_id:
            entries = [e for e in entries if e.subject_id == subject_id]
        
        if resource_id:
            entries = [e for e in entries if e.resource_id == resource_id]
        
        if start_time:
            entries = [e for e in entries if e.timestamp >= start_time]
        
        if end_time:
            entries = [e for e in entries if e.timestamp <= end_time]
        
        return entries
    
    def cleanup_expired_permissions(self) -> int:
        """Remove expired permissions and return count of removed permissions."""
        removed_count = 0
        
        for key in list(self.permissions.keys()):
            original_count = len(self.permissions[key])
            
            # Filter out expired permissions
            self.permissions[key] = [
                p for p in self.permissions[key] if p.is_valid()
            ]
            
            removed_count += original_count - len(self.permissions[key])
            
            # Clean up empty lists
            if not self.permissions[key]:
                del self.permissions[key]
        
        return removed_count
    
    def export_permissions(self) -> Dict[str, Any]:
        """Export all permissions and audit trail."""
        return {
            'permissions': {
                key: [p.to_dict() for p in perms]
                for key, perms in self.permissions.items()
            },
            'audit_trail': [entry.to_dict() for entry in self.audit_trail],
            'export_timestamp': datetime.now().isoformat()
        }
