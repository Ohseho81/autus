#!/usr/bin/env python3
"""
AUTUS 카카오톡 알림 시스템
Supabase 데이터 기반 자동 알림 발송
"""
import requests
import json
from datetime import datetime, timedelta
from supabase import create_client

# 카카오톡 API 설정
KAKAO_API_KEY = "your-kakao-api-key-here"
KAKAO_API_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send"

# Supabase 설정
SUPABASE_URL = "https://pphzvnaedmzcvpxjulti.supabase.co"
SUPABASE_KEY = "your-supabase-service-role-key-here"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


class KakaoNotifier:
    """카카오톡 알림 발송 클래스"""

    def __init__(self, api_key):
        self.api_key = api_key
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/x-www-form-urlencoded"
        }

    def send_message(self, template_object):
        """카카오톡 나에게 보내기 (테스트용)"""
        data = {
            "template_object": json.dumps(template_object)
        }

        try:
            response = requests.post(
                KAKAO_API_URL,
                headers=self.headers,
                data=data
            )
            response.raise_for_status()
            print(f"✅ 메시지 전송 성공: {response.json()}")
            return True
        except Exception as e:
            print(f"❌ 메시지 전송 실패: {e}")
            return False

    def create_text_template(self, title, description):
        """텍스트 템플릿 생성"""
        return {
            "object_type": "text",
            "text": f"{title}\n\n{description}",
            "link": {
                "web_url": "https://payssam.kr",
                "mobile_web_url": "https://payssam.kr"
            }
        }


class AutoNotificationSystem:
    """자동 알림 시스템"""

    def __init__(self):
        self.kakao = KakaoNotifier(KAKAO_API_KEY)

    def notify_upcoming_lessons(self):
        """수업 시작 30분 전 알림"""
        print("\n📚 수업 시작 알림 확인 중...")

        # 30분 후 시간
        target_time = datetime.now() + timedelta(minutes=30)

        # TODO: Supabase에서 해당 시간의 수업 조회
        # memberships 테이블에서 start_date가 오늘이고, 시작 시간이 30분 후인 수업

        template = self.kakao.create_text_template(
            "🏐 수업 시작 알림",
            f"30분 후 수업이 시작됩니다!\n온리쌤에서 뵙겠습니다 😊"
        )

        return self.kakao.send_message(template)

    def notify_payment_due(self):
        """결제/미수금 알림"""
        print("\n💰 결제 알림 확인 중...")

        # Supabase에서 미수금이 있는 학생 조회
        try:
            result = supabase.table('payments')\
                .select('*, students(name, parent_phone)')\
                .eq('payment_status', 'unpaid')\
                .execute()

            unpaid_count = len(result.data)
            print(f"📊 미수금 학생: {unpaid_count}명")

            if unpaid_count > 0:
                template = self.kakao.create_text_template(
                    "💳 결제 안내",
                    f"미수금이 있는 학생: {unpaid_count}명\n결제 확인이 필요합니다."
                )
                return self.kakao.send_message(template)

        except Exception as e:
            print(f"❌ 결제 정보 조회 실패: {e}")

        return False

    def notify_new_student(self, student_name, parent_phone):
        """신규 학생 환영 메시지"""
        print(f"\n👋 신규 학생 환영: {student_name}")

        template = self.kakao.create_text_template(
            "🎉 온리쌤에 오신 것을 환영합니다!",
            f"{student_name} 학생, 환영합니다!\n\n"
            f"📞 문의사항이 있으시면 언제든 연락주세요.\n"
            f"💪 열심히 지도하겠습니다!"
        )

        return self.kakao.send_message(template)

    def daily_summary(self):
        """일일 요약 알림"""
        print("\n📊 일일 요약 생성 중...")

        try:
            # 전체 학생 수
            students_count = supabase.table('students')\
                .select('id', count='exact')\
                .execute()

            # 미수금 현황
            unpaid = supabase.table('payments')\
                .select('id', count='exact')\
                .eq('payment_status', 'unpaid')\
                .execute()

            template = self.kakao.create_text_template(
                "📊 온리쌤 일일 현황",
                f"👥 전체 학생: {students_count.count}명\n"
                f"💰 미수금 학생: {unpaid.count}명\n\n"
                f"오늘도 좋은 하루 되세요! 🏐"
            )

            return self.kakao.send_message(template)

        except Exception as e:
            print(f"❌ 요약 생성 실패: {e}")
            return False


def main():
    """메인 실행 함수"""
    print("🚀 AUTUS 카카오톡 자동 알림 시스템\n")

    notifier = AutoNotificationSystem()

    # 테스트: 일일 요약 발송
    print("=" * 50)
    print("📬 테스트: 일일 요약 발송")
    print("=" * 50)
    notifier.daily_summary()

    print("\n" + "=" * 50)
    print("📬 테스트: 결제 알림")
    print("=" * 50)
    notifier.notify_payment_due()

    print("\n✅ 알림 시스템 테스트 완료!")
    print("\n💡 자동화 방법:")
    print("1. cron으로 정기 실행 (매일 아침 9시)")
    print("2. Supabase Edge Function으로 이벤트 트리거")
    print("3. GitHub Actions로 스케줄 실행")


if __name__ == "__main__":
    main()
