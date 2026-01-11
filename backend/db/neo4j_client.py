"""
AUTUS Neo4j Client - 그래프 데이터베이스 연동

Neo4j 스키마:
- (p:Person) - 인물/엔티티 노드
- (e:Entity) - 기관/조직 노드
- [:FLOW] - 자금 흐름 관계
- [:CONTROLS] - 지배 관계
- [:OWNS] - 소유 관계
- [:BELONGS_TO] - 계층 관계

환경 변수:
- NEO4J_URI: bolt://localhost:7687
- NEO4J_USER: neo4j
- NEO4J_PASSWORD: password
"""

import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

# Neo4j는 옵션 (설치되지 않아도 동작)
try:
    from neo4j import GraphDatabase
    NEO4J_AVAILABLE = True
except ImportError:
    NEO4J_AVAILABLE = False
    GraphDatabase = None


@dataclass
class PersonNode:
    """Person 노드"""
    id: str
    name: str
    level: str = "L4"
    lat: float = 0.0
    lng: float = 0.0
    ki_score: float = 0.0
    rank: str = "Terminal"
    sector: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "level": self.level,
            "lat": self.lat,
            "lng": self.lng,
            "ki_score": self.ki_score,
            "rank": self.rank,
            "sector": self.sector,
        }


@dataclass
class FlowRelation:
    """Flow 관계"""
    id: str
    source_id: str
    target_id: str
    amount: float
    flow_type: str = "trade"
    timestamp: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "amount": self.amount,
            "flow_type": self.flow_type,
            "timestamp": self.timestamp,
        }


class Neo4jClient:
    """
    Neo4j 그래프 데이터베이스 클라이언트
    """
    
    def __init__(
        self,
        uri: str = None,
        user: str = None,
        password: str = None,
    ):
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "password")
        self.driver = None
        self._connected = False
        
        if NEO4J_AVAILABLE:
            try:
                self.driver = GraphDatabase.driver(
                    self.uri,
                    auth=(self.user, self.password)
                )
                self._connected = True
            except Exception as e:
                print(f"⚠️ Neo4j 연결 실패: {e}")
    
    @property
    def is_connected(self) -> bool:
        return self._connected and self.driver is not None
    
    def close(self) -> None:
        """연결 종료"""
        if self.driver:
            self.driver.close()
            self._connected = False
    
    def execute(self, query: str, params: Dict = None) -> List[Dict]:
        """쿼리 실행"""
        if not self.is_connected:
            return []
        
        with self.driver.session() as session:
            result = session.run(query, params or {})
            return result.data()
    
    # ═══════════════════════════════════════════════════════════════
    # Schema 초기화
    # ═══════════════════════════════════════════════════════════════
    
    def init_schema(self) -> bool:
        """스키마 및 인덱스 초기화"""
        if not self.is_connected:
            return False
        
        queries = [
            # 인덱스 생성
            "CREATE INDEX person_id IF NOT EXISTS FOR (p:Person) ON (p.id)",
            "CREATE INDEX person_level IF NOT EXISTS FOR (p:Person) ON (p.level)",
            "CREATE INDEX entity_id IF NOT EXISTS FOR (e:Entity) ON (e.id)",
            # 제약조건
            "CREATE CONSTRAINT person_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE",
        ]
        
        for query in queries:
            try:
                self.execute(query)
            except Exception as e:
                print(f"⚠️ 스키마 초기화 경고: {e}")
        
        return True
    
    # ═══════════════════════════════════════════════════════════════
    # Person CRUD
    # ═══════════════════════════════════════════════════════════════
    
    def create_person(self, person: PersonNode) -> bool:
        """Person 노드 생성/업데이트"""
        query = """
        MERGE (p:Person {id: $id})
        SET p.name = $name,
            p.level = $level,
            p.lat = $lat,
            p.lng = $lng,
            p.ki_score = $ki_score,
            p.rank = $rank,
            p.sector = $sector
        """
        try:
            self.execute(query, person.to_dict())
            return True
        except Exception:
            return False
    
    def get_person(self, person_id: str) -> Optional[Dict]:
        """Person 노드 조회"""
        query = "MATCH (p:Person {id: $id}) RETURN p"
        result = self.execute(query, {"id": person_id})
        return result[0]["p"] if result else None
    
    def delete_person(self, person_id: str) -> bool:
        """Person 노드 삭제"""
        query = """
        MATCH (p:Person {id: $id})
        DETACH DELETE p
        """
        try:
            self.execute(query, {"id": person_id})
            return True
        except Exception:
            return False
    
    def get_all_persons(self, level: str = None, limit: int = 100) -> List[Dict]:
        """전체 Person 조회"""
        if level:
            query = """
            MATCH (p:Person {level: $level})
            RETURN p
            ORDER BY p.ki_score DESC
            LIMIT $limit
            """
            return self.execute(query, {"level": level, "limit": limit})
        else:
            query = """
            MATCH (p:Person)
            RETURN p
            ORDER BY p.ki_score DESC
            LIMIT $limit
            """
            return self.execute(query, {"limit": limit})
    
    # ═══════════════════════════════════════════════════════════════
    # Flow CRUD
    # ═══════════════════════════════════════════════════════════════
    
    def create_flow(self, flow: FlowRelation) -> bool:
        """Flow 관계 생성"""
        query = """
        MATCH (s:Person {id: $source_id}), (t:Person {id: $target_id})
        MERGE (s)-[r:FLOW {id: $id}]->(t)
        SET r.amount = $amount,
            r.flow_type = $flow_type,
            r.timestamp = $timestamp
        """
        try:
            self.execute(query, flow.to_dict())
            return True
        except Exception:
            return False
    
    def get_flows(self, source_id: str = None, target_id: str = None) -> List[Dict]:
        """Flow 조회"""
        if source_id and target_id:
            query = """
            MATCH (s:Person {id: $source})-[r:FLOW]->(t:Person {id: $target})
            RETURN r, s.id as source, t.id as target
            """
            return self.execute(query, {"source": source_id, "target": target_id})
        elif source_id:
            query = """
            MATCH (s:Person {id: $source})-[r:FLOW]->(t:Person)
            RETURN r, s.id as source, t.id as target
            """
            return self.execute(query, {"source": source_id})
        elif target_id:
            query = """
            MATCH (s:Person)-[r:FLOW]->(t:Person {id: $target})
            RETURN r, s.id as source, t.id as target
            """
            return self.execute(query, {"target": target_id})
        else:
            query = """
            MATCH (s:Person)-[r:FLOW]->(t:Person)
            RETURN r, s.id as source, t.id as target
            LIMIT 100
            """
            return self.execute(query)
    
    def delete_flow(self, flow_id: str) -> bool:
        """Flow 삭제"""
        query = """
        MATCH ()-[r:FLOW {id: $id}]->()
        DELETE r
        """
        try:
            self.execute(query, {"id": flow_id})
            return True
        except Exception:
            return False
    
    # ═══════════════════════════════════════════════════════════════
    # 계층 관계
    # ═══════════════════════════════════════════════════════════════
    
    def create_belongs_to(self, child_id: str, parent_id: str) -> bool:
        """계층 관계 생성"""
        query = """
        MATCH (c:Person {id: $child}), (p:Person {id: $parent})
        MERGE (c)-[:BELONGS_TO]->(p)
        """
        try:
            self.execute(query, {"child": child_id, "parent": parent_id})
            return True
        except Exception:
            return False
    
    def get_children(self, parent_id: str) -> List[Dict]:
        """하위 노드 조회"""
        query = """
        MATCH (c:Person)-[:BELONGS_TO]->(p:Person {id: $id})
        RETURN c
        ORDER BY c.ki_score DESC
        """
        return self.execute(query, {"id": parent_id})
    
    def get_parent(self, child_id: str) -> Optional[Dict]:
        """상위 노드 조회"""
        query = """
        MATCH (c:Person {id: $id})-[:BELONGS_TO]->(p:Person)
        RETURN p
        """
        result = self.execute(query, {"id": child_id})
        return result[0]["p"] if result else None
    
    def get_path_to_root(self, node_id: str) -> List[Dict]:
        """최상위까지 경로"""
        query = """
        MATCH path = (n:Person {id: $id})-[:BELONGS_TO*0..10]->(root:Person)
        WHERE NOT (root)-[:BELONGS_TO]->()
        RETURN [node IN nodes(path) | node] as path
        """
        result = self.execute(query, {"id": node_id})
        return result[0]["path"] if result else []
    
    # ═══════════════════════════════════════════════════════════════
    # 경로 탐색
    # ═══════════════════════════════════════════════════════════════
    
    def find_shortest_path(
        self,
        source_id: str,
        target_id: str,
        max_hops: int = 10,
    ) -> Dict:
        """최단 경로 (FLOW 관계)"""
        query = """
        MATCH path = shortestPath(
            (s:Person {id: $source})-[:FLOW*1..$max]->(t:Person {id: $target})
        )
        RETURN [n IN nodes(path) | n.id] AS node_ids,
               [r IN relationships(path) | {
                   amount: r.amount,
                   type: r.flow_type
               }] AS flows,
               length(path) AS hops
        """
        result = self.execute(query, {
            "source": source_id,
            "target": target_id,
            "max": max_hops,
        })
        
        if result:
            return {
                "found": True,
                "nodes": result[0]["node_ids"],
                "flows": result[0]["flows"],
                "hops": result[0]["hops"],
            }
        return {"found": False, "nodes": [], "flows": [], "hops": 0}
    
    def find_all_paths(
        self,
        source_id: str,
        target_id: str,
        max_hops: int = 5,
        limit: int = 10,
    ) -> List[Dict]:
        """모든 경로"""
        query = """
        MATCH path = (s:Person {id: $source})-[:FLOW*1..$max]->(t:Person {id: $target})
        RETURN [n IN nodes(path) | n.id] AS node_ids,
               [r IN relationships(path) | {
                   amount: r.amount,
                   type: r.flow_type
               }] AS flows,
               length(path) AS hops,
               reduce(total = 0, r IN relationships(path) | total + r.amount) AS total_amount
        ORDER BY total_amount DESC
        LIMIT $limit
        """
        return self.execute(query, {
            "source": source_id,
            "target": target_id,
            "max": max_hops,
            "limit": limit,
        })
    
    # ═══════════════════════════════════════════════════════════════
    # Keyman 탐색
    # ═══════════════════════════════════════════════════════════════
    
    def find_top_keyman(self, level: str = None, n: int = 10) -> List[Dict]:
        """TOP N Keyman"""
        if level:
            query = """
            MATCH (p:Person {level: $level})
            OPTIONAL MATCH (p)-[r:FLOW]-()
            WITH p, count(r) as connections, coalesce(sum(r.amount), 0) as total_flow
            RETURN p.id as id, p.name as name, p.ki_score as ki_score,
                   connections, total_flow
            ORDER BY p.ki_score DESC
            LIMIT $n
            """
            return self.execute(query, {"level": level, "n": n})
        else:
            query = """
            MATCH (p:Person)
            OPTIONAL MATCH (p)-[r:FLOW]-()
            WITH p, count(r) as connections, coalesce(sum(r.amount), 0) as total_flow
            RETURN p.id as id, p.name as name, p.ki_score as ki_score,
                   connections, total_flow
            ORDER BY p.ki_score DESC
            LIMIT $n
            """
            return self.execute(query, {"n": n})
    
    def find_bottlenecks(self) -> List[Dict]:
        """병목 노드 탐색"""
        query = """
        MATCH (p:Person)
        OPTIONAL MATCH (a:Person)-[:FLOW]->(p)-[:FLOW]->(b:Person)
        WHERE a <> b
        WITH p, 
             count(DISTINCT a) as in_nodes, 
             count(DISTINCT b) as out_nodes
        WHERE in_nodes > 2 AND out_nodes > 2
        RETURN p.id as id, p.name as name, 
               in_nodes, out_nodes, 
               (in_nodes + out_nodes) as bridge_score
        ORDER BY bridge_score DESC
        """
        return self.execute(query)
    
    # ═══════════════════════════════════════════════════════════════
    # 통계
    # ═══════════════════════════════════════════════════════════════
    
    def get_stats(self) -> Dict:
        """전체 통계"""
        queries = {
            "person_count": "MATCH (p:Person) RETURN count(p) as count",
            "flow_count": "MATCH ()-[r:FLOW]->() RETURN count(r) as count",
            "total_flow": "MATCH ()-[r:FLOW]->() RETURN coalesce(sum(r.amount), 0) as total",
        }
        
        stats = {}
        for key, query in queries.items():
            result = self.execute(query)
            if result:
                stats[key] = result[0].get("count") or result[0].get("total", 0)
            else:
                stats[key] = 0
        
        return stats


# 싱글톤 인스턴스
_neo4j_client: Optional[Neo4jClient] = None


def get_neo4j_client() -> Neo4jClient:
    """Neo4j 클라이언트 싱글톤"""
    global _neo4j_client
    if _neo4j_client is None:
        _neo4j_client = Neo4jClient()
    return _neo4j_client

