"""
Zero Auth Protocol - Cryptography Module

End-to-end encryption for device synchronization.
No server involvement, no identity storage.
"""

import os
import secrets
from typing import Tuple, Optional
from datetime import datetime, timedelta
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives.asymmetric import x25519
from cryptography.hazmat.primitives import serialization
import base64
import json


class ZeroAuthCrypto:
    """
    Cryptographic utilities for Zero Auth Protocol
    
    Features:
    - X25519 key exchange (Diffie-Hellman)
    - AES-256-GCM encryption
    - No PII, no server storage
    """
    
    def __init__(self):
        """Initialize crypto module with fresh keypair"""
        self._private_key = x25519.X25519PrivateKey.generate()
        self._public_key = self._private_key.public_key()
    
    @property
    def public_key_bytes(self) -> bytes:
        """Get public key as bytes"""
        return self._public_key.public_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PublicFormat.Raw
        )
    
    @property
    def public_key_b64(self) -> str:
        """Get public key as base64 string"""
        return base64.b64encode(self.public_key_bytes).decode('utf-8')
    
    def derive_shared_key(self, peer_public_key_bytes: bytes) -> bytes:
        """Derive shared secret using X25519 key exchange"""
        peer_public_key = x25519.X25519PublicKey.from_public_bytes(peer_public_key_bytes)
        shared_secret = self._private_key.exchange(peer_public_key)
        hkdf = HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=b'autus-zero-auth-v1')
        return hkdf.derive(shared_secret)
    
    def encrypt(self, plaintext: bytes, shared_key: bytes) -> bytes:
        """Encrypt data using AES-256-GCM"""
        nonce = os.urandom(12)
        aesgcm = AESGCM(shared_key)
        ciphertext = aesgcm.encrypt(nonce, plaintext, None)
        return nonce + ciphertext
    
    def decrypt(self, encrypted_data: bytes, shared_key: bytes) -> bytes:
        """Decrypt data using AES-256-GCM"""
        nonce = encrypted_data[:12]
        ciphertext = encrypted_data[12:]
        aesgcm = AESGCM(shared_key)
        return aesgcm.decrypt(nonce, ciphertext, None)
    
    def encrypt_json(self, data: dict, shared_key: bytes) -> str:
        """Encrypt JSON data to base64 string"""
        plaintext = json.dumps(data).encode('utf-8')
        encrypted = self.encrypt(plaintext, shared_key)
        return base64.b64encode(encrypted).decode('utf-8')
    
    def decrypt_json(self, encrypted_b64: str, shared_key: bytes) -> dict:
        """Decrypt base64 string to JSON data"""
        encrypted = base64.b64decode(encrypted_b64)
        plaintext = self.decrypt(encrypted, shared_key)
        return json.loads(plaintext.decode('utf-8'))


class PairingSession:
    """Manage device pairing session"""
    
    def __init__(self, session_id: Optional[str] = None, expiry_minutes: int = 5):
        self.session_id = session_id or secrets.token_urlsafe(16)
        self.crypto = ZeroAuthCrypto()
        self.created_at = datetime.utcnow()
        self.expires_at = self.created_at + timedelta(minutes=expiry_minutes)
        self._shared_key: Optional[bytes] = None
        self._peer_public_key: Optional[bytes] = None
        self._is_paired = False
    
    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_paired(self) -> bool:
        return self._is_paired and self._shared_key is not None
    
    def generate_pairing_payload(self) -> dict:
        return {
            'protocol': 'autus-zero-auth',
            'version': '1.0',
            'session_id': self.session_id,
            'public_key': self.crypto.public_key_b64,
            'expires_at': self.expires_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }
    
    def complete_pairing(self, peer_public_key_b64: str) -> bool:
        if self.is_expired:
            raise ValueError("Pairing session has expired")
        try:
            self._peer_public_key = base64.b64decode(peer_public_key_b64)
            self._shared_key = self.crypto.derive_shared_key(self._peer_public_key)
            self._is_paired = True
            return True
        except Exception as e:
            self._is_paired = False
            raise ValueError(f"Pairing failed: {e}")
    
    def encrypt_sync_data(self, data: dict) -> str:
        if not self.is_paired:
            raise ValueError("Session not paired")
        return self.crypto.encrypt_json(data, self._shared_key)
    
    def decrypt_sync_data(self, encrypted_b64: str) -> dict:
        if not self.is_paired:
            raise ValueError("Session not paired")
        return self.crypto.decrypt_json(encrypted_b64, self._shared_key)
    
    def to_dict(self) -> dict:
        return {
            'session_id': self.session_id,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'is_paired': self._is_paired,
            'is_expired': self.is_expired
        }


class DevicePairing:
    """High-level device pairing manager"""
    
    def __init__(self):
        self._sessions: dict[str, PairingSession] = {}
        self._paired_devices: dict[str, dict] = {}
    
    def create_session(self, expiry_minutes: int = 5) -> PairingSession:
        session = PairingSession(expiry_minutes=expiry_minutes)
        self._sessions[session.session_id] = session
        return session
    
    def get_session(self, session_id: str) -> Optional[PairingSession]:
        return self._sessions.get(session_id)
    
    def cleanup_expired(self) -> int:
        expired = [sid for sid, s in self._sessions.items() if s.is_expired]
        for sid in expired:
            del self._sessions[sid]
        return len(expired)
    
    def complete_pairing_from_qr(self, qr_payload: dict) -> Tuple[PairingSession, str]:
        if qr_payload.get('protocol') != 'autus-zero-auth':
            raise ValueError("Invalid protocol")
        session = PairingSession(session_id=qr_payload['session_id'], expiry_minutes=5)
        session.complete_pairing(qr_payload['public_key'])
        self._sessions[session.session_id] = session
        return session, session.crypto.public_key_b64
    
    @property
    def active_sessions_count(self) -> int:
        return sum(1 for s in self._sessions.values() if not s.is_expired)


def generate_pairing_qr_data(expiry_minutes: int = 5) -> Tuple[PairingSession, dict]:
    session = PairingSession(expiry_minutes=expiry_minutes)
    return session, session.generate_pairing_payload()
