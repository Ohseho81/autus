"""
AUTUS Multi-Scale Engine - 계층적 Keyman 탐색

스케일 계층:
| Level | Scale    | 노드 단위      |
|-------|----------|---------------|
| L0    | World    | 국가/기관      |
| L1    | Country  | 도시/재벌      |
| L2    | City     | 구역/기업      |
| L3    | District | 건물/인물      |
| L4    | Block    | 개인          |

레벨별 KI 수식:
- L0: KI = GDP × 0.30 + Trade_Flow × 0.50 + Diplomatic_Power × 0.20
- L1: KI = City_GDP × 0.30 + Inter_City_Flow × 0.50 + Political_Power × 0.20
- L2: KI = District_Value × 0.30 + Business_Flow × 0.50 + Local_Power × 0.20
- L3-L4: KI = C × 0.30 + F × 0.50 + RV × 0.20
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
from collections import defaultdict


class ScaleLevel(str, Enum):
    """스케일 레벨"""
    WORLD = "L0"       # 세계 (국가/기관)
    COUNTRY = "L1"     # 국가 (도시/재벌)
    CITY = "L2"        # 도시 (구역/기업)
    DISTRICT = "L3"    # 구역 (건물/인물)
    BLOCK = "L4"       # 블록 (개인)
    
    @classmethod
    def from_zoom(cls, zoom: int) -> "ScaleLevel":
        """줌 레벨 → 스케일 레벨 매핑"""
        if zoom <= 3:
            return cls.WORLD
        elif zoom <= 6:
            return cls.COUNTRY
        elif zoom <= 10:
            return cls.CITY
        elif zoom <= 14:
            return cls.DISTRICT
        else:
            return cls.BLOCK
    
    @property
    def zoom_range(self) -> Tuple[int, int]:
        """스케일 레벨의 줌 범위"""
        ranges = {
            ScaleLevel.WORLD: (0, 3),
            ScaleLevel.COUNTRY: (4, 6),
            ScaleLevel.CITY: (7, 10),
            ScaleLevel.DISTRICT: (11, 14),
            ScaleLevel.BLOCK: (15, 20),
        }
        return ranges.get(self, (0, 20))
    
    @property
    def child_level(self) -> Optional["ScaleLevel"]:
        """하위 레벨"""
        order = [ScaleLevel.WORLD, ScaleLevel.COUNTRY, ScaleLevel.CITY, 
                 ScaleLevel.DISTRICT, ScaleLevel.BLOCK]
        idx = order.index(self)
        return order[idx + 1] if idx < len(order) - 1 else None
    
    @property
    def parent_level(self) -> Optional["ScaleLevel"]:
        """상위 레벨"""
        order = [ScaleLevel.WORLD, ScaleLevel.COUNTRY, ScaleLevel.CITY, 
                 ScaleLevel.DISTRICT, ScaleLevel.BLOCK]
        idx = order.index(self)
        return order[idx - 1] if idx > 0 else None


@dataclass
class Bounds:
    """지도 영역"""
    sw_lat: float  # 남서 위도
    sw_lng: float  # 남서 경도
    ne_lat: float  # 북동 위도
    ne_lng: float  # 북동 경도
    
    def contains(self, lat: float, lng: float) -> bool:
        """좌표가 영역 내에 있는지"""
        return (self.sw_lat <= lat <= self.ne_lat and 
                self.sw_lng <= lng <= self.ne_lng)
    
    def to_list(self) -> List[float]:
        return [self.sw_lat, self.sw_lng, self.ne_lat, self.ne_lng]
    
    @classmethod
    def from_list(cls, coords: List[float]) -> "Bounds":
        return cls(
            sw_lat=coords[0],
            sw_lng=coords[1],
            ne_lat=coords[2],
            ne_lng=coords[3],
        )
    
    @classmethod
    def world(cls) -> "Bounds":
        """전 세계"""
        return cls(-90, -180, 90, 180)


@dataclass
class ScaleNode:
    """스케일 노드"""
    id: str
    name: str
    level: ScaleLevel
    
    # 위치
    lat: float = 0.0
    lng: float = 0.0
    bounds: Optional[Bounds] = None
    
    # 계층 관계
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    # Keyman 지표
    ki_score: float = 0.0
    keyman_types: List[str] = field(default_factory=list)
    
    # 집계 데이터
    total_mass: float = 0.0      # 하위 노드 질량 합
    total_flow: float = 0.0      # 하위 노드 흐름 합
    node_count: int = 0          # 하위 노드 수
    top_keyman_id: Optional[str] = None  # 하위 최고 Keyman
    
    # 추가 속성
    sector: str = ""
    flag: str = ""  # 국가/지역 코드
    color: str = ""
    icon: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "level": self.level.value,
            "lat": self.lat,
            "lng": self.lng,
            "bounds": self.bounds.to_list() if self.bounds else None,
            "parent_id": self.parent_id,
            "children_ids": self.children_ids,
            "ki_score": round(self.ki_score, 4),
            "keyman_types": self.keyman_types,
            "total_mass": self.total_mass,
            "total_flow": self.total_flow,
            "node_count": self.node_count,
            "top_keyman_id": self.top_keyman_id,
            "sector": self.sector,
            "flag": self.flag,
            "color": self.color,
            "icon": self.icon,
        }


@dataclass
class ScaleFlow:
    """스케일 간 흐름"""
    source_id: str
    target_id: str
    source_level: ScaleLevel
    target_level: ScaleLevel
    amount: float
    flow_type: str = "trade"  # trade, investment, migration, etc.
    
    def to_dict(self) -> Dict:
        return {
            "source_id": self.source_id,
            "target_id": self.target_id,
            "source_level": self.source_level.value,
            "target_level": self.target_level.value,
            "amount": self.amount,
            "flow_type": self.flow_type,
        }


class MultiScaleEngine:
    """
    멀티스케일 Physics Map 엔진
    
    줌 레벨에 따른 계층적 Keyman 탐색
    """
    
    def __init__(self):
        self._nodes: Dict[str, ScaleNode] = {}
        self._flows: List[ScaleFlow] = []
        self._level_index: Dict[ScaleLevel, List[str]] = defaultdict(list)
        self._parent_index: Dict[str, str] = {}  # child_id → parent_id
        self._children_index: Dict[str, List[str]] = defaultdict(list)  # parent_id → [child_ids]
    
    def add_node(self, node: ScaleNode) -> None:
        """노드 추가"""
        self._nodes[node.id] = node
        self._level_index[node.level].append(node.id)
        
        if node.parent_id:
            self._parent_index[node.id] = node.parent_id
            self._children_index[node.parent_id].append(node.id)
            
            # 부모 노드에도 children_ids 업데이트
            parent = self._nodes.get(node.parent_id)
            if parent and node.id not in parent.children_ids:
                parent.children_ids.append(node.id)
    
    def add_flow(self, flow: ScaleFlow) -> None:
        """흐름 추가"""
        self._flows.append(flow)
    
    def get_node(self, node_id: str) -> Optional[ScaleNode]:
        """노드 조회"""
        return self._nodes.get(node_id)
    
    def get_nodes_at_level(
        self,
        level: ScaleLevel,
        bounds: Optional[Bounds] = None,
    ) -> List[ScaleNode]:
        """
        특정 레벨의 노드 조회 (지도 영역 필터)
        """
        node_ids = self._level_index.get(level, [])
        nodes = [self._nodes[nid] for nid in node_ids if nid in self._nodes]
        
        if bounds:
            nodes = [n for n in nodes if bounds.contains(n.lat, n.lng)]
        
        return sorted(nodes, key=lambda x: x.ki_score, reverse=True)
    
    def zoom_in(self, node_id: str) -> List[ScaleNode]:
        """
        하위 레벨 노드 조회 (Zoom In)
        """
        node = self._nodes.get(node_id)
        if not node:
            return []
        
        children_ids = self._children_index.get(node_id, [])
        return [self._nodes[cid] for cid in children_ids if cid in self._nodes]
    
    def zoom_out(self, node_id: str) -> Optional[ScaleNode]:
        """
        상위 레벨 노드 조회 (Zoom Out)
        """
        parent_id = self._parent_index.get(node_id)
        if parent_id:
            return self._nodes.get(parent_id)
        return None
    
    def get_path_to_root(self, node_id: str) -> List[ScaleNode]:
        """
        최상위까지 경로
        """
        path = []
        current_id = node_id
        
        while current_id:
            node = self._nodes.get(current_id)
            if node:
                path.append(node)
            current_id = self._parent_index.get(current_id)
        
        return path
    
    def get_keyman_at_level(
        self,
        level: ScaleLevel,
        n: int = 10,
    ) -> List[ScaleNode]:
        """
        해당 레벨 TOP N Keyman
        """
        nodes = self.get_nodes_at_level(level)
        return nodes[:n]
    
    def aggregate_to_parent(self, parent_id: str) -> Optional[ScaleNode]:
        """
        하위 노드 → 상위 노드 집계
        
        - total_mass: 하위 질량 합
        - total_flow: 하위 흐름 합
        - node_count: 하위 노드 수
        - top_keyman_id: 하위 최고 KI
        - ki_score: 집계 KI
        """
        parent = self._nodes.get(parent_id)
        if not parent:
            return None
        
        children = self.zoom_in(parent_id)
        if not children:
            return parent
        
        # 집계
        parent.total_mass = sum(c.total_mass or c.ki_score for c in children)
        parent.total_flow = sum(c.total_flow for c in children)
        parent.node_count = sum(c.node_count or 1 for c in children)
        
        # 최고 Keyman
        top_child = max(children, key=lambda x: x.ki_score, default=None)
        if top_child:
            parent.top_keyman_id = top_child.id
        
        # 부모 KI = 하위 KI 평균 + 보너스 (노드 수 기반)
        avg_ki = sum(c.ki_score for c in children) / len(children)
        scale_bonus = min(0.2, len(children) * 0.01)  # 최대 20% 보너스
        parent.ki_score = min(1.0, avg_ki + scale_bonus)
        
        return parent
    
    def get_flow_between_levels(
        self,
        from_level: ScaleLevel,
        to_level: ScaleLevel,
    ) -> List[ScaleFlow]:
        """
        레벨 간 자금 흐름
        """
        return [
            f for f in self._flows
            if f.source_level == from_level and f.target_level == to_level
        ]
    
    def get_flows_for_node(self, node_id: str) -> Dict[str, List[ScaleFlow]]:
        """
        노드 관련 흐름 (유입/유출)
        """
        inflows = [f for f in self._flows if f.target_id == node_id]
        outflows = [f for f in self._flows if f.source_id == node_id]
        
        return {
            "inflows": inflows,
            "outflows": outflows,
            "total_inflow": sum(f.amount for f in inflows),
            "total_outflow": sum(f.amount for f in outflows),
        }
    
    def calculate_ki_at_level(self, level: ScaleLevel) -> None:
        """
        레벨별 KI 계산
        
        - L0: KI = GDP × 0.30 + Trade_Flow × 0.50 + Diplomatic_Power × 0.20
        - L1: KI = City_GDP × 0.30 + Inter_City_Flow × 0.50 + Political_Power × 0.20
        - L2: KI = District_Value × 0.30 + Business_Flow × 0.50 + Local_Power × 0.20
        - L3-L4: KI = C × 0.30 + F × 0.50 + RV × 0.20
        """
        nodes = self.get_nodes_at_level(level)
        if not nodes:
            return
        
        # 정규화를 위한 최대값
        max_mass = max(n.total_mass for n in nodes) or 1
        max_flow = max(n.total_flow for n in nodes) or 1
        max_count = max(n.node_count for n in nodes) or 1
        
        for node in nodes:
            mass_norm = node.total_mass / max_mass
            flow_norm = node.total_flow / max_flow
            count_norm = node.node_count / max_count
            
            # KI = Mass × 0.30 + Flow × 0.50 + Influence × 0.20
            node.ki_score = (
                mass_norm * 0.30 +
                flow_norm * 0.50 +
                count_norm * 0.20
            )
    
    def get_level_stats(self, level: ScaleLevel) -> Dict:
        """레벨 통계"""
        nodes = self.get_nodes_at_level(level)
        
        if not nodes:
            return {"level": level.value, "count": 0}
        
        return {
            "level": level.value,
            "count": len(nodes),
            "total_mass": sum(n.total_mass for n in nodes),
            "total_flow": sum(n.total_flow for n in nodes),
            "avg_ki": sum(n.ki_score for n in nodes) / len(nodes),
            "max_ki": max(n.ki_score for n in nodes),
            "top_keyman": nodes[0].name if nodes else None,
        }
    
    def to_dict(self) -> Dict:
        """전체 데이터 덤프"""
        return {
            "nodes": {nid: n.to_dict() for nid, n in self._nodes.items()},
            "flows": [f.to_dict() for f in self._flows],
            "level_counts": {
                level.value: len(self._level_index[level])
                for level in ScaleLevel
            },
        }


def create_sample_multiscale_data() -> MultiScaleEngine:
    """
    샘플 멀티스케일 데이터 생성
    """
    engine = MultiScaleEngine()
    
    # ═══════════════════════════════════════════════════════════════
    # L0: World (국가/기관)
    # ═══════════════════════════════════════════════════════════════
    l0_nodes = [
        ScaleNode(
            id="usa", name="USA", level=ScaleLevel.WORLD,
            lat=39.8, lng=-98.5, flag="🇺🇸",
            bounds=Bounds(24.5, -125, 49.4, -66.9),
            total_mass=25e12, total_flow=6e12, ki_score=0.95,
            keyman_types=["Hub", "Source"],
        ),
        ScaleNode(
            id="china", name="China", level=ScaleLevel.WORLD,
            lat=35.8, lng=104.1, flag="🇨🇳",
            bounds=Bounds(18.2, 73.5, 53.6, 135.0),
            total_mass=18e12, total_flow=5e12, ki_score=0.89,
            keyman_types=["Hub", "Source"],
        ),
        ScaleNode(
            id="japan", name="Japan", level=ScaleLevel.WORLD,
            lat=36.2, lng=138.2, flag="🇯🇵",
            bounds=Bounds(24.0, 122.9, 45.5, 153.9),
            total_mass=5e12, total_flow=1.5e12, ki_score=0.65,
            keyman_types=["Sink"],
        ),
        ScaleNode(
            id="korea", name="Korea", level=ScaleLevel.WORLD,
            lat=36.5, lng=127.9, flag="🇰🇷",
            bounds=Bounds(33.1, 124.6, 38.6, 131.9),
            total_mass=1.8e12, total_flow=1.2e12, ki_score=0.55,
            keyman_types=["Broker"],
        ),
        ScaleNode(
            id="germany", name="Germany", level=ScaleLevel.WORLD,
            lat=51.2, lng=10.4, flag="🇩🇪",
            bounds=Bounds(47.3, 5.9, 55.1, 15.0),
            total_mass=4.2e12, total_flow=2.8e12, ki_score=0.72,
            keyman_types=["Hub"],
        ),
        ScaleNode(
            id="uk", name="United Kingdom", level=ScaleLevel.WORLD,
            lat=55.4, lng=-3.4, flag="🇬🇧",
            bounds=Bounds(49.9, -8.2, 60.9, 1.8),
            total_mass=3.1e12, total_flow=2.5e12, ki_score=0.68,
            keyman_types=["Broker"],
        ),
        ScaleNode(
            id="saudi", name="Saudi Arabia", level=ScaleLevel.WORLD,
            lat=23.9, lng=45.1, flag="🇸🇦",
            bounds=Bounds(16.4, 34.5, 32.2, 55.7),
            total_mass=800e9, total_flow=400e9, ki_score=0.52,
            keyman_types=["Source"],
        ),
        ScaleNode(
            id="singapore", name="Singapore", level=ScaleLevel.WORLD,
            lat=1.35, lng=103.8, flag="🇸🇬",
            bounds=Bounds(1.2, 103.6, 1.5, 104.0),
            total_mass=400e9, total_flow=800e9, ki_score=0.61,
            keyman_types=["Broker"],
        ),
    ]
    
    for node in l0_nodes:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # L1: Country (도시/재벌) - USA
    # ═══════════════════════════════════════════════════════════════
    usa_cities = [
        ScaleNode(
            id="nyc", name="New York", level=ScaleLevel.COUNTRY,
            lat=40.71, lng=-74.0, parent_id="usa", flag="🗽",
            bounds=Bounds(40.5, -74.3, 40.9, -73.7),
            total_mass=1.8e12, total_flow=2e12, ki_score=0.88,
            keyman_types=["Hub", "Broker"],
        ),
        ScaleNode(
            id="dc", name="Washington DC", level=ScaleLevel.COUNTRY,
            lat=38.9, lng=-77.0, parent_id="usa", flag="🏛️",
            bounds=Bounds(38.8, -77.1, 39.0, -76.9),
            total_mass=500e9, total_flow=800e9, ki_score=0.82,
            keyman_types=["Hub"],
        ),
        ScaleNode(
            id="sf", name="San Francisco", level=ScaleLevel.COUNTRY,
            lat=37.77, lng=-122.4, parent_id="usa", flag="🌉",
            bounds=Bounds(37.7, -122.5, 37.8, -122.3),
            total_mass=800e9, total_flow=600e9, ki_score=0.75,
            keyman_types=["Source"],
        ),
    ]
    
    for node in usa_cities:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # L1: Country (도시) - Korea
    # ═══════════════════════════════════════════════════════════════
    korea_cities = [
        ScaleNode(
            id="seoul", name="Seoul", level=ScaleLevel.COUNTRY,
            lat=37.57, lng=126.98, parent_id="korea", flag="🏙️",
            bounds=Bounds(37.4, 126.8, 37.7, 127.2),
            total_mass=800e9, total_flow=600e9, ki_score=0.78,
            keyman_types=["Hub"],
        ),
        ScaleNode(
            id="busan", name="Busan", level=ScaleLevel.COUNTRY,
            lat=35.18, lng=129.08, parent_id="korea", flag="⚓",
            bounds=Bounds(35.0, 128.9, 35.3, 129.2),
            total_mass=150e9, total_flow=200e9, ki_score=0.45,
            keyman_types=["Broker"],
        ),
    ]
    
    for node in korea_cities:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # L2: City (구역) - NYC
    # ═══════════════════════════════════════════════════════════════
    nyc_districts = [
        ScaleNode(
            id="manhattan", name="Manhattan", level=ScaleLevel.CITY,
            lat=40.78, lng=-73.97, parent_id="nyc",
            bounds=Bounds(40.7, -74.02, 40.88, -73.91),
            total_mass=1e12, total_flow=1.5e12, ki_score=0.85,
            keyman_types=["Hub"],
        ),
        ScaleNode(
            id="brooklyn", name="Brooklyn", level=ScaleLevel.CITY,
            lat=40.65, lng=-73.95, parent_id="nyc",
            bounds=Bounds(40.57, -74.04, 40.74, -73.83),
            total_mass=200e9, total_flow=100e9, ki_score=0.42,
        ),
    ]
    
    for node in nyc_districts:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # L2: City (구역) - Seoul
    # ═══════════════════════════════════════════════════════════════
    seoul_districts = [
        ScaleNode(
            id="gangnam", name="Gangnam", level=ScaleLevel.CITY,
            lat=37.50, lng=127.04, parent_id="seoul",
            bounds=Bounds(37.47, 127.0, 37.53, 127.1),
            total_mass=300e9, total_flow=200e9, ki_score=0.72,
            keyman_types=["Hub"],
        ),
        ScaleNode(
            id="seocho", name="Seocho", level=ScaleLevel.CITY,
            lat=37.48, lng=127.0, parent_id="seoul",
            bounds=Bounds(37.45, 126.95, 37.51, 127.05),
            total_mass=150e9, total_flow=100e9, ki_score=0.55,
        ),
        ScaleNode(
            id="jongno", name="Jongno", level=ScaleLevel.CITY,
            lat=37.57, lng=126.98, parent_id="seoul",
            bounds=Bounds(37.55, 126.95, 37.60, 127.02),
            total_mass=200e9, total_flow=150e9, ki_score=0.62,
            keyman_types=["Broker"],
        ),
    ]
    
    for node in seoul_districts:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # L3: District (건물/지역) - Manhattan
    # ═══════════════════════════════════════════════════════════════
    manhattan_areas = [
        ScaleNode(
            id="wall_street", name="Wall Street", level=ScaleLevel.DISTRICT,
            lat=40.706, lng=-74.009, parent_id="manhattan",
            total_mass=500e9, total_flow=1e12, ki_score=0.82,
            sector="finance", icon="🏦",
            keyman_types=["Hub", "Broker"],
        ),
        ScaleNode(
            id="midtown", name="Midtown", level=ScaleLevel.DISTRICT,
            lat=40.755, lng=-73.984, parent_id="manhattan",
            total_mass=300e9, total_flow=400e9, ki_score=0.65,
            sector="mixed", icon="🏢",
        ),
    ]
    
    for node in manhattan_areas:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # L3: District (건물/지역) - Gangnam
    # ═══════════════════════════════════════════════════════════════
    gangnam_areas = [
        ScaleNode(
            id="daechi", name="Daechi-dong", level=ScaleLevel.DISTRICT,
            lat=37.499, lng=127.057, parent_id="gangnam",
            total_mass=50e9, total_flow=30e9, ki_score=0.58,
            sector="education", icon="📚",
            keyman_types=["Hub"],
        ),
        ScaleNode(
            id="yeoksam", name="Yeoksam-dong", level=ScaleLevel.DISTRICT,
            lat=37.502, lng=127.034, parent_id="gangnam",
            total_mass=100e9, total_flow=80e9, ki_score=0.62,
            sector="tech", icon="💻",
        ),
        ScaleNode(
            id="samseong", name="Samseong-dong", level=ScaleLevel.DISTRICT,
            lat=37.511, lng=127.06, parent_id="gangnam",
            total_mass=200e9, total_flow=150e9, ki_score=0.68,
            sector="business", icon="🏢",
            keyman_types=["Broker"],
        ),
    ]
    
    for node in gangnam_areas:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # L4: Block (개인) - Wall Street
    # ═══════════════════════════════════════════════════════════════
    wall_street_people = [
        ScaleNode(
            id="larry_fink", name="Larry Fink", level=ScaleLevel.BLOCK,
            lat=40.706, lng=-74.009, parent_id="wall_street",
            total_mass=10e12, total_flow=500e9, ki_score=0.88,
            sector="finance", icon="👔",
            keyman_types=["Hub", "Bottleneck"],
        ),
        ScaleNode(
            id="jamie_dimon", name="Jamie Dimon", level=ScaleLevel.BLOCK,
            lat=40.705, lng=-74.008, parent_id="wall_street",
            total_mass=4e12, total_flow=350e9, ki_score=0.78,
            sector="finance", icon="👔",
            keyman_types=["Hub"],
        ),
    ]
    
    for node in wall_street_people:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # L4: Block (개인) - DC
    # ═══════════════════════════════════════════════════════════════
    dc_areas = [
        ScaleNode(
            id="white_house", name="White House", level=ScaleLevel.DISTRICT,
            lat=38.897, lng=-77.036, parent_id="dc",
            total_mass=100e9, total_flow=500e9, ki_score=0.85,
            sector="government", icon="🏛️",
        ),
    ]
    
    for node in dc_areas:
        engine.add_node(node)
    
    dc_people = [
        ScaleNode(
            id="donald_trump", name="Donald Trump", level=ScaleLevel.BLOCK,
            lat=38.897, lng=-77.036, parent_id="white_house",
            total_mass=8e12, total_flow=200e9, ki_score=0.72,
            sector="government", icon="🎩",
            keyman_types=["Hub", "Source"],
        ),
        ScaleNode(
            id="jerome_powell", name="Jerome Powell", level=ScaleLevel.BLOCK,
            lat=38.893, lng=-77.045, parent_id="dc",
            total_mass=9e12, total_flow=400e9, ki_score=0.85,
            sector="central_bank", icon="🏦",
            keyman_types=["Hub", "Bottleneck"],
        ),
    ]
    
    for node in dc_people:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # L4: Block (개인) - Daechi
    # ═══════════════════════════════════════════════════════════════
    daechi_people = [
        ScaleNode(
            id="son_jueun", name="손주은", level=ScaleLevel.BLOCK,
            lat=37.499, lng=127.057, parent_id="daechi",
            total_mass=500e6, total_flow=100e6, ki_score=0.45,
            sector="education", icon="👨‍🏫",
            keyman_types=["Hub"],
        ),
        ScaleNode(
            id="kim_director", name="김원장", level=ScaleLevel.BLOCK,
            lat=37.498, lng=127.058, parent_id="daechi",
            total_mass=50e6, total_flow=30e6, ki_score=0.25,
            sector="education", icon="👨‍💼",
        ),
        ScaleNode(
            id="lee_branch", name="이지점장", level=ScaleLevel.BLOCK,
            lat=37.500, lng=127.056, parent_id="daechi",
            total_mass=20e6, total_flow=15e6, ki_score=0.18,
            sector="education", icon="👩‍💼",
        ),
        ScaleNode(
            id="parent_park", name="학부모 박씨", level=ScaleLevel.BLOCK,
            lat=37.497, lng=127.059, parent_id="daechi",
            total_mass=5e6, total_flow=3e6, ki_score=0.08,
            sector="consumer", icon="👨‍👩‍👧",
        ),
    ]
    
    for node in daechi_people:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # L4: Block (개인) - China
    # ═══════════════════════════════════════════════════════════════
    china_cities = [
        ScaleNode(
            id="beijing", name="Beijing", level=ScaleLevel.COUNTRY,
            lat=39.9, lng=116.4, parent_id="china", flag="🏯",
            bounds=Bounds(39.4, 115.4, 40.2, 117.5),
            total_mass=2e12, total_flow=1.5e12, ki_score=0.85,
            keyman_types=["Hub"],
        ),
    ]
    
    for node in china_cities:
        engine.add_node(node)
    
    beijing_areas = [
        ScaleNode(
            id="zhongnanhai", name="Zhongnanhai", level=ScaleLevel.DISTRICT,
            lat=39.912, lng=116.38, parent_id="beijing",
            total_mass=500e9, total_flow=800e9, ki_score=0.92,
            sector="government", icon="🏛️",
            keyman_types=["Hub", "Bottleneck"],
        ),
    ]
    
    for node in beijing_areas:
        engine.add_node(node)
    
    china_leaders = [
        ScaleNode(
            id="xi_jinping", name="Xi Jinping", level=ScaleLevel.BLOCK,
            lat=39.912, lng=116.38, parent_id="zhongnanhai",
            total_mass=20e12, total_flow=500e9, ki_score=0.95,
            sector="government", icon="👔",
            keyman_types=["Hub", "Bottleneck", "Source"],
        ),
    ]
    
    for node in china_leaders:
        engine.add_node(node)
    
    # ═══════════════════════════════════════════════════════════════
    # Flows
    # ═══════════════════════════════════════════════════════════════
    flows = [
        # L0 간 흐름
        ScaleFlow("usa", "china", ScaleLevel.WORLD, ScaleLevel.WORLD, 500e9, "trade"),
        ScaleFlow("china", "usa", ScaleLevel.WORLD, ScaleLevel.WORLD, 450e9, "trade"),
        ScaleFlow("usa", "korea", ScaleLevel.WORLD, ScaleLevel.WORLD, 100e9, "trade"),
        ScaleFlow("korea", "usa", ScaleLevel.WORLD, ScaleLevel.WORLD, 120e9, "trade"),
        ScaleFlow("china", "korea", ScaleLevel.WORLD, ScaleLevel.WORLD, 150e9, "trade"),
        
        # L4 개인 간 흐름
        ScaleFlow("larry_fink", "jamie_dimon", ScaleLevel.BLOCK, ScaleLevel.BLOCK, 80e9, "investment"),
        ScaleFlow("larry_fink", "jerome_powell", ScaleLevel.BLOCK, ScaleLevel.BLOCK, 200e9, "investment"),
        ScaleFlow("xi_jinping", "donald_trump", ScaleLevel.BLOCK, ScaleLevel.BLOCK, 300e9, "trade"),
    ]
    
    for flow in flows:
        engine.add_flow(flow)
    
    return engine

