"""
AUTUS Data Collection Framework
================================

데이터 수집 경로 체계

구조:
- 5개 수집 채널 (Channel)
- 7개 데이터 도메인 (Domain)
- 72개 노드 매핑 (Node)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum


# ============================================
# 수집 채널 (HOW - 어떻게 수집하는가)
# ============================================

class CollectionChannel(Enum):
    """데이터 수집 채널"""
    
    # C1: 수동 입력 (Manual Input)
    MANUAL = "manual"
    
    # C2: 파일 업로드 (File Upload)
    FILE = "file"
    
    # C3: API 연동 (API Integration)
    API = "api"
    
    # C4: 자동 추론 (Auto Inference)
    INFERENCE = "inference"
    
    # C5: 질문 응답 (Q&A)
    QNA = "qna"


@dataclass
class ChannelConfig:
    """채널 설정"""
    channel: CollectionChannel
    name_ko: str
    name_en: str
    description: str
    
    # 특성
    realtime: bool = False          # 실시간 여부
    requires_user: bool = True      # 사용자 개입 필요
    accuracy: str = "high"          # high, medium, low
    effort: str = "high"            # 사용자 노력 (high, medium, low)
    
    # 예시 소스
    examples: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "channel": self.channel.value,
            "name_ko": self.name_ko,
            "name_en": self.name_en,
            "description": self.description,
            "realtime": self.realtime,
            "requires_user": self.requires_user,
            "accuracy": self.accuracy,
            "effort": self.effort,
            "examples": self.examples,
        }


CHANNELS: Dict[str, ChannelConfig] = {
    "C1": ChannelConfig(
        channel=CollectionChannel.MANUAL,
        name_ko="수동 입력",
        name_en="Manual Input",
        description="사용자가 직접 값을 입력",
        realtime=False,
        requires_user=True,
        accuracy="high",
        effort="high",
        examples=["일일 로그", "모멘텀 자가평가", "메모"],
    ),
    "C2": ChannelConfig(
        channel=CollectionChannel.FILE,
        name_ko="파일 업로드",
        name_en="File Upload",
        description="파일에서 데이터 추출",
        realtime=False,
        requires_user=True,
        accuracy="high",
        effort="medium",
        examples=["은행 명세서", "엑셀 보고서", "PDF 계약서"],
    ),
    "C3": ChannelConfig(
        channel=CollectionChannel.API,
        name_ko="API 연동",
        name_en="API Integration",
        description="외부 서비스에서 자동 수집",
        realtime=True,
        requires_user=False,
        accuracy="high",
        effort="low",
        examples=["Google Calendar", "Slack", "회계 소프트웨어", "CRM"],
    ),
    "C4": ChannelConfig(
        channel=CollectionChannel.INFERENCE,
        name_ko="자동 추론",
        name_en="Auto Inference",
        description="기존 데이터에서 패턴 추론",
        realtime=True,
        requires_user=False,
        accuracy="medium",
        effort="low",
        examples=["런웨이 계산", "트렌드 감지", "이상 탐지"],
    ),
    "C5": ChannelConfig(
        channel=CollectionChannel.QNA,
        name_ko="질문 응답",
        name_en="Q&A",
        description="시스템 질문에 사용자 응답",
        realtime=False,
        requires_user=True,
        accuracy="medium",
        effort="low",
        examples=["만족도 조사", "위험 평가", "목표 확인"],
    ),
}


# ============================================
# 데이터 도메인 (WHAT - 무엇을 수집하는가)
# ============================================

class DataDomain(Enum):
    """데이터 도메인"""
    
    # D1: 재무 (Financial)
    FINANCIAL = "financial"
    
    # D2: 운영 (Operational)
    OPERATIONAL = "operational"
    
    # D3: 관계 (Relational)
    RELATIONAL = "relational"
    
    # D4: 상태 (State)
    STATE = "state"
    
    # D5: 행동 (Behavioral)
    BEHAVIORAL = "behavioral"
    
    # D6: 환경 (Environmental)
    ENVIRONMENTAL = "environmental"
    
    # D7: 목표 (Goal)
    GOAL = "goal"


@dataclass
class DomainConfig:
    """도메인 설정"""
    domain: DataDomain
    name_ko: str
    name_en: str
    description: str
    
    # 관련 노드
    node_range: str                 # 관련 노드 범위
    primary_nodes: List[str]        # 핵심 노드
    
    # 수집 특성
    update_frequency: str           # daily, weekly, realtime, event
    sensitivity: str                # high, medium, low (개인정보 민감도)
    
    # 추천 채널
    recommended_channels: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "domain": self.domain.value,
            "name_ko": self.name_ko,
            "name_en": self.name_en,
            "description": self.description,
            "node_range": self.node_range,
            "primary_nodes": self.primary_nodes,
            "update_frequency": self.update_frequency,
            "sensitivity": self.sensitivity,
            "recommended_channels": self.recommended_channels,
        }


DOMAINS: Dict[str, DomainConfig] = {
    "D1": DomainConfig(
        domain=DataDomain.FINANCIAL,
        name_ko="재무",
        name_en="Financial",
        description="돈의 흐름과 재무 상태",
        node_range="n01, n09-n12, n53, n67",
        primary_nodes=["n01", "n09", "n10", "n53", "n67"],
        update_frequency="daily",
        sensitivity="high",
        recommended_channels=["C1", "C2", "C3"],
    ),
    "D2": DomainConfig(
        domain=DataDomain.OPERATIONAL,
        name_ko="운영",
        name_en="Operational",
        description="업무 처리와 생산성",
        node_range="n04-n08, n15-n16, n29-n40",
        primary_nodes=["n15", "n32", "n33", "n39"],
        update_frequency="daily",
        sensitivity="low",
        recommended_channels=["C3", "C4"],
    ),
    "D3": DomainConfig(
        domain=DataDomain.RELATIONAL,
        name_ko="관계",
        name_en="Relational",
        description="고객, 파트너, 네트워크",
        node_range="n17-n28",
        primary_nodes=["n17", "n18", "n22", "n27"],
        update_frequency="weekly",
        sensitivity="medium",
        recommended_channels=["C1", "C3", "C5"],
    ),
    "D4": DomainConfig(
        domain=DataDomain.STATE,
        name_ko="상태",
        name_en="State",
        description="개인/조직의 현재 상태",
        node_range="n41-n52",
        primary_nodes=["n41", "n42", "n45", "n48"],
        update_frequency="daily",
        sensitivity="high",
        recommended_channels=["C1", "C5"],
    ),
    "D5": DomainConfig(
        domain=DataDomain.BEHAVIORAL,
        name_ko="행동",
        name_en="Behavioral",
        description="사용자 행동 패턴",
        node_range="(행동 로그)",
        primary_nodes=[],
        update_frequency="realtime",
        sensitivity="medium",
        recommended_channels=["C3", "C4"],
    ),
    "D6": DomainConfig(
        domain=DataDomain.ENVIRONMENTAL,
        name_ko="환경",
        name_en="Environmental",
        description="외부 환경과 시장 상황",
        node_range="n23, n55, n58",
        primary_nodes=["n23", "n55"],
        update_frequency="weekly",
        sensitivity="low",
        recommended_channels=["C3", "C4"],
    ),
    "D7": DomainConfig(
        domain=DataDomain.GOAL,
        name_ko="목표",
        name_en="Goal",
        description="목표와 계획",
        node_range="n49, n51, n63-n72",
        primary_nodes=["n49", "n63", "n72"],
        update_frequency="weekly",
        sensitivity="medium",
        recommended_channels=["C1", "C5"],
    ),
}


# ============================================
# 데이터 소스 (WHERE - 어디서 가져오는가)
# ============================================

@dataclass
class DataSource:
    """데이터 소스"""
    source_id: str
    name_ko: str
    name_en: str
    
    # 분류
    channel: str                    # C1-C5
    domain: str                     # D1-D7
    
    # 연결 정보
    integration_type: str           # oauth, api_key, file, manual
    setup_effort: str               # easy, medium, hard
    
    # 제공 데이터
    provides_nodes: List[str]       # 제공하는 노드들
    update_method: str              # push, pull, manual
    
    # 상태
    available: bool = True
    
    def to_dict(self) -> Dict:
        return {
            "source_id": self.source_id,
            "name_ko": self.name_ko,
            "name_en": self.name_en,
            "channel": self.channel,
            "domain": self.domain,
            "integration_type": self.integration_type,
            "setup_effort": self.setup_effort,
            "provides_nodes": self.provides_nodes,
            "update_method": self.update_method,
            "available": self.available,
        }


# ============================================
# 소스 카탈로그
# ============================================

SOURCE_CATALOG: Dict[str, DataSource] = {
    
    # ========================================
    # 수동 입력 (C1)
    # ========================================
    
    "S001": DataSource(
        source_id="S001",
        name_ko="일일 로그",
        name_en="Daily Log",
        channel="C1",
        domain="D1,D3,D4",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n01", "n09", "n10", "n17", "n18", "n41", "n45", "n59"],
        update_method="manual",
    ),
    
    "S002": DataSource(
        source_id="S002",
        name_ko="주간 리뷰",
        name_en="Weekly Review",
        channel="C1",
        domain="D4,D7",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n42", "n43", "n49", "n72"],
        update_method="manual",
    ),
    
    "S003": DataSource(
        source_id="S003",
        name_ko="목표 설정",
        name_en="Goal Setting",
        channel="C1",
        domain="D7",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n49", "n51", "n63"],
        update_method="manual",
    ),
    
    # ========================================
    # 파일 업로드 (C2)
    # ========================================
    
    "S010": DataSource(
        source_id="S010",
        name_ko="은행 명세서",
        name_en="Bank Statement",
        channel="C2",
        domain="D1",
        integration_type="file",
        setup_effort="easy",
        provides_nodes=["n01", "n09", "n10", "n11", "n53"],
        update_method="manual",
    ),
    
    "S011": DataSource(
        source_id="S011",
        name_ko="엑셀 재무표",
        name_en="Excel Financial",
        channel="C2",
        domain="D1",
        integration_type="file",
        setup_effort="easy",
        provides_nodes=["n01", "n02", "n09", "n10", "n11", "n12", "n53"],
        update_method="manual",
    ),
    
    "S012": DataSource(
        source_id="S012",
        name_ko="고객 명단",
        name_en="Customer List",
        channel="C2",
        domain="D3",
        integration_type="file",
        setup_effort="easy",
        provides_nodes=["n17", "n18", "n22", "n57"],
        update_method="manual",
    ),
    
    "S013": DataSource(
        source_id="S013",
        name_ko="재고 목록",
        name_en="Inventory List",
        channel="C2",
        domain="D2",
        integration_type="file",
        setup_effort="easy",
        provides_nodes=["n03"],
        update_method="manual",
    ),
    
    # ========================================
    # API 연동 (C3)
    # ========================================
    
    "S020": DataSource(
        source_id="S020",
        name_ko="Google Calendar",
        name_en="Google Calendar",
        channel="C3",
        domain="D2,D5",
        integration_type="oauth",
        setup_effort="easy",
        provides_nodes=["n06", "n15", "n44"],
        update_method="push",
    ),
    
    "S021": DataSource(
        source_id="S021",
        name_ko="Slack",
        name_en="Slack",
        channel="C3",
        domain="D3,D5",
        integration_type="oauth",
        setup_effort="easy",
        provides_nodes=["n24", "n25"],
        update_method="push",
    ),
    
    "S022": DataSource(
        source_id="S022",
        name_ko="토스/뱅크샐러드",
        name_en="Toss/BankSalad",
        channel="C3",
        domain="D1",
        integration_type="oauth",
        setup_effort="medium",
        provides_nodes=["n01", "n09", "n10", "n53"],
        update_method="pull",
    ),
    
    "S023": DataSource(
        source_id="S023",
        name_ko="회계 소프트웨어",
        name_en="Accounting Software",
        channel="C3",
        domain="D1",
        integration_type="api_key",
        setup_effort="medium",
        provides_nodes=["n01", "n02", "n09", "n10", "n11", "n12", "n53"],
        update_method="pull",
    ),
    
    "S024": DataSource(
        source_id="S024",
        name_ko="CRM",
        name_en="CRM",
        channel="C3",
        domain="D3",
        integration_type="api_key",
        setup_effort="medium",
        provides_nodes=["n17", "n18", "n19", "n22", "n25", "n27", "n66"],
        update_method="pull",
    ),
    
    "S025": DataSource(
        source_id="S025",
        name_ko="이메일",
        name_en="Email",
        channel="C3",
        domain="D3,D5",
        integration_type="oauth",
        setup_effort="easy",
        provides_nodes=["n13", "n24"],
        update_method="push",
    ),
    
    "S026": DataSource(
        source_id="S026",
        name_ko="프로젝트 관리 (Notion/Asana)",
        name_en="Project Management",
        channel="C3",
        domain="D2,D7",
        integration_type="oauth",
        setup_effort="easy",
        provides_nodes=["n15", "n16", "n49", "n62"],
        update_method="pull",
    ),
    
    "S027": DataSource(
        source_id="S027",
        name_ko="POS 시스템",
        name_en="POS System",
        channel="C3",
        domain="D1,D3",
        integration_type="api_key",
        setup_effort="hard",
        provides_nodes=["n03", "n09", "n17"],
        update_method="push",
    ),
    
    "S028": DataSource(
        source_id="S028",
        name_ko="웨어러블 (건강)",
        name_en="Wearable Health",
        channel="C3",
        domain="D4",
        integration_type="oauth",
        setup_effort="easy",
        provides_nodes=["n07", "n45", "n47"],
        update_method="pull",
    ),
    
    # ========================================
    # 자동 추론 (C4)
    # ========================================
    
    "S030": DataSource(
        source_id="S030",
        name_ko="런웨이 계산",
        name_en="Runway Calculator",
        channel="C4",
        domain="D1",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n67"],
        update_method="push",
    ),
    
    "S031": DataSource(
        source_id="S031",
        name_ko="트렌드 분석",
        name_en="Trend Analysis",
        channel="C4",
        domain="D1,D3",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n64", "n65"],
        update_method="push",
    ),
    
    "S032": DataSource(
        source_id="S032",
        name_ko="위험 추론",
        name_en="Risk Inference",
        channel="C4",
        domain="D6",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n59", "n60"],
        update_method="push",
    ),
    
    "S033": DataSource(
        source_id="S033",
        name_ko="패턴 학습",
        name_en="Pattern Learning",
        channel="C4",
        domain="D5",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=[],  # 메타 데이터
        update_method="push",
    ),
    
    "S034": DataSource(
        source_id="S034",
        name_ko="의존도 계산",
        name_en="Dependency Calculator",
        channel="C4",
        domain="D3",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n57", "n70"],
        update_method="push",
    ),
    
    # ========================================
    # 질문 응답 (C5)
    # ========================================
    
    "S040": DataSource(
        source_id="S040",
        name_ko="모멘텀 체크",
        name_en="Momentum Check",
        channel="C5",
        domain="D4",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n41", "n42", "n43"],
        update_method="manual",
    ),
    
    "S041": DataSource(
        source_id="S041",
        name_ko="고객 만족 조사",
        name_en="Customer Satisfaction",
        channel="C5",
        domain="D3",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n27", "n28"],
        update_method="manual",
    ),
    
    "S042": DataSource(
        source_id="S042",
        name_ko="위험 평가 질문",
        name_en="Risk Assessment",
        channel="C5",
        domain="D6",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n55", "n58", "n59"],
        update_method="manual",
    ),
    
    "S043": DataSource(
        source_id="S043",
        name_ko="번아웃 체크",
        name_en="Burnout Check",
        channel="C5",
        domain="D4",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n45", "n47", "n48"],
        update_method="manual",
    ),
    
    "S044": DataSource(
        source_id="S044",
        name_ko="기회 발견 질문",
        name_en="Opportunity Discovery",
        channel="C5",
        domain="D7",
        integration_type="manual",
        setup_effort="easy",
        provides_nodes=["n63", "n66", "n72"],
        update_method="manual",
    ),
}


# ============================================
# 수집 우선순위 매트릭스
# ============================================

COLLECTION_PRIORITY = {
    # 핵심 (반드시 수집)
    "critical": {
        "nodes": ["n01", "n09", "n10", "n17", "n41", "n59", "n67"],
        "description": "생존과 직결되는 핵심 지표",
        "min_frequency": "daily",
    },
    
    # 중요 (주기적 수집)
    "important": {
        "nodes": ["n11", "n18", "n22", "n27", "n42", "n53", "n72"],
        "description": "성장과 안정에 중요한 지표",
        "min_frequency": "weekly",
    },
    
    # 보조 (가능하면 수집)
    "supportive": {
        "nodes": ["n15", "n24", "n33", "n45", "n63", "n64"],
        "description": "인사이트 강화를 위한 지표",
        "min_frequency": "weekly",
    },
    
    # 선택 (있으면 좋음)
    "optional": {
        "nodes": ["n03", "n04", "n07", "n28", "n35", "n71"],
        "description": "상세 분석을 위한 보조 지표",
        "min_frequency": "monthly",
    },
}


# ============================================
# 유틸리티 함수
# ============================================

def get_node_sources(node_id: str) -> List[Dict]:
    """노드별 데이터 소스 조회"""
    sources = []
    for src_id, source in SOURCE_CATALOG.items():
        if node_id in source.provides_nodes:
            sources.append({
                "source_id": src_id,
                "name": source.name_ko,
                "channel": source.channel,
                "effort": source.setup_effort,
            })
    return sources


def get_domain_sources(domain_id: str) -> List[Dict]:
    """도메인별 데이터 소스 조회"""
    sources = []
    for src_id, source in SOURCE_CATALOG.items():
        if domain_id in source.domain:
            sources.append({
                "source_id": src_id,
                "name": source.name_ko,
                "channel": source.channel,
            })
    return sources


def get_channel_sources(channel_id: str) -> List[Dict]:
    """채널별 데이터 소스 조회"""
    sources = []
    for src_id, source in SOURCE_CATALOG.items():
        if source.channel == channel_id:
            sources.append({
                "source_id": src_id,
                "name": source.name_ko,
                "domain": source.domain,
                "nodes_count": len(source.provides_nodes),
            })
    return sources


def get_recommended_setup() -> Dict:
    """추천 초기 설정"""
    return {
        "essential": [
            {"source": "S001", "reason": "기본 데이터 수집"},
            {"source": "S010", "reason": "재무 데이터 자동화"},
            {"source": "S020", "reason": "일정 자동 추적"},
        ],
        "recommended": [
            {"source": "S022", "reason": "실시간 재무 연동"},
            {"source": "S024", "reason": "고객 데이터 자동화"},
            {"source": "S026", "reason": "프로젝트 진행 추적"},
        ],
        "advanced": [
            {"source": "S023", "reason": "회계 완전 자동화"},
            {"source": "S027", "reason": "매출 실시간 추적"},
            {"source": "S028", "reason": "건강 상태 모니터링"},
        ],
    }


def get_collection_summary() -> Dict:
    """수집 체계 요약"""
    # 채널별 통계
    channel_stats = {}
    for ch_id, ch in CHANNELS.items():
        sources = get_channel_sources(ch_id)
        channel_stats[ch_id] = {
            "name": ch.name_ko,
            "source_count": len(sources),
            "realtime": ch.realtime,
            "effort": ch.effort,
        }
    
    # 도메인별 통계
    domain_stats = {}
    for dm_id, dm in DOMAINS.items():
        sources = get_domain_sources(dm_id)
        domain_stats[dm_id] = {
            "name": dm.name_ko,
            "source_count": len(sources),
            "primary_nodes": dm.primary_nodes,
            "sensitivity": dm.sensitivity,
        }
    
    # 노드 커버리지
    covered_nodes = set()
    for source in SOURCE_CATALOG.values():
        covered_nodes.update(source.provides_nodes)
    
    return {
        "total_sources": len(SOURCE_CATALOG),
        "total_channels": len(CHANNELS),
        "total_domains": len(DOMAINS),
        "covered_nodes": len(covered_nodes),
        "channels": channel_stats,
        "domains": domain_stats,
        "priority": COLLECTION_PRIORITY,
    }


# ============================================
# Export
# ============================================

__all__ = [
    "CollectionChannel",
    "ChannelConfig",
    "CHANNELS",
    "DataDomain",
    "DomainConfig",
    "DOMAINS",
    "DataSource",
    "SOURCE_CATALOG",
    "get_node_sources",
    "get_domain_sources",
    "get_channel_sources",
    "get_recommended_setup",
    "get_collection_summary",
    "COLLECTION_PRIORITY",
]
