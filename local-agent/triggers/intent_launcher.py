"""
AUTUS Local Agent - Intent Launcher
====================================

OS Intent를 사용한 클라이언트 사이드 자동화

핵심 원칙:
- 서버 경유 없음 (법적 면책)
- 유저 OS 기능 직접 호출
- "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"

지원 플랫폼:
- Android: Intent URI 스키마
- iOS: URL 스키마 (제한적)
- Desktop: 시스템 명령어
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import quote
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, ActionType, AutoAction


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

class Platform(Enum):
    """플랫폼 타입"""
    ANDROID = "android"
    IOS = "ios"
    DESKTOP = "desktop"


# Android Intent URI 템플릿
ANDROID_INTENTS = {
    # 카카오톡 메시지
    "kakao_chat": "intent://send?text={message}#Intent;package=com.kakao.talk;end",
    "kakao_friend": "intent://open?chatType=friend&phoneNumber={phone}#Intent;package=com.kakao.talk;end",
    
    # SMS
    "sms": "sms:{phone}?body={message}",
    "sms_multi": "smsto:{phone}?body={message}",
    
    # 전화
    "call": "tel:{phone}",
    "call_direct": "intent://call/{phone}#Intent;scheme=tel;end",
    
    # 이메일
    "email": "mailto:{email}?subject={subject}&body={message}",
    
    # 캘린더
    "calendar": "intent://event?title={title}&description={desc}#Intent;package=com.google.android.calendar;end",
}

# iOS URL 스키마 (제한적)
IOS_SCHEMES = {
    "sms": "sms:{phone}&body={message}",
    "call": "tel:{phone}",
    "email": "mailto:{email}?subject={subject}&body={message}",
    "kakao": "kakaolink://",  # 카카오링크 API 필요
}


# ═══════════════════════════════════════════════════════════════════════════
#                              MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    # 학원 특화 메시지
    "payment_reminder": """안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {due_date}
금액: {amount}원
감사합니다.""",

    "attendance_alert": """안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.""",

    "score_up": """안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prev_score}점 → 현재: {curr_score}점
계속 응원해주세요!""",

    "score_down": """안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prev_score}점 → 현재: {curr_score}점
상담이 필요하시면 연락 주세요.""",

    "check_in": """안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}""",

    # 일반 메시지
    "thank_you": """안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.""",

    "birthday": """안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.""",
}


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

class IntentLauncher:
    """
    클라이언트 사이드 Intent 실행기
    
    서버 경유 없이 OS 기능 직접 호출
    """
    
    def __init__(self, platform: Platform = Platform.ANDROID):
        self.platform = platform
        
        # 실행 로그
        self.execution_log = []
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         URI GENERATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_sms_uri(
        self,
        phone: str,
        message: str,
    ) -> str:
        """SMS Intent URI 생성"""
        encoded_msg = quote(message)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if self.platform == Platform.ANDROID:
            return f"sms:{clean_phone}?body={encoded_msg}"
        elif self.platform == Platform.IOS:
            return f"sms:{clean_phone}&body={encoded_msg}"
        else:
            return f"sms:{clean_phone}"
    
    def generate_call_uri(self, phone: str) -> str:
        """전화 Intent URI 생성"""
        clean_phone = ''.join(filter(str.isdigit, phone))
        return f"tel:{clean_phone}"
    
    def generate_kakao_uri(self, message: str) -> str:
        """카카오톡 Intent URI 생성 (Android only)"""
        if self.platform != Platform.ANDROID:
            return ""
        
        encoded_msg = quote(message)
        return f"intent://send?text={encoded_msg}#Intent;package=com.kakao.talk;end"
    
    def generate_email_uri(
        self,
        email: str,
        subject: str,
        body: str,
    ) -> str:
        """이메일 Intent URI 생성"""
        encoded_subject = quote(subject)
        encoded_body = quote(body)
        return f"mailto:{email}?subject={encoded_subject}&body={encoded_body}"
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         MESSAGE FORMATTING
    # ═══════════════════════════════════════════════════════════════════════
    
    def format_message(
        self,
        template_key: str,
        **kwargs,
    ) -> str:
        """메시지 템플릿 포맷팅"""
        template = MESSAGE_TEMPLATES.get(template_key, "{message}")
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            # 누락된 키는 빈 문자열로 대체
            for key in ["student", "name", "amount", "due_date", 
                       "prev_score", "curr_score", "time", "message"]:
                kwargs.setdefault(key, "")
            return template.format(**kwargs)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ACTION EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def prepare_action(
        self,
        node: Node,
        action_type: ActionType,
        template_key: str,
        extra_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        액션 준비 (URI 생성)
        
        실제 실행은 클라이언트(React Native/Electron)에서 수행
        """
        params = {
            "name": node.name,
            "student": node.student_name or node.name,
            "phone": node.phone,
            **(extra_params or {}),
        }
        
        message = self.format_message(template_key, **params)
        
        if action_type == ActionType.SMS:
            uri = self.generate_sms_uri(node.phone, message)
        elif action_type == ActionType.CALL:
            uri = self.generate_call_uri(node.phone)
        elif action_type == ActionType.KAKAO:
            uri = self.generate_kakao_uri(message)
        elif action_type == ActionType.EMAIL:
            uri = self.generate_email_uri(
                params.get("email", ""),
                params.get("subject", "AUTUS 알림"),
                message,
            )
        else:
            uri = ""
        
        return {
            "action_type": action_type.value,
            "uri": uri,
            "message": message,
            "node_id": node.id,
            "node_name": node.name,
            "platform": self.platform.value,
        }
    
    def prepare_batch(
        self,
        actions: list,
    ) -> list:
        """배치 액션 준비"""
        prepared = []
        
        for action in actions:
            result = self.prepare_action(
                node=action["node"],
                action_type=action["action_type"],
                template_key=action["template_key"],
                extra_params=action.get("params"),
            )
            prepared.append(result)
        
        return prepared
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         REACT NATIVE BRIDGE
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_react_native_code(self) -> str:
        """React Native 실행 코드 생성"""
        return """
// React Native에서 Intent 실행
import { Linking, Platform } from 'react-native';

export async function executeIntent(uri: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(uri);
    
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      console.warn('Intent not supported:', uri);
      return false;
    }
  } catch (error) {
    console.error('Intent execution failed:', error);
    return false;
  }
}

// 사용 예시
// executeIntent('sms:01012345678?body=안녕하세요');
// executeIntent('tel:01012345678');
// executeIntent('intent://send?text=테스트#Intent;package=com.kakao.talk;end');
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              LEGAL NOTICE
# ═══════════════════════════════════════════════════════════════════════════

LEGAL_DISCLAIMER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║  - 스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, ActionType, NodeTier, DataSource
    
    # 테스트 노드
    test_node = Node(
        id="1",
        name="김철수",
        phone="010-1234-5678",
        student_name="김영희",
        money_total=500000,
        synergy_score=80,
        entropy_score=10,
        sq_score=75.0,
        tier=NodeTier.GOLD,
        source=DataSource.SMS,
    )
    
    # Intent Launcher 생성
    launcher = IntentLauncher(platform=Platform.ANDROID)
    
    print("=" * 60)
    print("AUTUS Intent Launcher Test")
    print("=" * 60)
    
    # SMS 액션
    sms_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.SMS,
        template_key="payment_reminder",
        extra_params={
            "due_date": "12월 20일",
            "amount": "300,000",
        },
    )
    
    print("\n[SMS Action]")
    print(f"URI: {sms_action['uri'][:80]}...")
    print(f"Message:\n{sms_action['message']}")
    
    # 카카오톡 액션
    kakao_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.KAKAO,
        template_key="score_up",
        extra_params={
            "prev_score": "75",
            "curr_score": "85",
        },
    )
    
    print("\n[KakaoTalk Action]")
    print(f"URI: {kakao_action['uri'][:80]}...")
    
    # 전화 액션
    call_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.CALL,
        template_key="",
    )
    
    print("\n[Call Action]")
    print(f"URI: {call_action['uri']}")
    
    print("\n" + "=" * 60)
    print(LEGAL_DISCLAIMER)










"""
AUTUS Local Agent - Intent Launcher
====================================

OS Intent를 사용한 클라이언트 사이드 자동화

핵심 원칙:
- 서버 경유 없음 (법적 면책)
- 유저 OS 기능 직접 호출
- "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"

지원 플랫폼:
- Android: Intent URI 스키마
- iOS: URL 스키마 (제한적)
- Desktop: 시스템 명령어
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import quote
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, ActionType, AutoAction


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

class Platform(Enum):
    """플랫폼 타입"""
    ANDROID = "android"
    IOS = "ios"
    DESKTOP = "desktop"


# Android Intent URI 템플릿
ANDROID_INTENTS = {
    # 카카오톡 메시지
    "kakao_chat": "intent://send?text={message}#Intent;package=com.kakao.talk;end",
    "kakao_friend": "intent://open?chatType=friend&phoneNumber={phone}#Intent;package=com.kakao.talk;end",
    
    # SMS
    "sms": "sms:{phone}?body={message}",
    "sms_multi": "smsto:{phone}?body={message}",
    
    # 전화
    "call": "tel:{phone}",
    "call_direct": "intent://call/{phone}#Intent;scheme=tel;end",
    
    # 이메일
    "email": "mailto:{email}?subject={subject}&body={message}",
    
    # 캘린더
    "calendar": "intent://event?title={title}&description={desc}#Intent;package=com.google.android.calendar;end",
}

# iOS URL 스키마 (제한적)
IOS_SCHEMES = {
    "sms": "sms:{phone}&body={message}",
    "call": "tel:{phone}",
    "email": "mailto:{email}?subject={subject}&body={message}",
    "kakao": "kakaolink://",  # 카카오링크 API 필요
}


# ═══════════════════════════════════════════════════════════════════════════
#                              MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    # 학원 특화 메시지
    "payment_reminder": """안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {due_date}
금액: {amount}원
감사합니다.""",

    "attendance_alert": """안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.""",

    "score_up": """안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prev_score}점 → 현재: {curr_score}점
계속 응원해주세요!""",

    "score_down": """안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prev_score}점 → 현재: {curr_score}점
상담이 필요하시면 연락 주세요.""",

    "check_in": """안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}""",

    # 일반 메시지
    "thank_you": """안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.""",

    "birthday": """안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.""",
}


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

class IntentLauncher:
    """
    클라이언트 사이드 Intent 실행기
    
    서버 경유 없이 OS 기능 직접 호출
    """
    
    def __init__(self, platform: Platform = Platform.ANDROID):
        self.platform = platform
        
        # 실행 로그
        self.execution_log = []
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         URI GENERATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_sms_uri(
        self,
        phone: str,
        message: str,
    ) -> str:
        """SMS Intent URI 생성"""
        encoded_msg = quote(message)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if self.platform == Platform.ANDROID:
            return f"sms:{clean_phone}?body={encoded_msg}"
        elif self.platform == Platform.IOS:
            return f"sms:{clean_phone}&body={encoded_msg}"
        else:
            return f"sms:{clean_phone}"
    
    def generate_call_uri(self, phone: str) -> str:
        """전화 Intent URI 생성"""
        clean_phone = ''.join(filter(str.isdigit, phone))
        return f"tel:{clean_phone}"
    
    def generate_kakao_uri(self, message: str) -> str:
        """카카오톡 Intent URI 생성 (Android only)"""
        if self.platform != Platform.ANDROID:
            return ""
        
        encoded_msg = quote(message)
        return f"intent://send?text={encoded_msg}#Intent;package=com.kakao.talk;end"
    
    def generate_email_uri(
        self,
        email: str,
        subject: str,
        body: str,
    ) -> str:
        """이메일 Intent URI 생성"""
        encoded_subject = quote(subject)
        encoded_body = quote(body)
        return f"mailto:{email}?subject={encoded_subject}&body={encoded_body}"
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         MESSAGE FORMATTING
    # ═══════════════════════════════════════════════════════════════════════
    
    def format_message(
        self,
        template_key: str,
        **kwargs,
    ) -> str:
        """메시지 템플릿 포맷팅"""
        template = MESSAGE_TEMPLATES.get(template_key, "{message}")
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            # 누락된 키는 빈 문자열로 대체
            for key in ["student", "name", "amount", "due_date", 
                       "prev_score", "curr_score", "time", "message"]:
                kwargs.setdefault(key, "")
            return template.format(**kwargs)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ACTION EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def prepare_action(
        self,
        node: Node,
        action_type: ActionType,
        template_key: str,
        extra_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        액션 준비 (URI 생성)
        
        실제 실행은 클라이언트(React Native/Electron)에서 수행
        """
        params = {
            "name": node.name,
            "student": node.student_name or node.name,
            "phone": node.phone,
            **(extra_params or {}),
        }
        
        message = self.format_message(template_key, **params)
        
        if action_type == ActionType.SMS:
            uri = self.generate_sms_uri(node.phone, message)
        elif action_type == ActionType.CALL:
            uri = self.generate_call_uri(node.phone)
        elif action_type == ActionType.KAKAO:
            uri = self.generate_kakao_uri(message)
        elif action_type == ActionType.EMAIL:
            uri = self.generate_email_uri(
                params.get("email", ""),
                params.get("subject", "AUTUS 알림"),
                message,
            )
        else:
            uri = ""
        
        return {
            "action_type": action_type.value,
            "uri": uri,
            "message": message,
            "node_id": node.id,
            "node_name": node.name,
            "platform": self.platform.value,
        }
    
    def prepare_batch(
        self,
        actions: list,
    ) -> list:
        """배치 액션 준비"""
        prepared = []
        
        for action in actions:
            result = self.prepare_action(
                node=action["node"],
                action_type=action["action_type"],
                template_key=action["template_key"],
                extra_params=action.get("params"),
            )
            prepared.append(result)
        
        return prepared
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         REACT NATIVE BRIDGE
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_react_native_code(self) -> str:
        """React Native 실행 코드 생성"""
        return """
// React Native에서 Intent 실행
import { Linking, Platform } from 'react-native';

export async function executeIntent(uri: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(uri);
    
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      console.warn('Intent not supported:', uri);
      return false;
    }
  } catch (error) {
    console.error('Intent execution failed:', error);
    return false;
  }
}

// 사용 예시
// executeIntent('sms:01012345678?body=안녕하세요');
// executeIntent('tel:01012345678');
// executeIntent('intent://send?text=테스트#Intent;package=com.kakao.talk;end');
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              LEGAL NOTICE
# ═══════════════════════════════════════════════════════════════════════════

LEGAL_DISCLAIMER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║  - 스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, ActionType, NodeTier, DataSource
    
    # 테스트 노드
    test_node = Node(
        id="1",
        name="김철수",
        phone="010-1234-5678",
        student_name="김영희",
        money_total=500000,
        synergy_score=80,
        entropy_score=10,
        sq_score=75.0,
        tier=NodeTier.GOLD,
        source=DataSource.SMS,
    )
    
    # Intent Launcher 생성
    launcher = IntentLauncher(platform=Platform.ANDROID)
    
    print("=" * 60)
    print("AUTUS Intent Launcher Test")
    print("=" * 60)
    
    # SMS 액션
    sms_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.SMS,
        template_key="payment_reminder",
        extra_params={
            "due_date": "12월 20일",
            "amount": "300,000",
        },
    )
    
    print("\n[SMS Action]")
    print(f"URI: {sms_action['uri'][:80]}...")
    print(f"Message:\n{sms_action['message']}")
    
    # 카카오톡 액션
    kakao_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.KAKAO,
        template_key="score_up",
        extra_params={
            "prev_score": "75",
            "curr_score": "85",
        },
    )
    
    print("\n[KakaoTalk Action]")
    print(f"URI: {kakao_action['uri'][:80]}...")
    
    # 전화 액션
    call_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.CALL,
        template_key="",
    )
    
    print("\n[Call Action]")
    print(f"URI: {call_action['uri']}")
    
    print("\n" + "=" * 60)
    print(LEGAL_DISCLAIMER)










"""
AUTUS Local Agent - Intent Launcher
====================================

OS Intent를 사용한 클라이언트 사이드 자동화

핵심 원칙:
- 서버 경유 없음 (법적 면책)
- 유저 OS 기능 직접 호출
- "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"

지원 플랫폼:
- Android: Intent URI 스키마
- iOS: URL 스키마 (제한적)
- Desktop: 시스템 명령어
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import quote
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, ActionType, AutoAction


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

class Platform(Enum):
    """플랫폼 타입"""
    ANDROID = "android"
    IOS = "ios"
    DESKTOP = "desktop"


# Android Intent URI 템플릿
ANDROID_INTENTS = {
    # 카카오톡 메시지
    "kakao_chat": "intent://send?text={message}#Intent;package=com.kakao.talk;end",
    "kakao_friend": "intent://open?chatType=friend&phoneNumber={phone}#Intent;package=com.kakao.talk;end",
    
    # SMS
    "sms": "sms:{phone}?body={message}",
    "sms_multi": "smsto:{phone}?body={message}",
    
    # 전화
    "call": "tel:{phone}",
    "call_direct": "intent://call/{phone}#Intent;scheme=tel;end",
    
    # 이메일
    "email": "mailto:{email}?subject={subject}&body={message}",
    
    # 캘린더
    "calendar": "intent://event?title={title}&description={desc}#Intent;package=com.google.android.calendar;end",
}

# iOS URL 스키마 (제한적)
IOS_SCHEMES = {
    "sms": "sms:{phone}&body={message}",
    "call": "tel:{phone}",
    "email": "mailto:{email}?subject={subject}&body={message}",
    "kakao": "kakaolink://",  # 카카오링크 API 필요
}


# ═══════════════════════════════════════════════════════════════════════════
#                              MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    # 학원 특화 메시지
    "payment_reminder": """안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {due_date}
금액: {amount}원
감사합니다.""",

    "attendance_alert": """안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.""",

    "score_up": """안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prev_score}점 → 현재: {curr_score}점
계속 응원해주세요!""",

    "score_down": """안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prev_score}점 → 현재: {curr_score}점
상담이 필요하시면 연락 주세요.""",

    "check_in": """안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}""",

    # 일반 메시지
    "thank_you": """안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.""",

    "birthday": """안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.""",
}


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

class IntentLauncher:
    """
    클라이언트 사이드 Intent 실행기
    
    서버 경유 없이 OS 기능 직접 호출
    """
    
    def __init__(self, platform: Platform = Platform.ANDROID):
        self.platform = platform
        
        # 실행 로그
        self.execution_log = []
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         URI GENERATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_sms_uri(
        self,
        phone: str,
        message: str,
    ) -> str:
        """SMS Intent URI 생성"""
        encoded_msg = quote(message)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if self.platform == Platform.ANDROID:
            return f"sms:{clean_phone}?body={encoded_msg}"
        elif self.platform == Platform.IOS:
            return f"sms:{clean_phone}&body={encoded_msg}"
        else:
            return f"sms:{clean_phone}"
    
    def generate_call_uri(self, phone: str) -> str:
        """전화 Intent URI 생성"""
        clean_phone = ''.join(filter(str.isdigit, phone))
        return f"tel:{clean_phone}"
    
    def generate_kakao_uri(self, message: str) -> str:
        """카카오톡 Intent URI 생성 (Android only)"""
        if self.platform != Platform.ANDROID:
            return ""
        
        encoded_msg = quote(message)
        return f"intent://send?text={encoded_msg}#Intent;package=com.kakao.talk;end"
    
    def generate_email_uri(
        self,
        email: str,
        subject: str,
        body: str,
    ) -> str:
        """이메일 Intent URI 생성"""
        encoded_subject = quote(subject)
        encoded_body = quote(body)
        return f"mailto:{email}?subject={encoded_subject}&body={encoded_body}"
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         MESSAGE FORMATTING
    # ═══════════════════════════════════════════════════════════════════════
    
    def format_message(
        self,
        template_key: str,
        **kwargs,
    ) -> str:
        """메시지 템플릿 포맷팅"""
        template = MESSAGE_TEMPLATES.get(template_key, "{message}")
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            # 누락된 키는 빈 문자열로 대체
            for key in ["student", "name", "amount", "due_date", 
                       "prev_score", "curr_score", "time", "message"]:
                kwargs.setdefault(key, "")
            return template.format(**kwargs)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ACTION EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def prepare_action(
        self,
        node: Node,
        action_type: ActionType,
        template_key: str,
        extra_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        액션 준비 (URI 생성)
        
        실제 실행은 클라이언트(React Native/Electron)에서 수행
        """
        params = {
            "name": node.name,
            "student": node.student_name or node.name,
            "phone": node.phone,
            **(extra_params or {}),
        }
        
        message = self.format_message(template_key, **params)
        
        if action_type == ActionType.SMS:
            uri = self.generate_sms_uri(node.phone, message)
        elif action_type == ActionType.CALL:
            uri = self.generate_call_uri(node.phone)
        elif action_type == ActionType.KAKAO:
            uri = self.generate_kakao_uri(message)
        elif action_type == ActionType.EMAIL:
            uri = self.generate_email_uri(
                params.get("email", ""),
                params.get("subject", "AUTUS 알림"),
                message,
            )
        else:
            uri = ""
        
        return {
            "action_type": action_type.value,
            "uri": uri,
            "message": message,
            "node_id": node.id,
            "node_name": node.name,
            "platform": self.platform.value,
        }
    
    def prepare_batch(
        self,
        actions: list,
    ) -> list:
        """배치 액션 준비"""
        prepared = []
        
        for action in actions:
            result = self.prepare_action(
                node=action["node"],
                action_type=action["action_type"],
                template_key=action["template_key"],
                extra_params=action.get("params"),
            )
            prepared.append(result)
        
        return prepared
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         REACT NATIVE BRIDGE
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_react_native_code(self) -> str:
        """React Native 실행 코드 생성"""
        return """
// React Native에서 Intent 실행
import { Linking, Platform } from 'react-native';

export async function executeIntent(uri: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(uri);
    
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      console.warn('Intent not supported:', uri);
      return false;
    }
  } catch (error) {
    console.error('Intent execution failed:', error);
    return false;
  }
}

// 사용 예시
// executeIntent('sms:01012345678?body=안녕하세요');
// executeIntent('tel:01012345678');
// executeIntent('intent://send?text=테스트#Intent;package=com.kakao.talk;end');
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              LEGAL NOTICE
# ═══════════════════════════════════════════════════════════════════════════

LEGAL_DISCLAIMER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║  - 스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, ActionType, NodeTier, DataSource
    
    # 테스트 노드
    test_node = Node(
        id="1",
        name="김철수",
        phone="010-1234-5678",
        student_name="김영희",
        money_total=500000,
        synergy_score=80,
        entropy_score=10,
        sq_score=75.0,
        tier=NodeTier.GOLD,
        source=DataSource.SMS,
    )
    
    # Intent Launcher 생성
    launcher = IntentLauncher(platform=Platform.ANDROID)
    
    print("=" * 60)
    print("AUTUS Intent Launcher Test")
    print("=" * 60)
    
    # SMS 액션
    sms_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.SMS,
        template_key="payment_reminder",
        extra_params={
            "due_date": "12월 20일",
            "amount": "300,000",
        },
    )
    
    print("\n[SMS Action]")
    print(f"URI: {sms_action['uri'][:80]}...")
    print(f"Message:\n{sms_action['message']}")
    
    # 카카오톡 액션
    kakao_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.KAKAO,
        template_key="score_up",
        extra_params={
            "prev_score": "75",
            "curr_score": "85",
        },
    )
    
    print("\n[KakaoTalk Action]")
    print(f"URI: {kakao_action['uri'][:80]}...")
    
    # 전화 액션
    call_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.CALL,
        template_key="",
    )
    
    print("\n[Call Action]")
    print(f"URI: {call_action['uri']}")
    
    print("\n" + "=" * 60)
    print(LEGAL_DISCLAIMER)










"""
AUTUS Local Agent - Intent Launcher
====================================

OS Intent를 사용한 클라이언트 사이드 자동화

핵심 원칙:
- 서버 경유 없음 (법적 면책)
- 유저 OS 기능 직접 호출
- "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"

지원 플랫폼:
- Android: Intent URI 스키마
- iOS: URL 스키마 (제한적)
- Desktop: 시스템 명령어
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import quote
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, ActionType, AutoAction


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

class Platform(Enum):
    """플랫폼 타입"""
    ANDROID = "android"
    IOS = "ios"
    DESKTOP = "desktop"


# Android Intent URI 템플릿
ANDROID_INTENTS = {
    # 카카오톡 메시지
    "kakao_chat": "intent://send?text={message}#Intent;package=com.kakao.talk;end",
    "kakao_friend": "intent://open?chatType=friend&phoneNumber={phone}#Intent;package=com.kakao.talk;end",
    
    # SMS
    "sms": "sms:{phone}?body={message}",
    "sms_multi": "smsto:{phone}?body={message}",
    
    # 전화
    "call": "tel:{phone}",
    "call_direct": "intent://call/{phone}#Intent;scheme=tel;end",
    
    # 이메일
    "email": "mailto:{email}?subject={subject}&body={message}",
    
    # 캘린더
    "calendar": "intent://event?title={title}&description={desc}#Intent;package=com.google.android.calendar;end",
}

# iOS URL 스키마 (제한적)
IOS_SCHEMES = {
    "sms": "sms:{phone}&body={message}",
    "call": "tel:{phone}",
    "email": "mailto:{email}?subject={subject}&body={message}",
    "kakao": "kakaolink://",  # 카카오링크 API 필요
}


# ═══════════════════════════════════════════════════════════════════════════
#                              MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    # 학원 특화 메시지
    "payment_reminder": """안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {due_date}
금액: {amount}원
감사합니다.""",

    "attendance_alert": """안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.""",

    "score_up": """안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prev_score}점 → 현재: {curr_score}점
계속 응원해주세요!""",

    "score_down": """안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prev_score}점 → 현재: {curr_score}점
상담이 필요하시면 연락 주세요.""",

    "check_in": """안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}""",

    # 일반 메시지
    "thank_you": """안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.""",

    "birthday": """안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.""",
}


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

class IntentLauncher:
    """
    클라이언트 사이드 Intent 실행기
    
    서버 경유 없이 OS 기능 직접 호출
    """
    
    def __init__(self, platform: Platform = Platform.ANDROID):
        self.platform = platform
        
        # 실행 로그
        self.execution_log = []
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         URI GENERATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_sms_uri(
        self,
        phone: str,
        message: str,
    ) -> str:
        """SMS Intent URI 생성"""
        encoded_msg = quote(message)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if self.platform == Platform.ANDROID:
            return f"sms:{clean_phone}?body={encoded_msg}"
        elif self.platform == Platform.IOS:
            return f"sms:{clean_phone}&body={encoded_msg}"
        else:
            return f"sms:{clean_phone}"
    
    def generate_call_uri(self, phone: str) -> str:
        """전화 Intent URI 생성"""
        clean_phone = ''.join(filter(str.isdigit, phone))
        return f"tel:{clean_phone}"
    
    def generate_kakao_uri(self, message: str) -> str:
        """카카오톡 Intent URI 생성 (Android only)"""
        if self.platform != Platform.ANDROID:
            return ""
        
        encoded_msg = quote(message)
        return f"intent://send?text={encoded_msg}#Intent;package=com.kakao.talk;end"
    
    def generate_email_uri(
        self,
        email: str,
        subject: str,
        body: str,
    ) -> str:
        """이메일 Intent URI 생성"""
        encoded_subject = quote(subject)
        encoded_body = quote(body)
        return f"mailto:{email}?subject={encoded_subject}&body={encoded_body}"
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         MESSAGE FORMATTING
    # ═══════════════════════════════════════════════════════════════════════
    
    def format_message(
        self,
        template_key: str,
        **kwargs,
    ) -> str:
        """메시지 템플릿 포맷팅"""
        template = MESSAGE_TEMPLATES.get(template_key, "{message}")
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            # 누락된 키는 빈 문자열로 대체
            for key in ["student", "name", "amount", "due_date", 
                       "prev_score", "curr_score", "time", "message"]:
                kwargs.setdefault(key, "")
            return template.format(**kwargs)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ACTION EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def prepare_action(
        self,
        node: Node,
        action_type: ActionType,
        template_key: str,
        extra_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        액션 준비 (URI 생성)
        
        실제 실행은 클라이언트(React Native/Electron)에서 수행
        """
        params = {
            "name": node.name,
            "student": node.student_name or node.name,
            "phone": node.phone,
            **(extra_params or {}),
        }
        
        message = self.format_message(template_key, **params)
        
        if action_type == ActionType.SMS:
            uri = self.generate_sms_uri(node.phone, message)
        elif action_type == ActionType.CALL:
            uri = self.generate_call_uri(node.phone)
        elif action_type == ActionType.KAKAO:
            uri = self.generate_kakao_uri(message)
        elif action_type == ActionType.EMAIL:
            uri = self.generate_email_uri(
                params.get("email", ""),
                params.get("subject", "AUTUS 알림"),
                message,
            )
        else:
            uri = ""
        
        return {
            "action_type": action_type.value,
            "uri": uri,
            "message": message,
            "node_id": node.id,
            "node_name": node.name,
            "platform": self.platform.value,
        }
    
    def prepare_batch(
        self,
        actions: list,
    ) -> list:
        """배치 액션 준비"""
        prepared = []
        
        for action in actions:
            result = self.prepare_action(
                node=action["node"],
                action_type=action["action_type"],
                template_key=action["template_key"],
                extra_params=action.get("params"),
            )
            prepared.append(result)
        
        return prepared
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         REACT NATIVE BRIDGE
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_react_native_code(self) -> str:
        """React Native 실행 코드 생성"""
        return """
// React Native에서 Intent 실행
import { Linking, Platform } from 'react-native';

export async function executeIntent(uri: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(uri);
    
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      console.warn('Intent not supported:', uri);
      return false;
    }
  } catch (error) {
    console.error('Intent execution failed:', error);
    return false;
  }
}

// 사용 예시
// executeIntent('sms:01012345678?body=안녕하세요');
// executeIntent('tel:01012345678');
// executeIntent('intent://send?text=테스트#Intent;package=com.kakao.talk;end');
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              LEGAL NOTICE
# ═══════════════════════════════════════════════════════════════════════════

LEGAL_DISCLAIMER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║  - 스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, ActionType, NodeTier, DataSource
    
    # 테스트 노드
    test_node = Node(
        id="1",
        name="김철수",
        phone="010-1234-5678",
        student_name="김영희",
        money_total=500000,
        synergy_score=80,
        entropy_score=10,
        sq_score=75.0,
        tier=NodeTier.GOLD,
        source=DataSource.SMS,
    )
    
    # Intent Launcher 생성
    launcher = IntentLauncher(platform=Platform.ANDROID)
    
    print("=" * 60)
    print("AUTUS Intent Launcher Test")
    print("=" * 60)
    
    # SMS 액션
    sms_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.SMS,
        template_key="payment_reminder",
        extra_params={
            "due_date": "12월 20일",
            "amount": "300,000",
        },
    )
    
    print("\n[SMS Action]")
    print(f"URI: {sms_action['uri'][:80]}...")
    print(f"Message:\n{sms_action['message']}")
    
    # 카카오톡 액션
    kakao_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.KAKAO,
        template_key="score_up",
        extra_params={
            "prev_score": "75",
            "curr_score": "85",
        },
    )
    
    print("\n[KakaoTalk Action]")
    print(f"URI: {kakao_action['uri'][:80]}...")
    
    # 전화 액션
    call_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.CALL,
        template_key="",
    )
    
    print("\n[Call Action]")
    print(f"URI: {call_action['uri']}")
    
    print("\n" + "=" * 60)
    print(LEGAL_DISCLAIMER)










"""
AUTUS Local Agent - Intent Launcher
====================================

OS Intent를 사용한 클라이언트 사이드 자동화

핵심 원칙:
- 서버 경유 없음 (법적 면책)
- 유저 OS 기능 직접 호출
- "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"

지원 플랫폼:
- Android: Intent URI 스키마
- iOS: URL 스키마 (제한적)
- Desktop: 시스템 명령어
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import quote
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, ActionType, AutoAction


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

class Platform(Enum):
    """플랫폼 타입"""
    ANDROID = "android"
    IOS = "ios"
    DESKTOP = "desktop"


# Android Intent URI 템플릿
ANDROID_INTENTS = {
    # 카카오톡 메시지
    "kakao_chat": "intent://send?text={message}#Intent;package=com.kakao.talk;end",
    "kakao_friend": "intent://open?chatType=friend&phoneNumber={phone}#Intent;package=com.kakao.talk;end",
    
    # SMS
    "sms": "sms:{phone}?body={message}",
    "sms_multi": "smsto:{phone}?body={message}",
    
    # 전화
    "call": "tel:{phone}",
    "call_direct": "intent://call/{phone}#Intent;scheme=tel;end",
    
    # 이메일
    "email": "mailto:{email}?subject={subject}&body={message}",
    
    # 캘린더
    "calendar": "intent://event?title={title}&description={desc}#Intent;package=com.google.android.calendar;end",
}

# iOS URL 스키마 (제한적)
IOS_SCHEMES = {
    "sms": "sms:{phone}&body={message}",
    "call": "tel:{phone}",
    "email": "mailto:{email}?subject={subject}&body={message}",
    "kakao": "kakaolink://",  # 카카오링크 API 필요
}


# ═══════════════════════════════════════════════════════════════════════════
#                              MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    # 학원 특화 메시지
    "payment_reminder": """안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {due_date}
금액: {amount}원
감사합니다.""",

    "attendance_alert": """안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.""",

    "score_up": """안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prev_score}점 → 현재: {curr_score}점
계속 응원해주세요!""",

    "score_down": """안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prev_score}점 → 현재: {curr_score}점
상담이 필요하시면 연락 주세요.""",

    "check_in": """안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}""",

    # 일반 메시지
    "thank_you": """안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.""",

    "birthday": """안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.""",
}


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

class IntentLauncher:
    """
    클라이언트 사이드 Intent 실행기
    
    서버 경유 없이 OS 기능 직접 호출
    """
    
    def __init__(self, platform: Platform = Platform.ANDROID):
        self.platform = platform
        
        # 실행 로그
        self.execution_log = []
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         URI GENERATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_sms_uri(
        self,
        phone: str,
        message: str,
    ) -> str:
        """SMS Intent URI 생성"""
        encoded_msg = quote(message)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if self.platform == Platform.ANDROID:
            return f"sms:{clean_phone}?body={encoded_msg}"
        elif self.platform == Platform.IOS:
            return f"sms:{clean_phone}&body={encoded_msg}"
        else:
            return f"sms:{clean_phone}"
    
    def generate_call_uri(self, phone: str) -> str:
        """전화 Intent URI 생성"""
        clean_phone = ''.join(filter(str.isdigit, phone))
        return f"tel:{clean_phone}"
    
    def generate_kakao_uri(self, message: str) -> str:
        """카카오톡 Intent URI 생성 (Android only)"""
        if self.platform != Platform.ANDROID:
            return ""
        
        encoded_msg = quote(message)
        return f"intent://send?text={encoded_msg}#Intent;package=com.kakao.talk;end"
    
    def generate_email_uri(
        self,
        email: str,
        subject: str,
        body: str,
    ) -> str:
        """이메일 Intent URI 생성"""
        encoded_subject = quote(subject)
        encoded_body = quote(body)
        return f"mailto:{email}?subject={encoded_subject}&body={encoded_body}"
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         MESSAGE FORMATTING
    # ═══════════════════════════════════════════════════════════════════════
    
    def format_message(
        self,
        template_key: str,
        **kwargs,
    ) -> str:
        """메시지 템플릿 포맷팅"""
        template = MESSAGE_TEMPLATES.get(template_key, "{message}")
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            # 누락된 키는 빈 문자열로 대체
            for key in ["student", "name", "amount", "due_date", 
                       "prev_score", "curr_score", "time", "message"]:
                kwargs.setdefault(key, "")
            return template.format(**kwargs)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ACTION EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def prepare_action(
        self,
        node: Node,
        action_type: ActionType,
        template_key: str,
        extra_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        액션 준비 (URI 생성)
        
        실제 실행은 클라이언트(React Native/Electron)에서 수행
        """
        params = {
            "name": node.name,
            "student": node.student_name or node.name,
            "phone": node.phone,
            **(extra_params or {}),
        }
        
        message = self.format_message(template_key, **params)
        
        if action_type == ActionType.SMS:
            uri = self.generate_sms_uri(node.phone, message)
        elif action_type == ActionType.CALL:
            uri = self.generate_call_uri(node.phone)
        elif action_type == ActionType.KAKAO:
            uri = self.generate_kakao_uri(message)
        elif action_type == ActionType.EMAIL:
            uri = self.generate_email_uri(
                params.get("email", ""),
                params.get("subject", "AUTUS 알림"),
                message,
            )
        else:
            uri = ""
        
        return {
            "action_type": action_type.value,
            "uri": uri,
            "message": message,
            "node_id": node.id,
            "node_name": node.name,
            "platform": self.platform.value,
        }
    
    def prepare_batch(
        self,
        actions: list,
    ) -> list:
        """배치 액션 준비"""
        prepared = []
        
        for action in actions:
            result = self.prepare_action(
                node=action["node"],
                action_type=action["action_type"],
                template_key=action["template_key"],
                extra_params=action.get("params"),
            )
            prepared.append(result)
        
        return prepared
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         REACT NATIVE BRIDGE
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_react_native_code(self) -> str:
        """React Native 실행 코드 생성"""
        return """
// React Native에서 Intent 실행
import { Linking, Platform } from 'react-native';

export async function executeIntent(uri: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(uri);
    
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      console.warn('Intent not supported:', uri);
      return false;
    }
  } catch (error) {
    console.error('Intent execution failed:', error);
    return false;
  }
}

// 사용 예시
// executeIntent('sms:01012345678?body=안녕하세요');
// executeIntent('tel:01012345678');
// executeIntent('intent://send?text=테스트#Intent;package=com.kakao.talk;end');
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              LEGAL NOTICE
# ═══════════════════════════════════════════════════════════════════════════

LEGAL_DISCLAIMER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║  - 스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, ActionType, NodeTier, DataSource
    
    # 테스트 노드
    test_node = Node(
        id="1",
        name="김철수",
        phone="010-1234-5678",
        student_name="김영희",
        money_total=500000,
        synergy_score=80,
        entropy_score=10,
        sq_score=75.0,
        tier=NodeTier.GOLD,
        source=DataSource.SMS,
    )
    
    # Intent Launcher 생성
    launcher = IntentLauncher(platform=Platform.ANDROID)
    
    print("=" * 60)
    print("AUTUS Intent Launcher Test")
    print("=" * 60)
    
    # SMS 액션
    sms_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.SMS,
        template_key="payment_reminder",
        extra_params={
            "due_date": "12월 20일",
            "amount": "300,000",
        },
    )
    
    print("\n[SMS Action]")
    print(f"URI: {sms_action['uri'][:80]}...")
    print(f"Message:\n{sms_action['message']}")
    
    # 카카오톡 액션
    kakao_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.KAKAO,
        template_key="score_up",
        extra_params={
            "prev_score": "75",
            "curr_score": "85",
        },
    )
    
    print("\n[KakaoTalk Action]")
    print(f"URI: {kakao_action['uri'][:80]}...")
    
    # 전화 액션
    call_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.CALL,
        template_key="",
    )
    
    print("\n[Call Action]")
    print(f"URI: {call_action['uri']}")
    
    print("\n" + "=" * 60)
    print(LEGAL_DISCLAIMER)




















"""
AUTUS Local Agent - Intent Launcher
====================================

OS Intent를 사용한 클라이언트 사이드 자동화

핵심 원칙:
- 서버 경유 없음 (법적 면책)
- 유저 OS 기능 직접 호출
- "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"

지원 플랫폼:
- Android: Intent URI 스키마
- iOS: URL 스키마 (제한적)
- Desktop: 시스템 명령어
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import quote
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, ActionType, AutoAction


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

class Platform(Enum):
    """플랫폼 타입"""
    ANDROID = "android"
    IOS = "ios"
    DESKTOP = "desktop"


# Android Intent URI 템플릿
ANDROID_INTENTS = {
    # 카카오톡 메시지
    "kakao_chat": "intent://send?text={message}#Intent;package=com.kakao.talk;end",
    "kakao_friend": "intent://open?chatType=friend&phoneNumber={phone}#Intent;package=com.kakao.talk;end",
    
    # SMS
    "sms": "sms:{phone}?body={message}",
    "sms_multi": "smsto:{phone}?body={message}",
    
    # 전화
    "call": "tel:{phone}",
    "call_direct": "intent://call/{phone}#Intent;scheme=tel;end",
    
    # 이메일
    "email": "mailto:{email}?subject={subject}&body={message}",
    
    # 캘린더
    "calendar": "intent://event?title={title}&description={desc}#Intent;package=com.google.android.calendar;end",
}

# iOS URL 스키마 (제한적)
IOS_SCHEMES = {
    "sms": "sms:{phone}&body={message}",
    "call": "tel:{phone}",
    "email": "mailto:{email}?subject={subject}&body={message}",
    "kakao": "kakaolink://",  # 카카오링크 API 필요
}


# ═══════════════════════════════════════════════════════════════════════════
#                              MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    # 학원 특화 메시지
    "payment_reminder": """안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {due_date}
금액: {amount}원
감사합니다.""",

    "attendance_alert": """안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.""",

    "score_up": """안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prev_score}점 → 현재: {curr_score}점
계속 응원해주세요!""",

    "score_down": """안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prev_score}점 → 현재: {curr_score}점
상담이 필요하시면 연락 주세요.""",

    "check_in": """안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}""",

    # 일반 메시지
    "thank_you": """안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.""",

    "birthday": """안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.""",
}


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

class IntentLauncher:
    """
    클라이언트 사이드 Intent 실행기
    
    서버 경유 없이 OS 기능 직접 호출
    """
    
    def __init__(self, platform: Platform = Platform.ANDROID):
        self.platform = platform
        
        # 실행 로그
        self.execution_log = []
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         URI GENERATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_sms_uri(
        self,
        phone: str,
        message: str,
    ) -> str:
        """SMS Intent URI 생성"""
        encoded_msg = quote(message)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if self.platform == Platform.ANDROID:
            return f"sms:{clean_phone}?body={encoded_msg}"
        elif self.platform == Platform.IOS:
            return f"sms:{clean_phone}&body={encoded_msg}"
        else:
            return f"sms:{clean_phone}"
    
    def generate_call_uri(self, phone: str) -> str:
        """전화 Intent URI 생성"""
        clean_phone = ''.join(filter(str.isdigit, phone))
        return f"tel:{clean_phone}"
    
    def generate_kakao_uri(self, message: str) -> str:
        """카카오톡 Intent URI 생성 (Android only)"""
        if self.platform != Platform.ANDROID:
            return ""
        
        encoded_msg = quote(message)
        return f"intent://send?text={encoded_msg}#Intent;package=com.kakao.talk;end"
    
    def generate_email_uri(
        self,
        email: str,
        subject: str,
        body: str,
    ) -> str:
        """이메일 Intent URI 생성"""
        encoded_subject = quote(subject)
        encoded_body = quote(body)
        return f"mailto:{email}?subject={encoded_subject}&body={encoded_body}"
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         MESSAGE FORMATTING
    # ═══════════════════════════════════════════════════════════════════════
    
    def format_message(
        self,
        template_key: str,
        **kwargs,
    ) -> str:
        """메시지 템플릿 포맷팅"""
        template = MESSAGE_TEMPLATES.get(template_key, "{message}")
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            # 누락된 키는 빈 문자열로 대체
            for key in ["student", "name", "amount", "due_date", 
                       "prev_score", "curr_score", "time", "message"]:
                kwargs.setdefault(key, "")
            return template.format(**kwargs)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ACTION EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def prepare_action(
        self,
        node: Node,
        action_type: ActionType,
        template_key: str,
        extra_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        액션 준비 (URI 생성)
        
        실제 실행은 클라이언트(React Native/Electron)에서 수행
        """
        params = {
            "name": node.name,
            "student": node.student_name or node.name,
            "phone": node.phone,
            **(extra_params or {}),
        }
        
        message = self.format_message(template_key, **params)
        
        if action_type == ActionType.SMS:
            uri = self.generate_sms_uri(node.phone, message)
        elif action_type == ActionType.CALL:
            uri = self.generate_call_uri(node.phone)
        elif action_type == ActionType.KAKAO:
            uri = self.generate_kakao_uri(message)
        elif action_type == ActionType.EMAIL:
            uri = self.generate_email_uri(
                params.get("email", ""),
                params.get("subject", "AUTUS 알림"),
                message,
            )
        else:
            uri = ""
        
        return {
            "action_type": action_type.value,
            "uri": uri,
            "message": message,
            "node_id": node.id,
            "node_name": node.name,
            "platform": self.platform.value,
        }
    
    def prepare_batch(
        self,
        actions: list,
    ) -> list:
        """배치 액션 준비"""
        prepared = []
        
        for action in actions:
            result = self.prepare_action(
                node=action["node"],
                action_type=action["action_type"],
                template_key=action["template_key"],
                extra_params=action.get("params"),
            )
            prepared.append(result)
        
        return prepared
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         REACT NATIVE BRIDGE
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_react_native_code(self) -> str:
        """React Native 실행 코드 생성"""
        return """
// React Native에서 Intent 실행
import { Linking, Platform } from 'react-native';

export async function executeIntent(uri: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(uri);
    
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      console.warn('Intent not supported:', uri);
      return false;
    }
  } catch (error) {
    console.error('Intent execution failed:', error);
    return false;
  }
}

// 사용 예시
// executeIntent('sms:01012345678?body=안녕하세요');
// executeIntent('tel:01012345678');
// executeIntent('intent://send?text=테스트#Intent;package=com.kakao.talk;end');
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              LEGAL NOTICE
# ═══════════════════════════════════════════════════════════════════════════

LEGAL_DISCLAIMER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║  - 스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, ActionType, NodeTier, DataSource
    
    # 테스트 노드
    test_node = Node(
        id="1",
        name="김철수",
        phone="010-1234-5678",
        student_name="김영희",
        money_total=500000,
        synergy_score=80,
        entropy_score=10,
        sq_score=75.0,
        tier=NodeTier.GOLD,
        source=DataSource.SMS,
    )
    
    # Intent Launcher 생성
    launcher = IntentLauncher(platform=Platform.ANDROID)
    
    print("=" * 60)
    print("AUTUS Intent Launcher Test")
    print("=" * 60)
    
    # SMS 액션
    sms_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.SMS,
        template_key="payment_reminder",
        extra_params={
            "due_date": "12월 20일",
            "amount": "300,000",
        },
    )
    
    print("\n[SMS Action]")
    print(f"URI: {sms_action['uri'][:80]}...")
    print(f"Message:\n{sms_action['message']}")
    
    # 카카오톡 액션
    kakao_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.KAKAO,
        template_key="score_up",
        extra_params={
            "prev_score": "75",
            "curr_score": "85",
        },
    )
    
    print("\n[KakaoTalk Action]")
    print(f"URI: {kakao_action['uri'][:80]}...")
    
    # 전화 액션
    call_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.CALL,
        template_key="",
    )
    
    print("\n[Call Action]")
    print(f"URI: {call_action['uri']}")
    
    print("\n" + "=" * 60)
    print(LEGAL_DISCLAIMER)










"""
AUTUS Local Agent - Intent Launcher
====================================

OS Intent를 사용한 클라이언트 사이드 자동화

핵심 원칙:
- 서버 경유 없음 (법적 면책)
- 유저 OS 기능 직접 호출
- "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"

지원 플랫폼:
- Android: Intent URI 스키마
- iOS: URL 스키마 (제한적)
- Desktop: 시스템 명령어
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import quote
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, ActionType, AutoAction


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

class Platform(Enum):
    """플랫폼 타입"""
    ANDROID = "android"
    IOS = "ios"
    DESKTOP = "desktop"


# Android Intent URI 템플릿
ANDROID_INTENTS = {
    # 카카오톡 메시지
    "kakao_chat": "intent://send?text={message}#Intent;package=com.kakao.talk;end",
    "kakao_friend": "intent://open?chatType=friend&phoneNumber={phone}#Intent;package=com.kakao.talk;end",
    
    # SMS
    "sms": "sms:{phone}?body={message}",
    "sms_multi": "smsto:{phone}?body={message}",
    
    # 전화
    "call": "tel:{phone}",
    "call_direct": "intent://call/{phone}#Intent;scheme=tel;end",
    
    # 이메일
    "email": "mailto:{email}?subject={subject}&body={message}",
    
    # 캘린더
    "calendar": "intent://event?title={title}&description={desc}#Intent;package=com.google.android.calendar;end",
}

# iOS URL 스키마 (제한적)
IOS_SCHEMES = {
    "sms": "sms:{phone}&body={message}",
    "call": "tel:{phone}",
    "email": "mailto:{email}?subject={subject}&body={message}",
    "kakao": "kakaolink://",  # 카카오링크 API 필요
}


# ═══════════════════════════════════════════════════════════════════════════
#                              MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    # 학원 특화 메시지
    "payment_reminder": """안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {due_date}
금액: {amount}원
감사합니다.""",

    "attendance_alert": """안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.""",

    "score_up": """안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prev_score}점 → 현재: {curr_score}점
계속 응원해주세요!""",

    "score_down": """안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prev_score}점 → 현재: {curr_score}점
상담이 필요하시면 연락 주세요.""",

    "check_in": """안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}""",

    # 일반 메시지
    "thank_you": """안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.""",

    "birthday": """안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.""",
}


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

class IntentLauncher:
    """
    클라이언트 사이드 Intent 실행기
    
    서버 경유 없이 OS 기능 직접 호출
    """
    
    def __init__(self, platform: Platform = Platform.ANDROID):
        self.platform = platform
        
        # 실행 로그
        self.execution_log = []
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         URI GENERATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_sms_uri(
        self,
        phone: str,
        message: str,
    ) -> str:
        """SMS Intent URI 생성"""
        encoded_msg = quote(message)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if self.platform == Platform.ANDROID:
            return f"sms:{clean_phone}?body={encoded_msg}"
        elif self.platform == Platform.IOS:
            return f"sms:{clean_phone}&body={encoded_msg}"
        else:
            return f"sms:{clean_phone}"
    
    def generate_call_uri(self, phone: str) -> str:
        """전화 Intent URI 생성"""
        clean_phone = ''.join(filter(str.isdigit, phone))
        return f"tel:{clean_phone}"
    
    def generate_kakao_uri(self, message: str) -> str:
        """카카오톡 Intent URI 생성 (Android only)"""
        if self.platform != Platform.ANDROID:
            return ""
        
        encoded_msg = quote(message)
        return f"intent://send?text={encoded_msg}#Intent;package=com.kakao.talk;end"
    
    def generate_email_uri(
        self,
        email: str,
        subject: str,
        body: str,
    ) -> str:
        """이메일 Intent URI 생성"""
        encoded_subject = quote(subject)
        encoded_body = quote(body)
        return f"mailto:{email}?subject={encoded_subject}&body={encoded_body}"
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         MESSAGE FORMATTING
    # ═══════════════════════════════════════════════════════════════════════
    
    def format_message(
        self,
        template_key: str,
        **kwargs,
    ) -> str:
        """메시지 템플릿 포맷팅"""
        template = MESSAGE_TEMPLATES.get(template_key, "{message}")
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            # 누락된 키는 빈 문자열로 대체
            for key in ["student", "name", "amount", "due_date", 
                       "prev_score", "curr_score", "time", "message"]:
                kwargs.setdefault(key, "")
            return template.format(**kwargs)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ACTION EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def prepare_action(
        self,
        node: Node,
        action_type: ActionType,
        template_key: str,
        extra_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        액션 준비 (URI 생성)
        
        실제 실행은 클라이언트(React Native/Electron)에서 수행
        """
        params = {
            "name": node.name,
            "student": node.student_name or node.name,
            "phone": node.phone,
            **(extra_params or {}),
        }
        
        message = self.format_message(template_key, **params)
        
        if action_type == ActionType.SMS:
            uri = self.generate_sms_uri(node.phone, message)
        elif action_type == ActionType.CALL:
            uri = self.generate_call_uri(node.phone)
        elif action_type == ActionType.KAKAO:
            uri = self.generate_kakao_uri(message)
        elif action_type == ActionType.EMAIL:
            uri = self.generate_email_uri(
                params.get("email", ""),
                params.get("subject", "AUTUS 알림"),
                message,
            )
        else:
            uri = ""
        
        return {
            "action_type": action_type.value,
            "uri": uri,
            "message": message,
            "node_id": node.id,
            "node_name": node.name,
            "platform": self.platform.value,
        }
    
    def prepare_batch(
        self,
        actions: list,
    ) -> list:
        """배치 액션 준비"""
        prepared = []
        
        for action in actions:
            result = self.prepare_action(
                node=action["node"],
                action_type=action["action_type"],
                template_key=action["template_key"],
                extra_params=action.get("params"),
            )
            prepared.append(result)
        
        return prepared
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         REACT NATIVE BRIDGE
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_react_native_code(self) -> str:
        """React Native 실행 코드 생성"""
        return """
// React Native에서 Intent 실행
import { Linking, Platform } from 'react-native';

export async function executeIntent(uri: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(uri);
    
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      console.warn('Intent not supported:', uri);
      return false;
    }
  } catch (error) {
    console.error('Intent execution failed:', error);
    return false;
  }
}

// 사용 예시
// executeIntent('sms:01012345678?body=안녕하세요');
// executeIntent('tel:01012345678');
// executeIntent('intent://send?text=테스트#Intent;package=com.kakao.talk;end');
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              LEGAL NOTICE
# ═══════════════════════════════════════════════════════════════════════════

LEGAL_DISCLAIMER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║  - 스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, ActionType, NodeTier, DataSource
    
    # 테스트 노드
    test_node = Node(
        id="1",
        name="김철수",
        phone="010-1234-5678",
        student_name="김영희",
        money_total=500000,
        synergy_score=80,
        entropy_score=10,
        sq_score=75.0,
        tier=NodeTier.GOLD,
        source=DataSource.SMS,
    )
    
    # Intent Launcher 생성
    launcher = IntentLauncher(platform=Platform.ANDROID)
    
    print("=" * 60)
    print("AUTUS Intent Launcher Test")
    print("=" * 60)
    
    # SMS 액션
    sms_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.SMS,
        template_key="payment_reminder",
        extra_params={
            "due_date": "12월 20일",
            "amount": "300,000",
        },
    )
    
    print("\n[SMS Action]")
    print(f"URI: {sms_action['uri'][:80]}...")
    print(f"Message:\n{sms_action['message']}")
    
    # 카카오톡 액션
    kakao_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.KAKAO,
        template_key="score_up",
        extra_params={
            "prev_score": "75",
            "curr_score": "85",
        },
    )
    
    print("\n[KakaoTalk Action]")
    print(f"URI: {kakao_action['uri'][:80]}...")
    
    # 전화 액션
    call_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.CALL,
        template_key="",
    )
    
    print("\n[Call Action]")
    print(f"URI: {call_action['uri']}")
    
    print("\n" + "=" * 60)
    print(LEGAL_DISCLAIMER)










"""
AUTUS Local Agent - Intent Launcher
====================================

OS Intent를 사용한 클라이언트 사이드 자동화

핵심 원칙:
- 서버 경유 없음 (법적 면책)
- 유저 OS 기능 직접 호출
- "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"

지원 플랫폼:
- Android: Intent URI 스키마
- iOS: URL 스키마 (제한적)
- Desktop: 시스템 명령어
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import quote
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, ActionType, AutoAction


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

class Platform(Enum):
    """플랫폼 타입"""
    ANDROID = "android"
    IOS = "ios"
    DESKTOP = "desktop"


# Android Intent URI 템플릿
ANDROID_INTENTS = {
    # 카카오톡 메시지
    "kakao_chat": "intent://send?text={message}#Intent;package=com.kakao.talk;end",
    "kakao_friend": "intent://open?chatType=friend&phoneNumber={phone}#Intent;package=com.kakao.talk;end",
    
    # SMS
    "sms": "sms:{phone}?body={message}",
    "sms_multi": "smsto:{phone}?body={message}",
    
    # 전화
    "call": "tel:{phone}",
    "call_direct": "intent://call/{phone}#Intent;scheme=tel;end",
    
    # 이메일
    "email": "mailto:{email}?subject={subject}&body={message}",
    
    # 캘린더
    "calendar": "intent://event?title={title}&description={desc}#Intent;package=com.google.android.calendar;end",
}

# iOS URL 스키마 (제한적)
IOS_SCHEMES = {
    "sms": "sms:{phone}&body={message}",
    "call": "tel:{phone}",
    "email": "mailto:{email}?subject={subject}&body={message}",
    "kakao": "kakaolink://",  # 카카오링크 API 필요
}


# ═══════════════════════════════════════════════════════════════════════════
#                              MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    # 학원 특화 메시지
    "payment_reminder": """안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {due_date}
금액: {amount}원
감사합니다.""",

    "attendance_alert": """안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.""",

    "score_up": """안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prev_score}점 → 현재: {curr_score}점
계속 응원해주세요!""",

    "score_down": """안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prev_score}점 → 현재: {curr_score}점
상담이 필요하시면 연락 주세요.""",

    "check_in": """안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}""",

    # 일반 메시지
    "thank_you": """안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.""",

    "birthday": """안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.""",
}


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

class IntentLauncher:
    """
    클라이언트 사이드 Intent 실행기
    
    서버 경유 없이 OS 기능 직접 호출
    """
    
    def __init__(self, platform: Platform = Platform.ANDROID):
        self.platform = platform
        
        # 실행 로그
        self.execution_log = []
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         URI GENERATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_sms_uri(
        self,
        phone: str,
        message: str,
    ) -> str:
        """SMS Intent URI 생성"""
        encoded_msg = quote(message)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if self.platform == Platform.ANDROID:
            return f"sms:{clean_phone}?body={encoded_msg}"
        elif self.platform == Platform.IOS:
            return f"sms:{clean_phone}&body={encoded_msg}"
        else:
            return f"sms:{clean_phone}"
    
    def generate_call_uri(self, phone: str) -> str:
        """전화 Intent URI 생성"""
        clean_phone = ''.join(filter(str.isdigit, phone))
        return f"tel:{clean_phone}"
    
    def generate_kakao_uri(self, message: str) -> str:
        """카카오톡 Intent URI 생성 (Android only)"""
        if self.platform != Platform.ANDROID:
            return ""
        
        encoded_msg = quote(message)
        return f"intent://send?text={encoded_msg}#Intent;package=com.kakao.talk;end"
    
    def generate_email_uri(
        self,
        email: str,
        subject: str,
        body: str,
    ) -> str:
        """이메일 Intent URI 생성"""
        encoded_subject = quote(subject)
        encoded_body = quote(body)
        return f"mailto:{email}?subject={encoded_subject}&body={encoded_body}"
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         MESSAGE FORMATTING
    # ═══════════════════════════════════════════════════════════════════════
    
    def format_message(
        self,
        template_key: str,
        **kwargs,
    ) -> str:
        """메시지 템플릿 포맷팅"""
        template = MESSAGE_TEMPLATES.get(template_key, "{message}")
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            # 누락된 키는 빈 문자열로 대체
            for key in ["student", "name", "amount", "due_date", 
                       "prev_score", "curr_score", "time", "message"]:
                kwargs.setdefault(key, "")
            return template.format(**kwargs)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ACTION EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def prepare_action(
        self,
        node: Node,
        action_type: ActionType,
        template_key: str,
        extra_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        액션 준비 (URI 생성)
        
        실제 실행은 클라이언트(React Native/Electron)에서 수행
        """
        params = {
            "name": node.name,
            "student": node.student_name or node.name,
            "phone": node.phone,
            **(extra_params or {}),
        }
        
        message = self.format_message(template_key, **params)
        
        if action_type == ActionType.SMS:
            uri = self.generate_sms_uri(node.phone, message)
        elif action_type == ActionType.CALL:
            uri = self.generate_call_uri(node.phone)
        elif action_type == ActionType.KAKAO:
            uri = self.generate_kakao_uri(message)
        elif action_type == ActionType.EMAIL:
            uri = self.generate_email_uri(
                params.get("email", ""),
                params.get("subject", "AUTUS 알림"),
                message,
            )
        else:
            uri = ""
        
        return {
            "action_type": action_type.value,
            "uri": uri,
            "message": message,
            "node_id": node.id,
            "node_name": node.name,
            "platform": self.platform.value,
        }
    
    def prepare_batch(
        self,
        actions: list,
    ) -> list:
        """배치 액션 준비"""
        prepared = []
        
        for action in actions:
            result = self.prepare_action(
                node=action["node"],
                action_type=action["action_type"],
                template_key=action["template_key"],
                extra_params=action.get("params"),
            )
            prepared.append(result)
        
        return prepared
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         REACT NATIVE BRIDGE
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_react_native_code(self) -> str:
        """React Native 실행 코드 생성"""
        return """
// React Native에서 Intent 실행
import { Linking, Platform } from 'react-native';

export async function executeIntent(uri: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(uri);
    
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      console.warn('Intent not supported:', uri);
      return false;
    }
  } catch (error) {
    console.error('Intent execution failed:', error);
    return false;
  }
}

// 사용 예시
// executeIntent('sms:01012345678?body=안녕하세요');
// executeIntent('tel:01012345678');
// executeIntent('intent://send?text=테스트#Intent;package=com.kakao.talk;end');
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              LEGAL NOTICE
# ═══════════════════════════════════════════════════════════════════════════

LEGAL_DISCLAIMER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║  - 스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, ActionType, NodeTier, DataSource
    
    # 테스트 노드
    test_node = Node(
        id="1",
        name="김철수",
        phone="010-1234-5678",
        student_name="김영희",
        money_total=500000,
        synergy_score=80,
        entropy_score=10,
        sq_score=75.0,
        tier=NodeTier.GOLD,
        source=DataSource.SMS,
    )
    
    # Intent Launcher 생성
    launcher = IntentLauncher(platform=Platform.ANDROID)
    
    print("=" * 60)
    print("AUTUS Intent Launcher Test")
    print("=" * 60)
    
    # SMS 액션
    sms_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.SMS,
        template_key="payment_reminder",
        extra_params={
            "due_date": "12월 20일",
            "amount": "300,000",
        },
    )
    
    print("\n[SMS Action]")
    print(f"URI: {sms_action['uri'][:80]}...")
    print(f"Message:\n{sms_action['message']}")
    
    # 카카오톡 액션
    kakao_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.KAKAO,
        template_key="score_up",
        extra_params={
            "prev_score": "75",
            "curr_score": "85",
        },
    )
    
    print("\n[KakaoTalk Action]")
    print(f"URI: {kakao_action['uri'][:80]}...")
    
    # 전화 액션
    call_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.CALL,
        template_key="",
    )
    
    print("\n[Call Action]")
    print(f"URI: {call_action['uri']}")
    
    print("\n" + "=" * 60)
    print(LEGAL_DISCLAIMER)










"""
AUTUS Local Agent - Intent Launcher
====================================

OS Intent를 사용한 클라이언트 사이드 자동화

핵심 원칙:
- 서버 경유 없음 (법적 면책)
- 유저 OS 기능 직접 호출
- "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"

지원 플랫폼:
- Android: Intent URI 스키마
- iOS: URL 스키마 (제한적)
- Desktop: 시스템 명령어
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import quote
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, ActionType, AutoAction


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

class Platform(Enum):
    """플랫폼 타입"""
    ANDROID = "android"
    IOS = "ios"
    DESKTOP = "desktop"


# Android Intent URI 템플릿
ANDROID_INTENTS = {
    # 카카오톡 메시지
    "kakao_chat": "intent://send?text={message}#Intent;package=com.kakao.talk;end",
    "kakao_friend": "intent://open?chatType=friend&phoneNumber={phone}#Intent;package=com.kakao.talk;end",
    
    # SMS
    "sms": "sms:{phone}?body={message}",
    "sms_multi": "smsto:{phone}?body={message}",
    
    # 전화
    "call": "tel:{phone}",
    "call_direct": "intent://call/{phone}#Intent;scheme=tel;end",
    
    # 이메일
    "email": "mailto:{email}?subject={subject}&body={message}",
    
    # 캘린더
    "calendar": "intent://event?title={title}&description={desc}#Intent;package=com.google.android.calendar;end",
}

# iOS URL 스키마 (제한적)
IOS_SCHEMES = {
    "sms": "sms:{phone}&body={message}",
    "call": "tel:{phone}",
    "email": "mailto:{email}?subject={subject}&body={message}",
    "kakao": "kakaolink://",  # 카카오링크 API 필요
}


# ═══════════════════════════════════════════════════════════════════════════
#                              MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    # 학원 특화 메시지
    "payment_reminder": """안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {due_date}
금액: {amount}원
감사합니다.""",

    "attendance_alert": """안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.""",

    "score_up": """안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prev_score}점 → 현재: {curr_score}점
계속 응원해주세요!""",

    "score_down": """안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prev_score}점 → 현재: {curr_score}점
상담이 필요하시면 연락 주세요.""",

    "check_in": """안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}""",

    # 일반 메시지
    "thank_you": """안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.""",

    "birthday": """안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.""",
}


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

class IntentLauncher:
    """
    클라이언트 사이드 Intent 실행기
    
    서버 경유 없이 OS 기능 직접 호출
    """
    
    def __init__(self, platform: Platform = Platform.ANDROID):
        self.platform = platform
        
        # 실행 로그
        self.execution_log = []
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         URI GENERATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_sms_uri(
        self,
        phone: str,
        message: str,
    ) -> str:
        """SMS Intent URI 생성"""
        encoded_msg = quote(message)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if self.platform == Platform.ANDROID:
            return f"sms:{clean_phone}?body={encoded_msg}"
        elif self.platform == Platform.IOS:
            return f"sms:{clean_phone}&body={encoded_msg}"
        else:
            return f"sms:{clean_phone}"
    
    def generate_call_uri(self, phone: str) -> str:
        """전화 Intent URI 생성"""
        clean_phone = ''.join(filter(str.isdigit, phone))
        return f"tel:{clean_phone}"
    
    def generate_kakao_uri(self, message: str) -> str:
        """카카오톡 Intent URI 생성 (Android only)"""
        if self.platform != Platform.ANDROID:
            return ""
        
        encoded_msg = quote(message)
        return f"intent://send?text={encoded_msg}#Intent;package=com.kakao.talk;end"
    
    def generate_email_uri(
        self,
        email: str,
        subject: str,
        body: str,
    ) -> str:
        """이메일 Intent URI 생성"""
        encoded_subject = quote(subject)
        encoded_body = quote(body)
        return f"mailto:{email}?subject={encoded_subject}&body={encoded_body}"
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         MESSAGE FORMATTING
    # ═══════════════════════════════════════════════════════════════════════
    
    def format_message(
        self,
        template_key: str,
        **kwargs,
    ) -> str:
        """메시지 템플릿 포맷팅"""
        template = MESSAGE_TEMPLATES.get(template_key, "{message}")
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            # 누락된 키는 빈 문자열로 대체
            for key in ["student", "name", "amount", "due_date", 
                       "prev_score", "curr_score", "time", "message"]:
                kwargs.setdefault(key, "")
            return template.format(**kwargs)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ACTION EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def prepare_action(
        self,
        node: Node,
        action_type: ActionType,
        template_key: str,
        extra_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        액션 준비 (URI 생성)
        
        실제 실행은 클라이언트(React Native/Electron)에서 수행
        """
        params = {
            "name": node.name,
            "student": node.student_name or node.name,
            "phone": node.phone,
            **(extra_params or {}),
        }
        
        message = self.format_message(template_key, **params)
        
        if action_type == ActionType.SMS:
            uri = self.generate_sms_uri(node.phone, message)
        elif action_type == ActionType.CALL:
            uri = self.generate_call_uri(node.phone)
        elif action_type == ActionType.KAKAO:
            uri = self.generate_kakao_uri(message)
        elif action_type == ActionType.EMAIL:
            uri = self.generate_email_uri(
                params.get("email", ""),
                params.get("subject", "AUTUS 알림"),
                message,
            )
        else:
            uri = ""
        
        return {
            "action_type": action_type.value,
            "uri": uri,
            "message": message,
            "node_id": node.id,
            "node_name": node.name,
            "platform": self.platform.value,
        }
    
    def prepare_batch(
        self,
        actions: list,
    ) -> list:
        """배치 액션 준비"""
        prepared = []
        
        for action in actions:
            result = self.prepare_action(
                node=action["node"],
                action_type=action["action_type"],
                template_key=action["template_key"],
                extra_params=action.get("params"),
            )
            prepared.append(result)
        
        return prepared
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         REACT NATIVE BRIDGE
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_react_native_code(self) -> str:
        """React Native 실행 코드 생성"""
        return """
// React Native에서 Intent 실행
import { Linking, Platform } from 'react-native';

export async function executeIntent(uri: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(uri);
    
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      console.warn('Intent not supported:', uri);
      return false;
    }
  } catch (error) {
    console.error('Intent execution failed:', error);
    return false;
  }
}

// 사용 예시
// executeIntent('sms:01012345678?body=안녕하세요');
// executeIntent('tel:01012345678');
// executeIntent('intent://send?text=테스트#Intent;package=com.kakao.talk;end');
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              LEGAL NOTICE
# ═══════════════════════════════════════════════════════════════════════════

LEGAL_DISCLAIMER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║  - 스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, ActionType, NodeTier, DataSource
    
    # 테스트 노드
    test_node = Node(
        id="1",
        name="김철수",
        phone="010-1234-5678",
        student_name="김영희",
        money_total=500000,
        synergy_score=80,
        entropy_score=10,
        sq_score=75.0,
        tier=NodeTier.GOLD,
        source=DataSource.SMS,
    )
    
    # Intent Launcher 생성
    launcher = IntentLauncher(platform=Platform.ANDROID)
    
    print("=" * 60)
    print("AUTUS Intent Launcher Test")
    print("=" * 60)
    
    # SMS 액션
    sms_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.SMS,
        template_key="payment_reminder",
        extra_params={
            "due_date": "12월 20일",
            "amount": "300,000",
        },
    )
    
    print("\n[SMS Action]")
    print(f"URI: {sms_action['uri'][:80]}...")
    print(f"Message:\n{sms_action['message']}")
    
    # 카카오톡 액션
    kakao_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.KAKAO,
        template_key="score_up",
        extra_params={
            "prev_score": "75",
            "curr_score": "85",
        },
    )
    
    print("\n[KakaoTalk Action]")
    print(f"URI: {kakao_action['uri'][:80]}...")
    
    # 전화 액션
    call_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.CALL,
        template_key="",
    )
    
    print("\n[Call Action]")
    print(f"URI: {call_action['uri']}")
    
    print("\n" + "=" * 60)
    print(LEGAL_DISCLAIMER)










"""
AUTUS Local Agent - Intent Launcher
====================================

OS Intent를 사용한 클라이언트 사이드 자동화

핵심 원칙:
- 서버 경유 없음 (법적 면책)
- 유저 OS 기능 직접 호출
- "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"

지원 플랫폼:
- Android: Intent URI 스키마
- iOS: URL 스키마 (제한적)
- Desktop: 시스템 명령어
"""

from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum
from urllib.parse import quote
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.models import Node, ActionType, AutoAction


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

class Platform(Enum):
    """플랫폼 타입"""
    ANDROID = "android"
    IOS = "ios"
    DESKTOP = "desktop"


# Android Intent URI 템플릿
ANDROID_INTENTS = {
    # 카카오톡 메시지
    "kakao_chat": "intent://send?text={message}#Intent;package=com.kakao.talk;end",
    "kakao_friend": "intent://open?chatType=friend&phoneNumber={phone}#Intent;package=com.kakao.talk;end",
    
    # SMS
    "sms": "sms:{phone}?body={message}",
    "sms_multi": "smsto:{phone}?body={message}",
    
    # 전화
    "call": "tel:{phone}",
    "call_direct": "intent://call/{phone}#Intent;scheme=tel;end",
    
    # 이메일
    "email": "mailto:{email}?subject={subject}&body={message}",
    
    # 캘린더
    "calendar": "intent://event?title={title}&description={desc}#Intent;package=com.google.android.calendar;end",
}

# iOS URL 스키마 (제한적)
IOS_SCHEMES = {
    "sms": "sms:{phone}&body={message}",
    "call": "tel:{phone}",
    "email": "mailto:{email}?subject={subject}&body={message}",
    "kakao": "kakaolink://",  # 카카오링크 API 필요
}


# ═══════════════════════════════════════════════════════════════════════════
#                              MESSAGE TEMPLATES
# ═══════════════════════════════════════════════════════════════════════════

MESSAGE_TEMPLATES = {
    # 학원 특화 메시지
    "payment_reminder": """안녕하세요, {student} 학부모님.
이번 달 수강료 납부 안내드립니다.
납부 기한: {due_date}
금액: {amount}원
감사합니다.""",

    "attendance_alert": """안녕하세요, {student} 학부모님.
오늘 {student} 학생이 결석하였습니다.
확인 부탁드립니다.""",

    "score_up": """안녕하세요, {student} 학부모님.
{student} 학생의 성적이 향상되었습니다! 🎉
이전: {prev_score}점 → 현재: {curr_score}점
계속 응원해주세요!""",

    "score_down": """안녕하세요, {student} 학부모님.
{student} 학생의 성적 변화 안내드립니다.
이전: {prev_score}점 → 현재: {curr_score}점
상담이 필요하시면 연락 주세요.""",

    "check_in": """안녕하세요, {student} 학부모님.
{student} 학생이 학원에 도착했습니다. ✅
도착 시간: {time}""",

    # 일반 메시지
    "thank_you": """안녕하세요, {name}님.
항상 저희를 믿고 맡겨주셔서 감사합니다.
앞으로도 최선을 다하겠습니다.""",

    "birthday": """안녕하세요, {name}님.
생일 축하드립니다! 🎂
행복한 하루 되세요.""",
}


# ═══════════════════════════════════════════════════════════════════════════
#                              INTENT LAUNCHER
# ═══════════════════════════════════════════════════════════════════════════

class IntentLauncher:
    """
    클라이언트 사이드 Intent 실행기
    
    서버 경유 없이 OS 기능 직접 호출
    """
    
    def __init__(self, platform: Platform = Platform.ANDROID):
        self.platform = platform
        
        # 실행 로그
        self.execution_log = []
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         URI GENERATION
    # ═══════════════════════════════════════════════════════════════════════
    
    def generate_sms_uri(
        self,
        phone: str,
        message: str,
    ) -> str:
        """SMS Intent URI 생성"""
        encoded_msg = quote(message)
        clean_phone = ''.join(filter(str.isdigit, phone))
        
        if self.platform == Platform.ANDROID:
            return f"sms:{clean_phone}?body={encoded_msg}"
        elif self.platform == Platform.IOS:
            return f"sms:{clean_phone}&body={encoded_msg}"
        else:
            return f"sms:{clean_phone}"
    
    def generate_call_uri(self, phone: str) -> str:
        """전화 Intent URI 생성"""
        clean_phone = ''.join(filter(str.isdigit, phone))
        return f"tel:{clean_phone}"
    
    def generate_kakao_uri(self, message: str) -> str:
        """카카오톡 Intent URI 생성 (Android only)"""
        if self.platform != Platform.ANDROID:
            return ""
        
        encoded_msg = quote(message)
        return f"intent://send?text={encoded_msg}#Intent;package=com.kakao.talk;end"
    
    def generate_email_uri(
        self,
        email: str,
        subject: str,
        body: str,
    ) -> str:
        """이메일 Intent URI 생성"""
        encoded_subject = quote(subject)
        encoded_body = quote(body)
        return f"mailto:{email}?subject={encoded_subject}&body={encoded_body}"
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         MESSAGE FORMATTING
    # ═══════════════════════════════════════════════════════════════════════
    
    def format_message(
        self,
        template_key: str,
        **kwargs,
    ) -> str:
        """메시지 템플릿 포맷팅"""
        template = MESSAGE_TEMPLATES.get(template_key, "{message}")
        
        try:
            return template.format(**kwargs)
        except KeyError as e:
            # 누락된 키는 빈 문자열로 대체
            for key in ["student", "name", "amount", "due_date", 
                       "prev_score", "curr_score", "time", "message"]:
                kwargs.setdefault(key, "")
            return template.format(**kwargs)
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         ACTION EXECUTION
    # ═══════════════════════════════════════════════════════════════════════
    
    def prepare_action(
        self,
        node: Node,
        action_type: ActionType,
        template_key: str,
        extra_params: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        액션 준비 (URI 생성)
        
        실제 실행은 클라이언트(React Native/Electron)에서 수행
        """
        params = {
            "name": node.name,
            "student": node.student_name or node.name,
            "phone": node.phone,
            **(extra_params or {}),
        }
        
        message = self.format_message(template_key, **params)
        
        if action_type == ActionType.SMS:
            uri = self.generate_sms_uri(node.phone, message)
        elif action_type == ActionType.CALL:
            uri = self.generate_call_uri(node.phone)
        elif action_type == ActionType.KAKAO:
            uri = self.generate_kakao_uri(message)
        elif action_type == ActionType.EMAIL:
            uri = self.generate_email_uri(
                params.get("email", ""),
                params.get("subject", "AUTUS 알림"),
                message,
            )
        else:
            uri = ""
        
        return {
            "action_type": action_type.value,
            "uri": uri,
            "message": message,
            "node_id": node.id,
            "node_name": node.name,
            "platform": self.platform.value,
        }
    
    def prepare_batch(
        self,
        actions: list,
    ) -> list:
        """배치 액션 준비"""
        prepared = []
        
        for action in actions:
            result = self.prepare_action(
                node=action["node"],
                action_type=action["action_type"],
                template_key=action["template_key"],
                extra_params=action.get("params"),
            )
            prepared.append(result)
        
        return prepared
    
    # ═══════════════════════════════════════════════════════════════════════
    #                         REACT NATIVE BRIDGE
    # ═══════════════════════════════════════════════════════════════════════
    
    def get_react_native_code(self) -> str:
        """React Native 실행 코드 생성"""
        return """
// React Native에서 Intent 실행
import { Linking, Platform } from 'react-native';

export async function executeIntent(uri: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(uri);
    
    if (supported) {
      await Linking.openURL(uri);
      return true;
    } else {
      console.warn('Intent not supported:', uri);
      return false;
    }
  } catch (error) {
    console.error('Intent execution failed:', error);
    return false;
  }
}

// 사용 예시
// executeIntent('sms:01012345678?body=안녕하세요');
// executeIntent('tel:01012345678');
// executeIntent('intent://send?text=테스트#Intent;package=com.kakao.talk;end');
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              LEGAL NOTICE
# ═══════════════════════════════════════════════════════════════════════════

LEGAL_DISCLAIMER = """
╔═══════════════════════════════════════════════════════════════════════════╗
║                            법적 면책 조항                                  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  본 시스템은 메시지를 직접 발송하지 않습니다.                              ║
║                                                                           ║
║  동작 방식:                                                                ║
║  1. 사용자가 '발송' 버튼을 클릭합니다.                                     ║
║  2. 시스템이 OS의 기본 앱(SMS, 카카오톡 등)을 실행합니다.                  ║
║  3. 사용자가 해당 앱에서 '전송'을 직접 눌러야 메시지가 발송됩니다.         ║
║                                                                           ║
║  따라서:                                                                   ║
║  - 메시지 발송의 법적 책임은 사용자에게 있습니다.                          ║
║  - 본 시스템은 '편의 기능'을 제공할 뿐입니다.                              ║
║  - 스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.            ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
"""


# ═══════════════════════════════════════════════════════════════════════════
#                              TEST
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from core.models import Node, ActionType, NodeTier, DataSource
    
    # 테스트 노드
    test_node = Node(
        id="1",
        name="김철수",
        phone="010-1234-5678",
        student_name="김영희",
        money_total=500000,
        synergy_score=80,
        entropy_score=10,
        sq_score=75.0,
        tier=NodeTier.GOLD,
        source=DataSource.SMS,
    )
    
    # Intent Launcher 생성
    launcher = IntentLauncher(platform=Platform.ANDROID)
    
    print("=" * 60)
    print("AUTUS Intent Launcher Test")
    print("=" * 60)
    
    # SMS 액션
    sms_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.SMS,
        template_key="payment_reminder",
        extra_params={
            "due_date": "12월 20일",
            "amount": "300,000",
        },
    )
    
    print("\n[SMS Action]")
    print(f"URI: {sms_action['uri'][:80]}...")
    print(f"Message:\n{sms_action['message']}")
    
    # 카카오톡 액션
    kakao_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.KAKAO,
        template_key="score_up",
        extra_params={
            "prev_score": "75",
            "curr_score": "85",
        },
    )
    
    print("\n[KakaoTalk Action]")
    print(f"URI: {kakao_action['uri'][:80]}...")
    
    # 전화 액션
    call_action = launcher.prepare_action(
        node=test_node,
        action_type=ActionType.CALL,
        template_key="",
    )
    
    print("\n[Call Action]")
    print(f"URI: {call_action['uri']}")
    
    print("\n" + "=" * 60)
    print(LEGAL_DISCLAIMER)

























