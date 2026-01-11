"""
═══════════════════════════════════════════════════════════════════════════════
🏛️ AUTUS 36 Strategic Nodes (36개 전략 노드)
═══════════════════════════════════════════════════════════════════════════════

12개 영역 × 3개 노드 = 36개 전략 노드
각 영역은 원형(Archetype), 동력(Dynamics), 평형(Equilibrium)으로 구성

구조:
- 6 Physics Dimensions (물리 차원)
- 12 Strategic Fields (전략 영역)
- 36 Execution Nodes (실행 노드)
- 144 KPI Indicators (핵심 지표)

"80억 인류의 지성이 안착할 절대적 빈자리"
═══════════════════════════════════════════════════════════════════════════════
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum
import numpy as np


# ═══════════════════════════════════════════════════════════════════════════════
# 노드 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════

class NodeType(Enum):
    """노드 유형 (3종)"""
    ARCHETYPE = "archetype"      # 원형: 본질과 기원
    DYNAMICS = "dynamics"        # 동력: 흐름과 변화
    EQUILIBRIUM = "equilibrium"  # 평형: 안정과 균형


class PhysicsDimension(Enum):
    """6대 물리 차원"""
    BIO = "BIO"                  # 생체/건강
    CAPITAL = "CAPITAL"          # 자본/재정
    COGNITION = "COGNITION"      # 인지/학습
    RELATION = "RELATION"        # 관계/네트워크
    ENVIRONMENT = "ENVIRONMENT"  # 환경/공간
    LEGACY = "LEGACY"            # 유산/의미


# ═══════════════════════════════════════════════════════════════════════════════
# 12개 전략 영역 정의
# ═══════════════════════════════════════════════════════════════════════════════

STRATEGIC_FIELDS = {
    # ─────────────────────────────────────────────────────────────────────────
    # BIO 차원 (생체)
    # ─────────────────────────────────────────────────────────────────────────
    "F01_HEALTH": {
        "name": "건강",
        "name_en": "Health",
        "physics": PhysicsDimension.BIO,
        "description": "신체적 건강과 생명력의 근원",
        "nodes": {
            "archetype": {"id": "n01", "name": "유전자 정보", "name_en": "Genetic Blueprint"},
            "dynamics": {"id": "n02", "name": "활력 에너지", "name_en": "Vital Energy"},
            "equilibrium": {"id": "n03", "name": "회복 탄력성", "name_en": "Healing Resilience"},
        },
    },
    "F02_FITNESS": {
        "name": "체력",
        "name_en": "Fitness",
        "physics": PhysicsDimension.BIO,
        "description": "신체 능력과 운동 역량",
        "nodes": {
            "archetype": {"id": "n04", "name": "근력 기반", "name_en": "Strength Foundation"},
            "dynamics": {"id": "n05", "name": "지구력 흐름", "name_en": "Endurance Flow"},
            "equilibrium": {"id": "n06", "name": "유연성 균형", "name_en": "Flexibility Balance"},
        },
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # CAPITAL 차원 (자본)
    # ─────────────────────────────────────────────────────────────────────────
    "F03_INCOME": {
        "name": "수입",
        "name_en": "Income",
        "physics": PhysicsDimension.CAPITAL,
        "description": "현금 흐름과 수익 창출",
        "nodes": {
            "archetype": {"id": "n07", "name": "자산의 본질", "name_en": "Asset Essence"},
            "dynamics": {"id": "n08", "name": "유동 흐름", "name_en": "Cash Flow"},
            "equilibrium": {"id": "n09", "name": "저축 안정성", "name_en": "Savings Stability"},
        },
    },
    "F04_WEALTH": {
        "name": "자산",
        "name_en": "Wealth",
        "physics": PhysicsDimension.CAPITAL,
        "description": "축적된 부와 투자",
        "nodes": {
            "archetype": {"id": "n10", "name": "부의 원형", "name_en": "Wealth Archetype"},
            "dynamics": {"id": "n11", "name": "투자 동력", "name_en": "Investment Dynamics"},
            "equilibrium": {"id": "n12", "name": "리스크 분산", "name_en": "Risk Distribution"},
        },
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # COGNITION 차원 (인지)
    # ─────────────────────────────────────────────────────────────────────────
    "F05_LEARNING": {
        "name": "학습",
        "name_en": "Learning",
        "physics": PhysicsDimension.COGNITION,
        "description": "지식 습득과 성장",
        "nodes": {
            "archetype": {"id": "n13", "name": "지식의 씨앗", "name_en": "Knowledge Seed"},
            "dynamics": {"id": "n14", "name": "학습 가속", "name_en": "Learning Acceleration"},
            "equilibrium": {"id": "n15", "name": "기억 정착", "name_en": "Memory Consolidation"},
        },
    },
    "F06_MASTERY": {
        "name": "숙련",
        "name_en": "Mastery",
        "physics": PhysicsDimension.COGNITION,
        "description": "전문 기술과 직관",
        "nodes": {
            "archetype": {"id": "n16", "name": "직관적 판단", "name_en": "Intuitive Judgment"},
            "dynamics": {"id": "n17", "name": "논리적 추론", "name_en": "Logical Reasoning"},
            "equilibrium": {"id": "n18", "name": "정신적 평온", "name_en": "Mental Stillness"},
        },
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # RELATION 차원 (관계)
    # ─────────────────────────────────────────────────────────────────────────
    "F07_FAMILY": {
        "name": "가족",
        "name_en": "Family",
        "physics": PhysicsDimension.RELATION,
        "description": "혈연과 친밀한 관계",
        "nodes": {
            "archetype": {"id": "n19", "name": "혈연의 뿌리", "name_en": "Family Root"},
            "dynamics": {"id": "n20", "name": "유대 강화", "name_en": "Bond Strengthening"},
            "equilibrium": {"id": "n21", "name": "가정의 평화", "name_en": "Domestic Peace"},
        },
    },
    "F08_NETWORK": {
        "name": "네트워크",
        "name_en": "Network",
        "physics": PhysicsDimension.RELATION,
        "description": "사회적 연결과 영향력",
        "nodes": {
            "archetype": {"id": "n22", "name": "관계의 원형", "name_en": "Relationship Archetype"},
            "dynamics": {"id": "n23", "name": "네트워크 확장", "name_en": "Network Expansion"},
            "equilibrium": {"id": "n24", "name": "신뢰 균형", "name_en": "Trust Equilibrium"},
        },
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # ENVIRONMENT 차원 (환경)
    # ─────────────────────────────────────────────────────────────────────────
    "F09_DWELLING": {
        "name": "거주",
        "name_en": "Dwelling",
        "physics": PhysicsDimension.ENVIRONMENT,
        "description": "생활 공간과 안식처",
        "nodes": {
            "archetype": {"id": "n25", "name": "공간의 본질", "name_en": "Space Essence"},
            "dynamics": {"id": "n26", "name": "생활 편의", "name_en": "Living Convenience"},
            "equilibrium": {"id": "n27", "name": "안전 확보", "name_en": "Security Assurance"},
        },
    },
    "F10_WORKPLACE": {
        "name": "직장",
        "name_en": "Workplace",
        "physics": PhysicsDimension.ENVIRONMENT,
        "description": "업무 환경과 생산성",
        "nodes": {
            "archetype": {"id": "n28", "name": "직업의 소명", "name_en": "Vocational Calling"},
            "dynamics": {"id": "n29", "name": "업무 효율", "name_en": "Work Efficiency"},
            "equilibrium": {"id": "n30", "name": "워라밸 조화", "name_en": "Work-Life Harmony"},
        },
    },
    
    # ─────────────────────────────────────────────────────────────────────────
    # LEGACY 차원 (유산)
    # ─────────────────────────────────────────────────────────────────────────
    "F11_PURPOSE": {
        "name": "목적",
        "name_en": "Purpose",
        "physics": PhysicsDimension.LEGACY,
        "description": "삶의 의미와 방향",
        "nodes": {
            "archetype": {"id": "n31", "name": "존재의 이유", "name_en": "Reason for Being"},
            "dynamics": {"id": "n32", "name": "가치 추구", "name_en": "Value Pursuit"},
            "equilibrium": {"id": "n33", "name": "영적 평화", "name_en": "Spiritual Peace"},
        },
    },
    "F12_IMPACT": {
        "name": "영향",
        "name_en": "Impact",
        "physics": PhysicsDimension.LEGACY,
        "description": "세상에 남기는 흔적",
        "nodes": {
            "archetype": {"id": "n34", "name": "유산의 씨앗", "name_en": "Legacy Seed"},
            "dynamics": {"id": "n35", "name": "멘토링 전파", "name_en": "Mentoring Spread"},
            "equilibrium": {"id": "n36", "name": "지혜 계승", "name_en": "Wisdom Inheritance"},
        },
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# 전략 노드 클래스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class StrategicNode:
    """전략 노드"""
    id: str
    field_id: str
    node_type: NodeType
    name: str
    name_en: str
    physics: PhysicsDimension
    
    # 상태값
    value: float = 0.5
    energy: float = 1.0
    entropy: float = 0.3
    
    # 베테랑 데이터
    veteran_count: int = 0
    total_contributions: int = 0
    resonance_score: float = 0.0
    
    # 연결
    inbound_nodes: List[str] = field(default_factory=list)
    outbound_nodes: List[str] = field(default_factory=list)
    
    def inject_knowledge(self, knowledge_vector: List[float], veteran_years: int = 0):
        """베테랑 지식 주입"""
        # 베테랑 가중치 (30년 이상 = 최대 가중치)
        weight = min(veteran_years / 50, 1.0) if veteran_years >= 30 else 0.3
        
        # 평균값 계산
        if knowledge_vector:
            avg_value = sum(knowledge_vector) / len(knowledge_vector)
            
            # 기존 값과 융합
            self.value = self.value * (1 - weight) + avg_value * weight
            
            # 엔트로피 감소 (정렬됨)
            self.entropy *= (1 - weight * 0.1)
            
            # 카운터 증가
            self.veteran_count += 1 if veteran_years >= 30 else 0
            self.total_contributions += 1
    
    def calculate_resonance(self, global_state: Dict[str, float]) -> float:
        """전역 공명 계산"""
        # 연결된 노드들과의 조화
        if not self.outbound_nodes:
            return 0.5
        
        resonances = []
        for node_id in self.outbound_nodes:
            if node_id in global_state:
                diff = abs(self.value - global_state[node_id])
                resonance = 1.0 - diff  # 차이가 적을수록 공명
                resonances.append(resonance)
        
        self.resonance_score = sum(resonances) / len(resonances) if resonances else 0.5
        return self.resonance_score
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "field": self.field_id,
            "type": self.node_type.value,
            "name": self.name,
            "name_en": self.name_en,
            "physics": self.physics.value,
            "value": round(self.value, 4),
            "energy": round(self.energy, 4),
            "entropy": round(self.entropy, 4),
            "veteran_count": self.veteran_count,
            "contributions": self.total_contributions,
            "resonance": round(self.resonance_score, 4),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 전략 노드 매트릭스 (36개 노드 관리)
# ═══════════════════════════════════════════════════════════════════════════════

class StrategicNodeMatrix:
    """36개 전략 노드 매트릭스"""
    
    def __init__(self):
        self._nodes: Dict[str, StrategicNode] = {}
        self._fields: Dict[str, Dict] = STRATEGIC_FIELDS
        self._initialize()
    
    def _initialize(self):
        """노드 초기화"""
        for field_id, field_data in self._fields.items():
            physics = field_data["physics"]
            
            for node_type_str, node_info in field_data["nodes"].items():
                node_type = NodeType(node_type_str)
                node_id = node_info["id"]
                
                self._nodes[node_id] = StrategicNode(
                    id=node_id,
                    field_id=field_id,
                    node_type=node_type,
                    name=node_info["name"],
                    name_en=node_info["name_en"],
                    physics=physics,
                )
        
        # 연결 설정
        self._setup_connections()
    
    def _setup_connections(self):
        """노드 간 연결 설정"""
        # 같은 영역 내 연결 (원형 → 동력 → 평형)
        for field_data in self._fields.values():
            nodes = field_data["nodes"]
            arch_id = nodes["archetype"]["id"]
            dyn_id = nodes["dynamics"]["id"]
            eq_id = nodes["equilibrium"]["id"]
            
            # 순환 연결
            self._nodes[arch_id].outbound_nodes.append(dyn_id)
            self._nodes[dyn_id].outbound_nodes.append(eq_id)
            self._nodes[eq_id].outbound_nodes.append(arch_id)
            
            self._nodes[dyn_id].inbound_nodes.append(arch_id)
            self._nodes[eq_id].inbound_nodes.append(dyn_id)
            self._nodes[arch_id].inbound_nodes.append(eq_id)
        
        # 물리 차원 간 연결 (BIO ↔ CAPITAL ↔ COGNITION ...)
        physics_order = [
            PhysicsDimension.BIO,
            PhysicsDimension.CAPITAL,
            PhysicsDimension.COGNITION,
            PhysicsDimension.RELATION,
            PhysicsDimension.ENVIRONMENT,
            PhysicsDimension.LEGACY,
        ]
        
        for i, physics in enumerate(physics_order):
            current_nodes = [n for n in self._nodes.values() if n.physics == physics]
            
            if i > 0:
                prev_physics = physics_order[i - 1]
                prev_nodes = [n for n in self._nodes.values() if n.physics == prev_physics]
                
                # 첫 번째 노드끼리 연결
                if current_nodes and prev_nodes:
                    current_nodes[0].inbound_nodes.append(prev_nodes[-1].id)
                    prev_nodes[-1].outbound_nodes.append(current_nodes[0].id)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 데이터 주입
    # ─────────────────────────────────────────────────────────────────────────
    
    def inject_veteran_knowledge(
        self,
        node_id: str,
        knowledge_vector: List[float],
        veteran_years: int = 0,
    ) -> Dict:
        """베테랑 지식 주입"""
        node = self._nodes.get(node_id)
        if not node:
            return {"success": False, "error": "Node not found"}
        
        # 이전 상태 저장
        prev_value = node.value
        prev_entropy = node.entropy
        
        # 지식 주입
        node.inject_knowledge(knowledge_vector, veteran_years)
        
        # 공명 계산
        global_state = {nid: n.value for nid, n in self._nodes.items()}
        resonance = node.calculate_resonance(global_state)
        
        # 전파 (라플라시안 확산)
        self._propagate_effect(node_id, (node.value - prev_value) * 0.3)
        
        return {
            "success": True,
            "node_id": node_id,
            "value_change": round(node.value - prev_value, 4),
            "entropy_change": round(node.entropy - prev_entropy, 4),
            "resonance": round(resonance, 4),
            "veteran_bonus": veteran_years >= 30,
        }
    
    def _propagate_effect(self, source_id: str, delta: float, decay: float = 0.5):
        """효과 전파"""
        source = self._nodes.get(source_id)
        if not source or abs(delta) < 0.01:
            return
        
        for neighbor_id in source.outbound_nodes:
            neighbor = self._nodes.get(neighbor_id)
            if neighbor:
                neighbor.value += delta * decay
                neighbor.value = max(0.0, min(1.0, neighbor.value))
    
    # ─────────────────────────────────────────────────────────────────────────
    # 글로벌 공명
    # ─────────────────────────────────────────────────────────────────────────
    
    def calculate_global_resonance(self) -> Dict:
        """전체 시스템 공명 계산"""
        global_state = {nid: n.value for nid, n in self._nodes.items()}
        
        total_resonance = 0.0
        field_resonances = {}
        physics_resonances = {}
        
        for node in self._nodes.values():
            res = node.calculate_resonance(global_state)
            total_resonance += res
            
            # 영역별
            if node.field_id not in field_resonances:
                field_resonances[node.field_id] = []
            field_resonances[node.field_id].append(res)
            
            # 물리 차원별
            physics_key = node.physics.value
            if physics_key not in physics_resonances:
                physics_resonances[physics_key] = []
            physics_resonances[physics_key].append(res)
        
        # 평균 계산
        avg_resonance = total_resonance / len(self._nodes)
        
        field_avg = {
            fid: sum(vals) / len(vals)
            for fid, vals in field_resonances.items()
        }
        
        physics_avg = {
            pid: sum(vals) / len(vals)
            for pid, vals in physics_resonances.items()
        }
        
        return {
            "global_resonance": round(avg_resonance, 4),
            "by_field": {k: round(v, 4) for k, v in field_avg.items()},
            "by_physics": {k: round(v, 4) for k, v in physics_avg.items()},
            "harmony_index": round(1.0 - np.std(list(field_avg.values())), 4),
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 조회
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_node(self, node_id: str) -> Optional[StrategicNode]:
        """노드 조회"""
        return self._nodes.get(node_id)
    
    def get_field(self, field_id: str) -> Dict:
        """영역 조회"""
        field_data = self._fields.get(field_id, {})
        if not field_data:
            return {}
        
        nodes = []
        for node_type_str, node_info in field_data.get("nodes", {}).items():
            node = self._nodes.get(node_info["id"])
            if node:
                nodes.append(node.to_dict())
        
        return {
            "field_id": field_id,
            "name": field_data.get("name"),
            "name_en": field_data.get("name_en"),
            "physics": field_data.get("physics", PhysicsDimension.CAPITAL).value,
            "description": field_data.get("description"),
            "nodes": nodes,
        }
    
    def get_by_physics(self, physics: PhysicsDimension) -> List[Dict]:
        """물리 차원별 조회"""
        return [
            n.to_dict() for n in self._nodes.values()
            if n.physics == physics
        ]
    
    def to_36_vector(self) -> List[float]:
        """36차원 벡터로 변환"""
        return [self._nodes[f"n{i:02d}"].value for i in range(1, 37)]
    
    def get_stats(self) -> Dict:
        """통계"""
        values = [n.value for n in self._nodes.values()]
        energies = [n.energy for n in self._nodes.values()]
        entropies = [n.entropy for n in self._nodes.values()]
        
        veteran_total = sum(n.veteran_count for n in self._nodes.values())
        contribution_total = sum(n.total_contributions for n in self._nodes.values())
        
        return {
            "total_nodes": 36,
            "total_fields": 12,
            "physics_dimensions": 6,
            "value_avg": round(sum(values) / len(values), 4),
            "energy_avg": round(sum(energies) / len(energies), 4),
            "entropy_avg": round(sum(entropies) / len(entropies), 4),
            "veteran_contributions": veteran_total,
            "total_contributions": contribution_total,
            "resonance": self.calculate_global_resonance(),
        }
    
    def to_dict(self) -> Dict:
        """전체 상태"""
        return {
            "nodes": {nid: n.to_dict() for nid, n in self._nodes.items()},
            "fields": {
                fid: {
                    "name": f["name"],
                    "name_en": f["name_en"],
                    "physics": f["physics"].value,
                }
                for fid, f in self._fields.items()
            },
            "stats": self.get_stats(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴
# ═══════════════════════════════════════════════════════════════════════════════

_matrix: Optional[StrategicNodeMatrix] = None


def get_strategic_matrix() -> StrategicNodeMatrix:
    """전략 노드 매트릭스 싱글턴"""
    global _matrix
    if _matrix is None:
        _matrix = StrategicNodeMatrix()
    return _matrix


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "StrategicNode",
    "StrategicNodeMatrix",
    "NodeType",
    "PhysicsDimension",
    "STRATEGIC_FIELDS",
    "get_strategic_matrix",
]
