"""
AUTUS × Musk Edition: OTA Update System
Tesla-style 자동 업데이트

"The best part is no part. The best process is no process."
— Elon Musk
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime
import hashlib
import random

router = APIRouter(prefix="/api", tags=["Updates"])


# ═══════════════════════════════════════════════════════════════
# VERSION CONFIGURATION
# ═══════════════════════════════════════════════════════════════

CURRENT_VERSION = "1.2.0"
BUILD_NUMBER = 20250625
ROLLOUT_PERCENTAGE = 75


# ═══════════════════════════════════════════════════════════════
# CHANGELOG
# ═══════════════════════════════════════════════════════════════

CHANGELOG = [
    {
        "version": "1.2.0",
        "date": "2025-06-25",
        "type": "feature",
        "title": "Threshold 자동화 강화",
        "description": "Type 2 결정 90% 자동 실행. 인간 개입 5% 달성.",
        "deletions": [
            "수동 Threshold 슬라이더 제거",
            "상세 물리 뷰 간소화",
            "PDF 내보내기 제거 (사용률 0.8%)"
        ],
        "automations": [
            "Type 2 Door 자동 판단",
            "70% 정보 도달 시 자동 추천",
            "Day 2 경고 자동 발생"
        ],
        "musk_quote": "Delete, delete, delete."
    },
    {
        "version": "1.1.0",
        "date": "2025-06-18",
        "type": "improvement",
        "title": "Loss Velocity 실시간화",
        "description": "WebSocket 기반 초당 업데이트. 새로고침 버튼 삭제.",
        "deletions": [
            "정적 새로고침 버튼 제거",
            "수동 데이터 동기화 제거"
        ],
        "automations": [
            "실시간 스트리밍",
            "자동 알림",
            "백그라운드 연결 복구"
        ],
        "musk_quote": "The best process is no process."
    },
    {
        "version": "1.0.0",
        "date": "2025-06-01",
        "type": "launch",
        "title": "AUTUS Genesis",
        "description": "창업자 1,000명 한정 출시. Decision Physics 시작.",
        "deletions": [],
        "automations": [
            "Core Loop",
            "AUTO 버튼",
            "Physics Engine"
        ],
        "musk_quote": "If you're not embarrassed by the first version, you've launched too late."
    }
]


# ═══════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════

class VersionInfo(BaseModel):
    version: str
    build: int
    release_date: str
    update_available: bool
    update_size_kb: Optional[int] = None
    changelog_summary: str
    rollout_percentage: int
    your_group: str
    is_critical: bool
    human_intervention_current: str


class ChangelogEntry(BaseModel):
    version: str
    date: str
    type: Literal["feature", "improvement", "fix", "launch"]
    title: str
    description: str
    deletions: List[str]
    automations: List[str]
    musk_quote: str


class RolloutStatus(BaseModel):
    version: str
    percentage: int
    started_at: str
    estimated_complete: str
    your_group: Literal["canary", "beta", "stable"]
    eligible: bool


class TelemetryData(BaseModel):
    client_version: str
    device_type: str
    feature_usage: Dict[str, int]
    errors: List[Dict[str, Any]]
    session_duration_sec: int


class DeletionCandidate(BaseModel):
    feature: str
    usage_rate: float
    reason: str
    scheduled_removal: str


class AutomationRoadmapItem(BaseModel):
    version: str
    target: str
    human_intervention_target: str
    eta: str


# ═══════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def get_rollout_group(device_id: str) -> tuple:
    """디바이스 ID 기반 롤아웃 그룹 결정"""
    if device_id:
        hash_val = int(hashlib.md5(device_id.encode()).hexdigest(), 16) % 100
    else:
        hash_val = random.randint(0, 100)
    
    if hash_val < 5:
        group = "canary"  # 최초 5%
    elif hash_val < 25:
        group = "beta"    # 다음 20%
    else:
        group = "stable"  # 나머지 75%
    
    eligible = hash_val < ROLLOUT_PERCENTAGE
    return group, eligible, hash_val


def compare_versions(v1: str, v2: str) -> int:
    """버전 비교: v1 < v2 → -1, v1 == v2 → 0, v1 > v2 → 1"""
    parts1 = [int(x) for x in v1.split('.')]
    parts2 = [int(x) for x in v2.split('.')]
    
    for p1, p2 in zip(parts1, parts2):
        if p1 < p2:
            return -1
        if p1 > p2:
            return 1
    return 0


# ═══════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@router.get("/version", response_model=VersionInfo)
async def get_version(
    client_version: str = Query(default="1.0.0"),
    device_id: str = Query(default=None)
):
    """현재 버전 및 업데이트 정보"""
    
    group, eligible, _ = get_rollout_group(device_id)
    update_available = compare_versions(client_version, CURRENT_VERSION) < 0 and eligible
    
    return VersionInfo(
        version=CURRENT_VERSION,
        build=BUILD_NUMBER,
        release_date="2025-06-25",
        update_available=update_available,
        update_size_kb=1240 if update_available else None,
        changelog_summary=CHANGELOG[0]["title"] if CHANGELOG else "",
        rollout_percentage=ROLLOUT_PERCENTAGE,
        your_group=group,
        is_critical=False,
        human_intervention_current="5%"
    )


@router.get("/changelog", response_model=List[ChangelogEntry])
async def get_changelog(limit: int = Query(default=5, le=20)):
    """변경 로그 조회 - 삭제된 기능 강조"""
    return [ChangelogEntry(**entry) for entry in CHANGELOG[:limit]]


@router.get("/rollout", response_model=RolloutStatus)
async def get_rollout_status(device_id: str = Query(default=None)):
    """롤아웃 상태 확인"""
    
    group, eligible, _ = get_rollout_group(device_id)
    
    return RolloutStatus(
        version=CURRENT_VERSION,
        percentage=ROLLOUT_PERCENTAGE,
        started_at="2025-06-25T00:00:00Z",
        estimated_complete="2025-06-27T00:00:00Z",
        your_group=group,
        eligible=eligible
    )


@router.post("/telemetry")
async def submit_telemetry(data: TelemetryData):
    """
    사용 데이터 수집 (익명)
    Musk 원칙: 사용되지 않는 기능은 삭제
    """
    
    # 사용되지 않는 기능 탐지
    unused_features = [
        feature for feature, count in data.feature_usage.items()
        if count == 0
    ]
    
    # 저사용 기능 탐지 (전체 대비 5% 미만)
    total_usage = sum(data.feature_usage.values()) or 1
    low_usage_features = [
        feature for feature, count in data.feature_usage.items()
        if count / total_usage < 0.05 and count > 0
    ]
    
    return {
        "received": True,
        "session_id": hashlib.md5(f"{data.client_version}:{data.session_duration_sec}".encode()).hexdigest()[:8],
        "unused_features_detected": len(unused_features),
        "low_usage_features": low_usage_features,
        "message": "데이터가 AUTUS 단순화에 기여합니다. 개인 정보 0%.",
        "musk_principle": "Delete first, then simplify, then automate."
    }


# ═══════════════════════════════════════════════════════════════
# MUSK PRINCIPLES API
# ═══════════════════════════════════════════════════════════════

@router.get("/deletion-candidates")
async def get_deletion_candidates():
    """
    삭제 후보 기능 (Musk: Delete first)
    사용률 5% 미만 기능 자동 추출
    """
    
    candidates = [
        DeletionCandidate(
            feature="manual_threshold_slider",
            usage_rate=0.03,
            reason="AUTO 모드가 95% 대체",
            scheduled_removal="v1.3.0"
        ),
        DeletionCandidate(
            feature="detailed_physics_view",
            usage_rate=0.02,
            reason="대부분 요약 뷰만 사용",
            scheduled_removal="v1.4.0"
        ),
        DeletionCandidate(
            feature="export_pdf_report",
            usage_rate=0.008,
            reason="0.8% 사용자만 사용",
            scheduled_removal="v1.3.0"
        ),
        DeletionCandidate(
            feature="brainwave_simulation",
            usage_rate=0.015,
            reason="Neuralink 대기 중, 시뮬레이션 불필요",
            scheduled_removal="v1.5.0"
        ),
        DeletionCandidate(
            feature="manual_data_sync",
            usage_rate=0.001,
            reason="실시간 WebSocket이 100% 대체",
            scheduled_removal="v1.3.0"
        )
    ]
    
    return {
        "philosophy": "The best part is no part. The best process is no process.",
        "candidates": [c.dict() for c in candidates],
        "total_features_removed_ytd": 12,
        "automation_rate_improvement": "+23%",
        "current_feature_count": 47,
        "target_feature_count": 25,
        "musk_quote": "If you're not occasionally deleting requirements, you're not deleting enough."
    }


@router.get("/automation-roadmap")
async def get_automation_roadmap():
    """
    자동화 로드맵 (Musk: No process is the best process)
    목표: 인간 개입 0%
    """
    
    roadmap = [
        AutomationRoadmapItem(
            version="1.3.0",
            target="Type 2 결정 100% 자동화",
            human_intervention_target="3%",
            eta="2025-07-15"
        ),
        AutomationRoadmapItem(
            version="1.5.0",
            target="Threshold 완전 자동화",
            human_intervention_target="1%",
            eta="2025-08-01"
        ),
        AutomationRoadmapItem(
            version="2.0.0",
            target="Full Autonomous Mode",
            human_intervention_target="0.1%",
            eta="2025-10-01"
        ),
        AutomationRoadmapItem(
            version="3.0.0",
            target="Zero Human Override",
            human_intervention_target="0%",
            eta="2026-01-01"
        )
    ]
    
    return {
        "philosophy": "The goal is zero human intervention.",
        "current_human_intervention": "5%",
        "target_human_intervention": "0%",
        "roadmap": [r.dict() for r in roadmap],
        "progress": {
            "started_at": "15%",
            "current": "5%",
            "improvement": "10 percentage points"
        },
        "musk_quote": "Automation should be invisible. The best software does things you didn't even know you needed."
    }


@router.get("/simplification-metrics")
async def get_simplification_metrics():
    """단순화 메트릭 (Musk: Simplify)"""
    
    return {
        "philosophy": "Simplify, simplify, simplify.",
        "metrics": {
            "ui_elements_removed": 34,
            "api_endpoints_consolidated": 8,
            "lines_of_code_deleted": 4523,
            "user_actions_automated": 23,
            "average_task_time_reduction": "67%"
        },
        "before_after": {
            "buttons": {"before": 24, "after": 8, "change": "-67%"},
            "menu_items": {"before": 45, "after": 12, "change": "-73%"},
            "settings": {"before": 67, "after": 15, "change": "-78%"},
            "manual_steps": {"before": 12, "after": 2, "change": "-83%"}
        },
        "musk_quote": "Any requirement should be accompanied by the name of the person who made it. You should never accept that a requirement came from a department."
    }


@router.get("/musk-quotes")
async def get_musk_quotes():
    """Elon Musk 명언 컬렉션 (Delete → Simplify → Automate)"""
    
    quotes = {
        "delete": [
            "The best part is no part.",
            "Delete, delete, delete.",
            "If you're not occasionally deleting requirements, you're not deleting enough.",
            "The most common error of a smart engineer is to optimize something that should not exist."
        ],
        "simplify": [
            "Simplify, simplify, simplify.",
            "The best process is no process.",
            "If the design or process is getting complex, it's wrong.",
            "Any requirement should come with a name attached. No anonymous requirements."
        ],
        "automate": [
            "Automation should be invisible.",
            "The factory is the product.",
            "Production hell is real.",
            "Speed is the ultimate weapon."
        ],
        "general": [
            "If you're not embarrassed by the first version, you've launched too late.",
            "Failure is an option here. If things are not failing, you are not innovating enough.",
            "When something is important enough, you do it even if the odds are not in your favor."
        ]
    }
    
    return {
        "categories": quotes,
        "total_quotes": sum(len(v) for v in quotes.values()),
        "principle_order": ["delete", "simplify", "automate"]
    }
