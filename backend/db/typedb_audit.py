"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS TypeDB Audit Storage
영구 감사 로그 저장 (Graph Database)
═══════════════════════════════════════════════════════════════════════════════
"""

import os
import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

TYPEDB_HOST = os.environ.get("TYPEDB_HOST", "localhost")
TYPEDB_PORT = int(os.environ.get("TYPEDB_PORT", "1729"))
TYPEDB_DATABASE = os.environ.get("TYPEDB_DATABASE", "autus_audit")

# TypeDB 연결 여부 (없으면 fallback to file)
TYPEDB_ENABLED = os.environ.get("TYPEDB_ENABLED", "false").lower() == "true"

# Fallback: JSON 파일 저장
AUDIT_FILE_PATH = os.environ.get("AUDIT_FILE_PATH", "./data/audit_log.jsonl")


# ═══════════════════════════════════════════════════════════════════════════════
# TypeDB Schema (TypeQL)
# ═══════════════════════════════════════════════════════════════════════════════

TYPEDB_SCHEMA = """
define

# ═══════════════════════════════════════════════════════════════════════════════
# Attributes
# ═══════════════════════════════════════════════════════════════════════════════

audit_id sub attribute, value string;
timestamp sub attribute, value datetime;
record_type sub attribute, value string;
decision_id sub attribute, value string;
actor sub attribute, value string;
event_type sub attribute, value string;
k_level sub attribute, value long;
omega sub attribute, value double;
allowed sub attribute, value boolean;
message sub attribute, value string;
data_json sub attribute, value string;
prev_hash sub attribute, value string;
record_hash sub attribute, value string;

# ═══════════════════════════════════════════════════════════════════════════════
# Entities
# ═══════════════════════════════════════════════════════════════════════════════

audit_record sub entity,
    owns audit_id @key,
    owns timestamp,
    owns record_type,
    owns decision_id,
    owns actor,
    owns event_type,
    owns k_level,
    owns omega,
    owns allowed,
    owns message,
    owns data_json,
    owns prev_hash,
    owns record_hash,
    plays audit_chain:current,
    plays audit_chain:previous;

decision sub entity,
    owns decision_id @key,
    owns event_type,
    owns k_level,
    owns omega,
    owns actor,
    owns timestamp,
    plays decision_audit:decision,
    plays ritual_ceremony:target;

ritual sub entity,
    owns audit_id @key,
    owns decision_id,
    owns actor,
    owns timestamp,
    owns message,
    plays ritual_ceremony:ritual;

# ═══════════════════════════════════════════════════════════════════════════════
# Relations
# ═══════════════════════════════════════════════════════════════════════════════

audit_chain sub relation,
    relates current,
    relates previous;

decision_audit sub relation,
    relates decision,
    relates audit_record;

ritual_ceremony sub relation,
    relates target,
    relates ritual;
"""


# ═══════════════════════════════════════════════════════════════════════════════
# TypeDB Client (Optional - requires typedb-driver)
# ═══════════════════════════════════════════════════════════════════════════════

class TypeDBAuditClient:
    """TypeDB Audit 클라이언트"""
    
    def __init__(self):
        self._client = None
        self._session = None
        self._last_hash = "GENESIS"
    
    def connect(self):
        """TypeDB 연결"""
        if not TYPEDB_ENABLED:
            logger.info("[TypeDB] Disabled, using file fallback")
            return False
        
        try:
            from typedb.driver import TypeDB, SessionType, TransactionType
            
            self._client = TypeDB.core_driver(f"{TYPEDB_HOST}:{TYPEDB_PORT}")
            
            # 데이터베이스 존재 확인/생성
            if not self._client.databases.contains(TYPEDB_DATABASE):
                self._client.databases.create(TYPEDB_DATABASE)
                logger.info(f"[TypeDB] Created database: {TYPEDB_DATABASE}")
                
                # 스키마 적용
                with self._client.session(TYPEDB_DATABASE, SessionType.SCHEMA) as session:
                    with session.transaction(TransactionType.WRITE) as tx:
                        tx.query.define(TYPEDB_SCHEMA)
                        tx.commit()
                logger.info("[TypeDB] Schema applied")
            
            self._session = self._client.session(TYPEDB_DATABASE, SessionType.DATA)
            logger.info(f"[TypeDB] Connected to {TYPEDB_HOST}:{TYPEDB_PORT}/{TYPEDB_DATABASE}")
            return True
            
        except ImportError:
            logger.warning("[TypeDB] typedb-driver not installed, using file fallback")
            return False
        except Exception as e:
            logger.error(f"[TypeDB] Connection failed: {e}")
            return False
    
    def disconnect(self):
        """연결 해제"""
        if self._session:
            self._session.close()
        if self._client:
            self._client.close()
    
    def insert_audit_record(self, record: Dict[str, Any]) -> Optional[str]:
        """감사 기록 삽입"""
        if not self._session:
            return self._file_fallback_insert(record)
        
        try:
            from typedb.driver import TransactionType
            
            # 해시 계산
            record_hash = self._compute_hash(self._last_hash, record)
            
            with self._session.transaction(TransactionType.WRITE) as tx:
                query = f"""
                insert $r isa audit_record,
                    has audit_id "{record.get('id', '')}",
                    has timestamp {record.get('timestamp', datetime.now(timezone.utc).isoformat())},
                    has record_type "{record.get('type', 'UNKNOWN')}",
                    has decision_id "{record.get('decision_id', '')}",
                    has actor "{record.get('actor', '')}",
                    has event_type "{record.get('event_type', '')}",
                    has k_level {record.get('k_final', record.get('k_level', 0))},
                    has omega {record.get('omega', 0.0)},
                    has allowed {str(record.get('allowed', True)).lower()},
                    has message "{record.get('message', '')}",
                    has data_json '{json.dumps(record)}',
                    has prev_hash "{self._last_hash}",
                    has record_hash "{record_hash}";
                """
                tx.query.insert(query)
                tx.commit()
            
            self._last_hash = record_hash
            logger.debug(f"[TypeDB] Inserted audit: {record.get('id')}")
            return record_hash
            
        except Exception as e:
            logger.error(f"[TypeDB] Insert failed: {e}")
            return self._file_fallback_insert(record)
    
    def query_audit_records(
        self,
        decision_id: Optional[str] = None,
        actor: Optional[str] = None,
        record_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """감사 기록 조회"""
        if not self._session:
            return self._file_fallback_query(decision_id, actor, record_type, limit)
        
        try:
            from typedb.driver import TransactionType
            
            filters = []
            if decision_id:
                filters.append(f'has decision_id "{decision_id}"')
            if actor:
                filters.append(f'has actor "{actor}"')
            if record_type:
                filters.append(f'has record_type "{record_type}"')
            
            where_clause = ", ".join(filters) if filters else ""
            
            query = f"""
            match $r isa audit_record{', ' + where_clause if where_clause else ''};
            get $r; limit {limit};
            """
            
            results = []
            with self._session.transaction(TransactionType.READ) as tx:
                answer = tx.query.get(query)
                for concept_map in answer:
                    r = concept_map.get("r")
                    data_json = r.get_has("data_json")
                    if data_json:
                        results.append(json.loads(next(data_json).get_value()))
            
            return results
            
        except Exception as e:
            logger.error(f"[TypeDB] Query failed: {e}")
            return self._file_fallback_query(decision_id, actor, record_type, limit)
    
    def verify_chain(self) -> Dict[str, Any]:
        """해시 체인 무결성 검증"""
        records = self.query_audit_records(limit=10000)
        
        prev_hash = "GENESIS"
        for i, record in enumerate(sorted(records, key=lambda x: x.get('timestamp', ''))):
            expected_hash = self._compute_hash(prev_hash, record)
            actual_hash = record.get('hash', record.get('record_hash'))
            
            if actual_hash and actual_hash != expected_hash:
                return {
                    "valid": False,
                    "broken_at": record.get('id'),
                    "index": i,
                    "total": len(records),
                }
            
            prev_hash = actual_hash or expected_hash
        
        return {"valid": True, "total": len(records)}
    
    def _compute_hash(self, prev_hash: str, data: Dict) -> str:
        """해시 계산"""
        payload = json.dumps({"prev": prev_hash, "data": data}, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()[:16]
    
    # ═══════════════════════════════════════════════════════════════════════════
    # File Fallback (TypeDB 없을 때)
    # ═══════════════════════════════════════════════════════════════════════════
    
    def _file_fallback_insert(self, record: Dict[str, Any]) -> str:
        """파일 기반 삽입"""
        import os
        
        os.makedirs(os.path.dirname(AUDIT_FILE_PATH), exist_ok=True)
        
        record_hash = self._compute_hash(self._last_hash, record)
        record["prev_hash"] = self._last_hash
        record["hash"] = record_hash
        record["timestamp"] = record.get("timestamp", datetime.now(timezone.utc).isoformat())
        
        with open(AUDIT_FILE_PATH, "a") as f:
            f.write(json.dumps(record) + "\n")
        
        self._last_hash = record_hash
        return record_hash
    
    def _file_fallback_query(
        self,
        decision_id: Optional[str] = None,
        actor: Optional[str] = None,
        record_type: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """파일 기반 조회"""
        import os
        
        if not os.path.exists(AUDIT_FILE_PATH):
            return []
        
        results = []
        with open(AUDIT_FILE_PATH, "r") as f:
            for line in f:
                if len(results) >= limit:
                    break
                
                try:
                    record = json.loads(line.strip())
                    
                    if decision_id and record.get("decision_id") != decision_id:
                        continue
                    if actor and record.get("actor") != actor:
                        continue
                    if record_type and record.get("type") != record_type:
                        continue
                    
                    results.append(record)
                except:
                    continue
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# Global Instance
# ═══════════════════════════════════════════════════════════════════════════════

_audit_client: Optional[TypeDBAuditClient] = None


def get_audit_client() -> TypeDBAuditClient:
    """Audit 클라이언트 싱글톤"""
    global _audit_client
    if _audit_client is None:
        _audit_client = TypeDBAuditClient()
        _audit_client.connect()
    return _audit_client


def audit_insert(record: Dict[str, Any]) -> Optional[str]:
    """감사 기록 삽입 (Helper)"""
    return get_audit_client().insert_audit_record(record)


def audit_query(**kwargs) -> List[Dict[str, Any]]:
    """감사 기록 조회 (Helper)"""
    return get_audit_client().query_audit_records(**kwargs)


def audit_verify() -> Dict[str, Any]:
    """체인 검증 (Helper)"""
    return get_audit_client().verify_chain()
