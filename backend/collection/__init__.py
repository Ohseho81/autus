"""
═══════════════════════════════════════════════════════════════════════════════
📥 AUTUS Collection Module (데이터 수집 경로 체계)
═══════════════════════════════════════════════════════════════════════════════

데이터 수집 채널, 도메인, 소스 정의
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import Enum


# ═══════════════════════════════════════════════════════════════
# 데이터 클래스
# ═══════════════════════════════════════════════════════════════

@dataclass
class Channel:
    """수집 채널"""
    id: str
    name_ko: str
    name_en: str
    description: str
    icon: str = "📥"
    
    def to_dict(self) -> dict:
        return {
            "name_ko": self.name_ko,
            "name_en": self.name_en,
            "description": self.description,
            "icon": self.icon,
        }


@dataclass  
class Domain:
    """수집 도메인"""
    id: str
    name_ko: str
    name_en: str
    description: str
    nodes: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "name_ko": self.name_ko,
            "name_en": self.name_en,
            "description": self.description,
            "nodes": self.nodes,
        }


@dataclass
class Source:
    """수집 소스"""
    id: str
    name_ko: str
    name_en: str
    channel: str
    domain: str
    description: str
    provides_nodes: List[str] = field(default_factory=list)
    setup_effort: str = "easy"  # easy, medium, hard
    integration_type: str = "manual"  # manual, api_key, oauth
    available: bool = True
    
    def to_dict(self) -> dict:
        return {
            "name_ko": self.name_ko,
            "name_en": self.name_en,
            "channel": self.channel,
            "domain": self.domain,
            "description": self.description,
            "provides_nodes": self.provides_nodes,
            "setup_effort": self.setup_effort,
            "integration_type": self.integration_type,
            "available": self.available,
        }


# ═══════════════════════════════════════════════════════════════
# 채널 정의
# ═══════════════════════════════════════════════════════════════

CHANNELS: Dict[str, Channel] = {
    "C1": Channel(
        id="C1",
        name_ko="수동 입력",
        name_en="Manual Input",
        description="사용자가 직접 데이터 입력",
        icon="✍️",
    ),
    "C2": Channel(
        id="C2", 
        name_ko="파일 업로드",
        name_en="File Upload",
        description="CSV, Excel, PDF 등 파일 업로드",
        icon="📁",
    ),
    "C3": Channel(
        id="C3",
        name_ko="API 연동",
        name_en="API Integration",
        description="외부 서비스 API 자동 연동",
        icon="🔗",
    ),
    "C4": Channel(
        id="C4",
        name_ko="웹훅",
        name_en="Webhook",
        description="실시간 이벤트 수신",
        icon="📡",
    ),
}


# ═══════════════════════════════════════════════════════════════
# 도메인 정의
# ═══════════════════════════════════════════════════════════════

DOMAINS: Dict[str, Domain] = {
    "D1": Domain(
        id="D1",
        name_ko="재무",
        name_en="Finance",
        description="수입, 지출, 자산, 부채",
        nodes=["n01", "n09", "n10", "n53"],
    ),
    "D2": Domain(
        id="D2",
        name_ko="건강",
        name_en="Health",
        description="신체, 정신, 수면, 운동",
        nodes=["n05", "n06", "n07", "n08"],
    ),
    "D3": Domain(
        id="D3",
        name_ko="관계",
        name_en="Relationships",
        description="가족, 친구, 업무 관계",
        nodes=["n20", "n21", "n22", "n23"],
    ),
    "D4": Domain(
        id="D4",
        name_ko="커리어",
        name_en="Career",
        description="직업, 기술, 프로젝트",
        nodes=["n15", "n16", "n17"],
    ),
    "D5": Domain(
        id="D5",
        name_ko="시간",
        name_en="Time",
        description="일정, 생산성, 습관",
        nodes=["n41", "n42", "n43", "n44"],
    ),
}


# ═══════════════════════════════════════════════════════════════
# 소스 카탈로그
# ═══════════════════════════════════════════════════════════════

SOURCE_CATALOG: Dict[str, Source] = {
    # 수동 입력 소스
    "S001": Source(
        id="S001",
        name_ko="일일 로그",
        name_en="Daily Log",
        channel="C1",
        domain="D1,D2,D5",
        description="매일 핵심 지표 직접 입력",
        provides_nodes=["n01", "n09", "n10", "n41"],
        setup_effort="easy",
    ),
    "S002": Source(
        id="S002",
        name_ko="주간 회고",
        name_en="Weekly Review",
        channel="C1",
        domain="D4,D5",
        description="주간 성과와 계획 정리",
        provides_nodes=["n15", "n16", "n42"],
        setup_effort="easy",
    ),
    
    # 파일 업로드 소스
    "S010": Source(
        id="S010",
        name_ko="은행 명세서",
        name_en="Bank Statement",
        channel="C2",
        domain="D1",
        description="은행 거래 내역 CSV/PDF",
        provides_nodes=["n01", "n09", "n10", "n53"],
        setup_effort="medium",
    ),
    "S011": Source(
        id="S011",
        name_ko="건강검진 결과",
        name_en="Health Checkup",
        channel="C2",
        domain="D2",
        description="건강검진 보고서",
        provides_nodes=["n05", "n06", "n07"],
        setup_effort="medium",
    ),
    
    # API 연동 소스
    "S020": Source(
        id="S020",
        name_ko="Google Calendar",
        name_en="Google Calendar",
        channel="C3",
        domain="D5",
        description="일정 자동 동기화",
        provides_nodes=["n06", "n15", "n44"],
        setup_effort="easy",
        integration_type="oauth",
    ),
    "S021": Source(
        id="S021",
        name_ko="Fitbit/Apple Health",
        name_en="Fitbit/Apple Health",
        channel="C3",
        domain="D2",
        description="건강 데이터 자동 수집",
        provides_nodes=["n05", "n06", "n07", "n08"],
        setup_effort="medium",
        integration_type="oauth",
    ),
    "S022": Source(
        id="S022",
        name_ko="Stripe",
        name_en="Stripe",
        channel="C3",
        domain="D1",
        description="결제 데이터 자동 수집",
        provides_nodes=["n01", "n09", "n10"],
        setup_effort="medium",
        integration_type="api_key",
    ),
    
    # 웹훅 소스
    "S030": Source(
        id="S030",
        name_ko="Shopify",
        name_en="Shopify",
        channel="C4",
        domain="D1,D4",
        description="이커머스 이벤트 수신",
        provides_nodes=["n01", "n09", "n16"],
        setup_effort="medium",
        integration_type="api_key",
    ),
}


# ═══════════════════════════════════════════════════════════════
# 수집 우선순위
# ═══════════════════════════════════════════════════════════════

COLLECTION_PRIORITY = {
    "critical": ["S001", "S010"],  # 반드시 수집
    "important": ["S020", "S022"],  # 주기적 수집
    "supportive": ["S002", "S021"],  # 가능하면 수집
    "optional": ["S011", "S030"],  # 있으면 좋음
}


# ═══════════════════════════════════════════════════════════════
# 헬퍼 함수
# ═══════════════════════════════════════════════════════════════

def get_node_sources(node_id: str) -> List[dict]:
    """노드별 소스 목록"""
    result = []
    for src_id, src in SOURCE_CATALOG.items():
        if node_id in src.provides_nodes:
            result.append({
                "id": src_id,
                "name": src.name_ko,
                "channel": src.channel,
                "effort": src.setup_effort,
            })
    return result


def get_domain_sources(domain_id: str) -> List[dict]:
    """도메인별 소스 목록"""
    result = []
    for src_id, src in SOURCE_CATALOG.items():
        if domain_id in src.domain:
            result.append({
                "id": src_id,
                "name": src.name_ko,
                "channel": src.channel,
            })
    return result


def get_channel_sources(channel_id: str) -> List[dict]:
    """채널별 소스 목록"""
    result = []
    for src_id, src in SOURCE_CATALOG.items():
        if src.channel == channel_id:
            result.append({
                "id": src_id,
                "name": src.name_ko,
                "domain": src.domain,
            })
    return result


def get_recommended_setup() -> dict:
    """추천 설정"""
    return {
        "essential": [
            {"source": "S001", "priority": 1},
            {"source": "S010", "priority": 2},
            {"source": "S020", "priority": 3},
        ],
        "recommended": [
            {"source": "S022", "priority": 4},
            {"source": "S002", "priority": 5},
            {"source": "S021", "priority": 6},
        ],
        "advanced": [
            {"source": "S011", "priority": 7},
            {"source": "S030", "priority": 8},
        ],
    }


def get_collection_summary() -> dict:
    """수집 체계 요약"""
    return {
        "channels": len(CHANNELS),
        "domains": len(DOMAINS),
        "sources": len(SOURCE_CATALOG),
        "nodes_covered": len(set(
            node for src in SOURCE_CATALOG.values()
            for node in src.provides_nodes
        )),
        "api_integrations": len([
            s for s in SOURCE_CATALOG.values()
            if s.channel == "C3"
        ]),
    }


# ═══════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════

__all__ = [
    "Channel",
    "Domain", 
    "Source",
    "CHANNELS",
    "DOMAINS",
    "SOURCE_CATALOG",
    "COLLECTION_PRIORITY",
    "get_node_sources",
    "get_domain_sources",
    "get_channel_sources",
    "get_recommended_setup",
    "get_collection_summary",
]
