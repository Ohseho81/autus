#!/usr/bin/env python3
"""
온리쌤 Solapi 연동 모듈
카카오톡 알림톡/친구톡 발송
"""

import os
import hashlib
import hmac
import requests
import json
from datetime import datetime
from typing import Dict, List, Optional
import uuid

# Solapi 설정
SOLAPI_API_KEY = os.getenv('SOLAPI_API_KEY', 'YOUR_API_KEY')
SOLAPI_API_SECRET = os.getenv('SOLAPI_API_SECRET', 'YOUR_API_SECRET')
SOLAPI_SENDER = os.getenv('SOLAPI_SENDER', '010-1234-5678')  # 발신번호
KAKAO_CHANNEL_ID = os.getenv('KAKAO_CHANNEL_ID', '@onlyssam')  # 카카오 채널 ID

class SolapiClient:
    """Solapi 카카오톡 발송 클라이언트"""

    BASE_URL = "https://api.solapi.com"

    def __init__(self, api_key: str = SOLAPI_API_KEY, api_secret: str = SOLAPI_API_SECRET):
        self.api_key = api_key
        self.api_secret = api_secret

    def _generate_signature(self, date: str, salt: str) -> str:
        """HMAC-SHA256 서명 생성"""
        message = f"{date}{salt}"
        signature = hmac.new(
            self.api_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        return signature

    def _get_headers(self) -> Dict[str, str]:
        """API 요청 헤더 생성"""
        date = datetime.utcnow().isoformat() + 'Z'
        salt = str(uuid.uuid4())
        signature = self._generate_signature(date, salt)

        return {
            'Authorization': f'HMAC-SHA256 apiKey={self.api_key}, date={date}, salt={salt}, signature={signature}',
            'Content-Type': 'application/json'
        }

    def send_alimtalk(
        self,
        to: str,
        template_code: str,
        variables: Dict[str, str],
        buttons: Optional[List[Dict]] = None
    ) -> Dict:
        """
        알림톡 발송

        Args:
            to: 수신번호 (01012345678)
            template_code: 템플릿 코드 (예: attendance_checked)
            variables: 템플릿 변수 딕셔너리
            buttons: 버튼 리스트 (선택)

        Returns:
            발송 결과
        """
        # 전화번호 정규화 (하이픈 제거)
        to = to.replace('-', '')

        # 메시지 데이터 구성
        message = {
            'to': to,
            'from': SOLAPI_SENDER.replace('-', ''),
            'kakaoOptions': {
                'pfId': KAKAO_CHANNEL_ID,
                'templateId': template_code,
                'variables': variables
            }
        }

        # 버튼 추가
        if buttons:
            message['kakaoOptions']['buttons'] = buttons

        # API 요청
        try:
            response = requests.post(
                f"{self.BASE_URL}/messages/v4/send",
                headers=self._get_headers(),
                json={'messages': [message]}
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"❌ 알림톡 발송 실패: {e}")
            return {"error": str(e)}

    def send_friendtalk(
        self,
        to: str,
        message: str,
        buttons: Optional[List[Dict]] = None,
        image_url: Optional[str] = None
    ) -> Dict:
        """
        친구톡 발송

        Args:
            to: 수신번호
            message: 메시지 내용
            buttons: 버튼 리스트 (선택)
            image_url: 이미지 URL (선택)

        Returns:
            발송 결과
        """
        to = to.replace('-', '')

        kakao_options = {
            'pfId': KAKAO_CHANNEL_ID,
            'messageType': 'FT',  # FriendTalk
            'message': message
        }

        if buttons:
            kakao_options['buttons'] = buttons

        if image_url:
            kakao_options['imageUrl'] = image_url

        msg = {
            'to': to,
            'from': SOLAPI_SENDER.replace('-', ''),
            'kakaoOptions': kakao_options
        }

        try:
            response = requests.post(
                f"{self.BASE_URL}/messages/v4/send",
                headers=self._get_headers(),
                json={'messages': [msg]}
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"❌ 친구톡 발송 실패: {e}")
            return {"error": str(e)}

    def send_batch(self, messages: List[Dict]) -> Dict:
        """
        배치 발송 (최대 500건)

        Args:
            messages: 메시지 리스트

        Returns:
            발송 결과
        """
        try:
            response = requests.post(
                f"{self.BASE_URL}/messages/v4/send",
                headers=self._get_headers(),
                json={'messages': messages}
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            print(f"❌ 배치 발송 실패: {e}")
            return {"error": str(e)}


# ===== 온리쌤 전용 알림 함수 =====

def notify_attendance_checked(student_name: str, parent_phone: str, check_time: str):
    """출석 체크 알림"""
    client = SolapiClient()

    result = client.send_alimtalk(
        to=parent_phone,
        template_code='attendance_checked',
        variables={
            'student_name': student_name,
            'check_time': check_time
        }
    )

    print(f"✅ 출석 알림 발송: {student_name} → {parent_phone}")
    return result


def notify_absence(student_name: str, parent_phone: str, class_time: str):
    """결석 알림"""
    client = SolapiClient()

    result = client.send_alimtalk(
        to=parent_phone,
        template_code='absence_alert',
        variables={
            'student_name': student_name,
            'class_time': class_time
        }
    )

    print(f"⚠️ 결석 알림 발송: {student_name} → {parent_phone}")
    return result


def notify_class_result(
    student_name: str,
    parent_phone: str,
    class_date: str,
    attendance_emoji: str,
    coach_comment: str
):
    """수업 결과 알림"""
    client = SolapiClient()

    result = client.send_alimtalk(
        to=parent_phone,
        template_code='class_result',
        variables={
            'student_name': student_name,
            'class_date': class_date,
            'attendance_emoji': attendance_emoji,
            'coach_comment': coach_comment
        }
    )

    print(f"📊 수업 결과 알림 발송: {student_name} → {parent_phone}")
    return result


def notify_payment_completed(
    student_name: str,
    parent_phone: str,
    amount: int,
    payment_date: str,
    receipt_url: str
):
    """결제 완료 알림"""
    client = SolapiClient()

    result = client.send_alimtalk(
        to=parent_phone,
        template_code='payment_completed',
        variables={
            'student_name': student_name,
            'amount': f"{amount:,}",
            'payment_date': payment_date,
            'receipt_url': receipt_url
        }
    )

    print(f"💳 결제 완료 알림 발송: {student_name} → {parent_phone}")
    return result


def notify_payment_reminder(
    student_name: str,
    parent_phone: str,
    unpaid_amount: int,
    due_date: str,
    payment_url: str
):
    """미수금 알림"""
    client = SolapiClient()

    result = client.send_alimtalk(
        to=parent_phone,
        template_code='payment_reminder',
        variables={
            'student_name': student_name,
            'unpaid_amount': f"{unpaid_amount:,}",
            'due_date': due_date,
            'payment_url': payment_url
        }
    )

    print(f"💰 미수금 알림 발송: {student_name} → {parent_phone}")
    return result


def send_special_class_announcement(phone_list: List[str]):
    """방학특강 안내 (친구톡)"""
    client = SolapiClient()

    messages = []
    for phone in phone_list:
        messages.append({
            'to': phone.replace('-', ''),
            'from': SOLAPI_SENDER.replace('-', ''),
            'kakaoOptions': {
                'pfId': KAKAO_CHANNEL_ID,
                'messageType': 'FT',
                'message': '''🏐 방학특강 모집!

기간: 3/1(월) ~ 3/7(일)
시간: 오전 10시 ~ 12시
대상: 초등 3학년 ~ 중등 전학년

🎯 특별 혜택
- 조기등록 10% 할인
- 유니폼 무료 제공

📌 정원 20명 (선착순)

지금 바로 신청하세요!''',
                'buttons': [
                    {
                        'buttonType': 'WL',
                        'buttonName': '신청하기',
                        'linkMo': 'https://payssam.kr/special',
                        'linkPc': 'https://payssam.kr/special'
                    }
                ]
            }
        })

    # 200건씩 배치 발송
    batch_size = 200
    for i in range(0, len(messages), batch_size):
        batch = messages[i:i+batch_size]
        result = client.send_batch(batch)
        print(f"📢 방학특강 안내 발송: {len(batch)}건 ({i+1}~{i+len(batch)})")

    return {"total": len(messages)}


# ===== 테스트 코드 =====

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🧪 온리쌤 Solapi 연동 테스트")
    print("="*60 + "\n")

    # 1. 출석 알림 테스트
    print("1️⃣ 출석 알림 테스트")
    notify_attendance_checked(
        student_name="오선우",
        parent_phone="010-2048-6048",
        check_time="16:00"
    )

    # 2. 결석 알림 테스트
    print("\n2️⃣ 결석 알림 테스트")
    notify_absence(
        student_name="오선우",
        parent_phone="010-2048-6048",
        class_time="16:00"
    )

    # 3. 수업 결과 알림 테스트
    print("\n3️⃣ 수업 결과 알림 테스트")
    notify_class_result(
        student_name="오선우",
        parent_phone="010-2048-6048",
        class_date="2026-02-14",
        attendance_emoji="✅",
        coach_comment="스파이크 연습 집중도가 높았습니다. 다음 시간에는 블로킹 연습 예정입니다."
    )

    print("\n" + "="*60)
    print("✅ 테스트 완료!")
    print("="*60 + "\n")
