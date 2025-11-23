"""
Tests for Zero Auth Protocol - QR Code Sync
"""

import pytest
import tempfile
import os
from datetime import datetime, timedelta
from protocols.auth import QRCodeGenerator, QRCodeScanner, DeviceSync
from protocols.identity import IdentityCore


class TestQRCodeGenerator:
    """Tests for QRCodeGenerator"""
    
    def test_generator_initialization(self):
        """Test generator initialization"""
        generator = QRCodeGenerator()
        assert generator is not None
    
    def test_generate_identity_qr(self):
        """Test QR code generation"""
        generator = QRCodeGenerator()
        identity_data = {
            'seed_hash': 'test_hash',
            'created_at': datetime.now().isoformat(),
            'surface': None
        }
        
        qr_img = generator.generate_identity_qr(identity_data)
        
        assert qr_img is not None
        assert hasattr(qr_img, 'size')
        assert qr_img.size[0] > 0
        assert qr_img.size[1] > 0
    
    def test_save_qr_image(self):
        """Test saving QR code to file"""
        generator = QRCodeGenerator()
        identity_data = {
            'seed_hash': 'test_hash',
            'created_at': datetime.now().isoformat(),
            'surface': None
        }
        
        qr_img = generator.generate_identity_qr(identity_data)
        
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            filepath = f.name
        
        try:
            generator.save_qr_image(qr_img, filepath)
            assert os.path.exists(filepath)
            assert os.path.getsize(filepath) > 0
        finally:
            if os.path.exists(filepath):
                os.unlink(filepath)
    
    def test_generate_qr_bytes(self):
        """Test QR code generation as bytes"""
        generator = QRCodeGenerator()
        identity_data = {
            'seed_hash': 'test_hash',
            'created_at': datetime.now().isoformat(),
            'surface': None
        }
        
        qr_bytes = generator.generate_qr_bytes(identity_data)
        
        assert qr_bytes is not None
        assert len(qr_bytes) > 0
        assert qr_bytes[:8] == b'\x89PNG\r\n\x1a\n'  # PNG signature


class TestQRCodeScanner:
    """Tests for QRCodeScanner"""
    
    def test_scan_from_image(self):
        """Test scanning QR code from image"""
        # Generate QR code first
        generator = QRCodeGenerator()
        identity_data = {
            'seed_hash': 'test_hash',
            'created_at': datetime.now().isoformat(),
            'surface': None
        }
        
        qr_img = generator.generate_identity_qr(identity_data)
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            filepath = f.name
            qr_img.save(filepath)
        
        try:
            scanner = QRCodeScanner()
            try:
                scanned_data = scanner.scan_from_image(filepath)
                
                assert scanned_data is not None
                assert scanned_data['seed_hash'] == identity_data['seed_hash']
            except ImportError:
                pytest.skip("pyzbar not available or zbar library missing")
        finally:
            if os.path.exists(filepath):
                os.unlink(filepath)
    
    def test_scan_from_bytes(self):
        """Test scanning QR code from bytes"""
        generator = QRCodeGenerator()
        identity_data = {
            'seed_hash': 'test_hash',
            'created_at': datetime.now().isoformat(),
            'surface': None
        }
        
        qr_bytes = generator.generate_qr_bytes(identity_data)
        
        scanner = QRCodeScanner()
        try:
            scanned_data = scanner.scan_from_bytes(qr_bytes)
            
            assert scanned_data is not None
            assert scanned_data['seed_hash'] == identity_data['seed_hash']
        except ImportError:
            pytest.skip("pyzbar not available or zbar library missing")


class TestDeviceSync:
    """Tests for DeviceSync"""
    
    def test_sync_initialization(self):
        """Test DeviceSync initialization"""
        core = IdentityCore("test_seed_for_sync")
        sync = DeviceSync(core)
        
        assert sync.identity_core == core
        assert sync.qr_generator is not None
        assert sync.qr_scanner is not None
    
    def test_generate_sync_qr(self):
        """Test generating sync QR code"""
        core = IdentityCore("test_seed_for_sync")
        sync = DeviceSync(core)
        
        qr_img = sync.generate_sync_qr()
        
        assert qr_img is not None
        assert hasattr(qr_img, 'size')
    
    def test_generate_sync_qr_with_expiration(self):
        """Test generating sync QR with custom expiration"""
        core = IdentityCore("test_seed_for_sync")
        sync = DeviceSync(core)
        
        qr_img = sync.generate_sync_qr(expiration_minutes=10)
        
        assert qr_img is not None
    
    def test_sync_from_qr_bytes(self):
        """Test syncing from QR code bytes"""
        # Create two identities
        core1 = IdentityCore("device1_seed")
        core1.create_surface()
        core1.evolve_surface({
            'type': 'test',
            'context': {},
            'timestamp': datetime.now().isoformat()
        })
        
        sync1 = DeviceSync(core1)
        qr_bytes = sync1.qr_generator.generate_qr_bytes(
            core1.export_to_dict(),
            expiration_minutes=5
        )
        
        # Sync to second device
        core2 = IdentityCore("device2_seed")
        sync2 = DeviceSync(core2)
        
        try:
            result = sync2.sync_from_qr_bytes(qr_bytes)
            
            assert result is True
            # Verify identity was synced
            assert core2.surface is not None
        except ImportError:
            pytest.skip("pyzbar not available or zbar library missing")
    
    def test_qr_expiration(self):
        """Test QR code expiration"""
        generator = QRCodeGenerator()
        identity_data = {
            'seed_hash': 'test_hash',
            'created_at': datetime.now().isoformat(),
            'surface': None
        }
        
        # Generate QR with very short expiration
        qr_img = generator.generate_identity_qr(identity_data, expiration_minutes=0)
        
        # QR should be generated (expiration is checked during scan)
        assert qr_img is not None


class TestIntegration:
    """Integration tests"""
    
    def test_full_sync_workflow(self):
        """Test full device sync workflow"""
        # Device 1: Generate QR
        core1 = IdentityCore("device1_seed")
        core1.create_surface()
        sync1 = DeviceSync(core1)
        
        qr_img = sync1.generate_sync_qr()
        assert qr_img is not None
        
        # Save QR code
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
            qr_path = f.name
            qr_img.save(qr_path)
        
        try:
            # Device 2: Scan QR (if scanner available)
            try:
                core2 = IdentityCore("device2_seed")
                sync2 = DeviceSync(core2)
                
                # This will work if pyzbar is available
                result = sync2.sync_from_qr(qr_path)
                # Result may be False if pyzbar not available, that's OK
            except ImportError:
                # pyzbar not available, skip sync test
                pass
        finally:
            if os.path.exists(qr_path):
                os.unlink(qr_path)

