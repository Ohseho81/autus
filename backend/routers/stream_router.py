"""
═══════════════════════════════════════════════════════════════════════════════
                    AUTUS Real-time Streaming Router
                    
    실시간 로그 및 사고 과정 스트리밍
    
    Features:
    - SSE (Server-Sent Events) 스트리밍
    - 실시간 로그 전송
    - AI 사고 과정 (Chain of Thought) 스트리밍
═══════════════════════════════════════════════════════════════════════════════
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import AsyncGenerator, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import deque

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

logger = logging.getLogger("autus.stream")

router = APIRouter(prefix="/stream", tags=["Streaming"])


class LogLevel(Enum):
    """로그 레벨"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"
    THINKING = "thinking"  # AI 사고 과정


@dataclass
class StreamEvent:
    """스트림 이벤트"""
    id: str
    type: str  # log, thinking, progress, result
    level: str
    message: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    data: Dict[str, Any] = field(default_factory=dict)


class StreamManager:
    """실시간 스트림 관리자"""
    
    def __init__(self, max_history: int = 100):
        self.subscribers: List[asyncio.Queue] = []
        self.history: deque = deque(maxlen=max_history)
        self.event_counter = 0
        
    async def subscribe(self) -> asyncio.Queue:
        """새 구독자 등록"""
        queue = asyncio.Queue()
        self.subscribers.append(queue)
        
        # 최근 이력 전송
        for event in self.history:
            await queue.put(event)
            
        return queue
    
    def unsubscribe(self, queue: asyncio.Queue):
        """구독 해제"""
        if queue in self.subscribers:
            self.subscribers.remove(queue)
    
    async def broadcast(self, event: StreamEvent):
        """모든 구독자에게 이벤트 전송"""
        self.history.append(event)
        
        for queue in self.subscribers:
            try:
                await queue.put(event)
            except Exception as e:
                logger.warning(f"Failed to send to subscriber: {e}")
    
    async def emit_log(
        self, 
        level: LogLevel, 
        message: str, 
        data: Dict[str, Any] = None
    ):
        """로그 이벤트 발생"""
        self.event_counter += 1
        event = StreamEvent(
            id=f"log_{self.event_counter}",
            type="log",
            level=level.value,
            message=message,
            data=data or {}
        )
        await self.broadcast(event)
        
    async def emit_thinking(self, step: str, details: str = None):
        """AI 사고 과정 이벤트"""
        self.event_counter += 1
        event = StreamEvent(
            id=f"think_{self.event_counter}",
            type="thinking",
            level="thinking",
            message=step,
            data={"details": details} if details else {}
        )
        await self.broadcast(event)
        
    async def emit_progress(self, task: str, progress: int, total: int = 100):
        """진행 상황 이벤트"""
        self.event_counter += 1
        event = StreamEvent(
            id=f"prog_{self.event_counter}",
            type="progress",
            level="info",
            message=task,
            data={"progress": progress, "total": total, "percent": round(progress / total * 100)}
        )
        await self.broadcast(event)
        
    async def emit_result(self, success: bool, message: str, data: Dict[str, Any] = None):
        """결과 이벤트"""
        self.event_counter += 1
        event = StreamEvent(
            id=f"result_{self.event_counter}",
            type="result",
            level="success" if success else "error",
            message=message,
            data=data or {}
        )
        await self.broadcast(event)


# 글로벌 스트림 매니저
stream_manager = StreamManager()


async def event_generator(request: Request) -> AsyncGenerator[str, None]:
    """SSE 이벤트 제너레이터"""
    queue = await stream_manager.subscribe()
    
    try:
        while True:
            # 클라이언트 연결 확인
            if await request.is_disconnected():
                break
                
            try:
                # 5초 타임아웃으로 이벤트 대기
                event = await asyncio.wait_for(queue.get(), timeout=5.0)
                
                # SSE 형식으로 전송
                data = json.dumps(asdict(event), ensure_ascii=False)
                yield f"event: {event.type}\ndata: {data}\n\n"
                
            except asyncio.TimeoutError:
                # 연결 유지를 위한 ping
                yield f"event: ping\ndata: {json.dumps({'timestamp': datetime.now().isoformat()})}\n\n"
                
    finally:
        stream_manager.unsubscribe(queue)


@router.get("/events")
async def stream_events(request: Request):
    """
    실시간 이벤트 스트리밍 (SSE)
    
    이벤트 타입:
    - log: 일반 로그
    - thinking: AI 사고 과정
    - progress: 진행 상황
    - result: 작업 결과
    - ping: 연결 유지
    """
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/emit")
async def emit_event(
    type: str = "log",
    level: str = "info",
    message: str = "Test message",
    data: Dict[str, Any] = None
):
    """
    이벤트 발생 (테스트/디버그용)
    """
    if type == "thinking":
        await stream_manager.emit_thinking(message, data.get("details") if data else None)
    elif type == "progress":
        await stream_manager.emit_progress(
            message, 
            data.get("progress", 50) if data else 50,
            data.get("total", 100) if data else 100
        )
    elif type == "result":
        await stream_manager.emit_result(
            data.get("success", True) if data else True,
            message,
            data
        )
    else:
        await stream_manager.emit_log(LogLevel(level), message, data)
    
    return {"status": "emitted", "type": type, "message": message}


@router.get("/history")
async def get_history(limit: int = 50):
    """
    최근 이벤트 이력 조회
    """
    history = list(stream_manager.history)[-limit:]
    return {
        "count": len(history),
        "events": [asdict(e) for e in history]
    }


# ═══════════════════════════════════════════════════════════════════════════════
# AI Chain of Thought 헬퍼 함수
# ═══════════════════════════════════════════════════════════════════════════════

async def think(step: str, details: str = None):
    """AI 사고 과정 기록"""
    await stream_manager.emit_thinking(step, details)
    logger.info(f"🧠 {step}")


async def log_info(message: str, data: Dict = None):
    """정보 로그"""
    await stream_manager.emit_log(LogLevel.INFO, message, data)


async def log_success(message: str, data: Dict = None):
    """성공 로그"""
    await stream_manager.emit_log(LogLevel.SUCCESS, message, data)


async def log_error(message: str, data: Dict = None):
    """에러 로그"""
    await stream_manager.emit_log(LogLevel.ERROR, message, data)


async def report_progress(task: str, progress: int, total: int = 100):
    """진행 상황 보고"""
    await stream_manager.emit_progress(task, progress, total)


async def report_result(success: bool, message: str, data: Dict = None):
    """결과 보고"""
    await stream_manager.emit_result(success, message, data)


# 사용 예시
"""
from routers.stream_router import think, log_info, report_progress, report_result

async def process_task():
    await think("이메일을 분석 중입니다...")
    await think("중요도를 판단했습니다", "발신자: CEO, 키워드: 긴급")
    
    await log_info("작업 시작")
    await report_progress("이메일 처리", 30)
    await report_progress("이메일 처리", 60)
    await report_progress("이메일 처리", 100)
    
    await report_result(True, "3개의 이메일이 처리되었습니다")
"""
