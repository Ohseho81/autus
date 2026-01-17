"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 2026 솔루션 모듈 시스템
30 Solution Modules - Agentic AI / Multi-Agent / Hyperautomation

구조:
  Layer 1: 30개 원자 모듈 (modules_30.py) - 저수준 빌딩 블록
  Layer 2: 30개 솔루션 모듈 (이 파일) - 고수준 비즈니스 솔루션

트렌드 연계:
  - Agentic AI (자율 에이전트)
  - Multi-Agent Orchestration
  - Hyperautomation
  - Governance-as-Code
  - Embedded AI (MS365/Cloud)
═══════════════════════════════════════════════════════════════════════════════
"""

from enum import Enum
from typing import Optional, List, Dict, Any, Callable
from pydantic import BaseModel, Field
from dataclasses import dataclass, field
import json

# ═══════════════════════════════════════════════════════════════════════════════
# 모듈 카테고리
# ═══════════════════════════════════════════════════════════════════════════════

class SolutionCategory(str, Enum):
    """5대 솔루션 카테고리"""
    INFRA = "INFRA"           # 기본 인프라 & 거버넌스 (6개)
    DATA = "DATA"             # 데이터 & 지식 관리 (6개)
    CORE = "CORE"             # 핵심 업무 자동화 (10개)
    UX = "UX"                 # 시각화 & 사용자 경험 (5개)
    SECURITY = "SECURITY"     # 보안 & 확장성 (3개)


class TechStack(str, Enum):
    """기술 스택"""
    LANGGRAPH = "LangGraph"
    CREWAI = "CrewAI"
    TYPEDB = "TypeDB"
    PINECONE = "Pinecone"
    DEEPSEEK = "DeepSeek-R1"
    LLAMA = "Llama-3.3"
    GROK = "Grok-API"
    LANGSMITH = "LangSmith"
    PROMETHEUS = "Prometheus"
    AIRFLOW = "Airflow"
    SOCKETIO = "Socket.io"
    KUBERNETES = "Kubernetes"


class Priority(str, Enum):
    """구현 우선순위"""
    P0 = "P0"  # 즉시 (기반)
    P1 = "P1"  # 높음
    P2 = "P2"  # 중간
    P3 = "P3"  # 낮음


# ═══════════════════════════════════════════════════════════════════════════════
# 솔루션 모듈 정의
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SolutionModule:
    """솔루션 모듈 정의"""
    id: int
    code: str
    name: str
    name_ko: str
    category: SolutionCategory
    description: str
    
    # 2026 트렌드 연계
    trend_keywords: List[str] = field(default_factory=list)
    
    # 기술 스택
    tech_stack: List[TechStack] = field(default_factory=list)
    
    # AUTUS 연동
    autus_components: List[str] = field(default_factory=list)
    
    # 물리 상수 영향
    affects_k: bool = False
    affects_i: bool = False
    affects_r: bool = False
    
    # 구현 정보
    priority: Priority = Priority.P2
    complexity: int = 3  # 1-5
    estimated_days: int = 5
    
    # 의존성
    depends_on: List[str] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# 30개 솔루션 모듈 상세 정의
# ═══════════════════════════════════════════════════════════════════════════════

SOLUTION_MODULES: Dict[str, SolutionModule] = {
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 카테고리 1: 기본 인프라 & 거버넌스 (6개)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "M01": SolutionModule(
        id=1,
        code="M01",
        name="Governance-as-Code Engine",
        name_ko="거버넌스 코드 엔진",
        category=SolutionCategory.INFRA,
        description="정책·컴플라이언스 자동 적용 (rule-based + AI)",
        trend_keywords=["governance-as-code", "compliance", "policy-automation"],
        tech_stack=[TechStack.TYPEDB, TechStack.LANGGRAPH],
        autus_components=["RoleConfig", "ApproverCard", "AuditReplayCard"],
        affects_k=True, affects_i=False, affects_r=True,
        priority=Priority.P0,
        complexity=4,
        estimated_days=7,
    ),
    
    "M02": SolutionModule(
        id=2,
        code="M02",
        name="Multi-Agent Orchestrator",
        name_ko="멀티 에이전트 오케스트레이터",
        category=SolutionCategory.INFRA,
        description="에이전트 간 협업·태스크 분배 (agentic AI 핵심)",
        trend_keywords=["agentic-ai", "multi-agent", "orchestration"],
        tech_stack=[TechStack.LANGGRAPH, TechStack.CREWAI],
        autus_components=["RoleShell", "RoleRouter", "OperatorCard"],
        affects_k=True, affects_i=True, affects_r=False,
        priority=Priority.P0,
        complexity=5,
        estimated_days=10,
    ),
    
    "M03": SolutionModule(
        id=3,
        code="M03",
        name="Human-in-the-Loop Gateway",
        name_ko="휴먼 인 더 루프 게이트웨이",
        category=SolutionCategory.INFRA,
        description="위험 시 human escalation (Sentry/LangSmith 연동)",
        trend_keywords=["human-in-loop", "escalation", "safety"],
        tech_stack=[TechStack.SOCKETIO, TechStack.LANGSMITH],
        autus_components=["ApprovalStatusCard", "RiskAlertCard", "CM_ESCALATE"],
        affects_k=False, affects_i=True, affects_r=True,
        priority=Priority.P0,
        complexity=3,
        estimated_days=5,
        depends_on=["M02"],
    ),
    
    "M04": SolutionModule(
        id=4,
        code="M04",
        name="Audit & Observability Hub",
        name_ko="감사 & 관측성 허브",
        category=SolutionCategory.INFRA,
        description="모든 워크플로우 로그·메트릭 실시간 추적",
        trend_keywords=["observability", "audit-trail", "metrics"],
        tech_stack=[TechStack.LANGSMITH, TechStack.PROMETHEUS, TechStack.TYPEDB],
        autus_components=["AuditReplayCard", "ImmutableLogCard", "OUT_LOG"],
        affects_k=True, affects_i=False, affects_r=True,
        priority=Priority.P0,
        complexity=4,
        estimated_days=7,
    ),
    
    "M05": SolutionModule(
        id=5,
        code="M05",
        name="Rollback & Canary Manager",
        name_ko="롤백 & 카나리 매니저",
        category=SolutionCategory.INFRA,
        description="자동 롤백 + 5~10% Canary 배포",
        trend_keywords=["canary-deployment", "rollback", "progressive-delivery"],
        tech_stack=[TechStack.AIRFLOW, TechStack.KUBERNETES],
        autus_components=["SafetyStatusCard", "StatusIndicator"],
        affects_k=True, affects_i=False, affects_r=True,
        priority=Priority.P1,
        complexity=4,
        estimated_days=6,
        depends_on=["M04"],
    ),
    
    "M06": SolutionModule(
        id=6,
        code="M06",
        name="Version & Drift Detector",
        name_ko="버전 & 드리프트 감지기",
        category=SolutionCategory.INFRA,
        description="LLM/외부 기술 drift 감지 (cosine sim + perplexity)",
        trend_keywords=["drift-detection", "version-control", "llm-monitoring"],
        tech_stack=[TechStack.PINECONE, TechStack.DEEPSEEK],
        autus_components=["ConflictCard", "PressureHeatmapCard"],
        affects_k=True, affects_i=False, affects_r=False,
        priority=Priority.P1,
        complexity=4,
        estimated_days=5,
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 카테고리 2: 데이터 & 지식 관리 (6개)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "M07": SolutionModule(
        id=7,
        code="M07",
        name="Hybrid Retrieval Engine",
        name_ko="하이브리드 검색 엔진",
        category=SolutionCategory.DATA,
        description="Pinecone + TypeDB 결합 하이브리드 검색",
        trend_keywords=["hybrid-search", "rag", "vector-graph"],
        tech_stack=[TechStack.PINECONE, TechStack.TYPEDB],
        autus_components=["SemanticSearch", "PR_EXTRACT"],
        affects_k=True, affects_i=False, affects_r=False,
        priority=Priority.P1,
        complexity=4,
        estimated_days=7,
    ),
    
    "M08": SolutionModule(
        id=8,
        code="M08",
        name="RAG Knowledge Refresher",
        name_ko="RAG 지식 갱신기",
        category=SolutionCategory.DATA,
        description="실시간 지식 업데이트 (월 1회 sync)",
        trend_keywords=["rag", "knowledge-update", "sync"],
        tech_stack=[TechStack.AIRFLOW, TechStack.PINECONE],
        autus_components=["IN_SCHEDULE", "CM_STORE"],
        affects_k=True, affects_i=False, affects_r=False,
        priority=Priority.P1,
        complexity=3,
        estimated_days=4,
        depends_on=["M07"],
    ),
    
    "M09": SolutionModule(
        id=9,
        code="M09",
        name="Entity Graph Builder",
        name_ko="엔티티 그래프 빌더",
        category=SolutionCategory.DATA,
        description="TypeDB에 자동 엔티티·관계 추출·저장",
        trend_keywords=["knowledge-graph", "entity-extraction", "relationship"],
        tech_stack=[TechStack.TYPEDB, TechStack.LLAMA],
        autus_components=["PR_PARSE", "PR_EXTRACT", "CM_STORE"],
        affects_k=True, affects_i=True, affects_r=False,
        priority=Priority.P2,
        complexity=4,
        estimated_days=6,
    ),
    
    "M10": SolutionModule(
        id=10,
        code="M10",
        name="Inertia Debt Forecaster",
        name_ko="관성 부채 예측기",
        category=SolutionCategory.DATA,
        description="ΔṠ·Inertia Debt 예측 (rolling average + rule)",
        trend_keywords=["forecasting", "debt-prediction", "physics-model"],
        tech_stack=[TechStack.DEEPSEEK, TechStack.TYPEDB],
        autus_components=["FutureScenarioCard", "PressureHeatmapCard"],
        affects_k=True, affects_i=True, affects_r=True,
        priority=Priority.P2,
        complexity=5,
        estimated_days=8,
    ),
    
    "M11": SolutionModule(
        id=11,
        code="M11",
        name="Metric Dashboard Aggregator",
        name_ko="메트릭 대시보드 집계기",
        category=SolutionCategory.DATA,
        description="K/I Physics 게이지·트렌드 실시간 집계",
        trend_keywords=["metrics", "aggregation", "real-time"],
        tech_stack=[TechStack.PROMETHEUS, TechStack.SOCKETIO],
        autus_components=["KIGaugeCluster", "StatusIndicator", "PR_AGGREGATE"],
        affects_k=True, affects_i=True, affects_r=False,
        priority=Priority.P1,
        complexity=3,
        estimated_days=4,
    ),
    
    "M12": SolutionModule(
        id=12,
        code="M12",
        name="Breaking Change Simulator",
        name_ko="브레이킹 체인지 시뮬레이터",
        category=SolutionCategory.DATA,
        description="업데이트 전 Sandbox 시뮬레이션 + 영향 예측",
        trend_keywords=["simulation", "sandbox", "impact-analysis"],
        tech_stack=[TechStack.CREWAI, TechStack.LANGGRAPH],
        autus_components=["ConflictCard", "RiskAlertCard"],
        affects_k=True, affects_i=False, affects_r=True,
        priority=Priority.P2,
        complexity=4,
        estimated_days=6,
        depends_on=["M06"],
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 카테고리 3: 핵심 업무 자동화 (10개)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "M13": SolutionModule(
        id=13,
        code="M13",
        name="Monthly Tech Update Agent",
        name_ko="월간 기술 업데이트 에이전트",
        category=SolutionCategory.CORE,
        description="외부 기술(LangGraph·Claude·DeepSeek 등) 월 1회 자동 체크·적용",
        trend_keywords=["auto-update", "tech-monitoring", "continuous-improvement"],
        tech_stack=[TechStack.AIRFLOW, TechStack.LANGGRAPH, TechStack.CREWAI],
        autus_components=["IN_SCHEDULE", "DE_RULE", "CM_NOTIFY"],
        affects_k=True, affects_i=False, affects_r=False,
        priority=Priority.P0,
        complexity=4,
        estimated_days=7,
        depends_on=["M06", "M08"],
    ),
    
    "M14": SolutionModule(
        id=14,
        code="M14",
        name="Command Center Processor",
        name_ko="커맨드 센터 프로세서",
        category=SolutionCategory.CORE,
        description="자연어 명령 → 워크플로우 매핑 (voice/text)",
        trend_keywords=["nlp", "voice-control", "command-parsing"],
        tech_stack=[TechStack.LLAMA, TechStack.DEEPSEEK, TechStack.SOCKETIO],
        autus_components=["SignalInputCard", "IN_FORM", "PR_PARSE"],
        affects_k=True, affects_i=True, affects_r=False,
        priority=Priority.P1,
        complexity=4,
        estimated_days=6,
    ),
    
    "M15": SolutionModule(
        id=15,
        code="M15",
        name="Task Prioritization & Routing",
        name_ko="업무 우선순위 & 라우팅",
        category=SolutionCategory.CORE,
        description="PriorityAlert + TaskList 자동 분배",
        trend_keywords=["task-routing", "prioritization", "workload-balancing"],
        tech_stack=[TechStack.LANGGRAPH, TechStack.DEEPSEEK],
        autus_components=["NextActionCard", "TopDecisionCard", "DE_RULE"],
        affects_k=True, affects_i=True, affects_r=False,
        priority=Priority.P0,
        complexity=3,
        estimated_days=5,
        depends_on=["M02"],
    ),
    
    "M16": SolutionModule(
        id=16,
        code="M16",
        name="Workflow Pipeline Builder",
        name_ko="워크플로우 파이프라인 빌더",
        category=SolutionCategory.CORE,
        description="drag-and-drop + AI-assisted workflow 생성",
        trend_keywords=["low-code", "workflow-builder", "visual-programming"],
        tech_stack=[TechStack.LANGGRAPH],
        autus_components=["ModuleBuilder", "TaskRedefinitionCard"],
        affects_k=True, affects_i=False, affects_r=False,
        priority=Priority.P1,
        complexity=4,
        estimated_days=8,
    ),
    
    "M17": SolutionModule(
        id=17,
        code="M17",
        name="Predictive Forecasting Agent",
        name_ko="예측 에이전트",
        category=SolutionCategory.CORE,
        description="FuturePage용 트렌드·예측 (ForecastCard)",
        trend_keywords=["forecasting", "prediction", "trend-analysis"],
        tech_stack=[TechStack.DEEPSEEK, TechStack.PINECONE],
        autus_components=["FutureScenarioCard", "PlanRealityCard", "PR_CALCULATE"],
        affects_k=True, affects_i=False, affects_r=True,
        priority=Priority.P2,
        complexity=4,
        estimated_days=6,
    ),
    
    "M18": SolutionModule(
        id=18,
        code="M18",
        name="MoneyFlow & Resource Optimizer",
        name_ko="자금 흐름 & 리소스 최적화기",
        category=SolutionCategory.CORE,
        description="자금·리소스 흐름 자동 최적화 (MoneyFlowCube)",
        trend_keywords=["resource-optimization", "cash-flow", "efficiency"],
        tech_stack=[TechStack.DEEPSEEK, TechStack.PINECONE],
        autus_components=["AssetStatusCard", "PR_CALCULATE", "DE_THRESHOLD"],
        affects_k=True, affects_i=False, affects_r=True,
        priority=Priority.P2,
        complexity=5,
        estimated_days=8,
    ),
    
    "M19": SolutionModule(
        id=19,
        code="M19",
        name="Learning & Self-Evolution Loop",
        name_ko="학습 & 자기 진화 루프",
        category=SolutionCategory.CORE,
        description="성공/실패 피드백 → 상수·계수 자동 재계산 (LearningPageV2)",
        trend_keywords=["self-learning", "meta-loop", "continuous-improvement"],
        tech_stack=[TechStack.TYPEDB, TechStack.LANGGRAPH],
        autus_components=["ConfidenceCard", "OUT_LOG", "DE_RULE"],
        affects_k=True, affects_i=True, affects_r=True,
        priority=Priority.P0,
        complexity=5,
        estimated_days=10,
        depends_on=["M10", "M11"],
    ),
    
    "M20": SolutionModule(
        id=20,
        code="M20",
        name="Onboarding & Archetype Adapter",
        name_ko="온보딩 & 아키타입 어댑터",
        category=SolutionCategory.CORE,
        description="사용자 유형별 자동 맞춤 온보딩 (ArchetypeOnboardingV3)",
        trend_keywords=["personalization", "onboarding", "user-adaptation"],
        tech_stack=[TechStack.LLAMA, TechStack.TYPEDB],
        autus_components=["RoleConfig", "ROLE_CONFIGS", "SignalInputCard"],
        affects_k=True, affects_i=True, affects_r=False,
        priority=Priority.P2,
        complexity=3,
        estimated_days=5,
    ),
    
    "M21": SolutionModule(
        id=21,
        code="M21",
        name="Log & Anomaly Analyzer",
        name_ko="로그 & 이상 탐지 분석기",
        category=SolutionCategory.CORE,
        description="LogsPage 실시간 이상 탐지·요약",
        trend_keywords=["anomaly-detection", "log-analysis", "monitoring"],
        tech_stack=[TechStack.LANGSMITH, TechStack.LLAMA],
        autus_components=["ImmutableLogCard", "OUT_ERROR", "CM_NOTIFY"],
        affects_k=True, affects_i=False, affects_r=True,
        priority=Priority.P1,
        complexity=3,
        estimated_days=4,
        depends_on=["M04"],
    ),
    
    "M22": SolutionModule(
        id=22,
        code="M22",
        name="Integration Health Checker",
        name_ko="연동 상태 체커",
        category=SolutionCategory.CORE,
        description="외부 API·LLM 연결 상태 자동 점검·알림",
        trend_keywords=["health-check", "integration-monitoring", "api-status"],
        tech_stack=[TechStack.PROMETHEUS, TechStack.SOCKETIO],
        autus_components=["SafetyStatusCard", "RiskAlertCard", "IN_API"],
        affects_k=True, affects_i=False, affects_r=False,
        priority=Priority.P1,
        complexity=2,
        estimated_days=3,
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 카테고리 4: 시각화 & 사용자 경험 (5개)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "M23": SolutionModule(
        id=23,
        code="M23",
        name="Trinity Engine Dashboard",
        name_ko="트리니티 엔진 대시보드",
        category=SolutionCategory.UX,
        description="전체 시스템 상태 한눈에 (TrinityDashboard)",
        trend_keywords=["dashboard", "visualization", "system-overview"],
        tech_stack=[TechStack.SOCKETIO],
        autus_components=["RoleShell", "StatusIndicator", "BaseCard"],
        affects_k=False, affects_i=False, affects_r=False,
        priority=Priority.P0,
        complexity=4,
        estimated_days=6,
    ),
    
    "M24": SolutionModule(
        id=24,
        code="M24",
        name="Cosmos / Universe View",
        name_ko="코스모스 / 유니버스 뷰",
        category=SolutionCategory.UX,
        description="시스템 전체를 우주 메타포로 (AutusUniverseV3 + cosmos.html)",
        trend_keywords=["3d-visualization", "cosmos", "immersive"],
        tech_stack=[TechStack.SOCKETIO],
        autus_components=["AutusUniverseV3", "PressureHeatmapCard"],
        affects_k=False, affects_i=False, affects_r=False,
        priority=Priority.P2,
        complexity=5,
        estimated_days=8,
    ),
    
    "M25": SolutionModule(
        id=25,
        code="M25",
        name="Node Detail & Relationship Explorer",
        name_ko="노드 상세 & 관계 탐색기",
        category=SolutionCategory.UX,
        description="노드 클릭 시 상세·관계 그래프 (NodeDetailModal)",
        trend_keywords=["graph-exploration", "node-detail", "relationship"],
        tech_stack=[TechStack.TYPEDB, TechStack.SOCKETIO],
        autus_components=["DecisionLogCard", "AuditReplayCard"],
        affects_k=False, affects_i=False, affects_r=False,
        priority=Priority.P2,
        complexity=4,
        estimated_days=5,
        depends_on=["M09"],
    ),
    
    "M26": SolutionModule(
        id=26,
        code="M26",
        name="GameUI & Engagement Layer",
        name_ko="게임 UI & 인게이지먼트 레이어",
        category=SolutionCategory.UX,
        description="업무 완료 시 포인트·뱃지·리더보드 (게임화)",
        trend_keywords=["gamification", "engagement", "rewards"],
        tech_stack=[TechStack.SOCKETIO, TechStack.TYPEDB],
        autus_components=["ProgressCard", "ConfidenceCard"],
        affects_k=False, affects_i=True, affects_r=False,
        priority=Priority.P3,
        complexity=3,
        estimated_days=5,
    ),
    
    "M27": SolutionModule(
        id=27,
        code="M27",
        name="Mobile & Voice Adaptive UI",
        name_ko="모바일 & 음성 적응형 UI",
        category=SolutionCategory.UX,
        description="모바일 드로어 + 음성 명령 (MobileDrawer + VoiceControl)",
        trend_keywords=["mobile", "voice-ui", "responsive"],
        tech_stack=[TechStack.SOCKETIO],
        autus_components=["BottomNav", "SignalInputCard"],
        affects_k=False, affects_i=True, affects_r=False,
        priority=Priority.P2,
        complexity=3,
        estimated_days=5,
        depends_on=["M14"],
    ),
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 카테고리 5: 보안 & 확장성 (3개)
    # ═══════════════════════════════════════════════════════════════════════════
    
    "M28": SolutionModule(
        id=28,
        code="M28",
        name="RBAC & Access Control Layer",
        name_ko="RBAC & 접근 제어 레이어",
        category=SolutionCategory.SECURITY,
        description="역할 기반 접근 제어 (Admin/User/MyPage)",
        trend_keywords=["rbac", "access-control", "authorization"],
        tech_stack=[TechStack.TYPEDB],
        autus_components=["RoleConfig", "ApproverCard", "DE_APPROVE"],
        affects_k=False, affects_i=True, affects_r=True,
        priority=Priority.P0,
        complexity=3,
        estimated_days=5,
    ),
    
    "M29": SolutionModule(
        id=29,
        code="M29",
        name="Compliance & Encryption Wrapper",
        name_ko="컴플라이언스 & 암호화 래퍼",
        category=SolutionCategory.SECURITY,
        description="데이터 암호화·감사 추적 자동",
        trend_keywords=["encryption", "compliance", "data-protection"],
        tech_stack=[TechStack.TYPEDB],
        autus_components=["ImmutableLogCard", "OUT_LOG"],
        affects_k=False, affects_i=False, affects_r=True,
        priority=Priority.P1,
        complexity=4,
        estimated_days=6,
        depends_on=["M01", "M04"],
    ),
    
    "M30": SolutionModule(
        id=30,
        code="M30",
        name="Scalable Deployment Manager",
        name_ko="스케일러블 배포 매니저",
        category=SolutionCategory.SECURITY,
        description="K8s manifest 자동 생성·배포 (Kubernetes manifests 스케치 활용)",
        trend_keywords=["kubernetes", "scaling", "deployment"],
        tech_stack=[TechStack.KUBERNETES, TechStack.AIRFLOW],
        autus_components=["SafetyStatusCard", "CM_API"],
        affects_k=True, affects_i=False, affects_r=False,
        priority=Priority.P2,
        complexity=5,
        estimated_days=8,
        depends_on=["M05"],
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# 유틸리티 함수
# ═══════════════════════════════════════════════════════════════════════════════

def get_module(code: str) -> Optional[SolutionModule]:
    """모듈 조회"""
    return SOLUTION_MODULES.get(code.upper())


def get_modules_by_category(category: SolutionCategory) -> List[SolutionModule]:
    """카테고리별 모듈 조회"""
    return [m for m in SOLUTION_MODULES.values() if m.category == category]


def get_modules_by_priority(priority: Priority) -> List[SolutionModule]:
    """우선순위별 모듈 조회"""
    return [m for m in SOLUTION_MODULES.values() if m.priority == priority]


def get_modules_by_tech(tech: TechStack) -> List[SolutionModule]:
    """기술 스택별 모듈 조회"""
    return [m for m in SOLUTION_MODULES.values() if tech in m.tech_stack]


def get_dependency_order() -> List[str]:
    """의존성 기반 구현 순서"""
    # 토폴로지 정렬
    in_degree = {code: 0 for code in SOLUTION_MODULES}
    graph = {code: [] for code in SOLUTION_MODULES}
    
    for code, module in SOLUTION_MODULES.items():
        for dep in module.depends_on:
            if dep in graph:
                graph[dep].append(code)
                in_degree[code] += 1
    
    # BFS
    queue = [code for code, degree in in_degree.items() if degree == 0]
    result = []
    
    while queue:
        # 우선순위로 정렬
        queue.sort(key=lambda x: (SOLUTION_MODULES[x].priority.value, SOLUTION_MODULES[x].id))
        code = queue.pop(0)
        result.append(code)
        
        for next_code in graph[code]:
            in_degree[next_code] -= 1
            if in_degree[next_code] == 0:
                queue.append(next_code)
    
    return result


def calculate_total_effort() -> Dict[str, Any]:
    """전체 구현 공수 계산"""
    by_priority = {}
    for p in Priority:
        modules = get_modules_by_priority(p)
        by_priority[p.value] = {
            "count": len(modules),
            "days": sum(m.estimated_days for m in modules),
        }
    
    return {
        "total_modules": len(SOLUTION_MODULES),
        "total_days": sum(m.estimated_days for m in SOLUTION_MODULES.values()),
        "by_priority": by_priority,
        "by_category": {
            cat.value: len(get_modules_by_category(cat))
            for cat in SolutionCategory
        },
    }


def get_implementation_roadmap() -> List[Dict[str, Any]]:
    """구현 로드맵"""
    order = get_dependency_order()
    roadmap = []
    
    current_phase = 1
    current_days = 0
    phase_modules = []
    
    for code in order:
        module = SOLUTION_MODULES[code]
        
        # 새로운 페이즈 시작 조건: 14일 초과 또는 우선순위 변경
        if current_days + module.estimated_days > 14 and phase_modules:
            roadmap.append({
                "phase": current_phase,
                "modules": phase_modules,
                "total_days": current_days,
            })
            current_phase += 1
            current_days = 0
            phase_modules = []
        
        phase_modules.append({
            "code": code,
            "name_ko": module.name_ko,
            "days": module.estimated_days,
            "priority": module.priority.value,
        })
        current_days += module.estimated_days
    
    if phase_modules:
        roadmap.append({
            "phase": current_phase,
            "modules": phase_modules,
            "total_days": current_days,
        })
    
    return roadmap


# ═══════════════════════════════════════════════════════════════════════════════
# 모듈 매트릭스
# ═══════════════════════════════════════════════════════════════════════════════

MODULE_MATRIX = {
    "categories": {
        "INFRA": {"count": 6, "color": "#3B82F6", "icon": "🏗️", "name": "인프라 & 거버넌스"},
        "DATA": {"count": 6, "color": "#10B981", "icon": "📊", "name": "데이터 & 지식"},
        "CORE": {"count": 10, "color": "#F59E0B", "icon": "⚙️", "name": "핵심 업무 자동화"},
        "UX": {"count": 5, "color": "#8B5CF6", "icon": "🎨", "name": "시각화 & UX"},
        "SECURITY": {"count": 3, "color": "#EF4444", "icon": "🔒", "name": "보안 & 확장성"},
    },
    "priorities": {
        "P0": {"count": 7, "name": "즉시 구현", "color": "#EF4444"},
        "P1": {"count": 10, "name": "높음", "color": "#F59E0B"},
        "P2": {"count": 10, "name": "중간", "color": "#10B981"},
        "P3": {"count": 3, "name": "낮음", "color": "#6B7280"},
    },
    "tech_coverage": [
        ("LangGraph", 8),
        ("CrewAI", 4),
        ("TypeDB", 10),
        ("Pinecone", 6),
        ("DeepSeek-R1", 7),
        ("Prometheus", 4),
        ("Airflow", 5),
        ("Socket.io", 8),
        ("Kubernetes", 2),
    ],
}


if __name__ == "__main__":
    print("=" * 70)
    print("AUTUS 2026 솔루션 모듈 시스템")
    print("=" * 70)
    
    effort = calculate_total_effort()
    print(f"\n총 모듈 수: {effort['total_modules']}개")
    print(f"총 예상 공수: {effort['total_days']}일")
    
    print("\n우선순위별:")
    for p, data in effort['by_priority'].items():
        print(f"  {p}: {data['count']}개 ({data['days']}일)")
    
    print("\n구현 순서:")
    for code in get_dependency_order()[:10]:
        m = SOLUTION_MODULES[code]
        print(f"  {code}: {m.name_ko} ({m.priority.value})")
