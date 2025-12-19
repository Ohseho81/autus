"""
AUTUS Sync Protocol - Local Network Sync
제2법칙: 소유 - 로컬 네트워크 내 P2P 동기화

같은 네트워크 내 디바이스 간 동기화
"""
import json
import hashlib
import secrets
import socket
from typing import Dict, Any, Optional, List
from datetime import datetime


class LocalSync:
    """
    로컬 네트워크 동기화
    
    필연적 성공:
    - 같은 네트워크 → 발견
    - 발견 → 연결
    - 연결 → 동기화
    
    서버 없음, 인터넷 없이도 작동
    """
    
    DISCOVERY_PORT = 51820
    SYNC_PORT = 51821
    MAGIC = b"AUTUS_SYNC_V1"
    
    def __init__(self, device_id: str = None):
        self.device_id = device_id or hashlib.sha256(
            secrets.token_bytes(32)
        ).hexdigest()[:16]
        self.discovered_devices: Dict[str, Dict] = {}
    
    def get_local_ip(self) -> str:
        """로컬 IP 주소 가져오기"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"
    
    def create_discovery_message(self) -> bytes:
        """디스커버리 메시지 생성"""
        message = {
            "magic": self.MAGIC.decode(),
            "device_id": self.device_id,
            "ip": self.get_local_ip(),
            "port": self.SYNC_PORT,
            "timestamp": datetime.utcnow().isoformat(),
            "capabilities": ["sync", "pack", "memory"]
        }
        return json.dumps(message).encode()
    
    def parse_discovery_message(self, data: bytes) -> Optional[Dict]:
        """디스커버리 메시지 파싱"""
        try:
            message = json.loads(data.decode())
            if message.get("magic") != self.MAGIC.decode():
                return None
            return message
        except:
            return None
    
    def register_device(self, device_info: Dict) -> bool:
        """디바이스 등록"""
        device_id = device_info.get("device_id")
        if not device_id or device_id == self.device_id:
            return False
        
        self.discovered_devices[device_id] = {
            **device_info,
            "discovered_at": datetime.utcnow().isoformat(),
            "status": "available"
        }
        return True
    
    def get_discovered_devices(self) -> List[Dict]:
        """발견된 디바이스 목록"""
        return list(self.discovered_devices.values())
    
    def create_sync_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """동기화 요청 생성"""
        return {
            "type": "sync_request",
            "device_id": self.device_id,
            "timestamp": datetime.utcnow().isoformat(),
            "checksum": self._checksum(data),
            "items_count": len(data)
        }
    
    def create_sync_response(
        self,
        request: Dict,
        my_data: Dict[str, Any],
        accept: bool = True
    ) -> Dict[str, Any]:
        """동기화 응답 생성"""
        return {
            "type": "sync_response",
            "device_id": self.device_id,
            "request_device": request.get("device_id"),
            "accepted": accept,
            "timestamp": datetime.utcnow().isoformat(),
            "my_checksum": self._checksum(my_data) if accept else None,
            "my_items_count": len(my_data) if accept else 0
        }
    
    def create_sync_data_packet(
        self,
        data: Dict[str, Any],
        chunk_index: int = 0,
        total_chunks: int = 1
    ) -> Dict[str, Any]:
        """동기화 데이터 패킷 생성"""
        return {
            "type": "sync_data",
            "device_id": self.device_id,
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
            "data": self._safe_data(data),
            "checksum": self._checksum(data)
        }
    
    def merge_sync_data(
        self,
        local: Dict[str, Any],
        remote: Dict[str, Any]
    ) -> Dict[str, Any]:
        """동기화 데이터 병합"""
        merged = {**local}
        
        for key, value in remote.items():
            if key not in merged:
                merged[key] = value
            elif isinstance(value, dict) and isinstance(merged.get(key), dict):
                merged[key] = self.merge_sync_data(merged[key], value)
            elif isinstance(value, list) and isinstance(merged.get(key), list):
                # 리스트는 합집합
                merged[key] = list(set(merged[key] + value))
        
        return merged
    
    def _checksum(self, data: Dict) -> str:
        """체크섬"""
        return hashlib.sha256(
            json.dumps(data, sort_keys=True).encode()
        ).hexdigest()[:16]
    
    def _safe_data(self, data: Dict) -> Dict:
        """금지 필드 제거"""
        forbidden = ["seed", "api_key", "password", "token", "secret"]
        safe = {}
        for k, v in data.items():
            if not any(f in k.lower() for f in forbidden):
                if isinstance(v, dict):
                    safe[k] = self._safe_data(v)
                else:
                    safe[k] = v
        return safe


# 싱글톤
_local_sync = None

def get_local_sync() -> LocalSync:
    global _local_sync
    if _local_sync is None:
        _local_sync = LocalSync()
    return _local_sync
