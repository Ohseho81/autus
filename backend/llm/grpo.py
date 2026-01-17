"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS GRPO (Group Relative Policy Optimization)
DeepSeek-R1 스타일 RL 최적화 for Self-Evolution Loop (M19)
═══════════════════════════════════════════════════════════════════════════════

GRPO 핵심 원리:
1. Critic/Value 모델 없이 그룹 내 baseline 사용
2. Surrogate Objective + KL Penalty
3. Outcome-Only Reward (최종 결과만 평가)
4. Format/Consistency Reward 보조
"""

import numpy as np
from typing import Dict, Any, List, Optional, Tuple, Callable
from dataclasses import dataclass, field
from enum import Enum
import json
import logging

logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════════════════
# GRPO Configuration
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class GRPOConfig:
    """GRPO 하이퍼파라미터"""
    # 그룹 설정
    group_size: int = 16              # G: 그룹 내 샘플 수
    
    # PPO-style 파라미터
    clip_range: float = 0.2           # ε: clipping range
    kl_penalty: float = 0.01          # β: KL divergence penalty
    
    # 학습률
    learning_rate: float = 1e-5
    
    # Reward weights (w_i)
    outcome_weight: float = 1.0       # w_outcome: 정답 정확도
    format_weight: float = 0.1        # w_format: 형식 보상
    consistency_weight: float = 0.05  # w_consistency: 언어 일관성
    
    # 정규화
    reward_normalize: bool = True     # 그룹 내 reward 정규화
    advantage_normalize: bool = True  # advantage 정규화
    
    # Early stopping
    kl_target: float = 0.02           # Target KL for early stopping
    max_grad_norm: float = 1.0        # Gradient clipping


@dataclass
class GRPOSample:
    """GRPO 단일 샘플"""
    prompt: str
    response: str
    
    # Rewards
    outcome_reward: float = 0.0       # 정답 보상 (0 or 1)
    format_reward: float = 0.0        # 형식 보상 (0-1)
    consistency_reward: float = 0.0   # 일관성 보상 (0-1)
    
    # 계산된 값
    total_reward: float = 0.0
    advantage: float = 0.0
    log_prob: float = 0.0
    
    # 메타데이터
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GRPOBatch:
    """GRPO 배치 (그룹)"""
    samples: List[GRPOSample]
    group_baseline: float = 0.0       # 그룹 평균 reward
    group_std: float = 1.0            # 그룹 reward 표준편차


# ═══════════════════════════════════════════════════════════════════════════════
# Reward Functions
# ═══════════════════════════════════════════════════════════════════════════════

class OutcomeRewardFn:
    """Outcome-Only Reward (정답 여부만 평가)"""
    
    @staticmethod
    def exact_match(response: str, expected: str) -> float:
        """정확히 일치"""
        return 1.0 if response.strip().lower() == expected.strip().lower() else 0.0
    
    @staticmethod
    def contains_answer(response: str, expected: str) -> float:
        """답변 포함 여부"""
        return 1.0 if expected.strip().lower() in response.lower() else 0.0
    
    @staticmethod
    def numeric_match(response: str, expected: float, tolerance: float = 0.01) -> float:
        """숫자 일치 (허용 오차 포함)"""
        import re
        numbers = re.findall(r'-?\d+\.?\d*', response)
        if not numbers:
            return 0.0
        
        for num_str in numbers:
            try:
                num = float(num_str)
                if abs(num - expected) <= tolerance:
                    return 1.0
            except:
                continue
        return 0.0
    
    @staticmethod
    def code_execution(response: str, test_cases: List[Tuple[Any, Any]]) -> float:
        """코드 실행 검증"""
        # 코드 블록 추출
        import re
        code_match = re.search(r'```(?:python)?\n(.*?)```', response, re.DOTALL)
        if not code_match:
            return 0.0
        
        code = code_match.group(1)
        
        passed = 0
        for input_val, expected_output in test_cases:
            try:
                # 안전한 실행 환경 필요 (실제로는 sandbox 사용)
                local_vars = {}
                exec(code, {"__builtins__": {}}, local_vars)
                # 함수 실행 로직...
                passed += 1
            except:
                continue
        
        return passed / len(test_cases) if test_cases else 0.0


class FormatRewardFn:
    """형식 보상 함수"""
    
    @staticmethod
    def has_reasoning_steps(response: str) -> float:
        """추론 단계 포함 여부"""
        step_indicators = [
            "step 1", "step 2", "first,", "second,", "therefore",
            "단계 1", "첫째,", "둘째,", "따라서",
        ]
        count = sum(1 for ind in step_indicators if ind in response.lower())
        return min(1.0, count / 3)  # 3개 이상이면 만점
    
    @staticmethod
    def proper_structure(response: str) -> float:
        """적절한 구조 (단락, 마크다운 등)"""
        score = 0.0
        
        # 단락 분리
        if response.count('\n\n') >= 1:
            score += 0.3
        
        # 마크다운 사용
        if any(marker in response for marker in ['**', '##', '```', '- ', '1.']):
            score += 0.3
        
        # 적절한 길이
        word_count = len(response.split())
        if 50 <= word_count <= 500:
            score += 0.4
        elif 20 <= word_count < 50 or 500 < word_count <= 1000:
            score += 0.2
        
        return score
    
    @staticmethod
    def ends_with_answer(response: str) -> float:
        """최종 답변으로 끝나는지"""
        answer_markers = ["answer:", "conclusion:", "therefore", "thus", "답:", "결론:"]
        return 1.0 if any(marker in response.lower() for marker in answer_markers) else 0.5


class ConsistencyRewardFn:
    """언어 일관성 보상"""
    
    @staticmethod
    def language_consistency(response: str, target_lang: str = "en") -> float:
        """타겟 언어 비율"""
        import re
        
        # 간단한 언어 감지 (실제로는 langdetect 사용)
        korean_chars = len(re.findall(r'[가-힣]', response))
        english_chars = len(re.findall(r'[a-zA-Z]', response))
        total_chars = korean_chars + english_chars
        
        if total_chars == 0:
            return 0.5
        
        if target_lang == "ko":
            return korean_chars / total_chars
        else:
            return english_chars / total_chars
    
    @staticmethod
    def no_language_mixing(response: str) -> float:
        """언어 혼합 없음 (한 문장 내 두 언어 혼합 페널티)"""
        import re
        sentences = re.split(r'[.!?。！？]', response)
        
        mixed_count = 0
        for sentence in sentences:
            has_korean = bool(re.search(r'[가-힣]', sentence))
            has_english = bool(re.search(r'[a-zA-Z]{3,}', sentence))  # 3글자 이상 영어
            if has_korean and has_english:
                mixed_count += 1
        
        if not sentences:
            return 1.0
        
        return 1.0 - (mixed_count / len(sentences))


# ═══════════════════════════════════════════════════════════════════════════════
# GRPO Optimizer
# ═══════════════════════════════════════════════════════════════════════════════

class GRPOOptimizer:
    """
    Group Relative Policy Optimization
    
    PPO의 변형으로, critic 모델 없이 그룹 내 baseline 사용
    """
    
    def __init__(self, config: Optional[GRPOConfig] = None):
        self.config = config or GRPOConfig()
        
        # 보상 함수
        self.outcome_fn: Optional[Callable] = None
        self.format_fn = FormatRewardFn.has_reasoning_steps
        self.consistency_fn = ConsistencyRewardFn.language_consistency
        
        # 통계
        self._stats = {
            "batches_processed": 0,
            "samples_processed": 0,
            "avg_reward": 0.0,
            "avg_advantage": 0.0,
        }
    
    def set_outcome_reward(self, fn: Callable[[str], float]):
        """Outcome reward 함수 설정"""
        self.outcome_fn = fn
    
    def compute_rewards(self, sample: GRPOSample) -> GRPOSample:
        """단일 샘플의 reward 계산"""
        # Outcome reward
        if self.outcome_fn:
            sample.outcome_reward = self.outcome_fn(sample.response)
        
        # Format reward
        sample.format_reward = self.format_fn(sample.response)
        
        # Consistency reward
        sample.consistency_reward = self.consistency_fn(sample.response)
        
        # Total reward (가중 합)
        sample.total_reward = (
            self.config.outcome_weight * sample.outcome_reward +
            self.config.format_weight * sample.format_reward +
            self.config.consistency_weight * sample.consistency_reward
        )
        
        return sample
    
    def compute_batch_baseline(self, batch: GRPOBatch) -> GRPOBatch:
        """그룹 baseline 계산 (GRPO 핵심)"""
        rewards = [s.total_reward for s in batch.samples]
        
        if not rewards:
            return batch
        
        # 그룹 평균 = baseline
        batch.group_baseline = np.mean(rewards)
        batch.group_std = np.std(rewards) + 1e-8  # 0 방지
        
        return batch
    
    def compute_advantages(self, batch: GRPOBatch) -> GRPOBatch:
        """Advantage 계산 (A = R - baseline)"""
        batch = self.compute_batch_baseline(batch)
        
        for sample in batch.samples:
            # Advantage = Reward - Group Baseline
            advantage = sample.total_reward - batch.group_baseline
            
            # 정규화 (옵션)
            if self.config.advantage_normalize and batch.group_std > 0:
                advantage = advantage / batch.group_std
            
            sample.advantage = advantage
        
        return batch
    
    def compute_surrogate_loss(self, batch: GRPOBatch) -> float:
        """
        PPO-style Surrogate Loss 계산
        
        L = -E[min(r(θ) * A, clip(r(θ), 1-ε, 1+ε) * A)]
        
        여기서는 log_prob 대신 advantage만 사용 (simplified)
        """
        losses = []
        
        for sample in batch.samples:
            # Simplified: ratio = 1 (현재 정책이므로)
            # 실제로는 log_prob 차이로 ratio 계산 필요
            ratio = 1.0
            
            # Clipped ratio
            clipped_ratio = np.clip(
                ratio,
                1 - self.config.clip_range,
                1 + self.config.clip_range
            )
            
            # Surrogate loss
            loss = -min(ratio * sample.advantage, clipped_ratio * sample.advantage)
            losses.append(loss)
        
        return np.mean(losses)
    
    def optimize_step(self, batch: GRPOBatch) -> Dict[str, float]:
        """단일 최적화 스텝"""
        # 1. Reward 계산
        for sample in batch.samples:
            self.compute_rewards(sample)
        
        # 2. Advantage 계산
        batch = self.compute_advantages(batch)
        
        # 3. Loss 계산
        loss = self.compute_surrogate_loss(batch)
        
        # 4. 통계 업데이트
        self._stats["batches_processed"] += 1
        self._stats["samples_processed"] += len(batch.samples)
        self._stats["avg_reward"] = np.mean([s.total_reward for s in batch.samples])
        self._stats["avg_advantage"] = np.mean([s.advantage for s in batch.samples])
        
        return {
            "loss": loss,
            "avg_reward": self._stats["avg_reward"],
            "avg_advantage": self._stats["avg_advantage"],
            "group_baseline": batch.group_baseline,
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """통계 조회"""
        return self._stats.copy()


# ═══════════════════════════════════════════════════════════════════════════════
# AUTUS Integration: Self-Evolution Loop (M19)
# ═══════════════════════════════════════════════════════════════════════════════

class AutusSelfEvolutionGRPO:
    """
    AUTUS 자기 진화 루프 (M19)
    GRPO 기반 K/I/r 계수 최적화
    """
    
    def __init__(self):
        self.optimizer = GRPOOptimizer()
        self.evolution_history: List[Dict] = []
    
    def evaluate_decision_outcome(
        self,
        decision_id: str,
        predicted_k: int,
        actual_outcome: str,  # "success" | "failure" | "partial"
        feedback: Optional[str] = None,
    ) -> float:
        """
        의사결정 결과 평가
        
        Returns:
            outcome_reward: 0.0 ~ 1.0
        """
        outcome_rewards = {
            "success": 1.0,
            "partial": 0.5,
            "failure": 0.0,
        }
        
        base_reward = outcome_rewards.get(actual_outcome, 0.5)
        
        # K 레벨 적절성 보너스
        # (실제 필요 K와 예측 K가 일치할수록 보너스)
        k_accuracy_bonus = 0.0
        if feedback and "k_should_be" in feedback:
            # 피드백에서 실제 필요 K 추출
            pass
        
        return min(1.0, base_reward + k_accuracy_bonus)
    
    def collect_feedback_batch(
        self,
        decisions: List[Dict[str, Any]],
    ) -> GRPOBatch:
        """의사결정 피드백 배치 수집"""
        samples = []
        
        for decision in decisions:
            sample = GRPOSample(
                prompt=json.dumps({
                    "event_type": decision.get("event_type"),
                    "M": decision.get("M"),
                    "I": decision.get("I"),
                    "R": decision.get("R"),
                    "T": decision.get("T"),
                }),
                response=json.dumps({
                    "k_predicted": decision.get("k_final"),
                    "allowed": decision.get("allowed"),
                }),
                outcome_reward=self.evaluate_decision_outcome(
                    decision_id=decision.get("decision_id", ""),
                    predicted_k=decision.get("k_final", 1),
                    actual_outcome=decision.get("actual_outcome", "success"),
                ),
                metadata=decision,
            )
            samples.append(sample)
        
        return GRPOBatch(samples=samples)
    
    def evolution_step(
        self,
        decisions: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        진화 스텝 실행
        
        1. 피드백 배치 수집
        2. GRPO 최적화
        3. K/I/r 계수 조정 제안
        """
        batch = self.collect_feedback_batch(decisions)
        
        # GRPO 최적화
        result = self.optimizer.optimize_step(batch)
        
        # 계수 조정 제안 (간단한 휴리스틱)
        coefficient_adjustments = self._suggest_coefficient_adjustments(batch)
        
        evolution_record = {
            "timestamp": str(np.datetime64('now')),
            "batch_size": len(batch.samples),
            "grpo_result": result,
            "coefficient_adjustments": coefficient_adjustments,
        }
        
        self.evolution_history.append(evolution_record)
        
        return evolution_record
    
    def _suggest_coefficient_adjustments(
        self,
        batch: GRPOBatch,
    ) -> Dict[str, float]:
        """계수 조정 제안"""
        # 실패한 샘플 분석
        failures = [s for s in batch.samples if s.outcome_reward < 0.5]
        successes = [s for s in batch.samples if s.outcome_reward >= 0.5]
        
        adjustments = {
            "k_threshold_delta": 0.0,
            "omega_scale_delta": 0.0,
        }
        
        if len(failures) > len(successes):
            # 실패가 많으면 더 보수적으로
            adjustments["k_threshold_delta"] = 0.05  # K 임계값 상향
        elif len(successes) > len(failures) * 2:
            # 성공이 훨씬 많으면 효율화
            adjustments["k_threshold_delta"] = -0.02  # K 임계값 하향
        
        return adjustments
    
    def get_evolution_summary(self) -> Dict[str, Any]:
        """진화 요약"""
        if not self.evolution_history:
            return {"status": "no_evolution_yet"}
        
        recent = self.evolution_history[-10:]  # 최근 10개
        
        return {
            "total_steps": len(self.evolution_history),
            "recent_avg_reward": np.mean([r["grpo_result"]["avg_reward"] for r in recent]),
            "recent_avg_loss": np.mean([r["grpo_result"]["loss"] for r in recent]),
            "latest_adjustments": self.evolution_history[-1]["coefficient_adjustments"],
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Global Instance
# ═══════════════════════════════════════════════════════════════════════════════

_self_evolution: Optional[AutusSelfEvolutionGRPO] = None


def get_self_evolution() -> AutusSelfEvolutionGRPO:
    """Self-Evolution 싱글톤"""
    global _self_evolution
    if _self_evolution is None:
        _self_evolution = AutusSelfEvolutionGRPO()
    return _self_evolution
