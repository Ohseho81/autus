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
from protocols.auth.sync_manager import (
    SyncConflictResolver,
    SyncHistory,
    AdvancedDeviceSync
)

__all__ = [
    'QRCodeGenerator',
    'QRCodeScanner',
    'DeviceSync',
    'SyncConflictResolver',
    'SyncHistory',
    'AdvancedDeviceSync'
]
