"""
Signer module for Sovereign Layer in AUTUS OS.

Handles cryptographic signing operations, signature verification,
and key management for data ownership and audit trails.
"""

import hashlib
import json
import time
from typing import Dict, Any, Optional, Tuple, List
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.serialization import load_pem_private_key, load_pem_public_key
from cryptography.exceptions import InvalidSignature
from dataclasses import dataclass, asdict
from pathlib import Path


@dataclass
class SignedData:
    """Container for signed data with metadata."""
    data: Dict[str, Any]
    signature: str
    signer_id: str
    timestamp: float
    hash_algorithm: str
    data_hash: str


@dataclass
class KeyPair:
    """Container for cryptographic key pair."""
    private_key: bytes
    public_key: bytes
    key_id: str
    created_at: float


class SignerError(Exception):
    """Base exception for signer operations."""
    pass


class KeyGenerationError(SignerError):
    """Raised when key generation fails."""
    pass


class SigningError(SignerError):
    """Raised when signing operation fails."""
    pass


class VerificationError(SignerError):
    """Raised when signature verification fails."""
    pass


class KeyManager:
    """Manages cryptographic keys for signing operations."""
    
    def __init__(self, key_store_path: Optional[Path] = None):
        """
        Initialize key manager.
        
        Args:
            key_store_path: Optional path to key storage directory
        """
        self.key_store_path = key_store_path or Path.home() / ".autus" / "keys"
        self.key_store_path.mkdir(parents=True, exist_ok=True)
        self._keys: Dict[str, KeyPair] = {}
        self._load_existing_keys()
    
    def generate_key_pair(self, key_id: str, key_size: int = 2048) -> KeyPair:
        """
        Generate a new RSA key pair.
        
        Args:
            key_id: Unique identifier for the key pair
            key_size: RSA key size in bits
            
        Returns:
            Generated key pair
            
        Raises:
            KeyGenerationError: If key generation fails
        """
        try:
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=key_size
            )
            
            private_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            )
            
            public_key = private_key.public_key()
            public_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            )
            
            key_pair = KeyPair(
                private_key=private_pem,
                public_key=public_pem,
                key_id=key_id,
                created_at=time.time()
            )
            
            self._keys[key_id] = key_pair
            self._save_key_pair(key_pair)
            
            return key_pair
            
        except Exception as e:
            raise KeyGenerationError(f"Failed to generate key pair: {e}")
    
    def get_key_pair(self, key_id: str) -> Optional[KeyPair]:
        """
        Retrieve a key pair by ID.
        
        Args:
            key_id: Key pair identifier
            
        Returns:
            Key pair if found, None otherwise
        """
        return self._keys.get(key_id)
    
    def list_keys(self) -> List[str]:
        """
        List all available key IDs.
        
        Returns:
            List of key identifiers
        """
        return list(self._keys.keys())
    
    def delete_key_pair(self, key_id: str) -> bool:
        """
        Delete a key pair.
        
        Args:
            key_id: Key pair identifier
            
        Returns:
            True if deleted, False if not found
        """
        if key_id in self._keys:
            del self._keys[key_id]
            key_file = self.key_store_path / f"{key_id}.json"
            if key_file.exists():
                key_file.unlink()
            return True
        return False
    
    def _load_existing_keys(self) -> None:
        """Load existing keys from storage."""
        try:
            for key_file in self.key_store_path.glob("*.json"):
                with open(key_file, 'r') as f:
                    key_data = json.load(f)
                    key_pair = KeyPair(
                        private_key=key_data['private_key'].encode(),
                        public_key=key_data['public_key'].encode(),
                        key_id=key_data['key_id'],
                        created_at=key_data['created_at']
                    )
                    self._keys[key_pair.key_id] = key_pair
        except Exception:
            # Continue if loading fails
            pass
    
    def _save_key_pair(self, key_pair: KeyPair) -> None:
        """Save key pair to storage."""
        try:
            key_file = self.key_store_path / f"{key_pair.key_id}.json"
            key_data = {
                'private_key': key_pair.private_key.decode(),
                'public_key': key_pair.public_key.decode(),
                'key_id': key_pair.key_id,
                'created_at': key_pair.created_at
            }
            with open(key_file, 'w') as f:
                json.dump(key_data, f, indent=2)
        except Exception:
            # Continue if saving fails
            pass


class DataSigner:
    """Handles data signing and verification operations."""
    
    def __init__(self, key_manager: KeyManager):
        """
        Initialize data signer.
        
        Args:
            key_manager: Key manager instance
        """
        self.key_manager = key_manager
        self.hash_algorithm = "SHA256"
    
    def sign_data(self, data: Dict[str, Any], signer_id: str) -> SignedData:
        """
        Sign data with the specified signer's key.
        
        Args:
            data: Data to sign
            signer_id: ID of the signing key
            
        Returns:
            Signed data container
            
        Raises:
            SigningError: If signing fails
        """
        try:
            key_pair = self.key_manager.get_key_pair(signer_id)
            if not key_pair:
                raise SigningError(f"Key not found: {signer_id}")
            
            # Serialize data consistently
            data_json = json.dumps(data, sort_keys=True, separators=(',', ':'))
            data_hash = hashlib.sha256(data_json.encode()).hexdigest()
            
            # Load private key
            private_key = load_pem_private_key(key_pair.private_key, password=None)
            
            # Sign the hash
            signature_bytes = private_key.sign(
                data_json.encode(),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            signature_b64 = hashlib.b64encode(signature_bytes).decode()
            
            return SignedData(
                data=data,
                signature=signature_b64,
                signer_id=signer_id,
                timestamp=time.time(),
                hash_algorithm=self.hash_algorithm,
                data_hash=data_hash
            )
            
        except Exception as e:
            raise SigningError(f"Failed to sign data: {e}")
    
    def verify_signature(self, signed_data: SignedData) -> bool:
        """
        Verify the signature of signed data.
        
        Args:
            signed_data: Signed data to verify
            
        Returns:
            True if signature is valid, False otherwise
            
        Raises:
            VerificationError: If verification process fails
        """
        try:
            key_pair = self.key_manager.get_key_pair(signed_data.signer_id)
            if not key_pair:
                raise VerificationError(f"Key not found: {signed_data.signer_id}")
            
            # Recreate the data hash
            data_json = json.dumps(signed_data.data, sort_keys=True, separators=(',', ':'))
            expected_hash = hashlib.sha256(data_json.encode()).hexdigest()
            
            # Verify data integrity
            if expected_hash != signed_data.data_hash:
                return False
            
            # Load public key
            public_key = load_pem_public_key(key_pair.public_key)
            
            # Verify signature
            signature_bytes = hashlib.b64decode(signed_data.signature.encode())
            
            public_key.verify(
                signature_bytes,
                data_json.encode(),
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
            raise VerificationError(f"Failed to verify signature: {e}")
    
    def verify_data_integrity(self, signed_data: SignedData) -> bool:
        """
        Verify data integrity without checking signature.
        
        Args:
            signed_data: Signed data to verify
            
        Returns:
            True if data integrity is maintained
        """
        try:
            data_json = json.dumps(signed_data.data, sort_keys=True, separators=(',', ':'))
            current_hash = hashlib.sha256(data_json.encode()).hexdigest()
            return current_hash == signed_data.data_hash
        except Exception:
            return False


class AuditTrail:
    """Maintains audit trail for signed data operations."""
    
    def __init__(self, storage_path: Optional[Path] = None):
        """
        Initialize audit trail.
        
        Args:
            storage_path: Optional path for audit log storage
        """
        self.storage_path = storage_path or Path.home() / ".autus" / "audit"
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.audit_file = self.storage_path / "audit.log"
    
    def log_signing_event(self, signed_data: SignedData, event_type: str = "SIGN") -> None:
        """
        Log a signing event to the audit trail.
        
        Args:
            signed_data: The signed data
            event_type: Type of event (SIGN, VERIFY, etc.)
        """
        try:
            audit_entry = {
                "timestamp": time.time(),
                "event_type": event_type,
                "signer_id": signed_data.signer_id,
                "data_hash": signed_data.data_hash,
                "signature": signed_data.signature[:32] + "...",  # Truncated for logs
                "data_keys": list(signed_data.data.keys()) if signed_data.data else []
            }
            
            with open(self.audit_file, 'a') as f:
                f.write(json.dumps(audit_entry) + '\n')
                
        except Exception:
            # Continue if logging fails
            pass
    
    def get_audit_trail(self, signer_id: Optional[str] = None, 
                       limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Retrieve audit trail entries.
        
        Args:
            signer_id: Optional filter by signer ID
            limit: Optional limit on number of entries
            
        Returns:
            List of audit entries
        """
        try:
            entries = []
            
            if not self.audit_file.exists():
                return entries
            
            with open(self.audit_file, 'r') as f:
                for line in f:
                    try:
                        entry = json.loads(line.strip())
                        if signer_id is None or entry.get('signer_id') == signer_id:
                            entries.append(entry)
                    except json.JSONDecodeError:
                        continue
            
            # Sort by timestamp (newest first)
            entries.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
            
            if limit:
                entries = entries[:limit]
            
            return entries
            
        except Exception:
            return []


class SovereignSigner:
    """Main interface for sovereign signing operations."""
    
    def __init__(self, key_store_path: Optional[Path] = None,
                 audit_path: Optional[Path] = None):
        """
        Initialize sovereign signer.
        
        Args:
            key_store_path: Optional path for key storage
            audit_path: Optional path for audit logs
        """
        self.key_manager = KeyManager(key_store_path)
        self.signer = DataSigner(self.key_manager)
        self.audit_trail = AuditTrail(audit_path)
    
    def create_identity(self, identity_id: str) -> KeyPair:
        """
        Create a new signing identity.
        
        Args:
            identity_id: Unique identifier for the identity
            
        Returns:
            Generated key pair
        """
        return self.key_manager.generate_key_pair(identity_id)
    
    def sign_and_audit(self, data: Dict[str, Any], signer_id: str) -> SignedData:
        """
        Sign data and log to audit trail.
        
        Args:
            data: Data to sign
            signer_id: ID of the signing identity
            
        Returns:
            Signed data container
        """
        signed_data = self.signer.sign_data(data, signer_id)
        self.audit_trail.log_signing_event(signed_data, "SIGN")
        return signed_data
    
    def verify_and_audit(self, signed_data: SignedData) -> bool:
        """
        Verify signature and log to audit trail.
        
        Args:
            signed_data: Signed data to verify
            
        Returns:
            True if signature is valid
        """
        is_valid = self.signer.verify_signature(signed_data)
        event_type = "VERIFY_SUCCESS" if is_valid else "VERIFY_FAILURE"
        self.audit_trail.log_signing_event(signed_data, event_type)
        return is_valid
    
    def export_public_key(self, identity_id: str) -> Optional[str]:
        """
        Export public key for an identity.
        
        Args:
            identity_id: Identity identifier
            
        Returns:
            PEM-encoded public key or None if not found
        """
        key_pair = self.key_manager.get_key_pair(identity_id)
        return key_pair.public_key.decode() if key_pair else None
    
    def get_audit_summary(self, identity_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get audit trail summary.
        
        Args:
            identity_id: Optional filter by identity
            
        Returns:
            Audit summary information
        """
        entries = self.audit_trail.get_audit_trail(identity_id)
        
        summary = {
            "total_events": len(entries),
            "identities": len(self.key_manager.list_keys()),
            "recent_events": entries[:10],
            "event_counts": {}
        }
        
        for entry in entries:
            event_type = entry.get("event_type", "UNKNOWN")
            summary["event_counts"][event_type] = summary["event_counts"].get(event_type, 0) + 1
        
        return summary
