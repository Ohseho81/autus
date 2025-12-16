"""
Audit trail management for AUTUS OS Sovereign Layer.

This module provides comprehensive audit logging, data integrity verification,
and ownership tracking for all system operations.
"""

import hashlib
import json
import time
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
import sqlite3
import threading
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.exceptions import InvalidSignature


class AuditAction(Enum):
    """Enumeration of audit action types."""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"
    OWNERSHIP_TRANSFER = "ownership_transfer"
    SIGN = "sign"
    VERIFY = "verify"
    ACCESS_DENIED = "access_denied"
    SYSTEM_EVENT = "system_event"


class AuditSeverity(Enum):
    """Audit event severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class AuditEntry:
    """Represents a single audit trail entry."""
    id: str
    timestamp: float
    action: AuditAction
    severity: AuditSeverity
    user_id: str
    resource_id: str
    resource_type: str
    details: Dict[str, Any]
    signature: Optional[str] = None
    hash_chain: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert audit entry to dictionary."""
        return {
            **asdict(self),
            'action': self.action.value,
            'severity': self.severity.value
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AuditEntry':
        """Create audit entry from dictionary."""
        data['action'] = AuditAction(data['action'])
        data['severity'] = AuditSeverity(data['severity'])
        return cls(**data)


class AuditError(Exception):
    """Base exception for audit operations."""
    pass


class AuditIntegrityError(AuditError):
    """Raised when audit trail integrity is compromised."""
    pass


class AuditStorage:
    """Manages persistent storage of audit entries."""
    
    def __init__(self, db_path: Union[str, Path]):
        """
        Initialize audit storage.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = Path(db_path)
        self._lock = threading.Lock()
        self._init_database()
    
    def _init_database(self) -> None:
        """Initialize the audit database schema."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS audit_entries (
                        id TEXT PRIMARY KEY,
                        timestamp REAL NOT NULL,
                        action TEXT NOT NULL,
                        severity TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        resource_id TEXT NOT NULL,
                        resource_type TEXT NOT NULL,
                        details TEXT NOT NULL,
                        signature TEXT,
                        hash_chain TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_timestamp 
                    ON audit_entries(timestamp)
                """)
                
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_user_resource 
                    ON audit_entries(user_id, resource_id)
                """)
                
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_action_severity 
                    ON audit_entries(action, severity)
                """)
                
        except sqlite3.Error as e:
            raise AuditError(f"Failed to initialize audit database: {e}")
    
    def store_entry(self, entry: AuditEntry) -> None:
        """
        Store an audit entry in the database.
        
        Args:
            entry: Audit entry to store
            
        Raises:
            AuditError: If storage operation fails
        """
        with self._lock:
            try:
                with sqlite3.connect(self.db_path) as conn:
                    conn.execute("""
                        INSERT INTO audit_entries 
                        (id, timestamp, action, severity, user_id, resource_id, 
                         resource_type, details, signature, hash_chain)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        entry.id,
                        entry.timestamp,
                        entry.action.value,
                        entry.severity.value,
                        entry.user_id,
                        entry.resource_id,
                        entry.resource_type,
                        json.dumps(entry.details),
                        entry.signature,
                        entry.hash_chain
                    ))
                    
            except sqlite3.Error as e:
                raise AuditError(f"Failed to store audit entry: {e}")
    
    def get_entries(
        self,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[AuditAction] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        limit: int = 1000
    ) -> List[AuditEntry]:
        """
        Retrieve audit entries based on filters.
        
        Args:
            user_id: Filter by user ID
            resource_id: Filter by resource ID
            action: Filter by action type
            start_time: Start timestamp filter
            end_time: End timestamp filter
            limit: Maximum number of entries to return
            
        Returns:
            List of matching audit entries
        """
        conditions = []
        params = []
        
        if user_id:
            conditions.append("user_id = ?")
            params.append(user_id)
        
        if resource_id:
            conditions.append("resource_id = ?")
            params.append(resource_id)
        
        if action:
            conditions.append("action = ?")
            params.append(action.value)
        
        if start_time:
            conditions.append("timestamp >= ?")
            params.append(start_time)
        
        if end_time:
            conditions.append("timestamp <= ?")
            params.append(end_time)
        
        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        params.append(limit)
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(f"""
                    SELECT * FROM audit_entries 
                    {where_clause}
                    ORDER BY timestamp DESC 
                    LIMIT ?
                """, params)
                
                entries = []
                for row in cursor.fetchall():
                    entry_data = dict(row)
                    entry_data['details'] = json.loads(entry_data['details'])
                    entries.append(AuditEntry.from_dict(entry_data))
                
                return entries
                
        except sqlite3.Error as e:
            raise AuditError(f"Failed to retrieve audit entries: {e}")


class AuditSigner:
    """Handles cryptographic signing of audit entries."""
    
    def __init__(self, private_key_path: Union[str, Path]):
        """
        Initialize audit signer.
        
        Args:
            private_key_path: Path to private key file
        """
        self.private_key = self._load_private_key(private_key_path)
    
    def _load_private_key(self, key_path: Union[str, Path]) -> rsa.RSAPrivateKey:
        """Load private key from file."""
        try:
            with open(key_path, 'rb') as key_file:
                return serialization.load_pem_private_key(
                    key_file.read(),
                    password=None
                )
        except Exception as e:
            raise AuditError(f"Failed to load private key: {e}")
    
    def sign_entry(self, entry: AuditEntry) -> str:
        """
        Sign an audit entry.
        
        Args:
            entry: Audit entry to sign
            
        Returns:
            Base64-encoded signature
        """
        try:
            # Create canonical representation for signing
            signing_data = {
                'id': entry.id,
                'timestamp': entry.timestamp,
                'action': entry.action.value,
                'user_id': entry.user_id,
                'resource_id': entry.resource_id,
                'resource_type': entry.resource_type,
                'details': entry.details
            }
            
            message = json.dumps(signing_data, sort_keys=True).encode('utf-8')
            
            signature = self.private_key.sign(
                message,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return signature.hex()
            
        except Exception as e:
            raise AuditError(f"Failed to sign audit entry: {e}")
    
    def verify_signature(
        self,
        entry: AuditEntry,
        public_key: rsa.RSAPublicKey
    ) -> bool:
        """
        Verify audit entry signature.
        
        Args:
            entry: Audit entry with signature
            public_key: Public key for verification
            
        Returns:
            True if signature is valid
        """
        if not entry.signature:
            return False
        
        try:
            signing_data = {
                'id': entry.id,
                'timestamp': entry.timestamp,
                'action': entry.action.value,
                'user_id': entry.user_id,
                'resource_id': entry.resource_id,
                'resource_type': entry.resource_type,
                'details': entry.details
            }
            
            message = json.dumps(signing_data, sort_keys=True).encode('utf-8')
            signature = bytes.fromhex(entry.signature)
            
            public_key.verify(
                signature,
                message,
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
            raise AuditError(f"Failed to verify signature: {e}")


class AuditManager:
    """Main audit trail manager for AUTUS OS."""
    
    def __init__(
        self,
        storage: AuditStorage,
        signer: Optional[AuditSigner] = None
    ):
        """
        Initialize audit manager.
        
        Args:
            storage: Audit storage backend
            signer: Optional cryptographic signer
        """
        self.storage = storage
        self.signer = signer
        self._last_hash: Optional[str] = None
        self._lock = threading.Lock()
    
    def log_audit_event(
        self,
        action: AuditAction,
        user_id: str,
        resource_id: str,
        resource_type: str,
        details: Optional[Dict[str, Any]] = None,
        severity: AuditSeverity = AuditSeverity.MEDIUM
    ) -> AuditEntry:
        """
        Log an audit event.
        
        Args:
            action: Type of action being audited
            user_id: ID of user performing action
            resource_id: ID of resource being accessed
            resource_type: Type of resource
            details: Additional event details
            severity: Event severity level
            
        Returns:
            Created audit entry
        """
        with self._lock:
            entry_id = self._generate_entry_id()
            timestamp = time.time()
            
            entry = AuditEntry(
                id=entry_id,
                timestamp=timestamp,
                action=action,
                severity=severity,
                user_id=user_id,
                resource_id=resource_id,
                resource_type=resource_type,
                details=details or {},
                hash_chain=self._calculate_hash_chain(entry_id, timestamp)
            )
            
            # Sign entry if signer is available
            if self.signer:
                try:
                    entry.signature = self.signer.sign_entry(entry)
                except Exception as e:
                    # Log signing failure but don't prevent audit entry
                    entry.details['signing_error'] = str(e)
            
            # Store entry
            self.storage.store_entry(entry)
            
            # Update hash chain
            self._last_hash = entry.hash_chain
            
            return entry
    
    def get_audit_trail(
        self,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[AuditAction] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 1000
    ) -> List[AuditEntry]:
        """
        Retrieve audit trail entries.
        
        Args:
            user_id: Filter by user ID
            resource_id: Filter by resource ID
            action: Filter by action type
            start_time: Start time filter
            end_time: End time filter
            limit: Maximum entries to return
            
        Returns:
            List of audit entries
        """
        start_ts = start_time.timestamp() if start_time else None
        end_ts = end_time.timestamp() if end_time else None
        
        return self.storage.get_entries(
            user_id=user_id,
            resource_id=resource_id,
            action=action,
            start_time=start_ts,
            end_time=end_ts,
            limit=limit
        )
    
    def verify_integrity(self, entries: List[AuditEntry]) -> bool:
        """
        Verify integrity of audit trail entries.
        
        Args:
            entries: List of audit entries to verify
            
        Returns:
            True if integrity is intact
        """
        if not entries:
            return True
        
        # Sort entries by timestamp
        sorted_entries = sorted(entries, key=lambda e: e.timestamp)
        
        # Verify hash chain
        for i, entry in enumerate(sorted_entries):
            if not entry.hash_chain:
                continue
            
            expected_hash = self._calculate_hash_chain(
                entry.id,
                entry.timestamp,
                sorted_entries[i-1].hash_chain if i > 0 else None
            )
            
            if entry.hash_chain != expected_hash:
                return False
        
        return True
    
    def _generate_entry_id(self) -> str:
        """Generate unique entry ID."""
        return hashlib.sha256(
            f"{time.time()}{threading.current_thread().ident}".encode()
        ).hexdigest()[:16]
    
    def _calculate_hash_chain(
        self,
        entry_id: str,
        timestamp: float,
        previous_hash: Optional[str] = None
    ) -> str:
        """
        Calculate hash chain value for entry.
        
        Args:
            entry_id: Entry identifier
            timestamp: Entry timestamp
            previous_hash: Previous entry's hash
            
        Returns:
            Hash chain value
        """
        chain_data = f"{entry_id}:{timestamp}:{previous_hash or ''}"
        return hashlib.sha256(chain_data.encode()).hexdigest()
    
    def export_audit_trail(
        self,
        output_path: Union[str, Path],
        format: str = 'json',
        **filters
    ) -> None:
        """
        Export audit trail to file.
        
        Args:
            output_path: Output file path
            format: Export format ('json' or 'csv')
            **filters: Additional filters for entries
        """
        entries = self.get_audit_trail(**filters)
        
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        if format.lower() == 'json':
            with open(output_path, 'w') as f:
                json.dump([entry.to_dict() for entry in entries], f, indent=2)
        elif format.lower() == 'csv':
            import csv
            with open(output_path, 'w', newline='') as f:
                if entries:
                    writer = csv.DictWriter(f, fieldnames=entries[0].to_dict().keys())
                    writer.writeheader()
                    for entry in entries:
                        writer.writerow(entry.to_dict())
        else:
            raise ValueError(f"Unsupported export format: {format}")


# Convenience functions for common audit operations
def audit_data_access(
    manager: AuditManager,
    user_id: str,
    resource_id: str,
    action: AuditAction,
    success: bool = True,
    details: Optional[Dict[str, Any]] = None
) -> AuditEntry:
    """
    Log data access audit event.
    
    Args:
        manager: Audit manager instance
        user_id: User performing access
        resource_id: Resource being accessed
        action: Type of access
        success: Whether access was successful
        details: Additional details
        
    Returns:
        Created audit entry
    """
    severity = AuditSeverity.MEDIUM if success else AuditSeverity.HIGH
    event_details = {'success': success, **(details or {})}
    
    return manager.log_audit_event(
        action=action,
        user_id=user_id,
        resource_id=resource_id,
        resource_type='data',
        details=event_details,
        severity=severity
    )


def audit_permission_change(
    manager: AuditManager,
    admin_user_id: str,
    target_user_id: str,
    resource_id: str,
    permission: str,
    granted: bool
) -> AuditEntry:
    """
    Log permission change audit event.
    
    Args:
        manager: Audit manager instance
        admin_user_id: User making permission change
        target_user_id: User receiving permission change
        resource_id: Resource affected
        permission: Permission being changed
        granted: Whether permission was granted or revoked
        
    Returns:
        Created audit entry
    """
    action = AuditAction.PERMISSION_GRANT if granted else AuditAction.PERMISSION_REVOKE
    
    return manager.log_audit_event(
        action=action,
        user_id=admin_user_id,
        resource_id=resource_id,
        resource_type='permission',
        details={
            'target_user_id': target_user_id,
            'permission': permission,
            'granted': granted
        },
        severity=AuditSeverity.HIGH
    )
