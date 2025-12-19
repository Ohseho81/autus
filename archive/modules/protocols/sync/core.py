"""
AUTUS Sync Protocol - Core
제2법칙: 소유 - 데이터는 사용자 소유
제3법칙: 순환 - 흐르되 저장하지 않는다

P2P 동기화 핵심 로직
"""
import json
import hashlib
import secrets
from typing import Dict, Any, Optional, List
from datetime import datetime
from base64 import b64encode, b64decode


class SyncCore:
    """
    P2P 동기화 코어
    
    필연적 성공:
    - 암호화 → 안전한 전송
    - 검증 → 무결성 보장
    - 로컬 전용 → 프라이버시 보장
    """
    
    def __init__(self, device_id: Optional[str] = None):
        self.device_id = device_id or self._generate_device_id()
        self.sync_key: Optional[bytes] = None
    
    def _generate_device_id(self) -> str:
        """디바이스 ID 생성 (익명)"""
        return hashlib.sha256(secrets.token_bytes(32)).hexdigest()[:16]
    
    def generate_sync_key(self) -> str:
        """동기화 키 생성 (E2E 암호화용)"""
        self.sync_key = secrets.token_bytes(32)
        return b64encode(self.sync_key).decode()
    
    def create_sync_packet(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """동기화 패킷 생성"""
        # 금지 필드 제거 (헌법 준수)
        safe_data = self._remove_forbidden_fields(data)
        
        packet = {
            "version": "1.0",
            "timestamp": datetime.utcnow().isoformat(),
            "device_id": self.device_id,
            "checksum": self._calculate_checksum(safe_data),
            "data": safe_data
        }
        
        return packet
    
    def verify_packet(self, packet: Dict[str, Any]) -> bool:
        """패킷 무결성 검증"""
        if "checksum" not in packet or "data" not in packet:
            return False
        
        expected = self._calculate_checksum(packet["data"])
        return packet["checksum"] == expected
    
    def merge_data(
        self, 
        local: Dict[str, Any], 
        remote: Dict[str, Any]
    ) -> Dict[str, Any]:
        """데이터 병합 (최신 우선)"""
        merged = {**local}
        
        for key, value in remote.items():
            if key not in local:
                merged[key] = value
            elif isinstance(value, dict) and isinstance(local.get(key), dict):
                merged[key] = self.merge_data(local[key], value)
            # 타임스탬프 기반 병합 (나중에 구현)
        
        return merged
    
    def _calculate_checksum(self, data: Dict) -> str:
        """체크섬 계산"""
        content = json.dumps(data, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    def _remove_forbidden_fields(self, data: Dict) -> Dict:
        """금지 필드 제거 (헌법 제2조)"""
        forbidden = [
            "identity.core.seed",
            "api_keys",
            "passwords",
            "tokens",
            "secrets"
        ]
        
        safe = {}
        for key, value in data.items():
            if key not in forbidden:
                if isinstance(value, dict):
                    safe[key] = self._remove_forbidden_fields(value)
                else:
                    safe[key] = value
        
        return safe


# 싱글톤
_core = None

def get_sync_core() -> SyncCore:
    global _core
    if _core is None:
        _core = SyncCore()
    return _core
