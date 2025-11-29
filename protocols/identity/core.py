"""
Identity Core

Zero Identity Protocol - Core identity without PII
"""

import hashlib
from datetime import datetime
from typing import Optional
from protocols.identity.surface import IdentitySurface


class IdentityCore:
    @classmethod
    def import_from_sync(cls, sync_data_b64: str) -> "IdentityCore":
        """
        Import identity from base64-encoded, zlib-compressed sync data (as produced by export_for_sync).
        """
        import base64
        import zlib
        import json
        try:
            compressed = base64.b64decode(sync_data_b64)
            json_str = zlib.decompress(compressed).decode("utf-8")
            data = json.loads(json_str)
        except Exception as e:
            raise ValueError(f"Failed to decode sync data: {e}")
        return cls.from_sync(data)
    """
    Core identity without any PII

    Based on a seed value (device ID, random string, etc.)
    Creates deterministic but anonymous identity
    """

    def __init__(self, seed: str = None):
        """
        Initialize identity from seed

        Args:
            seed: Any string (device ID, random string, etc.)
                  No PII allowed!
        """
        if seed is None:
            import secrets
            seed = secrets.token_hex(16)
        self.seed = seed  # 테스트 호환용
        self.seed_hash = self._hash_seed(seed)
        self.created_at = datetime.now()
        self.surface: Optional[IdentitySurface] = None

    def _hash_seed(self, seed: str) -> str:
        """
        Hash seed to create core identity

        Uses SHA256 for deterministic hashing
        """
        return hashlib.sha256(seed.encode()).hexdigest()

    def get_core_hash(self) -> str:
        """Get the core identity hash"""
        return self.seed_hash

    def create_surface(self) -> IdentitySurface:
        """
        Create 3D Identity Surface

        Returns:
            IdentitySurface instance
        """
        if self.surface is None:
            self.surface = IdentitySurface(self.seed_hash)
        return self.surface

    def get_surface(self) -> Optional[IdentitySurface]:
        """Get existing surface (or None)"""
        return self.surface

    def export_for_sync(self) -> str:
        """
        Export identity data for device sync (QR code).
        
        ARTICLE II COMPLIANCE: No PII exported.
        Only seed_hash (anonymous identifier) is included.
        """
        import json
        import zlib
        import base64
        data = {
            "seed_hash": self.seed_hash,
            "created_at": self.created_at.isoformat(),
            "surface": self.surface.to_dict() if self.surface else None
        }
        json_str = json.dumps(data)
        compressed = zlib.compress(json_str.encode('utf-8'))
        return base64.b64encode(compressed).decode('utf-8')

    @classmethod
    def from_sync(cls, data: dict) -> "IdentityCore":
        """
        Import identity from sync data.
        
        ARTICLE II COMPLIANCE: Seed is NEVER restored.
        Identity is reconstructed from hash only.
        """
        instance = cls.__new__(cls)
        instance.seed = None  # NEVER restore seed - Article II
        instance.seed_hash = data.get("seed_hash", "")
        instance.created_at = datetime.fromisoformat(data.get("created_at", datetime.now().isoformat()))
        instance.surface = None
        if data.get("surface"):
            from protocols.identity.surface import IdentitySurface
            instance.surface = IdentitySurface.from_dict(data["surface"])
        return instance

    def evolve_surface(self, pattern: dict) -> None:
        """
        Evolve surface with behavioral pattern

        Args:
            pattern: Behavioral pattern from Memory OS or Workflow
        """
        if self.surface is None:
            self.create_surface()

        self.surface.evolve(pattern)

    def export_to_dict(self) -> dict:
        """
        Export identity to dictionary for serialization.
        
        ARTICLE II COMPLIANCE: No PII exported.
        Seed is NEVER included - only the hash.
        """
        return {
            'seed_hash': self.seed_hash,
            'created_at': self.created_at.isoformat(),
            'surface': self.surface.export_to_dict() if self.surface else None
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'IdentityCore':
        """
        Create IdentityCore from dictionary.
        
        ARTICLE II COMPLIANCE: Seed is NEVER restored from external data.
        """
        instance = cls.__new__(cls)
        instance.seed = None  # NEVER restore seed - Article II
        instance.seed_hash = data.get('seed_hash', '')
        instance.created_at = datetime.fromisoformat(data.get('created_at', datetime.now().isoformat()))
        instance.surface = None
        if data.get('surface'):
            from protocols.identity.surface import IdentitySurface
            instance.surface = IdentitySurface.from_dict(data['surface'])
        return instance

