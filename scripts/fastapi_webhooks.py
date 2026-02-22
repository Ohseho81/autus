#!/usr/bin/env python3
"""
온리쌤 FastAPI 웹훅 예시
Supabase → FastAPI → Solapi 연동
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from supabase import create_client
from solapi_integration import (
    notify_attendance_checked,
    notify_absence,
    notify_class_result,
    notify_payment_completed,
    notify_payment_reminder
)

# FastAPI 앱 생성
app = FastAPI(title="온리쌤 알림 API")

# Supabase 클라이언트
SUPABASE_URL = "https://pphzvnaedmzcvpxjulti.supabase.co"
SUPABASE_SERVICE_KEY = "your-supabase-service-role-key-here"

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


# ===== Pydantic 모델 =====

class AttendanceWebhook(BaseModel):
    """출석 체크 웹훅"""
    student_id: str
    class_date: str
    attendance_status: str


class PaymentWebhook(BaseModel):
    """결제 웹훅"""
    student_id: str
    amount: int
    payment_date: str


class AbsenceWebhook(BaseModel):
    """결석 웹훅"""
    student_id: str
    class_date: str


class ClassResultWebhook(BaseModel):
    """수업 결과 웹훅"""
    student_id: str
    class_date: str
    attendance_status: str
    coach_comment: str


# ===== 웹훅 엔드포인트 =====

@app.post("/webhooks/attendance")
async def webhook_attendance(data: AttendanceWebhook):
    """
    출석 체크 웹훅
    Supabase Trigger → FastAPI → Solapi
    """
    try:
        # 1. 학생 정보 조회
        student = supabase.table('atb_students').select('*').eq('id', data.student_id).single().execute()

        if not student.data:
            raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")

        # 2. 알림톡 발송
        if data.attendance_status == 'present':
            result = notify_attendance_checked(
                student_name=student.data['name'],
                parent_phone=student.data['parent_phone'],
                check_time=datetime.now().strftime('%H:%M')
            )
        else:
            result = notify_absence(
                student_name=student.data['name'],
                parent_phone=student.data['parent_phone'],
                class_time=datetime.now().strftime('%H:%M')
            )

        # 3. 알림 기록 저장
        supabase.table('notifications').insert({
            'student_id': data.student_id,
            'notification_type': 'attendance',
            'message': f"{student.data['name']} 출석 알림",
            'sent_at': datetime.now().isoformat(),
            'status': 'sent' if 'error' not in result else 'failed'
        }).execute()

        return {"status": "success", "result": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhooks/payment")
async def webhook_payment(data: PaymentWebhook):
    """
    결제 완료 웹훅
    카카오페이 → FastAPI → Solapi
    """
    try:
        # 1. 학생 정보 조회
        student = supabase.table('atb_students').select('*').eq('id', data.student_id).single().execute()

        if not student.data:
            raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")

        # 2. 결제 완료 알림
        result = notify_payment_completed(
            student_name=student.data['name'],
            parent_phone=student.data['parent_phone'],
            amount=data.amount,
            payment_date=data.payment_date,
            receipt_url=f"https://payssam.kr/receipts/{data.student_id}"
        )

        # 3. 알림 기록 저장
        supabase.table('notifications').insert({
            'student_id': data.student_id,
            'notification_type': 'payment',
            'message': f"{student.data['name']} 결제 완료 알림",
            'sent_at': datetime.now().isoformat(),
            'status': 'sent' if 'error' not in result else 'failed'
        }).execute()

        return {"status": "success", "result": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhooks/absence")
async def webhook_absence(data: AbsenceWebhook):
    """
    결석 자동 감지 웹훅
    Supabase Edge Function → FastAPI → Solapi
    """
    try:
        # 1. 학생 정보 조회
        student = supabase.table('atb_students').select('*').eq('id', data.student_id).single().execute()

        if not student.data:
            raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")

        # 2. 결석 알림
        result = notify_absence(
            student_name=student.data['name'],
            parent_phone=student.data['parent_phone'],
            class_time=datetime.now().strftime('%H:%M')
        )

        # 3. class_logs에 결석 기록 저장
        supabase.table('class_logs').insert({
            'student_id': data.student_id,
            'class_date': data.class_date,
            'attendance_status': 'absent',
            'parent_notified': True,
            'notification_sent_at': datetime.now().isoformat()
        }).execute()

        # 4. 알림 기록
        supabase.table('notifications').insert({
            'student_id': data.student_id,
            'notification_type': 'absence',
            'message': f"{student.data['name']} 결석 알림",
            'sent_at': datetime.now().isoformat(),
            'status': 'sent' if 'error' not in result else 'failed'
        }).execute()

        return {"status": "success", "result": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhooks/class-result")
async def webhook_class_result(data: ClassResultWebhook):
    """
    수업 결과 자동 알림 웹훅
    class_logs INSERT → FastAPI → Solapi
    """
    try:
        # 1. 학생 정보 조회
        student = supabase.table('atb_students').select('*').eq('id', data.student_id).single().execute()

        if not student.data:
            raise HTTPException(status_code=404, detail="학생을 찾을 수 없습니다")

        # 2. 출석 이모지 결정
        attendance_emoji = "✅" if data.attendance_status == "present" else "⏰" if data.attendance_status == "late" else "❌"

        # 3. 수업 결과 알림
        result = notify_class_result(
            student_name=student.data['name'],
            parent_phone=student.data['parent_phone'],
            class_date=data.class_date,
            attendance_emoji=attendance_emoji,
            coach_comment=data.coach_comment
        )

        # 4. class_logs 업데이트 (parent_notified = true)
        supabase.table('class_logs').update({
            'parent_notified': True,
            'notification_sent_at': datetime.now().isoformat()
        }).eq('student_id', data.student_id).eq('class_date', data.class_date).execute()

        # 5. 알림 기록
        supabase.table('notifications').insert({
            'student_id': data.student_id,
            'notification_type': 'class_result',
            'message': f"{student.data['name']} 수업 결과 알림",
            'sent_at': datetime.now().isoformat(),
            'status': 'sent' if 'error' not in result else 'failed'
        }).execute()

        return {"status": "success", "result": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ===== 배치 작업 =====

@app.post("/batch/payment-reminders")
async def batch_payment_reminders():
    """
    미수금 일괄 알림 (매주 월요일 실행)
    """
    try:
        # 1. 미수금 조회
        unpaid = supabase.table('payments').select(
            '*, student:atb_students(*)'
        ).lt('paid_amount', 'total_amount').execute()

        success_count = 0
        error_count = 0

        # 2. 알림 발송
        for payment in unpaid.data:
            try:
                unpaid_amount = payment['total_amount'] - payment['paid_amount']

                notify_payment_reminder(
                    student_name=payment['student']['name'],
                    parent_phone=payment['student']['parent_phone'],
                    unpaid_amount=unpaid_amount,
                    due_date="2026-03-01",
                    payment_url=f"https://payssam.kr/payments/{payment['id']}"
                )

                success_count += 1

            except Exception as e:
                print(f"❌ 알림 발송 실패: {payment['student']['name']} - {e}")
                error_count += 1

        return {
            "total": len(unpaid.data),
            "success": success_count,
            "error": error_count
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== 실행 =====

if __name__ == '__main__':
    import uvicorn
    print("\n" + "="*60)
    print("🚀 온리쌤 FastAPI 서버 시작")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
