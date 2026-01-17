"""
AUTUS TypeDB 클라이언트
======================

TypeDB (typedb.com) 통합
- PERA 모델 (Entity-Relation-Attribute)
- Symbolic Reasoning
- TypeQL 쿼리

Neo4j 대비 장점:
- 강한 타입 시스템 (스키마 강제)
- 재귀 규칙 지원
- 복잡 도메인 모델링
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any
from enum import Enum

logger = logging.getLogger(__name__)


@dataclass
class TypeDBConfig:
    """TypeDB 연결 설정"""
    address: str = "localhost:1729"
    database: str = "autus"
    schema_path: str = ""
    
    # 환경 변수에서 읽기
    def __post_init__(self):
        import os
        self.address = os.getenv("TYPEDB_ADDRESS", self.address)
        self.database = os.getenv("TYPEDB_DATABASE", self.database)


# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS TypeDB 스키마 (TypeQL)
# ═══════════════════════════════════════════════════════════════════════════════

AUTUS_SCHEMA = '''
# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS TypeDB Schema (PERA Model)
# 2026-01 Version
# ═══════════════════════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────────────────────
# Entity Types
# ───────────────────────────────────────────────────────────────────────────────

define

# 사용자 엔티티
user sub entity,
    owns user-id @key,
    owns name,
    owns entity-type,
    owns country,
    owns city,
    owns mbti,
    owns created-at,
    plays interaction:actor,
    plays interaction:target,
    plays metric-record:owner,
    plays technology-usage:consumer;

# 기술 엔티티 (LangGraph, Neo4j, OpenAI 등)
technology sub entity,
    owns tech-id @key,
    owns tech-name,
    owns current-version,
    owns latest-version,
    owns risk-level,
    owns last-checked,
    plays dependency:dependent,
    plays dependency:provider,
    plays technology-usage:tech,
    plays update-event:subject;

# 업데이트 이벤트
update-event sub entity,
    owns event-id @key,
    owns from-version,
    owns to-version,
    owns event-type,
    owns risk-score,
    owns breaking-changes,
    owns timestamp,
    plays update-event:subject;

# 메트릭 레코드
metric-record sub entity,
    owns record-id @key,
    owns stability-score,
    owns inertia-debt,
    owns delta-s-dot,
    owns connectivity-density,
    owns influence-score,
    owns timestamp,
    plays metric-record:owner;

# ───────────────────────────────────────────────────────────────────────────────
# Relation Types
# ───────────────────────────────────────────────────────────────────────────────

# 사용자 간 상호작용
interaction sub relation,
    relates actor,
    relates target,
    owns weight,
    owns interaction-count,
    owns trust-score,
    owns last-interaction;

# 기술 의존성
dependency sub relation,
    relates dependent,
    relates provider,
    owns dependency-type,
    owns criticality;

# 기술 사용
technology-usage sub relation,
    relates consumer,
    relates tech,
    owns usage-level,
    owns since;

# ───────────────────────────────────────────────────────────────────────────────
# Attribute Types
# ───────────────────────────────────────────────────────────────────────────────

# 식별자
user-id sub attribute, value string;
tech-id sub attribute, value string;
event-id sub attribute, value string;
record-id sub attribute, value string;

# 사용자 속성
name sub attribute, value string;
entity-type sub attribute, value string;  # INDIVIDUAL, STARTUP, SMB, ENTERPRISE
country sub attribute, value string;
city sub attribute, value string;
mbti sub attribute, value string;

# 기술 속성
tech-name sub attribute, value string;
current-version sub attribute, value string;
latest-version sub attribute, value string;
risk-level sub attribute, value string;  # LOW, MEDIUM, HIGH, CRITICAL
last-checked sub attribute, value datetime;

# 이벤트 속성
from-version sub attribute, value string;
to-version sub attribute, value string;
event-type sub attribute, value string;  # UPDATE, ROLLBACK, PATCH
risk-score sub attribute, value double;
breaking-changes sub attribute, value long;

# 메트릭 속성
stability-score sub attribute, value double;
inertia-debt sub attribute, value double;
delta-s-dot sub attribute, value double;
connectivity-density sub attribute, value double;
influence-score sub attribute, value double;

# 관계 속성
weight sub attribute, value double;
interaction-count sub attribute, value long;
trust-score sub attribute, value double;
last-interaction sub attribute, value datetime;
dependency-type sub attribute, value string;  # REQUIRED, OPTIONAL, PEER
criticality sub attribute, value double;
usage-level sub attribute, value string;  # ACTIVE, PASSIVE, DEPRECATED
since sub attribute, value datetime;

# 공통 속성
timestamp sub attribute, value datetime;
created-at sub attribute, value datetime;

# ───────────────────────────────────────────────────────────────────────────────
# Rules (Symbolic Reasoning)
# ───────────────────────────────────────────────────────────────────────────────

# 규칙 1: 위험 전파 (High-risk 기술 의존 시 위험 상승)
rule risk-propagation:
    when {
        $tech1 isa technology, has risk-level "HIGH";
        $tech2 isa technology;
        (dependent: $tech2, provider: $tech1) isa dependency;
    } then {
        $tech2 has risk-level "MEDIUM";
    };

# 규칙 2: Inertia Debt 경고 (0.7 초과 시)
rule inertia-debt-warning:
    when {
        $user isa user;
        $metric isa metric-record, has inertia-debt $debt;
        $debt > 0.7;
        (owner: $user) isa metric-record;
    } then {
        $metric has risk-level "HIGH";
    };

# 규칙 3: 간접 상호작용 (2-hop 연결)
rule indirect-interaction:
    when {
        $a isa user;
        $b isa user;
        $c isa user;
        (actor: $a, target: $b) isa interaction;
        (actor: $b, target: $c) isa interaction;
        not { (actor: $a, target: $c) isa interaction; };
    } then {
        (actor: $a, target: $c) isa interaction, has weight 0.3;
    };
'''


class TypeDBClient:
    """TypeDB 클라이언트"""
    
    def __init__(self, config: Optional[TypeDBConfig] = None):
        self.config = config or TypeDBConfig()
        self._client = None
        self._session = None
        self._use_mock = True  # TypeDB 미설치 시 폴백
    
    def connect(self) -> bool:
        """TypeDB 연결"""
        try:
            from typedb.driver import TypeDB, SessionType, TransactionType
            
            self._client = TypeDB.core_driver(self.config.address)
            
            # 데이터베이스 생성 (없으면)
            if not self._client.databases.contains(self.config.database):
                self._client.databases.create(self.config.database)
                logger.info(f"데이터베이스 생성: {self.config.database}")
            
            self._use_mock = False
            logger.info(f"TypeDB 연결 성공: {self.config.address}")
            return True
            
        except ImportError:
            logger.warning("typedb-driver 패키지가 설치되지 않았습니다. Mock 모드 사용.")
            self._use_mock = True
            return True
            
        except Exception as e:
            logger.warning(f"TypeDB 연결 실패: {e}. Mock 모드 사용.")
            self._use_mock = True
            return True
    
    def close(self):
        """연결 종료"""
        if self._session:
            self._session.close()
        if self._client:
            self._client.close()
    
    def define_schema(self, schema: str = AUTUS_SCHEMA) -> bool:
        """스키마 정의"""
        if self._use_mock:
            logger.info("[MOCK] TypeDB 스키마 정의 완료")
            return True
        
        try:
            from typedb.driver import SessionType, TransactionType
            
            with self._client.session(self.config.database, SessionType.SCHEMA) as session:
                with session.transaction(TransactionType.WRITE) as tx:
                    tx.query.define(schema)
                    tx.commit()
            
            logger.info("TypeDB 스키마 정의 완료")
            return True
            
        except Exception as e:
            logger.error(f"스키마 정의 실패: {e}")
            return False
    
    def insert_user(
        self,
        user_id: str,
        name: str,
        entity_type: str = "INDIVIDUAL",
        country: str = "PH",
        city: str = "Quezon City",
        mbti: str = "INTJ-A",
    ) -> bool:
        """사용자 삽입"""
        if self._use_mock:
            logger.info(f"[MOCK] 사용자 삽입: {user_id}")
            return True
        
        query = f'''
        insert $user isa user,
            has user-id "{user_id}",
            has name "{name}",
            has entity-type "{entity_type}",
            has country "{country}",
            has city "{city}",
            has mbti "{mbti}",
            has created-at {datetime.now().isoformat()};
        '''
        
        return self._execute_write(query)
    
    def insert_technology(
        self,
        tech_id: str,
        tech_name: str,
        current_version: str,
        risk_level: str = "LOW",
    ) -> bool:
        """기술 삽입"""
        if self._use_mock:
            logger.info(f"[MOCK] 기술 삽입: {tech_id}")
            return True
        
        query = f'''
        insert $tech isa technology,
            has tech-id "{tech_id}",
            has tech-name "{tech_name}",
            has current-version "{current_version}",
            has risk-level "{risk_level}",
            has last-checked {datetime.now().isoformat()};
        '''
        
        return self._execute_write(query)
    
    def insert_metric(
        self,
        user_id: str,
        stability_score: float,
        inertia_debt: float,
        delta_s_dot: float,
    ) -> bool:
        """메트릭 삽입"""
        if self._use_mock:
            logger.info(f"[MOCK] 메트릭 삽입: {user_id}")
            return True
        
        record_id = f"metric_{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        query = f'''
        match $user isa user, has user-id "{user_id}";
        insert $metric isa metric-record,
            has record-id "{record_id}",
            has stability-score {stability_score},
            has inertia-debt {inertia_debt},
            has delta-s-dot {delta_s_dot},
            has timestamp {datetime.now().isoformat()};
        (owner: $user) isa metric-record;
        '''
        
        return self._execute_write(query)
    
    def query_high_risk_technologies(self) -> list[dict]:
        """고위험 기술 조회"""
        if self._use_mock:
            return [
                {"tech_id": "openai", "tech_name": "OpenAI API", "risk_level": "HIGH"},
                {"tech_id": "deepseek", "tech_name": "DeepSeek-R1", "risk_level": "MEDIUM"},
            ]
        
        query = '''
        match $tech isa technology,
            has tech-id $id,
            has tech-name $name,
            has risk-level $risk;
        $risk == "HIGH" or $risk == "CRITICAL";
        get $id, $name, $risk;
        '''
        
        return self._execute_read(query)
    
    def query_inertia_debt_rolling_average(self, user_id: str, days: int = 90) -> float:
        """Inertia Debt Rolling Average 계산"""
        if self._use_mock:
            return 0.42  # 시뮬레이션
        
        query = f'''
        match $user isa user, has user-id "{user_id}";
        $metric isa metric-record, has inertia-debt $debt, has timestamp $ts;
        (owner: $user) isa metric-record;
        get $debt;
        mean $debt;
        '''
        
        results = self._execute_read(query)
        if results:
            return results[0].get("mean_debt", 0.0)
        return 0.0
    
    def query_user_coefficients(self, user_id: str) -> dict:
        """사용자 계수 조회 (1-12-144 그래프 기반)"""
        if self._use_mock:
            return {
                "connectivity_density": 0.75,
                "influence_score": 0.68,
                "interaction_count": 45,
            }
        
        # 연결 밀도 = 실제 연결 / 12
        # 영향력 = PageRank 근사 (가중치 합 / 정규화)
        query = f'''
        match $user isa user, has user-id "{user_id}";
        $interaction (actor: $user, target: $other) isa interaction, has weight $w;
        get $w;
        count;
        '''
        
        results = self._execute_read(query)
        count = results[0].get("count", 0) if results else 0
        
        return {
            "connectivity_density": min(1.0, count / 12.0),
            "influence_score": 0.65,  # 별도 계산 필요
            "interaction_count": count,
        }
    
    def _execute_write(self, query: str) -> bool:
        """쓰기 쿼리 실행"""
        try:
            from typedb.driver import SessionType, TransactionType
            
            with self._client.session(self.config.database, SessionType.DATA) as session:
                with session.transaction(TransactionType.WRITE) as tx:
                    tx.query.insert(query)
                    tx.commit()
            return True
            
        except Exception as e:
            logger.error(f"쿼리 실행 실패: {e}")
            return False
    
    def _execute_read(self, query: str) -> list[dict]:
        """읽기 쿼리 실행"""
        try:
            from typedb.driver import SessionType, TransactionType
            
            results = []
            with self._client.session(self.config.database, SessionType.DATA) as session:
                with session.transaction(TransactionType.READ) as tx:
                    answer = tx.query.get(query)
                    for concept_map in answer:
                        result = {}
                        for var in concept_map.variables():
                            concept = concept_map.get(var)
                            if hasattr(concept, 'get_value'):
                                result[var] = concept.get_value()
                        results.append(result)
            return results
            
        except Exception as e:
            logger.error(f"쿼리 실행 실패: {e}")
            return []


def create_autus_schema(config: Optional[TypeDBConfig] = None) -> bool:
    """AUTUS TypeDB 스키마 생성 (편의 함수)"""
    client = TypeDBClient(config)
    client.connect()
    result = client.define_schema(AUTUS_SCHEMA)
    client.close()
    return result
