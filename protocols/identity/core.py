"""
Identity Core

Zero Identity Protocol - Core identity without PII
"""

import hashlib
from datetime import datetime
from typing import Optional
from protocols.identity.surface import IdentitySurface


class IdentityCore:
    """
    Core identity without any PII

    Based on a seed value (device ID, random string, etc.)
    Creates deterministic but anonymous identity
    """

    def __init__(self, seed: str):
        """
        Initialize identity from seed

        Args:
            seed: Any string (device ID, random string, etc.)
                  No PII allowed!
        """
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
        """Export identity to dictionary"""
        return {
            'seed_hash': self.seed_hash,
            'created_at': self.created_at.isoformat(),
            'surface': self.surface.export_to_dict() if self.surface else None
        }

    @classmethod
    def from_dict(cls, data: dict) -> 'IdentityCore':
        """Import identity from dictionary"""
        # Create with dummy seed (we only have hash)
        identity = cls.__new__(cls)
        identity.seed_hash = data['seed_hash']
        identity.created_at = datetime.fromisoformat(data['created_at'])

        if data.get('surface'):
            identity.surface = IdentitySurface.from_dict(data['surface'])
        else:
            identity.surface = None

        return identity
