#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Staff Profile Model                               ║
║                          직원 DNA - 4대 유형 분류                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

직원 분류 철학:
- CONNECTOR (슈퍼 커넥터): 자기 일도 잘하고, 생태계 연결까지 만들어냄 → 승진 1순위
- MACHINE (기계적 우등생): 성과는 좋지만 시키는 일만 함 → 커넥터로 진화 유도
- PARROT (앵무새): 친절하지만 성과가 약함 → 접객 전담 배치
- SABOTEUR (내부의 적): 실수 많고 분위기 해침 → 경고 후 조치

핵심 변수:
- P (Performance): 성과 - 매출, 재등록률, 전환율
- E (Entropy): 리스크 - 지각, 실수, 고객 이탈
- S (Synergy): 연결력 - 매뉴얼 수행, 크로스 레퍼럴, 불만 방어
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import random


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffTier(str, Enum):
    """직원 4대 유형"""
    CONNECTOR = "CONNECTOR"   # 💎 슈퍼 커넥터
    MACHINE = "MACHINE"       # 🤖 기계적 우등생
    PARROT = "PARROT"         # 🦜 앵무새
    SABOTEUR = "SABOTEUR"     # 💣 내부의 적
    NORMAL = "NORMAL"         # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "CONNECTOR": "💎",
            "MACHINE": "🤖",
            "PARROT": "🦜",
            "SABOTEUR": "💣",
            "NORMAL": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "CONNECTOR": "슈퍼 커넥터",
            "MACHINE": "우등생",
            "PARROT": "친절왕",
            "SABOTEUR": "주의 대상",
            "NORMAL": "일반"
        }.get(self.value, "일반")
    
    @property
    def action(self) -> str:
        return {
            "CONNECTOR": "승진 1순위 / 인센티브 지급",
            "MACHINE": "시너지 교육 필요",
            "PARROT": "접객/상담 전담 배치",
            "SABOTEUR": "경고 / 재배치 검토",
            "NORMAL": "표준 관리"
        }.get(self.value, "표준 관리")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 평가 기준
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffThresholds:
    """직원 평가 기준"""
    
    # 가중치 - 시너지에 3배!
    WEIGHT_PERFORMANCE = 1.0
    WEIGHT_ENTROPY = -2.0       # 페널티
    WEIGHT_SYNERGY = 3.0        # 시너지 중시
    
    # 기준값
    HIGH_PERFORMANCE = 80       # 고성과 기준
    HIGH_SYNERGY = 50           # 고시너지 기준
    HIGH_ENTROPY = 30           # 고엔트로피 기준 (위험)
    CONNECTOR_THRESHOLD = 150   # 커넥터 총점 기준


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 행동 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffActionLog:
    """직원 행동 기록"""
    action_type: str           # VIP_TOUCH, CROSS_REFERRAL, MANUAL_CHECK, etc.
    timestamp: datetime
    points: int = 0            # 시너지 가산점
    customer_phone: str = ""   # 관련 고객
    result: str = ""           # SUCCESS, FAIL, PENDING
    metadata: Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffProfile:
    """
    직원 프로필
    
    P, E, S 3대 변수로 직원을 평가
    """
    
    # 식별자
    staff_id: str
    name: str
    biz_type: str              # academy, restaurant, sports
    position: str = "staff"    # staff, manager, chief
    
    # 3대 변수
    score_p: float = 50.0      # Performance (0~100)
    score_e: float = 0.0       # Entropy (0~100, 낮을수록 좋음)
    score_s: float = 0.0       # Synergy (0~100)
    
    # 평가 결과
    tier: StaffTier = StaffTier.NORMAL
    final_score: float = 0.0
    
    # 행동 로그
    action_logs: List[StaffActionLog] = field(default_factory=list)
    
    # 메타데이터
    joined_date: datetime = field(default_factory=datetime.now)
    last_evaluated: datetime = field(default_factory=datetime.now)
    warning_count: int = 0     # 경고 횟수
    
    def __post_init__(self):
        self.evaluate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 점수 계산
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def calculate_synergy_from_logs(self) -> float:
        """
        행동 로그 기반 시너지 점수 계산
        
        시너지 포인트 기준:
        - CROSS_REFERRAL (타 매장 연결 성공): +20점
        - VIP_TOUCH (VIP 고객 응대): +5점
        - MANUAL_COMPLIANCE (매뉴얼 준수): +5점
        - COMPLAINT_DEFENSE (불만 방어 성공): +10점
        - EMOTIONAL_CARE (정서적 케어): +3점
        """
        synergy_points = 0
        
        for log in self.action_logs:
            if log.action_type == "CROSS_REFERRAL" and log.result == "SUCCESS":
                synergy_points += 20
            elif log.action_type == "VIP_TOUCH":
                synergy_points += 5
            elif log.action_type == "MANUAL_COMPLIANCE":
                synergy_points += 5
            elif log.action_type == "COMPLAINT_DEFENSE" and log.result == "SUCCESS":
                synergy_points += 10
            elif log.action_type == "EMOTIONAL_CARE":
                synergy_points += 3
            else:
                synergy_points += log.points
        
        # 정규화 (0~100)
        return min(100, synergy_points)
    
    def log_action(
        self, 
        action_type: str, 
        points: int = 0, 
        result: str = "SUCCESS",
        customer_phone: str = "",
        **metadata
    ) -> "StaffProfile":
        """행동 기록 추가"""
        log = StaffActionLog(
            action_type=action_type,
            timestamp=datetime.now(),
            points=points,
            customer_phone=customer_phone,
            result=result,
            metadata=metadata
        )
        self.action_logs.append(log)
        
        # 시너지 점수 재계산
        self.score_s = self.calculate_synergy_from_logs()
        self.evaluate()
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 평가
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def evaluate(self) -> "StaffProfile":
        """
        최종 평가
        
        Score = (1.0 × P) + (3.0 × S) - (2.0 × E)
        """
        TH = StaffThresholds
        
        self.final_score = (
            TH.WEIGHT_PERFORMANCE * self.score_p +
            TH.WEIGHT_SYNERGY * self.score_s +
            TH.WEIGHT_ENTROPY * self.score_e
        )
        
        self.tier = self._determine_tier()
        self.last_evaluated = datetime.now()
        
        return self
    
    def _determine_tier(self) -> StaffTier:
        """
        등급 판정
        
        Decision Tree:
        1. 총점 >= 150 → CONNECTOR
        2. 고성과(P >= 80) + 저시너지(S < 20) → MACHINE
        3. 고엔트로피(E >= 30) → SABOTEUR
        4. 저성과(P < 40) + 고시너지(S >= 30) → PARROT
        5. 나머지 → NORMAL
        """
        TH = StaffThresholds
        
        if self.final_score >= TH.CONNECTOR_THRESHOLD:
            return StaffTier.CONNECTOR
        
        if self.score_p >= TH.HIGH_PERFORMANCE and self.score_s < 20:
            return StaffTier.MACHINE
        
        if self.score_e >= TH.HIGH_ENTROPY:
            return StaffTier.SABOTEUR
        
        if self.score_p < 40 and self.score_s >= 30:
            return StaffTier.PARROT
        
        return StaffTier.NORMAL
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # KPI 업데이트 (업종별)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def update_performance(self, kpi_data: Dict) -> "StaffProfile":
        """
        업종별 KPI 데이터로 성과(P) 업데이트
        
        Args:
            kpi_data: 업종별 KPI
                - academy: {"retention_rate": 0.85, "grade_improvement": 10}
                - restaurant: {"sales_per_hour": 50000, "table_turnover": 3}
                - sports: {"conversion_rate": 0.3, "renewal_rate": 0.7}
        """
        if self.biz_type == "academy":
            # 재등록률 + 성적 향상도
            retention = kpi_data.get("retention_rate", 0.5) * 100
            improvement = min(20, kpi_data.get("grade_improvement", 0))
            self.score_p = retention * 0.7 + improvement * 1.5
            
        elif self.biz_type == "restaurant":
            # 시간당 매출 (기준: 50,000원)
            sph = kpi_data.get("sales_per_hour", 30000)
            self.score_p = min(100, (sph / 50000) * 70)
            
        elif self.biz_type == "sports":
            # 전환율 + 연장률
            conversion = kpi_data.get("conversion_rate", 0.2) * 100
            renewal = kpi_data.get("renewal_rate", 0.5) * 100
            self.score_p = conversion * 0.5 + renewal * 0.5
        
        else:
            # 기본
            self.score_p = kpi_data.get("score", 50)
        
        self.evaluate()
        return self
    
    def add_entropy(self, reason: str, points: int = 10) -> "StaffProfile":
        """
        엔트로피(실수/리스크) 추가
        
        Args:
            reason: 사유 (late, mistake, complaint 등)
            points: 감점
        """
        self.score_e += points
        self.score_e = min(100, self.score_e)  # 최대 100
        
        # 경고 카운트
        if reason in ["late", "absent", "complaint"]:
            self.warning_count += 1
        
        self.evaluate()
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "staff_id": self.staff_id,
            "name": self.name,
            "biz_type": self.biz_type,
            "position": self.position,
            "score_p": round(self.score_p, 1),
            "score_e": round(self.score_e, 1),
            "score_s": round(self.score_s, 1),
            "final_score": round(self.final_score, 1),
            "tier": self.tier.value,
            "tier_emoji": self.tier.emoji,
            "tier_name_kr": self.tier.name_kr,
            "tier_action": self.tier.action,
            "warning_count": self.warning_count,
            "action_log_count": len(self.action_logs),
            "joined_date": self.joined_date.isoformat(),
            "last_evaluated": self.last_evaluated.isoformat(),
        }
    
    def get_recent_actions(self, days: int = 7) -> List[StaffActionLog]:
        """최근 N일 행동 로그"""
        cutoff = datetime.now() - timedelta(days=days)
        return [log for log in self.action_logs if log.timestamp >= cutoff]
    
    def __repr__(self) -> str:
        return (
            f"StaffProfile({self.name}, {self.tier.emoji} {self.tier.value}, "
            f"P={self.score_p:.0f}, E={self.score_e:.0f}, S={self.score_s:.0f}, "
            f"Final={self.final_score:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """직원 프로필 데모"""
    print("=" * 70)
    print("  👔 AUTUS-TRINITY Staff Profile Demo")
    print("=" * 70)
    
    staffs = []
    
    # 1. 슈퍼 커넥터: 고성과 + 고시너지
    connector = StaffProfile(staff_id="S001", name="김연결", biz_type="academy")
    connector.update_performance({"retention_rate": 0.95, "grade_improvement": 15})
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("VIP_TOUCH")
    connector.log_action("COMPLAINT_DEFENSE", result="SUCCESS")
    staffs.append(connector)
    
    # 2. 기계적 우등생: 고성과 + 저시너지
    machine = StaffProfile(staff_id="S002", name="이성과", biz_type="restaurant")
    machine.update_performance({"sales_per_hour": 70000})
    staffs.append(machine)
    
    # 3. 앵무새: 저성과 + 친절
    parrot = StaffProfile(staff_id="S003", name="박친절", biz_type="restaurant")
    parrot.update_performance({"sales_per_hour": 25000})
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("VIP_TOUCH")
    parrot.score_s = 40  # 친절 점수 직접 부여
    parrot.evaluate()
    staffs.append(parrot)
    
    # 4. 내부의 적: 실수 많음
    saboteur = StaffProfile(staff_id="S004", name="최실수", biz_type="sports")
    saboteur.update_performance({"conversion_rate": 0.1, "renewal_rate": 0.3})
    saboteur.add_entropy("late", 10)
    saboteur.add_entropy("mistake", 15)
    saboteur.add_entropy("complaint", 20)
    staffs.append(saboteur)
    
    # 5. 일반
    normal = StaffProfile(staff_id="S005", name="정보통", biz_type="academy")
    normal.update_performance({"retention_rate": 0.7, "grade_improvement": 5})
    staffs.append(normal)
    
    print("\n📊 직원 평가 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'P':>6} {'E':>6} {'S':>6} {'총점':>8} {'조치':<20}")
    print("-" * 80)
    
    for s in staffs:
        print(
            f"{s.name:<10} "
            f"{s.tier.emoji} {s.tier.name_kr:<10} "
            f"{s.score_p:>6.0f} "
            f"{s.score_e:>6.0f} "
            f"{s.score_s:>6.0f} "
            f"{s.final_score:>8.0f} "
            f"{s.tier.action:<20}"
        )
    
    # 커넥터 상세
    print("\n" + "-" * 70)
    print(f"\n💎 슈퍼 커넥터 '{connector.name}' 행동 로그:")
    for log in connector.action_logs:
        print(f"  - {log.action_type}: {log.result} (+{log.points})")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Staff Profile Model                               ║
║                          직원 DNA - 4대 유형 분류                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

직원 분류 철학:
- CONNECTOR (슈퍼 커넥터): 자기 일도 잘하고, 생태계 연결까지 만들어냄 → 승진 1순위
- MACHINE (기계적 우등생): 성과는 좋지만 시키는 일만 함 → 커넥터로 진화 유도
- PARROT (앵무새): 친절하지만 성과가 약함 → 접객 전담 배치
- SABOTEUR (내부의 적): 실수 많고 분위기 해침 → 경고 후 조치

핵심 변수:
- P (Performance): 성과 - 매출, 재등록률, 전환율
- E (Entropy): 리스크 - 지각, 실수, 고객 이탈
- S (Synergy): 연결력 - 매뉴얼 수행, 크로스 레퍼럴, 불만 방어
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import random


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffTier(str, Enum):
    """직원 4대 유형"""
    CONNECTOR = "CONNECTOR"   # 💎 슈퍼 커넥터
    MACHINE = "MACHINE"       # 🤖 기계적 우등생
    PARROT = "PARROT"         # 🦜 앵무새
    SABOTEUR = "SABOTEUR"     # 💣 내부의 적
    NORMAL = "NORMAL"         # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "CONNECTOR": "💎",
            "MACHINE": "🤖",
            "PARROT": "🦜",
            "SABOTEUR": "💣",
            "NORMAL": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "CONNECTOR": "슈퍼 커넥터",
            "MACHINE": "우등생",
            "PARROT": "친절왕",
            "SABOTEUR": "주의 대상",
            "NORMAL": "일반"
        }.get(self.value, "일반")
    
    @property
    def action(self) -> str:
        return {
            "CONNECTOR": "승진 1순위 / 인센티브 지급",
            "MACHINE": "시너지 교육 필요",
            "PARROT": "접객/상담 전담 배치",
            "SABOTEUR": "경고 / 재배치 검토",
            "NORMAL": "표준 관리"
        }.get(self.value, "표준 관리")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 평가 기준
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffThresholds:
    """직원 평가 기준"""
    
    # 가중치 - 시너지에 3배!
    WEIGHT_PERFORMANCE = 1.0
    WEIGHT_ENTROPY = -2.0       # 페널티
    WEIGHT_SYNERGY = 3.0        # 시너지 중시
    
    # 기준값
    HIGH_PERFORMANCE = 80       # 고성과 기준
    HIGH_SYNERGY = 50           # 고시너지 기준
    HIGH_ENTROPY = 30           # 고엔트로피 기준 (위험)
    CONNECTOR_THRESHOLD = 150   # 커넥터 총점 기준


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 행동 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffActionLog:
    """직원 행동 기록"""
    action_type: str           # VIP_TOUCH, CROSS_REFERRAL, MANUAL_CHECK, etc.
    timestamp: datetime
    points: int = 0            # 시너지 가산점
    customer_phone: str = ""   # 관련 고객
    result: str = ""           # SUCCESS, FAIL, PENDING
    metadata: Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffProfile:
    """
    직원 프로필
    
    P, E, S 3대 변수로 직원을 평가
    """
    
    # 식별자
    staff_id: str
    name: str
    biz_type: str              # academy, restaurant, sports
    position: str = "staff"    # staff, manager, chief
    
    # 3대 변수
    score_p: float = 50.0      # Performance (0~100)
    score_e: float = 0.0       # Entropy (0~100, 낮을수록 좋음)
    score_s: float = 0.0       # Synergy (0~100)
    
    # 평가 결과
    tier: StaffTier = StaffTier.NORMAL
    final_score: float = 0.0
    
    # 행동 로그
    action_logs: List[StaffActionLog] = field(default_factory=list)
    
    # 메타데이터
    joined_date: datetime = field(default_factory=datetime.now)
    last_evaluated: datetime = field(default_factory=datetime.now)
    warning_count: int = 0     # 경고 횟수
    
    def __post_init__(self):
        self.evaluate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 점수 계산
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def calculate_synergy_from_logs(self) -> float:
        """
        행동 로그 기반 시너지 점수 계산
        
        시너지 포인트 기준:
        - CROSS_REFERRAL (타 매장 연결 성공): +20점
        - VIP_TOUCH (VIP 고객 응대): +5점
        - MANUAL_COMPLIANCE (매뉴얼 준수): +5점
        - COMPLAINT_DEFENSE (불만 방어 성공): +10점
        - EMOTIONAL_CARE (정서적 케어): +3점
        """
        synergy_points = 0
        
        for log in self.action_logs:
            if log.action_type == "CROSS_REFERRAL" and log.result == "SUCCESS":
                synergy_points += 20
            elif log.action_type == "VIP_TOUCH":
                synergy_points += 5
            elif log.action_type == "MANUAL_COMPLIANCE":
                synergy_points += 5
            elif log.action_type == "COMPLAINT_DEFENSE" and log.result == "SUCCESS":
                synergy_points += 10
            elif log.action_type == "EMOTIONAL_CARE":
                synergy_points += 3
            else:
                synergy_points += log.points
        
        # 정규화 (0~100)
        return min(100, synergy_points)
    
    def log_action(
        self, 
        action_type: str, 
        points: int = 0, 
        result: str = "SUCCESS",
        customer_phone: str = "",
        **metadata
    ) -> "StaffProfile":
        """행동 기록 추가"""
        log = StaffActionLog(
            action_type=action_type,
            timestamp=datetime.now(),
            points=points,
            customer_phone=customer_phone,
            result=result,
            metadata=metadata
        )
        self.action_logs.append(log)
        
        # 시너지 점수 재계산
        self.score_s = self.calculate_synergy_from_logs()
        self.evaluate()
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 평가
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def evaluate(self) -> "StaffProfile":
        """
        최종 평가
        
        Score = (1.0 × P) + (3.0 × S) - (2.0 × E)
        """
        TH = StaffThresholds
        
        self.final_score = (
            TH.WEIGHT_PERFORMANCE * self.score_p +
            TH.WEIGHT_SYNERGY * self.score_s +
            TH.WEIGHT_ENTROPY * self.score_e
        )
        
        self.tier = self._determine_tier()
        self.last_evaluated = datetime.now()
        
        return self
    
    def _determine_tier(self) -> StaffTier:
        """
        등급 판정
        
        Decision Tree:
        1. 총점 >= 150 → CONNECTOR
        2. 고성과(P >= 80) + 저시너지(S < 20) → MACHINE
        3. 고엔트로피(E >= 30) → SABOTEUR
        4. 저성과(P < 40) + 고시너지(S >= 30) → PARROT
        5. 나머지 → NORMAL
        """
        TH = StaffThresholds
        
        if self.final_score >= TH.CONNECTOR_THRESHOLD:
            return StaffTier.CONNECTOR
        
        if self.score_p >= TH.HIGH_PERFORMANCE and self.score_s < 20:
            return StaffTier.MACHINE
        
        if self.score_e >= TH.HIGH_ENTROPY:
            return StaffTier.SABOTEUR
        
        if self.score_p < 40 and self.score_s >= 30:
            return StaffTier.PARROT
        
        return StaffTier.NORMAL
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # KPI 업데이트 (업종별)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def update_performance(self, kpi_data: Dict) -> "StaffProfile":
        """
        업종별 KPI 데이터로 성과(P) 업데이트
        
        Args:
            kpi_data: 업종별 KPI
                - academy: {"retention_rate": 0.85, "grade_improvement": 10}
                - restaurant: {"sales_per_hour": 50000, "table_turnover": 3}
                - sports: {"conversion_rate": 0.3, "renewal_rate": 0.7}
        """
        if self.biz_type == "academy":
            # 재등록률 + 성적 향상도
            retention = kpi_data.get("retention_rate", 0.5) * 100
            improvement = min(20, kpi_data.get("grade_improvement", 0))
            self.score_p = retention * 0.7 + improvement * 1.5
            
        elif self.biz_type == "restaurant":
            # 시간당 매출 (기준: 50,000원)
            sph = kpi_data.get("sales_per_hour", 30000)
            self.score_p = min(100, (sph / 50000) * 70)
            
        elif self.biz_type == "sports":
            # 전환율 + 연장률
            conversion = kpi_data.get("conversion_rate", 0.2) * 100
            renewal = kpi_data.get("renewal_rate", 0.5) * 100
            self.score_p = conversion * 0.5 + renewal * 0.5
        
        else:
            # 기본
            self.score_p = kpi_data.get("score", 50)
        
        self.evaluate()
        return self
    
    def add_entropy(self, reason: str, points: int = 10) -> "StaffProfile":
        """
        엔트로피(실수/리스크) 추가
        
        Args:
            reason: 사유 (late, mistake, complaint 등)
            points: 감점
        """
        self.score_e += points
        self.score_e = min(100, self.score_e)  # 최대 100
        
        # 경고 카운트
        if reason in ["late", "absent", "complaint"]:
            self.warning_count += 1
        
        self.evaluate()
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "staff_id": self.staff_id,
            "name": self.name,
            "biz_type": self.biz_type,
            "position": self.position,
            "score_p": round(self.score_p, 1),
            "score_e": round(self.score_e, 1),
            "score_s": round(self.score_s, 1),
            "final_score": round(self.final_score, 1),
            "tier": self.tier.value,
            "tier_emoji": self.tier.emoji,
            "tier_name_kr": self.tier.name_kr,
            "tier_action": self.tier.action,
            "warning_count": self.warning_count,
            "action_log_count": len(self.action_logs),
            "joined_date": self.joined_date.isoformat(),
            "last_evaluated": self.last_evaluated.isoformat(),
        }
    
    def get_recent_actions(self, days: int = 7) -> List[StaffActionLog]:
        """최근 N일 행동 로그"""
        cutoff = datetime.now() - timedelta(days=days)
        return [log for log in self.action_logs if log.timestamp >= cutoff]
    
    def __repr__(self) -> str:
        return (
            f"StaffProfile({self.name}, {self.tier.emoji} {self.tier.value}, "
            f"P={self.score_p:.0f}, E={self.score_e:.0f}, S={self.score_s:.0f}, "
            f"Final={self.final_score:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """직원 프로필 데모"""
    print("=" * 70)
    print("  👔 AUTUS-TRINITY Staff Profile Demo")
    print("=" * 70)
    
    staffs = []
    
    # 1. 슈퍼 커넥터: 고성과 + 고시너지
    connector = StaffProfile(staff_id="S001", name="김연결", biz_type="academy")
    connector.update_performance({"retention_rate": 0.95, "grade_improvement": 15})
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("VIP_TOUCH")
    connector.log_action("COMPLAINT_DEFENSE", result="SUCCESS")
    staffs.append(connector)
    
    # 2. 기계적 우등생: 고성과 + 저시너지
    machine = StaffProfile(staff_id="S002", name="이성과", biz_type="restaurant")
    machine.update_performance({"sales_per_hour": 70000})
    staffs.append(machine)
    
    # 3. 앵무새: 저성과 + 친절
    parrot = StaffProfile(staff_id="S003", name="박친절", biz_type="restaurant")
    parrot.update_performance({"sales_per_hour": 25000})
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("VIP_TOUCH")
    parrot.score_s = 40  # 친절 점수 직접 부여
    parrot.evaluate()
    staffs.append(parrot)
    
    # 4. 내부의 적: 실수 많음
    saboteur = StaffProfile(staff_id="S004", name="최실수", biz_type="sports")
    saboteur.update_performance({"conversion_rate": 0.1, "renewal_rate": 0.3})
    saboteur.add_entropy("late", 10)
    saboteur.add_entropy("mistake", 15)
    saboteur.add_entropy("complaint", 20)
    staffs.append(saboteur)
    
    # 5. 일반
    normal = StaffProfile(staff_id="S005", name="정보통", biz_type="academy")
    normal.update_performance({"retention_rate": 0.7, "grade_improvement": 5})
    staffs.append(normal)
    
    print("\n📊 직원 평가 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'P':>6} {'E':>6} {'S':>6} {'총점':>8} {'조치':<20}")
    print("-" * 80)
    
    for s in staffs:
        print(
            f"{s.name:<10} "
            f"{s.tier.emoji} {s.tier.name_kr:<10} "
            f"{s.score_p:>6.0f} "
            f"{s.score_e:>6.0f} "
            f"{s.score_s:>6.0f} "
            f"{s.final_score:>8.0f} "
            f"{s.tier.action:<20}"
        )
    
    # 커넥터 상세
    print("\n" + "-" * 70)
    print(f"\n💎 슈퍼 커넥터 '{connector.name}' 행동 로그:")
    for log in connector.action_logs:
        print(f"  - {log.action_type}: {log.result} (+{log.points})")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Staff Profile Model                               ║
║                          직원 DNA - 4대 유형 분류                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

직원 분류 철학:
- CONNECTOR (슈퍼 커넥터): 자기 일도 잘하고, 생태계 연결까지 만들어냄 → 승진 1순위
- MACHINE (기계적 우등생): 성과는 좋지만 시키는 일만 함 → 커넥터로 진화 유도
- PARROT (앵무새): 친절하지만 성과가 약함 → 접객 전담 배치
- SABOTEUR (내부의 적): 실수 많고 분위기 해침 → 경고 후 조치

핵심 변수:
- P (Performance): 성과 - 매출, 재등록률, 전환율
- E (Entropy): 리스크 - 지각, 실수, 고객 이탈
- S (Synergy): 연결력 - 매뉴얼 수행, 크로스 레퍼럴, 불만 방어
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import random


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffTier(str, Enum):
    """직원 4대 유형"""
    CONNECTOR = "CONNECTOR"   # 💎 슈퍼 커넥터
    MACHINE = "MACHINE"       # 🤖 기계적 우등생
    PARROT = "PARROT"         # 🦜 앵무새
    SABOTEUR = "SABOTEUR"     # 💣 내부의 적
    NORMAL = "NORMAL"         # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "CONNECTOR": "💎",
            "MACHINE": "🤖",
            "PARROT": "🦜",
            "SABOTEUR": "💣",
            "NORMAL": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "CONNECTOR": "슈퍼 커넥터",
            "MACHINE": "우등생",
            "PARROT": "친절왕",
            "SABOTEUR": "주의 대상",
            "NORMAL": "일반"
        }.get(self.value, "일반")
    
    @property
    def action(self) -> str:
        return {
            "CONNECTOR": "승진 1순위 / 인센티브 지급",
            "MACHINE": "시너지 교육 필요",
            "PARROT": "접객/상담 전담 배치",
            "SABOTEUR": "경고 / 재배치 검토",
            "NORMAL": "표준 관리"
        }.get(self.value, "표준 관리")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 평가 기준
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffThresholds:
    """직원 평가 기준"""
    
    # 가중치 - 시너지에 3배!
    WEIGHT_PERFORMANCE = 1.0
    WEIGHT_ENTROPY = -2.0       # 페널티
    WEIGHT_SYNERGY = 3.0        # 시너지 중시
    
    # 기준값
    HIGH_PERFORMANCE = 80       # 고성과 기준
    HIGH_SYNERGY = 50           # 고시너지 기준
    HIGH_ENTROPY = 30           # 고엔트로피 기준 (위험)
    CONNECTOR_THRESHOLD = 150   # 커넥터 총점 기준


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 행동 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffActionLog:
    """직원 행동 기록"""
    action_type: str           # VIP_TOUCH, CROSS_REFERRAL, MANUAL_CHECK, etc.
    timestamp: datetime
    points: int = 0            # 시너지 가산점
    customer_phone: str = ""   # 관련 고객
    result: str = ""           # SUCCESS, FAIL, PENDING
    metadata: Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffProfile:
    """
    직원 프로필
    
    P, E, S 3대 변수로 직원을 평가
    """
    
    # 식별자
    staff_id: str
    name: str
    biz_type: str              # academy, restaurant, sports
    position: str = "staff"    # staff, manager, chief
    
    # 3대 변수
    score_p: float = 50.0      # Performance (0~100)
    score_e: float = 0.0       # Entropy (0~100, 낮을수록 좋음)
    score_s: float = 0.0       # Synergy (0~100)
    
    # 평가 결과
    tier: StaffTier = StaffTier.NORMAL
    final_score: float = 0.0
    
    # 행동 로그
    action_logs: List[StaffActionLog] = field(default_factory=list)
    
    # 메타데이터
    joined_date: datetime = field(default_factory=datetime.now)
    last_evaluated: datetime = field(default_factory=datetime.now)
    warning_count: int = 0     # 경고 횟수
    
    def __post_init__(self):
        self.evaluate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 점수 계산
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def calculate_synergy_from_logs(self) -> float:
        """
        행동 로그 기반 시너지 점수 계산
        
        시너지 포인트 기준:
        - CROSS_REFERRAL (타 매장 연결 성공): +20점
        - VIP_TOUCH (VIP 고객 응대): +5점
        - MANUAL_COMPLIANCE (매뉴얼 준수): +5점
        - COMPLAINT_DEFENSE (불만 방어 성공): +10점
        - EMOTIONAL_CARE (정서적 케어): +3점
        """
        synergy_points = 0
        
        for log in self.action_logs:
            if log.action_type == "CROSS_REFERRAL" and log.result == "SUCCESS":
                synergy_points += 20
            elif log.action_type == "VIP_TOUCH":
                synergy_points += 5
            elif log.action_type == "MANUAL_COMPLIANCE":
                synergy_points += 5
            elif log.action_type == "COMPLAINT_DEFENSE" and log.result == "SUCCESS":
                synergy_points += 10
            elif log.action_type == "EMOTIONAL_CARE":
                synergy_points += 3
            else:
                synergy_points += log.points
        
        # 정규화 (0~100)
        return min(100, synergy_points)
    
    def log_action(
        self, 
        action_type: str, 
        points: int = 0, 
        result: str = "SUCCESS",
        customer_phone: str = "",
        **metadata
    ) -> "StaffProfile":
        """행동 기록 추가"""
        log = StaffActionLog(
            action_type=action_type,
            timestamp=datetime.now(),
            points=points,
            customer_phone=customer_phone,
            result=result,
            metadata=metadata
        )
        self.action_logs.append(log)
        
        # 시너지 점수 재계산
        self.score_s = self.calculate_synergy_from_logs()
        self.evaluate()
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 평가
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def evaluate(self) -> "StaffProfile":
        """
        최종 평가
        
        Score = (1.0 × P) + (3.0 × S) - (2.0 × E)
        """
        TH = StaffThresholds
        
        self.final_score = (
            TH.WEIGHT_PERFORMANCE * self.score_p +
            TH.WEIGHT_SYNERGY * self.score_s +
            TH.WEIGHT_ENTROPY * self.score_e
        )
        
        self.tier = self._determine_tier()
        self.last_evaluated = datetime.now()
        
        return self
    
    def _determine_tier(self) -> StaffTier:
        """
        등급 판정
        
        Decision Tree:
        1. 총점 >= 150 → CONNECTOR
        2. 고성과(P >= 80) + 저시너지(S < 20) → MACHINE
        3. 고엔트로피(E >= 30) → SABOTEUR
        4. 저성과(P < 40) + 고시너지(S >= 30) → PARROT
        5. 나머지 → NORMAL
        """
        TH = StaffThresholds
        
        if self.final_score >= TH.CONNECTOR_THRESHOLD:
            return StaffTier.CONNECTOR
        
        if self.score_p >= TH.HIGH_PERFORMANCE and self.score_s < 20:
            return StaffTier.MACHINE
        
        if self.score_e >= TH.HIGH_ENTROPY:
            return StaffTier.SABOTEUR
        
        if self.score_p < 40 and self.score_s >= 30:
            return StaffTier.PARROT
        
        return StaffTier.NORMAL
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # KPI 업데이트 (업종별)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def update_performance(self, kpi_data: Dict) -> "StaffProfile":
        """
        업종별 KPI 데이터로 성과(P) 업데이트
        
        Args:
            kpi_data: 업종별 KPI
                - academy: {"retention_rate": 0.85, "grade_improvement": 10}
                - restaurant: {"sales_per_hour": 50000, "table_turnover": 3}
                - sports: {"conversion_rate": 0.3, "renewal_rate": 0.7}
        """
        if self.biz_type == "academy":
            # 재등록률 + 성적 향상도
            retention = kpi_data.get("retention_rate", 0.5) * 100
            improvement = min(20, kpi_data.get("grade_improvement", 0))
            self.score_p = retention * 0.7 + improvement * 1.5
            
        elif self.biz_type == "restaurant":
            # 시간당 매출 (기준: 50,000원)
            sph = kpi_data.get("sales_per_hour", 30000)
            self.score_p = min(100, (sph / 50000) * 70)
            
        elif self.biz_type == "sports":
            # 전환율 + 연장률
            conversion = kpi_data.get("conversion_rate", 0.2) * 100
            renewal = kpi_data.get("renewal_rate", 0.5) * 100
            self.score_p = conversion * 0.5 + renewal * 0.5
        
        else:
            # 기본
            self.score_p = kpi_data.get("score", 50)
        
        self.evaluate()
        return self
    
    def add_entropy(self, reason: str, points: int = 10) -> "StaffProfile":
        """
        엔트로피(실수/리스크) 추가
        
        Args:
            reason: 사유 (late, mistake, complaint 등)
            points: 감점
        """
        self.score_e += points
        self.score_e = min(100, self.score_e)  # 최대 100
        
        # 경고 카운트
        if reason in ["late", "absent", "complaint"]:
            self.warning_count += 1
        
        self.evaluate()
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "staff_id": self.staff_id,
            "name": self.name,
            "biz_type": self.biz_type,
            "position": self.position,
            "score_p": round(self.score_p, 1),
            "score_e": round(self.score_e, 1),
            "score_s": round(self.score_s, 1),
            "final_score": round(self.final_score, 1),
            "tier": self.tier.value,
            "tier_emoji": self.tier.emoji,
            "tier_name_kr": self.tier.name_kr,
            "tier_action": self.tier.action,
            "warning_count": self.warning_count,
            "action_log_count": len(self.action_logs),
            "joined_date": self.joined_date.isoformat(),
            "last_evaluated": self.last_evaluated.isoformat(),
        }
    
    def get_recent_actions(self, days: int = 7) -> List[StaffActionLog]:
        """최근 N일 행동 로그"""
        cutoff = datetime.now() - timedelta(days=days)
        return [log for log in self.action_logs if log.timestamp >= cutoff]
    
    def __repr__(self) -> str:
        return (
            f"StaffProfile({self.name}, {self.tier.emoji} {self.tier.value}, "
            f"P={self.score_p:.0f}, E={self.score_e:.0f}, S={self.score_s:.0f}, "
            f"Final={self.final_score:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """직원 프로필 데모"""
    print("=" * 70)
    print("  👔 AUTUS-TRINITY Staff Profile Demo")
    print("=" * 70)
    
    staffs = []
    
    # 1. 슈퍼 커넥터: 고성과 + 고시너지
    connector = StaffProfile(staff_id="S001", name="김연결", biz_type="academy")
    connector.update_performance({"retention_rate": 0.95, "grade_improvement": 15})
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("VIP_TOUCH")
    connector.log_action("COMPLAINT_DEFENSE", result="SUCCESS")
    staffs.append(connector)
    
    # 2. 기계적 우등생: 고성과 + 저시너지
    machine = StaffProfile(staff_id="S002", name="이성과", biz_type="restaurant")
    machine.update_performance({"sales_per_hour": 70000})
    staffs.append(machine)
    
    # 3. 앵무새: 저성과 + 친절
    parrot = StaffProfile(staff_id="S003", name="박친절", biz_type="restaurant")
    parrot.update_performance({"sales_per_hour": 25000})
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("VIP_TOUCH")
    parrot.score_s = 40  # 친절 점수 직접 부여
    parrot.evaluate()
    staffs.append(parrot)
    
    # 4. 내부의 적: 실수 많음
    saboteur = StaffProfile(staff_id="S004", name="최실수", biz_type="sports")
    saboteur.update_performance({"conversion_rate": 0.1, "renewal_rate": 0.3})
    saboteur.add_entropy("late", 10)
    saboteur.add_entropy("mistake", 15)
    saboteur.add_entropy("complaint", 20)
    staffs.append(saboteur)
    
    # 5. 일반
    normal = StaffProfile(staff_id="S005", name="정보통", biz_type="academy")
    normal.update_performance({"retention_rate": 0.7, "grade_improvement": 5})
    staffs.append(normal)
    
    print("\n📊 직원 평가 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'P':>6} {'E':>6} {'S':>6} {'총점':>8} {'조치':<20}")
    print("-" * 80)
    
    for s in staffs:
        print(
            f"{s.name:<10} "
            f"{s.tier.emoji} {s.tier.name_kr:<10} "
            f"{s.score_p:>6.0f} "
            f"{s.score_e:>6.0f} "
            f"{s.score_s:>6.0f} "
            f"{s.final_score:>8.0f} "
            f"{s.tier.action:<20}"
        )
    
    # 커넥터 상세
    print("\n" + "-" * 70)
    print(f"\n💎 슈퍼 커넥터 '{connector.name}' 행동 로그:")
    for log in connector.action_logs:
        print(f"  - {log.action_type}: {log.result} (+{log.points})")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Staff Profile Model                               ║
║                          직원 DNA - 4대 유형 분류                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

직원 분류 철학:
- CONNECTOR (슈퍼 커넥터): 자기 일도 잘하고, 생태계 연결까지 만들어냄 → 승진 1순위
- MACHINE (기계적 우등생): 성과는 좋지만 시키는 일만 함 → 커넥터로 진화 유도
- PARROT (앵무새): 친절하지만 성과가 약함 → 접객 전담 배치
- SABOTEUR (내부의 적): 실수 많고 분위기 해침 → 경고 후 조치

핵심 변수:
- P (Performance): 성과 - 매출, 재등록률, 전환율
- E (Entropy): 리스크 - 지각, 실수, 고객 이탈
- S (Synergy): 연결력 - 매뉴얼 수행, 크로스 레퍼럴, 불만 방어
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import random


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffTier(str, Enum):
    """직원 4대 유형"""
    CONNECTOR = "CONNECTOR"   # 💎 슈퍼 커넥터
    MACHINE = "MACHINE"       # 🤖 기계적 우등생
    PARROT = "PARROT"         # 🦜 앵무새
    SABOTEUR = "SABOTEUR"     # 💣 내부의 적
    NORMAL = "NORMAL"         # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "CONNECTOR": "💎",
            "MACHINE": "🤖",
            "PARROT": "🦜",
            "SABOTEUR": "💣",
            "NORMAL": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "CONNECTOR": "슈퍼 커넥터",
            "MACHINE": "우등생",
            "PARROT": "친절왕",
            "SABOTEUR": "주의 대상",
            "NORMAL": "일반"
        }.get(self.value, "일반")
    
    @property
    def action(self) -> str:
        return {
            "CONNECTOR": "승진 1순위 / 인센티브 지급",
            "MACHINE": "시너지 교육 필요",
            "PARROT": "접객/상담 전담 배치",
            "SABOTEUR": "경고 / 재배치 검토",
            "NORMAL": "표준 관리"
        }.get(self.value, "표준 관리")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 평가 기준
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffThresholds:
    """직원 평가 기준"""
    
    # 가중치 - 시너지에 3배!
    WEIGHT_PERFORMANCE = 1.0
    WEIGHT_ENTROPY = -2.0       # 페널티
    WEIGHT_SYNERGY = 3.0        # 시너지 중시
    
    # 기준값
    HIGH_PERFORMANCE = 80       # 고성과 기준
    HIGH_SYNERGY = 50           # 고시너지 기준
    HIGH_ENTROPY = 30           # 고엔트로피 기준 (위험)
    CONNECTOR_THRESHOLD = 150   # 커넥터 총점 기준


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 행동 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffActionLog:
    """직원 행동 기록"""
    action_type: str           # VIP_TOUCH, CROSS_REFERRAL, MANUAL_CHECK, etc.
    timestamp: datetime
    points: int = 0            # 시너지 가산점
    customer_phone: str = ""   # 관련 고객
    result: str = ""           # SUCCESS, FAIL, PENDING
    metadata: Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffProfile:
    """
    직원 프로필
    
    P, E, S 3대 변수로 직원을 평가
    """
    
    # 식별자
    staff_id: str
    name: str
    biz_type: str              # academy, restaurant, sports
    position: str = "staff"    # staff, manager, chief
    
    # 3대 변수
    score_p: float = 50.0      # Performance (0~100)
    score_e: float = 0.0       # Entropy (0~100, 낮을수록 좋음)
    score_s: float = 0.0       # Synergy (0~100)
    
    # 평가 결과
    tier: StaffTier = StaffTier.NORMAL
    final_score: float = 0.0
    
    # 행동 로그
    action_logs: List[StaffActionLog] = field(default_factory=list)
    
    # 메타데이터
    joined_date: datetime = field(default_factory=datetime.now)
    last_evaluated: datetime = field(default_factory=datetime.now)
    warning_count: int = 0     # 경고 횟수
    
    def __post_init__(self):
        self.evaluate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 점수 계산
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def calculate_synergy_from_logs(self) -> float:
        """
        행동 로그 기반 시너지 점수 계산
        
        시너지 포인트 기준:
        - CROSS_REFERRAL (타 매장 연결 성공): +20점
        - VIP_TOUCH (VIP 고객 응대): +5점
        - MANUAL_COMPLIANCE (매뉴얼 준수): +5점
        - COMPLAINT_DEFENSE (불만 방어 성공): +10점
        - EMOTIONAL_CARE (정서적 케어): +3점
        """
        synergy_points = 0
        
        for log in self.action_logs:
            if log.action_type == "CROSS_REFERRAL" and log.result == "SUCCESS":
                synergy_points += 20
            elif log.action_type == "VIP_TOUCH":
                synergy_points += 5
            elif log.action_type == "MANUAL_COMPLIANCE":
                synergy_points += 5
            elif log.action_type == "COMPLAINT_DEFENSE" and log.result == "SUCCESS":
                synergy_points += 10
            elif log.action_type == "EMOTIONAL_CARE":
                synergy_points += 3
            else:
                synergy_points += log.points
        
        # 정규화 (0~100)
        return min(100, synergy_points)
    
    def log_action(
        self, 
        action_type: str, 
        points: int = 0, 
        result: str = "SUCCESS",
        customer_phone: str = "",
        **metadata
    ) -> "StaffProfile":
        """행동 기록 추가"""
        log = StaffActionLog(
            action_type=action_type,
            timestamp=datetime.now(),
            points=points,
            customer_phone=customer_phone,
            result=result,
            metadata=metadata
        )
        self.action_logs.append(log)
        
        # 시너지 점수 재계산
        self.score_s = self.calculate_synergy_from_logs()
        self.evaluate()
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 평가
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def evaluate(self) -> "StaffProfile":
        """
        최종 평가
        
        Score = (1.0 × P) + (3.0 × S) - (2.0 × E)
        """
        TH = StaffThresholds
        
        self.final_score = (
            TH.WEIGHT_PERFORMANCE * self.score_p +
            TH.WEIGHT_SYNERGY * self.score_s +
            TH.WEIGHT_ENTROPY * self.score_e
        )
        
        self.tier = self._determine_tier()
        self.last_evaluated = datetime.now()
        
        return self
    
    def _determine_tier(self) -> StaffTier:
        """
        등급 판정
        
        Decision Tree:
        1. 총점 >= 150 → CONNECTOR
        2. 고성과(P >= 80) + 저시너지(S < 20) → MACHINE
        3. 고엔트로피(E >= 30) → SABOTEUR
        4. 저성과(P < 40) + 고시너지(S >= 30) → PARROT
        5. 나머지 → NORMAL
        """
        TH = StaffThresholds
        
        if self.final_score >= TH.CONNECTOR_THRESHOLD:
            return StaffTier.CONNECTOR
        
        if self.score_p >= TH.HIGH_PERFORMANCE and self.score_s < 20:
            return StaffTier.MACHINE
        
        if self.score_e >= TH.HIGH_ENTROPY:
            return StaffTier.SABOTEUR
        
        if self.score_p < 40 and self.score_s >= 30:
            return StaffTier.PARROT
        
        return StaffTier.NORMAL
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # KPI 업데이트 (업종별)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def update_performance(self, kpi_data: Dict) -> "StaffProfile":
        """
        업종별 KPI 데이터로 성과(P) 업데이트
        
        Args:
            kpi_data: 업종별 KPI
                - academy: {"retention_rate": 0.85, "grade_improvement": 10}
                - restaurant: {"sales_per_hour": 50000, "table_turnover": 3}
                - sports: {"conversion_rate": 0.3, "renewal_rate": 0.7}
        """
        if self.biz_type == "academy":
            # 재등록률 + 성적 향상도
            retention = kpi_data.get("retention_rate", 0.5) * 100
            improvement = min(20, kpi_data.get("grade_improvement", 0))
            self.score_p = retention * 0.7 + improvement * 1.5
            
        elif self.biz_type == "restaurant":
            # 시간당 매출 (기준: 50,000원)
            sph = kpi_data.get("sales_per_hour", 30000)
            self.score_p = min(100, (sph / 50000) * 70)
            
        elif self.biz_type == "sports":
            # 전환율 + 연장률
            conversion = kpi_data.get("conversion_rate", 0.2) * 100
            renewal = kpi_data.get("renewal_rate", 0.5) * 100
            self.score_p = conversion * 0.5 + renewal * 0.5
        
        else:
            # 기본
            self.score_p = kpi_data.get("score", 50)
        
        self.evaluate()
        return self
    
    def add_entropy(self, reason: str, points: int = 10) -> "StaffProfile":
        """
        엔트로피(실수/리스크) 추가
        
        Args:
            reason: 사유 (late, mistake, complaint 등)
            points: 감점
        """
        self.score_e += points
        self.score_e = min(100, self.score_e)  # 최대 100
        
        # 경고 카운트
        if reason in ["late", "absent", "complaint"]:
            self.warning_count += 1
        
        self.evaluate()
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "staff_id": self.staff_id,
            "name": self.name,
            "biz_type": self.biz_type,
            "position": self.position,
            "score_p": round(self.score_p, 1),
            "score_e": round(self.score_e, 1),
            "score_s": round(self.score_s, 1),
            "final_score": round(self.final_score, 1),
            "tier": self.tier.value,
            "tier_emoji": self.tier.emoji,
            "tier_name_kr": self.tier.name_kr,
            "tier_action": self.tier.action,
            "warning_count": self.warning_count,
            "action_log_count": len(self.action_logs),
            "joined_date": self.joined_date.isoformat(),
            "last_evaluated": self.last_evaluated.isoformat(),
        }
    
    def get_recent_actions(self, days: int = 7) -> List[StaffActionLog]:
        """최근 N일 행동 로그"""
        cutoff = datetime.now() - timedelta(days=days)
        return [log for log in self.action_logs if log.timestamp >= cutoff]
    
    def __repr__(self) -> str:
        return (
            f"StaffProfile({self.name}, {self.tier.emoji} {self.tier.value}, "
            f"P={self.score_p:.0f}, E={self.score_e:.0f}, S={self.score_s:.0f}, "
            f"Final={self.final_score:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """직원 프로필 데모"""
    print("=" * 70)
    print("  👔 AUTUS-TRINITY Staff Profile Demo")
    print("=" * 70)
    
    staffs = []
    
    # 1. 슈퍼 커넥터: 고성과 + 고시너지
    connector = StaffProfile(staff_id="S001", name="김연결", biz_type="academy")
    connector.update_performance({"retention_rate": 0.95, "grade_improvement": 15})
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("VIP_TOUCH")
    connector.log_action("COMPLAINT_DEFENSE", result="SUCCESS")
    staffs.append(connector)
    
    # 2. 기계적 우등생: 고성과 + 저시너지
    machine = StaffProfile(staff_id="S002", name="이성과", biz_type="restaurant")
    machine.update_performance({"sales_per_hour": 70000})
    staffs.append(machine)
    
    # 3. 앵무새: 저성과 + 친절
    parrot = StaffProfile(staff_id="S003", name="박친절", biz_type="restaurant")
    parrot.update_performance({"sales_per_hour": 25000})
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("VIP_TOUCH")
    parrot.score_s = 40  # 친절 점수 직접 부여
    parrot.evaluate()
    staffs.append(parrot)
    
    # 4. 내부의 적: 실수 많음
    saboteur = StaffProfile(staff_id="S004", name="최실수", biz_type="sports")
    saboteur.update_performance({"conversion_rate": 0.1, "renewal_rate": 0.3})
    saboteur.add_entropy("late", 10)
    saboteur.add_entropy("mistake", 15)
    saboteur.add_entropy("complaint", 20)
    staffs.append(saboteur)
    
    # 5. 일반
    normal = StaffProfile(staff_id="S005", name="정보통", biz_type="academy")
    normal.update_performance({"retention_rate": 0.7, "grade_improvement": 5})
    staffs.append(normal)
    
    print("\n📊 직원 평가 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'P':>6} {'E':>6} {'S':>6} {'총점':>8} {'조치':<20}")
    print("-" * 80)
    
    for s in staffs:
        print(
            f"{s.name:<10} "
            f"{s.tier.emoji} {s.tier.name_kr:<10} "
            f"{s.score_p:>6.0f} "
            f"{s.score_e:>6.0f} "
            f"{s.score_s:>6.0f} "
            f"{s.final_score:>8.0f} "
            f"{s.tier.action:<20}"
        )
    
    # 커넥터 상세
    print("\n" + "-" * 70)
    print(f"\n💎 슈퍼 커넥터 '{connector.name}' 행동 로그:")
    for log in connector.action_logs:
        print(f"  - {log.action_type}: {log.result} (+{log.points})")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Staff Profile Model                               ║
║                          직원 DNA - 4대 유형 분류                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

직원 분류 철학:
- CONNECTOR (슈퍼 커넥터): 자기 일도 잘하고, 생태계 연결까지 만들어냄 → 승진 1순위
- MACHINE (기계적 우등생): 성과는 좋지만 시키는 일만 함 → 커넥터로 진화 유도
- PARROT (앵무새): 친절하지만 성과가 약함 → 접객 전담 배치
- SABOTEUR (내부의 적): 실수 많고 분위기 해침 → 경고 후 조치

핵심 변수:
- P (Performance): 성과 - 매출, 재등록률, 전환율
- E (Entropy): 리스크 - 지각, 실수, 고객 이탈
- S (Synergy): 연결력 - 매뉴얼 수행, 크로스 레퍼럴, 불만 방어
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import random


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffTier(str, Enum):
    """직원 4대 유형"""
    CONNECTOR = "CONNECTOR"   # 💎 슈퍼 커넥터
    MACHINE = "MACHINE"       # 🤖 기계적 우등생
    PARROT = "PARROT"         # 🦜 앵무새
    SABOTEUR = "SABOTEUR"     # 💣 내부의 적
    NORMAL = "NORMAL"         # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "CONNECTOR": "💎",
            "MACHINE": "🤖",
            "PARROT": "🦜",
            "SABOTEUR": "💣",
            "NORMAL": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "CONNECTOR": "슈퍼 커넥터",
            "MACHINE": "우등생",
            "PARROT": "친절왕",
            "SABOTEUR": "주의 대상",
            "NORMAL": "일반"
        }.get(self.value, "일반")
    
    @property
    def action(self) -> str:
        return {
            "CONNECTOR": "승진 1순위 / 인센티브 지급",
            "MACHINE": "시너지 교육 필요",
            "PARROT": "접객/상담 전담 배치",
            "SABOTEUR": "경고 / 재배치 검토",
            "NORMAL": "표준 관리"
        }.get(self.value, "표준 관리")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 평가 기준
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffThresholds:
    """직원 평가 기준"""
    
    # 가중치 - 시너지에 3배!
    WEIGHT_PERFORMANCE = 1.0
    WEIGHT_ENTROPY = -2.0       # 페널티
    WEIGHT_SYNERGY = 3.0        # 시너지 중시
    
    # 기준값
    HIGH_PERFORMANCE = 80       # 고성과 기준
    HIGH_SYNERGY = 50           # 고시너지 기준
    HIGH_ENTROPY = 30           # 고엔트로피 기준 (위험)
    CONNECTOR_THRESHOLD = 150   # 커넥터 총점 기준


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 행동 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffActionLog:
    """직원 행동 기록"""
    action_type: str           # VIP_TOUCH, CROSS_REFERRAL, MANUAL_CHECK, etc.
    timestamp: datetime
    points: int = 0            # 시너지 가산점
    customer_phone: str = ""   # 관련 고객
    result: str = ""           # SUCCESS, FAIL, PENDING
    metadata: Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffProfile:
    """
    직원 프로필
    
    P, E, S 3대 변수로 직원을 평가
    """
    
    # 식별자
    staff_id: str
    name: str
    biz_type: str              # academy, restaurant, sports
    position: str = "staff"    # staff, manager, chief
    
    # 3대 변수
    score_p: float = 50.0      # Performance (0~100)
    score_e: float = 0.0       # Entropy (0~100, 낮을수록 좋음)
    score_s: float = 0.0       # Synergy (0~100)
    
    # 평가 결과
    tier: StaffTier = StaffTier.NORMAL
    final_score: float = 0.0
    
    # 행동 로그
    action_logs: List[StaffActionLog] = field(default_factory=list)
    
    # 메타데이터
    joined_date: datetime = field(default_factory=datetime.now)
    last_evaluated: datetime = field(default_factory=datetime.now)
    warning_count: int = 0     # 경고 횟수
    
    def __post_init__(self):
        self.evaluate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 점수 계산
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def calculate_synergy_from_logs(self) -> float:
        """
        행동 로그 기반 시너지 점수 계산
        
        시너지 포인트 기준:
        - CROSS_REFERRAL (타 매장 연결 성공): +20점
        - VIP_TOUCH (VIP 고객 응대): +5점
        - MANUAL_COMPLIANCE (매뉴얼 준수): +5점
        - COMPLAINT_DEFENSE (불만 방어 성공): +10점
        - EMOTIONAL_CARE (정서적 케어): +3점
        """
        synergy_points = 0
        
        for log in self.action_logs:
            if log.action_type == "CROSS_REFERRAL" and log.result == "SUCCESS":
                synergy_points += 20
            elif log.action_type == "VIP_TOUCH":
                synergy_points += 5
            elif log.action_type == "MANUAL_COMPLIANCE":
                synergy_points += 5
            elif log.action_type == "COMPLAINT_DEFENSE" and log.result == "SUCCESS":
                synergy_points += 10
            elif log.action_type == "EMOTIONAL_CARE":
                synergy_points += 3
            else:
                synergy_points += log.points
        
        # 정규화 (0~100)
        return min(100, synergy_points)
    
    def log_action(
        self, 
        action_type: str, 
        points: int = 0, 
        result: str = "SUCCESS",
        customer_phone: str = "",
        **metadata
    ) -> "StaffProfile":
        """행동 기록 추가"""
        log = StaffActionLog(
            action_type=action_type,
            timestamp=datetime.now(),
            points=points,
            customer_phone=customer_phone,
            result=result,
            metadata=metadata
        )
        self.action_logs.append(log)
        
        # 시너지 점수 재계산
        self.score_s = self.calculate_synergy_from_logs()
        self.evaluate()
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 평가
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def evaluate(self) -> "StaffProfile":
        """
        최종 평가
        
        Score = (1.0 × P) + (3.0 × S) - (2.0 × E)
        """
        TH = StaffThresholds
        
        self.final_score = (
            TH.WEIGHT_PERFORMANCE * self.score_p +
            TH.WEIGHT_SYNERGY * self.score_s +
            TH.WEIGHT_ENTROPY * self.score_e
        )
        
        self.tier = self._determine_tier()
        self.last_evaluated = datetime.now()
        
        return self
    
    def _determine_tier(self) -> StaffTier:
        """
        등급 판정
        
        Decision Tree:
        1. 총점 >= 150 → CONNECTOR
        2. 고성과(P >= 80) + 저시너지(S < 20) → MACHINE
        3. 고엔트로피(E >= 30) → SABOTEUR
        4. 저성과(P < 40) + 고시너지(S >= 30) → PARROT
        5. 나머지 → NORMAL
        """
        TH = StaffThresholds
        
        if self.final_score >= TH.CONNECTOR_THRESHOLD:
            return StaffTier.CONNECTOR
        
        if self.score_p >= TH.HIGH_PERFORMANCE and self.score_s < 20:
            return StaffTier.MACHINE
        
        if self.score_e >= TH.HIGH_ENTROPY:
            return StaffTier.SABOTEUR
        
        if self.score_p < 40 and self.score_s >= 30:
            return StaffTier.PARROT
        
        return StaffTier.NORMAL
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # KPI 업데이트 (업종별)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def update_performance(self, kpi_data: Dict) -> "StaffProfile":
        """
        업종별 KPI 데이터로 성과(P) 업데이트
        
        Args:
            kpi_data: 업종별 KPI
                - academy: {"retention_rate": 0.85, "grade_improvement": 10}
                - restaurant: {"sales_per_hour": 50000, "table_turnover": 3}
                - sports: {"conversion_rate": 0.3, "renewal_rate": 0.7}
        """
        if self.biz_type == "academy":
            # 재등록률 + 성적 향상도
            retention = kpi_data.get("retention_rate", 0.5) * 100
            improvement = min(20, kpi_data.get("grade_improvement", 0))
            self.score_p = retention * 0.7 + improvement * 1.5
            
        elif self.biz_type == "restaurant":
            # 시간당 매출 (기준: 50,000원)
            sph = kpi_data.get("sales_per_hour", 30000)
            self.score_p = min(100, (sph / 50000) * 70)
            
        elif self.biz_type == "sports":
            # 전환율 + 연장률
            conversion = kpi_data.get("conversion_rate", 0.2) * 100
            renewal = kpi_data.get("renewal_rate", 0.5) * 100
            self.score_p = conversion * 0.5 + renewal * 0.5
        
        else:
            # 기본
            self.score_p = kpi_data.get("score", 50)
        
        self.evaluate()
        return self
    
    def add_entropy(self, reason: str, points: int = 10) -> "StaffProfile":
        """
        엔트로피(실수/리스크) 추가
        
        Args:
            reason: 사유 (late, mistake, complaint 등)
            points: 감점
        """
        self.score_e += points
        self.score_e = min(100, self.score_e)  # 최대 100
        
        # 경고 카운트
        if reason in ["late", "absent", "complaint"]:
            self.warning_count += 1
        
        self.evaluate()
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "staff_id": self.staff_id,
            "name": self.name,
            "biz_type": self.biz_type,
            "position": self.position,
            "score_p": round(self.score_p, 1),
            "score_e": round(self.score_e, 1),
            "score_s": round(self.score_s, 1),
            "final_score": round(self.final_score, 1),
            "tier": self.tier.value,
            "tier_emoji": self.tier.emoji,
            "tier_name_kr": self.tier.name_kr,
            "tier_action": self.tier.action,
            "warning_count": self.warning_count,
            "action_log_count": len(self.action_logs),
            "joined_date": self.joined_date.isoformat(),
            "last_evaluated": self.last_evaluated.isoformat(),
        }
    
    def get_recent_actions(self, days: int = 7) -> List[StaffActionLog]:
        """최근 N일 행동 로그"""
        cutoff = datetime.now() - timedelta(days=days)
        return [log for log in self.action_logs if log.timestamp >= cutoff]
    
    def __repr__(self) -> str:
        return (
            f"StaffProfile({self.name}, {self.tier.emoji} {self.tier.value}, "
            f"P={self.score_p:.0f}, E={self.score_e:.0f}, S={self.score_s:.0f}, "
            f"Final={self.final_score:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """직원 프로필 데모"""
    print("=" * 70)
    print("  👔 AUTUS-TRINITY Staff Profile Demo")
    print("=" * 70)
    
    staffs = []
    
    # 1. 슈퍼 커넥터: 고성과 + 고시너지
    connector = StaffProfile(staff_id="S001", name="김연결", biz_type="academy")
    connector.update_performance({"retention_rate": 0.95, "grade_improvement": 15})
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("VIP_TOUCH")
    connector.log_action("COMPLAINT_DEFENSE", result="SUCCESS")
    staffs.append(connector)
    
    # 2. 기계적 우등생: 고성과 + 저시너지
    machine = StaffProfile(staff_id="S002", name="이성과", biz_type="restaurant")
    machine.update_performance({"sales_per_hour": 70000})
    staffs.append(machine)
    
    # 3. 앵무새: 저성과 + 친절
    parrot = StaffProfile(staff_id="S003", name="박친절", biz_type="restaurant")
    parrot.update_performance({"sales_per_hour": 25000})
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("VIP_TOUCH")
    parrot.score_s = 40  # 친절 점수 직접 부여
    parrot.evaluate()
    staffs.append(parrot)
    
    # 4. 내부의 적: 실수 많음
    saboteur = StaffProfile(staff_id="S004", name="최실수", biz_type="sports")
    saboteur.update_performance({"conversion_rate": 0.1, "renewal_rate": 0.3})
    saboteur.add_entropy("late", 10)
    saboteur.add_entropy("mistake", 15)
    saboteur.add_entropy("complaint", 20)
    staffs.append(saboteur)
    
    # 5. 일반
    normal = StaffProfile(staff_id="S005", name="정보통", biz_type="academy")
    normal.update_performance({"retention_rate": 0.7, "grade_improvement": 5})
    staffs.append(normal)
    
    print("\n📊 직원 평가 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'P':>6} {'E':>6} {'S':>6} {'총점':>8} {'조치':<20}")
    print("-" * 80)
    
    for s in staffs:
        print(
            f"{s.name:<10} "
            f"{s.tier.emoji} {s.tier.name_kr:<10} "
            f"{s.score_p:>6.0f} "
            f"{s.score_e:>6.0f} "
            f"{s.score_s:>6.0f} "
            f"{s.final_score:>8.0f} "
            f"{s.tier.action:<20}"
        )
    
    # 커넥터 상세
    print("\n" + "-" * 70)
    print(f"\n💎 슈퍼 커넥터 '{connector.name}' 행동 로그:")
    for log in connector.action_logs:
        print(f"  - {log.action_type}: {log.result} (+{log.points})")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Staff Profile Model                               ║
║                          직원 DNA - 4대 유형 분류                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

직원 분류 철학:
- CONNECTOR (슈퍼 커넥터): 자기 일도 잘하고, 생태계 연결까지 만들어냄 → 승진 1순위
- MACHINE (기계적 우등생): 성과는 좋지만 시키는 일만 함 → 커넥터로 진화 유도
- PARROT (앵무새): 친절하지만 성과가 약함 → 접객 전담 배치
- SABOTEUR (내부의 적): 실수 많고 분위기 해침 → 경고 후 조치

핵심 변수:
- P (Performance): 성과 - 매출, 재등록률, 전환율
- E (Entropy): 리스크 - 지각, 실수, 고객 이탈
- S (Synergy): 연결력 - 매뉴얼 수행, 크로스 레퍼럴, 불만 방어
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import random


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffTier(str, Enum):
    """직원 4대 유형"""
    CONNECTOR = "CONNECTOR"   # 💎 슈퍼 커넥터
    MACHINE = "MACHINE"       # 🤖 기계적 우등생
    PARROT = "PARROT"         # 🦜 앵무새
    SABOTEUR = "SABOTEUR"     # 💣 내부의 적
    NORMAL = "NORMAL"         # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "CONNECTOR": "💎",
            "MACHINE": "🤖",
            "PARROT": "🦜",
            "SABOTEUR": "💣",
            "NORMAL": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "CONNECTOR": "슈퍼 커넥터",
            "MACHINE": "우등생",
            "PARROT": "친절왕",
            "SABOTEUR": "주의 대상",
            "NORMAL": "일반"
        }.get(self.value, "일반")
    
    @property
    def action(self) -> str:
        return {
            "CONNECTOR": "승진 1순위 / 인센티브 지급",
            "MACHINE": "시너지 교육 필요",
            "PARROT": "접객/상담 전담 배치",
            "SABOTEUR": "경고 / 재배치 검토",
            "NORMAL": "표준 관리"
        }.get(self.value, "표준 관리")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 평가 기준
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffThresholds:
    """직원 평가 기준"""
    
    # 가중치 - 시너지에 3배!
    WEIGHT_PERFORMANCE = 1.0
    WEIGHT_ENTROPY = -2.0       # 페널티
    WEIGHT_SYNERGY = 3.0        # 시너지 중시
    
    # 기준값
    HIGH_PERFORMANCE = 80       # 고성과 기준
    HIGH_SYNERGY = 50           # 고시너지 기준
    HIGH_ENTROPY = 30           # 고엔트로피 기준 (위험)
    CONNECTOR_THRESHOLD = 150   # 커넥터 총점 기준


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 행동 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffActionLog:
    """직원 행동 기록"""
    action_type: str           # VIP_TOUCH, CROSS_REFERRAL, MANUAL_CHECK, etc.
    timestamp: datetime
    points: int = 0            # 시너지 가산점
    customer_phone: str = ""   # 관련 고객
    result: str = ""           # SUCCESS, FAIL, PENDING
    metadata: Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffProfile:
    """
    직원 프로필
    
    P, E, S 3대 변수로 직원을 평가
    """
    
    # 식별자
    staff_id: str
    name: str
    biz_type: str              # academy, restaurant, sports
    position: str = "staff"    # staff, manager, chief
    
    # 3대 변수
    score_p: float = 50.0      # Performance (0~100)
    score_e: float = 0.0       # Entropy (0~100, 낮을수록 좋음)
    score_s: float = 0.0       # Synergy (0~100)
    
    # 평가 결과
    tier: StaffTier = StaffTier.NORMAL
    final_score: float = 0.0
    
    # 행동 로그
    action_logs: List[StaffActionLog] = field(default_factory=list)
    
    # 메타데이터
    joined_date: datetime = field(default_factory=datetime.now)
    last_evaluated: datetime = field(default_factory=datetime.now)
    warning_count: int = 0     # 경고 횟수
    
    def __post_init__(self):
        self.evaluate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 점수 계산
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def calculate_synergy_from_logs(self) -> float:
        """
        행동 로그 기반 시너지 점수 계산
        
        시너지 포인트 기준:
        - CROSS_REFERRAL (타 매장 연결 성공): +20점
        - VIP_TOUCH (VIP 고객 응대): +5점
        - MANUAL_COMPLIANCE (매뉴얼 준수): +5점
        - COMPLAINT_DEFENSE (불만 방어 성공): +10점
        - EMOTIONAL_CARE (정서적 케어): +3점
        """
        synergy_points = 0
        
        for log in self.action_logs:
            if log.action_type == "CROSS_REFERRAL" and log.result == "SUCCESS":
                synergy_points += 20
            elif log.action_type == "VIP_TOUCH":
                synergy_points += 5
            elif log.action_type == "MANUAL_COMPLIANCE":
                synergy_points += 5
            elif log.action_type == "COMPLAINT_DEFENSE" and log.result == "SUCCESS":
                synergy_points += 10
            elif log.action_type == "EMOTIONAL_CARE":
                synergy_points += 3
            else:
                synergy_points += log.points
        
        # 정규화 (0~100)
        return min(100, synergy_points)
    
    def log_action(
        self, 
        action_type: str, 
        points: int = 0, 
        result: str = "SUCCESS",
        customer_phone: str = "",
        **metadata
    ) -> "StaffProfile":
        """행동 기록 추가"""
        log = StaffActionLog(
            action_type=action_type,
            timestamp=datetime.now(),
            points=points,
            customer_phone=customer_phone,
            result=result,
            metadata=metadata
        )
        self.action_logs.append(log)
        
        # 시너지 점수 재계산
        self.score_s = self.calculate_synergy_from_logs()
        self.evaluate()
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 평가
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def evaluate(self) -> "StaffProfile":
        """
        최종 평가
        
        Score = (1.0 × P) + (3.0 × S) - (2.0 × E)
        """
        TH = StaffThresholds
        
        self.final_score = (
            TH.WEIGHT_PERFORMANCE * self.score_p +
            TH.WEIGHT_SYNERGY * self.score_s +
            TH.WEIGHT_ENTROPY * self.score_e
        )
        
        self.tier = self._determine_tier()
        self.last_evaluated = datetime.now()
        
        return self
    
    def _determine_tier(self) -> StaffTier:
        """
        등급 판정
        
        Decision Tree:
        1. 총점 >= 150 → CONNECTOR
        2. 고성과(P >= 80) + 저시너지(S < 20) → MACHINE
        3. 고엔트로피(E >= 30) → SABOTEUR
        4. 저성과(P < 40) + 고시너지(S >= 30) → PARROT
        5. 나머지 → NORMAL
        """
        TH = StaffThresholds
        
        if self.final_score >= TH.CONNECTOR_THRESHOLD:
            return StaffTier.CONNECTOR
        
        if self.score_p >= TH.HIGH_PERFORMANCE and self.score_s < 20:
            return StaffTier.MACHINE
        
        if self.score_e >= TH.HIGH_ENTROPY:
            return StaffTier.SABOTEUR
        
        if self.score_p < 40 and self.score_s >= 30:
            return StaffTier.PARROT
        
        return StaffTier.NORMAL
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # KPI 업데이트 (업종별)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def update_performance(self, kpi_data: Dict) -> "StaffProfile":
        """
        업종별 KPI 데이터로 성과(P) 업데이트
        
        Args:
            kpi_data: 업종별 KPI
                - academy: {"retention_rate": 0.85, "grade_improvement": 10}
                - restaurant: {"sales_per_hour": 50000, "table_turnover": 3}
                - sports: {"conversion_rate": 0.3, "renewal_rate": 0.7}
        """
        if self.biz_type == "academy":
            # 재등록률 + 성적 향상도
            retention = kpi_data.get("retention_rate", 0.5) * 100
            improvement = min(20, kpi_data.get("grade_improvement", 0))
            self.score_p = retention * 0.7 + improvement * 1.5
            
        elif self.biz_type == "restaurant":
            # 시간당 매출 (기준: 50,000원)
            sph = kpi_data.get("sales_per_hour", 30000)
            self.score_p = min(100, (sph / 50000) * 70)
            
        elif self.biz_type == "sports":
            # 전환율 + 연장률
            conversion = kpi_data.get("conversion_rate", 0.2) * 100
            renewal = kpi_data.get("renewal_rate", 0.5) * 100
            self.score_p = conversion * 0.5 + renewal * 0.5
        
        else:
            # 기본
            self.score_p = kpi_data.get("score", 50)
        
        self.evaluate()
        return self
    
    def add_entropy(self, reason: str, points: int = 10) -> "StaffProfile":
        """
        엔트로피(실수/리스크) 추가
        
        Args:
            reason: 사유 (late, mistake, complaint 등)
            points: 감점
        """
        self.score_e += points
        self.score_e = min(100, self.score_e)  # 최대 100
        
        # 경고 카운트
        if reason in ["late", "absent", "complaint"]:
            self.warning_count += 1
        
        self.evaluate()
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "staff_id": self.staff_id,
            "name": self.name,
            "biz_type": self.biz_type,
            "position": self.position,
            "score_p": round(self.score_p, 1),
            "score_e": round(self.score_e, 1),
            "score_s": round(self.score_s, 1),
            "final_score": round(self.final_score, 1),
            "tier": self.tier.value,
            "tier_emoji": self.tier.emoji,
            "tier_name_kr": self.tier.name_kr,
            "tier_action": self.tier.action,
            "warning_count": self.warning_count,
            "action_log_count": len(self.action_logs),
            "joined_date": self.joined_date.isoformat(),
            "last_evaluated": self.last_evaluated.isoformat(),
        }
    
    def get_recent_actions(self, days: int = 7) -> List[StaffActionLog]:
        """최근 N일 행동 로그"""
        cutoff = datetime.now() - timedelta(days=days)
        return [log for log in self.action_logs if log.timestamp >= cutoff]
    
    def __repr__(self) -> str:
        return (
            f"StaffProfile({self.name}, {self.tier.emoji} {self.tier.value}, "
            f"P={self.score_p:.0f}, E={self.score_e:.0f}, S={self.score_s:.0f}, "
            f"Final={self.final_score:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """직원 프로필 데모"""
    print("=" * 70)
    print("  👔 AUTUS-TRINITY Staff Profile Demo")
    print("=" * 70)
    
    staffs = []
    
    # 1. 슈퍼 커넥터: 고성과 + 고시너지
    connector = StaffProfile(staff_id="S001", name="김연결", biz_type="academy")
    connector.update_performance({"retention_rate": 0.95, "grade_improvement": 15})
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("VIP_TOUCH")
    connector.log_action("COMPLAINT_DEFENSE", result="SUCCESS")
    staffs.append(connector)
    
    # 2. 기계적 우등생: 고성과 + 저시너지
    machine = StaffProfile(staff_id="S002", name="이성과", biz_type="restaurant")
    machine.update_performance({"sales_per_hour": 70000})
    staffs.append(machine)
    
    # 3. 앵무새: 저성과 + 친절
    parrot = StaffProfile(staff_id="S003", name="박친절", biz_type="restaurant")
    parrot.update_performance({"sales_per_hour": 25000})
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("VIP_TOUCH")
    parrot.score_s = 40  # 친절 점수 직접 부여
    parrot.evaluate()
    staffs.append(parrot)
    
    # 4. 내부의 적: 실수 많음
    saboteur = StaffProfile(staff_id="S004", name="최실수", biz_type="sports")
    saboteur.update_performance({"conversion_rate": 0.1, "renewal_rate": 0.3})
    saboteur.add_entropy("late", 10)
    saboteur.add_entropy("mistake", 15)
    saboteur.add_entropy("complaint", 20)
    staffs.append(saboteur)
    
    # 5. 일반
    normal = StaffProfile(staff_id="S005", name="정보통", biz_type="academy")
    normal.update_performance({"retention_rate": 0.7, "grade_improvement": 5})
    staffs.append(normal)
    
    print("\n📊 직원 평가 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'P':>6} {'E':>6} {'S':>6} {'총점':>8} {'조치':<20}")
    print("-" * 80)
    
    for s in staffs:
        print(
            f"{s.name:<10} "
            f"{s.tier.emoji} {s.tier.name_kr:<10} "
            f"{s.score_p:>6.0f} "
            f"{s.score_e:>6.0f} "
            f"{s.score_s:>6.0f} "
            f"{s.final_score:>8.0f} "
            f"{s.tier.action:<20}"
        )
    
    # 커넥터 상세
    print("\n" + "-" * 70)
    print(f"\n💎 슈퍼 커넥터 '{connector.name}' 행동 로그:")
    for log in connector.action_logs:
        print(f"  - {log.action_type}: {log.result} (+{log.points})")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Staff Profile Model                               ║
║                          직원 DNA - 4대 유형 분류                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

직원 분류 철학:
- CONNECTOR (슈퍼 커넥터): 자기 일도 잘하고, 생태계 연결까지 만들어냄 → 승진 1순위
- MACHINE (기계적 우등생): 성과는 좋지만 시키는 일만 함 → 커넥터로 진화 유도
- PARROT (앵무새): 친절하지만 성과가 약함 → 접객 전담 배치
- SABOTEUR (내부의 적): 실수 많고 분위기 해침 → 경고 후 조치

핵심 변수:
- P (Performance): 성과 - 매출, 재등록률, 전환율
- E (Entropy): 리스크 - 지각, 실수, 고객 이탈
- S (Synergy): 연결력 - 매뉴얼 수행, 크로스 레퍼럴, 불만 방어
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import random


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffTier(str, Enum):
    """직원 4대 유형"""
    CONNECTOR = "CONNECTOR"   # 💎 슈퍼 커넥터
    MACHINE = "MACHINE"       # 🤖 기계적 우등생
    PARROT = "PARROT"         # 🦜 앵무새
    SABOTEUR = "SABOTEUR"     # 💣 내부의 적
    NORMAL = "NORMAL"         # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "CONNECTOR": "💎",
            "MACHINE": "🤖",
            "PARROT": "🦜",
            "SABOTEUR": "💣",
            "NORMAL": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "CONNECTOR": "슈퍼 커넥터",
            "MACHINE": "우등생",
            "PARROT": "친절왕",
            "SABOTEUR": "주의 대상",
            "NORMAL": "일반"
        }.get(self.value, "일반")
    
    @property
    def action(self) -> str:
        return {
            "CONNECTOR": "승진 1순위 / 인센티브 지급",
            "MACHINE": "시너지 교육 필요",
            "PARROT": "접객/상담 전담 배치",
            "SABOTEUR": "경고 / 재배치 검토",
            "NORMAL": "표준 관리"
        }.get(self.value, "표준 관리")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 평가 기준
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffThresholds:
    """직원 평가 기준"""
    
    # 가중치 - 시너지에 3배!
    WEIGHT_PERFORMANCE = 1.0
    WEIGHT_ENTROPY = -2.0       # 페널티
    WEIGHT_SYNERGY = 3.0        # 시너지 중시
    
    # 기준값
    HIGH_PERFORMANCE = 80       # 고성과 기준
    HIGH_SYNERGY = 50           # 고시너지 기준
    HIGH_ENTROPY = 30           # 고엔트로피 기준 (위험)
    CONNECTOR_THRESHOLD = 150   # 커넥터 총점 기준


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 행동 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffActionLog:
    """직원 행동 기록"""
    action_type: str           # VIP_TOUCH, CROSS_REFERRAL, MANUAL_CHECK, etc.
    timestamp: datetime
    points: int = 0            # 시너지 가산점
    customer_phone: str = ""   # 관련 고객
    result: str = ""           # SUCCESS, FAIL, PENDING
    metadata: Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffProfile:
    """
    직원 프로필
    
    P, E, S 3대 변수로 직원을 평가
    """
    
    # 식별자
    staff_id: str
    name: str
    biz_type: str              # academy, restaurant, sports
    position: str = "staff"    # staff, manager, chief
    
    # 3대 변수
    score_p: float = 50.0      # Performance (0~100)
    score_e: float = 0.0       # Entropy (0~100, 낮을수록 좋음)
    score_s: float = 0.0       # Synergy (0~100)
    
    # 평가 결과
    tier: StaffTier = StaffTier.NORMAL
    final_score: float = 0.0
    
    # 행동 로그
    action_logs: List[StaffActionLog] = field(default_factory=list)
    
    # 메타데이터
    joined_date: datetime = field(default_factory=datetime.now)
    last_evaluated: datetime = field(default_factory=datetime.now)
    warning_count: int = 0     # 경고 횟수
    
    def __post_init__(self):
        self.evaluate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 점수 계산
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def calculate_synergy_from_logs(self) -> float:
        """
        행동 로그 기반 시너지 점수 계산
        
        시너지 포인트 기준:
        - CROSS_REFERRAL (타 매장 연결 성공): +20점
        - VIP_TOUCH (VIP 고객 응대): +5점
        - MANUAL_COMPLIANCE (매뉴얼 준수): +5점
        - COMPLAINT_DEFENSE (불만 방어 성공): +10점
        - EMOTIONAL_CARE (정서적 케어): +3점
        """
        synergy_points = 0
        
        for log in self.action_logs:
            if log.action_type == "CROSS_REFERRAL" and log.result == "SUCCESS":
                synergy_points += 20
            elif log.action_type == "VIP_TOUCH":
                synergy_points += 5
            elif log.action_type == "MANUAL_COMPLIANCE":
                synergy_points += 5
            elif log.action_type == "COMPLAINT_DEFENSE" and log.result == "SUCCESS":
                synergy_points += 10
            elif log.action_type == "EMOTIONAL_CARE":
                synergy_points += 3
            else:
                synergy_points += log.points
        
        # 정규화 (0~100)
        return min(100, synergy_points)
    
    def log_action(
        self, 
        action_type: str, 
        points: int = 0, 
        result: str = "SUCCESS",
        customer_phone: str = "",
        **metadata
    ) -> "StaffProfile":
        """행동 기록 추가"""
        log = StaffActionLog(
            action_type=action_type,
            timestamp=datetime.now(),
            points=points,
            customer_phone=customer_phone,
            result=result,
            metadata=metadata
        )
        self.action_logs.append(log)
        
        # 시너지 점수 재계산
        self.score_s = self.calculate_synergy_from_logs()
        self.evaluate()
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 평가
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def evaluate(self) -> "StaffProfile":
        """
        최종 평가
        
        Score = (1.0 × P) + (3.0 × S) - (2.0 × E)
        """
        TH = StaffThresholds
        
        self.final_score = (
            TH.WEIGHT_PERFORMANCE * self.score_p +
            TH.WEIGHT_SYNERGY * self.score_s +
            TH.WEIGHT_ENTROPY * self.score_e
        )
        
        self.tier = self._determine_tier()
        self.last_evaluated = datetime.now()
        
        return self
    
    def _determine_tier(self) -> StaffTier:
        """
        등급 판정
        
        Decision Tree:
        1. 총점 >= 150 → CONNECTOR
        2. 고성과(P >= 80) + 저시너지(S < 20) → MACHINE
        3. 고엔트로피(E >= 30) → SABOTEUR
        4. 저성과(P < 40) + 고시너지(S >= 30) → PARROT
        5. 나머지 → NORMAL
        """
        TH = StaffThresholds
        
        if self.final_score >= TH.CONNECTOR_THRESHOLD:
            return StaffTier.CONNECTOR
        
        if self.score_p >= TH.HIGH_PERFORMANCE and self.score_s < 20:
            return StaffTier.MACHINE
        
        if self.score_e >= TH.HIGH_ENTROPY:
            return StaffTier.SABOTEUR
        
        if self.score_p < 40 and self.score_s >= 30:
            return StaffTier.PARROT
        
        return StaffTier.NORMAL
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # KPI 업데이트 (업종별)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def update_performance(self, kpi_data: Dict) -> "StaffProfile":
        """
        업종별 KPI 데이터로 성과(P) 업데이트
        
        Args:
            kpi_data: 업종별 KPI
                - academy: {"retention_rate": 0.85, "grade_improvement": 10}
                - restaurant: {"sales_per_hour": 50000, "table_turnover": 3}
                - sports: {"conversion_rate": 0.3, "renewal_rate": 0.7}
        """
        if self.biz_type == "academy":
            # 재등록률 + 성적 향상도
            retention = kpi_data.get("retention_rate", 0.5) * 100
            improvement = min(20, kpi_data.get("grade_improvement", 0))
            self.score_p = retention * 0.7 + improvement * 1.5
            
        elif self.biz_type == "restaurant":
            # 시간당 매출 (기준: 50,000원)
            sph = kpi_data.get("sales_per_hour", 30000)
            self.score_p = min(100, (sph / 50000) * 70)
            
        elif self.biz_type == "sports":
            # 전환율 + 연장률
            conversion = kpi_data.get("conversion_rate", 0.2) * 100
            renewal = kpi_data.get("renewal_rate", 0.5) * 100
            self.score_p = conversion * 0.5 + renewal * 0.5
        
        else:
            # 기본
            self.score_p = kpi_data.get("score", 50)
        
        self.evaluate()
        return self
    
    def add_entropy(self, reason: str, points: int = 10) -> "StaffProfile":
        """
        엔트로피(실수/리스크) 추가
        
        Args:
            reason: 사유 (late, mistake, complaint 등)
            points: 감점
        """
        self.score_e += points
        self.score_e = min(100, self.score_e)  # 최대 100
        
        # 경고 카운트
        if reason in ["late", "absent", "complaint"]:
            self.warning_count += 1
        
        self.evaluate()
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "staff_id": self.staff_id,
            "name": self.name,
            "biz_type": self.biz_type,
            "position": self.position,
            "score_p": round(self.score_p, 1),
            "score_e": round(self.score_e, 1),
            "score_s": round(self.score_s, 1),
            "final_score": round(self.final_score, 1),
            "tier": self.tier.value,
            "tier_emoji": self.tier.emoji,
            "tier_name_kr": self.tier.name_kr,
            "tier_action": self.tier.action,
            "warning_count": self.warning_count,
            "action_log_count": len(self.action_logs),
            "joined_date": self.joined_date.isoformat(),
            "last_evaluated": self.last_evaluated.isoformat(),
        }
    
    def get_recent_actions(self, days: int = 7) -> List[StaffActionLog]:
        """최근 N일 행동 로그"""
        cutoff = datetime.now() - timedelta(days=days)
        return [log for log in self.action_logs if log.timestamp >= cutoff]
    
    def __repr__(self) -> str:
        return (
            f"StaffProfile({self.name}, {self.tier.emoji} {self.tier.value}, "
            f"P={self.score_p:.0f}, E={self.score_e:.0f}, S={self.score_s:.0f}, "
            f"Final={self.final_score:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """직원 프로필 데모"""
    print("=" * 70)
    print("  👔 AUTUS-TRINITY Staff Profile Demo")
    print("=" * 70)
    
    staffs = []
    
    # 1. 슈퍼 커넥터: 고성과 + 고시너지
    connector = StaffProfile(staff_id="S001", name="김연결", biz_type="academy")
    connector.update_performance({"retention_rate": 0.95, "grade_improvement": 15})
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("VIP_TOUCH")
    connector.log_action("COMPLAINT_DEFENSE", result="SUCCESS")
    staffs.append(connector)
    
    # 2. 기계적 우등생: 고성과 + 저시너지
    machine = StaffProfile(staff_id="S002", name="이성과", biz_type="restaurant")
    machine.update_performance({"sales_per_hour": 70000})
    staffs.append(machine)
    
    # 3. 앵무새: 저성과 + 친절
    parrot = StaffProfile(staff_id="S003", name="박친절", biz_type="restaurant")
    parrot.update_performance({"sales_per_hour": 25000})
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("VIP_TOUCH")
    parrot.score_s = 40  # 친절 점수 직접 부여
    parrot.evaluate()
    staffs.append(parrot)
    
    # 4. 내부의 적: 실수 많음
    saboteur = StaffProfile(staff_id="S004", name="최실수", biz_type="sports")
    saboteur.update_performance({"conversion_rate": 0.1, "renewal_rate": 0.3})
    saboteur.add_entropy("late", 10)
    saboteur.add_entropy("mistake", 15)
    saboteur.add_entropy("complaint", 20)
    staffs.append(saboteur)
    
    # 5. 일반
    normal = StaffProfile(staff_id="S005", name="정보통", biz_type="academy")
    normal.update_performance({"retention_rate": 0.7, "grade_improvement": 5})
    staffs.append(normal)
    
    print("\n📊 직원 평가 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'P':>6} {'E':>6} {'S':>6} {'총점':>8} {'조치':<20}")
    print("-" * 80)
    
    for s in staffs:
        print(
            f"{s.name:<10} "
            f"{s.tier.emoji} {s.tier.name_kr:<10} "
            f"{s.score_p:>6.0f} "
            f"{s.score_e:>6.0f} "
            f"{s.score_s:>6.0f} "
            f"{s.final_score:>8.0f} "
            f"{s.tier.action:<20}"
        )
    
    # 커넥터 상세
    print("\n" + "-" * 70)
    print(f"\n💎 슈퍼 커넥터 '{connector.name}' 행동 로그:")
    for log in connector.action_logs:
        print(f"  - {log.action_type}: {log.result} (+{log.points})")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Staff Profile Model                               ║
║                          직원 DNA - 4대 유형 분류                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

직원 분류 철학:
- CONNECTOR (슈퍼 커넥터): 자기 일도 잘하고, 생태계 연결까지 만들어냄 → 승진 1순위
- MACHINE (기계적 우등생): 성과는 좋지만 시키는 일만 함 → 커넥터로 진화 유도
- PARROT (앵무새): 친절하지만 성과가 약함 → 접객 전담 배치
- SABOTEUR (내부의 적): 실수 많고 분위기 해침 → 경고 후 조치

핵심 변수:
- P (Performance): 성과 - 매출, 재등록률, 전환율
- E (Entropy): 리스크 - 지각, 실수, 고객 이탈
- S (Synergy): 연결력 - 매뉴얼 수행, 크로스 레퍼럴, 불만 방어
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import random


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffTier(str, Enum):
    """직원 4대 유형"""
    CONNECTOR = "CONNECTOR"   # 💎 슈퍼 커넥터
    MACHINE = "MACHINE"       # 🤖 기계적 우등생
    PARROT = "PARROT"         # 🦜 앵무새
    SABOTEUR = "SABOTEUR"     # 💣 내부의 적
    NORMAL = "NORMAL"         # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "CONNECTOR": "💎",
            "MACHINE": "🤖",
            "PARROT": "🦜",
            "SABOTEUR": "💣",
            "NORMAL": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "CONNECTOR": "슈퍼 커넥터",
            "MACHINE": "우등생",
            "PARROT": "친절왕",
            "SABOTEUR": "주의 대상",
            "NORMAL": "일반"
        }.get(self.value, "일반")
    
    @property
    def action(self) -> str:
        return {
            "CONNECTOR": "승진 1순위 / 인센티브 지급",
            "MACHINE": "시너지 교육 필요",
            "PARROT": "접객/상담 전담 배치",
            "SABOTEUR": "경고 / 재배치 검토",
            "NORMAL": "표준 관리"
        }.get(self.value, "표준 관리")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 평가 기준
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffThresholds:
    """직원 평가 기준"""
    
    # 가중치 - 시너지에 3배!
    WEIGHT_PERFORMANCE = 1.0
    WEIGHT_ENTROPY = -2.0       # 페널티
    WEIGHT_SYNERGY = 3.0        # 시너지 중시
    
    # 기준값
    HIGH_PERFORMANCE = 80       # 고성과 기준
    HIGH_SYNERGY = 50           # 고시너지 기준
    HIGH_ENTROPY = 30           # 고엔트로피 기준 (위험)
    CONNECTOR_THRESHOLD = 150   # 커넥터 총점 기준


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 행동 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffActionLog:
    """직원 행동 기록"""
    action_type: str           # VIP_TOUCH, CROSS_REFERRAL, MANUAL_CHECK, etc.
    timestamp: datetime
    points: int = 0            # 시너지 가산점
    customer_phone: str = ""   # 관련 고객
    result: str = ""           # SUCCESS, FAIL, PENDING
    metadata: Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffProfile:
    """
    직원 프로필
    
    P, E, S 3대 변수로 직원을 평가
    """
    
    # 식별자
    staff_id: str
    name: str
    biz_type: str              # academy, restaurant, sports
    position: str = "staff"    # staff, manager, chief
    
    # 3대 변수
    score_p: float = 50.0      # Performance (0~100)
    score_e: float = 0.0       # Entropy (0~100, 낮을수록 좋음)
    score_s: float = 0.0       # Synergy (0~100)
    
    # 평가 결과
    tier: StaffTier = StaffTier.NORMAL
    final_score: float = 0.0
    
    # 행동 로그
    action_logs: List[StaffActionLog] = field(default_factory=list)
    
    # 메타데이터
    joined_date: datetime = field(default_factory=datetime.now)
    last_evaluated: datetime = field(default_factory=datetime.now)
    warning_count: int = 0     # 경고 횟수
    
    def __post_init__(self):
        self.evaluate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 점수 계산
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def calculate_synergy_from_logs(self) -> float:
        """
        행동 로그 기반 시너지 점수 계산
        
        시너지 포인트 기준:
        - CROSS_REFERRAL (타 매장 연결 성공): +20점
        - VIP_TOUCH (VIP 고객 응대): +5점
        - MANUAL_COMPLIANCE (매뉴얼 준수): +5점
        - COMPLAINT_DEFENSE (불만 방어 성공): +10점
        - EMOTIONAL_CARE (정서적 케어): +3점
        """
        synergy_points = 0
        
        for log in self.action_logs:
            if log.action_type == "CROSS_REFERRAL" and log.result == "SUCCESS":
                synergy_points += 20
            elif log.action_type == "VIP_TOUCH":
                synergy_points += 5
            elif log.action_type == "MANUAL_COMPLIANCE":
                synergy_points += 5
            elif log.action_type == "COMPLAINT_DEFENSE" and log.result == "SUCCESS":
                synergy_points += 10
            elif log.action_type == "EMOTIONAL_CARE":
                synergy_points += 3
            else:
                synergy_points += log.points
        
        # 정규화 (0~100)
        return min(100, synergy_points)
    
    def log_action(
        self, 
        action_type: str, 
        points: int = 0, 
        result: str = "SUCCESS",
        customer_phone: str = "",
        **metadata
    ) -> "StaffProfile":
        """행동 기록 추가"""
        log = StaffActionLog(
            action_type=action_type,
            timestamp=datetime.now(),
            points=points,
            customer_phone=customer_phone,
            result=result,
            metadata=metadata
        )
        self.action_logs.append(log)
        
        # 시너지 점수 재계산
        self.score_s = self.calculate_synergy_from_logs()
        self.evaluate()
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 평가
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def evaluate(self) -> "StaffProfile":
        """
        최종 평가
        
        Score = (1.0 × P) + (3.0 × S) - (2.0 × E)
        """
        TH = StaffThresholds
        
        self.final_score = (
            TH.WEIGHT_PERFORMANCE * self.score_p +
            TH.WEIGHT_SYNERGY * self.score_s +
            TH.WEIGHT_ENTROPY * self.score_e
        )
        
        self.tier = self._determine_tier()
        self.last_evaluated = datetime.now()
        
        return self
    
    def _determine_tier(self) -> StaffTier:
        """
        등급 판정
        
        Decision Tree:
        1. 총점 >= 150 → CONNECTOR
        2. 고성과(P >= 80) + 저시너지(S < 20) → MACHINE
        3. 고엔트로피(E >= 30) → SABOTEUR
        4. 저성과(P < 40) + 고시너지(S >= 30) → PARROT
        5. 나머지 → NORMAL
        """
        TH = StaffThresholds
        
        if self.final_score >= TH.CONNECTOR_THRESHOLD:
            return StaffTier.CONNECTOR
        
        if self.score_p >= TH.HIGH_PERFORMANCE and self.score_s < 20:
            return StaffTier.MACHINE
        
        if self.score_e >= TH.HIGH_ENTROPY:
            return StaffTier.SABOTEUR
        
        if self.score_p < 40 and self.score_s >= 30:
            return StaffTier.PARROT
        
        return StaffTier.NORMAL
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # KPI 업데이트 (업종별)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def update_performance(self, kpi_data: Dict) -> "StaffProfile":
        """
        업종별 KPI 데이터로 성과(P) 업데이트
        
        Args:
            kpi_data: 업종별 KPI
                - academy: {"retention_rate": 0.85, "grade_improvement": 10}
                - restaurant: {"sales_per_hour": 50000, "table_turnover": 3}
                - sports: {"conversion_rate": 0.3, "renewal_rate": 0.7}
        """
        if self.biz_type == "academy":
            # 재등록률 + 성적 향상도
            retention = kpi_data.get("retention_rate", 0.5) * 100
            improvement = min(20, kpi_data.get("grade_improvement", 0))
            self.score_p = retention * 0.7 + improvement * 1.5
            
        elif self.biz_type == "restaurant":
            # 시간당 매출 (기준: 50,000원)
            sph = kpi_data.get("sales_per_hour", 30000)
            self.score_p = min(100, (sph / 50000) * 70)
            
        elif self.biz_type == "sports":
            # 전환율 + 연장률
            conversion = kpi_data.get("conversion_rate", 0.2) * 100
            renewal = kpi_data.get("renewal_rate", 0.5) * 100
            self.score_p = conversion * 0.5 + renewal * 0.5
        
        else:
            # 기본
            self.score_p = kpi_data.get("score", 50)
        
        self.evaluate()
        return self
    
    def add_entropy(self, reason: str, points: int = 10) -> "StaffProfile":
        """
        엔트로피(실수/리스크) 추가
        
        Args:
            reason: 사유 (late, mistake, complaint 등)
            points: 감점
        """
        self.score_e += points
        self.score_e = min(100, self.score_e)  # 최대 100
        
        # 경고 카운트
        if reason in ["late", "absent", "complaint"]:
            self.warning_count += 1
        
        self.evaluate()
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "staff_id": self.staff_id,
            "name": self.name,
            "biz_type": self.biz_type,
            "position": self.position,
            "score_p": round(self.score_p, 1),
            "score_e": round(self.score_e, 1),
            "score_s": round(self.score_s, 1),
            "final_score": round(self.final_score, 1),
            "tier": self.tier.value,
            "tier_emoji": self.tier.emoji,
            "tier_name_kr": self.tier.name_kr,
            "tier_action": self.tier.action,
            "warning_count": self.warning_count,
            "action_log_count": len(self.action_logs),
            "joined_date": self.joined_date.isoformat(),
            "last_evaluated": self.last_evaluated.isoformat(),
        }
    
    def get_recent_actions(self, days: int = 7) -> List[StaffActionLog]:
        """최근 N일 행동 로그"""
        cutoff = datetime.now() - timedelta(days=days)
        return [log for log in self.action_logs if log.timestamp >= cutoff]
    
    def __repr__(self) -> str:
        return (
            f"StaffProfile({self.name}, {self.tier.emoji} {self.tier.value}, "
            f"P={self.score_p:.0f}, E={self.score_e:.0f}, S={self.score_s:.0f}, "
            f"Final={self.final_score:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """직원 프로필 데모"""
    print("=" * 70)
    print("  👔 AUTUS-TRINITY Staff Profile Demo")
    print("=" * 70)
    
    staffs = []
    
    # 1. 슈퍼 커넥터: 고성과 + 고시너지
    connector = StaffProfile(staff_id="S001", name="김연결", biz_type="academy")
    connector.update_performance({"retention_rate": 0.95, "grade_improvement": 15})
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("VIP_TOUCH")
    connector.log_action("COMPLAINT_DEFENSE", result="SUCCESS")
    staffs.append(connector)
    
    # 2. 기계적 우등생: 고성과 + 저시너지
    machine = StaffProfile(staff_id="S002", name="이성과", biz_type="restaurant")
    machine.update_performance({"sales_per_hour": 70000})
    staffs.append(machine)
    
    # 3. 앵무새: 저성과 + 친절
    parrot = StaffProfile(staff_id="S003", name="박친절", biz_type="restaurant")
    parrot.update_performance({"sales_per_hour": 25000})
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("VIP_TOUCH")
    parrot.score_s = 40  # 친절 점수 직접 부여
    parrot.evaluate()
    staffs.append(parrot)
    
    # 4. 내부의 적: 실수 많음
    saboteur = StaffProfile(staff_id="S004", name="최실수", biz_type="sports")
    saboteur.update_performance({"conversion_rate": 0.1, "renewal_rate": 0.3})
    saboteur.add_entropy("late", 10)
    saboteur.add_entropy("mistake", 15)
    saboteur.add_entropy("complaint", 20)
    staffs.append(saboteur)
    
    # 5. 일반
    normal = StaffProfile(staff_id="S005", name="정보통", biz_type="academy")
    normal.update_performance({"retention_rate": 0.7, "grade_improvement": 5})
    staffs.append(normal)
    
    print("\n📊 직원 평가 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'P':>6} {'E':>6} {'S':>6} {'총점':>8} {'조치':<20}")
    print("-" * 80)
    
    for s in staffs:
        print(
            f"{s.name:<10} "
            f"{s.tier.emoji} {s.tier.name_kr:<10} "
            f"{s.score_p:>6.0f} "
            f"{s.score_e:>6.0f} "
            f"{s.score_s:>6.0f} "
            f"{s.final_score:>8.0f} "
            f"{s.tier.action:<20}"
        )
    
    # 커넥터 상세
    print("\n" + "-" * 70)
    print(f"\n💎 슈퍼 커넥터 '{connector.name}' 행동 로그:")
    for log in connector.action_logs:
        print(f"  - {log.action_type}: {log.result} (+{log.points})")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Staff Profile Model                               ║
║                          직원 DNA - 4대 유형 분류                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

직원 분류 철학:
- CONNECTOR (슈퍼 커넥터): 자기 일도 잘하고, 생태계 연결까지 만들어냄 → 승진 1순위
- MACHINE (기계적 우등생): 성과는 좋지만 시키는 일만 함 → 커넥터로 진화 유도
- PARROT (앵무새): 친절하지만 성과가 약함 → 접객 전담 배치
- SABOTEUR (내부의 적): 실수 많고 분위기 해침 → 경고 후 조치

핵심 변수:
- P (Performance): 성과 - 매출, 재등록률, 전환율
- E (Entropy): 리스크 - 지각, 실수, 고객 이탈
- S (Synergy): 연결력 - 매뉴얼 수행, 크로스 레퍼럴, 불만 방어
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import random


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffTier(str, Enum):
    """직원 4대 유형"""
    CONNECTOR = "CONNECTOR"   # 💎 슈퍼 커넥터
    MACHINE = "MACHINE"       # 🤖 기계적 우등생
    PARROT = "PARROT"         # 🦜 앵무새
    SABOTEUR = "SABOTEUR"     # 💣 내부의 적
    NORMAL = "NORMAL"         # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "CONNECTOR": "💎",
            "MACHINE": "🤖",
            "PARROT": "🦜",
            "SABOTEUR": "💣",
            "NORMAL": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "CONNECTOR": "슈퍼 커넥터",
            "MACHINE": "우등생",
            "PARROT": "친절왕",
            "SABOTEUR": "주의 대상",
            "NORMAL": "일반"
        }.get(self.value, "일반")
    
    @property
    def action(self) -> str:
        return {
            "CONNECTOR": "승진 1순위 / 인센티브 지급",
            "MACHINE": "시너지 교육 필요",
            "PARROT": "접객/상담 전담 배치",
            "SABOTEUR": "경고 / 재배치 검토",
            "NORMAL": "표준 관리"
        }.get(self.value, "표준 관리")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 평가 기준
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffThresholds:
    """직원 평가 기준"""
    
    # 가중치 - 시너지에 3배!
    WEIGHT_PERFORMANCE = 1.0
    WEIGHT_ENTROPY = -2.0       # 페널티
    WEIGHT_SYNERGY = 3.0        # 시너지 중시
    
    # 기준값
    HIGH_PERFORMANCE = 80       # 고성과 기준
    HIGH_SYNERGY = 50           # 고시너지 기준
    HIGH_ENTROPY = 30           # 고엔트로피 기준 (위험)
    CONNECTOR_THRESHOLD = 150   # 커넥터 총점 기준


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 행동 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffActionLog:
    """직원 행동 기록"""
    action_type: str           # VIP_TOUCH, CROSS_REFERRAL, MANUAL_CHECK, etc.
    timestamp: datetime
    points: int = 0            # 시너지 가산점
    customer_phone: str = ""   # 관련 고객
    result: str = ""           # SUCCESS, FAIL, PENDING
    metadata: Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffProfile:
    """
    직원 프로필
    
    P, E, S 3대 변수로 직원을 평가
    """
    
    # 식별자
    staff_id: str
    name: str
    biz_type: str              # academy, restaurant, sports
    position: str = "staff"    # staff, manager, chief
    
    # 3대 변수
    score_p: float = 50.0      # Performance (0~100)
    score_e: float = 0.0       # Entropy (0~100, 낮을수록 좋음)
    score_s: float = 0.0       # Synergy (0~100)
    
    # 평가 결과
    tier: StaffTier = StaffTier.NORMAL
    final_score: float = 0.0
    
    # 행동 로그
    action_logs: List[StaffActionLog] = field(default_factory=list)
    
    # 메타데이터
    joined_date: datetime = field(default_factory=datetime.now)
    last_evaluated: datetime = field(default_factory=datetime.now)
    warning_count: int = 0     # 경고 횟수
    
    def __post_init__(self):
        self.evaluate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 점수 계산
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def calculate_synergy_from_logs(self) -> float:
        """
        행동 로그 기반 시너지 점수 계산
        
        시너지 포인트 기준:
        - CROSS_REFERRAL (타 매장 연결 성공): +20점
        - VIP_TOUCH (VIP 고객 응대): +5점
        - MANUAL_COMPLIANCE (매뉴얼 준수): +5점
        - COMPLAINT_DEFENSE (불만 방어 성공): +10점
        - EMOTIONAL_CARE (정서적 케어): +3점
        """
        synergy_points = 0
        
        for log in self.action_logs:
            if log.action_type == "CROSS_REFERRAL" and log.result == "SUCCESS":
                synergy_points += 20
            elif log.action_type == "VIP_TOUCH":
                synergy_points += 5
            elif log.action_type == "MANUAL_COMPLIANCE":
                synergy_points += 5
            elif log.action_type == "COMPLAINT_DEFENSE" and log.result == "SUCCESS":
                synergy_points += 10
            elif log.action_type == "EMOTIONAL_CARE":
                synergy_points += 3
            else:
                synergy_points += log.points
        
        # 정규화 (0~100)
        return min(100, synergy_points)
    
    def log_action(
        self, 
        action_type: str, 
        points: int = 0, 
        result: str = "SUCCESS",
        customer_phone: str = "",
        **metadata
    ) -> "StaffProfile":
        """행동 기록 추가"""
        log = StaffActionLog(
            action_type=action_type,
            timestamp=datetime.now(),
            points=points,
            customer_phone=customer_phone,
            result=result,
            metadata=metadata
        )
        self.action_logs.append(log)
        
        # 시너지 점수 재계산
        self.score_s = self.calculate_synergy_from_logs()
        self.evaluate()
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 평가
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def evaluate(self) -> "StaffProfile":
        """
        최종 평가
        
        Score = (1.0 × P) + (3.0 × S) - (2.0 × E)
        """
        TH = StaffThresholds
        
        self.final_score = (
            TH.WEIGHT_PERFORMANCE * self.score_p +
            TH.WEIGHT_SYNERGY * self.score_s +
            TH.WEIGHT_ENTROPY * self.score_e
        )
        
        self.tier = self._determine_tier()
        self.last_evaluated = datetime.now()
        
        return self
    
    def _determine_tier(self) -> StaffTier:
        """
        등급 판정
        
        Decision Tree:
        1. 총점 >= 150 → CONNECTOR
        2. 고성과(P >= 80) + 저시너지(S < 20) → MACHINE
        3. 고엔트로피(E >= 30) → SABOTEUR
        4. 저성과(P < 40) + 고시너지(S >= 30) → PARROT
        5. 나머지 → NORMAL
        """
        TH = StaffThresholds
        
        if self.final_score >= TH.CONNECTOR_THRESHOLD:
            return StaffTier.CONNECTOR
        
        if self.score_p >= TH.HIGH_PERFORMANCE and self.score_s < 20:
            return StaffTier.MACHINE
        
        if self.score_e >= TH.HIGH_ENTROPY:
            return StaffTier.SABOTEUR
        
        if self.score_p < 40 and self.score_s >= 30:
            return StaffTier.PARROT
        
        return StaffTier.NORMAL
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # KPI 업데이트 (업종별)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def update_performance(self, kpi_data: Dict) -> "StaffProfile":
        """
        업종별 KPI 데이터로 성과(P) 업데이트
        
        Args:
            kpi_data: 업종별 KPI
                - academy: {"retention_rate": 0.85, "grade_improvement": 10}
                - restaurant: {"sales_per_hour": 50000, "table_turnover": 3}
                - sports: {"conversion_rate": 0.3, "renewal_rate": 0.7}
        """
        if self.biz_type == "academy":
            # 재등록률 + 성적 향상도
            retention = kpi_data.get("retention_rate", 0.5) * 100
            improvement = min(20, kpi_data.get("grade_improvement", 0))
            self.score_p = retention * 0.7 + improvement * 1.5
            
        elif self.biz_type == "restaurant":
            # 시간당 매출 (기준: 50,000원)
            sph = kpi_data.get("sales_per_hour", 30000)
            self.score_p = min(100, (sph / 50000) * 70)
            
        elif self.biz_type == "sports":
            # 전환율 + 연장률
            conversion = kpi_data.get("conversion_rate", 0.2) * 100
            renewal = kpi_data.get("renewal_rate", 0.5) * 100
            self.score_p = conversion * 0.5 + renewal * 0.5
        
        else:
            # 기본
            self.score_p = kpi_data.get("score", 50)
        
        self.evaluate()
        return self
    
    def add_entropy(self, reason: str, points: int = 10) -> "StaffProfile":
        """
        엔트로피(실수/리스크) 추가
        
        Args:
            reason: 사유 (late, mistake, complaint 등)
            points: 감점
        """
        self.score_e += points
        self.score_e = min(100, self.score_e)  # 최대 100
        
        # 경고 카운트
        if reason in ["late", "absent", "complaint"]:
            self.warning_count += 1
        
        self.evaluate()
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "staff_id": self.staff_id,
            "name": self.name,
            "biz_type": self.biz_type,
            "position": self.position,
            "score_p": round(self.score_p, 1),
            "score_e": round(self.score_e, 1),
            "score_s": round(self.score_s, 1),
            "final_score": round(self.final_score, 1),
            "tier": self.tier.value,
            "tier_emoji": self.tier.emoji,
            "tier_name_kr": self.tier.name_kr,
            "tier_action": self.tier.action,
            "warning_count": self.warning_count,
            "action_log_count": len(self.action_logs),
            "joined_date": self.joined_date.isoformat(),
            "last_evaluated": self.last_evaluated.isoformat(),
        }
    
    def get_recent_actions(self, days: int = 7) -> List[StaffActionLog]:
        """최근 N일 행동 로그"""
        cutoff = datetime.now() - timedelta(days=days)
        return [log for log in self.action_logs if log.timestamp >= cutoff]
    
    def __repr__(self) -> str:
        return (
            f"StaffProfile({self.name}, {self.tier.emoji} {self.tier.value}, "
            f"P={self.score_p:.0f}, E={self.score_e:.0f}, S={self.score_s:.0f}, "
            f"Final={self.final_score:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """직원 프로필 데모"""
    print("=" * 70)
    print("  👔 AUTUS-TRINITY Staff Profile Demo")
    print("=" * 70)
    
    staffs = []
    
    # 1. 슈퍼 커넥터: 고성과 + 고시너지
    connector = StaffProfile(staff_id="S001", name="김연결", biz_type="academy")
    connector.update_performance({"retention_rate": 0.95, "grade_improvement": 15})
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("VIP_TOUCH")
    connector.log_action("COMPLAINT_DEFENSE", result="SUCCESS")
    staffs.append(connector)
    
    # 2. 기계적 우등생: 고성과 + 저시너지
    machine = StaffProfile(staff_id="S002", name="이성과", biz_type="restaurant")
    machine.update_performance({"sales_per_hour": 70000})
    staffs.append(machine)
    
    # 3. 앵무새: 저성과 + 친절
    parrot = StaffProfile(staff_id="S003", name="박친절", biz_type="restaurant")
    parrot.update_performance({"sales_per_hour": 25000})
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("VIP_TOUCH")
    parrot.score_s = 40  # 친절 점수 직접 부여
    parrot.evaluate()
    staffs.append(parrot)
    
    # 4. 내부의 적: 실수 많음
    saboteur = StaffProfile(staff_id="S004", name="최실수", biz_type="sports")
    saboteur.update_performance({"conversion_rate": 0.1, "renewal_rate": 0.3})
    saboteur.add_entropy("late", 10)
    saboteur.add_entropy("mistake", 15)
    saboteur.add_entropy("complaint", 20)
    staffs.append(saboteur)
    
    # 5. 일반
    normal = StaffProfile(staff_id="S005", name="정보통", biz_type="academy")
    normal.update_performance({"retention_rate": 0.7, "grade_improvement": 5})
    staffs.append(normal)
    
    print("\n📊 직원 평가 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'P':>6} {'E':>6} {'S':>6} {'총점':>8} {'조치':<20}")
    print("-" * 80)
    
    for s in staffs:
        print(
            f"{s.name:<10} "
            f"{s.tier.emoji} {s.tier.name_kr:<10} "
            f"{s.score_p:>6.0f} "
            f"{s.score_e:>6.0f} "
            f"{s.score_s:>6.0f} "
            f"{s.final_score:>8.0f} "
            f"{s.tier.action:<20}"
        )
    
    # 커넥터 상세
    print("\n" + "-" * 70)
    print(f"\n💎 슈퍼 커넥터 '{connector.name}' 행동 로그:")
    for log in connector.action_logs:
        print(f"  - {log.action_type}: {log.result} (+{log.points})")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: Staff Profile Model                               ║
║                          직원 DNA - 4대 유형 분류                                          ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

직원 분류 철학:
- CONNECTOR (슈퍼 커넥터): 자기 일도 잘하고, 생태계 연결까지 만들어냄 → 승진 1순위
- MACHINE (기계적 우등생): 성과는 좋지만 시키는 일만 함 → 커넥터로 진화 유도
- PARROT (앵무새): 친절하지만 성과가 약함 → 접객 전담 배치
- SABOTEUR (내부의 적): 실수 많고 분위기 해침 → 경고 후 조치

핵심 변수:
- P (Performance): 성과 - 매출, 재등록률, 전환율
- E (Entropy): 리스크 - 지각, 실수, 고객 이탈
- S (Synergy): 연결력 - 매뉴얼 수행, 크로스 레퍼럴, 불만 방어
"""

from datetime import datetime, date, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass, field
from enum import Enum
import random


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 유형 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffTier(str, Enum):
    """직원 4대 유형"""
    CONNECTOR = "CONNECTOR"   # 💎 슈퍼 커넥터
    MACHINE = "MACHINE"       # 🤖 기계적 우등생
    PARROT = "PARROT"         # 🦜 앵무새
    SABOTEUR = "SABOTEUR"     # 💣 내부의 적
    NORMAL = "NORMAL"         # 👤 일반
    
    @property
    def emoji(self) -> str:
        return {
            "CONNECTOR": "💎",
            "MACHINE": "🤖",
            "PARROT": "🦜",
            "SABOTEUR": "💣",
            "NORMAL": "👤"
        }.get(self.value, "👤")
    
    @property
    def name_kr(self) -> str:
        return {
            "CONNECTOR": "슈퍼 커넥터",
            "MACHINE": "우등생",
            "PARROT": "친절왕",
            "SABOTEUR": "주의 대상",
            "NORMAL": "일반"
        }.get(self.value, "일반")
    
    @property
    def action(self) -> str:
        return {
            "CONNECTOR": "승진 1순위 / 인센티브 지급",
            "MACHINE": "시너지 교육 필요",
            "PARROT": "접객/상담 전담 배치",
            "SABOTEUR": "경고 / 재배치 검토",
            "NORMAL": "표준 관리"
        }.get(self.value, "표준 관리")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 평가 기준
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StaffThresholds:
    """직원 평가 기준"""
    
    # 가중치 - 시너지에 3배!
    WEIGHT_PERFORMANCE = 1.0
    WEIGHT_ENTROPY = -2.0       # 페널티
    WEIGHT_SYNERGY = 3.0        # 시너지 중시
    
    # 기준값
    HIGH_PERFORMANCE = 80       # 고성과 기준
    HIGH_SYNERGY = 50           # 고시너지 기준
    HIGH_ENTROPY = 30           # 고엔트로피 기준 (위험)
    CONNECTOR_THRESHOLD = 150   # 커넥터 총점 기준


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 행동 로그
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffActionLog:
    """직원 행동 기록"""
    action_type: str           # VIP_TOUCH, CROSS_REFERRAL, MANUAL_CHECK, etc.
    timestamp: datetime
    points: int = 0            # 시너지 가산점
    customer_phone: str = ""   # 관련 고객
    result: str = ""           # SUCCESS, FAIL, PENDING
    metadata: Dict = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 직원 프로필 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class StaffProfile:
    """
    직원 프로필
    
    P, E, S 3대 변수로 직원을 평가
    """
    
    # 식별자
    staff_id: str
    name: str
    biz_type: str              # academy, restaurant, sports
    position: str = "staff"    # staff, manager, chief
    
    # 3대 변수
    score_p: float = 50.0      # Performance (0~100)
    score_e: float = 0.0       # Entropy (0~100, 낮을수록 좋음)
    score_s: float = 0.0       # Synergy (0~100)
    
    # 평가 결과
    tier: StaffTier = StaffTier.NORMAL
    final_score: float = 0.0
    
    # 행동 로그
    action_logs: List[StaffActionLog] = field(default_factory=list)
    
    # 메타데이터
    joined_date: datetime = field(default_factory=datetime.now)
    last_evaluated: datetime = field(default_factory=datetime.now)
    warning_count: int = 0     # 경고 횟수
    
    def __post_init__(self):
        self.evaluate()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 점수 계산
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def calculate_synergy_from_logs(self) -> float:
        """
        행동 로그 기반 시너지 점수 계산
        
        시너지 포인트 기준:
        - CROSS_REFERRAL (타 매장 연결 성공): +20점
        - VIP_TOUCH (VIP 고객 응대): +5점
        - MANUAL_COMPLIANCE (매뉴얼 준수): +5점
        - COMPLAINT_DEFENSE (불만 방어 성공): +10점
        - EMOTIONAL_CARE (정서적 케어): +3점
        """
        synergy_points = 0
        
        for log in self.action_logs:
            if log.action_type == "CROSS_REFERRAL" and log.result == "SUCCESS":
                synergy_points += 20
            elif log.action_type == "VIP_TOUCH":
                synergy_points += 5
            elif log.action_type == "MANUAL_COMPLIANCE":
                synergy_points += 5
            elif log.action_type == "COMPLAINT_DEFENSE" and log.result == "SUCCESS":
                synergy_points += 10
            elif log.action_type == "EMOTIONAL_CARE":
                synergy_points += 3
            else:
                synergy_points += log.points
        
        # 정규화 (0~100)
        return min(100, synergy_points)
    
    def log_action(
        self, 
        action_type: str, 
        points: int = 0, 
        result: str = "SUCCESS",
        customer_phone: str = "",
        **metadata
    ) -> "StaffProfile":
        """행동 기록 추가"""
        log = StaffActionLog(
            action_type=action_type,
            timestamp=datetime.now(),
            points=points,
            customer_phone=customer_phone,
            result=result,
            metadata=metadata
        )
        self.action_logs.append(log)
        
        # 시너지 점수 재계산
        self.score_s = self.calculate_synergy_from_logs()
        self.evaluate()
        
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 평가
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def evaluate(self) -> "StaffProfile":
        """
        최종 평가
        
        Score = (1.0 × P) + (3.0 × S) - (2.0 × E)
        """
        TH = StaffThresholds
        
        self.final_score = (
            TH.WEIGHT_PERFORMANCE * self.score_p +
            TH.WEIGHT_SYNERGY * self.score_s +
            TH.WEIGHT_ENTROPY * self.score_e
        )
        
        self.tier = self._determine_tier()
        self.last_evaluated = datetime.now()
        
        return self
    
    def _determine_tier(self) -> StaffTier:
        """
        등급 판정
        
        Decision Tree:
        1. 총점 >= 150 → CONNECTOR
        2. 고성과(P >= 80) + 저시너지(S < 20) → MACHINE
        3. 고엔트로피(E >= 30) → SABOTEUR
        4. 저성과(P < 40) + 고시너지(S >= 30) → PARROT
        5. 나머지 → NORMAL
        """
        TH = StaffThresholds
        
        if self.final_score >= TH.CONNECTOR_THRESHOLD:
            return StaffTier.CONNECTOR
        
        if self.score_p >= TH.HIGH_PERFORMANCE and self.score_s < 20:
            return StaffTier.MACHINE
        
        if self.score_e >= TH.HIGH_ENTROPY:
            return StaffTier.SABOTEUR
        
        if self.score_p < 40 and self.score_s >= 30:
            return StaffTier.PARROT
        
        return StaffTier.NORMAL
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # KPI 업데이트 (업종별)
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def update_performance(self, kpi_data: Dict) -> "StaffProfile":
        """
        업종별 KPI 데이터로 성과(P) 업데이트
        
        Args:
            kpi_data: 업종별 KPI
                - academy: {"retention_rate": 0.85, "grade_improvement": 10}
                - restaurant: {"sales_per_hour": 50000, "table_turnover": 3}
                - sports: {"conversion_rate": 0.3, "renewal_rate": 0.7}
        """
        if self.biz_type == "academy":
            # 재등록률 + 성적 향상도
            retention = kpi_data.get("retention_rate", 0.5) * 100
            improvement = min(20, kpi_data.get("grade_improvement", 0))
            self.score_p = retention * 0.7 + improvement * 1.5
            
        elif self.biz_type == "restaurant":
            # 시간당 매출 (기준: 50,000원)
            sph = kpi_data.get("sales_per_hour", 30000)
            self.score_p = min(100, (sph / 50000) * 70)
            
        elif self.biz_type == "sports":
            # 전환율 + 연장률
            conversion = kpi_data.get("conversion_rate", 0.2) * 100
            renewal = kpi_data.get("renewal_rate", 0.5) * 100
            self.score_p = conversion * 0.5 + renewal * 0.5
        
        else:
            # 기본
            self.score_p = kpi_data.get("score", 50)
        
        self.evaluate()
        return self
    
    def add_entropy(self, reason: str, points: int = 10) -> "StaffProfile":
        """
        엔트로피(실수/리스크) 추가
        
        Args:
            reason: 사유 (late, mistake, complaint 등)
            points: 감점
        """
        self.score_e += points
        self.score_e = min(100, self.score_e)  # 최대 100
        
        # 경고 카운트
        if reason in ["late", "absent", "complaint"]:
            self.warning_count += 1
        
        self.evaluate()
        return self
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 유틸리티
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def to_dict(self) -> Dict[str, Any]:
        """딕셔너리 변환"""
        return {
            "staff_id": self.staff_id,
            "name": self.name,
            "biz_type": self.biz_type,
            "position": self.position,
            "score_p": round(self.score_p, 1),
            "score_e": round(self.score_e, 1),
            "score_s": round(self.score_s, 1),
            "final_score": round(self.final_score, 1),
            "tier": self.tier.value,
            "tier_emoji": self.tier.emoji,
            "tier_name_kr": self.tier.name_kr,
            "tier_action": self.tier.action,
            "warning_count": self.warning_count,
            "action_log_count": len(self.action_logs),
            "joined_date": self.joined_date.isoformat(),
            "last_evaluated": self.last_evaluated.isoformat(),
        }
    
    def get_recent_actions(self, days: int = 7) -> List[StaffActionLog]:
        """최근 N일 행동 로그"""
        cutoff = datetime.now() - timedelta(days=days)
        return [log for log in self.action_logs if log.timestamp >= cutoff]
    
    def __repr__(self) -> str:
        return (
            f"StaffProfile({self.name}, {self.tier.emoji} {self.tier.value}, "
            f"P={self.score_p:.0f}, E={self.score_e:.0f}, S={self.score_s:.0f}, "
            f"Final={self.final_score:.0f})"
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """직원 프로필 데모"""
    print("=" * 70)
    print("  👔 AUTUS-TRINITY Staff Profile Demo")
    print("=" * 70)
    
    staffs = []
    
    # 1. 슈퍼 커넥터: 고성과 + 고시너지
    connector = StaffProfile(staff_id="S001", name="김연결", biz_type="academy")
    connector.update_performance({"retention_rate": 0.95, "grade_improvement": 15})
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("CROSS_REFERRAL", result="SUCCESS")
    connector.log_action("VIP_TOUCH")
    connector.log_action("COMPLAINT_DEFENSE", result="SUCCESS")
    staffs.append(connector)
    
    # 2. 기계적 우등생: 고성과 + 저시너지
    machine = StaffProfile(staff_id="S002", name="이성과", biz_type="restaurant")
    machine.update_performance({"sales_per_hour": 70000})
    staffs.append(machine)
    
    # 3. 앵무새: 저성과 + 친절
    parrot = StaffProfile(staff_id="S003", name="박친절", biz_type="restaurant")
    parrot.update_performance({"sales_per_hour": 25000})
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("EMOTIONAL_CARE")
    parrot.log_action("VIP_TOUCH")
    parrot.score_s = 40  # 친절 점수 직접 부여
    parrot.evaluate()
    staffs.append(parrot)
    
    # 4. 내부의 적: 실수 많음
    saboteur = StaffProfile(staff_id="S004", name="최실수", biz_type="sports")
    saboteur.update_performance({"conversion_rate": 0.1, "renewal_rate": 0.3})
    saboteur.add_entropy("late", 10)
    saboteur.add_entropy("mistake", 15)
    saboteur.add_entropy("complaint", 20)
    staffs.append(saboteur)
    
    # 5. 일반
    normal = StaffProfile(staff_id="S005", name="정보통", biz_type="academy")
    normal.update_performance({"retention_rate": 0.7, "grade_improvement": 5})
    staffs.append(normal)
    
    print("\n📊 직원 평가 결과:\n")
    print(f"{'이름':<10} {'유형':<15} {'P':>6} {'E':>6} {'S':>6} {'총점':>8} {'조치':<20}")
    print("-" * 80)
    
    for s in staffs:
        print(
            f"{s.name:<10} "
            f"{s.tier.emoji} {s.tier.name_kr:<10} "
            f"{s.score_p:>6.0f} "
            f"{s.score_e:>6.0f} "
            f"{s.score_s:>6.0f} "
            f"{s.final_score:>8.0f} "
            f"{s.tier.action:<20}"
        )
    
    # 커넥터 상세
    print("\n" + "-" * 70)
    print(f"\n💎 슈퍼 커넥터 '{connector.name}' 행동 로그:")
    for log in connector.action_logs:
        print(f"  - {log.action_type}: {log.result} (+{log.points})")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    run_demo()


























