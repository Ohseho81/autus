import pytest
from protocols.memory.local_memory import LocalMemory
from protocols.auth.zero_auth import ZeroAuth

class TestMemoryProtocol:
    def test_memory_creation(self, tmp_path):
        memory = LocalMemory(str(tmp_path / "test.yaml"))
        summary = memory.get_summary()
        assert summary["version"] == "1.0.0"
    
    def test_set_preference(self, tmp_path):
        memory = LocalMemory(str(tmp_path / "test.yaml"))
        memory.set_preference("language", "ko")
        assert memory.get_preference("language") == "ko"

class TestZeroAuth:
    def test_zero_id_generation(self):
        auth = ZeroAuth()
        assert auth.zero_id.startswith("Z")
    
    def test_consistent_id(self):
        seed = b"test_seed_32_bytes_exactly_here!"
        auth1 = ZeroAuth(seed=seed)
        auth2 = ZeroAuth(seed=seed)
        assert auth1.zero_id == auth2.zero_id
    
    def test_3d_coordinates(self):
        auth = ZeroAuth()
        coords = auth.get_3d_coordinates()
        assert -1 <= coords["x"] <= 1
    
    def test_qr_sync(self):
        auth = ZeroAuth()
        qr_data = auth.generate_qr_data(expires_minutes=5)
        restored = ZeroAuth.from_qr_data(qr_data)
        assert auth.zero_id == restored.zero_id
