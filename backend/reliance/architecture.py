"""
AUTUS Reliance Architecture v1.0
=================================

No Addiction, Guaranteed Dependence

핵심: 중독(addiction)을 설계하지 않고도 의존(reliance)이 발생하도록 만든다.
의존은 자극이 아니라 일관성에서 생긴다.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Callable
from enum import Enum
from datetime import datetime, timedelta
import hashlib


# ============================================
# 최상위 선언 (강제)
# ============================================

CORE_PRINCIPLES = """
1. AUTUS는 중독을 설계하지 않는다
2. AUTUS는 감정 자극을 상한·빈도·맥락으로 제한한다
3. AUTUS는 개인 효용과 집단 안전을 동시에 만족할 때만 개입한다
"""


# ============================================
# 금지/허용 메커니즘 정의
# ============================================

class MechanismType(Enum):
    """메커니즘 유형"""
    FORBIDDEN = "forbidden"     # 절대 금지
    ALLOWED = "allowed"         # 허용
    CONDITIONAL = "conditional" # 조건부 허용


@dataclass
class Mechanism:
    """메커니즘 정의"""
    name: str
    name_ko: str
    mechanism_type: MechanismType
    description: str
    constraints: List[str] = field(default_factory=list)


# 금지되는 중독 메커니즘
FORBIDDEN_MECHANISMS: Dict[str, Mechanism] = {
    "variable_reward": Mechanism(
        name="variable_reward",
        name_ko="가변 보상",
        mechanism_type=MechanismType.FORBIDDEN,
        description="랜덤/예측불가 보상으로 도파민 조작",
        constraints=["슬롯머신 효과", "서프라이즈 보상", "랜덤 혜택"],
    ),
    "scoring_ranking": Mechanism(
        name="scoring_ranking",
        name_ko="점수/랭킹",
        mechanism_type=MechanismType.FORBIDDEN,
        description="점수화와 순위 비교로 경쟁 유발",
        constraints=["리더보드", "점수 시스템", "레벨 시스템"],
    ),
    "social_comparison": Mechanism(
        name="social_comparison",
        name_ko="비교 우월감",
        mechanism_type=MechanismType.FORBIDDEN,
        description="타인과 비교하여 우월감/열등감 유발",
        constraints=["'다른 사람은...'", "평균 비교", "상위 %"],
    ),
    "frequent_notification": Mechanism(
        name="frequent_notification",
        name_ko="빈번 알림",
        mechanism_type=MechanismType.FORBIDDEN,
        description="잦은 알림으로 주의력 착취",
        constraints=["푸시 폭격", "실시간 업데이트", "FOMO 유발"],
    ),
    "streak_pressure": Mechanism(
        name="streak_pressure",
        name_ko="연속 강화 압박",
        mechanism_type=MechanismType.FORBIDDEN,
        description="연속 기록으로 이탈 두려움 유발",
        constraints=["연속 n일", "스트릭 보너스", "끊김 페널티"],
    ),
}

# 허용되는 의존 메커니즘
ALLOWED_MECHANISMS: Dict[str, Mechanism] = {
    "trust_checkpoint": Mechanism(
        name="trust_checkpoint",
        name_ko="결정 전 확인점",
        mechanism_type=MechanismType.ALLOWED,
        description="결정 전 마지막 확인점으로서의 신뢰",
        constraints=[],
    ),
    "silent_accuracy": Mechanism(
        name="silent_accuracy",
        name_ko="침묵의 정확성",
        mechanism_type=MechanismType.ALLOWED,
        description="말 안 해도 맞는 시스템",
        constraints=[],
    ),
    "fair_validation": Mechanism(
        name="fair_validation",
        name_ko="사후 검증의 공정성",
        mechanism_type=MechanismType.ALLOWED,
        description="틀리면 조용히, 맞으면 확인만",
        constraints=[],
    ),
    "completion_dopamine": Mechanism(
        name="completion_dopamine",
        name_ko="완결 도파민",
        mechanism_type=MechanismType.CONDITIONAL,
        description="'이 건은 끝났다' 확인",
        constraints=["결과 확인 후 1회만", "시각적 과잉 없음"],
    ),
    "efficacy_dopamine": Mechanism(
        name="efficacy_dopamine",
        name_ko="자기효능 도파민",
        mechanism_type=MechanismType.CONDITIONAL,
        description="'내 결정이 손실을 막았다' 확인",
        constraints=["결과 확인 후 1회만", "연속 강화 금지"],
    ),
    "deadline_anxiety": Mechanism(
        name="deadline_anxiety",
        name_ko="시간 한정 불안",
        mechanism_type=MechanismType.CONDITIONAL,
        description="마감 임박 시 단 한 번 경고",
        constraints=["반복 노출 금지", "단 1회"],
    ),
    "loss_awareness": Mechanism(
        name="loss_awareness",
        name_ko="손실 인식 불안",
        mechanism_type=MechanismType.CONDITIONAL,
        description="비용 유형 명시 (과장 금지)",
        constraints=["사실만 전달", "과장 금지", "사회적 비교 금지"],
    ),
}


# ============================================
# 개입 가드레일
# ============================================

@dataclass
class InterventionGuardrail:
    """개입 가드레일"""
    name: str
    rule: str
    violation_action: str


GUARDRAILS: List[InterventionGuardrail] = [
    InterventionGuardrail(
        name="exposure",
        rule="개인에게 Top-1 경고만 노출",
        violation_action="추가 경고 숨김",
    ),
    InterventionGuardrail(
        name="comparison",
        rule="개인 간 비교 절대 금지",
        violation_action="메시지 차단",
    ),
    InterventionGuardrail(
        name="pressure",
        rule="집단 목표로 개인 압박 금지",
        violation_action="메시지 재작성",
    ),
    InterventionGuardrail(
        name="reward",
        rule="집단 성과 보상 금지",
        violation_action="보상 요소 제거",
    ),
    InterventionGuardrail(
        name="transparency",
        rule="계산 근거 비노출 (요청 시 제공)",
        violation_action="상세 숨김",
    ),
]


# ============================================
# 개입 빈도 제한
# ============================================

@dataclass
class InterventionLimit:
    """개입 빈도 제한"""
    intervention_type: str
    max_per_day: int
    min_interval_hours: float
    cooldown_after_action: int  # 사용자 액션 후 쿨다운 (시간)


INTERVENTION_LIMITS: Dict[str, InterventionLimit] = {
    "critical_alert": InterventionLimit(
        intervention_type="critical_alert",
        max_per_day=1,
        min_interval_hours=24,
        cooldown_after_action=48,
    ),
    "warning": InterventionLimit(
        intervention_type="warning",
        max_per_day=2,
        min_interval_hours=8,
        cooldown_after_action=24,
    ),
    "suggestion": InterventionLimit(
        intervention_type="suggestion",
        max_per_day=3,
        min_interval_hours=4,
        cooldown_after_action=12,
    ),
    "completion_feedback": InterventionLimit(
        intervention_type="completion_feedback",
        max_per_day=5,
        min_interval_hours=1,
        cooldown_after_action=0,  # 완료 피드백은 쿨다운 없음
    ),
}


# ============================================
# 메시지 검증기
# ============================================

class MessageValidator:
    """
    메시지 검증기
    
    모든 사용자 대면 메시지는 이 검증기를 통과해야 함
    """
    
    # 금지 패턴
    FORBIDDEN_PATTERNS = [
        # 비교
        "다른 사람", "다른 사용자", "평균", "상위", "하위",
        "%의 사람들", "대부분의", "소수만",
        
        # 점수/랭킹
        "점수", "레벨", "랭킹", "순위", "1위", "꼴찌",
        
        # 연속 강화
        "연속", "스트릭", "연", "일차", "n일째",
        
        # 과잉 자극
        "놀라운", "믿을 수 없는", "대단한", "최고의",
        "!!!", "🎉🎉", "축하합니다!!!",
        
        # FOMO
        "놓치", "지금 아니면", "한정", "마지막 기회",
        
        # 집단 압박
        "모두가", "함께", "우리 모두", "집단 목표",
    ]
    
    # 허용 패턴 (완결/자기효능)
    ALLOWED_COMPLETION = [
        "완료", "처리됨", "끝", "확인됨",
    ]
    
    ALLOWED_EFFICACY = [
        "예방됨", "방지됨", "절감됨", "확보됨",
    ]
    
    @classmethod
    def validate(cls, message: str) -> Dict:
        """
        메시지 검증
        
        Returns:
            {
                "valid": bool,
                "violations": List[str],
                "sanitized": str (수정된 메시지)
            }
        """
        violations = []
        sanitized = message
        
        # 금지 패턴 검사
        for pattern in cls.FORBIDDEN_PATTERNS:
            if pattern in message:
                violations.append(f"금지 패턴: '{pattern}'")
                sanitized = sanitized.replace(pattern, "[제거됨]")
        
        # 과잉 이모지 검사
        emoji_count = sum(1 for c in message if ord(c) > 127000)
        if emoji_count > 2:
            violations.append(f"과잉 이모지: {emoji_count}개")
        
        # 과잉 느낌표 검사
        if message.count("!") > 1:
            violations.append("과잉 느낌표")
            sanitized = sanitized.replace("!!", ".")
            sanitized = sanitized.replace("!", ".")
        
        return {
            "valid": len(violations) == 0,
            "violations": violations,
            "sanitized": sanitized if violations else message,
        }
    
    @classmethod
    def create_safe_message(
        cls,
        message_type: str,
        content: str,
        context: Dict = None
    ) -> str:
        """
        안전한 메시지 생성
        """
        templates = {
            "completion": "{content}",
            "efficacy": "{content}",
            "warning": "{content}",
            "critical": "⚠️ {content}",
        }
        
        template = templates.get(message_type, "{content}")
        message = template.format(content=content)
        
        # 검증
        result = cls.validate(message)
        return result["sanitized"]


# ============================================
# 외부성 계산기 (집단 영향)
# ============================================

class ExternalityCalculator:
    """
    외부성 계산기
    
    개인 행동이 타인에게 미치는 영향을 계산
    단, 개인 간 비교는 하지 않음
    """
    
    @staticmethod
    def calculate_reversibility_impact(
        action_type: str,
        action_data: Dict,
        collective_state: Dict
    ) -> Dict:
        """
        되돌림 가능성 영향 계산
        
        질문: 개인 A의 결정이 개인 B·C의 되돌림 가능성을 감소시키는가?
        
        Returns:
            {
                "has_negative_externality": bool,
                "affected_dimension": str,
                "severity": "low" | "medium" | "high",
                "warning_message": str (개인에게만 표시)
            }
        """
        # 예시 계산 (실제로는 더 복잡한 모델)
        externality = {
            "has_negative_externality": False,
            "affected_dimension": None,
            "severity": None,
            "warning_message": None,
        }
        
        # 자원 고갈 체크
        if action_type == "resource_consumption":
            consumption_rate = action_data.get("rate", 0)
            collective_reserve = collective_state.get("reserve", 100)
            
            if consumption_rate > collective_reserve * 0.1:
                externality.update({
                    "has_negative_externality": True,
                    "affected_dimension": "resource",
                    "severity": "medium",
                    "warning_message": "이 결정은 공유 자원에 영향을 줄 수 있습니다",
                })
        
        return externality
    
    @staticmethod
    def create_externality_warning(externality: Dict) -> Optional[str]:
        """
        외부성 경고 생성 (개인에게만)
        
        규칙:
        - 타인의 신원 공개 ❌
        - 집단 최적화 강제 ❌
        - 경고만 ⭕
        """
        if not externality.get("has_negative_externality"):
            return None
        
        # 방향만 경고, 구체적 피해자 언급 없음
        severity = externality.get("severity", "low")
        dimension = externality.get("affected_dimension", "general")
        
        warnings = {
            "resource": {
                "low": "자원 사용량이 평소보다 높습니다",
                "medium": "이 결정은 공유 자원에 영향을 줄 수 있습니다",
                "high": "자원 고갈 위험이 있습니다",
            },
            "time": {
                "low": "일정에 여유가 줄어들 수 있습니다",
                "medium": "다른 작업에 영향을 줄 수 있습니다",
                "high": "마감 위험이 있습니다",
            },
        }
        
        return warnings.get(dimension, {}).get(severity)


# ============================================
# 개입 관리자
# ============================================

class InterventionManager:
    """
    개입 관리자
    
    모든 사용자 개입을 관리하고 제한
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.intervention_log: List[Dict] = []
        self.last_interventions: Dict[str, datetime] = {}
        self.daily_counts: Dict[str, int] = {}
        self._last_reset: datetime = datetime.now()
    
    def _check_daily_reset(self):
        """일일 리셋 확인"""
        now = datetime.now()
        if now.date() > self._last_reset.date():
            self.daily_counts = {}
            self._last_reset = now
    
    def can_intervene(self, intervention_type: str) -> bool:
        """개입 가능 여부 확인"""
        self._check_daily_reset()
        
        limit = INTERVENTION_LIMITS.get(intervention_type)
        if not limit:
            return False
        
        now = datetime.now()
        
        # 일일 제한 확인
        daily_count = self.daily_counts.get(intervention_type, 0)
        if daily_count >= limit.max_per_day:
            return False
        
        # 최소 간격 확인
        last_time = self.last_interventions.get(intervention_type)
        if last_time:
            elapsed = (now - last_time).total_seconds() / 3600
            if elapsed < limit.min_interval_hours:
                return False
        
        return True
    
    def record_intervention(self, intervention_type: str, message: str):
        """개입 기록"""
        now = datetime.now()
        
        self.intervention_log.append({
            "type": intervention_type,
            "message": message,
            "timestamp": now.isoformat(),
        })
        
        self.last_interventions[intervention_type] = now
        self.daily_counts[intervention_type] = \
            self.daily_counts.get(intervention_type, 0) + 1
    
    def create_intervention(
        self,
        intervention_type: str,
        content: str,
        context: Dict = None
    ) -> Optional[Dict]:
        """
        개입 생성
        
        모든 가드레일을 통과한 경우에만 생성
        """
        # 개입 가능 여부
        if not self.can_intervene(intervention_type):
            return None
        
        # 메시지 검증
        validated = MessageValidator.validate(content)
        if not validated["valid"]:
            content = validated["sanitized"]
        
        # 안전한 메시지 생성
        safe_message = MessageValidator.create_safe_message(
            intervention_type, content, context
        )
        
        # 기록
        self.record_intervention(intervention_type, safe_message)
        
        return {
            "type": intervention_type,
            "message": safe_message,
            "timestamp": datetime.now().isoformat(),
        }
    
    def reset_daily_counts(self):
        """일일 카운트 리셋"""
        self.daily_counts = {}
    
    def get_remaining_interventions(self) -> Dict[str, int]:
        """남은 개입 횟수"""
        self._check_daily_reset()
        remaining = {}
        for int_type, limit in INTERVENTION_LIMITS.items():
            used = self.daily_counts.get(int_type, 0)
            remaining[int_type] = max(0, limit.max_per_day - used)
        return remaining


# ============================================
# 신뢰 축적기
# ============================================

class TrustAccumulator:
    """
    신뢰 축적기
    
    중독이 아닌 신뢰로 의존을 만든다
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.predictions: List[Dict] = []
        self.correct_predictions: int = 0
        self.total_predictions: int = 0
        self.silent_successes: int = 0  # 말 안 해도 맞은 횟수
    
    def record_prediction(
        self,
        prediction_id: str,
        prediction: str,
        confidence: float,
        was_shown: bool  # 사용자에게 보여졌는지
    ):
        """예측 기록"""
        self.predictions.append({
            "id": prediction_id,
            "prediction": prediction,
            "confidence": confidence,
            "was_shown": was_shown,
            "timestamp": datetime.now().isoformat(),
            "outcome": None,
        })
        self.total_predictions += 1
    
    def record_outcome(
        self,
        prediction_id: str,
        was_correct: bool
    ):
        """결과 기록"""
        for pred in self.predictions:
            if pred["id"] == prediction_id:
                pred["outcome"] = was_correct
                if was_correct:
                    self.correct_predictions += 1
                    if not pred["was_shown"]:
                        self.silent_successes += 1
                break
    
    @property
    def accuracy(self) -> float:
        """정확도"""
        if self.total_predictions == 0:
            return 0.0
        return self.correct_predictions / self.total_predictions
    
    @property
    def silent_accuracy(self) -> float:
        """침묵의 정확성 (말 안 해도 맞은 비율)"""
        if self.correct_predictions == 0:
            return 0.0
        return self.silent_successes / self.correct_predictions
    
    def get_trust_level(self) -> str:
        """신뢰 수준"""
        accuracy = self.accuracy
        if accuracy >= 0.8 and self.total_predictions >= 10:
            return "high"
        elif accuracy >= 0.6 and self.total_predictions >= 5:
            return "medium"
        else:
            return "building"
    
    def to_dict(self) -> Dict:
        """딕셔너리 변환"""
        return {
            "user_id": self.user_id,
            "trust_level": self.get_trust_level(),
            "accuracy": self.accuracy,
            "total_predictions": self.total_predictions,
            "correct_predictions": self.correct_predictions,
            "silent_accuracy": self.silent_accuracy,
        }


# ============================================
# 피드백 생성기 (안전한)
# ============================================

class SafeFeedbackGenerator:
    """
    안전한 피드백 생성기
    
    도파민/불안의 안전한 한계 내 사용
    """
    
    @staticmethod
    def completion_feedback(task_name: str) -> str:
        """완결 피드백 (1회)"""
        # 시각적 과잉 없음, 간결
        return f"✓ {task_name}"
    
    @staticmethod
    def efficacy_feedback(action: str, prevented_loss: str) -> str:
        """자기효능 피드백 (1회)"""
        # 과장 없이 사실만
        return f"→ {action}: {prevented_loss} 방지됨"
    
    @staticmethod
    def deadline_warning(deadline: str, remaining: str) -> str:
        """시간 한정 불안 (1회만)"""
        # 반복 노출 금지
        return f"⏰ {deadline} 마감, {remaining} 남음"
    
    @staticmethod
    def loss_awareness(loss_type: str, amount: str) -> str:
        """손실 인식 (과장 금지)"""
        # 사실만 전달
        return f"ℹ️ {loss_type}: {amount}"
    
    @staticmethod
    def silent_success() -> None:
        """
        틀리면 침묵
        
        맞았을 때도 대부분 침묵 (사용자가 요청 시에만 확인)
        """
        return None


# ============================================
# 즉시 중단 신호 감지기
# ============================================

class ViolationDetector:
    """
    위반 감지기
    
    하나라도 발생하면 범위 축소
    """
    
    VIOLATION_SIGNALS = [
        "점수/랭킹 요청",
        "연속 알림 요구",
        "'다른 사람은 이렇게 했다' 노출",
        "집단 목표를 개인에게 강요",
        "비교 우월감 유발",
        "FOMO 자극",
    ]
    
    @classmethod
    def check_request(cls, request: str) -> Dict:
        """요청 검사"""
        violations = []
        
        patterns = {
            "점수/랭킹 요청": ["점수", "랭킹", "순위", "레벨"],
            "연속 알림 요구": ["계속 알려", "자주 알림", "실시간"],
            "비교 요청": ["다른 사람", "평균", "비교"],
            "집단 강요": ["모두가", "같이", "강제"],
        }
        
        for violation_type, keywords in patterns.items():
            for keyword in keywords:
                if keyword in request:
                    violations.append(violation_type)
                    break
        
        return {
            "has_violations": len(violations) > 0,
            "violations": violations,
            "action": "범위 축소" if violations else "정상 처리",
        }
    
    @classmethod
    def check_response(cls, response: str) -> Dict:
        """응답 검사"""
        return MessageValidator.validate(response)


# ============================================
# Reliance Engine (통합)
# ============================================

class RelianceEngine:
    """
    의존 엔진
    
    중독 없이 의존을 만드는 핵심 엔진
    
    원칙:
    - 자주 말하지 않는다
    - 말할 때는 늦지 않다
    - 축하는 결과 확인 후 1회
    - 틀리면 침묵
    
    → 사용자는 결정 순간에만 AUTUS를 찾는다
    """
    
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.intervention_manager = InterventionManager(user_id)
        self.trust_accumulator = TrustAccumulator(user_id)
        self.externality_calculator = ExternalityCalculator()
        self.violation_detector = ViolationDetector()
    
    def should_speak(self, event_type: str, severity: str) -> bool:
        """
        말해야 하는가?
        
        대부분의 경우: 침묵
        말해야 할 때: 늦지 않게
        """
        # 위험한 경우만 말한다
        if severity == "critical":
            return self.intervention_manager.can_intervene("critical_alert")
        
        if severity == "warning":
            return self.intervention_manager.can_intervene("warning")
        
        # 나머지는 침묵
        return False
    
    def create_message(
        self,
        message_type: str,
        content: str,
        context: Dict = None
    ) -> Optional[str]:
        """
        메시지 생성 (모든 가드레일 통과 후)
        """
        # 위반 검사
        validation = self.violation_detector.check_response(content)
        if not validation["valid"]:
            content = validation["sanitized"]
        
        # 개입 생성
        intervention = self.intervention_manager.create_intervention(
            message_type, content, context
        )
        
        if intervention:
            return intervention["message"]
        return None
    
    def record_prediction(
        self,
        prediction_id: str,
        prediction: str,
        confidence: float,
        was_shown: bool = False
    ):
        """예측 기록"""
        self.trust_accumulator.record_prediction(
            prediction_id, prediction, confidence, was_shown
        )
    
    def record_outcome(self, prediction_id: str, was_correct: bool):
        """
        성공/실패 기록
        
        틀리면: 조용히 기록
        맞으면: 조용히 기록 (대부분), 요청 시 확인
        """
        self.trust_accumulator.record_outcome(prediction_id, was_correct)
        
        # 맞아도 축하하지 않음 (사용자가 물어보면 답함)
        # 틀려도 변명하지 않음 (조용히 개선)
    
    def get_trust_status(self) -> Dict:
        """신뢰 상태 (요청 시에만 제공)"""
        return {
            "trust_level": self.trust_accumulator.get_trust_level(),
            "accuracy": f"{self.trust_accumulator.accuracy:.1%}",
            "predictions_made": self.trust_accumulator.total_predictions,
            "silent_accuracy": f"{self.trust_accumulator.silent_accuracy:.1%}",
        }
    
    def validate_request(self, request: str) -> Dict:
        """
        요청 검증
        
        위반 신호 감지 시 범위 축소
        """
        return self.violation_detector.check_request(request)
    
    def get_status(self) -> Dict:
        """전체 상태"""
        return {
            "user_id": self.user_id,
            "trust": self.get_trust_status(),
            "remaining_interventions": self.intervention_manager.get_remaining_interventions(),
            "intervention_count": len(self.intervention_manager.intervention_log),
        }


# ============================================
# 전역 인스턴스 관리
# ============================================

_engines: Dict[str, RelianceEngine] = {}


def get_reliance_engine(user_id: str) -> RelianceEngine:
    """사용자별 RelianceEngine 싱글톤"""
    if user_id not in _engines:
        _engines[user_id] = RelianceEngine(user_id)
    return _engines[user_id]


# ============================================
# Export
# ============================================

__all__ = [
    # 원칙
    "CORE_PRINCIPLES",
    "FORBIDDEN_MECHANISMS",
    "ALLOWED_MECHANISMS",
    "GUARDRAILS",
    "INTERVENTION_LIMITS",
    
    # 클래스
    "MechanismType",
    "Mechanism",
    "InterventionGuardrail",
    "InterventionLimit",
    "MessageValidator",
    "ExternalityCalculator",
    "InterventionManager",
    "TrustAccumulator",
    "SafeFeedbackGenerator",
    "ViolationDetector",
    "RelianceEngine",
    "get_reliance_engine",
]
