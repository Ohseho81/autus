#!/usr/bin/env python3
"""
AUTUS 3,000명 즉시 론칭용 FastAPI
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
import os
from supabase import create_client

# ===== FastAPI 앱 =====
app = FastAPI(
    title="AUTUS API",
    description="초개인 피지컬 AI 플랫폼 - 온리쌤 백엔드",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== Supabase 클라이언트 =====
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://pphzvnaedmzcvpxjulti.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "your-service-key")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ===== Pydantic 모델 =====

class ProfileCreate(BaseModel):
    external_id: Optional[str] = None
    type: str  # 'student', 'parent', 'coach', 'admin'
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    parent_id: Optional[str] = None
    metadata: dict = {}

class PaymentCreate(BaseModel):
    student_id: str
    total_amount: int
    paid_amount: int = 0
    invoice_date: date
    due_date: date
    payment_method: Optional[str] = None
    memo: Optional[str] = None

class AttendanceCheck(BaseModel):
    student_id: str
    class_date: date
    attendance_status: str  # 'present', 'absent', 'late'

# ===== API 엔드포인트 =====

@app.get("/")
async def root():
    """헬스 체크"""
    return {
        "status": "healthy",
        "service": "AUTUS API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

# ----- Profiles -----

@app.post("/profiles")
async def create_profile(profile: ProfileCreate):
    """개인 프로필 생성"""
    try:
        result = supabase.table('profiles').insert(profile.dict()).execute()
        return {"status": "success", "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/profiles/{profile_id}")
async def get_profile(profile_id: str):
    """개인 프로필 조회"""
    try:
        result = supabase.table('profiles').select('*').eq('id', profile_id).single().execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=404, detail="Profile not found")

@app.get("/profiles")
async def list_profiles(type: Optional[str] = None, limit: int = 100):
    """프로필 목록 조회"""
    try:
        query = supabase.table('profiles').select('*')
        if type:
            query = query.eq('type', type)
        result = query.limit(limit).execute()
        return {"total": len(result.data), "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- Payments -----

@app.post("/payments")
async def create_payment(payment: PaymentCreate):
    """결제 생성"""
    try:
        # 납부 상태 자동 계산
        payment_dict = payment.dict()
        if payment.paid_amount >= payment.total_amount:
            payment_dict['payment_status'] = 'completed'
        elif payment.paid_amount > 0:
            payment_dict['payment_status'] = 'partial'
        else:
            payment_dict['payment_status'] = 'pending'

        result = supabase.table('payments').insert(payment_dict).execute()
        return {"status": "success", "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/payments/unpaid")
async def get_unpaid_payments():
    """미수금 현황 조회"""
    try:
        result = supabase.table('unpaid_payments').select('*').execute()
        return {
            "total_count": len(result.data),
            "total_unpaid": sum(p['unpaid_amount'] for p in result.data),
            "data": result.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.patch("/payments/{payment_id}")
async def update_payment(payment_id: str, paid_amount: int):
    """결제 업데이트 (수납 처리)"""
    try:
        # 기존 결제 조회
        payment = supabase.table('payments').select('*').eq('id', payment_id).single().execute()

        # 납부 금액 업데이트
        total = payment.data['total_amount']
        new_status = 'completed' if paid_amount >= total else 'partial'

        result = supabase.table('payments').update({
            'paid_amount': paid_amount,
            'payment_status': new_status,
            'payment_date': datetime.now().isoformat()
        }).eq('id', payment_id).execute()

        return {"status": "success", "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- Attendance -----

@app.post("/attendance/check")
async def check_attendance(attendance: AttendanceCheck):
    """출석 체크"""
    try:
        # class_logs에 기록
        log_data = {
            'student_id': attendance.student_id,
            'class_date': attendance.class_date.isoformat(),
            'attendance_status': attendance.attendance_status,
            'parent_notified': False
        }

        result = supabase.table('class_logs').insert(log_data).execute()

        # TODO: 카카오톡 알림 발송 (나중에 추가)

        return {"status": "success", "data": result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attendance/today")
async def today_attendance():
    """오늘 출석 현황"""
    try:
        today = date.today().isoformat()
        result = supabase.table('class_logs').select(
            '*, student:profiles(name, phone)'
        ).eq('class_date', today).execute()

        return {
            "date": today,
            "total": len(result.data),
            "present": len([x for x in result.data if x['attendance_status'] == 'present']),
            "absent": len([x for x in result.data if x['attendance_status'] == 'absent']),
            "data": result.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ----- 통계 -----

@app.get("/stats/dashboard")
async def dashboard_stats():
    """대시보드 통계"""
    try:
        # 전체 학생 수
        students = supabase.table('profiles').select('id').eq('type', 'student').execute()
        student_count = len(students.data)

        # 미수금
        unpaid = supabase.table('unpaid_payments').select('unpaid_amount').execute()
        total_unpaid = sum(p['unpaid_amount'] for p in unpaid.data)

        # 오늘 출석
        today = date.today().isoformat()
        attendance = supabase.table('class_logs').select('id').eq('class_date', today).execute()
        today_attendance = len(attendance.data)

        return {
            "student_count": student_count,
            "total_unpaid": total_unpaid,
            "unpaid_count": len(unpaid.data),
            "today_attendance": today_attendance,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ===== 실행 =====

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 AUTUS API 서버 시작")
    print("="*60 + "\n")
    print("📊 Docs: http://localhost:8000/docs")
    print("🔍 Health: http://localhost:8000/")
    print("\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
