"""
AUTUS × Bezos Edition - Backend API
Jeff Bezos의 경영 철학을 물리 엔진과 통합

7 Core Principles:
1. Regret Minimization Framework (80세 후회 분석)
2. Type 1 vs Type 2 Decisions (문 유형 분류)
3. Day 1 Mentality (Day 1 유지 감시)
4. High-Velocity Decision Making (70% 정보 임계값)
5. Working Backwards (미래 PR 역산)
6. Flywheel Effect (모멘텀 축적)
7. Disagree and Commit (확정 후 헌신)
"""

from dataclasses import dataclass, field
from typing import Literal, Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import math

router = APIRouter(prefix="/api/bezos", tags=["Bezos"])


# ═══════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════

@dataclass
class RegretAnalysis:
    """80세 후회 분석 결과"""
    regret_if_skip: float  # 안 했을 때 후회 확률 (0~1)
    regret_if_act: float   # 했을 때 후회 확률 (0~1)
    recommendation: Literal['ACT', 'SKIP']
    confidence: float
    message: str
    bezos_quote: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'regret_skip': int(self.regret_if_skip * 100),
            'regret_act': int(self.regret_if_act * 100),
            'recommendation': self.recommendation,
            'confidence': int(self.confidence * 100),
            'message': self.message,
            'bezos_quote': self.bezos_quote
        }


@dataclass
class DoorClassification:
    """Type 1/2 결정 분류 결과"""
    door_type: Literal['ONE_WAY', 'TWO_WAY']
    score: float
    auto_allowed: bool
    required_confidence: float
    message: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'door_type': self.door_type,
            'score': int(self.score * 100),
            'auto_allowed': self.auto_allowed,
            'required_confidence': int(self.required_confidence * 100),
            'message': self.message
        }


@dataclass
class DayStatus:
    """Day 1/2 상태"""
    status: Literal['DAY_1', 'DAY_1_CAUTION', 'DAY_2_WARNING']
    health_score: float
    entropy_trend: float
    velocity_trend: float
    symptoms: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'status': self.status,
            'health_score': int(self.health_score * 100),
            'entropy_trend': round(self.entropy_trend, 3),
            'velocity_trend': round(self.velocity_trend, 3),
            'symptoms': self.symptoms,
            'recommendations': self.recommendations
        }


@dataclass
class FlywheelStatus:
    """플라이휠 상태"""
    momentum: float  # 0~1
    stage: Literal['STARTING', 'BUILDING', 'ACCELERATING', 'FLYWHEEL_EFFECT']
    message: str
    next_push_needed: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'momentum': int(self.momentum * 100),
            'stage': self.stage,
            'message': self.message,
            'next_push': int(self.next_push_needed * 100)
        }


@dataclass
class BezosMetrics:
    """Bezos 통합 메트릭"""
    day_status: DayStatus
    door_type: DoorClassification
    regret: RegretAnalysis
    flywheel: FlywheelStatus
    info_level: float
    waiting_cost_per_hour: int
    bezos_recommendation: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'day': self.day_status.to_dict(),
            'door': self.door_type.to_dict(),
            'regret': self.regret.to_dict(),
            'flywheel': self.flywheel.to_dict(),
            'info_level': int(self.info_level * 100),
            'waiting_cost': self.waiting_cost_per_hour,
            'recommendation': self.bezos_recommendation
        }


# ═══════════════════════════════════════════════════════════════
# CALCULATION ENGINES
# ═══════════════════════════════════════════════════════════════

class RegretMinimizationEngine:
    """80세 후회 최소화 엔진"""
    
    @staticmethod
    def calculate(
        impact: float = 0.5,
        reversibility: float = 0.5,
        time_value: float = 0.5,
        urgency: float = 0.5
    ) -> RegretAnalysis:
        # 안 했을 때 후회 = (영향력 × 시간가치) / 되돌림가능성
        regret_skip = min(1, (impact * time_value * (1 + urgency)) / max(reversibility, 0.1))
        
        # 했을 때 후회 = (1-영향력) × (1-되돌림가능성)
        regret_act = min(1, (1 - impact) * (1 - reversibility) * 0.5)
        
        recommendation = 'ACT' if regret_skip > regret_act else 'SKIP'
        confidence = abs(regret_skip - regret_act)
        
        message = (
            f"80세의 당신: '그때 했어야지...' 확률 {int(regret_skip * 100)}%"
            if recommendation == 'ACT'
            else f"80세의 당신: '안 해서 다행이야' 확률 {int((1 - regret_act) * 100)}%"
        )
        
        quote = (
            '"I knew that if I failed I wouldn\'t regret that, but I knew the one thing I might regret is not trying."'
            if recommendation == 'ACT'
            else '"If you\'re good at course correcting, being wrong may be less costly than you think."'
        )
        
        return RegretAnalysis(
            regret_if_skip=regret_skip,
            regret_if_act=regret_act,
            recommendation=recommendation,
            confidence=confidence,
            message=message,
            bezos_quote=quote
        )


class DoorTypeEngine:
    """Type 1/2 결정 분류 엔진"""
    
    THRESHOLD = 0.7
    
    @classmethod
    def classify(
        cls,
        irreversibility: float = 0.5,
        cost: float = 0.5,
        time_to_reverse: float = 0.5,
        stakeholders: float = 0.5
    ) -> DoorClassification:
        score = (
            irreversibility * 0.4 +
            cost * 0.25 +
            time_to_reverse * 0.2 +
            stakeholders * 0.15
        )
        
        door_type = 'ONE_WAY' if score >= cls.THRESHOLD else 'TWO_WAY'
        
        return DoorClassification(
            door_type=door_type,
            score=score,
            auto_allowed=door_type == 'TWO_WAY',
            required_confidence=0.9 if door_type == 'ONE_WAY' else 0.6,
            message=(
                '⚠️ 되돌릴 수 없는 결정 - 신중하게 분석하세요'
                if door_type == 'ONE_WAY'
                else '✓ 되돌릴 수 있음 - 빠르게 실행하고 조정하세요'
            )
        )


class DayOneEngine:
    """Day 1 유지 감시 엔진"""
    
    def __init__(self):
        self.entropy_history: List[float] = []
        self.velocity_history: List[float] = []
    
    def update(self, entropy: float, velocity: float):
        self.entropy_history.append(entropy)
        self.velocity_history.append(velocity)
        
        # 최근 100개만 유지
        if len(self.entropy_history) > 100:
            self.entropy_history = self.entropy_history[-100:]
            self.velocity_history = self.velocity_history[-100:]
    
    def diagnose(self) -> DayStatus:
        if len(self.entropy_history) < 2:
            return DayStatus(
                status='DAY_1',
                health_score=1.0,
                entropy_trend=0,
                velocity_trend=0
            )
        
        entropy_trend = self._calculate_trend(self.entropy_history)
        velocity_trend = self._calculate_trend(self.velocity_history)
        
        # Day 2 점수 계산
        day2_score = 0
        symptoms = []
        
        if entropy_trend > 0.05:
            day2_score += 25
            symptoms.append({'name': '복잡성 증가', 'severity': 'warning'})
        
        if velocity_trend < -0.05:
            day2_score += 25
            symptoms.append({'name': '결정 속도 저하', 'severity': 'warning'})
        
        status = 'DAY_2_WARNING' if day2_score >= 50 else 'DAY_1_CAUTION' if day2_score >= 25 else 'DAY_1'
        
        recommendations = []
        if status != 'DAY_1':
            recommendations = [
                '불필요한 프로세스 1개 삭제',
                '오늘 1개 결정 즉시 실행',
                '고객 피드백 직접 확인'
            ]
        
        return DayStatus(
            status=status,
            health_score=max(0, 1 - day2_score / 100),
            entropy_trend=entropy_trend,
            velocity_trend=velocity_trend,
            symptoms=symptoms,
            recommendations=recommendations
        )
    
    @staticmethod
    def _calculate_trend(history: List[float]) -> float:
        if len(history) < 2:
            return 0
        mid = len(history) // 2
        first_avg = sum(history[:mid]) / max(mid, 1)
        second_avg = sum(history[mid:]) / max(len(history) - mid, 1)
        return (second_avg - first_avg) / max(first_avg, 0.01)


class FlywheelEngine:
    """플라이휠 효과 엔진"""
    
    STAGES = [
        ('STARTING', 0.0, 0.2, '플라이휠 시작 - 첫 회전이 가장 무겁다'),
        ('BUILDING', 0.2, 0.5, '모멘텀 축적 중 - 계속 밀어라'),
        ('ACCELERATING', 0.5, 0.8, '가속 중 - 자체 추진력 형성'),
        ('FLYWHEEL_EFFECT', 0.8, 1.0, '🚀 플라이휠 효과 - 자동 가속!')
    ]
    
    def __init__(self):
        self.momentum = 0.0
        self.friction = 0.005
    
    def push(self, success: bool = True, impact: float = 0.5) -> FlywheelStatus:
        if success:
            push_force = 0.05 + (impact * 0.1)
        else:
            push_force = -0.02
        
        # 모멘텀 보너스
        push_force *= (1 + self.momentum * 0.5)
        self.momentum = max(0, min(1, self.momentum + push_force))
        
        return self.get_status()
    
    def tick(self):
        """시간에 따른 자연 감속"""
        self.momentum = max(0, self.momentum - self.friction)
    
    def get_status(self) -> FlywheelStatus:
        for name, min_m, max_m, message in self.STAGES:
            if min_m <= self.momentum < max_m:
                next_push = max_m - self.momentum
                return FlywheelStatus(
                    momentum=self.momentum,
                    stage=name,
                    message=message,
                    next_push_needed=next_push
                )
        
        return FlywheelStatus(
            momentum=self.momentum,
            stage='FLYWHEEL_EFFECT',
            message='🚀 플라이휠 효과!',
            next_push_needed=0
        )


# ═══════════════════════════════════════════════════════════════
# BEZOS QUOTES
# ═══════════════════════════════════════════════════════════════

BEZOS_QUOTES = {
    'low_velocity': "If you're not embarrassed by the first version, you've launched too late.",
    'day2_warning': "Day 2 is stasis, followed by irrelevance, followed by death.",
    'high_regret_skip': "I knew that if I failed I wouldn't regret that, but I knew the one thing I might regret is not trying.",
    'two_way_door': "If you're good at course correcting, being wrong may be less costly than you think.",
    'low_info': "Most decisions should be made with around 70% of the information you wish you had.",
    'flywheel_effect': "We've had three big ideas at Amazon that we've stuck with... and they're the reason we're successful.",
    'commit': "Have backbone; disagree and commit.",
    'customer_focus': "We're not competitor obsessed, we're customer obsessed."
}


def get_contextual_quote(context: str) -> Optional[str]:
    return BEZOS_QUOTES.get(context)


# ═══════════════════════════════════════════════════════════════
# INTEGRATED ENGINE
# ═══════════════════════════════════════════════════════════════

class BezosEngine:
    """Bezos 통합 엔진"""
    
    def __init__(self):
        self.regret_engine = RegretMinimizationEngine()
        self.door_engine = DoorTypeEngine()
        self.day_engine = DayOneEngine()
        self.flywheel = FlywheelEngine()
    
    def calculate_full_metrics(
        self,
        risk: float = 0.3,
        entropy: float = 0.3,
        flow: float = 0.5,
        pressure: float = 0.3
    ) -> BezosMetrics:
        # Regret Analysis
        regret = self.regret_engine.calculate(
            impact=min(1, risk + 0.3),
            reversibility=max(0.1, 1 - entropy),
            time_value=flow,
            urgency=pressure
        )
        
        # Door Type
        door = self.door_engine.classify(
            irreversibility=min(1, risk + entropy / 2),
            cost=pressure,
            time_to_reverse=entropy,
            stakeholders=0.5
        )
        
        # Day 1 Status
        self.day_engine.update(entropy, flow)
        day = self.day_engine.diagnose()
        
        # Flywheel
        flywheel_status = self.flywheel.get_status()
        
        # Info Level (Flow 기반)
        info_level = max(0.3, min(0.95, flow * 0.6 + (1 - entropy) * 0.4))
        
        # Waiting Cost
        waiting_cost = int(10000 * (1 + (1 - info_level)) * (1 + pressure * 0.5))
        
        # 최종 권장
        if info_level >= 0.7 and regret.recommendation == 'ACT':
            recommendation = 'ACT_NOW'
        elif door.door_type == 'TWO_WAY':
            recommendation = 'EXPERIMENT'
        else:
            recommendation = 'GATHER_MORE_INFO'
        
        return BezosMetrics(
            day_status=day,
            door_type=door,
            regret=regret,
            flywheel=flywheel_status,
            info_level=info_level,
            waiting_cost_per_hour=waiting_cost,
            bezos_recommendation=recommendation
        )


# ═══════════════════════════════════════════════════════════════
# GLOBAL ENGINE INSTANCE
# ═══════════════════════════════════════════════════════════════

_engine: Optional[BezosEngine] = None


def get_engine() -> BezosEngine:
    global _engine
    if _engine is None:
        _engine = BezosEngine()
    return _engine


# ═══════════════════════════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════════════════════════

class PhysicsInput(BaseModel):
    risk: float = 0.3
    entropy: float = 0.3
    flow: float = 0.5
    pressure: float = 0.3


class DecisionInput(BaseModel):
    impact: float = 0.5
    reversibility: float = 0.5
    time_value: float = 0.5
    urgency: float = 0.5


class FlywheelPushInput(BaseModel):
    success: bool = True
    impact: float = 0.5


@router.get("/metrics")
async def get_metrics(
    risk: float = 0.3,
    entropy: float = 0.3,
    flow: float = 0.5,
    pressure: float = 0.3
):
    """통합 Bezos 메트릭 조회"""
    engine = get_engine()
    metrics = engine.calculate_full_metrics(risk, entropy, flow, pressure)
    return metrics.to_dict()


@router.post("/regret/analyze")
async def analyze_regret(decision: DecisionInput):
    """80세 후회 분석"""
    result = RegretMinimizationEngine.calculate(
        impact=decision.impact,
        reversibility=decision.reversibility,
        time_value=decision.time_value,
        urgency=decision.urgency
    )
    return result.to_dict()


@router.post("/door/classify")
async def classify_door(decision: DecisionInput):
    """Type 1/2 결정 분류"""
    result = DoorTypeEngine.classify(
        irreversibility=1 - decision.reversibility,
        cost=decision.urgency,
        time_to_reverse=decision.time_value,
        stakeholders=decision.impact
    )
    return result.to_dict()


@router.get("/day/status")
async def get_day_status():
    """Day 1/2 상태 조회"""
    engine = get_engine()
    return engine.day_engine.diagnose().to_dict()


@router.post("/flywheel/push")
async def push_flywheel(data: FlywheelPushInput):
    """플라이휠 가속"""
    engine = get_engine()
    result = engine.flywheel.push(success=data.success, impact=data.impact)
    return result.to_dict()


@router.get("/flywheel/status")
async def get_flywheel_status():
    """플라이휠 상태 조회"""
    engine = get_engine()
    return engine.flywheel.get_status().to_dict()


@router.get("/quote")
async def get_quote(context: str = "customer_focus"):
    """상황별 Bezos 명언"""
    quote = get_contextual_quote(context)
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    return {"context": context, "quote": quote, "author": "Jeff Bezos"}


@router.get("/quotes/all")
async def get_all_quotes():
    """전체 Bezos 명언"""
    return {"quotes": BEZOS_QUOTES}
