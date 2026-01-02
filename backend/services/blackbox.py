#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: BlackBox Protocol                                 ║
║                          침묵의 지휘자 - 현장 직원용 마스킹 지침                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 원칙:
- 직원에게 고객의 개인정보(등급, 결제내역, 컴플레인 이력)를 직접 노출하지 않음
- 대신 '태그(Tag)'와 '색상(Color)'으로 행동 지침만 전달
- "왜?"를 묻지 않게 만드는 직관적 인터페이스

태그 시스템:
- 👑 VVIP: 최고 대우
- 🍷 서비스 프리패스: 추가 서비스 무조건 제공
- 🔇 매뉴얼 응대: 규정대로만
- ⏳ 원칙 준수: 추가 서비스 금지
- 💖 단골: 친근하게
- ⚡ 신속 처리: 대기 최소화
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

# 내부 모듈
import sys
sys.path.insert(0, '..')
from models.customer import CustomerProfile, CustomerArchetype


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배경색 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DisplayColor(str, Enum):
    """태블릿 표시 배경색"""
    GOLD = "GOLD"       # 황금색 - 후원자
    NAVY = "NAVY"       # 남색 - 권력자
    PINK = "PINK"       # 분홍색 - 찐팬
    GREY = "GREY"       # 회색 - 주의
    WHITE = "WHITE"     # 흰색 - 일반
    
    @property
    def hex_code(self) -> str:
        return {
            "GOLD": "#FFD700",
            "NAVY": "#000080",
            "PINK": "#FFB6C1",
            "GREY": "#808080",
            "WHITE": "#FFFFFF"
        }.get(self.value, "#FFFFFF")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 태그 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerTag:
    """고객 태그 정의"""
    
    # 후원자 태그
    VVIP = ("👑", "그룹 VVIP", "최고 대우")
    SERVICE_PASS = ("🍷", "서비스 프리패스", "추가 서비스 무료")
    PREMIUM_CARE = ("🙇", "프리미엄 의전", "사장님 지인급")
    
    # 권력자 태그
    FAST_TRACK = ("⚡", "신속 처리", "대기 0분 목표")
    NO_CHAT = ("🤫", "사담 금지", "결과만 보고")
    VIP_PROTOCOL = ("💼", "의전 필수", "프로답게")
    
    # 찐팬 태그
    REGULAR = ("💖", "단골", "친근하게")
    FREE_DRINK = ("☕", "음료 서비스", "간단한 서비스")
    TALK_OK = ("🗣️", "말 걸기", "대화 권장")
    
    # 주의 태그
    MANUAL_ONLY = ("🔇", "매뉴얼 응대", "규정대로만")
    NO_SERVICE = ("❌", "추가 서비스 금지", "원칙 준수")
    STICK_RULES = ("⏳", "원칙 준수", "정중하되 단호하게")
    
    # 일반 태그
    STANDARD = ("👤", "일반 응대", "표준 서비스")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 지침
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class FieldInstruction:
    """현장 직원용 지침"""
    display_name: str           # 화면에 표시할 이름
    bg_color: DisplayColor      # 배경색
    tags: List[tuple]           # 태그 목록 [(emoji, label, desc), ...]
    message: str                # 간단한 지침 메시지
    priority: int = 0           # 우선순위 (높을수록 중요)
    synergy_hint: str = ""      # 시너지 유도 힌트 (선택)
    alert_level: str = "normal" # normal, caution, urgent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "display_name": self.display_name,
            "bg_color": self.bg_color.value,
            "bg_color_hex": self.bg_color.hex_code,
            "tags": [
                {"emoji": t[0], "label": t[1], "desc": t[2]} 
                for t in self.tags
            ],
            "message": self.message,
            "priority": self.priority,
            "synergy_hint": self.synergy_hint,
            "alert_level": self.alert_level,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 프로토콜 메인 클래스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BlackBoxProtocol:
    """
    침묵의 지휘자
    
    고객 프로필을 받아 현장용 지침으로 변환
    - 고객의 '왜'를 숨기고 '어떻게'만 전달
    - 업종별 맞춤 메시지 생성
    """
    
    # 업종별 시너지 유도 메시지
    SYNERGY_HINTS = {
        "academy": {
            "to_restaurant": "'오늘 저녁은 [식당A]에서 할인 받으세요' 언급",
            "to_sports": "'운동도 병행하시면 집중력에 좋아요' 언급",
        },
        "restaurant": {
            "to_academy": "'아이 학원은 잘 다니고 있나요?' 안부",
            "to_sports": "'운동 후 식사하시면 더 건강해요' 언급",
        },
        "sports": {
            "to_academy": "'공부 스트레스는 운동으로 풀어야죠' 언급",
            "to_restaurant": "'운동 후 [식당A] 단백질 메뉴 추천' 언급",
        }
    }
    
    def get_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str,
        include_synergy: bool = True
    ) -> FieldInstruction:
        """
        고객 프로필 → 현장 지침 변환
        
        Args:
            customer: 고객 프로필
            biz_type: 현재 업종 (academy, restaurant, sports)
            include_synergy: 시너지 힌트 포함 여부
            
        Returns:
            FieldInstruction: 태블릿에 표시할 지침
        """
        archetype = customer.archetype
        
        # 아키타입별 지침 생성
        if archetype == CustomerArchetype.PATRON:
            instruction = self._patron_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.TYCOON:
            instruction = self._tycoon_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.FAN:
            instruction = self._fan_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.VAMPIRE:
            instruction = self._vampire_instruction(customer, biz_type)
        else:
            instruction = self._common_instruction(customer, biz_type)
        
        # 시너지 힌트 추가
        if include_synergy and customer.is_multi_biz_user:
            instruction.synergy_hint = self._get_synergy_hint(biz_type, customer)
        
        return instruction
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 아키타입별 지침 생성
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _patron_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """후원자 지침 - 신처럼 모셔라"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GOLD,
            tags=[
                CustomerTag.VVIP,
                CustomerTag.SERVICE_PASS,
                CustomerTag.PREMIUM_CARE,
            ],
            message="사장님 지인급 대우. 묻지도 따지지도 말고 서비스 제공.",
            priority=100,
            alert_level="urgent"
        )
    
    def _tycoon_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """권력자 지침 - 프로답게 신속하게"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.NAVY,
            tags=[
                CustomerTag.FAST_TRACK,
                CustomerTag.NO_CHAT,
                CustomerTag.VIP_PROTOCOL,
            ],
            message="대기시간 0분 목표. 잡담 없이 결과만 보고하세요.",
            priority=80,
            alert_level="caution"
        )
    
    def _fan_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """찐팬 지침 - 정서적 교류"""
        # 업종별 맞춤 메시지
        if biz_type == "restaurant":
            message = "'오늘도 오셨네요~' 친근하게 말 걸기. 간단한 음료 서비스."
        elif biz_type == "academy":
            message = "'아이가 요즘 많이 좋아졌어요' 칭찬 먼저."
        else:
            message = "단골 고객. 친근하게 안부 묻기."
        
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.PINK,
            tags=[
                CustomerTag.REGULAR,
                CustomerTag.FREE_DRINK,
                CustomerTag.TALK_OK,
            ],
            message=message,
            priority=50
        )
    
    def _vampire_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """흡혈귀 지침 - 정중히 거리두기"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GREY,
            tags=[
                CustomerTag.MANUAL_ONLY,
                CustomerTag.NO_SERVICE,
                CustomerTag.STICK_RULES,
            ],
            message="정중하되 단호하게 규정대로만 응대하세요. 추가 서비스 제공 금지.",
            priority=30,
            alert_level="caution"
        )
    
    def _common_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """일반 고객 지침"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                CustomerTag.STANDARD,
            ],
            message="표준 서비스로 응대하세요.",
            priority=10
        )
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 힌트
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _get_synergy_hint(
        self, 
        current_biz: str, 
        customer: CustomerProfile
    ) -> str:
        """
        시너지 유도 힌트 생성
        
        현재 업종에서 다른 업종으로 연결할 수 있는 멘트 제안
        """
        hints = self.SYNERGY_HINTS.get(current_biz, {})
        
        # 고객이 이용 중인 다른 사업장 확인
        other_biz = [
            biz for biz in customer.biz_records.keys() 
            if biz != current_biz
        ]
        
        if not other_biz:
            return ""
        
        # 첫 번째 다른 사업장으로 힌트 생성
        target = other_biz[0]
        hint_key = f"to_{target}"
        
        return hints.get(hint_key, "")
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 신규 고객 처리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_new_customer_instruction(self, phone: str = "") -> FieldInstruction:
        """신규/미등록 고객 지침"""
        return FieldInstruction(
            display_name="신규 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                ("🆕", "신규", "첫 방문 고객"),
            ],
            message="첫 방문 고객입니다. 친절히 안내하고, 연락처를 남겨주세요.",
            priority=20
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """블랙박스 프로토콜 데모"""
    print("=" * 70)
    print("  🔮 AUTUS-TRINITY BlackBox Protocol Demo")
    print("=" * 70)
    
    blackbox = BlackBoxProtocol()
    
    # 테스트 고객
    from models.customer import CustomerProfile, CustomerArchetype
    
    customers = [
        CustomerProfile(phone="01011112222", name="김후원"),
        CustomerProfile(phone="01022223333", name="이권력"),
        CustomerProfile(phone="01033334444", name="박충성"),
        CustomerProfile(phone="01044445555", name="최주의"),
        CustomerProfile(phone="01055556666", name="정일반"),
    ]
    
    # 유형 설정
    customers[0].archetype = CustomerArchetype.PATRON
    customers[0].biz_records = {"academy": {}, "restaurant": {}}
    customers[1].archetype = CustomerArchetype.TYCOON
    customers[2].archetype = CustomerArchetype.FAN
    customers[3].archetype = CustomerArchetype.VAMPIRE
    customers[4].archetype = CustomerArchetype.COMMON
    
    print("\n📱 현장 태블릿 화면 미리보기:\n")
    
    for customer in customers:
        instruction = blackbox.get_instruction(customer, "restaurant")
        
        print(f"┌{'─' * 50}")
        print(f"│ [{instruction.bg_color.value}] {instruction.display_name}")
        print(f"├{'─' * 50}")
        
        # 태그 표시
        tags_str = " ".join([f"{t[0]} {t[1]}" for t in instruction.tags])
        print(f"│ 태그: {tags_str}")
        
        # 메시지
        print(f"│ 💬 {instruction.message}")
        
        # 시너지 힌트
        if instruction.synergy_hint:
            print(f"│ 🌉 시너지: {instruction.synergy_hint}")
        
        print(f"└{'─' * 50}\n")
    
    # 신규 고객
    print("📱 신규 고객 화면:")
    new_instruction = blackbox.get_new_customer_instruction()
    print(f"  {new_instruction.to_dict()}\n")
    
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: BlackBox Protocol                                 ║
║                          침묵의 지휘자 - 현장 직원용 마스킹 지침                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 원칙:
- 직원에게 고객의 개인정보(등급, 결제내역, 컴플레인 이력)를 직접 노출하지 않음
- 대신 '태그(Tag)'와 '색상(Color)'으로 행동 지침만 전달
- "왜?"를 묻지 않게 만드는 직관적 인터페이스

태그 시스템:
- 👑 VVIP: 최고 대우
- 🍷 서비스 프리패스: 추가 서비스 무조건 제공
- 🔇 매뉴얼 응대: 규정대로만
- ⏳ 원칙 준수: 추가 서비스 금지
- 💖 단골: 친근하게
- ⚡ 신속 처리: 대기 최소화
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

# 내부 모듈
import sys
sys.path.insert(0, '..')
from models.customer import CustomerProfile, CustomerArchetype


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배경색 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DisplayColor(str, Enum):
    """태블릿 표시 배경색"""
    GOLD = "GOLD"       # 황금색 - 후원자
    NAVY = "NAVY"       # 남색 - 권력자
    PINK = "PINK"       # 분홍색 - 찐팬
    GREY = "GREY"       # 회색 - 주의
    WHITE = "WHITE"     # 흰색 - 일반
    
    @property
    def hex_code(self) -> str:
        return {
            "GOLD": "#FFD700",
            "NAVY": "#000080",
            "PINK": "#FFB6C1",
            "GREY": "#808080",
            "WHITE": "#FFFFFF"
        }.get(self.value, "#FFFFFF")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 태그 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerTag:
    """고객 태그 정의"""
    
    # 후원자 태그
    VVIP = ("👑", "그룹 VVIP", "최고 대우")
    SERVICE_PASS = ("🍷", "서비스 프리패스", "추가 서비스 무료")
    PREMIUM_CARE = ("🙇", "프리미엄 의전", "사장님 지인급")
    
    # 권력자 태그
    FAST_TRACK = ("⚡", "신속 처리", "대기 0분 목표")
    NO_CHAT = ("🤫", "사담 금지", "결과만 보고")
    VIP_PROTOCOL = ("💼", "의전 필수", "프로답게")
    
    # 찐팬 태그
    REGULAR = ("💖", "단골", "친근하게")
    FREE_DRINK = ("☕", "음료 서비스", "간단한 서비스")
    TALK_OK = ("🗣️", "말 걸기", "대화 권장")
    
    # 주의 태그
    MANUAL_ONLY = ("🔇", "매뉴얼 응대", "규정대로만")
    NO_SERVICE = ("❌", "추가 서비스 금지", "원칙 준수")
    STICK_RULES = ("⏳", "원칙 준수", "정중하되 단호하게")
    
    # 일반 태그
    STANDARD = ("👤", "일반 응대", "표준 서비스")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 지침
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class FieldInstruction:
    """현장 직원용 지침"""
    display_name: str           # 화면에 표시할 이름
    bg_color: DisplayColor      # 배경색
    tags: List[tuple]           # 태그 목록 [(emoji, label, desc), ...]
    message: str                # 간단한 지침 메시지
    priority: int = 0           # 우선순위 (높을수록 중요)
    synergy_hint: str = ""      # 시너지 유도 힌트 (선택)
    alert_level: str = "normal" # normal, caution, urgent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "display_name": self.display_name,
            "bg_color": self.bg_color.value,
            "bg_color_hex": self.bg_color.hex_code,
            "tags": [
                {"emoji": t[0], "label": t[1], "desc": t[2]} 
                for t in self.tags
            ],
            "message": self.message,
            "priority": self.priority,
            "synergy_hint": self.synergy_hint,
            "alert_level": self.alert_level,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 프로토콜 메인 클래스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BlackBoxProtocol:
    """
    침묵의 지휘자
    
    고객 프로필을 받아 현장용 지침으로 변환
    - 고객의 '왜'를 숨기고 '어떻게'만 전달
    - 업종별 맞춤 메시지 생성
    """
    
    # 업종별 시너지 유도 메시지
    SYNERGY_HINTS = {
        "academy": {
            "to_restaurant": "'오늘 저녁은 [식당A]에서 할인 받으세요' 언급",
            "to_sports": "'운동도 병행하시면 집중력에 좋아요' 언급",
        },
        "restaurant": {
            "to_academy": "'아이 학원은 잘 다니고 있나요?' 안부",
            "to_sports": "'운동 후 식사하시면 더 건강해요' 언급",
        },
        "sports": {
            "to_academy": "'공부 스트레스는 운동으로 풀어야죠' 언급",
            "to_restaurant": "'운동 후 [식당A] 단백질 메뉴 추천' 언급",
        }
    }
    
    def get_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str,
        include_synergy: bool = True
    ) -> FieldInstruction:
        """
        고객 프로필 → 현장 지침 변환
        
        Args:
            customer: 고객 프로필
            biz_type: 현재 업종 (academy, restaurant, sports)
            include_synergy: 시너지 힌트 포함 여부
            
        Returns:
            FieldInstruction: 태블릿에 표시할 지침
        """
        archetype = customer.archetype
        
        # 아키타입별 지침 생성
        if archetype == CustomerArchetype.PATRON:
            instruction = self._patron_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.TYCOON:
            instruction = self._tycoon_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.FAN:
            instruction = self._fan_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.VAMPIRE:
            instruction = self._vampire_instruction(customer, biz_type)
        else:
            instruction = self._common_instruction(customer, biz_type)
        
        # 시너지 힌트 추가
        if include_synergy and customer.is_multi_biz_user:
            instruction.synergy_hint = self._get_synergy_hint(biz_type, customer)
        
        return instruction
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 아키타입별 지침 생성
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _patron_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """후원자 지침 - 신처럼 모셔라"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GOLD,
            tags=[
                CustomerTag.VVIP,
                CustomerTag.SERVICE_PASS,
                CustomerTag.PREMIUM_CARE,
            ],
            message="사장님 지인급 대우. 묻지도 따지지도 말고 서비스 제공.",
            priority=100,
            alert_level="urgent"
        )
    
    def _tycoon_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """권력자 지침 - 프로답게 신속하게"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.NAVY,
            tags=[
                CustomerTag.FAST_TRACK,
                CustomerTag.NO_CHAT,
                CustomerTag.VIP_PROTOCOL,
            ],
            message="대기시간 0분 목표. 잡담 없이 결과만 보고하세요.",
            priority=80,
            alert_level="caution"
        )
    
    def _fan_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """찐팬 지침 - 정서적 교류"""
        # 업종별 맞춤 메시지
        if biz_type == "restaurant":
            message = "'오늘도 오셨네요~' 친근하게 말 걸기. 간단한 음료 서비스."
        elif biz_type == "academy":
            message = "'아이가 요즘 많이 좋아졌어요' 칭찬 먼저."
        else:
            message = "단골 고객. 친근하게 안부 묻기."
        
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.PINK,
            tags=[
                CustomerTag.REGULAR,
                CustomerTag.FREE_DRINK,
                CustomerTag.TALK_OK,
            ],
            message=message,
            priority=50
        )
    
    def _vampire_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """흡혈귀 지침 - 정중히 거리두기"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GREY,
            tags=[
                CustomerTag.MANUAL_ONLY,
                CustomerTag.NO_SERVICE,
                CustomerTag.STICK_RULES,
            ],
            message="정중하되 단호하게 규정대로만 응대하세요. 추가 서비스 제공 금지.",
            priority=30,
            alert_level="caution"
        )
    
    def _common_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """일반 고객 지침"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                CustomerTag.STANDARD,
            ],
            message="표준 서비스로 응대하세요.",
            priority=10
        )
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 힌트
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _get_synergy_hint(
        self, 
        current_biz: str, 
        customer: CustomerProfile
    ) -> str:
        """
        시너지 유도 힌트 생성
        
        현재 업종에서 다른 업종으로 연결할 수 있는 멘트 제안
        """
        hints = self.SYNERGY_HINTS.get(current_biz, {})
        
        # 고객이 이용 중인 다른 사업장 확인
        other_biz = [
            biz for biz in customer.biz_records.keys() 
            if biz != current_biz
        ]
        
        if not other_biz:
            return ""
        
        # 첫 번째 다른 사업장으로 힌트 생성
        target = other_biz[0]
        hint_key = f"to_{target}"
        
        return hints.get(hint_key, "")
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 신규 고객 처리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_new_customer_instruction(self, phone: str = "") -> FieldInstruction:
        """신규/미등록 고객 지침"""
        return FieldInstruction(
            display_name="신규 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                ("🆕", "신규", "첫 방문 고객"),
            ],
            message="첫 방문 고객입니다. 친절히 안내하고, 연락처를 남겨주세요.",
            priority=20
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """블랙박스 프로토콜 데모"""
    print("=" * 70)
    print("  🔮 AUTUS-TRINITY BlackBox Protocol Demo")
    print("=" * 70)
    
    blackbox = BlackBoxProtocol()
    
    # 테스트 고객
    from models.customer import CustomerProfile, CustomerArchetype
    
    customers = [
        CustomerProfile(phone="01011112222", name="김후원"),
        CustomerProfile(phone="01022223333", name="이권력"),
        CustomerProfile(phone="01033334444", name="박충성"),
        CustomerProfile(phone="01044445555", name="최주의"),
        CustomerProfile(phone="01055556666", name="정일반"),
    ]
    
    # 유형 설정
    customers[0].archetype = CustomerArchetype.PATRON
    customers[0].biz_records = {"academy": {}, "restaurant": {}}
    customers[1].archetype = CustomerArchetype.TYCOON
    customers[2].archetype = CustomerArchetype.FAN
    customers[3].archetype = CustomerArchetype.VAMPIRE
    customers[4].archetype = CustomerArchetype.COMMON
    
    print("\n📱 현장 태블릿 화면 미리보기:\n")
    
    for customer in customers:
        instruction = blackbox.get_instruction(customer, "restaurant")
        
        print(f"┌{'─' * 50}")
        print(f"│ [{instruction.bg_color.value}] {instruction.display_name}")
        print(f"├{'─' * 50}")
        
        # 태그 표시
        tags_str = " ".join([f"{t[0]} {t[1]}" for t in instruction.tags])
        print(f"│ 태그: {tags_str}")
        
        # 메시지
        print(f"│ 💬 {instruction.message}")
        
        # 시너지 힌트
        if instruction.synergy_hint:
            print(f"│ 🌉 시너지: {instruction.synergy_hint}")
        
        print(f"└{'─' * 50}\n")
    
    # 신규 고객
    print("📱 신규 고객 화면:")
    new_instruction = blackbox.get_new_customer_instruction()
    print(f"  {new_instruction.to_dict()}\n")
    
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: BlackBox Protocol                                 ║
║                          침묵의 지휘자 - 현장 직원용 마스킹 지침                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 원칙:
- 직원에게 고객의 개인정보(등급, 결제내역, 컴플레인 이력)를 직접 노출하지 않음
- 대신 '태그(Tag)'와 '색상(Color)'으로 행동 지침만 전달
- "왜?"를 묻지 않게 만드는 직관적 인터페이스

태그 시스템:
- 👑 VVIP: 최고 대우
- 🍷 서비스 프리패스: 추가 서비스 무조건 제공
- 🔇 매뉴얼 응대: 규정대로만
- ⏳ 원칙 준수: 추가 서비스 금지
- 💖 단골: 친근하게
- ⚡ 신속 처리: 대기 최소화
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

# 내부 모듈
import sys
sys.path.insert(0, '..')
from models.customer import CustomerProfile, CustomerArchetype


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배경색 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DisplayColor(str, Enum):
    """태블릿 표시 배경색"""
    GOLD = "GOLD"       # 황금색 - 후원자
    NAVY = "NAVY"       # 남색 - 권력자
    PINK = "PINK"       # 분홍색 - 찐팬
    GREY = "GREY"       # 회색 - 주의
    WHITE = "WHITE"     # 흰색 - 일반
    
    @property
    def hex_code(self) -> str:
        return {
            "GOLD": "#FFD700",
            "NAVY": "#000080",
            "PINK": "#FFB6C1",
            "GREY": "#808080",
            "WHITE": "#FFFFFF"
        }.get(self.value, "#FFFFFF")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 태그 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerTag:
    """고객 태그 정의"""
    
    # 후원자 태그
    VVIP = ("👑", "그룹 VVIP", "최고 대우")
    SERVICE_PASS = ("🍷", "서비스 프리패스", "추가 서비스 무료")
    PREMIUM_CARE = ("🙇", "프리미엄 의전", "사장님 지인급")
    
    # 권력자 태그
    FAST_TRACK = ("⚡", "신속 처리", "대기 0분 목표")
    NO_CHAT = ("🤫", "사담 금지", "결과만 보고")
    VIP_PROTOCOL = ("💼", "의전 필수", "프로답게")
    
    # 찐팬 태그
    REGULAR = ("💖", "단골", "친근하게")
    FREE_DRINK = ("☕", "음료 서비스", "간단한 서비스")
    TALK_OK = ("🗣️", "말 걸기", "대화 권장")
    
    # 주의 태그
    MANUAL_ONLY = ("🔇", "매뉴얼 응대", "규정대로만")
    NO_SERVICE = ("❌", "추가 서비스 금지", "원칙 준수")
    STICK_RULES = ("⏳", "원칙 준수", "정중하되 단호하게")
    
    # 일반 태그
    STANDARD = ("👤", "일반 응대", "표준 서비스")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 지침
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class FieldInstruction:
    """현장 직원용 지침"""
    display_name: str           # 화면에 표시할 이름
    bg_color: DisplayColor      # 배경색
    tags: List[tuple]           # 태그 목록 [(emoji, label, desc), ...]
    message: str                # 간단한 지침 메시지
    priority: int = 0           # 우선순위 (높을수록 중요)
    synergy_hint: str = ""      # 시너지 유도 힌트 (선택)
    alert_level: str = "normal" # normal, caution, urgent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "display_name": self.display_name,
            "bg_color": self.bg_color.value,
            "bg_color_hex": self.bg_color.hex_code,
            "tags": [
                {"emoji": t[0], "label": t[1], "desc": t[2]} 
                for t in self.tags
            ],
            "message": self.message,
            "priority": self.priority,
            "synergy_hint": self.synergy_hint,
            "alert_level": self.alert_level,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 프로토콜 메인 클래스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BlackBoxProtocol:
    """
    침묵의 지휘자
    
    고객 프로필을 받아 현장용 지침으로 변환
    - 고객의 '왜'를 숨기고 '어떻게'만 전달
    - 업종별 맞춤 메시지 생성
    """
    
    # 업종별 시너지 유도 메시지
    SYNERGY_HINTS = {
        "academy": {
            "to_restaurant": "'오늘 저녁은 [식당A]에서 할인 받으세요' 언급",
            "to_sports": "'운동도 병행하시면 집중력에 좋아요' 언급",
        },
        "restaurant": {
            "to_academy": "'아이 학원은 잘 다니고 있나요?' 안부",
            "to_sports": "'운동 후 식사하시면 더 건강해요' 언급",
        },
        "sports": {
            "to_academy": "'공부 스트레스는 운동으로 풀어야죠' 언급",
            "to_restaurant": "'운동 후 [식당A] 단백질 메뉴 추천' 언급",
        }
    }
    
    def get_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str,
        include_synergy: bool = True
    ) -> FieldInstruction:
        """
        고객 프로필 → 현장 지침 변환
        
        Args:
            customer: 고객 프로필
            biz_type: 현재 업종 (academy, restaurant, sports)
            include_synergy: 시너지 힌트 포함 여부
            
        Returns:
            FieldInstruction: 태블릿에 표시할 지침
        """
        archetype = customer.archetype
        
        # 아키타입별 지침 생성
        if archetype == CustomerArchetype.PATRON:
            instruction = self._patron_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.TYCOON:
            instruction = self._tycoon_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.FAN:
            instruction = self._fan_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.VAMPIRE:
            instruction = self._vampire_instruction(customer, biz_type)
        else:
            instruction = self._common_instruction(customer, biz_type)
        
        # 시너지 힌트 추가
        if include_synergy and customer.is_multi_biz_user:
            instruction.synergy_hint = self._get_synergy_hint(biz_type, customer)
        
        return instruction
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 아키타입별 지침 생성
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _patron_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """후원자 지침 - 신처럼 모셔라"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GOLD,
            tags=[
                CustomerTag.VVIP,
                CustomerTag.SERVICE_PASS,
                CustomerTag.PREMIUM_CARE,
            ],
            message="사장님 지인급 대우. 묻지도 따지지도 말고 서비스 제공.",
            priority=100,
            alert_level="urgent"
        )
    
    def _tycoon_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """권력자 지침 - 프로답게 신속하게"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.NAVY,
            tags=[
                CustomerTag.FAST_TRACK,
                CustomerTag.NO_CHAT,
                CustomerTag.VIP_PROTOCOL,
            ],
            message="대기시간 0분 목표. 잡담 없이 결과만 보고하세요.",
            priority=80,
            alert_level="caution"
        )
    
    def _fan_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """찐팬 지침 - 정서적 교류"""
        # 업종별 맞춤 메시지
        if biz_type == "restaurant":
            message = "'오늘도 오셨네요~' 친근하게 말 걸기. 간단한 음료 서비스."
        elif biz_type == "academy":
            message = "'아이가 요즘 많이 좋아졌어요' 칭찬 먼저."
        else:
            message = "단골 고객. 친근하게 안부 묻기."
        
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.PINK,
            tags=[
                CustomerTag.REGULAR,
                CustomerTag.FREE_DRINK,
                CustomerTag.TALK_OK,
            ],
            message=message,
            priority=50
        )
    
    def _vampire_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """흡혈귀 지침 - 정중히 거리두기"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GREY,
            tags=[
                CustomerTag.MANUAL_ONLY,
                CustomerTag.NO_SERVICE,
                CustomerTag.STICK_RULES,
            ],
            message="정중하되 단호하게 규정대로만 응대하세요. 추가 서비스 제공 금지.",
            priority=30,
            alert_level="caution"
        )
    
    def _common_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """일반 고객 지침"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                CustomerTag.STANDARD,
            ],
            message="표준 서비스로 응대하세요.",
            priority=10
        )
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 힌트
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _get_synergy_hint(
        self, 
        current_biz: str, 
        customer: CustomerProfile
    ) -> str:
        """
        시너지 유도 힌트 생성
        
        현재 업종에서 다른 업종으로 연결할 수 있는 멘트 제안
        """
        hints = self.SYNERGY_HINTS.get(current_biz, {})
        
        # 고객이 이용 중인 다른 사업장 확인
        other_biz = [
            biz for biz in customer.biz_records.keys() 
            if biz != current_biz
        ]
        
        if not other_biz:
            return ""
        
        # 첫 번째 다른 사업장으로 힌트 생성
        target = other_biz[0]
        hint_key = f"to_{target}"
        
        return hints.get(hint_key, "")
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 신규 고객 처리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_new_customer_instruction(self, phone: str = "") -> FieldInstruction:
        """신규/미등록 고객 지침"""
        return FieldInstruction(
            display_name="신규 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                ("🆕", "신규", "첫 방문 고객"),
            ],
            message="첫 방문 고객입니다. 친절히 안내하고, 연락처를 남겨주세요.",
            priority=20
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """블랙박스 프로토콜 데모"""
    print("=" * 70)
    print("  🔮 AUTUS-TRINITY BlackBox Protocol Demo")
    print("=" * 70)
    
    blackbox = BlackBoxProtocol()
    
    # 테스트 고객
    from models.customer import CustomerProfile, CustomerArchetype
    
    customers = [
        CustomerProfile(phone="01011112222", name="김후원"),
        CustomerProfile(phone="01022223333", name="이권력"),
        CustomerProfile(phone="01033334444", name="박충성"),
        CustomerProfile(phone="01044445555", name="최주의"),
        CustomerProfile(phone="01055556666", name="정일반"),
    ]
    
    # 유형 설정
    customers[0].archetype = CustomerArchetype.PATRON
    customers[0].biz_records = {"academy": {}, "restaurant": {}}
    customers[1].archetype = CustomerArchetype.TYCOON
    customers[2].archetype = CustomerArchetype.FAN
    customers[3].archetype = CustomerArchetype.VAMPIRE
    customers[4].archetype = CustomerArchetype.COMMON
    
    print("\n📱 현장 태블릿 화면 미리보기:\n")
    
    for customer in customers:
        instruction = blackbox.get_instruction(customer, "restaurant")
        
        print(f"┌{'─' * 50}")
        print(f"│ [{instruction.bg_color.value}] {instruction.display_name}")
        print(f"├{'─' * 50}")
        
        # 태그 표시
        tags_str = " ".join([f"{t[0]} {t[1]}" for t in instruction.tags])
        print(f"│ 태그: {tags_str}")
        
        # 메시지
        print(f"│ 💬 {instruction.message}")
        
        # 시너지 힌트
        if instruction.synergy_hint:
            print(f"│ 🌉 시너지: {instruction.synergy_hint}")
        
        print(f"└{'─' * 50}\n")
    
    # 신규 고객
    print("📱 신규 고객 화면:")
    new_instruction = blackbox.get_new_customer_instruction()
    print(f"  {new_instruction.to_dict()}\n")
    
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: BlackBox Protocol                                 ║
║                          침묵의 지휘자 - 현장 직원용 마스킹 지침                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 원칙:
- 직원에게 고객의 개인정보(등급, 결제내역, 컴플레인 이력)를 직접 노출하지 않음
- 대신 '태그(Tag)'와 '색상(Color)'으로 행동 지침만 전달
- "왜?"를 묻지 않게 만드는 직관적 인터페이스

태그 시스템:
- 👑 VVIP: 최고 대우
- 🍷 서비스 프리패스: 추가 서비스 무조건 제공
- 🔇 매뉴얼 응대: 규정대로만
- ⏳ 원칙 준수: 추가 서비스 금지
- 💖 단골: 친근하게
- ⚡ 신속 처리: 대기 최소화
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

# 내부 모듈
import sys
sys.path.insert(0, '..')
from models.customer import CustomerProfile, CustomerArchetype


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배경색 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DisplayColor(str, Enum):
    """태블릿 표시 배경색"""
    GOLD = "GOLD"       # 황금색 - 후원자
    NAVY = "NAVY"       # 남색 - 권력자
    PINK = "PINK"       # 분홍색 - 찐팬
    GREY = "GREY"       # 회색 - 주의
    WHITE = "WHITE"     # 흰색 - 일반
    
    @property
    def hex_code(self) -> str:
        return {
            "GOLD": "#FFD700",
            "NAVY": "#000080",
            "PINK": "#FFB6C1",
            "GREY": "#808080",
            "WHITE": "#FFFFFF"
        }.get(self.value, "#FFFFFF")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 태그 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerTag:
    """고객 태그 정의"""
    
    # 후원자 태그
    VVIP = ("👑", "그룹 VVIP", "최고 대우")
    SERVICE_PASS = ("🍷", "서비스 프리패스", "추가 서비스 무료")
    PREMIUM_CARE = ("🙇", "프리미엄 의전", "사장님 지인급")
    
    # 권력자 태그
    FAST_TRACK = ("⚡", "신속 처리", "대기 0분 목표")
    NO_CHAT = ("🤫", "사담 금지", "결과만 보고")
    VIP_PROTOCOL = ("💼", "의전 필수", "프로답게")
    
    # 찐팬 태그
    REGULAR = ("💖", "단골", "친근하게")
    FREE_DRINK = ("☕", "음료 서비스", "간단한 서비스")
    TALK_OK = ("🗣️", "말 걸기", "대화 권장")
    
    # 주의 태그
    MANUAL_ONLY = ("🔇", "매뉴얼 응대", "규정대로만")
    NO_SERVICE = ("❌", "추가 서비스 금지", "원칙 준수")
    STICK_RULES = ("⏳", "원칙 준수", "정중하되 단호하게")
    
    # 일반 태그
    STANDARD = ("👤", "일반 응대", "표준 서비스")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 지침
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class FieldInstruction:
    """현장 직원용 지침"""
    display_name: str           # 화면에 표시할 이름
    bg_color: DisplayColor      # 배경색
    tags: List[tuple]           # 태그 목록 [(emoji, label, desc), ...]
    message: str                # 간단한 지침 메시지
    priority: int = 0           # 우선순위 (높을수록 중요)
    synergy_hint: str = ""      # 시너지 유도 힌트 (선택)
    alert_level: str = "normal" # normal, caution, urgent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "display_name": self.display_name,
            "bg_color": self.bg_color.value,
            "bg_color_hex": self.bg_color.hex_code,
            "tags": [
                {"emoji": t[0], "label": t[1], "desc": t[2]} 
                for t in self.tags
            ],
            "message": self.message,
            "priority": self.priority,
            "synergy_hint": self.synergy_hint,
            "alert_level": self.alert_level,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 프로토콜 메인 클래스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BlackBoxProtocol:
    """
    침묵의 지휘자
    
    고객 프로필을 받아 현장용 지침으로 변환
    - 고객의 '왜'를 숨기고 '어떻게'만 전달
    - 업종별 맞춤 메시지 생성
    """
    
    # 업종별 시너지 유도 메시지
    SYNERGY_HINTS = {
        "academy": {
            "to_restaurant": "'오늘 저녁은 [식당A]에서 할인 받으세요' 언급",
            "to_sports": "'운동도 병행하시면 집중력에 좋아요' 언급",
        },
        "restaurant": {
            "to_academy": "'아이 학원은 잘 다니고 있나요?' 안부",
            "to_sports": "'운동 후 식사하시면 더 건강해요' 언급",
        },
        "sports": {
            "to_academy": "'공부 스트레스는 운동으로 풀어야죠' 언급",
            "to_restaurant": "'운동 후 [식당A] 단백질 메뉴 추천' 언급",
        }
    }
    
    def get_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str,
        include_synergy: bool = True
    ) -> FieldInstruction:
        """
        고객 프로필 → 현장 지침 변환
        
        Args:
            customer: 고객 프로필
            biz_type: 현재 업종 (academy, restaurant, sports)
            include_synergy: 시너지 힌트 포함 여부
            
        Returns:
            FieldInstruction: 태블릿에 표시할 지침
        """
        archetype = customer.archetype
        
        # 아키타입별 지침 생성
        if archetype == CustomerArchetype.PATRON:
            instruction = self._patron_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.TYCOON:
            instruction = self._tycoon_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.FAN:
            instruction = self._fan_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.VAMPIRE:
            instruction = self._vampire_instruction(customer, biz_type)
        else:
            instruction = self._common_instruction(customer, biz_type)
        
        # 시너지 힌트 추가
        if include_synergy and customer.is_multi_biz_user:
            instruction.synergy_hint = self._get_synergy_hint(biz_type, customer)
        
        return instruction
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 아키타입별 지침 생성
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _patron_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """후원자 지침 - 신처럼 모셔라"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GOLD,
            tags=[
                CustomerTag.VVIP,
                CustomerTag.SERVICE_PASS,
                CustomerTag.PREMIUM_CARE,
            ],
            message="사장님 지인급 대우. 묻지도 따지지도 말고 서비스 제공.",
            priority=100,
            alert_level="urgent"
        )
    
    def _tycoon_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """권력자 지침 - 프로답게 신속하게"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.NAVY,
            tags=[
                CustomerTag.FAST_TRACK,
                CustomerTag.NO_CHAT,
                CustomerTag.VIP_PROTOCOL,
            ],
            message="대기시간 0분 목표. 잡담 없이 결과만 보고하세요.",
            priority=80,
            alert_level="caution"
        )
    
    def _fan_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """찐팬 지침 - 정서적 교류"""
        # 업종별 맞춤 메시지
        if biz_type == "restaurant":
            message = "'오늘도 오셨네요~' 친근하게 말 걸기. 간단한 음료 서비스."
        elif biz_type == "academy":
            message = "'아이가 요즘 많이 좋아졌어요' 칭찬 먼저."
        else:
            message = "단골 고객. 친근하게 안부 묻기."
        
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.PINK,
            tags=[
                CustomerTag.REGULAR,
                CustomerTag.FREE_DRINK,
                CustomerTag.TALK_OK,
            ],
            message=message,
            priority=50
        )
    
    def _vampire_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """흡혈귀 지침 - 정중히 거리두기"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GREY,
            tags=[
                CustomerTag.MANUAL_ONLY,
                CustomerTag.NO_SERVICE,
                CustomerTag.STICK_RULES,
            ],
            message="정중하되 단호하게 규정대로만 응대하세요. 추가 서비스 제공 금지.",
            priority=30,
            alert_level="caution"
        )
    
    def _common_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """일반 고객 지침"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                CustomerTag.STANDARD,
            ],
            message="표준 서비스로 응대하세요.",
            priority=10
        )
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 힌트
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _get_synergy_hint(
        self, 
        current_biz: str, 
        customer: CustomerProfile
    ) -> str:
        """
        시너지 유도 힌트 생성
        
        현재 업종에서 다른 업종으로 연결할 수 있는 멘트 제안
        """
        hints = self.SYNERGY_HINTS.get(current_biz, {})
        
        # 고객이 이용 중인 다른 사업장 확인
        other_biz = [
            biz for biz in customer.biz_records.keys() 
            if biz != current_biz
        ]
        
        if not other_biz:
            return ""
        
        # 첫 번째 다른 사업장으로 힌트 생성
        target = other_biz[0]
        hint_key = f"to_{target}"
        
        return hints.get(hint_key, "")
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 신규 고객 처리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_new_customer_instruction(self, phone: str = "") -> FieldInstruction:
        """신규/미등록 고객 지침"""
        return FieldInstruction(
            display_name="신규 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                ("🆕", "신규", "첫 방문 고객"),
            ],
            message="첫 방문 고객입니다. 친절히 안내하고, 연락처를 남겨주세요.",
            priority=20
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """블랙박스 프로토콜 데모"""
    print("=" * 70)
    print("  🔮 AUTUS-TRINITY BlackBox Protocol Demo")
    print("=" * 70)
    
    blackbox = BlackBoxProtocol()
    
    # 테스트 고객
    from models.customer import CustomerProfile, CustomerArchetype
    
    customers = [
        CustomerProfile(phone="01011112222", name="김후원"),
        CustomerProfile(phone="01022223333", name="이권력"),
        CustomerProfile(phone="01033334444", name="박충성"),
        CustomerProfile(phone="01044445555", name="최주의"),
        CustomerProfile(phone="01055556666", name="정일반"),
    ]
    
    # 유형 설정
    customers[0].archetype = CustomerArchetype.PATRON
    customers[0].biz_records = {"academy": {}, "restaurant": {}}
    customers[1].archetype = CustomerArchetype.TYCOON
    customers[2].archetype = CustomerArchetype.FAN
    customers[3].archetype = CustomerArchetype.VAMPIRE
    customers[4].archetype = CustomerArchetype.COMMON
    
    print("\n📱 현장 태블릿 화면 미리보기:\n")
    
    for customer in customers:
        instruction = blackbox.get_instruction(customer, "restaurant")
        
        print(f"┌{'─' * 50}")
        print(f"│ [{instruction.bg_color.value}] {instruction.display_name}")
        print(f"├{'─' * 50}")
        
        # 태그 표시
        tags_str = " ".join([f"{t[0]} {t[1]}" for t in instruction.tags])
        print(f"│ 태그: {tags_str}")
        
        # 메시지
        print(f"│ 💬 {instruction.message}")
        
        # 시너지 힌트
        if instruction.synergy_hint:
            print(f"│ 🌉 시너지: {instruction.synergy_hint}")
        
        print(f"└{'─' * 50}\n")
    
    # 신규 고객
    print("📱 신규 고객 화면:")
    new_instruction = blackbox.get_new_customer_instruction()
    print(f"  {new_instruction.to_dict()}\n")
    
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: BlackBox Protocol                                 ║
║                          침묵의 지휘자 - 현장 직원용 마스킹 지침                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 원칙:
- 직원에게 고객의 개인정보(등급, 결제내역, 컴플레인 이력)를 직접 노출하지 않음
- 대신 '태그(Tag)'와 '색상(Color)'으로 행동 지침만 전달
- "왜?"를 묻지 않게 만드는 직관적 인터페이스

태그 시스템:
- 👑 VVIP: 최고 대우
- 🍷 서비스 프리패스: 추가 서비스 무조건 제공
- 🔇 매뉴얼 응대: 규정대로만
- ⏳ 원칙 준수: 추가 서비스 금지
- 💖 단골: 친근하게
- ⚡ 신속 처리: 대기 최소화
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

# 내부 모듈
import sys
sys.path.insert(0, '..')
from models.customer import CustomerProfile, CustomerArchetype


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배경색 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DisplayColor(str, Enum):
    """태블릿 표시 배경색"""
    GOLD = "GOLD"       # 황금색 - 후원자
    NAVY = "NAVY"       # 남색 - 권력자
    PINK = "PINK"       # 분홍색 - 찐팬
    GREY = "GREY"       # 회색 - 주의
    WHITE = "WHITE"     # 흰색 - 일반
    
    @property
    def hex_code(self) -> str:
        return {
            "GOLD": "#FFD700",
            "NAVY": "#000080",
            "PINK": "#FFB6C1",
            "GREY": "#808080",
            "WHITE": "#FFFFFF"
        }.get(self.value, "#FFFFFF")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 태그 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerTag:
    """고객 태그 정의"""
    
    # 후원자 태그
    VVIP = ("👑", "그룹 VVIP", "최고 대우")
    SERVICE_PASS = ("🍷", "서비스 프리패스", "추가 서비스 무료")
    PREMIUM_CARE = ("🙇", "프리미엄 의전", "사장님 지인급")
    
    # 권력자 태그
    FAST_TRACK = ("⚡", "신속 처리", "대기 0분 목표")
    NO_CHAT = ("🤫", "사담 금지", "결과만 보고")
    VIP_PROTOCOL = ("💼", "의전 필수", "프로답게")
    
    # 찐팬 태그
    REGULAR = ("💖", "단골", "친근하게")
    FREE_DRINK = ("☕", "음료 서비스", "간단한 서비스")
    TALK_OK = ("🗣️", "말 걸기", "대화 권장")
    
    # 주의 태그
    MANUAL_ONLY = ("🔇", "매뉴얼 응대", "규정대로만")
    NO_SERVICE = ("❌", "추가 서비스 금지", "원칙 준수")
    STICK_RULES = ("⏳", "원칙 준수", "정중하되 단호하게")
    
    # 일반 태그
    STANDARD = ("👤", "일반 응대", "표준 서비스")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 지침
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class FieldInstruction:
    """현장 직원용 지침"""
    display_name: str           # 화면에 표시할 이름
    bg_color: DisplayColor      # 배경색
    tags: List[tuple]           # 태그 목록 [(emoji, label, desc), ...]
    message: str                # 간단한 지침 메시지
    priority: int = 0           # 우선순위 (높을수록 중요)
    synergy_hint: str = ""      # 시너지 유도 힌트 (선택)
    alert_level: str = "normal" # normal, caution, urgent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "display_name": self.display_name,
            "bg_color": self.bg_color.value,
            "bg_color_hex": self.bg_color.hex_code,
            "tags": [
                {"emoji": t[0], "label": t[1], "desc": t[2]} 
                for t in self.tags
            ],
            "message": self.message,
            "priority": self.priority,
            "synergy_hint": self.synergy_hint,
            "alert_level": self.alert_level,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 프로토콜 메인 클래스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BlackBoxProtocol:
    """
    침묵의 지휘자
    
    고객 프로필을 받아 현장용 지침으로 변환
    - 고객의 '왜'를 숨기고 '어떻게'만 전달
    - 업종별 맞춤 메시지 생성
    """
    
    # 업종별 시너지 유도 메시지
    SYNERGY_HINTS = {
        "academy": {
            "to_restaurant": "'오늘 저녁은 [식당A]에서 할인 받으세요' 언급",
            "to_sports": "'운동도 병행하시면 집중력에 좋아요' 언급",
        },
        "restaurant": {
            "to_academy": "'아이 학원은 잘 다니고 있나요?' 안부",
            "to_sports": "'운동 후 식사하시면 더 건강해요' 언급",
        },
        "sports": {
            "to_academy": "'공부 스트레스는 운동으로 풀어야죠' 언급",
            "to_restaurant": "'운동 후 [식당A] 단백질 메뉴 추천' 언급",
        }
    }
    
    def get_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str,
        include_synergy: bool = True
    ) -> FieldInstruction:
        """
        고객 프로필 → 현장 지침 변환
        
        Args:
            customer: 고객 프로필
            biz_type: 현재 업종 (academy, restaurant, sports)
            include_synergy: 시너지 힌트 포함 여부
            
        Returns:
            FieldInstruction: 태블릿에 표시할 지침
        """
        archetype = customer.archetype
        
        # 아키타입별 지침 생성
        if archetype == CustomerArchetype.PATRON:
            instruction = self._patron_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.TYCOON:
            instruction = self._tycoon_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.FAN:
            instruction = self._fan_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.VAMPIRE:
            instruction = self._vampire_instruction(customer, biz_type)
        else:
            instruction = self._common_instruction(customer, biz_type)
        
        # 시너지 힌트 추가
        if include_synergy and customer.is_multi_biz_user:
            instruction.synergy_hint = self._get_synergy_hint(biz_type, customer)
        
        return instruction
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 아키타입별 지침 생성
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _patron_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """후원자 지침 - 신처럼 모셔라"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GOLD,
            tags=[
                CustomerTag.VVIP,
                CustomerTag.SERVICE_PASS,
                CustomerTag.PREMIUM_CARE,
            ],
            message="사장님 지인급 대우. 묻지도 따지지도 말고 서비스 제공.",
            priority=100,
            alert_level="urgent"
        )
    
    def _tycoon_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """권력자 지침 - 프로답게 신속하게"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.NAVY,
            tags=[
                CustomerTag.FAST_TRACK,
                CustomerTag.NO_CHAT,
                CustomerTag.VIP_PROTOCOL,
            ],
            message="대기시간 0분 목표. 잡담 없이 결과만 보고하세요.",
            priority=80,
            alert_level="caution"
        )
    
    def _fan_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """찐팬 지침 - 정서적 교류"""
        # 업종별 맞춤 메시지
        if biz_type == "restaurant":
            message = "'오늘도 오셨네요~' 친근하게 말 걸기. 간단한 음료 서비스."
        elif biz_type == "academy":
            message = "'아이가 요즘 많이 좋아졌어요' 칭찬 먼저."
        else:
            message = "단골 고객. 친근하게 안부 묻기."
        
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.PINK,
            tags=[
                CustomerTag.REGULAR,
                CustomerTag.FREE_DRINK,
                CustomerTag.TALK_OK,
            ],
            message=message,
            priority=50
        )
    
    def _vampire_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """흡혈귀 지침 - 정중히 거리두기"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GREY,
            tags=[
                CustomerTag.MANUAL_ONLY,
                CustomerTag.NO_SERVICE,
                CustomerTag.STICK_RULES,
            ],
            message="정중하되 단호하게 규정대로만 응대하세요. 추가 서비스 제공 금지.",
            priority=30,
            alert_level="caution"
        )
    
    def _common_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """일반 고객 지침"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                CustomerTag.STANDARD,
            ],
            message="표준 서비스로 응대하세요.",
            priority=10
        )
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 힌트
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _get_synergy_hint(
        self, 
        current_biz: str, 
        customer: CustomerProfile
    ) -> str:
        """
        시너지 유도 힌트 생성
        
        현재 업종에서 다른 업종으로 연결할 수 있는 멘트 제안
        """
        hints = self.SYNERGY_HINTS.get(current_biz, {})
        
        # 고객이 이용 중인 다른 사업장 확인
        other_biz = [
            biz for biz in customer.biz_records.keys() 
            if biz != current_biz
        ]
        
        if not other_biz:
            return ""
        
        # 첫 번째 다른 사업장으로 힌트 생성
        target = other_biz[0]
        hint_key = f"to_{target}"
        
        return hints.get(hint_key, "")
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 신규 고객 처리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_new_customer_instruction(self, phone: str = "") -> FieldInstruction:
        """신규/미등록 고객 지침"""
        return FieldInstruction(
            display_name="신규 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                ("🆕", "신규", "첫 방문 고객"),
            ],
            message="첫 방문 고객입니다. 친절히 안내하고, 연락처를 남겨주세요.",
            priority=20
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """블랙박스 프로토콜 데모"""
    print("=" * 70)
    print("  🔮 AUTUS-TRINITY BlackBox Protocol Demo")
    print("=" * 70)
    
    blackbox = BlackBoxProtocol()
    
    # 테스트 고객
    from models.customer import CustomerProfile, CustomerArchetype
    
    customers = [
        CustomerProfile(phone="01011112222", name="김후원"),
        CustomerProfile(phone="01022223333", name="이권력"),
        CustomerProfile(phone="01033334444", name="박충성"),
        CustomerProfile(phone="01044445555", name="최주의"),
        CustomerProfile(phone="01055556666", name="정일반"),
    ]
    
    # 유형 설정
    customers[0].archetype = CustomerArchetype.PATRON
    customers[0].biz_records = {"academy": {}, "restaurant": {}}
    customers[1].archetype = CustomerArchetype.TYCOON
    customers[2].archetype = CustomerArchetype.FAN
    customers[3].archetype = CustomerArchetype.VAMPIRE
    customers[4].archetype = CustomerArchetype.COMMON
    
    print("\n📱 현장 태블릿 화면 미리보기:\n")
    
    for customer in customers:
        instruction = blackbox.get_instruction(customer, "restaurant")
        
        print(f"┌{'─' * 50}")
        print(f"│ [{instruction.bg_color.value}] {instruction.display_name}")
        print(f"├{'─' * 50}")
        
        # 태그 표시
        tags_str = " ".join([f"{t[0]} {t[1]}" for t in instruction.tags])
        print(f"│ 태그: {tags_str}")
        
        # 메시지
        print(f"│ 💬 {instruction.message}")
        
        # 시너지 힌트
        if instruction.synergy_hint:
            print(f"│ 🌉 시너지: {instruction.synergy_hint}")
        
        print(f"└{'─' * 50}\n")
    
    # 신규 고객
    print("📱 신규 고객 화면:")
    new_instruction = blackbox.get_new_customer_instruction()
    print(f"  {new_instruction.to_dict()}\n")
    
    print("=" * 70)


if __name__ == "__main__":
    run_demo()




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: BlackBox Protocol                                 ║
║                          침묵의 지휘자 - 현장 직원용 마스킹 지침                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 원칙:
- 직원에게 고객의 개인정보(등급, 결제내역, 컴플레인 이력)를 직접 노출하지 않음
- 대신 '태그(Tag)'와 '색상(Color)'으로 행동 지침만 전달
- "왜?"를 묻지 않게 만드는 직관적 인터페이스

태그 시스템:
- 👑 VVIP: 최고 대우
- 🍷 서비스 프리패스: 추가 서비스 무조건 제공
- 🔇 매뉴얼 응대: 규정대로만
- ⏳ 원칙 준수: 추가 서비스 금지
- 💖 단골: 친근하게
- ⚡ 신속 처리: 대기 최소화
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

# 내부 모듈
import sys
sys.path.insert(0, '..')
from models.customer import CustomerProfile, CustomerArchetype


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배경색 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DisplayColor(str, Enum):
    """태블릿 표시 배경색"""
    GOLD = "GOLD"       # 황금색 - 후원자
    NAVY = "NAVY"       # 남색 - 권력자
    PINK = "PINK"       # 분홍색 - 찐팬
    GREY = "GREY"       # 회색 - 주의
    WHITE = "WHITE"     # 흰색 - 일반
    
    @property
    def hex_code(self) -> str:
        return {
            "GOLD": "#FFD700",
            "NAVY": "#000080",
            "PINK": "#FFB6C1",
            "GREY": "#808080",
            "WHITE": "#FFFFFF"
        }.get(self.value, "#FFFFFF")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 태그 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerTag:
    """고객 태그 정의"""
    
    # 후원자 태그
    VVIP = ("👑", "그룹 VVIP", "최고 대우")
    SERVICE_PASS = ("🍷", "서비스 프리패스", "추가 서비스 무료")
    PREMIUM_CARE = ("🙇", "프리미엄 의전", "사장님 지인급")
    
    # 권력자 태그
    FAST_TRACK = ("⚡", "신속 처리", "대기 0분 목표")
    NO_CHAT = ("🤫", "사담 금지", "결과만 보고")
    VIP_PROTOCOL = ("💼", "의전 필수", "프로답게")
    
    # 찐팬 태그
    REGULAR = ("💖", "단골", "친근하게")
    FREE_DRINK = ("☕", "음료 서비스", "간단한 서비스")
    TALK_OK = ("🗣️", "말 걸기", "대화 권장")
    
    # 주의 태그
    MANUAL_ONLY = ("🔇", "매뉴얼 응대", "규정대로만")
    NO_SERVICE = ("❌", "추가 서비스 금지", "원칙 준수")
    STICK_RULES = ("⏳", "원칙 준수", "정중하되 단호하게")
    
    # 일반 태그
    STANDARD = ("👤", "일반 응대", "표준 서비스")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 지침
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class FieldInstruction:
    """현장 직원용 지침"""
    display_name: str           # 화면에 표시할 이름
    bg_color: DisplayColor      # 배경색
    tags: List[tuple]           # 태그 목록 [(emoji, label, desc), ...]
    message: str                # 간단한 지침 메시지
    priority: int = 0           # 우선순위 (높을수록 중요)
    synergy_hint: str = ""      # 시너지 유도 힌트 (선택)
    alert_level: str = "normal" # normal, caution, urgent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "display_name": self.display_name,
            "bg_color": self.bg_color.value,
            "bg_color_hex": self.bg_color.hex_code,
            "tags": [
                {"emoji": t[0], "label": t[1], "desc": t[2]} 
                for t in self.tags
            ],
            "message": self.message,
            "priority": self.priority,
            "synergy_hint": self.synergy_hint,
            "alert_level": self.alert_level,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 프로토콜 메인 클래스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BlackBoxProtocol:
    """
    침묵의 지휘자
    
    고객 프로필을 받아 현장용 지침으로 변환
    - 고객의 '왜'를 숨기고 '어떻게'만 전달
    - 업종별 맞춤 메시지 생성
    """
    
    # 업종별 시너지 유도 메시지
    SYNERGY_HINTS = {
        "academy": {
            "to_restaurant": "'오늘 저녁은 [식당A]에서 할인 받으세요' 언급",
            "to_sports": "'운동도 병행하시면 집중력에 좋아요' 언급",
        },
        "restaurant": {
            "to_academy": "'아이 학원은 잘 다니고 있나요?' 안부",
            "to_sports": "'운동 후 식사하시면 더 건강해요' 언급",
        },
        "sports": {
            "to_academy": "'공부 스트레스는 운동으로 풀어야죠' 언급",
            "to_restaurant": "'운동 후 [식당A] 단백질 메뉴 추천' 언급",
        }
    }
    
    def get_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str,
        include_synergy: bool = True
    ) -> FieldInstruction:
        """
        고객 프로필 → 현장 지침 변환
        
        Args:
            customer: 고객 프로필
            biz_type: 현재 업종 (academy, restaurant, sports)
            include_synergy: 시너지 힌트 포함 여부
            
        Returns:
            FieldInstruction: 태블릿에 표시할 지침
        """
        archetype = customer.archetype
        
        # 아키타입별 지침 생성
        if archetype == CustomerArchetype.PATRON:
            instruction = self._patron_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.TYCOON:
            instruction = self._tycoon_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.FAN:
            instruction = self._fan_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.VAMPIRE:
            instruction = self._vampire_instruction(customer, biz_type)
        else:
            instruction = self._common_instruction(customer, biz_type)
        
        # 시너지 힌트 추가
        if include_synergy and customer.is_multi_biz_user:
            instruction.synergy_hint = self._get_synergy_hint(biz_type, customer)
        
        return instruction
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 아키타입별 지침 생성
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _patron_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """후원자 지침 - 신처럼 모셔라"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GOLD,
            tags=[
                CustomerTag.VVIP,
                CustomerTag.SERVICE_PASS,
                CustomerTag.PREMIUM_CARE,
            ],
            message="사장님 지인급 대우. 묻지도 따지지도 말고 서비스 제공.",
            priority=100,
            alert_level="urgent"
        )
    
    def _tycoon_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """권력자 지침 - 프로답게 신속하게"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.NAVY,
            tags=[
                CustomerTag.FAST_TRACK,
                CustomerTag.NO_CHAT,
                CustomerTag.VIP_PROTOCOL,
            ],
            message="대기시간 0분 목표. 잡담 없이 결과만 보고하세요.",
            priority=80,
            alert_level="caution"
        )
    
    def _fan_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """찐팬 지침 - 정서적 교류"""
        # 업종별 맞춤 메시지
        if biz_type == "restaurant":
            message = "'오늘도 오셨네요~' 친근하게 말 걸기. 간단한 음료 서비스."
        elif biz_type == "academy":
            message = "'아이가 요즘 많이 좋아졌어요' 칭찬 먼저."
        else:
            message = "단골 고객. 친근하게 안부 묻기."
        
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.PINK,
            tags=[
                CustomerTag.REGULAR,
                CustomerTag.FREE_DRINK,
                CustomerTag.TALK_OK,
            ],
            message=message,
            priority=50
        )
    
    def _vampire_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """흡혈귀 지침 - 정중히 거리두기"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GREY,
            tags=[
                CustomerTag.MANUAL_ONLY,
                CustomerTag.NO_SERVICE,
                CustomerTag.STICK_RULES,
            ],
            message="정중하되 단호하게 규정대로만 응대하세요. 추가 서비스 제공 금지.",
            priority=30,
            alert_level="caution"
        )
    
    def _common_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """일반 고객 지침"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                CustomerTag.STANDARD,
            ],
            message="표준 서비스로 응대하세요.",
            priority=10
        )
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 힌트
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _get_synergy_hint(
        self, 
        current_biz: str, 
        customer: CustomerProfile
    ) -> str:
        """
        시너지 유도 힌트 생성
        
        현재 업종에서 다른 업종으로 연결할 수 있는 멘트 제안
        """
        hints = self.SYNERGY_HINTS.get(current_biz, {})
        
        # 고객이 이용 중인 다른 사업장 확인
        other_biz = [
            biz for biz in customer.biz_records.keys() 
            if biz != current_biz
        ]
        
        if not other_biz:
            return ""
        
        # 첫 번째 다른 사업장으로 힌트 생성
        target = other_biz[0]
        hint_key = f"to_{target}"
        
        return hints.get(hint_key, "")
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 신규 고객 처리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_new_customer_instruction(self, phone: str = "") -> FieldInstruction:
        """신규/미등록 고객 지침"""
        return FieldInstruction(
            display_name="신규 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                ("🆕", "신규", "첫 방문 고객"),
            ],
            message="첫 방문 고객입니다. 친절히 안내하고, 연락처를 남겨주세요.",
            priority=20
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """블랙박스 프로토콜 데모"""
    print("=" * 70)
    print("  🔮 AUTUS-TRINITY BlackBox Protocol Demo")
    print("=" * 70)
    
    blackbox = BlackBoxProtocol()
    
    # 테스트 고객
    from models.customer import CustomerProfile, CustomerArchetype
    
    customers = [
        CustomerProfile(phone="01011112222", name="김후원"),
        CustomerProfile(phone="01022223333", name="이권력"),
        CustomerProfile(phone="01033334444", name="박충성"),
        CustomerProfile(phone="01044445555", name="최주의"),
        CustomerProfile(phone="01055556666", name="정일반"),
    ]
    
    # 유형 설정
    customers[0].archetype = CustomerArchetype.PATRON
    customers[0].biz_records = {"academy": {}, "restaurant": {}}
    customers[1].archetype = CustomerArchetype.TYCOON
    customers[2].archetype = CustomerArchetype.FAN
    customers[3].archetype = CustomerArchetype.VAMPIRE
    customers[4].archetype = CustomerArchetype.COMMON
    
    print("\n📱 현장 태블릿 화면 미리보기:\n")
    
    for customer in customers:
        instruction = blackbox.get_instruction(customer, "restaurant")
        
        print(f"┌{'─' * 50}")
        print(f"│ [{instruction.bg_color.value}] {instruction.display_name}")
        print(f"├{'─' * 50}")
        
        # 태그 표시
        tags_str = " ".join([f"{t[0]} {t[1]}" for t in instruction.tags])
        print(f"│ 태그: {tags_str}")
        
        # 메시지
        print(f"│ 💬 {instruction.message}")
        
        # 시너지 힌트
        if instruction.synergy_hint:
            print(f"│ 🌉 시너지: {instruction.synergy_hint}")
        
        print(f"└{'─' * 50}\n")
    
    # 신규 고객
    print("📱 신규 고객 화면:")
    new_instruction = blackbox.get_new_customer_instruction()
    print(f"  {new_instruction.to_dict()}\n")
    
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: BlackBox Protocol                                 ║
║                          침묵의 지휘자 - 현장 직원용 마스킹 지침                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 원칙:
- 직원에게 고객의 개인정보(등급, 결제내역, 컴플레인 이력)를 직접 노출하지 않음
- 대신 '태그(Tag)'와 '색상(Color)'으로 행동 지침만 전달
- "왜?"를 묻지 않게 만드는 직관적 인터페이스

태그 시스템:
- 👑 VVIP: 최고 대우
- 🍷 서비스 프리패스: 추가 서비스 무조건 제공
- 🔇 매뉴얼 응대: 규정대로만
- ⏳ 원칙 준수: 추가 서비스 금지
- 💖 단골: 친근하게
- ⚡ 신속 처리: 대기 최소화
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

# 내부 모듈
import sys
sys.path.insert(0, '..')
from models.customer import CustomerProfile, CustomerArchetype


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배경색 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DisplayColor(str, Enum):
    """태블릿 표시 배경색"""
    GOLD = "GOLD"       # 황금색 - 후원자
    NAVY = "NAVY"       # 남색 - 권력자
    PINK = "PINK"       # 분홍색 - 찐팬
    GREY = "GREY"       # 회색 - 주의
    WHITE = "WHITE"     # 흰색 - 일반
    
    @property
    def hex_code(self) -> str:
        return {
            "GOLD": "#FFD700",
            "NAVY": "#000080",
            "PINK": "#FFB6C1",
            "GREY": "#808080",
            "WHITE": "#FFFFFF"
        }.get(self.value, "#FFFFFF")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 태그 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerTag:
    """고객 태그 정의"""
    
    # 후원자 태그
    VVIP = ("👑", "그룹 VVIP", "최고 대우")
    SERVICE_PASS = ("🍷", "서비스 프리패스", "추가 서비스 무료")
    PREMIUM_CARE = ("🙇", "프리미엄 의전", "사장님 지인급")
    
    # 권력자 태그
    FAST_TRACK = ("⚡", "신속 처리", "대기 0분 목표")
    NO_CHAT = ("🤫", "사담 금지", "결과만 보고")
    VIP_PROTOCOL = ("💼", "의전 필수", "프로답게")
    
    # 찐팬 태그
    REGULAR = ("💖", "단골", "친근하게")
    FREE_DRINK = ("☕", "음료 서비스", "간단한 서비스")
    TALK_OK = ("🗣️", "말 걸기", "대화 권장")
    
    # 주의 태그
    MANUAL_ONLY = ("🔇", "매뉴얼 응대", "규정대로만")
    NO_SERVICE = ("❌", "추가 서비스 금지", "원칙 준수")
    STICK_RULES = ("⏳", "원칙 준수", "정중하되 단호하게")
    
    # 일반 태그
    STANDARD = ("👤", "일반 응대", "표준 서비스")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 지침
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class FieldInstruction:
    """현장 직원용 지침"""
    display_name: str           # 화면에 표시할 이름
    bg_color: DisplayColor      # 배경색
    tags: List[tuple]           # 태그 목록 [(emoji, label, desc), ...]
    message: str                # 간단한 지침 메시지
    priority: int = 0           # 우선순위 (높을수록 중요)
    synergy_hint: str = ""      # 시너지 유도 힌트 (선택)
    alert_level: str = "normal" # normal, caution, urgent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "display_name": self.display_name,
            "bg_color": self.bg_color.value,
            "bg_color_hex": self.bg_color.hex_code,
            "tags": [
                {"emoji": t[0], "label": t[1], "desc": t[2]} 
                for t in self.tags
            ],
            "message": self.message,
            "priority": self.priority,
            "synergy_hint": self.synergy_hint,
            "alert_level": self.alert_level,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 프로토콜 메인 클래스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BlackBoxProtocol:
    """
    침묵의 지휘자
    
    고객 프로필을 받아 현장용 지침으로 변환
    - 고객의 '왜'를 숨기고 '어떻게'만 전달
    - 업종별 맞춤 메시지 생성
    """
    
    # 업종별 시너지 유도 메시지
    SYNERGY_HINTS = {
        "academy": {
            "to_restaurant": "'오늘 저녁은 [식당A]에서 할인 받으세요' 언급",
            "to_sports": "'운동도 병행하시면 집중력에 좋아요' 언급",
        },
        "restaurant": {
            "to_academy": "'아이 학원은 잘 다니고 있나요?' 안부",
            "to_sports": "'운동 후 식사하시면 더 건강해요' 언급",
        },
        "sports": {
            "to_academy": "'공부 스트레스는 운동으로 풀어야죠' 언급",
            "to_restaurant": "'운동 후 [식당A] 단백질 메뉴 추천' 언급",
        }
    }
    
    def get_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str,
        include_synergy: bool = True
    ) -> FieldInstruction:
        """
        고객 프로필 → 현장 지침 변환
        
        Args:
            customer: 고객 프로필
            biz_type: 현재 업종 (academy, restaurant, sports)
            include_synergy: 시너지 힌트 포함 여부
            
        Returns:
            FieldInstruction: 태블릿에 표시할 지침
        """
        archetype = customer.archetype
        
        # 아키타입별 지침 생성
        if archetype == CustomerArchetype.PATRON:
            instruction = self._patron_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.TYCOON:
            instruction = self._tycoon_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.FAN:
            instruction = self._fan_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.VAMPIRE:
            instruction = self._vampire_instruction(customer, biz_type)
        else:
            instruction = self._common_instruction(customer, biz_type)
        
        # 시너지 힌트 추가
        if include_synergy and customer.is_multi_biz_user:
            instruction.synergy_hint = self._get_synergy_hint(biz_type, customer)
        
        return instruction
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 아키타입별 지침 생성
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _patron_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """후원자 지침 - 신처럼 모셔라"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GOLD,
            tags=[
                CustomerTag.VVIP,
                CustomerTag.SERVICE_PASS,
                CustomerTag.PREMIUM_CARE,
            ],
            message="사장님 지인급 대우. 묻지도 따지지도 말고 서비스 제공.",
            priority=100,
            alert_level="urgent"
        )
    
    def _tycoon_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """권력자 지침 - 프로답게 신속하게"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.NAVY,
            tags=[
                CustomerTag.FAST_TRACK,
                CustomerTag.NO_CHAT,
                CustomerTag.VIP_PROTOCOL,
            ],
            message="대기시간 0분 목표. 잡담 없이 결과만 보고하세요.",
            priority=80,
            alert_level="caution"
        )
    
    def _fan_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """찐팬 지침 - 정서적 교류"""
        # 업종별 맞춤 메시지
        if biz_type == "restaurant":
            message = "'오늘도 오셨네요~' 친근하게 말 걸기. 간단한 음료 서비스."
        elif biz_type == "academy":
            message = "'아이가 요즘 많이 좋아졌어요' 칭찬 먼저."
        else:
            message = "단골 고객. 친근하게 안부 묻기."
        
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.PINK,
            tags=[
                CustomerTag.REGULAR,
                CustomerTag.FREE_DRINK,
                CustomerTag.TALK_OK,
            ],
            message=message,
            priority=50
        )
    
    def _vampire_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """흡혈귀 지침 - 정중히 거리두기"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GREY,
            tags=[
                CustomerTag.MANUAL_ONLY,
                CustomerTag.NO_SERVICE,
                CustomerTag.STICK_RULES,
            ],
            message="정중하되 단호하게 규정대로만 응대하세요. 추가 서비스 제공 금지.",
            priority=30,
            alert_level="caution"
        )
    
    def _common_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """일반 고객 지침"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                CustomerTag.STANDARD,
            ],
            message="표준 서비스로 응대하세요.",
            priority=10
        )
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 힌트
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _get_synergy_hint(
        self, 
        current_biz: str, 
        customer: CustomerProfile
    ) -> str:
        """
        시너지 유도 힌트 생성
        
        현재 업종에서 다른 업종으로 연결할 수 있는 멘트 제안
        """
        hints = self.SYNERGY_HINTS.get(current_biz, {})
        
        # 고객이 이용 중인 다른 사업장 확인
        other_biz = [
            biz for biz in customer.biz_records.keys() 
            if biz != current_biz
        ]
        
        if not other_biz:
            return ""
        
        # 첫 번째 다른 사업장으로 힌트 생성
        target = other_biz[0]
        hint_key = f"to_{target}"
        
        return hints.get(hint_key, "")
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 신규 고객 처리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_new_customer_instruction(self, phone: str = "") -> FieldInstruction:
        """신규/미등록 고객 지침"""
        return FieldInstruction(
            display_name="신규 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                ("🆕", "신규", "첫 방문 고객"),
            ],
            message="첫 방문 고객입니다. 친절히 안내하고, 연락처를 남겨주세요.",
            priority=20
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """블랙박스 프로토콜 데모"""
    print("=" * 70)
    print("  🔮 AUTUS-TRINITY BlackBox Protocol Demo")
    print("=" * 70)
    
    blackbox = BlackBoxProtocol()
    
    # 테스트 고객
    from models.customer import CustomerProfile, CustomerArchetype
    
    customers = [
        CustomerProfile(phone="01011112222", name="김후원"),
        CustomerProfile(phone="01022223333", name="이권력"),
        CustomerProfile(phone="01033334444", name="박충성"),
        CustomerProfile(phone="01044445555", name="최주의"),
        CustomerProfile(phone="01055556666", name="정일반"),
    ]
    
    # 유형 설정
    customers[0].archetype = CustomerArchetype.PATRON
    customers[0].biz_records = {"academy": {}, "restaurant": {}}
    customers[1].archetype = CustomerArchetype.TYCOON
    customers[2].archetype = CustomerArchetype.FAN
    customers[3].archetype = CustomerArchetype.VAMPIRE
    customers[4].archetype = CustomerArchetype.COMMON
    
    print("\n📱 현장 태블릿 화면 미리보기:\n")
    
    for customer in customers:
        instruction = blackbox.get_instruction(customer, "restaurant")
        
        print(f"┌{'─' * 50}")
        print(f"│ [{instruction.bg_color.value}] {instruction.display_name}")
        print(f"├{'─' * 50}")
        
        # 태그 표시
        tags_str = " ".join([f"{t[0]} {t[1]}" for t in instruction.tags])
        print(f"│ 태그: {tags_str}")
        
        # 메시지
        print(f"│ 💬 {instruction.message}")
        
        # 시너지 힌트
        if instruction.synergy_hint:
            print(f"│ 🌉 시너지: {instruction.synergy_hint}")
        
        print(f"└{'─' * 50}\n")
    
    # 신규 고객
    print("📱 신규 고객 화면:")
    new_instruction = blackbox.get_new_customer_instruction()
    print(f"  {new_instruction.to_dict()}\n")
    
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: BlackBox Protocol                                 ║
║                          침묵의 지휘자 - 현장 직원용 마스킹 지침                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 원칙:
- 직원에게 고객의 개인정보(등급, 결제내역, 컴플레인 이력)를 직접 노출하지 않음
- 대신 '태그(Tag)'와 '색상(Color)'으로 행동 지침만 전달
- "왜?"를 묻지 않게 만드는 직관적 인터페이스

태그 시스템:
- 👑 VVIP: 최고 대우
- 🍷 서비스 프리패스: 추가 서비스 무조건 제공
- 🔇 매뉴얼 응대: 규정대로만
- ⏳ 원칙 준수: 추가 서비스 금지
- 💖 단골: 친근하게
- ⚡ 신속 처리: 대기 최소화
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

# 내부 모듈
import sys
sys.path.insert(0, '..')
from models.customer import CustomerProfile, CustomerArchetype


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배경색 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DisplayColor(str, Enum):
    """태블릿 표시 배경색"""
    GOLD = "GOLD"       # 황금색 - 후원자
    NAVY = "NAVY"       # 남색 - 권력자
    PINK = "PINK"       # 분홍색 - 찐팬
    GREY = "GREY"       # 회색 - 주의
    WHITE = "WHITE"     # 흰색 - 일반
    
    @property
    def hex_code(self) -> str:
        return {
            "GOLD": "#FFD700",
            "NAVY": "#000080",
            "PINK": "#FFB6C1",
            "GREY": "#808080",
            "WHITE": "#FFFFFF"
        }.get(self.value, "#FFFFFF")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 태그 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerTag:
    """고객 태그 정의"""
    
    # 후원자 태그
    VVIP = ("👑", "그룹 VVIP", "최고 대우")
    SERVICE_PASS = ("🍷", "서비스 프리패스", "추가 서비스 무료")
    PREMIUM_CARE = ("🙇", "프리미엄 의전", "사장님 지인급")
    
    # 권력자 태그
    FAST_TRACK = ("⚡", "신속 처리", "대기 0분 목표")
    NO_CHAT = ("🤫", "사담 금지", "결과만 보고")
    VIP_PROTOCOL = ("💼", "의전 필수", "프로답게")
    
    # 찐팬 태그
    REGULAR = ("💖", "단골", "친근하게")
    FREE_DRINK = ("☕", "음료 서비스", "간단한 서비스")
    TALK_OK = ("🗣️", "말 걸기", "대화 권장")
    
    # 주의 태그
    MANUAL_ONLY = ("🔇", "매뉴얼 응대", "규정대로만")
    NO_SERVICE = ("❌", "추가 서비스 금지", "원칙 준수")
    STICK_RULES = ("⏳", "원칙 준수", "정중하되 단호하게")
    
    # 일반 태그
    STANDARD = ("👤", "일반 응대", "표준 서비스")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 지침
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class FieldInstruction:
    """현장 직원용 지침"""
    display_name: str           # 화면에 표시할 이름
    bg_color: DisplayColor      # 배경색
    tags: List[tuple]           # 태그 목록 [(emoji, label, desc), ...]
    message: str                # 간단한 지침 메시지
    priority: int = 0           # 우선순위 (높을수록 중요)
    synergy_hint: str = ""      # 시너지 유도 힌트 (선택)
    alert_level: str = "normal" # normal, caution, urgent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "display_name": self.display_name,
            "bg_color": self.bg_color.value,
            "bg_color_hex": self.bg_color.hex_code,
            "tags": [
                {"emoji": t[0], "label": t[1], "desc": t[2]} 
                for t in self.tags
            ],
            "message": self.message,
            "priority": self.priority,
            "synergy_hint": self.synergy_hint,
            "alert_level": self.alert_level,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 프로토콜 메인 클래스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BlackBoxProtocol:
    """
    침묵의 지휘자
    
    고객 프로필을 받아 현장용 지침으로 변환
    - 고객의 '왜'를 숨기고 '어떻게'만 전달
    - 업종별 맞춤 메시지 생성
    """
    
    # 업종별 시너지 유도 메시지
    SYNERGY_HINTS = {
        "academy": {
            "to_restaurant": "'오늘 저녁은 [식당A]에서 할인 받으세요' 언급",
            "to_sports": "'운동도 병행하시면 집중력에 좋아요' 언급",
        },
        "restaurant": {
            "to_academy": "'아이 학원은 잘 다니고 있나요?' 안부",
            "to_sports": "'운동 후 식사하시면 더 건강해요' 언급",
        },
        "sports": {
            "to_academy": "'공부 스트레스는 운동으로 풀어야죠' 언급",
            "to_restaurant": "'운동 후 [식당A] 단백질 메뉴 추천' 언급",
        }
    }
    
    def get_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str,
        include_synergy: bool = True
    ) -> FieldInstruction:
        """
        고객 프로필 → 현장 지침 변환
        
        Args:
            customer: 고객 프로필
            biz_type: 현재 업종 (academy, restaurant, sports)
            include_synergy: 시너지 힌트 포함 여부
            
        Returns:
            FieldInstruction: 태블릿에 표시할 지침
        """
        archetype = customer.archetype
        
        # 아키타입별 지침 생성
        if archetype == CustomerArchetype.PATRON:
            instruction = self._patron_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.TYCOON:
            instruction = self._tycoon_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.FAN:
            instruction = self._fan_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.VAMPIRE:
            instruction = self._vampire_instruction(customer, biz_type)
        else:
            instruction = self._common_instruction(customer, biz_type)
        
        # 시너지 힌트 추가
        if include_synergy and customer.is_multi_biz_user:
            instruction.synergy_hint = self._get_synergy_hint(biz_type, customer)
        
        return instruction
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 아키타입별 지침 생성
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _patron_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """후원자 지침 - 신처럼 모셔라"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GOLD,
            tags=[
                CustomerTag.VVIP,
                CustomerTag.SERVICE_PASS,
                CustomerTag.PREMIUM_CARE,
            ],
            message="사장님 지인급 대우. 묻지도 따지지도 말고 서비스 제공.",
            priority=100,
            alert_level="urgent"
        )
    
    def _tycoon_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """권력자 지침 - 프로답게 신속하게"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.NAVY,
            tags=[
                CustomerTag.FAST_TRACK,
                CustomerTag.NO_CHAT,
                CustomerTag.VIP_PROTOCOL,
            ],
            message="대기시간 0분 목표. 잡담 없이 결과만 보고하세요.",
            priority=80,
            alert_level="caution"
        )
    
    def _fan_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """찐팬 지침 - 정서적 교류"""
        # 업종별 맞춤 메시지
        if biz_type == "restaurant":
            message = "'오늘도 오셨네요~' 친근하게 말 걸기. 간단한 음료 서비스."
        elif biz_type == "academy":
            message = "'아이가 요즘 많이 좋아졌어요' 칭찬 먼저."
        else:
            message = "단골 고객. 친근하게 안부 묻기."
        
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.PINK,
            tags=[
                CustomerTag.REGULAR,
                CustomerTag.FREE_DRINK,
                CustomerTag.TALK_OK,
            ],
            message=message,
            priority=50
        )
    
    def _vampire_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """흡혈귀 지침 - 정중히 거리두기"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GREY,
            tags=[
                CustomerTag.MANUAL_ONLY,
                CustomerTag.NO_SERVICE,
                CustomerTag.STICK_RULES,
            ],
            message="정중하되 단호하게 규정대로만 응대하세요. 추가 서비스 제공 금지.",
            priority=30,
            alert_level="caution"
        )
    
    def _common_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """일반 고객 지침"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                CustomerTag.STANDARD,
            ],
            message="표준 서비스로 응대하세요.",
            priority=10
        )
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 힌트
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _get_synergy_hint(
        self, 
        current_biz: str, 
        customer: CustomerProfile
    ) -> str:
        """
        시너지 유도 힌트 생성
        
        현재 업종에서 다른 업종으로 연결할 수 있는 멘트 제안
        """
        hints = self.SYNERGY_HINTS.get(current_biz, {})
        
        # 고객이 이용 중인 다른 사업장 확인
        other_biz = [
            biz for biz in customer.biz_records.keys() 
            if biz != current_biz
        ]
        
        if not other_biz:
            return ""
        
        # 첫 번째 다른 사업장으로 힌트 생성
        target = other_biz[0]
        hint_key = f"to_{target}"
        
        return hints.get(hint_key, "")
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 신규 고객 처리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_new_customer_instruction(self, phone: str = "") -> FieldInstruction:
        """신규/미등록 고객 지침"""
        return FieldInstruction(
            display_name="신규 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                ("🆕", "신규", "첫 방문 고객"),
            ],
            message="첫 방문 고객입니다. 친절히 안내하고, 연락처를 남겨주세요.",
            priority=20
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """블랙박스 프로토콜 데모"""
    print("=" * 70)
    print("  🔮 AUTUS-TRINITY BlackBox Protocol Demo")
    print("=" * 70)
    
    blackbox = BlackBoxProtocol()
    
    # 테스트 고객
    from models.customer import CustomerProfile, CustomerArchetype
    
    customers = [
        CustomerProfile(phone="01011112222", name="김후원"),
        CustomerProfile(phone="01022223333", name="이권력"),
        CustomerProfile(phone="01033334444", name="박충성"),
        CustomerProfile(phone="01044445555", name="최주의"),
        CustomerProfile(phone="01055556666", name="정일반"),
    ]
    
    # 유형 설정
    customers[0].archetype = CustomerArchetype.PATRON
    customers[0].biz_records = {"academy": {}, "restaurant": {}}
    customers[1].archetype = CustomerArchetype.TYCOON
    customers[2].archetype = CustomerArchetype.FAN
    customers[3].archetype = CustomerArchetype.VAMPIRE
    customers[4].archetype = CustomerArchetype.COMMON
    
    print("\n📱 현장 태블릿 화면 미리보기:\n")
    
    for customer in customers:
        instruction = blackbox.get_instruction(customer, "restaurant")
        
        print(f"┌{'─' * 50}")
        print(f"│ [{instruction.bg_color.value}] {instruction.display_name}")
        print(f"├{'─' * 50}")
        
        # 태그 표시
        tags_str = " ".join([f"{t[0]} {t[1]}" for t in instruction.tags])
        print(f"│ 태그: {tags_str}")
        
        # 메시지
        print(f"│ 💬 {instruction.message}")
        
        # 시너지 힌트
        if instruction.synergy_hint:
            print(f"│ 🌉 시너지: {instruction.synergy_hint}")
        
        print(f"└{'─' * 50}\n")
    
    # 신규 고객
    print("📱 신규 고객 화면:")
    new_instruction = blackbox.get_new_customer_instruction()
    print(f"  {new_instruction.to_dict()}\n")
    
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: BlackBox Protocol                                 ║
║                          침묵의 지휘자 - 현장 직원용 마스킹 지침                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 원칙:
- 직원에게 고객의 개인정보(등급, 결제내역, 컴플레인 이력)를 직접 노출하지 않음
- 대신 '태그(Tag)'와 '색상(Color)'으로 행동 지침만 전달
- "왜?"를 묻지 않게 만드는 직관적 인터페이스

태그 시스템:
- 👑 VVIP: 최고 대우
- 🍷 서비스 프리패스: 추가 서비스 무조건 제공
- 🔇 매뉴얼 응대: 규정대로만
- ⏳ 원칙 준수: 추가 서비스 금지
- 💖 단골: 친근하게
- ⚡ 신속 처리: 대기 최소화
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

# 내부 모듈
import sys
sys.path.insert(0, '..')
from models.customer import CustomerProfile, CustomerArchetype


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배경색 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DisplayColor(str, Enum):
    """태블릿 표시 배경색"""
    GOLD = "GOLD"       # 황금색 - 후원자
    NAVY = "NAVY"       # 남색 - 권력자
    PINK = "PINK"       # 분홍색 - 찐팬
    GREY = "GREY"       # 회색 - 주의
    WHITE = "WHITE"     # 흰색 - 일반
    
    @property
    def hex_code(self) -> str:
        return {
            "GOLD": "#FFD700",
            "NAVY": "#000080",
            "PINK": "#FFB6C1",
            "GREY": "#808080",
            "WHITE": "#FFFFFF"
        }.get(self.value, "#FFFFFF")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 태그 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerTag:
    """고객 태그 정의"""
    
    # 후원자 태그
    VVIP = ("👑", "그룹 VVIP", "최고 대우")
    SERVICE_PASS = ("🍷", "서비스 프리패스", "추가 서비스 무료")
    PREMIUM_CARE = ("🙇", "프리미엄 의전", "사장님 지인급")
    
    # 권력자 태그
    FAST_TRACK = ("⚡", "신속 처리", "대기 0분 목표")
    NO_CHAT = ("🤫", "사담 금지", "결과만 보고")
    VIP_PROTOCOL = ("💼", "의전 필수", "프로답게")
    
    # 찐팬 태그
    REGULAR = ("💖", "단골", "친근하게")
    FREE_DRINK = ("☕", "음료 서비스", "간단한 서비스")
    TALK_OK = ("🗣️", "말 걸기", "대화 권장")
    
    # 주의 태그
    MANUAL_ONLY = ("🔇", "매뉴얼 응대", "규정대로만")
    NO_SERVICE = ("❌", "추가 서비스 금지", "원칙 준수")
    STICK_RULES = ("⏳", "원칙 준수", "정중하되 단호하게")
    
    # 일반 태그
    STANDARD = ("👤", "일반 응대", "표준 서비스")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 지침
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class FieldInstruction:
    """현장 직원용 지침"""
    display_name: str           # 화면에 표시할 이름
    bg_color: DisplayColor      # 배경색
    tags: List[tuple]           # 태그 목록 [(emoji, label, desc), ...]
    message: str                # 간단한 지침 메시지
    priority: int = 0           # 우선순위 (높을수록 중요)
    synergy_hint: str = ""      # 시너지 유도 힌트 (선택)
    alert_level: str = "normal" # normal, caution, urgent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "display_name": self.display_name,
            "bg_color": self.bg_color.value,
            "bg_color_hex": self.bg_color.hex_code,
            "tags": [
                {"emoji": t[0], "label": t[1], "desc": t[2]} 
                for t in self.tags
            ],
            "message": self.message,
            "priority": self.priority,
            "synergy_hint": self.synergy_hint,
            "alert_level": self.alert_level,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 프로토콜 메인 클래스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BlackBoxProtocol:
    """
    침묵의 지휘자
    
    고객 프로필을 받아 현장용 지침으로 변환
    - 고객의 '왜'를 숨기고 '어떻게'만 전달
    - 업종별 맞춤 메시지 생성
    """
    
    # 업종별 시너지 유도 메시지
    SYNERGY_HINTS = {
        "academy": {
            "to_restaurant": "'오늘 저녁은 [식당A]에서 할인 받으세요' 언급",
            "to_sports": "'운동도 병행하시면 집중력에 좋아요' 언급",
        },
        "restaurant": {
            "to_academy": "'아이 학원은 잘 다니고 있나요?' 안부",
            "to_sports": "'운동 후 식사하시면 더 건강해요' 언급",
        },
        "sports": {
            "to_academy": "'공부 스트레스는 운동으로 풀어야죠' 언급",
            "to_restaurant": "'운동 후 [식당A] 단백질 메뉴 추천' 언급",
        }
    }
    
    def get_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str,
        include_synergy: bool = True
    ) -> FieldInstruction:
        """
        고객 프로필 → 현장 지침 변환
        
        Args:
            customer: 고객 프로필
            biz_type: 현재 업종 (academy, restaurant, sports)
            include_synergy: 시너지 힌트 포함 여부
            
        Returns:
            FieldInstruction: 태블릿에 표시할 지침
        """
        archetype = customer.archetype
        
        # 아키타입별 지침 생성
        if archetype == CustomerArchetype.PATRON:
            instruction = self._patron_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.TYCOON:
            instruction = self._tycoon_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.FAN:
            instruction = self._fan_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.VAMPIRE:
            instruction = self._vampire_instruction(customer, biz_type)
        else:
            instruction = self._common_instruction(customer, biz_type)
        
        # 시너지 힌트 추가
        if include_synergy and customer.is_multi_biz_user:
            instruction.synergy_hint = self._get_synergy_hint(biz_type, customer)
        
        return instruction
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 아키타입별 지침 생성
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _patron_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """후원자 지침 - 신처럼 모셔라"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GOLD,
            tags=[
                CustomerTag.VVIP,
                CustomerTag.SERVICE_PASS,
                CustomerTag.PREMIUM_CARE,
            ],
            message="사장님 지인급 대우. 묻지도 따지지도 말고 서비스 제공.",
            priority=100,
            alert_level="urgent"
        )
    
    def _tycoon_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """권력자 지침 - 프로답게 신속하게"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.NAVY,
            tags=[
                CustomerTag.FAST_TRACK,
                CustomerTag.NO_CHAT,
                CustomerTag.VIP_PROTOCOL,
            ],
            message="대기시간 0분 목표. 잡담 없이 결과만 보고하세요.",
            priority=80,
            alert_level="caution"
        )
    
    def _fan_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """찐팬 지침 - 정서적 교류"""
        # 업종별 맞춤 메시지
        if biz_type == "restaurant":
            message = "'오늘도 오셨네요~' 친근하게 말 걸기. 간단한 음료 서비스."
        elif biz_type == "academy":
            message = "'아이가 요즘 많이 좋아졌어요' 칭찬 먼저."
        else:
            message = "단골 고객. 친근하게 안부 묻기."
        
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.PINK,
            tags=[
                CustomerTag.REGULAR,
                CustomerTag.FREE_DRINK,
                CustomerTag.TALK_OK,
            ],
            message=message,
            priority=50
        )
    
    def _vampire_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """흡혈귀 지침 - 정중히 거리두기"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GREY,
            tags=[
                CustomerTag.MANUAL_ONLY,
                CustomerTag.NO_SERVICE,
                CustomerTag.STICK_RULES,
            ],
            message="정중하되 단호하게 규정대로만 응대하세요. 추가 서비스 제공 금지.",
            priority=30,
            alert_level="caution"
        )
    
    def _common_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """일반 고객 지침"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                CustomerTag.STANDARD,
            ],
            message="표준 서비스로 응대하세요.",
            priority=10
        )
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 힌트
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _get_synergy_hint(
        self, 
        current_biz: str, 
        customer: CustomerProfile
    ) -> str:
        """
        시너지 유도 힌트 생성
        
        현재 업종에서 다른 업종으로 연결할 수 있는 멘트 제안
        """
        hints = self.SYNERGY_HINTS.get(current_biz, {})
        
        # 고객이 이용 중인 다른 사업장 확인
        other_biz = [
            biz for biz in customer.biz_records.keys() 
            if biz != current_biz
        ]
        
        if not other_biz:
            return ""
        
        # 첫 번째 다른 사업장으로 힌트 생성
        target = other_biz[0]
        hint_key = f"to_{target}"
        
        return hints.get(hint_key, "")
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 신규 고객 처리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_new_customer_instruction(self, phone: str = "") -> FieldInstruction:
        """신규/미등록 고객 지침"""
        return FieldInstruction(
            display_name="신규 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                ("🆕", "신규", "첫 방문 고객"),
            ],
            message="첫 방문 고객입니다. 친절히 안내하고, 연락처를 남겨주세요.",
            priority=20
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """블랙박스 프로토콜 데모"""
    print("=" * 70)
    print("  🔮 AUTUS-TRINITY BlackBox Protocol Demo")
    print("=" * 70)
    
    blackbox = BlackBoxProtocol()
    
    # 테스트 고객
    from models.customer import CustomerProfile, CustomerArchetype
    
    customers = [
        CustomerProfile(phone="01011112222", name="김후원"),
        CustomerProfile(phone="01022223333", name="이권력"),
        CustomerProfile(phone="01033334444", name="박충성"),
        CustomerProfile(phone="01044445555", name="최주의"),
        CustomerProfile(phone="01055556666", name="정일반"),
    ]
    
    # 유형 설정
    customers[0].archetype = CustomerArchetype.PATRON
    customers[0].biz_records = {"academy": {}, "restaurant": {}}
    customers[1].archetype = CustomerArchetype.TYCOON
    customers[2].archetype = CustomerArchetype.FAN
    customers[3].archetype = CustomerArchetype.VAMPIRE
    customers[4].archetype = CustomerArchetype.COMMON
    
    print("\n📱 현장 태블릿 화면 미리보기:\n")
    
    for customer in customers:
        instruction = blackbox.get_instruction(customer, "restaurant")
        
        print(f"┌{'─' * 50}")
        print(f"│ [{instruction.bg_color.value}] {instruction.display_name}")
        print(f"├{'─' * 50}")
        
        # 태그 표시
        tags_str = " ".join([f"{t[0]} {t[1]}" for t in instruction.tags])
        print(f"│ 태그: {tags_str}")
        
        # 메시지
        print(f"│ 💬 {instruction.message}")
        
        # 시너지 힌트
        if instruction.synergy_hint:
            print(f"│ 🌉 시너지: {instruction.synergy_hint}")
        
        print(f"└{'─' * 50}\n")
    
    # 신규 고객
    print("📱 신규 고객 화면:")
    new_instruction = blackbox.get_new_customer_instruction()
    print(f"  {new_instruction.to_dict()}\n")
    
    print("=" * 70)


if __name__ == "__main__":
    run_demo()










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                          AUTUS-TRINITY: BlackBox Protocol                                 ║
║                          침묵의 지휘자 - 현장 직원용 마스킹 지침                            ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

핵심 원칙:
- 직원에게 고객의 개인정보(등급, 결제내역, 컴플레인 이력)를 직접 노출하지 않음
- 대신 '태그(Tag)'와 '색상(Color)'으로 행동 지침만 전달
- "왜?"를 묻지 않게 만드는 직관적 인터페이스

태그 시스템:
- 👑 VVIP: 최고 대우
- 🍷 서비스 프리패스: 추가 서비스 무조건 제공
- 🔇 매뉴얼 응대: 규정대로만
- ⏳ 원칙 준수: 추가 서비스 금지
- 💖 단골: 친근하게
- ⚡ 신속 처리: 대기 최소화
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum

# 내부 모듈
import sys
sys.path.insert(0, '..')
from models.customer import CustomerProfile, CustomerArchetype


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 배경색 열거형
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DisplayColor(str, Enum):
    """태블릿 표시 배경색"""
    GOLD = "GOLD"       # 황금색 - 후원자
    NAVY = "NAVY"       # 남색 - 권력자
    PINK = "PINK"       # 분홍색 - 찐팬
    GREY = "GREY"       # 회색 - 주의
    WHITE = "WHITE"     # 흰색 - 일반
    
    @property
    def hex_code(self) -> str:
        return {
            "GOLD": "#FFD700",
            "NAVY": "#000080",
            "PINK": "#FFB6C1",
            "GREY": "#808080",
            "WHITE": "#FFFFFF"
        }.get(self.value, "#FFFFFF")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 태그 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerTag:
    """고객 태그 정의"""
    
    # 후원자 태그
    VVIP = ("👑", "그룹 VVIP", "최고 대우")
    SERVICE_PASS = ("🍷", "서비스 프리패스", "추가 서비스 무료")
    PREMIUM_CARE = ("🙇", "프리미엄 의전", "사장님 지인급")
    
    # 권력자 태그
    FAST_TRACK = ("⚡", "신속 처리", "대기 0분 목표")
    NO_CHAT = ("🤫", "사담 금지", "결과만 보고")
    VIP_PROTOCOL = ("💼", "의전 필수", "프로답게")
    
    # 찐팬 태그
    REGULAR = ("💖", "단골", "친근하게")
    FREE_DRINK = ("☕", "음료 서비스", "간단한 서비스")
    TALK_OK = ("🗣️", "말 걸기", "대화 권장")
    
    # 주의 태그
    MANUAL_ONLY = ("🔇", "매뉴얼 응대", "규정대로만")
    NO_SERVICE = ("❌", "추가 서비스 금지", "원칙 준수")
    STICK_RULES = ("⏳", "원칙 준수", "정중하되 단호하게")
    
    # 일반 태그
    STANDARD = ("👤", "일반 응대", "표준 서비스")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 지침
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class FieldInstruction:
    """현장 직원용 지침"""
    display_name: str           # 화면에 표시할 이름
    bg_color: DisplayColor      # 배경색
    tags: List[tuple]           # 태그 목록 [(emoji, label, desc), ...]
    message: str                # 간단한 지침 메시지
    priority: int = 0           # 우선순위 (높을수록 중요)
    synergy_hint: str = ""      # 시너지 유도 힌트 (선택)
    alert_level: str = "normal" # normal, caution, urgent
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "display_name": self.display_name,
            "bg_color": self.bg_color.value,
            "bg_color_hex": self.bg_color.hex_code,
            "tags": [
                {"emoji": t[0], "label": t[1], "desc": t[2]} 
                for t in self.tags
            ],
            "message": self.message,
            "priority": self.priority,
            "synergy_hint": self.synergy_hint,
            "alert_level": self.alert_level,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 블랙박스 프로토콜 메인 클래스
# ═══════════════════════════════════════════════════════════════════════════════════════════

class BlackBoxProtocol:
    """
    침묵의 지휘자
    
    고객 프로필을 받아 현장용 지침으로 변환
    - 고객의 '왜'를 숨기고 '어떻게'만 전달
    - 업종별 맞춤 메시지 생성
    """
    
    # 업종별 시너지 유도 메시지
    SYNERGY_HINTS = {
        "academy": {
            "to_restaurant": "'오늘 저녁은 [식당A]에서 할인 받으세요' 언급",
            "to_sports": "'운동도 병행하시면 집중력에 좋아요' 언급",
        },
        "restaurant": {
            "to_academy": "'아이 학원은 잘 다니고 있나요?' 안부",
            "to_sports": "'운동 후 식사하시면 더 건강해요' 언급",
        },
        "sports": {
            "to_academy": "'공부 스트레스는 운동으로 풀어야죠' 언급",
            "to_restaurant": "'운동 후 [식당A] 단백질 메뉴 추천' 언급",
        }
    }
    
    def get_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str,
        include_synergy: bool = True
    ) -> FieldInstruction:
        """
        고객 프로필 → 현장 지침 변환
        
        Args:
            customer: 고객 프로필
            biz_type: 현재 업종 (academy, restaurant, sports)
            include_synergy: 시너지 힌트 포함 여부
            
        Returns:
            FieldInstruction: 태블릿에 표시할 지침
        """
        archetype = customer.archetype
        
        # 아키타입별 지침 생성
        if archetype == CustomerArchetype.PATRON:
            instruction = self._patron_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.TYCOON:
            instruction = self._tycoon_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.FAN:
            instruction = self._fan_instruction(customer, biz_type)
        elif archetype == CustomerArchetype.VAMPIRE:
            instruction = self._vampire_instruction(customer, biz_type)
        else:
            instruction = self._common_instruction(customer, biz_type)
        
        # 시너지 힌트 추가
        if include_synergy and customer.is_multi_biz_user:
            instruction.synergy_hint = self._get_synergy_hint(biz_type, customer)
        
        return instruction
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 아키타입별 지침 생성
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _patron_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """후원자 지침 - 신처럼 모셔라"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GOLD,
            tags=[
                CustomerTag.VVIP,
                CustomerTag.SERVICE_PASS,
                CustomerTag.PREMIUM_CARE,
            ],
            message="사장님 지인급 대우. 묻지도 따지지도 말고 서비스 제공.",
            priority=100,
            alert_level="urgent"
        )
    
    def _tycoon_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """권력자 지침 - 프로답게 신속하게"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.NAVY,
            tags=[
                CustomerTag.FAST_TRACK,
                CustomerTag.NO_CHAT,
                CustomerTag.VIP_PROTOCOL,
            ],
            message="대기시간 0분 목표. 잡담 없이 결과만 보고하세요.",
            priority=80,
            alert_level="caution"
        )
    
    def _fan_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """찐팬 지침 - 정서적 교류"""
        # 업종별 맞춤 메시지
        if biz_type == "restaurant":
            message = "'오늘도 오셨네요~' 친근하게 말 걸기. 간단한 음료 서비스."
        elif biz_type == "academy":
            message = "'아이가 요즘 많이 좋아졌어요' 칭찬 먼저."
        else:
            message = "단골 고객. 친근하게 안부 묻기."
        
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.PINK,
            tags=[
                CustomerTag.REGULAR,
                CustomerTag.FREE_DRINK,
                CustomerTag.TALK_OK,
            ],
            message=message,
            priority=50
        )
    
    def _vampire_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """흡혈귀 지침 - 정중히 거리두기"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.GREY,
            tags=[
                CustomerTag.MANUAL_ONLY,
                CustomerTag.NO_SERVICE,
                CustomerTag.STICK_RULES,
            ],
            message="정중하되 단호하게 규정대로만 응대하세요. 추가 서비스 제공 금지.",
            priority=30,
            alert_level="caution"
        )
    
    def _common_instruction(
        self, 
        customer: CustomerProfile, 
        biz_type: str
    ) -> FieldInstruction:
        """일반 고객 지침"""
        return FieldInstruction(
            display_name=f"{customer.name} 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                CustomerTag.STANDARD,
            ],
            message="표준 서비스로 응대하세요.",
            priority=10
        )
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 시너지 힌트
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def _get_synergy_hint(
        self, 
        current_biz: str, 
        customer: CustomerProfile
    ) -> str:
        """
        시너지 유도 힌트 생성
        
        현재 업종에서 다른 업종으로 연결할 수 있는 멘트 제안
        """
        hints = self.SYNERGY_HINTS.get(current_biz, {})
        
        # 고객이 이용 중인 다른 사업장 확인
        other_biz = [
            biz for biz in customer.biz_records.keys() 
            if biz != current_biz
        ]
        
        if not other_biz:
            return ""
        
        # 첫 번째 다른 사업장으로 힌트 생성
        target = other_biz[0]
        hint_key = f"to_{target}"
        
        return hints.get(hint_key, "")
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # 신규 고객 처리
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def get_new_customer_instruction(self, phone: str = "") -> FieldInstruction:
        """신규/미등록 고객 지침"""
        return FieldInstruction(
            display_name="신규 고객님",
            bg_color=DisplayColor.WHITE,
            tags=[
                ("🆕", "신규", "첫 방문 고객"),
            ],
            message="첫 방문 고객입니다. 친절히 안내하고, 연락처를 남겨주세요.",
            priority=20
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 / 데모
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_demo():
    """블랙박스 프로토콜 데모"""
    print("=" * 70)
    print("  🔮 AUTUS-TRINITY BlackBox Protocol Demo")
    print("=" * 70)
    
    blackbox = BlackBoxProtocol()
    
    # 테스트 고객
    from models.customer import CustomerProfile, CustomerArchetype
    
    customers = [
        CustomerProfile(phone="01011112222", name="김후원"),
        CustomerProfile(phone="01022223333", name="이권력"),
        CustomerProfile(phone="01033334444", name="박충성"),
        CustomerProfile(phone="01044445555", name="최주의"),
        CustomerProfile(phone="01055556666", name="정일반"),
    ]
    
    # 유형 설정
    customers[0].archetype = CustomerArchetype.PATRON
    customers[0].biz_records = {"academy": {}, "restaurant": {}}
    customers[1].archetype = CustomerArchetype.TYCOON
    customers[2].archetype = CustomerArchetype.FAN
    customers[3].archetype = CustomerArchetype.VAMPIRE
    customers[4].archetype = CustomerArchetype.COMMON
    
    print("\n📱 현장 태블릿 화면 미리보기:\n")
    
    for customer in customers:
        instruction = blackbox.get_instruction(customer, "restaurant")
        
        print(f"┌{'─' * 50}")
        print(f"│ [{instruction.bg_color.value}] {instruction.display_name}")
        print(f"├{'─' * 50}")
        
        # 태그 표시
        tags_str = " ".join([f"{t[0]} {t[1]}" for t in instruction.tags])
        print(f"│ 태그: {tags_str}")
        
        # 메시지
        print(f"│ 💬 {instruction.message}")
        
        # 시너지 힌트
        if instruction.synergy_hint:
            print(f"│ 🌉 시너지: {instruction.synergy_hint}")
        
        print(f"└{'─' * 50}\n")
    
    # 신규 고객
    print("📱 신규 고객 화면:")
    new_instruction = blackbox.get_new_customer_instruction()
    print(f"  {new_instruction.to_dict()}\n")
    
    print("=" * 70)


if __name__ == "__main__":
    run_demo()


























