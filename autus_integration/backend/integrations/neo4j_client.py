"""
Neo4j 클라이언트
그래프 DB 연동 (노드/모션/시너지)
"""

from neo4j import GraphDatabase
from typing import Dict, List, Any, Optional
from datetime import datetime
import os


class Neo4jClient:
    """
    Neo4j 그래프 데이터베이스 클라이언트
    
    스키마:
    - Node: external_id, source, value, direct_money, synergy
    - FLOW: amount, direction, fee, created_at
    """
    
    def __init__(self):
        self._driver = None
        self._uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self._user = os.getenv("NEO4J_USER", "neo4j")
        self._password = os.getenv("NEO4J_PASSWORD", "password")
    
    @property
    def driver(self):
        if self._driver is None:
            self._driver = GraphDatabase.driver(
                self._uri,
                auth=(self._user, self._password)
            )
        return self._driver
    
    def close(self):
        if self._driver:
            self._driver.close()
            self._driver = None
    
    def is_connected(self) -> bool:
        try:
            with self.driver.session() as session:
                session.run("RETURN 1")
            return True
        except:
            return False
    
    def upsert_node(self, external_id: str, source: str = "unknown") -> Dict:
        """
        노드 생성 또는 업데이트 (Upsert)
        
        Zero Meaning: external_id만 저장, 이름/이메일 없음
        """
        query = """
        MERGE (n:Node {external_id: $external_id})
        ON CREATE SET 
            n.source = $source,
            n.value = 0,
            n.direct_money = 0,
            n.synergy = 0,
            n.created_at = datetime()
        ON MATCH SET 
            n.updated_at = datetime()
        RETURN n.external_id as id, n.value as value, n.source as source
        """
        
        with self.driver.session() as session:
            result = session.run(query, external_id=external_id, source=source)
            record = result.single()
            return dict(record) if record else {}
    
    def create_motion(
        self,
        source_id: str,
        target_id: str,
        amount: float,
        direction: str = "inflow",
        fee: float = 0
    ) -> Dict:
        """
        모션(돈 흐름) 생성
        
        direction:
        - inflow: source → target (고객 → owner)
        - outflow: source → target (owner → 고객)
        """
        # 노드 먼저 확인/생성
        self.upsert_node(source_id)
        self.upsert_node(target_id)
        
        query = """
        MATCH (source:Node {external_id: $source_id})
        MATCH (target:Node {external_id: $target_id})
        CREATE (source)-[f:FLOW {
            amount: $amount,
            direction: $direction,
            fee: $fee,
            created_at: datetime()
        }]->(target)
        
        // 직접 돈 업데이트
        WITH source, target, f
        SET source.direct_money = CASE 
            WHEN $direction = 'outflow' THEN source.direct_money - $amount
            ELSE source.direct_money
        END
        SET target.direct_money = CASE 
            WHEN $direction = 'inflow' THEN target.direct_money + $amount
            ELSE target.direct_money
        END
        
        RETURN f.amount as amount, f.direction as direction
        """
        
        with self.driver.session() as session:
            result = session.run(
                query,
                source_id=source_id,
                target_id=target_id,
                amount=amount,
                direction=direction,
                fee=fee
            )
            record = result.single()
            return dict(record) if record else {}
    
    def recalculate_value(self, external_id: str) -> Dict:
        """
        노드 가치 재계산
        
        공식: V = M - T + S
        - M: 직접 돈 (direct_money)
        - T: 시간 비용 (time_cost)
        - S: 시너지 (연결 노드 가치의 10%)
        """
        query = """
        MATCH (n:Node {external_id: $external_id})
        
        // 시너지 계산: 연결된 노드 가치 합계의 10%
        OPTIONAL MATCH (n)-[:FLOW]-(connected:Node)
        WHERE connected.external_id <> 'owner' AND connected <> n
        WITH n, COALESCE(SUM(DISTINCT connected.direct_money) * 0.1, 0) as synergy
        
        // 가치 업데이트: V = M + S (시간비용은 별도 관리)
        SET n.synergy = synergy,
            n.value = n.direct_money + synergy
        
        RETURN n.external_id as id, n.value as value, n.direct_money as direct_money, n.synergy as synergy
        """
        
        with self.driver.session() as session:
            result = session.run(query, external_id=external_id)
            record = result.single()
            return dict(record) if record else {}
    
    def get_all_nodes(self, limit: int = 1000) -> List[Dict]:
        """모든 노드 조회"""
        query = """
        MATCH (n:Node)
        WHERE n.external_id <> 'owner'
        RETURN n.external_id as id, n.value as value, n.source as source, 
               n.direct_money as direct_money, n.synergy as synergy
        ORDER BY n.value DESC
        LIMIT $limit
        """
        
        with self.driver.session() as session:
            result = session.run(query, limit=limit)
            return [dict(record) for record in result]
    
    def get_all_motions(self, limit: int = 5000) -> List[Dict]:
        """모든 모션 조회"""
        query = """
        MATCH (source:Node)-[f:FLOW]->(target:Node)
        RETURN source.external_id as source, target.external_id as target,
               f.amount as amount, f.direction as direction, f.fee as fee
        ORDER BY f.created_at DESC
        LIMIT $limit
        """
        
        with self.driver.session() as session:
            result = session.run(query, limit=limit)
            return [dict(record) for record in result]
    
    def get_node_connections(self, external_id: str) -> List[Dict]:
        """노드의 연결 관계 조회"""
        query = """
        MATCH (n:Node {external_id: $external_id})-[f:FLOW]-(connected:Node)
        RETURN connected.external_id as connected_id, 
               connected.value as connected_value,
               f.amount as flow_amount,
               f.direction as direction
        """
        
        with self.driver.session() as session:
            result = session.run(query, external_id=external_id)
            return [dict(record) for record in result]
    
    def get_negative_value_nodes(self) -> List[Dict]:
        """가치 ≤ 0 노드 조회 (삭제 대상)"""
        query = """
        MATCH (n:Node)
        WHERE n.value <= 0 AND n.external_id <> 'owner'
        RETURN n.external_id as id, n.value as value, n.source as source
        ORDER BY n.value ASC
        """
        
        with self.driver.session() as session:
            result = session.run(query)
            return [dict(record) for record in result]
    
    def get_top_synergy_nodes(self, limit: int = 10) -> List[Dict]:
        """높은 시너지 노드 조회"""
        query = """
        MATCH (n:Node)
        WHERE n.external_id <> 'owner'
        RETURN n.external_id as id, n.value as value, n.synergy as synergy
        ORDER BY n.synergy DESC
        LIMIT $limit
        """
        
        with self.driver.session() as session:
            result = session.run(query, limit=limit)
            return [dict(record) for record in result]


# 싱글톤 인스턴스
neo4j_client = Neo4jClient()



"""
Neo4j 클라이언트
그래프 DB 연동 (노드/모션/시너지)
"""

from neo4j import GraphDatabase
from typing import Dict, List, Any, Optional
from datetime import datetime
import os


class Neo4jClient:
    """
    Neo4j 그래프 데이터베이스 클라이언트
    
    스키마:
    - Node: external_id, source, value, direct_money, synergy
    - FLOW: amount, direction, fee, created_at
    """
    
    def __init__(self):
        self._driver = None
        self._uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self._user = os.getenv("NEO4J_USER", "neo4j")
        self._password = os.getenv("NEO4J_PASSWORD", "password")
    
    @property
    def driver(self):
        if self._driver is None:
            self._driver = GraphDatabase.driver(
                self._uri,
                auth=(self._user, self._password)
            )
        return self._driver
    
    def close(self):
        if self._driver:
            self._driver.close()
            self._driver = None
    
    def is_connected(self) -> bool:
        try:
            with self.driver.session() as session:
                session.run("RETURN 1")
            return True
        except:
            return False
    
    def upsert_node(self, external_id: str, source: str = "unknown") -> Dict:
        """
        노드 생성 또는 업데이트 (Upsert)
        
        Zero Meaning: external_id만 저장, 이름/이메일 없음
        """
        query = """
        MERGE (n:Node {external_id: $external_id})
        ON CREATE SET 
            n.source = $source,
            n.value = 0,
            n.direct_money = 0,
            n.synergy = 0,
            n.created_at = datetime()
        ON MATCH SET 
            n.updated_at = datetime()
        RETURN n.external_id as id, n.value as value, n.source as source
        """
        
        with self.driver.session() as session:
            result = session.run(query, external_id=external_id, source=source)
            record = result.single()
            return dict(record) if record else {}
    
    def create_motion(
        self,
        source_id: str,
        target_id: str,
        amount: float,
        direction: str = "inflow",
        fee: float = 0
    ) -> Dict:
        """
        모션(돈 흐름) 생성
        
        direction:
        - inflow: source → target (고객 → owner)
        - outflow: source → target (owner → 고객)
        """
        # 노드 먼저 확인/생성
        self.upsert_node(source_id)
        self.upsert_node(target_id)
        
        query = """
        MATCH (source:Node {external_id: $source_id})
        MATCH (target:Node {external_id: $target_id})
        CREATE (source)-[f:FLOW {
            amount: $amount,
            direction: $direction,
            fee: $fee,
            created_at: datetime()
        }]->(target)
        
        // 직접 돈 업데이트
        WITH source, target, f
        SET source.direct_money = CASE 
            WHEN $direction = 'outflow' THEN source.direct_money - $amount
            ELSE source.direct_money
        END
        SET target.direct_money = CASE 
            WHEN $direction = 'inflow' THEN target.direct_money + $amount
            ELSE target.direct_money
        END
        
        RETURN f.amount as amount, f.direction as direction
        """
        
        with self.driver.session() as session:
            result = session.run(
                query,
                source_id=source_id,
                target_id=target_id,
                amount=amount,
                direction=direction,
                fee=fee
            )
            record = result.single()
            return dict(record) if record else {}
    
    def recalculate_value(self, external_id: str) -> Dict:
        """
        노드 가치 재계산
        
        공식: V = M - T + S
        - M: 직접 돈 (direct_money)
        - T: 시간 비용 (time_cost)
        - S: 시너지 (연결 노드 가치의 10%)
        """
        query = """
        MATCH (n:Node {external_id: $external_id})
        
        // 시너지 계산: 연결된 노드 가치 합계의 10%
        OPTIONAL MATCH (n)-[:FLOW]-(connected:Node)
        WHERE connected.external_id <> 'owner' AND connected <> n
        WITH n, COALESCE(SUM(DISTINCT connected.direct_money) * 0.1, 0) as synergy
        
        // 가치 업데이트: V = M + S (시간비용은 별도 관리)
        SET n.synergy = synergy,
            n.value = n.direct_money + synergy
        
        RETURN n.external_id as id, n.value as value, n.direct_money as direct_money, n.synergy as synergy
        """
        
        with self.driver.session() as session:
            result = session.run(query, external_id=external_id)
            record = result.single()
            return dict(record) if record else {}
    
    def get_all_nodes(self, limit: int = 1000) -> List[Dict]:
        """모든 노드 조회"""
        query = """
        MATCH (n:Node)
        WHERE n.external_id <> 'owner'
        RETURN n.external_id as id, n.value as value, n.source as source, 
               n.direct_money as direct_money, n.synergy as synergy
        ORDER BY n.value DESC
        LIMIT $limit
        """
        
        with self.driver.session() as session:
            result = session.run(query, limit=limit)
            return [dict(record) for record in result]
    
    def get_all_motions(self, limit: int = 5000) -> List[Dict]:
        """모든 모션 조회"""
        query = """
        MATCH (source:Node)-[f:FLOW]->(target:Node)
        RETURN source.external_id as source, target.external_id as target,
               f.amount as amount, f.direction as direction, f.fee as fee
        ORDER BY f.created_at DESC
        LIMIT $limit
        """
        
        with self.driver.session() as session:
            result = session.run(query, limit=limit)
            return [dict(record) for record in result]
    
    def get_node_connections(self, external_id: str) -> List[Dict]:
        """노드의 연결 관계 조회"""
        query = """
        MATCH (n:Node {external_id: $external_id})-[f:FLOW]-(connected:Node)
        RETURN connected.external_id as connected_id, 
               connected.value as connected_value,
               f.amount as flow_amount,
               f.direction as direction
        """
        
        with self.driver.session() as session:
            result = session.run(query, external_id=external_id)
            return [dict(record) for record in result]
    
    def get_negative_value_nodes(self) -> List[Dict]:
        """가치 ≤ 0 노드 조회 (삭제 대상)"""
        query = """
        MATCH (n:Node)
        WHERE n.value <= 0 AND n.external_id <> 'owner'
        RETURN n.external_id as id, n.value as value, n.source as source
        ORDER BY n.value ASC
        """
        
        with self.driver.session() as session:
            result = session.run(query)
            return [dict(record) for record in result]
    
    def get_top_synergy_nodes(self, limit: int = 10) -> List[Dict]:
        """높은 시너지 노드 조회"""
        query = """
        MATCH (n:Node)
        WHERE n.external_id <> 'owner'
        RETURN n.external_id as id, n.value as value, n.synergy as synergy
        ORDER BY n.synergy DESC
        LIMIT $limit
        """
        
        with self.driver.session() as session:
            result = session.run(query, limit=limit)
            return [dict(record) for record in result]


# 싱글톤 인스턴스
neo4j_client = Neo4jClient()









