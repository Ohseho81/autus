"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS BPMN WebSocket Server
실시간 BPMN 오버레이 데이터 스트리밍
═══════════════════════════════════════════════════════════════════════════════

기능:
- 실시간 메트릭 업데이트 push
- 삭제 이벤트 브로드캐스트
- 학습 루프 진척도
- 시스템 통계
"""

import asyncio
import json
import logging
import random
from typing import Dict, List, Set, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# Data Models
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class RealtimeMetric:
    """실시간 메트릭"""
    elementId: str
    automationLevel: float
    kValue: float
    iValue: float = 0.0
    avgDuration: int = 0
    successRate: float = 1.0
    status: str = "active"
    timestamp: int = field(default_factory=lambda: int(datetime.now().timestamp() * 1000))


@dataclass
class LoopProgress:
    """학습 루프 진척도"""
    loopId: str
    loopName: str
    progress: float
    currentStep: str
    estimatedCompletion: Optional[int] = None


@dataclass
class SystemStats:
    """시스템 통계"""
    totalTasks: int = 570
    activeTasks: int = 485
    deletionCandidates: int = 12
    highRiskTasks: int = 8
    avgAutomation: float = 0.67
    avgKValue: float = 0.95
    requestsPerMinute: int = 1234
    successRate: float = 0.999
    errorRate: float = 0.001


# ═══════════════════════════════════════════════════════════════════════════════
# Connection Manager
# ═══════════════════════════════════════════════════════════════════════════════

class BPMNConnectionManager:
    """BPMN WebSocket 연결 관리자"""
    
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._metrics: Dict[str, RealtimeMetric] = {}
        self._loop_progress: Dict[str, LoopProgress] = {}
        self._system_stats = SystemStats()
        self._running = False
    
    async def connect(self, websocket: WebSocket):
        """클라이언트 연결"""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"BPMN WebSocket connected. Total: {len(self.active_connections)}")
        
        # 초기 데이터 전송
        await self._send_initial_data(websocket)
    
    def disconnect(self, websocket: WebSocket):
        """클라이언트 연결 해제"""
        self.active_connections.discard(websocket)
        logger.info(f"BPMN WebSocket disconnected. Total: {len(self.active_connections)}")
    
    async def _send_initial_data(self, websocket: WebSocket):
        """초기 데이터 전송"""
        # 시스템 통계
        await self._send_to_client(websocket, {
            "type": "system_stats",
            "payload": asdict(self._system_stats),
            "timestamp": int(datetime.now().timestamp() * 1000),
        })
        
        # 학습 루프 진척도
        for loop in self._loop_progress.values():
            await self._send_to_client(websocket, {
                "type": "loop_progress",
                "payload": asdict(loop),
                "timestamp": int(datetime.now().timestamp() * 1000),
            })
    
    async def broadcast(self, message: dict):
        """모든 클라이언트에게 브로드캐스트"""
        disconnected = set()
        
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        
        for conn in disconnected:
            self.active_connections.discard(conn)
    
    async def _send_to_client(self, websocket: WebSocket, message: dict):
        """특정 클라이언트에게 전송"""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send to client: {e}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 데이터 업데이트
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def update_metric(self, metric: RealtimeMetric):
        """메트릭 업데이트 및 브로드캐스트"""
        self._metrics[metric.elementId] = metric
        
        await self.broadcast({
            "type": "metric_update",
            "payload": asdict(metric),
            "timestamp": int(datetime.now().timestamp() * 1000),
        })
    
    async def update_loop_progress(self, progress: LoopProgress):
        """학습 루프 진척도 업데이트"""
        self._loop_progress[progress.loopId] = progress
        
        await self.broadcast({
            "type": "loop_progress",
            "payload": asdict(progress),
            "timestamp": int(datetime.now().timestamp() * 1000),
        })
    
    async def update_system_stats(self, stats: SystemStats):
        """시스템 통계 업데이트"""
        self._system_stats = stats
        
        await self.broadcast({
            "type": "system_stats",
            "payload": asdict(stats),
            "timestamp": int(datetime.now().timestamp() * 1000),
        })
    
    async def trigger_delete(self, element_ids: List[str]):
        """삭제 이벤트 트리거"""
        await self.broadcast({
            "type": "delete_triggered",
            "payload": element_ids,
            "timestamp": int(datetime.now().timestamp() * 1000),
        })
        
        # 삭제 후 통계 업데이트
        self._system_stats.deletionCandidates -= len(element_ids)
        await self.update_system_stats(self._system_stats)
    
    async def send_alert(self, message: str):
        """알림 브로드캐스트"""
        await self.broadcast({
            "type": "alert",
            "payload": message,
            "timestamp": int(datetime.now().timestamp() * 1000),
        })
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 시뮬레이션 (개발용)
    # ═══════════════════════════════════════════════════════════════════════════
    
    async def start_simulation(self):
        """실시간 데이터 시뮬레이션 시작"""
        if self._running:
            return
        
        self._running = True
        
        # 초기 학습 루프 설정
        self._loop_progress = {
            "learning": LoopProgress("learning", "Learning Loop", 65, "AI Feedback Analysis"),
            "evolution": LoopProgress("evolution", "Evolution Loop", 42, "K/I Optimization"),
            "deletion": LoopProgress("deletion", "Deletion Loop", 88, "Validation"),
        }
        
        # 초기 메트릭 설정
        element_ids = ["task-fin", "task-hr", "task-sales", "task-ar", "task-ap", "task-manual"]
        for eid in element_ids:
            self._metrics[eid] = RealtimeMetric(
                elementId=eid,
                automationLevel=random.uniform(0.3, 0.99),
                kValue=random.uniform(0.7, 1.2),
                avgDuration=int(random.uniform(5000, 60000)),
            )
        
        asyncio.create_task(self._simulation_loop())
    
    async def _simulation_loop(self):
        """시뮬레이션 루프"""
        while self._running and self.active_connections:
            try:
                # 랜덤 메트릭 업데이트
                element_ids = list(self._metrics.keys())
                if element_ids:
                    eid = random.choice(element_ids)
                    metric = self._metrics[eid]
                    metric.automationLevel = min(1.0, metric.automationLevel + random.uniform(-0.02, 0.05))
                    metric.kValue = max(0.5, min(1.5, metric.kValue + random.uniform(-0.05, 0.05)))
                    metric.timestamp = int(datetime.now().timestamp() * 1000)
                    await self.update_metric(metric)
                
                # 루프 진척도 업데이트
                for loop in self._loop_progress.values():
                    loop.progress = min(100, loop.progress + random.uniform(0, 1))
                    await self.update_loop_progress(loop)
                
                # 시스템 통계 업데이트
                self._system_stats.requestsPerMinute += int(random.uniform(-50, 100))
                self._system_stats.avgAutomation = min(1.0, self._system_stats.avgAutomation + random.uniform(-0.005, 0.01))
                await self.update_system_stats(self._system_stats)
                
                await asyncio.sleep(2)
            except Exception as e:
                logger.error(f"Simulation error: {e}")
                await asyncio.sleep(5)
    
    def stop_simulation(self):
        """시뮬레이션 중지"""
        self._running = False


# ═══════════════════════════════════════════════════════════════════════════════
# Global Instance
# ═══════════════════════════════════════════════════════════════════════════════

bpmn_manager = BPMNConnectionManager()


# ═══════════════════════════════════════════════════════════════════════════════
# WebSocket Handler
# ═══════════════════════════════════════════════════════════════════════════════

async def bpmn_websocket_handler(websocket: WebSocket):
    """BPMN WebSocket 핸들러"""
    await bpmn_manager.connect(websocket)
    
    # 시뮬레이션 시작
    await bpmn_manager.start_simulation()
    
    try:
        while True:
            data = await websocket.receive_json()
            
            msg_type = data.get("type")
            
            if msg_type == "request_metrics":
                element_ids = data.get("elementIds", [])
                for eid in element_ids:
                    if eid in bpmn_manager._metrics:
                        await bpmn_manager.update_metric(bpmn_manager._metrics[eid])
            
            elif msg_type == "trigger_delete":
                element_ids = data.get("elementIds", [])
                await bpmn_manager.trigger_delete(element_ids)
            
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "timestamp": int(datetime.now().timestamp() * 1000)})
    
    except WebSocketDisconnect:
        bpmn_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"BPMN WebSocket error: {e}")
        bpmn_manager.disconnect(websocket)
