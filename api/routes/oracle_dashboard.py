"""
AUTUS Oracle Dashboard API
제6법칙: 창발 - 집단 지성 시각화

대시보드에서 사용할 종합 데이터 제공
"""
from fastapi import APIRouter
from typing import Dict, Any, List
from datetime import datetime

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from oracle.collector import MetricCollector
from oracle.selector import NaturalSelector
from oracle.evolution import CollectiveEvolution
from oracle.compassion import CompassionChecker

router = APIRouter(prefix="/oracle/dashboard", tags=["Oracle Dashboard"])

# 인스턴스
_collector = MetricCollector()
_selector = NaturalSelector()
_evolution = CollectiveEvolution()
_compassion = CompassionChecker()


@router.get("/summary")
async def dashboard_summary() -> Dict[str, Any]:
    """대시보드 요약 데이터"""
    stats = _collector.get_all_stats()
    
    total_packs = len(stats)
    total_usage = sum(s.get("usage", 0) for s in stats)
    avg_success = sum(s.get("success_rate", 0) for s in stats) / max(total_packs, 1)
    
    # 자비 검증
    warnings = []
    for s in stats:
        pack_name = s.get("pack", "")
        check = _compassion.check(pack_name)
        if check.get("needs_review"):
            warnings.append(pack_name)
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "overview": {
            "total_packs": total_packs,
            "total_usage": total_usage,
            "avg_success_rate": round(avg_success, 2),
            "warnings_count": len(warnings)
        },
        "status": "healthy" if len(warnings) == 0 else "needs_attention",
        "constitution": {
            "version": "6.1",
            "laws": 13,
            "principle": "자연 99.9% + 자비 0.1%"
        }
    }


@router.get("/packs")
async def dashboard_packs() -> Dict[str, Any]:
    """Pack 현황"""
    stats = _collector.get_all_stats()
    ranked = _selector.rank(stats)
    
    packs = []
    for s in stats:
        pack_name = s.get("pack", "")
        compassion = _compassion.check(pack_name)
        evolution = _evolution.analyze(pack_name)
        
        packs.append({
            "name": pack_name,
            "usage": s.get("usage", 0),
            "success_rate": round(s.get("success_rate", 0), 2),
            "avg_time_ms": round(s.get("avg_time_ms", 0), 2),
            "happiness": {
                "happy": compassion.get("happy", 0),
                "unhappy": compassion.get("unhappy", 0),
                "status": compassion.get("status", "unknown")
            },
            "patterns": evolution.get("patterns", 0),
            "surviving": _selector.is_surviving(s)
        })
    
    return {
        "packs": packs,
        "top_10": _selector.top(stats, 10),
        "total": len(packs)
    }


@router.get("/evolution")
async def dashboard_evolution() -> Dict[str, Any]:
    """집단 진화 현황"""
    stats = _collector.get_all_stats()
    
    evolution_data = []
    for s in stats:
        pack_name = s.get("pack", "")
        analysis = _evolution.analyze(pack_name)
        suggestion = _evolution.suggest_improvement(pack_name)
        
        evolution_data.append({
            "pack": pack_name,
            "patterns": analysis.get("patterns", 0),
            "unique_inputs": analysis.get("unique_inputs", 0),
            "unique_outputs": analysis.get("unique_outputs", 0),
            "suggestion": suggestion
        })
    
    return {
        "evolution": evolution_data,
        "total_patterns": sum(e.get("patterns", 0) for e in evolution_data)
    }


@router.get("/compassion")
async def dashboard_compassion() -> Dict[str, Any]:
    """자비 검증 현황"""
    stats = _collector.get_all_stats()
    
    compassion_data = []
    total_happy = 0
    total_unhappy = 0
    
    for s in stats:
        pack_name = s.get("pack", "")
        check = _compassion.check(pack_name)
        
        total_happy += check.get("happy", 0)
        total_unhappy += check.get("unhappy", 0)
        
        compassion_data.append({
            "pack": pack_name,
            "happy": check.get("happy", 0),
            "unhappy": check.get("unhappy", 0),
            "unhappy_rate": check.get("unhappy_rate", 0),
            "needs_review": check.get("needs_review", False),
            "status": check.get("status", "unknown")
        })
    
    # 경고 목록
    warnings = [c for c in compassion_data if c.get("needs_review")]
    
    return {
        "compassion": compassion_data,
        "summary": {
            "total_happy": total_happy,
            "total_unhappy": total_unhappy,
            "overall_rate": round(total_unhappy / max(total_happy + total_unhappy, 1), 2)
        },
        "warnings": warnings,
        "question": _compassion.ask()
    }


@router.get("/realtime")
async def dashboard_realtime() -> Dict[str, Any]:
    """실시간 데이터 (폴링용)"""
    stats = _collector.get_all_stats()
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "active_packs": len(stats),
        "recent_usage": sum(s.get("usage", 0) for s in stats),
        "health": "ok"
    }
