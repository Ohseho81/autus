"""
AUTUS Commit API
인력별 Commit 조회
"""

from fastapi import APIRouter, Path, HTTPException
from typing import Optional
from datetime import datetime
import time

router = APIRouter(prefix="/api/v1/commit", tags=["commit"])


# 샘플 데이터 (나중에 DB 연결)
SAMPLE_PERSONS = {
    "STU_001": {
        "id": "STU_001",
        "name": "Maria Santos",
        "role": "subject",
        "country": "PH",
        "status": "active",
        "created_at": "2025-01-01",
        "commits": [
            {
                "commit_id": "CMT_WAGE_001",
                "type": "wage",
                "amount": 2500000,
                "currency": "KRW",
                "velocity": 1/30,
                "duration": 365,
                "friction": 0.15,
                "gravity": 1.0,
                "mass": 2500000,
                "source": "ABC제조",
                "actor_from": "EMP_ABC",
                "actor_to": "STU_001",
                "status": "active",
                "start_date": "2025-01-01",
                "end_date": "2025-12-31"
            },
            {
                "commit_id": "CMT_GRANT_001",
                "type": "grant",
                "amount": 6000000,
                "currency": "KRW",
                "velocity": 1/365,
                "duration": 365,
                "friction": 0.30,
                "gravity": 1.0,
                "mass": 6000000,
                "source": "정부",
                "actor_from": "INST_GOV",
                "actor_to": "STU_001",
                "status": "active",
                "start_date": "2025-01-01",
                "end_date": "2025-12-31"
            }
        ],
        "survival": {
            "survival_time": 216,
            "survival_mass": 8500000,
            "daily_burn": 100000
        },
        "risk": {
            "float_pressure": 0.38,
            "risk_score": 32,
            "state": "GREEN"
        }
    },
    "STU_002": {
        "id": "STU_002",
        "name": "Juan Dela Cruz",
        "role": "subject",
        "country": "PH",
        "status": "active",
        "created_at": "2025-01-15",
        "commits": [
            {
                "commit_id": "CMT_WAGE_002",
                "type": "wage",
                "amount": 2000000,
                "currency": "KRW",
                "velocity": 1/30,
                "duration": 365,
                "friction": 0.12,
                "gravity": 1.0,
                "mass": 2000000,
                "source": "XYZ테크",
                "actor_from": "EMP_XYZ",
                "actor_to": "STU_002",
                "status": "active",
                "start_date": "2025-01-15",
                "end_date": "2025-12-31"
            }
        ],
        "survival": {
            "survival_time": 180,
            "survival_mass": 2000000,
            "daily_burn": 80000
        },
        "risk": {
            "float_pressure": 0.45,
            "risk_score": 41,
            "state": "YELLOW"
        }
    }
}


@router.get("/person/{person_id}")
async def get_person_commits(person_id: str = Path(..., description="인력 ID")):
    """인력별 Commit 대시보드"""
    
    person = SAMPLE_PERSONS.get(person_id)
    
    if not person:
        # 404 대신 기본값 반환 (Frontend 안정성)
        return {
            "id": person_id,
            "name": "Unknown",
            "role": "subject",
            "country": "KR",
            "status": "pending",
            "commits": [],
            "survival": {
                "survival_time": 0,
                "survival_mass": 0,
                "daily_burn": 100000
            },
            "risk": {
                "float_pressure": 1.0,
                "risk_score": 100,
                "state": "RED"
            },
            "message": "Person not found, returning defaults"
        }
    
    return {
        "person": {
            "id": person["id"],
            "name": person["name"],
            "role": person["role"],
            "country": person["country"],
            "status": person["status"]
        },
        "commits": person["commits"],
        "survival": person["survival"],
        "risk": person["risk"]
    }


@router.get("/person/{person_id}/summary")
async def get_person_summary(person_id: str):
    """인력 요약"""
    person = SAMPLE_PERSONS.get(person_id, {})
    
    survival = person.get("survival", {})
    risk = person.get("risk", {})
    
    return {
        "id": person_id,
        "name": person.get("name", "Unknown"),
        "survival_time": survival.get("survival_time", 0),
        "risk_score": risk.get("risk_score", 100),
        "float_pressure": risk.get("float_pressure", 1.0),
        "status": risk.get("state", "RED")
    }


@router.get("/list")
async def list_commits():
    """전체 Commit 목록"""
    return {
        "persons": [
            {
                "id": p["id"],
                "name": p["name"],
                "role": p["role"],
                "status": p["status"],
                "commit_count": len(p["commits"]),
                "survival_time": p["survival"]["survival_time"],
                "risk_score": p["risk"]["risk_score"]
            }
            for p in SAMPLE_PERSONS.values()
        ],
        "total": len(SAMPLE_PERSONS)
    }


@router.get("/list/{person_id}")
async def list_person_commits(person_id: str):
    """인력의 활성 Commit 목록"""
    person = SAMPLE_PERSONS.get(person_id, {})
    
    return {
        "person_id": person_id,
        "commits": person.get("commits", [])
    }


@router.post("/create")
async def create_commit(data: dict):
    """새 Commit 생성"""
    commit_id = f"CMT_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    return {
        "status": "created",
        "commit_id": commit_id,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }


@router.post("/close/{commit_id}")
async def close_commit(commit_id: str):
    """Commit 종료"""
    return {
        "commit_id": commit_id,
        "status": "closed",
        "immutable": True,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/survival/{person_id}")
async def get_survival(person_id: str):
    """Survival Mass 계산"""
    person = SAMPLE_PERSONS.get(person_id, {})
    survival = person.get("survival", {})
    
    return {
        "person_id": person_id,
        "survival_time": survival.get("survival_time", 0),
        "survival_mass": survival.get("survival_mass", 0),
        "daily_burn": survival.get("daily_burn", 100000),
        "threshold": 180,
        "is_safe": survival.get("survival_time", 0) >= 180
    }


@router.get("/risk/{person_id}")
async def get_risk(person_id: str):
    """Risk Score 계산"""
    person = SAMPLE_PERSONS.get(person_id, {})
    risk = person.get("risk", {})
    
    return {
        "person_id": person_id,
        "float_pressure": risk.get("float_pressure", 1.0),
        "risk_score": risk.get("risk_score", 100),
        "state": risk.get("state", "RED"),
        "thresholds": {
            "green": 0.7,
            "yellow": 1.0,
            "red": ">1.0"
        }
    }


@router.get("/system/state")
async def get_system_state():
    """전역 시스템 상태"""
    # 전체 Person 합계
    total_survival_mass = sum(p["survival"]["survival_mass"] for p in SAMPLE_PERSONS.values())
    total_persons = len(SAMPLE_PERSONS)
    avg_risk = sum(p["risk"]["risk_score"] for p in SAMPLE_PERSONS.values()) / max(total_persons, 1)
    
    if avg_risk < 40:
        status = "GREEN"
    elif avg_risk < 70:
        status = "YELLOW"
    else:
        status = "RED"
    
    return {
        "state_id": "GLOBAL",
        "status": status,
        "total_persons": total_persons,
        "total_survival_mass": total_survival_mass,
        "avg_risk_score": round(avg_risk, 1),
        "timestamp": time.time()
    }


@router.post("/system/recalculate")
async def recalculate_system():
    """시스템 상태 재계산"""
    state = await get_system_state()
    return {
        "recalculated": True,
        "state": state
    }
