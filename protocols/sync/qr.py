"""
AUTUS Sync Protocol - QR Sync
제2법칙: 소유 - 서버 없이 기기 간 동기화

QR 코드 기반 P2P 동기화
"""
import json
import hashlib
import secrets
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from base64 import b64encode, b64decode


class QRSync:
    """
    QR 코드 동기화
    
    필연적 성공:
    - QR 생성 → 스캔 → 연결
    - 서버 없음 → 프라이버시 보장
    - 시간 제한 → 보안 보장
    """
    
    def __init__(self, device_id: str = None):
        self.device_id = device_id or hashlib.sha256(
            secrets.token_bytes(32)
        ).hexdigest()[:16]
        self.pending_syncs: Dict[str, Dict] = {}
    
    def generate_qr_payload(
        self,
        data: Dict[str, Any],
        expires_in: int = 300  # 5분
    ) -> Dict[str, Any]:
        """QR 페이로드 생성"""
        sync_id = secrets.token_hex(8)
        secret = secrets.token_bytes(16)
        
        payload = {
            "autus": "sync",
            "version": "1.0",
            "sync_id": sync_id,
            "device": self.device_id,
            "secret": b64encode(secret).decode(),
            "expires": (
                datetime.utcnow() + timedelta(seconds=expires_in)
            ).isoformat(),
            "checksum": self._checksum(data)
        }
        
        # 대기 등록
        self.pending_syncs[sync_id] = {
            "data": data,
            "secret": secret,
            "expires": payload["expires"],
            "status": "pending"
        }
        
        return payload
    
    def generate_qr_string(self, data: Dict[str, Any]) -> str:
        """QR 문자열 생성 (스캔용)"""
        payload = self.generate_qr_payload(data)
        return f"autus://sync?p={b64encode(json.dumps(payload).encode()).decode()}"
    
    def parse_qr_string(self, qr_string: str) -> Optional[Dict[str, Any]]:
        """QR 문자열 파싱"""
        try:
            if not qr_string.startswith("autus://sync?p="):
                return None
            
            encoded = qr_string.replace("autus://sync?p=", "")
            payload = json.loads(b64decode(encoded))
            
            # 만료 확인
            expires = datetime.fromisoformat(payload["expires"])
            if datetime.utcnow() > expires:
                return {"error": "expired", "message": "QR code expired"}
            
            return payload
            
        except Exception as e:
            return {"error": "invalid", "message": str(e)}
    
    def accept_sync(
        self,
        payload: Dict[str, Any],
        my_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """동기화 수락 (스캔 측)"""
        return {
            "status": "accepted",
            "sync_id": payload.get("sync_id"),
            "from_device": self.device_id,
            "to_device": payload.get("device"),
            "my_checksum": self._checksum(my_data),
            "their_checksum": payload.get("checksum")
        }
    
    def complete_sync(
        self,
        sync_id: str,
        remote_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """동기화 완료"""
        if sync_id not in self.pending_syncs:
            return {"error": "not_found", "message": "Sync not found"}
        
        pending = self.pending_syncs[sync_id]
        
        # 만료 확인
        expires = datetime.fromisoformat(pending["expires"])
        if datetime.utcnow() > expires:
            del self.pending_syncs[sync_id]
            return {"error": "expired", "message": "Sync expired"}
        
        # 병합
        local_data = pending["data"]
        merged = self._merge(local_data, remote_data)
        
        # 완료
        pending["status"] = "completed"
        del self.pending_syncs[sync_id]
        
        return {
            "status": "completed",
            "sync_id": sync_id,
            "merged": merged,
            "local_items": len(local_data),
            "remote_items": len(remote_data),
            "merged_items": len(merged)
        }
    
    def get_pending_syncs(self) -> List[Dict]:
        """대기 중인 동기화 목록"""
        return [
            {"sync_id": k, "status": v["status"], "expires": v["expires"]}
            for k, v in self.pending_syncs.items()
        ]
    
    def _checksum(self, data: Dict) -> str:
        """체크섬"""
        return hashlib.sha256(
            json.dumps(data, sort_keys=True).encode()
        ).hexdigest()[:16]
    
    def _merge(self, local: Dict, remote: Dict) -> Dict:
        """데이터 병합"""
        merged = {**local}
        for k, v in remote.items():
            if k not in merged:
                merged[k] = v
        return merged


# 타입 힌트용
from typing import List

# 싱글톤
_qr_sync = None

def get_qr_sync() -> QRSync:
    global _qr_sync
    if _qr_sync is None:
        _qr_sync = QRSync()
    return _qr_sync
