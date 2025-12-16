"""
AUTUS Sync API
제2법칙: 소유 - P2P 동기화 API

QR 동기화, 로컬 네트워크 동기화
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
from pydantic import BaseModel
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from protocols.sync.core import get_sync_core
from protocols.sync.qr import get_qr_sync
from protocols.sync.local import get_local_sync

router = APIRouter(prefix="/sync", tags=["Sync"])

_core = get_sync_core()
_qr = get_qr_sync()
_local = get_local_sync()


# ============ Models ============

class SyncDataRequest(BaseModel):
    data: Dict[str, Any]

class QRParseRequest(BaseModel):
    qr_string: str

class AcceptSyncRequest(BaseModel):
    payload: Dict[str, Any]
    my_data: Dict[str, Any]

class CompleteSyncRequest(BaseModel):
    sync_id: str
    remote_data: Dict[str, Any]


# ============ Core Sync ============

@router.get("/status")
async def sync_status():
    """동기화 상태"""
    return {
        "device_id": _core.device_id,
        "local_ip": _local.get_local_ip(),
        "pending_syncs": len(_qr.pending_syncs),
        "discovered_devices": len(_local.discovered_devices)
    }

@router.post("/packet/create")
async def create_sync_packet(request: SyncDataRequest):
    """동기화 패킷 생성"""
    packet = _core.create_sync_packet(request.data)
    return {"success": True, "packet": packet}

@router.post("/packet/verify")
async def verify_sync_packet(packet: Dict[str, Any]):
    """동기화 패킷 검증"""
    valid = _core.verify_packet(packet)
    return {"valid": valid}


# ============ QR Sync ============

@router.post("/qr/generate")
async def generate_qr(request: SyncDataRequest):
    """QR 코드 페이로드 생성"""
    qr_string = _qr.generate_qr_string(request.data)
    payload = _qr.generate_qr_payload(request.data)
    return {
        "qr_string": qr_string,
        "payload": payload,
        "expires_in": 300
    }

@router.post("/qr/parse")
async def parse_qr(request: QRParseRequest):
    """QR 코드 파싱"""
    result = _qr.parse_qr_string(request.qr_string)
    if result and "error" in result:
        raise HTTPException(status_code=400, detail=result["message"])
    return {"success": True, "payload": result}

@router.post("/qr/accept")
async def accept_qr_sync(request: AcceptSyncRequest):
    """QR 동기화 수락"""
    result = _qr.accept_sync(request.payload, request.my_data)
    return result

@router.post("/qr/complete")
async def complete_qr_sync(request: CompleteSyncRequest):
    """QR 동기화 완료"""
    result = _qr.complete_sync(request.sync_id, request.remote_data)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@router.get("/qr/pending")
async def get_pending_syncs():
    """대기 중인 동기화"""
    return {"pending": _qr.get_pending_syncs()}


# ============ Local Network Sync ============

@router.get("/local/discover")
async def discover_devices():
    """로컬 디바이스 발견"""
    return {
        "my_device": _local.device_id,
        "my_ip": _local.get_local_ip(),
        "discovered": _local.get_discovered_devices()
    }

@router.post("/local/register")
async def register_device(device_info: Dict[str, Any]):
    """디바이스 등록"""
    success = _local.register_device(device_info)
    return {"success": success}

@router.post("/local/request")
async def create_sync_request(request: SyncDataRequest):
    """동기화 요청 생성"""
    sync_request = _local.create_sync_request(request.data)
    return sync_request

@router.post("/local/merge")
async def merge_data(local: Dict[str, Any], remote: Dict[str, Any]):
    """데이터 병합"""
    merged = _local.merge_sync_data(local, remote)
    return {
        "merged": merged,
        "local_count": len(local),
        "remote_count": len(remote),
        "merged_count": len(merged)
    }
