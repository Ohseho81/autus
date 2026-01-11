"""
═══════════════════════════════════════════════════════════════════════════════
🧠 AUTUS Kernel Module (커널)
═══════════════════════════════════════════════════════════════════════════════

핵심 연산 커널
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from enum import Enum
import time


class KernelState(Enum):
    """커널 상태"""
    IDLE = "IDLE"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    ERROR = "ERROR"


@dataclass
class KernelConfig:
    """커널 설정"""
    tick_interval: float = 1.0      # 틱 간격 (초)
    max_queue_size: int = 1000      # 최대 큐 크기
    auto_save_interval: int = 60    # 자동 저장 간격 (초)
    debug_mode: bool = False


@dataclass
class KernelTask:
    """커널 태스크"""
    id: str
    name: str
    priority: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    executed_at: Optional[datetime] = None
    result: Optional[Any] = None


@dataclass
class KernelMetrics:
    """커널 메트릭"""
    uptime: float = 0.0
    tasks_processed: int = 0
    tasks_pending: int = 0
    errors: int = 0
    last_tick: float = 0.0


class Kernel:
    """AUTUS 커널"""
    
    VERSION = "1.0.0"
    
    def __init__(self, config: Optional[KernelConfig] = None):
        self.config = config or KernelConfig()
        self._state = KernelState.IDLE
        self._start_time = time.time()
        self._task_queue: List[KernelTask] = []
        self._processed: List[KernelTask] = []
        self._handlers: Dict[str, Callable] = {}
        self._metrics = KernelMetrics()
    
    @property
    def state(self) -> KernelState:
        return self._state
    
    @property
    def uptime(self) -> float:
        return time.time() - self._start_time
    
    def start(self):
        """커널 시작"""
        self._state = KernelState.RUNNING
        self._start_time = time.time()
    
    def stop(self):
        """커널 중지"""
        self._state = KernelState.IDLE
    
    def pause(self):
        """커널 일시정지"""
        self._state = KernelState.PAUSED
    
    def resume(self):
        """커널 재개"""
        if self._state == KernelState.PAUSED:
            self._state = KernelState.RUNNING
    
    def submit_task(
        self,
        task_id: str,
        name: str,
        priority: int = 0
    ) -> KernelTask:
        """태스크 제출"""
        task = KernelTask(
            id=task_id,
            name=name,
            priority=priority,
        )
        
        self._task_queue.append(task)
        self._task_queue.sort(key=lambda t: -t.priority)
        self._metrics.tasks_pending = len(self._task_queue)
        
        return task
    
    def process_next(self) -> Optional[KernelTask]:
        """다음 태스크 처리"""
        if not self._task_queue:
            return None
        
        if self._state != KernelState.RUNNING:
            return None
        
        task = self._task_queue.pop(0)
        task.executed_at = datetime.now()
        
        # 핸들러 실행
        handler = self._handlers.get(task.name)
        if handler:
            try:
                task.result = handler(task)
            except Exception as e:
                task.result = {"error": str(e)}
                self._metrics.errors += 1
        
        self._processed.append(task)
        self._metrics.tasks_processed += 1
        self._metrics.tasks_pending = len(self._task_queue)
        
        return task
    
    def register_handler(self, name: str, handler: Callable):
        """핸들러 등록"""
        self._handlers[name] = handler
    
    def tick(self) -> Dict[str, Any]:
        """틱 실행"""
        self._metrics.last_tick = time.time()
        
        processed = []
        while self._task_queue and len(processed) < 10:
            task = self.process_next()
            if task:
                processed.append(task.id)
            else:
                break
        
        return {
            "tick_time": self._metrics.last_tick,
            "processed": processed,
            "pending": len(self._task_queue),
        }
    
    def get_metrics(self) -> Dict[str, Any]:
        """메트릭 조회"""
        return {
            "state": self._state.value,
            "uptime": round(self.uptime, 2),
            "tasks_processed": self._metrics.tasks_processed,
            "tasks_pending": self._metrics.tasks_pending,
            "errors": self._metrics.errors,
            "version": self.VERSION,
        }
    
    def get_queue(self) -> List[Dict]:
        """큐 조회"""
        return [
            {
                "id": t.id,
                "name": t.name,
                "priority": t.priority,
                "created_at": t.created_at.isoformat(),
            }
            for t in self._task_queue
        ]
    
    def clear_queue(self):
        """큐 비우기"""
        self._task_queue.clear()
        self._metrics.tasks_pending = 0
    
    def reset(self):
        """리셋"""
        self._state = KernelState.IDLE
        self._task_queue.clear()
        self._processed.clear()
        self._metrics = KernelMetrics()
        self._start_time = time.time()


# ═══════════════════════════════════════════════════════════════════════════════
# Singleton
# ═══════════════════════════════════════════════════════════════════════════════

_kernel: Optional[Kernel] = None


def get_kernel() -> Kernel:
    """커널 싱글턴"""
    global _kernel
    if _kernel is None:
        _kernel = Kernel()
    return _kernel


def submit_task(task_id: str, name: str, priority: int = 0) -> KernelTask:
    """태스크 제출 (편의 함수)"""
    return get_kernel().submit_task(task_id, name, priority)


def kernel_tick() -> Dict[str, Any]:
    """틱 실행 (편의 함수)"""
    return get_kernel().tick()
