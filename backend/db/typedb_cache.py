"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS - TypeDB + Redis 캐싱 미들웨어
TypeDB Query Optimization with Redis Caching Layer
═══════════════════════════════════════════════════════════════════════════════

최적화 원칙:
1. 인덱스 적극 활용 (@index)
2. Match 대신 Fetch 사용
3. 변수 최소화 & 조기 필터링
4. Limit + Sort 조합
5. Read 트랜잭션 재사용
"""

import os
import json
import hashlib
import asyncio
import logging
from typing import Optional, Dict, List, Any, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import wraps

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# Configuration
# ═══════════════════════════════════════════════════════════════════════════════

TYPEDB_ADDRESS = os.environ.get("TYPEDB_ADDRESS", "localhost:1729")
TYPEDB_DATABASE = os.environ.get("TYPEDB_DATABASE", "autus")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

# Cache TTL (seconds)
CACHE_TTL_SHORT = 10      # 실시간 대시보드 (자주 변경)
CACHE_TTL_MEDIUM = 60     # 일반 조회
CACHE_TTL_LONG = 300      # 정적 데이터 (스키마, 레퍼런스)

# ═══════════════════════════════════════════════════════════════════════════════
# Redis Client (Optional)
# ═══════════════════════════════════════════════════════════════════════════════

_redis_client = None


async def get_redis():
    """Redis 클라이언트 싱글톤"""
    global _redis_client
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            _redis_client = await aioredis.from_url(REDIS_URL, decode_responses=True)
            await _redis_client.ping()
            logger.info("✅ Redis 캐시 연결됨")
        except Exception as e:
            logger.warning(f"⚠️ Redis 미연결 (in-memory fallback): {e}")
            _redis_client = InMemoryCache()
    return _redis_client


class InMemoryCache:
    """Redis 미연결 시 인메모리 폴백"""
    
    def __init__(self):
        self._cache: Dict[str, tuple] = {}  # key -> (value, expires_at)
    
    async def get(self, key: str) -> Optional[str]:
        if key in self._cache:
            value, expires_at = self._cache[key]
            if datetime.now() < expires_at:
                return value
            del self._cache[key]
        return None
    
    async def set(self, key: str, value: str, ex: int = 60):
        expires_at = datetime.now() + timedelta(seconds=ex)
        self._cache[key] = (value, expires_at)
    
    async def delete(self, key: str):
        self._cache.pop(key, None)
    
    async def keys(self, pattern: str) -> List[str]:
        # Simple pattern matching for "autus:*"
        prefix = pattern.replace("*", "")
        return [k for k in self._cache.keys() if k.startswith(prefix)]


# ═══════════════════════════════════════════════════════════════════════════════
# TypeDB Client Wrapper
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TypeDBQueryResult:
    """쿼리 결과"""
    data: List[Dict[str, Any]]
    count: int
    execution_time_ms: float
    from_cache: bool = False
    cache_key: Optional[str] = None


class TypeDBCacheClient:
    """TypeDB + Redis 캐싱 클라이언트"""
    
    def __init__(self):
        self._client = None
        self._session = None
        self._connected = False
    
    async def connect(self) -> bool:
        """TypeDB 연결"""
        try:
            from typedb.driver import TypeDB, SessionType, TransactionType
            self._client = TypeDB.core_driver(TYPEDB_ADDRESS)
            self._session = self._client.session(TYPEDB_DATABASE, SessionType.DATA)
            self._connected = True
            logger.info(f"✅ TypeDB 연결: {TYPEDB_ADDRESS}/{TYPEDB_DATABASE}")
            return True
        except ImportError:
            logger.warning("⚠️ TypeDB 드라이버 미설치")
            return False
        except Exception as e:
            logger.warning(f"⚠️ TypeDB 연결 실패: {e}")
            return False
    
    async def close(self):
        """연결 종료"""
        if self._session:
            self._session.close()
        if self._client:
            self._client.close()
        self._connected = False
    
    def _generate_cache_key(self, query: str, params: Optional[Dict] = None) -> str:
        """쿼리 기반 캐시 키 생성"""
        key_data = f"{query}:{json.dumps(params or {}, sort_keys=True)}"
        return f"autus:typedb:{hashlib.md5(key_data.encode()).hexdigest()[:16]}"
    
    async def fetch(
        self,
        query: str,
        params: Optional[Dict] = None,
        cache_ttl: int = CACHE_TTL_MEDIUM,
        skip_cache: bool = False,
    ) -> TypeDBQueryResult:
        """
        최적화된 TypeDB Fetch 쿼리 실행
        
        Args:
            query: TypeQL fetch 쿼리
            params: 쿼리 파라미터
            cache_ttl: 캐시 TTL (초)
            skip_cache: 캐시 건너뛰기
        """
        import time
        start = time.time()
        
        cache_key = self._generate_cache_key(query, params)
        
        # 1. 캐시 확인
        if not skip_cache:
            redis = await get_redis()
            cached = await redis.get(cache_key)
            if cached:
                data = json.loads(cached)
                return TypeDBQueryResult(
                    data=data,
                    count=len(data),
                    execution_time_ms=(time.time() - start) * 1000,
                    from_cache=True,
                    cache_key=cache_key,
                )
        
        # 2. TypeDB 쿼리 실행
        if not self._connected:
            await self.connect()
        
        results = []
        
        if self._connected and self._session:
            try:
                from typedb.driver import TransactionType
                with self._session.transaction(TransactionType.READ) as tx:
                    # 파라미터 치환 (간단한 구현)
                    final_query = query
                    if params:
                        for k, v in params.items():
                            final_query = final_query.replace(f"${k}", str(v))
                    
                    iterator = tx.query.fetch(final_query)
                    for result in iterator:
                        results.append(self._convert_result(result))
            except Exception as e:
                logger.error(f"TypeDB 쿼리 오류: {e}")
        
        # 3. 캐시 저장
        if results and not skip_cache:
            redis = await get_redis()
            await redis.set(cache_key, json.dumps(results), ex=cache_ttl)
        
        execution_time = (time.time() - start) * 1000
        
        return TypeDBQueryResult(
            data=results,
            count=len(results),
            execution_time_ms=execution_time,
            from_cache=False,
            cache_key=cache_key,
        )
    
    def _convert_result(self, result: Any) -> Dict[str, Any]:
        """TypeDB 결과를 Dict로 변환"""
        if isinstance(result, dict):
            return {k: self._convert_value(v) for k, v in result.items()}
        return {"value": str(result)}
    
    def _convert_value(self, value: Any) -> Any:
        """값 변환"""
        if hasattr(value, 'as_string'):
            return value.as_string()
        if hasattr(value, 'as_long'):
            return value.as_long()
        if hasattr(value, 'as_double'):
            return value.as_double()
        if hasattr(value, 'as_boolean'):
            return value.as_boolean()
        return str(value)
    
    async def invalidate_cache(self, pattern: str = "autus:typedb:*"):
        """캐시 무효화"""
        redis = await get_redis()
        keys = await redis.keys(pattern)
        for key in keys:
            await redis.delete(key)
        logger.info(f"캐시 무효화: {len(keys)}개 키 삭제")


# ═══════════════════════════════════════════════════════════════════════════════
# 최적화된 쿼리 템플릿 (AUTUS용)
# ═══════════════════════════════════════════════════════════════════════════════

class OptimizedQueries:
    """AUTUS 최적화 쿼리 모음"""
    
    # 삭제 대상 업무 조회 (자동화율 98% 이상)
    DELETION_CANDIDATES = """
    match
      $t isa task,
        has automation-level >= 0.98,
        has is-deleted false,
        has name $name,
        has code $code,
        has level $level;
    fetch
      name: $name,
      code: $code,
      level: $level,
      automation_level: $t.automation-level;
    limit 100;
    sort automation-level desc;
    """
    
    # 고위험 업무 조회 (K < 1.0)
    HIGH_RISK_TASKS = """
    match
      $t isa task,
        has k-value < 1.0,
        has automation-level <= 0.5,
        has name $name,
        has code $code;
    fetch
      name: $name,
      code: $code,
      k_value: $t.k-value,
      automation_level: $t.automation-level;
    limit 50;
    sort k-value asc;
    """
    
    # 계층 트리 조회 (L1 → L5)
    HIERARCHY_TREE = """
    match
      $parent isa task, has level "$parent_level", has code "$parent_code";
      $child isa task;
      ($parent, $child) isa hierarchy;
      $child has name $name, has level $level, has code $code;
    fetch
      name: $name,
      level: $level,
      code: $code;
    limit 500;
    """
    
    # 영향 관계 조회
    IMPACT_RELATIONS = """
    match
      $source isa task, has code "$source_code";
      $target isa task, has name $target_name;
      $rel isa impact-relation,
        relates source-task: $source,
        relates target-task: $target,
        has k-delta $delta;
    fetch
      target: $target_name,
      k_delta: $delta;
    limit 20;
    sort $delta asc;
    """
    
    # 대시보드 요약 (전체 통계)
    DASHBOARD_SUMMARY = """
    match
      $t isa task,
        has automation-level $al,
        has k-value $k,
        has level $level;
    fetch
      level: $level,
      automation_level: $al,
      k_value: $k;
    limit 1000;
    """


# ═══════════════════════════════════════════════════════════════════════════════
# 캐시 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════

def cached_query(ttl: int = CACHE_TTL_MEDIUM):
    """쿼리 캐싱 데코레이터"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = f"autus:query:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            redis = await get_redis()
            cached = await redis.get(cache_key)
            
            if cached:
                return json.loads(cached)
            
            result = await func(*args, **kwargs)
            
            if result:
                await redis.set(cache_key, json.dumps(result), ex=ttl)
            
            return result
        return wrapper
    return decorator


# ═══════════════════════════════════════════════════════════════════════════════
# FastAPI 미들웨어 통합
# ═══════════════════════════════════════════════════════════════════════════════

_typedb_client: Optional[TypeDBCacheClient] = None


async def get_typedb_client() -> TypeDBCacheClient:
    """TypeDB 클라이언트 싱글톤"""
    global _typedb_client
    if _typedb_client is None:
        _typedb_client = TypeDBCacheClient()
        await _typedb_client.connect()
    return _typedb_client


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

async def fetch_deletion_candidates(limit: int = 100) -> List[Dict]:
    """삭제 대상 업무 조회"""
    client = await get_typedb_client()
    query = OptimizedQueries.DELETION_CANDIDATES.replace("limit 100", f"limit {limit}")
    result = await client.fetch(query, cache_ttl=CACHE_TTL_SHORT)
    return result.data


async def fetch_high_risk_tasks(limit: int = 50) -> List[Dict]:
    """고위험 업무 조회"""
    client = await get_typedb_client()
    query = OptimizedQueries.HIGH_RISK_TASKS.replace("limit 50", f"limit {limit}")
    result = await client.fetch(query, cache_ttl=CACHE_TTL_SHORT)
    return result.data


async def fetch_hierarchy(parent_level: str, parent_code: str) -> List[Dict]:
    """계층 트리 조회"""
    client = await get_typedb_client()
    query = OptimizedQueries.HIERARCHY_TREE.replace(
        "$parent_level", parent_level
    ).replace("$parent_code", parent_code)
    result = await client.fetch(query, cache_ttl=CACHE_TTL_MEDIUM)
    return result.data


async def fetch_dashboard_summary() -> Dict[str, Any]:
    """대시보드 요약"""
    client = await get_typedb_client()
    result = await client.fetch(
        OptimizedQueries.DASHBOARD_SUMMARY,
        cache_ttl=CACHE_TTL_SHORT,
    )
    
    # 통계 계산
    tasks = result.data
    if not tasks:
        return {"total": 0, "by_level": {}, "avg_automation": 0, "avg_k": 0}
    
    by_level = {}
    total_automation = 0
    total_k = 0
    
    for task in tasks:
        level = task.get("level", "unknown")
        by_level[level] = by_level.get(level, 0) + 1
        total_automation += task.get("automation_level", 0)
        total_k += task.get("k_value", 1.0)
    
    return {
        "total": len(tasks),
        "by_level": by_level,
        "avg_automation": round(total_automation / len(tasks), 2),
        "avg_k": round(total_k / len(tasks), 2),
        "query_time_ms": result.execution_time_ms,
        "from_cache": result.from_cache,
    }
