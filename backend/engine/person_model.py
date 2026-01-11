"""
AUTUS Person Model - 노드(Person) 정의

6차원 Ψ 벡터:
- G (Governance): 거버넌스 가치 (자산, 권한)
- R (Reputation): 평판/신뢰도
- E (Exposure): 위험 노출도 (높을수록 부정적)
- T (Throughput): 처리량/활동성
- N (Network): 네트워크 연결성
- L (Liquidity): 유동성
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
from datetime import datetime
from enum import Enum


class Sector(str, Enum):
    """섹터 분류"""
    GOVERNMENT = "government"
    CENTRAL_BANK = "central_bank"
    FINANCE = "finance"
    TECH = "tech"
    ROYAL = "royal"
    INDUSTRY = "industry"
    ENERGY = "energy"
    MEDIA = "media"
    CONSUMER = "consumer"
    OTHER = "other"


class Region(str, Enum):
    """지역 분류"""
    ASIA = "asia"
    NA = "na"
    EU = "eu"
    MENA = "mena"
    LATAM = "latam"
    AFRICA = "africa"
    OCEANIA = "oceania"


@dataclass
class PsiVector:
    """6차원 Ψ 벡터"""
    G: float = 0.0  # Governance (거버넌스 가치) - 0.0 ~ 1.0 정규화
    R: float = 0.5  # Reputation (평판) - 0.0 ~ 1.0
    E: float = 0.3  # Exposure (위험 노출) - 0.0 ~ 1.0 (높을수록 부정적)
    T: float = 0.5  # Throughput (처리량) - 0.0 ~ 1.0
    N: float = 0.0  # Network (네트워크 중심성) - 0.0 ~ 1.0
    L: float = 0.5  # Liquidity (유동성) - 0.0 ~ 1.0
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "G": self.G,
            "R": self.R,
            "E": self.E,
            "T": self.T,
            "N": self.N,
            "L": self.L,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, float]) -> "PsiVector":
        return cls(
            G=data.get("G", 0.0),
            R=data.get("R", 0.5),
            E=data.get("E", 0.3),
            T=data.get("T", 0.5),
            N=data.get("N", 0.0),
            L=data.get("L", 0.5),
        )


@dataclass
class Person:
    """
    Physics Map 노드 (Person/Entity)
    """
    id: str
    name: str
    title: str = ""
    sector: Sector = Sector.OTHER
    region: Region = Region.ASIA
    
    # 6차원 Ψ 벡터
    psi: PsiVector = field(default_factory=PsiVector)
    
    # 기본 메타데이터
    rv: float = 0.0  # Real Value (실질 가치) - 원본 단위 (USD)
    lat: float = 0.0
    lng: float = 0.0
    
    # 네트워크 연결
    connections: Set[str] = field(default_factory=set)  # 연결된 노드 ID
    
    # 시간 정보
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    # Eigenvector 중심성 (외부에서 계산)
    eigenvector_centrality: float = 0.0
    
    def __post_init__(self):
        """rv에서 G(Governance) 자동 계산"""
        if self.rv > 0 and self.psi.G == 0.0:
            # rv를 0~1 로 정규화 (log scale, 최대 $100T 기준)
            import math
            max_rv = 100e12  # $100T
            self.psi.G = min(1.0, math.log10(max(self.rv, 1)) / math.log10(max_rv))
    
    def add_connection(self, person_id: str):
        """연결 추가"""
        self.connections.add(person_id)
        self.updated_at = datetime.now()
    
    def remove_connection(self, person_id: str):
        """연결 제거"""
        self.connections.discard(person_id)
        self.updated_at = datetime.now()
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "title": self.title,
            "sector": self.sector.value,
            "region": self.region.value,
            "psi": self.psi.to_dict(),
            "rv": self.rv,
            "lat": self.lat,
            "lng": self.lng,
            "connections": list(self.connections),
            "eigenvector_centrality": self.eigenvector_centrality,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class PersonRegistry:
    """
    Person 레지스트리 - 전체 노드 관리
    """
    
    def __init__(self):
        self._persons: Dict[str, Person] = {}
        self._chi_matrix: Dict[str, Dict[str, float]] = {}  # 결합계수 행렬
    
    def add(self, person: Person) -> None:
        """Person 추가"""
        self._persons[person.id] = person
    
    def get(self, person_id: str) -> Optional[Person]:
        """Person 조회"""
        return self._persons.get(person_id)
    
    def remove(self, person_id: str) -> None:
        """Person 제거"""
        if person_id in self._persons:
            del self._persons[person_id]
            # 연결 정리
            for p in self._persons.values():
                p.connections.discard(person_id)
            # 결합계수 정리
            if person_id in self._chi_matrix:
                del self._chi_matrix[person_id]
            for chi_row in self._chi_matrix.values():
                chi_row.pop(person_id, None)
    
    def all(self) -> List[Person]:
        """전체 Person 목록"""
        return list(self._persons.values())
    
    def count(self) -> int:
        """Person 수"""
        return len(self._persons)
    
    def add_connection(self, from_id: str, to_id: str, chi: float = 0.5) -> bool:
        """
        연결 추가 (양방향)
        
        Args:
            from_id: 출발 노드
            to_id: 도착 노드
            chi: 결합계수 (-1.0 ~ 1.0)
                 양수: 시너지 (협력)
                 음수: 마찰 (경쟁)
        """
        from_person = self._persons.get(from_id)
        to_person = self._persons.get(to_id)
        
        if not from_person or not to_person:
            return False
        
        # 양방향 연결
        from_person.add_connection(to_id)
        to_person.add_connection(from_id)
        
        # 결합계수 저장
        if from_id not in self._chi_matrix:
            self._chi_matrix[from_id] = {}
        if to_id not in self._chi_matrix:
            self._chi_matrix[to_id] = {}
        
        self._chi_matrix[from_id][to_id] = chi
        self._chi_matrix[to_id][from_id] = chi
        
        return True
    
    def get_chi(self, from_id: str, to_id: str) -> float:
        """결합계수 조회"""
        return self._chi_matrix.get(from_id, {}).get(to_id, 0.0)
    
    def get_connections(self, person_id: str) -> List[str]:
        """연결된 노드 ID 목록"""
        person = self._persons.get(person_id)
        return list(person.connections) if person else []
    
    def calculate_eigenvector_centrality(self) -> None:
        """
        Eigenvector Centrality 계산 (Power Iteration)
        모든 노드의 eigenvector_centrality 업데이트
        """
        import math
        
        n = len(self._persons)
        if n == 0:
            return
        
        ids = list(self._persons.keys())
        
        # 초기화: 모든 노드에 1/n
        centrality = {pid: 1.0 / n for pid in ids}
        
        # Power Iteration (20회)
        for _ in range(20):
            new_centrality = {}
            for pid in ids:
                person = self._persons[pid]
                score = 0.0
                for neighbor_id in person.connections:
                    if neighbor_id in centrality:
                        chi = self.get_chi(pid, neighbor_id)
                        # 결합계수 반영 (음수면 감소)
                        score += centrality[neighbor_id] * (1 + chi * 0.5)
                new_centrality[pid] = score
            
            # 정규화
            total = sum(new_centrality.values())
            if total > 0:
                for pid in ids:
                    new_centrality[pid] /= total
            
            centrality = new_centrality
        
        # Person에 반영
        for pid, value in centrality.items():
            self._persons[pid].eigenvector_centrality = value
            # N(Network) 차원도 업데이트
            self._persons[pid].psi.N = min(1.0, value * 10)  # 스케일 조정
    
    def get_by_sector(self, sector: Sector) -> List[Person]:
        """섹터별 조회"""
        return [p for p in self._persons.values() if p.sector == sector]
    
    def get_by_region(self, region: Region) -> List[Person]:
        """지역별 조회"""
        return [p for p in self._persons.values() if p.region == region]
    
    def to_dict(self) -> Dict:
        return {
            "persons": {pid: p.to_dict() for pid, p in self._persons.items()},
            "chi_matrix": self._chi_matrix,
            "count": len(self._persons),
        }
    
    @classmethod
    def from_physics_map(cls, nodes: List[Dict], motions: List[Dict]) -> "PersonRegistry":
        """
        Physics Map 데이터에서 Registry 생성
        
        Args:
            nodes: 노드 목록 [{id, name, title, sector, rv, ...}]
            motions: 모션 목록 [{source, target, amount}]
        """
        registry = cls()
        
        # 노드 추가
        for node in nodes:
            sector = Sector.OTHER
            try:
                sector = Sector(node.get("sector", "other"))
            except ValueError:
                pass
            
            region = Region.ASIA
            try:
                region = Region(node.get("region", "asia"))
            except ValueError:
                pass
            
            person = Person(
                id=node["id"],
                name=node["name"],
                title=node.get("title", ""),
                sector=sector,
                region=region,
                rv=float(node.get("rv", 0)),
                lat=float(node.get("lat", 0)),
                lng=float(node.get("lng", 0)),
            )
            registry.add(person)
        
        # 모션 → 연결 + 결합계수
        for motion in motions:
            src = motion.get("source")
            tgt = motion.get("target")
            amount = float(motion.get("amount", 0))
            
            # 금액 기반 결합계수 (양수 = 협력)
            # log scale로 0.1 ~ 0.9 매핑
            import math
            if amount > 0:
                chi = min(0.9, 0.1 + math.log10(amount / 1e6) * 0.1)
            else:
                chi = 0.1
            
            registry.add_connection(src, tgt, chi)
        
        # Eigenvector Centrality 계산
        registry.calculate_eigenvector_centrality()
        
        return registry

