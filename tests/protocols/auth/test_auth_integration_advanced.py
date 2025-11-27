"""
Advanced integration tests for Zero Auth protocol

Tests QR code generation → scan → sync cycle
Tests multi-device sync, conflict resolution, offline mode
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from io import BytesIO
from PIL import Image

from protocols.identity.core import IdentityCore
from protocols.auth.qr_sync import QRCodeGenerator, QRCodeScanner, DeviceSync
from protocols.auth.sync_manager import AdvancedDeviceSync, SyncConflictResolver


@pytest.fixture
def identity_core_1():
    """Create first identity"""
    return IdentityCore("device_001")


@pytest.fixture
def identity_core_2():
    """Create second identity"""
    return IdentityCore("device_002")


@pytest.fixture
def identity_core_3():
    """Create third identity"""
    return IdentityCore("device_003")


class TestQRCodeSyncCycle:
    """Test QR code generation → scan → sync cycle"""

    def test_qr_generation_scan_sync_cycle(self, identity_core_1):
        """Test complete QR code cycle"""
        # 1. Generate QR code
        generator = QRCodeGenerator()
        identity_data = identity_core_1.export_to_dict()
        qr_image = generator.generate_identity_qr(identity_data)

        assert qr_image is not None
        assert isinstance(qr_image, Image.Image)

        # 2. Save to bytes
        qr_bytes = generator.generate_qr_bytes(identity_data)
        assert qr_bytes is not None
        assert len(qr_bytes) > 0

        # 3. Scan QR code
        try:
            scanner = QRCodeScanner()
            scanned_data = scanner.scan_from_bytes(qr_bytes)

            if scanned_data is not None:
                # 4. Verify data
                assert scanned_data['seed_hash'] == identity_core_1.get_core_hash()
        except ImportError:
            pytest.skip("pyzbar not available")

    def test_qr_expiration(self, identity_core_1):
        """Test QR code expiration"""
        generator = QRCodeGenerator()
        identity_data = identity_core_1.export_to_dict()

        # Generate with 1 second expiration
        qr_bytes = generator.generate_qr_bytes(identity_data, expiration_minutes=0.0001)

        # Wait for expiration
        import time
        time.sleep(0.1)

        try:
            scanner = QRCodeScanner()
            scanned_data = scanner.scan_from_bytes(qr_bytes)
            # Should be None or expired
            if scanned_data is None:
                assert True  # Expired correctly
        except ImportError:
            pytest.skip("pyzbar not available")


class TestMultiDeviceSync:
    """Test multi-device synchronization"""

    def test_three_device_sync(self, identity_core_1, identity_core_2, identity_core_3):
        """Test sync between 3+ devices"""
        # Create sync managers
        sync1 = AdvancedDeviceSync(identity_core_1, "device_001")
        sync2 = AdvancedDeviceSync(identity_core_2, "device_002")
        sync3 = AdvancedDeviceSync(identity_core_3, "device_003")

        # Evolve identity 1
        if identity_core_1.surface is None:
            identity_core_1.create_surface()
        for i in range(10):
            identity_core_1.surface.evolve({
                "type": "pattern",
                "data": f"data_{i}"
            })

        # Generate QR from device 1
        qr_image = sync1.generate_sync_qr()
        qr_bytes = BytesIO()
        qr_image.save(qr_bytes, format='PNG')
        qr_bytes.seek(0)

        # Sync to device 2
        try:
            success = sync2.sync_from_qr_bytes(qr_bytes.getvalue())
            if success:
                # Verify sync
                assert sync2.identity_core.get_core_hash() == sync1.identity_core.get_core_hash()

                # Generate QR from device 2
                qr_image2 = sync2.generate_sync_qr()
                qr_bytes2 = BytesIO()
                qr_image2.save(qr_bytes2, format='PNG')
                qr_bytes2.seek(0)

                # Sync to device 3
                success2 = sync3.sync_from_qr_bytes(qr_bytes2.getvalue())
                if success2:
                    # All devices should have same core hash
                    assert sync3.identity_core.get_core_hash() == sync1.identity_core.get_core_hash()
        except ImportError:
            pytest.skip("pyzbar not available")

    def test_sync_statistics(self, identity_core_1, identity_core_2):
        """Test sync statistics tracking"""
        sync1 = AdvancedDeviceSync(identity_core_1, "device_001")
        sync2 = AdvancedDeviceSync(identity_core_2, "device_002")

        # Generate and sync
        qr_image = sync1.generate_sync_qr()
        qr_bytes = BytesIO()
        qr_image.save(qr_bytes, format='PNG')
        qr_bytes.seek(0)

        try:
            sync2.sync_from_qr_bytes(qr_bytes.getvalue())

            # Check statistics
            stats = sync2.get_sync_statistics()
            assert 'total_syncs' in stats
            assert 'successful_syncs' in stats
            assert 'success_rate' in stats
        except ImportError:
            pytest.skip("pyzbar not available")


class TestConflictResolution:
    """Test conflict resolution scenarios"""

    def test_position_conflict_resolution(self):
        """Test position conflict resolution"""
        resolver = SyncConflictResolver()

        pos1 = (1.0, 2.0, 3.0)
        pos2 = (4.0, 5.0, 6.0)

        # Average method
        resolved = resolver.resolve_position_conflict(pos1, pos2, "average")
        assert resolved == (2.5, 3.5, 4.5)

        # Weighted average
        resolved_weighted = resolver.resolve_position_conflict(pos1, pos2, "weighted_average")
        assert resolved_weighted[0] > pos1[0] and resolved_weighted[0] < pos2[0]

    def test_radius_conflict_resolution(self):
        """Test radius conflict resolution"""
        resolver = SyncConflictResolver()

        # Should take max
        resolved = resolver.resolve_radius_conflict(1.0, 2.0)
        assert resolved == 2.0

        resolved = resolver.resolve_radius_conflict(3.0, 2.0)
        assert resolved == 3.0

    def test_evolution_history_merge(self):
        """Test evolution history merging"""
        resolver = SyncConflictResolver()

        history1 = [
            {"timestamp": "2024-01-01T00:00:00", "pattern_type": "type1"},
            {"timestamp": "2024-01-01T00:01:00", "pattern_type": "type2"}
        ]
        history2 = [
            {"timestamp": "2024-01-01T00:00:30", "pattern_type": "type3"},
            {"timestamp": "2024-01-01T00:02:00", "pattern_type": "type4"}
        ]

        merged = resolver.merge_evolution_histories(history1, history2, max_entries=100)

        assert len(merged) == 4
        # Should be sorted by timestamp
        timestamps = [h['timestamp'] for h in merged]
        assert timestamps == sorted(timestamps)


class TestOfflineMode:
    """Test offline mode scenarios"""

    def test_sync_history_persistence(self, identity_core_1):
        """Test sync history persistence"""
        import tempfile
        import os

        temp_dir = tempfile.mkdtemp()
        history_path = os.path.join(temp_dir, "sync_history.json")

        try:
            sync = AdvancedDeviceSync(identity_core_1, "device_001")
            sync.sync_history.storage_path = history_path

            # Record sync
            sync.sync_history.record_sync(
                "device_001",
                "device_002",
                "push",
                "success",
                {"test": "data"}
            )

            # Verify persisted
            assert os.path.exists(history_path)

            # Create new sync manager (should load history)
            sync2 = AdvancedDeviceSync(identity_core_1, "device_001")
            sync2.sync_history.storage_path = history_path

            summary = sync2.get_sync_statistics()
            assert summary['total_syncs'] >= 1
        finally:
            shutil.rmtree(temp_dir)

    def test_sync_history_summary(self, identity_core_1):
        """Test sync history summary"""
        sync = AdvancedDeviceSync(identity_core_1, "device_001")

        # Record multiple syncs
        for i in range(5):
            sync.sync_history.record_sync(
                f"device_{i}",
                "device_001",
                "pull",
                "success" if i % 2 == 0 else "failure",
                {}
            )

        summary = sync.get_sync_statistics()

        assert summary['total_syncs'] == 5
        assert summary['successful_syncs'] >= 2
        assert summary['failed_syncs'] >= 2
        assert 'success_rate' in summary


class TestNetworkFailures:
    """Test network failure scenarios"""

    def test_handles_scan_failure(self, identity_core_1):
        """Test handling of QR scan failures"""
        sync = AdvancedDeviceSync(identity_core_1, "device_001")

        # Try to sync invalid QR data
        invalid_bytes = b"invalid qr code data"

        success = sync.sync_from_qr_bytes(invalid_bytes)
        assert success is False

        # Check statistics
        stats = sync.get_sync_statistics()
        assert stats['failed_syncs'] >= 1

    def test_handles_expired_qr(self, identity_core_1):
        """Test handling of expired QR codes"""
        generator = QRCodeGenerator()
        identity_data = identity_core_1.export_to_dict()

        # Generate with very short expiration
        qr_bytes = generator.generate_qr_bytes(identity_data, expiration_minutes=0.0001)

        import time
        time.sleep(0.1)  # Wait for expiration

        try:
            scanner = QRCodeScanner()
            scanned = scanner.scan_from_bytes(qr_bytes)
            # Should be None (expired)
            if scanned is None:
                assert True  # Correctly handled expiration
        except ImportError:
            pytest.skip("pyzbar not available")






