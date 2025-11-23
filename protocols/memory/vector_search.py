"""
Vector Search for Local Memory OS

로컬 우선 원칙에 따라 외부 API 없이 작동하는 벡터 검색
"""
from typing import List, Dict, Any, Tuple
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class VectorIndex:
    """
    벡터 인덱스 (로컬 우선)
    
    현재는 TF-IDF 기반 검색으로 구현
    나중에 임베딩 모델 통합 가능
    """
    
    def __init__(self):
        self.documents = []
        self.term_frequency = {}
        self.document_frequency = {}
        self._initialized = False
    
    def add_document(self, doc_id: str, text: str, metadata: Dict[str, Any] = None):
        """
        문서 추가
        
        Args:
            doc_id: 문서 ID
            text: 문서 텍스트
            metadata: 메타데이터
        """
        self.documents.append({
            "id": doc_id,
            "text": text,
            "metadata": metadata or {}
        })
        self._update_index(text)
        self._initialized = True
    
    def _update_index(self, text: str):
        """인덱스 업데이트"""
        words = self._tokenize(text)
        doc_id = len(self.documents) - 1
        
        # Term frequency
        if doc_id not in self.term_frequency:
            self.term_frequency[doc_id] = {}
        
        for word in words:
            self.term_frequency[doc_id][word] = \
                self.term_frequency[doc_id].get(word, 0) + 1
            
            # Document frequency
            if word not in self.document_frequency:
                self.document_frequency[word] = set()
            self.document_frequency[word].add(doc_id)
    
    def _tokenize(self, text: str) -> List[str]:
        """텍스트 토큰화"""
        import re
        # 간단한 토큰화 (한글 포함)
        # 한글, 영문, 숫자 모두 포함
        words = re.findall(r'[가-힣]+|\w+', text.lower())
        return words
    
    def search(self, query: str, limit: int = 10) -> List[Tuple[str, float]]:
        """
        TF-IDF 기반 검색
        
        Args:
            query: 검색 쿼리
            limit: 결과 개수 제한
        
        Returns:
            (doc_id, score) 튜플 리스트
        """
        if not self._initialized:
            return []
        
        query_words = self._tokenize(query)
        scores = {}
        
        for doc_id in range(len(self.documents)):
            score = 0.0
            
            for word in query_words:
                # TF (Term Frequency)
                tf = self.term_frequency.get(doc_id, {}).get(word, 0)
                
                # IDF (Inverse Document Frequency)
                df = len(self.document_frequency.get(word, set()))
                if df > 0:
                    idf = len(self.documents) / df
                    score += tf * idf
            
            if score > 0:
                scores[doc_id] = score
        
        # 점수순 정렬
        sorted_results = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return [(self.documents[doc_id]["id"], score) for doc_id, score in sorted_results[:limit]]


class EmbeddingProvider:
    """
    임베딩 제공자 (추상 클래스)
    
    나중에 다양한 임베딩 모델을 통합할 수 있도록 인터페이스 제공
    """
    
    @staticmethod
    def get_embedding(text: str) -> List[float]:
        """
        텍스트를 벡터로 변환
        
        Args:
            text: 입력 텍스트
        
        Returns:
            벡터 (리스트)
        
        Note:
            현재는 구현되지 않음
            나중에 로컬 모델 (sentence-transformers 등) 통합 가능
        """
        # TODO: 임베딩 모델 통합
        # 예: sentence-transformers, all-MiniLM-L6-v2 등
        raise NotImplementedError("Embedding model not yet integrated")
    
    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """
        코사인 유사도 계산
        
        Args:
            vec1: 벡터 1
            vec2: 벡터 2
        
        Returns:
            유사도 점수 (0-1)
        """
        import math
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(a * a for a in vec2))
        
        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0
        
        return dot_product / (magnitude1 * magnitude2)


class VectorSearch:
    """
    벡터 검색 엔진
    
    현재는 TF-IDF 기반으로 구현
    나중에 임베딩 기반으로 확장 가능
    """
    
    def __init__(self):
        self.index = VectorIndex()
        self.embedding_provider = None  # 나중에 초기화
    
    def index_memory(self, memory_store) -> None:
        """
        MemoryStore의 데이터를 인덱싱
        
        Args:
            memory_store: MemoryStore 인스턴스
        """
        # 기존 인덱스 초기화 (중복 방지)
        self.index = VectorIndex()
        
        # Preferences 인덱싱
        prefs = memory_store.conn.execute(
            "SELECT key, value, category FROM preferences"
        ).fetchall()
        
        for key, value, category in prefs:
            text = f"{key} {value} {category}"
            self.index.add_document(
                doc_id=f"pref:{key}",
                text=text,
                metadata={"type": "preference", "key": key, "category": category}
            )
        
        # Patterns 인덱싱
        patterns = memory_store.get_patterns()
        for pattern in patterns:
            pattern_text = json.dumps(pattern.get("data", {}))
            self.index.add_document(
                doc_id=f"pattern:{pattern['type']}",
                text=pattern_text,
                metadata={"type": "pattern", "pattern_type": pattern["type"]}
            )
        
        logger.info(f"Indexed {len(prefs)} preferences and {len(patterns)} patterns")
    
    def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        벡터 검색 실행
        
        Args:
            query: 검색 쿼리
            limit: 결과 개수 제한
        
        Returns:
            검색 결과 리스트
        """
        results = self.index.search(query, limit)
        
        search_results = []
        for doc_id, score in results:
            # 문서 정보 가져오기
            doc = next((d for d in self.index.documents if d["id"] == doc_id), None)
            if doc:
                search_results.append({
                    "id": doc_id,
                    "score": score,
                    "metadata": doc["metadata"],
                    "text": doc["text"][:100]  # 미리보기
                })
        
        return search_results
    
    def semantic_search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        의미 기반 검색 (임베딩 사용)
        
        Args:
            query: 검색 쿼리
            limit: 결과 개수 제한
        
        Returns:
            검색 결과 리스트
        
        Note:
            현재는 TF-IDF로 구현
            나중에 임베딩 모델 통합 시 실제 의미 검색 가능
        """
        # 현재는 TF-IDF 검색으로 대체
        return self.search(query, limit)

