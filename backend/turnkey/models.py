"""
AUTUS Turnkey Solution - Core Models
턴키 솔루션 핵심 데이터 모델
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Optional
from datetime import datetime
from enum import Enum


class TriggerType(Enum):
    """핵심 트리거 유형 (모든 업무의 시작점)"""
    PAYMENT = "결제"           # 돈이 들어옴
    SERVICE = "서비스수행"      # 핵심 가치 제공
    CONTRACT = "계약체결"       # 관계 시작
    DELIVERY = "납품완료"       # 결과물 전달
    INQUIRY = "문의접수"        # 고객 접점
    SCHEDULE = "일정도래"       # 시간 트리거
    THRESHOLD = "임계도달"      # 조건 충족
    CHECKIN = "체크인"          # 도착/시작
    ORDER = "주문"              # 구매 요청
    RESERVATION = "예약"        # 사전 예약


class ChainResult(Enum):
    """체인 실행 결과 유형"""
    RECORD = "기록생성"         # 문서/데이터 생성
    NOTIFICATION = "알림발송"   # 커뮤니케이션
    SCHEDULE = "일정생성"       # 예약/스케줄
    ANALYSIS = "분석생성"       # 인사이트 도출
    PROVISION = "자원배정"      # 리소스 할당
    VALIDATION = "검증완료"     # 확인/승인
    INTEGRATION = "연동완료"    # 외부 시스템 동기화
    PAYMENT = "결제처리"        # 금융 처리
    DELIVERY = "배송처리"       # 물류 처리


@dataclass
class LegacyTask:
    """기존 파편화된 업무 (삭제 대상)"""
    task_id: str
    task_name: str
    responsible: str              # 담당자/담당부서
    avg_duration_minutes: float   # 평균 소요 시간
    avg_cost: float               # 평균 비용
    error_rate: float             # 오류율
    dependencies: list[str] = field(default_factory=list)  # 선행 업무
    
    @property
    def annual_cost(self) -> float:
        """연간 비용 (월 20회 가정)"""
        return self.avg_cost * 20 * 12
    
    @property
    def annual_time(self) -> float:
        """연간 소요 시간 (분)"""
        return self.avg_duration_minutes * 20 * 12


@dataclass
class ChainAction:
    """체인 액션 (트리거 시 자동 실행되는 단위)"""
    action_id: str
    action_name: str
    result_type: ChainResult
    
    # 출력물 정의
    outputs: list[str] = field(default_factory=list)
    
    # 조건부 실행
    condition: Optional[str] = None
    
    # 흡수한 기존 업무들
    absorbed_tasks: list[str] = field(default_factory=list)
    
    # 실행 설정
    timeout_seconds: int = 30
    retry_count: int = 3
    
    # 외부 연동
    external_service: Optional[str] = None  # "stripe", "sendgrid", "slack" 등
    
    @property
    def absorbed_count(self) -> int:
        """흡수한 업무 수"""
        return len(self.absorbed_tasks)


@dataclass
class TriggerChain:
    """트리거 체인 (하나의 트리거가 발동시키는 전체 액션 체인)"""
    trigger_type: TriggerType
    trigger_name: str
    trigger_description: str = ""
    
    # 체인 액션들 (순차/병렬 실행)
    actions: list[ChainAction] = field(default_factory=list)
    
    # 체인 실행 후 최종 산출물
    final_outputs: list[str] = field(default_factory=list)
    
    # 삭제된 기존 업무들
    eliminated_tasks: list[LegacyTask] = field(default_factory=list)
    
    @property
    def total_eliminated_cost(self) -> float:
        """삭제로 절감된 총 연간 비용"""
        return sum(t.annual_cost for t in self.eliminated_tasks)
    
    @property
    def total_eliminated_time(self) -> float:
        """삭제로 절감된 총 시간 (분/건)"""
        return sum(t.avg_duration_minutes for t in self.eliminated_tasks)
    
    @property
    def total_absorbed_tasks(self) -> int:
        """흡수된 총 업무 수"""
        return sum(a.absorbed_count for a in self.actions)


@dataclass
class TurnkeySolution:
    """턴키 솔루션 (산업별 통합 솔루션)"""
    solution_id: str
    solution_name: str
    industry: str
    description: str = ""
    
    # 핵심 트리거들 (2-3개만)
    core_triggers: list[TriggerChain] = field(default_factory=list)
    
    # 메타데이터
    created_at: datetime = field(default_factory=datetime.now)
    version: str = "1.0.0"
    
    @property
    def total_eliminated_tasks(self) -> int:
        """삭제된 전체 업무 수"""
        return sum(len(tc.eliminated_tasks) for tc in self.core_triggers)
    
    @property
    def total_savings(self) -> float:
        """총 절감 비용"""
        return sum(tc.total_eliminated_cost for tc in self.core_triggers)
    
    @property
    def total_time_savings(self) -> float:
        """총 절감 시간 (분/건)"""
        return sum(tc.total_eliminated_time for tc in self.core_triggers)
    
    @property
    def trigger_count(self) -> int:
        """핵심 트리거 수"""
        return len(self.core_triggers)


@dataclass
class TurnkeyFramework:
    """턴키 솔루션 4단계 프레임워크"""
    
    industry: str
    solution_name: str
    
    # Stage 1: 수집 (기존 업무 전체 파악)
    legacy_tasks: list[LegacyTask] = field(default_factory=list)
    legacy_flows: list[dict] = field(default_factory=list)
    
    # Stage 2: 재정의 (트리거-체인 구조로 통합)
    core_triggers: list[TriggerType] = field(default_factory=list)
    trigger_chains: list[TriggerChain] = field(default_factory=list)
    
    # Stage 3: 자동화 (체인 액션 구현)
    automated_actions: list[ChainAction] = field(default_factory=list)
    
    # Stage 4: 삭제화 (개별 업무 자연소멸)
    eliminated_tasks: list[LegacyTask] = field(default_factory=list)
    elimination_rate: float = 0.0
    
    # 최종 산출물
    final_outputs: list[str] = field(default_factory=list)
    added_value: list[str] = field(default_factory=list)
    
    @property
    def total_legacy_cost(self) -> float:
        """기존 업무 총 비용"""
        return sum(t.avg_cost for t in self.legacy_tasks)
    
    @property
    def total_legacy_time(self) -> float:
        """기존 업무 총 시간"""
        return sum(t.avg_duration_minutes for t in self.legacy_tasks)
    
    @property
    def savings_cost(self) -> float:
        """비용 절감액"""
        return sum(t.annual_cost for t in self.eliminated_tasks)
    
    @property
    def savings_time(self) -> float:
        """시간 절감 (분)"""
        return sum(t.avg_duration_minutes for t in self.eliminated_tasks)


@dataclass
class TriggerEvent:
    """트리거 이벤트 (런타임)"""
    event_id: str
    trigger_type: TriggerType
    payload: dict = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    
    # 실행 상태
    status: str = "pending"  # pending, running, completed, failed
    results: list[dict] = field(default_factory=list)
    
    # 메트릭
    duration_ms: float = 0
    actions_completed: int = 0
    actions_failed: int = 0


@dataclass
class ChainExecutionResult:
    """체인 실행 결과"""
    chain_id: str
    trigger_type: TriggerType
    success: bool
    
    # 결과물
    outputs: dict = field(default_factory=dict)
    
    # 액션별 결과
    action_results: list[dict] = field(default_factory=list)
    
    # 메트릭
    total_duration_ms: float = 0
    eliminated_task_count: int = 0
    
    # 오류
    errors: list[str] = field(default_factory=list)
    
    timestamp: datetime = field(default_factory=datetime.now)
