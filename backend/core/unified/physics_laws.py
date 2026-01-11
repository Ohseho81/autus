"""
═══════════════════════════════════════════════════════════════════════════════
⚛️ AUTUS v3.0 - Physics Laws Engine (6가지 물리법칙 + 3대 원리)
═══════════════════════════════════════════════════════════════════════════════

세상은 사람에 의해 움직인다.
사용자 변수(힘의 크기와 방향)를 상호작용(시너지 또는 대항)으로 측정한다.

6가지 물리법칙:
1. 관성의 법칙 (Inertia) - 변화 저항, 습관 유지
2. 운동의 법칙 (F = ma) - 힘 크기 = 행동 변화 가속도
3. 작용-반작용 법칙 - 시너지/대항 측정
4. 엔트로피 법칙 - 방치 시 악화, 에너지 필요
5. 임계점/상전이 법칙 - 압력 폭발/붕괴 예측
6. 확산/전파 법칙 (Laplacian) - 압력 전파 계산

3대 원리:
1. 결정론 (Determinism) - 같은 입력 = 같은 출력
2. 열역학 원리 (Thermodynamics) - 에너지 보존 + 엔트로피 증가
3. 복잡계 원리 (Complex Systems) - 단순 상호작용 → 창발적 현상
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional, Tuple
from datetime import datetime
import math


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 사용자 변수 (힘의 크기와 방향)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ForceVector:
    """힘 벡터"""
    magnitude: float = 0.0     # 힘의 크기 (0~1)
    direction: float = 0.0     # 방향 (-1: 부정, 0: 중립, 1: 긍정)
    velocity: float = 0.0      # 변화 속도
    acceleration: float = 0.0  # 가속도


@dataclass
class UserState:
    """사용자 물리 상태"""
    # 기본 물리량
    mass: float = 1.0              # 질량 (관성)
    position: float = 0.5          # 현재 위치 (0~1)
    momentum: float = 0.0          # 운동량 (mass × velocity)
    
    # 힘 벡터
    force: ForceVector = field(default_factory=ForceVector)
    
    # 에너지
    kinetic_energy: float = 0.0    # 운동 에너지
    potential_energy: float = 0.0  # 위치 에너지
    entropy: float = 0.2           # 엔트로피 (무질서도)
    
    # 상호작용
    synergy_score: float = 0.0     # 시너지 점수 (-1 ~ 1)
    friction_coeff: float = 0.1    # 마찰 계수 (0~1)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 상전이 상태
# ═══════════════════════════════════════════════════════════════════════════════

Phase = Literal['STABLE', 'TRANSITION', 'CRITICAL', 'COLLAPSE', 'BREAKTHROUGH']


@dataclass
class PhaseState:
    """상전이 상태"""
    current_phase: Phase
    pressure: float
    critical_point: float
    distance_to_transition: float
    transition_probability: float


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 상호작용 결과
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Interaction:
    """상호작용 결과"""
    action: ForceVector
    reaction: ForceVector
    synergy: float           # 시너지 계수 (-1 ~ 1)
    net_effect: float        # 순효과


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 물리법칙 1: 관성의 법칙 (Inertia)
# ═══════════════════════════════════════════════════════════════════════════════

def apply_inertia(state: UserState, external_force: float) -> UserState:
    """
    관성의 법칙: 외부 힘이 없으면 현재 상태 유지
    
    적용: 사람의 행동은 쉽게 변하지 않는다
    - 시너지: 유지되는 힘 강화
    - 대항: 변화 저항 증가
    """
    # 관성 저항 = 질량 × 현재 속도
    inertial_resistance = state.mass * abs(state.force.velocity)
    
    # 순 힘 = 외부 힘 - 관성 저항
    net_force = external_force - inertial_resistance * state.friction_coeff
    
    # 가속도 = 순 힘 / 질량 (F = ma → a = F/m)
    acceleration = net_force / max(state.mass, 0.01)
    
    # 새 속도 = 현재 속도 + 가속도
    new_velocity = state.force.velocity + acceleration
    
    new_state = UserState(
        mass=state.mass,
        position=state.position,
        momentum=state.mass * new_velocity,
        force=ForceVector(
            magnitude=state.force.magnitude,
            direction=state.force.direction,
            velocity=new_velocity,
            acceleration=acceleration,
        ),
        kinetic_energy=state.kinetic_energy,
        potential_energy=state.potential_energy,
        entropy=state.entropy,
        synergy_score=state.synergy_score,
        friction_coeff=state.friction_coeff,
    )
    
    return new_state


def measure_inertia(
    previous_behaviors: List[float],
    current_behavior: float
) -> Tuple[float, float]:
    """
    관성 측정: 행동 변화 저항도
    
    Returns: (관성, 변화율)
    """
    if not previous_behaviors:
        return 0.5, 0.0
    
    avg = sum(previous_behaviors) / len(previous_behaviors)
    deviation = abs(current_behavior - avg)
    change_rate = deviation / (avg + 0.01)
    
    # 관성 = 1 - 변화율 (변화 적을수록 관성 높음)
    inertia = max(0, min(1, 1 - change_rate))
    
    return inertia, change_rate


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 물리법칙 2: 운동의 법칙 (F = ma)
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_force(mass: float, acceleration: float) -> float:
    """F = m × a"""
    return mass * acceleration


def calculate_acceleration(force: float, mass: float) -> float:
    """a = F / m"""
    return force / max(mass, 0.01)


def combine_forces(forces: List[ForceVector]) -> ForceVector:
    """힘 벡터 합성 (여러 힘의 합)"""
    if not forces:
        return ForceVector()
    
    total_x = 0.0
    total_y = 0.0
    total_velocity = 0.0
    total_accel = 0.0
    
    for f in forces:
        # 벡터 성분 분해
        total_x += f.magnitude * math.cos(f.direction * math.pi)
        total_y += f.magnitude * math.sin(f.direction * math.pi)
        total_velocity += f.velocity
        total_accel += f.acceleration
    
    magnitude = math.sqrt(total_x ** 2 + total_y ** 2)
    direction = math.atan2(total_y, total_x) / math.pi
    
    return ForceVector(
        magnitude=min(1, magnitude),
        direction=max(-1, min(1, direction)),
        velocity=total_velocity / len(forces),
        acceleration=total_accel / len(forces),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 물리법칙 3: 작용-반작용 법칙 (Action-Reaction)
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_reaction(action: ForceVector) -> ForceVector:
    """모든 작용에는 크기 같고 방향 반대인 반작용"""
    return ForceVector(
        magnitude=action.magnitude,
        direction=-action.direction,
        velocity=-action.velocity,
        acceleration=-action.acceleration,
    )


def analyze_interaction(
    action: ForceVector,
    response: ForceVector
) -> Interaction:
    """
    상호작용 분석
    
    적용: 사람 상호작용은 시너지(상호 강화) 또는 대항(상호 상쇄)
    """
    reaction = calculate_reaction(action)
    
    # 시너지 = 응답이 작용과 같은 방향이면 양수, 반대면 음수
    synergy = action.direction * response.direction
    
    # 순효과 = 작용 + 응답 (시너지면 증폭, 대항이면 상쇄)
    net_effect = action.magnitude + response.magnitude * synergy
    
    return Interaction(
        action=action,
        reaction=reaction,
        synergy=synergy,
        net_effect=max(-1, min(1, net_effect)),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 물리법칙 4: 엔트로피 법칙 (Entropy)
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_entropy(
    current_state: List[float],
    ideal_state: List[float]
) -> float:
    """
    엔트로피 계산: 현재 상태와 이상 상태의 차이
    
    적용:
    - 시너지: 질서 창출
    - 대항: 엔트로피 증가
    """
    if len(current_state) != len(ideal_state):
        return 1.0  # 최대 엔트로피
    
    disorder = 0.0
    for i in range(len(current_state)):
        disorder += (current_state[i] - ideal_state[i]) ** 2
    
    return min(1, math.sqrt(disorder / len(current_state)))


def natural_entropy_increase(
    current_entropy: float,
    time_elapsed: float,
    decay_rate: float = 0.01
) -> float:
    """
    엔트로피 자연 증가 (시간에 따른 악화)
    
    dS/dt ≥ 0: 방치하면 압력이 자연 증가
    """
    increase = current_entropy + (1 - current_entropy) * (1 - math.exp(-decay_rate * time_elapsed))
    return min(1, increase)


def reduce_entropy(
    current_entropy: float,
    energy_input: float,
    efficiency: float = 0.8
) -> float:
    """에너지 투입으로 엔트로피 감소"""
    reduction = energy_input * efficiency
    return max(0, current_entropy - reduction)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 물리법칙 5: 임계점/상전이 법칙 (Phase Transition)
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_phase(
    pressure: float,
    critical_point: float = 0.78
) -> PhaseState:
    """
    임계점 분석: 임계값 넘으면 상태 급변
    
    적용: 사람 힘 상호작용이 임계 넘으면
    - 시너지 폭발 또는
    - 대항 붕괴
    """
    distance = critical_point - pressure
    
    if pressure < 0.3:
        phase: Phase = 'STABLE'
        transition_probability = 0.0
    elif pressure < 0.5:
        phase = 'TRANSITION'
        transition_probability = (pressure - 0.3) / 0.2 * 0.2
    elif pressure < critical_point:
        phase = 'CRITICAL'
        transition_probability = 0.2 + (pressure - 0.5) / (critical_point - 0.5) * 0.5
    elif pressure < 0.95:
        phase = 'COLLAPSE'
        transition_probability = 0.9
    else:
        phase = 'BREAKTHROUGH'
        transition_probability = 1.0
    
    return PhaseState(
        current_phase=phase,
        pressure=pressure,
        critical_point=critical_point,
        distance_to_transition=distance,
        transition_probability=transition_probability,
    )


def check_phase_transition(
    pressure: float,
    velocity: float,
    critical_point: float = 0.78
) -> Tuple[bool, str]:
    """상전이 발생 여부 결정 (결정론적)"""
    # 압력이 임계점에 도달하고 속도가 양수면 상향 전이
    if pressure >= critical_point and velocity > 0:
        return True, 'UP'
    
    # 압력이 임계점 이하로 떨어지고 속도가 음수면 하향 전이
    if pressure <= 0.3 and velocity < 0:
        return True, 'DOWN'
    
    return False, 'NONE'


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 물리법칙 6: 확산/전파 법칙 (Diffusion/Laplacian)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class DiffusionResult:
    """확산 결과"""
    source_id: str
    target_id: str
    pressure_delta: float
    diffusion_rate: float
    final_pressures: Dict[str, float]


def calculate_diffusion(
    pressures: Dict[str, float],
    connections: List[Dict]
) -> List[DiffusionResult]:
    """
    확산 법칙: 압력은 높은 곳에서 낮은 곳으로 확산
    
    Laplacian: ΔP(i) = Σj w(i,j) × k(i,j) × (P(j) - P(i))
    
    connections: [{"from": str, "to": str, "weight": float, "conductivity": float}]
    """
    results: List[DiffusionResult] = []
    new_pressures = pressures.copy()
    
    for conn in connections:
        from_p = pressures.get(conn['from'], 0)
        to_p = pressures.get(conn['to'], 0)
        
        # 압력 차이에 의한 확산
        delta = conn['weight'] * conn['conductivity'] * (from_p - to_p)
        
        # 새 압력 계산
        new_pressures[conn['to']] = max(0, min(1, new_pressures.get(conn['to'], 0) + delta))
        new_pressures[conn['from']] = max(0, min(1, new_pressures.get(conn['from'], 0) - delta * 0.5))
        
        diff_rate = abs(delta) / max(abs(from_p - to_p), 0.01)
        
        results.append(DiffusionResult(
            source_id=conn['from'],
            target_id=conn['to'],
            pressure_delta=delta,
            diffusion_rate=diff_rate,
            final_pressures=new_pressures.copy(),
        ))
    
    return results


def simulate_network_diffusion(
    initial_pressures: Dict[str, float],
    connections: List[Dict],
    iterations: int = 10
) -> Tuple[List[Dict[str, float]], Dict[str, float]]:
    """
    네트워크 전체 확산 시뮬레이션
    
    Returns: (history, final)
    """
    history: List[Dict[str, float]] = [initial_pressures.copy()]
    current = initial_pressures.copy()
    
    for _ in range(iterations):
        results = calculate_diffusion(current, connections)
        if results:
            current = results[-1].final_pressures
        history.append(current.copy())
    
    return history, current


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 3대 원리
# ═══════════════════════════════════════════════════════════════════════════════

def deterministic_predict(
    current_state: UserState,
    time_horizon: int
) -> List[UserState]:
    """
    원리 1: 결정론 (Determinism)
    모든 것은 이전 상태의 결과 → 같은 입력 = 같은 출력
    """
    predictions: List[UserState] = []
    state = UserState(
        mass=current_state.mass,
        position=current_state.position,
        momentum=current_state.momentum,
        force=ForceVector(
            magnitude=current_state.force.magnitude,
            direction=current_state.force.direction,
            velocity=current_state.force.velocity,
            acceleration=current_state.force.acceleration,
        ),
        kinetic_energy=current_state.kinetic_energy,
        potential_energy=current_state.potential_energy,
        entropy=current_state.entropy,
        synergy_score=current_state.synergy_score,
        friction_coeff=current_state.friction_coeff,
    )
    
    for _ in range(time_horizon):
        # 관성 적용
        state = apply_inertia(state, 0)
        
        # 엔트로피 증가
        state.entropy = natural_entropy_increase(state.entropy, 1)
        
        # 에너지 보존
        total_energy = state.kinetic_energy + state.potential_energy
        state.kinetic_energy = total_energy * 0.5 * (1 - state.friction_coeff)
        state.potential_energy = total_energy * 0.5
        
        predictions.append(UserState(
            mass=state.mass,
            position=state.position,
            momentum=state.momentum,
            force=ForceVector(
                magnitude=state.force.magnitude,
                direction=state.force.direction,
                velocity=state.force.velocity,
                acceleration=state.force.acceleration,
            ),
            kinetic_energy=state.kinetic_energy,
            potential_energy=state.potential_energy,
            entropy=state.entropy,
            synergy_score=state.synergy_score,
            friction_coeff=state.friction_coeff,
        ))
    
    return predictions


def apply_thermodynamics(state: UserState) -> UserState:
    """
    원리 2: 열역학 원리 (Thermodynamics)
    에너지 보존 + 엔트로피 증가
    """
    # 에너지 보존
    total_energy = state.kinetic_energy + state.potential_energy
    
    # 마찰에 의한 에너지 손실 (엔트로피 증가)
    energy_loss = total_energy * state.friction_coeff * 0.1
    remaining_energy = total_energy - energy_loss
    
    # 엔트로피 증가
    new_entropy = min(1, state.entropy + energy_loss)
    
    return UserState(
        mass=state.mass,
        position=state.position,
        momentum=state.momentum,
        force=state.force,
        kinetic_energy=remaining_energy * 0.5,
        potential_energy=remaining_energy * 0.5,
        entropy=new_entropy,
        synergy_score=state.synergy_score,
        friction_coeff=state.friction_coeff,
    )


def calculate_emergent_behavior(
    agents: List[UserState],
    interactions: List[Dict]
) -> Tuple[ForceVector, str]:
    """
    원리 3: 복잡계 원리 (Complex Systems)
    단순 요소의 상호작용으로 복잡 현상 창출
    
    Returns: (집단 힘, 창발적 패턴)
    """
    if not agents:
        return ForceVector(), 'NONE'
    
    # 집단 힘 계산
    forces = [a.force for a in agents]
    collective_force = combine_forces(forces)
    
    # 시너지 총합
    total_synergy = sum(a.synergy_score for a in agents) / len(agents)
    
    # 창발적 패턴 결정
    if total_synergy > 0.5 and collective_force.magnitude > 0.7:
        emergent_pattern = 'COLLECTIVE_BREAKTHROUGH'
    elif total_synergy < -0.5:
        emergent_pattern = 'COLLECTIVE_COLLAPSE'
    elif abs(collective_force.direction) < 0.2:
        emergent_pattern = 'EQUILIBRIUM'
    else:
        emergent_pattern = 'DYNAMIC_FLOW'
    
    return collective_force, emergent_pattern


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 통합 물리 엔진
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PhysicsUpdate:
    """물리 업데이트 결과"""
    inertia_effect: float
    force_result: ForceVector
    reaction_balance: float
    entropy_change: float
    phase_state: PhaseState
    diffusion_complete: bool
    new_state: UserState
    warnings: List[str]


def apply_all_physics_laws(
    state: UserState,
    external_forces: List[ForceVector],
    connections: List[Dict]
) -> PhysicsUpdate:
    """모든 물리법칙 통합 적용"""
    warnings: List[str] = []
    new_state = UserState(
        mass=state.mass,
        position=state.position,
        momentum=state.momentum,
        force=ForceVector(
            magnitude=state.force.magnitude,
            direction=state.force.direction,
            velocity=state.force.velocity,
            acceleration=state.force.acceleration,
        ),
        kinetic_energy=state.kinetic_energy,
        potential_energy=state.potential_energy,
        entropy=state.entropy,
        synergy_score=state.synergy_score,
        friction_coeff=state.friction_coeff,
    )
    
    # 1. 관성 법칙
    total_external_force = combine_forces(external_forces)
    new_state = apply_inertia(new_state, total_external_force.magnitude * total_external_force.direction)
    inertia_effect = new_state.momentum / (state.momentum + 0.01)
    
    # 2. 운동 법칙 (F = ma)
    force_result = combine_forces([new_state.force, total_external_force])
    new_state.force = force_result
    
    # 3. 작용-반작용
    reaction = calculate_reaction(total_external_force)
    reaction_balance = (force_result.magnitude + reaction.magnitude) / 2
    
    # 4. 엔트로피 법칙
    new_state = apply_thermodynamics(new_state)
    entropy_change = new_state.entropy - state.entropy
    if entropy_change > 0.1:
        warnings.append(f'엔트로피 급증 (Δ{entropy_change*100:.1f}%) - 에너지 투입 필요')
    
    # 5. 임계점/상전이
    phase_state = analyze_phase(new_state.force.magnitude, 0.78)
    if phase_state.current_phase in ['CRITICAL', 'COLLAPSE']:
        warnings.append(f'상전이 위험 ({phase_state.current_phase}) - 압력 {phase_state.pressure*100:.0f}%')
    
    # 6. 확산 (노드 연결 있으면)
    diffusion_complete = len(connections) == 0
    
    return PhysicsUpdate(
        inertia_effect=inertia_effect,
        force_result=force_result,
        reaction_balance=reaction_balance,
        entropy_change=entropy_change,
        phase_state=phase_state,
        diffusion_complete=diffusion_complete,
        new_state=new_state,
        warnings=warnings,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 물리법칙 설명
# ═══════════════════════════════════════════════════════════════════════════════

def describe_physics_laws() -> str:
    """물리법칙 설명 출력"""
    return """
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ⚛️ AUTUS 6가지 물리법칙 + 3대 원리                                             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ 🔬 6가지 물리법칙                                                             ║
║ ─────────────────────────────────────────────────────────────────────────────║
║                                                                               ║
║ 1. 관성의 법칙 (Inertia)                                                      ║
║    → 외부 힘 없으면 현재 상태 유지                                            ║
║    → 적용: 사람의 행동은 쉽게 변하지 않는다                                   ║
║                                                                               ║
║ 2. 운동의 법칙 (F = ma)                                                       ║
║    → 힘 = 질량 × 가속도                                                       ║
║    → 적용: 큰 관성(습관)일수록 변화에 더 큰 힘 필요                           ║
║                                                                               ║
║ 3. 작용-반작용 법칙                                                           ║
║    → 모든 작용에는 반대 방향 반작용                                           ║
║    → 적용: 시너지(같은 방향) vs 대항(반대 방향)                               ║
║                                                                               ║
║ 4. 엔트로피 법칙                                                              ║
║    → dS/dt ≥ 0: 방치하면 무질서 증가                                          ║
║    → 적용: 관리하지 않으면 자연 악화                                          ║
║                                                                               ║
║ 5. 임계점/상전이 법칙                                                         ║
║    → 임계값(78%) 넘으면 상태 급변                                             ║
║    → 적용: 위기 폭발 또는 돌파 예측                                           ║
║                                                                               ║
║ 6. 확산/전파 법칙 (Laplacian)                                                 ║
║    → ΔP = k × w × (Pj - Pi)                                                   ║
║    → 적용: 압력이 연결된 노드로 전파                                          ║
║                                                                               ║
║ ─────────────────────────────────────────────────────────────────────────────║
║                                                                               ║
║ 🌌 3대 원리                                                                   ║
║ ─────────────────────────────────────────────────────────────────────────────║
║                                                                               ║
║ 1. 결정론 (Determinism)                                                       ║
║    → 같은 입력 = 같은 출력 (예측 가능, 투명함)                                ║
║                                                                               ║
║ 2. 열역학 원리 (Thermodynamics)                                               ║
║    → 에너지 보존 + 엔트로피 증가                                              ║
║                                                                               ║
║ 3. 복잡계 원리 (Complex Systems)                                              ║
║    → 단순 상호작용 → 창발적 현상                                              ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
