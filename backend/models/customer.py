#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Customer Archetype Model                          ║
║                          고객 DNA - 4대 유형 분류 + 시간 반감기                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

고객 분류 철학:
- PATRON (후원자): 돈도 많이 쓰고, 말도 없고, 주변에 소개까지 함 → 신처럼 모셔라
- TYCOON (권력자): 돈은 많이 쓰지만, 까다로움 → 프로답게 응대
- FAN (찐팬): 돈은 적지만, 충성스럽고 주변에 소문냄 → 정서적 교류
- VAMPIRE (흡혈귀): 돈도 적고, 말도 많고, 에너지 뱀파이어 → 정중히 거리두기
- COMMON (일반): 평범한 고객 → 표준 응대

핵심 변수:
- M (Money): 자본력 - 총 결제액
- T (Time/Entropy): 소모 비용 - 상담, 컴플레인, 시간 낭비
- S (Synergy): 연결성 - 다른 매장 이용, 소개
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    """고객 4대 유형 + 일반"""
    PATRON = "PATRON"       # 💎 후원자 (God-tier)
    TYCOON = "TYCOON"       # 👔 권력자 (VIP)
    FAN = "FAN"             # 💖 찐팬 (Loyal)
    VAMPIRE = "VAMPIRE"     # 🧛 흡혈귀 (Avoid)
    COMMON = "COMMON"       # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "PATRON": "👑",
            "TYCOON": "💼",
            "FAN": "💖",
            "VAMPIRE": "🔇",
            "COMMON": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "PATRON": "후원자",
            "TYCOON": "권력자",
            "FAN": "찐팬",
            "VAMPIRE": "주의",
            "COMMON": "일반"
        }.get(self.value, "일반")
    
    @property
    def color(self) -> str:
        return {
            "PATRON": "GOLD",
            "TYCOON": "NAVY",
            "FAN": "PINK",
            "VAMPIRE": "GREY",
            "COMMON": "WHITE"
        }.get(self.value, "WHITE")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 분류 기준 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ArchetypeThresholds:
    """분류 기준값"""
    
    # 가중치
    WEIGHT_MONEY = 1.0        # M 가중치
    WEIGHT_SYNERGY = 2.0      # S 가중치 (시너지에 2배)
    WEIGHT_ENTROPY = 2.5      # T 페널티 가중치
    
    # 기준값
    HIGH_VALUE_THRESHOLD = 100    # 고가치 고객 기준
    HIGH_COST_THRESHOLD = 80      # 고비용 고객 기준
    HIGH_SYNERGY_THRESHOLD = 50   # 시너지 고객 기준
    
    # 시간 반감기 설정
    DECAY_START_DAYS = 90         # 반감기 시작 (3개월 미활동)
    DECAY_RATE_MONEY = 0.9        # M 감소율 (월 10% 감소)
    DECAY_RATE_SYNERGY = 0.9      # S 감소율
    DECAY_RATE_ENTROPY = 0.8      # T 감소율 (더 빨리 잊혀짐)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerProfile:
    """
    통합 고객 프로필
    
    10개 사업장의 데이터가 합쳐진 Super Node
    """
    
    # 식별자
    phone: str                           # 전화번호 (정규화됨)
    name: str                            # 이름
    
    # 3대 변수 (10개 사업장 합산)
    total_m: float = 0.0                 # Money (총 결제액 환산)
    total_t: float = 0.0                 # Time/Entropy (소모 비용)
    total_s: float = 0.0                 # Synergy (연결성)
    
    # 메타데이터
    archetype: CustomerArchetype = CustomerArchetype.COMMON
    first_seen: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)
    
    # 사업장별 상세
    biz_records: Dict[str, Dict] = field(default_factory=dict)
    # 예: {"academy": {"m": 500000, "t": 20, "visits": 12}, "restaurant": {...}}
    
    # 계산된 값 (캐시)
    _value_score: float = 0.0
    _cost_score: float = 0.0
    _decay_applied: bool = False
    
    def __post_init__(self):
        """초기화 후 처리"""
        self.recalculate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시간 반감기 (Memory Decay)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def apply_time_decay(self) -> "CustomerProfile":
        """
        시간 반감기 적용
        
        - 3개월 이상 미활동 시 점수 감소 시작
        - 매월 M, S: 10% 감소 / T: 20% 감소
        - T(엔트로피)는 빨리 잊혀지는 것이 고객에게 유리
        """
        now = datetime.now()
        days_inactive = (now - self.last_active).days
        
        if days_inactive <= ArchetypeThresholds.DECAY_START_DAYS:
            return self  # 아직 반감기 시작 안 됨
        
        # 미활동 월 수 계산
        months_inactive = (days_inactive - ArchetypeThresholds.DECAY_START_DAYS) // 30
        
        if months_inactive > 0:
            # M (자본력) 감소
            decay_m = ArchetypeThresholds.DECAY_RATE_MONEY ** months_inactive
            self.total_m *= decay_m
            
            # S (시너지) 감소
            decay_s = ArchetypeThresholds.DECAY_RATE_SYNERGY ** months_inactive
            self.total_s *= decay_s
            
            # T (엔트로피) 감소 - 더 빠르게 (용서)
            decay_t = ArchetypeThresholds.DECAY_RATE_ENTROPY ** months_inactive
            self.total_t *= decay_t
            
            # 최소값 보장
            self.total_m = max(0, self.total_m)
            self.total_s = max(0, self.total_s)
            self.total_t = max(0, self.total_t)
            
            self._decay_applied = True
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유형 판정
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def recalculate(self) -> "CustomerProfile":
        """점수 재계산 및 유형 판정"""
        
        # 1. 가치 점수 = M + 2*S
        self._value_score = (
            self.total_m * ArchetypeThresholds.WEIGHT_MONEY +
            self.total_s * ArchetypeThresholds.WEIGHT_SYNERGY
        )
        
        # 2. 비용 점수 = 2.5*T
        self._cost_score = self.total_t * ArchetypeThresholds.WEIGHT_ENTROPY
        
        # 3. 유형 판정
        self.archetype = self._determine_archetype()
        
        return self
    
    def _determine_archetype(self) -> CustomerArchetype:
        """
        유형 판정 로직
        
        Decision Tree:
        1. 고가치(V >= 100)?
           - Yes + 저비용(C < 50) → PATRON (후원자)
           - Yes + 고비용(C >= 50) → TYCOON (권력자)
        2. 고비용(C >= 80)?
           - Yes → VAMPIRE (흡혈귀)
        3. 고시너지(S >= 50)?
           - Yes → FAN (찐팬)
        4. 나머지 → COMMON (일반)
        """
        V = self._value_score
        C = self._cost_score
        S = self.total_s
        
        TH = ArchetypeThresholds
        
        if V >= TH.HIGH_VALUE_THRESHOLD:
            if C < TH.HIGH_COST_THRESHOLD * 0.625:  # 50
                return CustomerArchetype.PATRON
            else:
                return CustomerArchetype.TYCOON
        
        if C >= TH.HIGH_COST_THRESHOLD:
            return CustomerArchetype.VAMPIRE
        
        if S >= TH.HIGH_SYNERGY_THRESHOLD:
            return CustomerArchetype.FAN
        
        return CustomerArchetype.COMMON
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 사업장 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_record(
        self, 
        biz_type: str, 
        money: float = 0, 
        entropy: float = 0, 
        synergy: float = 0,
        **kwargs
    ) -> "CustomerProfile":
        """
        사업장별 데이터 추가
        
        Args:
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            money: 해당 사업장 결제액/가치
            entropy: 해당 사업장 엔트로피 (상담, 컴플레인)
            synergy: 시너지 점수 (다른 매장 소개 등)
        """
        if biz_type not in self.biz_records:
            self.biz_records[biz_type] = {
                "m": 0, "t": 0, "s": 0, 
                "visits": 0, "last_visit": None
            }
        
        record = self.biz_records[biz_type]
        record["m"] += money
        record["t"] += entropy
        record["s"] += synergy
        record["visits"] += 1
        record["last_visit"] = datetime.now()
        record.update(kwargs)
        
        # 합산 업데이트
        self._aggregate_totals()
        self.last_active = datetime.now()
        self.recalculate()
        
        return self
    
    def _aggregate_totals(self):
        """사업장별 데이터 합산"""
        self.total_m = sum(r.get("m", 0) for r in self.biz_records.values())
        self.total_t = sum(r.get("t", 0) for r in self.biz_records.values())
        self.total_s = sum(r.get("s", 0) for r in self.biz_records.values())
        
        # 다중 사업장 이용 보너스 (시너지 가산)
        biz_count = len([r for r in self.biz_records.values() if r.get("visits", 0) > 0])
        if biz_count >= 2:
            self.total_s += biz_count * 10  # 사업장당 +10점
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "phone": self.phone,
            "name": self.name,
            "archetype": self.archetype.value,
            "archetype_emoji": self.archetype.emoji,
            "archetype_name_kr": self.archetype.name_kr,
            "archetype_color": self.archetype.color,
            "total_m": round(self.total_m, 2),
            "total_t": round(self.total_t, 2),
            "total_s": round(self.total_s, 2),
            "value_score": round(self._value_score, 2),
            "cost_score": round(self._cost_score, 2),
            "first_seen": self.first_seen.isoformat(),
            "last_active": self.last_active.isoformat(),
            "biz_count": len(self.biz_records),
            "decay_applied": self._decay_applied,
        }
    
    @property
    def days_since_last_active(self) -> int:
        """마지막 활동 이후 경과일"""
        return (datetime.now() - self.last_active).days
    
    @property
    def is_multi_biz_user(self) -> bool:
        """다중 사업장 이용자 여부"""
        return len(self.biz_records) >= 2
    
    def __repr__(self) -> str:
        return (
            f"CustomerProfile({self.name}, {self.archetype.emoji} {self.archetype.value}, "
            f"M={self.total_m:.0f}, T={self.total_t:.0f}, S={self.total_s:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """고객 프로필 데모"""
    print("=" * 70)
    print("  👥 AUTUS-TRINITY Customer Archetype Demo")
    print("=" * 70)
    
    # 테스트 고객 생성
    customers = []
    
    # 1. 후원자 (PATRON): 고가치 + 저비용
    patron = CustomerProfile(phone="01011112222", name="김후원")
    patron.add_biz_record("academy", money=80, entropy=5, synergy=30)
    patron.add_biz_record("restaurant", money=40, entropy=3, synergy=20)
    patron.add_biz_record("sports", money=30, entropy=2, synergy=15)
    customers.append(patron)
    
    # 2. 권력자 (TYCOON): 고가치 + 고비용
    tycoon = CustomerProfile(phone="01022223333", name="이권력")
    tycoon.add_biz_record("academy", money=100, entropy=40, synergy=10)
    tycoon.add_biz_record("restaurant", money=50, entropy=30)
    customers.append(tycoon)
    
    # 3. 찐팬 (FAN): 저가치 + 고시너지
    fan = CustomerProfile(phone="01033334444", name="박충성")
    fan.add_biz_record("restaurant", money=20, entropy=5, synergy=60)
    customers.append(fan)
    
    # 4. 흡혈귀 (VAMPIRE): 저가치 + 고비용
    vampire = CustomerProfile(phone="01044445555", name="최진상")
    vampire.add_biz_record("academy", money=10, entropy=80, synergy=0)
    customers.append(vampire)
    
    # 5. 일반 (COMMON)
    common = CustomerProfile(phone="01055556666", name="정보통")
    common.add_biz_record("restaurant", money=30, entropy=10, synergy=10)
    customers.append(common)
    
    print("\n📊 고객 유형 분류 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'M':>8} {'T':>8} {'S':>8} {'가치':>10} {'비용':>10}")
    print("-" * 70)
    
    for c in customers:
        print(
            f"{c.name:<10} "
            f"{c.archetype.emoji} {c.archetype.name_kr:<10} "
            f"{c.total_m:>8.0f} "
            f"{c.total_t:>8.0f} "
            f"{c.total_s:>8.0f} "
            f"{c._value_score:>10.0f} "
            f"{c._cost_score:>10.0f}"
        )
    
    # 시간 반감기 테스트
    print("\n" + "-" * 70)
    print("\n⏳ 시간 반감기(Decay) 테스트:")
    
    old_customer = CustomerProfile(phone="01099999999", name="구고객")
    old_customer.add_biz_record("academy", money=100, entropy=30, synergy=50)
    old_customer.last_active = datetime.now() - timedelta(days=180)  # 6개월 전
    
    print(f"\n  적용 전: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  미활동: {old_customer.days_since_last_active}일")
    
    old_customer.apply_time_decay()
    old_customer.recalculate()
    
    print(f"  적용 후: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  유형 변화: {old_customer.archetype.emoji} {old_customer.archetype.name_kr}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Customer Archetype Model                          ║
║                          고객 DNA - 4대 유형 분류 + 시간 반감기                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

고객 분류 철학:
- PATRON (후원자): 돈도 많이 쓰고, 말도 없고, 주변에 소개까지 함 → 신처럼 모셔라
- TYCOON (권력자): 돈은 많이 쓰지만, 까다로움 → 프로답게 응대
- FAN (찐팬): 돈은 적지만, 충성스럽고 주변에 소문냄 → 정서적 교류
- VAMPIRE (흡혈귀): 돈도 적고, 말도 많고, 에너지 뱀파이어 → 정중히 거리두기
- COMMON (일반): 평범한 고객 → 표준 응대

핵심 변수:
- M (Money): 자본력 - 총 결제액
- T (Time/Entropy): 소모 비용 - 상담, 컴플레인, 시간 낭비
- S (Synergy): 연결성 - 다른 매장 이용, 소개
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    """고객 4대 유형 + 일반"""
    PATRON = "PATRON"       # 💎 후원자 (God-tier)
    TYCOON = "TYCOON"       # 👔 권력자 (VIP)
    FAN = "FAN"             # 💖 찐팬 (Loyal)
    VAMPIRE = "VAMPIRE"     # 🧛 흡혈귀 (Avoid)
    COMMON = "COMMON"       # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "PATRON": "👑",
            "TYCOON": "💼",
            "FAN": "💖",
            "VAMPIRE": "🔇",
            "COMMON": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "PATRON": "후원자",
            "TYCOON": "권력자",
            "FAN": "찐팬",
            "VAMPIRE": "주의",
            "COMMON": "일반"
        }.get(self.value, "일반")
    
    @property
    def color(self) -> str:
        return {
            "PATRON": "GOLD",
            "TYCOON": "NAVY",
            "FAN": "PINK",
            "VAMPIRE": "GREY",
            "COMMON": "WHITE"
        }.get(self.value, "WHITE")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 분류 기준 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ArchetypeThresholds:
    """분류 기준값"""
    
    # 가중치
    WEIGHT_MONEY = 1.0        # M 가중치
    WEIGHT_SYNERGY = 2.0      # S 가중치 (시너지에 2배)
    WEIGHT_ENTROPY = 2.5      # T 페널티 가중치
    
    # 기준값
    HIGH_VALUE_THRESHOLD = 100    # 고가치 고객 기준
    HIGH_COST_THRESHOLD = 80      # 고비용 고객 기준
    HIGH_SYNERGY_THRESHOLD = 50   # 시너지 고객 기준
    
    # 시간 반감기 설정
    DECAY_START_DAYS = 90         # 반감기 시작 (3개월 미활동)
    DECAY_RATE_MONEY = 0.9        # M 감소율 (월 10% 감소)
    DECAY_RATE_SYNERGY = 0.9      # S 감소율
    DECAY_RATE_ENTROPY = 0.8      # T 감소율 (더 빨리 잊혀짐)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerProfile:
    """
    통합 고객 프로필
    
    10개 사업장의 데이터가 합쳐진 Super Node
    """
    
    # 식별자
    phone: str                           # 전화번호 (정규화됨)
    name: str                            # 이름
    
    # 3대 변수 (10개 사업장 합산)
    total_m: float = 0.0                 # Money (총 결제액 환산)
    total_t: float = 0.0                 # Time/Entropy (소모 비용)
    total_s: float = 0.0                 # Synergy (연결성)
    
    # 메타데이터
    archetype: CustomerArchetype = CustomerArchetype.COMMON
    first_seen: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)
    
    # 사업장별 상세
    biz_records: Dict[str, Dict] = field(default_factory=dict)
    # 예: {"academy": {"m": 500000, "t": 20, "visits": 12}, "restaurant": {...}}
    
    # 계산된 값 (캐시)
    _value_score: float = 0.0
    _cost_score: float = 0.0
    _decay_applied: bool = False
    
    def __post_init__(self):
        """초기화 후 처리"""
        self.recalculate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시간 반감기 (Memory Decay)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def apply_time_decay(self) -> "CustomerProfile":
        """
        시간 반감기 적용
        
        - 3개월 이상 미활동 시 점수 감소 시작
        - 매월 M, S: 10% 감소 / T: 20% 감소
        - T(엔트로피)는 빨리 잊혀지는 것이 고객에게 유리
        """
        now = datetime.now()
        days_inactive = (now - self.last_active).days
        
        if days_inactive <= ArchetypeThresholds.DECAY_START_DAYS:
            return self  # 아직 반감기 시작 안 됨
        
        # 미활동 월 수 계산
        months_inactive = (days_inactive - ArchetypeThresholds.DECAY_START_DAYS) // 30
        
        if months_inactive > 0:
            # M (자본력) 감소
            decay_m = ArchetypeThresholds.DECAY_RATE_MONEY ** months_inactive
            self.total_m *= decay_m
            
            # S (시너지) 감소
            decay_s = ArchetypeThresholds.DECAY_RATE_SYNERGY ** months_inactive
            self.total_s *= decay_s
            
            # T (엔트로피) 감소 - 더 빠르게 (용서)
            decay_t = ArchetypeThresholds.DECAY_RATE_ENTROPY ** months_inactive
            self.total_t *= decay_t
            
            # 최소값 보장
            self.total_m = max(0, self.total_m)
            self.total_s = max(0, self.total_s)
            self.total_t = max(0, self.total_t)
            
            self._decay_applied = True
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유형 판정
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def recalculate(self) -> "CustomerProfile":
        """점수 재계산 및 유형 판정"""
        
        # 1. 가치 점수 = M + 2*S
        self._value_score = (
            self.total_m * ArchetypeThresholds.WEIGHT_MONEY +
            self.total_s * ArchetypeThresholds.WEIGHT_SYNERGY
        )
        
        # 2. 비용 점수 = 2.5*T
        self._cost_score = self.total_t * ArchetypeThresholds.WEIGHT_ENTROPY
        
        # 3. 유형 판정
        self.archetype = self._determine_archetype()
        
        return self
    
    def _determine_archetype(self) -> CustomerArchetype:
        """
        유형 판정 로직
        
        Decision Tree:
        1. 고가치(V >= 100)?
           - Yes + 저비용(C < 50) → PATRON (후원자)
           - Yes + 고비용(C >= 50) → TYCOON (권력자)
        2. 고비용(C >= 80)?
           - Yes → VAMPIRE (흡혈귀)
        3. 고시너지(S >= 50)?
           - Yes → FAN (찐팬)
        4. 나머지 → COMMON (일반)
        """
        V = self._value_score
        C = self._cost_score
        S = self.total_s
        
        TH = ArchetypeThresholds
        
        if V >= TH.HIGH_VALUE_THRESHOLD:
            if C < TH.HIGH_COST_THRESHOLD * 0.625:  # 50
                return CustomerArchetype.PATRON
            else:
                return CustomerArchetype.TYCOON
        
        if C >= TH.HIGH_COST_THRESHOLD:
            return CustomerArchetype.VAMPIRE
        
        if S >= TH.HIGH_SYNERGY_THRESHOLD:
            return CustomerArchetype.FAN
        
        return CustomerArchetype.COMMON
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 사업장 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_record(
        self, 
        biz_type: str, 
        money: float = 0, 
        entropy: float = 0, 
        synergy: float = 0,
        **kwargs
    ) -> "CustomerProfile":
        """
        사업장별 데이터 추가
        
        Args:
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            money: 해당 사업장 결제액/가치
            entropy: 해당 사업장 엔트로피 (상담, 컴플레인)
            synergy: 시너지 점수 (다른 매장 소개 등)
        """
        if biz_type not in self.biz_records:
            self.biz_records[biz_type] = {
                "m": 0, "t": 0, "s": 0, 
                "visits": 0, "last_visit": None
            }
        
        record = self.biz_records[biz_type]
        record["m"] += money
        record["t"] += entropy
        record["s"] += synergy
        record["visits"] += 1
        record["last_visit"] = datetime.now()
        record.update(kwargs)
        
        # 합산 업데이트
        self._aggregate_totals()
        self.last_active = datetime.now()
        self.recalculate()
        
        return self
    
    def _aggregate_totals(self):
        """사업장별 데이터 합산"""
        self.total_m = sum(r.get("m", 0) for r in self.biz_records.values())
        self.total_t = sum(r.get("t", 0) for r in self.biz_records.values())
        self.total_s = sum(r.get("s", 0) for r in self.biz_records.values())
        
        # 다중 사업장 이용 보너스 (시너지 가산)
        biz_count = len([r for r in self.biz_records.values() if r.get("visits", 0) > 0])
        if biz_count >= 2:
            self.total_s += biz_count * 10  # 사업장당 +10점
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "phone": self.phone,
            "name": self.name,
            "archetype": self.archetype.value,
            "archetype_emoji": self.archetype.emoji,
            "archetype_name_kr": self.archetype.name_kr,
            "archetype_color": self.archetype.color,
            "total_m": round(self.total_m, 2),
            "total_t": round(self.total_t, 2),
            "total_s": round(self.total_s, 2),
            "value_score": round(self._value_score, 2),
            "cost_score": round(self._cost_score, 2),
            "first_seen": self.first_seen.isoformat(),
            "last_active": self.last_active.isoformat(),
            "biz_count": len(self.biz_records),
            "decay_applied": self._decay_applied,
        }
    
    @property
    def days_since_last_active(self) -> int:
        """마지막 활동 이후 경과일"""
        return (datetime.now() - self.last_active).days
    
    @property
    def is_multi_biz_user(self) -> bool:
        """다중 사업장 이용자 여부"""
        return len(self.biz_records) >= 2
    
    def __repr__(self) -> str:
        return (
            f"CustomerProfile({self.name}, {self.archetype.emoji} {self.archetype.value}, "
            f"M={self.total_m:.0f}, T={self.total_t:.0f}, S={self.total_s:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """고객 프로필 데모"""
    print("=" * 70)
    print("  👥 AUTUS-TRINITY Customer Archetype Demo")
    print("=" * 70)
    
    # 테스트 고객 생성
    customers = []
    
    # 1. 후원자 (PATRON): 고가치 + 저비용
    patron = CustomerProfile(phone="01011112222", name="김후원")
    patron.add_biz_record("academy", money=80, entropy=5, synergy=30)
    patron.add_biz_record("restaurant", money=40, entropy=3, synergy=20)
    patron.add_biz_record("sports", money=30, entropy=2, synergy=15)
    customers.append(patron)
    
    # 2. 권력자 (TYCOON): 고가치 + 고비용
    tycoon = CustomerProfile(phone="01022223333", name="이권력")
    tycoon.add_biz_record("academy", money=100, entropy=40, synergy=10)
    tycoon.add_biz_record("restaurant", money=50, entropy=30)
    customers.append(tycoon)
    
    # 3. 찐팬 (FAN): 저가치 + 고시너지
    fan = CustomerProfile(phone="01033334444", name="박충성")
    fan.add_biz_record("restaurant", money=20, entropy=5, synergy=60)
    customers.append(fan)
    
    # 4. 흡혈귀 (VAMPIRE): 저가치 + 고비용
    vampire = CustomerProfile(phone="01044445555", name="최진상")
    vampire.add_biz_record("academy", money=10, entropy=80, synergy=0)
    customers.append(vampire)
    
    # 5. 일반 (COMMON)
    common = CustomerProfile(phone="01055556666", name="정보통")
    common.add_biz_record("restaurant", money=30, entropy=10, synergy=10)
    customers.append(common)
    
    print("\n📊 고객 유형 분류 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'M':>8} {'T':>8} {'S':>8} {'가치':>10} {'비용':>10}")
    print("-" * 70)
    
    for c in customers:
        print(
            f"{c.name:<10} "
            f"{c.archetype.emoji} {c.archetype.name_kr:<10} "
            f"{c.total_m:>8.0f} "
            f"{c.total_t:>8.0f} "
            f"{c.total_s:>8.0f} "
            f"{c._value_score:>10.0f} "
            f"{c._cost_score:>10.0f}"
        )
    
    # 시간 반감기 테스트
    print("\n" + "-" * 70)
    print("\n⏳ 시간 반감기(Decay) 테스트:")
    
    old_customer = CustomerProfile(phone="01099999999", name="구고객")
    old_customer.add_biz_record("academy", money=100, entropy=30, synergy=50)
    old_customer.last_active = datetime.now() - timedelta(days=180)  # 6개월 전
    
    print(f"\n  적용 전: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  미활동: {old_customer.days_since_last_active}일")
    
    old_customer.apply_time_decay()
    old_customer.recalculate()
    
    print(f"  적용 후: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  유형 변화: {old_customer.archetype.emoji} {old_customer.archetype.name_kr}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Customer Archetype Model                          ║
║                          고객 DNA - 4대 유형 분류 + 시간 반감기                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

고객 분류 철학:
- PATRON (후원자): 돈도 많이 쓰고, 말도 없고, 주변에 소개까지 함 → 신처럼 모셔라
- TYCOON (권력자): 돈은 많이 쓰지만, 까다로움 → 프로답게 응대
- FAN (찐팬): 돈은 적지만, 충성스럽고 주변에 소문냄 → 정서적 교류
- VAMPIRE (흡혈귀): 돈도 적고, 말도 많고, 에너지 뱀파이어 → 정중히 거리두기
- COMMON (일반): 평범한 고객 → 표준 응대

핵심 변수:
- M (Money): 자본력 - 총 결제액
- T (Time/Entropy): 소모 비용 - 상담, 컴플레인, 시간 낭비
- S (Synergy): 연결성 - 다른 매장 이용, 소개
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    """고객 4대 유형 + 일반"""
    PATRON = "PATRON"       # 💎 후원자 (God-tier)
    TYCOON = "TYCOON"       # 👔 권력자 (VIP)
    FAN = "FAN"             # 💖 찐팬 (Loyal)
    VAMPIRE = "VAMPIRE"     # 🧛 흡혈귀 (Avoid)
    COMMON = "COMMON"       # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "PATRON": "👑",
            "TYCOON": "💼",
            "FAN": "💖",
            "VAMPIRE": "🔇",
            "COMMON": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "PATRON": "후원자",
            "TYCOON": "권력자",
            "FAN": "찐팬",
            "VAMPIRE": "주의",
            "COMMON": "일반"
        }.get(self.value, "일반")
    
    @property
    def color(self) -> str:
        return {
            "PATRON": "GOLD",
            "TYCOON": "NAVY",
            "FAN": "PINK",
            "VAMPIRE": "GREY",
            "COMMON": "WHITE"
        }.get(self.value, "WHITE")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 분류 기준 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ArchetypeThresholds:
    """분류 기준값"""
    
    # 가중치
    WEIGHT_MONEY = 1.0        # M 가중치
    WEIGHT_SYNERGY = 2.0      # S 가중치 (시너지에 2배)
    WEIGHT_ENTROPY = 2.5      # T 페널티 가중치
    
    # 기준값
    HIGH_VALUE_THRESHOLD = 100    # 고가치 고객 기준
    HIGH_COST_THRESHOLD = 80      # 고비용 고객 기준
    HIGH_SYNERGY_THRESHOLD = 50   # 시너지 고객 기준
    
    # 시간 반감기 설정
    DECAY_START_DAYS = 90         # 반감기 시작 (3개월 미활동)
    DECAY_RATE_MONEY = 0.9        # M 감소율 (월 10% 감소)
    DECAY_RATE_SYNERGY = 0.9      # S 감소율
    DECAY_RATE_ENTROPY = 0.8      # T 감소율 (더 빨리 잊혀짐)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerProfile:
    """
    통합 고객 프로필
    
    10개 사업장의 데이터가 합쳐진 Super Node
    """
    
    # 식별자
    phone: str                           # 전화번호 (정규화됨)
    name: str                            # 이름
    
    # 3대 변수 (10개 사업장 합산)
    total_m: float = 0.0                 # Money (총 결제액 환산)
    total_t: float = 0.0                 # Time/Entropy (소모 비용)
    total_s: float = 0.0                 # Synergy (연결성)
    
    # 메타데이터
    archetype: CustomerArchetype = CustomerArchetype.COMMON
    first_seen: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)
    
    # 사업장별 상세
    biz_records: Dict[str, Dict] = field(default_factory=dict)
    # 예: {"academy": {"m": 500000, "t": 20, "visits": 12}, "restaurant": {...}}
    
    # 계산된 값 (캐시)
    _value_score: float = 0.0
    _cost_score: float = 0.0
    _decay_applied: bool = False
    
    def __post_init__(self):
        """초기화 후 처리"""
        self.recalculate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시간 반감기 (Memory Decay)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def apply_time_decay(self) -> "CustomerProfile":
        """
        시간 반감기 적용
        
        - 3개월 이상 미활동 시 점수 감소 시작
        - 매월 M, S: 10% 감소 / T: 20% 감소
        - T(엔트로피)는 빨리 잊혀지는 것이 고객에게 유리
        """
        now = datetime.now()
        days_inactive = (now - self.last_active).days
        
        if days_inactive <= ArchetypeThresholds.DECAY_START_DAYS:
            return self  # 아직 반감기 시작 안 됨
        
        # 미활동 월 수 계산
        months_inactive = (days_inactive - ArchetypeThresholds.DECAY_START_DAYS) // 30
        
        if months_inactive > 0:
            # M (자본력) 감소
            decay_m = ArchetypeThresholds.DECAY_RATE_MONEY ** months_inactive
            self.total_m *= decay_m
            
            # S (시너지) 감소
            decay_s = ArchetypeThresholds.DECAY_RATE_SYNERGY ** months_inactive
            self.total_s *= decay_s
            
            # T (엔트로피) 감소 - 더 빠르게 (용서)
            decay_t = ArchetypeThresholds.DECAY_RATE_ENTROPY ** months_inactive
            self.total_t *= decay_t
            
            # 최소값 보장
            self.total_m = max(0, self.total_m)
            self.total_s = max(0, self.total_s)
            self.total_t = max(0, self.total_t)
            
            self._decay_applied = True
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유형 판정
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def recalculate(self) -> "CustomerProfile":
        """점수 재계산 및 유형 판정"""
        
        # 1. 가치 점수 = M + 2*S
        self._value_score = (
            self.total_m * ArchetypeThresholds.WEIGHT_MONEY +
            self.total_s * ArchetypeThresholds.WEIGHT_SYNERGY
        )
        
        # 2. 비용 점수 = 2.5*T
        self._cost_score = self.total_t * ArchetypeThresholds.WEIGHT_ENTROPY
        
        # 3. 유형 판정
        self.archetype = self._determine_archetype()
        
        return self
    
    def _determine_archetype(self) -> CustomerArchetype:
        """
        유형 판정 로직
        
        Decision Tree:
        1. 고가치(V >= 100)?
           - Yes + 저비용(C < 50) → PATRON (후원자)
           - Yes + 고비용(C >= 50) → TYCOON (권력자)
        2. 고비용(C >= 80)?
           - Yes → VAMPIRE (흡혈귀)
        3. 고시너지(S >= 50)?
           - Yes → FAN (찐팬)
        4. 나머지 → COMMON (일반)
        """
        V = self._value_score
        C = self._cost_score
        S = self.total_s
        
        TH = ArchetypeThresholds
        
        if V >= TH.HIGH_VALUE_THRESHOLD:
            if C < TH.HIGH_COST_THRESHOLD * 0.625:  # 50
                return CustomerArchetype.PATRON
            else:
                return CustomerArchetype.TYCOON
        
        if C >= TH.HIGH_COST_THRESHOLD:
            return CustomerArchetype.VAMPIRE
        
        if S >= TH.HIGH_SYNERGY_THRESHOLD:
            return CustomerArchetype.FAN
        
        return CustomerArchetype.COMMON
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 사업장 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_record(
        self, 
        biz_type: str, 
        money: float = 0, 
        entropy: float = 0, 
        synergy: float = 0,
        **kwargs
    ) -> "CustomerProfile":
        """
        사업장별 데이터 추가
        
        Args:
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            money: 해당 사업장 결제액/가치
            entropy: 해당 사업장 엔트로피 (상담, 컴플레인)
            synergy: 시너지 점수 (다른 매장 소개 등)
        """
        if biz_type not in self.biz_records:
            self.biz_records[biz_type] = {
                "m": 0, "t": 0, "s": 0, 
                "visits": 0, "last_visit": None
            }
        
        record = self.biz_records[biz_type]
        record["m"] += money
        record["t"] += entropy
        record["s"] += synergy
        record["visits"] += 1
        record["last_visit"] = datetime.now()
        record.update(kwargs)
        
        # 합산 업데이트
        self._aggregate_totals()
        self.last_active = datetime.now()
        self.recalculate()
        
        return self
    
    def _aggregate_totals(self):
        """사업장별 데이터 합산"""
        self.total_m = sum(r.get("m", 0) for r in self.biz_records.values())
        self.total_t = sum(r.get("t", 0) for r in self.biz_records.values())
        self.total_s = sum(r.get("s", 0) for r in self.biz_records.values())
        
        # 다중 사업장 이용 보너스 (시너지 가산)
        biz_count = len([r for r in self.biz_records.values() if r.get("visits", 0) > 0])
        if biz_count >= 2:
            self.total_s += biz_count * 10  # 사업장당 +10점
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "phone": self.phone,
            "name": self.name,
            "archetype": self.archetype.value,
            "archetype_emoji": self.archetype.emoji,
            "archetype_name_kr": self.archetype.name_kr,
            "archetype_color": self.archetype.color,
            "total_m": round(self.total_m, 2),
            "total_t": round(self.total_t, 2),
            "total_s": round(self.total_s, 2),
            "value_score": round(self._value_score, 2),
            "cost_score": round(self._cost_score, 2),
            "first_seen": self.first_seen.isoformat(),
            "last_active": self.last_active.isoformat(),
            "biz_count": len(self.biz_records),
            "decay_applied": self._decay_applied,
        }
    
    @property
    def days_since_last_active(self) -> int:
        """마지막 활동 이후 경과일"""
        return (datetime.now() - self.last_active).days
    
    @property
    def is_multi_biz_user(self) -> bool:
        """다중 사업장 이용자 여부"""
        return len(self.biz_records) >= 2
    
    def __repr__(self) -> str:
        return (
            f"CustomerProfile({self.name}, {self.archetype.emoji} {self.archetype.value}, "
            f"M={self.total_m:.0f}, T={self.total_t:.0f}, S={self.total_s:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """고객 프로필 데모"""
    print("=" * 70)
    print("  👥 AUTUS-TRINITY Customer Archetype Demo")
    print("=" * 70)
    
    # 테스트 고객 생성
    customers = []
    
    # 1. 후원자 (PATRON): 고가치 + 저비용
    patron = CustomerProfile(phone="01011112222", name="김후원")
    patron.add_biz_record("academy", money=80, entropy=5, synergy=30)
    patron.add_biz_record("restaurant", money=40, entropy=3, synergy=20)
    patron.add_biz_record("sports", money=30, entropy=2, synergy=15)
    customers.append(patron)
    
    # 2. 권력자 (TYCOON): 고가치 + 고비용
    tycoon = CustomerProfile(phone="01022223333", name="이권력")
    tycoon.add_biz_record("academy", money=100, entropy=40, synergy=10)
    tycoon.add_biz_record("restaurant", money=50, entropy=30)
    customers.append(tycoon)
    
    # 3. 찐팬 (FAN): 저가치 + 고시너지
    fan = CustomerProfile(phone="01033334444", name="박충성")
    fan.add_biz_record("restaurant", money=20, entropy=5, synergy=60)
    customers.append(fan)
    
    # 4. 흡혈귀 (VAMPIRE): 저가치 + 고비용
    vampire = CustomerProfile(phone="01044445555", name="최진상")
    vampire.add_biz_record("academy", money=10, entropy=80, synergy=0)
    customers.append(vampire)
    
    # 5. 일반 (COMMON)
    common = CustomerProfile(phone="01055556666", name="정보통")
    common.add_biz_record("restaurant", money=30, entropy=10, synergy=10)
    customers.append(common)
    
    print("\n📊 고객 유형 분류 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'M':>8} {'T':>8} {'S':>8} {'가치':>10} {'비용':>10}")
    print("-" * 70)
    
    for c in customers:
        print(
            f"{c.name:<10} "
            f"{c.archetype.emoji} {c.archetype.name_kr:<10} "
            f"{c.total_m:>8.0f} "
            f"{c.total_t:>8.0f} "
            f"{c.total_s:>8.0f} "
            f"{c._value_score:>10.0f} "
            f"{c._cost_score:>10.0f}"
        )
    
    # 시간 반감기 테스트
    print("\n" + "-" * 70)
    print("\n⏳ 시간 반감기(Decay) 테스트:")
    
    old_customer = CustomerProfile(phone="01099999999", name="구고객")
    old_customer.add_biz_record("academy", money=100, entropy=30, synergy=50)
    old_customer.last_active = datetime.now() - timedelta(days=180)  # 6개월 전
    
    print(f"\n  적용 전: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  미활동: {old_customer.days_since_last_active}일")
    
    old_customer.apply_time_decay()
    old_customer.recalculate()
    
    print(f"  적용 후: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  유형 변화: {old_customer.archetype.emoji} {old_customer.archetype.name_kr}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Customer Archetype Model                          ║
║                          고객 DNA - 4대 유형 분류 + 시간 반감기                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

고객 분류 철학:
- PATRON (후원자): 돈도 많이 쓰고, 말도 없고, 주변에 소개까지 함 → 신처럼 모셔라
- TYCOON (권력자): 돈은 많이 쓰지만, 까다로움 → 프로답게 응대
- FAN (찐팬): 돈은 적지만, 충성스럽고 주변에 소문냄 → 정서적 교류
- VAMPIRE (흡혈귀): 돈도 적고, 말도 많고, 에너지 뱀파이어 → 정중히 거리두기
- COMMON (일반): 평범한 고객 → 표준 응대

핵심 변수:
- M (Money): 자본력 - 총 결제액
- T (Time/Entropy): 소모 비용 - 상담, 컴플레인, 시간 낭비
- S (Synergy): 연결성 - 다른 매장 이용, 소개
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    """고객 4대 유형 + 일반"""
    PATRON = "PATRON"       # 💎 후원자 (God-tier)
    TYCOON = "TYCOON"       # 👔 권력자 (VIP)
    FAN = "FAN"             # 💖 찐팬 (Loyal)
    VAMPIRE = "VAMPIRE"     # 🧛 흡혈귀 (Avoid)
    COMMON = "COMMON"       # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "PATRON": "👑",
            "TYCOON": "💼",
            "FAN": "💖",
            "VAMPIRE": "🔇",
            "COMMON": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "PATRON": "후원자",
            "TYCOON": "권력자",
            "FAN": "찐팬",
            "VAMPIRE": "주의",
            "COMMON": "일반"
        }.get(self.value, "일반")
    
    @property
    def color(self) -> str:
        return {
            "PATRON": "GOLD",
            "TYCOON": "NAVY",
            "FAN": "PINK",
            "VAMPIRE": "GREY",
            "COMMON": "WHITE"
        }.get(self.value, "WHITE")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 분류 기준 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ArchetypeThresholds:
    """분류 기준값"""
    
    # 가중치
    WEIGHT_MONEY = 1.0        # M 가중치
    WEIGHT_SYNERGY = 2.0      # S 가중치 (시너지에 2배)
    WEIGHT_ENTROPY = 2.5      # T 페널티 가중치
    
    # 기준값
    HIGH_VALUE_THRESHOLD = 100    # 고가치 고객 기준
    HIGH_COST_THRESHOLD = 80      # 고비용 고객 기준
    HIGH_SYNERGY_THRESHOLD = 50   # 시너지 고객 기준
    
    # 시간 반감기 설정
    DECAY_START_DAYS = 90         # 반감기 시작 (3개월 미활동)
    DECAY_RATE_MONEY = 0.9        # M 감소율 (월 10% 감소)
    DECAY_RATE_SYNERGY = 0.9      # S 감소율
    DECAY_RATE_ENTROPY = 0.8      # T 감소율 (더 빨리 잊혀짐)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerProfile:
    """
    통합 고객 프로필
    
    10개 사업장의 데이터가 합쳐진 Super Node
    """
    
    # 식별자
    phone: str                           # 전화번호 (정규화됨)
    name: str                            # 이름
    
    # 3대 변수 (10개 사업장 합산)
    total_m: float = 0.0                 # Money (총 결제액 환산)
    total_t: float = 0.0                 # Time/Entropy (소모 비용)
    total_s: float = 0.0                 # Synergy (연결성)
    
    # 메타데이터
    archetype: CustomerArchetype = CustomerArchetype.COMMON
    first_seen: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)
    
    # 사업장별 상세
    biz_records: Dict[str, Dict] = field(default_factory=dict)
    # 예: {"academy": {"m": 500000, "t": 20, "visits": 12}, "restaurant": {...}}
    
    # 계산된 값 (캐시)
    _value_score: float = 0.0
    _cost_score: float = 0.0
    _decay_applied: bool = False
    
    def __post_init__(self):
        """초기화 후 처리"""
        self.recalculate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시간 반감기 (Memory Decay)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def apply_time_decay(self) -> "CustomerProfile":
        """
        시간 반감기 적용
        
        - 3개월 이상 미활동 시 점수 감소 시작
        - 매월 M, S: 10% 감소 / T: 20% 감소
        - T(엔트로피)는 빨리 잊혀지는 것이 고객에게 유리
        """
        now = datetime.now()
        days_inactive = (now - self.last_active).days
        
        if days_inactive <= ArchetypeThresholds.DECAY_START_DAYS:
            return self  # 아직 반감기 시작 안 됨
        
        # 미활동 월 수 계산
        months_inactive = (days_inactive - ArchetypeThresholds.DECAY_START_DAYS) // 30
        
        if months_inactive > 0:
            # M (자본력) 감소
            decay_m = ArchetypeThresholds.DECAY_RATE_MONEY ** months_inactive
            self.total_m *= decay_m
            
            # S (시너지) 감소
            decay_s = ArchetypeThresholds.DECAY_RATE_SYNERGY ** months_inactive
            self.total_s *= decay_s
            
            # T (엔트로피) 감소 - 더 빠르게 (용서)
            decay_t = ArchetypeThresholds.DECAY_RATE_ENTROPY ** months_inactive
            self.total_t *= decay_t
            
            # 최소값 보장
            self.total_m = max(0, self.total_m)
            self.total_s = max(0, self.total_s)
            self.total_t = max(0, self.total_t)
            
            self._decay_applied = True
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유형 판정
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def recalculate(self) -> "CustomerProfile":
        """점수 재계산 및 유형 판정"""
        
        # 1. 가치 점수 = M + 2*S
        self._value_score = (
            self.total_m * ArchetypeThresholds.WEIGHT_MONEY +
            self.total_s * ArchetypeThresholds.WEIGHT_SYNERGY
        )
        
        # 2. 비용 점수 = 2.5*T
        self._cost_score = self.total_t * ArchetypeThresholds.WEIGHT_ENTROPY
        
        # 3. 유형 판정
        self.archetype = self._determine_archetype()
        
        return self
    
    def _determine_archetype(self) -> CustomerArchetype:
        """
        유형 판정 로직
        
        Decision Tree:
        1. 고가치(V >= 100)?
           - Yes + 저비용(C < 50) → PATRON (후원자)
           - Yes + 고비용(C >= 50) → TYCOON (권력자)
        2. 고비용(C >= 80)?
           - Yes → VAMPIRE (흡혈귀)
        3. 고시너지(S >= 50)?
           - Yes → FAN (찐팬)
        4. 나머지 → COMMON (일반)
        """
        V = self._value_score
        C = self._cost_score
        S = self.total_s
        
        TH = ArchetypeThresholds
        
        if V >= TH.HIGH_VALUE_THRESHOLD:
            if C < TH.HIGH_COST_THRESHOLD * 0.625:  # 50
                return CustomerArchetype.PATRON
            else:
                return CustomerArchetype.TYCOON
        
        if C >= TH.HIGH_COST_THRESHOLD:
            return CustomerArchetype.VAMPIRE
        
        if S >= TH.HIGH_SYNERGY_THRESHOLD:
            return CustomerArchetype.FAN
        
        return CustomerArchetype.COMMON
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 사업장 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_record(
        self, 
        biz_type: str, 
        money: float = 0, 
        entropy: float = 0, 
        synergy: float = 0,
        **kwargs
    ) -> "CustomerProfile":
        """
        사업장별 데이터 추가
        
        Args:
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            money: 해당 사업장 결제액/가치
            entropy: 해당 사업장 엔트로피 (상담, 컴플레인)
            synergy: 시너지 점수 (다른 매장 소개 등)
        """
        if biz_type not in self.biz_records:
            self.biz_records[biz_type] = {
                "m": 0, "t": 0, "s": 0, 
                "visits": 0, "last_visit": None
            }
        
        record = self.biz_records[biz_type]
        record["m"] += money
        record["t"] += entropy
        record["s"] += synergy
        record["visits"] += 1
        record["last_visit"] = datetime.now()
        record.update(kwargs)
        
        # 합산 업데이트
        self._aggregate_totals()
        self.last_active = datetime.now()
        self.recalculate()
        
        return self
    
    def _aggregate_totals(self):
        """사업장별 데이터 합산"""
        self.total_m = sum(r.get("m", 0) for r in self.biz_records.values())
        self.total_t = sum(r.get("t", 0) for r in self.biz_records.values())
        self.total_s = sum(r.get("s", 0) for r in self.biz_records.values())
        
        # 다중 사업장 이용 보너스 (시너지 가산)
        biz_count = len([r for r in self.biz_records.values() if r.get("visits", 0) > 0])
        if biz_count >= 2:
            self.total_s += biz_count * 10  # 사업장당 +10점
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "phone": self.phone,
            "name": self.name,
            "archetype": self.archetype.value,
            "archetype_emoji": self.archetype.emoji,
            "archetype_name_kr": self.archetype.name_kr,
            "archetype_color": self.archetype.color,
            "total_m": round(self.total_m, 2),
            "total_t": round(self.total_t, 2),
            "total_s": round(self.total_s, 2),
            "value_score": round(self._value_score, 2),
            "cost_score": round(self._cost_score, 2),
            "first_seen": self.first_seen.isoformat(),
            "last_active": self.last_active.isoformat(),
            "biz_count": len(self.biz_records),
            "decay_applied": self._decay_applied,
        }
    
    @property
    def days_since_last_active(self) -> int:
        """마지막 활동 이후 경과일"""
        return (datetime.now() - self.last_active).days
    
    @property
    def is_multi_biz_user(self) -> bool:
        """다중 사업장 이용자 여부"""
        return len(self.biz_records) >= 2
    
    def __repr__(self) -> str:
        return (
            f"CustomerProfile({self.name}, {self.archetype.emoji} {self.archetype.value}, "
            f"M={self.total_m:.0f}, T={self.total_t:.0f}, S={self.total_s:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """고객 프로필 데모"""
    print("=" * 70)
    print("  👥 AUTUS-TRINITY Customer Archetype Demo")
    print("=" * 70)
    
    # 테스트 고객 생성
    customers = []
    
    # 1. 후원자 (PATRON): 고가치 + 저비용
    patron = CustomerProfile(phone="01011112222", name="김후원")
    patron.add_biz_record("academy", money=80, entropy=5, synergy=30)
    patron.add_biz_record("restaurant", money=40, entropy=3, synergy=20)
    patron.add_biz_record("sports", money=30, entropy=2, synergy=15)
    customers.append(patron)
    
    # 2. 권력자 (TYCOON): 고가치 + 고비용
    tycoon = CustomerProfile(phone="01022223333", name="이권력")
    tycoon.add_biz_record("academy", money=100, entropy=40, synergy=10)
    tycoon.add_biz_record("restaurant", money=50, entropy=30)
    customers.append(tycoon)
    
    # 3. 찐팬 (FAN): 저가치 + 고시너지
    fan = CustomerProfile(phone="01033334444", name="박충성")
    fan.add_biz_record("restaurant", money=20, entropy=5, synergy=60)
    customers.append(fan)
    
    # 4. 흡혈귀 (VAMPIRE): 저가치 + 고비용
    vampire = CustomerProfile(phone="01044445555", name="최진상")
    vampire.add_biz_record("academy", money=10, entropy=80, synergy=0)
    customers.append(vampire)
    
    # 5. 일반 (COMMON)
    common = CustomerProfile(phone="01055556666", name="정보통")
    common.add_biz_record("restaurant", money=30, entropy=10, synergy=10)
    customers.append(common)
    
    print("\n📊 고객 유형 분류 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'M':>8} {'T':>8} {'S':>8} {'가치':>10} {'비용':>10}")
    print("-" * 70)
    
    for c in customers:
        print(
            f"{c.name:<10} "
            f"{c.archetype.emoji} {c.archetype.name_kr:<10} "
            f"{c.total_m:>8.0f} "
            f"{c.total_t:>8.0f} "
            f"{c.total_s:>8.0f} "
            f"{c._value_score:>10.0f} "
            f"{c._cost_score:>10.0f}"
        )
    
    # 시간 반감기 테스트
    print("\n" + "-" * 70)
    print("\n⏳ 시간 반감기(Decay) 테스트:")
    
    old_customer = CustomerProfile(phone="01099999999", name="구고객")
    old_customer.add_biz_record("academy", money=100, entropy=30, synergy=50)
    old_customer.last_active = datetime.now() - timedelta(days=180)  # 6개월 전
    
    print(f"\n  적용 전: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  미활동: {old_customer.days_since_last_active}일")
    
    old_customer.apply_time_decay()
    old_customer.recalculate()
    
    print(f"  적용 후: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  유형 변화: {old_customer.archetype.emoji} {old_customer.archetype.name_kr}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Customer Archetype Model                          ║
║                          고객 DNA - 4대 유형 분류 + 시간 반감기                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

고객 분류 철학:
- PATRON (후원자): 돈도 많이 쓰고, 말도 없고, 주변에 소개까지 함 → 신처럼 모셔라
- TYCOON (권력자): 돈은 많이 쓰지만, 까다로움 → 프로답게 응대
- FAN (찐팬): 돈은 적지만, 충성스럽고 주변에 소문냄 → 정서적 교류
- VAMPIRE (흡혈귀): 돈도 적고, 말도 많고, 에너지 뱀파이어 → 정중히 거리두기
- COMMON (일반): 평범한 고객 → 표준 응대

핵심 변수:
- M (Money): 자본력 - 총 결제액
- T (Time/Entropy): 소모 비용 - 상담, 컴플레인, 시간 낭비
- S (Synergy): 연결성 - 다른 매장 이용, 소개
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    """고객 4대 유형 + 일반"""
    PATRON = "PATRON"       # 💎 후원자 (God-tier)
    TYCOON = "TYCOON"       # 👔 권력자 (VIP)
    FAN = "FAN"             # 💖 찐팬 (Loyal)
    VAMPIRE = "VAMPIRE"     # 🧛 흡혈귀 (Avoid)
    COMMON = "COMMON"       # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "PATRON": "👑",
            "TYCOON": "💼",
            "FAN": "💖",
            "VAMPIRE": "🔇",
            "COMMON": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "PATRON": "후원자",
            "TYCOON": "권력자",
            "FAN": "찐팬",
            "VAMPIRE": "주의",
            "COMMON": "일반"
        }.get(self.value, "일반")
    
    @property
    def color(self) -> str:
        return {
            "PATRON": "GOLD",
            "TYCOON": "NAVY",
            "FAN": "PINK",
            "VAMPIRE": "GREY",
            "COMMON": "WHITE"
        }.get(self.value, "WHITE")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 분류 기준 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ArchetypeThresholds:
    """분류 기준값"""
    
    # 가중치
    WEIGHT_MONEY = 1.0        # M 가중치
    WEIGHT_SYNERGY = 2.0      # S 가중치 (시너지에 2배)
    WEIGHT_ENTROPY = 2.5      # T 페널티 가중치
    
    # 기준값
    HIGH_VALUE_THRESHOLD = 100    # 고가치 고객 기준
    HIGH_COST_THRESHOLD = 80      # 고비용 고객 기준
    HIGH_SYNERGY_THRESHOLD = 50   # 시너지 고객 기준
    
    # 시간 반감기 설정
    DECAY_START_DAYS = 90         # 반감기 시작 (3개월 미활동)
    DECAY_RATE_MONEY = 0.9        # M 감소율 (월 10% 감소)
    DECAY_RATE_SYNERGY = 0.9      # S 감소율
    DECAY_RATE_ENTROPY = 0.8      # T 감소율 (더 빨리 잊혀짐)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerProfile:
    """
    통합 고객 프로필
    
    10개 사업장의 데이터가 합쳐진 Super Node
    """
    
    # 식별자
    phone: str                           # 전화번호 (정규화됨)
    name: str                            # 이름
    
    # 3대 변수 (10개 사업장 합산)
    total_m: float = 0.0                 # Money (총 결제액 환산)
    total_t: float = 0.0                 # Time/Entropy (소모 비용)
    total_s: float = 0.0                 # Synergy (연결성)
    
    # 메타데이터
    archetype: CustomerArchetype = CustomerArchetype.COMMON
    first_seen: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)
    
    # 사업장별 상세
    biz_records: Dict[str, Dict] = field(default_factory=dict)
    # 예: {"academy": {"m": 500000, "t": 20, "visits": 12}, "restaurant": {...}}
    
    # 계산된 값 (캐시)
    _value_score: float = 0.0
    _cost_score: float = 0.0
    _decay_applied: bool = False
    
    def __post_init__(self):
        """초기화 후 처리"""
        self.recalculate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시간 반감기 (Memory Decay)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def apply_time_decay(self) -> "CustomerProfile":
        """
        시간 반감기 적용
        
        - 3개월 이상 미활동 시 점수 감소 시작
        - 매월 M, S: 10% 감소 / T: 20% 감소
        - T(엔트로피)는 빨리 잊혀지는 것이 고객에게 유리
        """
        now = datetime.now()
        days_inactive = (now - self.last_active).days
        
        if days_inactive <= ArchetypeThresholds.DECAY_START_DAYS:
            return self  # 아직 반감기 시작 안 됨
        
        # 미활동 월 수 계산
        months_inactive = (days_inactive - ArchetypeThresholds.DECAY_START_DAYS) // 30
        
        if months_inactive > 0:
            # M (자본력) 감소
            decay_m = ArchetypeThresholds.DECAY_RATE_MONEY ** months_inactive
            self.total_m *= decay_m
            
            # S (시너지) 감소
            decay_s = ArchetypeThresholds.DECAY_RATE_SYNERGY ** months_inactive
            self.total_s *= decay_s
            
            # T (엔트로피) 감소 - 더 빠르게 (용서)
            decay_t = ArchetypeThresholds.DECAY_RATE_ENTROPY ** months_inactive
            self.total_t *= decay_t
            
            # 최소값 보장
            self.total_m = max(0, self.total_m)
            self.total_s = max(0, self.total_s)
            self.total_t = max(0, self.total_t)
            
            self._decay_applied = True
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유형 판정
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def recalculate(self) -> "CustomerProfile":
        """점수 재계산 및 유형 판정"""
        
        # 1. 가치 점수 = M + 2*S
        self._value_score = (
            self.total_m * ArchetypeThresholds.WEIGHT_MONEY +
            self.total_s * ArchetypeThresholds.WEIGHT_SYNERGY
        )
        
        # 2. 비용 점수 = 2.5*T
        self._cost_score = self.total_t * ArchetypeThresholds.WEIGHT_ENTROPY
        
        # 3. 유형 판정
        self.archetype = self._determine_archetype()
        
        return self
    
    def _determine_archetype(self) -> CustomerArchetype:
        """
        유형 판정 로직
        
        Decision Tree:
        1. 고가치(V >= 100)?
           - Yes + 저비용(C < 50) → PATRON (후원자)
           - Yes + 고비용(C >= 50) → TYCOON (권력자)
        2. 고비용(C >= 80)?
           - Yes → VAMPIRE (흡혈귀)
        3. 고시너지(S >= 50)?
           - Yes → FAN (찐팬)
        4. 나머지 → COMMON (일반)
        """
        V = self._value_score
        C = self._cost_score
        S = self.total_s
        
        TH = ArchetypeThresholds
        
        if V >= TH.HIGH_VALUE_THRESHOLD:
            if C < TH.HIGH_COST_THRESHOLD * 0.625:  # 50
                return CustomerArchetype.PATRON
            else:
                return CustomerArchetype.TYCOON
        
        if C >= TH.HIGH_COST_THRESHOLD:
            return CustomerArchetype.VAMPIRE
        
        if S >= TH.HIGH_SYNERGY_THRESHOLD:
            return CustomerArchetype.FAN
        
        return CustomerArchetype.COMMON
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 사업장 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_record(
        self, 
        biz_type: str, 
        money: float = 0, 
        entropy: float = 0, 
        synergy: float = 0,
        **kwargs
    ) -> "CustomerProfile":
        """
        사업장별 데이터 추가
        
        Args:
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            money: 해당 사업장 결제액/가치
            entropy: 해당 사업장 엔트로피 (상담, 컴플레인)
            synergy: 시너지 점수 (다른 매장 소개 등)
        """
        if biz_type not in self.biz_records:
            self.biz_records[biz_type] = {
                "m": 0, "t": 0, "s": 0, 
                "visits": 0, "last_visit": None
            }
        
        record = self.biz_records[biz_type]
        record["m"] += money
        record["t"] += entropy
        record["s"] += synergy
        record["visits"] += 1
        record["last_visit"] = datetime.now()
        record.update(kwargs)
        
        # 합산 업데이트
        self._aggregate_totals()
        self.last_active = datetime.now()
        self.recalculate()
        
        return self
    
    def _aggregate_totals(self):
        """사업장별 데이터 합산"""
        self.total_m = sum(r.get("m", 0) for r in self.biz_records.values())
        self.total_t = sum(r.get("t", 0) for r in self.biz_records.values())
        self.total_s = sum(r.get("s", 0) for r in self.biz_records.values())
        
        # 다중 사업장 이용 보너스 (시너지 가산)
        biz_count = len([r for r in self.biz_records.values() if r.get("visits", 0) > 0])
        if biz_count >= 2:
            self.total_s += biz_count * 10  # 사업장당 +10점
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "phone": self.phone,
            "name": self.name,
            "archetype": self.archetype.value,
            "archetype_emoji": self.archetype.emoji,
            "archetype_name_kr": self.archetype.name_kr,
            "archetype_color": self.archetype.color,
            "total_m": round(self.total_m, 2),
            "total_t": round(self.total_t, 2),
            "total_s": round(self.total_s, 2),
            "value_score": round(self._value_score, 2),
            "cost_score": round(self._cost_score, 2),
            "first_seen": self.first_seen.isoformat(),
            "last_active": self.last_active.isoformat(),
            "biz_count": len(self.biz_records),
            "decay_applied": self._decay_applied,
        }
    
    @property
    def days_since_last_active(self) -> int:
        """마지막 활동 이후 경과일"""
        return (datetime.now() - self.last_active).days
    
    @property
    def is_multi_biz_user(self) -> bool:
        """다중 사업장 이용자 여부"""
        return len(self.biz_records) >= 2
    
    def __repr__(self) -> str:
        return (
            f"CustomerProfile({self.name}, {self.archetype.emoji} {self.archetype.value}, "
            f"M={self.total_m:.0f}, T={self.total_t:.0f}, S={self.total_s:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """고객 프로필 데모"""
    print("=" * 70)
    print("  👥 AUTUS-TRINITY Customer Archetype Demo")
    print("=" * 70)
    
    # 테스트 고객 생성
    customers = []
    
    # 1. 후원자 (PATRON): 고가치 + 저비용
    patron = CustomerProfile(phone="01011112222", name="김후원")
    patron.add_biz_record("academy", money=80, entropy=5, synergy=30)
    patron.add_biz_record("restaurant", money=40, entropy=3, synergy=20)
    patron.add_biz_record("sports", money=30, entropy=2, synergy=15)
    customers.append(patron)
    
    # 2. 권력자 (TYCOON): 고가치 + 고비용
    tycoon = CustomerProfile(phone="01022223333", name="이권력")
    tycoon.add_biz_record("academy", money=100, entropy=40, synergy=10)
    tycoon.add_biz_record("restaurant", money=50, entropy=30)
    customers.append(tycoon)
    
    # 3. 찐팬 (FAN): 저가치 + 고시너지
    fan = CustomerProfile(phone="01033334444", name="박충성")
    fan.add_biz_record("restaurant", money=20, entropy=5, synergy=60)
    customers.append(fan)
    
    # 4. 흡혈귀 (VAMPIRE): 저가치 + 고비용
    vampire = CustomerProfile(phone="01044445555", name="최진상")
    vampire.add_biz_record("academy", money=10, entropy=80, synergy=0)
    customers.append(vampire)
    
    # 5. 일반 (COMMON)
    common = CustomerProfile(phone="01055556666", name="정보통")
    common.add_biz_record("restaurant", money=30, entropy=10, synergy=10)
    customers.append(common)
    
    print("\n📊 고객 유형 분류 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'M':>8} {'T':>8} {'S':>8} {'가치':>10} {'비용':>10}")
    print("-" * 70)
    
    for c in customers:
        print(
            f"{c.name:<10} "
            f"{c.archetype.emoji} {c.archetype.name_kr:<10} "
            f"{c.total_m:>8.0f} "
            f"{c.total_t:>8.0f} "
            f"{c.total_s:>8.0f} "
            f"{c._value_score:>10.0f} "
            f"{c._cost_score:>10.0f}"
        )
    
    # 시간 반감기 테스트
    print("\n" + "-" * 70)
    print("\n⏳ 시간 반감기(Decay) 테스트:")
    
    old_customer = CustomerProfile(phone="01099999999", name="구고객")
    old_customer.add_biz_record("academy", money=100, entropy=30, synergy=50)
    old_customer.last_active = datetime.now() - timedelta(days=180)  # 6개월 전
    
    print(f"\n  적용 전: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  미활동: {old_customer.days_since_last_active}일")
    
    old_customer.apply_time_decay()
    old_customer.recalculate()
    
    print(f"  적용 후: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  유형 변화: {old_customer.archetype.emoji} {old_customer.archetype.name_kr}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Customer Archetype Model                          ║
║                          고객 DNA - 4대 유형 분류 + 시간 반감기                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

고객 분류 철학:
- PATRON (후원자): 돈도 많이 쓰고, 말도 없고, 주변에 소개까지 함 → 신처럼 모셔라
- TYCOON (권력자): 돈은 많이 쓰지만, 까다로움 → 프로답게 응대
- FAN (찐팬): 돈은 적지만, 충성스럽고 주변에 소문냄 → 정서적 교류
- VAMPIRE (흡혈귀): 돈도 적고, 말도 많고, 에너지 뱀파이어 → 정중히 거리두기
- COMMON (일반): 평범한 고객 → 표준 응대

핵심 변수:
- M (Money): 자본력 - 총 결제액
- T (Time/Entropy): 소모 비용 - 상담, 컴플레인, 시간 낭비
- S (Synergy): 연결성 - 다른 매장 이용, 소개
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    """고객 4대 유형 + 일반"""
    PATRON = "PATRON"       # 💎 후원자 (God-tier)
    TYCOON = "TYCOON"       # 👔 권력자 (VIP)
    FAN = "FAN"             # 💖 찐팬 (Loyal)
    VAMPIRE = "VAMPIRE"     # 🧛 흡혈귀 (Avoid)
    COMMON = "COMMON"       # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "PATRON": "👑",
            "TYCOON": "💼",
            "FAN": "💖",
            "VAMPIRE": "🔇",
            "COMMON": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "PATRON": "후원자",
            "TYCOON": "권력자",
            "FAN": "찐팬",
            "VAMPIRE": "주의",
            "COMMON": "일반"
        }.get(self.value, "일반")
    
    @property
    def color(self) -> str:
        return {
            "PATRON": "GOLD",
            "TYCOON": "NAVY",
            "FAN": "PINK",
            "VAMPIRE": "GREY",
            "COMMON": "WHITE"
        }.get(self.value, "WHITE")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 분류 기준 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ArchetypeThresholds:
    """분류 기준값"""
    
    # 가중치
    WEIGHT_MONEY = 1.0        # M 가중치
    WEIGHT_SYNERGY = 2.0      # S 가중치 (시너지에 2배)
    WEIGHT_ENTROPY = 2.5      # T 페널티 가중치
    
    # 기준값
    HIGH_VALUE_THRESHOLD = 100    # 고가치 고객 기준
    HIGH_COST_THRESHOLD = 80      # 고비용 고객 기준
    HIGH_SYNERGY_THRESHOLD = 50   # 시너지 고객 기준
    
    # 시간 반감기 설정
    DECAY_START_DAYS = 90         # 반감기 시작 (3개월 미활동)
    DECAY_RATE_MONEY = 0.9        # M 감소율 (월 10% 감소)
    DECAY_RATE_SYNERGY = 0.9      # S 감소율
    DECAY_RATE_ENTROPY = 0.8      # T 감소율 (더 빨리 잊혀짐)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerProfile:
    """
    통합 고객 프로필
    
    10개 사업장의 데이터가 합쳐진 Super Node
    """
    
    # 식별자
    phone: str                           # 전화번호 (정규화됨)
    name: str                            # 이름
    
    # 3대 변수 (10개 사업장 합산)
    total_m: float = 0.0                 # Money (총 결제액 환산)
    total_t: float = 0.0                 # Time/Entropy (소모 비용)
    total_s: float = 0.0                 # Synergy (연결성)
    
    # 메타데이터
    archetype: CustomerArchetype = CustomerArchetype.COMMON
    first_seen: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)
    
    # 사업장별 상세
    biz_records: Dict[str, Dict] = field(default_factory=dict)
    # 예: {"academy": {"m": 500000, "t": 20, "visits": 12}, "restaurant": {...}}
    
    # 계산된 값 (캐시)
    _value_score: float = 0.0
    _cost_score: float = 0.0
    _decay_applied: bool = False
    
    def __post_init__(self):
        """초기화 후 처리"""
        self.recalculate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시간 반감기 (Memory Decay)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def apply_time_decay(self) -> "CustomerProfile":
        """
        시간 반감기 적용
        
        - 3개월 이상 미활동 시 점수 감소 시작
        - 매월 M, S: 10% 감소 / T: 20% 감소
        - T(엔트로피)는 빨리 잊혀지는 것이 고객에게 유리
        """
        now = datetime.now()
        days_inactive = (now - self.last_active).days
        
        if days_inactive <= ArchetypeThresholds.DECAY_START_DAYS:
            return self  # 아직 반감기 시작 안 됨
        
        # 미활동 월 수 계산
        months_inactive = (days_inactive - ArchetypeThresholds.DECAY_START_DAYS) // 30
        
        if months_inactive > 0:
            # M (자본력) 감소
            decay_m = ArchetypeThresholds.DECAY_RATE_MONEY ** months_inactive
            self.total_m *= decay_m
            
            # S (시너지) 감소
            decay_s = ArchetypeThresholds.DECAY_RATE_SYNERGY ** months_inactive
            self.total_s *= decay_s
            
            # T (엔트로피) 감소 - 더 빠르게 (용서)
            decay_t = ArchetypeThresholds.DECAY_RATE_ENTROPY ** months_inactive
            self.total_t *= decay_t
            
            # 최소값 보장
            self.total_m = max(0, self.total_m)
            self.total_s = max(0, self.total_s)
            self.total_t = max(0, self.total_t)
            
            self._decay_applied = True
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유형 판정
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def recalculate(self) -> "CustomerProfile":
        """점수 재계산 및 유형 판정"""
        
        # 1. 가치 점수 = M + 2*S
        self._value_score = (
            self.total_m * ArchetypeThresholds.WEIGHT_MONEY +
            self.total_s * ArchetypeThresholds.WEIGHT_SYNERGY
        )
        
        # 2. 비용 점수 = 2.5*T
        self._cost_score = self.total_t * ArchetypeThresholds.WEIGHT_ENTROPY
        
        # 3. 유형 판정
        self.archetype = self._determine_archetype()
        
        return self
    
    def _determine_archetype(self) -> CustomerArchetype:
        """
        유형 판정 로직
        
        Decision Tree:
        1. 고가치(V >= 100)?
           - Yes + 저비용(C < 50) → PATRON (후원자)
           - Yes + 고비용(C >= 50) → TYCOON (권력자)
        2. 고비용(C >= 80)?
           - Yes → VAMPIRE (흡혈귀)
        3. 고시너지(S >= 50)?
           - Yes → FAN (찐팬)
        4. 나머지 → COMMON (일반)
        """
        V = self._value_score
        C = self._cost_score
        S = self.total_s
        
        TH = ArchetypeThresholds
        
        if V >= TH.HIGH_VALUE_THRESHOLD:
            if C < TH.HIGH_COST_THRESHOLD * 0.625:  # 50
                return CustomerArchetype.PATRON
            else:
                return CustomerArchetype.TYCOON
        
        if C >= TH.HIGH_COST_THRESHOLD:
            return CustomerArchetype.VAMPIRE
        
        if S >= TH.HIGH_SYNERGY_THRESHOLD:
            return CustomerArchetype.FAN
        
        return CustomerArchetype.COMMON
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 사업장 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_record(
        self, 
        biz_type: str, 
        money: float = 0, 
        entropy: float = 0, 
        synergy: float = 0,
        **kwargs
    ) -> "CustomerProfile":
        """
        사업장별 데이터 추가
        
        Args:
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            money: 해당 사업장 결제액/가치
            entropy: 해당 사업장 엔트로피 (상담, 컴플레인)
            synergy: 시너지 점수 (다른 매장 소개 등)
        """
        if biz_type not in self.biz_records:
            self.biz_records[biz_type] = {
                "m": 0, "t": 0, "s": 0, 
                "visits": 0, "last_visit": None
            }
        
        record = self.biz_records[biz_type]
        record["m"] += money
        record["t"] += entropy
        record["s"] += synergy
        record["visits"] += 1
        record["last_visit"] = datetime.now()
        record.update(kwargs)
        
        # 합산 업데이트
        self._aggregate_totals()
        self.last_active = datetime.now()
        self.recalculate()
        
        return self
    
    def _aggregate_totals(self):
        """사업장별 데이터 합산"""
        self.total_m = sum(r.get("m", 0) for r in self.biz_records.values())
        self.total_t = sum(r.get("t", 0) for r in self.biz_records.values())
        self.total_s = sum(r.get("s", 0) for r in self.biz_records.values())
        
        # 다중 사업장 이용 보너스 (시너지 가산)
        biz_count = len([r for r in self.biz_records.values() if r.get("visits", 0) > 0])
        if biz_count >= 2:
            self.total_s += biz_count * 10  # 사업장당 +10점
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "phone": self.phone,
            "name": self.name,
            "archetype": self.archetype.value,
            "archetype_emoji": self.archetype.emoji,
            "archetype_name_kr": self.archetype.name_kr,
            "archetype_color": self.archetype.color,
            "total_m": round(self.total_m, 2),
            "total_t": round(self.total_t, 2),
            "total_s": round(self.total_s, 2),
            "value_score": round(self._value_score, 2),
            "cost_score": round(self._cost_score, 2),
            "first_seen": self.first_seen.isoformat(),
            "last_active": self.last_active.isoformat(),
            "biz_count": len(self.biz_records),
            "decay_applied": self._decay_applied,
        }
    
    @property
    def days_since_last_active(self) -> int:
        """마지막 활동 이후 경과일"""
        return (datetime.now() - self.last_active).days
    
    @property
    def is_multi_biz_user(self) -> bool:
        """다중 사업장 이용자 여부"""
        return len(self.biz_records) >= 2
    
    def __repr__(self) -> str:
        return (
            f"CustomerProfile({self.name}, {self.archetype.emoji} {self.archetype.value}, "
            f"M={self.total_m:.0f}, T={self.total_t:.0f}, S={self.total_s:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """고객 프로필 데모"""
    print("=" * 70)
    print("  👥 AUTUS-TRINITY Customer Archetype Demo")
    print("=" * 70)
    
    # 테스트 고객 생성
    customers = []
    
    # 1. 후원자 (PATRON): 고가치 + 저비용
    patron = CustomerProfile(phone="01011112222", name="김후원")
    patron.add_biz_record("academy", money=80, entropy=5, synergy=30)
    patron.add_biz_record("restaurant", money=40, entropy=3, synergy=20)
    patron.add_biz_record("sports", money=30, entropy=2, synergy=15)
    customers.append(patron)
    
    # 2. 권력자 (TYCOON): 고가치 + 고비용
    tycoon = CustomerProfile(phone="01022223333", name="이권력")
    tycoon.add_biz_record("academy", money=100, entropy=40, synergy=10)
    tycoon.add_biz_record("restaurant", money=50, entropy=30)
    customers.append(tycoon)
    
    # 3. 찐팬 (FAN): 저가치 + 고시너지
    fan = CustomerProfile(phone="01033334444", name="박충성")
    fan.add_biz_record("restaurant", money=20, entropy=5, synergy=60)
    customers.append(fan)
    
    # 4. 흡혈귀 (VAMPIRE): 저가치 + 고비용
    vampire = CustomerProfile(phone="01044445555", name="최진상")
    vampire.add_biz_record("academy", money=10, entropy=80, synergy=0)
    customers.append(vampire)
    
    # 5. 일반 (COMMON)
    common = CustomerProfile(phone="01055556666", name="정보통")
    common.add_biz_record("restaurant", money=30, entropy=10, synergy=10)
    customers.append(common)
    
    print("\n📊 고객 유형 분류 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'M':>8} {'T':>8} {'S':>8} {'가치':>10} {'비용':>10}")
    print("-" * 70)
    
    for c in customers:
        print(
            f"{c.name:<10} "
            f"{c.archetype.emoji} {c.archetype.name_kr:<10} "
            f"{c.total_m:>8.0f} "
            f"{c.total_t:>8.0f} "
            f"{c.total_s:>8.0f} "
            f"{c._value_score:>10.0f} "
            f"{c._cost_score:>10.0f}"
        )
    
    # 시간 반감기 테스트
    print("\n" + "-" * 70)
    print("\n⏳ 시간 반감기(Decay) 테스트:")
    
    old_customer = CustomerProfile(phone="01099999999", name="구고객")
    old_customer.add_biz_record("academy", money=100, entropy=30, synergy=50)
    old_customer.last_active = datetime.now() - timedelta(days=180)  # 6개월 전
    
    print(f"\n  적용 전: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  미활동: {old_customer.days_since_last_active}일")
    
    old_customer.apply_time_decay()
    old_customer.recalculate()
    
    print(f"  적용 후: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  유형 변화: {old_customer.archetype.emoji} {old_customer.archetype.name_kr}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Customer Archetype Model                          ║
║                          고객 DNA - 4대 유형 분류 + 시간 반감기                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

고객 분류 철학:
- PATRON (후원자): 돈도 많이 쓰고, 말도 없고, 주변에 소개까지 함 → 신처럼 모셔라
- TYCOON (권력자): 돈은 많이 쓰지만, 까다로움 → 프로답게 응대
- FAN (찐팬): 돈은 적지만, 충성스럽고 주변에 소문냄 → 정서적 교류
- VAMPIRE (흡혈귀): 돈도 적고, 말도 많고, 에너지 뱀파이어 → 정중히 거리두기
- COMMON (일반): 평범한 고객 → 표준 응대

핵심 변수:
- M (Money): 자본력 - 총 결제액
- T (Time/Entropy): 소모 비용 - 상담, 컴플레인, 시간 낭비
- S (Synergy): 연결성 - 다른 매장 이용, 소개
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    """고객 4대 유형 + 일반"""
    PATRON = "PATRON"       # 💎 후원자 (God-tier)
    TYCOON = "TYCOON"       # 👔 권력자 (VIP)
    FAN = "FAN"             # 💖 찐팬 (Loyal)
    VAMPIRE = "VAMPIRE"     # 🧛 흡혈귀 (Avoid)
    COMMON = "COMMON"       # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "PATRON": "👑",
            "TYCOON": "💼",
            "FAN": "💖",
            "VAMPIRE": "🔇",
            "COMMON": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "PATRON": "후원자",
            "TYCOON": "권력자",
            "FAN": "찐팬",
            "VAMPIRE": "주의",
            "COMMON": "일반"
        }.get(self.value, "일반")
    
    @property
    def color(self) -> str:
        return {
            "PATRON": "GOLD",
            "TYCOON": "NAVY",
            "FAN": "PINK",
            "VAMPIRE": "GREY",
            "COMMON": "WHITE"
        }.get(self.value, "WHITE")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 분류 기준 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ArchetypeThresholds:
    """분류 기준값"""
    
    # 가중치
    WEIGHT_MONEY = 1.0        # M 가중치
    WEIGHT_SYNERGY = 2.0      # S 가중치 (시너지에 2배)
    WEIGHT_ENTROPY = 2.5      # T 페널티 가중치
    
    # 기준값
    HIGH_VALUE_THRESHOLD = 100    # 고가치 고객 기준
    HIGH_COST_THRESHOLD = 80      # 고비용 고객 기준
    HIGH_SYNERGY_THRESHOLD = 50   # 시너지 고객 기준
    
    # 시간 반감기 설정
    DECAY_START_DAYS = 90         # 반감기 시작 (3개월 미활동)
    DECAY_RATE_MONEY = 0.9        # M 감소율 (월 10% 감소)
    DECAY_RATE_SYNERGY = 0.9      # S 감소율
    DECAY_RATE_ENTROPY = 0.8      # T 감소율 (더 빨리 잊혀짐)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerProfile:
    """
    통합 고객 프로필
    
    10개 사업장의 데이터가 합쳐진 Super Node
    """
    
    # 식별자
    phone: str                           # 전화번호 (정규화됨)
    name: str                            # 이름
    
    # 3대 변수 (10개 사업장 합산)
    total_m: float = 0.0                 # Money (총 결제액 환산)
    total_t: float = 0.0                 # Time/Entropy (소모 비용)
    total_s: float = 0.0                 # Synergy (연결성)
    
    # 메타데이터
    archetype: CustomerArchetype = CustomerArchetype.COMMON
    first_seen: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)
    
    # 사업장별 상세
    biz_records: Dict[str, Dict] = field(default_factory=dict)
    # 예: {"academy": {"m": 500000, "t": 20, "visits": 12}, "restaurant": {...}}
    
    # 계산된 값 (캐시)
    _value_score: float = 0.0
    _cost_score: float = 0.0
    _decay_applied: bool = False
    
    def __post_init__(self):
        """초기화 후 처리"""
        self.recalculate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시간 반감기 (Memory Decay)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def apply_time_decay(self) -> "CustomerProfile":
        """
        시간 반감기 적용
        
        - 3개월 이상 미활동 시 점수 감소 시작
        - 매월 M, S: 10% 감소 / T: 20% 감소
        - T(엔트로피)는 빨리 잊혀지는 것이 고객에게 유리
        """
        now = datetime.now()
        days_inactive = (now - self.last_active).days
        
        if days_inactive <= ArchetypeThresholds.DECAY_START_DAYS:
            return self  # 아직 반감기 시작 안 됨
        
        # 미활동 월 수 계산
        months_inactive = (days_inactive - ArchetypeThresholds.DECAY_START_DAYS) // 30
        
        if months_inactive > 0:
            # M (자본력) 감소
            decay_m = ArchetypeThresholds.DECAY_RATE_MONEY ** months_inactive
            self.total_m *= decay_m
            
            # S (시너지) 감소
            decay_s = ArchetypeThresholds.DECAY_RATE_SYNERGY ** months_inactive
            self.total_s *= decay_s
            
            # T (엔트로피) 감소 - 더 빠르게 (용서)
            decay_t = ArchetypeThresholds.DECAY_RATE_ENTROPY ** months_inactive
            self.total_t *= decay_t
            
            # 최소값 보장
            self.total_m = max(0, self.total_m)
            self.total_s = max(0, self.total_s)
            self.total_t = max(0, self.total_t)
            
            self._decay_applied = True
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유형 판정
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def recalculate(self) -> "CustomerProfile":
        """점수 재계산 및 유형 판정"""
        
        # 1. 가치 점수 = M + 2*S
        self._value_score = (
            self.total_m * ArchetypeThresholds.WEIGHT_MONEY +
            self.total_s * ArchetypeThresholds.WEIGHT_SYNERGY
        )
        
        # 2. 비용 점수 = 2.5*T
        self._cost_score = self.total_t * ArchetypeThresholds.WEIGHT_ENTROPY
        
        # 3. 유형 판정
        self.archetype = self._determine_archetype()
        
        return self
    
    def _determine_archetype(self) -> CustomerArchetype:
        """
        유형 판정 로직
        
        Decision Tree:
        1. 고가치(V >= 100)?
           - Yes + 저비용(C < 50) → PATRON (후원자)
           - Yes + 고비용(C >= 50) → TYCOON (권력자)
        2. 고비용(C >= 80)?
           - Yes → VAMPIRE (흡혈귀)
        3. 고시너지(S >= 50)?
           - Yes → FAN (찐팬)
        4. 나머지 → COMMON (일반)
        """
        V = self._value_score
        C = self._cost_score
        S = self.total_s
        
        TH = ArchetypeThresholds
        
        if V >= TH.HIGH_VALUE_THRESHOLD:
            if C < TH.HIGH_COST_THRESHOLD * 0.625:  # 50
                return CustomerArchetype.PATRON
            else:
                return CustomerArchetype.TYCOON
        
        if C >= TH.HIGH_COST_THRESHOLD:
            return CustomerArchetype.VAMPIRE
        
        if S >= TH.HIGH_SYNERGY_THRESHOLD:
            return CustomerArchetype.FAN
        
        return CustomerArchetype.COMMON
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 사업장 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_record(
        self, 
        biz_type: str, 
        money: float = 0, 
        entropy: float = 0, 
        synergy: float = 0,
        **kwargs
    ) -> "CustomerProfile":
        """
        사업장별 데이터 추가
        
        Args:
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            money: 해당 사업장 결제액/가치
            entropy: 해당 사업장 엔트로피 (상담, 컴플레인)
            synergy: 시너지 점수 (다른 매장 소개 등)
        """
        if biz_type not in self.biz_records:
            self.biz_records[biz_type] = {
                "m": 0, "t": 0, "s": 0, 
                "visits": 0, "last_visit": None
            }
        
        record = self.biz_records[biz_type]
        record["m"] += money
        record["t"] += entropy
        record["s"] += synergy
        record["visits"] += 1
        record["last_visit"] = datetime.now()
        record.update(kwargs)
        
        # 합산 업데이트
        self._aggregate_totals()
        self.last_active = datetime.now()
        self.recalculate()
        
        return self
    
    def _aggregate_totals(self):
        """사업장별 데이터 합산"""
        self.total_m = sum(r.get("m", 0) for r in self.biz_records.values())
        self.total_t = sum(r.get("t", 0) for r in self.biz_records.values())
        self.total_s = sum(r.get("s", 0) for r in self.biz_records.values())
        
        # 다중 사업장 이용 보너스 (시너지 가산)
        biz_count = len([r for r in self.biz_records.values() if r.get("visits", 0) > 0])
        if biz_count >= 2:
            self.total_s += biz_count * 10  # 사업장당 +10점
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "phone": self.phone,
            "name": self.name,
            "archetype": self.archetype.value,
            "archetype_emoji": self.archetype.emoji,
            "archetype_name_kr": self.archetype.name_kr,
            "archetype_color": self.archetype.color,
            "total_m": round(self.total_m, 2),
            "total_t": round(self.total_t, 2),
            "total_s": round(self.total_s, 2),
            "value_score": round(self._value_score, 2),
            "cost_score": round(self._cost_score, 2),
            "first_seen": self.first_seen.isoformat(),
            "last_active": self.last_active.isoformat(),
            "biz_count": len(self.biz_records),
            "decay_applied": self._decay_applied,
        }
    
    @property
    def days_since_last_active(self) -> int:
        """마지막 활동 이후 경과일"""
        return (datetime.now() - self.last_active).days
    
    @property
    def is_multi_biz_user(self) -> bool:
        """다중 사업장 이용자 여부"""
        return len(self.biz_records) >= 2
    
    def __repr__(self) -> str:
        return (
            f"CustomerProfile({self.name}, {self.archetype.emoji} {self.archetype.value}, "
            f"M={self.total_m:.0f}, T={self.total_t:.0f}, S={self.total_s:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """고객 프로필 데모"""
    print("=" * 70)
    print("  👥 AUTUS-TRINITY Customer Archetype Demo")
    print("=" * 70)
    
    # 테스트 고객 생성
    customers = []
    
    # 1. 후원자 (PATRON): 고가치 + 저비용
    patron = CustomerProfile(phone="01011112222", name="김후원")
    patron.add_biz_record("academy", money=80, entropy=5, synergy=30)
    patron.add_biz_record("restaurant", money=40, entropy=3, synergy=20)
    patron.add_biz_record("sports", money=30, entropy=2, synergy=15)
    customers.append(patron)
    
    # 2. 권력자 (TYCOON): 고가치 + 고비용
    tycoon = CustomerProfile(phone="01022223333", name="이권력")
    tycoon.add_biz_record("academy", money=100, entropy=40, synergy=10)
    tycoon.add_biz_record("restaurant", money=50, entropy=30)
    customers.append(tycoon)
    
    # 3. 찐팬 (FAN): 저가치 + 고시너지
    fan = CustomerProfile(phone="01033334444", name="박충성")
    fan.add_biz_record("restaurant", money=20, entropy=5, synergy=60)
    customers.append(fan)
    
    # 4. 흡혈귀 (VAMPIRE): 저가치 + 고비용
    vampire = CustomerProfile(phone="01044445555", name="최진상")
    vampire.add_biz_record("academy", money=10, entropy=80, synergy=0)
    customers.append(vampire)
    
    # 5. 일반 (COMMON)
    common = CustomerProfile(phone="01055556666", name="정보통")
    common.add_biz_record("restaurant", money=30, entropy=10, synergy=10)
    customers.append(common)
    
    print("\n📊 고객 유형 분류 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'M':>8} {'T':>8} {'S':>8} {'가치':>10} {'비용':>10}")
    print("-" * 70)
    
    for c in customers:
        print(
            f"{c.name:<10} "
            f"{c.archetype.emoji} {c.archetype.name_kr:<10} "
            f"{c.total_m:>8.0f} "
            f"{c.total_t:>8.0f} "
            f"{c.total_s:>8.0f} "
            f"{c._value_score:>10.0f} "
            f"{c._cost_score:>10.0f}"
        )
    
    # 시간 반감기 테스트
    print("\n" + "-" * 70)
    print("\n⏳ 시간 반감기(Decay) 테스트:")
    
    old_customer = CustomerProfile(phone="01099999999", name="구고객")
    old_customer.add_biz_record("academy", money=100, entropy=30, synergy=50)
    old_customer.last_active = datetime.now() - timedelta(days=180)  # 6개월 전
    
    print(f"\n  적용 전: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  미활동: {old_customer.days_since_last_active}일")
    
    old_customer.apply_time_decay()
    old_customer.recalculate()
    
    print(f"  적용 후: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  유형 변화: {old_customer.archetype.emoji} {old_customer.archetype.name_kr}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Customer Archetype Model                          ║
║                          고객 DNA - 4대 유형 분류 + 시간 반감기                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

고객 분류 철학:
- PATRON (후원자): 돈도 많이 쓰고, 말도 없고, 주변에 소개까지 함 → 신처럼 모셔라
- TYCOON (권력자): 돈은 많이 쓰지만, 까다로움 → 프로답게 응대
- FAN (찐팬): 돈은 적지만, 충성스럽고 주변에 소문냄 → 정서적 교류
- VAMPIRE (흡혈귀): 돈도 적고, 말도 많고, 에너지 뱀파이어 → 정중히 거리두기
- COMMON (일반): 평범한 고객 → 표준 응대

핵심 변수:
- M (Money): 자본력 - 총 결제액
- T (Time/Entropy): 소모 비용 - 상담, 컴플레인, 시간 낭비
- S (Synergy): 연결성 - 다른 매장 이용, 소개
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    """고객 4대 유형 + 일반"""
    PATRON = "PATRON"       # 💎 후원자 (God-tier)
    TYCOON = "TYCOON"       # 👔 권력자 (VIP)
    FAN = "FAN"             # 💖 찐팬 (Loyal)
    VAMPIRE = "VAMPIRE"     # 🧛 흡혈귀 (Avoid)
    COMMON = "COMMON"       # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "PATRON": "👑",
            "TYCOON": "💼",
            "FAN": "💖",
            "VAMPIRE": "🔇",
            "COMMON": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "PATRON": "후원자",
            "TYCOON": "권력자",
            "FAN": "찐팬",
            "VAMPIRE": "주의",
            "COMMON": "일반"
        }.get(self.value, "일반")
    
    @property
    def color(self) -> str:
        return {
            "PATRON": "GOLD",
            "TYCOON": "NAVY",
            "FAN": "PINK",
            "VAMPIRE": "GREY",
            "COMMON": "WHITE"
        }.get(self.value, "WHITE")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 분류 기준 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ArchetypeThresholds:
    """분류 기준값"""
    
    # 가중치
    WEIGHT_MONEY = 1.0        # M 가중치
    WEIGHT_SYNERGY = 2.0      # S 가중치 (시너지에 2배)
    WEIGHT_ENTROPY = 2.5      # T 페널티 가중치
    
    # 기준값
    HIGH_VALUE_THRESHOLD = 100    # 고가치 고객 기준
    HIGH_COST_THRESHOLD = 80      # 고비용 고객 기준
    HIGH_SYNERGY_THRESHOLD = 50   # 시너지 고객 기준
    
    # 시간 반감기 설정
    DECAY_START_DAYS = 90         # 반감기 시작 (3개월 미활동)
    DECAY_RATE_MONEY = 0.9        # M 감소율 (월 10% 감소)
    DECAY_RATE_SYNERGY = 0.9      # S 감소율
    DECAY_RATE_ENTROPY = 0.8      # T 감소율 (더 빨리 잊혀짐)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerProfile:
    """
    통합 고객 프로필
    
    10개 사업장의 데이터가 합쳐진 Super Node
    """
    
    # 식별자
    phone: str                           # 전화번호 (정규화됨)
    name: str                            # 이름
    
    # 3대 변수 (10개 사업장 합산)
    total_m: float = 0.0                 # Money (총 결제액 환산)
    total_t: float = 0.0                 # Time/Entropy (소모 비용)
    total_s: float = 0.0                 # Synergy (연결성)
    
    # 메타데이터
    archetype: CustomerArchetype = CustomerArchetype.COMMON
    first_seen: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)
    
    # 사업장별 상세
    biz_records: Dict[str, Dict] = field(default_factory=dict)
    # 예: {"academy": {"m": 500000, "t": 20, "visits": 12}, "restaurant": {...}}
    
    # 계산된 값 (캐시)
    _value_score: float = 0.0
    _cost_score: float = 0.0
    _decay_applied: bool = False
    
    def __post_init__(self):
        """초기화 후 처리"""
        self.recalculate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시간 반감기 (Memory Decay)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def apply_time_decay(self) -> "CustomerProfile":
        """
        시간 반감기 적용
        
        - 3개월 이상 미활동 시 점수 감소 시작
        - 매월 M, S: 10% 감소 / T: 20% 감소
        - T(엔트로피)는 빨리 잊혀지는 것이 고객에게 유리
        """
        now = datetime.now()
        days_inactive = (now - self.last_active).days
        
        if days_inactive <= ArchetypeThresholds.DECAY_START_DAYS:
            return self  # 아직 반감기 시작 안 됨
        
        # 미활동 월 수 계산
        months_inactive = (days_inactive - ArchetypeThresholds.DECAY_START_DAYS) // 30
        
        if months_inactive > 0:
            # M (자본력) 감소
            decay_m = ArchetypeThresholds.DECAY_RATE_MONEY ** months_inactive
            self.total_m *= decay_m
            
            # S (시너지) 감소
            decay_s = ArchetypeThresholds.DECAY_RATE_SYNERGY ** months_inactive
            self.total_s *= decay_s
            
            # T (엔트로피) 감소 - 더 빠르게 (용서)
            decay_t = ArchetypeThresholds.DECAY_RATE_ENTROPY ** months_inactive
            self.total_t *= decay_t
            
            # 최소값 보장
            self.total_m = max(0, self.total_m)
            self.total_s = max(0, self.total_s)
            self.total_t = max(0, self.total_t)
            
            self._decay_applied = True
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유형 판정
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def recalculate(self) -> "CustomerProfile":
        """점수 재계산 및 유형 판정"""
        
        # 1. 가치 점수 = M + 2*S
        self._value_score = (
            self.total_m * ArchetypeThresholds.WEIGHT_MONEY +
            self.total_s * ArchetypeThresholds.WEIGHT_SYNERGY
        )
        
        # 2. 비용 점수 = 2.5*T
        self._cost_score = self.total_t * ArchetypeThresholds.WEIGHT_ENTROPY
        
        # 3. 유형 판정
        self.archetype = self._determine_archetype()
        
        return self
    
    def _determine_archetype(self) -> CustomerArchetype:
        """
        유형 판정 로직
        
        Decision Tree:
        1. 고가치(V >= 100)?
           - Yes + 저비용(C < 50) → PATRON (후원자)
           - Yes + 고비용(C >= 50) → TYCOON (권력자)
        2. 고비용(C >= 80)?
           - Yes → VAMPIRE (흡혈귀)
        3. 고시너지(S >= 50)?
           - Yes → FAN (찐팬)
        4. 나머지 → COMMON (일반)
        """
        V = self._value_score
        C = self._cost_score
        S = self.total_s
        
        TH = ArchetypeThresholds
        
        if V >= TH.HIGH_VALUE_THRESHOLD:
            if C < TH.HIGH_COST_THRESHOLD * 0.625:  # 50
                return CustomerArchetype.PATRON
            else:
                return CustomerArchetype.TYCOON
        
        if C >= TH.HIGH_COST_THRESHOLD:
            return CustomerArchetype.VAMPIRE
        
        if S >= TH.HIGH_SYNERGY_THRESHOLD:
            return CustomerArchetype.FAN
        
        return CustomerArchetype.COMMON
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 사업장 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_record(
        self, 
        biz_type: str, 
        money: float = 0, 
        entropy: float = 0, 
        synergy: float = 0,
        **kwargs
    ) -> "CustomerProfile":
        """
        사업장별 데이터 추가
        
        Args:
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            money: 해당 사업장 결제액/가치
            entropy: 해당 사업장 엔트로피 (상담, 컴플레인)
            synergy: 시너지 점수 (다른 매장 소개 등)
        """
        if biz_type not in self.biz_records:
            self.biz_records[biz_type] = {
                "m": 0, "t": 0, "s": 0, 
                "visits": 0, "last_visit": None
            }
        
        record = self.biz_records[biz_type]
        record["m"] += money
        record["t"] += entropy
        record["s"] += synergy
        record["visits"] += 1
        record["last_visit"] = datetime.now()
        record.update(kwargs)
        
        # 합산 업데이트
        self._aggregate_totals()
        self.last_active = datetime.now()
        self.recalculate()
        
        return self
    
    def _aggregate_totals(self):
        """사업장별 데이터 합산"""
        self.total_m = sum(r.get("m", 0) for r in self.biz_records.values())
        self.total_t = sum(r.get("t", 0) for r in self.biz_records.values())
        self.total_s = sum(r.get("s", 0) for r in self.biz_records.values())
        
        # 다중 사업장 이용 보너스 (시너지 가산)
        biz_count = len([r for r in self.biz_records.values() if r.get("visits", 0) > 0])
        if biz_count >= 2:
            self.total_s += biz_count * 10  # 사업장당 +10점
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "phone": self.phone,
            "name": self.name,
            "archetype": self.archetype.value,
            "archetype_emoji": self.archetype.emoji,
            "archetype_name_kr": self.archetype.name_kr,
            "archetype_color": self.archetype.color,
            "total_m": round(self.total_m, 2),
            "total_t": round(self.total_t, 2),
            "total_s": round(self.total_s, 2),
            "value_score": round(self._value_score, 2),
            "cost_score": round(self._cost_score, 2),
            "first_seen": self.first_seen.isoformat(),
            "last_active": self.last_active.isoformat(),
            "biz_count": len(self.biz_records),
            "decay_applied": self._decay_applied,
        }
    
    @property
    def days_since_last_active(self) -> int:
        """마지막 활동 이후 경과일"""
        return (datetime.now() - self.last_active).days
    
    @property
    def is_multi_biz_user(self) -> bool:
        """다중 사업장 이용자 여부"""
        return len(self.biz_records) >= 2
    
    def __repr__(self) -> str:
        return (
            f"CustomerProfile({self.name}, {self.archetype.emoji} {self.archetype.value}, "
            f"M={self.total_m:.0f}, T={self.total_t:.0f}, S={self.total_s:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """고객 프로필 데모"""
    print("=" * 70)
    print("  👥 AUTUS-TRINITY Customer Archetype Demo")
    print("=" * 70)
    
    # 테스트 고객 생성
    customers = []
    
    # 1. 후원자 (PATRON): 고가치 + 저비용
    patron = CustomerProfile(phone="01011112222", name="김후원")
    patron.add_biz_record("academy", money=80, entropy=5, synergy=30)
    patron.add_biz_record("restaurant", money=40, entropy=3, synergy=20)
    patron.add_biz_record("sports", money=30, entropy=2, synergy=15)
    customers.append(patron)
    
    # 2. 권력자 (TYCOON): 고가치 + 고비용
    tycoon = CustomerProfile(phone="01022223333", name="이권력")
    tycoon.add_biz_record("academy", money=100, entropy=40, synergy=10)
    tycoon.add_biz_record("restaurant", money=50, entropy=30)
    customers.append(tycoon)
    
    # 3. 찐팬 (FAN): 저가치 + 고시너지
    fan = CustomerProfile(phone="01033334444", name="박충성")
    fan.add_biz_record("restaurant", money=20, entropy=5, synergy=60)
    customers.append(fan)
    
    # 4. 흡혈귀 (VAMPIRE): 저가치 + 고비용
    vampire = CustomerProfile(phone="01044445555", name="최진상")
    vampire.add_biz_record("academy", money=10, entropy=80, synergy=0)
    customers.append(vampire)
    
    # 5. 일반 (COMMON)
    common = CustomerProfile(phone="01055556666", name="정보통")
    common.add_biz_record("restaurant", money=30, entropy=10, synergy=10)
    customers.append(common)
    
    print("\n📊 고객 유형 분류 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'M':>8} {'T':>8} {'S':>8} {'가치':>10} {'비용':>10}")
    print("-" * 70)
    
    for c in customers:
        print(
            f"{c.name:<10} "
            f"{c.archetype.emoji} {c.archetype.name_kr:<10} "
            f"{c.total_m:>8.0f} "
            f"{c.total_t:>8.0f} "
            f"{c.total_s:>8.0f} "
            f"{c._value_score:>10.0f} "
            f"{c._cost_score:>10.0f}"
        )
    
    # 시간 반감기 테스트
    print("\n" + "-" * 70)
    print("\n⏳ 시간 반감기(Decay) 테스트:")
    
    old_customer = CustomerProfile(phone="01099999999", name="구고객")
    old_customer.add_biz_record("academy", money=100, entropy=30, synergy=50)
    old_customer.last_active = datetime.now() - timedelta(days=180)  # 6개월 전
    
    print(f"\n  적용 전: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  미활동: {old_customer.days_since_last_active}일")
    
    old_customer.apply_time_decay()
    old_customer.recalculate()
    
    print(f"  적용 후: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  유형 변화: {old_customer.archetype.emoji} {old_customer.archetype.name_kr}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Customer Archetype Model                          ║
║                          고객 DNA - 4대 유형 분류 + 시간 반감기                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

고객 분류 철학:
- PATRON (후원자): 돈도 많이 쓰고, 말도 없고, 주변에 소개까지 함 → 신처럼 모셔라
- TYCOON (권력자): 돈은 많이 쓰지만, 까다로움 → 프로답게 응대
- FAN (찐팬): 돈은 적지만, 충성스럽고 주변에 소문냄 → 정서적 교류
- VAMPIRE (흡혈귀): 돈도 적고, 말도 많고, 에너지 뱀파이어 → 정중히 거리두기
- COMMON (일반): 평범한 고객 → 표준 응대

핵심 변수:
- M (Money): 자본력 - 총 결제액
- T (Time/Entropy): 소모 비용 - 상담, 컴플레인, 시간 낭비
- S (Synergy): 연결성 - 다른 매장 이용, 소개
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    """고객 4대 유형 + 일반"""
    PATRON = "PATRON"       # 💎 후원자 (God-tier)
    TYCOON = "TYCOON"       # 👔 권력자 (VIP)
    FAN = "FAN"             # 💖 찐팬 (Loyal)
    VAMPIRE = "VAMPIRE"     # 🧛 흡혈귀 (Avoid)
    COMMON = "COMMON"       # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "PATRON": "👑",
            "TYCOON": "💼",
            "FAN": "💖",
            "VAMPIRE": "🔇",
            "COMMON": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "PATRON": "후원자",
            "TYCOON": "권력자",
            "FAN": "찐팬",
            "VAMPIRE": "주의",
            "COMMON": "일반"
        }.get(self.value, "일반")
    
    @property
    def color(self) -> str:
        return {
            "PATRON": "GOLD",
            "TYCOON": "NAVY",
            "FAN": "PINK",
            "VAMPIRE": "GREY",
            "COMMON": "WHITE"
        }.get(self.value, "WHITE")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 분류 기준 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ArchetypeThresholds:
    """분류 기준값"""
    
    # 가중치
    WEIGHT_MONEY = 1.0        # M 가중치
    WEIGHT_SYNERGY = 2.0      # S 가중치 (시너지에 2배)
    WEIGHT_ENTROPY = 2.5      # T 페널티 가중치
    
    # 기준값
    HIGH_VALUE_THRESHOLD = 100    # 고가치 고객 기준
    HIGH_COST_THRESHOLD = 80      # 고비용 고객 기준
    HIGH_SYNERGY_THRESHOLD = 50   # 시너지 고객 기준
    
    # 시간 반감기 설정
    DECAY_START_DAYS = 90         # 반감기 시작 (3개월 미활동)
    DECAY_RATE_MONEY = 0.9        # M 감소율 (월 10% 감소)
    DECAY_RATE_SYNERGY = 0.9      # S 감소율
    DECAY_RATE_ENTROPY = 0.8      # T 감소율 (더 빨리 잊혀짐)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerProfile:
    """
    통합 고객 프로필
    
    10개 사업장의 데이터가 합쳐진 Super Node
    """
    
    # 식별자
    phone: str                           # 전화번호 (정규화됨)
    name: str                            # 이름
    
    # 3대 변수 (10개 사업장 합산)
    total_m: float = 0.0                 # Money (총 결제액 환산)
    total_t: float = 0.0                 # Time/Entropy (소모 비용)
    total_s: float = 0.0                 # Synergy (연결성)
    
    # 메타데이터
    archetype: CustomerArchetype = CustomerArchetype.COMMON
    first_seen: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)
    
    # 사업장별 상세
    biz_records: Dict[str, Dict] = field(default_factory=dict)
    # 예: {"academy": {"m": 500000, "t": 20, "visits": 12}, "restaurant": {...}}
    
    # 계산된 값 (캐시)
    _value_score: float = 0.0
    _cost_score: float = 0.0
    _decay_applied: bool = False
    
    def __post_init__(self):
        """초기화 후 처리"""
        self.recalculate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시간 반감기 (Memory Decay)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def apply_time_decay(self) -> "CustomerProfile":
        """
        시간 반감기 적용
        
        - 3개월 이상 미활동 시 점수 감소 시작
        - 매월 M, S: 10% 감소 / T: 20% 감소
        - T(엔트로피)는 빨리 잊혀지는 것이 고객에게 유리
        """
        now = datetime.now()
        days_inactive = (now - self.last_active).days
        
        if days_inactive <= ArchetypeThresholds.DECAY_START_DAYS:
            return self  # 아직 반감기 시작 안 됨
        
        # 미활동 월 수 계산
        months_inactive = (days_inactive - ArchetypeThresholds.DECAY_START_DAYS) // 30
        
        if months_inactive > 0:
            # M (자본력) 감소
            decay_m = ArchetypeThresholds.DECAY_RATE_MONEY ** months_inactive
            self.total_m *= decay_m
            
            # S (시너지) 감소
            decay_s = ArchetypeThresholds.DECAY_RATE_SYNERGY ** months_inactive
            self.total_s *= decay_s
            
            # T (엔트로피) 감소 - 더 빠르게 (용서)
            decay_t = ArchetypeThresholds.DECAY_RATE_ENTROPY ** months_inactive
            self.total_t *= decay_t
            
            # 최소값 보장
            self.total_m = max(0, self.total_m)
            self.total_s = max(0, self.total_s)
            self.total_t = max(0, self.total_t)
            
            self._decay_applied = True
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유형 판정
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def recalculate(self) -> "CustomerProfile":
        """점수 재계산 및 유형 판정"""
        
        # 1. 가치 점수 = M + 2*S
        self._value_score = (
            self.total_m * ArchetypeThresholds.WEIGHT_MONEY +
            self.total_s * ArchetypeThresholds.WEIGHT_SYNERGY
        )
        
        # 2. 비용 점수 = 2.5*T
        self._cost_score = self.total_t * ArchetypeThresholds.WEIGHT_ENTROPY
        
        # 3. 유형 판정
        self.archetype = self._determine_archetype()
        
        return self
    
    def _determine_archetype(self) -> CustomerArchetype:
        """
        유형 판정 로직
        
        Decision Tree:
        1. 고가치(V >= 100)?
           - Yes + 저비용(C < 50) → PATRON (후원자)
           - Yes + 고비용(C >= 50) → TYCOON (권력자)
        2. 고비용(C >= 80)?
           - Yes → VAMPIRE (흡혈귀)
        3. 고시너지(S >= 50)?
           - Yes → FAN (찐팬)
        4. 나머지 → COMMON (일반)
        """
        V = self._value_score
        C = self._cost_score
        S = self.total_s
        
        TH = ArchetypeThresholds
        
        if V >= TH.HIGH_VALUE_THRESHOLD:
            if C < TH.HIGH_COST_THRESHOLD * 0.625:  # 50
                return CustomerArchetype.PATRON
            else:
                return CustomerArchetype.TYCOON
        
        if C >= TH.HIGH_COST_THRESHOLD:
            return CustomerArchetype.VAMPIRE
        
        if S >= TH.HIGH_SYNERGY_THRESHOLD:
            return CustomerArchetype.FAN
        
        return CustomerArchetype.COMMON
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 사업장 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_record(
        self, 
        biz_type: str, 
        money: float = 0, 
        entropy: float = 0, 
        synergy: float = 0,
        **kwargs
    ) -> "CustomerProfile":
        """
        사업장별 데이터 추가
        
        Args:
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            money: 해당 사업장 결제액/가치
            entropy: 해당 사업장 엔트로피 (상담, 컴플레인)
            synergy: 시너지 점수 (다른 매장 소개 등)
        """
        if biz_type not in self.biz_records:
            self.biz_records[biz_type] = {
                "m": 0, "t": 0, "s": 0, 
                "visits": 0, "last_visit": None
            }
        
        record = self.biz_records[biz_type]
        record["m"] += money
        record["t"] += entropy
        record["s"] += synergy
        record["visits"] += 1
        record["last_visit"] = datetime.now()
        record.update(kwargs)
        
        # 합산 업데이트
        self._aggregate_totals()
        self.last_active = datetime.now()
        self.recalculate()
        
        return self
    
    def _aggregate_totals(self):
        """사업장별 데이터 합산"""
        self.total_m = sum(r.get("m", 0) for r in self.biz_records.values())
        self.total_t = sum(r.get("t", 0) for r in self.biz_records.values())
        self.total_s = sum(r.get("s", 0) for r in self.biz_records.values())
        
        # 다중 사업장 이용 보너스 (시너지 가산)
        biz_count = len([r for r in self.biz_records.values() if r.get("visits", 0) > 0])
        if biz_count >= 2:
            self.total_s += biz_count * 10  # 사업장당 +10점
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "phone": self.phone,
            "name": self.name,
            "archetype": self.archetype.value,
            "archetype_emoji": self.archetype.emoji,
            "archetype_name_kr": self.archetype.name_kr,
            "archetype_color": self.archetype.color,
            "total_m": round(self.total_m, 2),
            "total_t": round(self.total_t, 2),
            "total_s": round(self.total_s, 2),
            "value_score": round(self._value_score, 2),
            "cost_score": round(self._cost_score, 2),
            "first_seen": self.first_seen.isoformat(),
            "last_active": self.last_active.isoformat(),
            "biz_count": len(self.biz_records),
            "decay_applied": self._decay_applied,
        }
    
    @property
    def days_since_last_active(self) -> int:
        """마지막 활동 이후 경과일"""
        return (datetime.now() - self.last_active).days
    
    @property
    def is_multi_biz_user(self) -> bool:
        """다중 사업장 이용자 여부"""
        return len(self.biz_records) >= 2
    
    def __repr__(self) -> str:
        return (
            f"CustomerProfile({self.name}, {self.archetype.emoji} {self.archetype.value}, "
            f"M={self.total_m:.0f}, T={self.total_t:.0f}, S={self.total_s:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """고객 프로필 데모"""
    print("=" * 70)
    print("  👥 AUTUS-TRINITY Customer Archetype Demo")
    print("=" * 70)
    
    # 테스트 고객 생성
    customers = []
    
    # 1. 후원자 (PATRON): 고가치 + 저비용
    patron = CustomerProfile(phone="01011112222", name="김후원")
    patron.add_biz_record("academy", money=80, entropy=5, synergy=30)
    patron.add_biz_record("restaurant", money=40, entropy=3, synergy=20)
    patron.add_biz_record("sports", money=30, entropy=2, synergy=15)
    customers.append(patron)
    
    # 2. 권력자 (TYCOON): 고가치 + 고비용
    tycoon = CustomerProfile(phone="01022223333", name="이권력")
    tycoon.add_biz_record("academy", money=100, entropy=40, synergy=10)
    tycoon.add_biz_record("restaurant", money=50, entropy=30)
    customers.append(tycoon)
    
    # 3. 찐팬 (FAN): 저가치 + 고시너지
    fan = CustomerProfile(phone="01033334444", name="박충성")
    fan.add_biz_record("restaurant", money=20, entropy=5, synergy=60)
    customers.append(fan)
    
    # 4. 흡혈귀 (VAMPIRE): 저가치 + 고비용
    vampire = CustomerProfile(phone="01044445555", name="최진상")
    vampire.add_biz_record("academy", money=10, entropy=80, synergy=0)
    customers.append(vampire)
    
    # 5. 일반 (COMMON)
    common = CustomerProfile(phone="01055556666", name="정보통")
    common.add_biz_record("restaurant", money=30, entropy=10, synergy=10)
    customers.append(common)
    
    print("\n📊 고객 유형 분류 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'M':>8} {'T':>8} {'S':>8} {'가치':>10} {'비용':>10}")
    print("-" * 70)
    
    for c in customers:
        print(
            f"{c.name:<10} "
            f"{c.archetype.emoji} {c.archetype.name_kr:<10} "
            f"{c.total_m:>8.0f} "
            f"{c.total_t:>8.0f} "
            f"{c.total_s:>8.0f} "
            f"{c._value_score:>10.0f} "
            f"{c._cost_score:>10.0f}"
        )
    
    # 시간 반감기 테스트
    print("\n" + "-" * 70)
    print("\n⏳ 시간 반감기(Decay) 테스트:")
    
    old_customer = CustomerProfile(phone="01099999999", name="구고객")
    old_customer.add_biz_record("academy", money=100, entropy=30, synergy=50)
    old_customer.last_active = datetime.now() - timedelta(days=180)  # 6개월 전
    
    print(f"\n  적용 전: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  미활동: {old_customer.days_since_last_active}일")
    
    old_customer.apply_time_decay()
    old_customer.recalculate()
    
    print(f"  적용 후: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  유형 변화: {old_customer.archetype.emoji} {old_customer.archetype.name_kr}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Customer Archetype Model                          ║
║                          고객 DNA - 4대 유형 분류 + 시간 반감기                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

고객 분류 철학:
- PATRON (후원자): 돈도 많이 쓰고, 말도 없고, 주변에 소개까지 함 → 신처럼 모셔라
- TYCOON (권력자): 돈은 많이 쓰지만, 까다로움 → 프로답게 응대
- FAN (찐팬): 돈은 적지만, 충성스럽고 주변에 소문냄 → 정서적 교류
- VAMPIRE (흡혈귀): 돈도 적고, 말도 많고, 에너지 뱀파이어 → 정중히 거리두기
- COMMON (일반): 평범한 고객 → 표준 응대

핵심 변수:
- M (Money): 자본력 - 총 결제액
- T (Time/Entropy): 소모 비용 - 상담, 컴플레인, 시간 낭비
- S (Synergy): 연결성 - 다른 매장 이용, 소개
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import math


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    """고객 4대 유형 + 일반"""
    PATRON = "PATRON"       # 💎 후원자 (God-tier)
    TYCOON = "TYCOON"       # 👔 권력자 (VIP)
    FAN = "FAN"             # 💖 찐팬 (Loyal)
    VAMPIRE = "VAMPIRE"     # 🧛 흡혈귀 (Avoid)
    COMMON = "COMMON"       # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "PATRON": "👑",
            "TYCOON": "💼",
            "FAN": "💖",
            "VAMPIRE": "🔇",
            "COMMON": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "PATRON": "후원자",
            "TYCOON": "권력자",
            "FAN": "찐팬",
            "VAMPIRE": "주의",
            "COMMON": "일반"
        }.get(self.value, "일반")
    
    @property
    def color(self) -> str:
        return {
            "PATRON": "GOLD",
            "TYCOON": "NAVY",
            "FAN": "PINK",
            "VAMPIRE": "GREY",
            "COMMON": "WHITE"
        }.get(self.value, "WHITE")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 분류 기준 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ArchetypeThresholds:
    """분류 기준값"""
    
    # 가중치
    WEIGHT_MONEY = 1.0        # M 가중치
    WEIGHT_SYNERGY = 2.0      # S 가중치 (시너지에 2배)
    WEIGHT_ENTROPY = 2.5      # T 페널티 가중치
    
    # 기준값
    HIGH_VALUE_THRESHOLD = 100    # 고가치 고객 기준
    HIGH_COST_THRESHOLD = 80      # 고비용 고객 기준
    HIGH_SYNERGY_THRESHOLD = 50   # 시너지 고객 기준
    
    # 시간 반감기 설정
    DECAY_START_DAYS = 90         # 반감기 시작 (3개월 미활동)
    DECAY_RATE_MONEY = 0.9        # M 감소율 (월 10% 감소)
    DECAY_RATE_SYNERGY = 0.9      # S 감소율
    DECAY_RATE_ENTROPY = 0.8      # T 감소율 (더 빨리 잊혀짐)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class CustomerProfile:
    """
    통합 고객 프로필
    
    10개 사업장의 데이터가 합쳐진 Super Node
    """
    
    # 식별자
    phone: str                           # 전화번호 (정규화됨)
    name: str                            # 이름
    
    # 3대 변수 (10개 사업장 합산)
    total_m: float = 0.0                 # Money (총 결제액 환산)
    total_t: float = 0.0                 # Time/Entropy (소모 비용)
    total_s: float = 0.0                 # Synergy (연결성)
    
    # 메타데이터
    archetype: CustomerArchetype = CustomerArchetype.COMMON
    first_seen: datetime = field(default_factory=datetime.now)
    last_active: datetime = field(default_factory=datetime.now)
    
    # 사업장별 상세
    biz_records: Dict[str, Dict] = field(default_factory=dict)
    # 예: {"academy": {"m": 500000, "t": 20, "visits": 12}, "restaurant": {...}}
    
    # 계산된 값 (캐시)
    _value_score: float = 0.0
    _cost_score: float = 0.0
    _decay_applied: bool = False
    
    def __post_init__(self):
        """초기화 후 처리"""
        self.recalculate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시간 반감기 (Memory Decay)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def apply_time_decay(self) -> "CustomerProfile":
        """
        시간 반감기 적용
        
        - 3개월 이상 미활동 시 점수 감소 시작
        - 매월 M, S: 10% 감소 / T: 20% 감소
        - T(엔트로피)는 빨리 잊혀지는 것이 고객에게 유리
        """
        now = datetime.now()
        days_inactive = (now - self.last_active).days
        
        if days_inactive <= ArchetypeThresholds.DECAY_START_DAYS:
            return self  # 아직 반감기 시작 안 됨
        
        # 미활동 월 수 계산
        months_inactive = (days_inactive - ArchetypeThresholds.DECAY_START_DAYS) // 30
        
        if months_inactive > 0:
            # M (자본력) 감소
            decay_m = ArchetypeThresholds.DECAY_RATE_MONEY ** months_inactive
            self.total_m *= decay_m
            
            # S (시너지) 감소
            decay_s = ArchetypeThresholds.DECAY_RATE_SYNERGY ** months_inactive
            self.total_s *= decay_s
            
            # T (엔트로피) 감소 - 더 빠르게 (용서)
            decay_t = ArchetypeThresholds.DECAY_RATE_ENTROPY ** months_inactive
            self.total_t *= decay_t
            
            # 최소값 보장
            self.total_m = max(0, self.total_m)
            self.total_s = max(0, self.total_s)
            self.total_t = max(0, self.total_t)
            
            self._decay_applied = True
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유형 판정
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def recalculate(self) -> "CustomerProfile":
        """점수 재계산 및 유형 판정"""
        
        # 1. 가치 점수 = M + 2*S
        self._value_score = (
            self.total_m * ArchetypeThresholds.WEIGHT_MONEY +
            self.total_s * ArchetypeThresholds.WEIGHT_SYNERGY
        )
        
        # 2. 비용 점수 = 2.5*T
        self._cost_score = self.total_t * ArchetypeThresholds.WEIGHT_ENTROPY
        
        # 3. 유형 판정
        self.archetype = self._determine_archetype()
        
        return self
    
    def _determine_archetype(self) -> CustomerArchetype:
        """
        유형 판정 로직
        
        Decision Tree:
        1. 고가치(V >= 100)?
           - Yes + 저비용(C < 50) → PATRON (후원자)
           - Yes + 고비용(C >= 50) → TYCOON (권력자)
        2. 고비용(C >= 80)?
           - Yes → VAMPIRE (흡혈귀)
        3. 고시너지(S >= 50)?
           - Yes → FAN (찐팬)
        4. 나머지 → COMMON (일반)
        """
        V = self._value_score
        C = self._cost_score
        S = self.total_s
        
        TH = ArchetypeThresholds
        
        if V >= TH.HIGH_VALUE_THRESHOLD:
            if C < TH.HIGH_COST_THRESHOLD * 0.625:  # 50
                return CustomerArchetype.PATRON
            else:
                return CustomerArchetype.TYCOON
        
        if C >= TH.HIGH_COST_THRESHOLD:
            return CustomerArchetype.VAMPIRE
        
        if S >= TH.HIGH_SYNERGY_THRESHOLD:
            return CustomerArchetype.FAN
        
        return CustomerArchetype.COMMON
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 사업장 데이터 관리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def add_biz_record(
        self, 
        biz_type: str, 
        money: float = 0, 
        entropy: float = 0, 
        synergy: float = 0,
        **kwargs
    ) -> "CustomerProfile":
        """
        사업장별 데이터 추가
        
        Args:
            biz_type: 사업 유형 (academy, restaurant, sports 등)
            money: 해당 사업장 결제액/가치
            entropy: 해당 사업장 엔트로피 (상담, 컴플레인)
            synergy: 시너지 점수 (다른 매장 소개 등)
        """
        if biz_type not in self.biz_records:
            self.biz_records[biz_type] = {
                "m": 0, "t": 0, "s": 0, 
                "visits": 0, "last_visit": None
            }
        
        record = self.biz_records[biz_type]
        record["m"] += money
        record["t"] += entropy
        record["s"] += synergy
        record["visits"] += 1
        record["last_visit"] = datetime.now()
        record.update(kwargs)
        
        # 합산 업데이트
        self._aggregate_totals()
        self.last_active = datetime.now()
        self.recalculate()
        
        return self
    
    def _aggregate_totals(self):
        """사업장별 데이터 합산"""
        self.total_m = sum(r.get("m", 0) for r in self.biz_records.values())
        self.total_t = sum(r.get("t", 0) for r in self.biz_records.values())
        self.total_s = sum(r.get("s", 0) for r in self.biz_records.values())
        
        # 다중 사업장 이용 보너스 (시너지 가산)
        biz_count = len([r for r in self.biz_records.values() if r.get("visits", 0) > 0])
        if biz_count >= 2:
            self.total_s += biz_count * 10  # 사업장당 +10점
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "phone": self.phone,
            "name": self.name,
            "archetype": self.archetype.value,
            "archetype_emoji": self.archetype.emoji,
            "archetype_name_kr": self.archetype.name_kr,
            "archetype_color": self.archetype.color,
            "total_m": round(self.total_m, 2),
            "total_t": round(self.total_t, 2),
            "total_s": round(self.total_s, 2),
            "value_score": round(self._value_score, 2),
            "cost_score": round(self._cost_score, 2),
            "first_seen": self.first_seen.isoformat(),
            "last_active": self.last_active.isoformat(),
            "biz_count": len(self.biz_records),
            "decay_applied": self._decay_applied,
        }
    
    @property
    def days_since_last_active(self) -> int:
        """마지막 활동 이후 경과일"""
        return (datetime.now() - self.last_active).days
    
    @property
    def is_multi_biz_user(self) -> bool:
        """다중 사업장 이용자 여부"""
        return len(self.biz_records) >= 2
    
    def __repr__(self) -> str:
        return (
            f"CustomerProfile({self.name}, {self.archetype.emoji} {self.archetype.value}, "
            f"M={self.total_m:.0f}, T={self.total_t:.0f}, S={self.total_s:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """고객 프로필 데모"""
    print("=" * 70)
    print("  👥 AUTUS-TRINITY Customer Archetype Demo")
    print("=" * 70)
    
    # 테스트 고객 생성
    customers = []
    
    # 1. 후원자 (PATRON): 고가치 + 저비용
    patron = CustomerProfile(phone="01011112222", name="김후원")
    patron.add_biz_record("academy", money=80, entropy=5, synergy=30)
    patron.add_biz_record("restaurant", money=40, entropy=3, synergy=20)
    patron.add_biz_record("sports", money=30, entropy=2, synergy=15)
    customers.append(patron)
    
    # 2. 권력자 (TYCOON): 고가치 + 고비용
    tycoon = CustomerProfile(phone="01022223333", name="이권력")
    tycoon.add_biz_record("academy", money=100, entropy=40, synergy=10)
    tycoon.add_biz_record("restaurant", money=50, entropy=30)
    customers.append(tycoon)
    
    # 3. 찐팬 (FAN): 저가치 + 고시너지
    fan = CustomerProfile(phone="01033334444", name="박충성")
    fan.add_biz_record("restaurant", money=20, entropy=5, synergy=60)
    customers.append(fan)
    
    # 4. 흡혈귀 (VAMPIRE): 저가치 + 고비용
    vampire = CustomerProfile(phone="01044445555", name="최진상")
    vampire.add_biz_record("academy", money=10, entropy=80, synergy=0)
    customers.append(vampire)
    
    # 5. 일반 (COMMON)
    common = CustomerProfile(phone="01055556666", name="정보통")
    common.add_biz_record("restaurant", money=30, entropy=10, synergy=10)
    customers.append(common)
    
    print("\n📊 고객 유형 분류 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'M':>8} {'T':>8} {'S':>8} {'가치':>10} {'비용':>10}")
    print("-" * 70)
    
    for c in customers:
        print(
            f"{c.name:<10} "
            f"{c.archetype.emoji} {c.archetype.name_kr:<10} "
            f"{c.total_m:>8.0f} "
            f"{c.total_t:>8.0f} "
            f"{c.total_s:>8.0f} "
            f"{c._value_score:>10.0f} "
            f"{c._cost_score:>10.0f}"
        )
    
    # 시간 반감기 테스트
    print("\n" + "-" * 70)
    print("\n⏳ 시간 반감기(Decay) 테스트:")
    
    old_customer = CustomerProfile(phone="01099999999", name="구고객")
    old_customer.add_biz_record("academy", money=100, entropy=30, synergy=50)
    old_customer.last_active = datetime.now() - timedelta(days=180)  # 6개월 전
    
    print(f"\n  적용 전: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  미활동: {old_customer.days_since_last_active}일")
    
    old_customer.apply_time_decay()
    old_customer.recalculate()
    
    print(f"  적용 후: M={old_customer.total_m:.0f}, T={old_customer.total_t:.0f}, S={old_customer.total_s:.0f}")
    print(f"  유형 변화: {old_customer.archetype.emoji} {old_customer.archetype.name_kr}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()

























