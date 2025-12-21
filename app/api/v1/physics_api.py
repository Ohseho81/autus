"""
AUTUS Physics API (Brief-Compliant)
기회비용 표준기 - 7종 비용 계산

"AUTUS는 설득하지 않는다. 측정만 한다."
"""

from fastapi import APIRouter, Query
from typing import Optional
import time
from datetime import datetime

# Physics Engine Import
try:
    from app.physics.engine import (
        PhysicsEngine, create_demo_engine, 
        create_critical_engine, create_irreversible_engine,
        COST_COLORS, COST_RATIOS
    )
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


# ═══════════════════════════════════════════════════════════
# 7종 기회비용 계산 (LOCK)
# ═══════════════════════════════════════════════════════════

def calculate_costs(base_loss: int = 10000000) -> dict:
    """7종 기회비용 계산"""
    t = time.time() % 1000 / 1000  # 변동 시뮬레이션
    
    return {
        "time": int(base_loss * 0.17 * (1 + t * 0.1)),         # 시간 가치 손실
        "risk": int(base_loss * 0.28 * (1 + t * 0.15)),        # 위험 증가
        "resource": int(base_loss * 0.10 * (1 + t * 0.05)),    # 추가 자원
        "position": int(base_loss * 0.16 * (1 + t * 0.08)),    # 기회/자리 손실
        "learning": int(base_loss * 0.12 * (1 + t * 0.12)),    # 학습 지연
        "trust": int(base_loss * 0.13 * (1 + t * 0.1)),        # 신뢰 감소
        "irreversibility": int(base_loss * 0.04 * (1 + t * 0.2))  # 복구불가 손실
    }


def calculate_cost_rates(base_rate: int = 41000) -> dict:
    """7종 기회비용 증가율"""
    return {
        "time": int(base_rate * 0.17),
        "risk": int(base_rate * 0.28),
        "resource": int(base_rate * 0.10),
        "position": int(base_rate * 0.16),
        "learning": int(base_rate * 0.12),
        "trust": int(base_rate * 0.13),
        "irreversibility": int(base_rate * 0.04)
    }


def determine_state(pnr_days: int) -> str:
    """상태 결정 (Brief 기준)"""
    if pnr_days <= 0:
        return "IRREVERSIBLE"
    elif pnr_days <= 7:
        return "CRITICAL"
    elif pnr_days <= 21:
        return "WARNING"
    else:
        return "SAFE"


# ═══════════════════════════════════════════════════════════
# MAIN ENDPOINTS (Brief-Compliant)
# ═══════════════════════════════════════════════════════════

@router.get("/solar-binding")
async def solar_binding(
    role: str = Query("subject", description="subject/operator/sponsor"),
    domain: str = Query("education", description="education/employment/default")
):
    """
    LOSS GAUGE + EROSION LINE 바인딩
    브리프 준수: 절대값(₩), 7종 비용
    
    Engine 기반 계산
    """
    # Engine 사용 가능하면 실제 계산
    if ENGINE_AVAILABLE:
        engine = get_engine()
        if engine:
            engine.domain = domain
            engine.compute_snapshot(role=role)
            return engine.to_brief_binding(role)
    
    # Fallback: 수동 계산
    costs = calculate_costs()
    cost_rates = calculate_cost_rates()
    total_loss = sum(costs.values())
    loss_rate = sum(cost_rates.values())
    pnr_days = 14
    state = determine_state(pnr_days)
    
    return {
        # Brief-Compliant (절대값)
        "total_loss": total_loss,
        "loss_rate": loss_rate,
        "pnr_days": pnr_days,
        "state": state,
        "costs": costs,
        "cost_rates": cost_rates,
        "timestamp": datetime.utcnow().isoformat(),
        
        # 단위
        "unit": "₩" if role in ["subject", "sponsor"] else "₩+OCU",
        
        # ACTION
        "can_action": state != "IRREVERSIBLE",
        "action_text": "선택" if state != "IRREVERSIBLE" else "복구 불가",
        "status_text": "" if state == "SAFE" else 
                       "비용이 증가하고 있습니다" if state == "WARNING" else
                       "선택하지 않으면 비용은 계속 증가합니다" if state == "CRITICAL" else
                       "이 상태는 변경할 수 없습니다",
        
        # Legacy 호환
        "risk": min(100, int(total_loss / 200000)),
        "gate": "GREEN" if state == "SAFE" else "AMBER" if state == "WARNING" else "RED",
        "survival_time": 216,
        "float_pressure": 0.38
    }


@router.get("/costs")
async def get_costs():
    """7종 기회비용 상세"""
    costs = calculate_costs()
    cost_rates = calculate_cost_rates()
    
    return {
        "costs": [
            {"type": "time", "label": "시간", "value": costs["time"], "rate": cost_rates["time"], "color": "#4ECDC4"},
            {"type": "risk", "label": "위험", "value": costs["risk"], "rate": cost_rates["risk"], "color": "#FF6B6B"},
            {"type": "resource", "label": "자원", "value": costs["resource"], "rate": cost_rates["resource"], "color": "#45B7D1"},
            {"type": "position", "label": "기회", "value": costs["position"], "rate": cost_rates["position"], "color": "#96CEB4"},
            {"type": "learning", "label": "학습", "value": costs["learning"], "rate": cost_rates["learning"], "color": "#FFEAA7"},
            {"type": "trust", "label": "신뢰", "value": costs["trust"], "rate": cost_rates["trust"], "color": "#DDA0DD"},
            {"type": "irreversibility", "label": "복구불가", "value": costs["irreversibility"], "rate": cost_rates["irreversibility"], "color": "#FF4444"}
        ],
        "total": sum(costs.values()),
        "total_rate": sum(cost_rates.values())
    }


@router.get("/pnr")
async def get_pnr():
    """Point of No Return 정보"""
    pnr_days = 14
    
    return {
        "pnr_days": pnr_days,
        "pnr_date": (datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)).isoformat(),
        "state": determine_state(pnr_days),
        "acceleration": 1.0,  # 가속률 (1.0 = 정상)
        "message": f"{pnr_days}일 후 복구 불가"
    }


@router.get("/state")
async def get_state():
    """현재 시스템 상태"""
    costs = calculate_costs()
    total_loss = sum(costs.values())
    pnr_days = 14
    state = determine_state(pnr_days)
    
    return {
        "state": state,
        "total_loss": total_loss,
        "pnr_days": pnr_days,
        "can_recover": state != "IRREVERSIBLE",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/demo/{state_type}")
async def get_demo_state(
    state_type: str,
    role: str = Query("subject", description="subject/operator/sponsor")
):
    """
    데모 상태별 바인딩
    
    state_type: safe, warning, critical, irreversible
    """
    if not ENGINE_AVAILABLE:
        return {"error": "Engine not available"}
    
    # 상태별 엔진 생성
    state_type = state_type.lower()
    
    if state_type == "critical":
        engine = create_critical_engine()
    elif state_type == "irreversible":
        engine = create_irreversible_engine()
    else:
        engine = create_demo_engine()
        if state_type == "safe":
            engine.pnr_initial = 30
        elif state_type == "warning":
            engine.pnr_initial = 14
    
    engine.compute_snapshot(role=role)
    return engine.to_brief_binding(role)


# ═══════════════════════════════════════════════════════════
# LEGACY ENDPOINTS (기존 프론트엔드 호환)
# ═══════════════════════════════════════════════════════════

@router.get("/legacy/solar-binding")
async def legacy_solar_binding():
    """기존 solar.html 호환용"""
    costs = calculate_costs()
    total = sum(costs.values())
    
    return {
        "survival_time": 216,
        "float_pressure": 0.38,
        "risk": 58,
        "gate": "RED",
        "impact_percent": -58,
        "planets": [
            {"name": "Time", "value": costs["time"] / total},
            {"name": "Risk", "value": costs["risk"] / total},
            {"name": "Resource", "value": costs["resource"] / total},
            {"name": "Position", "value": costs["position"] / total},
            {"name": "Learning", "value": costs["learning"] / total},
            {"name": "Trust", "value": costs["trust"] / total},
            {"name": "Irreversibility", "value": costs["irreversibility"] / total}
        ]
    }


@router.get("/snapshot")
async def physics_snapshot():
    """현재 물리 스냅샷 (레거시)"""
    costs = calculate_costs()
    total = sum(costs.values())
    
    return {
        "risk": min(100, int(total / 200000)),
        "entropy": 0.14,
        "pressure": 0.22,
        "flow": 0.65,
        "shock": costs["risk"] / total,
        "friction": costs["resource"] / total,
        "cohesion": costs["trust"] / total,
        "recovery": 0.10
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


# ═══════════════════════════════════════════════════════════
# Role-Based UI Binding API
# ═══════════════════════════════════════════════════════════

@router.get("/ui-binding")
async def physics_ui_binding(
    role: str = Query("subject", description="subject/operator/sponsor/employer/institution")
):
    """
    Role별 UI 바인딩 데이터
    Engine → UI Element 직접 매핑
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
    
    # Fallback: Brief 기준 데이터
    costs = calculate_costs()
    cost_rates = calculate_cost_rates()
    total_loss = sum(costs.values())
    loss_rate = sum(cost_rates.values())
    pnr_days = 14
    state = determine_state(pnr_days)
    risk = min(100, int(total_loss / 200000))
    
    # Role별 설정
    configs = {
        "subject": {
            "icon": "👤", "name": "SUBJECT", "action": "선택",
            "success_text": "기록됨", "primary_label": "SURVIVAL",
            "primary_unit": "일", "impact_prefix": "₩", "color": "#00ff88"
        },
        "operator": {
            "icon": "🎯", "name": "OPERATOR", "action": "개입",
            "success_text": "개입됨", "primary_label": "TOTAL",
            "primary_unit": "명", "impact_prefix": "⚠️", "color": "#45B7D1"
        },
        "sponsor": {
            "icon": "💰", "name": "SPONSOR", "action": "최적화",
            "success_text": "최적화됨", "primary_label": "INVESTED",
            "primary_unit": "", "impact_prefix": "📉", "color": "#FFD700"
        },
        "employer": {
            "icon": "🏢", "name": "EMPLOYER", "action": "유지",
            "success_text": "유지됨", "primary_label": "HIRED",
            "primary_unit": "명", "impact_prefix": "👥", "color": "#96CEB4"
        },
        "institution": {
            "icon": "🏛️", "name": "INSTITUTION", "action": None,
            "success_text": "", "primary_label": "SYSTEM MASS",
            "primary_unit": "OCU", "impact_prefix": "🔒", "color": "#DDA0DD"
        }
    }
    
    config = configs[role]
    
    return {
        "role": role,
        "config": config,
        "state": state,
        "gate": "GREEN" if state == "SAFE" else "AMBER" if state == "WARNING" else "RED",
        "total_loss": total_loss,
        "loss_rate": loss_rate,
        "pnr_days": pnr_days,
        "costs": costs,
        "cost_rates": cost_rates,
        "action": {
            "visible": state != "IRREVERSIBLE" and role != "institution",
            "name": config["action"],
            "success_text": config["success_text"]
        },
        "style": {
            "primary_color": config["color"],
            "danger_color": "#ff4444",
            "warning_color": "#ffaa00"
        }
    }


@router.get("/ui-binding/all")
async def physics_ui_binding_all():
    """모든 Role의 UI 바인딩 데이터 (비교용)"""
    roles = ["subject", "operator", "sponsor", "employer", "institution"]
    result = {}
    
    for role in roles:
        result[role] = await physics_ui_binding(role)
    
    return {
        "roles": result,
        "engine_available": ENGINE_AVAILABLE
    }
