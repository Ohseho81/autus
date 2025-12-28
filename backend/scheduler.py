"""
AUTUS Background Scheduler
==========================

백그라운드 작업 스케줄러
"""

from typing import Callable, Dict, List, Optional
from datetime import datetime
import asyncio
import threading

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    from apscheduler.triggers.cron import CronTrigger
    SCHEDULER_AVAILABLE = True
except ImportError:
    SCHEDULER_AVAILABLE = False
    AsyncIOScheduler = None

from .config import settings


class AutusScheduler:
    """AUTUS 스케줄러"""
    
    def __init__(self):
        self.scheduler: Optional[Any] = None
        self.is_running: bool = False
        self.jobs: Dict[str, Dict] = {}
    
    def start(self):
        """스케줄러 시작"""
        if not SCHEDULER_AVAILABLE:
            print("APScheduler not available")
            return
        
        if not settings.SCHEDULER_ENABLED:
            print("Scheduler disabled")
            return
        
        self.scheduler = AsyncIOScheduler()
        
        # 기본 작업 등록
        self._register_default_jobs()
        
        self.scheduler.start()
        self.is_running = True
    
    def stop(self):
        """스케줄러 중지"""
        if self.scheduler and self.is_running:
            self.scheduler.shutdown()
            self.is_running = False
    
    def _register_default_jobs(self):
        """기본 작업 등록"""
        # 상태 스냅샷 (5분마다)
        self.add_interval_job(
            "state_snapshot",
            self._job_state_snapshot,
            minutes=5
        )
        
        # 엔트로피 체크 (10분마다)
        self.add_interval_job(
            "entropy_check",
            self._job_entropy_check,
            minutes=10
        )
        
        # 자동 최적화 (1시간마다)
        self.add_interval_job(
            "auto_optimize",
            self._job_auto_optimize,
            hours=1
        )
        
        # 일일 리포트 (매일 자정)
        self.add_cron_job(
            "daily_report",
            self._job_daily_report,
            hour=0,
            minute=0
        )
    
    def add_interval_job(
        self,
        job_id: str,
        func: Callable,
        seconds: int = None,
        minutes: int = None,
        hours: int = None
    ):
        """인터벌 작업 추가"""
        if not self.scheduler:
            return
        
        trigger = IntervalTrigger(
            seconds=seconds,
            minutes=minutes,
            hours=hours
        )
        
        self.scheduler.add_job(
            func,
            trigger=trigger,
            id=job_id,
            replace_existing=True
        )
        
        self.jobs[job_id] = {
            "type": "interval",
            "seconds": seconds,
            "minutes": minutes,
            "hours": hours,
        }
    
    def add_cron_job(
        self,
        job_id: str,
        func: Callable,
        hour: int = None,
        minute: int = None,
        day_of_week: str = None
    ):
        """크론 작업 추가"""
        if not self.scheduler:
            return
        
        trigger = CronTrigger(
            hour=hour,
            minute=minute,
            day_of_week=day_of_week
        )
        
        self.scheduler.add_job(
            func,
            trigger=trigger,
            id=job_id,
            replace_existing=True
        )
        
        self.jobs[job_id] = {
            "type": "cron",
            "hour": hour,
            "minute": minute,
            "day_of_week": day_of_week,
        }
    
    def remove_job(self, job_id: str):
        """작업 제거"""
        if self.scheduler and job_id in self.jobs:
            self.scheduler.remove_job(job_id)
            del self.jobs[job_id]
    
    def trigger_job(self, job_id: str):
        """작업 수동 트리거"""
        if self.scheduler:
            job = self.scheduler.get_job(job_id)
            if job:
                job.modify(next_run_time=datetime.now())
    
    def get_jobs(self) -> List[Dict]:
        """등록된 작업 목록"""
        return [
            {"id": job_id, **info}
            for job_id, info in self.jobs.items()
        ]
    
    # ============================================================
    # DEFAULT JOBS
    # ============================================================
    
    async def _job_state_snapshot(self):
        """상태 스냅샷 작업"""
        print(f"[Scheduler] State snapshot at {datetime.now()}")
        # 실제 구현에서는 engine.get_system_state() 호출
    
    async def _job_entropy_check(self):
        """엔트로피 체크 작업"""
        print(f"[Scheduler] Entropy check at {datetime.now()}")
        # 실제 구현에서는 엔트로피 임계값 체크
    
    async def _job_auto_optimize(self):
        """자동 최적화 작업"""
        print(f"[Scheduler] Auto optimize at {datetime.now()}")
        # 실제 구현에서는 engine.run_auto_optimization() 호출
    
    async def _job_daily_report(self):
        """일일 리포트 작업"""
        print(f"[Scheduler] Daily report at {datetime.now()}")
        # 실제 구현에서는 리포트 생성 및 전송


class MockScheduler:
    """Mock 스케줄러"""
    
    def __init__(self):
        self.is_running = False
        self.jobs = {}
    
    def start(self):
        self.is_running = True
    
    def stop(self):
        self.is_running = False
    
    def add_interval_job(self, *args, **kwargs):
        pass
    
    def add_cron_job(self, *args, **kwargs):
        pass
    
    def remove_job(self, job_id: str):
        pass
    
    def trigger_job(self, job_id: str):
        pass
    
    def get_jobs(self) -> List[Dict]:
        return []


def create_scheduler() -> AutusScheduler:
    """스케줄러 팩토리"""
    if SCHEDULER_AVAILABLE:
        return AutusScheduler()
    else:
        return MockScheduler()

