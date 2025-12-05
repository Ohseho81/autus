"""
AUTUS Zero Auth Protocol

Article I: Zero Identity
- No login system
- No email collection
- No accounts, no authentication servers
- QR-based device sync only
"""

import secrets
import hashlib
import json
import base64
from typing import Dict, Any, Optional
from datetime import datetime, timedelta


class ZeroAuth:
    """
    Zero Authentication Protocol.
    
    Instead of login/password, uses:
    1. Local 32-byte seed (never transmitted)
    2. QR code for device-to-device sync
    3. Time-limited sync tokens
    """
    
    def __init__(self, seed: Optional[bytes] = None):
        if seed:
            self.seed = seed
        else:
            self.seed = secrets.token_bytes(32)
        self._derived_id = self._derive_id()
    
    def _derive_id(self) -> str:
        """Derive a public identifier from private seed."""
        hash_bytes = hashlib.sha256(self.seed).digest()
        return base64.urlsafe_b64encode(hash_bytes[:16]).decode('utf-8').rstrip('=')
    
    @property
    def zero_id(self) -> str:
        """Get the Zero ID (public, shareable)."""
        return f"Z{self._derived_id}"
    
    @property
    def seed_hex(self) -> str:
        """Get seed as hex (for local storage only, NEVER transmit)."""
        return self.seed.hex()
    
    # === QR Sync ===
    
    def generate_sync_token(self, expires_minutes: int = 5) -> Dict[str, Any]:
        """
        Generate a time-limited sync token for QR code.
        
        This allows another device to sync WITHOUT server involvement.
        """
        expires_at = datetime.now() + timedelta(minutes=expires_minutes)
        
        # Create sync payload
        payload = {
            "zero_id": self.zero_id,
            "seed": self.seed_hex,  # Only shared device-to-device via QR
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now().isoformat()
        }
        
        # Sign the payload
        payload_json = json.dumps(payload, sort_keys=True)
        signature = hashlib.sha256(
            (payload_json + self.seed_hex).encode()
        ).hexdigest()[:16]
        
        return {
            "payload": payload,
            "signature": signature
        }
    
    def generate_qr_data(self, expires_minutes: int = 5) -> str:
        """Generate QR code data string."""
        token = self.generate_sync_token(expires_minutes)
        return base64.urlsafe_b64encode(
            json.dumps(token).encode()
        ).decode('utf-8')
    
    @classmethod
    def from_qr_data(cls, qr_data: str) -> Optional['ZeroAuth']:
        """
        Restore ZeroAuth from QR code data.
        
        Returns None if expired or invalid.
        """
        try:
            token = json.loads(base64.urlsafe_b64decode(qr_data))
            payload = token["payload"]
            
            # Check expiration
            expires_at = datetime.fromisoformat(payload["expires_at"])
            if datetime.now() > expires_at:
                print("❌ Sync token expired")
                return None
            
            # Verify signature
            seed_hex = payload["seed"]
            payload_json = json.dumps(payload, sort_keys=True)
            expected_sig = hashlib.sha256(
                (payload_json + seed_hex).encode()
            ).hexdigest()[:16]
            
            if token["signature"] != expected_sig:
                print("❌ Invalid signature")
                return None
            
            # Restore from seed
            seed = bytes.fromhex(seed_hex)
            return cls(seed=seed)
            
        except Exception as e:
            print(f"❌ QR parse error: {e}")
            return None
    
    # === 3D Identity Coordinates ===
    
    def get_3d_coordinates(self) -> Dict[str, float]:
        """
        Generate 3D coordinates from seed for visual identity.
        
        These coordinates can be used with Three.js for visualization.
        """
        hash_bytes = hashlib.sha256(self.seed).digest()
        
        # Use first 24 bytes for X, Y, Z (8 bytes each)
        x = int.from_bytes(hash_bytes[0:8], 'big') / (2**64) * 2 - 1  # -1 to 1
        y = int.from_bytes(hash_bytes[8:16], 'big') / (2**64) * 2 - 1
        z = int.from_bytes(hash_bytes[16:24], 'big') / (2**64) * 2 - 1
        
        return {"x": round(x, 6), "y": round(y, 6), "z": round(z, 6)}
    
    def get_identity_info(self) -> Dict[str, Any]:
        """Get complete identity info for Twin API."""
        return {
            "zero_id": self.zero_id,
            "coordinates_3d": self.get_3d_coordinates(),
            "created_at": datetime.now().isoformat(),
            "auth_type": "zero_auth",
            "requires_login": False,
            "requires_email": False
        }


if __name__ == "__main__":
    print("=" * 50)
    print("AUTUS Zero Auth Protocol Demo")
    print("=" * 50)
    
    # Create new identity
    auth = ZeroAuth()
    print(f"\n✅ New Zero ID: {auth.zero_id}")
    print(f"📍 3D Coordinates: {auth.get_3d_coordinates()}")
    
    # Generate QR for sync
    qr_data = auth.generate_qr_data(expires_minutes=5)
    print(f"\n📱 QR Data (for device sync):")
    print(f"   {qr_data[:50]}...")
    
    # Simulate receiving QR on another device
    print("\n🔄 Simulating device sync...")
    restored = ZeroAuth.from_qr_data(qr_data)
    
    if restored:
        print(f"✅ Restored Zero ID: {restored.zero_id}")
        print(f"✅ IDs match: {auth.zero_id == restored.zero_id}")
    
    print("\n🔒 Privacy Features:")
    print("   - No login required")
    print("   - No email collected")
    print("   - No server authentication")
    print("   - Seed never leaves device (except QR sync)")

