"""
File: core/sovereign/ownership.py
Purpose: Part of Sovereign Layer: Data ownership, permission validation, signed data, and audit trail for AUTUS OS
"""

from typing import Dict, List, Optional, Any, Set, Union
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
import hashlib
import json
import logging
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.exceptions import InvalidSignature


logger = logging.getLogger(__name__)


class PermissionLevel(Enum):
    """Permission levels for data access."""
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"
    OWNER = "owner"


class AuditAction(Enum):
    """Types of actions that can be audited."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"
    OWNERSHIP_TRANSFER = "ownership_transfer"


@dataclass
class Permission:
    """Represents a permission granted to an entity."""
    entity_id: str
    level: PermissionLevel
    granted_by: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    conditions: Optional[Dict[str, Any]] = None


@dataclass
class AuditEntry:
    """Represents an audit log entry."""
    id: str
    timestamp: datetime
    action: AuditAction
    entity_id: str
    resource_id: str
    details: Dict[str, Any]
    signature: Optional[str] = None


@dataclass
class SignedData:
    """Represents cryptographically signed data."""
    data: bytes
    signature: bytes
    signer_id: str
    timestamp: datetime
    hash_algorithm: str = "SHA256"


class OwnershipError(Exception):
    """Base exception for ownership-related errors."""
    pass


class PermissionDeniedError(OwnershipError):
    """Raised when permission is denied for an operation."""
    pass


class InvalidSignatureError(OwnershipError):
    """Raised when signature validation fails."""
    pass


class DataSigner:
    """Handles cryptographic signing of data."""
    
    def __init__(self):
        self._private_keys: Dict[str, rsa.RSAPrivateKey] = {}
        self._public_keys: Dict[str, rsa.RSAPublicKey] = {}
    
    def generate_key_pair(self, entity_id: str) -> None:
        """Generate a new RSA key pair for an entity.
        
        Args:
            entity_id: Unique identifier for the entity
            
        Raises:
            OwnershipError: If key generation fails
        """
        try:
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048
            )
            public_key = private_key.public_key()
            
            self._private_keys[entity_id] = private_key
            self._public_keys[entity_id] = public_key
            
            logger.info(f"Generated key pair for entity: {entity_id}")
            
        except Exception as e:
            raise OwnershipError(f"Failed to generate key pair: {e}")
    
    def sign_data(self, data: bytes, signer_id: str) -> SignedData:
        """Sign data with the entity's private key.
        
        Args:
            data: Data to be signed
            signer_id: ID of the signing entity
            
        Returns:
            SignedData object containing signature and metadata
            
        Raises:
            OwnershipError: If signing fails or key not found
        """
        if signer_id not in self._private_keys:
            raise OwnershipError(f"Private key not found for entity: {signer_id}")
        
        try:
            private_key = self._private_keys[signer_id]
            signature = private_key.sign(
                data,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return SignedData(
                data=data,
                signature=signature,
                signer_id=signer_id,
                timestamp=datetime.utcnow(),
                hash_algorithm="SHA256"
            )
            
        except Exception as e:
            raise OwnershipError(f"Failed to sign data: {e}")
    
    def verify_signature(self, signed_data: SignedData) -> bool:
        """Verify the signature of signed data.
        
        Args:
            signed_data: SignedData object to verify
            
        Returns:
            True if signature is valid, False otherwise
            
        Raises:
            OwnershipError: If verification process fails
        """
        if signed_data.signer_id not in self._public_keys:
            raise OwnershipError(f"Public key not found for entity: {signed_data.signer_id}")
        
        try:
            public_key = self._public_keys[signed_data.signer_id]
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
            raise OwnershipError(f"Failed to verify signature: {e}")


class AuditTrail:
    """Manages audit logging for data operations."""
    
    def __init__(self, signer: Optional[DataSigner] = None):
        self._entries: List[AuditEntry] = []
        self._signer = signer
    
    def log_action(
        self,
        action: AuditAction,
        entity_id: str,
        resource_id: str,
        details: Optional[Dict[str, Any]] = None,
        sign: bool = False
    ) -> str:
        """Log an action to the audit trail.
        
        Args:
            action: Type of action performed
            entity_id: ID of the entity performing the action
            resource_id: ID of the resource being accessed
            details: Additional details about the action
            sign: Whether to cryptographically sign the entry
            
        Returns:
            Unique ID of the audit entry
            
        Raises:
            OwnershipError: If signing is requested but fails
        """
        entry_id = self._generate_entry_id(action, entity_id, resource_id)
        details = details or {}
        
        entry = AuditEntry(
            id=entry_id,
            timestamp=datetime.utcnow(),
            action=action,
            entity_id=entity_id,
            resource_id=resource_id,
            details=details
        )
        
        if sign and self._signer:
            try:
                entry_data = json.dumps({
                    "id": entry.id,
                    "timestamp": entry.timestamp.isoformat(),
                    "action": entry.action.value,
                    "entity_id": entry.entity_id,
                    "resource_id": entry.resource_id,
                    "details": entry.details
                }, sort_keys=True).encode()
                
                signed_data = self._signer.sign_data(entry_data, entity_id)
                entry.signature = signed_data.signature.hex()
                
            except Exception as e:
                raise OwnershipError(f"Failed to sign audit entry: {e}")
        
        self._entries.append(entry)
        logger.info(f"Logged audit entry: {entry_id}")
        
        return entry_id
    
    def get_entries(
        self,
        entity_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[AuditAction] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[AuditEntry]:
        """Retrieve audit entries based on filters.
        
        Args:
            entity_id: Filter by entity ID
            resource_id: Filter by resource ID
            action: Filter by action type
            start_time: Filter by start time
            end_time: Filter by end time
            
        Returns:
            List of matching audit entries
        """
        filtered_entries = self._entries
        
        if entity_id:
            filtered_entries = [e for e in filtered_entries if e.entity_id == entity_id]
        
        if resource_id:
            filtered_entries = [e for e in filtered_entries if e.resource_id == resource_id]
        
        if action:
            filtered_entries = [e for e in filtered_entries if e.action == action]
        
        if start_time:
            filtered_entries = [e for e in filtered_entries if e.timestamp >= start_time]
        
        if end_time:
            filtered_entries = [e for e in filtered_entries if e.timestamp <= end_time]
        
        return sorted(filtered_entries, key=lambda x: x.timestamp, reverse=True)
    
    def _generate_entry_id(self, action: AuditAction, entity_id: str, resource_id: str) -> str:
        """Generate a unique ID for an audit entry."""
        timestamp = datetime.utcnow().isoformat()
        content = f"{action.value}:{entity_id}:{resource_id}:{timestamp}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]


class OwnershipManager:
    """Manages data ownership and permissions."""
    
    def __init__(self, signer: Optional[DataSigner] = None):
        self._owners: Dict[str, str] = {}  # resource_id -> owner_entity_id
        self._permissions: Dict[str, List[Permission]] = {}  # resource_id -> permissions
        self._signer = signer
        self._audit_trail = AuditTrail(signer)
    
    def set_owner(self, resource_id: str, owner_id: str, requester_id: str) -> None:
        """Set the owner of a resource.
        
        Args:
            resource_id: ID of the resource
            owner_id: ID of the new owner
            requester_id: ID of the entity making the request
            
        Raises:
            PermissionDeniedError: If requester lacks permission
        """
        current_owner = self._owners.get(resource_id)
        
        # Check if requester has permission (owner or admin)
        if current_owner and not self._has_permission(
            resource_id, requester_id, PermissionLevel.OWNER
        ):
            raise PermissionDeniedError(
                f"Entity {requester_id} lacks permission to change ownership of {resource_id}"
            )
        
        old_owner = self._owners.get(resource_id)
        self._owners[resource_id] = owner_id
        
        # Log the ownership change
        self._audit_trail.log_action(
            AuditAction.OWNERSHIP_TRANSFER,
            requester_id,
            resource_id,
            {"old_owner": old_owner, "new_owner": owner_id}
        )
        
        logger.info(f"Ownership of {resource_id} transferred to {owner_id}")
    
    def get_owner(self, resource_id: str) -> Optional[str]:
        """Get the owner of a resource.
        
        Args:
            resource_id: ID of the resource
            
        Returns:
            Owner entity ID or None if no owner set
        """
        return self._owners.get(resource_id)
    
    def grant_permission(
        self,
        resource_id: str,
        entity_id: str,
        level: PermissionLevel,
        granter_id: str,
        expires_at: Optional[datetime] = None,
        conditions: Optional[Dict[str, Any]] = None
    ) -> None:
        """Grant permission to an entity for a resource.
        
        Args:
            resource_id: ID of the resource
            entity_id: ID of the entity receiving permission
            level: Permission level to grant
            granter_id: ID of the entity granting permission
            expires_at: Optional expiration time
            conditions: Optional conditions for the permission
            
        Raises:
            PermissionDeniedError: If granter lacks permission
        """
        # Check if granter has sufficient permission
        if not self._can_grant_permission(resource_id, granter_id, level):
            raise PermissionDeniedError(
                f"Entity {granter_id} cannot grant {level.value} permission for {resource_id}"
            )
        
        permission = Permission(
            entity_id=entity_id,
            level=level,
            granted_by=granter_id,
            granted_at=datetime.utcnow(),
            expires_at=expires_at,
            conditions=conditions
        )
        
        if resource_id not in self._permissions:
            self._permissions[resource_id] = []
        
        # Remove any existing permission for this entity and level
        self._permissions[resource_id] = [
            p for p in self._permissions[resource_id]
            if not (p.entity_id == entity_id and p.level == level)
        ]
        
        self._permissions[resource_id].append(permission)
        
        # Log the permission grant
        self._audit_trail.log_action(
            AuditAction.PERMISSION_GRANT,
            granter_id,
            resource_id,
            {
                "recipient": entity_id,
                "level": level.value,
                "expires_at": expires_at.isoformat() if expires_at else None
            }
        )
        
        logger.info(f"Granted {level.value} permission to {entity_id} for {resource_id}")
    
    def revoke_permission(
        self,
        resource_id: str,
        entity_id: str,
        level: PermissionLevel,
        revoker_id: str
    ) -> None:
        """Revoke permission from an entity for a resource.
        
        Args:
            resource_id: ID of the resource
            entity_id: ID of the entity losing permission
            level: Permission level to revoke
            revoker_id: ID of the entity revoking permission
            
        Raises:
            PermissionDeniedError: If revoker lacks permission
        """
        # Check if revoker has sufficient permission
        if not self._can_grant_permission(resource_id, revoker_id, level):
            raise PermissionDeniedError(
                f"Entity {revoker_id} cannot revoke {level.value} permission for {resource_id}"
            )
        
        if resource_id in self._permissions:
            self._permissions[resource_id] = [
                p for p in self._permissions[resource_id]
                if not (p.entity_id == entity_id and p.level == level)
            ]
        
        # Log the permission revocation
        self._audit_trail.log_action(
            AuditAction.PERMISSION_REVOKE,
            revoker_id,
            resource_id,
            {"target": entity_id, "level": level.value}
        )
        
        logger.info(f"Revoked {level.value} permission from {entity_id} for {resource_id}")
    
    def has_permission(
        self,
        resource_id: str,
        entity_id: str,
        level: PermissionLevel
    ) -> bool:
        """Check if an entity has a specific permission level for a resource.
        
        Args:
            resource_id: ID of the resource
            entity_id: ID of the entity
            level: Required permission level
            
        Returns:
            True if entity has permission, False otherwise
        """
        return self._has_permission(resource_id, entity_id, level)
    
    def get_permissions(self, resource_id: str) -> List[Permission]:
        """Get all permissions for a resource.
        
        Args:
            resource_id: ID of the resource
            
        Returns:
            List of active permissions
        """
        if resource_id not in self._permissions:
            return []
        
        now = datetime.utcnow()
        return [
            p for p in self._permissions[resource_id]
            if p.expires_at is None or p.expires_at > now
        ]
    
    def validate_access(
        self,
        resource_id: str,
        entity_id: str,
        action: str,
        required_level: PermissionLevel
    ) -> bool:
        """Validate if an entity can perform an action on a resource.
        
        Args:
            resource_id: ID of the resource
            entity_id: ID of the entity
            action: Action being attempted
            required_level: Minimum permission level required
            
        Returns:
            True if access is allowed, False otherwise
        """
        has_access = self._has_permission(resource_id, entity_id, required_level)
        
        # Log the access attempt
        action_enum = getattr(AuditAction, action.upper(), AuditAction.READ)
        self._audit_trail.log_action(
            action_enum,
            entity_id,
            resource_id,
            {"allowed": has_access, "required_level": required_level.value}
        )
        
        return has_access
    
    def get_audit_trail(self) -> AuditTrail:
        """Get the audit trail manager.
        
        Returns:
            AuditTrail instance
        """
        return self._audit_trail
    
    def _has_permission(
        self,
        resource_id: str,
        entity_id: str,
        level: PermissionLevel
    ) -> bool:
        """Internal method to check permissions."""
        # Owner has all permissions
        if self._owners.get(resource_id) == entity_id:
            return True
        
        if resource_id not in self._permissions:
            return False
        
        now = datetime.utcnow()
        permission_hierarchy = {
            PermissionLevel.READ: 1,
            PermissionLevel.WRITE: 2,
            PermissionLevel.ADMIN: 3,
            PermissionLevel.OWNER: 4
        }
        
        required_level = permission_hierarchy[level]
        
        for permission in self._permissions[resource_id]:
            if permission.entity_id != entity_id:
                continue
            
            if permission.expires_at and permission.expires_at <= now:
                continue
            
            if permission_hierarchy[permission.level] >= required_level:
                return True
        
        return False
    
    def _can_grant_permission(
        self,
        resource_id: str,
        granter_id: str,
        level: PermissionLevel
    ) -> bool:
        """Check if an entity can grant a specific permission level."""
        # Owner can grant any permission
        if self._owners.get(resource_id) == granter_id:
            return True
        
        # Admin can grant read/write permissions
        if (level in [PermissionLevel.READ, PermissionLevel.WRITE] and
            self._has_permission(resource_id, granter_id, PermissionLevel.ADMIN)):
            return True
        
        return False
