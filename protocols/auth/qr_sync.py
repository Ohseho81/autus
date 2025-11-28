"""
from __future__ import annotations

Zero Auth Protocol - QR Code Sync

Device-to-device synchronization without servers.
No authentication, no identity storage, only QR code exchange.
"""

import json
import base64
from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
import qrcode
from io import BytesIO
from PIL import Image
import hashlib

from protocols.identity.core import IdentityCore

try:
    from pyzbar import pyzbar
    ZBAR_AVAILABLE = True
except ImportError:
    ZBAR_AVAILABLE = False


class QRCodeGenerator:
    """
    Generate QR codes for identity sync

    QR codes contain encrypted identity data (no PII)
    """

    def __init__(self, error_correction: str = 'M') -> None:
        """
        Initialize QR code generator

        Args:
            error_correction: Error correction level (L, M, Q, H)
        """
        self.error_correction = {
            'L': qrcode.constants.ERROR_CORRECT_L,
            'M': qrcode.constants.ERROR_CORRECT_M,
            'Q': qrcode.constants.ERROR_CORRECT_Q,
            'H': qrcode.constants.ERROR_CORRECT_H
        }.get(error_correction, qrcode.constants.ERROR_CORRECT_M)

    def generate_identity_qr(self, identity_data: Dict, expiration_minutes: int = 5) -> Image.Image:
        """
        Generate QR code for identity sync

        Args:
            identity_data: Identity data (from IdentityCore.export_to_dict())
            expiration_minutes: QR code expiration time

        Returns:
            PIL Image with QR code
        """
        # Add expiration timestamp
        # Limit evolution_history in identity_data['surface'] if present
        identity_data = dict(identity_data)  # shallow copy
        if 'surface' in identity_data and isinstance(identity_data['surface'], dict):
            surf = identity_data['surface']
            # Only keep core_hash and the last evolution entry
            minimized_surface = {
                'core_hash': surf.get('core_hash')
            }
            if 'evolution_history' in surf and isinstance(surf['evolution_history'], list) and len(surf['evolution_history']) > 0:
                minimized_surface['evolution_history'] = [surf['evolution_history'][-1]]
            identity_data['surface'] = minimized_surface

        sync_data = {
            'identity': identity_data,
            'expires_at': (datetime.now() + timedelta(minutes=expiration_minutes)).isoformat(),
            'created_at': datetime.now().isoformat(),
            'version': '1.0'
        }

        # Encode to JSON, compress with zlib, then base64 encode
        import zlib
        json_str = json.dumps(sync_data, sort_keys=True)
        compressed = zlib.compress(json_str.encode('utf-8'), level=9)
        encoded = base64.b64encode(compressed).decode('utf-8')

        # Dynamically select QR version up to 40
        for version in range(1, 41):
            try:
                qr = qrcode.QRCode(
                    version=version,
                    error_correction=self.error_correction,
                    box_size=10,
                    border=4,
                )
                qr.add_data(encoded)
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")
                # Always return a true PIL.Image.Image
                if hasattr(img, 'get_image'):
                    return img.get_image()
                return img
            except Exception as e:
                if "Invalid version" in str(e) or "data too large" in str(e):
                    continue
                else:
                    raise
        raise ValueError("Data too large to fit in a QR code (max version 40). Consider reducing payload size.")

    def save_qr_image(self, qr_image: Image.Image, filepath: str) -> None:
        """
        Save QR code image to file

        Args:
            qr_image: PIL Image
            filepath: Output file path
        """
        qr_image.save(filepath)

    def generate_qr_bytes(self, identity_data: Dict, expiration_minutes: int = 5) -> bytes:
        """
        Generate QR code as bytes

        Args:
            identity_data: Identity data
            expiration_minutes: Expiration time

        Returns:
            PNG image bytes
        """
        img = self.generate_identity_qr(identity_data, expiration_minutes)
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        return buffer.getvalue()


class QRCodeScanner:
    """
    Scan QR codes for identity sync
    """

    @staticmethod
    def scan_from_image(image_path: str) -> Optional[Dict]:
        """
        Scan QR code from image file

        Args:
            image_path: Path to QR code image

        Returns:
            Decoded identity data or None
        """
        if not ZBAR_AVAILABLE:
            raise ImportError("pyzbar not available. Install with: pip install pyzbar")

        from PIL import Image

        img = Image.open(image_path)
        decoded_objects = pyzbar.decode(img)

        if not decoded_objects:
            return None

        # Get first QR code data
        qr_data = decoded_objects[0].data.decode('utf-8')

        # Decode base64
        try:
            json_str = base64.b64decode(qr_data).decode('utf-8')
            sync_data = json.loads(json_str)
        except Exception as e:
            return None

        # Check expiration
        expires_at = datetime.fromisoformat(sync_data.get('expires_at', ''))
        if datetime.now() > expires_at:
            return None  # Expired

        return sync_data.get('identity')

    @staticmethod
    def scan_from_bytes(image_bytes: bytes) -> Optional[Dict]:
        """
        Scan QR code from image bytes

        Args:
            image_bytes: PNG image bytes

        Returns:
            Decoded identity data or None
        """
        if not ZBAR_AVAILABLE:
            raise ImportError("pyzbar not available. Install with: pip install pyzbar")

        from PIL import Image, UnidentifiedImageError
        try:
            img = Image.open(BytesIO(image_bytes))
            decoded_objects = pyzbar.decode(img)
        except UnidentifiedImageError:
            return None
        except Exception:
            return None

        if not decoded_objects:
            return None

        # Get first QR code data
        qr_data = decoded_objects[0].data.decode('utf-8')

        # Decode base64
        try:
            json_str = base64.b64decode(qr_data).decode('utf-8')
            sync_data = json.loads(json_str)
        except Exception:
            return None

        # Check expiration
        expires_at = datetime.fromisoformat(sync_data.get('expires_at', ''))
        if datetime.now() > expires_at:
            return None  # Expired

        return sync_data.get('identity')


class DeviceSync:
    """
    Device-to-device synchronization protocol

    No servers, no authentication, only local QR code exchange
    """

    def __init__(self, identity_core) -> None:
        """
        Initialize device sync

        Args:
            identity_core: IdentityCore instance
        """
        self.identity_core = identity_core
        self.qr_generator = QRCodeGenerator()
        self.qr_scanner = QRCodeScanner()

    def generate_sync_qr(self, expiration_minutes: int = 5) -> Image.Image:
        """
        Generate QR code for device sync

        Args:
            expiration_minutes: QR code expiration time

        Returns:
            PIL Image with QR code
        """
        # Export identity for QR sync
        # IdentityCore only has export_for_sync() which returns base64 string
        # We need to create a dict with the sync data
        sync_data = self.identity_core.export_for_sync()
        identity_data = {
            'seed_hash': hashlib.sha256(self.identity_core.seed.encode('utf-8') if isinstance(self.identity_core.seed, str) else self.identity_core.seed).hexdigest(),
            'sync_data': sync_data,
            'created_at': datetime.now().isoformat()
        }
        # If surface exists, include it
        if hasattr(self.identity_core, 'surface') and self.identity_core.surface:
            identity_data['surface'] = self.identity_core.surface.export_to_dict()
        return self.qr_generator.generate_identity_qr(identity_data, expiration_minutes)

    def sync_from_qr(self, qr_image_path: str) -> bool:
        """
        Sync identity from QR code image

        Args:
            qr_image_path: Path to QR code image

        Returns:
            True if sync successful, False otherwise
        """
        identity_data = self.qr_scanner.scan_from_image(qr_image_path)

        if identity_data is None:
            return False

        # Import identity
        try:
            # IdentityCore uses import_from_sync() for base64 sync data
            if 'sync_data' in identity_data:
                synced_identity = IdentityCore.import_from_sync(identity_data['sync_data'])
            else:
                # Fallback: try to create from seed_hash if available
                if 'seed_hash' in identity_data:
                    synced_identity = IdentityCore(identity_data['seed_hash'].encode())
                else:
                    raise ValueError("No sync_data or seed_hash in identity_data")
            
            # Restore surface if present
            if 'surface' in identity_data and identity_data.get('surface'):
                from protocols.identity.surface import IdentitySurface
                synced_identity.surface = IdentitySurface.from_dict(identity_data['surface'])

            # Merge surfaces if both exist
            if synced_identity.surface and self.identity_core.surface:
                # Merge evolution histories (keep both)
                merged_history = (
                    self.identity_core.surface.evolution_history +
                    synced_identity.surface.evolution_history
                )
                # Keep last 100
                self.identity_core.surface.evolution_history = merged_history[-100:]

                # Update position (average of both)
                pos1 = self.identity_core.surface.position
                pos2 = synced_identity.surface.position
                self.identity_core.surface.position = (
                    (pos1[0] + pos2[0]) / 2,
                    (pos1[1] + pos2[1]) / 2,
                    (pos1[2] + pos2[2]) / 2
                )

            return True
        except Exception:
            return False

    def sync_from_qr_bytes(self, qr_image_bytes: bytes) -> bool:
        """
        Sync identity from QR code bytes

        Args:
            qr_image_bytes: PNG image bytes

        Returns:
            True if sync successful, False otherwise
        """
        identity_data = self.qr_scanner.scan_from_bytes(qr_image_bytes)

        if identity_data is None:
            return False

        # Import identity
        try:
            # IdentityCore uses import_from_sync() for base64 sync data
            if 'sync_data' in identity_data:
                synced_identity = IdentityCore.import_from_sync(identity_data['sync_data'])
            else:
                # Fallback: try to create from seed_hash if available
                if 'seed_hash' in identity_data:
                    synced_identity = IdentityCore(identity_data['seed_hash'].encode())
                else:
                    raise ValueError("No sync_data or seed_hash in identity_data")
            
            # Restore surface if present
            if 'surface' in identity_data and identity_data.get('surface'):
                from protocols.identity.surface import IdentitySurface
                synced_identity.surface = IdentitySurface.from_dict(identity_data['surface'])

            # Merge surfaces if both exist
            if synced_identity.surface and self.identity_core.surface:
                # Merge evolution histories
                merged_history = (
                    self.identity_core.surface.evolution_history +
                    synced_identity.surface.evolution_history
                )
                self.identity_core.surface.evolution_history = merged_history[-100:]

                # Update position (average)
                pos1 = self.identity_core.surface.position
                pos2 = synced_identity.surface.position
                self.identity_core.surface.position = (
                    (pos1[0] + pos2[0]) / 2,
                    (pos1[1] + pos2[1]) / 2,
                    (pos1[2] + pos2[2]) / 2
                )

            return True
        except Exception:
            return False
