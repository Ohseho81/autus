"""
Realtime API Routes
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
import asyncio
import json

router = APIRouter()

# SSE endpoint
@router.get("/stream")
async def stream_status():
    """Server-Sent Events 스트림"""
    async def generate():
        from main import state  # Import state engine
        while True:
            try:
                status = state.get_status()
                # TwinState 변환
                sig = status.get("signals", {})
                twin = {
                    "t": status.get("tick", 0),
                    "e": round(sig.get("entropy", 0), 4),
                    "p": round(sig.get("pressure", 0), 4),
                    "r": round(sig.get("release", 0), 4),
                    "g": round(sig.get("gravity", 0.5), 4),
                    "s": status.get("output", {}).get("status", "GREEN")
                }
                yield f"data: {json.dumps(twin)}\n\n"
            except Exception as ex:
                yield f"data: {json.dumps({'error': str(ex)})}\n\n"
            await asyncio.sleep(0.3)
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*"
        }
    )

# Batch status (성능 최적화)
@router.get("/status/batch")
async def batch_status():
    """여러 데이터를 한 번에 반환 (HTTP 요청 수 감소)"""
    from main import state, audit_log
    
    status = state.get_status()
    sig = status.get("signals", {})
    out = status.get("output", {})
    
    # TwinState
    twin = {
        "timeSec": status.get("tick", 0),
        "energy": sig.get("gravity", 0.5),
        "flow": sig.get("release", 0),
        "risk": min(1, sig.get("entropy", 0) * 1.5 + sig.get("pressure", 0) * 0.5),
        "entropy": sig.get("entropy", 0),
        "pressure": sig.get("pressure", 0)
    }
    
    # Uniforms
    uniforms = {
        "u_time": twin["timeSec"] % 1000,
        "u_energy": twin["energy"],
        "u_flow": twin["flow"],
        "u_risk": twin["risk"],
        "u_entropy": twin["entropy"],
        "u_pressure": twin["pressure"]
    }
    
    # Motion params
    motion = {
        "spin": {"omega": 0.3 + twin["energy"] * 0.1},
        "sweep": {"omega": 1.0 + twin["risk"] * 1.5},
        "pulse": {"amp": 0.1 + twin["energy"] * 0.15, "freq": 0.8},
        "flicker": {"sigma": 0.02 + twin["entropy"] * 0.08}
    }
    
    return {
        "status": status,
        "twin": twin,
        "uniforms": uniforms,
        "motion": motion,
        "beacon": {
            "state": out.get("status", "GREEN"),
            "icon": "●" if out.get("status") == "GREEN" else "▲" if out.get("status") == "YELLOW" else "■"
        }
    }
