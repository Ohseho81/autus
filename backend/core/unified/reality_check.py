"""
═══════════════════════════════════════════════════════════════════════════════
🧭 AUTUS v3.0 - Reality Check Engine
═══════════════════════════════════════════════════════════════════════════════

테슬라 FSD가 "일본→한국 자동차 이동"을 거부하듯,
AUTUS는 물리적으로 불가능한 목표를 거부하고 대안을 제시한다.

4대 과학 기반 검증:
1. PHYSICS   - 가처분 에너지와 마찰력 (연료/자산/시간)
2. BIOLOGY   - 하드웨어의 한계 (신체/수명)
3. EARTH_SCI - 외부 환경의 지형지물 (규제/시장/지정학)
4. CHEMISTRY - 반응 속도와 촉매 (숙성 시간/전환율)

3대 엔진:
1. Reality Spec      - 실현 가능성 리포트 발행
2. Intermediate Station - 체크포인트 설계
3. Emergency Brake   - 비상 작동 로직

"당신의 목적지는 확인되었습니다. 하지만..."
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional, Tuple
from datetime import datetime, timedelta
import math


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 타입 정의
# ═══════════════════════════════════════════════════════════════════════════════

ScienceCategory = Literal['PHYSICS', 'BIOLOGY', 'EARTH_SCI', 'CHEMISTRY']
FeasibilityLevel = Literal['ACHIEVABLE', 'CHALLENGING', 'EXTREME', 'PHYSICAL_ERROR']
GoalCategory = Literal['WEALTH', 'HEALTH', 'CAREER', 'RELATIONSHIP', 'FREEDOM']


# 노드별 과학 카테고리 매핑
NODE_SCIENCE_MAP: Dict[str, ScienceCategory] = {
    # PHYSICS (에너지/자원)
    'n01': 'PHYSICS',   # 현금
    'n02': 'PHYSICS',   # 캐시플로우
    'n03': 'PHYSICS',   # 런웨이
    'n05': 'PHYSICS',   # 부채
    'n07': 'PHYSICS',   # 수익
    'n08': 'PHYSICS',   # 비용
    
    # BIOLOGY (신체/하드웨어)
    'n09': 'BIOLOGY',   # 수면
    'n10': 'BIOLOGY',   # HRV
    'n11': 'BIOLOGY',   # 피로
    'n12': 'BIOLOGY',   # 운동
    'n14': 'BIOLOGY',   # BMI
    'n15': 'BIOLOGY',   # 스트레스
    
    # CHEMISTRY (반응/시간)
    'n16': 'CHEMISTRY', # 마감
    'n17': 'CHEMISTRY', # 지연
    'n19': 'CHEMISTRY', # 태스크완료율
    'n20': 'CHEMISTRY', # 오류율
    'n21': 'CHEMISTRY', # 기술부채
    
    # EARTH_SCI (환경/지형)
    'n31': 'EARTH_SCI', # 변동성
    'n32': 'EARTH_SCI', # 규제
    'n33': 'EARTH_SCI', # 지정학
    'n34': 'EARTH_SCI', # 경쟁
    'n35': 'EARTH_SCI', # 기후
    'n36': 'EARTH_SCI', # 티핑포인트
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 데이터 클래스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """사용자 목표"""
    id: str
    title: str
    category: GoalCategory
    
    # 목표 수치
    target_value: float          # 목표값 (예: 1000억)
    current_value: float         # 현재값 (예: 10억)
    unit: str = ''               # 단위 (원, 시간, kg 등)
    
    # 시간 제약
    deadline: Optional[datetime] = None
    desired_months: int = 12     # 희망 달성 기간
    
    # 위험 허용도
    risk_tolerance: float = 0.5  # 0~1 (높을수록 공격적)
    pain_tolerance: float = 0.5  # 0~1 (높을수록 고통 감내)


@dataclass
class ScienceConstraint:
    """과학적 제약 조건"""
    category: ScienceCategory
    constraint_name: str
    description: str
    
    # 현재 상태
    current_value: float
    required_value: float
    
    # 위반 여부
    is_violated: bool
    violation_severity: float  # 0~1 (높을수록 심각)
    
    # 대안
    alternative: Optional[str] = None


@dataclass
class Checkpoint:
    """중간 체크포인트 (Intermediate Station)"""
    id: str
    title: str
    
    # 목표
    target_value: float
    current_value: float
    
    # 시간
    target_date: datetime
    estimated_pain: float  # 0~1
    
    # 상태
    status: str = 'PENDING'  # PENDING, IN_PROGRESS, COMPLETED, FAILED
    
    # 필요 조건
    prerequisites: List[str] = field(default_factory=list)


@dataclass
class FeasibilityReport:
    """실현 가능성 리포트"""
    goal: Goal
    
    # 판정
    level: FeasibilityLevel
    success_probability: float  # 0~1
    
    # 4대 과학 검증 결과
    physics_check: ScienceConstraint
    biology_check: ScienceConstraint
    earth_sci_check: ScienceConstraint
    chemistry_check: ScienceConstraint
    
    # 경고 및 제안
    warnings: List[str]
    alternatives: List[str]
    
    # 경로
    checkpoints: List[Checkpoint]
    estimated_duration_months: int
    required_pain_level: float
    
    # 메시지
    message: str


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 4대 과학 검증 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class PhysicsValidator:
    """
    PHYSICS: 가처분 에너지와 마찰력
    
    "현재 n01(현금)과 n03(런웨이)으로는 목표 지점까지 도달하기 전
     에너지가 고갈됩니다. 중간 기착지를 설정하거나 연료를 확보하십시오."
    """
    
    @staticmethod
    def validate(goal: Goal, node_pressures: Dict[str, float]) -> ScienceConstraint:
        # 에너지 계산: 현금 + 런웨이 + 수익 - 부채 - 비용
        cash_p = node_pressures.get('n01', 0.5)
        runway_p = node_pressures.get('n03', 0.5)
        revenue_p = node_pressures.get('n07', 0.5)
        debt_p = node_pressures.get('n05', 0.5)
        cost_p = node_pressures.get('n08', 0.5)
        
        # 가용 에너지 (압력이 낮을수록 여유 있음)
        available_energy = ((1 - cash_p) * 0.3 + (1 - runway_p) * 0.3 +
                           (1 - debt_p) * 0.2 + (1 - cost_p) * 0.2)
        
        # 목표까지 필요한 에너지
        gap_ratio = (goal.target_value - goal.current_value) / max(goal.current_value, 1)
        required_energy = min(1, gap_ratio / 100)  # 100배 이상이면 max
        
        # 마찰력 (월별 소모)
        monthly_friction = 0.05 + cost_p * 0.1  # 기본 5% + 비용 압력
        total_friction = monthly_friction * goal.desired_months
        
        # 최종 에너지 부족 여부
        net_energy = available_energy - required_energy - total_friction
        is_violated = net_energy < 0
        violation_severity = abs(min(0, net_energy))
        
        alternative = None
        if is_violated:
            months_to_refuel = int(violation_severity / 0.05) + 3
            alternative = f'연료(자산) 확보 {months_to_refuel}개월 후 재시도 또는 중간 기착지 설정'
        
        return ScienceConstraint(
            category='PHYSICS',
            constraint_name='에너지 보존 법칙',
            description=f'가용 에너지 {available_energy*100:.0f}% vs 필요 에너지 {required_energy*100:.0f}%',
            current_value=available_energy,
            required_value=required_energy + total_friction,
            is_violated=is_violated,
            violation_severity=violation_severity,
            alternative=alternative,
        )


class BiologyValidator:
    """
    BIOLOGY: 하드웨어의 한계
    
    "영생/초장수 모드를 선택하셨지만, 현재 n10(HRV)와 n09(수면) 데이터가
     임계점 아래입니다. 이 경로는 하드웨어(신체) 붕괴를 초래합니다."
    """
    
    @staticmethod
    def validate(goal: Goal, node_pressures: Dict[str, float]) -> ScienceConstraint:
        # 신체 상태 체크
        sleep_p = node_pressures.get('n09', 0.5)
        hrv_p = node_pressures.get('n10', 0.5)
        fatigue_p = node_pressures.get('n11', 0.5)
        stress_p = node_pressures.get('n15', 0.5)
        
        # 하드웨어 내구도 (압력 낮을수록 양호)
        hardware_health = ((1 - sleep_p) * 0.3 + (1 - hrv_p) * 0.3 +
                          (1 - fatigue_p) * 0.2 + (1 - stress_p) * 0.2)
        
        # 목표가 요구하는 강도
        intensity_required = goal.pain_tolerance * 0.5 + (1 - goal.risk_tolerance) * 0.2
        
        # 지속 기간에 따른 마모
        duration_wear = min(0.5, goal.desired_months * 0.02)  # 월당 2%
        
        total_required = intensity_required + duration_wear
        
        is_violated = hardware_health < total_required
        violation_severity = max(0, total_required - hardware_health)
        
        alternative = None
        if is_violated:
            recovery_months = int(violation_severity / 0.1) + 1
            alternative = (f'속도 제한 적용: {recovery_months}개월 회복 후 재가속 '
                          f'또는 목표 기간 {int(goal.desired_months * 1.5)}개월로 연장')
        
        return ScienceConstraint(
            category='BIOLOGY',
            constraint_name='신체 내구도 법칙',
            description=f'하드웨어 상태 {hardware_health*100:.0f}% vs 요구 강도 {total_required*100:.0f}%',
            current_value=hardware_health,
            required_value=total_required,
            is_violated=is_violated,
            violation_severity=violation_severity,
            alternative=alternative,
        )


class EarthScienceValidator:
    """
    EARTH_SCIENCE: 외부 환경의 지형지물
    
    "설정하신 목표 경로는 현재 n32(규제)라는 거대한 바다에 가로막혀 있습니다.
     이 경로는 '물리적으로 불가능'하므로, 다른 시장 지형으로 우회합니다."
    """
    
    @staticmethod
    def validate(goal: Goal, node_pressures: Dict[str, float]) -> ScienceConstraint:
        # 환경 장애물 체크
        volatility_p = node_pressures.get('n31', 0.3)
        regulation_p = node_pressures.get('n32', 0.3)
        geopolitical_p = node_pressures.get('n33', 0.3)
        competition_p = node_pressures.get('n34', 0.3)
        tipping_p = node_pressures.get('n36', 0.3)
        
        # 지형 난이도 (압력 높을수록 험난)
        terrain_difficulty = (
            volatility_p * 0.2 +
            regulation_p * 0.3 +  # 규제가 가장 큰 장벽
            geopolitical_p * 0.2 +
            competition_p * 0.15 +
            tipping_p * 0.15
        )
        
        # 목표 난이도
        goal_difficulty = min(1, (goal.target_value / max(goal.current_value, 1)) / 50)
        
        # 통과 가능 여부
        passable_threshold = 0.7 - goal.risk_tolerance * 0.2
        
        is_violated = terrain_difficulty > passable_threshold
        violation_severity = max(0, terrain_difficulty - passable_threshold)
        
        alternative = None
        if is_violated:
            if regulation_p > 0.6:
                alternative = '규제 우회: 다른 시장/지역으로 경로 재설계'
            elif volatility_p > 0.6:
                alternative = '변동성 대기: 시장 안정화 후 진입 (예상 6개월)'
            else:
                alternative = '단계적 접근: 소규모 테스트 후 확장'
        
        return ScienceConstraint(
            category='EARTH_SCI',
            constraint_name='지형 통과 법칙',
            description=f'지형 난이도 {terrain_difficulty*100:.0f}% vs 통과 임계 {passable_threshold*100:.0f}%',
            current_value=1 - terrain_difficulty,  # 통과 가능성
            required_value=passable_threshold,
            is_violated=is_violated,
            violation_severity=violation_severity,
            alternative=alternative,
        )


class ChemistryValidator:
    """
    CHEMISTRY: 반응 속도와 촉매
    
    "현재의 자산 증식 반응은 촉매(ERT)를 사용하더라도 최소 36개월의
     숙성 시간이 필요합니다. 억지로 온도를 높이면 시스템이 폭발합니다."
    """
    
    # 목표 유형별 최소 반응 시간 (개월)
    MIN_REACTION_TIME: Dict[GoalCategory, int] = {
        'WEALTH': 24,       # 재산 증식: 최소 2년
        'HEALTH': 6,        # 건강 개선: 최소 6개월
        'CAREER': 12,       # 커리어 전환: 최소 1년
        'RELATIONSHIP': 3,  # 관계 구축: 최소 3개월
        'FREEDOM': 18,      # 자유 확보: 최소 1.5년
    }
    
    @staticmethod
    def validate(goal: Goal, node_pressures: Dict[str, float]) -> ScienceConstraint:
        # 현재 반응 속도 체크
        task_completion_p = node_pressures.get('n19', 0.5)
        error_rate_p = node_pressures.get('n20', 0.5)
        tech_debt_p = node_pressures.get('n21', 0.5)
        deadline_p = node_pressures.get('n16', 0.5)
        
        # 촉매 효율 (압력 낮을수록 빠름)
        catalyst_efficiency = ((1 - task_completion_p) * 0.3 +
                              (1 - error_rate_p) * 0.3 +
                              (1 - tech_debt_p) * 0.2 +
                              (1 - deadline_p) * 0.2)
        
        # 최소 반응 시간
        min_time = ChemistryValidator.MIN_REACTION_TIME.get(goal.category, 12)
        
        # 촉매 적용 시 가속 (최대 50% 단축)
        accelerated_time = min_time * (1 - catalyst_efficiency * 0.5)
        
        # 목표 크기에 따른 추가 시간
        scale_factor = math.log10(max(1, goal.target_value / max(goal.current_value, 1)))
        adjusted_time = accelerated_time * (1 + scale_factor * 0.3)
        
        # 사용자 희망 기간과 비교
        is_violated = goal.desired_months < adjusted_time
        violation_severity = max(0, (adjusted_time - goal.desired_months) / adjusted_time)
        
        alternative = None
        if is_violated:
            recommended_months = int(adjusted_time * 1.2)
            alternative = f'숙성 시간 필요: 최소 {int(adjusted_time)}개월 (권장 {recommended_months}개월)'
        
        return ScienceConstraint(
            category='CHEMISTRY',
            constraint_name='반응 속도 법칙',
            description=f'최소 반응 시간 {adjusted_time:.0f}개월 vs 희망 기간 {goal.desired_months}개월',
            current_value=goal.desired_months,
            required_value=adjusted_time,
            is_violated=is_violated,
            violation_severity=violation_severity,
            alternative=alternative,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Reality Spec Engine (실현 가능성 리포트)
# ═══════════════════════════════════════════════════════════════════════════════

class RealitySpecEngine:
    """
    목표를 입력하면 35개 노드와 대조하여
    실현 가능성(Feasibility) 리포트를 발행
    """
    
    def __init__(self, node_pressures: Dict[str, float]):
        self.node_pressures = node_pressures
        self.physics = PhysicsValidator()
        self.biology = BiologyValidator()
        self.earth_sci = EarthScienceValidator()
        self.chemistry = ChemistryValidator()
    
    def analyze(self, goal: Goal) -> FeasibilityReport:
        """목표 실현 가능성 분석"""
        warnings: List[str] = []
        alternatives: List[str] = []
        
        # 4대 과학 검증
        physics_check = self.physics.validate(goal, self.node_pressures)
        biology_check = self.biology.validate(goal, self.node_pressures)
        earth_sci_check = self.earth_sci.validate(goal, self.node_pressures)
        chemistry_check = self.chemistry.validate(goal, self.node_pressures)
        
        # 위반 수집
        violations: List[Tuple[str, float]] = []
        if physics_check.is_violated:
            violations.append(('PHYSICS', physics_check.violation_severity))
            warnings.append(f'⚡ 에너지 부족: {physics_check.description}')
            if physics_check.alternative:
                alternatives.append(physics_check.alternative)
        
        if biology_check.is_violated:
            violations.append(('BIOLOGY', biology_check.violation_severity))
            warnings.append(f'🫀 신체 한계: {biology_check.description}')
            if biology_check.alternative:
                alternatives.append(biology_check.alternative)
        
        if earth_sci_check.is_violated:
            violations.append(('EARTH_SCI', earth_sci_check.violation_severity))
            warnings.append(f'🌍 환경 장벽: {earth_sci_check.description}')
            if earth_sci_check.alternative:
                alternatives.append(earth_sci_check.alternative)
        
        if chemistry_check.is_violated:
            violations.append(('CHEMISTRY', chemistry_check.violation_severity))
            warnings.append(f'⏳ 시간 부족: {chemistry_check.description}')
            if chemistry_check.alternative:
                alternatives.append(chemistry_check.alternative)
        
        # 실현 가능성 등급 결정
        total_severity = sum(v[1] for v in violations)
        violation_count = len(violations)
        
        level: FeasibilityLevel
        if violation_count == 0:
            level = 'ACHIEVABLE'
            success_probability = 0.85 + goal.pain_tolerance * 0.1
        elif violation_count == 1 and total_severity < 0.3:
            level = 'CHALLENGING'
            success_probability = 0.6 + goal.pain_tolerance * 0.15
        elif violation_count <= 2 and total_severity < 0.6:
            level = 'EXTREME'
            success_probability = 0.3 + goal.pain_tolerance * 0.2
        else:
            level = 'PHYSICAL_ERROR'
            success_probability = max(0.05, 0.2 - total_severity * 0.3)
        
        # 예상 기간 계산
        base_months = chemistry_check.required_value
        if physics_check.is_violated:
            base_months *= 1.3
        if biology_check.is_violated:
            base_months *= 1.2
        if earth_sci_check.is_violated:
            base_months *= 1.4
        
        estimated_duration = int(base_months)
        
        # 필요 고통 수준
        required_pain = min(1, total_severity * 1.5 + 0.3)
        
        # 체크포인트 생성
        checkpoints = self._generate_checkpoints(goal, estimated_duration, required_pain)
        
        # 메시지 생성
        message = self._generate_message(level, goal, violations, success_probability, estimated_duration)
        
        return FeasibilityReport(
            goal=goal,
            level=level,
            success_probability=success_probability,
            physics_check=physics_check,
            biology_check=biology_check,
            earth_sci_check=earth_sci_check,
            chemistry_check=chemistry_check,
            warnings=warnings,
            alternatives=alternatives,
            checkpoints=checkpoints,
            estimated_duration_months=estimated_duration,
            required_pain_level=required_pain,
            message=message,
        )
    
    def _generate_checkpoints(
        self,
        goal: Goal,
        total_months: int,
        pain_level: float
    ) -> List[Checkpoint]:
        """중간 체크포인트 생성"""
        checkpoints: List[Checkpoint] = []
        
        # 진행률 분배 (초기 느림, 후반 가속)
        progress_curve = [0.1, 0.25, 0.45, 0.7, 1.0]
        
        gap = goal.target_value - goal.current_value
        
        for i, progress in enumerate(progress_curve):
            months_at = int(total_months * (i + 1) / len(progress_curve))
            target_at = goal.current_value + gap * progress
            
            # 고통 수준 (중반이 가장 힘듦)
            if i == 2:
                pain_at = pain_level
            elif i in [1, 3]:
                pain_at = pain_level * 0.8
            else:
                pain_at = pain_level * 0.6
            
            checkpoint = Checkpoint(
                id=f'cp_{i+1}',
                title=f'체크포인트 {i+1}: {progress*100:.0f}% 달성',
                target_value=target_at,
                current_value=goal.current_value if i == 0 else 0,
                target_date=datetime.now() + timedelta(days=months_at * 30),
                estimated_pain=pain_at,
                prerequisites=[f'cp_{i}'] if i > 0 else [],
            )
            checkpoints.append(checkpoint)
        
        return checkpoints
    
    def _generate_message(
        self,
        level: FeasibilityLevel,
        goal: Goal,
        violations: List[Tuple[str, float]],
        probability: float,
        months: int
    ) -> str:
        """상황별 메시지 생성"""
        
        if level == 'PHYSICAL_ERROR':
            violation_names = [v[0] for v in violations]
            return (
                f"🚫 물리적 오류(PHYSICAL ERROR): '{goal.title}' 경로 생성 거부\n"
                f"위반 법칙: {', '.join(violation_names)}\n"
                f"이 목표는 일본에서 한국으로 자동차를 타고 가는 것과 같습니다.\n"
                f"목표를 수정하거나 대안 경로를 선택하십시오."
            )
        
        elif level == 'EXTREME':
            return (
                f"⚠️ 극한 경로(EXTREME): '{goal.title}'\n"
                f"성공 확률: {probability*100:.0f}% | 예상 기간: {months}개월\n"
                f"88% 확률로 좌초 위험. 고통 강도 20% 증가 또는 도착 예정 시간 2년 연장을 권장합니다."
            )
        
        elif level == 'CHALLENGING':
            return (
                f"🟡 도전적 경로(CHALLENGING): '{goal.title}'\n"
                f"성공 확률: {probability*100:.0f}% | 예상 기간: {months}개월\n"
                f"견딜 수 있는 고통으로 변환 가능. 체크포인트 준수 시 달성 가능합니다."
            )
        
        else:  # ACHIEVABLE
            return (
                f"✅ 실현 가능(ACHIEVABLE): '{goal.title}'\n"
                f"성공 확률: {probability*100:.0f}% | 예상 기간: {months}개월\n"
                f"현재 노드 상태로 달성 가능합니다. 경로 생성을 시작합니다."
            )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Emergency Brake Engine (비상 작동)
# ═══════════════════════════════════════════════════════════════════════════════

class EmergencyBrake:
    """
    외부 환경(n31-n36) 급변 시
    목표를 강제 수정하여 생존을 우선시
    """
    
    # 비상 임계값
    EMERGENCY_THRESHOLDS: Dict[str, float] = {
        'n31': 0.85,  # 변동성
        'n32': 0.90,  # 규제
        'n33': 0.88,  # 지정학
        'n34': 0.82,  # 경쟁
        'n35': 0.95,  # 기후
        'n36': 0.80,  # 티핑포인트
    }
    
    NODE_NAMES: Dict[str, str] = {
        'n31': '시장 변동성',
        'n32': '규제 환경',
        'n33': '지정학적 리스크',
        'n34': '경쟁 강도',
        'n35': '기후/환경',
        'n36': '티핑포인트',
    }
    
    @staticmethod
    def check(node_pressures: Dict[str, float]) -> Tuple[bool, Optional[str], Optional[str]]:
        """비상 상황 체크"""
        for node_id, threshold in EmergencyBrake.EMERGENCY_THRESHOLDS.items():
            pressure = node_pressures.get(node_id, 0)
            if pressure >= threshold:
                node_name = EmergencyBrake.NODE_NAMES.get(node_id, node_id)
                return True, node_name, f'{pressure*100:.0f}%'
        
        return False, None, None
    
    @staticmethod
    def apply_brake(goal: Goal, trigger_node: str, trigger_value: str) -> Dict:
        """비상 제동 적용"""
        return {
            'action': 'EMERGENCY_BRAKE',
            'trigger': f'{trigger_node} @ {trigger_value}',
            'original_goal': goal.title,
            'modifications': [
                f'목표 금액 50% 하향: {goal.target_value * 0.5:,.0f}{goal.unit}',
                f'기간 2배 연장: {goal.desired_months * 2}개월',
                '위험 자산 즉시 청산',
                '현금 비중 50% 이상 확보',
            ],
            'message': (
                f'🚨 비상 제동 발동: {trigger_node} 임계 초과\n'
                f'생존 우선 모드로 전환됩니다. 목표가 강제 수정되었습니다.'
            ),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 통합 출력 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_reality_report(report: FeasibilityReport) -> str:
    """실현 가능성 리포트 출력"""
    
    level_emoji = {
        'ACHIEVABLE': '✅',
        'CHALLENGING': '🟡',
        'EXTREME': '🟠',
        'PHYSICAL_ERROR': '🚫',
    }
    
    def science_status(c: ScienceConstraint) -> str:
        if not c.is_violated:
            return '✅ PASS'
        return f'❌ FAIL ({c.violation_severity*100:.0f}%)'
    
    output = f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🧭 AUTUS REALITY CHECK - 실현 가능성 리포트                                   ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ 목표: {report.goal.title[:50]:<50}
║ 현재 → 목표: {report.goal.current_value:,.0f} → {report.goal.target_value:,.0f} {report.goal.unit}
║ 희망 기간: {report.goal.desired_months}개월                                                       ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 판정: {level_emoji.get(report.level, '?')} {report.level:<20} 성공 확률: {report.success_probability*100:.0f}%             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 4대 과학 검증                                                                 ║
╠───────────────────────────────────────────────────────────────────────────────╣
║ ⚡ PHYSICS   (에너지/자원) : {science_status(report.physics_check):<30}                    ║
║ 🫀 BIOLOGY   (신체/하드웨어): {science_status(report.biology_check):<30}                    ║
║ 🌍 EARTH_SCI (환경/지형)  : {science_status(report.earth_sci_check):<30}                    ║
║ ⏳ CHEMISTRY (반응/시간)  : {science_status(report.chemistry_check):<30}                    ║
╠═══════════════════════════════════════════════════════════════════════════════╣"""
    
    if report.warnings:
        output += """
║ ⚠️ 경고                                                                       ║
╠───────────────────────────────────────────────────────────────────────────────╣"""
        for w in report.warnings[:4]:
            output += f"\n║   • {w[:65]:<65} ║"
    
    if report.alternatives:
        output += """
╠───────────────────────────────────────────────────────────────────────────────╣
║ 💡 대안                                                                       ║
╠───────────────────────────────────────────────────────────────────────────────╣"""
        for a in report.alternatives[:3]:
            output += f"\n║   • {a[:65]:<65} ║"
    
    output += f"""
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 📍 체크포인트 (Intermediate Stations)                                          ║
╠───────────────────────────────────────────────────────────────────────────────╣"""
    
    for cp in report.checkpoints[:5]:
        pain_bar = '█' * int(cp.estimated_pain * 10) + '░' * (10 - int(cp.estimated_pain * 10))
        days_from_now = (cp.target_date - datetime.now()).days
        output += f"\n║   [{cp.id}] {cp.title[:30]:<30} D+{days_from_now:>3}일 고통[{pain_bar}] ║"
    
    recommendation = '목표 수정 필요' if report.level == 'PHYSICAL_ERROR' else '경로 생성 진행'
    
    output += f"""
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 📊 최종 분석                                                                  ║
║                                                                               ║
║   예상 달성 기간: {report.estimated_duration_months}개월                                               ║
║   필요 고통 수준: {report.required_pain_level*100:.0f}%                                                  ║
║   권장 행동: {recommendation}                                             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ {report.message[:75]:<75}
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
    
    return output


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 통합 Reality Check 클래스
# ═══════════════════════════════════════════════════════════════════════════════

class RealityCheck:
    """Reality Check 통합 인터페이스"""
    
    def __init__(self, node_pressures: Dict[str, float]):
        self.node_pressures = node_pressures
        self.engine = RealitySpecEngine(node_pressures)
        self.brake = EmergencyBrake()
    
    def update_pressures(self, node_pressures: Dict[str, float]):
        """노드 압력 업데이트"""
        self.node_pressures.update(node_pressures)
        self.engine = RealitySpecEngine(self.node_pressures)
    
    def check_goal(self, goal: Goal) -> FeasibilityReport:
        """목표 검증"""
        return self.engine.analyze(goal)
    
    def check_emergency(self) -> Tuple[bool, Optional[str], Optional[str]]:
        """비상 상황 체크"""
        return self.brake.check(self.node_pressures)
    
    def apply_emergency_brake(
        self,
        goal: Goal,
        trigger_node: str,
        trigger_value: str
    ) -> Dict:
        """비상 제동 적용"""
        return self.brake.apply_brake(goal, trigger_node, trigger_value)
    
    def generate_report(self, goal: Goal) -> str:
        """리포트 생성"""
        report = self.check_goal(goal)
        return generate_reality_report(report)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 데모 실행
# ═══════════════════════════════════════════════════════════════════════════════

def run_reality_check_demo():
    """Reality Check 데모"""
    print('=' * 80)
    print('🧭 AUTUS Reality Check Engine Demo')
    print('=' * 80)
    
    # 현재 노드 상태 (시뮬레이션)
    node_pressures = {
        # PHYSICS
        'n01': 0.65,  # 현금 위기
        'n03': 0.70,  # 런웨이 부족
        'n05': 0.55,  # 부채 보통
        'n07': 0.40,  # 수익 양호
        'n08': 0.60,  # 비용 높음
        
        # BIOLOGY
        'n09': 0.50,  # 수면 부족
        'n10': 0.55,  # HRV 저하
        'n11': 0.60,  # 피로 높음
        'n15': 0.65,  # 스트레스 높음
        
        # CHEMISTRY
        'n16': 0.45,  # 마감 압박
        'n19': 0.40,  # 태스크 완료율 양호
        'n20': 0.35,  # 오류율 보통
        'n21': 0.50,  # 기술부채 보통
        
        # EARTH_SCI
        'n31': 0.55,  # 변동성 보통
        'n32': 0.70,  # 규제 높음
        'n33': 0.45,  # 지정학 보통
        'n34': 0.60,  # 경쟁 높음
        'n36': 0.40,  # 티핑 낮음
    }
    
    reality_check = RealityCheck(node_pressures)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 테스트 케이스 1: 물리적 오류 (1000억 1년)
    # ═══════════════════════════════════════════════════════════════════════════
    print('\n' + '─' * 80)
    print('📌 테스트 1: 물리적 오류 케이스')
    print('─' * 80)
    
    impossible_goal = Goal(
        id='g1',
        title='내년까지 1000억 자산 달성',
        category='WEALTH',
        target_value=100_000_000_000,  # 1000억
        current_value=1_000_000_000,   # 10억
        unit='원',
        desired_months=12,
        risk_tolerance=0.8,
        pain_tolerance=0.9,
    )
    
    print(reality_check.generate_report(impossible_goal))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 테스트 케이스 2: 도전적 (10배 성장 3년)
    # ═══════════════════════════════════════════════════════════════════════════
    print('\n' + '─' * 80)
    print('📌 테스트 2: 도전적 케이스')
    print('─' * 80)
    
    challenging_goal = Goal(
        id='g2',
        title='3년 내 자산 10배 성장',
        category='WEALTH',
        target_value=10_000_000_000,  # 100억
        current_value=1_000_000_000,  # 10억
        unit='원',
        desired_months=36,
        risk_tolerance=0.6,
        pain_tolerance=0.7,
    )
    
    print(reality_check.generate_report(challenging_goal))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 테스트 케이스 3: 실현 가능 (2배 성장 2년)
    # ═══════════════════════════════════════════════════════════════════════════
    print('\n' + '─' * 80)
    print('📌 테스트 3: 실현 가능 케이스')
    print('─' * 80)
    
    achievable_goal = Goal(
        id='g3',
        title='2년 내 자산 2배 성장',
        category='WEALTH',
        target_value=2_000_000_000,  # 20억
        current_value=1_000_000_000, # 10억
        unit='원',
        desired_months=24,
        risk_tolerance=0.4,
        pain_tolerance=0.5,
    )
    
    print(reality_check.generate_report(achievable_goal))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 비상 제동 테스트
    # ═══════════════════════════════════════════════════════════════════════════
    print('\n' + '─' * 80)
    print('📌 비상 제동 테스트')
    print('─' * 80)
    
    # 위기 상황 시뮬레이션
    crisis_pressures = {**node_pressures, 'n36': 0.85}  # 티핑포인트 위기
    reality_check.update_pressures(crisis_pressures)
    
    is_emergency, trigger_node, trigger_value = reality_check.check_emergency()
    if is_emergency and trigger_node and trigger_value:
        brake_result = reality_check.apply_emergency_brake(
            challenging_goal, trigger_node, trigger_value
        )
        print(f"\n{brake_result['message']}")
        print('\n수정 사항:')
        for mod in brake_result['modifications']:
            print(f'  • {mod}')
    
    print('\n' + '=' * 80)
    print('✅ Reality Check Demo 완료')
    print('=' * 80)


if __name__ == '__main__':
    run_reality_check_demo()
