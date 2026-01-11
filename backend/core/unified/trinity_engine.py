"""
═══════════════════════════════════════════════════════════════════════════════
🎯 AUTUS v3.0 - Trinity Engine (목표 달성 가속기)
═══════════════════════════════════════════════════════════════════════════════

AUTUS는 단순히 일을 돕는 도구가 아니라,
인간의 **의지(Will)**를 현실의 **결과(Result)**로 치환하는
**'목표 달성 가속기'**입니다.

3대 핵심 기능:
1. CRYSTALLIZATION (결정질화) - Goal Mapper
   → 추상적 욕망을 물리학적/화학적 상수로 변환
   → "부자가 되고 싶다" → n01=$X, n03=∞, Ea=36개월

2. OPTIMIZED ENVIRONMENT (최적 환경) - Frictionless Engine
   → ERT로 90% 유령화 + 마찰 0 환경
   → 인지 에너지 산란 방지

3. NAVIGATION & CERTAINTY (불확실성 제거) - Progress Radar
   → 현재 위치 % + 남은 고통 시간
   → "끝을 아는 고통은 견딜 수 있다"

"무슨 존재가 될지는 당신이 정한다.
 그 존재를 유지하는 일은 우리가 한다."
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional, Tuple, Any
from datetime import datetime, timedelta
import math


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 타입 정의
# ═══════════════════════════════════════════════════════════════════════════════

DesireCategory = Literal[
    'WEALTH',      # 부자가 되고 싶다
    'HEALTH',      # 건강하게 살고 싶다
    'FREEDOM',     # 자유롭게 살고 싶다
    'INFLUENCE',   # 영향력을 갖고 싶다
    'MASTERY',     # 전문가가 되고 싶다
    'PEACE',       # 평화롭게 살고 싶다
    'LEGACY',      # 무언가를 남기고 싶다
]

PainType = Literal[
    'FINANCIAL',   # 재무적 절제 (소비 억제, 투자)
    'PHYSICAL',    # 신체적 노력 (운동, 수면 관리)
    'COGNITIVE',   # 인지적 집중 (학습, 업무 집중)
    'EMOTIONAL',   # 감정적 인내 (관계 정리, 고독)
    'TEMPORAL',    # 시간적 희생 (여가 포기, 대기)
]

DESIRE_DESCRIPTIONS: Dict[DesireCategory, str] = {
    'WEALTH': '부자가 되고 싶다',
    'HEALTH': '건강하게 살고 싶다',
    'FREEDOM': '자유롭게 살고 싶다',
    'INFLUENCE': '영향력을 갖고 싶다',
    'MASTERY': '전문가가 되고 싶다',
    'PEACE': '평화롭게 살고 싶다',
    'LEGACY': '무언가를 남기고 싶다',
}

PAIN_DESCRIPTIONS: Dict[PainType, str] = {
    'FINANCIAL': '재무적 절제',
    'PHYSICAL': '신체적 노력',
    'COGNITIVE': '인지적 집중',
    'EMOTIONAL': '감정적 인내',
    'TEMPORAL': '시간적 희생',
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 데이터 클래스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class CrystallizedGoal:
    """결정질화된 목표 (추상 → 구체)"""
    # 원본
    raw_desire: str
    category: DesireCategory
    
    # 노드 목표값
    target_nodes: Dict[str, float]  # {node_id: target_value}
    
    # 활성화 에너지 (Ea)
    activation_energy: float        # 0~1 (필요 에너지 총량)
    required_months: int            # 필요 기간
    required_focus_hours: int       # 필요 집중 시간
    
    # 고통 지수
    pain_breakdown: Dict[PainType, float]  # 고통 종류별 비율
    total_pain_index: float         # 총 고통 지수 (0~1)
    
    # 엔트로피 비용
    entropy_cost: float             # 지불해야 할 무질서 (시간, 노력, 절제)
    
    # 실현 가능성
    feasibility: float              # 0~1
    physical_constraints: List[str]  # 물리적 제약 목록


@dataclass
class EnvironmentState:
    """최적화된 환경 상태"""
    # ERT 결과
    eliminated_count: int
    automated_count: int
    parallelized_count: int
    preserved_count: int
    
    # 에너지 효율
    energy_efficiency: float        # 0~1 (높을수록 좋음)
    cognitive_leakage: float        # 0~1 (인지 에너지 산란, 낮을수록 좋음)
    
    # 마찰 계수
    friction_coefficient: float     # 0~1 (낮을수록 좋음)
    external_noise_filtered: float  # 차단된 외부 노이즈 비율
    
    # 환경 점수
    environment_score: float        # 0~100


@dataclass
class ProgressState:
    """진행 상태 (네비게이션)"""
    # 위치
    current_progress: float         # 0~1 (현재 진행률)
    current_checkpoint: int         # 현재 체크포인트 번호
    total_checkpoints: int          # 총 체크포인트 수
    
    # 남은 고통
    remaining_pain_days: int        # 남은 고통 일수
    remaining_pain_hours: int       # 남은 집중 시간
    pain_end_date: datetime         # 고통 종료 예상일
    
    # 불확실성
    uncertainty_index: float        # 0~1 (낮을수록 좋음)
    confidence_level: float         # 0~1 (높을수록 좋음)
    
    # 예측
    estimated_completion: datetime  # 예상 완료일
    on_track: bool                  # 정상 진행 여부
    deviation_days: int             # 이탈 일수 (양수: 지연, 음수: 앞섬)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 1. CRYSTALLIZATION ENGINE (목표 결정질화)
# ═══════════════════════════════════════════════════════════════════════════════

class GoalMapper:
    """
    추상적 욕망 → 물리학적/화학적 상수로 변환
    "조립 가능한 설계도" 생성
    """
    
    # 욕망 → 노드 매핑
    DESIRE_NODE_MAP: Dict[DesireCategory, Dict[str, float]] = {
        'WEALTH': {
            'n01': 0.1,   # 현금 압력 10% 이하 (충분한 현금)
            'n03': 0.05,  # 런웨이 압력 5% 이하 (사실상 무한대)
            'n05': 0.1,   # 부채 압력 10% 이하
            'n07': 0.2,   # 수익 압력 20% 이하 (안정적 수익)
        },
        'HEALTH': {
            'n09': 0.1,   # 수면 압력 10% 이하
            'n10': 0.15,  # HRV 압력 15% 이하
            'n11': 0.1,   # 피로 압력 10% 이하
            'n14': 0.15,  # BMI 압력 15% 이하
            'n15': 0.1,   # 스트레스 압력 10% 이하
        },
        'FREEDOM': {
            'n01': 0.05,  # 현금 충분
            'n03': 0.02,  # 런웨이 무한대
            'n16': 0.1,   # 마감 압력 낮음
            'n15': 0.05,  # 스트레스 최소
        },
        'INFLUENCE': {
            'n24': 0.1,   # 리텐션 높음
            'n26': 0.1,   # NPS 높음
            'n27': 0.15,  # 입소문 활성
            'n28': 0.2,   # 파트너십 강함
        },
        'MASTERY': {
            'n19': 0.1,   # 태스크 완료율 높음
            'n20': 0.05,  # 오류율 낮음
            'n21': 0.1,   # 기술부채 낮음
        },
        'PEACE': {
            'n15': 0.05,  # 스트레스 최소
            'n09': 0.1,   # 수면 충분
            'n31': 0.2,   # 변동성 낮음
            'n36': 0.1,   # 티핑포인트 안전
        },
        'LEGACY': {
            'n26': 0.1,   # NPS 높음
            'n27': 0.1,   # 입소문 활성
            'n03': 0.1,   # 런웨이 충분
        },
    }
    
    # 욕망 → 고통 분포
    DESIRE_PAIN_MAP: Dict[DesireCategory, Dict[PainType, float]] = {
        'WEALTH': {
            'FINANCIAL': 0.35,
            'COGNITIVE': 0.30,
            'TEMPORAL': 0.25,
            'EMOTIONAL': 0.10,
            'PHYSICAL': 0.0,
        },
        'HEALTH': {
            'PHYSICAL': 0.40,
            'TEMPORAL': 0.25,
            'EMOTIONAL': 0.20,
            'COGNITIVE': 0.15,
            'FINANCIAL': 0.0,
        },
        'FREEDOM': {
            'FINANCIAL': 0.30,
            'TEMPORAL': 0.30,
            'COGNITIVE': 0.25,
            'EMOTIONAL': 0.15,
            'PHYSICAL': 0.0,
        },
        'INFLUENCE': {
            'COGNITIVE': 0.35,
            'EMOTIONAL': 0.30,
            'TEMPORAL': 0.25,
            'PHYSICAL': 0.10,
            'FINANCIAL': 0.0,
        },
        'MASTERY': {
            'COGNITIVE': 0.45,
            'TEMPORAL': 0.30,
            'PHYSICAL': 0.15,
            'EMOTIONAL': 0.10,
            'FINANCIAL': 0.0,
        },
        'PEACE': {
            'EMOTIONAL': 0.35,
            'COGNITIVE': 0.25,
            'FINANCIAL': 0.25,
            'TEMPORAL': 0.15,
            'PHYSICAL': 0.0,
        },
        'LEGACY': {
            'COGNITIVE': 0.35,
            'TEMPORAL': 0.30,
            'EMOTIONAL': 0.20,
            'FINANCIAL': 0.15,
            'PHYSICAL': 0.0,
        },
    }
    
    # 기본 활성화 에너지 (개월)
    BASE_ACTIVATION_ENERGY: Dict[DesireCategory, int] = {
        'WEALTH': 36,
        'HEALTH': 12,
        'FREEDOM': 48,
        'INFLUENCE': 24,
        'MASTERY': 36,
        'PEACE': 18,
        'LEGACY': 60,
    }
    
    def __init__(self, current_node_pressures: Dict[str, float]):
        self.current_pressures = current_node_pressures
    
    def parse_desire(self, raw_input: str) -> DesireCategory:
        """자연어 욕망 → 카테고리 분류"""
        keywords: Dict[DesireCategory, List[str]] = {
            'WEALTH': ['부자', '돈', '재산', '자산', '수익', '매출', '부'],
            'HEALTH': ['건강', '몸', '운동', '체력', '수면', '병'],
            'FREEDOM': ['자유', '시간', '퇴사', '은퇴', '독립'],
            'INFLUENCE': ['영향력', '팔로워', '명성', '유명', '리더'],
            'MASTERY': ['전문가', '실력', '기술', '능력', '성장'],
            'PEACE': ['평화', '행복', '안정', '평온', '여유'],
            'LEGACY': ['유산', '남기', '기여', '의미', '사명'],
        }
        
        raw_lower = raw_input.lower()
        for category, words in keywords.items():
            if any(word in raw_lower for word in words):
                return category
        
        return 'WEALTH'  # 기본값
    
    def calculate_gap(self, target_nodes: Dict[str, float]) -> float:
        """현재 상태와 목표 상태의 갭 계산"""
        total_gap = 0.0
        for node_id, target_pressure in target_nodes.items():
            current = self.current_pressures.get(node_id, 0.5)
            # 목표는 낮은 압력, 현재가 높으면 갭 큼
            gap = max(0, current - target_pressure)
            total_gap += gap
        
        return total_gap / len(target_nodes) if target_nodes else 0
    
    def calculate_activation_energy(
        self,
        category: DesireCategory,
        gap: float,
        scale: float = 1.0
    ) -> Tuple[float, int, int]:
        """
        활성화 에너지 계산 (Ea)
        
        Returns: (energy_ratio, required_months, required_hours)
        """
        base_months = self.BASE_ACTIVATION_ENERGY[category]
        
        # 갭에 따른 조정 (갭 클수록 오래 걸림)
        gap_multiplier = 1 + gap * 2
        
        # 스케일에 따른 조정 (목표가 클수록 오래 걸림)
        scale_multiplier = 1 + math.log10(max(1, scale))
        
        required_months = int(base_months * gap_multiplier * scale_multiplier)
        required_hours = required_months * 40  # 월 40시간 집중
        
        # 에너지 비율 (0~1)
        energy_ratio = min(1, gap * 0.5 + 0.3)
        
        return energy_ratio, required_months, required_hours
    
    def crystallize(
        self,
        raw_desire: str,
        scale: float = 1.0,
        custom_targets: Optional[Dict[str, float]] = None
    ) -> CrystallizedGoal:
        """
        추상적 욕망 → 결정질화된 목표
        
        Args:
            raw_desire: "부자가 되고 싶다" 같은 자연어
            scale: 목표 크기 배율 (1.0 = 기본, 10.0 = 10배 목표)
            custom_targets: 사용자 정의 노드 목표값
        """
        # 1. 욕망 파싱
        category = self.parse_desire(raw_desire)
        
        # 2. 노드 목표값 결정
        if custom_targets:
            target_nodes = custom_targets
        else:
            target_nodes = self.DESIRE_NODE_MAP.get(category, {}).copy()
            # 스케일 적용 (목표가 클수록 더 낮은 압력 목표)
            if scale > 1:
                target_nodes = {k: max(0.01, v / scale) for k, v in target_nodes.items()}
        
        # 3. 갭 계산
        gap = self.calculate_gap(target_nodes)
        
        # 4. 활성화 에너지 계산
        energy_ratio, months, hours = self.calculate_activation_energy(category, gap, scale)
        
        # 5. 고통 분포 계산
        pain_map = self.DESIRE_PAIN_MAP.get(category, {}).copy()
        # 갭에 따라 고통 강도 조정
        adjusted_pain: Dict[PainType, float] = {k: v * (1 + gap) for k, v in pain_map.items()}
        total_pain = sum(adjusted_pain.values()) / len(adjusted_pain) if adjusted_pain else 0.5
        
        # 6. 엔트로피 비용 계산
        entropy_cost = gap * 0.3 + energy_ratio * 0.4 + total_pain * 0.3
        
        # 7. 실현 가능성 계산
        feasibility = max(0.05, 1 - gap * 0.5 - entropy_cost * 0.3)
        
        # 8. 물리적 제약 목록
        constraints: List[str] = []
        if gap > 0.5:
            constraints.append(f'큰 갭 ({gap*100:.0f}%): 중간 기착지 필요')
        if months > 36:
            constraints.append(f'장기 목표 ({months}개월): 인내심 필수')
        if total_pain > 0.7:
            constraints.append(f'높은 고통 지수 ({total_pain*100:.0f}%): 회복 기간 필요')
        
        # 현재 노드 상태 기반 제약
        for node_id, target in target_nodes.items():
            current = self.current_pressures.get(node_id, 0.5)
            if current > 0.7:
                constraints.append(f'{node_id} 위기 상태 ({current*100:.0f}%): 먼저 안정화 필요')
        
        return CrystallizedGoal(
            raw_desire=raw_desire,
            category=category,
            target_nodes=target_nodes,
            activation_energy=energy_ratio,
            required_months=months,
            required_focus_hours=hours,
            pain_breakdown=adjusted_pain,
            total_pain_index=total_pain,
            entropy_cost=entropy_cost,
            feasibility=feasibility,
            physical_constraints=constraints,
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 2. FRICTIONLESS ENGINE (최적 환경)
# ═══════════════════════════════════════════════════════════════════════════════

class FrictionlessEngine:
    """
    사용자가 오직 목표에만 에너지를 투입할 수 있도록
    물리적/생물학적 환경을 재구성
    
    - 에너지 극대화: ERT로 90% 유령화
    - 마찰 극소화: 외부 노이즈 차단
    - 인지 에너지 산란 방지
    """
    
    def __init__(self, goal: CrystallizedGoal):
        self.goal = goal
        self.environment: Optional[EnvironmentState] = None
    
    def calculate_ert_distribution(
        self,
        work_items: List[Dict]
    ) -> Tuple[int, int, int, int]:
        """
        업무 아이템 → ERT 분류
        
        Returns: (eliminated, automated, parallelized, preserved)
        """
        if not work_items:
            # 기본 분포 (90% 최적화)
            return (30, 40, 20, 10)  # E:30%, R:40%, T:20%, 보존:10%
        
        eliminated = 0
        automated = 0
        parallelized = 0
        preserved = 0
        
        for item in work_items:
            weight = item.get('weight', 0.5)
            entropy = item.get('entropy', 0.5)
            mass = item.get('mass', 1.0)
            
            # 목표 관련 노드에 영향을 주는지 확인
            affects_goal = any(
                node in self.goal.target_nodes
                for node in item.get('affected_nodes', [])
            )
            
            if weight <= 0.2 and not affects_goal:
                eliminated += 1
            elif entropy >= 0.5:
                automated += 1
            elif mass >= 2.0:
                parallelized += 1
            else:
                preserved += 1
        
        return (eliminated, automated, parallelized, preserved)
    
    def calculate_cognitive_leakage(
        self,
        distractions: Optional[List[str]] = None,
        interruptions_per_day: int = 10
    ) -> float:
        """
        인지 에너지 산란량 계산
        
        낮을수록 좋음 (0 = 완벽한 집중)
        """
        base_leakage = 0.3  # 기본 산란
        
        # 방해 요소당 5% 추가 산란
        if distractions:
            base_leakage += len(distractions) * 0.05
        
        # 인터럽션당 2% 추가 산란
        base_leakage += interruptions_per_day * 0.02
        
        return min(1, base_leakage)
    
    def calculate_friction(
        self,
        external_risks: Optional[Dict[str, float]] = None,
        emotional_drains: Optional[List[str]] = None
    ) -> float:
        """
        마찰 계수 계산
        
        낮을수록 좋음 (0 = 완벽한 무마찰)
        """
        base_friction = 0.2  # 기본 마찰
        
        # 외부 리스크 (n31-n36)
        if external_risks:
            external_avg = sum(external_risks.values()) / len(external_risks)
            base_friction += external_avg * 0.3
        
        # 감정 소모 관계
        if emotional_drains:
            base_friction += len(emotional_drains) * 0.05
        
        return min(1, base_friction)
    
    def optimize(
        self,
        work_items: Optional[List[Dict]] = None,
        distractions: Optional[List[str]] = None,
        interruptions_per_day: int = 10,
        external_risks: Optional[Dict[str, float]] = None,
        emotional_drains: Optional[List[str]] = None
    ) -> EnvironmentState:
        """환경 최적화 실행"""
        # ERT 분류
        e, r, t, p = self.calculate_ert_distribution(work_items or [])
        
        # 인지 에너지 산란
        leakage = self.calculate_cognitive_leakage(distractions, interruptions_per_day)
        
        # ERT 적용 후 산란 감소 (90% 최적화 시 산란 70% 감소)
        optimization_ratio = (e + r + t) / max(1, e + r + t + p)
        adjusted_leakage = leakage * (1 - optimization_ratio * 0.7)
        
        # 에너지 효율
        energy_efficiency = 1 - adjusted_leakage
        
        # 마찰 계수
        friction = self.calculate_friction(external_risks, emotional_drains)
        
        # ERT 적용 후 마찰 감소
        adjusted_friction = friction * (1 - optimization_ratio * 0.5)
        
        # 외부 노이즈 차단 비율
        noise_filtered = optimization_ratio * 0.9  # 90% 최적화 시 90% 차단
        
        # 환경 점수 (0~100)
        environment_score = (
            energy_efficiency * 40 +
            (1 - adjusted_friction) * 30 +
            noise_filtered * 30
        )
        
        self.environment = EnvironmentState(
            eliminated_count=e,
            automated_count=r,
            parallelized_count=t,
            preserved_count=p,
            energy_efficiency=energy_efficiency,
            cognitive_leakage=adjusted_leakage,
            friction_coefficient=adjusted_friction,
            external_noise_filtered=noise_filtered,
            environment_score=environment_score,
        )
        
        return self.environment


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 3. PROGRESS RADAR (불확실성 제거)
# ═══════════════════════════════════════════════════════════════════════════════

class ProgressRadar:
    """
    "끝을 아는 고통은 견딜 수 있다"
    
    - 현재 위치 정밀 측정
    - 남은 고통의 시간 표시
    - 불확실성 엔트로피 제로화
    """
    
    def __init__(self, goal: CrystallizedGoal, environment: EnvironmentState):
        self.goal = goal
        self.environment = environment
        self.start_date = datetime.now()
        self.current_state: Optional[ProgressState] = None
    
    def calculate_progress(self, current_node_pressures: Dict[str, float]) -> float:
        """현재 진행률 계산 (0~1)"""
        if not self.goal.target_nodes:
            return 0.5
        
        total_progress = 0.0
        for node_id, target_pressure in self.goal.target_nodes.items():
            current = current_node_pressures.get(node_id, 0.5)
            initial = 0.5  # 가정: 초기 압력 50%
            
            # 목표까지의 진행률
            if initial > target_pressure:
                # 압력을 낮춰야 하는 경우
                total_range = initial - target_pressure
                current_moved = initial - current
                progress = max(0, min(1, current_moved / total_range)) if total_range > 0 else 1
            else:
                # 이미 목표 도달
                progress = 1
            
            total_progress += progress
        
        return total_progress / len(self.goal.target_nodes)
    
    def calculate_remaining_pain(self, progress: float) -> Tuple[int, int]:
        """
        남은 고통 계산
        
        Returns: (remaining_days, remaining_hours)
        """
        remaining_ratio = 1 - progress
        
        # 환경 최적화 효과 적용
        efficiency_boost = self.environment.energy_efficiency if self.environment else 0.5
        adjusted_ratio = remaining_ratio * (1 - efficiency_boost * 0.3)
        
        remaining_days = int(self.goal.required_months * 30 * adjusted_ratio)
        remaining_hours = int(self.goal.required_focus_hours * adjusted_ratio)
        
        return remaining_days, remaining_hours
    
    def calculate_uncertainty(
        self,
        progress: float,
        external_volatility: float = 0.3
    ) -> Tuple[float, float]:
        """
        불확실성 지수 계산
        
        Returns: (uncertainty_index, confidence_level)
        """
        # 기본 불확실성 (진행률 높을수록 낮음)
        base_uncertainty = 0.5 * (1 - progress)
        
        # 외부 변동성 영향
        external_impact = external_volatility * 0.3
        
        # 환경 최적화 효과 (최적화될수록 불확실성 감소)
        if self.environment:
            optimization_effect = self.environment.environment_score / 100 * 0.2
        else:
            optimization_effect = 0
        
        uncertainty = max(0, base_uncertainty + external_impact - optimization_effect)
        confidence = 1 - uncertainty
        
        return uncertainty, confidence
    
    def get_checkpoint_status(self, progress: float) -> Tuple[int, int]:
        """
        체크포인트 상태
        
        Returns: (current_checkpoint, total_checkpoints)
        """
        total_checkpoints = 5  # 기본 5단계
        current = min(total_checkpoints, int(progress * total_checkpoints) + 1)
        return current, total_checkpoints
    
    def calculate_deviation(self, progress: float, elapsed_days: int) -> int:
        """
        계획 대비 이탈 일수 계산
        
        양수: 지연, 음수: 앞섬
        """
        total_days = self.goal.required_months * 30
        expected_progress = elapsed_days / total_days if total_days > 0 else 0
        
        progress_diff = expected_progress - progress
        deviation_days = int(progress_diff * total_days)
        
        return deviation_days
    
    def scan(
        self,
        current_node_pressures: Dict[str, float],
        external_volatility: float = 0.3,
        elapsed_days: int = 0
    ) -> ProgressState:
        """현재 상태 스캔 (레이더 실행)"""
        # 진행률
        progress = self.calculate_progress(current_node_pressures)
        
        # 남은 고통
        remaining_days, remaining_hours = self.calculate_remaining_pain(progress)
        pain_end_date = datetime.now() + timedelta(days=remaining_days)
        
        # 불확실성
        uncertainty, confidence = self.calculate_uncertainty(progress, external_volatility)
        
        # 체크포인트
        current_cp, total_cp = self.get_checkpoint_status(progress)
        
        # 이탈
        deviation = self.calculate_deviation(progress, elapsed_days)
        on_track = abs(deviation) <= 7  # 7일 이내면 정상
        
        # 예상 완료일
        estimated_completion = datetime.now() + timedelta(days=remaining_days + deviation)
        
        self.current_state = ProgressState(
            current_progress=progress,
            current_checkpoint=current_cp,
            total_checkpoints=total_cp,
            remaining_pain_days=remaining_days,
            remaining_pain_hours=remaining_hours,
            pain_end_date=pain_end_date,
            uncertainty_index=uncertainty,
            confidence_level=confidence,
            estimated_completion=estimated_completion,
            on_track=on_track,
            deviation_days=deviation,
        )
        
        return self.current_state


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 TRINITY ENGINE (통합)
# ═══════════════════════════════════════════════════════════════════════════════

class TrinityEngine:
    """
    AUTUS Trinity Engine
    
    3대 핵심 기능 통합:
    1. Crystallization (Goal Mapper)
    2. Optimized Environment (Frictionless Engine)
    3. Navigation & Certainty (Progress Radar)
    """
    
    def __init__(self, current_node_pressures: Dict[str, float]):
        self.node_pressures = current_node_pressures
        self.goal_mapper = GoalMapper(current_node_pressures)
        self.frictionless_engine: Optional[FrictionlessEngine] = None
        self.progress_radar: Optional[ProgressRadar] = None
        
        # 상태
        self.crystallized_goal: Optional[CrystallizedGoal] = None
        self.environment_state: Optional[EnvironmentState] = None
        self.progress_state: Optional[ProgressState] = None
    
    def process_desire(self, raw_desire: str, scale: float = 1.0) -> CrystallizedGoal:
        """1단계: 욕망 결정질화"""
        self.crystallized_goal = self.goal_mapper.crystallize(raw_desire, scale)
        return self.crystallized_goal
    
    def optimize_environment(
        self,
        work_items: Optional[List[Dict]] = None,
        distractions: Optional[List[str]] = None,
        external_risks: Optional[Dict[str, float]] = None
    ) -> EnvironmentState:
        """2단계: 환경 최적화"""
        if not self.crystallized_goal:
            raise ValueError('먼저 process_desire()를 호출하세요')
        
        self.frictionless_engine = FrictionlessEngine(self.crystallized_goal)
        self.environment_state = self.frictionless_engine.optimize(
            work_items=work_items,
            distractions=distractions,
            external_risks=external_risks,
        )
        return self.environment_state
    
    def scan_progress(
        self,
        elapsed_days: int = 0,
        external_volatility: float = 0.3
    ) -> ProgressState:
        """3단계: 진행 상태 스캔"""
        if not self.crystallized_goal or not self.environment_state:
            raise ValueError('먼저 process_desire()와 optimize_environment()를 호출하세요')
        
        self.progress_radar = ProgressRadar(self.crystallized_goal, self.environment_state)
        self.progress_state = self.progress_radar.scan(
            self.node_pressures,
            external_volatility,
            elapsed_days,
        )
        return self.progress_state
    
    def full_analysis(
        self,
        raw_desire: str,
        scale: float = 1.0,
        elapsed_days: int = 0
    ) -> Dict[str, Any]:
        """전체 분석 실행"""
        goal = self.process_desire(raw_desire, scale)
        env = self.optimize_environment()
        progress = self.scan_progress(elapsed_days)
        
        return {
            'goal': goal,
            'environment': env,
            'progress': progress,
        }
    
    def generate_dashboard(self) -> str:
        """통합 대시보드 생성"""
        if not all([self.crystallized_goal, self.environment_state, self.progress_state]):
            return '분석이 완료되지 않았습니다. full_analysis()를 먼저 실행하세요.'
        
        g = self.crystallized_goal
        e = self.environment_state
        p = self.progress_state
        
        # 진행률 바
        progress_bar_len = 30
        filled = int(p.current_progress * progress_bar_len)
        progress_bar = '█' * filled + '░' * (progress_bar_len - filled)
        
        # 고통 분포 바
        def pain_bar(pain_type: PainType) -> str:
            val = g.pain_breakdown.get(pain_type, 0)
            bar_len = 10
            filled_pain = int(val * bar_len)
            return '▓' * filled_pain + '░' * (bar_len - filled_pain)
        
        # 상태 이모지
        track_emoji = '✅' if p.on_track else '⚠️'
        feasibility_emoji = '✅' if g.feasibility > 0.6 else '🟡' if g.feasibility > 0.3 else '🔴'
        
        # 카테고리 설명
        category_desc = DESIRE_DESCRIPTIONS.get(g.category, g.category)
        
        output = f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🎯 AUTUS TRINITY ENGINE - 목표 달성 가속기                                    ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ "무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다."        ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 1️⃣ CRYSTALLIZATION (결정질화)                                                 ║
╠───────────────────────────────────────────────────────────────────────────────╣
║                                                                               ║
║ 원본 욕망: "{g.raw_desire}"
║ 카테고리: {category_desc}
║                                                                               ║
║ 목표 노드:                                                                    ║"""
        
        for node_id, target in list(g.target_nodes.items())[:4]:
            current = self.node_pressures.get(node_id, 0.5)
            output += f"\n║   {node_id}: 현재 {current*100:.0f}% → 목표 {target*100:.0f}%                                      ║"
        
        output += f"""
║                                                                               ║
║ 활성화 에너지 (Ea):                                                           ║
║   필요 기간: {g.required_months}개월                                                        ║
║   필요 집중: {g.required_focus_hours:,}시간                                                    ║
║   실현 가능성: {feasibility_emoji} {g.feasibility*100:.0f}%                                                  ║
║                                                                               ║
║ 고통 지수 (Pain Index): {g.total_pain_index*100:.0f}%                                            ║
║   💰 재무적 절제 [{pain_bar('FINANCIAL')}] {g.pain_breakdown.get('FINANCIAL', 0)*100:.0f}%               ║
║   🏃 신체적 노력 [{pain_bar('PHYSICAL')}] {g.pain_breakdown.get('PHYSICAL', 0)*100:.0f}%               ║
║   🧠 인지적 집중 [{pain_bar('COGNITIVE')}] {g.pain_breakdown.get('COGNITIVE', 0)*100:.0f}%               ║
║   💔 감정적 인내 [{pain_bar('EMOTIONAL')}] {g.pain_breakdown.get('EMOTIONAL', 0)*100:.0f}%               ║
║   ⏰ 시간적 희생 [{pain_bar('TEMPORAL')}] {g.pain_breakdown.get('TEMPORAL', 0)*100:.0f}%               ║
║                                                                               ║
║ 물리적 제약:                                                                  ║"""
        
        for constraint in g.physical_constraints[:3]:
            output += f"\n║   ⚠️ {constraint[:60]:<60} ║"
        
        if not g.physical_constraints:
            output += "\n║   ✅ 제약 없음                                                            ║"
        
        output += f"""
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 2️⃣ OPTIMIZED ENVIRONMENT (최적 환경)                                          ║
╠───────────────────────────────────────────────────────────────────────────────╣
║                                                                               ║
║ ERT 분류 (90% 유령화):                                                        ║
║   🗑️ 삭제 (E): {e.eliminated_count}건                                                          ║
║   🤖 자동화 (R): {e.automated_count}건                                                        ║
║   🔀 병렬화 (T): {e.parallelized_count}건                                                        ║
║   👤 보존: {e.preserved_count}건                                                             ║
║                                                                               ║
║ 에너지 효율: {e.energy_efficiency*100:.0f}%                                                       ║
║ 인지 산란: {e.cognitive_leakage*100:.0f}% (낮을수록 좋음)                                         ║
║ 마찰 계수: {e.friction_coefficient*100:.0f}% (낮을수록 좋음)                                       ║
║ 노이즈 차단: {e.external_noise_filtered*100:.0f}%                                                 ║
║                                                                               ║
║ 환경 점수: {e.environment_score:.0f}/100                                                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 3️⃣ NAVIGATION & CERTAINTY (불확실성 제거)                                     ║
╠───────────────────────────────────────────────────────────────────────────────╣
║                                                                               ║
║ "끝을 아는 고통은 견딜 수 있다"                                                ║
║                                                                               ║
║ 현재 진행률: [{progress_bar}] {p.current_progress*100:.1f}%                    ║
║ 체크포인트: {p.current_checkpoint}/{p.total_checkpoints} 단계                                               ║
║                                                                               ║
║ 남은 고통:                                                                    ║
║   📅 {p.remaining_pain_days}일                                                              ║
║   ⏱️ {p.remaining_pain_hours:,}시간 집중                                                     ║
║   🏁 종료 예상: {p.pain_end_date.strftime('%Y-%m-%d')}                                          ║
║                                                                               ║
║ 불확실성 지수: {p.uncertainty_index*100:.0f}% (낮을수록 좋음)                                     ║
║ 확신 수준: {p.confidence_level*100:.0f}%                                                       ║
║                                                                               ║
║ 진행 상태: {track_emoji} {'정상 진행' if p.on_track else f'이탈 ({p.deviation_days:+d}일)'}                                                      ║
║ 예상 완료: {p.estimated_completion.strftime('%Y-%m-%d')}                                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║ 💡 지금 당신이 해야 할 것:                                                     ║
║                                                                               ║
║   1. {g.required_months}개월간 인내할 결심                                                    ║
║   2. {e.preserved_count}건의 핵심 업무에만 집중                                                ║
║   3. 다음 체크포인트까지 {max(1, p.remaining_pain_days // max(1, p.total_checkpoints - p.current_checkpoint + 1))}일 견디기                                              ║
║                                                                               ║
║ "인간의 의지와 아우투스의 지능이 만났습니다."                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
        return output


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 데모 실행
# ═══════════════════════════════════════════════════════════════════════════════

def run_trinity_demo():
    """Trinity Engine 데모"""
    print('=' * 80)
    print('🎯 AUTUS Trinity Engine Demo')
    print('=' * 80)
    
    # 현재 노드 상태 (시뮬레이션)
    current_pressures = {
        # FINANCIAL
        'n01': 0.55,  # 현금 보통
        'n03': 0.60,  # 런웨이 부족
        'n05': 0.40,  # 부채 양호
        'n07': 0.45,  # 수익 보통
        
        # BIOMETRIC
        'n09': 0.50,  # 수면 부족
        'n10': 0.45,  # HRV 보통
        'n14': 0.35,  # BMI 양호
        'n15': 0.55,  # 스트레스 높음
        
        # OPERATIONAL
        'n19': 0.40,  # 태스크 양호
        'n20': 0.30,  # 오류 낮음
        'n21': 0.45,  # 기술부채 보통
        
        # EXTERNAL
        'n31': 0.40,  # 변동성 보통
        'n36': 0.30,  # 티핑 안전
    }
    
    # Trinity Engine 초기화
    trinity = TrinityEngine(current_pressures)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 테스트 1: "부자가 되고 싶다"
    # ═══════════════════════════════════════════════════════════════════════════
    print('\n' + '─' * 80)
    print('📌 테스트 1: "부자가 되고 싶다"')
    print('─' * 80)
    
    trinity.full_analysis('부자가 되고 싶다', scale=1.0, elapsed_days=30)
    print(trinity.generate_dashboard())
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 테스트 2: "자유롭게 살고 싶다" (10배 목표)
    # ═══════════════════════════════════════════════════════════════════════════
    print('\n' + '─' * 80)
    print('📌 테스트 2: "자유롭게 살고 싶다" (10배 목표)')
    print('─' * 80)
    
    trinity2 = TrinityEngine(current_pressures)
    trinity2.full_analysis('자유롭게 살고 싶다', scale=10.0, elapsed_days=90)
    print(trinity2.generate_dashboard())
    
    print('\n' + '=' * 80)
    print('✅ Trinity Engine Demo 완료')
    print('=' * 80)


if __name__ == '__main__':
    run_trinity_demo()
