#!/usr/bin/env python3
"""
class_logs 기반 학부모 자동 알림 발송
미발송(parent_notified=false) 수업 기록을 카카오톡으로 전송
"""
import requests
import json
from supabase import create_client
from datetime import datetime

# 카카오톡 API
KAKAO_API_KEY = "your-kakao-api-key-here"
KAKAO_API_URL = "https://kapi.kakao.com/v2/api/talk/memo/default/send"

# Supabase
SUPABASE_URL = "https://pphzvnaedmzcvpxjulti.supabase.co"
SUPABASE_KEY = "your-supabase-service-role-key-here"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def send_kakao_message(title, description):
    """카카오톡 나에게 보내기"""
    headers = {
        "Authorization": f"Bearer {KAKAO_API_KEY}",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    template = {
        "object_type": "text",
        "text": f"{title}\n\n{description}",
        "link": {
            "web_url": "https://payssam.kr",
            "mobile_web_url": "https://payssam.kr"
        }
    }

    data = {"template_object": json.dumps(template)}

    try:
        response = requests.post(KAKAO_API_URL, headers=headers, data=data)
        response.raise_for_status()
        print(f"  ✅ 카카오톡 발송 성공")
        return True
    except Exception as e:
        print(f"  ❌ 카카오톡 발송 실패: {e}")
        return False


def format_class_log_message(log):
    """수업 결과를 학부모 메시지로 포맷팅"""

    # 출석 상태 이모지
    attendance_emoji = {
        'present': '✅ 정상 출석',
        'late': '⏰ 지각',
        'absent': '❌ 결석',
        'excused': '📋 사유 결석'
    }

    # 학생 컨디션 이모지
    mood_emoji = {
        'great': '🌟',
        'good': '😊',
        'okay': '😐',
        'tired': '😓',
        'frustrated': '😟'
    }

    # 날짜 포맷
    class_date = datetime.strptime(log['class_date'], '%Y-%m-%d')
    date_str = class_date.strftime('%Y년 %m월 %d일 (%a)')

    # 메시지 구성
    title = "📚 오늘의 수업 결과"

    description_parts = [
        f"👤 학생: {log['atb_students']['name']}",
        f"📅 날짜: {date_str}",
    ]

    if log.get('class_time'):
        description_parts.append(f"⏰ 시간: {log['class_time']}")

    if log.get('coach_name'):
        description_parts.append(f"👨‍🏫 강사: {log['coach_name']}")

    description_parts.append("")  # 빈 줄

    # 출석
    if log.get('attendance_status'):
        description_parts.append(attendance_emoji.get(log['attendance_status'], '출석'))

    # 수업 내용
    if log.get('skill_focus'):
        description_parts.append(f"🎯 오늘 연습: {log['skill_focus']}")

    # 점수
    if log.get('performance_score'):
        stars = '⭐' * min(log['performance_score'], 10)
        description_parts.append(f"📊 수업 점수: {log['performance_score']}/10 {stars}")

    # 강사 코멘트
    if log.get('coach_comment'):
        description_parts.append("")
        description_parts.append("📝 강사 코멘트:")
        description_parts.append(log['coach_comment'])

    # 학생 컨디션
    if log.get('student_mood'):
        mood = mood_emoji.get(log['student_mood'], '')
        description_parts.append("")
        description_parts.append(f"💪 학생 컨디션: {mood}")

    description_parts.append("")
    description_parts.append("다음 수업도 화이팅! 🏐")

    return title, "\n".join(description_parts)


def send_pending_notifications():
    """미발송 수업 결과 알림 전송"""
    print("🔍 미발송 수업 결과 조회 중...")

    # parent_notified = false인 기록 조회
    try:
        result = supabase.table('class_logs')\
            .select('*, atb_students(id, name, parent_phone)')\
            .eq('parent_notified', False)\
            .order('class_date', desc=True)\
            .execute()

        logs = result.data

        if not logs:
            print("📭 발송할 알림이 없습니다.")
            return

        print(f"📬 총 {len(logs)}건의 미발송 알림 발견\n")

        sent_count = 0

        for idx, log in enumerate(logs, 1):
            student_name = log['atb_students']['name']
            class_date = log['class_date']

            print(f"[{idx}/{len(logs)}] {student_name} - {class_date}")

            # 메시지 생성
            title, description = format_class_log_message(log)

            # 카카오톡 발송
            if send_kakao_message(title, description):
                # 발송 완료 업데이트
                supabase.table('class_logs')\
                    .update({
                        'parent_notified': True,
                        'notification_sent_at': datetime.now().isoformat()
                    })\
                    .eq('id', log['id'])\
                    .execute()

                sent_count += 1

            print()  # 빈 줄

        print("=" * 50)
        print(f"🎉 알림 발송 완료!")
        print(f"✅ 성공: {sent_count}/{len(logs)}건")
        print("=" * 50)

    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("=" * 50)
    print("📱 온리쌤 수업 결과 자동 알림 시스템")
    print("=" * 50)
    print()

    send_pending_notifications()
