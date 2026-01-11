"""
═══════════════════════════════════════════════════════════════════════════════
🏛️ AUTUS 16 Domains v2.1.0 (16개 도메인 정의)
═══════════════════════════════════════════════════════════════════════════════

16 = 2⁴ = 4 Meta × 4 Domains

4개 메타 카테고리:
- MAT (Material): 물질 - CAP, BIO, SPA, TEC
- MEN (Mental): 정신 - COG, EMO, ETH, SPI
- DYN (Dynamic): 동적 - TEM, SOC, CRE, COM
- TRS (Transcendent): 초월 - STR, RES, TRN, LED

"컴퓨터와 인간의 최적 균형점"
═══════════════════════════════════════════════════════════════════════════════
"""

from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Tuple


# ═══════════════════════════════════════════════════════════════════════════════
# 상수
# ═══════════════════════════════════════════════════════════════════════════════

DOMAINS_16 = 16
NODES_PER_DOMAIN = 3
TOTAL_NODES_48 = DOMAINS_16 * NODES_PER_DOMAIN  # 48
SECTORS_PER_DOMAIN = 12
MASTERS_PER_SECTOR = 1000
TOTAL_MASTERS_192K = DOMAINS_16 * SECTORS_PER_DOMAIN * MASTERS_PER_SECTOR  # 192,000
VECTOR_DIM = 512


# ═══════════════════════════════════════════════════════════════════════════════
# 메타 카테고리
# ═══════════════════════════════════════════════════════════════════════════════

class MetaCategory(Enum):
    """4개 메타 카테고리"""
    MAT = ("MAT", "Material", "물질", "#4CAF50")
    MEN = ("MEN", "Mental", "정신", "#2196F3")
    DYN = ("DYN", "Dynamic", "동적", "#FF9800")
    TRS = ("TRS", "Transcendent", "초월", "#9C27B0")
    
    def __init__(self, code: str, name_en: str, name_kr: str, color: str):
        self.code = code
        self.name_en = name_en
        self.name_kr = name_kr
        self.color = color


# ═══════════════════════════════════════════════════════════════════════════════
# 16개 도메인
# ═══════════════════════════════════════════════════════════════════════════════

class Domain16(Enum):
    """16개 전략 도메인 (4 Meta × 4 Domains)"""
    
    # ─── Material (물질) ───
    CAP = ("CAP", "Capital & Resource", "자본과 자원", "MAT", "#FFD700", "💰")
    BIO = ("BIO", "Biology & Health", "생명과 건강", "MAT", "#4CAF50", "🌿")
    SPA = ("SPA", "Space & Environment", "공간과 환경", "MAT", "#00BCD4", "🗺️")
    TEC = ("TEC", "Technology & Tools", "기술과 도구", "MAT", "#607D8B", "⚙️")
    
    # ─── Mental (정신) ───
    COG = ("COG", "Cognition & Logic", "인지와 논리", "MEN", "#3F51B5", "🧠")
    EMO = ("EMO", "Emotion & Empathy", "감정과 공감", "MEN", "#E91E63", "💗")
    ETH = ("ETH", "Ethics & Values", "윤리와 가치", "MEN", "#795548", "⚖️")
    SPI = ("SPI", "Spirituality & Meaning", "영성과 의미", "MEN", "#673AB7", "🔮")
    
    # ─── Dynamic (동적) ───
    TEM = ("TEM", "Temporal & Rhythm", "시간과 리듬", "DYN", "#9C27B0", "⏰")
    SOC = ("SOC", "Social & Network", "관계와 네트워크", "DYN", "#FF5722", "👥")
    CRE = ("CRE", "Creative & Innovation", "창조와 혁신", "DYN", "#F44336", "✨")
    COM = ("COM", "Communication & Expression", "소통과 표현", "DYN", "#03A9F4", "📢")
    
    # ─── Transcendent (초월) ───
    STR = ("STR", "Strategy & Vision", "전략과 비전", "TRS", "#2196F3", "🎯")
    RES = ("RES", "Resilience & Adaptation", "회복과 적응", "TRS", "#FF9800", "💪")
    TRN = ("TRN", "Growth & Breakthrough", "성장과 돌파", "TRS", "#8BC34A", "🚀")
    LED = ("LED", "Leadership & Influence", "리더십과 영향력", "TRS", "#FFC107", "👑")
    
    def __init__(self, code: str, name_en: str, name_kr: str, meta: str, color: str, icon: str):
        self.code = code
        self.name_en = name_en
        self.name_kr = name_kr
        self.meta = meta
        self.color = color
        self.icon = icon
    
    @classmethod
    def get_by_meta(cls, meta_code: str) -> List["Domain16"]:
        """메타 카테고리별 도메인 조회"""
        return [d for d in cls if d.meta == meta_code]
    
    @classmethod
    def get_domain_id(cls, domain: "Domain16") -> int:
        """도메인 ID (0-15) 반환"""
        return list(cls).index(domain)


# ═══════════════════════════════════════════════════════════════════════════════
# 노드 타입
# ═══════════════════════════════════════════════════════════════════════════════

class NodeType(Enum):
    """3가지 노드 타입"""
    ARCHETYPE = ("archetype", "원형", "⭐", "본질적 정의")
    DYNAMICS = ("dynamics", "역학", "🔄", "변화와 흐름")
    EQUILIBRIUM = ("equilibrium", "평형", "⚖️", "균형점")
    
    def __init__(self, code: str, name_kr: str, icon: str, description: str):
        self.code = code
        self.name_kr = name_kr
        self.icon = icon
        self.description = description


# ═══════════════════════════════════════════════════════════════════════════════
# 유틸리티 함수
# ═══════════════════════════════════════════════════════════════════════════════

def get_node_id(domain_id: int, node_type_idx: int) -> str:
    """노드 ID 생성 (n01 ~ n48)"""
    global_id = domain_id * 3 + node_type_idx + 1
    return f"n{global_id:02d}"


def get_domain_from_node_id(node_id: str) -> Tuple[Domain16, NodeType]:
    """노드 ID에서 도메인과 타입 추출"""
    global_id = int(node_id[1:])  # "n01" -> 1
    domain_id = (global_id - 1) // 3
    node_type_idx = (global_id - 1) % 3
    
    return list(Domain16)[domain_id], list(NodeType)[node_type_idx]


def get_all_nodes() -> List[Dict]:
    """48개 노드 전체 목록"""
    nodes = []
    for d_idx, domain in enumerate(Domain16):
        for n_idx, node_type in enumerate(NodeType):
            node_id = get_node_id(d_idx, n_idx)
            nodes.append({
                "id": node_id,
                "global_id": d_idx * 3 + n_idx + 1,
                "domain": domain.code,
                "domain_name": domain.name_kr,
                "type": node_type.code,
                "type_name": node_type.name_kr,
                "meta": domain.meta,
                "color": domain.color,
                "icon": domain.icon,
            })
    return nodes


def get_meta_structure() -> Dict:
    """4×4×3 구조 반환"""
    structure = {}
    for meta in MetaCategory:
        domains = Domain16.get_by_meta(meta.code)
        structure[meta.code] = {
            "name_en": meta.name_en,
            "name_kr": meta.name_kr,
            "color": meta.color,
            "domains": [
                {
                    "code": d.code,
                    "name_kr": d.name_kr,
                    "icon": d.icon,
                    "nodes": [
                        get_node_id(Domain16.get_domain_id(d), n_idx)
                        for n_idx in range(3)
                    ]
                }
                for d in domains
            ]
        }
    return structure


# ═══════════════════════════════════════════════════════════════════════════════
# 12 → 16 마이그레이션 매핑
# ═══════════════════════════════════════════════════════════════════════════════

MIGRATION_MAP_12_TO_16 = {
    # 기존 12개 도메인 → 16개 도메인 매핑
    "CAP": "CAP",  # 유지
    "COG": "COG",  # 유지
    "BIO": "BIO",  # 유지
    "SOC": "SOC",  # 유지
    "TEM": "TEM",  # 유지
    "SPA": "SPA",  # 유지
    "CRE": "CRE",  # 유지
    "STR": "STR",  # 유지
    "EMO": "EMO",  # 유지
    "ETH": "ETH",  # 유지
    "RES": "RES",  # 유지
    "TRN": "TRN",  # 유지
    # 신규 4개: TEC, SPI, COM, LED
}


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "MetaCategory",
    "Domain16",
    "NodeType",
    "DOMAINS_16",
    "NODES_PER_DOMAIN",
    "TOTAL_NODES_48",
    "SECTORS_PER_DOMAIN",
    "MASTERS_PER_SECTOR",
    "TOTAL_MASTERS_192K",
    "VECTOR_DIM",
    "get_node_id",
    "get_domain_from_node_id",
    "get_all_nodes",
    "get_meta_structure",
    "MIGRATION_MAP_12_TO_16",
]
