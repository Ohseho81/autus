"""
AUTUS Solar Physics Engine v2.0
태양계 물리 모델 - 전체 수식 구현
"""
import math
from dataclasses import dataclass, field
from typing import List, Dict, Optional
import time

# ============================================================
# 13. 태양 상태 벡터 (Solar State Vector)
# ============================================================
@dataclass
class SolarStateVector:
    """7차원 태양 상태 벡터"""
    brain: float = 0.5      # 지능
    heart: float = 0.5      # 의지/동기
    sensors: float = 0.5    # 입력/환경 인식
    engines: float = 0.5    # 실행력
    core: float = 0.5       # 정체성
    base: float = 0.5       # 기초 안정성
    boundary: float = 0.5   # 한계/제약 (낮을수록 자유도 높음)
    
    def to_list(self) -> List[float]:
        return [self.brain, self.heart, self.sensors, self.engines, self.core, self.base, self.boundary]
    
    def clamp_all(self):
        """모든 값을 [0, 1] 범위로 제한"""
        self.brain = max(0, min(1, self.brain))
        self.heart = max(0, min(1, self.heart))
        self.sensors = max(0, min(1, self.sensors))
        self.engines = max(0, min(1, self.engines))
        self.core = max(0, min(1, self.core))
        self.base = max(0, min(1, self.base))
        self.boundary = max(0, min(1, self.boundary))


# ============================================================
# 14. 총 에너지 (Total Energy)
# ============================================================
def calc_total_energy(state: SolarStateVector, weights: List[float] = None) -> float:
    """
    TotalEnergy = Σ(S_i × w_i)
    """
    if weights is None:
        weights = [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0]  # 초기 동일 가중치
    
    values = state.to_list()
    return sum(v * w for v, w in zip(values, weights))


# ============================================================
# 15. 중력 (Gravity)
# ============================================================
def calc_gravity(total_energy: float, entropy: float, trust_factor: float = 1.0) -> float:
    """
    Gravity = TotalEnergy × StabilityFactor × TrustFactor
    StabilityFactor = 1 - Entropy
    """
    stability_factor = 1.0 - entropy
    gravity = total_energy * stability_factor * trust_factor
    return max(0, min(1, gravity / 7.0))  # 정규화 (max energy = 7)


# ============================================================
# 16. 행성 생성 조건 (Planet Birth)
# ============================================================
@dataclass
class Planet:
    """행성 = 행동 결과물"""
    id: str
    name: str
    mass: float           # 중요도/가치
    orbit_radius: float   # 궤도 반경
    velocity: float       # 진행 속도
    stability: float      # 안정성
    category: str         # 카테고리
    created_at: float     # 생성 시간
    
def should_create_planet(action_energy: float, time_accumulation: float, threshold: float = 1.0) -> bool:
    """
    if (ActionEnergy × TimeAccumulation) > Threshold:
        Planet 생성
    """
    return (action_energy * time_accumulation) > threshold

def calc_planet_mass(action_energy: float, consistency: float, outcome_score: float) -> float:
    """
    PlanetMass = ActionEnergy × Consistency × OutcomeScore
    """
    return action_energy * consistency * outcome_score


# ============================================================
# 17. 궤도 반경 (Orbit Radius)
# ============================================================
def calc_orbit_radius(planet_mass: float, gravity: float) -> float:
    """
    OrbitRadius = PlanetMass / Gravity
    - 반경 작을수록: 핵심 업무, 높은 집중도
    - 반경 클수록: 보조 업무, 실험/탐색
    """
    if gravity <= 0:
        return float('inf')
    return planet_mass / gravity


# ============================================================
# 18. 궤도 안정성 (Orbit Stability)
# ============================================================
def calc_orbit_stability(gravity: float, entropy: float, pressure: float, external_noise: float = 0.0) -> float:
    """
    OrbitStability = Gravity / (Entropy + Pressure + ExternalNoise)
    - ≥ 1.0 : Stable
    - 0.5 ~ 1.0 : Risk
    - < 0.5 : Collapse 예정
    """
    denominator = entropy + pressure + external_noise
    if denominator <= 0:
        return 2.0  # 완전 안정
    return gravity / denominator

def get_stability_status(stability: float) -> str:
    """안정성 상태 판정"""
    if stability >= 1.0:
        return "STABLE"
    elif stability >= 0.5:
        return "RISK"
    else:
        return "COLLAPSE_IMMINENT"


# ============================================================
# 19. Pressure 반영 로직
# ============================================================
def calc_effective_gravity(gravity: float, pressure: float, vulnerability: float) -> float:
    """
    EffectiveGravity = Gravity - (Pressure × Vulnerability)
    Vulnerability는 Base, Boundary에 의존
    """
    return max(0, gravity - (pressure * vulnerability))

def calc_vulnerability(base: float, boundary: float) -> float:
    """
    Vulnerability = (1 - Base) × Boundary
    - Base 높을수록 안정
    - Boundary 높을수록 제약
    """
    return (1.0 - base) * boundary


# ============================================================
# 20. Entropy 누적 공식
# ============================================================
def update_entropy(current_entropy: float, unresolved_actions: float, system_resolution: float) -> float:
    """
    Entropy(t+1) = Entropy(t) + UnresolvedActions - SystemResolution
    """
    new_entropy = current_entropy + unresolved_actions - system_resolution
    return max(0, min(1, new_entropy))


# ============================================================
# 21. Systems 수 증가 효과
# ============================================================
def calc_complexity(systems_count: int) -> float:
    """
    Complexity = log(Systems + 1)
    - 처리량 증가
    - 엔트로피 관리 실패 시 붕괴 가속
    """
    return math.log(systems_count + 1)


# ============================================================
# 22. Tick 단위 처리
# ============================================================
@dataclass
class TickState:
    """Tick 상태"""
    tick: int = 0
    cycle: int = 0
    ts: float = field(default_factory=time.time)
    
    def advance(self):
        self.tick += 1
        if self.tick % 60 == 0:
            self.cycle += 1
        self.ts = time.time()


# ============================================================
# 23. 다중 태양 상호작용
# ============================================================
def calc_inter_solar_effect(other_gravities: List[float], alignment_factors: List[float]) -> float:
    """
    InterSolarEffect = Σ(OtherGravity × AlignmentFactor)
    - 조직, 국가, 시장 태양 포함
    """
    return sum(g * a for g, a in zip(other_gravities, alignment_factors))


# ============================================================
# 24. 붕괴 조건 (Collapse Rule)
# ============================================================
def check_collapse(entropy: float, effective_gravity: float, 
                   critical_entropy: float = 0.85, min_gravity: float = 0.10) -> bool:
    """
    if Entropy > CriticalEntropy or EffectiveGravity < MinGravity:
        SystemCollapse
    """
    return entropy > critical_entropy or effective_gravity < min_gravity


# ============================================================
# 25. 재탄생 (Rebuild) 규칙
# ============================================================
def calc_rebuild_energy(remaining_core: float, learning_gain: float) -> float:
    """
    RebuildEnergy = RemainingCore × LearningGain
    - 실패는 에너지 손실이 아니라 상태 재배치
    """
    return remaining_core * learning_gain


# ============================================================
# 26. Galaxy 확장 조건
# ============================================================
def should_expand_to_galaxy(stable_solar_count: int, threshold: int = 3) -> bool:
    """
    if MultipleStableSolarSystems:
        GalaxyLayer 활성화
    """
    return stable_solar_count >= threshold


# ============================================================
# 통합 Solar Engine
# ============================================================
@dataclass
class SolarEngine:
    """통합 태양 물리 엔진"""
    id: str
    name: str
    state: SolarStateVector = field(default_factory=SolarStateVector)
    tick_state: TickState = field(default_factory=TickState)
    
    # 신호
    pressure: float = 0.0
    release: float = 0.0
    decision: float = 0.0
    entropy: float = 0.0
    gravity: float = 0.5
    
    # 행성
    planets: List[Planet] = field(default_factory=list)
    
    # 외부 요소
    trust_factor: float = 1.0
    external_noise: float = 0.0
    
    # 상수
    DECAY_PRESSURE: float = 0.92
    DECAY_RELEASE: float = 0.92
    DECAY_DECISION: float = 0.85
    
    def tick(self):
        """Tick 단위 업데이트"""
        # 1. Decay
        self.pressure *= self.DECAY_PRESSURE
        self.release *= self.DECAY_RELEASE
        self.decision *= self.DECAY_DECISION
        
        # 2. Total Energy
        total_energy = calc_total_energy(self.state)
        
        # 3. Vulnerability
        vulnerability = calc_vulnerability(self.state.base, self.state.boundary)
        
        # 4. Gravity
        raw_gravity = calc_gravity(total_energy, self.entropy, self.trust_factor)
        self.gravity = calc_effective_gravity(raw_gravity, self.pressure, vulnerability)
        
        # 5. Entropy
        imbalance = max(0, self.pressure - self.release)
        self.entropy = update_entropy(self.entropy, imbalance * 0.01, self.release * 0.008)
        
        # 6. Tick advance
        self.tick_state.advance()
    
    def get_status(self) -> str:
        """상태 판정"""
        if self.entropy >= 0.70 or (self.gravity <= 0.15 and self.entropy >= 0.55):
            return "RED"
        elif self.entropy >= 0.45 or self.gravity <= 0.30:
            return "YELLOW"
        return "GREEN"
    
    def get_orbit_stability(self) -> float:
        """궤도 안정성"""
        return calc_orbit_stability(self.gravity, self.entropy, self.pressure, self.external_noise)
    
    def check_collapse(self) -> bool:
        """붕괴 체크"""
        return check_collapse(self.entropy, self.gravity)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "tick": self.tick_state.tick,
            "cycle": self.tick_state.cycle,
            "signals": {
                "pressure": round(self.pressure, 4),
                "release": round(self.release, 4),
                "decision": round(self.decision, 4),
                "entropy": round(self.entropy, 4),
                "gravity": round(self.gravity, 4)
            },
            "state_vector": {
                "brain": self.state.brain,
                "heart": self.state.heart,
                "sensors": self.state.sensors,
                "engines": self.state.engines,
                "core": self.state.core,
                "base": self.state.base,
                "boundary": self.state.boundary
            },
            "output": {
                "status": self.get_status(),
                "orbit_stability": round(self.get_orbit_stability(), 3),
                "collapse_risk": self.check_collapse()
            },
            "ts": self.tick_state.ts
        }


# ============================================================
# 테스트
# ============================================================
if __name__ == "__main__":
    engine = SolarEngine(id="SUN_001", name="AUTUS Primary")
    
    print("=== Initial State ===")
    print(engine.to_dict())
    
    # 압력 추가
    engine.pressure += 2.0
    for _ in range(10):
        engine.tick()
    
    print("\n=== After 10 ticks with pressure ===")
    print(engine.to_dict())
