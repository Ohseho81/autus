#!/usr/bin/env python3
"""
AUTUS Physics Constants & Converters
====================================
산업 언어 → 물리량 변환기

모든 비즈니스 메트릭을 물리량으로 통일:
- 돈/인력/시간 → Energy (에너지)
- 규제/협의/승인 → Resistance (저항)
- 불확실성/노이즈 → Entropy (엔트로피)
"""

from dataclasses import dataclass
from typing import Dict, Optional
from enum import Enum

# ═══════════════════════════════════════════════════════════════════════════════
# 물리 상수 (AUTUS 단위계)
# ═══════════════════════════════════════════════════════════════════════════════

class PhysicsConstants:
    """AUTUS 물리 상수"""
    
    # 에너지 변환 계수 (원 → 에너지 단위)
    WON_TO_ENERGY = 1e-8          # 1억원 = 1.0 Energy
    HOUR_TO_ENERGY = 0.01         # 1시간 = 0.01 Energy
    PERSON_TO_ENERGY = 0.1        # 1인 = 0.1 Energy
    
    # 저항 계수
    RESISTANCE_MIN = 0.0
    RESISTANCE_MAX = 1.0
    RESISTANCE_CRITICAL = 0.7     # 임계 저항
    
    # 엔트로피 임계값
    ENTROPY_STABLE = 0.3
    ENTROPY_WARNING = 0.6
    ENTROPY_CRITICAL = 0.8
    
    # 시간 상수 (초)
    HOUR = 3600
    DAY = 86400
    WEEK = 604800
    MONTH = 2592000
    
    # PNR 경고 임계값
    PNR_DANGER_SEC = DAY * 3      # 3일 이내 = 위험
    PNR_WARNING_SEC = DAY * 7     # 7일 이내 = 경고
    
    # 손실 속도 임계값 (원/초)
    LOSS_VELOCITY_DANGER = 100    # 100원/초 이상 = 위험
    LOSS_VELOCITY_WARNING = 10    # 10원/초 이상 = 경고


# ═══════════════════════════════════════════════════════════════════════════════
# 저항 유형
# ═══════════════════════════════════════════════════════════════════════════════

class ResistanceType(Enum):
    """저항 유형 및 기본 계수"""
    
    # 내부 저항
    INTERNAL_CONFLICT = 0.3       # 내부 갈등
    RESOURCE_SHORTAGE = 0.4       # 자원 부족
    SKILL_GAP = 0.35              # 역량 부족
    
    # 외부 저항
    REGULATION = 0.6              # 규제/법률
    COMPETITION = 0.5             # 경쟁
    MARKET_CONDITION = 0.45       # 시장 상황
    STAKEHOLDER = 0.55            # 이해관계자
    
    # 기관 저항 (B2B/B2G)
    BUREAUCRACY = 0.7             # 관료제
    APPROVAL_PROCESS = 0.65       # 승인 절차
    CONTRACT_NEGOTIATION = 0.6    # 계약 협상


# ═══════════════════════════════════════════════════════════════════════════════
# 변환기
# ═══════════════════════════════════════════════════════════════════════════════

class PhysicsConverter:
    """비즈니스 메트릭 → 물리량 변환기"""
    
    @staticmethod
    def money_to_energy(won: float) -> float:
        """금액(원) → 에너지"""
        return won * PhysicsConstants.WON_TO_ENERGY
    
    @staticmethod
    def energy_to_money(energy: float) -> float:
        """에너지 → 금액(원)"""
        return energy / PhysicsConstants.WON_TO_ENERGY
    
    @staticmethod
    def hours_to_energy(hours: float) -> float:
        """시간(시간) → 에너지"""
        return hours * PhysicsConstants.HOUR_TO_ENERGY
    
    @staticmethod
    def people_to_energy(count: int) -> float:
        """인원(명) → 에너지"""
        return count * PhysicsConstants.PERSON_TO_ENERGY
    
    @staticmethod
    def calculate_total_energy(
        capital_won: float = 0,
        labor_hours: float = 0,
        team_size: int = 0
    ) -> float:
        """총 투입 에너지 계산"""
        e_capital = PhysicsConverter.money_to_energy(capital_won)
        e_labor = PhysicsConverter.hours_to_energy(labor_hours)
        e_team = PhysicsConverter.people_to_energy(team_size)
        return e_capital + e_labor + e_team
    
    @staticmethod
    def resistances_to_total(resistances: list) -> float:
        """
        복수 저항 → 총 저항
        병렬 저항: 1/R_total = Σ(1/R_i)
        """
        if not resistances:
            return 0.0
        
        # 0인 저항 제외
        valid = [r for r in resistances if r > 0]
        if not valid:
            return 0.0
        
        # 병렬 결합 (저항이 많을수록 총 저항은 낮아짐)
        # 하지만 비즈니스에서는 반대로 적용 (저항 누적)
        # 직렬 결합: R_total = Σ R_i (최대 1.0 cap)
        total = sum(valid)
        return min(total, 1.0)
    
    @staticmethod
    def noise_to_entropy(noise_scores: Dict[str, float]) -> float:
        """
        7대 노이즈 점수 → 엔트로피
        
        Args:
            noise_scores: {노이즈타입: 점수} 딕셔너리
        
        Returns:
            정규화된 엔트로피 (0.0 ~ 1.0)
        """
        if not noise_scores:
            return 0.0
        
        # 가중치 (선입견과 정보마비가 엔트로피에 더 큰 영향)
        weights = {
            "BIAS": 1.5,
            "SCARCITY": 1.2,
            "STAGNATION": 0.8,
            "ATTACHMENT": 1.3,
            "FRICTION": 1.0,
            "HORIZON": 1.1,
            "PARADOX": 1.4,
        }
        
        weighted_sum = 0
        weight_total = 0
        
        for noise_type, score in noise_scores.items():
            w = weights.get(noise_type, 1.0)
            weighted_sum += score * w
            weight_total += w
        
        if weight_total == 0:
            return 0.0
        
        return min(weighted_sum / weight_total, 1.0)


# ═══════════════════════════════════════════════════════════════════════════════
# 프로젝트 물리량 데이터
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ProjectPhysics:
    """프로젝트의 물리량 상태"""
    
    # 에너지
    energy_total: float           # 총 투입 에너지
    energy_capital: float         # 자본 에너지
    energy_labor: float           # 노동 에너지
    energy_team: float            # 팀 에너지
    
    # 저항
    resistance_total: float       # 총 저항
    resistance_breakdown: Dict[str, float]  # 저항 분해
    
    # 엔트로피
    entropy: float                # 현재 엔트로피
    entropy_status: str           # STABLE / WARNING / CRITICAL
    
    # 시간
    pnr_timestamp: float          # PNR 타임스탬프
    time_to_pnr_sec: float        # PNR까지 남은 시간(초)
    
    @classmethod
    def from_business_data(
        cls,
        capital_won: float,
        labor_hours: float,
        team_size: int,
        resistances: Dict[str, float],
        noise_scores: Dict[str, float],
        pnr_days: int
    ) -> 'ProjectPhysics':
        """비즈니스 데이터로부터 물리량 생성"""
        import time
        
        # 에너지 변환
        e_capital = PhysicsConverter.money_to_energy(capital_won)
        e_labor = PhysicsConverter.hours_to_energy(labor_hours)
        e_team = PhysicsConverter.people_to_energy(team_size)
        e_total = e_capital + e_labor + e_team
        
        # 저항 계산
        r_values = list(resistances.values())
        r_total = PhysicsConverter.resistances_to_total(r_values)
        
        # 엔트로피 계산
        entropy = PhysicsConverter.noise_to_entropy(noise_scores)
        
        if entropy >= PhysicsConstants.ENTROPY_CRITICAL:
            entropy_status = "CRITICAL"
        elif entropy >= PhysicsConstants.ENTROPY_WARNING:
            entropy_status = "WARNING"
        else:
            entropy_status = "STABLE"
        
        # PNR 계산
        pnr_timestamp = time.time() + (pnr_days * PhysicsConstants.DAY)
        time_to_pnr = pnr_days * PhysicsConstants.DAY
        
        return cls(
            energy_total=e_total,
            energy_capital=e_capital,
            energy_labor=e_labor,
            energy_team=e_team,
            resistance_total=r_total,
            resistance_breakdown=resistances,
            entropy=entropy,
            entropy_status=entropy_status,
            pnr_timestamp=pnr_timestamp,
            time_to_pnr_sec=time_to_pnr
        )
