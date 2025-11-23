"""
AUTUS Identity Protocol Core
Zero Identity System - Fixed Version
"""

from __future__ import annotations

import secrets
import hashlib
import json
from typing import Optional, Tuple
import base64


class IdentityCore:
    """
    AUTUS Zero Identity Core
    Generates 3D coordinates from an immutable seed.
    """
    
    def __init__(self, seed: Optional[bytes | str] = None) -> None:
        """
        Initialize Identity Core with seed.
        
        Parameters
        ----------
        seed : bytes, optional
            32-byte seed. If not provided, generates new random seed.
        """
        if seed is None:
            self.seed = secrets.token_bytes(32)
        else:
            # Handle both str and bytes input
            if isinstance(seed, str):
                # If it's a base64 string, decode it
                try:
                    self.seed = base64.b64decode(seed)
                except:
                    # Otherwise encode as UTF-8
                    self.seed = seed.encode('utf-8')
                    # Pad or truncate to 32 bytes
                    if len(self.seed) < 32:
                        self.seed = self.seed.ljust(32, b'\0')
                    else:
                        self.seed = self.seed[:32]
            else:
                self.seed = seed
                # Ensure it's 32 bytes
                if len(self.seed) < 32:
                    self.seed = self.seed.ljust(32, b'\0')
                elif len(self.seed) > 32:
                    self.seed = self.seed[:32]
    
    def generate_core(self) -> Tuple[float, float, float]:
        """
        Generate immutable 3D core coordinates from seed.
        
        Returns
        -------
        Tuple[float, float, float]
            X, Y, Z coordinates in 3D space (range: 0-1)
        """
        # SHA256 hash of seed
        hash_digest = hashlib.sha256(self.seed).digest()
        
        # Convert first 12 bytes to 3 coordinates (4 bytes each)
        x = int.from_bytes(hash_digest[0:4], 'big') / (2**32 - 1)
        y = int.from_bytes(hash_digest[4:8], 'big') / (2**32 - 1)
        z = int.from_bytes(hash_digest[8:12], 'big') / (2**32 - 1)
        
        return (x, y, z)
    
    def export_for_sync(self) -> str:
        """
        Export identity for QR code sync (no server transmission).
        
        Returns
        -------
        str
            Base64 encoded seed for QR generation
        """
        return base64.b64encode(self.seed).decode('utf-8')
    
    @classmethod
    def import_from_sync(cls, sync_data: str) -> 'IdentityCore':
        """
        Import identity from QR sync data.
        
        Parameters
        ----------
        sync_data : str
            Base64 encoded seed from QR code
            
        Returns
        -------
        IdentityCore
            Restored identity core
        """
        seed = base64.b64decode(sync_data.encode('utf-8'))
        return cls(seed)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary (without seed)."""
        x, y, z = self.generate_core()
        return {
            'x': x,
            'y': y,
            'z': z,
            'type': 'zero_identity'
        }
    
    def __str__(self) -> str:
        x, y, z = self.generate_core()
        return f"IdentityCore(x={x:.4f}, y={y:.4f}, z={z:.4f})"


# Test the module
if __name__ == "__main__":
    print("Testing IdentityCore...")
    
    # Test 1: Create new identity
    identity = IdentityCore()
    print(f"✅ New identity: {identity}")
    
    # Test 2: Export and import
    sync_data = identity.export_for_sync()
    restored = IdentityCore.import_from_sync(sync_data)
    print(f"✅ Sync test passed: {identity.generate_core() == restored.generate_core()}")
