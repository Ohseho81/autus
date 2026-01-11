"""
AUTUS Keyman Engine - Keyman Index 산출

핵심 수식:
KI = C × 0.30 + F × 0.50 + RV × 0.20

- C: 연결수 (정규화)
- F: 총자금흐름 (정규화)
- RV: S_Person 점수 (정규화)

Keyman 유형:
- Hub: 연결수 Top 10%
- Sink: 유입 Top 10%
- Source: 유출 Top 10%
- Broker: Hub AND (Sink OR Source)
- Bottleneck: 제거 시 영향도 > 0.3
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from enum import Enum
from collections import defaultdict
import math

from .person_model import PersonRegistry, Person, Sector
from .person_score_v2 import calculate_all_scores, PersonScore
from .params_loader import SovereignParams


class KeymanType(str, Enum):
    """Keyman 유형"""
    HUB = "Hub"              # 연결수 Top 10%
    SINK = "Sink"            # 유입 Top 10%
    SOURCE = "Source"        # 유출 Top 10%
    BROKER = "Broker"        # Hub AND (Sink OR Source)
    BOTTLENECK = "Bottleneck"  # 제거 시 영향도 > 0.3


@dataclass
class KeymanScore:
    """Keyman 점수 결과"""
    person_id: str
    name: str
    sector: str
    
    # KI 구성요소 (원본)
    connections: int = 0
    total_flow: float = 0.0
    inflow: float = 0.0
    outflow: float = 0.0
    real_value: float = 0.0  # S_Person
    
    # 정규화 값
    c_norm: float = 0.0
    f_norm: float = 0.0
    rv_norm: float = 0.0
    
    # 최종 KI
    ki_score: float = 0.0
    ki_rank: int = 0
    
    # Keyman 유형 & 영향도
    keyman_types: List[str] = field(default_factory=list)
    network_impact: float = 0.0  # 제거 시 분절도
    
    # 연결된 파트너
    unique_partners: int = 0
    top_partners: List[Tuple[str, float]] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "person_id": self.person_id,
            "name": self.name,
            "sector": self.sector,
            "connections": self.connections,
            "total_flow": self.total_flow,
            "inflow": self.inflow,
            "outflow": self.outflow,
            "real_value": round(self.real_value, 4),
            "c_norm": round(self.c_norm, 4),
            "f_norm": round(self.f_norm, 4),
            "rv_norm": round(self.rv_norm, 4),
            "ki_score": round(self.ki_score, 4),
            "ki_rank": self.ki_rank,
            "keyman_types": self.keyman_types,
            "network_impact": round(self.network_impact, 4),
            "unique_partners": self.unique_partners,
            "top_partners": [(p, round(f, 2)) for p, f in self.top_partners[:5]],
        }


class KeymanEngine:
    """
    Keyman Index 엔진
    
    KI = C × 0.30 + F × 0.50 + RV × 0.20
    """
    
    # 가중치
    WEIGHT_CONNECTIONS = 0.30
    WEIGHT_FLOW = 0.50
    WEIGHT_RV = 0.20
    
    # Keyman 판별 기준
    TOP_PERCENTILE = 0.10  # Top 10%
    BOTTLENECK_THRESHOLD = 0.3  # 영향도 30% 이상
    
    def __init__(
        self,
        registry: PersonRegistry,
        person_scores: Optional[Dict[str, PersonScore]] = None,
        motions: Optional[List[Dict]] = None,
    ):
        self.registry = registry
        self.person_scores = person_scores or {}
        self.motions = motions or []
        
        # 플로우 데이터 계산
        self._flow_data: Dict[str, Dict] = {}
        self._calculate_flows()
        
        # Keyman 점수
        self._keyman_scores: Dict[str, KeymanScore] = {}
    
    def _calculate_flows(self) -> None:
        """모션 데이터에서 플로우 계산"""
        self._flow_data = defaultdict(lambda: {
            "connections": 0,
            "inflow": 0.0,
            "outflow": 0.0,
            "total_flow": 0.0,
            "partners": set(),
            "partner_flows": {},
        })
        
        for motion in self.motions:
            src = motion.get("source")
            tgt = motion.get("target")
            amount = float(motion.get("amount", 0))
            
            if not src or not tgt:
                continue
            
            # Source 측
            self._flow_data[src]["connections"] += 1
            self._flow_data[src]["outflow"] += amount
            self._flow_data[src]["total_flow"] += amount
            self._flow_data[src]["partners"].add(tgt)
            self._flow_data[src]["partner_flows"][tgt] = (
                self._flow_data[src]["partner_flows"].get(tgt, 0) + amount
            )
            
            # Target 측
            self._flow_data[tgt]["connections"] += 1
            self._flow_data[tgt]["inflow"] += amount
            self._flow_data[tgt]["total_flow"] += amount
            self._flow_data[tgt]["partners"].add(src)
            self._flow_data[tgt]["partner_flows"][src] = (
                self._flow_data[tgt]["partner_flows"].get(src, 0) + amount
            )
    
    def calculate_ki(self, person_id: str) -> Optional[KeymanScore]:
        """
        개인 KI 계산
        
        KI = C × 0.30 + F × 0.50 + RV × 0.20
        """
        person = self.registry.get(person_id)
        if not person:
            return None
        
        flow = self._flow_data.get(person_id, {})
        ps = self.person_scores.get(person_id)
        
        # 원본 값
        connections = flow.get("connections", 0)
        total_flow = flow.get("total_flow", 0)
        inflow = flow.get("inflow", 0)
        outflow = flow.get("outflow", 0)
        real_value = ps.score if ps else 0.0
        
        # 파트너 정보
        partners = flow.get("partners", set())
        partner_flows = flow.get("partner_flows", {})
        top_partners = sorted(
            partner_flows.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return KeymanScore(
            person_id=person_id,
            name=person.name,
            sector=person.sector.value,
            connections=connections,
            total_flow=total_flow,
            inflow=inflow,
            outflow=outflow,
            real_value=real_value,
            unique_partners=len(partners),
            top_partners=top_partners,
        )
    
    def calculate_all_ki(self) -> Dict[str, KeymanScore]:
        """
        전체 KI 계산 + 정규화 + 랭킹
        """
        # 1. 기본 점수 계산
        scores: Dict[str, KeymanScore] = {}
        for person in self.registry.all():
            ks = self.calculate_ki(person.id)
            if ks:
                scores[person.id] = ks
        
        if not scores:
            return {}
        
        # 2. 정규화를 위한 최대값 계산
        max_c = max(ks.connections for ks in scores.values()) or 1
        max_f = max(ks.total_flow for ks in scores.values()) or 1
        max_rv = max(ks.real_value for ks in scores.values()) or 1
        
        # 3. 정규화 + KI 계산
        for ks in scores.values():
            ks.c_norm = ks.connections / max_c
            ks.f_norm = ks.total_flow / max_f
            ks.rv_norm = ks.real_value / max_rv if max_rv > 0 else 0
            
            ks.ki_score = (
                ks.c_norm * self.WEIGHT_CONNECTIONS +
                ks.f_norm * self.WEIGHT_FLOW +
                ks.rv_norm * self.WEIGHT_RV
            )
        
        # 4. 랭킹
        sorted_scores = sorted(
            scores.values(),
            key=lambda x: x.ki_score,
            reverse=True
        )
        for i, ks in enumerate(sorted_scores, 1):
            ks.ki_rank = i
        
        # 5. Keyman 유형 분류
        self._classify_keyman_types(scores)
        
        # 6. 네트워크 영향도 계산
        self._calculate_all_network_impacts(scores)
        
        self._keyman_scores = scores
        return scores
    
    def _classify_keyman_types(self, scores: Dict[str, KeymanScore]) -> None:
        """
        Keyman 유형 분류
        
        - Hub: 연결수 Top 10%
        - Sink: 유입 Top 10%
        - Source: 유출 Top 10%
        - Broker: Hub AND (Sink OR Source)
        - Bottleneck: (나중에 calculate_network_impact에서)
        """
        n = len(scores)
        threshold_idx = max(1, int(n * self.TOP_PERCENTILE))
        
        # 연결수 기준 정렬
        by_connections = sorted(
            scores.values(),
            key=lambda x: x.connections,
            reverse=True
        )
        hubs = {ks.person_id for ks in by_connections[:threshold_idx]}
        
        # 유입 기준 정렬
        by_inflow = sorted(
            scores.values(),
            key=lambda x: x.inflow,
            reverse=True
        )
        sinks = {ks.person_id for ks in by_inflow[:threshold_idx]}
        
        # 유출 기준 정렬
        by_outflow = sorted(
            scores.values(),
            key=lambda x: x.outflow,
            reverse=True
        )
        sources = {ks.person_id for ks in by_outflow[:threshold_idx]}
        
        # 유형 할당
        for ks in scores.values():
            types = []
            
            is_hub = ks.person_id in hubs
            is_sink = ks.person_id in sinks
            is_source = ks.person_id in sources
            
            if is_hub:
                types.append(KeymanType.HUB.value)
            if is_sink:
                types.append(KeymanType.SINK.value)
            if is_source:
                types.append(KeymanType.SOURCE.value)
            
            # Broker: Hub AND (Sink OR Source)
            if is_hub and (is_sink or is_source):
                types.append(KeymanType.BROKER.value)
            
            ks.keyman_types = types
    
    def calculate_network_impact(self, person_id: str) -> float:
        """
        노드 제거 시 네트워크 분절도
        
        = 제거 후 끊기는 연결 수 / 전체 연결 수
        """
        person = self.registry.get(person_id)
        if not person:
            return 0.0
        
        # 전체 연결 수
        total_connections = sum(
            len(p.connections) for p in self.registry.all()
        )
        
        if total_connections == 0:
            return 0.0
        
        # 이 노드를 제거하면 끊기는 연결 수
        broken_connections = len(person.connections) * 2  # 양방향
        
        # 추가로 고립되는 노드 확인
        for neighbor_id in person.connections:
            neighbor = self.registry.get(neighbor_id)
            if neighbor:
                # 이 노드가 유일한 연결인 경우
                if len(neighbor.connections) == 1:
                    # 이 이웃의 모든 연결이 끊김
                    pass  # 이미 위에서 계산됨
        
        impact = broken_connections / total_connections
        return min(1.0, impact)
    
    def _calculate_all_network_impacts(self, scores: Dict[str, KeymanScore]) -> None:
        """모든 노드의 네트워크 영향도 계산"""
        for ks in scores.values():
            ks.network_impact = self.calculate_network_impact(ks.person_id)
            
            # Bottleneck 유형 추가
            if ks.network_impact >= self.BOTTLENECK_THRESHOLD:
                if KeymanType.BOTTLENECK.value not in ks.keyman_types:
                    ks.keyman_types.append(KeymanType.BOTTLENECK.value)
    
    def find_bottleneck_nodes(
        self,
        source_id: str,
        target_id: str,
    ) -> List[str]:
        """
        A→B 경로에서 반드시 거쳐야 하는 노드 (우회 불가능)
        
        BFS로 모든 경로를 찾고, 모든 경로에 공통으로 존재하는 노드
        """
        source = self.registry.get(source_id)
        target = self.registry.get(target_id)
        
        if not source or not target:
            return []
        
        # BFS로 모든 경로 찾기 (최대 100개)
        all_paths = self._find_all_paths(source_id, target_id, max_paths=100)
        
        if not all_paths:
            return []
        
        # 모든 경로에 공통으로 존재하는 노드 (시작/끝 제외)
        common_nodes = set(all_paths[0])
        for path in all_paths[1:]:
            common_nodes &= set(path)
        
        # 시작/끝 제외
        common_nodes.discard(source_id)
        common_nodes.discard(target_id)
        
        return list(common_nodes)
    
    def _find_all_paths(
        self,
        source_id: str,
        target_id: str,
        max_paths: int = 100,
        max_depth: int = 6,
    ) -> List[List[str]]:
        """BFS로 모든 경로 찾기"""
        paths = []
        queue = [[source_id]]
        
        while queue and len(paths) < max_paths:
            path = queue.pop(0)
            current = path[-1]
            
            if len(path) > max_depth:
                continue
            
            if current == target_id:
                paths.append(path)
                continue
            
            person = self.registry.get(current)
            if not person:
                continue
            
            for neighbor_id in person.connections:
                if neighbor_id not in path:  # 사이클 방지
                    queue.append(path + [neighbor_id])
        
        return paths
    
    def simulate_removal(
        self,
        person_id: str,
    ) -> Dict:
        """
        노드 제거 시뮬레이션
        
        Returns:
            - removed_person: 제거된 노드 정보
            - broken_connections: 끊긴 연결 수
            - isolated_nodes: 고립된 노드 목록
            - flow_impact: 자금 흐름 영향
            - network_impact: 네트워크 분절도
        """
        person = self.registry.get(person_id)
        if not person:
            return {"error": f"Person {person_id} not found"}
        
        flow = self._flow_data.get(person_id, {})
        ks = self._keyman_scores.get(person_id)
        
        # 끊긴 연결
        broken_connections = list(person.connections)
        
        # 고립된 노드 (이 노드가 유일한 연결인 경우)
        isolated_nodes = []
        for neighbor_id in person.connections:
            neighbor = self.registry.get(neighbor_id)
            if neighbor and len(neighbor.connections) == 1:
                isolated_nodes.append(neighbor_id)
        
        # 자금 흐름 영향
        total_flow = flow.get("total_flow", 0)
        
        return {
            "removed_person": {
                "id": person_id,
                "name": person.name,
                "sector": person.sector.value,
            },
            "broken_connections": len(broken_connections),
            "broken_with": broken_connections,
            "isolated_nodes": isolated_nodes,
            "flow_impact": {
                "total_flow_lost": total_flow,
                "inflow_lost": flow.get("inflow", 0),
                "outflow_lost": flow.get("outflow", 0),
            },
            "network_impact": ks.network_impact if ks else 0,
            "keyman_types": ks.keyman_types if ks else [],
        }
    
    def get_top_keyman(self, n: int = 20) -> List[KeymanScore]:
        """TOP N Keyman 반환"""
        if not self._keyman_scores:
            self.calculate_all_ki()
        
        sorted_scores = sorted(
            self._keyman_scores.values(),
            key=lambda x: x.ki_score,
            reverse=True
        )
        return sorted_scores[:n]
    
    def get_by_type(self, keyman_type: str) -> List[KeymanScore]:
        """유형별 Keyman 반환"""
        if not self._keyman_scores:
            self.calculate_all_ki()
        
        return [
            ks for ks in self._keyman_scores.values()
            if keyman_type in ks.keyman_types
        ]
    
    def get_by_sector(self, sector: str) -> List[KeymanScore]:
        """섹터별 TOP Keyman 반환"""
        if not self._keyman_scores:
            self.calculate_all_ki()
        
        sector_scores = [
            ks for ks in self._keyman_scores.values()
            if ks.sector == sector
        ]
        return sorted(sector_scores, key=lambda x: x.ki_score, reverse=True)
    
    def get_keyman_score(self, person_id: str) -> Optional[KeymanScore]:
        """개인 KI 조회"""
        if not self._keyman_scores:
            self.calculate_all_ki()
        
        return self._keyman_scores.get(person_id)
    
    def get_formula_explanation(self) -> Dict:
        """수식 설명"""
        return {
            "formula": "KI = C × 0.30 + F × 0.50 + RV × 0.20",
            "components": {
                "C": {
                    "name": "Connections",
                    "weight": 0.30,
                    "description": "연결 수 (정규화)",
                },
                "F": {
                    "name": "Total Flow",
                    "weight": 0.50,
                    "description": "총 자금 흐름 (정규화)",
                },
                "RV": {
                    "name": "Real Value",
                    "weight": 0.20,
                    "description": "S_Person 점수 (정규화)",
                },
            },
            "keyman_types": {
                "Hub": "연결수 Top 10%",
                "Sink": "유입 Top 10%",
                "Source": "유출 Top 10%",
                "Broker": "Hub AND (Sink OR Source)",
                "Bottleneck": "제거 시 영향도 > 30%",
            },
            "network_impact": {
                "formula": "끊기는 연결 수 / 전체 연결 수",
                "threshold": 0.30,
            },
        }


def create_keyman_engine(
    registry: PersonRegistry,
    params: SovereignParams = None,
    motions: List[Dict] = None,
) -> KeymanEngine:
    """
    Keyman Engine 팩토리
    
    1. S_Person 점수 계산
    2. KeymanEngine 생성
    """
    # S_Person 계산
    person_scores = calculate_all_scores(registry, params)
    
    # Engine 생성
    return KeymanEngine(
        registry=registry,
        person_scores=person_scores,
        motions=motions or [],
    )

