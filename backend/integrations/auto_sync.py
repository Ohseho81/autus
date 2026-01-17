"""
AUTUS Auto-Sync Engine v14.0
==============================
자동 데이터 동기화 스케줄러

기능:
- 주기적 자동 동기화
- 변경 감지 (델타 싱크)
- 우선순위 큐
- 실패 재시도
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass, field
from enum import Enum
import json

from integrations.oauth_manager import OAuthProvider, get_oauth_manager
from integrations.data_hub import DataHub, DataType, get_data_hub

logger = logging.getLogger(__name__)

# ============================================
# Sync Configuration
# ============================================

class SyncPriority(int, Enum):
    CRITICAL = 1    # 즉시 (결제, 알림)
    HIGH = 2        # 5분 (이메일, 메시지)
    NORMAL = 3      # 15분 (캘린더, 문서)
    LOW = 4         # 1시간 (코드, 아카이브)

@dataclass
class SyncJob:
    """동기화 작업"""
    user_id: str
    provider: OAuthProvider
    priority: SyncPriority = SyncPriority.NORMAL
    last_sync: Optional[datetime] = None
    next_sync: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    error: Optional[str] = None

@dataclass
class SyncResult:
    """동기화 결과"""
    success: bool
    user_id: str
    provider: OAuthProvider
    items_synced: int = 0
    duration_ms: int = 0
    error: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)

# 서비스별 기본 동기화 간격
SYNC_INTERVALS = {
    OAuthProvider.GOOGLE: timedelta(minutes=10),
    OAuthProvider.MICROSOFT: timedelta(minutes=10),
    OAuthProvider.SLACK: timedelta(minutes=5),
    OAuthProvider.NOTION: timedelta(minutes=30),
    OAuthProvider.GITHUB: timedelta(minutes=15),
    OAuthProvider.STRIPE: timedelta(minutes=5),
    OAuthProvider.SHOPIFY: timedelta(minutes=15),
    OAuthProvider.KAKAO: timedelta(minutes=30),
    OAuthProvider.NAVER: timedelta(minutes=30),
}

# ============================================
# Auto-Sync Engine
# ============================================

class AutoSyncEngine:
    """
    자동 동기화 엔진
    
    - 백그라운드에서 주기적으로 데이터 동기화
    - 우선순위 기반 스케줄링
    - 실패 시 자동 재시도
    """
    
    def __init__(self):
        self.data_hub = get_data_hub()
        self.oauth = get_oauth_manager()
        self.jobs: Dict[str, Dict[OAuthProvider, SyncJob]] = {}  # user_id -> provider -> job
        self.results: List[SyncResult] = []
        self.running = False
        self._task: Optional[asyncio.Task] = None
        self.callbacks: List[Callable] = []
    
    def register_user(self, user_id: str) -> int:
        """사용자의 모든 연결된 서비스를 동기화 대상으로 등록"""
        providers = self.oauth.get_connected_providers(user_id)
        
        if user_id not in self.jobs:
            self.jobs[user_id] = {}
        
        count = 0
        for provider in providers:
            if provider not in self.jobs[user_id]:
                interval = SYNC_INTERVALS.get(provider, timedelta(minutes=30))
                self.jobs[user_id][provider] = SyncJob(
                    user_id=user_id,
                    provider=provider,
                    next_sync=datetime.utcnow() + interval
                )
                count += 1
        
        logger.info(f"Registered {count} sync jobs for user {user_id}")
        return count
    
    def unregister_user(self, user_id: str, provider: OAuthProvider = None):
        """동기화 대상에서 제거"""
        if user_id not in self.jobs:
            return
        
        if provider:
            self.jobs[user_id].pop(provider, None)
        else:
            del self.jobs[user_id]
    
    def add_callback(self, callback: Callable):
        """동기화 완료 콜백 등록"""
        self.callbacks.append(callback)
    
    async def start(self):
        """백그라운드 동기화 시작"""
        if self.running:
            return
        
        self.running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Auto-sync engine started")
    
    async def stop(self):
        """동기화 중지"""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Auto-sync engine stopped")
    
    async def _run_loop(self):
        """메인 동기화 루프"""
        while self.running:
            try:
                await self._process_jobs()
                await asyncio.sleep(30)  # 30초마다 체크
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Sync loop error: {e}")
                await asyncio.sleep(60)
    
    async def _process_jobs(self):
        """대기 중인 작업 처리"""
        now = datetime.utcnow()
        pending_jobs = []
        
        # 실행 대상 작업 수집
        for user_id, providers in self.jobs.items():
            for provider, job in providers.items():
                if job.next_sync and job.next_sync <= now:
                    pending_jobs.append(job)
        
        # 우선순위 정렬
        pending_jobs.sort(key=lambda j: j.priority.value)
        
        # 병렬 실행 (최대 5개)
        batch_size = 5
        for i in range(0, len(pending_jobs), batch_size):
            batch = pending_jobs[i:i + batch_size]
            await asyncio.gather(*[self._execute_job(job) for job in batch])
    
    async def _execute_job(self, job: SyncJob) -> SyncResult:
        """단일 작업 실행"""
        start_time = datetime.utcnow()
        
        try:
            # 데이터 수집
            data = await self.data_hub.collect_by_provider(job.user_id, job.provider)
            
            duration = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            result = SyncResult(
                success=True,
                user_id=job.user_id,
                provider=job.provider,
                items_synced=len(data),
                duration_ms=duration
            )
            
            # 다음 동기화 시간 설정
            interval = SYNC_INTERVALS.get(job.provider, timedelta(minutes=30))
            job.last_sync = datetime.utcnow()
            job.next_sync = job.last_sync + interval
            job.retry_count = 0
            job.error = None
            
            logger.info(f"Synced {len(data)} items from {job.provider.value} for {job.user_id}")
            
        except Exception as e:
            duration = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            result = SyncResult(
                success=False,
                user_id=job.user_id,
                provider=job.provider,
                duration_ms=duration,
                error=str(e)
            )
            
            # 재시도 스케줄링
            job.retry_count += 1
            job.error = str(e)
            
            if job.retry_count < job.max_retries:
                # 지수 백오프
                delay = timedelta(minutes=2 ** job.retry_count)
                job.next_sync = datetime.utcnow() + delay
            else:
                # 최대 재시도 초과 - 1시간 후 재시도
                job.next_sync = datetime.utcnow() + timedelta(hours=1)
            
            logger.error(f"Sync failed for {job.provider.value}: {e}")
        
        # 결과 저장
        self.results.append(result)
        if len(self.results) > 1000:
            self.results = self.results[-500:]  # 최근 500개만 유지
        
        # 콜백 호출
        for callback in self.callbacks:
            try:
                await callback(result) if asyncio.iscoroutinefunction(callback) else callback(result)
            except Exception as e:
                logger.error(f"Callback error: {e}")
        
        return result
    
    async def sync_now(self, user_id: str, provider: OAuthProvider = None) -> List[SyncResult]:
        """즉시 동기화"""
        results = []
        
        if user_id not in self.jobs:
            self.register_user(user_id)
        
        jobs_to_run = []
        
        if provider:
            if provider in self.jobs.get(user_id, {}):
                jobs_to_run.append(self.jobs[user_id][provider])
        else:
            jobs_to_run = list(self.jobs.get(user_id, {}).values())
        
        for job in jobs_to_run:
            result = await self._execute_job(job)
            results.append(result)
        
        return results
    
    def get_status(self, user_id: str = None) -> Dict[str, Any]:
        """동기화 상태 조회"""
        if user_id:
            jobs = self.jobs.get(user_id, {})
            return {
                "user_id": user_id,
                "jobs": [
                    {
                        "provider": job.provider.value,
                        "last_sync": job.last_sync.isoformat() if job.last_sync else None,
                        "next_sync": job.next_sync.isoformat() if job.next_sync else None,
                        "retry_count": job.retry_count,
                        "error": job.error
                    }
                    for job in jobs.values()
                ]
            }
        
        # 전체 상태
        total_jobs = sum(len(providers) for providers in self.jobs.values())
        return {
            "running": self.running,
            "total_users": len(self.jobs),
            "total_jobs": total_jobs,
            "recent_results": [
                {
                    "user_id": r.user_id,
                    "provider": r.provider.value,
                    "success": r.success,
                    "items": r.items_synced,
                    "timestamp": r.timestamp.isoformat()
                }
                for r in self.results[-20:]
            ]
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """통계"""
        if not self.results:
            return {"total": 0}
        
        success_count = sum(1 for r in self.results if r.success)
        total_items = sum(r.items_synced for r in self.results)
        avg_duration = sum(r.duration_ms for r in self.results) / len(self.results)
        
        by_provider = {}
        for r in self.results:
            p = r.provider.value
            if p not in by_provider:
                by_provider[p] = {"success": 0, "failed": 0, "items": 0}
            if r.success:
                by_provider[p]["success"] += 1
                by_provider[p]["items"] += r.items_synced
            else:
                by_provider[p]["failed"] += 1
        
        return {
            "total_syncs": len(self.results),
            "success_rate": success_count / len(self.results) * 100,
            "total_items_synced": total_items,
            "avg_duration_ms": avg_duration,
            "by_provider": by_provider
        }


# ============================================
# Singleton
# ============================================

_sync_engine: Optional[AutoSyncEngine] = None

def get_sync_engine() -> AutoSyncEngine:
    global _sync_engine
    if _sync_engine is None:
        _sync_engine = AutoSyncEngine()
    return _sync_engine
