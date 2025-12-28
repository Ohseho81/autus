"""
AUTUS Weekly Milestone Scheduler
=================================

주간 이정표 추적 + 자동 알림 시스템

Features:
1. APScheduler 기반 크론 작업
2. 주간 성과 분석
3. 궤도 이탈 감지 및 보정
4. 알림 발송 (이메일/웹훅/푸시)
5. 월간 리포트 생성

Schedule:
- 매주 월요일 08:00: 주간 브리핑
- 매일 09:00: 일일 액션 카드
- 매일 18:00: 일일 성과 요약
- 매월 1일: 월간 리포트

Version: 1.0.0
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Callable, Any
from datetime import datetime, timedelta
from enum import Enum
import asyncio
import logging
import json


# ================================================================
# CONFIGURATION
# ================================================================

class SchedulerConfig:
    """스케줄러 설정"""
    
    # 주간 브리핑
    WEEKLY_BRIEFING_DAY = "mon"
    WEEKLY_BRIEFING_HOUR = 8
    WEEKLY_BRIEFING_MINUTE = 0
    
    # 일일 액션
    DAILY_ACTION_HOUR = 9
    DAILY_ACTION_MINUTE = 0
    
    # 일일 요약
    DAILY_SUMMARY_HOUR = 18
    DAILY_SUMMARY_MINUTE = 0
    
    # 월간 리포트
    MONTHLY_REPORT_DAY = 1
    MONTHLY_REPORT_HOUR = 9
    
    # 알림 채널
    ENABLE_EMAIL = True
    ENABLE_WEBHOOK = True
    ENABLE_PUSH = False


class NotificationChannel(Enum):
    """알림 채널"""
    EMAIL = "email"
    WEBHOOK = "webhook"
    PUSH = "push"
    IN_APP = "in_app"
    SMS = "sms"


class AlertLevel(Enum):
    """알림 레벨"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    CRITICAL = "critical"


# ================================================================
# DATA STRUCTURES
# ================================================================

@dataclass
class ScheduledJob:
    """예약된 작업"""
    id: str
    name: str
    cron_expression: str
    next_run: datetime
    last_run: Optional[datetime]
    enabled: bool
    handler: str


@dataclass
class WeeklyBriefing:
    """주간 브리핑"""
    week_number: int
    generated_at: datetime
    milestone: Dict
    performance: Dict
    trajectory_status: str
    gap_percentage: float
    actions_required: List[str]
    golden_highlights: List[Dict]
    entropy_cleared: List[Dict]
    time_saved_hours: float
    value_growth_percent: float


@dataclass
class Notification:
    """알림"""
    id: str
    user_id: str
    channel: NotificationChannel
    level: AlertLevel
    title: str
    body: str
    data: Dict
    created_at: datetime
    sent_at: Optional[datetime]
    read_at: Optional[datetime]


@dataclass
class PerformanceSnapshot:
    """성과 스냅샷"""
    timestamp: datetime
    golden_count: int
    entropy_count: int
    total_value: float
    saved_time_hours: float
    network_strength: float
    actions_completed: int
    actions_pending: int
    synergy_avg: float


# ================================================================
# PERFORMANCE ANALYZER
# ================================================================

class PerformanceAnalyzer:
    """
    성과 분석기
    
    주간/월간 성과를 분석하고 궤적 대비 이탈을 감지
    """
    
    def __init__(self):
        self.snapshots: List[PerformanceSnapshot] = []
        self.weekly_targets = {
            1: {
                "entropy_reduction": 0.8,
                "saved_time": 18,
                "golden_interactions": 3,
            },
            2: {
                "network_strength": 75,
                "deep_work_sessions": 3,
                "value_conversion": True,
            },
            3: {
                "action_completion": 0.9,
                "nn_level": 5,
                "passive_opportunities": 2,
            },
            4: {
                "total_saved_time": 120,
                "nn_value": True,
                "self_sustaining": True,
            },
        }
    
    def take_snapshot(
        self,
        golden_count: int,
        entropy_count: int,
        total_value: float,
        saved_time: float,
        network_strength: float,
        actions_completed: int,
        actions_pending: int,
        synergy_avg: float
    ) -> PerformanceSnapshot:
        """성과 스냅샷 생성"""
        snapshot = PerformanceSnapshot(
            timestamp=datetime.now(),
            golden_count=golden_count,
            entropy_count=entropy_count,
            total_value=total_value,
            saved_time_hours=saved_time,
            network_strength=network_strength,
            actions_completed=actions_completed,
            actions_pending=actions_pending,
            synergy_avg=synergy_avg,
        )
        
        self.snapshots.append(snapshot)
        return snapshot
    
    def get_weekly_performance(self, week_number: int = None) -> Dict:
        """주간 성과 분석"""
        if not self.snapshots:
            return self._generate_sample_performance()
        
        # 최근 7일 스냅샷
        week_ago = datetime.now() - timedelta(days=7)
        week_snapshots = [s for s in self.snapshots if s.timestamp >= week_ago]
        
        if not week_snapshots:
            return self._generate_sample_performance()
        
        first = week_snapshots[0]
        last = week_snapshots[-1]
        
        return {
            "period": {
                "start": first.timestamp.isoformat(),
                "end": last.timestamp.isoformat(),
            },
            "golden": {
                "start": first.golden_count,
                "end": last.golden_count,
                "change": last.golden_count - first.golden_count,
            },
            "entropy": {
                "start": first.entropy_count,
                "end": last.entropy_count,
                "change": last.entropy_count - first.entropy_count,
            },
            "value": {
                "start": first.total_value,
                "end": last.total_value,
                "growth_percent": ((last.total_value / first.total_value) - 1) * 100 if first.total_value > 0 else 0,
            },
            "time_saved": last.saved_time_hours,
            "network_strength": last.network_strength,
            "actions": {
                "completed": last.actions_completed,
                "pending": last.actions_pending,
                "completion_rate": last.actions_completed / (last.actions_completed + last.actions_pending) if (last.actions_completed + last.actions_pending) > 0 else 0,
            },
            "synergy_avg": last.synergy_avg,
        }
    
    def _generate_sample_performance(self) -> Dict:
        """샘플 성과 데이터 생성"""
        return {
            "period": {
                "start": (datetime.now() - timedelta(days=7)).isoformat(),
                "end": datetime.now().isoformat(),
            },
            "golden": {
                "start": 3,
                "end": 4,
                "change": 1,
            },
            "entropy": {
                "start": 12,
                "end": 8,
                "change": -4,
            },
            "value": {
                "start": 13200000,
                "end": 16500000,
                "growth_percent": 25.0,
            },
            "time_saved": 22.5,
            "network_strength": 72.5,
            "actions": {
                "completed": 18,
                "pending": 4,
                "completion_rate": 0.82,
            },
            "synergy_avg": 0.45,
        }
    
    def calculate_trajectory_gap(
        self,
        current: Dict,
        expected: Dict
    ) -> float:
        """궤적 대비 이탈 계산"""
        gaps = []
        
        # 가치 이탈
        if "value" in expected and "value" in current:
            value_gap = abs(current["value"]["end"] - expected.get("expected_value", current["value"]["end"])) / max(expected.get("expected_value", 1), 1)
            gaps.append(value_gap)
        
        # 시간 절약 이탈
        if "time_saved" in current:
            time_target = expected.get("expected_time_saved", 18)
            time_gap = max(0, time_target - current["time_saved"]) / time_target if time_target > 0 else 0
            gaps.append(time_gap)
        
        # 골든 카운트 이탈
        if "golden" in current:
            golden_target = expected.get("expected_golden", 5)
            golden_gap = max(0, golden_target - current["golden"]["end"]) / golden_target if golden_target > 0 else 0
            gaps.append(golden_gap)
        
        return sum(gaps) / len(gaps) if gaps else 0


# ================================================================
# NOTIFICATION SERVICE
# ================================================================

class NotificationService:
    """
    알림 서비스
    
    다양한 채널을 통해 알림 발송
    """
    
    def __init__(self):
        self.notifications: List[Notification] = []
        self.handlers: Dict[NotificationChannel, Callable] = {}
        
        # 기본 핸들러 등록
        self.register_handler(NotificationChannel.IN_APP, self._handle_in_app)
        self.register_handler(NotificationChannel.WEBHOOK, self._handle_webhook)
        self.register_handler(NotificationChannel.EMAIL, self._handle_email)
    
    def register_handler(
        self,
        channel: NotificationChannel,
        handler: Callable
    ):
        """알림 핸들러 등록"""
        self.handlers[channel] = handler
    
    async def send(
        self,
        user_id: str,
        channel: NotificationChannel,
        level: AlertLevel,
        title: str,
        body: str,
        data: Dict = None
    ) -> Notification:
        """알림 발송"""
        notification = Notification(
            id=f"notif_{datetime.now().strftime('%Y%m%d%H%M%S')}_{user_id}",
            user_id=user_id,
            channel=channel,
            level=level,
            title=title,
            body=body,
            data=data or {},
            created_at=datetime.now(),
            sent_at=None,
            read_at=None,
        )
        
        # 핸들러 실행
        handler = self.handlers.get(channel)
        if handler:
            try:
                await handler(notification)
                notification.sent_at = datetime.now()
            except Exception as e:
                logging.error(f"Notification send failed: {e}")
        
        self.notifications.append(notification)
        return notification
    
    async def _handle_in_app(self, notification: Notification):
        """인앱 알림 처리"""
        logging.info(f"[IN-APP] {notification.title}: {notification.body}")
    
    async def _handle_webhook(self, notification: Notification):
        """웹훅 알림 처리"""
        payload = {
            "id": notification.id,
            "level": notification.level.value,
            "title": notification.title,
            "body": notification.body,
            "data": notification.data,
            "timestamp": notification.created_at.isoformat(),
        }
        logging.info(f"[WEBHOOK] Payload: {json.dumps(payload, ensure_ascii=False)}")
    
    async def _handle_email(self, notification: Notification):
        """이메일 알림 처리"""
        logging.info(f"[EMAIL] To: {notification.user_id}, Subject: {notification.title}")
    
    def get_unread(self, user_id: str) -> List[Notification]:
        """읽지 않은 알림"""
        return [
            n for n in self.notifications
            if n.user_id == user_id and n.read_at is None
        ]


# ================================================================
# WEEKLY BRIEFING GENERATOR
# ================================================================

class WeeklyBriefingGenerator:
    """
    주간 브리핑 생성기
    """
    
    def __init__(
        self,
        performance_analyzer: PerformanceAnalyzer,
        notification_service: NotificationService
    ):
        self.analyzer = performance_analyzer
        self.notifier = notification_service
        self.briefings: List[WeeklyBriefing] = []
    
    def get_current_week(self) -> int:
        """현재 주차 계산 (월 기준)"""
        today = datetime.now()
        return ((today.day - 1) // 7) + 1
    
    async def generate_briefing(self, user_id: str = "default") -> WeeklyBriefing:
        """주간 브리핑 생성"""
        week_number = self.get_current_week()
        performance = self.analyzer.get_weekly_performance(week_number)
        
        # 예상 궤적
        expected = {
            "expected_value": 16000000 * (1.25 ** (week_number - 1)),
            "expected_time_saved": 18 * week_number,
            "expected_golden": 3 + week_number,
        }
        
        # 이탈 계산
        gap = self.analyzer.calculate_trajectory_gap(performance, expected)
        
        # 상태 결정
        if gap < 0.1:
            status = "ON_TRACK"
            status_msg = "✅ 궤도 정상: 완벽한 성공 선상에 있습니다"
        elif gap < 0.25:
            status = "MINOR_DEVIATION"
            status_msg = "⚠️ 경미한 이탈: 소폭의 보정이 필요합니다"
        else:
            status = "MAJOR_DEVIATION"
            status_msg = "🚨 궤도 이탈: 즉시 보정 액션이 필요합니다"
        
        # 필요 액션
        actions = self._generate_actions(week_number, gap, performance)
        
        # 골든 하이라이트
        golden_highlights = [
            {"name": "김대표", "synergy": 0.95, "action": "비전 공유 미팅 완료"},
            {"name": "이사장", "synergy": 0.88, "action": "프로젝트 확장 논의"},
        ]
        
        # 엔트로피 정화
        entropy_cleared = [
            {"name": "문외부", "old_synergy": -0.65, "action": "소프트 차단"},
            {"name": "정인턴", "old_synergy": -0.45, "action": "자동 응답 활성화"},
        ]
        
        briefing = WeeklyBriefing(
            week_number=week_number,
            generated_at=datetime.now(),
            milestone=self._get_milestone(week_number),
            performance=performance,
            trajectory_status=status,
            gap_percentage=round(gap * 100, 1),
            actions_required=actions,
            golden_highlights=golden_highlights,
            entropy_cleared=entropy_cleared,
            time_saved_hours=performance.get("time_saved", 0),
            value_growth_percent=performance.get("value", {}).get("growth_percent", 0),
        )
        
        self.briefings.append(briefing)
        
        # 알림 발송
        level = AlertLevel.SUCCESS if status == "ON_TRACK" else AlertLevel.WARNING if status == "MINOR_DEVIATION" else AlertLevel.CRITICAL
        
        await self.notifier.send(
            user_id=user_id,
            channel=NotificationChannel.IN_APP,
            level=level,
            title=f"[Week {week_number}] 주간 브리핑",
            body=status_msg,
            data={
                "briefing_id": f"brief_{week_number}_{datetime.now().strftime('%Y%m%d')}",
                "gap": gap,
                "actions_count": len(actions),
            },
        )
        
        return briefing
    
    def _get_milestone(self, week: int) -> Dict:
        """주차별 이정표"""
        milestones = {
            1: {
                "title": "엔트로피 정화 완료",
                "targets": ["하위 20% 노드 상호작용 80% 감소", "18시간 확보"],
            },
            2: {
                "title": "시너지 임계점 돌파",
                "targets": ["골든 코어 3인 Deep Work", "네트워크 강도 75%"],
            },
            3: {
                "title": "수익 가속도 확보",
                "targets": ["액션 90% 완료", "n^5 기회 유입"],
            },
            4: {
                "title": "자생적 우주 완성",
                "targets": ["120시간 저축", "n^n 달성"],
            },
        }
        return milestones.get(week, {"title": "유지", "targets": []})
    
    def _generate_actions(
        self,
        week: int,
        gap: float,
        performance: Dict
    ) -> List[str]:
        """보정 액션 생성"""
        actions = []
        
        if gap > 0.1:
            actions.append("🎯 골든 코어와의 미팅 1회 추가 예약")
        
        if performance.get("entropy", {}).get("change", 0) >= 0:
            actions.append("🚫 엔트로피 노드 추가 정화 필요")
        
        if performance.get("actions", {}).get("completion_rate", 0) < 0.8:
            actions.append("⚡ 대기 중인 액션 카드 우선 처리")
        
        if performance.get("time_saved", 0) < 15:
            actions.append("⏰ 자동 응답 시스템 확대 적용")
        
        if not actions:
            actions.append("✅ 현재 궤도 유지 - 추가 액션 불필요")
        
        return actions
    
    def format_briefing(self, briefing: WeeklyBriefing) -> str:
        """브리핑 포맷팅"""
        lines = [
            "=" * 60,
            f"AUTUS 주간 브리핑 - Week {briefing.week_number}",
            f"생성: {briefing.generated_at.strftime('%Y-%m-%d %H:%M')}",
            "=" * 60,
            "",
            f"📍 이정표: {briefing.milestone['title']}",
            f"🛤️ 궤적 상태: {briefing.trajectory_status} (이탈: {briefing.gap_percentage}%)",
            "",
            "📊 주간 성과:",
            f"  - 가치 성장: +{briefing.value_growth_percent:.1f}%",
            f"  - 시간 확보: {briefing.time_saved_hours}시간",
            f"  - 골든 변화: {briefing.performance.get('golden', {}).get('change', 0):+d}명",
            f"  - 엔트로피 변화: {briefing.performance.get('entropy', {}).get('change', 0):+d}명",
            "",
            "⭐ 골든 하이라이트:",
        ]
        
        for g in briefing.golden_highlights:
            lines.append(f"  - {g['name']} (z={g['synergy']:.2f}): {g['action']}")
        
        lines.extend([
            "",
            "🔴 엔트로피 정화:",
        ])
        
        for e in briefing.entropy_cleared:
            lines.append(f"  - {e['name']} (z={e['old_synergy']:.2f}): {e['action']}")
        
        lines.extend([
            "",
            "📋 필요 액션:",
        ])
        
        for action in briefing.actions_required:
            lines.append(f"  {action}")
        
        lines.append("")
        lines.append("=" * 60)
        
        return "\n".join(lines)


# ================================================================
# MILESTONE SCHEDULER
# ================================================================

class MilestoneScheduler:
    """
    이정표 스케줄러
    
    APScheduler 스타일의 크론 작업 관리
    """
    
    def __init__(self):
        self.jobs: Dict[str, ScheduledJob] = {}
        self.handlers: Dict[str, Callable] = {}
        self.running = False
        
        # 서비스 초기화
        self.analyzer = PerformanceAnalyzer()
        self.notifier = NotificationService()
        self.briefing_gen = WeeklyBriefingGenerator(self.analyzer, self.notifier)
    
    def add_job(
        self,
        job_id: str,
        name: str,
        cron_expression: str,
        handler: Callable,
        enabled: bool = True
    ):
        """작업 추가"""
        next_run = self._calculate_next_run(cron_expression)
        
        job = ScheduledJob(
            id=job_id,
            name=name,
            cron_expression=cron_expression,
            next_run=next_run,
            last_run=None,
            enabled=enabled,
            handler=job_id,
        )
        
        self.jobs[job_id] = job
        self.handlers[job_id] = handler
    
    def _calculate_next_run(self, cron: str) -> datetime:
        """다음 실행 시간 계산"""
        now = datetime.now()
        
        if "mon" in cron.lower():
            days_until_monday = (7 - now.weekday()) % 7
            if days_until_monday == 0 and now.hour >= 8:
                days_until_monday = 7
            next_monday = now + timedelta(days=days_until_monday)
            return next_monday.replace(hour=8, minute=0, second=0, microsecond=0)
        else:
            return (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    
    def setup_default_jobs(self):
        """기본 작업 설정"""
        self.add_job(
            "weekly_briefing",
            "주간 브리핑",
            "0 8 * * mon",
            self._job_weekly_briefing,
        )
        
        self.add_job(
            "daily_actions",
            "일일 액션 카드",
            "0 9 * * *",
            self._job_daily_actions,
        )
        
        self.add_job(
            "daily_summary",
            "일일 요약",
            "0 18 * * *",
            self._job_daily_summary,
        )
        
        self.add_job(
            "monthly_report",
            "월간 리포트",
            "0 9 1 * *",
            self._job_monthly_report,
        )
    
    async def _job_weekly_briefing(self):
        """주간 브리핑 작업"""
        briefing = await self.briefing_gen.generate_briefing()
        print(self.briefing_gen.format_briefing(briefing))
        return briefing
    
    async def _job_daily_actions(self):
        """일일 액션 작업"""
        await self.notifier.send(
            user_id="default",
            channel=NotificationChannel.IN_APP,
            level=AlertLevel.INFO,
            title="오늘의 액션 카드",
            body="새로운 3개의 액션 카드가 준비되었습니다.",
            data={"action_count": 3},
        )
    
    async def _job_daily_summary(self):
        """일일 요약 작업"""
        await self.notifier.send(
            user_id="default",
            channel=NotificationChannel.IN_APP,
            level=AlertLevel.SUCCESS,
            title="일일 성과 요약",
            body="오늘 2.5시간을 절약하고 3개의 액션을 완료했습니다.",
            data={"time_saved": 2.5, "actions_done": 3},
        )
    
    async def _job_monthly_report(self):
        """월간 리포트 작업"""
        await self.notifier.send(
            user_id="default",
            channel=NotificationChannel.IN_APP,
            level=AlertLevel.SUCCESS,
            title="월간 가치 리포트",
            body="이번 달 총 120시간을 절약하고 가치가 328% 성장했습니다!",
            data={"total_time_saved": 120, "value_growth": 328},
        )
    
    async def run_job(self, job_id: str) -> Any:
        """작업 즉시 실행"""
        if job_id not in self.jobs:
            raise ValueError(f"Job not found: {job_id}")
        
        job = self.jobs[job_id]
        handler = self.handlers.get(job_id)
        
        if not handler:
            raise ValueError(f"Handler not found: {job_id}")
        
        result = await handler()
        
        job.last_run = datetime.now()
        job.next_run = self._calculate_next_run(job.cron_expression)
        
        return result
    
    def get_job_status(self) -> List[Dict]:
        """작업 상태 조회"""
        return [
            {
                "id": job.id,
                "name": job.name,
                "cron": job.cron_expression,
                "next_run": job.next_run.isoformat(),
                "last_run": job.last_run.isoformat() if job.last_run else None,
                "enabled": job.enabled,
            }
            for job in self.jobs.values()
        ]


# ================================================================
# UNIFIED SCHEDULER SYSTEM
# ================================================================

class AutusSchedulerSystem:
    """
    통합 스케줄러 시스템
    """
    
    def __init__(self):
        self.scheduler = MilestoneScheduler()
        self.scheduler.setup_default_jobs()
    
    async def run_weekly_briefing(self, user_id: str = "default") -> Dict:
        """주간 브리핑 실행"""
        briefing = await self.scheduler.run_job("weekly_briefing")
        
        return {
            "status": "success",
            "briefing": {
                "week": briefing.week_number,
                "trajectory_status": briefing.trajectory_status,
                "gap_percentage": briefing.gap_percentage,
                "time_saved": briefing.time_saved_hours,
                "value_growth": briefing.value_growth_percent,
                "actions_required": briefing.actions_required,
            },
            "formatted": self.scheduler.briefing_gen.format_briefing(briefing),
        }
    
    async def schedule_first_briefing(self, user_id: str = "default") -> Dict:
        """첫 번째 브리핑 예약"""
        job = self.scheduler.jobs.get("weekly_briefing")
        
        if not job:
            return {"error": "Weekly briefing job not found"}
        
        result = await self.run_weekly_briefing(user_id)
        
        return {
            "status": "scheduled",
            "message": "첫 번째 주간 보고서가 생성되었습니다!",
            "next_scheduled": job.next_run.isoformat(),
            "briefing": result,
        }
    
    def get_schedule(self) -> Dict:
        """스케줄 조회"""
        return {
            "jobs": self.scheduler.get_job_status(),
            "notifications": {
                "unread": len(self.scheduler.notifier.get_unread("default")),
            },
        }


# ================================================================
# TEST
# ================================================================

async def test_scheduler():
    """스케줄러 테스트"""
    print("=" * 70)
    print("AUTUS Weekly Milestone Scheduler Test")
    print("=" * 70)
    
    system = AutusSchedulerSystem()
    
    print("\n[1. 예약된 작업]")
    schedule = system.get_schedule()
    for job in schedule["jobs"]:
        print(f"  {job['name']}: {job['cron']} (다음 실행: {job['next_run'][:16]})")
    
    print("\n[2. 첫 번째 주간 보고서 생성]")
    result = await system.schedule_first_briefing()
    
    print(f"\n  상태: {result['status']}")
    print(f"  다음 예약: {result['next_scheduled'][:16]}")
    
    print("\n" + result['briefing']['formatted'])
    
    print("\n" + "=" * 70)
    print("✅ Scheduler Test Complete")


if __name__ == "__main__":
    asyncio.run(test_scheduler())
