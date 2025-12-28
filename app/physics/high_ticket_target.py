"""
AUTUS High-Ticket Target Identification (Bezos Edition)
========================================================

고가치 타겟 식별 시스템

기능:
1. High-Value Signal Filter - 고가치 신호 필터
2. Willingness-to-Pay (WTP) Score - 지불 의향 점수
3. Pilot Campaign Generator - 파일럿 캠페인 생성
4. Personalized Invitation - 맞춤형 초대장

Version: 2.0.0
Status: LOCKED
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from enum import Enum
import math
import json


# ================================================================
# ENUMS
# ================================================================

class ValueTier(str, Enum):
    STANDARD = "STANDARD"
    PREMIUM = "PREMIUM"
    VIP = "VIP"
    ULTRA = "ULTRA"


class CampaignType(str, Enum):
    UPSELL = "UPSELL"
    PREMIUM_INVITATION = "PREMIUM_INVITATION"
    EXCLUSIVE_OFFER = "EXCLUSIVE_OFFER"
    CUSTOM_CONSULTATION = "CUSTOM_CONSULTATION"


class SignalStrength(str, Enum):
    WEAK = "WEAK"
    MODERATE = "MODERATE"
    STRONG = "STRONG"
    DEFINITIVE = "DEFINITIVE"


# ================================================================
# DATA STRUCTURES
# ================================================================

@dataclass
class MemberProfile:
    """멤버 프로필"""
    id: str
    mass: float
    energy_level: float
    engagement_score: float
    purchase_history: List[Dict] = field(default_factory=list)
    total_spent: float = 0.0
    detected_keywords: List[str] = field(default_factory=list)
    communication_tone: str = "neutral"
    competitor_interest: float = 0.0
    created_at: datetime = field(default_factory=datetime.now)
    last_activity: Optional[datetime] = None


@dataclass
class HighValueSignal:
    """고가치 신호"""
    member_id: str
    signal_type: str
    signal_strength: SignalStrength
    source: str
    value: Any
    timestamp: datetime
    contribution_to_wtp: float


@dataclass
class WTPScore:
    """지불 의향 점수"""
    member_id: str
    total_score: float
    tier: ValueTier
    components: Dict[str, float]
    signals: List[HighValueSignal]
    confidence: float
    calculated_at: datetime


@dataclass
class Campaign:
    """캠페인"""
    id: str
    campaign_type: CampaignType
    target_members: List[str]
    offer: Dict
    personalization: Dict
    expected_conversion_rate: float
    created_at: datetime


@dataclass
class PersonalizedInvitation:
    """맞춤형 초대장"""
    member_id: str
    tier: ValueTier
    title: str
    body: str
    gaps_addressed: List[str]
    offer_details: Dict
    call_to_action: str


# ================================================================
# CONSTANTS
# ================================================================

HIGH_VALUE_KEYWORDS = [
    "입시", "의대", "컨설팅", "특별", "추가", "프리미엄",
    "1:1", "집중", "강화", "올인", "목표", "상위권",
    "특목고", "영재", "심화", "맞춤", "전문가", "코칭"
]

URGENCY_INDICATORS = [
    "급해요", "빨리", "바로", "지금", "당장", "이번에",
    "마지막", "놓치면", "기회", "시작해야"
]

COMPETITOR_KEYWORDS = [
    "다른곳", "타학원", "비교", "어디가", "추천", "알아보는",
    "옮길", "바꿀"
]


# ================================================================
# HIGH-VALUE SIGNAL FILTER
# ================================================================

class HighValueSignalFilter:
    """고가치 신호 필터"""
    
    def __init__(self):
        self.signals: List[HighValueSignal] = []
    
    def filter_high_value_members(
        self,
        members: List[MemberProfile],
        avg_mass: Optional[float] = None
    ) -> List[MemberProfile]:
        if not avg_mass:
            avg_mass = sum(m.mass for m in members) / len(members) if members else 0.5
        
        mass_threshold = avg_mass * 1.5
        energy_threshold = 0.8
        
        high_value = []
        
        for member in members:
            if member.mass > mass_threshold and member.energy_level > energy_threshold:
                high_value.append(member)
            elif self._has_high_value_keywords(member):
                high_value.append(member)
        
        return high_value
    
    def _has_high_value_keywords(self, member: MemberProfile) -> bool:
        return any(kw in member.detected_keywords for kw in HIGH_VALUE_KEYWORDS)
    
    def extract_signals(self, member: MemberProfile) -> List[HighValueSignal]:
        signals = []
        now = datetime.now()
        
        if member.mass > 0.7:
            signals.append(HighValueSignal(
                member_id=member.id,
                signal_type="HIGH_MASS",
                signal_strength=SignalStrength.STRONG if member.mass > 0.9 else SignalStrength.MODERATE,
                source="physics_engine",
                value=member.mass,
                timestamp=now,
                contribution_to_wtp=member.mass * 20
            ))
        
        hv_keywords = [kw for kw in member.detected_keywords if kw in HIGH_VALUE_KEYWORDS]
        if hv_keywords:
            signals.append(HighValueSignal(
                member_id=member.id,
                signal_type="HIGH_VALUE_KEYWORDS",
                signal_strength=SignalStrength.STRONG if len(hv_keywords) > 2 else SignalStrength.MODERATE,
                source="sensor_analysis",
                value=hv_keywords,
                timestamp=now,
                contribution_to_wtp=len(hv_keywords) * 8
            ))
        
        urgent_keywords = [kw for kw in member.detected_keywords if kw in URGENCY_INDICATORS]
        if urgent_keywords or member.communication_tone == "urgent":
            signals.append(HighValueSignal(
                member_id=member.id,
                signal_type="URGENT_TONE",
                signal_strength=SignalStrength.STRONG,
                source="voice_analysis",
                value={"keywords": urgent_keywords, "tone": member.communication_tone},
                timestamp=now,
                contribution_to_wtp=15
            ))
        
        if member.competitor_interest > 0.5:
            signals.append(HighValueSignal(
                member_id=member.id,
                signal_type="COMPETITOR_INTEREST",
                signal_strength=SignalStrength.MODERATE,
                source="context_analysis",
                value=member.competitor_interest,
                timestamp=now,
                contribution_to_wtp=member.competitor_interest * 10
            ))
        
        if member.total_spent > 0:
            avg_purchase = member.total_spent / len(member.purchase_history) if member.purchase_history else 0
            if avg_purchase > 500000:
                signals.append(HighValueSignal(
                    member_id=member.id,
                    signal_type="HIGH_SPENDER",
                    signal_strength=SignalStrength.DEFINITIVE,
                    source="purchase_history",
                    value={"total": member.total_spent, "avg": avg_purchase},
                    timestamp=now,
                    contribution_to_wtp=min(avg_purchase / 20000, 30)
                ))
        
        self.signals.extend(signals)
        return signals


# ================================================================
# WTP SCORE CALCULATOR
# ================================================================

class WTPScoreCalculator:
    """WTP 점수 계산기"""
    
    COMPONENT_WEIGHTS = {
        "purchase_history": 0.30,
        "urgent_tone": 0.25,
        "competitor_interest": 0.20,
        "high_value_keywords": 0.15,
        "engagement": 0.10,
    }
    
    def calculate_wtp(
        self,
        member: MemberProfile,
        signals: List[HighValueSignal]
    ) -> WTPScore:
        components = {}
        
        if member.purchase_history:
            avg_purchase = member.total_spent / len(member.purchase_history)
            purchase_score = min(avg_purchase / 10000, 100)
        else:
            purchase_score = 20
        components["purchase_history"] = purchase_score
        
        urgent_signals = [s for s in signals if s.signal_type == "URGENT_TONE"]
        urgent_score = 80 if urgent_signals else (40 if member.communication_tone == "interested" else 20)
        components["urgent_tone"] = urgent_score
        
        competitor_score = member.competitor_interest * 100
        components["competitor_interest"] = competitor_score
        
        hv_count = len([kw for kw in member.detected_keywords if kw in HIGH_VALUE_KEYWORDS])
        keyword_score = min(hv_count * 20, 100)
        components["high_value_keywords"] = keyword_score
        
        engagement_score = member.engagement_score * 100
        components["engagement"] = engagement_score
        
        total_score = sum(
            components[comp] * weight
            for comp, weight in self.COMPONENT_WEIGHTS.items()
        )
        
        if total_score >= 80:
            tier = ValueTier.ULTRA
        elif total_score >= 60:
            tier = ValueTier.VIP
        elif total_score >= 40:
            tier = ValueTier.PREMIUM
        else:
            tier = ValueTier.STANDARD
        
        strong_signals = len([s for s in signals if s.signal_strength in [SignalStrength.STRONG, SignalStrength.DEFINITIVE]])
        confidence = min(0.5 + strong_signals * 0.1, 0.95)
        
        return WTPScore(
            member_id=member.id,
            total_score=total_score,
            tier=tier,
            components=components,
            signals=signals,
            confidence=confidence,
            calculated_at=datetime.now()
        )


# ================================================================
# CAMPAIGN GENERATOR
# ================================================================

class CampaignGenerator:
    """파일럿 캠페인 생성기"""
    
    CAMPAIGN_TEMPLATES = {
        ValueTier.ULTRA: {
            "type": CampaignType.EXCLUSIVE_OFFER,
            "title": "VIP 전용 프리미엄 프로그램",
            "discount": 0.0,
            "perks": ["전담 컨설턴트", "1:1 맞춤 커리큘럼", "우선 상담권", "특별 리포트"],
        },
        ValueTier.VIP: {
            "type": CampaignType.PREMIUM_INVITATION,
            "title": "프리미엄 멤버 초대",
            "discount": 0.1,
            "perks": ["심화 과정 접근권", "월간 컨설팅", "성과 리포트"],
        },
        ValueTier.PREMIUM: {
            "type": CampaignType.UPSELL,
            "title": "맞춤형 강화 프로그램",
            "discount": 0.15,
            "perks": ["추가 세션", "자료 패키지"],
        },
        ValueTier.STANDARD: {
            "type": CampaignType.UPSELL,
            "title": "업그레이드 특별 제안",
            "discount": 0.2,
            "perks": ["기본 추가 혜택"],
        },
    }
    
    def generate_campaign(
        self,
        target_members: List[Tuple[MemberProfile, WTPScore]]
    ) -> Campaign:
        if not target_members:
            raise ValueError("No target members provided")
        
        top_tier = max(target_members, key=lambda x: x[1].total_score)[1].tier
        template = self.CAMPAIGN_TEMPLATES[top_tier]
        
        member_ids = [m.id for m, _ in target_members]
        
        avg_wtp = sum(wtp.total_score for _, wtp in target_members) / len(target_members)
        expected_conversion = min(avg_wtp / 100 * 0.4, 0.35)
        
        return Campaign(
            id=f"CAMP_{datetime.now().timestamp():.0f}",
            campaign_type=template["type"],
            target_members=member_ids,
            offer={
                "title": template["title"],
                "discount": template["discount"],
                "perks": template["perks"],
            },
            personalization={
                "tier_distribution": self._get_tier_distribution(target_members),
                "top_signals": self._get_top_signals(target_members),
            },
            expected_conversion_rate=expected_conversion,
            created_at=datetime.now()
        )
    
    def _get_tier_distribution(
        self,
        members: List[Tuple[MemberProfile, WTPScore]]
    ) -> Dict[str, int]:
        dist = {}
        for _, wtp in members:
            tier = wtp.tier.value
            dist[tier] = dist.get(tier, 0) + 1
        return dist
    
    def _get_top_signals(
        self,
        members: List[Tuple[MemberProfile, WTPScore]]
    ) -> List[str]:
        signal_counts = {}
        for _, wtp in members:
            for signal in wtp.signals:
                st = signal.signal_type
                signal_counts[st] = signal_counts.get(st, 0) + 1
        
        return sorted(signal_counts.keys(), key=lambda k: signal_counts[k], reverse=True)[:5]


# ================================================================
# INVITATION GENERATOR
# ================================================================

class InvitationGenerator:
    """맞춤형 초대장 생성기"""
    
    def generate_invitation(
        self,
        member: MemberProfile,
        wtp: WTPScore,
        detected_gaps: List[str]
    ) -> PersonalizedInvitation:
        tier = wtp.tier
        
        titles = {
            ValueTier.ULTRA: f"[VIP 전용] {member.id}님을 위한 특별 초대",
            ValueTier.VIP: f"[프리미엄] {member.id}님, 다음 단계로 도약하세요",
            ValueTier.PREMIUM: f"{member.id}님을 위한 맞춤 강화 프로그램",
            ValueTier.STANDARD: f"{member.id}님, 특별 업그레이드 기회",
        }
        
        body = self._generate_body(member, wtp, detected_gaps)
        offer = self._generate_offer(tier, detected_gaps)
        
        ctas = {
            ValueTier.ULTRA: "지금 바로 전담 컨설턴트와 상담 예약하기",
            ValueTier.VIP: "프리미엄 프로그램 상세 보기",
            ValueTier.PREMIUM: "맞춤 커리큘럼 확인하기",
            ValueTier.STANDARD: "업그레이드 혜택 알아보기",
        }
        
        return PersonalizedInvitation(
            member_id=member.id,
            tier=tier,
            title=titles[tier],
            body=body,
            gaps_addressed=detected_gaps,
            offer_details=offer,
            call_to_action=ctas[tier]
        )
    
    def _generate_body(
        self,
        member: MemberProfile,
        wtp: WTPScore,
        gaps: List[str]
    ) -> str:
        lines = []
        lines.append(f"안녕하세요, {member.id}님.")
        lines.append("")
        
        if gaps:
            lines.append("저희가 분석한 결과, 다음 영역에서 추가 지원이 도움이 될 것으로 보입니다:")
            for gap in gaps[:3]:
                lines.append(f"  • {gap}")
            lines.append("")
        
        if wtp.tier in [ValueTier.ULTRA, ValueTier.VIP]:
            lines.append("이를 위해 특별히 준비된 프리미엄 프로그램을 소개드립니다.")
        else:
            lines.append("이를 해결하기 위한 맞춤형 솔루션을 제안드립니다.")
        
        return "\n".join(lines)
    
    def _generate_offer(self, tier: ValueTier, gaps: List[str]) -> Dict:
        base_offers = {
            ValueTier.ULTRA: {
                "program": "ULTRA VIP 패키지",
                "price": "별도 협의",
                "includes": [
                    "전담 컨설턴트 배정",
                    "주 3회 1:1 세션",
                    "맞춤형 학습 로드맵",
                    "24시간 질의응답",
                    "월간 성과 리포트",
                ],
                "validity": "선착순 5명",
            },
            ValueTier.VIP: {
                "program": "VIP 프리미엄 패키지",
                "price": "월 150만원",
                "includes": [
                    "주 2회 1:1 세션",
                    "심화 커리큘럼",
                    "주간 피드백",
                    "자료 패키지",
                ],
                "validity": "이번 달 등록 시 첫 달 10% 할인",
            },
            ValueTier.PREMIUM: {
                "program": "프리미엄 강화 패키지",
                "price": "월 80만원",
                "includes": [
                    "주 1회 추가 세션",
                    "심화 자료",
                    "월간 상담",
                ],
                "validity": "15% 할인 (한정)",
            },
            ValueTier.STANDARD: {
                "program": "스탠다드 업그레이드",
                "price": "월 50만원",
                "includes": [
                    "격주 추가 세션",
                    "기본 자료",
                ],
                "validity": "20% 할인",
            },
        }
        
        offer = base_offers[tier].copy()
        
        if gaps:
            offer["gap_specific_solutions"] = [f"{gap} 집중 보강" for gap in gaps[:2]]
        
        return offer


# ================================================================
# INTEGRATED ENGINE
# ================================================================

class HighTicketTargetEngine:
    """고가치 타겟 통합 엔진"""
    
    def __init__(self):
        self.signal_filter = HighValueSignalFilter()
        self.wtp_calculator = WTPScoreCalculator()
        self.campaign_generator = CampaignGenerator()
        self.invitation_generator = InvitationGenerator()
        
        self.members: Dict[str, MemberProfile] = {}
        self.wtp_scores: Dict[str, WTPScore] = {}
    
    def register_member(self, member: MemberProfile) -> None:
        self.members[member.id] = member
    
    def analyze_member(self, member_id: str) -> Optional[WTPScore]:
        member = self.members.get(member_id)
        if not member:
            return None
        
        signals = self.signal_filter.extract_signals(member)
        wtp = self.wtp_calculator.calculate_wtp(member, signals)
        self.wtp_scores[member_id] = wtp
        
        return wtp
    
    def identify_high_ticket_targets(self) -> List[Tuple[MemberProfile, WTPScore]]:
        targets = []
        
        for member_id, member in self.members.items():
            wtp = self.analyze_member(member_id)
            if wtp and wtp.tier in [ValueTier.VIP, ValueTier.ULTRA]:
                targets.append((member, wtp))
        
        targets.sort(key=lambda x: x[1].total_score, reverse=True)
        
        return targets
    
    def generate_pilot_campaign(self) -> Optional[Campaign]:
        targets = self.identify_high_ticket_targets()
        if not targets:
            return None
        
        return self.campaign_generator.generate_campaign(targets)
    
    def generate_personalized_invitations(
        self,
        targets: List[Tuple[MemberProfile, WTPScore]],
        gap_detector = None
    ) -> List[PersonalizedInvitation]:
        invitations = []
        
        for member, wtp in targets:
            if gap_detector:
                gaps = gap_detector(member)
            else:
                gaps = self._default_gap_detection(member)
            
            invitation = self.invitation_generator.generate_invitation(member, wtp, gaps)
            invitations.append(invitation)
        
        return invitations
    
    def _default_gap_detection(self, member: MemberProfile) -> List[str]:
        gaps = []
        
        if member.energy_level < 0.6:
            gaps.append("학습 동기 및 에너지 관리")
        if member.engagement_score < 0.5:
            gaps.append("수업 참여도 향상")
        if "입시" in member.detected_keywords:
            gaps.append("입시 전략 수립")
        if "의대" in member.detected_keywords:
            gaps.append("의대 입시 전문 지도")
        if member.competitor_interest > 0.5:
            gaps.append("차별화된 프로그램 탐색")
        
        return gaps[:3]


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("AUTUS High-Ticket Target Identification Test")
    print("=" * 70)
    
    engine = HighTicketTargetEngine()
    
    members = [
        MemberProfile(
            id="student_001",
            mass=0.9,
            energy_level=0.85,
            engagement_score=0.8,
            purchase_history=[{"amount": 800000}, {"amount": 1200000}],
            total_spent=2000000,
            detected_keywords=["의대", "입시", "컨설팅", "1:1"],
            communication_tone="urgent",
            competitor_interest=0.3,
        ),
        MemberProfile(
            id="student_002",
            mass=0.7,
            energy_level=0.75,
            engagement_score=0.65,
            purchase_history=[{"amount": 500000}],
            total_spent=500000,
            detected_keywords=["특별", "강화", "심화"],
            communication_tone="interested",
            competitor_interest=0.5,
        ),
    ]
    
    for member in members:
        engine.register_member(member)
    
    print("\n[멤버별 WTP 분석]")
    for member in members:
        wtp = engine.analyze_member(member.id)
        print(f"\n  {member.id}:")
        print(f"    WTP Score: {wtp.total_score:.1f}")
        print(f"    Tier: {wtp.tier.value}")
        print(f"    Confidence: {wtp.confidence:.1%}")
    
    print("\n[고가치 타겟 식별]")
    targets = engine.identify_high_ticket_targets()
    print(f"  총 {len(targets)}명 식별")
    
    print("\n[파일럿 캠페인 생성]")
    campaign = engine.generate_pilot_campaign()
    if campaign:
        print(f"  Type: {campaign.campaign_type.value}")
        print(f"  Expected Conversion: {campaign.expected_conversion_rate:.1%}")
    
    print("\n" + "=" * 70)
    print("✅ High-Ticket Target Test Complete")



