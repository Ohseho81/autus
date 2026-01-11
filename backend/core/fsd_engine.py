"""
═══════════════════════════════════════════════════════════════════════════════
🚀 AUTUS FSD Engine v2.0.0 (지능 배포 엔진)
═══════════════════════════════════════════════════════════════════════════════

Full Self-Distribution Engine - 8억 명 대상 지능 배포

프로세스:
1. Ingest: 사용자 데이터 수집
2. Prune: 99%의 노이즈 삭제 (Zero Meaning)
3. Align: 1%의 정수를 36개 노드에 배치
4. Resonate: 앰비언트 배포
5. Stillness: 엔트로피 0 유지

"마스터의 정답 벡터가 사용자 기기에 실시간으로 흐르는 '지능 스트리밍'"
═══════════════════════════════════════════════════════════════════════════════
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import hashlib

from .master_hub import (
    MasterRegistry,
    get_master_registry,
    Domain,
    DOMAINS,
    SECTORS,
    VECTOR_DIM,
)


# ═══════════════════════════════════════════════════════════════════════════════
# 상수 정의
# ═══════════════════════════════════════════════════════════════════════════════

# 엔트로피 임계값 (Zero Meaning 기준)
ENTROPY_THRESHOLD = 0.144

# 최소 신호 강도 (이 미만은 노이즈로 간주)
MIN_SIGNAL_STRENGTH = 0.05

# 공명 증폭 배율
RESONANCE_AMPLIFICATION = 1.12


# ═══════════════════════════════════════════════════════════════════════════════
# 처리 결과 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════

class ProcessingStage(Enum):
    """처리 단계"""
    INGEST = "ingest"
    PRUNE = "prune"
    ALIGN = "align"
    RESONATE = "resonate"
    STILLNESS = "stillness"


@dataclass
class ProcessingResult:
    """처리 결과"""
    success: bool
    stage: ProcessingStage
    input_vector: np.ndarray = None
    output_vector: np.ndarray = None
    optimal_trajectory: np.ndarray = None
    
    # 메트릭
    noise_removed: float = 0.0
    signal_strength: float = 0.0
    resonance_score: float = 0.0
    entropy_delta: float = 0.0
    
    # 매핑 정보
    matched_domain: Optional[str] = None
    matched_nodes: List[str] = field(default_factory=list)
    
    # 메타데이터
    processing_time_ms: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict:
        return {
            "success": self.success,
            "stage": self.stage.value,
            "metrics": {
                "noise_removed": self.noise_removed,
                "signal_strength": self.signal_strength,
                "resonance_score": self.resonance_score,
                "entropy_delta": self.entropy_delta,
            },
            "mapping": {
                "domain": self.matched_domain,
                "nodes": self.matched_nodes,
            },
            "processing_time_ms": self.processing_time_ms,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class OptimalTrajectory:
    """최적 경로 (사용자에게 배포될 '보이지 않는 레일')"""
    user_id: str
    current_position: np.ndarray
    target_position: np.ndarray
    path_vectors: List[np.ndarray]
    
    # 가이드 메타데이터
    primary_domain: str
    suggested_actions: List[str]
    confidence: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "user_id": self.user_id,
            "primary_domain": self.primary_domain,
            "suggested_actions": self.suggested_actions,
            "confidence": self.confidence,
            "path_length": len(self.path_vectors),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# FSD 엔진 (8억 명 지능 배포)
# ═══════════════════════════════════════════════════════════════════════════════

class FSDEngine:
    """
    Full Self-Distribution Engine
    
    마스터의 지능을 8억 명에게 실시간 배포
    """
    
    def __init__(self, registry: Optional[MasterRegistry] = None):
        """
        Args:
            registry: 마스터 레지스트리 (없으면 싱글턴 사용)
        """
        self.registry = registry or get_master_registry()
        
        # 통계
        self._stats = {
            "total_processed": 0,
            "total_pruned": 0,
            "total_aligned": 0,
            "total_distributed": 0,
            "average_noise_ratio": 0.0,
        }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 메인 파이프라인
    # ─────────────────────────────────────────────────────────────────────────
    
    def process_human_input(
        self,
        user_vector: np.ndarray,
        user_id: Optional[str] = None,
    ) -> ProcessingResult:
        """
        80억 명의 입력을 실시간 처리 (모으기-삭제하기-정리하기)
        
        Args:
            user_vector: 사용자 입력 벡터 (512차원)
            user_id: 사용자 ID
        
        Returns:
            ProcessingResult
        """
        start_time = datetime.utcnow()
        
        # 입력 검증
        if user_vector is None or len(user_vector) != VECTOR_DIM:
            return ProcessingResult(
                success=False,
                stage=ProcessingStage.INGEST,
            )
        
        # ─────────────────────────────────────────────────────────────────────
        # Stage 1: INGEST (모으기)
        # ─────────────────────────────────────────────────────────────────────
        input_vector = user_vector.copy()
        original_norm = np.linalg.norm(input_vector)
        
        # ─────────────────────────────────────────────────────────────────────
        # Stage 2: PRUNE (삭제하기) - Zero Meaning 필터
        # ─────────────────────────────────────────────────────────────────────
        clean_vector, noise_removed = self._apply_zero_meaning(input_vector)
        signal_strength = np.linalg.norm(clean_vector) / (original_norm + 1e-10)
        
        # 신호가 너무 약하면 처리 중단
        if signal_strength < MIN_SIGNAL_STRENGTH:
            return ProcessingResult(
                success=False,
                stage=ProcessingStage.PRUNE,
                input_vector=input_vector,
                noise_removed=noise_removed,
                signal_strength=signal_strength,
            )
        
        # ─────────────────────────────────────────────────────────────────────
        # Stage 3: ALIGN (정리하기) - 노드 매핑
        # ─────────────────────────────────────────────────────────────────────
        matched_domain, matched_nodes = self._align_to_nodes(clean_vector)
        
        # ─────────────────────────────────────────────────────────────────────
        # Stage 4: RESONATE (공명) - 최적 경로 계산
        # ─────────────────────────────────────────────────────────────────────
        consensus = self.registry.get_global_consensus()
        optimal_trajectory, resonance_score = self._calculate_optimal_trajectory(
            clean_vector, consensus, matched_domain
        )
        
        # ─────────────────────────────────────────────────────────────────────
        # Stage 5: STILLNESS (고요) - 엔트로피 측정
        # ─────────────────────────────────────────────────────────────────────
        entropy_delta = self._calculate_entropy_delta(input_vector, optimal_trajectory)
        
        # 처리 시간 계산
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        # 통계 업데이트
        self._stats["total_processed"] += 1
        self._stats["total_aligned"] += 1
        
        return ProcessingResult(
            success=True,
            stage=ProcessingStage.STILLNESS,
            input_vector=input_vector,
            output_vector=clean_vector,
            optimal_trajectory=optimal_trajectory,
            noise_removed=noise_removed,
            signal_strength=signal_strength,
            resonance_score=resonance_score,
            entropy_delta=entropy_delta,
            matched_domain=matched_domain,
            matched_nodes=matched_nodes,
            processing_time_ms=processing_time,
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # Zero Meaning 필터 (엔트로피 기반 노이즈 제거)
    # ─────────────────────────────────────────────────────────────────────────
    
    def _apply_zero_meaning(self, vector: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        Zero Meaning 필터: 엔트로피가 높은 노이즈 성분 제거
        
        원리:
        - 임계값(0.144) 미만의 약한 신호는 노이즈로 간주하여 0으로 수렴
        - 강한 신호만 남겨 '본질'을 추출
        
        Args:
            vector: 입력 벡터
        
        Returns:
            (정제된 벡터, 제거된 노이즈 비율)
        """
        clean_vector = vector.copy()
        
        # 절대값이 임계값 미만인 성분을 0으로
        noise_mask = np.abs(clean_vector) < ENTROPY_THRESHOLD
        noise_count = np.sum(noise_mask)
        clean_vector[noise_mask] = 0
        
        # 노이즈 제거 비율
        noise_removed = noise_count / len(vector)
        
        # L2 정규화 (에너지 보존)
        norm = np.linalg.norm(clean_vector)
        if norm > 0:
            clean_vector = clean_vector / norm
        
        return clean_vector, noise_removed
    
    # ─────────────────────────────────────────────────────────────────────────
    # 노드 정렬 (36개 노드에 매핑)
    # ─────────────────────────────────────────────────────────────────────────
    
    def _align_to_nodes(self, vector: np.ndarray) -> Tuple[str, List[str]]:
        """
        벡터를 36개 노드에 정렬
        
        Args:
            vector: 정제된 벡터
        
        Returns:
            (주요 도메인, 매핑된 노드 ID 리스트)
        """
        # 글로벌 합의 로드
        consensus = self.registry.get_global_consensus()
        
        # 각 도메인과의 유사도 계산
        domain_scores = {}
        for d in range(DOMAINS):
            domain_consensus = np.mean(consensus[d], axis=0)
            if np.linalg.norm(domain_consensus) > 0:
                similarity = np.dot(vector, domain_consensus) / (
                    np.linalg.norm(vector) * np.linalg.norm(domain_consensus) + 1e-10
                )
                domain_scores[d] = similarity
            else:
                domain_scores[d] = 0.0
        
        # 가장 유사한 도메인 선택
        best_domain_id = max(domain_scores, key=domain_scores.get)
        best_domain = list(Domain)[best_domain_id]
        
        # 해당 도메인의 노드 ID 생성 (3개 노드)
        base_node_id = best_domain_id * 3 + 1
        matched_nodes = [f"n{base_node_id + i:02d}" for i in range(3)]
        
        return best_domain.code, matched_nodes
    
    # ─────────────────────────────────────────────────────────────────────────
    # 최적 경로 계산 (FSD 핵심)
    # ─────────────────────────────────────────────────────────────────────────
    
    def _calculate_optimal_trajectory(
        self,
        user_vector: np.ndarray,
        consensus: np.ndarray,
        domain_code: str,
    ) -> Tuple[np.ndarray, float]:
        """
        사용자의 현재 상태와 마스터 합의를 비교하여 최적 경로 계산
        
        이것이 사용자에게 '보이지 않는 레일'로 제공되는 가이드
        
        Args:
            user_vector: 사용자 현재 상태 벡터
            consensus: 글로벌 합의 벡터 [12, 12, 512]
            domain_code: 매핑된 도메인 코드
        
        Returns:
            (최적 경로 벡터, 공명 점수)
        """
        # 도메인 ID 찾기
        domain_id = None
        for d, domain_enum in enumerate(Domain):
            if domain_enum.code == domain_code:
                domain_id = d
                break
        
        if domain_id is None:
            return user_vector, 0.0
        
        # 해당 도메인의 합의 (12개 섹터 평균)
        domain_consensus = np.mean(consensus[domain_id], axis=0)
        
        if np.linalg.norm(domain_consensus) < 0.1:
            # 합의가 없으면 현재 벡터 그대로 반환
            return user_vector, 0.0
        
        # 최적 경로 = 현재 상태에서 합의 방향으로의 벡터
        direction = domain_consensus - user_vector
        
        # 공명 증폭 적용
        optimal_trajectory = user_vector + direction * RESONANCE_AMPLIFICATION
        
        # L2 정규화
        norm = np.linalg.norm(optimal_trajectory)
        if norm > 0:
            optimal_trajectory = optimal_trajectory / norm
        
        # 공명 점수 = 현재 상태와 합의의 유사도
        resonance_score = np.dot(user_vector, domain_consensus) / (
            np.linalg.norm(user_vector) * np.linalg.norm(domain_consensus) + 1e-10
        )
        
        return optimal_trajectory, float(resonance_score)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 엔트로피 계산
    # ─────────────────────────────────────────────────────────────────────────
    
    def _calculate_entropy_delta(
        self,
        original: np.ndarray,
        optimized: np.ndarray,
    ) -> float:
        """
        원본과 최적화된 벡터 간의 엔트로피 변화 계산
        
        음수: 엔트로피 감소 (좋음 - 더 정렬됨)
        양수: 엔트로피 증가 (나쁨 - 더 혼란스러움)
        """
        # 벡터의 분산을 엔트로피 대용으로 사용
        original_entropy = np.var(original)
        optimized_entropy = np.var(optimized)
        
        return optimized_entropy - original_entropy
    
    # ─────────────────────────────────────────────────────────────────────────
    # 배치 처리 (대규모 트래픽용)
    # ─────────────────────────────────────────────────────────────────────────
    
    def process_batch(
        self,
        vectors: List[np.ndarray],
        user_ids: Optional[List[str]] = None,
    ) -> List[ProcessingResult]:
        """
        배치 처리 (8억 명 트래픽 대응)
        
        Args:
            vectors: 사용자 벡터 리스트
            user_ids: 사용자 ID 리스트
        
        Returns:
            처리 결과 리스트
        """
        if user_ids is None:
            user_ids = [None] * len(vectors)
        
        results = []
        for vector, user_id in zip(vectors, user_ids):
            result = self.process_human_input(vector, user_id)
            results.append(result)
        
        return results
    
    # ─────────────────────────────────────────────────────────────────────────
    # 통계
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_stats(self) -> Dict[str, Any]:
        """엔진 통계"""
        return {
            **self._stats,
            "registry_stats": self.registry.get_registry_stats(),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════

_engine: Optional[FSDEngine] = None


def get_fsd_engine() -> FSDEngine:
    """FSD 엔진 싱글턴"""
    global _engine
    if _engine is None:
        _engine = FSDEngine()
    return _engine


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    "FSDEngine",
    "ProcessingResult",
    "ProcessingStage",
    "OptimalTrajectory",
    "get_fsd_engine",
    "ENTROPY_THRESHOLD",
]
