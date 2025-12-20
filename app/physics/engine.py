"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS PHYSICS ENGINE — 7 Laws + TIME-MONEY Integration

통합 물리 엔진: UI, 거버넌스, Audit과 직접 연결
═══════════════════════════════════════════════════════════════════════════════
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import time

from .laws import (
    SystemState, Person, Commit, MoneyFlow,
    law1_human_continuity, law2_commit_conservation, law3_allowed_actions,
    law4_ui_compliance, law6_responsibility_density, law7_survival_mass,
    verify_all_laws, T_MIN, ALPHA_SAFETY, MAX_ROLES
)

from .time_money import (
    CommitData, FloatState,
    calc_commit_energy, calc_survival_time, calc_float_pressure,
    calc_survival_mass, can_expand, calc_time_to_collapse, select_action,
    analyze_time_money_physics
)


@dataclass
class PhysicsSnapshot:
    """물리 상태 스냅샷"""
    timestamp: float
    system_state: str  # GREEN / YELLOW / RED
    
    # 핵심 지표
    risk: float  # 0.0 ~ 1.0
    entropy: float  # 불확실성
    pressure: float  # Float Pressure
    flow: float  # 진행률
    
    # 파생 지표
    survival_days: float
    collapse_days: float
    
    # 상태
    can_create_commit: bool
    can_expand: bool
    recommended_action: Optional[str]
    
    # 법칙 위반
    violations: List[str]


class PhysicsEngine:
    """
    AUTUS 통합 물리 엔진
    
    7 Laws:
    1. Continuity (연속성) — 인간 보호
    2. Commit Conservation (보존) — 돈 봉인
    3. State Dominance (상태 지배) — CEO Override 불가
    4. Cognitive Minimum (인지 최소) — UI 단순화
    5. Failure Containment (실패 격리) — 연쇄 붕괴 방지
    6. Responsibility Density (책임 밀도) — 역할 최소화
    7. Survival Mass Threshold (생존 질량) — 확장 제어
    """
    
    def __init__(self):
        self.persons: List[Person] = []
        self.commits: List[Commit] = []
        self.commit_data: List[CommitData] = []  # 상세 물리 데이터
        self.money_flows: List[MoneyFlow] = []
        
        self.daily_burn: float = 100000  # 기본 일일 소비 ₩10만
        self.required_expansion_mass: float = 0
        
        self._last_snapshot: Optional[PhysicsSnapshot] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════
    
    def add_person(self, id: str, survival_time: float):
        """개인 추가"""
        self.persons.append(Person(id=id, survival_time=survival_time))
    
    def add_commit(
        self,
        id: str,
        amount: float,
        start_date: float,
        end_date: float,
        direction: str = "in",
        regulatory_risk: float = 0.0,
        operational_risk: float = 0.0,
        payments_per_period: int = 1
    ):
        """Commit 추가 (기본 + 물리 데이터)"""
        # 기본 Commit
        self.commits.append(Commit(
            id=id, amount=amount,
            start_date=start_date, end_date=end_date,
            status="active"
        ))
        
        # 물리 Commit
        self.commit_data.append(CommitData(
            id=id, amount=amount,
            start_date=start_date, end_date=end_date,
            direction=direction,
            regulatory_risk=regulatory_risk,
            operational_risk=operational_risk,
            payments_per_period=payments_per_period,
            status="active"
        ))
    
    def add_money_flow(self, id: str, amount: float, commit_id: str, timestamp: float):
        """자금 흐름 추가"""
        self.money_flows.append(MoneyFlow(
            id=id, amount=amount, commit_id=commit_id, timestamp=timestamp
        ))
    
    def close_commit(self, commit_id: str):
        """Commit 종료"""
        for c in self.commits:
            if c.id == commit_id:
                c.status = "closed"
        
        for c in self.commit_data:
            if c.id == commit_id:
                c.status = "closed"
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 물리 계산
    # ═══════════════════════════════════════════════════════════════════════════
    
    def compute_snapshot(self, current_timestamp: float = None) -> PhysicsSnapshot:
        """
        현재 상태 스냅샷 계산
        7 Laws + TIME-MONEY PHYSICS 통합
        """
        if current_timestamp is None:
            current_timestamp = time.time()
        
        # 데이터 분리
        commits_in = [c for c in self.commit_data if c.direction == "in" and c.status == "active"]
        commits_out = [c for c in self.commit_data if c.direction == "out" and c.status == "active"]
        active_commits = [c for c in self.commits if c.status == "active"]
        
        # 1. 7 Laws 검증
        laws_result = verify_all_laws(
            persons=self.persons,
            money_flows=self.money_flows,
            commits=self.commits,
            ui_elements=3,
            buttons=1,
            text_count=0,
            role_count=MAX_ROLES,
            required_mass=self.required_expansion_mass,
            current_timestamp=current_timestamp
        )
        
        # 2. TIME-MONEY PHYSICS 분석
        tm_result = analyze_time_money_physics(
            commits_in=commits_in,
            commits_out=commits_out,
            daily_burn=self.daily_burn,
            required_expansion_mass=self.required_expansion_mass,
            current_timestamp=current_timestamp
        )
        
        # 3. 시스템 상태 결정 (가장 심각한 상태)
        system_state = self._determine_system_state(laws_result, tm_result)
        
        # 4. 핵심 지표 계산
        risk = self._calc_risk(tm_result, laws_result)
        entropy = self._calc_entropy(tm_result)
        pressure = tm_result["float_pressure"]["pressure"]
        flow = self._calc_flow(commits_in, commits_out)
        
        # 5. 권한 결정
        allowed = law3_allowed_actions(SystemState[system_state])
        
        # 6. 스냅샷 생성
        snapshot = PhysicsSnapshot(
            timestamp=current_timestamp,
            system_state=system_state,
            risk=risk,
            entropy=entropy,
            pressure=pressure,
            flow=flow,
            survival_days=tm_result["survival"]["survival_days"],
            collapse_days=tm_result["collapse"]["collapse_time_days"],
            can_create_commit=allowed["can_create_commit"],
            can_expand=allowed["can_expand"] and tm_result["expansion"]["can_expand"],
            recommended_action=tm_result["recommended_action"]["action"],
            violations=laws_result["violations"]
        )
        
        self._last_snapshot = snapshot
        return snapshot
    
    def _determine_system_state(self, laws_result: Dict, tm_result: Dict) -> str:
        """시스템 상태 결정 (가장 심각한 상태)"""
        states = []
        
        # Law 1에서 결정된 상태
        law1_state = laws_result["laws"]["law1_continuity"]["system_state"]
        states.append(law1_state.value if hasattr(law1_state, 'value') else str(law1_state))
        
        # TIME-MONEY 상태
        survival_state = tm_result["survival"]["state"]
        states.append(survival_state)
        
        # Float Pressure 상태
        float_state = tm_result["float_pressure"]["state"]
        states.append(float_state.value if hasattr(float_state, 'value') else str(float_state))
        
        # 가장 심각한 상태 선택
        if "RED" in states:
            return "RED"
        if "YELLOW" in states:
            return "YELLOW"
        return "GREEN"
    
    def _calc_risk(self, tm_result: Dict, laws_result: Dict) -> float:
        """
        Risk 계산 (0.0 ~ 1.0)
        - Float Pressure 기반
        - 생존 시간 기반
        - 법칙 위반 기반
        """
        # Float Pressure 기여
        pressure = tm_result["float_pressure"]["pressure"]
        pressure_risk = min(1.0, pressure / 1.5)  # 1.5 이상이면 1.0
        
        # 생존 시간 기여
        survival_days = tm_result["survival"]["survival_days"]
        if survival_days >= T_MIN:
            survival_risk = 0.0
        elif survival_days <= 0:
            survival_risk = 1.0
        else:
            survival_risk = 1.0 - (survival_days / T_MIN)
        
        # 법칙 위반 기여
        violation_count = len(laws_result["violations"])
        violation_risk = min(1.0, violation_count * 0.2)  # 위반 당 0.2
        
        # 가중 평균
        risk = 0.4 * pressure_risk + 0.4 * survival_risk + 0.2 * violation_risk
        return min(1.0, max(0.0, risk))
    
    def _calc_entropy(self, tm_result: Dict) -> float:
        """
        Entropy 계산 (불확실성)
        - 붕괴 시간이 짧을수록 높음
        """
        collapse_days = tm_result["collapse"]["collapse_time_days"]
        
        if collapse_days >= 365:
            return 0.0
        elif collapse_days <= 0:
            return 1.0
        else:
            return 1.0 - (collapse_days / 365)
    
    def _calc_flow(self, commits_in: List, commits_out: List) -> float:
        """
        Flow 계산 (진행률)
        - 들어오는 에너지 / 전체 에너지
        """
        energy_in = sum(calc_commit_energy(c) for c in commits_in)
        energy_out = sum(calc_commit_energy(c) for c in commits_out)
        total = energy_in + energy_out
        
        if total <= 0:
            return 0.5
        return energy_in / total
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Action 실행
    # ═══════════════════════════════════════════════════════════════════════════
    
    def execute_action(self, action: str) -> Dict[str, Any]:
        """
        Action 실행
        Law 3: State Dominance에 따라 허용 여부 결정
        """
        snapshot = self._last_snapshot or self.compute_snapshot()
        
        # 상태 기반 허용 체크
        allowed = law3_allowed_actions(SystemState[snapshot.system_state])
        
        if action not in allowed["allowed_actions"]:
            return {
                "success": False,
                "action": action,
                "reason": f"BLOCKED_BY_STATE_{snapshot.system_state}",
                "allowed_actions": allowed["allowed_actions"]
            }
        
        # Action 효과 적용 (시뮬레이션)
        effects = self._apply_action_effects(action)
        
        # 새 스냅샷 계산
        new_snapshot = self.compute_snapshot()
        
        return {
            "success": True,
            "action": action,
            "effects": effects,
            "before_state": snapshot.system_state,
            "after_state": new_snapshot.system_state,
            "risk_delta": new_snapshot.risk - snapshot.risk
        }
    
    def _apply_action_effects(self, action: str) -> Dict[str, float]:
        """Action 효과 적용"""
        effects = {
            "RECOVER": {"risk_delta": -0.08, "entropy_delta": -0.05},
            "DEFRICTION": {"risk_delta": -0.05, "entropy_delta": -0.08},
            "SHOCK_DAMP": {"risk_delta": -0.12, "entropy_delta": -0.03}
        }
        return effects.get(action, {})
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 출력 형식
    # ═══════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """API 출력용 딕셔너리"""
        snapshot = self._last_snapshot or self.compute_snapshot()
        
        return {
            "timestamp": snapshot.timestamp,
            "system_state": snapshot.system_state,
            "gate": snapshot.system_state,  # UI 호환
            
            # 핵심 지표 (0~100 스케일)
            "risk": round(snapshot.risk * 100, 1),
            "entropy": round(snapshot.entropy * 100, 1),
            "pressure": round(snapshot.pressure * 100, 1),
            "flow": round(snapshot.flow * 100, 1),
            
            # 시간 지표
            "survival_days": round(snapshot.survival_days, 1),
            "collapse_days": round(snapshot.collapse_days, 1),
            
            # 권한
            "can_create_commit": snapshot.can_create_commit,
            "can_expand": snapshot.can_expand,
            
            # 추천 Action
            "recommended_action": snapshot.recommended_action,
            
            # 법칙 상태
            "violations": snapshot.violations,
            "laws_passed": len(snapshot.violations) == 0
        }
    
    def to_ui_model(self) -> Dict[str, Any]:
        """
        Frontend UI용 모델
        window.__AUTUS_MODEL 형식
        """
        snapshot = self._last_snapshot or self.compute_snapshot()
        
        return {
            "snapshot": {
                "risk": snapshot.risk,
                "entropy": snapshot.entropy,
                "pressure": snapshot.pressure,
                "flow": snapshot.flow,
                "gate": snapshot.system_state
            },
            "bottleneck": {
                "type": self._get_bottleneck_type(snapshot),
                "value": self._get_bottleneck_value(snapshot)
            },
            "future": {
                "no_action": {
                    "loss_24h": self._estimate_loss_24h(snapshot),
                    "loss_monthly": self._estimate_loss_monthly(snapshot)
                }
            },
            "recommended_action": snapshot.recommended_action,
            "system_state": snapshot.system_state,
            "violations": snapshot.violations
        }
    
    def _get_bottleneck_type(self, snapshot: PhysicsSnapshot) -> str:
        """병목 타입 결정"""
        if snapshot.pressure > 0.8:
            return "FRICTION"
        if snapshot.entropy > 0.6:
            return "SHOCK"
        if snapshot.flow < 0.4:
            return "COHESION"
        return "RECOVERY"
    
    def _get_bottleneck_value(self, snapshot: PhysicsSnapshot) -> float:
        """병목 값"""
        return max(snapshot.risk, snapshot.entropy, snapshot.pressure)
    
    def _estimate_loss_24h(self, snapshot: PhysicsSnapshot) -> float:
        """24시간 손실 추정"""
        return self.daily_burn * snapshot.risk * 1.5
    
    def _estimate_loss_monthly(self, snapshot: PhysicsSnapshot) -> float:
        """월간 손실 추정"""
        return self.daily_burn * 30 * snapshot.risk


# ═══════════════════════════════════════════════════════════════════════════════
# 팩토리 함수
# ═══════════════════════════════════════════════════════════════════════════════

def create_demo_engine() -> PhysicsEngine:
    """데모용 엔진 생성"""
    engine = PhysicsEngine()
    
    now = time.time()
    six_months = 180 * 86400
    
    # 데모 인원
    engine.add_person("STU_001", survival_time=200)
    engine.add_person("STU_002", survival_time=150)
    
    # 데모 Commit (수입)
    engine.add_commit(
        id="TUITION_001",
        amount=15000000,
        start_date=now - 30 * 86400,
        end_date=now + six_months,
        direction="in",
        regulatory_risk=0.1,
        payments_per_period=2
    )
    
    # 데모 Commit (지출)
    engine.add_commit(
        id="WAGE_001",
        amount=8000000,
        start_date=now,
        end_date=now + six_months,
        direction="out",
        regulatory_risk=0.2,
        payments_per_period=1
    )
    
    # 일일 소비
    engine.daily_burn = 100000  # ₩10만
    engine.required_expansion_mass = 50000000
    
    return engine
