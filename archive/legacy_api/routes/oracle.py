"""
AUTUS Oracle API Router
제11법칙: 균형 - 자동으로 데이터 수집 및 분석

헌법 실행:
- 행정: 자동 수집/분석
- 사법: 자비 검증/경고
"""
from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel

# Oracle 모듈 import
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from oracle.collector import MetricCollector, stats as get_stats, record
from oracle.selector import NaturalSelector, rank, top
from oracle.evolution import CollectiveEvolution, analyze
from oracle.compassion import CompassionChecker, happy, unhappy, check

router = APIRouter(prefix="/oracle", tags=["Oracle"])

# 인스턴스
_collector = MetricCollector()
_selector = NaturalSelector()
_evolution = CollectiveEvolution()
_compassion = CompassionChecker()


# ============ 수집 (Collector) ============

@router.get("/stats")
async def oracle_stats(pack_name: Optional[str] = None):
    """
    Pack 통계 조회
    - 전체: /oracle/stats
    - 특정: /oracle/stats?pack_name=weather_pack
    """
    if pack_name:
        return _collector.get_stats(pack_name)
    return _collector.get_all_stats()


@router.post("/record/{pack_name}")
async def oracle_record(pack_name: str, success: bool = True, time_ms: float = 0):
    """Pack 실행 기록 (자동 호출용)"""
    _collector.record(pack_name, success, time_ms)
    return {"recorded": True, "pack": pack_name}


# ============ 자연선택 (Selector) ============

@router.get("/ranking")
async def oracle_ranking():
    """Pack 순위 (자연선택 결과)"""
    stats = _collector.get_all_stats()
    return {
        "ranking": _selector.rank(stats),
        "top_10": _selector.top(stats, 10)
    }


@router.get("/surviving")
async def oracle_surviving():
    """생존 Pack 목록"""
    stats = _collector.get_all_stats()
    surviving = [s for s in stats if _selector.is_surviving(s)]
    return {"surviving": surviving, "count": len(surviving)}


# ============ 집단진화 (Evolution) ============

class PatternInput(BaseModel):
    inputs: dict = {}
    outputs: dict = {}

@router.post("/pattern/{pack_name}")
async def oracle_pattern(pack_name: str, data: PatternInput):
    """사용 패턴 기록 (익명)"""
    pattern_hash = _evolution.record_pattern(pack_name, data.inputs, data.outputs)
    return {"recorded": True, "hash": pattern_hash}


@router.get("/analyze/{pack_name}")
async def oracle_analyze(pack_name: str):
    """패턴 분석"""
    return _evolution.analyze(pack_name)


@router.get("/suggest/{pack_name}")
async def oracle_suggest(pack_name: str):
    """개선 제안"""
    suggestion = _evolution.suggest_improvement(pack_name)
    return {"pack": pack_name, "suggestion": suggestion}


# ============ 자비 검증 (Compassion) ============

@router.post("/feedback/{pack_name}")
async def oracle_feedback(pack_name: str, is_happy: bool):
    """
    피드백 기록
    - 😊 happy=true
    - 😢 happy=false
    """
    if is_happy:
        _compassion.record(pack_name, True)
    else:
        _compassion.record(pack_name, False)
    
    return _compassion.check(pack_name)


@router.get("/compassion/{pack_name}")
async def oracle_compassion(pack_name: str):
    """자비 검증 결과"""
    result = _compassion.check(pack_name)
    result["question"] = _compassion.ask()
    return result


@router.get("/warnings")
async def oracle_warnings():
    """경고 필요한 Pack 목록"""
    stats = _collector.get_all_stats()
    warnings = []
    
    for stat in stats:
        pack_name = stat.get("pack")
        compassion_result = _compassion.check(pack_name)
        if compassion_result.get("needs_review"):
            warnings.append({
                "pack": pack_name,
                "unhappy_rate": compassion_result.get("unhappy_rate"),
                "status": "needs_review"
            })
    
    return {"warnings": warnings, "count": len(warnings)}


# ============ 헌법 상태 (Constitution) ============

@router.get("/constitution/status")
async def constitution_status():
    """헌법 준수 상태"""
    stats = _collector.get_all_stats()
    warnings = [s for s in stats if _compassion.check(s.get("pack", "")).get("needs_review")]
    
    return {
        "status": "ok" if len(warnings) == 0 else "warning",
        "total_packs": len(stats),
        "warnings": len(warnings),
        "message": "자연을 99.9% 따르되, 인간이 불행해지지 않는 방향을 끊임없이 찾는다."
    }
