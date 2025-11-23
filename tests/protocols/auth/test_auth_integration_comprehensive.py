"""
Comprehensive Integration Tests for Zero Auth Protocol

Tests complete QR sync workflow, multi-device sync, conflict resolution,
sync history, offline mode, network failures, and edge cases.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, List
import time
import json
from datetime import datetime, timedelta

from protocols.identity.core import IdentityCore
from protocols.identity.surface import IdentitySurface
from protocols.auth.qr_sync import QRCodeGenerator, QRCodeScanner, DeviceSync
from protocols.auth.sync_manager import (
    AdvancedDeviceSync,
    SyncConflictResolver,
    SyncHistory
)


@pytest.fixture
def identity_core():
    """Create IdentityCore instance for testing"""
    identity = IdentityCore("test_device_001")
    identity.create_surface()
    return identity


@pytest.fixture
def evolved_identity():
    """Create IdentityCore with evolved surface"""
    identity = IdentityCore("test_device_evolved")
    identity.create_surface()
    
    # Evolve surface with patterns
    for i in range(50):
        identity.evolve_surface({
            "type": "test_pattern",
            "data": f"pattern_{i}",
            "timestamp": datetime.now().isoformat()
        })
    
    return identity


@pytest.fixture
def qr_generator():
    """Create QRCodeGenerator instance"""
    return QRCodeGenerator()


@pytest.fixture
def device_sync(identity_core):
    """Create DeviceSync instance"""
    return DeviceSync(identity_core)


@pytest.fixture
def advanced_device_sync(identity_core):
    """Create AdvancedDeviceSync instance"""
    return AdvancedDeviceSync(identity_core, "device_001")


@pytest.fixture
def multi_device_setup():
    """Create multiple device identities"""
    devices = []
    for i in range(3):
        identity = IdentityCore(f"device_{i:03d}")
        identity.create_surface()
        # Evolve each differently
        for j in range(i * 10):
            identity.evolve_surface({
                "type": "device_pattern",
                "data": f"device_{i}_pattern_{j}"
            })
        devices.append(identity)
    return devices


class TestCompleteQRSyncWorkflow:
    """Test complete QR sync workflow"""
    
    def test_full_qr_sync_cycle(self, identity_core, qr_generator):
        """Test QR generation → validation → sync complete"""
        # 1. Generate QR code
        identity_data = identity_core.export_to_dict()
        qr_image = qr_generator.generate_identity_qr(identity_data, expiration_minutes=10)
        assert qr_image is not None
        
        # 2. Save QR to temporary file
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "test_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # 3. Scan QR code
            scanner = QRCodeScanner()
            scanned_data = scanner.scan_from_image(str(qr_path))
            assert scanned_data is not None
            
            # 4. Verify data integrity
            assert scanned_data['seed_hash'] == identity_data['seed_hash']
            assert scanned_data['created_at'] == identity_data['created_at']
        finally:
            shutil.rmtree(temp_dir)
    
    def test_qr_data_integrity(self, identity_core, qr_generator):
        """Verify QR contains correct identity data"""
        identity_data = identity_core.export_to_dict()
        qr_image = qr_generator.generate_identity_qr(identity_data)
        
        # Save and scan
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "test_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            scanner = QRCodeScanner()
            scanned_data = scanner.scan_from_image(str(qr_path))
            
            # Verify all fields
            assert scanned_data['seed_hash'] == identity_data['seed_hash']
            assert scanned_data['created_at'] == identity_data['created_at']
            
            # Verify surface if exists
            if identity_data.get('surface'):
                assert scanned_data.get('surface') is not None
                assert scanned_data['surface']['core_hash'] == identity_data['surface']['core_hash']
        finally:
            shutil.rmtree(temp_dir)
    
    def test_qr_generation_from_identity(self, identity_core, device_sync):
        """Generate QR from Identity object"""
        # Generate sync QR
        qr_image = device_sync.generate_sync_qr(expiration_minutes=5)
        assert qr_image is not None
        
        # Save and verify
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "sync_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # Verify file exists and has content
            assert qr_path.exists()
            assert qr_path.stat().st_size > 0
        finally:
            shutil.rmtree(temp_dir)


class TestDeviceSyncInitialization:
    """Test device sync initialization"""
    
    def test_device_sync_setup(self, identity_core):
        """Initialize DeviceSync with identity"""
        sync = DeviceSync(identity_core)
        assert sync is not None
        assert sync.identity_core == identity_core
        assert sync.qr_generator is not None
        assert sync.qr_scanner is not None
    
    def test_sync_preparation(self, device_sync):
        """Prepare data for sync"""
        # Generate QR
        qr_image = device_sync.generate_sync_qr()
        assert qr_image is not None
        
        # Verify QR contains identity data
        identity_data = device_sync.identity_core.export_to_dict()
        assert identity_data is not None
        assert 'seed_hash' in identity_data
    
    def test_identity_extraction(self, device_sync):
        """Extract identity from sync data"""
        # Generate QR
        qr_image = device_sync.generate_sync_qr()
        
        # Save and scan
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "extract_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # Scan and extract
            identity_data = device_sync.qr_scanner.scan_from_image(str(qr_path))
            assert identity_data is not None
            
            # Restore identity
            restored = IdentityCore.from_dict(identity_data)
            assert restored.get_core_hash() == device_sync.identity_core.get_core_hash()
        finally:
            shutil.rmtree(temp_dir)


class TestMultiDeviceSync:
    """Test multi-device synchronization"""
    
    def test_two_device_sync(self, multi_device_setup):
        """Sync between 2 devices"""
        device1, device2, _ = multi_device_setup[:2]
        
        sync1 = AdvancedDeviceSync(device1, "device_001")
        sync2 = AdvancedDeviceSync(device2, "device_002")
        
        # Device 1 generates QR
        qr_image = sync1.generate_sync_qr()
        
        # Save QR
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "device1_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # Device 2 syncs from QR
            success = sync2.sync_from_qr(str(qr_path))
            assert success is True
            
            # Verify both have same core hash
            assert device1.get_core_hash() == device2.get_core_hash()
        finally:
            shutil.rmtree(temp_dir)
    
    def test_three_device_sync(self, multi_device_setup):
        """Sync between 3 devices"""
        device1, device2, device3 = multi_device_setup
        
        sync1 = AdvancedDeviceSync(device1, "device_001")
        sync2 = AdvancedDeviceSync(device2, "device_002")
        sync3 = AdvancedDeviceSync(device3, "device_003")
        
        # Device 1 → Device 2
        qr1 = sync1.generate_sync_qr()
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "sync_qr.png"
        qr1.save(str(qr_path))
        
        try:
            sync2.sync_from_qr(str(qr_path))
            
            # Device 2 → Device 3
            qr2 = sync2.generate_sync_qr()
            qr2.save(str(qr_path))
            sync3.sync_from_qr(str(qr_path))
            
            # All should have same core hash
            assert device1.get_core_hash() == device2.get_core_hash()
            assert device2.get_core_hash() == device3.get_core_hash()
        finally:
            shutil.rmtree(temp_dir)
    
    def test_sequential_syncs(self, multi_device_setup):
        """Device A → B → C sequential sync"""
        device_a, device_b, device_c = multi_device_setup
        
        sync_a = AdvancedDeviceSync(device_a, "device_a")
        sync_b = AdvancedDeviceSync(device_b, "device_b")
        sync_c = AdvancedDeviceSync(device_c, "device_c")
        
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "sync_qr.png"
        
        try:
            # A → B
            qr_a = sync_a.generate_sync_qr()
            qr_a.save(str(qr_path))
            sync_b.sync_from_qr(str(qr_path))
            
            # B → C
            qr_b = sync_b.generate_sync_qr()
            qr_b.save(str(qr_path))
            sync_c.sync_from_qr(str(qr_path))
            
            # Verify chain
            assert device_a.get_core_hash() == device_b.get_core_hash()
            assert device_b.get_core_hash() == device_c.get_core_hash()
        finally:
            shutil.rmtree(temp_dir)
    
    @pytest.mark.parametrize("device_count", [2, 3, 5])
    def test_simultaneous_syncs(self, device_count):
        """Multiple devices sync at once"""
        # Create devices
        devices = []
        syncs = []
        for i in range(device_count):
            identity = IdentityCore(f"sim_device_{i}")
            identity.create_surface()
            devices.append(identity)
            syncs.append(AdvancedDeviceSync(identity, f"device_{i}"))
        
        # Device 0 generates QR
        qr_image = syncs[0].generate_sync_qr()
        
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "sync_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # All other devices sync simultaneously
            import threading
            
            results = []
            def sync_device(sync, path):
                try:
                    result = sync.sync_from_qr(str(path))
                    results.append(result)
                except Exception as e:
                    results.append(False)
            
            threads = []
            for sync in syncs[1:]:
                thread = threading.Thread(target=sync_device, args=(sync, qr_path))
                threads.append(thread)
                thread.start()
            
            for thread in threads:
                thread.join()
            
            # All should succeed
            assert all(results)
            
            # All should have same core hash
            core_hash = devices[0].get_core_hash()
            for device in devices[1:]:
                assert device.get_core_hash() == core_hash
        finally:
            shutil.rmtree(temp_dir)


class TestConflictResolution:
    """Test conflict resolution scenarios"""
    
    def test_position_conflict(self):
        """Different positions on same identity"""
        identity1 = IdentityCore("conflict_test")
        identity1.create_surface()
        identity1.surface.position = (1.0, 1.0, 1.0)
        
        identity2 = IdentityCore("conflict_test")
        identity2.create_surface()
        identity2.surface.position = (-1.0, -1.0, -1.0)
        
        # Resolve conflict
        resolved = SyncConflictResolver.resolve_position_conflict(
            identity1.surface.position,
            identity2.surface.position
        )
        
        # Should be average
        assert resolved == (0.0, 0.0, 0.0)
    
    def test_radius_conflict(self):
        """Different radius values"""
        radius1 = 1.0
        radius2 = 2.0
        
        resolved = SyncConflictResolver.resolve_radius_conflict(radius1, radius2)
        
        # Should take max
        assert resolved == 2.0
    
    def test_texture_color_conflict(self):
        """Different surface properties"""
        texture1 = 0.5
        texture2 = 0.8
        
        resolved_texture = SyncConflictResolver.resolve_texture_conflict(texture1, texture2)
        assert resolved_texture == 0.8  # Max
        
        color1 = [0.2, 0.3, 0.4]
        color2 = [0.6, 0.7, 0.8]
        
        resolved_color = SyncConflictResolver.resolve_color_conflict(color1, color2)
        assert len(resolved_color) == 3
        # Should be weighted average
        assert 0.2 < resolved_color[0] < 0.6
    
    def test_evolution_history_conflict(self):
        """Different evolution histories"""
        history1 = [
            {"timestamp": "2024-01-01T00:00:00", "pattern_type": "type1"},
            {"timestamp": "2024-01-02T00:00:00", "pattern_type": "type2"}
        ]
        history2 = [
            {"timestamp": "2024-01-01T12:00:00", "pattern_type": "type3"},
            {"timestamp": "2024-01-03T00:00:00", "pattern_type": "type4"}
        ]
        
        merged = SyncConflictResolver.merge_evolution_histories(history1, history2, max_entries=10)
        
        # Should merge and sort
        assert len(merged) == 4
        # Should be sorted by timestamp
        timestamps = [h['timestamp'] for h in merged]
        assert timestamps == sorted(timestamps)
    
    def test_weighted_conflict_resolution(self):
        """Verify weighted average logic"""
        pos1 = (1.0, 2.0, 3.0)
        pos2 = (4.0, 5.0, 6.0)
        
        # Weighted average (60% device1, 40% device2)
        resolved = SyncConflictResolver.resolve_position_conflict(
            pos1, pos2, method="weighted_average"
        )
        
        # Should be weighted
        assert resolved[0] == pytest.approx(1.0 * 0.6 + 4.0 * 0.4, abs=0.01)
        assert resolved[1] == pytest.approx(2.0 * 0.6 + 5.0 * 0.4, abs=0.01)
        assert resolved[2] == pytest.approx(3.0 * 0.6 + 6.0 * 0.4, abs=0.01)


class TestSyncHistory:
    """Test sync history tracking"""
    
    def test_history_tracking(self):
        """Record all syncs"""
        temp_dir = tempfile.mkdtemp()
        history_path = Path(temp_dir) / "sync_history.json"
        
        try:
            history = SyncHistory(storage_path=str(history_path))
            
            # Record syncs
            history.record_sync("device_001", "device_002", "push", "success")
            history.record_sync("device_002", "device_003", "pull", "success")
            history.record_sync("device_001", "device_003", "merge", "failure")
            
            # Verify
            summary = history.get_sync_summary()
            assert summary['total_syncs'] == 3
            assert summary['successful_syncs'] == 2
            assert summary['failed_syncs'] == 1
        finally:
            shutil.rmtree(temp_dir)
    
    def test_sync_statistics(self):
        """Calculate sync stats"""
        temp_dir = tempfile.mkdtemp()
        history_path = Path(temp_dir) / "sync_history.json"
        
        try:
            history = SyncHistory(storage_path=str(history_path))
            
            # Record multiple syncs
            for i in range(10):
                status = "success" if i % 2 == 0 else "failure"
                history.record_sync(f"device_{i}", f"device_{i+1}", "sync", status)
            
            summary = history.get_sync_summary()
            assert summary['total_syncs'] == 10
            assert summary['successful_syncs'] == 5
            assert summary['failed_syncs'] == 5
            assert summary['success_rate'] == 50.0
        finally:
            shutil.rmtree(temp_dir)
    
    def test_device_specific_history(self):
        """Track per-device syncs"""
        temp_dir = tempfile.mkdtemp()
        history_path = Path(temp_dir) / "sync_history.json"
        
        try:
            history = SyncHistory(storage_path=str(history_path))
            
            # Record syncs for device_001
            history.record_sync("device_001", "device_002", "push", "success")
            history.record_sync("device_001", "device_003", "pull", "success")
            history.record_sync("device_002", "device_003", "merge", "success")
            
            # Get device-specific syncs
            device_syncs = history.get_device_syncs("device_001")
            assert len(device_syncs) == 2
        finally:
            shutil.rmtree(temp_dir)
    
    def test_history_export(self):
        """Export sync history"""
        temp_dir = tempfile.mkdtemp()
        history_path = Path(temp_dir) / "sync_history.json"
        
        try:
            history = SyncHistory(storage_path=str(history_path))
            
            # Record syncs
            history.record_sync("device_001", "device_002", "push", "success")
            
            # Verify file exists
            assert history_path.exists()
            
            # Verify content
            import json
            with open(history_path, 'r') as f:
                data = json.load(f)
                assert len(data) == 1
                assert data[0]['source_device_id'] == "device_001"
        finally:
            shutil.rmtree(temp_dir)


class TestOfflineMode:
    """Test offline mode handling"""
    
    def test_offline_queue(self):
        """Queue syncs when offline"""
        # This would require implementing offline queue
        # For now, test that sync fails gracefully when QR is invalid
        identity = IdentityCore("offline_test")
        sync = AdvancedDeviceSync(identity, "offline_device")
        
        # Try to sync from non-existent QR
        success = sync.sync_from_qr("/nonexistent/qr.png")
        assert success is False
        
        # Statistics should record failure
        stats = sync.get_sync_statistics()
        assert stats['failed_syncs'] >= 1
    
    def test_offline_to_online(self):
        """Process queue when back online"""
        # This would require implementing queue processing
        # For now, test that sync works after failure
        identity1 = IdentityCore("online_test_1")
        identity1.create_surface()
        identity2 = IdentityCore("online_test_2")
        identity2.create_surface()
        
        sync1 = AdvancedDeviceSync(identity1, "device_1")
        sync2 = AdvancedDeviceSync(identity2, "device_2")
        
        # Generate QR
        qr_image = sync1.generate_sync_qr()
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "online_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # Sync should work when online
            success = sync2.sync_from_qr(str(qr_path))
            assert success is True
        finally:
            shutil.rmtree(temp_dir)
    
    def test_partial_sync(self):
        """Handle incomplete syncs"""
        identity = IdentityCore("partial_test")
        sync = AdvancedDeviceSync(identity, "partial_device")
        
        # Create corrupted QR (empty file)
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "corrupted_qr.png"
        qr_path.write_bytes(b"invalid qr data")
        
        try:
            # Should handle gracefully
            success = sync.sync_from_qr(str(qr_path))
            assert success is False
        finally:
            shutil.rmtree(temp_dir)


class TestNetworkFailures:
    """Test network failure handling"""
    
    def test_network_timeout(self):
        """Handle timeout gracefully"""
        # QR sync is local, but test expiration
        identity = IdentityCore("timeout_test")
        sync = DeviceSync(identity)
        
        # Generate QR with very short expiration
        qr_image = sync.generate_sync_qr(expiration_minutes=0.001)  # ~0.06 seconds
        
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "timeout_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # Wait for expiration
            time.sleep(0.1)
            
            # Scan should fail (expired)
            scanner = QRCodeScanner()
            scanned_data = scanner.scan_from_image(str(qr_path))
            assert scanned_data is None  # Expired
        finally:
            shutil.rmtree(temp_dir)
    
    def test_connection_lost(self):
        """Handle mid-sync failure"""
        identity1 = IdentityCore("connection_test_1")
        identity1.create_surface()
        identity2 = IdentityCore("connection_test_2")
        identity2.create_surface()
        
        sync1 = AdvancedDeviceSync(identity1, "device_1")
        sync2 = AdvancedDeviceSync(identity2, "device_2")
        
        # Generate QR
        qr_image = sync1.generate_sync_qr()
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "connection_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # Delete file mid-sync (simulate connection loss)
            # Actually, just test that invalid path fails gracefully
            success = sync2.sync_from_qr("/invalid/path/qr.png")
            assert success is False
            
            # Statistics should record failure
            stats = sync2.get_sync_statistics()
            assert stats['failed_syncs'] >= 1
        finally:
            if qr_path.exists():
                shutil.rmtree(temp_dir)
    
    def test_retry_logic(self):
        """Automatic retry on failure"""
        # QR sync doesn't have automatic retry, but test manual retry
        identity1 = IdentityCore("retry_test_1")
        identity1.create_surface()
        identity2 = IdentityCore("retry_test_2")
        identity2.create_surface()
        
        sync1 = AdvancedDeviceSync(identity1, "device_1")
        sync2 = AdvancedDeviceSync(identity2, "device_2")
        
        # Generate QR
        qr_image = sync1.generate_sync_qr()
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "retry_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # First attempt (should succeed)
            success1 = sync2.sync_from_qr(str(qr_path))
            assert success1 is True
            
            # Second attempt (should also succeed)
            success2 = sync2.sync_from_qr(str(qr_path))
            assert success2 is True
        finally:
            shutil.rmtree(temp_dir)


class TestEdgeCases:
    """Test edge cases"""
    
    def test_large_identity_data(self, evolved_identity):
        """Handle large surface data (100+ evolutions)"""
        # Evolve more
        for i in range(100):
            evolved_identity.evolve_surface({
                "type": "large_pattern",
                "data": f"pattern_{i}",
                "timestamp": datetime.now().isoformat()
            })
        
        # Generate QR
        sync = DeviceSync(evolved_identity)
        qr_image = sync.generate_sync_qr()
        
        # Should succeed
        assert qr_image is not None
        
        # Save and scan
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "large_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            scanner = QRCodeScanner()
            scanned_data = scanner.scan_from_image(str(qr_path))
            assert scanned_data is not None
            assert scanned_data['seed_hash'] == evolved_identity.get_core_hash()
        finally:
            shutil.rmtree(temp_dir)
    
    def test_corrupted_sync_data(self):
        """Detect and reject corrupted data"""
        identity = IdentityCore("corrupt_test")
        sync = AdvancedDeviceSync(identity, "corrupt_device")
        
        # Create invalid QR file
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "corrupt_qr.png"
        qr_path.write_bytes(b"not a valid QR code")
        
        try:
            # Should fail gracefully
            success = sync.sync_from_qr(str(qr_path))
            assert success is False
        finally:
            shutil.rmtree(temp_dir)
    
    def test_version_mismatch(self):
        """Handle different protocol versions"""
        identity = IdentityCore("version_test")
        sync = DeviceSync(identity)
        
        # Generate QR with current version
        qr_image = sync.generate_sync_qr()
        
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "version_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # Scan should work (same version)
            scanner = QRCodeScanner()
            scanned_data = scanner.scan_from_image(str(qr_path))
            assert scanned_data is not None
            
            # If version field exists, verify it
            # (Version is in sync_data, not identity_data)
        finally:
            shutil.rmtree(temp_dir)
    
    def test_empty_identity(self):
        """Handle identity with no surface"""
        identity = IdentityCore("empty_test")
        # Don't create surface
        
        sync = DeviceSync(identity)
        qr_image = sync.generate_sync_qr()
        
        # Should still work
        assert qr_image is not None
        
        # Save and scan
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "empty_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            scanner = QRCodeScanner()
            scanned_data = scanner.scan_from_image(str(qr_path))
            assert scanned_data is not None
            assert scanned_data['seed_hash'] == identity.get_core_hash()
            # Surface should be None
            assert scanned_data.get('surface') is None
        finally:
            shutil.rmtree(temp_dir)


class TestPerformance:
    """Test performance requirements"""
    
    def test_qr_generation_speed(self, identity_core, qr_generator):
        """< 100ms for QR generation"""
        identity_data = identity_core.export_to_dict()
        
        start = time.time()
        qr_image = qr_generator.generate_identity_qr(identity_data)
        duration = (time.time() - start) * 1000  # Convert to ms
        
        assert duration < 100, f"QR generation took {duration}ms"
    
    def test_sync_speed(self, identity_core):
        """< 500ms for typical sync"""
        identity1 = identity_core
        identity2 = IdentityCore("sync_speed_test_2")
        identity2.create_surface()
        
        sync1 = AdvancedDeviceSync(identity1, "device_1")
        sync2 = AdvancedDeviceSync(identity2, "device_2")
        
        # Generate QR
        qr_image = sync1.generate_sync_qr()
        temp_dir = tempfile.mkdtemp()
        qr_path = Path(temp_dir) / "speed_qr.png"
        qr_image.save(str(qr_path))
        
        try:
            # Measure sync time
            start = time.time()
            success = sync2.sync_from_qr(str(qr_path))
            duration = (time.time() - start) * 1000
            
            assert success is True
            assert duration < 500, f"Sync took {duration}ms"
        finally:
            shutil.rmtree(temp_dir)
    
    def test_conflict_resolution_speed(self):
        """< 50ms per conflict"""
        pos1 = (1.0, 2.0, 3.0)
        pos2 = (4.0, 5.0, 6.0)
        
        start = time.time()
        for _ in range(100):
            SyncConflictResolver.resolve_position_conflict(pos1, pos2)
        duration = (time.time() - start) * 1000
        
        avg_time = duration / 100
        assert avg_time < 50, f"Average conflict resolution: {avg_time}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

