"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS TypeDB 스키마 정의 (최적화 버전)
TypeDB Schema with Indexes for Performance
═══════════════════════════════════════════════════════════════════════════════

인덱스 적용 속성:
- name @index
- code @index
- level @index
- automation-level @index
- is-deleted @index
- k-value @index
"""

AUTUS_SCHEMA = """
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS TypeDB Schema v2.0 (2026 최적화)
# ═══════════════════════════════════════════════════════════════════════════════

define

# ───────────────────────────────────────────────────────────────────────────────
# 기본 속성 (인덱스 적용)
# ───────────────────────────────────────────────────────────────────────────────

# 식별자
name sub attribute, value string, @index;
code sub attribute, value string, @index;
description sub attribute, value string;

# 분류 (5차 계층)
level sub attribute, value string, @index;
parent-code sub attribute, value string;

# K/I/r 물리 상수
k-value sub attribute, value double, @index;
i-value sub attribute, value double;
r-value sub attribute, value double;

# 자동화
automation-level sub attribute, value double, @index;
energy-cost sub attribute, value double;

# 상태
is-deleted sub attribute, value boolean, @index;
is-active sub attribute, value boolean;
status sub attribute, value string;

# 메타데이터
created-at sub attribute, value datetime;
updated-at sub attribute, value datetime;
deleted-at sub attribute, value datetime;

# 영향도
k-delta sub attribute, value double;
i-delta sub attribute, value double;
impact-score sub attribute, value double;

# 사용자 타입
user-type sub attribute, value string;

# ───────────────────────────────────────────────────────────────────────────────
# 엔티티
# ───────────────────────────────────────────────────────────────────────────────

# 업무 (Task) - 570개 마스터 + 사용자별 인스턴스
task sub entity,
    owns name @key,
    owns code,
    owns description,
    owns level,
    owns parent-code,
    owns k-value,
    owns i-value,
    owns r-value,
    owns automation-level,
    owns energy-cost,
    owns is-deleted,
    owns is-active,
    owns status,
    owns created-at,
    owns updated-at,
    owns deleted-at,
    plays hierarchy:parent,
    plays hierarchy:child,
    plays impact-relation:source-task,
    plays impact-relation:target-task,
    plays task-assignment:assigned-task;

# 사용자 (Entity) - 개인/팀/기업/국가
entity-profile sub entity,
    owns name @key,
    owns code,
    owns user-type,
    owns k-value,
    owns i-value,
    owns r-value,
    owns created-at,
    owns updated-at,
    plays task-assignment:assignee;

# 솔루션 모듈 (30개)
solution-module sub entity,
    owns name @key,
    owns code,
    owns description,
    owns k-value,
    owns i-value,
    owns automation-level,
    owns is-active,
    plays module-dependency:dependent,
    plays module-dependency:dependency;

# 원자 모듈 (30개)
atomic-module sub entity,
    owns name @key,
    owns code,
    owns description,
    owns k-value,
    owns i-value,
    owns energy-cost,
    plays pipeline-step:step-module;

# 파이프라인
pipeline sub entity,
    owns name @key,
    owns code,
    owns description,
    owns k-value,
    owns i-value,
    owns is-active,
    plays pipeline-step:pipeline-owner;

# ───────────────────────────────────────────────────────────────────────────────
# 관계
# ───────────────────────────────────────────────────────────────────────────────

# 계층 관계 (L1 → L2 → L3 → L4 → L5)
hierarchy sub relation,
    relates parent,
    relates child;

# 영향 관계 (업무 간 K/I 영향)
impact-relation sub relation,
    relates source-task,
    relates target-task,
    owns k-delta,
    owns i-delta,
    owns impact-score;

# 업무 할당 (사용자 → 업무)
task-assignment sub relation,
    relates assignee,
    relates assigned-task,
    owns automation-level,
    owns k-value,
    owns i-value,
    owns status;

# 모듈 의존성
module-dependency sub relation,
    relates dependent,
    relates dependency;

# 파이프라인 단계
pipeline-step sub relation,
    relates pipeline-owner,
    relates step-module,
    owns status;

# ───────────────────────────────────────────────────────────────────────────────
# 규칙 (추론)
# ───────────────────────────────────────────────────────────────────────────────

# 규칙: 삭제 대상 (automation-level >= 0.98)
rule deletion-candidate:
    when {
        $t isa task,
            has automation-level >= 0.98,
            has is-deleted false;
    } then {
        $t has status "DELETION_CANDIDATE";
    };

# 규칙: 고위험 업무 (K < 1.0 AND automation-level < 0.5)
rule high-risk-task:
    when {
        $t isa task,
            has k-value < 1.0,
            has automation-level < 0.5,
            has is-deleted false;
    } then {
        $t has status "HIGH_RISK";
    };

# 규칙: 쇠퇴 업무 (r < -0.05)
rule decaying-task:
    when {
        $t isa task,
            has r-value < -0.05,
            has is-deleted false;
    } then {
        $t has status "DECAYING";
    };
"""

# ═══════════════════════════════════════════════════════════════════════════════
# 초기 데이터 (570개 업무 샘플)
# ═══════════════════════════════════════════════════════════════════════════════

SAMPLE_DATA_QUERIES = [
    # L1 레벨 (8개 도메인)
    """
    insert
    $t1 isa task,
        has name "Finance & Accounting",
        has code "FIN",
        has level "L1",
        has k-value 1.0,
        has i-value 0.0,
        has r-value 0.0,
        has automation-level 0.0,
        has is-deleted false,
        has is-active true;
    """,
    """
    insert
    $t2 isa task,
        has name "Human Resources",
        has code "HR",
        has level "L1",
        has k-value 1.0,
        has i-value 0.0,
        has r-value 0.0,
        has automation-level 0.0,
        has is-deleted false,
        has is-active true;
    """,
    """
    insert
    $t3 isa task,
        has name "Sales & Customer",
        has code "SALES",
        has level "L1",
        has k-value 1.0,
        has i-value 0.0,
        has r-value 0.0,
        has automation-level 0.0,
        has is-deleted false,
        has is-active true;
    """,
    # L2 샘플
    """
    insert
    $t isa task,
        has name "Accounts Receivable",
        has code "FIN.AR",
        has level "L2",
        has parent-code "FIN",
        has k-value 0.95,
        has automation-level 0.6,
        has is-deleted false;
    """,
    """
    insert
    $t isa task,
        has name "Accounts Payable",
        has code "FIN.AP",
        has level "L2",
        has parent-code "FIN",
        has k-value 0.9,
        has automation-level 0.7,
        has is-deleted false;
    """,
    # L3 샘플 (삭제 대상 - 자동화율 98%+)
    """
    insert
    $t isa task,
        has name "Invoice Auto-Generation",
        has code "FIN.AR.INV.AUTO",
        has level "L3",
        has parent-code "FIN.AR",
        has k-value 1.1,
        has automation-level 0.99,
        has is-deleted false;
    """,
    """
    insert
    $t isa task,
        has name "Recurring Invoice Processing",
        has code "FIN.AR.INV.REC",
        has level "L3",
        has parent-code "FIN.AR",
        has k-value 1.2,
        has automation-level 0.98,
        has is-deleted false;
    """,
    # 고위험 업무 샘플 (K < 1.0, automation < 0.5)
    """
    insert
    $t isa task,
        has name "Manual Contract Review",
        has code "LEGAL.CONTRACT.MANUAL",
        has level "L3",
        has k-value 0.7,
        has automation-level 0.2,
        has is-deleted false;
    """,
]


def get_schema() -> str:
    """스키마 반환"""
    return AUTUS_SCHEMA


def get_sample_data() -> list:
    """샘플 데이터 반환"""
    return SAMPLE_DATA_QUERIES
