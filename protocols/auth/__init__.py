"""
Zero Auth Protocol

Device-to-device synchronization without servers.
No authentication, no identity storage, only QR code exchange.
"""

from protocols.auth.qr_sync import (
    QRCodeGenerator,
    QRCodeScanner,
    DeviceSync
)

__all__ = [
    'QRCodeGenerator',
    'QRCodeScanner',
    'DeviceSync'
]
