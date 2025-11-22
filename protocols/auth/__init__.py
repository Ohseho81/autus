"""AUTUS Auth Protocol - Full Version"""
import secrets
import hashlib
import json
import base64
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

class ZeroAuthProtocol:
    """Zero Identity Auth"""
    
    SEED_SIZE = 32
    
    def __init__(self, seed: Optional[bytes] = None):
        if seed is None:
            self.seed = secrets.token_bytes(self.SEED_SIZE)
        else:
            self.seed = seed
        self.device_id = self._generate_device_id()
    
    def _generate_device_id(self) -> str:
        return hashlib.sha256(self.seed).hexdigest()[:16]
    
    def save_to_local(self, storage_path: Optional[Path] = None):
        if storage_path is None:
            storage_path = Path.home() / ".autus" / "auth.seed"
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        
        # 기존 파일이 있으면 권한 변경
        if storage_path.exists():
            storage_path.chmod(0o600)
        
        storage_path.write_bytes(self.seed)
        storage_path.chmod(0o400)
        return storage_path
    
    @classmethod
    def load_from_local(cls, storage_path: Optional[Path] = None):
        if storage_path is None:
            storage_path = Path.home() / ".autus" / "auth.seed"
        if not storage_path.exists():
            raise FileNotFoundError(f"No seed found: {storage_path}")
        seed = storage_path.read_bytes()
        return cls(seed=seed)
    
    def generate_qr_data(self) -> Dict[str, Any]:
        return {
            "protocol": "autus_zero_auth",
            "version": "1.0.0",
            "seed": base64.b64encode(self.seed).decode(),
            "device_id": self.device_id,
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    # 새 디바이스 생성
    auth = ZeroAuthProtocol()
    path = auth.save_to_local()
    print(f"✅ Device ID: {auth.device_id}")
    print(f"✅ Seed saved: {path}")
    
    # 로드 테스트
    loaded = ZeroAuthProtocol.load_from_local()
    print(f"✅ Loaded ID: {loaded.device_id}")
    print(f"✅ Match: {auth.device_id == loaded.device_id}")
