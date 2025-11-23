"""
Zero Auth Usage Examples

Examples for Zero Auth protocol
"""

from protocols.identity.core import IdentityCore
from protocols.auth.qr_sync import QRCodeGenerator, QRCodeScanner, DeviceSync
from protocols.auth.sync_manager import AdvancedDeviceSync


def example_qr_generation():
    """Generate QR code for sync"""
    # Create identity
    identity = IdentityCore("device_001")
    identity.create_surface()
    
    # Generate QR code
    generator = QRCodeGenerator()
    identity_data = identity.export_to_dict()
    
    # Generate as image
    qr_image = generator.generate_identity_qr(identity_data, expiration_minutes=10)
    qr_image.save("sync_qr.png")
    print("QR code saved to sync_qr.png")
    
    # Generate as bytes
    qr_bytes = generator.generate_qr_bytes(identity_data, expiration_minutes=10)
    with open("sync_qr_bytes.png", "wb") as f:
        f.write(qr_bytes)
    print("QR code bytes saved")


def example_qr_scanning():
    """Scan QR code for sync"""
    # Scan from image
    scanner = QRCodeScanner()
    identity_data = scanner.scan_from_image("sync_qr.png")
    
    if identity_data:
        # Restore identity
        identity = IdentityCore.from_dict(identity_data)
        print(f"Identity restored: {identity.get_core_hash()}")
    else:
        print("QR code expired or invalid")


def example_device_sync():
    """Device-to-device sync"""
    # Device 1: Generate QR
    identity1 = IdentityCore("device_001")
    identity1.create_surface()
    
    sync1 = DeviceSync(identity1)
    qr_image = sync1.generate_sync_qr(expiration_minutes=5)
    qr_image.save("device1_qr.png")
    
    # Device 2: Scan and sync
    identity2 = IdentityCore("device_002")
    sync2 = DeviceSync(identity2)
    
    success = sync2.sync_from_qr("device1_qr.png")
    if success:
        print("Identity synced successfully")
        # Both devices now have same core hash
        assert identity2.get_core_hash() == identity1.get_core_hash()


def example_advanced_sync():
    """Advanced sync with conflict resolution"""
    # Device 1
    identity1 = IdentityCore("device_001")
    identity1.create_surface()
    
    # Evolve identity 1
    for i in range(10):
        identity1.surface.evolve({
            "type": "pattern",
            "data": f"data_{i}"
        })
    
    sync1 = AdvancedDeviceSync(identity1, "device_001")
    qr_image = sync1.generate_sync_qr()
    qr_image.save("device1_advanced_qr.png")
    
    # Device 2: Sync with conflict resolution
    identity2 = IdentityCore("device_002")
    identity2.create_surface()
    
    # Evolve identity 2 differently
    for i in range(5):
        identity2.surface.evolve({
            "type": "pattern",
            "data": f"other_data_{i}"
        })
    
    sync2 = AdvancedDeviceSync(identity2, "device_002")
    
    # Sync (conflicts will be resolved)
    with open("device1_advanced_qr.png", "rb") as f:
        qr_bytes = f.read()
    
    success = sync2.sync_from_qr_bytes(qr_bytes)
    if success:
        print("Advanced sync completed")
        
        # Check statistics
        stats = sync2.get_sync_statistics()
        print(f"Total syncs: {stats['total_syncs']}")
        print(f"Success rate: {stats['success_rate']}%")


def example_multi_device_sync():
    """Sync between 3+ devices"""
    # Device 1
    identity1 = IdentityCore("device_001")
    identity1.create_surface()
    sync1 = AdvancedDeviceSync(identity1, "device_001")
    
    # Device 2
    identity2 = IdentityCore("device_002")
    sync2 = AdvancedDeviceSync(identity2, "device_002")
    
    # Device 3
    identity3 = IdentityCore("device_003")
    sync3 = AdvancedDeviceSync(identity3, "device_003")
    
    # Device 1 → Device 2
    qr1 = sync1.generate_sync_qr()
    qr1.save("temp_qr.png")
    sync2.sync_from_qr("temp_qr.png")
    
    # Device 2 → Device 3
    qr2 = sync2.generate_sync_qr()
    qr2.save("temp_qr.png")
    sync3.sync_from_qr("temp_qr.png")
    
    # All devices should have same core hash
    assert identity1.get_core_hash() == identity2.get_core_hash()
    assert identity2.get_core_hash() == identity3.get_core_hash()
    print("Multi-device sync successful")


def example_sync_history():
    """Track sync history"""
    identity = IdentityCore("device_001")
    sync = AdvancedDeviceSync(identity, "device_001")
    
    # Perform syncs
    # ... (sync operations)
    
    # Get statistics
    stats = sync.get_sync_statistics()
    print(f"Total syncs: {stats['total_syncs']}")
    print(f"Successful: {stats['successful_syncs']}")
    print(f"Failed: {stats['failed_syncs']}")
    print(f"Success rate: {stats['success_rate']}%")

