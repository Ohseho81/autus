import pytest
from protocols.memory.local_memory import LocalMemory
from protocols.auth.zero_auth import ZeroAuth

class TestMemoryProtocol:
    def test_memory_creation(self, tmp_path):
        memory = LocalMemory(str(tmp_path / "test.yaml"))
        summary = memory.get_summary()
        assert summary["version"] == "1.0.0"
        assert summary["preferences_count"] == 0
    
    def test_set_preference(self, tmp_path):
        memory = LocalMemory(str(tmp_path / "test.yaml"))
        memory.set_preference("language", "ko")
        assert memory.get_preference("language") == "ko"
    
    def test_set_pattern(self, tmp_path):
        memory = LocalMemory(str(tmp_path / "test.yaml"))
        memory.set_pattern("work", {"start": "09:00"})
        pattern = memory.get_pattern("work")
        assert pattern["start"] == "09:00"
    
    def test_sovereign_status(self, tmp_path):
        memory = LocalMemory(str(tmp_path / "test.yaml"))
        status = memory.get_sovereign_status()
        assert status["data_policy"] == "local_only"

class TestZeroAuth:
    def test_zero_id_generation(self):
        auth = ZeroAuth()
        assert auth.zero_id.startswith("Z")
        assert len(auth.zero_id) > 10
    
    def test_consistent_id(self):
        seed = b"test_seed_32_bytes_exactly_here!"
        auth1 = ZeroAuth(seed=seed)
        auth2 = ZeroAuth(seed=seed)
        assert auth1.zero_id == auth2.zero_id
    
    def test_3d_coordinates(self):
        auth = ZeroAuth()
        coords = auth.get_3d_coordinates()
        assert "x" in coords
        assert "y" in coords
        assert "z" in coords
        assert -1 <= coords["x"] <= 1
        assert -1 <= coords["y"] <= 1
        assert -1 <= coords["z"] <= 1
    
    def test_qr_sync(self):
        auth = ZeroAuth()
        qr_data = auth.generate_qr_data(expires_minutes=5)
        restored = ZeroAuth.from_qr_data(qr_data)
        assert restored is not None
        assert auth.zero_id == restored.zero_id
    
    def test_identity_info(self):
        auth = ZeroAuth()
        info = auth.get_identity_info()
        assert info["requires_login"] == False
        assert info["requires_email"] == False
        assert info["auth_type"] == "zero_auth"
