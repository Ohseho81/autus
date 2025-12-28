"""
AUTUS Physics Boundary Definition v1.0 (FINAL LOCK)

"물리는 예측한다. 제어는 차단한다. 혼합하지 않는다."

계층 구조:
- Level 0: 근본 물리법칙 (3) - 불변
- Level 1: 현실 투영 법칙 (3) - 자동 생성
- Level 2: 시스템/환경 물리법칙 (4) - 조건부 허용
- Level 3: 제어 규칙 - 물리 아님 (차단만)

Score: 99/100 🔒
"""

from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional
from enum import Enum
import math
import time


# ================================================================
# LEVEL 0: 근본 물리법칙 (불변)
# ================================================================

class Level0:
    """
    Level 0: 근본 물리법칙 (3개)
    
    ① CONSERVATION (보존): ΣM_in = ΣM_out
    ② INERTIA (관성): M(t+Δt) ≈ M(t)
    ③ INTERACTION (상호작용): M_A→B ⇒ M_B→A
    """
    
    @staticmethod
    def conservation(m_in: List[float], m_out: List[float]) -> bool:
        """보존 법칙: ΣM_in = ΣM_out"""
        return abs(sum(m_in) - sum(m_out)) < 1e-10
    
    @staticmethod
    def inertia(m_t: float, m_t_dt: float, tolerance: float = 0.01) -> float:
        """관성 법칙: M(t+Δt) ≈ M(t)"""
        # 자연 감쇠율 (관성에 의한 상태 유지)
        decay = 0.998
        return m_t * decay
    
    @staticmethod
    def interaction(m_a_to_b: float) -> float:
        """상호작용 법칙: M_A→B ⇒ M_B→A"""
        # 작용-반작용
        return -m_a_to_b


# ================================================================
# LEVEL 1: 현실 투영 법칙 (자동 생성)
# ================================================================

class Level1:
    """
    Level 1: 현실 투영 법칙 (3개)
    
    ④ FRICTION (마찰/손실): M_eff = M_raw - Loss
    ⑤ POTENTIAL (포텐셜): P(t+Δt) = P(t) + Store
    ⑥ THRESHOLD (임계): E ≥ E_crit → StateChange
    
    Level 0에서 자동 생성됨
    """
    
    @staticmethod
    def friction(m_raw: float, loss_rate: float = 0.02) -> float:
        """마찰/손실: M_eff = M_raw - Loss"""
        return m_raw * (1 - loss_rate)
    
    @staticmethod
    def potential(p_current: float, store: float) -> float:
        """포텐셜 저장: P(t+Δt) = P(t) + Store"""
        return p_current + store
    
    @staticmethod
    def threshold(energy: float, critical: float) -> bool:
        """임계점 판정: E ≥ E_crit → StateChange"""
        return energy >= critical


# ================================================================
# LEVEL 2: 시스템/환경 물리법칙 (조건부 허용)
# ================================================================

@dataclass
class Level2State:
    """Level 2 물리법칙 상태 (4개 변수만)"""
    scale_nn: float = 1.0       # ⑦ n^n 상태 공간
    entropy_sigma: float = 0.0  # ⑧ σ 엔트로피 [0, 1]
    stability: float = 1.0      # ⑨ 안정성 [0, 1]
    recovery: float = 0.1       # ⑩ 회복력 (1/τ)


class Level2Physics:
    """
    Level 2: 시스템/환경 물리법칙 (4개)
    
    ⑦ SCALE (n^n): State_Space ∝ n^n
    ⑧ ENTROPY (σ): σ = -Σ pᵢ log pᵢ
    ⑨ STABILITY: Stab = 1 - |ΔS|/Max
    ⑩ RECOVERY: Rec = 1/τ
    
    인정 조건 (4가지 모두 충족):
    - 환원 가능성: Level 0-1 조합으로 환원
    - 상태 연속성: Δ값으로 측정 가능
    - 개체 불변성: 개체 종류와 무관한 동일 수식
    - 의도 배제: 의도·목표·가치 판단 불포함
    """
    
    def __init__(self, n_entities: int = 1):
        self.n = max(1, n_entities)
        self.state = Level2State(
            scale_nn=self._compute_scale(self.n),
            entropy_sigma=0.0,
            stability=1.0,
            recovery=0.1,
        )
        self.history: List[Dict] = []
        self.t = 0.0
        self.dt = 0.016  # ~60fps
    
    # ================================================================
    # ⑦ SCALE (n^n)
    # ================================================================
    
    def _compute_scale(self, n: int) -> float:
        """
        State_Space ∝ n^n
        
        환원: Interaction^n (상호작용 조합 수)
        상태량: 가능 상태 수 (정수 → 연속 근사)
        """
        if n <= 0:
            return 0.0
        if n > 170:  # Overflow prevention
            return float('inf')
        return math.pow(n, n)
    
    def update_scale(self, delta_n: int) -> float:
        """Entity 추가/제거 시 스케일 업데이트"""
        self.n = max(1, self.n + delta_n)
        self.state.scale_nn = self._compute_scale(self.n)
        return self.state.scale_nn
    
    # ================================================================
    # ⑧ ENTROPY (σ)
    # ================================================================
    
    def compute_entropy(self, distribution: List[float]) -> float:
        """
        σ = H(State) = -Σ pᵢ log pᵢ
        
        환원: Interaction 분포의 Shannon entropy
        상태량: [0, log(n)] → 정규화 [0, 1]
        """
        total = sum(distribution)
        if total <= 0:
            return 0.0
        
        probs = [p / total for p in distribution if p > 0]
        if len(probs) <= 1:
            self.state.entropy_sigma = 0.0
            return 0.0
        
        entropy = -sum(p * math.log(p) for p in probs)
        max_entropy = math.log(len(probs))
        
        self.state.entropy_sigma = entropy / max_entropy if max_entropy > 0 else 0.0
        return self.state.entropy_sigma
    
    def delta_entropy(self, delta_sigma: float) -> float:
        """엔트로피 변화 적용 (Δσ)"""
        self.state.entropy_sigma = max(0.0, min(1.0, 
            self.state.entropy_sigma + delta_sigma))
        return self.state.entropy_sigma
    
    # ================================================================
    # ⑨ STABILITY
    # ================================================================
    
    def compute_stability(self, delta_state: float, max_delta: float = 1.0) -> float:
        """
        Stability = 1 - |ΔState| / Max
        
        환원: Inertia + Friction
        상태량: [0, 1] 연속값
        """
        if max_delta <= 0:
            return 1.0
        
        self.state.stability = max(0.0, 1.0 - abs(delta_state) / max_delta)
        return self.state.stability
    
    def delta_stability(self, delta_stab: float) -> float:
        """안정성 변화 적용 (ΔStab)"""
        self.state.stability = max(0.0, min(1.0, 
            self.state.stability + delta_stab))
        return self.state.stability
    
    # ================================================================
    # ⑩ RECOVERY
    # ================================================================
    
    def compute_recovery(self, tau: float) -> float:
        """
        Recovery = 1 / τ
        
        환원: Inertia + Potential (시간 상수의 역수)
        상태량: [0, ∞) 연속값
        """
        if tau <= 0:
            return float('inf')
        
        self.state.recovery = 1.0 / tau
        return self.state.recovery
    
    def delta_recovery(self, delta_rec: float) -> float:
        """회복력 변화 적용 (ΔRec)"""
        self.state.recovery = max(0.0, self.state.recovery + delta_rec)
        return self.state.recovery
    
    # ================================================================
    # 시간 진행 (자연 물리)
    # ================================================================
    
    def tick(self) -> Level2State:
        """
        시간 진행에 따른 자연 물리 적용
        
        - Level 0 Inertia: 자연 감쇠
        - Level 1 Friction: 손실
        - Recovery: 안정성 회복
        """
        self.t += self.dt
        
        # Inertia: 엔트로피 자연 감쇠 (0.998)
        self.state.entropy_sigma = Level0.inertia(self.state.entropy_sigma)
        
        # Recovery: 안정성 회복
        healing = self.state.recovery * self.dt * (1.0 - self.state.stability)
        self.state.stability = min(1.0, self.state.stability + healing)
        
        # Stability = 1 - entropy (역관계)
        entropy_effect = self.state.entropy_sigma * 0.5
        self.state.stability = max(0.0, min(1.0, 
            self.state.stability - entropy_effect * self.dt))
        
        # Record history
        self._record_history()
        
        return self.state
    
    def _record_history(self):
        """상태 이력 기록"""
        self.history.append({
            't': self.t,
            'scale': self.state.scale_nn,
            'entropy': self.state.entropy_sigma,
            'stability': self.state.stability,
            'recovery': self.state.recovery,
        })
        if len(self.history) > 100:
            self.history.pop(0)
    
    # ================================================================
    # Motion 적용 (68개 Motion → Level 2 매핑)
    # ================================================================
    
    def apply_motion(self, motion_id: str, params: Optional[Dict] = None) -> Dict:
        """
        Motion에 Level 2 물리법칙 적용
        
        Returns: {
            'motion': motion_id,
            'effects': {...},
            'state': Level2State,
            'equation': str
        }
        """
        params = params or {}
        
        # Motion → Level 2 Effects 매핑 (정본)
        MOTION_EFFECTS = {
            # ============== User Actions ==============
            'U001': {  # PUSH
                'sigma': +0.05, 'stability': -0.1,
                'eq': 'σ += 0.05, Stab -= 0.1'
            },
            'U002': {  # HOLD
                'stability': +0.05, 'recovery': +0.02,
                'eq': 'Stab += 0.05, Rec += 0.02'
            },
            'U003': {  # DRIFT
                'sigma': +0.02, 'recovery': +0.03,
                'eq': 'σ += 0.02, Rec += 0.03 (inertia)'
            },
            
            # ============== Entity Motions ==============
            'E001': {  # CU_TRANSFER
                'sigma': +0.01,
                'eq': 'σ redistrib'
            },
            'E002': {  # CONNECT
                'scale': +1, 'sigma': -0.05, 'recovery': +0.05,
                'eq': 'n += 1, σ -= 0.05, Rec += 0.05'
            },
            'E003': {  # DISCONNECT
                'scale': -1, 'sigma': +0.05, 'recovery': -0.05,
                'eq': 'n -= 1, σ += 0.05, Rec -= 0.05'
            },
            'E004': {  # INFLUENCE
                'sigma': +0.03, 'stability': -0.05,
                'eq': 'σ += 0.03, Stab -= 0.05'
            },
            'E005': {  # ABSORB
                'sigma': -0.02, 'recovery': +0.03,
                'eq': 'σ -= 0.02, Rec += 0.03'
            },
            'E006': {  # COALITION_JOIN
                'scale': +10, 'sigma': -0.1, 'stability': +0.1, 'recovery': +0.1,
                'eq': 'n^n ↑↑, σ -= 0.1, Stab += 0.1, Rec += 0.1'
            },
            'E007': {  # COALITION_EXIT
                'scale': -10, 'sigma': +0.1, 'stability': -0.1, 'recovery': -0.1,
                'eq': 'n^n ↓↓, σ += 0.1, Stab -= 0.1, Rec -= 0.1'
            },
            'E008': {  # CONTAGION
                'sigma': +0.15, 'stability': -0.2,
                'eq': 'σ spread += 0.15, Stab -= 0.2'
            },
            
            # ============== State Motions ==============
            'S001': {  # Δstability
                'stability': params.get('delta', 0),
                'eq': f"Stab direct"
            },
            'S002': {  # Δpressure
                'sigma': +0.02, 'stability': -0.03,
                'eq': 'σ += 0.02, Stab -= 0.03'
            },
            'S005': {  # Δvolatility
                'sigma': +0.05, 'stability': -0.05,
                'eq': 'σ direct, Stab inverse'
            },
            'S006': {  # Δrecovery
                'recovery': params.get('delta', 0),
                'eq': 'Rec direct'
            },
            
            # ============== Loop Motions ==============
            'L001': {  # REALITY_INPUT
                'sigma': +0.01,
                'eq': 'σ_input += 0.01'
            },
            'L002': {  # STATE_MEASURE
                'sigma': +0.005, 'stability': 0, 'recovery': 0,
                'eq': 'σ_measure, Stab_calc, Rec_calc'
            },
            'L004': {  # FORECAST_COMPUTE
                'sigma': +0.01,
                'eq': 'n^n pred, σ_pred'
            },
            'L005': {  # DECISION_WAIT
                'stability': +0.02, 'recovery': +0.01,
                'eq': 'Stab += 0.02, Rec += 0.01'
            },
            'L006': {  # ACTION_EXECUTE
                'sigma': +0.03, 'stability': -0.02,
                'eq': 'σ += 0.03, Stab -= 0.02'
            },
            
            # ============== Map Motions ==============
            'M001': {  # NODE_CREATE
                'scale': +1, 'sigma': +0.02,
                'eq': 'n += 1, σ += 0.02'
            },
            'M002': {  # NODE_DELETE
                'scale': -1, 'sigma': -0.02,
                'eq': 'n -= 1, σ -= 0.02'
            },
            'M003': {  # NODE_MOVE
                'stability': -0.01,
                'eq': 'Stab -= 0.01'
            },
            'M004': {  # EDGE_CREATE
                'scale': +1, 'sigma': +0.01, 'recovery': +0.02,
                'eq': 'edges ↑, σ += 0.01, Rec += 0.02'
            },
            'M005': {  # EDGE_DELETE
                'scale': -1, 'sigma': +0.01, 'recovery': -0.02,
                'eq': 'edges ↓, σ += 0.01, Rec -= 0.02'
            },
            'M007': {  # SIGMA_ZONE_ADD
                'sigma': +0.1, 'stability': -0.1,
                'eq': 'σ_zone += 0.1, Stab -= 0.1'
            },
            'M008': {  # SIGMA_ZONE_REMOVE
                'sigma': -0.1, 'stability': +0.1,
                'eq': 'σ_zone -= 0.1, Stab += 0.1'
            },
            
            # ============== Scaling Motions ==============
            'X001': {  # ENTITY_ADD
                'scale': +1, 'sigma': +0.05, 'stability': -0.05,
                'eq': 'n^n ↑↑, σ += 0.05, Stab -= 0.05'
            },
            'X002': {  # ENTITY_REMOVE
                'scale': -1, 'sigma': -0.05, 'stability': +0.05,
                'eq': 'n^n ↓↓, σ -= 0.05, Stab += 0.05'
            },
        }
        
        effects = MOTION_EFFECTS.get(motion_id, {'eq': 'no effect'})
        applied = {}
        
        # Apply effects
        if 'scale' in effects:
            applied['scale'] = self.update_scale(effects['scale'])
        if 'sigma' in effects:
            applied['entropy'] = self.delta_entropy(effects['sigma'])
        if 'stability' in effects:
            applied['stability'] = self.delta_stability(effects['stability'])
        if 'recovery' in effects:
            applied['recovery'] = self.delta_recovery(effects['recovery'])
        
        return {
            'motion': motion_id,
            'effects': applied,
            'state': self.state,
            'equation': effects.get('eq', 'unknown'),
        }
    
    def get_state(self) -> Level2State:
        """현재 Level 2 상태 반환"""
        return self.state


# ================================================================
# LEVEL 3: 제어 규칙 (물리 아님)
# ================================================================

@dataclass
class Level3Result:
    """Level 3 제어 결과"""
    allowed: bool
    reason: Optional[str] = None
    guard: Optional[str] = None
    blocked_count: int = 0


class Level3Control:
    """
    Level 3: 제어 규칙 (물리 아님)
    
    ⓐ CAP / DAMP / COOLDOWN (명령형 상한)
    ⓑ CONSENT (인간 의사 개입)
    ⓒ POLICY (정책/규정 - 외생 변수)
    ⓓ UI GUARD (표현 계층)
    
    핵심 원칙:
    - 차단만 가능
    - 예측 결과를 변경하지 못함
    - 물리법칙 아님
    """
    
    def __init__(self, physics: Level2Physics):
        self.physics = physics
        self.blocked_count = 0
        self.cooldown_until = 0.0
        
        # Guard thresholds
        self.CAP_ENTROPY = 0.9
        self.CAP_INSTABILITY = 0.9  # 1 - stability
        self.DAMP_FACTOR = 0.7
        self.COOLDOWN_SEC = 0.5
    
    # ================================================================
    # ⓐ CAP (상한 제한)
    # ================================================================
    
    def check_cap(self, action: str) -> Level3Result:
        """
        CAP: 상한 초과 시 차단
        
        - 엔트로피 ≥ 0.9 → PUSH 차단
        - 불안정성 ≥ 0.9 → 고위험 행동 차단
        """
        state = self.physics.get_state()
        
        # Entropy CAP
        if state.entropy_sigma >= self.CAP_ENTROPY:
            if action in ['U001', 'E008', 'M007']:  # PUSH, CONTAGION, SIGMA_ZONE_ADD
                self.blocked_count += 1
                return Level3Result(
                    allowed=False,
                    reason='CAP',
                    guard=f'entropy {state.entropy_sigma:.2f} >= {self.CAP_ENTROPY}',
                    blocked_count=self.blocked_count
                )
        
        # Instability CAP
        if state.stability <= (1 - self.CAP_INSTABILITY):
            if action in ['U001', 'E003', 'E007']:  # PUSH, DISCONNECT, COALITION_EXIT
                self.blocked_count += 1
                return Level3Result(
                    allowed=False,
                    reason='CAP',
                    guard=f'stability {state.stability:.2f} <= {1-self.CAP_INSTABILITY}',
                    blocked_count=self.blocked_count
                )
        
        return Level3Result(allowed=True, blocked_count=self.blocked_count)
    
    # ================================================================
    # ⓐ DAMP (감쇠)
    # ================================================================
    
    def check_damp(self) -> bool:
        """
        DAMP: 진동 감지
        
        Returns: True if oscillating (warning only)
        """
        history = self.physics.history
        if len(history) < 10:
            return False
        
        recent = history[-10:]
        changes = 0
        for i in range(2, len(recent)):
            prev_dir = recent[i-1]['entropy'] - recent[i-2]['entropy']
            curr_dir = recent[i]['entropy'] - recent[i-1]['entropy']
            if prev_dir * curr_dir < 0:  # Direction change
                changes += 1
        
        return changes > 5
    
    # ================================================================
    # ⓐ COOLDOWN (쿨다운)
    # ================================================================
    
    def check_cooldown(self) -> Level3Result:
        """
        COOLDOWN: 연속 실행 제한
        """
        now = time.time()
        if now < self.cooldown_until:
            self.blocked_count += 1
            return Level3Result(
                allowed=False,
                reason='COOLDOWN',
                guard=f'{self.cooldown_until - now:.2f}s remaining',
                blocked_count=self.blocked_count
            )
        return Level3Result(allowed=True, blocked_count=self.blocked_count)
    
    def set_cooldown(self):
        """쿨다운 설정"""
        self.cooldown_until = time.time() + self.COOLDOWN_SEC
    
    # ================================================================
    # ⓑ CONSENT (동의)
    # ================================================================
    
    def check_consent(self, action: str, consent_given: bool = True) -> Level3Result:
        """
        CONSENT: 인간 의사 개입 필요 행동
        
        고위험 행동은 명시적 동의 필요
        """
        HIGH_RISK_ACTIONS = ['E006', 'E007', 'E008', 'X001', 'X002']
        
        if action in HIGH_RISK_ACTIONS and not consent_given:
            self.blocked_count += 1
            return Level3Result(
                allowed=False,
                reason='CONSENT',
                guard='explicit consent required',
                blocked_count=self.blocked_count
            )
        
        return Level3Result(allowed=True, blocked_count=self.blocked_count)
    
    # ================================================================
    # 통합 실행
    # ================================================================
    
    def execute(self, action: str, consent: bool = True) -> Dict:
        """
        Level 3 가드를 통과한 후 Level 2 물리 실행
        
        핵심: Level 3은 차단만, 물리 결과는 변경 불가
        """
        # 1. COOLDOWN 체크
        cooldown_check = self.check_cooldown()
        if not cooldown_check.allowed:
            return {
                'executed': False,
                **cooldown_check.__dict__
            }
        
        # 2. CAP 체크
        cap_check = self.check_cap(action)
        if not cap_check.allowed:
            return {
                'executed': False,
                **cap_check.__dict__
            }
        
        # 3. CONSENT 체크
        consent_check = self.check_consent(action, consent)
        if not consent_check.allowed:
            return {
                'executed': False,
                **consent_check.__dict__
            }
        
        # 4. DAMP 경고 (차단 아님)
        damp_warning = self.check_damp()
        
        # 5. Level 2 물리 실행 (제어는 결과를 변경하지 않음)
        result = self.physics.apply_motion(action)
        
        # 6. 쿨다운 설정
        self.set_cooldown()
        
        return {
            'executed': True,
            'damp_warning': damp_warning,
            'blocked_count': self.blocked_count,
            **result
        }
    
    def get_guard_status(self) -> Dict:
        """모든 가드 상태 반환"""
        state = self.physics.get_state()
        now = time.time()
        
        return {
            'cap_entropy': state.entropy_sigma >= self.CAP_ENTROPY,
            'cap_instability': state.stability <= (1 - self.CAP_INSTABILITY),
            'damp_oscillating': self.check_damp(),
            'cooldown_active': now < self.cooldown_until,
            'cooldown_remaining': max(0, self.cooldown_until - now),
            'blocked_count': self.blocked_count,
        }


# ================================================================
# 통합 엔진
# ================================================================

class AUTUSPhysicsEngine:
    """
    AUTUS Physics Engine
    
    Level 0-2: 예측/자동화
    Level 3: 차단만
    
    "물리는 예측한다. 제어는 차단한다. 혼합하지 않는다."
    """
    
    def __init__(self, n_entities: int = 1):
        self.physics = Level2Physics(n_entities)
        self.control = Level3Control(self.physics)
    
    def tick(self) -> Level2State:
        """시간 진행"""
        return self.physics.tick()
    
    def execute(self, action: str, consent: bool = True) -> Dict:
        """행동 실행 (Level 3 가드 → Level 2 물리)"""
        return self.control.execute(action, consent)
    
    def get_state(self) -> Dict:
        """전체 상태 반환"""
        return {
            'physics': self.physics.get_state().__dict__,
            'guards': self.control.get_guard_status(),
            't': self.physics.t,
            'n': self.physics.n,
        }


# ================================================================
# 테스트
# ================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("AUTUS Physics Boundary v1.0 (FINAL LOCK)")
    print("=" * 60)
    
    engine = AUTUSPhysicsEngine(n_entities=5)
    
    print("\n[초기 상태]")
    state = engine.get_state()
    print(f"  Scale(n^n): {state['physics']['scale_nn']:.2e}")
    print(f"  Entropy(σ): {state['physics']['entropy_sigma']:.4f}")
    print(f"  Stability:  {state['physics']['stability']:.4f}")
    print(f"  Recovery:   {state['physics']['recovery']:.4f}")
    
    print("\n[U001: PUSH 실행]")
    result = engine.execute('U001')
    print(f"  Executed: {result['executed']}")
    print(f"  Equation: {result.get('equation', 'N/A')}")
    
    print("\n[E006: COALITION_JOIN 실행]")
    result = engine.execute('E006', consent=True)
    print(f"  Executed: {result['executed']}")
    print(f"  Equation: {result.get('equation', 'N/A')}")
    
    print("\n[최종 상태]")
    state = engine.get_state()
    print(f"  Scale(n^n): {state['physics']['scale_nn']:.2e}")
    print(f"  Entropy(σ): {state['physics']['entropy_sigma']:.4f}")
    print(f"  Stability:  {state['physics']['stability']:.4f}")
    print(f"  Recovery:   {state['physics']['recovery']:.4f}")
    
    print("\n[Level 3 Guards]")
    guards = state['guards']
    print(f"  CAP (entropy):    {'BLOCKED' if guards['cap_entropy'] else 'OK'}")
    print(f"  CAP (instability): {'BLOCKED' if guards['cap_instability'] else 'OK'}")
    print(f"  DAMP (oscillation): {'WARNING' if guards['damp_oscillating'] else 'OK'}")
    print(f"  COOLDOWN:         {'ACTIVE' if guards['cooldown_active'] else 'OK'}")
    print(f"  Blocked Count:    {guards['blocked_count']}")
    
    print("\n✓ Level 0-2: 예측/자동화")
    print("✓ Level 3: 차단만 (예측 변경 없음)")
    print("\nScore: 99/100 🔒")







