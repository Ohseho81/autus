#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                                     ║
║                                                                                           ║
║  "시너지(S)는 시스템이 아니라, 사람과 사람 사이의 인력이다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 인간 관계 그래프 구축                                                                  ║
║  ✅ PageRank 기반 영향력 계산                                                              ║
║  ✅ 여왕벌(Queen Bee) / 킹핀(Kingpin) 탐지                                                 ║
║  ✅ 클러스터(커뮤니티) 분석                                                                ║
║  ✅ 이탈 영향도 시뮬레이션                                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

S(Synergy) 재정의:
- S_blood (혈연): 가족 수 (이탈 방지력)
- S_referral (소개): 신규 유입 기여 (확장력)  
- S_group (동반): 그룹 활동 빈도 (영향력)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum
from datetime import datetime
import json
import math
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RelationType(str, Enum):
    FAMILY = "FAMILY"       # 가족 (강도 5) - 운명 공동체
    REFERRAL = "REFERRAL"   # 소개 (강도 4) - 내가 데려온 사람
    FRIEND = "FRIEND"       # 친구 (강도 2) - 동반 방문
    GROUP = "GROUP"         # 그룹 (강도 3) - 모임 멤버
    COUPLE = "COUPLE"       # 커플 (강도 4) - 연인


# 관계별 가중치
RELATION_WEIGHTS: Dict[RelationType, float] = {
    RelationType.FAMILY: 5.0,
    RelationType.REFERRAL: 4.0,
    RelationType.COUPLE: 4.0,
    RelationType.GROUP: 3.0,
    RelationType.FRIEND: 2.0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Person:
    """사람 노드"""
    user_id: str
    name: str
    phone: str = ""
    m_score: float = 0.0  # 매출 점수
    t_score: float = 0.0  # 리스크 점수
    s_score: float = 0.0  # 시너지 점수 (계산됨)
    pagerank: float = 0.0  # PageRank 점수
    station_id: str = ""
    total_spent: int = 0
    visit_count: int = 0
    is_vip: bool = False
    is_risk: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "m_score": self.m_score,
            "t_score": self.t_score,
            "s_score": self.s_score,
            "pagerank": self.pagerank,
            "total_spent": self.total_spent,
            "visit_count": self.visit_count,
            "is_vip": self.is_vip,
            "is_risk": self.is_risk,
        }


@dataclass
class Relationship:
    """관계 엣지"""
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0  # 1~5
    created_at: str = ""
    
    @property
    def weight(self) -> float:
        base = RELATION_WEIGHTS.get(self.rel_type, 1.0)
        return base * self.strength


@dataclass
class GroupActivity:
    """그룹 활동 기록"""
    activity_id: str
    members: List[str]  # user_ids
    station_id: str
    activity_type: str  # "dining", "class", "workout"
    timestamp: str


@dataclass
class Cluster:
    """커뮤니티/클러스터"""
    cluster_id: str
    name: str
    members: List[str]
    hub_id: str  # 중심 인물
    total_value: float  # 총 가치
    cohesion: float  # 결속력 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Human Network Engine
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HumanNetworkEngine:
    """
    인간 관계 네트워크 분석 엔진
    
    - 그래프 기반 관계 모델링
    - PageRank 영향력 계산
    - 클러스터(커뮤니티) 탐지
    - 이탈 영향 시뮬레이션
    """
    
    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.relationships: List[Relationship] = []
        self.activities: List[GroupActivity] = []
        
        # 그래프 구조
        self.adjacency: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        self.reverse_adj: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        
        # 캐시
        self._pagerank_cache: Dict[str, float] = {}
        self._cluster_cache: List[Cluster] = []
    
    # ─── 데이터 관리 ───
    
    def add_person(self, person: Person) -> None:
        """사람 추가"""
        self.persons[person.user_id] = person
        self._invalidate_cache()
    
    def add_relationship(self, rel: Relationship) -> None:
        """관계 추가"""
        self.relationships.append(rel)
        self.adjacency[rel.source_id].append((rel.target_id, rel.weight))
        self.reverse_adj[rel.target_id].append((rel.source_id, rel.weight))
        self._invalidate_cache()
    
    def add_activity(self, activity: GroupActivity) -> None:
        """그룹 활동 추가"""
        self.activities.append(activity)
        
        # 그룹 멤버 간 FRIEND 관계 자동 생성
        for i, m1 in enumerate(activity.members):
            for m2 in activity.members[i+1:]:
                # 이미 관계가 있으면 스킵
                existing = self._has_relationship(m1, m2)
                if not existing:
                    self.add_relationship(Relationship(
                        source_id=m1,
                        target_id=m2,
                        rel_type=RelationType.FRIEND,
                        strength=1.0,
                        created_at=activity.timestamp,
                    ))
    
    def _has_relationship(self, id1: str, id2: str) -> bool:
        """관계 존재 여부"""
        for target, _ in self.adjacency.get(id1, []):
            if target == id2:
                return True
        for target, _ in self.adjacency.get(id2, []):
            if target == id1:
                return True
        return False
    
    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._pagerank_cache = {}
        self._cluster_cache = []
    
    # ─── PageRank 계산 ───
    
    def calculate_pagerank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank 알고리즘으로 영향력 계산
        
        중요한 사람과 연결될수록 점수가 높아짐
        """
        if self._pagerank_cache:
            return self._pagerank_cache
        
        n = len(self.persons)
        if n == 0:
            return {}
        
        # 초기화
        pagerank: Dict[str, float] = {uid: 1.0 / n for uid in self.persons}
        
        for _ in range(iterations):
            new_pr: Dict[str, float] = {}
            
            for uid in self.persons:
                # 나를 가리키는 사람들의 PR 합산
                incoming_pr = 0.0
                
                for source_id, weight in self.reverse_adj.get(uid, []):
                    if source_id in pagerank:
                        # 나가는 링크 수로 나눔
                        outgoing = len(self.adjacency.get(source_id, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source_id] * weight) / outgoing
                
                # PageRank 공식
                new_pr[uid] = (1 - damping) / n + damping * incoming_pr
            
            pagerank = new_pr
        
        # 정규화 (0~100)
        max_pr = max(pagerank.values()) if pagerank else 1
        pagerank = {k: (v / max_pr) * 100 for k, v in pagerank.items()}
        
        self._pagerank_cache = pagerank
        
        # Person 객체에 반영
        for uid, pr in pagerank.items():
            if uid in self.persons:
                self.persons[uid].pagerank = pr
        
        return pagerank
    
    # ─── 시너지 점수 계산 ───
    
    def calculate_synergy(self, user_id: str) -> Dict[str, float]:
        """
        S(Synergy) 점수 계산
        
        S = S_blood + S_referral + S_group
        """
        if user_id not in self.persons:
            return {"s_blood": 0, "s_referral": 0, "s_group": 0, "s_total": 0}
        
        s_blood = 0.0
        s_referral = 0.0
        s_group = 0.0
        
        # 1. S_blood (가족 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.FAMILY:
                s_blood += RELATION_WEIGHTS[RelationType.FAMILY]
        
        # 2. S_referral (내가 소개한 사람 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.REFERRAL:
                s_referral += RELATION_WEIGHTS[RelationType.REFERRAL]
        
        # 3. S_group (3인 이상 동반 활동 횟수)
        group_count = 0
        for activity in self.activities:
            if user_id in activity.members and len(activity.members) >= 3:
                group_count += 1
        s_group = group_count * 20  # 동반 1회당 20점
        
        s_total = min(100, s_blood + s_referral + s_group)
        
        # Person 객체에 반영
        self.persons[user_id].s_score = s_total
        
        return {
            "s_blood": s_blood,
            "s_referral": s_referral,
            "s_group": s_group,
            "s_total": s_total,
        }
    
    def _find_relationship(self, source: str, target: str) -> Optional[Relationship]:
        """관계 찾기"""
        for rel in self.relationships:
            if rel.source_id == source and rel.target_id == target:
                return rel
            if rel.source_id == target and rel.target_id == source:
                return rel
        return None
    
    # ─── 여왕벌/킹핀 탐지 ───
    
    def find_queen_bees(self, top_n: int = 10) -> List[Tuple[Person, float]]:
        """
        가장 영향력 있는 사람(여왕벌/킹핀) 찾기
        
        Returns:
            [(Person, influence_score), ...]
        """
        pagerank = self.calculate_pagerank()
        
        # 연결 수 + PageRank 복합 점수
        scores: List[Tuple[Person, float]] = []
        for uid, person in self.persons.items():
            connections = len(self.adjacency.get(uid, [])) + len(self.reverse_adj.get(uid, []))
            pr = pagerank.get(uid, 0)
            
            # 복합 점수: PageRank 60% + 연결 수 40%
            influence = pr * 0.6 + (connections / max(len(self.persons), 1) * 100) * 0.4
            scores.append((person, influence))
        
        # 정렬
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_n]
    
    def get_hub_connections(self, user_id: str) -> Dict[str, Any]:
        """허브의 연결 정보"""
        if user_id not in self.persons:
            return {}
        
        connections: List[Dict[str, Any]] = []
        
        # 나가는 연결
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            target_person = self.persons.get(target)
            connections.append({
                "user_id": target,
                "name": target_person.name if target_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "outgoing",
            })
        
        # 들어오는 연결
        for source, weight in self.reverse_adj.get(user_id, []):
            if source == user_id:
                continue
            rel = self._find_relationship(source, user_id)
            source_person = self.persons.get(source)
            connections.append({
                "user_id": source,
                "name": source_person.name if source_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "incoming",
            })
        
        return {
            "user_id": user_id,
            "name": self.persons[user_id].name,
            "connection_count": len(connections),
            "connections": connections,
        }
    
    # ─── 클러스터 분석 ───
    
    def detect_clusters(self, min_size: int = 3) -> List[Cluster]:
        """
        커뮤니티/클러스터 탐지 (Connected Components)
        """
        if self._cluster_cache:
            return self._cluster_cache
        
        visited: Set[str] = set()
        clusters: List[Cluster] = []
        cluster_id = 0
        
        def bfs(start: str) -> Set[str]:
            """BFS로 연결된 컴포넌트 찾기"""
            component: Set[str] = set()
            queue = [start]
            
            while queue:
                node = queue.pop(0)
                if node in component:
                    continue
                component.add(node)
                
                # 양방향 탐색
                for neighbor, _ in self.adjacency.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
                for neighbor, _ in self.reverse_adj.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
            
            return component
        
        for uid in self.persons:
            if uid not in visited:
                component = bfs(uid)
                visited.update(component)
                
                if len(component) >= min_size:
                    # 클러스터 내 허브 찾기
                    members = list(component)
                    pagerank = self.calculate_pagerank()
                    
                    hub_id = max(members, key=lambda x: pagerank.get(x, 0))
                    
                    # 총 가치 계산
                    total_value = sum(
                        self.persons[m].total_spent 
                        for m in members if m in self.persons
                    )
                    
                    # 결속력 (내부 연결 / 가능한 최대 연결)
                    internal_edges = 0
                    for m in members:
                        for target, _ in self.adjacency.get(m, []):
                            if target in component:
                                internal_edges += 1
                    
                    max_edges = len(members) * (len(members) - 1)
                    cohesion = internal_edges / max_edges if max_edges > 0 else 0
                    
                    clusters.append(Cluster(
                        cluster_id=f"C{cluster_id}",
                        name=f"그룹 {cluster_id + 1}",
                        members=members,
                        hub_id=hub_id,
                        total_value=total_value,
                        cohesion=cohesion,
                    ))
                    
                    cluster_id += 1
        
        self._cluster_cache = clusters
        return clusters
    
    # ─── 이탈 영향 시뮬레이션 ───
    
    def simulate_churn_impact(self, user_id: str) -> Dict[str, Any]:
        """
        특정 사람이 이탈했을 때의 영향 시뮬레이션
        
        "이 사람이 떠나면 몇 명이 같이 나갈까?"
        """
        if user_id not in self.persons:
            return {"error": "User not found"}
        
        person = self.persons[user_id]
        
        # 직접 연결된 사람들
        direct_connections: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        
        for target, weight in self.adjacency.get(user_id, []):
            if target in self.persons and target not in seen_ids:
                seen_ids.add(target)
                direct_connections.append({
                    "user_id": target,
                    "name": self.persons[target].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.8),
                })
        
        for source, weight in self.reverse_adj.get(user_id, []):
            if source in self.persons and source != user_id and source not in seen_ids:
                seen_ids.add(source)
                direct_connections.append({
                    "user_id": source,
                    "name": self.persons[source].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.5),
                })
        
        # 예상 이탈자 수
        expected_churns = sum(c["churn_probability"] for c in direct_connections)
        
        # 예상 매출 손실
        revenue_loss = person.total_spent
        for conn in direct_connections:
            if conn["user_id"] in self.persons:
                revenue_loss += self.persons[conn["user_id"]].total_spent * conn["churn_probability"]
        
        return {
            "target_user": {
                "user_id": user_id,
                "name": person.name,
                "total_spent": person.total_spent,
                "pagerank": person.pagerank,
            },
            "direct_connections": len(direct_connections),
            "expected_churns": round(expected_churns, 1),
            "at_risk_users": direct_connections,
            "expected_revenue_loss": int(revenue_loss),
            "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
        }
    
    # ─── 통계 및 내보내기 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """네트워크 통계"""
        pagerank = self.calculate_pagerank()
        
        return {
            "total_persons": len(self.persons),
            "total_relationships": len(self.relationships),
            "total_activities": len(self.activities),
            "avg_connections": sum(len(v) for v in self.adjacency.values()) / max(len(self.persons), 1),
            "clusters": len(self.detect_clusters()),
            "top_influencer": max(pagerank.items(), key=lambda x: x[1])[0] if pagerank else None,
        }
    
    def export_graph_data(self) -> Dict[str, Any]:
        """시각화용 그래프 데이터 내보내기"""
        nodes: List[Dict[str, Any]] = []
        for uid, person in self.persons.items():
            nodes.append({
                "id": uid,
                "name": person.name,
                "m": person.m_score,
                "t": person.t_score,
                "s": person.s_score,
                "pagerank": person.pagerank,
                "total_spent": person.total_spent,
                "is_vip": person.is_vip,
                "is_risk": person.is_risk,
            })
        
        edges: List[Dict[str, Any]] = []
        for rel in self.relationships:
            edges.append({
                "source": rel.source_id,
                "target": rel.target_id,
                "type": rel.rel_type.value,
                "weight": rel.weight,
            })
        
        return {"nodes": nodes, "edges": edges}
    
    # ─── 저장/로드 ───
    
    def save(self, filepath: str) -> None:
        """저장"""
        data = {
            "persons": {uid: p.to_dict() for uid, p in self.persons.items()},
            "relationships": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "rel_type": r.rel_type.value,
                    "strength": r.strength,
                    "created_at": r.created_at,
                }
                for r in self.relationships
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str) -> None:
        """로드"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for uid, pdata in data.get("persons", {}).items():
            self.add_person(Person(
                user_id=uid,
                name=pdata.get("name", ""),
                m_score=pdata.get("m_score", 0),
                t_score=pdata.get("t_score", 0),
                total_spent=pdata.get("total_spent", 0),
            ))
        
        for rdata in data.get("relationships", []):
            self.add_relationship(Relationship(
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                rel_type=RelationType(rdata["rel_type"]),
                strength=rdata.get("strength", 1.0),
                created_at=rdata.get("created_at", ""),
            ))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 및 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_test_network() -> HumanNetworkEngine:
    """테스트용 네트워크 생성"""
    engine = HumanNetworkEngine()
    
    # 사람 추가
    people = [
        Person("kim", "김철수", "010-1111-1111", m_score=80, total_spent=5000000, is_vip=True),
        Person("lee", "이영희", "010-2222-2222", m_score=70, total_spent=3000000),
        Person("park", "박민수", "010-3333-3333", m_score=60, total_spent=2000000),
        Person("choi", "최지훈", "010-4444-4444", m_score=50, total_spent=1500000),
        Person("jung", "정수진", "010-5555-5555", m_score=40, total_spent=1000000),
        Person("kang", "강미영", "010-6666-6666", m_score=30, total_spent=800000),
        Person("cho", "조현우", "010-7777-7777", m_score=90, t_score=70, total_spent=8000000, is_risk=True),
    ]
    
    for p in people:
        engine.add_person(p)
    
    # 관계 추가
    relations = [
        Relationship("kim", "lee", RelationType.FAMILY, 5.0),
        Relationship("kim", "park", RelationType.REFERRAL, 4.0),
        Relationship("kim", "choi", RelationType.REFERRAL, 4.0),
        Relationship("park", "jung", RelationType.FRIEND, 2.0),
        Relationship("lee", "kang", RelationType.FAMILY, 5.0),
        Relationship("cho", "jung", RelationType.FRIEND, 2.0),
    ]
    
    for r in relations:
        engine.add_relationship(r)
    
    # 그룹 활동
    engine.add_activity(GroupActivity(
        activity_id="A1",
        members=["kim", "lee", "park", "choi"],
        station_id="RESTAURANT_01",
        activity_type="dining",
        timestamp=datetime.now().isoformat(),
    ))
    
    return engine


def run_demo() -> None:
    """데모 실행"""
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # 테스트 네트워크 생성
    engine = create_test_network()
    
    # PageRank 계산
    print("\n📊 PageRank 영향력 순위:")
    print("-" * 50)
    pagerank = engine.calculate_pagerank()
    for uid, pr in sorted(pagerank.items(), key=lambda x: x[1], reverse=True):
        person = engine.persons[uid]
        print(f"  {person.name}: {pr:.2f}점")
    
    # 여왕벌 탐지
    print("\n👑 TOP 3 여왕벌 (Queen Bee):")
    print("-" * 50)
    queens = engine.find_queen_bees(3)
    for i, (person, score) in enumerate(queens, 1):
        print(f"  {i}위: {person.name} (영향력: {score:.2f})")
        if i == 1:
            connections = len(engine.adjacency.get(person.user_id, []))
            print(f"      → 전략: 이 사람에게 '단체 회식권'을 주면 하위 {connections}명이 딸려옵니다.")
    
    # 시너지 계산
    print("\n❤️ 시너지(S) 점수:")
    print("-" * 50)
    for uid in ["kim", "cho"]:
        synergy = engine.calculate_synergy(uid)
        print(f"  {engine.persons[uid].name}: {synergy['s_total']:.0f}점")
        print(f"    - 혈연(S_blood): {synergy['s_blood']:.0f}")
        print(f"    - 소개(S_referral): {synergy['s_referral']:.0f}")
        print(f"    - 동반(S_group): {synergy['s_group']:.0f}")
    
    # 이탈 시뮬레이션
    print("\n🚨 이탈 영향 시뮬레이션 (김철수가 떠나면?):")
    print("-" * 50)
    impact = engine.simulate_churn_impact("kim")
    print(f"  직접 연결: {impact['direct_connections']}명")
    print(f"  예상 이탈: {impact['expected_churns']}명")
    print(f"  예상 매출 손실: ₩{impact['expected_revenue_loss']:,}")
    print(f"  리스크 수준: {impact['risk_level']}")
    
    # 통계
    print("\n📈 네트워크 통계:")
    print("-" * 50)
    stats = engine.get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    run_demo()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                                     ║
║                                                                                           ║
║  "시너지(S)는 시스템이 아니라, 사람과 사람 사이의 인력이다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 인간 관계 그래프 구축                                                                  ║
║  ✅ PageRank 기반 영향력 계산                                                              ║
║  ✅ 여왕벌(Queen Bee) / 킹핀(Kingpin) 탐지                                                 ║
║  ✅ 클러스터(커뮤니티) 분석                                                                ║
║  ✅ 이탈 영향도 시뮬레이션                                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

S(Synergy) 재정의:
- S_blood (혈연): 가족 수 (이탈 방지력)
- S_referral (소개): 신규 유입 기여 (확장력)  
- S_group (동반): 그룹 활동 빈도 (영향력)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum
from datetime import datetime
import json
import math
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RelationType(str, Enum):
    FAMILY = "FAMILY"       # 가족 (강도 5) - 운명 공동체
    REFERRAL = "REFERRAL"   # 소개 (강도 4) - 내가 데려온 사람
    FRIEND = "FRIEND"       # 친구 (강도 2) - 동반 방문
    GROUP = "GROUP"         # 그룹 (강도 3) - 모임 멤버
    COUPLE = "COUPLE"       # 커플 (강도 4) - 연인


# 관계별 가중치
RELATION_WEIGHTS: Dict[RelationType, float] = {
    RelationType.FAMILY: 5.0,
    RelationType.REFERRAL: 4.0,
    RelationType.COUPLE: 4.0,
    RelationType.GROUP: 3.0,
    RelationType.FRIEND: 2.0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Person:
    """사람 노드"""
    user_id: str
    name: str
    phone: str = ""
    m_score: float = 0.0  # 매출 점수
    t_score: float = 0.0  # 리스크 점수
    s_score: float = 0.0  # 시너지 점수 (계산됨)
    pagerank: float = 0.0  # PageRank 점수
    station_id: str = ""
    total_spent: int = 0
    visit_count: int = 0
    is_vip: bool = False
    is_risk: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "m_score": self.m_score,
            "t_score": self.t_score,
            "s_score": self.s_score,
            "pagerank": self.pagerank,
            "total_spent": self.total_spent,
            "visit_count": self.visit_count,
            "is_vip": self.is_vip,
            "is_risk": self.is_risk,
        }


@dataclass
class Relationship:
    """관계 엣지"""
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0  # 1~5
    created_at: str = ""
    
    @property
    def weight(self) -> float:
        base = RELATION_WEIGHTS.get(self.rel_type, 1.0)
        return base * self.strength


@dataclass
class GroupActivity:
    """그룹 활동 기록"""
    activity_id: str
    members: List[str]  # user_ids
    station_id: str
    activity_type: str  # "dining", "class", "workout"
    timestamp: str


@dataclass
class Cluster:
    """커뮤니티/클러스터"""
    cluster_id: str
    name: str
    members: List[str]
    hub_id: str  # 중심 인물
    total_value: float  # 총 가치
    cohesion: float  # 결속력 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Human Network Engine
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HumanNetworkEngine:
    """
    인간 관계 네트워크 분석 엔진
    
    - 그래프 기반 관계 모델링
    - PageRank 영향력 계산
    - 클러스터(커뮤니티) 탐지
    - 이탈 영향 시뮬레이션
    """
    
    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.relationships: List[Relationship] = []
        self.activities: List[GroupActivity] = []
        
        # 그래프 구조
        self.adjacency: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        self.reverse_adj: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        
        # 캐시
        self._pagerank_cache: Dict[str, float] = {}
        self._cluster_cache: List[Cluster] = []
    
    # ─── 데이터 관리 ───
    
    def add_person(self, person: Person) -> None:
        """사람 추가"""
        self.persons[person.user_id] = person
        self._invalidate_cache()
    
    def add_relationship(self, rel: Relationship) -> None:
        """관계 추가"""
        self.relationships.append(rel)
        self.adjacency[rel.source_id].append((rel.target_id, rel.weight))
        self.reverse_adj[rel.target_id].append((rel.source_id, rel.weight))
        self._invalidate_cache()
    
    def add_activity(self, activity: GroupActivity) -> None:
        """그룹 활동 추가"""
        self.activities.append(activity)
        
        # 그룹 멤버 간 FRIEND 관계 자동 생성
        for i, m1 in enumerate(activity.members):
            for m2 in activity.members[i+1:]:
                # 이미 관계가 있으면 스킵
                existing = self._has_relationship(m1, m2)
                if not existing:
                    self.add_relationship(Relationship(
                        source_id=m1,
                        target_id=m2,
                        rel_type=RelationType.FRIEND,
                        strength=1.0,
                        created_at=activity.timestamp,
                    ))
    
    def _has_relationship(self, id1: str, id2: str) -> bool:
        """관계 존재 여부"""
        for target, _ in self.adjacency.get(id1, []):
            if target == id2:
                return True
        for target, _ in self.adjacency.get(id2, []):
            if target == id1:
                return True
        return False
    
    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._pagerank_cache = {}
        self._cluster_cache = []
    
    # ─── PageRank 계산 ───
    
    def calculate_pagerank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank 알고리즘으로 영향력 계산
        
        중요한 사람과 연결될수록 점수가 높아짐
        """
        if self._pagerank_cache:
            return self._pagerank_cache
        
        n = len(self.persons)
        if n == 0:
            return {}
        
        # 초기화
        pagerank: Dict[str, float] = {uid: 1.0 / n for uid in self.persons}
        
        for _ in range(iterations):
            new_pr: Dict[str, float] = {}
            
            for uid in self.persons:
                # 나를 가리키는 사람들의 PR 합산
                incoming_pr = 0.0
                
                for source_id, weight in self.reverse_adj.get(uid, []):
                    if source_id in pagerank:
                        # 나가는 링크 수로 나눔
                        outgoing = len(self.adjacency.get(source_id, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source_id] * weight) / outgoing
                
                # PageRank 공식
                new_pr[uid] = (1 - damping) / n + damping * incoming_pr
            
            pagerank = new_pr
        
        # 정규화 (0~100)
        max_pr = max(pagerank.values()) if pagerank else 1
        pagerank = {k: (v / max_pr) * 100 for k, v in pagerank.items()}
        
        self._pagerank_cache = pagerank
        
        # Person 객체에 반영
        for uid, pr in pagerank.items():
            if uid in self.persons:
                self.persons[uid].pagerank = pr
        
        return pagerank
    
    # ─── 시너지 점수 계산 ───
    
    def calculate_synergy(self, user_id: str) -> Dict[str, float]:
        """
        S(Synergy) 점수 계산
        
        S = S_blood + S_referral + S_group
        """
        if user_id not in self.persons:
            return {"s_blood": 0, "s_referral": 0, "s_group": 0, "s_total": 0}
        
        s_blood = 0.0
        s_referral = 0.0
        s_group = 0.0
        
        # 1. S_blood (가족 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.FAMILY:
                s_blood += RELATION_WEIGHTS[RelationType.FAMILY]
        
        # 2. S_referral (내가 소개한 사람 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.REFERRAL:
                s_referral += RELATION_WEIGHTS[RelationType.REFERRAL]
        
        # 3. S_group (3인 이상 동반 활동 횟수)
        group_count = 0
        for activity in self.activities:
            if user_id in activity.members and len(activity.members) >= 3:
                group_count += 1
        s_group = group_count * 20  # 동반 1회당 20점
        
        s_total = min(100, s_blood + s_referral + s_group)
        
        # Person 객체에 반영
        self.persons[user_id].s_score = s_total
        
        return {
            "s_blood": s_blood,
            "s_referral": s_referral,
            "s_group": s_group,
            "s_total": s_total,
        }
    
    def _find_relationship(self, source: str, target: str) -> Optional[Relationship]:
        """관계 찾기"""
        for rel in self.relationships:
            if rel.source_id == source and rel.target_id == target:
                return rel
            if rel.source_id == target and rel.target_id == source:
                return rel
        return None
    
    # ─── 여왕벌/킹핀 탐지 ───
    
    def find_queen_bees(self, top_n: int = 10) -> List[Tuple[Person, float]]:
        """
        가장 영향력 있는 사람(여왕벌/킹핀) 찾기
        
        Returns:
            [(Person, influence_score), ...]
        """
        pagerank = self.calculate_pagerank()
        
        # 연결 수 + PageRank 복합 점수
        scores: List[Tuple[Person, float]] = []
        for uid, person in self.persons.items():
            connections = len(self.adjacency.get(uid, [])) + len(self.reverse_adj.get(uid, []))
            pr = pagerank.get(uid, 0)
            
            # 복합 점수: PageRank 60% + 연결 수 40%
            influence = pr * 0.6 + (connections / max(len(self.persons), 1) * 100) * 0.4
            scores.append((person, influence))
        
        # 정렬
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_n]
    
    def get_hub_connections(self, user_id: str) -> Dict[str, Any]:
        """허브의 연결 정보"""
        if user_id not in self.persons:
            return {}
        
        connections: List[Dict[str, Any]] = []
        
        # 나가는 연결
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            target_person = self.persons.get(target)
            connections.append({
                "user_id": target,
                "name": target_person.name if target_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "outgoing",
            })
        
        # 들어오는 연결
        for source, weight in self.reverse_adj.get(user_id, []):
            if source == user_id:
                continue
            rel = self._find_relationship(source, user_id)
            source_person = self.persons.get(source)
            connections.append({
                "user_id": source,
                "name": source_person.name if source_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "incoming",
            })
        
        return {
            "user_id": user_id,
            "name": self.persons[user_id].name,
            "connection_count": len(connections),
            "connections": connections,
        }
    
    # ─── 클러스터 분석 ───
    
    def detect_clusters(self, min_size: int = 3) -> List[Cluster]:
        """
        커뮤니티/클러스터 탐지 (Connected Components)
        """
        if self._cluster_cache:
            return self._cluster_cache
        
        visited: Set[str] = set()
        clusters: List[Cluster] = []
        cluster_id = 0
        
        def bfs(start: str) -> Set[str]:
            """BFS로 연결된 컴포넌트 찾기"""
            component: Set[str] = set()
            queue = [start]
            
            while queue:
                node = queue.pop(0)
                if node in component:
                    continue
                component.add(node)
                
                # 양방향 탐색
                for neighbor, _ in self.adjacency.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
                for neighbor, _ in self.reverse_adj.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
            
            return component
        
        for uid in self.persons:
            if uid not in visited:
                component = bfs(uid)
                visited.update(component)
                
                if len(component) >= min_size:
                    # 클러스터 내 허브 찾기
                    members = list(component)
                    pagerank = self.calculate_pagerank()
                    
                    hub_id = max(members, key=lambda x: pagerank.get(x, 0))
                    
                    # 총 가치 계산
                    total_value = sum(
                        self.persons[m].total_spent 
                        for m in members if m in self.persons
                    )
                    
                    # 결속력 (내부 연결 / 가능한 최대 연결)
                    internal_edges = 0
                    for m in members:
                        for target, _ in self.adjacency.get(m, []):
                            if target in component:
                                internal_edges += 1
                    
                    max_edges = len(members) * (len(members) - 1)
                    cohesion = internal_edges / max_edges if max_edges > 0 else 0
                    
                    clusters.append(Cluster(
                        cluster_id=f"C{cluster_id}",
                        name=f"그룹 {cluster_id + 1}",
                        members=members,
                        hub_id=hub_id,
                        total_value=total_value,
                        cohesion=cohesion,
                    ))
                    
                    cluster_id += 1
        
        self._cluster_cache = clusters
        return clusters
    
    # ─── 이탈 영향 시뮬레이션 ───
    
    def simulate_churn_impact(self, user_id: str) -> Dict[str, Any]:
        """
        특정 사람이 이탈했을 때의 영향 시뮬레이션
        
        "이 사람이 떠나면 몇 명이 같이 나갈까?"
        """
        if user_id not in self.persons:
            return {"error": "User not found"}
        
        person = self.persons[user_id]
        
        # 직접 연결된 사람들
        direct_connections: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        
        for target, weight in self.adjacency.get(user_id, []):
            if target in self.persons and target not in seen_ids:
                seen_ids.add(target)
                direct_connections.append({
                    "user_id": target,
                    "name": self.persons[target].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.8),
                })
        
        for source, weight in self.reverse_adj.get(user_id, []):
            if source in self.persons and source != user_id and source not in seen_ids:
                seen_ids.add(source)
                direct_connections.append({
                    "user_id": source,
                    "name": self.persons[source].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.5),
                })
        
        # 예상 이탈자 수
        expected_churns = sum(c["churn_probability"] for c in direct_connections)
        
        # 예상 매출 손실
        revenue_loss = person.total_spent
        for conn in direct_connections:
            if conn["user_id"] in self.persons:
                revenue_loss += self.persons[conn["user_id"]].total_spent * conn["churn_probability"]
        
        return {
            "target_user": {
                "user_id": user_id,
                "name": person.name,
                "total_spent": person.total_spent,
                "pagerank": person.pagerank,
            },
            "direct_connections": len(direct_connections),
            "expected_churns": round(expected_churns, 1),
            "at_risk_users": direct_connections,
            "expected_revenue_loss": int(revenue_loss),
            "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
        }
    
    # ─── 통계 및 내보내기 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """네트워크 통계"""
        pagerank = self.calculate_pagerank()
        
        return {
            "total_persons": len(self.persons),
            "total_relationships": len(self.relationships),
            "total_activities": len(self.activities),
            "avg_connections": sum(len(v) for v in self.adjacency.values()) / max(len(self.persons), 1),
            "clusters": len(self.detect_clusters()),
            "top_influencer": max(pagerank.items(), key=lambda x: x[1])[0] if pagerank else None,
        }
    
    def export_graph_data(self) -> Dict[str, Any]:
        """시각화용 그래프 데이터 내보내기"""
        nodes: List[Dict[str, Any]] = []
        for uid, person in self.persons.items():
            nodes.append({
                "id": uid,
                "name": person.name,
                "m": person.m_score,
                "t": person.t_score,
                "s": person.s_score,
                "pagerank": person.pagerank,
                "total_spent": person.total_spent,
                "is_vip": person.is_vip,
                "is_risk": person.is_risk,
            })
        
        edges: List[Dict[str, Any]] = []
        for rel in self.relationships:
            edges.append({
                "source": rel.source_id,
                "target": rel.target_id,
                "type": rel.rel_type.value,
                "weight": rel.weight,
            })
        
        return {"nodes": nodes, "edges": edges}
    
    # ─── 저장/로드 ───
    
    def save(self, filepath: str) -> None:
        """저장"""
        data = {
            "persons": {uid: p.to_dict() for uid, p in self.persons.items()},
            "relationships": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "rel_type": r.rel_type.value,
                    "strength": r.strength,
                    "created_at": r.created_at,
                }
                for r in self.relationships
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str) -> None:
        """로드"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for uid, pdata in data.get("persons", {}).items():
            self.add_person(Person(
                user_id=uid,
                name=pdata.get("name", ""),
                m_score=pdata.get("m_score", 0),
                t_score=pdata.get("t_score", 0),
                total_spent=pdata.get("total_spent", 0),
            ))
        
        for rdata in data.get("relationships", []):
            self.add_relationship(Relationship(
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                rel_type=RelationType(rdata["rel_type"]),
                strength=rdata.get("strength", 1.0),
                created_at=rdata.get("created_at", ""),
            ))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 및 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_test_network() -> HumanNetworkEngine:
    """테스트용 네트워크 생성"""
    engine = HumanNetworkEngine()
    
    # 사람 추가
    people = [
        Person("kim", "김철수", "010-1111-1111", m_score=80, total_spent=5000000, is_vip=True),
        Person("lee", "이영희", "010-2222-2222", m_score=70, total_spent=3000000),
        Person("park", "박민수", "010-3333-3333", m_score=60, total_spent=2000000),
        Person("choi", "최지훈", "010-4444-4444", m_score=50, total_spent=1500000),
        Person("jung", "정수진", "010-5555-5555", m_score=40, total_spent=1000000),
        Person("kang", "강미영", "010-6666-6666", m_score=30, total_spent=800000),
        Person("cho", "조현우", "010-7777-7777", m_score=90, t_score=70, total_spent=8000000, is_risk=True),
    ]
    
    for p in people:
        engine.add_person(p)
    
    # 관계 추가
    relations = [
        Relationship("kim", "lee", RelationType.FAMILY, 5.0),
        Relationship("kim", "park", RelationType.REFERRAL, 4.0),
        Relationship("kim", "choi", RelationType.REFERRAL, 4.0),
        Relationship("park", "jung", RelationType.FRIEND, 2.0),
        Relationship("lee", "kang", RelationType.FAMILY, 5.0),
        Relationship("cho", "jung", RelationType.FRIEND, 2.0),
    ]
    
    for r in relations:
        engine.add_relationship(r)
    
    # 그룹 활동
    engine.add_activity(GroupActivity(
        activity_id="A1",
        members=["kim", "lee", "park", "choi"],
        station_id="RESTAURANT_01",
        activity_type="dining",
        timestamp=datetime.now().isoformat(),
    ))
    
    return engine


def run_demo() -> None:
    """데모 실행"""
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # 테스트 네트워크 생성
    engine = create_test_network()
    
    # PageRank 계산
    print("\n📊 PageRank 영향력 순위:")
    print("-" * 50)
    pagerank = engine.calculate_pagerank()
    for uid, pr in sorted(pagerank.items(), key=lambda x: x[1], reverse=True):
        person = engine.persons[uid]
        print(f"  {person.name}: {pr:.2f}점")
    
    # 여왕벌 탐지
    print("\n👑 TOP 3 여왕벌 (Queen Bee):")
    print("-" * 50)
    queens = engine.find_queen_bees(3)
    for i, (person, score) in enumerate(queens, 1):
        print(f"  {i}위: {person.name} (영향력: {score:.2f})")
        if i == 1:
            connections = len(engine.adjacency.get(person.user_id, []))
            print(f"      → 전략: 이 사람에게 '단체 회식권'을 주면 하위 {connections}명이 딸려옵니다.")
    
    # 시너지 계산
    print("\n❤️ 시너지(S) 점수:")
    print("-" * 50)
    for uid in ["kim", "cho"]:
        synergy = engine.calculate_synergy(uid)
        print(f"  {engine.persons[uid].name}: {synergy['s_total']:.0f}점")
        print(f"    - 혈연(S_blood): {synergy['s_blood']:.0f}")
        print(f"    - 소개(S_referral): {synergy['s_referral']:.0f}")
        print(f"    - 동반(S_group): {synergy['s_group']:.0f}")
    
    # 이탈 시뮬레이션
    print("\n🚨 이탈 영향 시뮬레이션 (김철수가 떠나면?):")
    print("-" * 50)
    impact = engine.simulate_churn_impact("kim")
    print(f"  직접 연결: {impact['direct_connections']}명")
    print(f"  예상 이탈: {impact['expected_churns']}명")
    print(f"  예상 매출 손실: ₩{impact['expected_revenue_loss']:,}")
    print(f"  리스크 수준: {impact['risk_level']}")
    
    # 통계
    print("\n📈 네트워크 통계:")
    print("-" * 50)
    stats = engine.get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    run_demo()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                                     ║
║                                                                                           ║
║  "시너지(S)는 시스템이 아니라, 사람과 사람 사이의 인력이다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 인간 관계 그래프 구축                                                                  ║
║  ✅ PageRank 기반 영향력 계산                                                              ║
║  ✅ 여왕벌(Queen Bee) / 킹핀(Kingpin) 탐지                                                 ║
║  ✅ 클러스터(커뮤니티) 분석                                                                ║
║  ✅ 이탈 영향도 시뮬레이션                                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

S(Synergy) 재정의:
- S_blood (혈연): 가족 수 (이탈 방지력)
- S_referral (소개): 신규 유입 기여 (확장력)  
- S_group (동반): 그룹 활동 빈도 (영향력)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum
from datetime import datetime
import json
import math
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RelationType(str, Enum):
    FAMILY = "FAMILY"       # 가족 (강도 5) - 운명 공동체
    REFERRAL = "REFERRAL"   # 소개 (강도 4) - 내가 데려온 사람
    FRIEND = "FRIEND"       # 친구 (강도 2) - 동반 방문
    GROUP = "GROUP"         # 그룹 (강도 3) - 모임 멤버
    COUPLE = "COUPLE"       # 커플 (강도 4) - 연인


# 관계별 가중치
RELATION_WEIGHTS: Dict[RelationType, float] = {
    RelationType.FAMILY: 5.0,
    RelationType.REFERRAL: 4.0,
    RelationType.COUPLE: 4.0,
    RelationType.GROUP: 3.0,
    RelationType.FRIEND: 2.0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Person:
    """사람 노드"""
    user_id: str
    name: str
    phone: str = ""
    m_score: float = 0.0  # 매출 점수
    t_score: float = 0.0  # 리스크 점수
    s_score: float = 0.0  # 시너지 점수 (계산됨)
    pagerank: float = 0.0  # PageRank 점수
    station_id: str = ""
    total_spent: int = 0
    visit_count: int = 0
    is_vip: bool = False
    is_risk: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "m_score": self.m_score,
            "t_score": self.t_score,
            "s_score": self.s_score,
            "pagerank": self.pagerank,
            "total_spent": self.total_spent,
            "visit_count": self.visit_count,
            "is_vip": self.is_vip,
            "is_risk": self.is_risk,
        }


@dataclass
class Relationship:
    """관계 엣지"""
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0  # 1~5
    created_at: str = ""
    
    @property
    def weight(self) -> float:
        base = RELATION_WEIGHTS.get(self.rel_type, 1.0)
        return base * self.strength


@dataclass
class GroupActivity:
    """그룹 활동 기록"""
    activity_id: str
    members: List[str]  # user_ids
    station_id: str
    activity_type: str  # "dining", "class", "workout"
    timestamp: str


@dataclass
class Cluster:
    """커뮤니티/클러스터"""
    cluster_id: str
    name: str
    members: List[str]
    hub_id: str  # 중심 인물
    total_value: float  # 총 가치
    cohesion: float  # 결속력 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Human Network Engine
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HumanNetworkEngine:
    """
    인간 관계 네트워크 분석 엔진
    
    - 그래프 기반 관계 모델링
    - PageRank 영향력 계산
    - 클러스터(커뮤니티) 탐지
    - 이탈 영향 시뮬레이션
    """
    
    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.relationships: List[Relationship] = []
        self.activities: List[GroupActivity] = []
        
        # 그래프 구조
        self.adjacency: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        self.reverse_adj: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        
        # 캐시
        self._pagerank_cache: Dict[str, float] = {}
        self._cluster_cache: List[Cluster] = []
    
    # ─── 데이터 관리 ───
    
    def add_person(self, person: Person) -> None:
        """사람 추가"""
        self.persons[person.user_id] = person
        self._invalidate_cache()
    
    def add_relationship(self, rel: Relationship) -> None:
        """관계 추가"""
        self.relationships.append(rel)
        self.adjacency[rel.source_id].append((rel.target_id, rel.weight))
        self.reverse_adj[rel.target_id].append((rel.source_id, rel.weight))
        self._invalidate_cache()
    
    def add_activity(self, activity: GroupActivity) -> None:
        """그룹 활동 추가"""
        self.activities.append(activity)
        
        # 그룹 멤버 간 FRIEND 관계 자동 생성
        for i, m1 in enumerate(activity.members):
            for m2 in activity.members[i+1:]:
                # 이미 관계가 있으면 스킵
                existing = self._has_relationship(m1, m2)
                if not existing:
                    self.add_relationship(Relationship(
                        source_id=m1,
                        target_id=m2,
                        rel_type=RelationType.FRIEND,
                        strength=1.0,
                        created_at=activity.timestamp,
                    ))
    
    def _has_relationship(self, id1: str, id2: str) -> bool:
        """관계 존재 여부"""
        for target, _ in self.adjacency.get(id1, []):
            if target == id2:
                return True
        for target, _ in self.adjacency.get(id2, []):
            if target == id1:
                return True
        return False
    
    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._pagerank_cache = {}
        self._cluster_cache = []
    
    # ─── PageRank 계산 ───
    
    def calculate_pagerank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank 알고리즘으로 영향력 계산
        
        중요한 사람과 연결될수록 점수가 높아짐
        """
        if self._pagerank_cache:
            return self._pagerank_cache
        
        n = len(self.persons)
        if n == 0:
            return {}
        
        # 초기화
        pagerank: Dict[str, float] = {uid: 1.0 / n for uid in self.persons}
        
        for _ in range(iterations):
            new_pr: Dict[str, float] = {}
            
            for uid in self.persons:
                # 나를 가리키는 사람들의 PR 합산
                incoming_pr = 0.0
                
                for source_id, weight in self.reverse_adj.get(uid, []):
                    if source_id in pagerank:
                        # 나가는 링크 수로 나눔
                        outgoing = len(self.adjacency.get(source_id, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source_id] * weight) / outgoing
                
                # PageRank 공식
                new_pr[uid] = (1 - damping) / n + damping * incoming_pr
            
            pagerank = new_pr
        
        # 정규화 (0~100)
        max_pr = max(pagerank.values()) if pagerank else 1
        pagerank = {k: (v / max_pr) * 100 for k, v in pagerank.items()}
        
        self._pagerank_cache = pagerank
        
        # Person 객체에 반영
        for uid, pr in pagerank.items():
            if uid in self.persons:
                self.persons[uid].pagerank = pr
        
        return pagerank
    
    # ─── 시너지 점수 계산 ───
    
    def calculate_synergy(self, user_id: str) -> Dict[str, float]:
        """
        S(Synergy) 점수 계산
        
        S = S_blood + S_referral + S_group
        """
        if user_id not in self.persons:
            return {"s_blood": 0, "s_referral": 0, "s_group": 0, "s_total": 0}
        
        s_blood = 0.0
        s_referral = 0.0
        s_group = 0.0
        
        # 1. S_blood (가족 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.FAMILY:
                s_blood += RELATION_WEIGHTS[RelationType.FAMILY]
        
        # 2. S_referral (내가 소개한 사람 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.REFERRAL:
                s_referral += RELATION_WEIGHTS[RelationType.REFERRAL]
        
        # 3. S_group (3인 이상 동반 활동 횟수)
        group_count = 0
        for activity in self.activities:
            if user_id in activity.members and len(activity.members) >= 3:
                group_count += 1
        s_group = group_count * 20  # 동반 1회당 20점
        
        s_total = min(100, s_blood + s_referral + s_group)
        
        # Person 객체에 반영
        self.persons[user_id].s_score = s_total
        
        return {
            "s_blood": s_blood,
            "s_referral": s_referral,
            "s_group": s_group,
            "s_total": s_total,
        }
    
    def _find_relationship(self, source: str, target: str) -> Optional[Relationship]:
        """관계 찾기"""
        for rel in self.relationships:
            if rel.source_id == source and rel.target_id == target:
                return rel
            if rel.source_id == target and rel.target_id == source:
                return rel
        return None
    
    # ─── 여왕벌/킹핀 탐지 ───
    
    def find_queen_bees(self, top_n: int = 10) -> List[Tuple[Person, float]]:
        """
        가장 영향력 있는 사람(여왕벌/킹핀) 찾기
        
        Returns:
            [(Person, influence_score), ...]
        """
        pagerank = self.calculate_pagerank()
        
        # 연결 수 + PageRank 복합 점수
        scores: List[Tuple[Person, float]] = []
        for uid, person in self.persons.items():
            connections = len(self.adjacency.get(uid, [])) + len(self.reverse_adj.get(uid, []))
            pr = pagerank.get(uid, 0)
            
            # 복합 점수: PageRank 60% + 연결 수 40%
            influence = pr * 0.6 + (connections / max(len(self.persons), 1) * 100) * 0.4
            scores.append((person, influence))
        
        # 정렬
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_n]
    
    def get_hub_connections(self, user_id: str) -> Dict[str, Any]:
        """허브의 연결 정보"""
        if user_id not in self.persons:
            return {}
        
        connections: List[Dict[str, Any]] = []
        
        # 나가는 연결
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            target_person = self.persons.get(target)
            connections.append({
                "user_id": target,
                "name": target_person.name if target_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "outgoing",
            })
        
        # 들어오는 연결
        for source, weight in self.reverse_adj.get(user_id, []):
            if source == user_id:
                continue
            rel = self._find_relationship(source, user_id)
            source_person = self.persons.get(source)
            connections.append({
                "user_id": source,
                "name": source_person.name if source_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "incoming",
            })
        
        return {
            "user_id": user_id,
            "name": self.persons[user_id].name,
            "connection_count": len(connections),
            "connections": connections,
        }
    
    # ─── 클러스터 분석 ───
    
    def detect_clusters(self, min_size: int = 3) -> List[Cluster]:
        """
        커뮤니티/클러스터 탐지 (Connected Components)
        """
        if self._cluster_cache:
            return self._cluster_cache
        
        visited: Set[str] = set()
        clusters: List[Cluster] = []
        cluster_id = 0
        
        def bfs(start: str) -> Set[str]:
            """BFS로 연결된 컴포넌트 찾기"""
            component: Set[str] = set()
            queue = [start]
            
            while queue:
                node = queue.pop(0)
                if node in component:
                    continue
                component.add(node)
                
                # 양방향 탐색
                for neighbor, _ in self.adjacency.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
                for neighbor, _ in self.reverse_adj.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
            
            return component
        
        for uid in self.persons:
            if uid not in visited:
                component = bfs(uid)
                visited.update(component)
                
                if len(component) >= min_size:
                    # 클러스터 내 허브 찾기
                    members = list(component)
                    pagerank = self.calculate_pagerank()
                    
                    hub_id = max(members, key=lambda x: pagerank.get(x, 0))
                    
                    # 총 가치 계산
                    total_value = sum(
                        self.persons[m].total_spent 
                        for m in members if m in self.persons
                    )
                    
                    # 결속력 (내부 연결 / 가능한 최대 연결)
                    internal_edges = 0
                    for m in members:
                        for target, _ in self.adjacency.get(m, []):
                            if target in component:
                                internal_edges += 1
                    
                    max_edges = len(members) * (len(members) - 1)
                    cohesion = internal_edges / max_edges if max_edges > 0 else 0
                    
                    clusters.append(Cluster(
                        cluster_id=f"C{cluster_id}",
                        name=f"그룹 {cluster_id + 1}",
                        members=members,
                        hub_id=hub_id,
                        total_value=total_value,
                        cohesion=cohesion,
                    ))
                    
                    cluster_id += 1
        
        self._cluster_cache = clusters
        return clusters
    
    # ─── 이탈 영향 시뮬레이션 ───
    
    def simulate_churn_impact(self, user_id: str) -> Dict[str, Any]:
        """
        특정 사람이 이탈했을 때의 영향 시뮬레이션
        
        "이 사람이 떠나면 몇 명이 같이 나갈까?"
        """
        if user_id not in self.persons:
            return {"error": "User not found"}
        
        person = self.persons[user_id]
        
        # 직접 연결된 사람들
        direct_connections: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        
        for target, weight in self.adjacency.get(user_id, []):
            if target in self.persons and target not in seen_ids:
                seen_ids.add(target)
                direct_connections.append({
                    "user_id": target,
                    "name": self.persons[target].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.8),
                })
        
        for source, weight in self.reverse_adj.get(user_id, []):
            if source in self.persons and source != user_id and source not in seen_ids:
                seen_ids.add(source)
                direct_connections.append({
                    "user_id": source,
                    "name": self.persons[source].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.5),
                })
        
        # 예상 이탈자 수
        expected_churns = sum(c["churn_probability"] for c in direct_connections)
        
        # 예상 매출 손실
        revenue_loss = person.total_spent
        for conn in direct_connections:
            if conn["user_id"] in self.persons:
                revenue_loss += self.persons[conn["user_id"]].total_spent * conn["churn_probability"]
        
        return {
            "target_user": {
                "user_id": user_id,
                "name": person.name,
                "total_spent": person.total_spent,
                "pagerank": person.pagerank,
            },
            "direct_connections": len(direct_connections),
            "expected_churns": round(expected_churns, 1),
            "at_risk_users": direct_connections,
            "expected_revenue_loss": int(revenue_loss),
            "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
        }
    
    # ─── 통계 및 내보내기 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """네트워크 통계"""
        pagerank = self.calculate_pagerank()
        
        return {
            "total_persons": len(self.persons),
            "total_relationships": len(self.relationships),
            "total_activities": len(self.activities),
            "avg_connections": sum(len(v) for v in self.adjacency.values()) / max(len(self.persons), 1),
            "clusters": len(self.detect_clusters()),
            "top_influencer": max(pagerank.items(), key=lambda x: x[1])[0] if pagerank else None,
        }
    
    def export_graph_data(self) -> Dict[str, Any]:
        """시각화용 그래프 데이터 내보내기"""
        nodes: List[Dict[str, Any]] = []
        for uid, person in self.persons.items():
            nodes.append({
                "id": uid,
                "name": person.name,
                "m": person.m_score,
                "t": person.t_score,
                "s": person.s_score,
                "pagerank": person.pagerank,
                "total_spent": person.total_spent,
                "is_vip": person.is_vip,
                "is_risk": person.is_risk,
            })
        
        edges: List[Dict[str, Any]] = []
        for rel in self.relationships:
            edges.append({
                "source": rel.source_id,
                "target": rel.target_id,
                "type": rel.rel_type.value,
                "weight": rel.weight,
            })
        
        return {"nodes": nodes, "edges": edges}
    
    # ─── 저장/로드 ───
    
    def save(self, filepath: str) -> None:
        """저장"""
        data = {
            "persons": {uid: p.to_dict() for uid, p in self.persons.items()},
            "relationships": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "rel_type": r.rel_type.value,
                    "strength": r.strength,
                    "created_at": r.created_at,
                }
                for r in self.relationships
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str) -> None:
        """로드"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for uid, pdata in data.get("persons", {}).items():
            self.add_person(Person(
                user_id=uid,
                name=pdata.get("name", ""),
                m_score=pdata.get("m_score", 0),
                t_score=pdata.get("t_score", 0),
                total_spent=pdata.get("total_spent", 0),
            ))
        
        for rdata in data.get("relationships", []):
            self.add_relationship(Relationship(
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                rel_type=RelationType(rdata["rel_type"]),
                strength=rdata.get("strength", 1.0),
                created_at=rdata.get("created_at", ""),
            ))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 및 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_test_network() -> HumanNetworkEngine:
    """테스트용 네트워크 생성"""
    engine = HumanNetworkEngine()
    
    # 사람 추가
    people = [
        Person("kim", "김철수", "010-1111-1111", m_score=80, total_spent=5000000, is_vip=True),
        Person("lee", "이영희", "010-2222-2222", m_score=70, total_spent=3000000),
        Person("park", "박민수", "010-3333-3333", m_score=60, total_spent=2000000),
        Person("choi", "최지훈", "010-4444-4444", m_score=50, total_spent=1500000),
        Person("jung", "정수진", "010-5555-5555", m_score=40, total_spent=1000000),
        Person("kang", "강미영", "010-6666-6666", m_score=30, total_spent=800000),
        Person("cho", "조현우", "010-7777-7777", m_score=90, t_score=70, total_spent=8000000, is_risk=True),
    ]
    
    for p in people:
        engine.add_person(p)
    
    # 관계 추가
    relations = [
        Relationship("kim", "lee", RelationType.FAMILY, 5.0),
        Relationship("kim", "park", RelationType.REFERRAL, 4.0),
        Relationship("kim", "choi", RelationType.REFERRAL, 4.0),
        Relationship("park", "jung", RelationType.FRIEND, 2.0),
        Relationship("lee", "kang", RelationType.FAMILY, 5.0),
        Relationship("cho", "jung", RelationType.FRIEND, 2.0),
    ]
    
    for r in relations:
        engine.add_relationship(r)
    
    # 그룹 활동
    engine.add_activity(GroupActivity(
        activity_id="A1",
        members=["kim", "lee", "park", "choi"],
        station_id="RESTAURANT_01",
        activity_type="dining",
        timestamp=datetime.now().isoformat(),
    ))
    
    return engine


def run_demo() -> None:
    """데모 실행"""
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # 테스트 네트워크 생성
    engine = create_test_network()
    
    # PageRank 계산
    print("\n📊 PageRank 영향력 순위:")
    print("-" * 50)
    pagerank = engine.calculate_pagerank()
    for uid, pr in sorted(pagerank.items(), key=lambda x: x[1], reverse=True):
        person = engine.persons[uid]
        print(f"  {person.name}: {pr:.2f}점")
    
    # 여왕벌 탐지
    print("\n👑 TOP 3 여왕벌 (Queen Bee):")
    print("-" * 50)
    queens = engine.find_queen_bees(3)
    for i, (person, score) in enumerate(queens, 1):
        print(f"  {i}위: {person.name} (영향력: {score:.2f})")
        if i == 1:
            connections = len(engine.adjacency.get(person.user_id, []))
            print(f"      → 전략: 이 사람에게 '단체 회식권'을 주면 하위 {connections}명이 딸려옵니다.")
    
    # 시너지 계산
    print("\n❤️ 시너지(S) 점수:")
    print("-" * 50)
    for uid in ["kim", "cho"]:
        synergy = engine.calculate_synergy(uid)
        print(f"  {engine.persons[uid].name}: {synergy['s_total']:.0f}점")
        print(f"    - 혈연(S_blood): {synergy['s_blood']:.0f}")
        print(f"    - 소개(S_referral): {synergy['s_referral']:.0f}")
        print(f"    - 동반(S_group): {synergy['s_group']:.0f}")
    
    # 이탈 시뮬레이션
    print("\n🚨 이탈 영향 시뮬레이션 (김철수가 떠나면?):")
    print("-" * 50)
    impact = engine.simulate_churn_impact("kim")
    print(f"  직접 연결: {impact['direct_connections']}명")
    print(f"  예상 이탈: {impact['expected_churns']}명")
    print(f"  예상 매출 손실: ₩{impact['expected_revenue_loss']:,}")
    print(f"  리스크 수준: {impact['risk_level']}")
    
    # 통계
    print("\n📈 네트워크 통계:")
    print("-" * 50)
    stats = engine.get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    run_demo()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                                     ║
║                                                                                           ║
║  "시너지(S)는 시스템이 아니라, 사람과 사람 사이의 인력이다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 인간 관계 그래프 구축                                                                  ║
║  ✅ PageRank 기반 영향력 계산                                                              ║
║  ✅ 여왕벌(Queen Bee) / 킹핀(Kingpin) 탐지                                                 ║
║  ✅ 클러스터(커뮤니티) 분석                                                                ║
║  ✅ 이탈 영향도 시뮬레이션                                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

S(Synergy) 재정의:
- S_blood (혈연): 가족 수 (이탈 방지력)
- S_referral (소개): 신규 유입 기여 (확장력)  
- S_group (동반): 그룹 활동 빈도 (영향력)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum
from datetime import datetime
import json
import math
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RelationType(str, Enum):
    FAMILY = "FAMILY"       # 가족 (강도 5) - 운명 공동체
    REFERRAL = "REFERRAL"   # 소개 (강도 4) - 내가 데려온 사람
    FRIEND = "FRIEND"       # 친구 (강도 2) - 동반 방문
    GROUP = "GROUP"         # 그룹 (강도 3) - 모임 멤버
    COUPLE = "COUPLE"       # 커플 (강도 4) - 연인


# 관계별 가중치
RELATION_WEIGHTS: Dict[RelationType, float] = {
    RelationType.FAMILY: 5.0,
    RelationType.REFERRAL: 4.0,
    RelationType.COUPLE: 4.0,
    RelationType.GROUP: 3.0,
    RelationType.FRIEND: 2.0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Person:
    """사람 노드"""
    user_id: str
    name: str
    phone: str = ""
    m_score: float = 0.0  # 매출 점수
    t_score: float = 0.0  # 리스크 점수
    s_score: float = 0.0  # 시너지 점수 (계산됨)
    pagerank: float = 0.0  # PageRank 점수
    station_id: str = ""
    total_spent: int = 0
    visit_count: int = 0
    is_vip: bool = False
    is_risk: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "m_score": self.m_score,
            "t_score": self.t_score,
            "s_score": self.s_score,
            "pagerank": self.pagerank,
            "total_spent": self.total_spent,
            "visit_count": self.visit_count,
            "is_vip": self.is_vip,
            "is_risk": self.is_risk,
        }


@dataclass
class Relationship:
    """관계 엣지"""
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0  # 1~5
    created_at: str = ""
    
    @property
    def weight(self) -> float:
        base = RELATION_WEIGHTS.get(self.rel_type, 1.0)
        return base * self.strength


@dataclass
class GroupActivity:
    """그룹 활동 기록"""
    activity_id: str
    members: List[str]  # user_ids
    station_id: str
    activity_type: str  # "dining", "class", "workout"
    timestamp: str


@dataclass
class Cluster:
    """커뮤니티/클러스터"""
    cluster_id: str
    name: str
    members: List[str]
    hub_id: str  # 중심 인물
    total_value: float  # 총 가치
    cohesion: float  # 결속력 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Human Network Engine
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HumanNetworkEngine:
    """
    인간 관계 네트워크 분석 엔진
    
    - 그래프 기반 관계 모델링
    - PageRank 영향력 계산
    - 클러스터(커뮤니티) 탐지
    - 이탈 영향 시뮬레이션
    """
    
    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.relationships: List[Relationship] = []
        self.activities: List[GroupActivity] = []
        
        # 그래프 구조
        self.adjacency: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        self.reverse_adj: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        
        # 캐시
        self._pagerank_cache: Dict[str, float] = {}
        self._cluster_cache: List[Cluster] = []
    
    # ─── 데이터 관리 ───
    
    def add_person(self, person: Person) -> None:
        """사람 추가"""
        self.persons[person.user_id] = person
        self._invalidate_cache()
    
    def add_relationship(self, rel: Relationship) -> None:
        """관계 추가"""
        self.relationships.append(rel)
        self.adjacency[rel.source_id].append((rel.target_id, rel.weight))
        self.reverse_adj[rel.target_id].append((rel.source_id, rel.weight))
        self._invalidate_cache()
    
    def add_activity(self, activity: GroupActivity) -> None:
        """그룹 활동 추가"""
        self.activities.append(activity)
        
        # 그룹 멤버 간 FRIEND 관계 자동 생성
        for i, m1 in enumerate(activity.members):
            for m2 in activity.members[i+1:]:
                # 이미 관계가 있으면 스킵
                existing = self._has_relationship(m1, m2)
                if not existing:
                    self.add_relationship(Relationship(
                        source_id=m1,
                        target_id=m2,
                        rel_type=RelationType.FRIEND,
                        strength=1.0,
                        created_at=activity.timestamp,
                    ))
    
    def _has_relationship(self, id1: str, id2: str) -> bool:
        """관계 존재 여부"""
        for target, _ in self.adjacency.get(id1, []):
            if target == id2:
                return True
        for target, _ in self.adjacency.get(id2, []):
            if target == id1:
                return True
        return False
    
    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._pagerank_cache = {}
        self._cluster_cache = []
    
    # ─── PageRank 계산 ───
    
    def calculate_pagerank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank 알고리즘으로 영향력 계산
        
        중요한 사람과 연결될수록 점수가 높아짐
        """
        if self._pagerank_cache:
            return self._pagerank_cache
        
        n = len(self.persons)
        if n == 0:
            return {}
        
        # 초기화
        pagerank: Dict[str, float] = {uid: 1.0 / n for uid in self.persons}
        
        for _ in range(iterations):
            new_pr: Dict[str, float] = {}
            
            for uid in self.persons:
                # 나를 가리키는 사람들의 PR 합산
                incoming_pr = 0.0
                
                for source_id, weight in self.reverse_adj.get(uid, []):
                    if source_id in pagerank:
                        # 나가는 링크 수로 나눔
                        outgoing = len(self.adjacency.get(source_id, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source_id] * weight) / outgoing
                
                # PageRank 공식
                new_pr[uid] = (1 - damping) / n + damping * incoming_pr
            
            pagerank = new_pr
        
        # 정규화 (0~100)
        max_pr = max(pagerank.values()) if pagerank else 1
        pagerank = {k: (v / max_pr) * 100 for k, v in pagerank.items()}
        
        self._pagerank_cache = pagerank
        
        # Person 객체에 반영
        for uid, pr in pagerank.items():
            if uid in self.persons:
                self.persons[uid].pagerank = pr
        
        return pagerank
    
    # ─── 시너지 점수 계산 ───
    
    def calculate_synergy(self, user_id: str) -> Dict[str, float]:
        """
        S(Synergy) 점수 계산
        
        S = S_blood + S_referral + S_group
        """
        if user_id not in self.persons:
            return {"s_blood": 0, "s_referral": 0, "s_group": 0, "s_total": 0}
        
        s_blood = 0.0
        s_referral = 0.0
        s_group = 0.0
        
        # 1. S_blood (가족 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.FAMILY:
                s_blood += RELATION_WEIGHTS[RelationType.FAMILY]
        
        # 2. S_referral (내가 소개한 사람 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.REFERRAL:
                s_referral += RELATION_WEIGHTS[RelationType.REFERRAL]
        
        # 3. S_group (3인 이상 동반 활동 횟수)
        group_count = 0
        for activity in self.activities:
            if user_id in activity.members and len(activity.members) >= 3:
                group_count += 1
        s_group = group_count * 20  # 동반 1회당 20점
        
        s_total = min(100, s_blood + s_referral + s_group)
        
        # Person 객체에 반영
        self.persons[user_id].s_score = s_total
        
        return {
            "s_blood": s_blood,
            "s_referral": s_referral,
            "s_group": s_group,
            "s_total": s_total,
        }
    
    def _find_relationship(self, source: str, target: str) -> Optional[Relationship]:
        """관계 찾기"""
        for rel in self.relationships:
            if rel.source_id == source and rel.target_id == target:
                return rel
            if rel.source_id == target and rel.target_id == source:
                return rel
        return None
    
    # ─── 여왕벌/킹핀 탐지 ───
    
    def find_queen_bees(self, top_n: int = 10) -> List[Tuple[Person, float]]:
        """
        가장 영향력 있는 사람(여왕벌/킹핀) 찾기
        
        Returns:
            [(Person, influence_score), ...]
        """
        pagerank = self.calculate_pagerank()
        
        # 연결 수 + PageRank 복합 점수
        scores: List[Tuple[Person, float]] = []
        for uid, person in self.persons.items():
            connections = len(self.adjacency.get(uid, [])) + len(self.reverse_adj.get(uid, []))
            pr = pagerank.get(uid, 0)
            
            # 복합 점수: PageRank 60% + 연결 수 40%
            influence = pr * 0.6 + (connections / max(len(self.persons), 1) * 100) * 0.4
            scores.append((person, influence))
        
        # 정렬
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_n]
    
    def get_hub_connections(self, user_id: str) -> Dict[str, Any]:
        """허브의 연결 정보"""
        if user_id not in self.persons:
            return {}
        
        connections: List[Dict[str, Any]] = []
        
        # 나가는 연결
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            target_person = self.persons.get(target)
            connections.append({
                "user_id": target,
                "name": target_person.name if target_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "outgoing",
            })
        
        # 들어오는 연결
        for source, weight in self.reverse_adj.get(user_id, []):
            if source == user_id:
                continue
            rel = self._find_relationship(source, user_id)
            source_person = self.persons.get(source)
            connections.append({
                "user_id": source,
                "name": source_person.name if source_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "incoming",
            })
        
        return {
            "user_id": user_id,
            "name": self.persons[user_id].name,
            "connection_count": len(connections),
            "connections": connections,
        }
    
    # ─── 클러스터 분석 ───
    
    def detect_clusters(self, min_size: int = 3) -> List[Cluster]:
        """
        커뮤니티/클러스터 탐지 (Connected Components)
        """
        if self._cluster_cache:
            return self._cluster_cache
        
        visited: Set[str] = set()
        clusters: List[Cluster] = []
        cluster_id = 0
        
        def bfs(start: str) -> Set[str]:
            """BFS로 연결된 컴포넌트 찾기"""
            component: Set[str] = set()
            queue = [start]
            
            while queue:
                node = queue.pop(0)
                if node in component:
                    continue
                component.add(node)
                
                # 양방향 탐색
                for neighbor, _ in self.adjacency.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
                for neighbor, _ in self.reverse_adj.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
            
            return component
        
        for uid in self.persons:
            if uid not in visited:
                component = bfs(uid)
                visited.update(component)
                
                if len(component) >= min_size:
                    # 클러스터 내 허브 찾기
                    members = list(component)
                    pagerank = self.calculate_pagerank()
                    
                    hub_id = max(members, key=lambda x: pagerank.get(x, 0))
                    
                    # 총 가치 계산
                    total_value = sum(
                        self.persons[m].total_spent 
                        for m in members if m in self.persons
                    )
                    
                    # 결속력 (내부 연결 / 가능한 최대 연결)
                    internal_edges = 0
                    for m in members:
                        for target, _ in self.adjacency.get(m, []):
                            if target in component:
                                internal_edges += 1
                    
                    max_edges = len(members) * (len(members) - 1)
                    cohesion = internal_edges / max_edges if max_edges > 0 else 0
                    
                    clusters.append(Cluster(
                        cluster_id=f"C{cluster_id}",
                        name=f"그룹 {cluster_id + 1}",
                        members=members,
                        hub_id=hub_id,
                        total_value=total_value,
                        cohesion=cohesion,
                    ))
                    
                    cluster_id += 1
        
        self._cluster_cache = clusters
        return clusters
    
    # ─── 이탈 영향 시뮬레이션 ───
    
    def simulate_churn_impact(self, user_id: str) -> Dict[str, Any]:
        """
        특정 사람이 이탈했을 때의 영향 시뮬레이션
        
        "이 사람이 떠나면 몇 명이 같이 나갈까?"
        """
        if user_id not in self.persons:
            return {"error": "User not found"}
        
        person = self.persons[user_id]
        
        # 직접 연결된 사람들
        direct_connections: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        
        for target, weight in self.adjacency.get(user_id, []):
            if target in self.persons and target not in seen_ids:
                seen_ids.add(target)
                direct_connections.append({
                    "user_id": target,
                    "name": self.persons[target].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.8),
                })
        
        for source, weight in self.reverse_adj.get(user_id, []):
            if source in self.persons and source != user_id and source not in seen_ids:
                seen_ids.add(source)
                direct_connections.append({
                    "user_id": source,
                    "name": self.persons[source].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.5),
                })
        
        # 예상 이탈자 수
        expected_churns = sum(c["churn_probability"] for c in direct_connections)
        
        # 예상 매출 손실
        revenue_loss = person.total_spent
        for conn in direct_connections:
            if conn["user_id"] in self.persons:
                revenue_loss += self.persons[conn["user_id"]].total_spent * conn["churn_probability"]
        
        return {
            "target_user": {
                "user_id": user_id,
                "name": person.name,
                "total_spent": person.total_spent,
                "pagerank": person.pagerank,
            },
            "direct_connections": len(direct_connections),
            "expected_churns": round(expected_churns, 1),
            "at_risk_users": direct_connections,
            "expected_revenue_loss": int(revenue_loss),
            "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
        }
    
    # ─── 통계 및 내보내기 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """네트워크 통계"""
        pagerank = self.calculate_pagerank()
        
        return {
            "total_persons": len(self.persons),
            "total_relationships": len(self.relationships),
            "total_activities": len(self.activities),
            "avg_connections": sum(len(v) for v in self.adjacency.values()) / max(len(self.persons), 1),
            "clusters": len(self.detect_clusters()),
            "top_influencer": max(pagerank.items(), key=lambda x: x[1])[0] if pagerank else None,
        }
    
    def export_graph_data(self) -> Dict[str, Any]:
        """시각화용 그래프 데이터 내보내기"""
        nodes: List[Dict[str, Any]] = []
        for uid, person in self.persons.items():
            nodes.append({
                "id": uid,
                "name": person.name,
                "m": person.m_score,
                "t": person.t_score,
                "s": person.s_score,
                "pagerank": person.pagerank,
                "total_spent": person.total_spent,
                "is_vip": person.is_vip,
                "is_risk": person.is_risk,
            })
        
        edges: List[Dict[str, Any]] = []
        for rel in self.relationships:
            edges.append({
                "source": rel.source_id,
                "target": rel.target_id,
                "type": rel.rel_type.value,
                "weight": rel.weight,
            })
        
        return {"nodes": nodes, "edges": edges}
    
    # ─── 저장/로드 ───
    
    def save(self, filepath: str) -> None:
        """저장"""
        data = {
            "persons": {uid: p.to_dict() for uid, p in self.persons.items()},
            "relationships": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "rel_type": r.rel_type.value,
                    "strength": r.strength,
                    "created_at": r.created_at,
                }
                for r in self.relationships
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str) -> None:
        """로드"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for uid, pdata in data.get("persons", {}).items():
            self.add_person(Person(
                user_id=uid,
                name=pdata.get("name", ""),
                m_score=pdata.get("m_score", 0),
                t_score=pdata.get("t_score", 0),
                total_spent=pdata.get("total_spent", 0),
            ))
        
        for rdata in data.get("relationships", []):
            self.add_relationship(Relationship(
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                rel_type=RelationType(rdata["rel_type"]),
                strength=rdata.get("strength", 1.0),
                created_at=rdata.get("created_at", ""),
            ))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 및 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_test_network() -> HumanNetworkEngine:
    """테스트용 네트워크 생성"""
    engine = HumanNetworkEngine()
    
    # 사람 추가
    people = [
        Person("kim", "김철수", "010-1111-1111", m_score=80, total_spent=5000000, is_vip=True),
        Person("lee", "이영희", "010-2222-2222", m_score=70, total_spent=3000000),
        Person("park", "박민수", "010-3333-3333", m_score=60, total_spent=2000000),
        Person("choi", "최지훈", "010-4444-4444", m_score=50, total_spent=1500000),
        Person("jung", "정수진", "010-5555-5555", m_score=40, total_spent=1000000),
        Person("kang", "강미영", "010-6666-6666", m_score=30, total_spent=800000),
        Person("cho", "조현우", "010-7777-7777", m_score=90, t_score=70, total_spent=8000000, is_risk=True),
    ]
    
    for p in people:
        engine.add_person(p)
    
    # 관계 추가
    relations = [
        Relationship("kim", "lee", RelationType.FAMILY, 5.0),
        Relationship("kim", "park", RelationType.REFERRAL, 4.0),
        Relationship("kim", "choi", RelationType.REFERRAL, 4.0),
        Relationship("park", "jung", RelationType.FRIEND, 2.0),
        Relationship("lee", "kang", RelationType.FAMILY, 5.0),
        Relationship("cho", "jung", RelationType.FRIEND, 2.0),
    ]
    
    for r in relations:
        engine.add_relationship(r)
    
    # 그룹 활동
    engine.add_activity(GroupActivity(
        activity_id="A1",
        members=["kim", "lee", "park", "choi"],
        station_id="RESTAURANT_01",
        activity_type="dining",
        timestamp=datetime.now().isoformat(),
    ))
    
    return engine


def run_demo() -> None:
    """데모 실행"""
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # 테스트 네트워크 생성
    engine = create_test_network()
    
    # PageRank 계산
    print("\n📊 PageRank 영향력 순위:")
    print("-" * 50)
    pagerank = engine.calculate_pagerank()
    for uid, pr in sorted(pagerank.items(), key=lambda x: x[1], reverse=True):
        person = engine.persons[uid]
        print(f"  {person.name}: {pr:.2f}점")
    
    # 여왕벌 탐지
    print("\n👑 TOP 3 여왕벌 (Queen Bee):")
    print("-" * 50)
    queens = engine.find_queen_bees(3)
    for i, (person, score) in enumerate(queens, 1):
        print(f"  {i}위: {person.name} (영향력: {score:.2f})")
        if i == 1:
            connections = len(engine.adjacency.get(person.user_id, []))
            print(f"      → 전략: 이 사람에게 '단체 회식권'을 주면 하위 {connections}명이 딸려옵니다.")
    
    # 시너지 계산
    print("\n❤️ 시너지(S) 점수:")
    print("-" * 50)
    for uid in ["kim", "cho"]:
        synergy = engine.calculate_synergy(uid)
        print(f"  {engine.persons[uid].name}: {synergy['s_total']:.0f}점")
        print(f"    - 혈연(S_blood): {synergy['s_blood']:.0f}")
        print(f"    - 소개(S_referral): {synergy['s_referral']:.0f}")
        print(f"    - 동반(S_group): {synergy['s_group']:.0f}")
    
    # 이탈 시뮬레이션
    print("\n🚨 이탈 영향 시뮬레이션 (김철수가 떠나면?):")
    print("-" * 50)
    impact = engine.simulate_churn_impact("kim")
    print(f"  직접 연결: {impact['direct_connections']}명")
    print(f"  예상 이탈: {impact['expected_churns']}명")
    print(f"  예상 매출 손실: ₩{impact['expected_revenue_loss']:,}")
    print(f"  리스크 수준: {impact['risk_level']}")
    
    # 통계
    print("\n📈 네트워크 통계:")
    print("-" * 50)
    stats = engine.get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    run_demo()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                                     ║
║                                                                                           ║
║  "시너지(S)는 시스템이 아니라, 사람과 사람 사이의 인력이다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 인간 관계 그래프 구축                                                                  ║
║  ✅ PageRank 기반 영향력 계산                                                              ║
║  ✅ 여왕벌(Queen Bee) / 킹핀(Kingpin) 탐지                                                 ║
║  ✅ 클러스터(커뮤니티) 분석                                                                ║
║  ✅ 이탈 영향도 시뮬레이션                                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

S(Synergy) 재정의:
- S_blood (혈연): 가족 수 (이탈 방지력)
- S_referral (소개): 신규 유입 기여 (확장력)  
- S_group (동반): 그룹 활동 빈도 (영향력)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum
from datetime import datetime
import json
import math
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RelationType(str, Enum):
    FAMILY = "FAMILY"       # 가족 (강도 5) - 운명 공동체
    REFERRAL = "REFERRAL"   # 소개 (강도 4) - 내가 데려온 사람
    FRIEND = "FRIEND"       # 친구 (강도 2) - 동반 방문
    GROUP = "GROUP"         # 그룹 (강도 3) - 모임 멤버
    COUPLE = "COUPLE"       # 커플 (강도 4) - 연인


# 관계별 가중치
RELATION_WEIGHTS: Dict[RelationType, float] = {
    RelationType.FAMILY: 5.0,
    RelationType.REFERRAL: 4.0,
    RelationType.COUPLE: 4.0,
    RelationType.GROUP: 3.0,
    RelationType.FRIEND: 2.0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Person:
    """사람 노드"""
    user_id: str
    name: str
    phone: str = ""
    m_score: float = 0.0  # 매출 점수
    t_score: float = 0.0  # 리스크 점수
    s_score: float = 0.0  # 시너지 점수 (계산됨)
    pagerank: float = 0.0  # PageRank 점수
    station_id: str = ""
    total_spent: int = 0
    visit_count: int = 0
    is_vip: bool = False
    is_risk: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "m_score": self.m_score,
            "t_score": self.t_score,
            "s_score": self.s_score,
            "pagerank": self.pagerank,
            "total_spent": self.total_spent,
            "visit_count": self.visit_count,
            "is_vip": self.is_vip,
            "is_risk": self.is_risk,
        }


@dataclass
class Relationship:
    """관계 엣지"""
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0  # 1~5
    created_at: str = ""
    
    @property
    def weight(self) -> float:
        base = RELATION_WEIGHTS.get(self.rel_type, 1.0)
        return base * self.strength


@dataclass
class GroupActivity:
    """그룹 활동 기록"""
    activity_id: str
    members: List[str]  # user_ids
    station_id: str
    activity_type: str  # "dining", "class", "workout"
    timestamp: str


@dataclass
class Cluster:
    """커뮤니티/클러스터"""
    cluster_id: str
    name: str
    members: List[str]
    hub_id: str  # 중심 인물
    total_value: float  # 총 가치
    cohesion: float  # 결속력 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Human Network Engine
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HumanNetworkEngine:
    """
    인간 관계 네트워크 분석 엔진
    
    - 그래프 기반 관계 모델링
    - PageRank 영향력 계산
    - 클러스터(커뮤니티) 탐지
    - 이탈 영향 시뮬레이션
    """
    
    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.relationships: List[Relationship] = []
        self.activities: List[GroupActivity] = []
        
        # 그래프 구조
        self.adjacency: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        self.reverse_adj: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        
        # 캐시
        self._pagerank_cache: Dict[str, float] = {}
        self._cluster_cache: List[Cluster] = []
    
    # ─── 데이터 관리 ───
    
    def add_person(self, person: Person) -> None:
        """사람 추가"""
        self.persons[person.user_id] = person
        self._invalidate_cache()
    
    def add_relationship(self, rel: Relationship) -> None:
        """관계 추가"""
        self.relationships.append(rel)
        self.adjacency[rel.source_id].append((rel.target_id, rel.weight))
        self.reverse_adj[rel.target_id].append((rel.source_id, rel.weight))
        self._invalidate_cache()
    
    def add_activity(self, activity: GroupActivity) -> None:
        """그룹 활동 추가"""
        self.activities.append(activity)
        
        # 그룹 멤버 간 FRIEND 관계 자동 생성
        for i, m1 in enumerate(activity.members):
            for m2 in activity.members[i+1:]:
                # 이미 관계가 있으면 스킵
                existing = self._has_relationship(m1, m2)
                if not existing:
                    self.add_relationship(Relationship(
                        source_id=m1,
                        target_id=m2,
                        rel_type=RelationType.FRIEND,
                        strength=1.0,
                        created_at=activity.timestamp,
                    ))
    
    def _has_relationship(self, id1: str, id2: str) -> bool:
        """관계 존재 여부"""
        for target, _ in self.adjacency.get(id1, []):
            if target == id2:
                return True
        for target, _ in self.adjacency.get(id2, []):
            if target == id1:
                return True
        return False
    
    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._pagerank_cache = {}
        self._cluster_cache = []
    
    # ─── PageRank 계산 ───
    
    def calculate_pagerank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank 알고리즘으로 영향력 계산
        
        중요한 사람과 연결될수록 점수가 높아짐
        """
        if self._pagerank_cache:
            return self._pagerank_cache
        
        n = len(self.persons)
        if n == 0:
            return {}
        
        # 초기화
        pagerank: Dict[str, float] = {uid: 1.0 / n for uid in self.persons}
        
        for _ in range(iterations):
            new_pr: Dict[str, float] = {}
            
            for uid in self.persons:
                # 나를 가리키는 사람들의 PR 합산
                incoming_pr = 0.0
                
                for source_id, weight in self.reverse_adj.get(uid, []):
                    if source_id in pagerank:
                        # 나가는 링크 수로 나눔
                        outgoing = len(self.adjacency.get(source_id, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source_id] * weight) / outgoing
                
                # PageRank 공식
                new_pr[uid] = (1 - damping) / n + damping * incoming_pr
            
            pagerank = new_pr
        
        # 정규화 (0~100)
        max_pr = max(pagerank.values()) if pagerank else 1
        pagerank = {k: (v / max_pr) * 100 for k, v in pagerank.items()}
        
        self._pagerank_cache = pagerank
        
        # Person 객체에 반영
        for uid, pr in pagerank.items():
            if uid in self.persons:
                self.persons[uid].pagerank = pr
        
        return pagerank
    
    # ─── 시너지 점수 계산 ───
    
    def calculate_synergy(self, user_id: str) -> Dict[str, float]:
        """
        S(Synergy) 점수 계산
        
        S = S_blood + S_referral + S_group
        """
        if user_id not in self.persons:
            return {"s_blood": 0, "s_referral": 0, "s_group": 0, "s_total": 0}
        
        s_blood = 0.0
        s_referral = 0.0
        s_group = 0.0
        
        # 1. S_blood (가족 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.FAMILY:
                s_blood += RELATION_WEIGHTS[RelationType.FAMILY]
        
        # 2. S_referral (내가 소개한 사람 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.REFERRAL:
                s_referral += RELATION_WEIGHTS[RelationType.REFERRAL]
        
        # 3. S_group (3인 이상 동반 활동 횟수)
        group_count = 0
        for activity in self.activities:
            if user_id in activity.members and len(activity.members) >= 3:
                group_count += 1
        s_group = group_count * 20  # 동반 1회당 20점
        
        s_total = min(100, s_blood + s_referral + s_group)
        
        # Person 객체에 반영
        self.persons[user_id].s_score = s_total
        
        return {
            "s_blood": s_blood,
            "s_referral": s_referral,
            "s_group": s_group,
            "s_total": s_total,
        }
    
    def _find_relationship(self, source: str, target: str) -> Optional[Relationship]:
        """관계 찾기"""
        for rel in self.relationships:
            if rel.source_id == source and rel.target_id == target:
                return rel
            if rel.source_id == target and rel.target_id == source:
                return rel
        return None
    
    # ─── 여왕벌/킹핀 탐지 ───
    
    def find_queen_bees(self, top_n: int = 10) -> List[Tuple[Person, float]]:
        """
        가장 영향력 있는 사람(여왕벌/킹핀) 찾기
        
        Returns:
            [(Person, influence_score), ...]
        """
        pagerank = self.calculate_pagerank()
        
        # 연결 수 + PageRank 복합 점수
        scores: List[Tuple[Person, float]] = []
        for uid, person in self.persons.items():
            connections = len(self.adjacency.get(uid, [])) + len(self.reverse_adj.get(uid, []))
            pr = pagerank.get(uid, 0)
            
            # 복합 점수: PageRank 60% + 연결 수 40%
            influence = pr * 0.6 + (connections / max(len(self.persons), 1) * 100) * 0.4
            scores.append((person, influence))
        
        # 정렬
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_n]
    
    def get_hub_connections(self, user_id: str) -> Dict[str, Any]:
        """허브의 연결 정보"""
        if user_id not in self.persons:
            return {}
        
        connections: List[Dict[str, Any]] = []
        
        # 나가는 연결
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            target_person = self.persons.get(target)
            connections.append({
                "user_id": target,
                "name": target_person.name if target_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "outgoing",
            })
        
        # 들어오는 연결
        for source, weight in self.reverse_adj.get(user_id, []):
            if source == user_id:
                continue
            rel = self._find_relationship(source, user_id)
            source_person = self.persons.get(source)
            connections.append({
                "user_id": source,
                "name": source_person.name if source_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "incoming",
            })
        
        return {
            "user_id": user_id,
            "name": self.persons[user_id].name,
            "connection_count": len(connections),
            "connections": connections,
        }
    
    # ─── 클러스터 분석 ───
    
    def detect_clusters(self, min_size: int = 3) -> List[Cluster]:
        """
        커뮤니티/클러스터 탐지 (Connected Components)
        """
        if self._cluster_cache:
            return self._cluster_cache
        
        visited: Set[str] = set()
        clusters: List[Cluster] = []
        cluster_id = 0
        
        def bfs(start: str) -> Set[str]:
            """BFS로 연결된 컴포넌트 찾기"""
            component: Set[str] = set()
            queue = [start]
            
            while queue:
                node = queue.pop(0)
                if node in component:
                    continue
                component.add(node)
                
                # 양방향 탐색
                for neighbor, _ in self.adjacency.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
                for neighbor, _ in self.reverse_adj.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
            
            return component
        
        for uid in self.persons:
            if uid not in visited:
                component = bfs(uid)
                visited.update(component)
                
                if len(component) >= min_size:
                    # 클러스터 내 허브 찾기
                    members = list(component)
                    pagerank = self.calculate_pagerank()
                    
                    hub_id = max(members, key=lambda x: pagerank.get(x, 0))
                    
                    # 총 가치 계산
                    total_value = sum(
                        self.persons[m].total_spent 
                        for m in members if m in self.persons
                    )
                    
                    # 결속력 (내부 연결 / 가능한 최대 연결)
                    internal_edges = 0
                    for m in members:
                        for target, _ in self.adjacency.get(m, []):
                            if target in component:
                                internal_edges += 1
                    
                    max_edges = len(members) * (len(members) - 1)
                    cohesion = internal_edges / max_edges if max_edges > 0 else 0
                    
                    clusters.append(Cluster(
                        cluster_id=f"C{cluster_id}",
                        name=f"그룹 {cluster_id + 1}",
                        members=members,
                        hub_id=hub_id,
                        total_value=total_value,
                        cohesion=cohesion,
                    ))
                    
                    cluster_id += 1
        
        self._cluster_cache = clusters
        return clusters
    
    # ─── 이탈 영향 시뮬레이션 ───
    
    def simulate_churn_impact(self, user_id: str) -> Dict[str, Any]:
        """
        특정 사람이 이탈했을 때의 영향 시뮬레이션
        
        "이 사람이 떠나면 몇 명이 같이 나갈까?"
        """
        if user_id not in self.persons:
            return {"error": "User not found"}
        
        person = self.persons[user_id]
        
        # 직접 연결된 사람들
        direct_connections: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        
        for target, weight in self.adjacency.get(user_id, []):
            if target in self.persons and target not in seen_ids:
                seen_ids.add(target)
                direct_connections.append({
                    "user_id": target,
                    "name": self.persons[target].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.8),
                })
        
        for source, weight in self.reverse_adj.get(user_id, []):
            if source in self.persons and source != user_id and source not in seen_ids:
                seen_ids.add(source)
                direct_connections.append({
                    "user_id": source,
                    "name": self.persons[source].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.5),
                })
        
        # 예상 이탈자 수
        expected_churns = sum(c["churn_probability"] for c in direct_connections)
        
        # 예상 매출 손실
        revenue_loss = person.total_spent
        for conn in direct_connections:
            if conn["user_id"] in self.persons:
                revenue_loss += self.persons[conn["user_id"]].total_spent * conn["churn_probability"]
        
        return {
            "target_user": {
                "user_id": user_id,
                "name": person.name,
                "total_spent": person.total_spent,
                "pagerank": person.pagerank,
            },
            "direct_connections": len(direct_connections),
            "expected_churns": round(expected_churns, 1),
            "at_risk_users": direct_connections,
            "expected_revenue_loss": int(revenue_loss),
            "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
        }
    
    # ─── 통계 및 내보내기 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """네트워크 통계"""
        pagerank = self.calculate_pagerank()
        
        return {
            "total_persons": len(self.persons),
            "total_relationships": len(self.relationships),
            "total_activities": len(self.activities),
            "avg_connections": sum(len(v) for v in self.adjacency.values()) / max(len(self.persons), 1),
            "clusters": len(self.detect_clusters()),
            "top_influencer": max(pagerank.items(), key=lambda x: x[1])[0] if pagerank else None,
        }
    
    def export_graph_data(self) -> Dict[str, Any]:
        """시각화용 그래프 데이터 내보내기"""
        nodes: List[Dict[str, Any]] = []
        for uid, person in self.persons.items():
            nodes.append({
                "id": uid,
                "name": person.name,
                "m": person.m_score,
                "t": person.t_score,
                "s": person.s_score,
                "pagerank": person.pagerank,
                "total_spent": person.total_spent,
                "is_vip": person.is_vip,
                "is_risk": person.is_risk,
            })
        
        edges: List[Dict[str, Any]] = []
        for rel in self.relationships:
            edges.append({
                "source": rel.source_id,
                "target": rel.target_id,
                "type": rel.rel_type.value,
                "weight": rel.weight,
            })
        
        return {"nodes": nodes, "edges": edges}
    
    # ─── 저장/로드 ───
    
    def save(self, filepath: str) -> None:
        """저장"""
        data = {
            "persons": {uid: p.to_dict() for uid, p in self.persons.items()},
            "relationships": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "rel_type": r.rel_type.value,
                    "strength": r.strength,
                    "created_at": r.created_at,
                }
                for r in self.relationships
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str) -> None:
        """로드"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for uid, pdata in data.get("persons", {}).items():
            self.add_person(Person(
                user_id=uid,
                name=pdata.get("name", ""),
                m_score=pdata.get("m_score", 0),
                t_score=pdata.get("t_score", 0),
                total_spent=pdata.get("total_spent", 0),
            ))
        
        for rdata in data.get("relationships", []):
            self.add_relationship(Relationship(
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                rel_type=RelationType(rdata["rel_type"]),
                strength=rdata.get("strength", 1.0),
                created_at=rdata.get("created_at", ""),
            ))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 및 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_test_network() -> HumanNetworkEngine:
    """테스트용 네트워크 생성"""
    engine = HumanNetworkEngine()
    
    # 사람 추가
    people = [
        Person("kim", "김철수", "010-1111-1111", m_score=80, total_spent=5000000, is_vip=True),
        Person("lee", "이영희", "010-2222-2222", m_score=70, total_spent=3000000),
        Person("park", "박민수", "010-3333-3333", m_score=60, total_spent=2000000),
        Person("choi", "최지훈", "010-4444-4444", m_score=50, total_spent=1500000),
        Person("jung", "정수진", "010-5555-5555", m_score=40, total_spent=1000000),
        Person("kang", "강미영", "010-6666-6666", m_score=30, total_spent=800000),
        Person("cho", "조현우", "010-7777-7777", m_score=90, t_score=70, total_spent=8000000, is_risk=True),
    ]
    
    for p in people:
        engine.add_person(p)
    
    # 관계 추가
    relations = [
        Relationship("kim", "lee", RelationType.FAMILY, 5.0),
        Relationship("kim", "park", RelationType.REFERRAL, 4.0),
        Relationship("kim", "choi", RelationType.REFERRAL, 4.0),
        Relationship("park", "jung", RelationType.FRIEND, 2.0),
        Relationship("lee", "kang", RelationType.FAMILY, 5.0),
        Relationship("cho", "jung", RelationType.FRIEND, 2.0),
    ]
    
    for r in relations:
        engine.add_relationship(r)
    
    # 그룹 활동
    engine.add_activity(GroupActivity(
        activity_id="A1",
        members=["kim", "lee", "park", "choi"],
        station_id="RESTAURANT_01",
        activity_type="dining",
        timestamp=datetime.now().isoformat(),
    ))
    
    return engine


def run_demo() -> None:
    """데모 실행"""
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # 테스트 네트워크 생성
    engine = create_test_network()
    
    # PageRank 계산
    print("\n📊 PageRank 영향력 순위:")
    print("-" * 50)
    pagerank = engine.calculate_pagerank()
    for uid, pr in sorted(pagerank.items(), key=lambda x: x[1], reverse=True):
        person = engine.persons[uid]
        print(f"  {person.name}: {pr:.2f}점")
    
    # 여왕벌 탐지
    print("\n👑 TOP 3 여왕벌 (Queen Bee):")
    print("-" * 50)
    queens = engine.find_queen_bees(3)
    for i, (person, score) in enumerate(queens, 1):
        print(f"  {i}위: {person.name} (영향력: {score:.2f})")
        if i == 1:
            connections = len(engine.adjacency.get(person.user_id, []))
            print(f"      → 전략: 이 사람에게 '단체 회식권'을 주면 하위 {connections}명이 딸려옵니다.")
    
    # 시너지 계산
    print("\n❤️ 시너지(S) 점수:")
    print("-" * 50)
    for uid in ["kim", "cho"]:
        synergy = engine.calculate_synergy(uid)
        print(f"  {engine.persons[uid].name}: {synergy['s_total']:.0f}점")
        print(f"    - 혈연(S_blood): {synergy['s_blood']:.0f}")
        print(f"    - 소개(S_referral): {synergy['s_referral']:.0f}")
        print(f"    - 동반(S_group): {synergy['s_group']:.0f}")
    
    # 이탈 시뮬레이션
    print("\n🚨 이탈 영향 시뮬레이션 (김철수가 떠나면?):")
    print("-" * 50)
    impact = engine.simulate_churn_impact("kim")
    print(f"  직접 연결: {impact['direct_connections']}명")
    print(f"  예상 이탈: {impact['expected_churns']}명")
    print(f"  예상 매출 손실: ₩{impact['expected_revenue_loss']:,}")
    print(f"  리스크 수준: {impact['risk_level']}")
    
    # 통계
    print("\n📈 네트워크 통계:")
    print("-" * 50)
    stats = engine.get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    run_demo()



















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                                     ║
║                                                                                           ║
║  "시너지(S)는 시스템이 아니라, 사람과 사람 사이의 인력이다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 인간 관계 그래프 구축                                                                  ║
║  ✅ PageRank 기반 영향력 계산                                                              ║
║  ✅ 여왕벌(Queen Bee) / 킹핀(Kingpin) 탐지                                                 ║
║  ✅ 클러스터(커뮤니티) 분석                                                                ║
║  ✅ 이탈 영향도 시뮬레이션                                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

S(Synergy) 재정의:
- S_blood (혈연): 가족 수 (이탈 방지력)
- S_referral (소개): 신규 유입 기여 (확장력)  
- S_group (동반): 그룹 활동 빈도 (영향력)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum
from datetime import datetime
import json
import math
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RelationType(str, Enum):
    FAMILY = "FAMILY"       # 가족 (강도 5) - 운명 공동체
    REFERRAL = "REFERRAL"   # 소개 (강도 4) - 내가 데려온 사람
    FRIEND = "FRIEND"       # 친구 (강도 2) - 동반 방문
    GROUP = "GROUP"         # 그룹 (강도 3) - 모임 멤버
    COUPLE = "COUPLE"       # 커플 (강도 4) - 연인


# 관계별 가중치
RELATION_WEIGHTS: Dict[RelationType, float] = {
    RelationType.FAMILY: 5.0,
    RelationType.REFERRAL: 4.0,
    RelationType.COUPLE: 4.0,
    RelationType.GROUP: 3.0,
    RelationType.FRIEND: 2.0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Person:
    """사람 노드"""
    user_id: str
    name: str
    phone: str = ""
    m_score: float = 0.0  # 매출 점수
    t_score: float = 0.0  # 리스크 점수
    s_score: float = 0.0  # 시너지 점수 (계산됨)
    pagerank: float = 0.0  # PageRank 점수
    station_id: str = ""
    total_spent: int = 0
    visit_count: int = 0
    is_vip: bool = False
    is_risk: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "m_score": self.m_score,
            "t_score": self.t_score,
            "s_score": self.s_score,
            "pagerank": self.pagerank,
            "total_spent": self.total_spent,
            "visit_count": self.visit_count,
            "is_vip": self.is_vip,
            "is_risk": self.is_risk,
        }


@dataclass
class Relationship:
    """관계 엣지"""
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0  # 1~5
    created_at: str = ""
    
    @property
    def weight(self) -> float:
        base = RELATION_WEIGHTS.get(self.rel_type, 1.0)
        return base * self.strength


@dataclass
class GroupActivity:
    """그룹 활동 기록"""
    activity_id: str
    members: List[str]  # user_ids
    station_id: str
    activity_type: str  # "dining", "class", "workout"
    timestamp: str


@dataclass
class Cluster:
    """커뮤니티/클러스터"""
    cluster_id: str
    name: str
    members: List[str]
    hub_id: str  # 중심 인물
    total_value: float  # 총 가치
    cohesion: float  # 결속력 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Human Network Engine
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HumanNetworkEngine:
    """
    인간 관계 네트워크 분석 엔진
    
    - 그래프 기반 관계 모델링
    - PageRank 영향력 계산
    - 클러스터(커뮤니티) 탐지
    - 이탈 영향 시뮬레이션
    """
    
    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.relationships: List[Relationship] = []
        self.activities: List[GroupActivity] = []
        
        # 그래프 구조
        self.adjacency: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        self.reverse_adj: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        
        # 캐시
        self._pagerank_cache: Dict[str, float] = {}
        self._cluster_cache: List[Cluster] = []
    
    # ─── 데이터 관리 ───
    
    def add_person(self, person: Person) -> None:
        """사람 추가"""
        self.persons[person.user_id] = person
        self._invalidate_cache()
    
    def add_relationship(self, rel: Relationship) -> None:
        """관계 추가"""
        self.relationships.append(rel)
        self.adjacency[rel.source_id].append((rel.target_id, rel.weight))
        self.reverse_adj[rel.target_id].append((rel.source_id, rel.weight))
        self._invalidate_cache()
    
    def add_activity(self, activity: GroupActivity) -> None:
        """그룹 활동 추가"""
        self.activities.append(activity)
        
        # 그룹 멤버 간 FRIEND 관계 자동 생성
        for i, m1 in enumerate(activity.members):
            for m2 in activity.members[i+1:]:
                # 이미 관계가 있으면 스킵
                existing = self._has_relationship(m1, m2)
                if not existing:
                    self.add_relationship(Relationship(
                        source_id=m1,
                        target_id=m2,
                        rel_type=RelationType.FRIEND,
                        strength=1.0,
                        created_at=activity.timestamp,
                    ))
    
    def _has_relationship(self, id1: str, id2: str) -> bool:
        """관계 존재 여부"""
        for target, _ in self.adjacency.get(id1, []):
            if target == id2:
                return True
        for target, _ in self.adjacency.get(id2, []):
            if target == id1:
                return True
        return False
    
    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._pagerank_cache = {}
        self._cluster_cache = []
    
    # ─── PageRank 계산 ───
    
    def calculate_pagerank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank 알고리즘으로 영향력 계산
        
        중요한 사람과 연결될수록 점수가 높아짐
        """
        if self._pagerank_cache:
            return self._pagerank_cache
        
        n = len(self.persons)
        if n == 0:
            return {}
        
        # 초기화
        pagerank: Dict[str, float] = {uid: 1.0 / n for uid in self.persons}
        
        for _ in range(iterations):
            new_pr: Dict[str, float] = {}
            
            for uid in self.persons:
                # 나를 가리키는 사람들의 PR 합산
                incoming_pr = 0.0
                
                for source_id, weight in self.reverse_adj.get(uid, []):
                    if source_id in pagerank:
                        # 나가는 링크 수로 나눔
                        outgoing = len(self.adjacency.get(source_id, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source_id] * weight) / outgoing
                
                # PageRank 공식
                new_pr[uid] = (1 - damping) / n + damping * incoming_pr
            
            pagerank = new_pr
        
        # 정규화 (0~100)
        max_pr = max(pagerank.values()) if pagerank else 1
        pagerank = {k: (v / max_pr) * 100 for k, v in pagerank.items()}
        
        self._pagerank_cache = pagerank
        
        # Person 객체에 반영
        for uid, pr in pagerank.items():
            if uid in self.persons:
                self.persons[uid].pagerank = pr
        
        return pagerank
    
    # ─── 시너지 점수 계산 ───
    
    def calculate_synergy(self, user_id: str) -> Dict[str, float]:
        """
        S(Synergy) 점수 계산
        
        S = S_blood + S_referral + S_group
        """
        if user_id not in self.persons:
            return {"s_blood": 0, "s_referral": 0, "s_group": 0, "s_total": 0}
        
        s_blood = 0.0
        s_referral = 0.0
        s_group = 0.0
        
        # 1. S_blood (가족 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.FAMILY:
                s_blood += RELATION_WEIGHTS[RelationType.FAMILY]
        
        # 2. S_referral (내가 소개한 사람 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.REFERRAL:
                s_referral += RELATION_WEIGHTS[RelationType.REFERRAL]
        
        # 3. S_group (3인 이상 동반 활동 횟수)
        group_count = 0
        for activity in self.activities:
            if user_id in activity.members and len(activity.members) >= 3:
                group_count += 1
        s_group = group_count * 20  # 동반 1회당 20점
        
        s_total = min(100, s_blood + s_referral + s_group)
        
        # Person 객체에 반영
        self.persons[user_id].s_score = s_total
        
        return {
            "s_blood": s_blood,
            "s_referral": s_referral,
            "s_group": s_group,
            "s_total": s_total,
        }
    
    def _find_relationship(self, source: str, target: str) -> Optional[Relationship]:
        """관계 찾기"""
        for rel in self.relationships:
            if rel.source_id == source and rel.target_id == target:
                return rel
            if rel.source_id == target and rel.target_id == source:
                return rel
        return None
    
    # ─── 여왕벌/킹핀 탐지 ───
    
    def find_queen_bees(self, top_n: int = 10) -> List[Tuple[Person, float]]:
        """
        가장 영향력 있는 사람(여왕벌/킹핀) 찾기
        
        Returns:
            [(Person, influence_score), ...]
        """
        pagerank = self.calculate_pagerank()
        
        # 연결 수 + PageRank 복합 점수
        scores: List[Tuple[Person, float]] = []
        for uid, person in self.persons.items():
            connections = len(self.adjacency.get(uid, [])) + len(self.reverse_adj.get(uid, []))
            pr = pagerank.get(uid, 0)
            
            # 복합 점수: PageRank 60% + 연결 수 40%
            influence = pr * 0.6 + (connections / max(len(self.persons), 1) * 100) * 0.4
            scores.append((person, influence))
        
        # 정렬
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_n]
    
    def get_hub_connections(self, user_id: str) -> Dict[str, Any]:
        """허브의 연결 정보"""
        if user_id not in self.persons:
            return {}
        
        connections: List[Dict[str, Any]] = []
        
        # 나가는 연결
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            target_person = self.persons.get(target)
            connections.append({
                "user_id": target,
                "name": target_person.name if target_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "outgoing",
            })
        
        # 들어오는 연결
        for source, weight in self.reverse_adj.get(user_id, []):
            if source == user_id:
                continue
            rel = self._find_relationship(source, user_id)
            source_person = self.persons.get(source)
            connections.append({
                "user_id": source,
                "name": source_person.name if source_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "incoming",
            })
        
        return {
            "user_id": user_id,
            "name": self.persons[user_id].name,
            "connection_count": len(connections),
            "connections": connections,
        }
    
    # ─── 클러스터 분석 ───
    
    def detect_clusters(self, min_size: int = 3) -> List[Cluster]:
        """
        커뮤니티/클러스터 탐지 (Connected Components)
        """
        if self._cluster_cache:
            return self._cluster_cache
        
        visited: Set[str] = set()
        clusters: List[Cluster] = []
        cluster_id = 0
        
        def bfs(start: str) -> Set[str]:
            """BFS로 연결된 컴포넌트 찾기"""
            component: Set[str] = set()
            queue = [start]
            
            while queue:
                node = queue.pop(0)
                if node in component:
                    continue
                component.add(node)
                
                # 양방향 탐색
                for neighbor, _ in self.adjacency.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
                for neighbor, _ in self.reverse_adj.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
            
            return component
        
        for uid in self.persons:
            if uid not in visited:
                component = bfs(uid)
                visited.update(component)
                
                if len(component) >= min_size:
                    # 클러스터 내 허브 찾기
                    members = list(component)
                    pagerank = self.calculate_pagerank()
                    
                    hub_id = max(members, key=lambda x: pagerank.get(x, 0))
                    
                    # 총 가치 계산
                    total_value = sum(
                        self.persons[m].total_spent 
                        for m in members if m in self.persons
                    )
                    
                    # 결속력 (내부 연결 / 가능한 최대 연결)
                    internal_edges = 0
                    for m in members:
                        for target, _ in self.adjacency.get(m, []):
                            if target in component:
                                internal_edges += 1
                    
                    max_edges = len(members) * (len(members) - 1)
                    cohesion = internal_edges / max_edges if max_edges > 0 else 0
                    
                    clusters.append(Cluster(
                        cluster_id=f"C{cluster_id}",
                        name=f"그룹 {cluster_id + 1}",
                        members=members,
                        hub_id=hub_id,
                        total_value=total_value,
                        cohesion=cohesion,
                    ))
                    
                    cluster_id += 1
        
        self._cluster_cache = clusters
        return clusters
    
    # ─── 이탈 영향 시뮬레이션 ───
    
    def simulate_churn_impact(self, user_id: str) -> Dict[str, Any]:
        """
        특정 사람이 이탈했을 때의 영향 시뮬레이션
        
        "이 사람이 떠나면 몇 명이 같이 나갈까?"
        """
        if user_id not in self.persons:
            return {"error": "User not found"}
        
        person = self.persons[user_id]
        
        # 직접 연결된 사람들
        direct_connections: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        
        for target, weight in self.adjacency.get(user_id, []):
            if target in self.persons and target not in seen_ids:
                seen_ids.add(target)
                direct_connections.append({
                    "user_id": target,
                    "name": self.persons[target].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.8),
                })
        
        for source, weight in self.reverse_adj.get(user_id, []):
            if source in self.persons and source != user_id and source not in seen_ids:
                seen_ids.add(source)
                direct_connections.append({
                    "user_id": source,
                    "name": self.persons[source].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.5),
                })
        
        # 예상 이탈자 수
        expected_churns = sum(c["churn_probability"] for c in direct_connections)
        
        # 예상 매출 손실
        revenue_loss = person.total_spent
        for conn in direct_connections:
            if conn["user_id"] in self.persons:
                revenue_loss += self.persons[conn["user_id"]].total_spent * conn["churn_probability"]
        
        return {
            "target_user": {
                "user_id": user_id,
                "name": person.name,
                "total_spent": person.total_spent,
                "pagerank": person.pagerank,
            },
            "direct_connections": len(direct_connections),
            "expected_churns": round(expected_churns, 1),
            "at_risk_users": direct_connections,
            "expected_revenue_loss": int(revenue_loss),
            "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
        }
    
    # ─── 통계 및 내보내기 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """네트워크 통계"""
        pagerank = self.calculate_pagerank()
        
        return {
            "total_persons": len(self.persons),
            "total_relationships": len(self.relationships),
            "total_activities": len(self.activities),
            "avg_connections": sum(len(v) for v in self.adjacency.values()) / max(len(self.persons), 1),
            "clusters": len(self.detect_clusters()),
            "top_influencer": max(pagerank.items(), key=lambda x: x[1])[0] if pagerank else None,
        }
    
    def export_graph_data(self) -> Dict[str, Any]:
        """시각화용 그래프 데이터 내보내기"""
        nodes: List[Dict[str, Any]] = []
        for uid, person in self.persons.items():
            nodes.append({
                "id": uid,
                "name": person.name,
                "m": person.m_score,
                "t": person.t_score,
                "s": person.s_score,
                "pagerank": person.pagerank,
                "total_spent": person.total_spent,
                "is_vip": person.is_vip,
                "is_risk": person.is_risk,
            })
        
        edges: List[Dict[str, Any]] = []
        for rel in self.relationships:
            edges.append({
                "source": rel.source_id,
                "target": rel.target_id,
                "type": rel.rel_type.value,
                "weight": rel.weight,
            })
        
        return {"nodes": nodes, "edges": edges}
    
    # ─── 저장/로드 ───
    
    def save(self, filepath: str) -> None:
        """저장"""
        data = {
            "persons": {uid: p.to_dict() for uid, p in self.persons.items()},
            "relationships": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "rel_type": r.rel_type.value,
                    "strength": r.strength,
                    "created_at": r.created_at,
                }
                for r in self.relationships
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str) -> None:
        """로드"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for uid, pdata in data.get("persons", {}).items():
            self.add_person(Person(
                user_id=uid,
                name=pdata.get("name", ""),
                m_score=pdata.get("m_score", 0),
                t_score=pdata.get("t_score", 0),
                total_spent=pdata.get("total_spent", 0),
            ))
        
        for rdata in data.get("relationships", []):
            self.add_relationship(Relationship(
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                rel_type=RelationType(rdata["rel_type"]),
                strength=rdata.get("strength", 1.0),
                created_at=rdata.get("created_at", ""),
            ))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 및 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_test_network() -> HumanNetworkEngine:
    """테스트용 네트워크 생성"""
    engine = HumanNetworkEngine()
    
    # 사람 추가
    people = [
        Person("kim", "김철수", "010-1111-1111", m_score=80, total_spent=5000000, is_vip=True),
        Person("lee", "이영희", "010-2222-2222", m_score=70, total_spent=3000000),
        Person("park", "박민수", "010-3333-3333", m_score=60, total_spent=2000000),
        Person("choi", "최지훈", "010-4444-4444", m_score=50, total_spent=1500000),
        Person("jung", "정수진", "010-5555-5555", m_score=40, total_spent=1000000),
        Person("kang", "강미영", "010-6666-6666", m_score=30, total_spent=800000),
        Person("cho", "조현우", "010-7777-7777", m_score=90, t_score=70, total_spent=8000000, is_risk=True),
    ]
    
    for p in people:
        engine.add_person(p)
    
    # 관계 추가
    relations = [
        Relationship("kim", "lee", RelationType.FAMILY, 5.0),
        Relationship("kim", "park", RelationType.REFERRAL, 4.0),
        Relationship("kim", "choi", RelationType.REFERRAL, 4.0),
        Relationship("park", "jung", RelationType.FRIEND, 2.0),
        Relationship("lee", "kang", RelationType.FAMILY, 5.0),
        Relationship("cho", "jung", RelationType.FRIEND, 2.0),
    ]
    
    for r in relations:
        engine.add_relationship(r)
    
    # 그룹 활동
    engine.add_activity(GroupActivity(
        activity_id="A1",
        members=["kim", "lee", "park", "choi"],
        station_id="RESTAURANT_01",
        activity_type="dining",
        timestamp=datetime.now().isoformat(),
    ))
    
    return engine


def run_demo() -> None:
    """데모 실행"""
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # 테스트 네트워크 생성
    engine = create_test_network()
    
    # PageRank 계산
    print("\n📊 PageRank 영향력 순위:")
    print("-" * 50)
    pagerank = engine.calculate_pagerank()
    for uid, pr in sorted(pagerank.items(), key=lambda x: x[1], reverse=True):
        person = engine.persons[uid]
        print(f"  {person.name}: {pr:.2f}점")
    
    # 여왕벌 탐지
    print("\n👑 TOP 3 여왕벌 (Queen Bee):")
    print("-" * 50)
    queens = engine.find_queen_bees(3)
    for i, (person, score) in enumerate(queens, 1):
        print(f"  {i}위: {person.name} (영향력: {score:.2f})")
        if i == 1:
            connections = len(engine.adjacency.get(person.user_id, []))
            print(f"      → 전략: 이 사람에게 '단체 회식권'을 주면 하위 {connections}명이 딸려옵니다.")
    
    # 시너지 계산
    print("\n❤️ 시너지(S) 점수:")
    print("-" * 50)
    for uid in ["kim", "cho"]:
        synergy = engine.calculate_synergy(uid)
        print(f"  {engine.persons[uid].name}: {synergy['s_total']:.0f}점")
        print(f"    - 혈연(S_blood): {synergy['s_blood']:.0f}")
        print(f"    - 소개(S_referral): {synergy['s_referral']:.0f}")
        print(f"    - 동반(S_group): {synergy['s_group']:.0f}")
    
    # 이탈 시뮬레이션
    print("\n🚨 이탈 영향 시뮬레이션 (김철수가 떠나면?):")
    print("-" * 50)
    impact = engine.simulate_churn_impact("kim")
    print(f"  직접 연결: {impact['direct_connections']}명")
    print(f"  예상 이탈: {impact['expected_churns']}명")
    print(f"  예상 매출 손실: ₩{impact['expected_revenue_loss']:,}")
    print(f"  리스크 수준: {impact['risk_level']}")
    
    # 통계
    print("\n📈 네트워크 통계:")
    print("-" * 50)
    stats = engine.get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    run_demo()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                                     ║
║                                                                                           ║
║  "시너지(S)는 시스템이 아니라, 사람과 사람 사이의 인력이다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 인간 관계 그래프 구축                                                                  ║
║  ✅ PageRank 기반 영향력 계산                                                              ║
║  ✅ 여왕벌(Queen Bee) / 킹핀(Kingpin) 탐지                                                 ║
║  ✅ 클러스터(커뮤니티) 분석                                                                ║
║  ✅ 이탈 영향도 시뮬레이션                                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

S(Synergy) 재정의:
- S_blood (혈연): 가족 수 (이탈 방지력)
- S_referral (소개): 신규 유입 기여 (확장력)  
- S_group (동반): 그룹 활동 빈도 (영향력)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum
from datetime import datetime
import json
import math
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RelationType(str, Enum):
    FAMILY = "FAMILY"       # 가족 (강도 5) - 운명 공동체
    REFERRAL = "REFERRAL"   # 소개 (강도 4) - 내가 데려온 사람
    FRIEND = "FRIEND"       # 친구 (강도 2) - 동반 방문
    GROUP = "GROUP"         # 그룹 (강도 3) - 모임 멤버
    COUPLE = "COUPLE"       # 커플 (강도 4) - 연인


# 관계별 가중치
RELATION_WEIGHTS: Dict[RelationType, float] = {
    RelationType.FAMILY: 5.0,
    RelationType.REFERRAL: 4.0,
    RelationType.COUPLE: 4.0,
    RelationType.GROUP: 3.0,
    RelationType.FRIEND: 2.0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Person:
    """사람 노드"""
    user_id: str
    name: str
    phone: str = ""
    m_score: float = 0.0  # 매출 점수
    t_score: float = 0.0  # 리스크 점수
    s_score: float = 0.0  # 시너지 점수 (계산됨)
    pagerank: float = 0.0  # PageRank 점수
    station_id: str = ""
    total_spent: int = 0
    visit_count: int = 0
    is_vip: bool = False
    is_risk: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "m_score": self.m_score,
            "t_score": self.t_score,
            "s_score": self.s_score,
            "pagerank": self.pagerank,
            "total_spent": self.total_spent,
            "visit_count": self.visit_count,
            "is_vip": self.is_vip,
            "is_risk": self.is_risk,
        }


@dataclass
class Relationship:
    """관계 엣지"""
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0  # 1~5
    created_at: str = ""
    
    @property
    def weight(self) -> float:
        base = RELATION_WEIGHTS.get(self.rel_type, 1.0)
        return base * self.strength


@dataclass
class GroupActivity:
    """그룹 활동 기록"""
    activity_id: str
    members: List[str]  # user_ids
    station_id: str
    activity_type: str  # "dining", "class", "workout"
    timestamp: str


@dataclass
class Cluster:
    """커뮤니티/클러스터"""
    cluster_id: str
    name: str
    members: List[str]
    hub_id: str  # 중심 인물
    total_value: float  # 총 가치
    cohesion: float  # 결속력 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Human Network Engine
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HumanNetworkEngine:
    """
    인간 관계 네트워크 분석 엔진
    
    - 그래프 기반 관계 모델링
    - PageRank 영향력 계산
    - 클러스터(커뮤니티) 탐지
    - 이탈 영향 시뮬레이션
    """
    
    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.relationships: List[Relationship] = []
        self.activities: List[GroupActivity] = []
        
        # 그래프 구조
        self.adjacency: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        self.reverse_adj: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        
        # 캐시
        self._pagerank_cache: Dict[str, float] = {}
        self._cluster_cache: List[Cluster] = []
    
    # ─── 데이터 관리 ───
    
    def add_person(self, person: Person) -> None:
        """사람 추가"""
        self.persons[person.user_id] = person
        self._invalidate_cache()
    
    def add_relationship(self, rel: Relationship) -> None:
        """관계 추가"""
        self.relationships.append(rel)
        self.adjacency[rel.source_id].append((rel.target_id, rel.weight))
        self.reverse_adj[rel.target_id].append((rel.source_id, rel.weight))
        self._invalidate_cache()
    
    def add_activity(self, activity: GroupActivity) -> None:
        """그룹 활동 추가"""
        self.activities.append(activity)
        
        # 그룹 멤버 간 FRIEND 관계 자동 생성
        for i, m1 in enumerate(activity.members):
            for m2 in activity.members[i+1:]:
                # 이미 관계가 있으면 스킵
                existing = self._has_relationship(m1, m2)
                if not existing:
                    self.add_relationship(Relationship(
                        source_id=m1,
                        target_id=m2,
                        rel_type=RelationType.FRIEND,
                        strength=1.0,
                        created_at=activity.timestamp,
                    ))
    
    def _has_relationship(self, id1: str, id2: str) -> bool:
        """관계 존재 여부"""
        for target, _ in self.adjacency.get(id1, []):
            if target == id2:
                return True
        for target, _ in self.adjacency.get(id2, []):
            if target == id1:
                return True
        return False
    
    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._pagerank_cache = {}
        self._cluster_cache = []
    
    # ─── PageRank 계산 ───
    
    def calculate_pagerank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank 알고리즘으로 영향력 계산
        
        중요한 사람과 연결될수록 점수가 높아짐
        """
        if self._pagerank_cache:
            return self._pagerank_cache
        
        n = len(self.persons)
        if n == 0:
            return {}
        
        # 초기화
        pagerank: Dict[str, float] = {uid: 1.0 / n for uid in self.persons}
        
        for _ in range(iterations):
            new_pr: Dict[str, float] = {}
            
            for uid in self.persons:
                # 나를 가리키는 사람들의 PR 합산
                incoming_pr = 0.0
                
                for source_id, weight in self.reverse_adj.get(uid, []):
                    if source_id in pagerank:
                        # 나가는 링크 수로 나눔
                        outgoing = len(self.adjacency.get(source_id, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source_id] * weight) / outgoing
                
                # PageRank 공식
                new_pr[uid] = (1 - damping) / n + damping * incoming_pr
            
            pagerank = new_pr
        
        # 정규화 (0~100)
        max_pr = max(pagerank.values()) if pagerank else 1
        pagerank = {k: (v / max_pr) * 100 for k, v in pagerank.items()}
        
        self._pagerank_cache = pagerank
        
        # Person 객체에 반영
        for uid, pr in pagerank.items():
            if uid in self.persons:
                self.persons[uid].pagerank = pr
        
        return pagerank
    
    # ─── 시너지 점수 계산 ───
    
    def calculate_synergy(self, user_id: str) -> Dict[str, float]:
        """
        S(Synergy) 점수 계산
        
        S = S_blood + S_referral + S_group
        """
        if user_id not in self.persons:
            return {"s_blood": 0, "s_referral": 0, "s_group": 0, "s_total": 0}
        
        s_blood = 0.0
        s_referral = 0.0
        s_group = 0.0
        
        # 1. S_blood (가족 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.FAMILY:
                s_blood += RELATION_WEIGHTS[RelationType.FAMILY]
        
        # 2. S_referral (내가 소개한 사람 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.REFERRAL:
                s_referral += RELATION_WEIGHTS[RelationType.REFERRAL]
        
        # 3. S_group (3인 이상 동반 활동 횟수)
        group_count = 0
        for activity in self.activities:
            if user_id in activity.members and len(activity.members) >= 3:
                group_count += 1
        s_group = group_count * 20  # 동반 1회당 20점
        
        s_total = min(100, s_blood + s_referral + s_group)
        
        # Person 객체에 반영
        self.persons[user_id].s_score = s_total
        
        return {
            "s_blood": s_blood,
            "s_referral": s_referral,
            "s_group": s_group,
            "s_total": s_total,
        }
    
    def _find_relationship(self, source: str, target: str) -> Optional[Relationship]:
        """관계 찾기"""
        for rel in self.relationships:
            if rel.source_id == source and rel.target_id == target:
                return rel
            if rel.source_id == target and rel.target_id == source:
                return rel
        return None
    
    # ─── 여왕벌/킹핀 탐지 ───
    
    def find_queen_bees(self, top_n: int = 10) -> List[Tuple[Person, float]]:
        """
        가장 영향력 있는 사람(여왕벌/킹핀) 찾기
        
        Returns:
            [(Person, influence_score), ...]
        """
        pagerank = self.calculate_pagerank()
        
        # 연결 수 + PageRank 복합 점수
        scores: List[Tuple[Person, float]] = []
        for uid, person in self.persons.items():
            connections = len(self.adjacency.get(uid, [])) + len(self.reverse_adj.get(uid, []))
            pr = pagerank.get(uid, 0)
            
            # 복합 점수: PageRank 60% + 연결 수 40%
            influence = pr * 0.6 + (connections / max(len(self.persons), 1) * 100) * 0.4
            scores.append((person, influence))
        
        # 정렬
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_n]
    
    def get_hub_connections(self, user_id: str) -> Dict[str, Any]:
        """허브의 연결 정보"""
        if user_id not in self.persons:
            return {}
        
        connections: List[Dict[str, Any]] = []
        
        # 나가는 연결
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            target_person = self.persons.get(target)
            connections.append({
                "user_id": target,
                "name": target_person.name if target_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "outgoing",
            })
        
        # 들어오는 연결
        for source, weight in self.reverse_adj.get(user_id, []):
            if source == user_id:
                continue
            rel = self._find_relationship(source, user_id)
            source_person = self.persons.get(source)
            connections.append({
                "user_id": source,
                "name": source_person.name if source_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "incoming",
            })
        
        return {
            "user_id": user_id,
            "name": self.persons[user_id].name,
            "connection_count": len(connections),
            "connections": connections,
        }
    
    # ─── 클러스터 분석 ───
    
    def detect_clusters(self, min_size: int = 3) -> List[Cluster]:
        """
        커뮤니티/클러스터 탐지 (Connected Components)
        """
        if self._cluster_cache:
            return self._cluster_cache
        
        visited: Set[str] = set()
        clusters: List[Cluster] = []
        cluster_id = 0
        
        def bfs(start: str) -> Set[str]:
            """BFS로 연결된 컴포넌트 찾기"""
            component: Set[str] = set()
            queue = [start]
            
            while queue:
                node = queue.pop(0)
                if node in component:
                    continue
                component.add(node)
                
                # 양방향 탐색
                for neighbor, _ in self.adjacency.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
                for neighbor, _ in self.reverse_adj.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
            
            return component
        
        for uid in self.persons:
            if uid not in visited:
                component = bfs(uid)
                visited.update(component)
                
                if len(component) >= min_size:
                    # 클러스터 내 허브 찾기
                    members = list(component)
                    pagerank = self.calculate_pagerank()
                    
                    hub_id = max(members, key=lambda x: pagerank.get(x, 0))
                    
                    # 총 가치 계산
                    total_value = sum(
                        self.persons[m].total_spent 
                        for m in members if m in self.persons
                    )
                    
                    # 결속력 (내부 연결 / 가능한 최대 연결)
                    internal_edges = 0
                    for m in members:
                        for target, _ in self.adjacency.get(m, []):
                            if target in component:
                                internal_edges += 1
                    
                    max_edges = len(members) * (len(members) - 1)
                    cohesion = internal_edges / max_edges if max_edges > 0 else 0
                    
                    clusters.append(Cluster(
                        cluster_id=f"C{cluster_id}",
                        name=f"그룹 {cluster_id + 1}",
                        members=members,
                        hub_id=hub_id,
                        total_value=total_value,
                        cohesion=cohesion,
                    ))
                    
                    cluster_id += 1
        
        self._cluster_cache = clusters
        return clusters
    
    # ─── 이탈 영향 시뮬레이션 ───
    
    def simulate_churn_impact(self, user_id: str) -> Dict[str, Any]:
        """
        특정 사람이 이탈했을 때의 영향 시뮬레이션
        
        "이 사람이 떠나면 몇 명이 같이 나갈까?"
        """
        if user_id not in self.persons:
            return {"error": "User not found"}
        
        person = self.persons[user_id]
        
        # 직접 연결된 사람들
        direct_connections: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        
        for target, weight in self.adjacency.get(user_id, []):
            if target in self.persons and target not in seen_ids:
                seen_ids.add(target)
                direct_connections.append({
                    "user_id": target,
                    "name": self.persons[target].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.8),
                })
        
        for source, weight in self.reverse_adj.get(user_id, []):
            if source in self.persons and source != user_id and source not in seen_ids:
                seen_ids.add(source)
                direct_connections.append({
                    "user_id": source,
                    "name": self.persons[source].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.5),
                })
        
        # 예상 이탈자 수
        expected_churns = sum(c["churn_probability"] for c in direct_connections)
        
        # 예상 매출 손실
        revenue_loss = person.total_spent
        for conn in direct_connections:
            if conn["user_id"] in self.persons:
                revenue_loss += self.persons[conn["user_id"]].total_spent * conn["churn_probability"]
        
        return {
            "target_user": {
                "user_id": user_id,
                "name": person.name,
                "total_spent": person.total_spent,
                "pagerank": person.pagerank,
            },
            "direct_connections": len(direct_connections),
            "expected_churns": round(expected_churns, 1),
            "at_risk_users": direct_connections,
            "expected_revenue_loss": int(revenue_loss),
            "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
        }
    
    # ─── 통계 및 내보내기 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """네트워크 통계"""
        pagerank = self.calculate_pagerank()
        
        return {
            "total_persons": len(self.persons),
            "total_relationships": len(self.relationships),
            "total_activities": len(self.activities),
            "avg_connections": sum(len(v) for v in self.adjacency.values()) / max(len(self.persons), 1),
            "clusters": len(self.detect_clusters()),
            "top_influencer": max(pagerank.items(), key=lambda x: x[1])[0] if pagerank else None,
        }
    
    def export_graph_data(self) -> Dict[str, Any]:
        """시각화용 그래프 데이터 내보내기"""
        nodes: List[Dict[str, Any]] = []
        for uid, person in self.persons.items():
            nodes.append({
                "id": uid,
                "name": person.name,
                "m": person.m_score,
                "t": person.t_score,
                "s": person.s_score,
                "pagerank": person.pagerank,
                "total_spent": person.total_spent,
                "is_vip": person.is_vip,
                "is_risk": person.is_risk,
            })
        
        edges: List[Dict[str, Any]] = []
        for rel in self.relationships:
            edges.append({
                "source": rel.source_id,
                "target": rel.target_id,
                "type": rel.rel_type.value,
                "weight": rel.weight,
            })
        
        return {"nodes": nodes, "edges": edges}
    
    # ─── 저장/로드 ───
    
    def save(self, filepath: str) -> None:
        """저장"""
        data = {
            "persons": {uid: p.to_dict() for uid, p in self.persons.items()},
            "relationships": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "rel_type": r.rel_type.value,
                    "strength": r.strength,
                    "created_at": r.created_at,
                }
                for r in self.relationships
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str) -> None:
        """로드"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for uid, pdata in data.get("persons", {}).items():
            self.add_person(Person(
                user_id=uid,
                name=pdata.get("name", ""),
                m_score=pdata.get("m_score", 0),
                t_score=pdata.get("t_score", 0),
                total_spent=pdata.get("total_spent", 0),
            ))
        
        for rdata in data.get("relationships", []):
            self.add_relationship(Relationship(
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                rel_type=RelationType(rdata["rel_type"]),
                strength=rdata.get("strength", 1.0),
                created_at=rdata.get("created_at", ""),
            ))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 및 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_test_network() -> HumanNetworkEngine:
    """테스트용 네트워크 생성"""
    engine = HumanNetworkEngine()
    
    # 사람 추가
    people = [
        Person("kim", "김철수", "010-1111-1111", m_score=80, total_spent=5000000, is_vip=True),
        Person("lee", "이영희", "010-2222-2222", m_score=70, total_spent=3000000),
        Person("park", "박민수", "010-3333-3333", m_score=60, total_spent=2000000),
        Person("choi", "최지훈", "010-4444-4444", m_score=50, total_spent=1500000),
        Person("jung", "정수진", "010-5555-5555", m_score=40, total_spent=1000000),
        Person("kang", "강미영", "010-6666-6666", m_score=30, total_spent=800000),
        Person("cho", "조현우", "010-7777-7777", m_score=90, t_score=70, total_spent=8000000, is_risk=True),
    ]
    
    for p in people:
        engine.add_person(p)
    
    # 관계 추가
    relations = [
        Relationship("kim", "lee", RelationType.FAMILY, 5.0),
        Relationship("kim", "park", RelationType.REFERRAL, 4.0),
        Relationship("kim", "choi", RelationType.REFERRAL, 4.0),
        Relationship("park", "jung", RelationType.FRIEND, 2.0),
        Relationship("lee", "kang", RelationType.FAMILY, 5.0),
        Relationship("cho", "jung", RelationType.FRIEND, 2.0),
    ]
    
    for r in relations:
        engine.add_relationship(r)
    
    # 그룹 활동
    engine.add_activity(GroupActivity(
        activity_id="A1",
        members=["kim", "lee", "park", "choi"],
        station_id="RESTAURANT_01",
        activity_type="dining",
        timestamp=datetime.now().isoformat(),
    ))
    
    return engine


def run_demo() -> None:
    """데모 실행"""
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # 테스트 네트워크 생성
    engine = create_test_network()
    
    # PageRank 계산
    print("\n📊 PageRank 영향력 순위:")
    print("-" * 50)
    pagerank = engine.calculate_pagerank()
    for uid, pr in sorted(pagerank.items(), key=lambda x: x[1], reverse=True):
        person = engine.persons[uid]
        print(f"  {person.name}: {pr:.2f}점")
    
    # 여왕벌 탐지
    print("\n👑 TOP 3 여왕벌 (Queen Bee):")
    print("-" * 50)
    queens = engine.find_queen_bees(3)
    for i, (person, score) in enumerate(queens, 1):
        print(f"  {i}위: {person.name} (영향력: {score:.2f})")
        if i == 1:
            connections = len(engine.adjacency.get(person.user_id, []))
            print(f"      → 전략: 이 사람에게 '단체 회식권'을 주면 하위 {connections}명이 딸려옵니다.")
    
    # 시너지 계산
    print("\n❤️ 시너지(S) 점수:")
    print("-" * 50)
    for uid in ["kim", "cho"]:
        synergy = engine.calculate_synergy(uid)
        print(f"  {engine.persons[uid].name}: {synergy['s_total']:.0f}점")
        print(f"    - 혈연(S_blood): {synergy['s_blood']:.0f}")
        print(f"    - 소개(S_referral): {synergy['s_referral']:.0f}")
        print(f"    - 동반(S_group): {synergy['s_group']:.0f}")
    
    # 이탈 시뮬레이션
    print("\n🚨 이탈 영향 시뮬레이션 (김철수가 떠나면?):")
    print("-" * 50)
    impact = engine.simulate_churn_impact("kim")
    print(f"  직접 연결: {impact['direct_connections']}명")
    print(f"  예상 이탈: {impact['expected_churns']}명")
    print(f"  예상 매출 손실: ₩{impact['expected_revenue_loss']:,}")
    print(f"  리스크 수준: {impact['risk_level']}")
    
    # 통계
    print("\n📈 네트워크 통계:")
    print("-" * 50)
    stats = engine.get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    run_demo()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                                     ║
║                                                                                           ║
║  "시너지(S)는 시스템이 아니라, 사람과 사람 사이의 인력이다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 인간 관계 그래프 구축                                                                  ║
║  ✅ PageRank 기반 영향력 계산                                                              ║
║  ✅ 여왕벌(Queen Bee) / 킹핀(Kingpin) 탐지                                                 ║
║  ✅ 클러스터(커뮤니티) 분석                                                                ║
║  ✅ 이탈 영향도 시뮬레이션                                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

S(Synergy) 재정의:
- S_blood (혈연): 가족 수 (이탈 방지력)
- S_referral (소개): 신규 유입 기여 (확장력)  
- S_group (동반): 그룹 활동 빈도 (영향력)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum
from datetime import datetime
import json
import math
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RelationType(str, Enum):
    FAMILY = "FAMILY"       # 가족 (강도 5) - 운명 공동체
    REFERRAL = "REFERRAL"   # 소개 (강도 4) - 내가 데려온 사람
    FRIEND = "FRIEND"       # 친구 (강도 2) - 동반 방문
    GROUP = "GROUP"         # 그룹 (강도 3) - 모임 멤버
    COUPLE = "COUPLE"       # 커플 (강도 4) - 연인


# 관계별 가중치
RELATION_WEIGHTS: Dict[RelationType, float] = {
    RelationType.FAMILY: 5.0,
    RelationType.REFERRAL: 4.0,
    RelationType.COUPLE: 4.0,
    RelationType.GROUP: 3.0,
    RelationType.FRIEND: 2.0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Person:
    """사람 노드"""
    user_id: str
    name: str
    phone: str = ""
    m_score: float = 0.0  # 매출 점수
    t_score: float = 0.0  # 리스크 점수
    s_score: float = 0.0  # 시너지 점수 (계산됨)
    pagerank: float = 0.0  # PageRank 점수
    station_id: str = ""
    total_spent: int = 0
    visit_count: int = 0
    is_vip: bool = False
    is_risk: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "m_score": self.m_score,
            "t_score": self.t_score,
            "s_score": self.s_score,
            "pagerank": self.pagerank,
            "total_spent": self.total_spent,
            "visit_count": self.visit_count,
            "is_vip": self.is_vip,
            "is_risk": self.is_risk,
        }


@dataclass
class Relationship:
    """관계 엣지"""
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0  # 1~5
    created_at: str = ""
    
    @property
    def weight(self) -> float:
        base = RELATION_WEIGHTS.get(self.rel_type, 1.0)
        return base * self.strength


@dataclass
class GroupActivity:
    """그룹 활동 기록"""
    activity_id: str
    members: List[str]  # user_ids
    station_id: str
    activity_type: str  # "dining", "class", "workout"
    timestamp: str


@dataclass
class Cluster:
    """커뮤니티/클러스터"""
    cluster_id: str
    name: str
    members: List[str]
    hub_id: str  # 중심 인물
    total_value: float  # 총 가치
    cohesion: float  # 결속력 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Human Network Engine
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HumanNetworkEngine:
    """
    인간 관계 네트워크 분석 엔진
    
    - 그래프 기반 관계 모델링
    - PageRank 영향력 계산
    - 클러스터(커뮤니티) 탐지
    - 이탈 영향 시뮬레이션
    """
    
    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.relationships: List[Relationship] = []
        self.activities: List[GroupActivity] = []
        
        # 그래프 구조
        self.adjacency: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        self.reverse_adj: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        
        # 캐시
        self._pagerank_cache: Dict[str, float] = {}
        self._cluster_cache: List[Cluster] = []
    
    # ─── 데이터 관리 ───
    
    def add_person(self, person: Person) -> None:
        """사람 추가"""
        self.persons[person.user_id] = person
        self._invalidate_cache()
    
    def add_relationship(self, rel: Relationship) -> None:
        """관계 추가"""
        self.relationships.append(rel)
        self.adjacency[rel.source_id].append((rel.target_id, rel.weight))
        self.reverse_adj[rel.target_id].append((rel.source_id, rel.weight))
        self._invalidate_cache()
    
    def add_activity(self, activity: GroupActivity) -> None:
        """그룹 활동 추가"""
        self.activities.append(activity)
        
        # 그룹 멤버 간 FRIEND 관계 자동 생성
        for i, m1 in enumerate(activity.members):
            for m2 in activity.members[i+1:]:
                # 이미 관계가 있으면 스킵
                existing = self._has_relationship(m1, m2)
                if not existing:
                    self.add_relationship(Relationship(
                        source_id=m1,
                        target_id=m2,
                        rel_type=RelationType.FRIEND,
                        strength=1.0,
                        created_at=activity.timestamp,
                    ))
    
    def _has_relationship(self, id1: str, id2: str) -> bool:
        """관계 존재 여부"""
        for target, _ in self.adjacency.get(id1, []):
            if target == id2:
                return True
        for target, _ in self.adjacency.get(id2, []):
            if target == id1:
                return True
        return False
    
    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._pagerank_cache = {}
        self._cluster_cache = []
    
    # ─── PageRank 계산 ───
    
    def calculate_pagerank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank 알고리즘으로 영향력 계산
        
        중요한 사람과 연결될수록 점수가 높아짐
        """
        if self._pagerank_cache:
            return self._pagerank_cache
        
        n = len(self.persons)
        if n == 0:
            return {}
        
        # 초기화
        pagerank: Dict[str, float] = {uid: 1.0 / n for uid in self.persons}
        
        for _ in range(iterations):
            new_pr: Dict[str, float] = {}
            
            for uid in self.persons:
                # 나를 가리키는 사람들의 PR 합산
                incoming_pr = 0.0
                
                for source_id, weight in self.reverse_adj.get(uid, []):
                    if source_id in pagerank:
                        # 나가는 링크 수로 나눔
                        outgoing = len(self.adjacency.get(source_id, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source_id] * weight) / outgoing
                
                # PageRank 공식
                new_pr[uid] = (1 - damping) / n + damping * incoming_pr
            
            pagerank = new_pr
        
        # 정규화 (0~100)
        max_pr = max(pagerank.values()) if pagerank else 1
        pagerank = {k: (v / max_pr) * 100 for k, v in pagerank.items()}
        
        self._pagerank_cache = pagerank
        
        # Person 객체에 반영
        for uid, pr in pagerank.items():
            if uid in self.persons:
                self.persons[uid].pagerank = pr
        
        return pagerank
    
    # ─── 시너지 점수 계산 ───
    
    def calculate_synergy(self, user_id: str) -> Dict[str, float]:
        """
        S(Synergy) 점수 계산
        
        S = S_blood + S_referral + S_group
        """
        if user_id not in self.persons:
            return {"s_blood": 0, "s_referral": 0, "s_group": 0, "s_total": 0}
        
        s_blood = 0.0
        s_referral = 0.0
        s_group = 0.0
        
        # 1. S_blood (가족 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.FAMILY:
                s_blood += RELATION_WEIGHTS[RelationType.FAMILY]
        
        # 2. S_referral (내가 소개한 사람 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.REFERRAL:
                s_referral += RELATION_WEIGHTS[RelationType.REFERRAL]
        
        # 3. S_group (3인 이상 동반 활동 횟수)
        group_count = 0
        for activity in self.activities:
            if user_id in activity.members and len(activity.members) >= 3:
                group_count += 1
        s_group = group_count * 20  # 동반 1회당 20점
        
        s_total = min(100, s_blood + s_referral + s_group)
        
        # Person 객체에 반영
        self.persons[user_id].s_score = s_total
        
        return {
            "s_blood": s_blood,
            "s_referral": s_referral,
            "s_group": s_group,
            "s_total": s_total,
        }
    
    def _find_relationship(self, source: str, target: str) -> Optional[Relationship]:
        """관계 찾기"""
        for rel in self.relationships:
            if rel.source_id == source and rel.target_id == target:
                return rel
            if rel.source_id == target and rel.target_id == source:
                return rel
        return None
    
    # ─── 여왕벌/킹핀 탐지 ───
    
    def find_queen_bees(self, top_n: int = 10) -> List[Tuple[Person, float]]:
        """
        가장 영향력 있는 사람(여왕벌/킹핀) 찾기
        
        Returns:
            [(Person, influence_score), ...]
        """
        pagerank = self.calculate_pagerank()
        
        # 연결 수 + PageRank 복합 점수
        scores: List[Tuple[Person, float]] = []
        for uid, person in self.persons.items():
            connections = len(self.adjacency.get(uid, [])) + len(self.reverse_adj.get(uid, []))
            pr = pagerank.get(uid, 0)
            
            # 복합 점수: PageRank 60% + 연결 수 40%
            influence = pr * 0.6 + (connections / max(len(self.persons), 1) * 100) * 0.4
            scores.append((person, influence))
        
        # 정렬
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_n]
    
    def get_hub_connections(self, user_id: str) -> Dict[str, Any]:
        """허브의 연결 정보"""
        if user_id not in self.persons:
            return {}
        
        connections: List[Dict[str, Any]] = []
        
        # 나가는 연결
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            target_person = self.persons.get(target)
            connections.append({
                "user_id": target,
                "name": target_person.name if target_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "outgoing",
            })
        
        # 들어오는 연결
        for source, weight in self.reverse_adj.get(user_id, []):
            if source == user_id:
                continue
            rel = self._find_relationship(source, user_id)
            source_person = self.persons.get(source)
            connections.append({
                "user_id": source,
                "name": source_person.name if source_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "incoming",
            })
        
        return {
            "user_id": user_id,
            "name": self.persons[user_id].name,
            "connection_count": len(connections),
            "connections": connections,
        }
    
    # ─── 클러스터 분석 ───
    
    def detect_clusters(self, min_size: int = 3) -> List[Cluster]:
        """
        커뮤니티/클러스터 탐지 (Connected Components)
        """
        if self._cluster_cache:
            return self._cluster_cache
        
        visited: Set[str] = set()
        clusters: List[Cluster] = []
        cluster_id = 0
        
        def bfs(start: str) -> Set[str]:
            """BFS로 연결된 컴포넌트 찾기"""
            component: Set[str] = set()
            queue = [start]
            
            while queue:
                node = queue.pop(0)
                if node in component:
                    continue
                component.add(node)
                
                # 양방향 탐색
                for neighbor, _ in self.adjacency.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
                for neighbor, _ in self.reverse_adj.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
            
            return component
        
        for uid in self.persons:
            if uid not in visited:
                component = bfs(uid)
                visited.update(component)
                
                if len(component) >= min_size:
                    # 클러스터 내 허브 찾기
                    members = list(component)
                    pagerank = self.calculate_pagerank()
                    
                    hub_id = max(members, key=lambda x: pagerank.get(x, 0))
                    
                    # 총 가치 계산
                    total_value = sum(
                        self.persons[m].total_spent 
                        for m in members if m in self.persons
                    )
                    
                    # 결속력 (내부 연결 / 가능한 최대 연결)
                    internal_edges = 0
                    for m in members:
                        for target, _ in self.adjacency.get(m, []):
                            if target in component:
                                internal_edges += 1
                    
                    max_edges = len(members) * (len(members) - 1)
                    cohesion = internal_edges / max_edges if max_edges > 0 else 0
                    
                    clusters.append(Cluster(
                        cluster_id=f"C{cluster_id}",
                        name=f"그룹 {cluster_id + 1}",
                        members=members,
                        hub_id=hub_id,
                        total_value=total_value,
                        cohesion=cohesion,
                    ))
                    
                    cluster_id += 1
        
        self._cluster_cache = clusters
        return clusters
    
    # ─── 이탈 영향 시뮬레이션 ───
    
    def simulate_churn_impact(self, user_id: str) -> Dict[str, Any]:
        """
        특정 사람이 이탈했을 때의 영향 시뮬레이션
        
        "이 사람이 떠나면 몇 명이 같이 나갈까?"
        """
        if user_id not in self.persons:
            return {"error": "User not found"}
        
        person = self.persons[user_id]
        
        # 직접 연결된 사람들
        direct_connections: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        
        for target, weight in self.adjacency.get(user_id, []):
            if target in self.persons and target not in seen_ids:
                seen_ids.add(target)
                direct_connections.append({
                    "user_id": target,
                    "name": self.persons[target].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.8),
                })
        
        for source, weight in self.reverse_adj.get(user_id, []):
            if source in self.persons and source != user_id and source not in seen_ids:
                seen_ids.add(source)
                direct_connections.append({
                    "user_id": source,
                    "name": self.persons[source].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.5),
                })
        
        # 예상 이탈자 수
        expected_churns = sum(c["churn_probability"] for c in direct_connections)
        
        # 예상 매출 손실
        revenue_loss = person.total_spent
        for conn in direct_connections:
            if conn["user_id"] in self.persons:
                revenue_loss += self.persons[conn["user_id"]].total_spent * conn["churn_probability"]
        
        return {
            "target_user": {
                "user_id": user_id,
                "name": person.name,
                "total_spent": person.total_spent,
                "pagerank": person.pagerank,
            },
            "direct_connections": len(direct_connections),
            "expected_churns": round(expected_churns, 1),
            "at_risk_users": direct_connections,
            "expected_revenue_loss": int(revenue_loss),
            "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
        }
    
    # ─── 통계 및 내보내기 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """네트워크 통계"""
        pagerank = self.calculate_pagerank()
        
        return {
            "total_persons": len(self.persons),
            "total_relationships": len(self.relationships),
            "total_activities": len(self.activities),
            "avg_connections": sum(len(v) for v in self.adjacency.values()) / max(len(self.persons), 1),
            "clusters": len(self.detect_clusters()),
            "top_influencer": max(pagerank.items(), key=lambda x: x[1])[0] if pagerank else None,
        }
    
    def export_graph_data(self) -> Dict[str, Any]:
        """시각화용 그래프 데이터 내보내기"""
        nodes: List[Dict[str, Any]] = []
        for uid, person in self.persons.items():
            nodes.append({
                "id": uid,
                "name": person.name,
                "m": person.m_score,
                "t": person.t_score,
                "s": person.s_score,
                "pagerank": person.pagerank,
                "total_spent": person.total_spent,
                "is_vip": person.is_vip,
                "is_risk": person.is_risk,
            })
        
        edges: List[Dict[str, Any]] = []
        for rel in self.relationships:
            edges.append({
                "source": rel.source_id,
                "target": rel.target_id,
                "type": rel.rel_type.value,
                "weight": rel.weight,
            })
        
        return {"nodes": nodes, "edges": edges}
    
    # ─── 저장/로드 ───
    
    def save(self, filepath: str) -> None:
        """저장"""
        data = {
            "persons": {uid: p.to_dict() for uid, p in self.persons.items()},
            "relationships": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "rel_type": r.rel_type.value,
                    "strength": r.strength,
                    "created_at": r.created_at,
                }
                for r in self.relationships
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str) -> None:
        """로드"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for uid, pdata in data.get("persons", {}).items():
            self.add_person(Person(
                user_id=uid,
                name=pdata.get("name", ""),
                m_score=pdata.get("m_score", 0),
                t_score=pdata.get("t_score", 0),
                total_spent=pdata.get("total_spent", 0),
            ))
        
        for rdata in data.get("relationships", []):
            self.add_relationship(Relationship(
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                rel_type=RelationType(rdata["rel_type"]),
                strength=rdata.get("strength", 1.0),
                created_at=rdata.get("created_at", ""),
            ))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 및 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_test_network() -> HumanNetworkEngine:
    """테스트용 네트워크 생성"""
    engine = HumanNetworkEngine()
    
    # 사람 추가
    people = [
        Person("kim", "김철수", "010-1111-1111", m_score=80, total_spent=5000000, is_vip=True),
        Person("lee", "이영희", "010-2222-2222", m_score=70, total_spent=3000000),
        Person("park", "박민수", "010-3333-3333", m_score=60, total_spent=2000000),
        Person("choi", "최지훈", "010-4444-4444", m_score=50, total_spent=1500000),
        Person("jung", "정수진", "010-5555-5555", m_score=40, total_spent=1000000),
        Person("kang", "강미영", "010-6666-6666", m_score=30, total_spent=800000),
        Person("cho", "조현우", "010-7777-7777", m_score=90, t_score=70, total_spent=8000000, is_risk=True),
    ]
    
    for p in people:
        engine.add_person(p)
    
    # 관계 추가
    relations = [
        Relationship("kim", "lee", RelationType.FAMILY, 5.0),
        Relationship("kim", "park", RelationType.REFERRAL, 4.0),
        Relationship("kim", "choi", RelationType.REFERRAL, 4.0),
        Relationship("park", "jung", RelationType.FRIEND, 2.0),
        Relationship("lee", "kang", RelationType.FAMILY, 5.0),
        Relationship("cho", "jung", RelationType.FRIEND, 2.0),
    ]
    
    for r in relations:
        engine.add_relationship(r)
    
    # 그룹 활동
    engine.add_activity(GroupActivity(
        activity_id="A1",
        members=["kim", "lee", "park", "choi"],
        station_id="RESTAURANT_01",
        activity_type="dining",
        timestamp=datetime.now().isoformat(),
    ))
    
    return engine


def run_demo() -> None:
    """데모 실행"""
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # 테스트 네트워크 생성
    engine = create_test_network()
    
    # PageRank 계산
    print("\n📊 PageRank 영향력 순위:")
    print("-" * 50)
    pagerank = engine.calculate_pagerank()
    for uid, pr in sorted(pagerank.items(), key=lambda x: x[1], reverse=True):
        person = engine.persons[uid]
        print(f"  {person.name}: {pr:.2f}점")
    
    # 여왕벌 탐지
    print("\n👑 TOP 3 여왕벌 (Queen Bee):")
    print("-" * 50)
    queens = engine.find_queen_bees(3)
    for i, (person, score) in enumerate(queens, 1):
        print(f"  {i}위: {person.name} (영향력: {score:.2f})")
        if i == 1:
            connections = len(engine.adjacency.get(person.user_id, []))
            print(f"      → 전략: 이 사람에게 '단체 회식권'을 주면 하위 {connections}명이 딸려옵니다.")
    
    # 시너지 계산
    print("\n❤️ 시너지(S) 점수:")
    print("-" * 50)
    for uid in ["kim", "cho"]:
        synergy = engine.calculate_synergy(uid)
        print(f"  {engine.persons[uid].name}: {synergy['s_total']:.0f}점")
        print(f"    - 혈연(S_blood): {synergy['s_blood']:.0f}")
        print(f"    - 소개(S_referral): {synergy['s_referral']:.0f}")
        print(f"    - 동반(S_group): {synergy['s_group']:.0f}")
    
    # 이탈 시뮬레이션
    print("\n🚨 이탈 영향 시뮬레이션 (김철수가 떠나면?):")
    print("-" * 50)
    impact = engine.simulate_churn_impact("kim")
    print(f"  직접 연결: {impact['direct_connections']}명")
    print(f"  예상 이탈: {impact['expected_churns']}명")
    print(f"  예상 매출 손실: ₩{impact['expected_revenue_loss']:,}")
    print(f"  리스크 수준: {impact['risk_level']}")
    
    # 통계
    print("\n📈 네트워크 통계:")
    print("-" * 50)
    stats = engine.get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    run_demo()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                                     ║
║                                                                                           ║
║  "시너지(S)는 시스템이 아니라, 사람과 사람 사이의 인력이다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 인간 관계 그래프 구축                                                                  ║
║  ✅ PageRank 기반 영향력 계산                                                              ║
║  ✅ 여왕벌(Queen Bee) / 킹핀(Kingpin) 탐지                                                 ║
║  ✅ 클러스터(커뮤니티) 분석                                                                ║
║  ✅ 이탈 영향도 시뮬레이션                                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

S(Synergy) 재정의:
- S_blood (혈연): 가족 수 (이탈 방지력)
- S_referral (소개): 신규 유입 기여 (확장력)  
- S_group (동반): 그룹 활동 빈도 (영향력)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum
from datetime import datetime
import json
import math
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RelationType(str, Enum):
    FAMILY = "FAMILY"       # 가족 (강도 5) - 운명 공동체
    REFERRAL = "REFERRAL"   # 소개 (강도 4) - 내가 데려온 사람
    FRIEND = "FRIEND"       # 친구 (강도 2) - 동반 방문
    GROUP = "GROUP"         # 그룹 (강도 3) - 모임 멤버
    COUPLE = "COUPLE"       # 커플 (강도 4) - 연인


# 관계별 가중치
RELATION_WEIGHTS: Dict[RelationType, float] = {
    RelationType.FAMILY: 5.0,
    RelationType.REFERRAL: 4.0,
    RelationType.COUPLE: 4.0,
    RelationType.GROUP: 3.0,
    RelationType.FRIEND: 2.0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Person:
    """사람 노드"""
    user_id: str
    name: str
    phone: str = ""
    m_score: float = 0.0  # 매출 점수
    t_score: float = 0.0  # 리스크 점수
    s_score: float = 0.0  # 시너지 점수 (계산됨)
    pagerank: float = 0.0  # PageRank 점수
    station_id: str = ""
    total_spent: int = 0
    visit_count: int = 0
    is_vip: bool = False
    is_risk: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "m_score": self.m_score,
            "t_score": self.t_score,
            "s_score": self.s_score,
            "pagerank": self.pagerank,
            "total_spent": self.total_spent,
            "visit_count": self.visit_count,
            "is_vip": self.is_vip,
            "is_risk": self.is_risk,
        }


@dataclass
class Relationship:
    """관계 엣지"""
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0  # 1~5
    created_at: str = ""
    
    @property
    def weight(self) -> float:
        base = RELATION_WEIGHTS.get(self.rel_type, 1.0)
        return base * self.strength


@dataclass
class GroupActivity:
    """그룹 활동 기록"""
    activity_id: str
    members: List[str]  # user_ids
    station_id: str
    activity_type: str  # "dining", "class", "workout"
    timestamp: str


@dataclass
class Cluster:
    """커뮤니티/클러스터"""
    cluster_id: str
    name: str
    members: List[str]
    hub_id: str  # 중심 인물
    total_value: float  # 총 가치
    cohesion: float  # 결속력 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Human Network Engine
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HumanNetworkEngine:
    """
    인간 관계 네트워크 분석 엔진
    
    - 그래프 기반 관계 모델링
    - PageRank 영향력 계산
    - 클러스터(커뮤니티) 탐지
    - 이탈 영향 시뮬레이션
    """
    
    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.relationships: List[Relationship] = []
        self.activities: List[GroupActivity] = []
        
        # 그래프 구조
        self.adjacency: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        self.reverse_adj: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        
        # 캐시
        self._pagerank_cache: Dict[str, float] = {}
        self._cluster_cache: List[Cluster] = []
    
    # ─── 데이터 관리 ───
    
    def add_person(self, person: Person) -> None:
        """사람 추가"""
        self.persons[person.user_id] = person
        self._invalidate_cache()
    
    def add_relationship(self, rel: Relationship) -> None:
        """관계 추가"""
        self.relationships.append(rel)
        self.adjacency[rel.source_id].append((rel.target_id, rel.weight))
        self.reverse_adj[rel.target_id].append((rel.source_id, rel.weight))
        self._invalidate_cache()
    
    def add_activity(self, activity: GroupActivity) -> None:
        """그룹 활동 추가"""
        self.activities.append(activity)
        
        # 그룹 멤버 간 FRIEND 관계 자동 생성
        for i, m1 in enumerate(activity.members):
            for m2 in activity.members[i+1:]:
                # 이미 관계가 있으면 스킵
                existing = self._has_relationship(m1, m2)
                if not existing:
                    self.add_relationship(Relationship(
                        source_id=m1,
                        target_id=m2,
                        rel_type=RelationType.FRIEND,
                        strength=1.0,
                        created_at=activity.timestamp,
                    ))
    
    def _has_relationship(self, id1: str, id2: str) -> bool:
        """관계 존재 여부"""
        for target, _ in self.adjacency.get(id1, []):
            if target == id2:
                return True
        for target, _ in self.adjacency.get(id2, []):
            if target == id1:
                return True
        return False
    
    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._pagerank_cache = {}
        self._cluster_cache = []
    
    # ─── PageRank 계산 ───
    
    def calculate_pagerank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank 알고리즘으로 영향력 계산
        
        중요한 사람과 연결될수록 점수가 높아짐
        """
        if self._pagerank_cache:
            return self._pagerank_cache
        
        n = len(self.persons)
        if n == 0:
            return {}
        
        # 초기화
        pagerank: Dict[str, float] = {uid: 1.0 / n for uid in self.persons}
        
        for _ in range(iterations):
            new_pr: Dict[str, float] = {}
            
            for uid in self.persons:
                # 나를 가리키는 사람들의 PR 합산
                incoming_pr = 0.0
                
                for source_id, weight in self.reverse_adj.get(uid, []):
                    if source_id in pagerank:
                        # 나가는 링크 수로 나눔
                        outgoing = len(self.adjacency.get(source_id, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source_id] * weight) / outgoing
                
                # PageRank 공식
                new_pr[uid] = (1 - damping) / n + damping * incoming_pr
            
            pagerank = new_pr
        
        # 정규화 (0~100)
        max_pr = max(pagerank.values()) if pagerank else 1
        pagerank = {k: (v / max_pr) * 100 for k, v in pagerank.items()}
        
        self._pagerank_cache = pagerank
        
        # Person 객체에 반영
        for uid, pr in pagerank.items():
            if uid in self.persons:
                self.persons[uid].pagerank = pr
        
        return pagerank
    
    # ─── 시너지 점수 계산 ───
    
    def calculate_synergy(self, user_id: str) -> Dict[str, float]:
        """
        S(Synergy) 점수 계산
        
        S = S_blood + S_referral + S_group
        """
        if user_id not in self.persons:
            return {"s_blood": 0, "s_referral": 0, "s_group": 0, "s_total": 0}
        
        s_blood = 0.0
        s_referral = 0.0
        s_group = 0.0
        
        # 1. S_blood (가족 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.FAMILY:
                s_blood += RELATION_WEIGHTS[RelationType.FAMILY]
        
        # 2. S_referral (내가 소개한 사람 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.REFERRAL:
                s_referral += RELATION_WEIGHTS[RelationType.REFERRAL]
        
        # 3. S_group (3인 이상 동반 활동 횟수)
        group_count = 0
        for activity in self.activities:
            if user_id in activity.members and len(activity.members) >= 3:
                group_count += 1
        s_group = group_count * 20  # 동반 1회당 20점
        
        s_total = min(100, s_blood + s_referral + s_group)
        
        # Person 객체에 반영
        self.persons[user_id].s_score = s_total
        
        return {
            "s_blood": s_blood,
            "s_referral": s_referral,
            "s_group": s_group,
            "s_total": s_total,
        }
    
    def _find_relationship(self, source: str, target: str) -> Optional[Relationship]:
        """관계 찾기"""
        for rel in self.relationships:
            if rel.source_id == source and rel.target_id == target:
                return rel
            if rel.source_id == target and rel.target_id == source:
                return rel
        return None
    
    # ─── 여왕벌/킹핀 탐지 ───
    
    def find_queen_bees(self, top_n: int = 10) -> List[Tuple[Person, float]]:
        """
        가장 영향력 있는 사람(여왕벌/킹핀) 찾기
        
        Returns:
            [(Person, influence_score), ...]
        """
        pagerank = self.calculate_pagerank()
        
        # 연결 수 + PageRank 복합 점수
        scores: List[Tuple[Person, float]] = []
        for uid, person in self.persons.items():
            connections = len(self.adjacency.get(uid, [])) + len(self.reverse_adj.get(uid, []))
            pr = pagerank.get(uid, 0)
            
            # 복합 점수: PageRank 60% + 연결 수 40%
            influence = pr * 0.6 + (connections / max(len(self.persons), 1) * 100) * 0.4
            scores.append((person, influence))
        
        # 정렬
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_n]
    
    def get_hub_connections(self, user_id: str) -> Dict[str, Any]:
        """허브의 연결 정보"""
        if user_id not in self.persons:
            return {}
        
        connections: List[Dict[str, Any]] = []
        
        # 나가는 연결
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            target_person = self.persons.get(target)
            connections.append({
                "user_id": target,
                "name": target_person.name if target_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "outgoing",
            })
        
        # 들어오는 연결
        for source, weight in self.reverse_adj.get(user_id, []):
            if source == user_id:
                continue
            rel = self._find_relationship(source, user_id)
            source_person = self.persons.get(source)
            connections.append({
                "user_id": source,
                "name": source_person.name if source_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "incoming",
            })
        
        return {
            "user_id": user_id,
            "name": self.persons[user_id].name,
            "connection_count": len(connections),
            "connections": connections,
        }
    
    # ─── 클러스터 분석 ───
    
    def detect_clusters(self, min_size: int = 3) -> List[Cluster]:
        """
        커뮤니티/클러스터 탐지 (Connected Components)
        """
        if self._cluster_cache:
            return self._cluster_cache
        
        visited: Set[str] = set()
        clusters: List[Cluster] = []
        cluster_id = 0
        
        def bfs(start: str) -> Set[str]:
            """BFS로 연결된 컴포넌트 찾기"""
            component: Set[str] = set()
            queue = [start]
            
            while queue:
                node = queue.pop(0)
                if node in component:
                    continue
                component.add(node)
                
                # 양방향 탐색
                for neighbor, _ in self.adjacency.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
                for neighbor, _ in self.reverse_adj.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
            
            return component
        
        for uid in self.persons:
            if uid not in visited:
                component = bfs(uid)
                visited.update(component)
                
                if len(component) >= min_size:
                    # 클러스터 내 허브 찾기
                    members = list(component)
                    pagerank = self.calculate_pagerank()
                    
                    hub_id = max(members, key=lambda x: pagerank.get(x, 0))
                    
                    # 총 가치 계산
                    total_value = sum(
                        self.persons[m].total_spent 
                        for m in members if m in self.persons
                    )
                    
                    # 결속력 (내부 연결 / 가능한 최대 연결)
                    internal_edges = 0
                    for m in members:
                        for target, _ in self.adjacency.get(m, []):
                            if target in component:
                                internal_edges += 1
                    
                    max_edges = len(members) * (len(members) - 1)
                    cohesion = internal_edges / max_edges if max_edges > 0 else 0
                    
                    clusters.append(Cluster(
                        cluster_id=f"C{cluster_id}",
                        name=f"그룹 {cluster_id + 1}",
                        members=members,
                        hub_id=hub_id,
                        total_value=total_value,
                        cohesion=cohesion,
                    ))
                    
                    cluster_id += 1
        
        self._cluster_cache = clusters
        return clusters
    
    # ─── 이탈 영향 시뮬레이션 ───
    
    def simulate_churn_impact(self, user_id: str) -> Dict[str, Any]:
        """
        특정 사람이 이탈했을 때의 영향 시뮬레이션
        
        "이 사람이 떠나면 몇 명이 같이 나갈까?"
        """
        if user_id not in self.persons:
            return {"error": "User not found"}
        
        person = self.persons[user_id]
        
        # 직접 연결된 사람들
        direct_connections: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        
        for target, weight in self.adjacency.get(user_id, []):
            if target in self.persons and target not in seen_ids:
                seen_ids.add(target)
                direct_connections.append({
                    "user_id": target,
                    "name": self.persons[target].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.8),
                })
        
        for source, weight in self.reverse_adj.get(user_id, []):
            if source in self.persons and source != user_id and source not in seen_ids:
                seen_ids.add(source)
                direct_connections.append({
                    "user_id": source,
                    "name": self.persons[source].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.5),
                })
        
        # 예상 이탈자 수
        expected_churns = sum(c["churn_probability"] for c in direct_connections)
        
        # 예상 매출 손실
        revenue_loss = person.total_spent
        for conn in direct_connections:
            if conn["user_id"] in self.persons:
                revenue_loss += self.persons[conn["user_id"]].total_spent * conn["churn_probability"]
        
        return {
            "target_user": {
                "user_id": user_id,
                "name": person.name,
                "total_spent": person.total_spent,
                "pagerank": person.pagerank,
            },
            "direct_connections": len(direct_connections),
            "expected_churns": round(expected_churns, 1),
            "at_risk_users": direct_connections,
            "expected_revenue_loss": int(revenue_loss),
            "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
        }
    
    # ─── 통계 및 내보내기 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """네트워크 통계"""
        pagerank = self.calculate_pagerank()
        
        return {
            "total_persons": len(self.persons),
            "total_relationships": len(self.relationships),
            "total_activities": len(self.activities),
            "avg_connections": sum(len(v) for v in self.adjacency.values()) / max(len(self.persons), 1),
            "clusters": len(self.detect_clusters()),
            "top_influencer": max(pagerank.items(), key=lambda x: x[1])[0] if pagerank else None,
        }
    
    def export_graph_data(self) -> Dict[str, Any]:
        """시각화용 그래프 데이터 내보내기"""
        nodes: List[Dict[str, Any]] = []
        for uid, person in self.persons.items():
            nodes.append({
                "id": uid,
                "name": person.name,
                "m": person.m_score,
                "t": person.t_score,
                "s": person.s_score,
                "pagerank": person.pagerank,
                "total_spent": person.total_spent,
                "is_vip": person.is_vip,
                "is_risk": person.is_risk,
            })
        
        edges: List[Dict[str, Any]] = []
        for rel in self.relationships:
            edges.append({
                "source": rel.source_id,
                "target": rel.target_id,
                "type": rel.rel_type.value,
                "weight": rel.weight,
            })
        
        return {"nodes": nodes, "edges": edges}
    
    # ─── 저장/로드 ───
    
    def save(self, filepath: str) -> None:
        """저장"""
        data = {
            "persons": {uid: p.to_dict() for uid, p in self.persons.items()},
            "relationships": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "rel_type": r.rel_type.value,
                    "strength": r.strength,
                    "created_at": r.created_at,
                }
                for r in self.relationships
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str) -> None:
        """로드"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for uid, pdata in data.get("persons", {}).items():
            self.add_person(Person(
                user_id=uid,
                name=pdata.get("name", ""),
                m_score=pdata.get("m_score", 0),
                t_score=pdata.get("t_score", 0),
                total_spent=pdata.get("total_spent", 0),
            ))
        
        for rdata in data.get("relationships", []):
            self.add_relationship(Relationship(
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                rel_type=RelationType(rdata["rel_type"]),
                strength=rdata.get("strength", 1.0),
                created_at=rdata.get("created_at", ""),
            ))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 및 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_test_network() -> HumanNetworkEngine:
    """테스트용 네트워크 생성"""
    engine = HumanNetworkEngine()
    
    # 사람 추가
    people = [
        Person("kim", "김철수", "010-1111-1111", m_score=80, total_spent=5000000, is_vip=True),
        Person("lee", "이영희", "010-2222-2222", m_score=70, total_spent=3000000),
        Person("park", "박민수", "010-3333-3333", m_score=60, total_spent=2000000),
        Person("choi", "최지훈", "010-4444-4444", m_score=50, total_spent=1500000),
        Person("jung", "정수진", "010-5555-5555", m_score=40, total_spent=1000000),
        Person("kang", "강미영", "010-6666-6666", m_score=30, total_spent=800000),
        Person("cho", "조현우", "010-7777-7777", m_score=90, t_score=70, total_spent=8000000, is_risk=True),
    ]
    
    for p in people:
        engine.add_person(p)
    
    # 관계 추가
    relations = [
        Relationship("kim", "lee", RelationType.FAMILY, 5.0),
        Relationship("kim", "park", RelationType.REFERRAL, 4.0),
        Relationship("kim", "choi", RelationType.REFERRAL, 4.0),
        Relationship("park", "jung", RelationType.FRIEND, 2.0),
        Relationship("lee", "kang", RelationType.FAMILY, 5.0),
        Relationship("cho", "jung", RelationType.FRIEND, 2.0),
    ]
    
    for r in relations:
        engine.add_relationship(r)
    
    # 그룹 활동
    engine.add_activity(GroupActivity(
        activity_id="A1",
        members=["kim", "lee", "park", "choi"],
        station_id="RESTAURANT_01",
        activity_type="dining",
        timestamp=datetime.now().isoformat(),
    ))
    
    return engine


def run_demo() -> None:
    """데모 실행"""
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # 테스트 네트워크 생성
    engine = create_test_network()
    
    # PageRank 계산
    print("\n📊 PageRank 영향력 순위:")
    print("-" * 50)
    pagerank = engine.calculate_pagerank()
    for uid, pr in sorted(pagerank.items(), key=lambda x: x[1], reverse=True):
        person = engine.persons[uid]
        print(f"  {person.name}: {pr:.2f}점")
    
    # 여왕벌 탐지
    print("\n👑 TOP 3 여왕벌 (Queen Bee):")
    print("-" * 50)
    queens = engine.find_queen_bees(3)
    for i, (person, score) in enumerate(queens, 1):
        print(f"  {i}위: {person.name} (영향력: {score:.2f})")
        if i == 1:
            connections = len(engine.adjacency.get(person.user_id, []))
            print(f"      → 전략: 이 사람에게 '단체 회식권'을 주면 하위 {connections}명이 딸려옵니다.")
    
    # 시너지 계산
    print("\n❤️ 시너지(S) 점수:")
    print("-" * 50)
    for uid in ["kim", "cho"]:
        synergy = engine.calculate_synergy(uid)
        print(f"  {engine.persons[uid].name}: {synergy['s_total']:.0f}점")
        print(f"    - 혈연(S_blood): {synergy['s_blood']:.0f}")
        print(f"    - 소개(S_referral): {synergy['s_referral']:.0f}")
        print(f"    - 동반(S_group): {synergy['s_group']:.0f}")
    
    # 이탈 시뮬레이션
    print("\n🚨 이탈 영향 시뮬레이션 (김철수가 떠나면?):")
    print("-" * 50)
    impact = engine.simulate_churn_impact("kim")
    print(f"  직접 연결: {impact['direct_connections']}명")
    print(f"  예상 이탈: {impact['expected_churns']}명")
    print(f"  예상 매출 손실: ₩{impact['expected_revenue_loss']:,}")
    print(f"  리스크 수준: {impact['risk_level']}")
    
    # 통계
    print("\n📈 네트워크 통계:")
    print("-" * 50)
    stats = engine.get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    run_demo()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                                     ║
║                                                                                           ║
║  "시너지(S)는 시스템이 아니라, 사람과 사람 사이의 인력이다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 인간 관계 그래프 구축                                                                  ║
║  ✅ PageRank 기반 영향력 계산                                                              ║
║  ✅ 여왕벌(Queen Bee) / 킹핀(Kingpin) 탐지                                                 ║
║  ✅ 클러스터(커뮤니티) 분석                                                                ║
║  ✅ 이탈 영향도 시뮬레이션                                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

S(Synergy) 재정의:
- S_blood (혈연): 가족 수 (이탈 방지력)
- S_referral (소개): 신규 유입 기여 (확장력)  
- S_group (동반): 그룹 활동 빈도 (영향력)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set, Any
from enum import Enum
from datetime import datetime
import json
import math
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관계 유형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class RelationType(str, Enum):
    FAMILY = "FAMILY"       # 가족 (강도 5) - 운명 공동체
    REFERRAL = "REFERRAL"   # 소개 (강도 4) - 내가 데려온 사람
    FRIEND = "FRIEND"       # 친구 (강도 2) - 동반 방문
    GROUP = "GROUP"         # 그룹 (강도 3) - 모임 멤버
    COUPLE = "COUPLE"       # 커플 (강도 4) - 연인


# 관계별 가중치
RELATION_WEIGHTS: Dict[RelationType, float] = {
    RelationType.FAMILY: 5.0,
    RelationType.REFERRAL: 4.0,
    RelationType.COUPLE: 4.0,
    RelationType.GROUP: 3.0,
    RelationType.FRIEND: 2.0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Person:
    """사람 노드"""
    user_id: str
    name: str
    phone: str = ""
    m_score: float = 0.0  # 매출 점수
    t_score: float = 0.0  # 리스크 점수
    s_score: float = 0.0  # 시너지 점수 (계산됨)
    pagerank: float = 0.0  # PageRank 점수
    station_id: str = ""
    total_spent: int = 0
    visit_count: int = 0
    is_vip: bool = False
    is_risk: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "name": self.name,
            "phone": self.phone,
            "m_score": self.m_score,
            "t_score": self.t_score,
            "s_score": self.s_score,
            "pagerank": self.pagerank,
            "total_spent": self.total_spent,
            "visit_count": self.visit_count,
            "is_vip": self.is_vip,
            "is_risk": self.is_risk,
        }


@dataclass
class Relationship:
    """관계 엣지"""
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0  # 1~5
    created_at: str = ""
    
    @property
    def weight(self) -> float:
        base = RELATION_WEIGHTS.get(self.rel_type, 1.0)
        return base * self.strength


@dataclass
class GroupActivity:
    """그룹 활동 기록"""
    activity_id: str
    members: List[str]  # user_ids
    station_id: str
    activity_type: str  # "dining", "class", "workout"
    timestamp: str


@dataclass
class Cluster:
    """커뮤니티/클러스터"""
    cluster_id: str
    name: str
    members: List[str]
    hub_id: str  # 중심 인물
    total_value: float  # 총 가치
    cohesion: float  # 결속력 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Human Network Engine
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HumanNetworkEngine:
    """
    인간 관계 네트워크 분석 엔진
    
    - 그래프 기반 관계 모델링
    - PageRank 영향력 계산
    - 클러스터(커뮤니티) 탐지
    - 이탈 영향 시뮬레이션
    """
    
    def __init__(self):
        self.persons: Dict[str, Person] = {}
        self.relationships: List[Relationship] = []
        self.activities: List[GroupActivity] = []
        
        # 그래프 구조
        self.adjacency: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        self.reverse_adj: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
        
        # 캐시
        self._pagerank_cache: Dict[str, float] = {}
        self._cluster_cache: List[Cluster] = []
    
    # ─── 데이터 관리 ───
    
    def add_person(self, person: Person) -> None:
        """사람 추가"""
        self.persons[person.user_id] = person
        self._invalidate_cache()
    
    def add_relationship(self, rel: Relationship) -> None:
        """관계 추가"""
        self.relationships.append(rel)
        self.adjacency[rel.source_id].append((rel.target_id, rel.weight))
        self.reverse_adj[rel.target_id].append((rel.source_id, rel.weight))
        self._invalidate_cache()
    
    def add_activity(self, activity: GroupActivity) -> None:
        """그룹 활동 추가"""
        self.activities.append(activity)
        
        # 그룹 멤버 간 FRIEND 관계 자동 생성
        for i, m1 in enumerate(activity.members):
            for m2 in activity.members[i+1:]:
                # 이미 관계가 있으면 스킵
                existing = self._has_relationship(m1, m2)
                if not existing:
                    self.add_relationship(Relationship(
                        source_id=m1,
                        target_id=m2,
                        rel_type=RelationType.FRIEND,
                        strength=1.0,
                        created_at=activity.timestamp,
                    ))
    
    def _has_relationship(self, id1: str, id2: str) -> bool:
        """관계 존재 여부"""
        for target, _ in self.adjacency.get(id1, []):
            if target == id2:
                return True
        for target, _ in self.adjacency.get(id2, []):
            if target == id1:
                return True
        return False
    
    def _invalidate_cache(self) -> None:
        """캐시 무효화"""
        self._pagerank_cache = {}
        self._cluster_cache = []
    
    # ─── PageRank 계산 ───
    
    def calculate_pagerank(self, damping: float = 0.85, iterations: int = 100) -> Dict[str, float]:
        """
        PageRank 알고리즘으로 영향력 계산
        
        중요한 사람과 연결될수록 점수가 높아짐
        """
        if self._pagerank_cache:
            return self._pagerank_cache
        
        n = len(self.persons)
        if n == 0:
            return {}
        
        # 초기화
        pagerank: Dict[str, float] = {uid: 1.0 / n for uid in self.persons}
        
        for _ in range(iterations):
            new_pr: Dict[str, float] = {}
            
            for uid in self.persons:
                # 나를 가리키는 사람들의 PR 합산
                incoming_pr = 0.0
                
                for source_id, weight in self.reverse_adj.get(uid, []):
                    if source_id in pagerank:
                        # 나가는 링크 수로 나눔
                        outgoing = len(self.adjacency.get(source_id, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source_id] * weight) / outgoing
                
                # PageRank 공식
                new_pr[uid] = (1 - damping) / n + damping * incoming_pr
            
            pagerank = new_pr
        
        # 정규화 (0~100)
        max_pr = max(pagerank.values()) if pagerank else 1
        pagerank = {k: (v / max_pr) * 100 for k, v in pagerank.items()}
        
        self._pagerank_cache = pagerank
        
        # Person 객체에 반영
        for uid, pr in pagerank.items():
            if uid in self.persons:
                self.persons[uid].pagerank = pr
        
        return pagerank
    
    # ─── 시너지 점수 계산 ───
    
    def calculate_synergy(self, user_id: str) -> Dict[str, float]:
        """
        S(Synergy) 점수 계산
        
        S = S_blood + S_referral + S_group
        """
        if user_id not in self.persons:
            return {"s_blood": 0, "s_referral": 0, "s_group": 0, "s_total": 0}
        
        s_blood = 0.0
        s_referral = 0.0
        s_group = 0.0
        
        # 1. S_blood (가족 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.FAMILY:
                s_blood += RELATION_WEIGHTS[RelationType.FAMILY]
        
        # 2. S_referral (내가 소개한 사람 수)
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            if rel and rel.rel_type == RelationType.REFERRAL:
                s_referral += RELATION_WEIGHTS[RelationType.REFERRAL]
        
        # 3. S_group (3인 이상 동반 활동 횟수)
        group_count = 0
        for activity in self.activities:
            if user_id in activity.members and len(activity.members) >= 3:
                group_count += 1
        s_group = group_count * 20  # 동반 1회당 20점
        
        s_total = min(100, s_blood + s_referral + s_group)
        
        # Person 객체에 반영
        self.persons[user_id].s_score = s_total
        
        return {
            "s_blood": s_blood,
            "s_referral": s_referral,
            "s_group": s_group,
            "s_total": s_total,
        }
    
    def _find_relationship(self, source: str, target: str) -> Optional[Relationship]:
        """관계 찾기"""
        for rel in self.relationships:
            if rel.source_id == source and rel.target_id == target:
                return rel
            if rel.source_id == target and rel.target_id == source:
                return rel
        return None
    
    # ─── 여왕벌/킹핀 탐지 ───
    
    def find_queen_bees(self, top_n: int = 10) -> List[Tuple[Person, float]]:
        """
        가장 영향력 있는 사람(여왕벌/킹핀) 찾기
        
        Returns:
            [(Person, influence_score), ...]
        """
        pagerank = self.calculate_pagerank()
        
        # 연결 수 + PageRank 복합 점수
        scores: List[Tuple[Person, float]] = []
        for uid, person in self.persons.items():
            connections = len(self.adjacency.get(uid, [])) + len(self.reverse_adj.get(uid, []))
            pr = pagerank.get(uid, 0)
            
            # 복합 점수: PageRank 60% + 연결 수 40%
            influence = pr * 0.6 + (connections / max(len(self.persons), 1) * 100) * 0.4
            scores.append((person, influence))
        
        # 정렬
        scores.sort(key=lambda x: x[1], reverse=True)
        
        return scores[:top_n]
    
    def get_hub_connections(self, user_id: str) -> Dict[str, Any]:
        """허브의 연결 정보"""
        if user_id not in self.persons:
            return {}
        
        connections: List[Dict[str, Any]] = []
        
        # 나가는 연결
        for target, weight in self.adjacency.get(user_id, []):
            rel = self._find_relationship(user_id, target)
            target_person = self.persons.get(target)
            connections.append({
                "user_id": target,
                "name": target_person.name if target_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "outgoing",
            })
        
        # 들어오는 연결
        for source, weight in self.reverse_adj.get(user_id, []):
            if source == user_id:
                continue
            rel = self._find_relationship(source, user_id)
            source_person = self.persons.get(source)
            connections.append({
                "user_id": source,
                "name": source_person.name if source_person else "Unknown",
                "rel_type": rel.rel_type.value if rel else "UNKNOWN",
                "weight": weight,
                "direction": "incoming",
            })
        
        return {
            "user_id": user_id,
            "name": self.persons[user_id].name,
            "connection_count": len(connections),
            "connections": connections,
        }
    
    # ─── 클러스터 분석 ───
    
    def detect_clusters(self, min_size: int = 3) -> List[Cluster]:
        """
        커뮤니티/클러스터 탐지 (Connected Components)
        """
        if self._cluster_cache:
            return self._cluster_cache
        
        visited: Set[str] = set()
        clusters: List[Cluster] = []
        cluster_id = 0
        
        def bfs(start: str) -> Set[str]:
            """BFS로 연결된 컴포넌트 찾기"""
            component: Set[str] = set()
            queue = [start]
            
            while queue:
                node = queue.pop(0)
                if node in component:
                    continue
                component.add(node)
                
                # 양방향 탐색
                for neighbor, _ in self.adjacency.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
                for neighbor, _ in self.reverse_adj.get(node, []):
                    if neighbor not in component:
                        queue.append(neighbor)
            
            return component
        
        for uid in self.persons:
            if uid not in visited:
                component = bfs(uid)
                visited.update(component)
                
                if len(component) >= min_size:
                    # 클러스터 내 허브 찾기
                    members = list(component)
                    pagerank = self.calculate_pagerank()
                    
                    hub_id = max(members, key=lambda x: pagerank.get(x, 0))
                    
                    # 총 가치 계산
                    total_value = sum(
                        self.persons[m].total_spent 
                        for m in members if m in self.persons
                    )
                    
                    # 결속력 (내부 연결 / 가능한 최대 연결)
                    internal_edges = 0
                    for m in members:
                        for target, _ in self.adjacency.get(m, []):
                            if target in component:
                                internal_edges += 1
                    
                    max_edges = len(members) * (len(members) - 1)
                    cohesion = internal_edges / max_edges if max_edges > 0 else 0
                    
                    clusters.append(Cluster(
                        cluster_id=f"C{cluster_id}",
                        name=f"그룹 {cluster_id + 1}",
                        members=members,
                        hub_id=hub_id,
                        total_value=total_value,
                        cohesion=cohesion,
                    ))
                    
                    cluster_id += 1
        
        self._cluster_cache = clusters
        return clusters
    
    # ─── 이탈 영향 시뮬레이션 ───
    
    def simulate_churn_impact(self, user_id: str) -> Dict[str, Any]:
        """
        특정 사람이 이탈했을 때의 영향 시뮬레이션
        
        "이 사람이 떠나면 몇 명이 같이 나갈까?"
        """
        if user_id not in self.persons:
            return {"error": "User not found"}
        
        person = self.persons[user_id]
        
        # 직접 연결된 사람들
        direct_connections: List[Dict[str, Any]] = []
        seen_ids: Set[str] = set()
        
        for target, weight in self.adjacency.get(user_id, []):
            if target in self.persons and target not in seen_ids:
                seen_ids.add(target)
                direct_connections.append({
                    "user_id": target,
                    "name": self.persons[target].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.8),
                })
        
        for source, weight in self.reverse_adj.get(user_id, []):
            if source in self.persons and source != user_id and source not in seen_ids:
                seen_ids.add(source)
                direct_connections.append({
                    "user_id": source,
                    "name": self.persons[source].name,
                    "weight": weight,
                    "churn_probability": min(1.0, weight / 5.0 * 0.5),
                })
        
        # 예상 이탈자 수
        expected_churns = sum(c["churn_probability"] for c in direct_connections)
        
        # 예상 매출 손실
        revenue_loss = person.total_spent
        for conn in direct_connections:
            if conn["user_id"] in self.persons:
                revenue_loss += self.persons[conn["user_id"]].total_spent * conn["churn_probability"]
        
        return {
            "target_user": {
                "user_id": user_id,
                "name": person.name,
                "total_spent": person.total_spent,
                "pagerank": person.pagerank,
            },
            "direct_connections": len(direct_connections),
            "expected_churns": round(expected_churns, 1),
            "at_risk_users": direct_connections,
            "expected_revenue_loss": int(revenue_loss),
            "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
        }
    
    # ─── 통계 및 내보내기 ───
    
    def get_stats(self) -> Dict[str, Any]:
        """네트워크 통계"""
        pagerank = self.calculate_pagerank()
        
        return {
            "total_persons": len(self.persons),
            "total_relationships": len(self.relationships),
            "total_activities": len(self.activities),
            "avg_connections": sum(len(v) for v in self.adjacency.values()) / max(len(self.persons), 1),
            "clusters": len(self.detect_clusters()),
            "top_influencer": max(pagerank.items(), key=lambda x: x[1])[0] if pagerank else None,
        }
    
    def export_graph_data(self) -> Dict[str, Any]:
        """시각화용 그래프 데이터 내보내기"""
        nodes: List[Dict[str, Any]] = []
        for uid, person in self.persons.items():
            nodes.append({
                "id": uid,
                "name": person.name,
                "m": person.m_score,
                "t": person.t_score,
                "s": person.s_score,
                "pagerank": person.pagerank,
                "total_spent": person.total_spent,
                "is_vip": person.is_vip,
                "is_risk": person.is_risk,
            })
        
        edges: List[Dict[str, Any]] = []
        for rel in self.relationships:
            edges.append({
                "source": rel.source_id,
                "target": rel.target_id,
                "type": rel.rel_type.value,
                "weight": rel.weight,
            })
        
        return {"nodes": nodes, "edges": edges}
    
    # ─── 저장/로드 ───
    
    def save(self, filepath: str) -> None:
        """저장"""
        data = {
            "persons": {uid: p.to_dict() for uid, p in self.persons.items()},
            "relationships": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "rel_type": r.rel_type.value,
                    "strength": r.strength,
                    "created_at": r.created_at,
                }
                for r in self.relationships
            ],
        }
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self, filepath: str) -> None:
        """로드"""
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for uid, pdata in data.get("persons", {}).items():
            self.add_person(Person(
                user_id=uid,
                name=pdata.get("name", ""),
                m_score=pdata.get("m_score", 0),
                t_score=pdata.get("t_score", 0),
                total_spent=pdata.get("total_spent", 0),
            ))
        
        for rdata in data.get("relationships", []):
            self.add_relationship(Relationship(
                source_id=rdata["source_id"],
                target_id=rdata["target_id"],
                rel_type=RelationType(rdata["rel_type"]),
                strength=rdata.get("strength", 1.0),
                created_at=rdata.get("created_at", ""),
            ))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 및 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_test_network() -> HumanNetworkEngine:
    """테스트용 네트워크 생성"""
    engine = HumanNetworkEngine()
    
    # 사람 추가
    people = [
        Person("kim", "김철수", "010-1111-1111", m_score=80, total_spent=5000000, is_vip=True),
        Person("lee", "이영희", "010-2222-2222", m_score=70, total_spent=3000000),
        Person("park", "박민수", "010-3333-3333", m_score=60, total_spent=2000000),
        Person("choi", "최지훈", "010-4444-4444", m_score=50, total_spent=1500000),
        Person("jung", "정수진", "010-5555-5555", m_score=40, total_spent=1000000),
        Person("kang", "강미영", "010-6666-6666", m_score=30, total_spent=800000),
        Person("cho", "조현우", "010-7777-7777", m_score=90, t_score=70, total_spent=8000000, is_risk=True),
    ]
    
    for p in people:
        engine.add_person(p)
    
    # 관계 추가
    relations = [
        Relationship("kim", "lee", RelationType.FAMILY, 5.0),
        Relationship("kim", "park", RelationType.REFERRAL, 4.0),
        Relationship("kim", "choi", RelationType.REFERRAL, 4.0),
        Relationship("park", "jung", RelationType.FRIEND, 2.0),
        Relationship("lee", "kang", RelationType.FAMILY, 5.0),
        Relationship("cho", "jung", RelationType.FRIEND, 2.0),
    ]
    
    for r in relations:
        engine.add_relationship(r)
    
    # 그룹 활동
    engine.add_activity(GroupActivity(
        activity_id="A1",
        members=["kim", "lee", "park", "choi"],
        station_id="RESTAURANT_01",
        activity_type="dining",
        timestamp=datetime.now().isoformat(),
    ))
    
    return engine


def run_demo() -> None:
    """데모 실행"""
    print("""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    🕸️ AUTUS HUMAN NETWORK ENGINE v2.0                         ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    # 테스트 네트워크 생성
    engine = create_test_network()
    
    # PageRank 계산
    print("\n📊 PageRank 영향력 순위:")
    print("-" * 50)
    pagerank = engine.calculate_pagerank()
    for uid, pr in sorted(pagerank.items(), key=lambda x: x[1], reverse=True):
        person = engine.persons[uid]
        print(f"  {person.name}: {pr:.2f}점")
    
    # 여왕벌 탐지
    print("\n👑 TOP 3 여왕벌 (Queen Bee):")
    print("-" * 50)
    queens = engine.find_queen_bees(3)
    for i, (person, score) in enumerate(queens, 1):
        print(f"  {i}위: {person.name} (영향력: {score:.2f})")
        if i == 1:
            connections = len(engine.adjacency.get(person.user_id, []))
            print(f"      → 전략: 이 사람에게 '단체 회식권'을 주면 하위 {connections}명이 딸려옵니다.")
    
    # 시너지 계산
    print("\n❤️ 시너지(S) 점수:")
    print("-" * 50)
    for uid in ["kim", "cho"]:
        synergy = engine.calculate_synergy(uid)
        print(f"  {engine.persons[uid].name}: {synergy['s_total']:.0f}점")
        print(f"    - 혈연(S_blood): {synergy['s_blood']:.0f}")
        print(f"    - 소개(S_referral): {synergy['s_referral']:.0f}")
        print(f"    - 동반(S_group): {synergy['s_group']:.0f}")
    
    # 이탈 시뮬레이션
    print("\n🚨 이탈 영향 시뮬레이션 (김철수가 떠나면?):")
    print("-" * 50)
    impact = engine.simulate_churn_impact("kim")
    print(f"  직접 연결: {impact['direct_connections']}명")
    print(f"  예상 이탈: {impact['expected_churns']}명")
    print(f"  예상 매출 손실: ₩{impact['expected_revenue_loss']:,}")
    print(f"  리스크 수준: {impact['risk_level']}")
    
    # 통계
    print("\n📈 네트워크 통계:")
    print("-" * 50)
    stats = engine.get_stats()
    for k, v in stats.items():
        print(f"  {k}: {v}")


if __name__ == "__main__":
    run_demo()
























