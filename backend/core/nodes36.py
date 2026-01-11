"""
═══════════════════════════════════════════════════════════════════════════════
🔢 AUTUS 36 Nodes Interface (36개 노드 인터페이스)
═══════════════════════════════════════════════════════════════════════════════

36개 핵심 실행 노드의 정의 및 인터페이스
각 노드는 12개 도메인에 3개씩 배치되어 144개 지표와 연결됨

구조:
- 6 Physics Dimensions (물리 차원)
- 12 Domains (도메인)
- 36 Nodes (노드)
- 144 Indicators (지표)

"베테랑의 직관이 36개 노드로 변환된다"
═══════════════════════════════════════════════════════════════════════════════
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Callable
from datetime import datetime
from enum import Enum
import hashlib


# ═══════════════════════════════════════════════════════════════════════════════
# 36개 노드 정의
# ═══════════════════════════════════════════════════════════════════════════════

# 물리 차원별 노드 매핑
NODE_DEFINITIONS = {
    # ─────────────────────────────────────────────────────────────────────────
    # BIO (생체/건강) - 6 nodes
    # ─────────────────────────────────────────────────────────────────────────
    "n01": {"name": "체력", "name_en": "Physical Strength", "domain": "Health", "physics": "BIO", "emoji": "💪"},
    "n02": {"name": "면역력", "name_en": "Immunity", "domain": "Health", "physics": "BIO", "emoji": "🛡️"},
    "n03": {"name": "수면질", "name_en": "Sleep Quality", "domain": "Health", "physics": "BIO", "emoji": "😴"},
    "n04": {"name": "근력", "name_en": "Muscle Strength", "domain": "Fitness", "physics": "BIO", "emoji": "🏋️"},
    "n05": {"name": "지구력", "name_en": "Endurance", "domain": "Fitness", "physics": "BIO", "emoji": "🏃"},
    "n06": {"name": "유연성", "name_en": "Flexibility", "domain": "Fitness", "physics": "BIO", "emoji": "🧘"},
    
    # ─────────────────────────────────────────────────────────────────────────
    # CAPITAL (자본) - 6 nodes
    # ─────────────────────────────────────────────────────────────────────────
    "n07": {"name": "월수입", "name_en": "Monthly Income", "domain": "Income", "physics": "CAPITAL", "emoji": "💰"},
    "n08": {"name": "부수입", "name_en": "Side Income", "domain": "Income", "physics": "CAPITAL", "emoji": "💵"},
    "n09": {"name": "저축률", "name_en": "Savings Rate", "domain": "Income", "physics": "CAPITAL", "emoji": "🐷"},
    "n10": {"name": "자산가치", "name_en": "Asset Value", "domain": "Assets", "physics": "CAPITAL", "emoji": "🏠"},
    "n11": {"name": "투자수익", "name_en": "Investment Returns", "domain": "Assets", "physics": "CAPITAL", "emoji": "📈"},
    "n12": {"name": "부채비율", "name_en": "Debt Ratio", "domain": "Assets", "physics": "CAPITAL", "emoji": "📉"},
    
    # ─────────────────────────────────────────────────────────────────────────
    # COGNITION (인지) - 6 nodes
    # ─────────────────────────────────────────────────────────────────────────
    "n13": {"name": "학습시간", "name_en": "Learning Hours", "domain": "Learning", "physics": "COGNITION", "emoji": "📚"},
    "n14": {"name": "독서량", "name_en": "Books Read", "domain": "Learning", "physics": "COGNITION", "emoji": "📖"},
    "n15": {"name": "자격증", "name_en": "Certifications", "domain": "Learning", "physics": "COGNITION", "emoji": "📜"},
    "n16": {"name": "전문기술", "name_en": "Technical Skills", "domain": "Skills", "physics": "COGNITION", "emoji": "🔧"},
    "n17": {"name": "창의력", "name_en": "Creativity", "domain": "Skills", "physics": "COGNITION", "emoji": "💡"},
    "n18": {"name": "문제해결", "name_en": "Problem Solving", "domain": "Skills", "physics": "COGNITION", "emoji": "🧩"},
    
    # ─────────────────────────────────────────────────────────────────────────
    # RELATION (관계) - 6 nodes
    # ─────────────────────────────────────────────────────────────────────────
    "n19": {"name": "가족친밀", "name_en": "Family Intimacy", "domain": "Family", "physics": "RELATION", "emoji": "👨‍👩‍👧"},
    "n20": {"name": "가족지원", "name_en": "Family Support", "domain": "Family", "physics": "RELATION", "emoji": "🤝"},
    "n21": {"name": "가족시간", "name_en": "Family Time", "domain": "Family", "physics": "RELATION", "emoji": "🏡"},
    "n22": {"name": "친구수", "name_en": "Number of Friends", "domain": "Network", "physics": "RELATION", "emoji": "👥"},
    "n23": {"name": "네트워크", "name_en": "Professional Network", "domain": "Network", "physics": "RELATION", "emoji": "🌐"},
    "n24": {"name": "멘토관계", "name_en": "Mentorship", "domain": "Network", "physics": "RELATION", "emoji": "🎓"},
    
    # ─────────────────────────────────────────────────────────────────────────
    # ENVIRONMENT (환경) - 6 nodes
    # ─────────────────────────────────────────────────────────────────────────
    "n25": {"name": "주거만족", "name_en": "Housing Satisfaction", "domain": "Home", "physics": "ENVIRONMENT", "emoji": "🏠"},
    "n26": {"name": "생활편의", "name_en": "Living Convenience", "domain": "Home", "physics": "ENVIRONMENT", "emoji": "🛋️"},
    "n27": {"name": "안전도", "name_en": "Safety Level", "domain": "Home", "physics": "ENVIRONMENT", "emoji": "🔒"},
    "n28": {"name": "업무환경", "name_en": "Work Environment", "domain": "Work", "physics": "ENVIRONMENT", "emoji": "🏢"},
    "n29": {"name": "통근시간", "name_en": "Commute Time", "domain": "Work", "physics": "ENVIRONMENT", "emoji": "🚗"},
    "n30": {"name": "워라밸", "name_en": "Work-Life Balance", "domain": "Work", "physics": "ENVIRONMENT", "emoji": "⚖️"},
    
    # ─────────────────────────────────────────────────────────────────────────
    # LEGACY (유산) - 6 nodes
    # ─────────────────────────────────────────────────────────────────────────
    "n31": {"name": "인생목표", "name_en": "Life Purpose", "domain": "Purpose", "physics": "LEGACY", "emoji": "🎯"},
    "n32": {"name": "가치관", "name_en": "Core Values", "domain": "Purpose", "physics": "LEGACY", "emoji": "💎"},
    "n33": {"name": "영성", "name_en": "Spirituality", "domain": "Purpose", "physics": "LEGACY", "emoji": "🙏"},
    "n34": {"name": "사회공헌", "name_en": "Social Contribution", "domain": "Impact", "physics": "LEGACY", "emoji": "🌍"},
    "n35": {"name": "멘토링", "name_en": "Mentoring Others", "domain": "Impact", "physics": "LEGACY", "emoji": "👨‍🏫"},
    "n36": {"name": "지식전수", "name_en": "Knowledge Transfer", "domain": "Impact", "physics": "LEGACY", "emoji": "📚"},
}


class NodeState(Enum):
    """노드 상태"""
    INACTIVE = "inactive"     # 비활성
    ACTIVE = "active"         # 활성
    OPTIMIZING = "optimizing" # 최적화 중
    SATURATED = "saturated"   # 포화
    DEPLETED = "depleted"     # 고갈


# ═══════════════════════════════════════════════════════════════════════════════
# 노드 클래스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Node36:
    """36개 노드 개별 클래스"""
    id: str
    name: str
    name_en: str
    domain: str
    physics: str
    emoji: str
    
    # 상태
    value: float = 0.5
    state: NodeState = NodeState.ACTIVE
    
    # 물리 속성
    energy: float = 1.0
    friction: float = 0.0
    momentum: float = 0.0
    
    # 연결
    connections: List[str] = field(default_factory=list)
    
    # 이력
    history: List[Tuple[datetime, float]] = field(default_factory=list)
    last_updated: Optional[datetime] = None
    
    def update_value(self, new_value: float, record_history: bool = True):
        """값 업데이트"""
        old_value = self.value
        self.value = max(0.0, min(1.0, new_value))
        self.last_updated = datetime.utcnow()
        
        if record_history:
            self.history.append((self.last_updated, self.value))
            # 최근 100개만 유지
            if len(self.history) > 100:
                self.history = self.history[-100:]
        
        # 상태 자동 결정
        self._update_state()
        
        return self.value - old_value
    
    def _update_state(self):
        """상태 자동 업데이트"""
        if self.value <= 0.1:
            self.state = NodeState.DEPLETED
        elif self.value >= 0.9:
            self.state = NodeState.SATURATED
        elif 0.4 <= self.value <= 0.6:
            self.state = NodeState.OPTIMIZING
        else:
            self.state = NodeState.ACTIVE
    
    def apply_force(self, force: float, mass: float = 1.0):
        """힘 적용 (F = ma)"""
        acceleration = force / mass
        self.momentum += acceleration * (1 - self.friction)
        
        # 운동량에 따른 값 변화
        delta = self.momentum * 0.1
        self.update_value(self.value + delta)
        
        # 운동량 감쇠
        self.momentum *= 0.9
    
    def decay(self, dt: float = 0.1):
        """시간에 따른 감쇠"""
        decay_rate = 0.02 * (1 + self.friction)
        self.energy *= (1 - decay_rate * dt)
        
        if self.energy < 0.3:
            self.update_value(self.value * 0.99)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "name_en": self.name_en,
            "emoji": self.emoji,
            "domain": self.domain,
            "physics": self.physics,
            "value": round(self.value, 4),
            "state": self.state.value,
            "energy": round(self.energy, 4),
            "connections": len(self.connections),
        }
    
    def to_vector(self) -> List[float]:
        """노드를 4차원 벡터로 변환 (144개 지표 중 4개)"""
        base = self.value
        return [
            base * 0.9 + self.energy * 0.1,
            base * 0.8 + self.momentum * 0.2 + 0.5,
            base,
            base * 0.95 + (1 - self.friction) * 0.05,
        ]


# ═══════════════════════════════════════════════════════════════════════════════
# 36 노드 레지스트리
# ═══════════════════════════════════════════════════════════════════════════════

class Node36Registry:
    """36개 노드 레지스트리"""
    
    def __init__(self):
        self._nodes: Dict[str, Node36] = {}
        self._initialize_nodes()
        self._setup_connections()
    
    def _initialize_nodes(self):
        """모든 노드 초기화"""
        for node_id, definition in NODE_DEFINITIONS.items():
            self._nodes[node_id] = Node36(
                id=node_id,
                name=definition["name"],
                name_en=definition["name_en"],
                domain=definition["domain"],
                physics=definition["physics"],
                emoji=definition["emoji"],
            )
    
    def _setup_connections(self):
        """노드 간 연결 설정"""
        # 같은 도메인 내 노드 연결
        domains = {}
        for node_id, node in self._nodes.items():
            if node.domain not in domains:
                domains[node.domain] = []
            domains[node.domain].append(node_id)
        
        for domain_nodes in domains.values():
            for i, node_id in enumerate(domain_nodes):
                for j, other_id in enumerate(domain_nodes):
                    if i != j:
                        self._nodes[node_id].connections.append(other_id)
        
        # 인접 물리 차원 연결
        physics_order = ["BIO", "CAPITAL", "COGNITION", "RELATION", "ENVIRONMENT", "LEGACY"]
        for i, physics in enumerate(physics_order):
            current_nodes = [n for n in self._nodes.values() if n.physics == physics]
            
            # 이전 차원과 연결
            if i > 0:
                prev_nodes = [n for n in self._nodes.values() if n.physics == physics_order[i-1]]
                for cn in current_nodes:
                    cn.connections.append(prev_nodes[0].id)
            
            # 다음 차원과 연결
            if i < len(physics_order) - 1:
                next_nodes = [n for n in self._nodes.values() if n.physics == physics_order[i+1]]
                for cn in current_nodes:
                    cn.connections.append(next_nodes[0].id)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 노드 접근
    # ─────────────────────────────────────────────────────────────────────────
    
    def get(self, node_id: str) -> Optional[Node36]:
        """노드 조회"""
        return self._nodes.get(node_id)
    
    def get_all(self) -> List[Node36]:
        """모든 노드 조회"""
        return list(self._nodes.values())
    
    def get_by_physics(self, physics: str) -> List[Node36]:
        """물리 차원별 노드 조회"""
        return [n for n in self._nodes.values() if n.physics == physics]
    
    def get_by_domain(self, domain: str) -> List[Node36]:
        """도메인별 노드 조회"""
        return [n for n in self._nodes.values() if n.domain == domain]
    
    # ─────────────────────────────────────────────────────────────────────────
    # 값 조작
    # ─────────────────────────────────────────────────────────────────────────
    
    def set_value(self, node_id: str, value: float) -> bool:
        """노드 값 설정"""
        node = self._nodes.get(node_id)
        if node:
            node.update_value(value)
            return True
        return False
    
    def apply_force(self, node_id: str, force: float) -> bool:
        """노드에 힘 적용"""
        node = self._nodes.get(node_id)
        if node:
            node.apply_force(force)
            return True
        return False
    
    def propagate(self, source_id: str, delta: float, decay: float = 0.5):
        """연결된 노드로 전파"""
        source = self._nodes.get(source_id)
        if not source:
            return
        
        visited = {source_id}
        queue = [(conn_id, delta * decay) for conn_id in source.connections]
        
        while queue:
            node_id, current_delta = queue.pop(0)
            if node_id in visited or abs(current_delta) < 0.01:
                continue
            
            visited.add(node_id)
            node = self._nodes.get(node_id)
            if node:
                node.update_value(node.value + current_delta)
                
                # 추가 전파
                for conn_id in node.connections:
                    if conn_id not in visited:
                        queue.append((conn_id, current_delta * decay))
    
    def tick(self, dt: float = 0.1):
        """시간 경과 (모든 노드 감쇠)"""
        for node in self._nodes.values():
            node.decay(dt)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 벡터 변환
    # ─────────────────────────────────────────────────────────────────────────
    
    def to_36_vector(self) -> List[float]:
        """36차원 벡터로 변환"""
        return [self._nodes[f"n{i:02d}"].value for i in range(1, 37)]
    
    def to_144_vector(self) -> List[float]:
        """144차원 벡터로 변환"""
        vector = []
        for i in range(1, 37):
            node = self._nodes[f"n{i:02d}"]
            vector.extend(node.to_vector())
        return vector
    
    def from_36_vector(self, vector: List[float]):
        """36차원 벡터에서 로드"""
        for i, value in enumerate(vector[:36]):
            node_id = f"n{i+1:02d}"
            if node_id in self._nodes:
                self._nodes[node_id].update_value(value, record_history=False)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 통계
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_stats(self) -> Dict:
        """통계"""
        values = [n.value for n in self._nodes.values()]
        energies = [n.energy for n in self._nodes.values()]
        states = {}
        
        for node in self._nodes.values():
            state = node.state.value
            states[state] = states.get(state, 0) + 1
        
        physics_avg = {}
        for physics in ["BIO", "CAPITAL", "COGNITION", "RELATION", "ENVIRONMENT", "LEGACY"]:
            nodes = self.get_by_physics(physics)
            if nodes:
                physics_avg[physics] = sum(n.value for n in nodes) / len(nodes)
        
        return {
            "total_nodes": 36,
            "avg_value": sum(values) / len(values),
            "min_value": min(values),
            "max_value": max(values),
            "avg_energy": sum(energies) / len(energies),
            "states": states,
            "physics_averages": physics_avg,
        }
    
    def to_dict(self) -> Dict:
        """전체 상태를 딕셔너리로"""
        return {
            "nodes": {nid: n.to_dict() for nid, n in self._nodes.items()},
            "stats": self.get_stats(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 베테랑 직관 변환기
# ═══════════════════════════════════════════════════════════════════════════════

class VeteranIntuitionTransformer:
    """
    베테랑의 직관을 36개 노드 벡터로 변환
    
    30~50년 베테랑의 암묵지를 정량화
    """
    
    # 키워드-노드 매핑
    KEYWORD_NODE_MAP = {
        # BIO 관련
        "건강": ["n01", "n02"], "체력": ["n01", "n04"], "운동": ["n04", "n05", "n06"],
        "수면": ["n03"], "면역": ["n02"], "스트레스": ["n01", "n03"],
        
        # CAPITAL 관련
        "돈": ["n07", "n09"], "수입": ["n07", "n08"], "저축": ["n09"],
        "투자": ["n11"], "자산": ["n10"], "부채": ["n12"], "재테크": ["n09", "n11"],
        
        # COGNITION 관련
        "공부": ["n13", "n14"], "학습": ["n13"], "책": ["n14"], "자격증": ["n15"],
        "기술": ["n16"], "창의": ["n17"], "문제해결": ["n18"], "능력": ["n16", "n18"],
        
        # RELATION 관련
        "가족": ["n19", "n20", "n21"], "친구": ["n22"], "인맥": ["n23"],
        "멘토": ["n24"], "관계": ["n19", "n22", "n23"], "네트워크": ["n23"],
        
        # ENVIRONMENT 관련
        "집": ["n25"], "주거": ["n25", "n26"], "안전": ["n27"],
        "직장": ["n28", "n29", "n30"], "통근": ["n29"], "워라밸": ["n30"],
        
        # LEGACY 관련
        "목표": ["n31"], "가치": ["n32"], "영성": ["n33"],
        "봉사": ["n34"], "멘토링": ["n35"], "전수": ["n36"], "유산": ["n34", "n35", "n36"],
    }
    
    @classmethod
    def transform(
        cls,
        text: str,
        numeric_data: Dict[str, float] = None,
        experience_years: int = 0,
    ) -> List[float]:
        """
        텍스트와 숫자 데이터를 36차원 벡터로 변환
        
        Args:
            text: 베테랑의 노하우 텍스트
            numeric_data: 정량 데이터 (예: {"수입": 500, "저축률": 0.3})
            experience_years: 경력 년수 (가중치 적용)
        """
        # 기본 벡터 (0.5로 초기화)
        vector = [0.5] * 36
        
        # 텍스트에서 키워드 추출 및 매핑
        text_lower = text.lower()
        keyword_weights = {}
        
        for keyword, node_ids in cls.KEYWORD_NODE_MAP.items():
            if keyword in text_lower:
                count = text_lower.count(keyword)
                for node_id in node_ids:
                    idx = int(node_id[1:]) - 1
                    if idx not in keyword_weights:
                        keyword_weights[idx] = 0
                    keyword_weights[idx] += count * 0.1
        
        # 키워드 가중치 적용
        for idx, weight in keyword_weights.items():
            vector[idx] = min(0.5 + weight, 1.0)
        
        # 정량 데이터 적용
        if numeric_data:
            for key, value in numeric_data.items():
                for keyword, node_ids in cls.KEYWORD_NODE_MAP.items():
                    if keyword in key:
                        for node_id in node_ids:
                            idx = int(node_id[1:]) - 1
                            # 값 정규화 (시그모이드)
                            import math
                            normalized = 1 / (1 + math.exp(-value / 100))
                            vector[idx] = (vector[idx] + normalized) / 2
        
        # 경력 가중치 (베테랑일수록 안정적)
        if experience_years >= 30:
            stability_factor = min(experience_years / 50, 1.0)
            for i in range(36):
                # 극단값을 중앙으로 당김
                vector[i] = vector[i] * (1 - stability_factor * 0.3) + 0.5 * stability_factor * 0.3
        
        return vector
    
    @classmethod
    def explain(cls, vector: List[float]) -> Dict:
        """벡터 해석"""
        explanations = {}
        
        for i, value in enumerate(vector[:36]):
            node_id = f"n{i+1:02d}"
            definition = NODE_DEFINITIONS.get(node_id, {})
            
            if value > 0.7:
                status = "강점"
            elif value < 0.3:
                status = "약점"
            else:
                status = "보통"
            
            explanations[node_id] = {
                "name": definition.get("name", ""),
                "value": round(value, 3),
                "status": status,
                "physics": definition.get("physics", ""),
            }
        
        return explanations


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴 및 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

_registry: Optional[Node36Registry] = None


def get_node_registry() -> Node36Registry:
    """노드 레지스트리 싱글턴"""
    global _registry
    if _registry is None:
        _registry = Node36Registry()
    return _registry


def get_node(node_id: str) -> Optional[Dict]:
    """노드 조회 (편의 함수)"""
    registry = get_node_registry()
    node = registry.get(node_id)
    return node.to_dict() if node else None


def transform_intuition(text: str, years: int = 0) -> List[float]:
    """직관 변환 (편의 함수)"""
    return VeteranIntuitionTransformer.transform(text, experience_years=years)


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Classes
    "Node36",
    "Node36Registry",
    "VeteranIntuitionTransformer",
    # Enums
    "NodeState",
    # Constants
    "NODE_DEFINITIONS",
    # Functions
    "get_node_registry",
    "get_node",
    "transform_intuition",
]
