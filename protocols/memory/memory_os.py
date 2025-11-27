"""
MemoryOS - High-level interface for Local Memory OS

MemoryStore를 래핑하는 상위 레벨 인터페이스
벡터 검색 및 의미 기반 검색 기능 제공
"""
from typing import Any, Dict, Optional, List
from protocols.memory.store import MemoryStore
from protocols.memory.pii_validator import PIIValidator, PIIViolationError
from protocols.memory.vector_search import VectorSearch
from core.utils.logging import get_logger

logger = get_logger(__name__)


class MemoryOS:
    """
    MemoryOS - Local Memory Operating System

    상위 레벨 인터페이스로 MemoryStore를 래핑하고,
    벡터 검색 및 의미 기반 검색 기능을 제공합니다.
    """

    def __init__(self, db_path: str = ".autus/memory/memory.db"):
        """
        MemoryOS 초기화

        Args:
            db_path: 데이터베이스 파일 경로
        """
        self.store = MemoryStore(db_path)
        self._vector_search_engine = VectorSearch()
        # 메모리 인덱싱 (초기화 시 한 번만)
        self._indexed = False
        self._index_memory()

    def _index_memory(self):
        """메모리 인덱싱 (중복 방지)"""
        if not self._indexed:
            self._vector_search_engine.index_memory(self.store)
            self._indexed = True

    def set_preference(self, key: str, value: Any, category: str = "general") -> None:
        """
        선호도 설정 (간편 메서드)

        Args:
            key: 선호도 키
            value: 선호도 값
            category: 카테고리
        """
        self.store.store_preference(key, value, category)
        # 벡터 인덱스 업데이트
        text = f"{key} {value} {category}"
        self._vector_search_engine.index.add_document(
            doc_id=f"pref:{key}",
            text=text,
            metadata={"type": "preference", "key": key, "category": category}
        )
        logger.debug(f"Preference set: {key} = {value}")

    def store_preference(self, key: str, value: Any, category: str = "general") -> None:
        """Alias for set_preference (테스트 호환용)"""
        return self.set_preference(key, value, category)

    def get_preference(self, key: str) -> Optional[Any]:
        """
        선호도 조회

        Args:
            key: 선호도 키

        Returns:
            선호도 값 또는 None
        """
        return self.store.get_preference(key)

    def learn_pattern(self, pattern_type: str, data: Dict[str, Any]) -> None:
        """
        행동 패턴 학습

        Args:
            pattern_type: 패턴 타입
            data: 패턴 데이터
        """
        self.store.store_pattern(pattern_type, data)
        # 벡터 인덱스 업데이트
        import json
        pattern_text = json.dumps(data)
        self._vector_search_engine.index.add_document(
            doc_id=f"pattern:{pattern_type}",
            text=pattern_text,
            metadata={"type": "pattern", "pattern_type": pattern_type}
        )
        logger.debug(f"Pattern learned: {pattern_type}")

    def get_patterns(self, pattern_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        행동 패턴 조회

        Args:
            pattern_type: 특정 타입만 조회 (None이면 전체)

        Returns:
            패턴 리스트
        """
        return self.store.get_patterns(pattern_type)

    def set_context(self, context_type: str, value: Any, expires_at: Optional[str] = None) -> None:
        """
        컨텍스트 설정

        Args:
            context_type: 컨텍스트 타입
            value: 컨텍스트 값
            expires_at: 만료 시간 (ISO 형식)
        """
        self.store.store_context(context_type, value, expires_at)
        logger.debug(f"Context set: {context_type}")

    def get_context(self, context_type: str) -> Optional[Any]:
        """
        컨텍스트 조회

        Args:
            context_type: 컨텍스트 타입

        Returns:
            컨텍스트 값 또는 None
        """
        return self.store.get_context(context_type)

    def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        의미 기반 검색 (TF-IDF 기반)

        Args:
            query: 검색 쿼리
            limit: 결과 개수 제한

        Returns:
            검색 결과 리스트
        """
        return self._vector_search_engine.search(query, limit)

    def vector_search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        벡터 기반 검색 (임베딩 사용)

        Args:
            query: 검색 쿼리
            limit: 결과 개수 제한

        Returns:
            검색 결과 리스트 (유사도 점수 포함)

        Note:
            현재는 TF-IDF 기반으로 구현
            나중에 임베딩 모델 통합 시 실제 벡터 검색 가능
        """
        return self._vector_search_engine.semantic_search(query, limit)

    def semantic_search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        의미 기반 검색 (의미적으로 유사한 내용 찾기)

        Args:
            query: 검색 쿼리
            limit: 결과 개수 제한

        Returns:
            검색 결과 리스트
        """
        return self._vector_search_engine.semantic_search(query, limit)

    def export_memory(self, output_path: str = ".autus/memory.yaml") -> None:
        """
        메모리를 YAML로 내보내기

        Args:
            output_path: 출력 파일 경로
        """
        self.store.export_to_yaml(output_path)
        logger.info(f"Memory exported to {output_path}")

    def get_memory_summary(self) -> Dict[str, Any]:
        """
        메모리 요약 정보

        Returns:
            메모리 통계
        """
        # Preferences 개수
        pref_count = self.store.conn.execute(
            "SELECT COUNT(*) FROM preferences"
        ).fetchone()[0]

        # Patterns 개수
        pattern_count = self.store.conn.execute(
            "SELECT COUNT(*) FROM patterns"
        ).fetchone()[0]

        # Context 개수
        context_count = self.store.conn.execute(
            "SELECT COUNT(*) FROM context"
        ).fetchone()[0]

        return {
            "preferences": pref_count,
            "patterns": pattern_count,
            "context": context_count,
            "total": pref_count + pattern_count + context_count
        }

    def close(self) -> None:
        """연결 닫기"""
        self.store.close()

    def __enter__(self):
        """Context manager 진입"""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager 종료"""
        self.close()
