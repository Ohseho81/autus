"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS WebSocket Router
실시간 통신 엔드포인트
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from .gravity_ws import gravity_manager, get_gravity_state
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/gravity")
async def gravity_websocket(websocket: WebSocket):
    """
    Gravity 실시간 WebSocket
    
    연결 후 자동으로:
    1. 현재 상태 수신
    2. 이벤트 발생 시 실시간 알림
    3. 5초마다 상태 갱신
    """
    await gravity_manager.connect(websocket)
    
    try:
        while True:
            # 클라이언트로부터 메시지 대기 (keep-alive)
            data = await websocket.receive_json()
            
            # 클라이언트 요청 처리
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            
            elif data.get("type") == "get_state":
                await gravity_manager.send_state(websocket)
            
            elif data.get("type") == "subscribe":
                # 특정 결정 구독 (향후 확장)
                decision_id = data.get("decision_id")
                logger.info(f"[WS] Subscribed to: {decision_id}")
            
    except WebSocketDisconnect:
        gravity_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"[WS] Error: {e}")
        gravity_manager.disconnect(websocket)


@router.get("/ws/gravity/state")
async def get_current_gravity_state():
    """REST fallback: 현재 Gravity 상태 조회"""
    return {
        "success": True,
        "data": get_gravity_state(),
    }


@router.on_event("startup")
async def startup_gravity_ws():
    """서버 시작 시 주기적 브로드캐스트 시작"""
    await gravity_manager.start_periodic_broadcast(interval=5.0)


@router.on_event("shutdown")
async def shutdown_gravity_ws():
    """서버 종료 시 브로드캐스트 중지"""
    gravity_manager.stop_periodic_broadcast()
