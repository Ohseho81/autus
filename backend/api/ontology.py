"""
AUTUS - 72⁴ Ontology API
=========================

Human Type ↔ 72 Node ↔ 72⁴ Event 연동 API

엔드포인트:
- POST /ontology/classify     - 데이터 → 72⁴ Event 분류
- GET  /ontology/nodes        - 72 Node 조회
- GET  /ontology/user/{type}  - Human Type 대시보드
- POST /ontology/events       - Event 기록
- GET  /ontology/analysis     - 시간 분석
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum

router = APIRouter(prefix="/ontology", tags=["72⁴ Ontology"])


# ═══════════════════════════════════════════════════════════════════════════
# Enums & Constants
# ═══════════════════════════════════════════════════════════════════════════

class PhysicsNode(str, Enum):
    BIO = "BIO"
    CAPITAL = "CAPITAL"
    NETWORK = "NETWORK"
    KNOWLEDGE = "KNOWLEDGE"
    TIME = "TIME"
    EMOTION = "EMOTION"


class HumanCategory(str, Enum):
    T = "T"  # 투자자
    B = "B"  # 사업가
    L = "L"  # 근로자


# 6 Core Nodes (모든 타입 공통)
CORE_NODES = ["n01", "n05", "n06", "n09", "n33", "n60"]


# ═══════════════════════════════════════════════════════════════════════════
# 72 Node 정의
# ═══════════════════════════════════════════════════════════════════════════

NODES_72 = {
    # L1: Conservation (보존)
    "n01": {"name": "Cash", "nameKr": "현금", "law": "L1", "category": "Conservation"},
    "n02": {"name": "Assets", "nameKr": "자산", "law": "L1", "category": "Conservation"},
    "n03": {"name": "Liabilities", "nameKr": "부채", "law": "L1", "category": "Conservation"},
    "n04": {"name": "Equity", "nameKr": "자본", "law": "L1", "category": "Conservation"},
    "n05": {"name": "Revenue", "nameKr": "수익", "law": "L1", "category": "Conservation"},
    "n06": {"name": "Expense", "nameKr": "비용", "law": "L1", "category": "Conservation"},
    "n07": {"name": "Profit", "nameKr": "이익", "law": "L1", "category": "Conservation"},
    "n08": {"name": "Inventory", "nameKr": "재고", "law": "L1", "category": "Conservation"},
    "n09": {"name": "Customers", "nameKr": "고객", "law": "L1", "category": "Conservation"},
    "n10": {"name": "Employees", "nameKr": "직원", "law": "L1", "category": "Conservation"},
    "n11": {"name": "Products", "nameKr": "제품", "law": "L1", "category": "Conservation"},
    "n12": {"name": "Reserves", "nameKr": "적립금", "law": "L1", "category": "Conservation"},
    
    # L2: Flow (흐름)
    "n13": {"name": "CashFlow", "nameKr": "현금흐름", "law": "L2", "category": "Flow"},
    "n14": {"name": "DataFlow", "nameKr": "데이터흐름", "law": "L2", "category": "Flow"},
    "n15": {"name": "WorkFlow", "nameKr": "업무흐름", "law": "L2", "category": "Flow"},
    "n16": {"name": "Traffic", "nameKr": "트래픽", "law": "L2", "category": "Flow"},
    "n17": {"name": "GrowthRate", "nameKr": "성장률", "law": "L2", "category": "Flow"},
    "n18": {"name": "ChurnRate", "nameKr": "이탈률", "law": "L2", "category": "Flow"},
    "n19": {"name": "ConversionRate", "nameKr": "전환율", "law": "L2", "category": "Flow"},
    "n20": {"name": "Velocity", "nameKr": "속도", "law": "L2", "category": "Flow"},
    "n21": {"name": "AcquisitionRate", "nameKr": "획득률", "law": "L2", "category": "Flow"},
    "n22": {"name": "RetentionRate", "nameKr": "유지율", "law": "L2", "category": "Flow"},
    "n23": {"name": "Throughput", "nameKr": "처리량", "law": "L2", "category": "Flow"},
    "n24": {"name": "Pipeline", "nameKr": "파이프라인", "law": "L2", "category": "Flow"},
    
    # L3: Inertia (관성)
    "n25": {"name": "Habits", "nameKr": "습관", "law": "L3", "category": "Inertia"},
    "n26": {"name": "Culture", "nameKr": "문화", "law": "L3", "category": "Inertia"},
    "n27": {"name": "Brand", "nameKr": "브랜드", "law": "L3", "category": "Inertia"},
    "n28": {"name": "Recurring", "nameKr": "반복수익", "law": "L3", "category": "Inertia"},
    "n29": {"name": "Contracts", "nameKr": "계약", "law": "L3", "category": "Inertia"},
    "n30": {"name": "Relationships", "nameKr": "관계", "law": "L3", "category": "Inertia"},
    "n31": {"name": "Reputation", "nameKr": "평판", "law": "L3", "category": "Inertia"},
    "n32": {"name": "Stability", "nameKr": "안정성", "law": "L3", "category": "Inertia"},
    "n33": {"name": "Loyalty", "nameKr": "충성도", "law": "L3", "category": "Inertia"},
    "n34": {"name": "Engagement", "nameKr": "참여도", "law": "L3", "category": "Inertia"},
    "n35": {"name": "Commitment", "nameKr": "몰입도", "law": "L3", "category": "Inertia"},
    "n36": {"name": "Resilience", "nameKr": "회복력", "law": "L3", "category": "Inertia"},
    
    # L4: Acceleration (가속)
    "n37": {"name": "Momentum", "nameKr": "모멘텀", "law": "L4", "category": "Acceleration"},
    "n38": {"name": "Innovation", "nameKr": "혁신", "law": "L4", "category": "Acceleration"},
    "n39": {"name": "Learning", "nameKr": "학습", "law": "L4", "category": "Acceleration"},
    "n40": {"name": "NetworkEffect", "nameKr": "네트워크효과", "law": "L4", "category": "Acceleration"},
    "n41": {"name": "ViralCoeff", "nameKr": "바이럴계수", "law": "L4", "category": "Acceleration"},
    "n42": {"name": "Productivity", "nameKr": "생산성", "law": "L4", "category": "Acceleration"},
    "n43": {"name": "Efficiency", "nameKr": "효율성", "law": "L4", "category": "Acceleration"},
    "n44": {"name": "Volatility", "nameKr": "변동성", "law": "L4", "category": "Acceleration"},
    "n45": {"name": "Trends", "nameKr": "트렌드", "law": "L4", "category": "Acceleration"},
    "n46": {"name": "Signals", "nameKr": "신호", "law": "L4", "category": "Acceleration"},
    "n47": {"name": "Catalysts", "nameKr": "촉매", "law": "L4", "category": "Acceleration"},
    "n48": {"name": "Leverage", "nameKr": "레버리지", "law": "L4", "category": "Acceleration"},
    
    # L5: Friction (마찰)
    "n49": {"name": "Competition", "nameKr": "경쟁", "law": "L5", "category": "Friction"},
    "n50": {"name": "Regulation", "nameKr": "규제", "law": "L5", "category": "Friction"},
    "n51": {"name": "Complexity", "nameKr": "복잡성", "law": "L5", "category": "Friction"},
    "n52": {"name": "Bureaucracy", "nameKr": "관료주의", "law": "L5", "category": "Friction"},
    "n53": {"name": "TechDebt", "nameKr": "기술부채", "law": "L5", "category": "Friction"},
    "n54": {"name": "Inefficiency", "nameKr": "비효율", "law": "L5", "category": "Friction"},
    "n55": {"name": "Bottleneck", "nameKr": "병목", "law": "L5", "category": "Friction"},
    "n56": {"name": "Debt", "nameKr": "부채", "law": "L5", "category": "Friction"},
    "n57": {"name": "Burnout", "nameKr": "번아웃", "law": "L5", "category": "Friction"},
    "n58": {"name": "Cost", "nameKr": "비용", "law": "L5", "category": "Friction"},
    "n59": {"name": "Barriers", "nameKr": "장벽", "law": "L5", "category": "Friction"},
    "n60": {"name": "Risk", "nameKr": "위험", "law": "L5", "category": "Friction"},
    
    # L6: Gravity (중력)
    "n61": {"name": "Market", "nameKr": "시장", "law": "L6", "category": "Gravity"},
    "n62": {"name": "Opportunity", "nameKr": "기회", "law": "L6", "category": "Gravity"},
    "n63": {"name": "Vision", "nameKr": "비전", "law": "L6", "category": "Gravity"},
    "n64": {"name": "Mission", "nameKr": "미션", "law": "L6", "category": "Gravity"},
    "n65": {"name": "Purpose", "nameKr": "목적", "law": "L6", "category": "Gravity"},
    "n66": {"name": "Values", "nameKr": "가치관", "law": "L6", "category": "Gravity"},
    "n67": {"name": "Trust", "nameKr": "신뢰", "law": "L6", "category": "Gravity"},
    "n68": {"name": "Influence", "nameKr": "영향력", "law": "L6", "category": "Gravity"},
    "n69": {"name": "Authority", "nameKr": "권위", "law": "L6", "category": "Gravity"},
    "n70": {"name": "Dependency", "nameKr": "의존성", "law": "L6", "category": "Gravity"},
    "n71": {"name": "Centrality", "nameKr": "중심성", "law": "L6", "category": "Gravity"},
    "n72": {"name": "Potential", "nameKr": "잠재력", "law": "L6", "category": "Gravity"},
}


# Human Type → Active Nodes 매핑 (간략 버전)
TYPE_ACTIVE_NODES: Dict[str, List[str]] = {
    # 투자자 (T) - CAPITAL 중심
    "T01": CORE_NODES + ["n02", "n07", "n17", "n44", "n48", "n72"],
    "T02": CORE_NODES + ["n17", "n30", "n38", "n62", "n68", "n72"],
    "T05": CORE_NODES + ["n02", "n12", "n22", "n28", "n32", "n36"],
    "T08": CORE_NODES + ["n30", "n38", "n39", "n62", "n68", "n72"],
    
    # 사업가 (B) - NETWORK/TIME 중심
    "B01": CORE_NODES + ["n10", "n26", "n63", "n64", "n68", "n69"],
    "B07": CORE_NODES + ["n37", "n38", "n44", "n62", "n63", "n72"],
    "B08": CORE_NODES + ["n11", "n38", "n39", "n40", "n53", "n72"],
    "B15": CORE_NODES + ["n08", "n21", "n30", "n31", "n49", "n58"],
    
    # 근로자 (L) - TIME/KNOWLEDGE 중심
    "L01": CORE_NODES + ["n37", "n38", "n39", "n45", "n63", "n72"],
    "L04": CORE_NODES + ["n14", "n38", "n39", "n42", "n51", "n53"],
    "L08": CORE_NODES + ["n10", "n26", "n34", "n35", "n67", "n68"],
    "L24": CORE_NODES + ["n24", "n29", "n30", "n37", "n42", "n72"],
}


# ═══════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════

class ClassifyRequest(BaseModel):
    """데이터 분류 요청"""
    text: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    user_id: str = "anonymous"
    human_type: Optional[str] = None  # T01, B05, L24 등
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "오늘 매출 100만원 달성",
                "data": {"revenue": 1000000, "customers": 5},
                "user_id": "u001_seho",
                "human_type": "B15"
            }
        }


class Event72_4(BaseModel):
    """72⁴ Event"""
    code: str = Field(..., description="n01m05w13t01 형식")
    index: int = Field(..., ge=0, lt=72**4, description="0 ~ 26,873,855")
    node: str = Field(..., pattern=r"^n[0-7][0-9]$|^n72$")
    motion: str = Field(..., pattern=r"^m[0-7][0-9]$|^m72$")
    work: str = Field(..., pattern=r"^w[0-7][0-9]$|^w72$")
    time: str = Field(..., pattern=r"^t[0-7][0-9]$|^t72$")
    value: Optional[float] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    user_id: str = "anonymous"
    human_type: Optional[str] = None
    confidence: float = Field(default=0.5, ge=0, le=1)


class ClassifyResponse(BaseModel):
    """분류 결과"""
    success: bool
    events: List[Event72_4]
    total_events: int
    message: str


class NodeInfo(BaseModel):
    """노드 정보"""
    id: str
    name: str
    name_kr: str
    law: str
    category: str
    is_core: bool


class UserDashboard(BaseModel):
    """사용자 대시보드"""
    user_id: str
    human_type: str
    human_type_name: str
    physics_node: str
    active_nodes: List[NodeInfo]
    primary_node: NodeInfo
    recent_events: List[Event72_4]
    stats: Dict[str, Any]
    warnings: List[str]
    recommendations: List[str]


class LogRequest(BaseModel):
    """일일 로그 요청"""
    user_id: str
    human_type: str
    date: Optional[str] = None
    cash: Optional[float] = None
    revenue: Optional[float] = None
    expense: Optional[float] = None
    customers: Optional[int] = None
    momentum: Optional[int] = Field(None, ge=1, le=10)
    risk: Optional[int] = Field(None, ge=1, le=10)
    notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "u001_seho",
                "human_type": "B15",
                "cash": 5000000,
                "revenue": 100000,
                "expense": 50000,
                "customers": 3,
                "momentum": 7,
                "risk": 4
            }
        }


# ═══════════════════════════════════════════════════════════════════════════
# 키워드 분류기
# ═══════════════════════════════════════════════════════════════════════════

NODE_KEYWORDS = {
    "n01": ["현금", "cash", "돈", "잔고", "통장"],
    "n05": ["수익", "revenue", "매출", "수입", "벌다"],
    "n06": ["비용", "expense", "지출", "cost", "쓰다"],
    "n09": ["고객", "customer", "client", "사용자", "회원"],
    "n17": ["성장", "growth", "증가", "확대"],
    "n18": ["이탈", "churn", "해지", "탈퇴"],
    "n21": ["문의", "lead", "리드", "유입", "신규"],
    "n33": ["충성", "loyalty", "단골"],
    "n37": ["모멘텀", "momentum", "추진력", "에너지"],
    "n60": ["위험", "risk", "리스크", "불안"],
    "n72": ["잠재", "potential", "가능성"],
}

MOTION_KEYWORDS = {
    "m01": ["저장", "store", "보관"],
    "m13": ["획득", "acquire", "얻다"],
    "m25": ["유지", "maintain", "지키다"],
    "m37": ["혁신", "innovate", "개선"],
    "m44": ["부스트", "boost", "촉진"],
    "m57": ["지연", "delay", "늦추다"],
}


def classify_text_to_node(text: str) -> tuple[str, float]:
    """텍스트를 Node로 분류"""
    text_lower = text.lower()
    
    for node_id, keywords in NODE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return node_id, 0.8
    
    return "n01", 0.3  # 기본값


def classify_text_to_motion(text: str) -> tuple[str, float]:
    """텍스트를 Motion으로 분류"""
    text_lower = text.lower()
    
    for motion_id, keywords in MOTION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return motion_id, 0.8
    
    return "m01", 0.3


# ═══════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (프로토타입용)
# ═══════════════════════════════════════════════════════════════════════════

EVENT_STORE: Dict[str, List[Event72_4]] = {}
LOG_STORE: Dict[str, List[Dict]] = {}


def calculate_event_index(n: int, m: int, w: int, t: int) -> int:
    """72⁴ 인덱스 계산"""
    return (n - 1) * (72**3) + (m - 1) * (72**2) + (w - 1) * 72 + (t - 1)


# ═══════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════

@router.get("/nodes", response_model=Dict[str, NodeInfo])
async def get_all_nodes():
    """72개 Node 전체 조회"""
    result = {}
    for node_id, info in NODES_72.items():
        result[node_id] = NodeInfo(
            id=node_id,
            name=info["name"],
            name_kr=info["nameKr"],
            law=info["law"],
            category=info["category"],
            is_core=node_id in CORE_NODES
        )
    return result


@router.get("/nodes/{node_id}", response_model=NodeInfo)
async def get_node(node_id: str):
    """특정 Node 조회"""
    if node_id not in NODES_72:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    info = NODES_72[node_id]
    return NodeInfo(
        id=node_id,
        name=info["name"],
        name_kr=info["nameKr"],
        law=info["law"],
        category=info["category"],
        is_core=node_id in CORE_NODES
    )


@router.post("/classify", response_model=ClassifyResponse)
async def classify_data(request: ClassifyRequest):
    """데이터를 72⁴ Event로 분류"""
    events = []
    timestamp = datetime.now().isoformat()
    
    # 텍스트 분류
    if request.text:
        node_id, node_conf = classify_text_to_node(request.text)
        motion_id, motion_conf = classify_text_to_motion(request.text)
        
        n = int(node_id[1:])
        m = int(motion_id[1:])
        w = 1  # 기본 work
        t = 1  # 기본 time
        
        event = Event72_4(
            code=f"{node_id}{motion_id}w{w:02d}t{t:02d}",
            index=calculate_event_index(n, m, w, t),
            node=node_id,
            motion=motion_id,
            work=f"w{w:02d}",
            time=f"t{t:02d}",
            timestamp=timestamp,
            user_id=request.user_id,
            human_type=request.human_type,
            confidence=(node_conf + motion_conf) / 2
        )
        events.append(event)
    
    # 구조화된 데이터 분류
    if request.data:
        field_mapping = {
            "cash": ("n01", "m01", "w01", "t01"),
            "revenue": ("n05", "m13", "w13", "t01"),
            "expense": ("n06", "m14", "w01", "t01"),
            "customers": ("n09", "m25", "w25", "t01"),
            "momentum": ("n37", "m44", "w44", "t01"),
            "risk": ("n60", "m50", "w12", "t01"),
        }
        
        for field, (n, m, w, t) in field_mapping.items():
            value = request.data.get(field)
            if value is not None:
                n_idx = int(n[1:])
                m_idx = int(m[1:])
                w_idx = int(w[1:])
                t_idx = int(t[1:])
                
                event = Event72_4(
                    code=f"{n}{m}{w}{t}",
                    index=calculate_event_index(n_idx, m_idx, w_idx, t_idx),
                    node=n,
                    motion=m,
                    work=w,
                    time=t,
                    value=float(value),
                    timestamp=timestamp,
                    user_id=request.user_id,
                    human_type=request.human_type,
                    confidence=0.9
                )
                events.append(event)
    
    # 저장
    if request.user_id not in EVENT_STORE:
        EVENT_STORE[request.user_id] = []
    EVENT_STORE[request.user_id].extend(events)
    
    return ClassifyResponse(
        success=True,
        events=events,
        total_events=len(events),
        message=f"{len(events)}개 Event 분류 완료"
    )


@router.post("/log", response_model=ClassifyResponse)
async def log_daily(request: LogRequest):
    """일일 로그 기록 및 72⁴ 변환"""
    # 로그 저장
    log_data = request.model_dump()
    log_data["timestamp"] = datetime.now().isoformat()
    
    if request.user_id not in LOG_STORE:
        LOG_STORE[request.user_id] = []
    LOG_STORE[request.user_id].append(log_data)
    
    # Event 변환
    classify_request = ClassifyRequest(
        data={
            "cash": request.cash,
            "revenue": request.revenue,
            "expense": request.expense,
            "customers": request.customers,
            "momentum": request.momentum,
            "risk": request.risk,
        },
        user_id=request.user_id,
        human_type=request.human_type
    )
    
    return await classify_data(classify_request)


@router.get("/user/{human_type}/dashboard", response_model=UserDashboard)
async def get_user_dashboard(
    human_type: str,
    user_id: str = Query(default="anonymous")
):
    """Human Type 기반 대시보드"""
    
    # 타입 검증
    if len(human_type) < 2 or human_type[0] not in "TBL":
        raise HTTPException(status_code=400, detail="Invalid human type")
    
    # 활성 노드 조회
    active_node_ids = TYPE_ACTIVE_NODES.get(human_type, CORE_NODES + ["n37", "n38", "n39", "n42", "n62", "n72"])
    
    active_nodes = []
    for node_id in active_node_ids:
        if node_id in NODES_72:
            info = NODES_72[node_id]
            active_nodes.append(NodeInfo(
                id=node_id,
                name=info["name"],
                name_kr=info["nameKr"],
                law=info["law"],
                category=info["category"],
                is_core=node_id in CORE_NODES
            ))
    
    # Primary Node (첫 번째 비-Core 노드)
    non_core = [n for n in active_nodes if not n.is_core]
    primary_node = non_core[0] if non_core else active_nodes[0]
    
    # Physics Node 결정
    category = human_type[0]
    physics_map = {"T": "CAPITAL", "B": "NETWORK", "L": "TIME"}
    physics_node = physics_map.get(category, "CAPITAL")
    
    # Human Type 이름
    type_names = {
        "T": "투자자", "B": "사업가", "L": "근로자"
    }
    type_name = f"{type_names.get(category, '사용자')} ({human_type})"
    
    # 최근 이벤트
    recent_events = EVENT_STORE.get(user_id, [])[-10:]
    
    # 통계
    stats = {
        "total_events": len(EVENT_STORE.get(user_id, [])),
        "total_logs": len(LOG_STORE.get(user_id, [])),
        "active_node_count": len(active_nodes),
        "event_space": 72**4,
        "coverage": len(EVENT_STORE.get(user_id, [])) / (72**4) if EVENT_STORE.get(user_id) else 0
    }
    
    # 경고
    warnings = []
    if stats["total_logs"] == 0:
        warnings.append("아직 로그가 없습니다. 매일 기록을 시작하세요!")
    
    # 추천
    recommendations = [
        f"매일 {primary_node.name_kr} 지표를 기록하세요",
        f"72⁴ 공간의 탐험을 계속하세요 (현재 커버리지: {stats['coverage']:.10%})"
    ]
    
    return UserDashboard(
        user_id=user_id,
        human_type=human_type,
        human_type_name=type_name,
        physics_node=physics_node,
        active_nodes=active_nodes,
        primary_node=primary_node,
        recent_events=recent_events,
        stats=stats,
        warnings=warnings,
        recommendations=recommendations
    )


@router.get("/events/{user_id}")
async def get_user_events(
    user_id: str,
    limit: int = Query(default=50, le=500),
    node: Optional[str] = None
):
    """사용자 이벤트 조회"""
    events = EVENT_STORE.get(user_id, [])
    
    if node:
        events = [e for e in events if e.node == node]
    
    return {
        "user_id": user_id,
        "total": len(events),
        "events": events[-limit:]
    }


@router.get("/stats")
async def get_global_stats():
    """전역 통계"""
    total_events = sum(len(events) for events in EVENT_STORE.values())
    total_users = len(EVENT_STORE)
    
    return {
        "total_events": total_events,
        "total_users": total_users,
        "nodes_count": 72,
        "event_space": 72**4,
        "core_nodes": CORE_NODES,
        "laws": ["L1: Conservation", "L2: Flow", "L3: Inertia", 
                 "L4: Acceleration", "L5: Friction", "L6: Gravity"]
    }


@router.delete("/events/{user_id}")
async def clear_user_events(user_id: str):
    """사용자 이벤트 삭제"""
    if user_id in EVENT_STORE:
        count = len(EVENT_STORE[user_id])
        del EVENT_STORE[user_id]
        return {"success": True, "deleted": count}
    return {"success": False, "message": "User not found"}
