#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Students API
학생(노드) 관리 및 SQ 계산

Routes:
- GET /: 학생 목록 (필터링, 정렬)
- POST /: 학생 등록
- GET /{id}: 학생 상세
- PUT /{id}: 학생 수정
- DELETE /{id}: 학생 삭제
- POST /import/excel: 엑셀 대량 등록
- POST /{id}/calculate-sq: 개별 SQ 재계산
- POST /calculate-all: 전체 SQ 일괄 계산
- POST /calculate-zscore: Z-Score 상대평가
"""

import io
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, UploadFile, File, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.sq_engine import SQEngine, SQInput, SQResult, CLUSTER_CONFIGS, ClusterType


router = APIRouter(prefix="/students", tags=["students"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class StudentBase(BaseModel):
    """학생 기본 정보"""
    name: str = Field(..., min_length=1, max_length=50, description="학생 이름")
    phone: Optional[str] = Field(None, max_length=20)
    school: Optional[str] = Field(None, max_length=100)
    grade: Optional[str] = Field(None, max_length=20, description="학년 (예: 중2)")
    subjects: List[str] = Field(default=[], description="수강 과목")


class StudentCreate(StudentBase):
    """학생 등록 요청"""
    parent_name: Optional[str] = Field(None, description="학부모 이름")
    parent_phone: Optional[str] = Field(None, description="학부모 연락처")
    monthly_fee: int = Field(default=300000, ge=0, description="월 수강료")
    initial_score: Optional[float] = Field(None, ge=0, le=100, description="입학 시 성적")
    potential: float = Field(default=50.0, ge=0, le=100, description="잠재력")
    emotion_cost: float = Field(default=0.0, ge=0, le=100, description="감정 소모도")
    notes: Optional[str] = None


class StudentUpdate(BaseModel):
    """학생 수정 요청"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    phone: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    subjects: Optional[List[str]] = None
    status: Optional[str] = None
    monthly_fee: Optional[int] = Field(None, ge=0)
    current_score: Optional[float] = Field(None, ge=0, le=100)
    potential: Optional[float] = Field(None, ge=0, le=100)
    emotion_cost: Optional[float] = Field(None, ge=0, le=100)
    complain_count: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None


class StudentResponse(BaseModel):
    """학생 응답"""
    id: int
    name: str
    phone: Optional[str]
    school: Optional[str]
    grade: Optional[str]
    subjects: List[str]
    status: str
    enrolled_date: date
    monthly_fee: int
    initial_score: Optional[float]
    current_score: Optional[float]
    grade_delta: float
    potential: float
    emotion_cost: float
    complain_count: int
    sq_score: float
    cluster: str
    cluster_emoji: str
    cluster_name_kr: str
    cluster_color: str
    action_hint: str
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class StudentListResponse(BaseModel):
    """학생 목록 응답"""
    total: int
    page: int
    page_size: int
    items: List[StudentResponse]
    cluster_summary: dict


class SortField(str, Enum):
    """정렬 필드"""
    NAME = "name"
    SQ_SCORE = "sq_score"
    MONTHLY_FEE = "monthly_fee"
    ENROLLED_DATE = "enrolled_date"
    COMPLAIN_COUNT = "complain_count"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 데이터 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_demo_students: List[dict] = []
_next_id = 1


def _init_demo_data():
    """데모 데이터 초기화"""
    global _demo_students, _next_id
    
    if _demo_students:
        return
    
    demo_data = [
        {"name": "김영재", "monthly_fee": 500000, "initial_score": 70, "current_score": 95, "complain_count": 0, "potential": 90, "emotion_cost": 10},
        {"name": "이우등", "monthly_fee": 450000, "initial_score": 75, "current_score": 92, "complain_count": 0, "potential": 85, "emotion_cost": 15},
        {"name": "박성실", "monthly_fee": 350000, "initial_score": 80, "current_score": 88, "complain_count": 1, "potential": 75, "emotion_cost": 20},
        {"name": "최평범", "monthly_fee": 300000, "initial_score": 70, "current_score": 75, "complain_count": 2, "potential": 60, "emotion_cost": 30},
        {"name": "정노력", "monthly_fee": 300000, "initial_score": 50, "current_score": 70, "complain_count": 1, "potential": 70, "emotion_cost": 25},
        {"name": "강미래", "monthly_fee": 400000, "initial_score": 65, "current_score": 80, "complain_count": 0, "potential": 80, "emotion_cost": 15},
        {"name": "조힘내", "monthly_fee": 250000, "initial_score": 60, "current_score": 65, "complain_count": 3, "potential": 50, "emotion_cost": 40},
        {"name": "윤걱정", "monthly_fee": 200000, "initial_score": 55, "current_score": 50, "complain_count": 4, "potential": 40, "emotion_cost": 60},
        {"name": "한불만", "monthly_fee": 150000, "initial_score": 65, "current_score": 55, "complain_count": 6, "potential": 30, "emotion_cost": 80},
        {"name": "임문제", "monthly_fee": 100000, "initial_score": 45, "current_score": 40, "complain_count": 8, "potential": 20, "emotion_cost": 90},
    ]
    
    engine = SQEngine()
    
    for i, data in enumerate(demo_data):
        student_id = i + 1
        sq_input = SQInput(
            student_id=student_id,
            student_name=data["name"],
            monthly_fee=data["monthly_fee"],
            initial_score=data["initial_score"],
            current_score=data["current_score"],
            complain_count=data["complain_count"],
            potential=data["potential"],
            emotion_cost=data["emotion_cost"]
        )
        sq_result = engine.calculate(sq_input)
        
        student = {
            "id": student_id,
            "name": data["name"],
            "phone": f"010-1234-{1000+i}",
            "school": "데모중학교",
            "grade": f"중{(i % 3) + 1}",
            "subjects": ["수학", "영어"] if i % 2 == 0 else ["수학"],
            "status": "active",
            "enrolled_date": date(2024, 1, 1),
            "monthly_fee": data["monthly_fee"],
            "initial_score": data["initial_score"],
            "current_score": data["current_score"],
            "grade_delta": (data["current_score"] or 0) - (data["initial_score"] or 0),
            "potential": data["potential"],
            "emotion_cost": data["emotion_cost"],
            "complain_count": data["complain_count"],
            "sq_score": sq_result.sq_score,
            "cluster": sq_result.cluster.value,
            "cluster_emoji": sq_result.cluster_config.emoji,
            "cluster_name_kr": sq_result.cluster_config.name_kr,
            "cluster_color": sq_result.cluster_config.color,
            "action_hint": sq_result.cluster_config.action_hint,
            "parent_name": f"학부모{i+1}",
            "parent_phone": f"010-5678-{1000+i}",
            "notes": "",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        _demo_students.append(student)
    
    _next_id = len(demo_data) + 1
    _demo_students.sort(key=lambda x: x["sq_score"], reverse=True)


def _calculate_student_sq(student_data: dict) -> dict:
    """학생 SQ 계산"""
    engine = SQEngine()
    sq_input = SQInput(
        student_id=student_data.get("id", 0),
        student_name=student_data.get("name", ""),
        monthly_fee=student_data.get("monthly_fee", 0),
        initial_score=student_data.get("initial_score"),
        current_score=student_data.get("current_score"),
        complain_count=student_data.get("complain_count", 0),
        potential=student_data.get("potential", 50),
        emotion_cost=student_data.get("emotion_cost", 0)
    )
    result = engine.calculate(sq_input)
    
    return {
        "sq_score": result.sq_score,
        "cluster": result.cluster.value,
        "cluster_emoji": result.cluster_config.emoji,
        "cluster_name_kr": result.cluster_config.name_kr,
        "cluster_color": result.cluster_config.color,
        "action_hint": result.cluster_config.action_hint,
        "grade_delta": (student_data.get("current_score") or 0) - (student_data.get("initial_score") or 0)
    }


def _get_cluster_summary(students: List[dict]) -> dict:
    """클러스터별 요약"""
    summary = {
        "golden_core": {"count": 0, "emoji": "🌟", "name_kr": "황금 핵심", "color": "#FFD700"},
        "high_potential": {"count": 0, "emoji": "🚀", "name_kr": "높은 잠재력", "color": "#4CAF50"},
        "stable_orbit": {"count": 0, "emoji": "🌙", "name_kr": "안정 궤도", "color": "#2196F3"},
        "friction_zone": {"count": 0, "emoji": "⚠️", "name_kr": "마찰 지대", "color": "#FF9800"},
        "entropy_sink": {"count": 0, "emoji": "🔴", "name_kr": "엔트로피", "color": "#F44336"},
    }
    
    for student in students:
        cluster = student.get("cluster", "stable_orbit")
        if cluster in summary:
            summary[cluster]["count"] += 1
    
    return summary


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=StudentListResponse)
async def list_students(
    page: int = Query(1, ge=1, description="페이지 번호"),
    page_size: int = Query(20, ge=1, le=100, description="페이지 크기"),
    cluster: Optional[str] = Query(None, description="클러스터 필터"),
    search: Optional[str] = Query(None, description="이름 검색"),
    sort_by: SortField = Query(SortField.SQ_SCORE, description="정렬 필드"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$", description="정렬 방향"),
):
    """학생 목록 조회"""
    _init_demo_data()
    
    filtered = _demo_students.copy()
    
    if cluster:
        filtered = [s for s in filtered if s["cluster"] == cluster]
    
    if search:
        search_lower = search.lower()
        filtered = [s for s in filtered if search_lower in s["name"].lower()]
    
    reverse = sort_order == "desc"
    sort_key = sort_by.value
    filtered.sort(key=lambda x: x.get(sort_key, 0), reverse=reverse)
    
    total = len(filtered)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = filtered[start:end]
    
    return StudentListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=page_items,
        cluster_summary=_get_cluster_summary(_demo_students)
    )


@router.post("/", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(student: StudentCreate):
    """학생 등록"""
    global _next_id
    _init_demo_data()
    
    new_student = {
        "id": _next_id,
        "name": student.name,
        "phone": student.phone,
        "school": student.school,
        "grade": student.grade,
        "subjects": student.subjects,
        "status": "active",
        "enrolled_date": date.today(),
        "monthly_fee": student.monthly_fee,
        "initial_score": student.initial_score,
        "current_score": student.initial_score,
        "potential": student.potential,
        "emotion_cost": student.emotion_cost,
        "complain_count": 0,
        "parent_name": student.parent_name,
        "parent_phone": student.parent_phone,
        "notes": student.notes,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    sq_data = _calculate_student_sq(new_student)
    new_student.update(sq_data)
    
    _demo_students.append(new_student)
    _next_id += 1
    _demo_students.sort(key=lambda x: x["sq_score"], reverse=True)
    
    return new_student


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: int):
    """학생 상세 조회"""
    _init_demo_data()
    
    for student in _demo_students:
        if student["id"] == student_id:
            return student
    
    raise HTTPException(status_code=404, detail=f"Student {student_id} not found")


@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(student_id: int, update_data: StudentUpdate):
    """학생 수정"""
    _init_demo_data()
    
    for i, student in enumerate(_demo_students):
        if student["id"] == student_id:
            update_dict = update_data.model_dump(exclude_unset=True)
            
            for key, value in update_dict.items():
                if value is not None:
                    student[key] = value
            
            student["updated_at"] = datetime.utcnow()
            sq_data = _calculate_student_sq(student)
            student.update(sq_data)
            _demo_students[i] = student
            _demo_students.sort(key=lambda x: x["sq_score"], reverse=True)
            
            return student
    
    raise HTTPException(status_code=404, detail=f"Student {student_id} not found")


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(student_id: int):
    """학생 삭제"""
    _init_demo_data()
    
    for i, student in enumerate(_demo_students):
        if student["id"] == student_id:
            _demo_students.pop(i)
            return
    
    raise HTTPException(status_code=404, detail=f"Student {student_id} not found")


@router.post("/{student_id}/calculate-sq", response_model=StudentResponse)
async def recalculate_student_sq(student_id: int):
    """개별 학생 SQ 재계산"""
    _init_demo_data()
    
    for i, student in enumerate(_demo_students):
        if student["id"] == student_id:
            sq_data = _calculate_student_sq(student)
            student.update(sq_data)
            student["updated_at"] = datetime.utcnow()
            _demo_students[i] = student
            return student
    
    raise HTTPException(status_code=404, detail=f"Student {student_id} not found")


@router.post("/calculate-all")
async def calculate_all_sq(
    mode: str = Query("absolute", pattern="^(absolute|relative|both)$", description="평가 모드")
):
    """
    전체 학생 SQ 일괄 계산
    - absolute: 절대평가 (고정 임계값)
    - relative: 상대평가 (Z-Score)
    - both: 둘 다
    """
    _init_demo_data()
    
    engine = SQEngine()
    inputs = [
        SQInput(
            student_id=s["id"],
            student_name=s["name"],
            monthly_fee=s.get("monthly_fee", 0),
            initial_score=s.get("initial_score"),
            current_score=s.get("current_score"),
            complain_count=s.get("complain_count", 0),
            potential=s.get("potential", 50),
            emotion_cost=s.get("emotion_cost", 0)
        )
        for s in _demo_students
    ]
    
    result_data = {
        "success": True,
        "calculated_count": len(_demo_students),
        "mode": mode,
    }
    
    if mode in ["absolute", "both"]:
        for i, student in enumerate(_demo_students):
            sq_data = _calculate_student_sq(student)
            student.update(sq_data)
            _demo_students[i] = student
        
        _demo_students.sort(key=lambda x: x["sq_score"], reverse=True)
        result_data["cluster_summary"] = _get_cluster_summary(_demo_students)
    
    if mode in ["relative", "both"]:
        zscore_results = engine.calculate_batch_with_zscore(inputs)
        zscore_map = {r.student_id: r for r in zscore_results}
        
        for i, student in enumerate(_demo_students):
            if student["id"] in zscore_map:
                zr = zscore_map[student["id"]]
                student["z_score"] = zr.z_score
                student["tier"] = zr.tier
                student["tier_emoji"] = zr.tier_metadata.get("emoji", "")
                student["tier_name_kr"] = zr.tier_metadata.get("name_kr", zr.tier)
                student["rank"] = zr.rank
                student["rank_suffix"] = zr.rank_suffix
                _demo_students[i] = student
        
        result_data["zscore_statistics"] = engine.get_zscore_statistics(zscore_results)
        
        tier_dist = {}
        for tier in ["DIAMOND", "PLATINUM", "GOLD", "STEEL", "IRON"]:
            tier_dist[tier] = len([s for s in _demo_students if s.get("tier") == tier])
        result_data["tier_distribution"] = tier_dist
    
    result_data["message"] = f"{len(_demo_students)}명의 SQ 점수가 재계산되었습니다. (모드: {mode})"
    
    return result_data


@router.post("/calculate-zscore")
async def calculate_zscore_ranking():
    """Z-Score 기반 상대평가"""
    _init_demo_data()
    
    engine = SQEngine()
    inputs = [
        SQInput(
            student_id=s["id"],
            student_name=s["name"],
            monthly_fee=s.get("monthly_fee", 0),
            initial_score=s.get("initial_score"),
            current_score=s.get("current_score"),
            complain_count=s.get("complain_count", 0),
            potential=s.get("potential", 50),
            emotion_cost=s.get("emotion_cost", 0)
        )
        for s in _demo_students
    ]
    
    zscore_results = engine.calculate_batch_with_zscore(inputs)
    
    ranking = []
    for r in zscore_results:
        ranking.append({
            "rank": r.rank,
            "student_id": r.student_id,
            "student_name": r.student_name,
            "sq_score": r.sq_score,
            "z_score": r.z_score,
            "tier": r.tier,
            "tier_emoji": r.tier_metadata.get("emoji", ""),
            "tier_name_kr": r.tier_metadata.get("name_kr", r.tier),
            "percentile": r.percentile,
            "rank_suffix": r.rank_suffix
        })
    
    return {
        "success": True,
        "total_count": len(ranking),
        "ranking": ranking,
        "statistics": engine.get_zscore_statistics(zscore_results),
        "interpretation": {
            "DIAMOND": "상위 5% - VIP 최우선 관리",
            "PLATINUM": "상위 15% - 핵심 고객 유지",
            "GOLD": "상위 30% - 승급 유도",
            "STEEL": "중위권 - 관리 강화",
            "IRON": "하위권 - 정리 검토"
        }
    }


@router.get("/demo/reset")
async def reset_demo_data():
    """데모 데이터 초기화"""
    global _demo_students, _next_id
    _demo_students = []
    _next_id = 1
    _init_demo_data()
    
    return {
        "success": True,
        "message": "Demo data has been reset",
        "student_count": len(_demo_students)
    }


@router.post("/sync/google")
async def sync_google_data(
    access_token: str = Query(..., description="Google OAuth Access Token"),
    days: int = Query(30, ge=1, le=90, description="동기화 기간 (일)")
):
    """Google 데이터 동기화 (Zero-Click)"""
    from services.google_sync import GoogleSyncManager
    
    manager = GoogleSyncManager(access_token=access_token)
    sync_results = manager.sync_all(calendar_days=days)
    entropy_data = manager.get_entropy_score(days=days)
    
    return {
        "success": True,
        "calendar": {
            "synced": sync_results["calendar"].synced_count,
            "consults": sync_results["calendar"].consult_count,
            "complaints": sync_results["calendar"].complaint_count
        },
        "contacts": {
            "synced": sync_results["contacts"].synced_count
        },
        "entropy_analysis": entropy_data,
        "message": f"Google 데이터 동기화 완료 (최근 {days}일)"
    }
