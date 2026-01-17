"""
AUTUS Pinecone 클라이언트
========================

Pinecone (pinecone.io) 벡터 검색 통합
- RAG Retrieval Layer
- Hybrid Search (Dense + Sparse)
- 릴리즈 노트 임베딩 저장/검색

AUTUS 활용:
- Behavior Drift 감지: 샘플 출력 임베딩 비교
- Checker Agent: 릴리즈 노트 빠른 검색
- Knowledge Base: 기술 문서 벡터화
"""

import logging
import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any
import os

logger = logging.getLogger(__name__)


@dataclass
class PineconeConfig:
    """Pinecone 연결 설정"""
    api_key: str = ""
    environment: str = "us-east-1"  # 서버리스
    index_name: str = "autus-knowledge"
    dimension: int = 1536  # OpenAI text-embedding-3-small
    metric: str = "cosine"
    
    def __post_init__(self):
        self.api_key = self.api_key or os.getenv("PINECONE_API_KEY", "")


@dataclass
class VectorRecord:
    """벡터 레코드"""
    id: str
    values: list[float]
    metadata: dict = field(default_factory=dict)
    sparse_values: Optional[dict] = None


class PineconeClient:
    """Pinecone 클라이언트"""
    
    def __init__(self, config: Optional[PineconeConfig] = None):
        self.config = config or PineconeConfig()
        self._client = None
        self._index = None
        self._use_mock = True
        self._mock_store: dict[str, VectorRecord] = {}
    
    def connect(self) -> bool:
        """Pinecone 연결"""
        if not self.config.api_key:
            logger.warning("PINECONE_API_KEY가 설정되지 않았습니다. Mock 모드 사용.")
            self._use_mock = True
            return True
        
        try:
            from pinecone import Pinecone, ServerlessSpec
            
            self._client = Pinecone(api_key=self.config.api_key)
            
            # 인덱스 생성 (없으면)
            existing = self._client.list_indexes().names()
            if self.config.index_name not in existing:
                self._client.create_index(
                    name=self.config.index_name,
                    dimension=self.config.dimension,
                    metric=self.config.metric,
                    spec=ServerlessSpec(
                        cloud="aws",
                        region=self.config.environment,
                    ),
                )
                logger.info(f"인덱스 생성: {self.config.index_name}")
            
            self._index = self._client.Index(self.config.index_name)
            self._use_mock = False
            logger.info(f"Pinecone 연결 성공: {self.config.index_name}")
            return True
            
        except ImportError:
            logger.warning("pinecone 패키지가 설치되지 않았습니다. Mock 모드 사용.")
            self._use_mock = True
            return True
            
        except Exception as e:
            logger.warning(f"Pinecone 연결 실패: {e}. Mock 모드 사용.")
            self._use_mock = True
            return True
    
    def upsert(
        self,
        vectors: list[VectorRecord],
        namespace: str = "",
    ) -> int:
        """벡터 업서트"""
        if self._use_mock:
            for v in vectors:
                self._mock_store[v.id] = v
            logger.info(f"[MOCK] {len(vectors)}개 벡터 업서트")
            return len(vectors)
        
        try:
            records = [
                {
                    "id": v.id,
                    "values": v.values,
                    "metadata": v.metadata,
                    **({"sparse_values": v.sparse_values} if v.sparse_values else {}),
                }
                for v in vectors
            ]
            
            response = self._index.upsert(
                vectors=records,
                namespace=namespace,
            )
            
            return response.get("upserted_count", 0)
            
        except Exception as e:
            logger.error(f"벡터 업서트 실패: {e}")
            return 0
    
    def query(
        self,
        vector: list[float],
        top_k: int = 10,
        namespace: str = "",
        filter: Optional[dict] = None,
        include_metadata: bool = True,
    ) -> list[dict]:
        """벡터 쿼리 (유사도 검색)"""
        if self._use_mock:
            # Mock: 간단한 코사인 유사도 계산
            results = []
            for vid, record in self._mock_store.items():
                sim = self._cosine_similarity(vector, record.values)
                results.append({
                    "id": vid,
                    "score": sim,
                    "metadata": record.metadata,
                })
            
            results.sort(key=lambda x: x["score"], reverse=True)
            return results[:top_k]
        
        try:
            response = self._index.query(
                vector=vector,
                top_k=top_k,
                namespace=namespace,
                filter=filter,
                include_metadata=include_metadata,
            )
            
            return [
                {
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata,
                }
                for match in response.matches
            ]
            
        except Exception as e:
            logger.error(f"벡터 쿼리 실패: {e}")
            return []
    
    def hybrid_query(
        self,
        dense_vector: list[float],
        sparse_vector: dict,
        top_k: int = 10,
        alpha: float = 0.5,
        namespace: str = "",
    ) -> list[dict]:
        """하이브리드 쿼리 (Dense + Sparse)"""
        if self._use_mock:
            logger.info("[MOCK] 하이브리드 쿼리 (Dense만 사용)")
            return self.query(dense_vector, top_k, namespace)
        
        try:
            response = self._index.query(
                vector=dense_vector,
                sparse_vector=sparse_vector,
                top_k=top_k,
                namespace=namespace,
                include_metadata=True,
            )
            
            return [
                {
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata,
                }
                for match in response.matches
            ]
            
        except Exception as e:
            logger.error(f"하이브리드 쿼리 실패: {e}")
            return []
    
    def delete(
        self,
        ids: list[str],
        namespace: str = "",
    ) -> bool:
        """벡터 삭제"""
        if self._use_mock:
            for vid in ids:
                self._mock_store.pop(vid, None)
            return True
        
        try:
            self._index.delete(ids=ids, namespace=namespace)
            return True
            
        except Exception as e:
            logger.error(f"벡터 삭제 실패: {e}")
            return False
    
    def get_stats(self) -> dict:
        """인덱스 통계"""
        if self._use_mock:
            return {
                "total_vector_count": len(self._mock_store),
                "dimension": self.config.dimension,
                "index_fullness": len(self._mock_store) / 10000,
            }
        
        try:
            stats = self._index.describe_index_stats()
            return {
                "total_vector_count": stats.total_vector_count,
                "dimension": stats.dimension,
                "namespaces": stats.namespaces,
            }
            
        except Exception as e:
            logger.error(f"통계 조회 실패: {e}")
            return {}
    
    def _cosine_similarity(self, vec1: list[float], vec2: list[float]) -> float:
        """코사인 유사도 계산"""
        if len(vec1) != len(vec2):
            min_len = min(len(vec1), len(vec2))
            vec1 = vec1[:min_len]
            vec2 = vec2[:min_len]
        
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = sum(a * a for a in vec1) ** 0.5
        norm2 = sum(b * b for b in vec2) ** 0.5
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # AUTUS 특화 메서드
    # ═══════════════════════════════════════════════════════════════════════════
    
    def store_release_notes(
        self,
        package: str,
        version: str,
        content: str,
        embeddings: list[float],
    ) -> bool:
        """릴리즈 노트 저장"""
        record_id = f"release_{package}_{version}"
        
        record = VectorRecord(
            id=record_id,
            values=embeddings,
            metadata={
                "package": package,
                "version": version,
                "content": content[:1000],  # 메타데이터 제한
                "indexed_at": datetime.now().isoformat(),
            },
        )
        
        count = self.upsert([record], namespace="releases")
        return count > 0
    
    def search_release_notes(
        self,
        query_embedding: list[float],
        package: Optional[str] = None,
        top_k: int = 5,
    ) -> list[dict]:
        """릴리즈 노트 검색"""
        filter_dict = {"package": package} if package else None
        
        return self.query(
            vector=query_embedding,
            top_k=top_k,
            namespace="releases",
            filter=filter_dict,
        )
    
    def store_behavior_baseline(
        self,
        model: str,
        input_hash: str,
        output_embedding: list[float],
        output_text: str,
    ) -> bool:
        """Behavior Drift 기준선 저장"""
        record_id = f"baseline_{model}_{input_hash}"
        
        record = VectorRecord(
            id=record_id,
            values=output_embedding,
            metadata={
                "model": model,
                "input_hash": input_hash,
                "output_preview": output_text[:500],
                "created_at": datetime.now().isoformat(),
            },
        )
        
        count = self.upsert([record], namespace="baselines")
        return count > 0
    
    def check_behavior_drift(
        self,
        model: str,
        input_hash: str,
        new_embedding: list[float],
        threshold: float = 0.92,
    ) -> dict:
        """Behavior Drift 감지"""
        results = self.query(
            vector=new_embedding,
            top_k=1,
            namespace="baselines",
            filter={"model": model, "input_hash": input_hash},
        )
        
        if not results:
            return {"drifted": False, "message": "기준선 없음", "similarity": 1.0}
        
        similarity = results[0]["score"]
        drifted = similarity < threshold
        
        return {
            "drifted": drifted,
            "similarity": similarity,
            "threshold": threshold,
            "message": "Drift 감지!" if drifted else "정상",
        }
