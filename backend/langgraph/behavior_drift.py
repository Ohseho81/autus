"""
AUTUS OpenAI Behavior Drift 감지
================================

LLM 출력 변화 감지 시스템

방법:
1. 샘플 입력 5~10개에 대해 출력 비교
2. Cosine Similarity 측정
3. Perplexity 변화율 측정

임계값:
- cosine_sim < 0.92 → human escalation
- Δperplexity > +8% → human escalation
"""

import logging
import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
import os

logger = logging.getLogger(__name__)


@dataclass
class DriftTestCase:
    """Drift 테스트 케이스"""
    input_text: str
    expected_output: str = ""
    baseline_output: str = ""
    new_output: str = ""
    cosine_similarity: float = 1.0
    perplexity_baseline: float = 0.0
    perplexity_new: float = 0.0


@dataclass
class DriftResult:
    """Drift 감지 결과"""
    is_safe: bool = True
    avg_cosine_similarity: float = 1.0
    delta_perplexity_percent: float = 0.0
    test_cases_passed: int = 0
    test_cases_failed: int = 0
    escalation_reason: str = ""
    details: list = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)


# 표준 테스트 입력 (AUTUS 도메인 특화)
STANDARD_TEST_INPUTS = [
    {
        "input": "HR 온보딩 프로세스를 최적화하려면 어떤 단계가 필요한가요?",
        "expected_keywords": ["온보딩", "프로세스", "단계", "최적화"],
    },
    {
        "input": "Inertia Debt가 0.8을 초과했을 때 어떤 조치를 취해야 하나요?",
        "expected_keywords": ["inertia", "debt", "조치", "위험"],
    },
    {
        "input": "1-12-144 관계 그래프에서 connectivity density를 높이려면?",
        "expected_keywords": ["관계", "그래프", "연결", "밀도"],
    },
    {
        "input": "ΔṠ가 급격히 상승했을 때 Safety Guard의 동작은?",
        "expected_keywords": ["safety", "guard", "엔트로피", "상승"],
    },
    {
        "input": "APQC PCF 7.4 기준 재무 프로세스 모듈을 추천해주세요.",
        "expected_keywords": ["APQC", "재무", "프로세스", "모듈"],
    },
]


class BehaviorDriftDetector:
    """OpenAI Behavior Drift 감지기"""
    
    # 임계값
    COSINE_SIM_THRESHOLD = 0.92
    PERPLEXITY_DELTA_THRESHOLD = 8.0  # %
    
    def __init__(self, model: str = "gpt-4o-mini"):
        """
        Args:
            model: 테스트할 OpenAI 모델
        """
        self.model = model
        self._client = None
        self._baseline_cache = {}
    
    def _get_client(self):
        """OpenAI 클라이언트 반환"""
        if self._client is None:
            try:
                from openai import OpenAI
                self._client = OpenAI()
            except ImportError:
                logger.warning("openai 패키지가 설치되지 않았습니다.")
                return None
            except Exception as e:
                logger.warning(f"OpenAI 클라이언트 초기화 실패: {e}")
                return None
        return self._client
    
    def _get_embedding(self, text: str) -> list[float]:
        """텍스트 임베딩 생성"""
        client = self._get_client()
        if client is None:
            # 폴백: 간단한 해시 기반 벡터
            return self._hash_to_vector(text)
        
        try:
            response = client.embeddings.create(
                model="text-embedding-3-small",
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.warning(f"임베딩 생성 실패: {e}")
            return self._hash_to_vector(text)
    
    def _hash_to_vector(self, text: str, dim: int = 128) -> list[float]:
        """해시 기반 벡터 생성 (폴백)"""
        hash_bytes = hashlib.sha256(text.encode()).digest()
        vector = []
        for i in range(dim):
            byte_val = hash_bytes[i % len(hash_bytes)]
            vector.append((byte_val / 255.0) * 2 - 1)  # -1 ~ 1 범위
        return vector
    
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
    
    def _estimate_perplexity(self, text: str) -> float:
        """Perplexity 추정 (간단한 휴리스틱)"""
        # 실제로는 logprobs 사용, 여기서는 휴리스틱
        words = text.split()
        unique_ratio = len(set(words)) / max(len(words), 1)
        avg_word_len = sum(len(w) for w in words) / max(len(words), 1)
        
        # 낮을수록 예측 가능한 텍스트
        return 10.0 * (1 - unique_ratio) + avg_word_len
    
    def _generate_output(self, input_text: str) -> str:
        """모델 출력 생성"""
        client = self._get_client()
        if client is None:
            # 폴백: 입력 기반 시뮬레이션
            return f"[Simulated Response] {input_text[:100]}..."
        
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "AUTUS 시스템 어시스턴트입니다. 간결하게 답변하세요."},
                    {"role": "user", "content": input_text},
                ],
                max_tokens=200,
                temperature=0.1,  # 결정론적 출력을 위해 낮은 temperature
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"출력 생성 실패: {e}")
            return f"[Error] {e}"
    
    def get_baseline(self, test_cases: Optional[list] = None) -> dict:
        """
        기준선 출력 생성 및 저장
        
        Args:
            test_cases: 테스트 케이스 목록 (None이면 기본 사용)
            
        Returns:
            dict: 입력 해시 → 출력 매핑
        """
        cases = test_cases or STANDARD_TEST_INPUTS
        baseline = {}
        
        logger.info("📊 Baseline 출력 생성 중...")
        
        for case in cases:
            input_text = case["input"]
            input_hash = hashlib.md5(input_text.encode()).hexdigest()[:8]
            
            output = self._generate_output(input_text)
            embedding = self._get_embedding(output)
            perplexity = self._estimate_perplexity(output)
            
            baseline[input_hash] = {
                "input": input_text,
                "output": output,
                "embedding": embedding,
                "perplexity": perplexity,
                "expected_keywords": case.get("expected_keywords", []),
            }
        
        self._baseline_cache = baseline
        return baseline
    
    def detect_drift(
        self,
        baseline: Optional[dict] = None,
        test_cases: Optional[list] = None,
    ) -> DriftResult:
        """
        Behavior Drift 감지
        
        Args:
            baseline: 기준선 데이터 (None이면 캐시 사용)
            test_cases: 테스트 케이스
            
        Returns:
            DriftResult: 감지 결과
        """
        if baseline is None:
            baseline = self._baseline_cache or self.get_baseline(test_cases)
        
        cases = test_cases or STANDARD_TEST_INPUTS
        
        logger.info("🔍 Behavior Drift 감지 시작...")
        
        result = DriftResult()
        similarities = []
        perplexity_deltas = []
        
        for case in cases:
            input_text = case["input"]
            input_hash = hashlib.md5(input_text.encode()).hexdigest()[:8]
            
            if input_hash not in baseline:
                logger.warning(f"Baseline에 없는 입력: {input_text[:30]}...")
                continue
            
            base_data = baseline[input_hash]
            
            # 새 출력 생성
            new_output = self._generate_output(input_text)
            new_embedding = self._get_embedding(new_output)
            new_perplexity = self._estimate_perplexity(new_output)
            
            # Cosine Similarity
            cosine_sim = self._cosine_similarity(base_data["embedding"], new_embedding)
            similarities.append(cosine_sim)
            
            # Perplexity Delta
            base_perplexity = base_data["perplexity"]
            if base_perplexity > 0:
                delta_ppl = ((new_perplexity - base_perplexity) / base_perplexity) * 100
            else:
                delta_ppl = 0.0
            perplexity_deltas.append(delta_ppl)
            
            # 키워드 체크
            expected_keywords = base_data.get("expected_keywords", [])
            keywords_found = sum(1 for kw in expected_keywords if kw.lower() in new_output.lower())
            keyword_ratio = keywords_found / max(len(expected_keywords), 1)
            
            # 개별 테스트 결과
            case_passed = cosine_sim >= self.COSINE_SIM_THRESHOLD and delta_ppl < self.PERPLEXITY_DELTA_THRESHOLD
            
            if case_passed:
                result.test_cases_passed += 1
            else:
                result.test_cases_failed += 1
            
            result.details.append({
                "input_hash": input_hash,
                "cosine_similarity": round(cosine_sim, 4),
                "perplexity_delta_percent": round(delta_ppl, 2),
                "keyword_ratio": round(keyword_ratio, 2),
                "passed": case_passed,
            })
            
            status = "✅" if case_passed else "❌"
            logger.info(f"  {status} {input_hash}: cosine={cosine_sim:.3f}, Δppl={delta_ppl:.1f}%")
        
        # 전체 결과 계산
        if similarities:
            result.avg_cosine_similarity = sum(similarities) / len(similarities)
        if perplexity_deltas:
            result.delta_perplexity_percent = sum(perplexity_deltas) / len(perplexity_deltas)
        
        # 안전성 판단
        escalation_reasons = []
        
        if result.avg_cosine_similarity < self.COSINE_SIM_THRESHOLD:
            escalation_reasons.append(
                f"Cosine Similarity 낮음: {result.avg_cosine_similarity:.3f} < {self.COSINE_SIM_THRESHOLD}"
            )
        
        if result.delta_perplexity_percent > self.PERPLEXITY_DELTA_THRESHOLD:
            escalation_reasons.append(
                f"Perplexity 증가: +{result.delta_perplexity_percent:.1f}% > +{self.PERPLEXITY_DELTA_THRESHOLD}%"
            )
        
        if result.test_cases_failed > result.test_cases_passed:
            escalation_reasons.append(
                f"테스트 실패 과다: {result.test_cases_failed}/{result.test_cases_passed + result.test_cases_failed}"
            )
        
        result.is_safe = len(escalation_reasons) == 0
        result.escalation_reason = "; ".join(escalation_reasons) if escalation_reasons else "모든 검사 통과"
        
        status = "✅ 안전" if result.is_safe else "🚨 Human Escalation 필요"
        logger.info(f"\n결과: {status}")
        logger.info(f"  평균 Cosine Sim: {result.avg_cosine_similarity:.4f}")
        logger.info(f"  평균 Δ Perplexity: {result.delta_perplexity_percent:.2f}%")
        
        return result


def run_drift_detection(model: str = "gpt-4o-mini") -> DriftResult:
    """
    Drift 감지 실행 편의 함수
    
    Args:
        model: 테스트할 모델
        
    Returns:
        DriftResult: 감지 결과
    """
    detector = BehaviorDriftDetector(model=model)
    
    # 기준선 생성
    baseline = detector.get_baseline()
    
    # Drift 감지
    result = detector.detect_drift(baseline)
    
    return result
