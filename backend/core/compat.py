"""
═══════════════════════════════════════════════════════════════════════════════
🔄 AUTUS Compatibility Layer
═══════════════════════════════════════════════════════════════════════════════

삭제된 레거시 모듈에 대한 호환성 레이어
새 코드는 autus_unified.py를 직접 사용하세요.

이 파일은 다음 레거시 모듈을 대체합니다:
- nodes36.py
- strategic_nodes.py
- domains16.py

═══════════════════════════════════════════════════════════════════════════════
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import hashlib
import numpy as np

from .autus_unified import (
    get_simulator,
    Node,
    DOMAIN_INFO,
    NODE_TYPE_INFO,
    META_INFO,
    TOTAL_NODES,
    TOTAL_DOMAINS,
    parse_node_id,
    get_node_id,
    format_number,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 레거시 상수 호환
# ═══════════════════════════════════════════════════════════════════════════════

# nodes36.py 호환
NODE_DEFINITIONS: Dict[str, Dict] = {}
for i in range(1, 49):
    node_id = f"n{i:02d}"
    _, domain, node_type = parse_node_id(node_id)
    domain_info = DOMAIN_INFO.get(domain, {})
    type_info = NODE_TYPE_INFO.get(node_type, {})
    
    NODE_DEFINITIONS[node_id] = {
        "name": f"{domain_info.get('name', '')} {type_info.get('name', '')}",
        "name_en": f"{domain_info.get('name_en', '')} {type_info.get('name', '')}",
        "domain": domain,
        "type": node_type,
        "physics": domain_info.get("meta", "MAT"),
        "emoji": type_info.get("emoji", "⭐"),
    }


# strategic_nodes.py 호환
class PhysicsDimension(Enum):
    """레거시 물리 차원 (메타 카테고리로 대체됨)"""
    MAT = "MAT"
    MEN = "MEN"
    DYN = "DYN"
    TRS = "TRS"


class NodeType(Enum):
    """노드 유형"""
    ARCHETYPE = "A"
    DYNAMICS = "D"
    EQUILIBRIUM = "E"


# ═══════════════════════════════════════════════════════════════════════════════
# 레거시 Node36 클래스 호환
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Node36:
    """레거시 36노드 호환 클래스"""
    id: str
    name: str
    name_en: str
    domain: str
    physics: str
    emoji: str
    value: float = 0.0
    energy: float = 1.0
    entropy: float = 0.0
    contributors: List[str] = field(default_factory=list)
    resonance: float = 0.0
    
    @classmethod
    def from_definition(cls, node_id: str) -> "Node36":
        defn = NODE_DEFINITIONS.get(node_id, {})
        return cls(
            id=node_id,
            name=defn.get("name", ""),
            name_en=defn.get("name_en", ""),
            domain=defn.get("domain", ""),
            physics=defn.get("physics", ""),
            emoji=defn.get("emoji", ""),
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 레거시 함수 호환
# ═══════════════════════════════════════════════════════════════════════════════

_node_registry: Dict[str, Node36] = {}


def get_node_registry() -> Dict[str, Node36]:
    """노드 레지스트리 반환"""
    global _node_registry
    if not _node_registry:
        for node_id in NODE_DEFINITIONS:
            _node_registry[node_id] = Node36.from_definition(node_id)
    return _node_registry


def get_node(node_id: str) -> Optional[Node36]:
    """개별 노드 조회"""
    registry = get_node_registry()
    return registry.get(node_id)


def get_strategic_matrix() -> Dict[str, Dict]:
    """전략 매트릭스 반환"""
    sim = get_simulator()
    matrix = {}
    
    for meta_key, meta_info in META_INFO.items():
        matrix[meta_key] = {
            "name": meta_info["name"],
            "emoji": meta_info["emoji"],
            "domains": {},
            "pressure": sim.get_meta_pressure(meta_key),
        }
        
        for domain in meta_info["domains"]:
            domain_info = DOMAIN_INFO.get(domain, {})
            matrix[meta_key]["domains"][domain] = {
                "name": domain_info.get("name", ""),
                "nodes": [],
                "pressure": sim.get_domain_pressure(domain),
            }
    
    return matrix


def transform_intuition(
    content: str,
    domain: str,
    experience_years: int = 0,
    author_id: str = "anonymous"
) -> Dict:
    """베테랑 직관 변환 (간소화됨)"""
    # 경험 가중치 계산
    experience_weight = min(experience_years / 50.0, 1.0) if experience_years > 0 else 0.1
    
    # 도메인 매핑
    target_domain = domain.upper()
    if target_domain not in DOMAIN_INFO:
        target_domain = "CASH"
    
    # 48차원 벡터 생성 (단순화)
    vector = np.random.randn(48) * 0.1
    domain_idx = list(DOMAIN_INFO.keys()).index(target_domain) if target_domain in DOMAIN_INFO else 0
    start_idx = domain_idx * 3
    vector[start_idx:start_idx+3] = np.random.randn(3) * experience_weight
    
    # 결과
    return {
        "content_hash": hashlib.sha256(content.encode()).hexdigest()[:16],
        "domain": target_domain,
        "vector": vector.tolist(),
        "experience_weight": experience_weight,
        "confidence": min(0.5 + experience_weight * 0.5, 1.0),
        "timestamp": datetime.now().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════════
# VeteranIntuitionTransformer 호환
# ═══════════════════════════════════════════════════════════════════════════════

class VeteranIntuitionTransformer:
    """베테랑 직관 변환기 (호환성)"""
    
    def __init__(self):
        self.vector_dim = 48
    
    def transform(
        self,
        content: str,
        domain: str,
        experience_years: int = 0,
        author_id: str = "anonymous"
    ) -> Dict:
        return transform_intuition(content, domain, experience_years, author_id)
    
    def batch_transform(self, items: List[Dict]) -> List[Dict]:
        results = []
        for item in items:
            result = self.transform(
                content=item.get("content", ""),
                domain=item.get("domain", "CASH"),
                experience_years=item.get("experience_years", 0),
                author_id=item.get("author_id", "anonymous"),
            )
            results.append(result)
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # 상수
    "NODE_DEFINITIONS",
    # Enums
    "PhysicsDimension",
    "NodeType",
    # 클래스
    "Node36",
    "VeteranIntuitionTransformer",
    # 함수
    "get_node_registry",
    "get_node",
    "get_strategic_matrix",
    "transform_intuition",
]
