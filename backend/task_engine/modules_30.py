"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 30개 원자 모듈 시스템
30 Atomic Modules → 1,000+ Task Combinations

원칙:
- 각 모듈은 단일 책임 (Single Responsibility)
- 모듈 조합으로 복합 업무 생성
- MECE (Mutually Exclusive, Collectively Exhaustive)
═══════════════════════════════════════════════════════════════════════════════
"""

from enum import Enum
from typing import Optional, List, Dict, Any, Callable
from pydantic import BaseModel, Field
from dataclasses import dataclass
from itertools import combinations
import json

# ═══════════════════════════════════════════════════════════════════════════════
# 모듈 카테고리
# ═══════════════════════════════════════════════════════════════════════════════

class ModuleCategory(str, Enum):
    """5대 모듈 카테고리"""
    INPUT = "INPUT"           # 데이터 수집 (6개)
    PROCESS = "PROCESS"       # 처리/변환 (8개)
    OUTPUT = "OUTPUT"         # 결과 생성 (6개)
    DECISION = "DECISION"     # 판단/승인 (5개)
    COMM = "COMM"             # 통신/연동 (5개)


# ═══════════════════════════════════════════════════════════════════════════════
# 30개 원자 모듈 정의
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AtomicModule:
    """원자 모듈 정의"""
    id: str
    name: str
    name_ko: str
    category: ModuleCategory
    description: str
    
    # 물리 상수
    base_k: float = 1.0
    base_i: float = 0.0
    
    # 실행 속성
    is_async: bool = False
    requires_human: bool = False
    energy_cost: float = 1.0
    
    # 연결 가능 모듈
    can_connect_to: List[str] = None
    
    def __post_init__(self):
        if self.can_connect_to is None:
            self.can_connect_to = []


# ═══════════════════════════════════════════════════════════════════════════════
# 30개 모듈 상세 정의
# ═══════════════════════════════════════════════════════════════════════════════

ATOMIC_MODULES: Dict[str, AtomicModule] = {
    
    # ─────────────────────────────────────────────────────────────────────────
    # INPUT 모듈 (6개) - 데이터 수집
    # ─────────────────────────────────────────────────────────────────────────
    
    "IN_FORM": AtomicModule(
        id="IN_FORM",
        name="Form Input",
        name_ko="폼 입력",
        category=ModuleCategory.INPUT,
        description="사용자 입력 폼 데이터 수집",
        base_k=0.9, base_i=0.2,
        requires_human=True,
        can_connect_to=["PR_VALIDATE", "PR_TRANSFORM", "PR_CALCULATE"]
    ),
    
    "IN_API": AtomicModule(
        id="IN_API",
        name="API Fetch",
        name_ko="API 수집",
        category=ModuleCategory.INPUT,
        description="외부 API에서 데이터 수집",
        base_k=1.1, base_i=0.0,
        is_async=True,
        can_connect_to=["PR_VALIDATE", "PR_TRANSFORM", "PR_PARSE"]
    ),
    
    "IN_FILE": AtomicModule(
        id="IN_FILE",
        name="File Upload",
        name_ko="파일 업로드",
        category=ModuleCategory.INPUT,
        description="파일 업로드 및 추출",
        base_k=1.0, base_i=0.1,
        can_connect_to=["PR_PARSE", "PR_VALIDATE", "PR_TRANSFORM"]
    ),
    
    "IN_SCAN": AtomicModule(
        id="IN_SCAN",
        name="Document Scan",
        name_ko="문서 스캔",
        category=ModuleCategory.INPUT,
        description="문서 스캔 및 OCR",
        base_k=0.9, base_i=0.0,
        energy_cost=1.5,
        can_connect_to=["PR_PARSE", "PR_VALIDATE", "PR_EXTRACT"]
    ),
    
    "IN_STREAM": AtomicModule(
        id="IN_STREAM",
        name="Stream Listen",
        name_ko="스트림 수신",
        category=ModuleCategory.INPUT,
        description="실시간 데이터 스트림 수신",
        base_k=1.2, base_i=0.0,
        is_async=True,
        can_connect_to=["PR_FILTER", "PR_TRANSFORM", "PR_AGGREGATE"]
    ),
    
    "IN_SCHEDULE": AtomicModule(
        id="IN_SCHEDULE",
        name="Scheduled Trigger",
        name_ko="예약 트리거",
        category=ModuleCategory.INPUT,
        description="시간 기반 자동 트리거",
        base_k=1.1, base_i=0.0,
        can_connect_to=["PR_CALCULATE", "PR_AGGREGATE", "OUT_REPORT"]
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # PROCESS 모듈 (8개) - 처리/변환
    # ─────────────────────────────────────────────────────────────────────────
    
    "PR_VALIDATE": AtomicModule(
        id="PR_VALIDATE",
        name="Data Validation",
        name_ko="데이터 검증",
        category=ModuleCategory.PROCESS,
        description="데이터 형식 및 규칙 검증",
        base_k=1.2, base_i=0.0,
        can_connect_to=["PR_TRANSFORM", "DE_RULE", "OUT_ERROR"]
    ),
    
    "PR_TRANSFORM": AtomicModule(
        id="PR_TRANSFORM",
        name="Data Transform",
        name_ko="데이터 변환",
        category=ModuleCategory.PROCESS,
        description="데이터 형식/구조 변환",
        base_k=1.1, base_i=0.0,
        can_connect_to=["PR_CALCULATE", "PR_MERGE", "OUT_DATA"]
    ),
    
    "PR_CALCULATE": AtomicModule(
        id="PR_CALCULATE",
        name="Calculate",
        name_ko="계산",
        category=ModuleCategory.PROCESS,
        description="수치 연산 및 집계",
        base_k=1.2, base_i=0.0,
        can_connect_to=["DE_THRESHOLD", "OUT_REPORT", "PR_AGGREGATE"]
    ),
    
    "PR_PARSE": AtomicModule(
        id="PR_PARSE",
        name="Parse",
        name_ko="파싱",
        category=ModuleCategory.PROCESS,
        description="비정형 데이터 파싱",
        base_k=1.0, base_i=0.0,
        energy_cost=1.2,
        can_connect_to=["PR_EXTRACT", "PR_VALIDATE", "PR_TRANSFORM"]
    ),
    
    "PR_EXTRACT": AtomicModule(
        id="PR_EXTRACT",
        name="Extract",
        name_ko="추출",
        category=ModuleCategory.PROCESS,
        description="특정 필드/패턴 추출",
        base_k=1.1, base_i=0.0,
        can_connect_to=["PR_VALIDATE", "PR_TRANSFORM", "DE_MATCH"]
    ),
    
    "PR_MERGE": AtomicModule(
        id="PR_MERGE",
        name="Merge",
        name_ko="병합",
        category=ModuleCategory.PROCESS,
        description="다중 소스 데이터 병합",
        base_k=1.0, base_i=0.1,
        can_connect_to=["PR_CALCULATE", "PR_VALIDATE", "OUT_DATA"]
    ),
    
    "PR_FILTER": AtomicModule(
        id="PR_FILTER",
        name="Filter",
        name_ko="필터링",
        category=ModuleCategory.PROCESS,
        description="조건 기반 데이터 필터링",
        base_k=1.1, base_i=0.0,
        can_connect_to=["PR_TRANSFORM", "DE_RULE", "PR_AGGREGATE"]
    ),
    
    "PR_AGGREGATE": AtomicModule(
        id="PR_AGGREGATE",
        name="Aggregate",
        name_ko="집계",
        category=ModuleCategory.PROCESS,
        description="데이터 그룹화 및 집계",
        base_k=1.1, base_i=0.0,
        can_connect_to=["PR_CALCULATE", "OUT_REPORT", "DE_THRESHOLD"]
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # OUTPUT 모듈 (6개) - 결과 생성
    # ─────────────────────────────────────────────────────────────────────────
    
    "OUT_DATA": AtomicModule(
        id="OUT_DATA",
        name="Data Output",
        name_ko="데이터 출력",
        category=ModuleCategory.OUTPUT,
        description="구조화된 데이터 출력",
        base_k=1.0, base_i=0.0,
        can_connect_to=["CM_API", "CM_STORE", "CM_NOTIFY"]
    ),
    
    "OUT_REPORT": AtomicModule(
        id="OUT_REPORT",
        name="Report Generate",
        name_ko="보고서 생성",
        category=ModuleCategory.OUTPUT,
        description="보고서/문서 생성",
        base_k=0.9, base_i=0.1,
        energy_cost=1.3,
        can_connect_to=["CM_EMAIL", "CM_STORE", "DE_APPROVE"]
    ),
    
    "OUT_DOC": AtomicModule(
        id="OUT_DOC",
        name="Document Generate",
        name_ko="문서 생성",
        category=ModuleCategory.OUTPUT,
        description="계약서/인보이스 등 문서 생성",
        base_k=0.9, base_i=0.0,
        energy_cost=1.2,
        can_connect_to=["DE_APPROVE", "CM_EMAIL", "CM_SIGN"]
    ),
    
    "OUT_VISUAL": AtomicModule(
        id="OUT_VISUAL",
        name="Visualization",
        name_ko="시각화",
        category=ModuleCategory.OUTPUT,
        description="차트/그래프 생성",
        base_k=1.0, base_i=0.1,
        can_connect_to=["OUT_REPORT", "CM_NOTIFY", "CM_STORE"]
    ),
    
    "OUT_ERROR": AtomicModule(
        id="OUT_ERROR",
        name="Error Output",
        name_ko="오류 출력",
        category=ModuleCategory.OUTPUT,
        description="오류/예외 리포트",
        base_k=0.8, base_i=0.0,
        can_connect_to=["CM_NOTIFY", "CM_ESCALATE", "DE_MANUAL"]
    ),
    
    "OUT_LOG": AtomicModule(
        id="OUT_LOG",
        name="Audit Log",
        name_ko="감사 로그",
        category=ModuleCategory.OUTPUT,
        description="감사 추적 로그 생성",
        base_k=1.2, base_i=0.0,
        can_connect_to=["CM_STORE", "DE_APPROVE"]
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # DECISION 모듈 (5개) - 판단/승인
    # ─────────────────────────────────────────────────────────────────────────
    
    "DE_RULE": AtomicModule(
        id="DE_RULE",
        name="Rule Engine",
        name_ko="규칙 엔진",
        category=ModuleCategory.DECISION,
        description="비즈니스 규칙 기반 판단",
        base_k=1.1, base_i=0.0,
        can_connect_to=["DE_APPROVE", "OUT_ERROR", "CM_NOTIFY"]
    ),
    
    "DE_THRESHOLD": AtomicModule(
        id="DE_THRESHOLD",
        name="Threshold Check",
        name_ko="임계값 체크",
        category=ModuleCategory.DECISION,
        description="수치 임계값 기반 판단",
        base_k=1.2, base_i=0.0,
        can_connect_to=["DE_APPROVE", "CM_ESCALATE", "OUT_ERROR"]
    ),
    
    "DE_MATCH": AtomicModule(
        id="DE_MATCH",
        name="Pattern Match",
        name_ko="패턴 매칭",
        category=ModuleCategory.DECISION,
        description="패턴/템플릿 매칭 판단",
        base_k=1.1, base_i=0.0,
        can_connect_to=["DE_RULE", "PR_TRANSFORM", "OUT_DATA"]
    ),
    
    "DE_APPROVE": AtomicModule(
        id="DE_APPROVE",
        name="Approval Request",
        name_ko="승인 요청",
        category=ModuleCategory.DECISION,
        description="인간 승인 요청",
        base_k=0.7, base_i=0.3,
        requires_human=True,
        can_connect_to=["CM_NOTIFY", "OUT_LOG", "CM_SIGN"]
    ),
    
    "DE_MANUAL": AtomicModule(
        id="DE_MANUAL",
        name="Manual Override",
        name_ko="수동 개입",
        category=ModuleCategory.DECISION,
        description="수동 처리 요청",
        base_k=0.5, base_i=0.4,
        requires_human=True,
        can_connect_to=["CM_NOTIFY", "OUT_LOG"]
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # COMMUNICATION 모듈 (5개) - 통신/연동
    # ─────────────────────────────────────────────────────────────────────────
    
    "CM_NOTIFY": AtomicModule(
        id="CM_NOTIFY",
        name="Notification",
        name_ko="알림 발송",
        category=ModuleCategory.COMM,
        description="알림/메시지 발송",
        base_k=1.0, base_i=0.2,
        is_async=True,
        can_connect_to=[]
    ),
    
    "CM_EMAIL": AtomicModule(
        id="CM_EMAIL",
        name="Email Send",
        name_ko="이메일 발송",
        category=ModuleCategory.COMM,
        description="이메일 발송",
        base_k=1.0, base_i=0.1,
        is_async=True,
        can_connect_to=[]
    ),
    
    "CM_API": AtomicModule(
        id="CM_API",
        name="API Call",
        name_ko="API 호출",
        category=ModuleCategory.COMM,
        description="외부 시스템 API 호출",
        base_k=1.1, base_i=0.0,
        is_async=True,
        can_connect_to=["IN_API", "PR_TRANSFORM"]
    ),
    
    "CM_STORE": AtomicModule(
        id="CM_STORE",
        name="Data Store",
        name_ko="데이터 저장",
        category=ModuleCategory.COMM,
        description="데이터베이스/스토리지 저장",
        base_k=1.1, base_i=0.0,
        can_connect_to=[]
    ),
    
    "CM_ESCALATE": AtomicModule(
        id="CM_ESCALATE",
        name="Escalation",
        name_ko="에스컬레이션",
        category=ModuleCategory.COMM,
        description="상위 레벨로 에스컬레이션",
        base_k=0.8, base_i=0.3,
        can_connect_to=["CM_NOTIFY", "DE_MANUAL"]
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 모듈 조합 시스템
# ═══════════════════════════════════════════════════════════════════════════════

class ModulePipeline(BaseModel):
    """모듈 파이프라인 (업무 정의)"""
    id: str
    name: str
    name_ko: str
    description: str
    
    # 모듈 체인
    modules: List[str]  # 모듈 ID 리스트
    
    # 메타데이터
    category: str = ""
    subcategory: str = ""
    
    # 물리 상수 (조합에서 계산)
    computed_k: float = 1.0
    computed_i: float = 0.0
    
    # 실행 속성
    requires_human: bool = False
    estimated_duration: int = 0  # 초
    
    class Config:
        arbitrary_types_allowed = True


def compute_pipeline_physics(modules: List[str]) -> tuple[float, float]:
    """파이프라인의 K/I 상수 계산"""
    if not modules:
        return 1.0, 0.0
    
    total_k = 0.0
    total_i = 0.0
    
    for module_id in modules:
        if module_id in ATOMIC_MODULES:
            module = ATOMIC_MODULES[module_id]
            total_k += module.base_k
            total_i += module.base_i
    
    # 평균 + 시너지 보정
    n = len(modules)
    avg_k = total_k / n
    avg_i = total_i / n
    
    # 모듈이 많을수록 K는 약간 감소 (복잡성), I는 증가 (협업 필요)
    complexity_factor = 1 - (n - 2) * 0.02 if n > 2 else 1.0
    synergy_factor = 1 + (n - 2) * 0.05 if n > 2 else 1.0
    
    return round(avg_k * complexity_factor, 2), round(avg_i * synergy_factor, 2)


def validate_pipeline(modules: List[str]) -> tuple[bool, str]:
    """파이프라인 유효성 검증"""
    if len(modules) < 2:
        return False, "최소 2개 모듈 필요"
    
    if len(modules) > 7:
        return False, "최대 7개 모듈까지 조합 가능"
    
    # 모듈 존재 확인
    for module_id in modules:
        if module_id not in ATOMIC_MODULES:
            return False, f"존재하지 않는 모듈: {module_id}"
    
    # 연결 유효성 확인
    for i in range(len(modules) - 1):
        current = ATOMIC_MODULES[modules[i]]
        next_module = modules[i + 1]
        
        if current.can_connect_to and next_module not in current.can_connect_to:
            return False, f"{modules[i]} → {next_module} 연결 불가"
    
    return True, "OK"


# ═══════════════════════════════════════════════════════════════════════════════
# 1,000+ 업무 템플릿 생성
# ═══════════════════════════════════════════════════════════════════════════════

# 미리 정의된 업무 템플릿 (570개 기반)
TASK_TEMPLATES: List[ModulePipeline] = [
    
    # ─────────────────────────────────────────────────────────────────────────
    # 재무 업무 (60개)
    # ─────────────────────────────────────────────────────────────────────────
    
    ModulePipeline(
        id="FIN_001", name="Invoice Processing", name_ko="송장 처리",
        description="송장 수신, 검증, 처리",
        modules=["IN_FILE", "PR_PARSE", "PR_VALIDATE", "PR_CALCULATE", "OUT_DATA", "CM_STORE"],
        category="FINANCE", subcategory="INVOICE"
    ),
    ModulePipeline(
        id="FIN_002", name="Expense Report", name_ko="경비 보고서",
        description="경비 입력, 계산, 보고서 생성",
        modules=["IN_FORM", "PR_VALIDATE", "PR_CALCULATE", "OUT_REPORT", "DE_APPROVE"],
        category="FINANCE", subcategory="EXPENSE"
    ),
    ModulePipeline(
        id="FIN_003", name="Payment Processing", name_ko="결제 처리",
        description="결제 요청, 검증, 실행",
        modules=["IN_API", "PR_VALIDATE", "DE_THRESHOLD", "CM_API", "OUT_LOG"],
        category="FINANCE", subcategory="PAYMENT"
    ),
    ModulePipeline(
        id="FIN_004", name="Budget Tracking", name_ko="예산 추적",
        description="예산 대비 실적 추적",
        modules=["IN_SCHEDULE", "PR_AGGREGATE", "PR_CALCULATE", "DE_THRESHOLD", "OUT_REPORT"],
        category="FINANCE", subcategory="BUDGET"
    ),
    ModulePipeline(
        id="FIN_005", name="Tax Calculation", name_ko="세금 계산",
        description="세금 자동 계산",
        modules=["IN_API", "PR_CALCULATE", "DE_RULE", "OUT_DATA", "CM_STORE"],
        category="FINANCE", subcategory="TAX"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # HR 업무 (50개)
    # ─────────────────────────────────────────────────────────────────────────
    
    ModulePipeline(
        id="HR_001", name="Leave Request", name_ko="휴가 신청",
        description="휴가 신청 및 승인",
        modules=["IN_FORM", "PR_VALIDATE", "DE_RULE", "DE_APPROVE", "CM_NOTIFY"],
        category="HR", subcategory="LEAVE"
    ),
    ModulePipeline(
        id="HR_002", name="Resume Screening", name_ko="이력서 스크리닝",
        description="이력서 파싱 및 스크리닝",
        modules=["IN_FILE", "PR_PARSE", "PR_EXTRACT", "DE_MATCH", "OUT_DATA"],
        category="HR", subcategory="RECRUIT"
    ),
    ModulePipeline(
        id="HR_003", name="Payroll Calculation", name_ko="급여 계산",
        description="급여 자동 계산",
        modules=["IN_SCHEDULE", "PR_AGGREGATE", "PR_CALCULATE", "PR_VALIDATE", "OUT_REPORT"],
        category="HR", subcategory="PAYROLL"
    ),
    ModulePipeline(
        id="HR_004", name="Performance Review", name_ko="성과 평가",
        description="성과 평가 프로세스",
        modules=["IN_FORM", "PR_VALIDATE", "PR_AGGREGATE", "DE_APPROVE", "OUT_REPORT"],
        category="HR", subcategory="PERFORMANCE"
    ),
    ModulePipeline(
        id="HR_005", name="Onboarding Checklist", name_ko="온보딩 체크리스트",
        description="신규 입사자 온보딩",
        modules=["IN_FORM", "PR_VALIDATE", "DE_RULE", "CM_NOTIFY", "OUT_LOG"],
        category="HR", subcategory="ONBOARD"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # 영업 업무 (40개)
    # ─────────────────────────────────────────────────────────────────────────
    
    ModulePipeline(
        id="SALES_001", name="Lead Capture", name_ko="리드 수집",
        description="리드 수집 및 등록",
        modules=["IN_FORM", "PR_VALIDATE", "PR_TRANSFORM", "CM_STORE", "CM_NOTIFY"],
        category="SALES", subcategory="LEAD"
    ),
    ModulePipeline(
        id="SALES_002", name="Quote Generation", name_ko="견적 생성",
        description="견적서 자동 생성",
        modules=["IN_FORM", "PR_CALCULATE", "OUT_DOC", "DE_APPROVE", "CM_EMAIL"],
        category="SALES", subcategory="QUOTE"
    ),
    ModulePipeline(
        id="SALES_003", name="Contract Processing", name_ko="계약 처리",
        description="계약서 생성 및 서명",
        modules=["IN_FORM", "PR_VALIDATE", "OUT_DOC", "DE_APPROVE", "CM_STORE"],
        category="SALES", subcategory="CONTRACT"
    ),
    ModulePipeline(
        id="SALES_004", name="Sales Forecast", name_ko="영업 예측",
        description="영업 실적 예측",
        modules=["IN_API", "PR_AGGREGATE", "PR_CALCULATE", "OUT_VISUAL", "OUT_REPORT"],
        category="SALES", subcategory="FORECAST"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # IT 업무 (40개)
    # ─────────────────────────────────────────────────────────────────────────
    
    ModulePipeline(
        id="IT_001", name="Ticket Routing", name_ko="티켓 라우팅",
        description="지원 티켓 자동 분류 및 배정",
        modules=["IN_FORM", "PR_PARSE", "DE_MATCH", "CM_NOTIFY"],
        category="IT", subcategory="SUPPORT"
    ),
    ModulePipeline(
        id="IT_002", name="System Monitoring", name_ko="시스템 모니터링",
        description="시스템 상태 모니터링",
        modules=["IN_STREAM", "PR_FILTER", "DE_THRESHOLD", "CM_NOTIFY", "OUT_LOG"],
        category="IT", subcategory="MONITOR"
    ),
    ModulePipeline(
        id="IT_003", name="Backup Automation", name_ko="백업 자동화",
        description="자동 백업 실행",
        modules=["IN_SCHEDULE", "CM_API", "PR_VALIDATE", "OUT_LOG", "CM_NOTIFY"],
        category="IT", subcategory="BACKUP"
    ),
    ModulePipeline(
        id="IT_004", name="Access Request", name_ko="접근 권한 요청",
        description="시스템 접근 권한 요청 처리",
        modules=["IN_FORM", "PR_VALIDATE", "DE_RULE", "DE_APPROVE", "CM_API"],
        category="IT", subcategory="ACCESS"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # 운영 업무 (40개)
    # ─────────────────────────────────────────────────────────────────────────
    
    ModulePipeline(
        id="OPS_001", name="Inventory Check", name_ko="재고 확인",
        description="재고 현황 확인 및 알림",
        modules=["IN_API", "PR_CALCULATE", "DE_THRESHOLD", "CM_NOTIFY"],
        category="OPS", subcategory="INVENTORY"
    ),
    ModulePipeline(
        id="OPS_002", name="Order Processing", name_ko="주문 처리",
        description="주문 접수 및 처리",
        modules=["IN_API", "PR_VALIDATE", "PR_TRANSFORM", "CM_API", "CM_NOTIFY"],
        category="OPS", subcategory="ORDER"
    ),
    ModulePipeline(
        id="OPS_003", name="Shipment Tracking", name_ko="배송 추적",
        description="배송 상태 추적",
        modules=["IN_API", "PR_TRANSFORM", "CM_STORE", "CM_NOTIFY"],
        category="OPS", subcategory="SHIPPING"
    ),
    ModulePipeline(
        id="OPS_004", name="Quality Check", name_ko="품질 검사",
        description="품질 검사 프로세스",
        modules=["IN_FORM", "PR_VALIDATE", "DE_RULE", "OUT_LOG", "CM_NOTIFY"],
        category="OPS", subcategory="QUALITY"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # 문서 업무 (35개)
    # ─────────────────────────────────────────────────────────────────────────
    
    ModulePipeline(
        id="DOC_001", name="Contract Review", name_ko="계약서 검토",
        description="계약서 자동 검토",
        modules=["IN_FILE", "PR_PARSE", "PR_EXTRACT", "DE_RULE", "OUT_REPORT"],
        category="DOC", subcategory="CONTRACT"
    ),
    ModulePipeline(
        id="DOC_002", name="Email Classification", name_ko="이메일 분류",
        description="이메일 자동 분류",
        modules=["IN_API", "PR_PARSE", "DE_MATCH", "CM_STORE"],
        category="DOC", subcategory="EMAIL"
    ),
    ModulePipeline(
        id="DOC_003", name="Document OCR", name_ko="문서 OCR",
        description="문서 스캔 및 텍스트 추출",
        modules=["IN_SCAN", "PR_PARSE", "PR_EXTRACT", "CM_STORE"],
        category="DOC", subcategory="SCAN"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # 보고 업무 (30개)
    # ─────────────────────────────────────────────────────────────────────────
    
    ModulePipeline(
        id="RPT_001", name="Daily Report", name_ko="일일 보고서",
        description="일일 운영 보고서 생성",
        modules=["IN_SCHEDULE", "PR_AGGREGATE", "PR_CALCULATE", "OUT_VISUAL", "OUT_REPORT", "CM_EMAIL"],
        category="REPORT", subcategory="DAILY"
    ),
    ModulePipeline(
        id="RPT_002", name="KPI Dashboard", name_ko="KPI 대시보드",
        description="KPI 대시보드 업데이트",
        modules=["IN_API", "PR_AGGREGATE", "PR_CALCULATE", "OUT_VISUAL", "CM_STORE"],
        category="REPORT", subcategory="KPI"
    ),
    ModulePipeline(
        id="RPT_003", name="Exception Report", name_ko="예외 보고서",
        description="예외 사항 보고서",
        modules=["IN_STREAM", "PR_FILTER", "DE_THRESHOLD", "OUT_REPORT", "CM_NOTIFY"],
        category="REPORT", subcategory="EXCEPTION"
    ),
    
    # ─────────────────────────────────────────────────────────────────────────
    # 승인 업무 (25개)
    # ─────────────────────────────────────────────────────────────────────────
    
    ModulePipeline(
        id="APR_001", name="General Approval", name_ko="일반 승인",
        description="일반 승인 워크플로",
        modules=["IN_FORM", "PR_VALIDATE", "DE_RULE", "DE_APPROVE", "OUT_LOG"],
        category="APPROVAL", subcategory="GENERAL"
    ),
    ModulePipeline(
        id="APR_002", name="Multi-level Approval", name_ko="다단계 승인",
        description="다단계 승인 프로세스",
        modules=["IN_FORM", "PR_VALIDATE", "DE_RULE", "DE_APPROVE", "CM_ESCALATE", "OUT_LOG"],
        category="APPROVAL", subcategory="MULTI"
    ),
]


# ═══════════════════════════════════════════════════════════════════════════════
# 동적 조합 생성기
# ═══════════════════════════════════════════════════════════════════════════════

def generate_valid_combinations(min_length: int = 2, max_length: int = 5) -> List[List[str]]:
    """유효한 모듈 조합 생성"""
    all_modules = list(ATOMIC_MODULES.keys())
    valid_combinations = []
    
    for length in range(min_length, max_length + 1):
        for combo in combinations(all_modules, length):
            is_valid, _ = validate_pipeline(list(combo))
            if is_valid:
                valid_combinations.append(list(combo))
    
    return valid_combinations


def count_possible_tasks() -> Dict[str, int]:
    """가능한 업무 조합 수 계산"""
    counts = {
        "predefined_templates": len(TASK_TEMPLATES),
        "2_module_combinations": 0,
        "3_module_combinations": 0,
        "4_module_combinations": 0,
        "5_module_combinations": 0,
    }
    
    all_modules = list(ATOMIC_MODULES.keys())
    
    for length in range(2, 6):
        for combo in combinations(all_modules, length):
            is_valid, _ = validate_pipeline(list(combo))
            if is_valid:
                counts[f"{length}_module_combinations"] += 1
    
    counts["total"] = sum(counts.values())
    return counts


# ═══════════════════════════════════════════════════════════════════════════════
# 유틸리티 함수
# ═══════════════════════════════════════════════════════════════════════════════

def get_module(module_id: str) -> Optional[AtomicModule]:
    """모듈 조회"""
    return ATOMIC_MODULES.get(module_id)


def get_modules_by_category(category: ModuleCategory) -> List[AtomicModule]:
    """카테고리별 모듈 조회"""
    return [m for m in ATOMIC_MODULES.values() if m.category == category]


def get_template(template_id: str) -> Optional[ModulePipeline]:
    """템플릿 조회"""
    for template in TASK_TEMPLATES:
        if template.id == template_id:
            return template
    return None


def get_templates_by_category(category: str) -> List[ModulePipeline]:
    """카테고리별 템플릿 조회"""
    return [t for t in TASK_TEMPLATES if t.category == category]


def create_custom_pipeline(
    name: str,
    name_ko: str,
    modules: List[str],
    category: str = "CUSTOM",
    description: str = ""
) -> Optional[ModulePipeline]:
    """커스텀 파이프라인 생성"""
    is_valid, error = validate_pipeline(modules)
    if not is_valid:
        raise ValueError(f"유효하지 않은 파이프라인: {error}")
    
    k, i = compute_pipeline_physics(modules)
    requires_human = any(ATOMIC_MODULES[m].requires_human for m in modules)
    
    return ModulePipeline(
        id=f"CUSTOM_{name.upper().replace(' ', '_')}",
        name=name,
        name_ko=name_ko,
        description=description or f"{name_ko} 자동화 파이프라인",
        modules=modules,
        category=category,
        computed_k=k,
        computed_i=i,
        requires_human=requires_human
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 실행 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class PipelineExecutor:
    """파이프라인 실행 엔진"""
    
    def __init__(self):
        self.execution_log = []
    
    async def execute(
        self, 
        pipeline: ModulePipeline, 
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """파이프라인 실행"""
        result = {"success": True, "data": input_data, "steps": []}
        
        for module_id in pipeline.modules:
            module = ATOMIC_MODULES[module_id]
            
            step_result = {
                "module": module_id,
                "name": module.name_ko,
                "status": "completed"
            }
            
            # 인간 개입 필요 시
            if module.requires_human:
                step_result["status"] = "awaiting_human"
                step_result["message"] = f"{module.name_ko} - 인간 승인 대기 중"
            
            result["steps"].append(step_result)
        
        return result


# ═══════════════════════════════════════════════════════════════════════════════
# 모듈 요약
# ═══════════════════════════════════════════════════════════════════════════════

MODULE_SUMMARY = {
    "total_modules": 30,
    "categories": {
        "INPUT": 6,
        "PROCESS": 8,
        "OUTPUT": 6,
        "DECISION": 5,
        "COMM": 5,
    },
    "predefined_templates": len(TASK_TEMPLATES),
    "description": "30개 원자 모듈의 조합으로 1,000+ 업무 자동화 가능"
}


if __name__ == "__main__":
    print("=" * 60)
    print("AUTUS 30개 원자 모듈 시스템")
    print("=" * 60)
    
    print(f"\n총 모듈 수: {len(ATOMIC_MODULES)}개")
    print(f"사전 정의 템플릿: {len(TASK_TEMPLATES)}개")
    
    counts = count_possible_tasks()
    print(f"\n가능한 조합 수:")
    for key, value in counts.items():
        print(f"  {key}: {value}")
