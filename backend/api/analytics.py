#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Analytics API
학원 건강도 및 SQ 분석

Routes:
- GET /health: 학원 전체 건강도
- GET /cluster-stats: 클러스터별 통계
- GET /recommendations: AI 권장 조치
- GET /trends: SQ 트렌드 분석
- GET /compare: 기간별 비교
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Query
from pydantic import BaseModel

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.sq_engine import SQEngine, SQInput, ClusterType, CLUSTER_CONFIGS


router = APIRouter(prefix="/analytics", tags=["analytics"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Response Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class HealthResponse(BaseModel):
    """학원 건강도 응답"""
    health_score: float
    status: str
    status_kr: str
    total_students: int
    total_sq: float
    avg_sq: float
    cluster_distribution: Dict[str, int]
    recommendations: List[str]


class ClusterStatsResponse(BaseModel):
    """클러스터 통계 응답"""
    clusters: Dict[str, Any]
    total_students: int


class TrendDataPoint(BaseModel):
    """트렌드 데이터 포인트"""
    date: str
    avg_sq: float
    total_students: int
    golden_count: int
    entropy_count: int


class TrendResponse(BaseModel):
    """트렌드 응답"""
    period: str
    data_points: List[TrendDataPoint]
    summary: Dict[str, Any]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데모 데이터 (students.py와 공유)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _get_sq_results(students: List[dict]):
    """학생 데이터를 SQResult로 변환"""
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
        for s in students
    ]
    return engine.calculate_batch(inputs)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/health", response_model=HealthResponse)
async def get_academy_health():
    """
    학원 전체 건강도 분석
    
    - health_score: 0~100 (100이 최상)
    - 클러스터 분포 기반 계산
    - AI 권장 조치 포함
    """
    students = _get_demo_students()
    
    if not students:
        return HealthResponse(
            health_score=0,
            status="no_data",
            status_kr="데이터 없음",
            total_students=0,
            total_sq=0,
            avg_sq=0,
            cluster_distribution={},
            recommendations=["학생 데이터를 등록해주세요."]
        )
    
    results = _get_sq_results(students)
    engine = SQEngine()
    health = engine.calculate_academy_health(results)
    
    return HealthResponse(**health)


@router.get("/cluster-stats", response_model=ClusterStatsResponse)
async def get_cluster_stats():
    """클러스터별 상세 통계"""
    students = _get_demo_students()
    results = _get_sq_results(students)
    
    engine = SQEngine()
    stats = engine.get_cluster_stats(results)
    
    return ClusterStatsResponse(
        clusters=stats,
        total_students=len(students)
    )


@router.get("/recommendations")
async def get_recommendations():
    """
    AI 권장 조치 목록
    
    - 클러스터별 액션 아이템
    - 우선순위 정렬
    """
    students = _get_demo_students()
    results = _get_sq_results(students)
    engine = SQEngine()
    health = engine.calculate_academy_health(results)
    
    # 추가 분석
    golden_students = [s for s in students if s.get("cluster") == "golden_core"]
    potential_students = [s for s in students if s.get("cluster") == "high_potential"]
    friction_students = [s for s in students if s.get("cluster") == "friction_zone"]
    entropy_students = [s for s in students if s.get("cluster") == "entropy_sink"]
    
    actions = []
    
    # 골든 코어 VIP 관리
    if golden_students:
        actions.append({
            "priority": 1,
            "category": "VIP 관리",
            "emoji": "🌟",
            "title": f"Golden Core {len(golden_students)}명 VIP 케어",
            "description": "추가 과목 제안, 장기 등록 할인, 추천 인센티브 제공",
            "students": [s["name"] for s in golden_students[:5]],
            "expected_impact": "월 매출 +15% 기대"
        })
    
    # 승급 가능 학생
    upgradable = [s for s in potential_students if s.get("sq_score", 0) >= 75]
    if upgradable:
        actions.append({
            "priority": 2,
            "category": "승급 유도",
            "emoji": "🚀",
            "title": f"Golden Core 승급 가능 {len(upgradable)}명",
            "description": "집중 관리로 상위 클러스터 승급 유도",
            "students": [s["name"] for s in upgradable[:5]],
            "expected_impact": "LTV +20% 상승"
        })
    
    # 마찰 지대 관리
    if friction_students:
        actions.append({
            "priority": 3,
            "category": "불만 해소",
            "emoji": "⚠️",
            "title": f"마찰 지대 {len(friction_students)}명 관리 필요",
            "description": "불만 요인 파악, 개별 상담, 서비스 개선",
            "students": [s["name"] for s in friction_students[:5]],
            "expected_impact": "이탈 방지 효과"
        })
    
    # 엔트로피 정리
    if entropy_students:
        actions.append({
            "priority": 4,
            "category": "정리 검토",
            "emoji": "🔴",
            "title": f"엔트로피 {len(entropy_students)}명 정리 검토",
            "description": "퇴원 유도 또는 집중 복구, 손실 최소화",
            "students": [s["name"] for s in entropy_students[:5]],
            "expected_impact": "감정 비용 -50% 절감"
        })
    
    return {
        "success": True,
        "total_actions": len(actions),
        "actions": actions,
        "health_score": health["health_score"],
        "generated_at": datetime.utcnow().isoformat()
    }


@router.get("/trends")
async def get_trends(
    period: str = Query("7d", pattern="^(7d|30d|90d)$", description="기간")
):
    """
    SQ 트렌드 분석
    
    - 기간별 평균 SQ 변화
    - 클러스터 분포 변화
    
    Note: MVP 단계에서는 시뮬레이션 데이터
    """
    students = _get_demo_students()
    current_avg_sq = sum(s.get("sq_score", 0) for s in students) / len(students) if students else 0
    
    # 시뮬레이션 데이터 생성
    days = {"7d": 7, "30d": 30, "90d": 90}[period]
    data_points = []
    
    import random
    base_sq = current_avg_sq * 0.95  # 시작점
    
    for i in range(days):
        date = (datetime.now() - timedelta(days=days-i-1)).strftime("%Y-%m-%d")
        
        # 점진적 상승 시뮬레이션
        daily_sq = base_sq + (current_avg_sq - base_sq) * (i / days) + random.uniform(-2, 2)
        
        data_points.append(TrendDataPoint(
            date=date,
            avg_sq=round(daily_sq, 2),
            total_students=len(students),
            golden_count=sum(1 for s in students if s.get("cluster") == "golden_core"),
            entropy_count=sum(1 for s in students if s.get("cluster") == "entropy_sink")
        ))
    
    # 트렌드 요약
    start_sq = data_points[0].avg_sq if data_points else 0
    end_sq = data_points[-1].avg_sq if data_points else 0
    change = end_sq - start_sq
    change_pct = (change / start_sq * 100) if start_sq > 0 else 0
    
    return TrendResponse(
        period=period,
        data_points=data_points,
        summary={
            "start_sq": round(start_sq, 2),
            "end_sq": round(end_sq, 2),
            "change": round(change, 2),
            "change_percent": round(change_pct, 1),
            "trend": "up" if change > 0 else "down" if change < 0 else "stable"
        }
    )


@router.get("/compare")
async def compare_periods(
    current: str = Query("7d", description="현재 기간"),
    previous: str = Query("7d", description="이전 기간")
):
    """
    기간별 비교 분석
    
    - 현재 vs 이전 기간 SQ 비교
    - 개선/악화 지표
    """
    students = _get_demo_students()
    current_avg_sq = sum(s.get("sq_score", 0) for s in students) / len(students) if students else 0
    
    # 이전 기간 시뮬레이션 (5% 낮은 값)
    previous_avg_sq = current_avg_sq * 0.95
    
    current_golden = sum(1 for s in students if s.get("cluster") == "golden_core")
    current_entropy = sum(1 for s in students if s.get("cluster") == "entropy_sink")
    
    return {
        "success": True,
        "comparison": {
            "current_period": current,
            "previous_period": previous,
            "current": {
                "avg_sq": round(current_avg_sq, 2),
                "golden_count": current_golden,
                "entropy_count": current_entropy,
                "total_students": len(students)
            },
            "previous": {
                "avg_sq": round(previous_avg_sq, 2),
                "golden_count": max(0, current_golden - 1),
                "entropy_count": current_entropy + 1,
                "total_students": len(students)
            },
            "change": {
                "avg_sq": round(current_avg_sq - previous_avg_sq, 2),
                "avg_sq_percent": round((current_avg_sq - previous_avg_sq) / previous_avg_sq * 100, 1) if previous_avg_sq > 0 else 0,
                "golden_change": 1,
                "entropy_change": -1
            }
        },
        "interpretation": {
            "status": "improved" if current_avg_sq > previous_avg_sq else "declined",
            "message": f"평균 SQ가 {abs(round(current_avg_sq - previous_avg_sq, 2))}점 {'상승' if current_avg_sq > previous_avg_sq else '하락'}했습니다."
        }
    }


@router.get("/zscore-ranking")
async def get_zscore_ranking(
    limit: int = Query(10, ge=1, le=100, description="상위 N명")
):
    """Z-Score 기반 순위 조회"""
    students = _get_demo_students()
    
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
        for s in students
    ]
    
    results = engine.calculate_batch_with_zscore(inputs)
    
    ranking = []
    for r in results[:limit]:
        ranking.append({
            "rank": r.rank,
            "student_name": r.student_name,
            "sq_score": r.sq_score,
            "z_score": r.z_score,
            "tier": r.tier,
            "tier_emoji": r.tier_metadata.get("emoji", ""),
            "percentile": r.percentile
        })
    
    return {
        "success": True,
        "limit": limit,
        "total": len(results),
        "ranking": ranking,
        "statistics": engine.get_zscore_statistics(results)
    }


@router.get("/summary")
async def get_summary():
    """대시보드용 요약 데이터"""
    students = _get_demo_students()
    results = _get_sq_results(students)
    engine = SQEngine()
    health = engine.calculate_academy_health(results)
    
    # 클러스터별 집계
    cluster_counts = {}
    cluster_revenue = {}
    
    for s in students:
        cluster = s.get("cluster", "stable_orbit")
        cluster_counts[cluster] = cluster_counts.get(cluster, 0) + 1
        cluster_revenue[cluster] = cluster_revenue.get(cluster, 0) + s.get("monthly_fee", 0)
    
    total_revenue = sum(s.get("monthly_fee", 0) for s in students)
    
    return {
        "success": True,
        "summary": {
            "total_students": len(students),
            "health_score": health["health_score"],
            "health_status": health["status_kr"],
            "avg_sq": health["avg_sq"],
            "total_monthly_revenue": total_revenue,
            "cluster_distribution": cluster_counts,
            "cluster_revenue": cluster_revenue,
            "top_cluster": max(cluster_counts, key=cluster_counts.get) if cluster_counts else None,
            "alerts": len(health["recommendations"]),
        },
        "quick_stats": {
            "golden_core": cluster_counts.get("golden_core", 0),
            "high_potential": cluster_counts.get("high_potential", 0),
            "at_risk": cluster_counts.get("friction_zone", 0) + cluster_counts.get("entropy_sink", 0),
        },
        "generated_at": datetime.utcnow().isoformat()
    }
