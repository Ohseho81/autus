"""
AUTUS Socket.io 실시간 진행 보고
================================

업데이트 진행 상황 실시간 브로드캐스트

이벤트:
- update:start: 업데이트 시작
- update:progress: 진행률 업데이트
- update:stage: 단계 변경
- update:complete: 완료
- update:error: 에러 발생
- update:escalation: Human Escalation 필요

사용법:
```python
from backend.langgraph import RealtimeProgressReporter

reporter = RealtimeProgressReporter()
reporter.start()

# 진행 보고
reporter.report_progress(50, "Checker 실행 중...")

# 완료
reporter.complete(success=True)
```
"""

import json
import logging
import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Optional
from enum import Enum

logger = logging.getLogger(__name__)


class UpdateStage(Enum):
    """업데이트 단계"""
    INITIALIZING = "initializing"
    ANALYZING = "analyzing"
    CHECKING = "checking"
    UPDATING = "updating"
    TESTING = "testing"
    COMPLETING = "completing"
    FAILED = "failed"
    ESCALATED = "escalated"


@dataclass
class ProgressEvent:
    """진행 이벤트"""
    stage: UpdateStage
    progress: int  # 0-100
    message: str
    details: dict = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        return {
            "stage": self.stage.value,
            "progress": self.progress,
            "message": self.message,
            "details": self.details,
            "timestamp": self.timestamp.isoformat(),
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


class RealtimeProgressReporter:
    """실시간 진행 보고자"""
    
    def __init__(self, socketio=None, namespace: str = "/autus"):
        """
        Args:
            socketio: Socket.io 서버 인스턴스
            namespace: 네임스페이스
        """
        self._socketio = socketio
        self._namespace = namespace
        self._current_stage = UpdateStage.INITIALIZING
        self._progress = 0
        self._callbacks: list[Callable] = []
        self._events: list[ProgressEvent] = []
        self._session_id = None
    
    def set_socketio(self, socketio):
        """Socket.io 서버 설정"""
        self._socketio = socketio
    
    def add_callback(self, callback: Callable[[ProgressEvent], None]):
        """콜백 추가"""
        self._callbacks.append(callback)
    
    def _emit(self, event_name: str, data: dict):
        """이벤트 발송"""
        # Socket.io 발송
        if self._socketio:
            try:
                self._socketio.emit(
                    event_name,
                    data,
                    namespace=self._namespace,
                )
            except Exception as e:
                logger.warning(f"Socket.io 발송 실패: {e}")
        
        # 콜백 실행
        event = ProgressEvent(
            stage=self._current_stage,
            progress=self._progress,
            message=data.get("message", ""),
            details=data,
        )
        
        for callback in self._callbacks:
            try:
                callback(event)
            except Exception as e:
                logger.warning(f"콜백 실행 실패: {e}")
        
        # 로깅
        logger.info(f"[{self._current_stage.value}] {self._progress}% - {data.get('message', '')}")
    
    def start(self, session_id: Optional[str] = None):
        """업데이트 시작"""
        import uuid
        
        self._session_id = session_id or str(uuid.uuid4())[:8]
        self._current_stage = UpdateStage.INITIALIZING
        self._progress = 0
        self._events = []
        
        self._emit("update:start", {
            "session_id": self._session_id,
            "message": "업데이트 시작",
            "timestamp": datetime.now().isoformat(),
        })
    
    def set_stage(self, stage: UpdateStage, message: str = ""):
        """단계 변경"""
        self._current_stage = stage
        
        # 단계별 기본 진행률
        stage_progress = {
            UpdateStage.INITIALIZING: 0,
            UpdateStage.ANALYZING: 20,
            UpdateStage.CHECKING: 40,
            UpdateStage.UPDATING: 60,
            UpdateStage.TESTING: 80,
            UpdateStage.COMPLETING: 95,
            UpdateStage.FAILED: self._progress,
            UpdateStage.ESCALATED: self._progress,
        }
        
        self._progress = stage_progress.get(stage, self._progress)
        
        self._emit("update:stage", {
            "stage": stage.value,
            "message": message or f"{stage.value} 단계 시작",
            "progress": self._progress,
        })
    
    def report_progress(self, progress: int, message: str, details: Optional[dict] = None):
        """진행률 보고"""
        self._progress = max(0, min(100, progress))
        
        self._emit("update:progress", {
            "progress": self._progress,
            "message": message,
            "stage": self._current_stage.value,
            **(details or {}),
        })
    
    def report_package(self, package: str, status: str, version: str = ""):
        """패키지 상태 보고"""
        self._emit("update:package", {
            "package": package,
            "status": status,
            "version": version,
            "progress": self._progress,
        })
    
    def complete(self, success: bool = True, message: str = "", report: str = ""):
        """업데이트 완료"""
        self._current_stage = UpdateStage.COMPLETING if success else UpdateStage.FAILED
        self._progress = 100 if success else self._progress
        
        self._emit("update:complete", {
            "success": success,
            "message": message or ("업데이트 완료" if success else "업데이트 실패"),
            "report": report,
            "session_id": self._session_id,
        })
    
    def escalate(self, reason: str, details: Optional[dict] = None):
        """Human Escalation"""
        self._current_stage = UpdateStage.ESCALATED
        
        self._emit("update:escalation", {
            "reason": reason,
            "message": f"🚨 Human Escalation: {reason}",
            "deep_link": f"/admin/update/{self._session_id}",
            **(details or {}),
        })
    
    def error(self, error_message: str, exception: Optional[Exception] = None):
        """에러 보고"""
        self._emit("update:error", {
            "error": error_message,
            "exception": str(exception) if exception else None,
            "stage": self._current_stage.value,
        })


# CrewAI 콜백 어댑터
class CrewAIProgressCallback:
    """CrewAI 에이전트 실행 콜백"""
    
    def __init__(self, reporter: RealtimeProgressReporter):
        self.reporter = reporter
        self._task_count = 0
        self._completed_tasks = 0
    
    def on_task_start(self, task_name: str, agent_name: str):
        """태스크 시작"""
        self._task_count += 1
        base_progress = 20 + (self._completed_tasks / max(self._task_count, 1)) * 60
        
        self.reporter.report_progress(
            int(base_progress),
            f"[{agent_name}] {task_name} 실행 중...",
        )
    
    def on_task_complete(self, task_name: str, agent_name: str, result: str):
        """태스크 완료"""
        self._completed_tasks += 1
        base_progress = 20 + (self._completed_tasks / max(self._task_count, 1)) * 60
        
        self.reporter.report_progress(
            int(base_progress),
            f"[{agent_name}] {task_name} 완료",
            {"result_preview": result[:100] if result else ""},
        )
    
    def on_agent_action(self, agent_name: str, action: str):
        """에이전트 액션"""
        self.reporter.report_progress(
            self.reporter._progress,
            f"[{agent_name}] {action}",
        )


# FastAPI 통합을 위한 엔드포인트 헬퍼
def create_socketio_handlers(socketio):
    """Socket.io 이벤트 핸들러 생성"""
    
    @socketio.on("connect", namespace="/autus")
    def handle_connect():
        logger.info("클라이언트 연결됨")
    
    @socketio.on("disconnect", namespace="/autus")
    def handle_disconnect():
        logger.info("클라이언트 연결 해제")
    
    @socketio.on("subscribe_update", namespace="/autus")
    def handle_subscribe(data):
        session_id = data.get("session_id")
        logger.info(f"업데이트 구독: {session_id}")
    
    return socketio


# 프론트엔드 클라이언트 코드 (참고용)
FRONTEND_CLIENT_CODE = '''
// Socket.io 클라이언트 (React/Next.js)
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useUpdateProgress() {
  const [socket, setSocket] = useState(null);
  const [progress, setProgress] = useState({ stage: '', progress: 0, message: '' });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const socketInstance = io('/autus');
    
    socketInstance.on('update:start', (data) => {
      console.log('Update started:', data);
      setProgress({ stage: 'initializing', progress: 0, message: data.message });
    });
    
    socketInstance.on('update:progress', (data) => {
      setProgress({
        stage: data.stage,
        progress: data.progress,
        message: data.message,
      });
    });
    
    socketInstance.on('update:stage', (data) => {
      setProgress(prev => ({
        ...prev,
        stage: data.stage,
        progress: data.progress,
      }));
    });
    
    socketInstance.on('update:complete', (data) => {
      setIsComplete(true);
      setProgress(prev => ({ ...prev, progress: 100 }));
    });
    
    socketInstance.on('update:escalation', (data) => {
      alert(`Human Escalation 필요: ${data.reason}`);
    });
    
    setSocket(socketInstance);
    
    return () => socketInstance.disconnect();
  }, []);

  return { progress, isComplete, socket };
}
'''
