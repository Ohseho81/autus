"""
Zero Auth Protocol - API Routes
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import json

router = APIRouter(prefix="/api/auth", tags=["Zero Auth"])

_pairing_sessions: Dict[str, Any] = {}
_sync_requests: Dict[str, List[Dict]] = {}


class CreateSessionRequest(BaseModel):
    expiry_minutes: int = Field(default=5, ge=1, le=30)
    device_name: Optional[str] = None


class CreateSessionResponse(BaseModel):
    session_id: str
    qr_payload: dict
    expires_at: str
    status: str = "pending"


class CompletePairingRequest(BaseModel):
    session_id: str
    public_key: str
    device_info: Optional[dict] = None


class CompletePairingResponse(BaseModel):
    session_id: str
    response_public_key: str
    status: str
    paired_at: str


class SyncDataRequest(BaseModel):
    session_id: str
    encrypted_data: str
    sync_type: str = Field(default="full", pattern="^(full|partial|delta)$")


class SyncDataResponse(BaseModel):
    session_id: str
    received: bool
    timestamp: str
    sync_id: str


class SessionStatusResponse(BaseModel):
    session_id: str
    status: str
    is_paired: bool
    is_expired: bool
    created_at: str
    expires_at: str


@router.post("/session", response_model=CreateSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_pairing_session(request: CreateSessionRequest):
    try:
        from protocols.auth.crypto import PairingSession
        session = PairingSession(expiry_minutes=request.expiry_minutes)
        qr_payload = session.generate_pairing_payload()
        _pairing_sessions[session.session_id] = {
            'session': session,
            'device_name': request.device_name,
            'created_at': datetime.utcnow().isoformat()
        }
        return CreateSessionResponse(
            session_id=session.session_id,
            qr_payload=qr_payload,
            expires_at=session.expires_at.isoformat(),
            status="pending"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.post("/pair", response_model=CompletePairingResponse)
async def complete_pairing(request: CompletePairingRequest):
    try:
        from protocols.auth.crypto import PairingSession
        if request.session_id in _pairing_sessions:
            session_data = _pairing_sessions[request.session_id]
            session = session_data['session']
            if session.is_expired:
                raise HTTPException(status_code=410, detail="Session expired")
            session.complete_pairing(request.public_key)
            return CompletePairingResponse(
                session_id=request.session_id,
                response_public_key=session.crypto.public_key_b64,
                status="paired",
                paired_at=datetime.utcnow().isoformat()
            )
        else:
            session = PairingSession(session_id=request.session_id)
            session.complete_pairing(request.public_key)
            _pairing_sessions[request.session_id] = {
                'session': session,
                'device_info': request.device_info,
                'created_at': datetime.utcnow().isoformat()
            }
            return CompletePairingResponse(
                session_id=request.session_id,
                response_public_key=session.crypto.public_key_b64,
                status="paired",
                paired_at=datetime.utcnow().isoformat()
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Pairing failed: {str(e)}")


@router.get("/session/{session_id}", response_model=SessionStatusResponse)
async def get_session_status(session_id: str):
    if session_id not in _pairing_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session_data = _pairing_sessions[session_id]
    session = session_data['session']
    return SessionStatusResponse(
        session_id=session_id,
        status="paired" if session.is_paired else ("expired" if session.is_expired else "pending"),
        is_paired=session.is_paired,
        is_expired=session.is_expired,
        created_at=session.created_at.isoformat(),
        expires_at=session.expires_at.isoformat()
    )


@router.delete("/session/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str):
    if session_id in _pairing_sessions:
        del _pairing_sessions[session_id]
    if session_id in _sync_requests:
        del _sync_requests[session_id]


@router.post("/sync", response_model=SyncDataResponse)
async def sync_data(request: SyncDataRequest):
    if request.session_id not in _pairing_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session_data = _pairing_sessions[request.session_id]
    session = session_data['session']
    if not session.is_paired:
        raise HTTPException(status_code=400, detail="Session not paired")
    import secrets
    sync_id = secrets.token_urlsafe(8)
    timestamp = datetime.utcnow().isoformat()
    if request.session_id not in _sync_requests:
        _sync_requests[request.session_id] = []
    _sync_requests[request.session_id].append({
        'sync_id': sync_id,
        'encrypted_data': request.encrypted_data,
        'sync_type': request.sync_type,
        'timestamp': timestamp
    })
    _sync_requests[request.session_id] = _sync_requests[request.session_id][-10:]
    return SyncDataResponse(session_id=request.session_id, received=True, timestamp=timestamp, sync_id=sync_id)


@router.get("/sync/{session_id}")
async def get_sync_data(session_id: str, since: Optional[str] = None):
    if session_id not in _pairing_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    sync_data = _sync_requests.get(session_id, [])
    if since:
        try:
            since_dt = datetime.fromisoformat(since)
            sync_data = [s for s in sync_data if datetime.fromisoformat(s['timestamp']) > since_dt]
        except ValueError:
            pass
    return {'session_id': session_id, 'sync_count': len(sync_data), 'sync_data': sync_data}


@router.get("/sessions")
async def list_sessions(include_expired: bool = False):
    sessions = []
    for session_id, session_data in _pairing_sessions.items():
        session = session_data['session']
        if include_expired or not session.is_expired:
            sessions.append({
                'session_id': session_id,
                'status': "paired" if session.is_paired else ("expired" if session.is_expired else "pending"),
                'is_paired': session.is_paired,
                'is_expired': session.is_expired,
                'device_name': session_data.get('device_name'),
                'created_at': session_data['created_at']
            })
    return {'total': len(sessions), 'sessions': sessions}


@router.post("/cleanup")
async def cleanup_expired_sessions():
    expired = []
    for session_id, session_data in list(_pairing_sessions.items()):
        if session_data['session'].is_expired:
            expired.append(session_id)
            del _pairing_sessions[session_id]
            if session_id in _sync_requests:
                del _sync_requests[session_id]
    return {'removed': len(expired), 'session_ids': expired}


@router.get("/qr/{session_id}")
async def get_session_qr(session_id: str, format: str = "json"):
    if session_id not in _pairing_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    session_data = _pairing_sessions[session_id]
    session = session_data['session']
    if session.is_expired:
        raise HTTPException(status_code=410, detail="Session expired")
    qr_payload = session.generate_pairing_payload()
    if format == "json":
        return qr_payload
    elif format == "image":
        try:
            import qrcode
            from io import BytesIO
            from fastapi.responses import StreamingResponse
            qr = qrcode.QRCode(version=1, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
            qr.add_data(json.dumps(qr_payload))
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buf = BytesIO()
            img.save(buf, format='PNG')
            buf.seek(0)
            return StreamingResponse(buf, media_type="image/png")
        except ImportError:
            raise HTTPException(status_code=501, detail="QR image requires 'qrcode' package")
    else:
        raise HTTPException(status_code=400, detail="Invalid format")


@router.get("/health")
async def auth_health():
    return {
        'status': 'healthy',
        'protocol': 'autus-zero-auth',
        'version': '1.0',
        'active_sessions': len([s for s in _pairing_sessions.values() if not s['session'].is_expired]),
        'features': ['qr_pairing', 'e2e_encryption', 'x25519_key_exchange', 'aes256_gcm']
    }
