"""
AUTUS v1.0 Physics-Only
업무 유형별 물리 상수 범위 테이블 (Initial Ranges)

설계 원칙:
- 보수적 시작: RING에서 대부분 흡수
- LOCK 희소: 고위험·고비가역만
- UI 비노출: 체감만 존재
"""

from dataclasses import dataclass
from enum import Enum
from typing import Tuple

# ============================================
# 물리 상수 범위 정의
# ============================================

@dataclass(frozen=True)
class ConstantRange:
    """불변 상수 범위"""
    min: float
    max: float
    
    def contains(self, value: float) -> bool:
        return self.min <= value <= self.max
    
    def midpoint(self) -> float:
        return (self.min + self.max) / 2


@dataclass(frozen=True)
class TaskPhysicsProfile:
    """업무 유형별 물리 프로파일 (불변)"""
    M: ConstantRange      # Mass (질량)
    Psi: ConstantRange    # Irreversibility (비가역성)
    R: ConstantRange      # Responsibility Radius (책임 반경)
    F0: ConstantRange     # Failure Floor (실패 바닥)
    gate_intent: str      # 판정 의도 (내부 참고용)


# ============================================
# 업무 유형 Enum
# ============================================

class TaskType(Enum):
    """업무 유형 (v1.0 고정)"""
    DAILY_OPS = "daily_ops"           # 일상 운영 (점검/보고)
    CUSTOMER_FIELD = "customer_field" # 고객 대응/현장 실행
    RESOURCE_SCHEDULE = "resource_schedule"  # 자원 배치/일정 조정
    COST_CONTRACT = "cost_contract"   # 비용/계약 경미 변경
    REGULATORY = "regulatory"         # 규제/법무 영향
    STRUCTURE_ORG = "structure_org"   # 구조/조직 변경
    CAPITAL_OWNERSHIP = "capital_ownership"  # 자본/소유권 핵심


# ============================================
# 물리 상수 범위 테이블 (v1.0 고정)
# ============================================

TASK_PHYSICS_TABLE: dict[TaskType, TaskPhysicsProfile] = {
    
    # 일상 운영 (점검/보고) - PASS 다수
    TaskType.DAILY_OPS: TaskPhysicsProfile(
        M=ConstantRange(1.0, 2.5),
        Psi=ConstantRange(0.05, 0.15),
        R=ConstantRange(0.5, 1.5),
        F0=ConstantRange(0.5, 1.0),
        gate_intent="PASS 다수"
    ),
    
    # 고객 대응/현장 실행 - RING 흡수
    TaskType.CUSTOMER_FIELD: TaskPhysicsProfile(
        M=ConstantRange(2.0, 4.0),
        Psi=ConstantRange(0.10, 0.25),
        R=ConstantRange(1.0, 2.5),
        F0=ConstantRange(1.0, 2.0),
        gate_intent="RING 흡수"
    ),
    
    # 자원 배치/일정 조정 - RING→BOUNCE
    TaskType.RESOURCE_SCHEDULE: TaskPhysicsProfile(
        M=ConstantRange(3.0, 5.5),
        Psi=ConstantRange(0.20, 0.40),
        R=ConstantRange(2.0, 4.0),
        F0=ConstantRange(1.5, 3.0),
        gate_intent="RING→BOUNCE"
    ),
    
    # 비용/계약 경미 변경 - BOUNCE 빈발
    TaskType.COST_CONTRACT: TaskPhysicsProfile(
        M=ConstantRange(4.5, 6.5),
        Psi=ConstantRange(0.35, 0.55),
        R=ConstantRange(3.0, 5.0),
        F0=ConstantRange(3.0, 5.0),
        gate_intent="BOUNCE 빈발"
    ),
    
    # 규제/법무 영향 - BOUNCE→LOCK
    TaskType.REGULATORY: TaskPhysicsProfile(
        M=ConstantRange(6.0, 8.0),
        Psi=ConstantRange(0.55, 0.75),
        R=ConstantRange(4.0, 7.0),
        F0=ConstantRange(5.0, 7.0),
        gate_intent="BOUNCE→LOCK"
    ),
    
    # 구조/조직 변경 - LOCK 희소
    TaskType.STRUCTURE_ORG: TaskPhysicsProfile(
        M=ConstantRange(7.5, 9.0),
        Psi=ConstantRange(0.70, 0.90),
        R=ConstantRange(6.0, 9.0),
        F0=ConstantRange(6.0, 8.5),
        gate_intent="LOCK 희소"
    ),
    
    # 자본/소유권 핵심 - LOCK 중심
    TaskType.CAPITAL_OWNERSHIP: TaskPhysicsProfile(
        M=ConstantRange(8.5, 10.0),
        Psi=ConstantRange(0.85, 1.00),
        R=ConstantRange(7.5, 10.0),
        F0=ConstantRange(8.0, 10.0),
        gate_intent="LOCK 중심"
    ),
}


# ============================================
# 운영 가드
# ============================================

# 범위 수정 쿨다운 (24시간)
RANGE_MODIFICATION_COOLDOWN_HOURS = 24

# 현재 테이블 버전
PHYSICS_TABLE_VERSION = "phys-const-v1.0"


def get_physics_profile(task_type: TaskType) -> TaskPhysicsProfile:
    """
    업무 유형에 따른 물리 프로파일 반환
    
    규칙:
    - 유형 간 중첩 허용 (현실 반영)
    - 사용자/AI 직접 수정 불가
    """
    return TASK_PHYSICS_TABLE[task_type]


def validate_constants(
    task_type: TaskType,
    M: float,
    Psi: float,
    R: float,
    F0: float
) -> bool:
    """
    주어진 상수가 해당 업무 유형 범위 내인지 검증
    """
    profile = get_physics_profile(task_type)
    return (
        profile.M.contains(M) and
        profile.Psi.contains(Psi) and
        profile.R.contains(R) and
        profile.F0.contains(F0)
    )


def get_default_constants(task_type: TaskType) -> dict:
    """
    업무 유형의 기본 상수 (중간값) 반환
    """
    profile = get_physics_profile(task_type)
    return {
        "M": profile.M.midpoint(),
        "Psi": profile.Psi.midpoint(),
        "R": profile.R.midpoint(),
        "F0": profile.F0.midpoint(),
        "version": PHYSICS_TABLE_VERSION
    }


# ============================================
# 공통 범위 정의 (참고용)
# ============================================

GLOBAL_RANGES = {
    "M": ConstantRange(0.0, 10.0),    # Mass
    "Psi": ConstantRange(0.00, 1.00), # Irreversibility
    "R": ConstantRange(0.0, 10.0),    # Responsibility Radius
    "F0": ConstantRange(0.0, 10.0),   # Failure Floor
}
