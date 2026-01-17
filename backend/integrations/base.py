"""
AUTUS 외부 서비스 추상화 인터페이스
===================================

모든 외부 서비스는 이 인터페이스를 구현해야 함
→ 모듈 교체 시 코드 변경 최소화

사용법:
    from integrations.base import ServiceRegistry
    
    # 서비스 등록
    ServiceRegistry.register("llm", OpenAIProvider())
    
    # 서비스 교체
    ServiceRegistry.register("llm", DeepSeekProvider())
    
    # 서비스 사용
    llm = ServiceRegistry.get("llm")
    result = llm.generate("Hello")
"""

from abc import ABC, abstractmethod
from typing import Any, Optional, Dict, List, Type
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# 서비스 타입 정의
# ═══════════════════════════════════════════════════════════════════════════════

class ServiceType(Enum):
    """외부 서비스 타입"""
    LLM = "llm"                 # 언어 모델 (OpenAI, DeepSeek, Llama)
    VECTOR_DB = "vector_db"    # 벡터 DB (Pinecone, Weaviate, Qdrant)
    GRAPH_DB = "graph_db"      # 그래프 DB (Neo4j, TypeDB)
    CACHE = "cache"            # 캐시 (Redis, Memcached)
    QUEUE = "queue"            # 메시지 큐 (Kafka, RabbitMQ)
    STORAGE = "storage"        # 스토리지 (S3, GCS, MinIO)
    MONITORING = "monitoring"  # 모니터링 (Prometheus, DataDog)
    NOTIFICATION = "notification"  # 알림 (Slack, Discord)


@dataclass
class ServiceHealth:
    """서비스 헬스 상태"""
    healthy: bool
    latency_ms: float = 0.0
    last_check: datetime = field(default_factory=datetime.now)
    error: Optional[str] = None
    version: str = ""


# ═══════════════════════════════════════════════════════════════════════════════
# 추상 인터페이스
# ═══════════════════════════════════════════════════════════════════════════════

class BaseService(ABC):
    """
    모든 외부 서비스의 기본 인터페이스
    
    구현 필수:
    - connect(): 연결
    - disconnect(): 연결 해제
    - health_check(): 헬스 체크
    """
    
    service_type: ServiceType
    name: str = "base"
    version: str = "1.0.0"
    
    @abstractmethod
    def connect(self) -> bool:
        """서비스 연결"""
        pass
    
    @abstractmethod
    def disconnect(self) -> bool:
        """서비스 연결 해제"""
        pass
    
    @abstractmethod
    def health_check(self) -> ServiceHealth:
        """헬스 체크"""
        pass
    
    def get_config(self) -> Dict[str, Any]:
        """현재 설정 반환"""
        return {}
    
    def update_config(self, config: Dict[str, Any]) -> bool:
        """설정 업데이트"""
        return True


class LLMProvider(BaseService):
    """LLM 서비스 인터페이스"""
    
    service_type = ServiceType.LLM
    
    @abstractmethod
    def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs
    ) -> str:
        """텍스트 생성"""
        pass
    
    @abstractmethod
    def embed(self, text: str) -> List[float]:
        """텍스트 임베딩"""
        pass
    
    def stream(self, prompt: str, **kwargs):
        """스트리밍 생성 (선택)"""
        return self.generate(prompt, **kwargs)


class VectorDBProvider(BaseService):
    """벡터 DB 서비스 인터페이스"""
    
    service_type = ServiceType.VECTOR_DB
    
    @abstractmethod
    def upsert(self, vectors: List[Dict]) -> int:
        """벡터 삽입/업데이트"""
        pass
    
    @abstractmethod
    def query(
        self,
        vector: List[float],
        top_k: int = 10,
        filter: Optional[Dict] = None
    ) -> List[Dict]:
        """벡터 검색"""
        pass
    
    @abstractmethod
    def delete(self, ids: List[str]) -> int:
        """벡터 삭제"""
        pass


class GraphDBProvider(BaseService):
    """그래프 DB 서비스 인터페이스"""
    
    service_type = ServiceType.GRAPH_DB
    
    @abstractmethod
    def query(self, cypher: str, params: Optional[Dict] = None) -> List[Dict]:
        """쿼리 실행"""
        pass
    
    @abstractmethod
    def create_node(self, label: str, properties: Dict) -> str:
        """노드 생성"""
        pass
    
    @abstractmethod
    def create_edge(self, from_id: str, to_id: str, rel_type: str, properties: Optional[Dict] = None) -> str:
        """엣지 생성"""
        pass


class CacheProvider(BaseService):
    """캐시 서비스 인터페이스"""
    
    service_type = ServiceType.CACHE
    
    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """값 조회"""
        pass
    
    @abstractmethod
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """값 설정"""
        pass
    
    @abstractmethod
    def delete(self, key: str) -> bool:
        """값 삭제"""
        pass


class NotificationProvider(BaseService):
    """알림 서비스 인터페이스"""
    
    service_type = ServiceType.NOTIFICATION
    
    @abstractmethod
    def send(self, message: str, channel: str = "", **kwargs) -> bool:
        """알림 전송"""
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# 서비스 레지스트리
# ═══════════════════════════════════════════════════════════════════════════════

class ServiceRegistry:
    """
    서비스 레지스트리 (싱글톤)
    
    모든 외부 서비스를 중앙 관리
    → 모듈 교체 시 여기서만 변경
    """
    
    _instance = None
    _services: Dict[str, BaseService] = {}
    _configs: Dict[str, Dict] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def register(cls, name: str, service: BaseService, connect: bool = True) -> bool:
        """서비스 등록"""
        try:
            if connect:
                service.connect()
            cls._services[name] = service
            logger.info(f"✅ 서비스 등록: {name} ({service.__class__.__name__})")
            return True
        except Exception as e:
            logger.error(f"❌ 서비스 등록 실패: {name} - {e}")
            return False
    
    @classmethod
    def get(cls, name: str) -> Optional[BaseService]:
        """서비스 조회"""
        return cls._services.get(name)
    
    @classmethod
    def replace(cls, name: str, new_service: BaseService) -> bool:
        """서비스 교체 (핫스왑)"""
        old_service = cls._services.get(name)
        
        try:
            # 새 서비스 연결
            new_service.connect()
            
            # 이전 서비스 해제
            if old_service:
                old_service.disconnect()
            
            # 교체
            cls._services[name] = new_service
            logger.info(f"🔄 서비스 교체: {name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ 서비스 교체 실패: {name} - {e}")
            return False
    
    @classmethod
    def health_check_all(cls) -> Dict[str, ServiceHealth]:
        """모든 서비스 헬스 체크"""
        results = {}
        for name, service in cls._services.items():
            try:
                results[name] = service.health_check()
            except Exception as e:
                results[name] = ServiceHealth(healthy=False, error=str(e))
        return results
    
    @classmethod
    def list_services(cls) -> List[Dict]:
        """등록된 서비스 목록"""
        return [
            {
                "name": name,
                "type": service.service_type.value,
                "class": service.__class__.__name__,
                "version": service.version,
            }
            for name, service in cls._services.items()
        ]
    
    @classmethod
    def disconnect_all(cls):
        """모든 서비스 연결 해제"""
        for name, service in cls._services.items():
            try:
                service.disconnect()
                logger.info(f"🔌 서비스 해제: {name}")
            except Exception as e:
                logger.error(f"❌ 서비스 해제 실패: {name} - {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# 설정 기반 서비스 로더
# ═══════════════════════════════════════════════════════════════════════════════

SERVICE_CONFIG = {
    "llm": {
        "provider": "openai",  # openai, deepseek, llama, anthropic
        "fallback": ["deepseek", "llama"],
    },
    "vector_db": {
        "provider": "pinecone",  # pinecone, weaviate, qdrant, chroma
        "fallback": ["chroma"],
    },
    "graph_db": {
        "provider": "neo4j",  # neo4j, typedb
        "fallback": ["typedb"],
    },
    "cache": {
        "provider": "redis",  # redis, memcached
        "fallback": [],
    },
    "notification": {
        "provider": "slack",  # slack, discord, email
        "fallback": ["discord"],
    },
}


def load_services_from_config(config: Dict = SERVICE_CONFIG) -> Dict[str, BaseService]:
    """설정 파일에서 서비스 로드"""
    from .llm_selector import LLMSelector
    from .pinecone_client import PineconeClient
    from .typedb_client import TypeDBClient
    
    services = {}
    
    # LLM
    if "llm" in config:
        services["llm"] = LLMSelector()
    
    # Vector DB
    if "vector_db" in config:
        services["vector_db"] = PineconeClient()
    
    # Graph DB
    if "graph_db" in config:
        services["graph_db"] = TypeDBClient()
    
    return services
