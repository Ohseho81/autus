"""
AUTUS GRPO 메타-루프
====================

Group Relative Policy Optimization (GRPO) 기반 자기 진화

DeepSeek-R1의 RL 방식 적용:
- Outcome-only 보상 (최종 결과만 평가)
- Group Baseline (여러 샘플 평균)
- KL 페널티 (급격한 변화 방지)

AUTUS 적용:
- Safety Guard: ΔṠ 예측 정확도 보상
- Inertia Debt: Rolling Average 개선 보상
- Breaking Change: 감지 정확도 보상
"""

import logging
import math
import random
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Callable, Any
from enum import Enum

logger = logging.getLogger(__name__)


class RewardType(Enum):
    """보상 유형"""
    ACCURACY = "accuracy"         # 예측 정확도
    STABILITY = "stability"       # 안정성 유지
    EFFICIENCY = "efficiency"     # 비용/시간 효율
    SAFETY = "safety"             # Safety Guard 트리거 적절성
    FORMAT = "format"             # 출력 형식 준수


@dataclass
class RewardSignal:
    """보상 신호"""
    reward_type: RewardType
    value: float  # -1.0 ~ 1.0
    weight: float = 1.0
    metadata: dict = field(default_factory=dict)
    
    @property
    def weighted_value(self) -> float:
        return self.value * self.weight


@dataclass
class GRPOConfig:
    """GRPO 설정"""
    # 학습률
    learning_rate: float = 3e-6
    
    # KL 페널티 계수
    kl_coefficient: float = 0.001
    
    # 클리핑 비율
    clip_ratio: float = 10.0
    
    # 샘플 수 (그룹 크기)
    group_size: int = 16
    
    # 최대 출력 길이
    max_length: int = 65536
    
    # 온도
    temperature: float = 1.0
    
    # 레퍼런스 모델 업데이트 주기
    reference_update_interval: int = 400
    
    # 보상 가중치
    reward_weights: dict = field(default_factory=lambda: {
        RewardType.ACCURACY: 1.0,
        RewardType.STABILITY: 0.8,
        RewardType.EFFICIENCY: 0.5,
        RewardType.SAFETY: 1.2,
        RewardType.FORMAT: 0.3,
    })


@dataclass
class PolicyState:
    """정책 상태"""
    step: int = 0
    total_reward: float = 0.0
    avg_reward: float = 0.0
    kl_divergence: float = 0.0
    last_update: datetime = field(default_factory=datetime.now)
    history: list = field(default_factory=list)


@dataclass
class Rollout:
    """롤아웃 (하나의 시도)"""
    prompt: str
    response: str
    rewards: list[RewardSignal]
    total_reward: float = 0.0
    log_prob: float = 0.0
    
    def compute_total_reward(self, weights: dict) -> float:
        """가중 총 보상 계산"""
        total = 0.0
        for r in self.rewards:
            w = weights.get(r.reward_type, 1.0)
            total += r.value * r.weight * w
        self.total_reward = total
        return total


class GRPOMetaLoop:
    """GRPO 메타-루프"""
    
    def __init__(self, config: Optional[GRPOConfig] = None):
        self.config = config or GRPOConfig()
        self.state = PolicyState()
        self._llm = None
        self._reference_policy = None
        self._current_policy = None
    
    def set_llm(self, llm):
        """LLM 설정 (LLMSelector 인스턴스)"""
        self._llm = llm
    
    def collect_rollouts(
        self,
        prompt: str,
        reward_fn: Callable[[str], list[RewardSignal]],
        n_samples: Optional[int] = None,
    ) -> list[Rollout]:
        """
        롤아웃 수집 (여러 응답 생성 및 보상 계산)
        
        Args:
            prompt: 입력 프롬프트
            reward_fn: 보상 함수 (응답 → 보상 목록)
            n_samples: 샘플 수 (기본: group_size)
            
        Returns:
            list[Rollout]: 롤아웃 목록
        """
        n = n_samples or self.config.group_size
        rollouts = []
        
        logger.info(f"GRPO 롤아웃 수집: {n}개 샘플")
        
        for i in range(n):
            # 응답 생성
            if self._llm:
                from .llm_selector import TaskType
                response = self._llm.generate(
                    prompt=prompt,
                    task_type=TaskType.REASONING,
                    temperature=self.config.temperature,
                )
                response_text = response.content
            else:
                # Mock
                response_text = f"[Mock Response {i}] {prompt[:30]}..."
            
            # 보상 계산
            rewards = reward_fn(response_text)
            
            rollout = Rollout(
                prompt=prompt,
                response=response_text,
                rewards=rewards,
            )
            rollout.compute_total_reward(self.config.reward_weights)
            rollouts.append(rollout)
        
        return rollouts
    
    def compute_advantages(self, rollouts: list[Rollout]) -> list[float]:
        """
        어드밴티지 계산 (Group Relative)
        
        GRPO 핵심: 그룹 평균 대비 상대적 성과
        advantage = (reward - mean) / std
        """
        if not rollouts:
            return []
        
        rewards = [r.total_reward for r in rollouts]
        
        mean_reward = sum(rewards) / len(rewards)
        variance = sum((r - mean_reward) ** 2 for r in rewards) / len(rewards)
        std_reward = max(math.sqrt(variance), 1e-8)  # 0 방지
        
        advantages = [(r - mean_reward) / std_reward for r in rewards]
        
        logger.info(f"GRPO 어드밴티지: mean={mean_reward:.4f}, std={std_reward:.4f}")
        
        return advantages
    
    def compute_loss(
        self,
        rollouts: list[Rollout],
        advantages: list[float],
    ) -> float:
        """
        GRPO 손실 계산
        
        Loss = -E[advantage * log_prob] + kl_coefficient * KL(current || reference)
        """
        if not rollouts or not advantages:
            return 0.0
        
        # 정책 손실 (어드밴티지 × 로그 확률)
        policy_loss = 0.0
        for rollout, adv in zip(rollouts, advantages):
            # 클리핑
            clipped_adv = max(-self.config.clip_ratio, min(self.config.clip_ratio, adv))
            policy_loss += clipped_adv * rollout.log_prob
        
        policy_loss = -policy_loss / len(rollouts)
        
        # KL 페널티 (현재는 시뮬레이션)
        kl_penalty = self.state.kl_divergence * self.config.kl_coefficient
        
        total_loss = policy_loss + kl_penalty
        
        logger.info(f"GRPO 손실: policy={policy_loss:.4f}, kl={kl_penalty:.4f}, total={total_loss:.4f}")
        
        return total_loss
    
    def update_policy(self, loss: float) -> dict:
        """
        정책 업데이트
        
        실제 구현에서는 PyTorch optimizer.step() 등 사용
        여기서는 상태 업데이트만 시뮬레이션
        """
        self.state.step += 1
        self.state.last_update = datetime.now()
        
        # 레퍼런스 모델 업데이트 (주기적)
        if self.state.step % self.config.reference_update_interval == 0:
            self._update_reference_policy()
            logger.info(f"레퍼런스 정책 업데이트 (step={self.state.step})")
        
        return {
            "step": self.state.step,
            "loss": loss,
            "avg_reward": self.state.avg_reward,
        }
    
    def _update_reference_policy(self):
        """레퍼런스 정책 업데이트"""
        self._reference_policy = self._current_policy
    
    def train_step(
        self,
        prompt: str,
        reward_fn: Callable[[str], list[RewardSignal]],
    ) -> dict:
        """
        한 스텝 학습
        
        Args:
            prompt: 입력 프롬프트
            reward_fn: 보상 함수
            
        Returns:
            dict: 학습 결과
        """
        # 1. 롤아웃 수집
        rollouts = self.collect_rollouts(prompt, reward_fn)
        
        # 2. 어드밴티지 계산
        advantages = self.compute_advantages(rollouts)
        
        # 3. 손실 계산
        loss = self.compute_loss(rollouts, advantages)
        
        # 4. 정책 업데이트
        update_result = self.update_policy(loss)
        
        # 5. 상태 기록
        avg_reward = sum(r.total_reward for r in rollouts) / len(rollouts)
        self.state.avg_reward = avg_reward
        self.state.total_reward += avg_reward
        self.state.history.append({
            "step": self.state.step,
            "avg_reward": avg_reward,
            "loss": loss,
            "timestamp": datetime.now().isoformat(),
        })
        
        # 최근 100개만 유지
        if len(self.state.history) > 100:
            self.state.history = self.state.history[-100:]
        
        return {
            **update_result,
            "rollouts": len(rollouts),
            "avg_reward": avg_reward,
            "best_response": max(rollouts, key=lambda r: r.total_reward).response if rollouts else "",
        }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # AUTUS 특화 보상 함수
    # ═══════════════════════════════════════════════════════════════════════════
    
    @staticmethod
    def reward_delta_s_prediction(
        predicted: float,
        actual: float,
        threshold: float = 0.1,
    ) -> RewardSignal:
        """ΔṠ 예측 정확도 보상"""
        error = abs(predicted - actual)
        
        if error < threshold:
            value = 1.0 - (error / threshold)
        else:
            value = -min(1.0, error / 0.5)
        
        return RewardSignal(
            reward_type=RewardType.ACCURACY,
            value=value,
            weight=1.0,
            metadata={"predicted": predicted, "actual": actual, "error": error},
        )
    
    @staticmethod
    def reward_inertia_improvement(
        before: float,
        after: float,
        target_direction: str = "decrease",
    ) -> RewardSignal:
        """Inertia Debt 개선 보상"""
        delta = before - after if target_direction == "decrease" else after - before
        
        # 개선 시 양수, 악화 시 음수
        value = max(-1.0, min(1.0, delta * 5))
        
        return RewardSignal(
            reward_type=RewardType.STABILITY,
            value=value,
            weight=0.8,
            metadata={"before": before, "after": after, "delta": delta},
        )
    
    @staticmethod
    def reward_safety_guard_accuracy(
        predicted_action: str,
        correct_action: str,
    ) -> RewardSignal:
        """Safety Guard 정확도 보상"""
        actions = ["continue", "throttle", "human_escalation", "rollback"]
        
        if predicted_action == correct_action:
            value = 1.0
        elif predicted_action in actions and correct_action in actions:
            # 부분 점수 (인접 액션)
            pred_idx = actions.index(predicted_action)
            corr_idx = actions.index(correct_action)
            distance = abs(pred_idx - corr_idx)
            value = 1.0 - (distance * 0.3)
        else:
            value = -0.5
        
        return RewardSignal(
            reward_type=RewardType.SAFETY,
            value=value,
            weight=1.2,
            metadata={"predicted": predicted_action, "correct": correct_action},
        )
    
    @staticmethod
    def reward_format_compliance(
        response: str,
        required_keys: list[str],
    ) -> RewardSignal:
        """출력 형식 준수 보상"""
        import json
        
        try:
            # JSON 파싱 가능 여부
            data = json.loads(response)
            
            # 필수 키 존재 여부
            found_keys = sum(1 for k in required_keys if k in data)
            ratio = found_keys / max(len(required_keys), 1)
            
            value = ratio if ratio >= 0.5 else ratio - 0.5
            
        except json.JSONDecodeError:
            # JSON 아님 → 페널티
            value = -0.3
        
        return RewardSignal(
            reward_type=RewardType.FORMAT,
            value=value,
            weight=0.3,
            metadata={"required_keys": required_keys},
        )


def create_autus_reward_fn(
    target_delta_s: float,
    target_inertia: float,
    expected_action: str,
) -> Callable[[str], list[RewardSignal]]:
    """
    AUTUS 보상 함수 생성기
    
    Args:
        target_delta_s: 목표 ΔṠ
        target_inertia: 목표 Inertia Debt
        expected_action: 예상 Safety Guard 액션
        
    Returns:
        Callable: 보상 함수
    """
    def reward_fn(response: str) -> list[RewardSignal]:
        rewards = []
        
        # 형식 보상
        rewards.append(GRPOMetaLoop.reward_format_compliance(
            response,
            ["prediction", "action", "confidence"],
        ))
        
        # 파싱 시도
        try:
            import json
            data = json.loads(response)
            
            # ΔṠ 예측 보상
            if "prediction" in data:
                rewards.append(GRPOMetaLoop.reward_delta_s_prediction(
                    data["prediction"],
                    target_delta_s,
                ))
            
            # Safety Guard 보상
            if "action" in data:
                rewards.append(GRPOMetaLoop.reward_safety_guard_accuracy(
                    data["action"],
                    expected_action,
                ))
                
        except json.JSONDecodeError:
            # 파싱 실패 페널티
            rewards.append(RewardSignal(
                reward_type=RewardType.ACCURACY,
                value=-0.5,
                weight=1.0,
            ))
        
        return rewards
    
    return reward_fn
