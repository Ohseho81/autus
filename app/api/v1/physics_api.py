"""
AUTUS Physics API
solar.html Frontend 연결용

Engine → UI 직접 바인딩
"""

from fastapi import APIRouter, Query
from typing import Optional
import math
import time

# Physics Engine Import
try:
    from app.physics.engine import PhysicsEngine, create_demo_engine
    ENGINE_AVAILABLE = True
except ImportError:
    ENGINE_AVAILABLE = False

router = APIRouter(prefix="/api/v1/physics", tags=["physics"])

# 싱글톤 엔진 인스턴스
_engine_instance: Optional['PhysicsEngine'] = None

def get_engine() -> 'PhysicsEngine':
    """싱글톤 Physics Engine 인스턴스"""
    global _engine_instance
    if _engine_instance is None and ENGINE_AVAILABLE:
        _engine_instance = create_demo_engine()
    return _engine_instance


@router.get("/solar-binding")
async def solar_binding():
    """
    SOLAR UI 바인딩 데이터
    9 Planets + 물리 상태 반환
    """
    # 현재 시간 기반 동적 값 (데모)
    t = time.time() % 100 / 100  # 0-1 사이클
    
    return {
        "survival_time": 216,
        "float_pressure": 0.38,
        "risk": 32 + int(t * 10),  # 32-42% 변동
        "entropy": 0.14 + t * 0.05,
        "pressure": 0.22,
        "flow": 0.65,
        "status": "GREEN" if t < 0.7 else "AMBER",
        "gate": "GREEN" if t < 0.7 else "AMBER",
        "impact_percent": -48,
        "binding": {
            "core": {"scale": 0.8, "glow": 0.3},
            "orbits": {"speed": 0.7, "distortion": 0.1},
            "ring": {"radiusScale": 0.9, "thickness": 0.18, "pulseHz": 0.5, "asymStrength": 0.2}
        },
        "physics": {
            "risk": 0.32 + t * 0.1,
            "entropy": 0.14 + t * 0.05,
            "pressure": 0.22,
            "flow": 0.65,
            "survival_days": 216,
            "collapse_days": 365
        },
        "state": {
            "system_state": "GREEN" if t < 0.7 else "YELLOW",
            "can_create_commit": True,
            "can_expand": True,
            "recommended_action": "RECOVER",
            "violations": []
        },
        "planets": {
            "recovery": 0.72,
            "stability": 0.65,
            "cohesion": 0.58,
            "shock": 0.19,
            "friction": 0.10,
            "transfer": 0.45,
            "time": 0.80,
            "quality": 0.65,
            "output": 0.72
        },
        "orbits": [
            {"radius": 0.3, "speed": 0.02},
            {"radius": 0.5, "speed": 0.015},
            {"radius": 0.7, "speed": 0.01},
            {"radius": 0.9, "speed": 0.008}
        ]
    }


@router.get("/snapshot")
async def physics_snapshot():
    """현재 물리 스냅샷"""
    return {
        "risk": 32,
        "entropy": 0.14,
        "pressure": 0.22,
        "flow": 0.65,
        "shock": 0.19,
        "friction": 0.10,
        "cohesion": 0.11,
        "recovery": 0.10
    }


@router.get("/state")
async def physics_state():
    """7 Laws + TIME-MONEY 통합 상태"""
    return {
        "timestamp": time.time(),
        "system_state": "GREEN",
        "gate": "GREEN",
        "risk": 32,
        "entropy": 14,
        "pressure": 22,
        "flow": 65,
        "survival_days": 216,
        "collapse_days": 365,
        "can_create_commit": True,
        "can_expand": True,
        "recommended_action": "RECOVER",
        "violations": [],
        "laws_passed": True
    }


@router.get("/ui-model")
async def physics_ui_model():
    """Frontend __AUTUS_MODEL 형식"""
    return {
        "snapshot": {
            "risk": 0.32,
            "entropy": 0.14,
            "pressure": 0.22,
            "flow": 0.65,
            "survival_days": 216,
            "collapse_days": 365,
            "gate": "GREEN"
        },
        "bottleneck": {
            "type": "FRICTION",
            "value": 0.10
        },
        "recommended_action": "RECOVER"
    }


@router.get("/laws")
async def physics_laws():
    """7 Laws 상수 및 설명"""
    return {
        "T_MIN": 180,
        "ALPHA_SAFETY": 1.3,
        "MAX_ROLES": 6,
        "description": {
            "law1": "Continuity (연속성) — Human_Continuity = min(Survival_Time_i) ≥ 180일",
            "law2": "Conservation (보존) — Σ Money_Flow = Σ Commit_Mass",
            "law3": "State Dominance (상태 지배) — RED → Allowed_Action = ∅",
            "law4": "Cognitive Minimum (인지 최소) — UI≤3, Button≤1, Text=0",
            "law5": "Containment (격리) — ∂System/∂Failure ≈ 0",
            "law6": "Responsibility (책임 밀도) — Density = 1/Roles (6)",
            "law7": "Survival Mass (생존 질량) — Mass ≥ 1.3 × Required"
        },
        "laws": [
            {"id": 1, "name": "Continuity", "active": True},
            {"id": 2, "name": "Conservation", "active": True},
            {"id": 3, "name": "State Dominance", "active": True},
            {"id": 4, "name": "Cognitive Minimum", "active": True},
            {"id": 5, "name": "Containment", "active": True},
            {"id": 6, "name": "Responsibility", "active": True},
            {"id": 7, "name": "Survival Mass", "active": True}
        ]
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Role-Based UI Binding API
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/ui-binding")
async def physics_ui_binding(
    role: str = Query("subject", description="subject/operator/sponsor/employer/institution")
):
    """
    Role별 UI 바인딩 데이터
    
    Engine → UI Element 직접 매핑
    Frontend solar-roles.html에서 사용
    """
    role = role.lower()
    valid_roles = ["subject", "operator", "sponsor", "employer", "institution"]
    if role not in valid_roles:
        role = "subject"
    
    # Engine 사용 가능하면 실제 계산
    if ENGINE_AVAILABLE:
        engine = get_engine()
        if engine:
            engine.compute_snapshot()
            return engine.to_role_ui_binding(role)
    
    # Fallback: 시뮬레이션 데이터
    t = time.time() % 100 / 100
    risk = 32 + int(t * 10)
    gate = "GREEN" if t < 0.7 else "AMBER"
    
    # Role별 설정
    configs = {
        "subject": {
            "icon": "👤", "name": "SUBJECT", "action": "RECOVER",
            "success_text": "RECOVERED", "primary_label": "SURVIVAL",
            "primary_unit": "일", "impact_prefix": "💰", "color": "#00ff88"
        },
        "operator": {
            "icon": "🎯", "name": "OPERATOR", "action": "INTERVENE",
            "success_text": "INTERVENED", "primary_label": "TOTAL",
            "primary_unit": "명", "impact_prefix": "⚠️", "color": "#45B7D1"
        },
        "sponsor": {
            "icon": "💰", "name": "SPONSOR", "action": "OPTIMIZE",
            "success_text": "OPTIMIZED", "primary_label": "INVESTED",
            "primary_unit": "", "impact_prefix": "📉", "color": "#FFD700"
        },
        "employer": {
            "icon": "🏢", "name": "EMPLOYER", "action": "RETAIN",
            "success_text": "RETAINED", "primary_label": "HIRED",
            "primary_unit": "명", "impact_prefix": "👥", "color": "#96CEB4"
        },
        "institution": {
            "icon": "🏛️", "name": "INSTITUTION", "action": None,
            "success_text": "", "primary_label": "SYSTEM MASS",
            "primary_unit": "OCU", "impact_prefix": "🔒", "color": "#DDA0DD"
        }
    }
    
    config = configs[role]
    
    # Role별 메트릭
    metrics_by_role = {
        "subject": {
            "primary": {"label": "SURVIVAL", "value": 216, "display": "216일", "unit": "일", "max": 365, "fill_pct": 59.2},
            "secondary": [
                {"label": "BURN", "value": "−₩47만/월", "class": ""},
                {"label": "RISK", "value": f"{risk}%", "class": "danger" if risk >= 50 else ""}
            ]
        },
        "operator": {
            "primary": {"label": "TOTAL", "value": 47, "display": "47명", "unit": "명", "max": 100, "fill_pct": 47},
            "secondary": [
                {"label": "AT_RISK", "value": "3명", "class": "warning"},
                {"label": "CRITICAL", "value": "1명", "class": "danger" if risk >= 60 else ""}
            ]
        },
        "sponsor": {
            "primary": {"label": "INVESTED", "value": 2.4, "display": "₩2.4억", "unit": "", "max": 10, "fill_pct": 24},
            "secondary": [
                {"label": "EFFICIENCY", "value": f"{100-risk}%", "class": "warning" if risk >= 20 else "success"},
                {"label": "LOSS_RISK", "value": f"₩{risk*100}만", "class": "danger" if risk >= 30 else ""}
            ]
        },
        "employer": {
            "primary": {"label": "HIRED", "value": 12, "display": "12명", "unit": "명", "max": 50, "fill_pct": 24},
            "secondary": [
                {"label": "RETENTION", "value": f"{100-risk//3}%", "class": "warning" if risk >= 45 else "success"},
                {"label": "CHURN_RISK", "value": "2명", "class": "warning" if risk >= 40 else ""}
            ]
        },
        "institution": {
            "primary": {"label": "SYSTEM MASS", "value": 47.2, "display": "47.2 OCU", "unit": "OCU", "max": 100, "fill_pct": 47.2},
            "secondary": [
                {"label": "GOVERNANCE", "value": "STABLE" if gate != "RED" else "UNSTABLE", "class": "success" if gate != "RED" else "danger"},
                {"label": "EXPANSION", "value": "LOCKED" if risk >= 40 else "UNLOCKED", "class": "" if risk >= 40 else "success"}
            ]
        }
    }
    
    # Action 조건
    action_conditions = {
        "subject": risk >= 40,
        "operator": True,  # at_risk >= 1
        "sponsor": risk >= 20,  # efficiency < 80
        "employer": risk >= 40,  # churn_risk >= 1
        "institution": False
    }
    action_visible = action_conditions[role] and gate != "RED"
    
    # Subtitle
    subtitles = {
        "subject": "즉시 행동하지 않으면 손실 확정",
        "operator": "3명이 위험 상태입니다",
        "sponsor": f"효율 {100-risk}% — 최적화 필요",
        "employer": "2명 이탈 위험 감지",
        "institution": ""
    }
    
    return {
        "role": role,
        "config": config,
        "gate": gate,
        "status": "OK" if gate == "GREEN" else "CRITICAL" if gate == "RED" else "WARN",
        "metrics": metrics_by_role[role],
        "action": {
            "visible": action_visible,
            "name": config["action"],
            "success_text": config["success_text"],
            "impact": f"{config['impact_prefix']} −{risk}%",
            "subtitle": subtitles[role]
        },
        "countdown": {
            "enabled": action_visible,
            "seconds": 5
        },
        "style": {
            "primary_color": config["color"],
            "danger_color": "#ff4444",
            "warning_color": "#ffaa00"
        },
        "engine": {
            "risk": risk,
            "entropy": round(14 + t * 5, 1),
            "pressure": 22,
            "survival_days": 216,
            "collapse_days": 365,
            "recommended_action": "RECOVER" if risk >= 40 else None,
            "violations": []
        }
    }


@router.get("/ui-binding/all")
async def physics_ui_binding_all():
    """모든 Role의 UI 바인딩 데이터 (비교용)"""
    roles = ["subject", "operator", "sponsor", "employer", "institution"]
    result = {}
    
    for role in roles:
        if ENGINE_AVAILABLE:
            engine = get_engine()
            if engine:
                engine.compute_snapshot()
                result[role] = engine.to_role_ui_binding(role)
                continue
        
        # Fallback
        result[role] = await physics_ui_binding(role)
    
    return {
        "roles": result,
        "engine_available": ENGINE_AVAILABLE
    }
