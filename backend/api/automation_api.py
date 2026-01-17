"""
═══════════════════════════════════════════════════════════════════════════════

                    AUTUS 자동화 & 경고 API
                    
    DAROE 5단계 자동화 루프 + 경고 시스템
    
    엔드포인트:
    - GET  /automation/tasks/{entity_id}      자동화 태스크 목록
    - POST /automation/approve/{task_id}      태스크 승인
    - POST /automation/reject/{task_id}       태스크 거절
    - GET  /automation/phases                 5단계 정보
    - GET  /alerts/{entity_id}               경고 목록
    - POST /alerts/acknowledge/{alert_id}    경고 확인
    
═══════════════════════════════════════════════════════════════════════════════
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import uuid

router = APIRouter(tags=["Automation & Alerts"])


# ═══════════════════════════════════════════════════════════════════════════════
# Enums & Models
# ═══════════════════════════════════════════════════════════════════════════════

class LoopPhase(str, Enum):
    DISCOVERY = "DISCOVERY"
    ANALYSIS = "ANALYSIS"
    REDESIGN = "REDESIGN"
    OPTIMIZE = "OPTIMIZE"
    ELIMINATE = "ELIMINATE"


class TaskStatus(str, Enum):
    OBSERVED = "OBSERVED"
    ANALYZED = "ANALYZED"
    SUGGESTED = "SUGGESTED"
    AUTOMATING = "AUTOMATING"
    AUTOMATED = "AUTOMATED"
    ELIMINATED = "ELIMINATED"
    REJECTED = "REJECTED"


class AlertSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


PHASE_INFO = {
    "DISCOVERY": {
        "order": 1,
        "name": "Discovery",
        "name_ko": "발견",
        "agent": "The Scribe",
        "emoji": "📜",
        "meaning": "질량 관측",
        "description": "48노드 및 업무의 질량(M) 및 에너지 상태(E) 스캔",
        "color": "from-blue-500 to-blue-600",
    },
    "ANALYSIS": {
        "order": 2,
        "name": "Analysis",
        "name_ko": "분석",
        "agent": "The Demon",
        "emoji": "🔮",
        "meaning": "궤적 판별",
        "description": "K, I, Ω 상수를 통한 결정론적 미래 계산",
        "color": "from-purple-500 to-purple-600",
    },
    "REDESIGN": {
        "order": 3,
        "name": "Redesign",
        "name_ko": "재설계",
        "agent": "The Architect",
        "emoji": "📐",
        "meaning": "중력 보정",
        "description": "비효율 노드 방출, 최적 궤도로 재배치, 자동화",
        "color": "from-amber-500 to-amber-600",
    },
    "OPTIMIZE": {
        "order": 4,
        "name": "Optimize",
        "name_ko": "최적화",
        "agent": "The Tuner",
        "emoji": "🎛️",
        "meaning": "미세 조정",
        "description": "실시간 피드백 루프, δ 주입, I-지수 증폭",
        "color": "from-emerald-500 to-emerald-600",
    },
    "ELIMINATE": {
        "order": 5,
        "name": "Eliminate",
        "name_ko": "제거",
        "agent": "The Reaper",
        "emoji": "💀",
        "meaning": "자연 소멸",
        "description": "임계치 미달 노드의 중력을 0으로 수렴, 영구 격리",
        "color": "from-rose-500 to-rose-600",
    },
}


class Task(BaseModel):
    """자동화 태스크"""
    id: str
    entity_id: str
    name: str
    description: str
    phase: LoopPhase
    status: TaskStatus
    automation_score: float = Field(ge=0, le=1, description="자동화 가능성 점수")
    savings: float = Field(ge=0, description="예상 절감 시간 (분/주)")
    frequency: int = Field(ge=0, description="주당 발생 횟수")
    avg_duration: int = Field(ge=0, description="평균 소요 시간 (분)")
    category: str = ""
    created_at: datetime
    updated_at: datetime


class Alert(BaseModel):
    """경고"""
    id: str
    entity_id: str
    severity: AlertSeverity
    title: str
    message: str
    source: str = ""
    metric: Optional[str] = None
    current_value: Optional[float] = None
    threshold: Optional[float] = None
    acknowledged: bool = False
    created_at: datetime
    acknowledged_at: Optional[datetime] = None


class TasksResponse(BaseModel):
    """태스크 목록 응답"""
    entity_id: str
    total_tasks: int
    by_phase: Dict[str, int]
    by_status: Dict[str, int]
    total_savings: float
    tasks: List[Task]


class AlertsResponse(BaseModel):
    """경고 목록 응답"""
    entity_id: str
    total_alerts: int
    unacknowledged: int
    by_severity: Dict[str, int]
    alerts: List[Alert]


# ═══════════════════════════════════════════════════════════════════════════════
# 메모리 저장소 (실제 환경에서는 DB로 대체)
# ═══════════════════════════════════════════════════════════════════════════════

_tasks: Dict[str, List[Task]] = {}
_alerts: Dict[str, List[Alert]] = {}


def get_or_create_tasks(entity_id: str) -> List[Task]:
    """태스크 목록 조회 또는 샘플 생성"""
    if entity_id not in _tasks:
        # 샘플 태스크 생성
        now = datetime.now()
        _tasks[entity_id] = [
            Task(
                id=str(uuid.uuid4()),
                entity_id=entity_id,
                name="이메일 분류",
                description="수신 이메일을 자동으로 분류하고 우선순위 태깅",
                phase=LoopPhase.ANALYSIS,
                status=TaskStatus.SUGGESTED,
                automation_score=0.85,
                savings=120,
                frequency=50,
                avg_duration=3,
                category="WORK",
                created_at=now,
                updated_at=now,
            ),
            Task(
                id=str(uuid.uuid4()),
                entity_id=entity_id,
                name="회의 일정 조율",
                description="참석자 일정 확인 및 최적 시간 자동 제안",
                phase=LoopPhase.REDESIGN,
                status=TaskStatus.ANALYZED,
                automation_score=0.72,
                savings=60,
                frequency=10,
                avg_duration=15,
                category="TIME",
                created_at=now,
                updated_at=now,
            ),
            Task(
                id=str(uuid.uuid4()),
                entity_id=entity_id,
                name="주간 보고서 작성",
                description="활동 데이터 기반 자동 보고서 생성",
                phase=LoopPhase.DISCOVERY,
                status=TaskStatus.OBSERVED,
                automation_score=0.60,
                savings=90,
                frequency=1,
                avg_duration=60,
                category="WORK",
                created_at=now,
                updated_at=now,
            ),
        ]
    return _tasks[entity_id]


def get_or_create_alerts(entity_id: str) -> List[Alert]:
    """경고 목록 조회 또는 샘플 생성"""
    if entity_id not in _alerts:
        now = datetime.now()
        _alerts[entity_id] = [
            Alert(
                id=str(uuid.uuid4()),
                entity_id=entity_id,
                severity=AlertSeverity.HIGH,
                title="K-지수 급락 감지",
                message="최근 7일간 K-지수가 -0.15 하락했습니다. TIME 도메인 점검이 필요합니다.",
                source="KI_MONITOR",
                metric="k_index",
                current_value=-0.35,
                threshold=-0.3,
                acknowledged=False,
                created_at=now,
            ),
            Alert(
                id=str(uuid.uuid4()),
                entity_id=entity_id,
                severity=AlertSeverity.MEDIUM,
                title="빈 슬롯 경고",
                message="MENTOR 관계 슬롯이 모두 비어있습니다. 성장 궤도에 영향을 줄 수 있습니다.",
                source="SLOT_SCANNER",
                metric="empty_slots",
                current_value=12,
                threshold=6,
                acknowledged=False,
                created_at=now,
            ),
        ]
    return _alerts[entity_id]


# ═══════════════════════════════════════════════════════════════════════════════
# 자동화 API
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/automation/tasks/{entity_id}", response_model=TasksResponse)
async def get_automation_tasks(
    entity_id: str,
    phase: Optional[LoopPhase] = None,
    status: Optional[TaskStatus] = None,
):
    """
    엔티티의 자동화 태스크 목록 조회
    
    DAROE 5단계에 따라 분류된 태스크 목록
    """
    tasks = get_or_create_tasks(entity_id)
    
    # 필터링
    filtered = tasks
    if phase:
        filtered = [t for t in filtered if t.phase == phase]
    if status:
        filtered = [t for t in filtered if t.status == status]
    
    # 집계
    by_phase = {}
    by_status = {}
    total_savings = 0.0
    
    for t in tasks:
        by_phase[t.phase.value] = by_phase.get(t.phase.value, 0) + 1
        by_status[t.status.value] = by_status.get(t.status.value, 0) + 1
        total_savings += t.savings
    
    return TasksResponse(
        entity_id=entity_id,
        total_tasks=len(filtered),
        by_phase=by_phase,
        by_status=by_status,
        total_savings=total_savings,
        tasks=filtered,
    )


@router.post("/automation/approve/{task_id}")
async def approve_task(task_id: str, entity_id: str):
    """
    태스크 승인 (자동화 진행)
    """
    tasks = get_or_create_tasks(entity_id)
    
    for task in tasks:
        if task.id == task_id:
            if task.status == TaskStatus.SUGGESTED:
                task.status = TaskStatus.AUTOMATING
                task.updated_at = datetime.now()
                return {"success": True, "message": "자동화를 시작합니다.", "task": task}
            elif task.status == TaskStatus.AUTOMATING:
                task.status = TaskStatus.AUTOMATED
                task.updated_at = datetime.now()
                return {"success": True, "message": "자동화가 완료되었습니다.", "task": task}
            else:
                raise HTTPException(400, f"현재 상태({task.status.value})에서는 승인할 수 없습니다.")
    
    raise HTTPException(404, "태스크를 찾을 수 없습니다.")


@router.post("/automation/reject/{task_id}")
async def reject_task(task_id: str, entity_id: str, reason: str = ""):
    """
    태스크 거절
    """
    tasks = get_or_create_tasks(entity_id)
    
    for task in tasks:
        if task.id == task_id:
            task.status = TaskStatus.REJECTED
            task.updated_at = datetime.now()
            return {"success": True, "message": "태스크가 거절되었습니다.", "reason": reason, "task": task}
    
    raise HTTPException(404, "태스크를 찾을 수 없습니다.")


@router.get("/automation/phases")
async def get_automation_phases():
    """
    DAROE 5단계 정보 조회
    """
    return {
        "total_phases": 5,
        "name": "DAROE",
        "full_name": "Discovery → Analysis → Redesign → Optimize → Eliminate",
        "phases": list(PHASE_INFO.values()),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 경고 API
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/alerts/{entity_id}", response_model=AlertsResponse)
async def get_alerts(
    entity_id: str,
    severity: Optional[AlertSeverity] = None,
    acknowledged: Optional[bool] = None,
):
    """
    엔티티의 경고 목록 조회
    """
    alerts = get_or_create_alerts(entity_id)
    
    # 필터링
    filtered = alerts
    if severity:
        filtered = [a for a in filtered if a.severity == severity]
    if acknowledged is not None:
        filtered = [a for a in filtered if a.acknowledged == acknowledged]
    
    # 집계
    by_severity = {}
    unacknowledged = 0
    
    for a in alerts:
        by_severity[a.severity.value] = by_severity.get(a.severity.value, 0) + 1
        if not a.acknowledged:
            unacknowledged += 1
    
    # 최신순 정렬
    filtered.sort(key=lambda x: x.created_at, reverse=True)
    
    return AlertsResponse(
        entity_id=entity_id,
        total_alerts=len(filtered),
        unacknowledged=unacknowledged,
        by_severity=by_severity,
        alerts=filtered,
    )


@router.post("/alerts/acknowledge/{alert_id}")
async def acknowledge_alert(alert_id: str, entity_id: str):
    """
    경고 확인 처리
    """
    alerts = get_or_create_alerts(entity_id)
    
    for alert in alerts:
        if alert.id == alert_id:
            alert.acknowledged = True
            alert.acknowledged_at = datetime.now()
            return {"success": True, "message": "경고가 확인되었습니다.", "alert": alert}
    
    raise HTTPException(404, "경고를 찾을 수 없습니다.")


@router.post("/alerts/create")
async def create_alert(
    entity_id: str,
    severity: AlertSeverity,
    title: str,
    message: str,
    source: str = "MANUAL",
):
    """
    수동 경고 생성
    """
    alerts = get_or_create_alerts(entity_id)
    
    new_alert = Alert(
        id=str(uuid.uuid4()),
        entity_id=entity_id,
        severity=severity,
        title=title,
        message=message,
        source=source,
        acknowledged=False,
        created_at=datetime.now(),
    )
    
    alerts.insert(0, new_alert)
    return {"success": True, "alert": new_alert}
