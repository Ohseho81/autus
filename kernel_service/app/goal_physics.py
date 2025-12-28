"""
AUTUS Goal Physics - 목표 텍스트 → 물리량 변환
==============================================

"언어의 물리화" 파이프라인

1. 구체성 스캔 (Specificity Score)
2. 반경 결정 (r = f(specificity))
3. 엔트로피 연동 (σ = f(r))
4. Leak/Pressure 추정

Version: 1.0.0
Status: LOCKED
"""

import re
import math
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum


# ================================================================
# SPECIFICITY DIMENSIONS (구체성 6요소)
# ================================================================

class SpecificityDimension(Enum):
    """구체성 측정 6가지 차원"""
    MEASURABLE = "measurable"       # 측정 가능성 (숫자, 수량)
    TIME_BOUND = "time_bound"       # 시간 명시
    QUANTIFIED = "quantified"       # 수량 명시
    ACTION_VERB = "action_verb"     # 행동 동사 포함
    OBSTACLE_AWARE = "obstacle"     # 장애물 인식
    RESOURCE_DEFINED = "resource"   # 자원 정의


@dataclass
class SpecificityScore:
    """구체성 점수"""
    measurable: float = 0.0      # [0, 1]
    time_bound: float = 0.0      # [0, 1]
    quantified: float = 0.0      # [0, 1]
    action_verb: float = 0.0     # [0, 1]
    obstacle_aware: float = 0.0  # [0, 1]
    resource_defined: float = 0.0  # [0, 1]
    
    @property
    def total(self) -> float:
        """총 구체성 점수 [0, 1]"""
        return (
            self.measurable + 
            self.time_bound + 
            self.quantified + 
            self.action_verb + 
            self.obstacle_aware + 
            self.resource_defined
        ) / 6.0
    
    def to_dict(self) -> Dict:
        return {
            "measurable": round(self.measurable, 3),
            "time_bound": round(self.time_bound, 3),
            "quantified": round(self.quantified, 3),
            "action_verb": round(self.action_verb, 3),
            "obstacle_aware": round(self.obstacle_aware, 3),
            "resource_defined": round(self.resource_defined, 3),
            "total": round(self.total, 3)
        }


@dataclass
class GoalPhysics:
    """목표의 물리적 상태"""
    r: float                    # 반경 (구체성 역수)
    sigma: float                # 엔트로피
    stability: float            # 안정성
    density: float              # 밀도
    gravity_well: float         # 중력 우물 강도
    physical_state: str         # 물리적 상태 설명
    
    def to_dict(self) -> Dict:
        return {
            "r": round(self.r, 3),
            "sigma": round(self.sigma, 3),
            "stability": round(self.stability, 3),
            "density": round(self.density, 3),
            "gravity_well": round(self.gravity_well, 3),
            "physical_state": self.physical_state
        }


@dataclass
class LeakPressure:
    """Leak/Pressure 추정"""
    leak: float                 # 에너지 누출률 [0, 1]
    pressure: float             # 내부 압력 [0, 1]
    leak_points: List[str]      # 누출 지점들
    pressure_sources: List[str] # 압력 원천들
    net_flow: float             # 순 에너지 흐름
    
    def to_dict(self) -> Dict:
        return {
            "leak": round(self.leak, 3),
            "pressure": round(self.pressure, 3),
            "leak_points": self.leak_points,
            "pressure_sources": self.pressure_sources,
            "net_flow": round(self.net_flow, 3)
        }


# ================================================================
# SPECIFICITY SCANNER (구체성 스캔)
# ================================================================

class SpecificityScanner:
    """
    목표 텍스트의 구체성을 스캔하여 점수화
    
    6가지 차원:
    1. 측정 가능성 (숫자, %, kg, 원 등)
    2. 시간 명시 (날짜, 기한, 주기)
    3. 수량 명시 (횟수, 개수)
    4. 행동 동사 (구체적 행동)
    5. 장애물 인식 (but, 그러나, 어려움)
    6. 자원 정의 (시간, 돈, 도구)
    """
    
    # 측정 가능성 패턴
    MEASURABLE_PATTERNS = [
        r'\d+\s*%', r'\d+\s*kg', r'\d+\s*km', r'\d+\s*원',
        r'\d+\s*만원', r'\d+\s*억', r'\d+\s*달러',
        r'\d+\s*시간', r'\d+\s*분', r'\d+\s*초',
        r'\d+\s*개', r'\d+\s*권', r'\d+\s*명',
        r'\d+', r'\$\d+', r'₩\d+',
    ]
    
    # 시간 명시 패턴
    TIME_PATTERNS = [
        r'\d+월', r'\d+일', r'\d+년',
        r'내일', r'다음\s*주', r'이번\s*달', r'올해',
        r'매일', r'매주', r'매월', r'주\s*\d+회',
        r'까지', r'이내', r'동안', r'후에',
        r'오전', r'오후', r'아침', r'저녁',
        r'january|february|march|april|may|june',
        r'july|august|september|october|november|december',
        r'monday|tuesday|wednesday|thursday|friday',
    ]
    
    # 행동 동사 패턴
    ACTION_PATTERNS = [
        r'운동', r'공부', r'읽', r'쓰', r'만들',
        r'달성', r'완료', r'시작', r'끝내', r'제출',
        r'연락', r'전화', r'메일', r'보내', r'받',
        r'배우', r'가르치', r'연습', r'훈련',
        r'저축', r'투자', r'구매', r'판매',
        r'exercise', r'study', r'read', r'write', r'create',
        r'achieve', r'complete', r'start', r'finish', r'submit',
    ]
    
    # 장애물 인식 패턴
    OBSTACLE_PATTERNS = [
        r'하지만', r'그러나', r'어려', r'힘들',
        r'방해', r'장애', r'문제', r'도전',
        r'리스크', r'위험', r'불확실',
        r'but', r'however', r'difficult', r'challenge',
        r'risk', r'obstacle', r'problem',
    ]
    
    # 자원 정의 패턴
    RESOURCE_PATTERNS = [
        r'예산', r'자금', r'비용', r'투자금',
        r'시간', r'일정', r'스케줄',
        r'도구', r'장비', r'소프트웨어', r'앱',
        r'팀', r'인력', r'파트너', r'멘토',
        r'budget', r'fund', r'cost', r'investment',
        r'schedule', r'calendar', r'tool', r'resource',
    ]
    
    def scan(self, goal_text: str) -> SpecificityScore:
        """
        목표 텍스트 스캔하여 구체성 점수 반환
        """
        text_lower = goal_text.lower()
        
        score = SpecificityScore()
        
        # 1. 측정 가능성
        score.measurable = self._pattern_score(text_lower, self.MEASURABLE_PATTERNS)
        
        # 2. 시간 명시
        score.time_bound = self._pattern_score(text_lower, self.TIME_PATTERNS)
        
        # 3. 수량 명시 (숫자 개수 기반)
        numbers = re.findall(r'\d+', goal_text)
        score.quantified = min(1.0, len(numbers) * 0.3)
        
        # 4. 행동 동사
        score.action_verb = self._pattern_score(text_lower, self.ACTION_PATTERNS)
        
        # 5. 장애물 인식
        score.obstacle_aware = self._pattern_score(text_lower, self.OBSTACLE_PATTERNS)
        
        # 6. 자원 정의
        score.resource_defined = self._pattern_score(text_lower, self.RESOURCE_PATTERNS)
        
        return score
    
    def _pattern_score(self, text: str, patterns: List[str]) -> float:
        """패턴 매칭 점수 계산"""
        matches = 0
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                matches += 1
        return min(1.0, matches * 0.25)  # 4개 이상이면 1.0


# ================================================================
# GOAL → PHYSICS CONVERTER
# ================================================================

class GoalPhysicsConverter:
    """
    목표 텍스트 → 물리량 변환기
    
    Pipeline:
    1. Specificity Scan → Score
    2. Score → r (반경)
    3. r → σ (엔트로피)
    4. σ → Stability
    5. → Physical State Classification
    """
    
    # 물리 상수 (LOCKED)
    R_MIN = 0.1     # 최소 반경 (가장 구체적)
    R_MAX = 1.0     # 최대 반경 (가장 모호)
    SIGMA_SCALE = 1.2  # 엔트로피 스케일링
    
    def __init__(self):
        self.scanner = SpecificityScanner()
    
    def convert(self, goal_text: str) -> Tuple[SpecificityScore, GoalPhysics]:
        """
        목표 텍스트 → 물리량 변환
        
        Returns:
            (SpecificityScore, GoalPhysics)
        """
        # 1. 구체성 스캔
        specificity = self.scanner.scan(goal_text)
        
        # 2. 반경 계산: r = R_MAX - (R_MAX - R_MIN) * specificity
        #    구체적일수록 반경이 작음 (집중된 중력)
        r = self.R_MAX - (self.R_MAX - self.R_MIN) * specificity.total
        
        # 3. 엔트로피 계산: σ = r^SIGMA_SCALE
        #    반경이 클수록 엔트로피 급증
        sigma = math.pow(r, self.SIGMA_SCALE)
        
        # 4. 안정성: Stability = 1 - σ
        stability = max(0.0, 1.0 - sigma)
        
        # 5. 밀도: Density = 1 / r^3 (구 부피 역수)
        density = 1.0 / math.pow(r, 3) if r > 0 else float('inf')
        
        # 6. 중력 우물: GravityWell = Density * (1 - σ)
        gravity_well = density * stability
        
        # 7. 물리적 상태 분류
        physical_state = self._classify_state(sigma, stability)
        
        physics = GoalPhysics(
            r=r,
            sigma=sigma,
            stability=stability,
            density=density,
            gravity_well=gravity_well,
            physical_state=physical_state
        )
        
        return specificity, physics
    
    def _classify_state(self, sigma: float, stability: float) -> str:
        """물리적 상태 분류"""
        if sigma > 0.9:
            return "초저밀도 가스운 (Ultra-Low Density Gas Cloud)"
        elif sigma > 0.7:
            return "저밀도 성운 (Low Density Nebula)"
        elif sigma > 0.5:
            return "중밀도 원반 (Medium Density Disk)"
        elif sigma > 0.3:
            return "고밀도 행성 핵 (High Density Planetary Core)"
        else:
            return "강력한 중력 우물 (Strong Gravity Well)"


# ================================================================
# LEAK/PRESSURE ESTIMATOR
# ================================================================

class LeakPressureEstimator:
    """
    행동 패턴에서 Leak/Pressure 추정
    
    Leak: 에너지가 새어나가는 지점
    Pressure: 내부에서 밀어내는 힘
    """
    
    # Leak 유발 패턴 (에너지 손실)
    LEAK_PATTERNS = {
        "distraction": (r"sns|유튜브|넷플릭스|게임|술", 0.2),
        "procrastination": (r"나중에|언젠가|시간\s*나면|여유\s*있으면", 0.15),
        "vagueness": (r"좀|약간|조금|어느\s*정도|대충", 0.1),
        "external_dependency": (r"~가\s*해주면|누가|언제\s*되면", 0.15),
        "escape": (r"피하|회피|안\s*하|못\s*하", 0.2),
    }
    
    # Pressure 유발 패턴 (추진력)
    PRESSURE_PATTERNS = {
        "deadline": (r"\d+일|까지|마감|deadline", 0.2),
        "commitment": (r"반드시|꼭|무조건|필수", 0.15),
        "accountability": (r"공개|선언|약속|계약", 0.2),
        "consequence": (r"아니면|안\s*그러면|그렇지\s*않으면", 0.15),
        "reward": (r"보상|성과|결과|혜택", 0.1),
    }
    
    def estimate(self, goal_text: str, 
                 behavior_log: Optional[List[str]] = None) -> LeakPressure:
        """
        목표 텍스트와 행동 로그에서 Leak/Pressure 추정
        """
        text = goal_text.lower()
        if behavior_log:
            text += " " + " ".join(behavior_log).lower()
        
        # Leak 계산
        leak = 0.0
        leak_points = []
        for name, (pattern, weight) in self.LEAK_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                leak += weight
                leak_points.append(name)
        leak = min(1.0, leak)
        
        # Pressure 계산
        pressure = 0.0
        pressure_sources = []
        for name, (pattern, weight) in self.PRESSURE_PATTERNS.items():
            if re.search(pattern, text, re.IGNORECASE):
                pressure += weight
                pressure_sources.append(name)
        pressure = min(1.0, pressure)
        
        # Net Flow = Pressure - Leak
        net_flow = pressure - leak
        
        return LeakPressure(
            leak=leak,
            pressure=pressure,
            leak_points=leak_points,
            pressure_sources=pressure_sources,
            net_flow=net_flow
        )


# ================================================================
# UNIFIED GOAL ANALYZER
# ================================================================

@dataclass
class GoalAnalysis:
    """통합 목표 분석 결과"""
    goal_text: str
    specificity: SpecificityScore
    physics: GoalPhysics
    leak_pressure: LeakPressure
    
    def to_dict(self) -> Dict:
        return {
            "goal_text": self.goal_text,
            "specificity": self.specificity.to_dict(),
            "physics": self.physics.to_dict(),
            "leak_pressure": self.leak_pressure.to_dict()
        }


class GoalAnalyzer:
    """
    통합 목표 분석기
    
    텍스트 → 물리량 → Leak/Pressure 전체 파이프라인
    """
    
    def __init__(self):
        self.converter = GoalPhysicsConverter()
        self.leak_estimator = LeakPressureEstimator()
    
    def analyze(self, goal_text: str, 
                behavior_log: Optional[List[str]] = None) -> GoalAnalysis:
        """
        목표 텍스트 전체 분석
        """
        # 물리량 변환
        specificity, physics = self.converter.convert(goal_text)
        
        # Leak/Pressure 추정
        leak_pressure = self.leak_estimator.estimate(goal_text, behavior_log)
        
        return GoalAnalysis(
            goal_text=goal_text,
            specificity=specificity,
            physics=physics,
            leak_pressure=leak_pressure
        )


# ================================================================
# SINGLETON
# ================================================================

_analyzer: Optional[GoalAnalyzer] = None

def get_goal_analyzer() -> GoalAnalyzer:
    global _analyzer
    if _analyzer is None:
        _analyzer = GoalAnalyzer()
    return _analyzer


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    analyzer = GoalAnalyzer()
    
    test_goals = [
        "더 나은 삶을 살고 싶다",
        "내달까지 5kg 감량",
        "3월말까지 매출 1억 달성",
        "매일 30분, 주5회 운동",
    ]
    
    print("=" * 60)
    print("GOAL PHYSICS CONVERSION TEST")
    print("=" * 60)
    
    for goal in test_goals:
        result = analyzer.analyze(goal)
        print(f"\n목표: {goal}")
        print(f"  r = {result.physics.r:.3f}")
        print(f"  σ = {result.physics.sigma:.3f}")
        print(f"  Stability = {result.physics.stability:.3f}")
        print(f"  상태: {result.physics.physical_state}")
        print(f"  Leak = {result.leak_pressure.leak:.3f}")
        print(f"  Pressure = {result.leak_pressure.pressure:.3f}")
        print(f"  Net Flow = {result.leak_pressure.net_flow:.3f}")





