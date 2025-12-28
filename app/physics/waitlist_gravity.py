"""
AUTUS Waitlist Gravity Field (Bezos Edition)
=============================================

대기자 중력장: 사건의 지표면(Event Horizon) 구현

기능:
1. Waitlist Horizon - 대기자 명단 중력장
2. Pre-Diagnostic Portal - 사전 진단 포털
3. Queue Priority Algorithm - 우선순위 알고리즘
4. Gravitational Pulse - 주기적 에너지 펄스

물리적 원리:
- "들어갈 수 없다"는 사실이 욕망을 극대화
- 대기 중에도 데이터 수집으로 심리적 동기화
- Event Horizon: 한번 진입하면 빠져나갈 수 없는 경계

Version: 2.0.0
Status: LOCKED
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Callable
from datetime import datetime, timedelta
from enum import Enum
import math
import json
import hashlib


# ================================================================
# ENUMS
# ================================================================

class WaitlistStatus(str, Enum):
    PENDING_DIAGNOSTIC = "PENDING_DIAGNOSTIC"
    DIAGNOSTIC_COMPLETE = "DIAGNOSTIC_COMPLETE"
    IN_QUEUE = "IN_QUEUE"
    NOTIFIED = "NOTIFIED"
    CONVERTED = "CONVERTED"
    EXPIRED = "EXPIRED"


class OrbitTier(str, Enum):
    OUTER = "OUTER"
    WARM_UP = "WARM_UP"
    INNER = "INNER"
    PRIORITY = "PRIORITY"
    GOLDEN = "GOLDEN"


class PulseType(str, Enum):
    SUCCESS_STORY = "SUCCESS_STORY"
    DATA_INSIGHT = "DATA_INSIGHT"
    SCARCITY_ALERT = "SCARCITY_ALERT"
    EXCLUSIVE_PREVIEW = "EXCLUSIVE_PREVIEW"


# ================================================================
# DATA STRUCTURES
# ================================================================

@dataclass
class PreDiagnosticData:
    """사전 진단 데이터"""
    student_id: str
    current_grade: str
    study_hours_weekly: float
    focus_self_rating: float
    exercise_hours_weekly: float
    sleep_hours_daily: float
    energy_self_rating: float
    stress_level: float
    motivation_level: float
    target_school: str
    target_timeline_months: int
    submitted_at: datetime = field(default_factory=datetime.now)
    
    def calculate_potential_score(self) -> float:
        study_score = (self.study_hours_weekly / 40) * 0.5 + (self.focus_self_rating / 10) * 0.5
        physical_score = (self.exercise_hours_weekly / 10) * 0.3 + \
                        (self.sleep_hours_daily / 8) * 0.3 + \
                        (self.energy_self_rating / 10) * 0.4
        mental_score = ((10 - self.stress_level) / 10) * 0.5 + \
                      (self.motivation_level / 10) * 0.5
        goal_score = 0.8 if self.target_school else 0.4
        if self.target_timeline_months < 12:
            goal_score += 0.2
        
        return (study_score * 0.30 + physical_score * 0.25 + 
                mental_score * 0.25 + goal_score * 0.20)


@dataclass
class WaitlistNode:
    """대기자 노드"""
    id: str
    parent_name: str
    student_name: str
    contact: str
    status: WaitlistStatus = WaitlistStatus.PENDING_DIAGNOSTIC
    orbit_tier: OrbitTier = OrbitTier.OUTER
    diagnostic: Optional[PreDiagnosticData] = None
    match_score: float = 0.0
    priority_score: float = 0.0
    deposit_paid: float = 0.0
    deposit_date: Optional[datetime] = None
    registered_at: datetime = field(default_factory=datetime.now)
    last_pulse_at: Optional[datetime] = None
    notified_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    pulses_received: int = 0
    pulses_opened: int = 0
    engagement_rate: float = 0.0


@dataclass
class GravitationalPulse:
    """중력 펄스"""
    id: str
    pulse_type: PulseType
    subject: str
    content: str
    target_orbit: OrbitTier
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    sent_count: int = 0
    opened_count: int = 0
    clicked_count: int = 0


@dataclass
class GoldenRingSlot:
    """골든 링 슬롯"""
    slot_id: str
    is_occupied: bool = False
    occupant_id: Optional[str] = None
    occupied_at: Optional[datetime] = None
    expected_vacancy: Optional[datetime] = None


# ================================================================
# CONSTANTS
# ================================================================

WAITLIST_CONFIG = {
    "max_waitlist_capacity": 20,
    "deposit_amount": 300000,
    "pulse_interval_days": 14,
    "notification_window_hours": 24,
    "priority_weights": {
        "diagnostic_score": 0.35,
        "engagement_rate": 0.25,
        "deposit_paid": 0.20,
        "wait_time": 0.10,
        "referral_bonus": 0.10,
    }
}

GOLDEN_RING_CONFIG = {
    "total_slots": 5,
    "monthly_rotation": 1,
    "price_multiplier": 2.5,
}


# ================================================================
# WAITLIST GRAVITY FIELD
# ================================================================

class WaitlistGravityField:
    """대기자 중력장 엔진"""
    
    def __init__(self):
        self.waitlist: Dict[str, WaitlistNode] = {}
        self.golden_ring: Dict[str, GoldenRingSlot] = {}
        self.pulse_queue: List[GravitationalPulse] = []
        self.pulse_history: List[GravitationalPulse] = []
        
        for i in range(GOLDEN_RING_CONFIG["total_slots"]):
            slot_id = f"GOLDEN_SLOT_{i+1}"
            self.golden_ring[slot_id] = GoldenRingSlot(slot_id=slot_id)
    
    def register_interest(
        self,
        parent_name: str,
        student_name: str,
        contact: str
    ) -> WaitlistNode:
        """관심 등록"""
        node_id = f"WL_{datetime.now().timestamp():.0f}_{hashlib.md5(contact.encode()).hexdigest()[:8]}"
        
        node = WaitlistNode(
            id=node_id,
            parent_name=parent_name,
            student_name=student_name,
            contact=contact,
            status=WaitlistStatus.PENDING_DIAGNOSTIC,
            orbit_tier=OrbitTier.OUTER,
            registered_at=datetime.now()
        )
        
        self.waitlist[node_id] = node
        return node
    
    def submit_diagnostic(
        self,
        node_id: str,
        diagnostic: PreDiagnosticData
    ) -> Dict:
        """사전 진단 제출"""
        node = self.waitlist.get(node_id)
        if not node:
            return {"success": False, "error": "Node not found"}
        
        node.diagnostic = diagnostic
        node.status = WaitlistStatus.DIAGNOSTIC_COMPLETE
        node.orbit_tier = OrbitTier.WARM_UP
        
        potential = diagnostic.calculate_potential_score()
        node.match_score = self._calculate_match_score(diagnostic)
        node.priority_score = potential * 0.5
        
        return {
            "success": True,
            "node_id": node_id,
            "potential_score": potential,
            "match_score": node.match_score,
            "orbit_tier": node.orbit_tier.value,
            "message": self._generate_diagnostic_feedback(potential, node.match_score)
        }
    
    def _calculate_match_score(self, diagnostic: PreDiagnosticData) -> float:
        score = 0.5
        high_target_schools = ["의대", "서울대", "연세대", "고려대", "카이스트", "포항공대"]
        if any(school in diagnostic.target_school for school in high_target_schools):
            score += 0.2
        if diagnostic.motivation_level >= 8:
            score += 0.15
        if 6 <= diagnostic.sleep_hours_daily <= 8:
            score += 0.1
        if diagnostic.exercise_hours_weekly >= 5:
            score += 0.05
        return min(score, 1.0)
    
    def _generate_diagnostic_feedback(self, potential: float, match: float) -> str:
        if potential >= 0.8 and match >= 0.7:
            return "우수한 잠재력이 감지되었습니다. Elite Club 우선 대기 자격이 부여됩니다."
        elif potential >= 0.6:
            return "성장 가능성이 확인되었습니다. 데이터 기반 맞춤 관리가 효과적일 것입니다."
        else:
            return "기초 역량 강화가 선행되어야 합니다. 일반 프로그램을 먼저 권장드립니다."
    
    def pay_deposit(self, node_id: str, amount: float) -> Dict:
        """보증금 납부"""
        node = self.waitlist.get(node_id)
        if not node:
            return {"success": False, "error": "Node not found"}
        
        if node.status != WaitlistStatus.DIAGNOSTIC_COMPLETE:
            return {"success": False, "error": "Diagnostic required first"}
        
        node.deposit_paid = amount
        node.deposit_date = datetime.now()
        node.status = WaitlistStatus.IN_QUEUE
        node.orbit_tier = OrbitTier.INNER
        
        self._recalculate_priority(node)
        queue_position = self._get_queue_position(node_id)
        
        return {
            "success": True,
            "node_id": node_id,
            "deposit_paid": amount,
            "orbit_tier": node.orbit_tier.value,
            "queue_position": queue_position,
            "estimated_entry": self._estimate_entry_date(queue_position),
            "perks_unlocked": [
                "월간 프리미엄 리포트 열람권",
                "Elite 멤버 성공 스토리 독점 공개",
                "진입 시 첫 달 20% 할인 보장",
            ]
        }
    
    def _recalculate_priority(self, node: WaitlistNode) -> None:
        weights = WAITLIST_CONFIG["priority_weights"]
        
        diagnostic_score = node.match_score if node.diagnostic else 0
        engagement = node.engagement_rate
        deposit_factor = 1.0 if node.deposit_paid >= WAITLIST_CONFIG["deposit_amount"] else 0
        
        days_waiting = (datetime.now() - node.registered_at).days
        wait_factor = min(days_waiting / 30, 1.0)
        referral_factor = 0
        
        node.priority_score = (
            diagnostic_score * weights["diagnostic_score"] +
            engagement * weights["engagement_rate"] +
            deposit_factor * weights["deposit_paid"] +
            wait_factor * weights["wait_time"] +
            referral_factor * weights["referral_bonus"]
        )
        
        if node.priority_score >= 0.7 and node.deposit_paid > 0:
            node.orbit_tier = OrbitTier.PRIORITY
    
    def _get_queue_position(self, node_id: str) -> int:
        in_queue = [
            (nid, n) for nid, n in self.waitlist.items()
            if n.status == WaitlistStatus.IN_QUEUE
        ]
        sorted_queue = sorted(in_queue, key=lambda x: x[1].priority_score, reverse=True)
        
        for i, (nid, _) in enumerate(sorted_queue):
            if nid == node_id:
                return i + 1
        return len(sorted_queue) + 1
    
    def _estimate_entry_date(self, position: int) -> str:
        months = position / GOLDEN_RING_CONFIG["monthly_rotation"]
        entry_date = datetime.now() + timedelta(days=months * 30)
        return entry_date.strftime("%Y년 %m월")
    
    def check_available_slots(self) -> List[str]:
        return [
            slot_id for slot_id, slot in self.golden_ring.items()
            if not slot.is_occupied
        ]
    
    def notify_next_in_queue(self) -> Optional[Dict]:
        available_slots = self.check_available_slots()
        if not available_slots:
            return None
        
        in_queue = [
            (nid, n) for nid, n in self.waitlist.items()
            if n.status == WaitlistStatus.IN_QUEUE
        ]
        
        if not in_queue:
            return None
        
        sorted_queue = sorted(in_queue, key=lambda x: x[1].priority_score, reverse=True)
        top_node_id, top_node = sorted_queue[0]
        
        top_node.status = WaitlistStatus.NOTIFIED
        top_node.notified_at = datetime.now()
        top_node.expires_at = datetime.now() + timedelta(hours=WAITLIST_CONFIG["notification_window_hours"])
        
        return {
            "node_id": top_node_id,
            "student_name": top_node.student_name,
            "parent_name": top_node.parent_name,
            "contact": top_node.contact,
            "slot_offered": available_slots[0],
            "deadline": top_node.expires_at.isoformat(),
        }
    
    def get_gravity_field_status(self) -> Dict:
        waitlist_nodes = list(self.waitlist.values())
        
        orbit_distribution = {}
        for tier in OrbitTier:
            orbit_distribution[tier.value] = len([
                n for n in waitlist_nodes if n.orbit_tier == tier
            ])
        
        occupied_slots = len([s for s in self.golden_ring.values() if s.is_occupied])
        
        return {
            "waitlist_total": len(waitlist_nodes),
            "orbit_distribution": orbit_distribution,
            "golden_ring": {
                "total_slots": len(self.golden_ring),
                "occupied": occupied_slots,
                "available": len(self.golden_ring) - occupied_slots,
            },
            "deposit_pool": sum(n.deposit_paid for n in waitlist_nodes),
        }


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("AUTUS Waitlist Gravity Field Test")
    print("=" * 70)
    
    field = WaitlistGravityField()
    
    node = field.register_interest("김학부모", "김철수", "010-1234-5678")
    print(f"\n[등록] {node.student_name}: {node.id}")
    
    diagnostic = PreDiagnosticData(
        student_id="s1",
        current_grade="중3",
        study_hours_weekly=25,
        focus_self_rating=8,
        exercise_hours_weekly=5,
        sleep_hours_daily=7,
        energy_self_rating=7,
        stress_level=4,
        motivation_level=9,
        target_school="의대",
        target_timeline_months=36
    )
    
    result = field.submit_diagnostic(node.id, diagnostic)
    print(f"[진단] Potential: {result['potential_score']:.2f}")
    
    deposit_result = field.pay_deposit(node.id, 300000)
    print(f"[보증금] Position: {deposit_result['queue_position']}")
    
    status = field.get_gravity_field_status()
    print(f"\n[상태] 총 대기자: {status['waitlist_total']}")
    
    print("\n" + "=" * 70)
    print("✅ Waitlist Gravity Field Test Complete")
