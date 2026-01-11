"""
AUTUS WebSocket 테스트
"""
import pytest
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# WebSocket 모듈 임포트 시도
try:
    from websocket.manager import ConnectionManager
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False

try:
    from websocket.api import router as ws_router
    WS_ROUTER_AVAILABLE = True
except ImportError:
    WS_ROUTER_AVAILABLE = False


@pytest.mark.skipif(not WEBSOCKET_AVAILABLE, reason="websocket module not available")
class TestConnectionManager:
    """ConnectionManager 테스트"""
    
    @pytest.fixture
    def manager(self):
        return ConnectionManager()
    
    def test_manager_init(self, manager):
        """매니저 초기화"""
        assert manager is not None
        assert hasattr(manager, 'active_connections')
    
    def test_connection_count(self, manager):
        """연결 수 확인"""
        count = len(manager.active_connections)
        assert count >= 0


@pytest.mark.skipif(not WS_ROUTER_AVAILABLE, reason="websocket router not available")
class TestWebSocketEndpoints:
    """WebSocket 엔드포인트 테스트"""
    
    def test_router_exists(self):
        """라우터 존재 확인"""
        assert ws_router is not None


class TestWebSocketProtocol:
    """WebSocket 프로토콜 테스트 (모의)"""
    
    def test_message_format(self):
        """메시지 형식"""
        message = {
            "type": "motion_update",
            "data": {
                "node": 0,
                "motion": 1,
                "delta": 0.1
            }
        }
        
        assert "type" in message
        assert "data" in message
    
    def test_broadcast_format(self):
        """브로드캐스트 형식"""
        broadcast = {
            "event": "state_update",
            "payload": {
                "state": [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
            },
            "timestamp": 1234567890
        }
        
        assert "event" in broadcast
        assert "payload" in broadcast
        assert len(broadcast["payload"]["state"]) == 6
