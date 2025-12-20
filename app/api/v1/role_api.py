"""
AUTUS Role API
역할별 UI/권한 관리
"""

from fastapi import APIRouter, Path
from typing import Optional

router = APIRouter(prefix="/api/v1/role", tags=["role"])


# 역할 정의
ROLES = {
    "subject": {
        "name": "Subject",
        "name_kr": "학생",
        "icon": "👤",
        "priority": 1,
        "permissions": {
            "can_view": "self",
            "can_commit": False,
            "can_action": False,
            "can_audit": False,
            "can_override": False
        },
        "ui_config": {
            "show_planets": True,
            "show_audit": False,
            "show_admin": False,
            "show_actions": True,
            "primary_action": "RECOVER"
        },
        "allowed_commit_types": []
    },
    "operator": {
        "name": "Operator",
        "name_kr": "운영자",
        "icon": "🔧",
        "priority": 2,
        "permissions": {
            "can_view": "cluster",
            "can_commit": "auto",
            "can_action": "auto",
            "can_audit": "read",
            "can_override": False
        },
        "ui_config": {
            "show_planets": True,
            "show_audit": True,
            "show_admin": True,
            "show_actions": True,
            "primary_action": None
        },
        "allowed_commit_types": ["management", "outcome"]
    },
    "sponsor": {
        "name": "Sponsor",
        "name_kr": "후원자",
        "icon": "💰",
        "priority": 4,
        "permissions": {
            "can_view": "cluster",
            "can_commit": True,
            "can_action": False,
            "can_audit": "read",
            "can_override": False
        },
        "ui_config": {
            "show_planets": True,
            "show_audit": True,
            "show_admin": False,
            "show_actions": False,
            "primary_action": None
        },
        "allowed_commit_types": ["grant", "scholarship"]
    },
    "employer": {
        "name": "Employer",
        "name_kr": "고용주",
        "icon": "🏢",
        "priority": 3,
        "permissions": {
            "can_view": "cluster",
            "can_commit": True,
            "can_action": False,
            "can_audit": "read",
            "can_override": False
        },
        "ui_config": {
            "show_planets": True,
            "show_audit": True,
            "show_admin": False,
            "show_actions": False,
            "primary_action": None
        },
        "allowed_commit_types": ["wage", "outcome"]
    },
    "institution": {
        "name": "Institution",
        "name_kr": "기관",
        "icon": "🏛️",
        "priority": 5,
        "permissions": {
            "can_view": "all",
            "can_commit": True,
            "can_action": False,
            "can_audit": "write",
            "can_override": False
        },
        "ui_config": {
            "show_planets": True,
            "show_audit": True,
            "show_admin": True,
            "show_actions": False,
            "primary_action": None
        },
        "allowed_commit_types": ["tuition", "grant", "visa", "academic"]
    },
    "system": {
        "name": "System",
        "name_kr": "시스템",
        "icon": "🔒",
        "priority": 6,
        "permissions": {
            "can_view": "all",
            "can_commit": "auto",
            "can_action": "auto",
            "can_audit": "write",
            "can_override": True
        },
        "ui_config": {
            "show_planets": True,
            "show_audit": True,
            "show_admin": True,
            "show_actions": True,
            "primary_action": None
        },
        "allowed_commit_types": ["system", "emergency"]
    }
}


@router.get("/ui/{role}")
async def get_role_ui(role: str = Path(..., description="subject/operator/sponsor/employer/institution/system")):
    """역할별 UI 설정"""
    role_data = ROLES.get(role.lower(), ROLES["subject"])
    return {
        "role": role,
        "name": role_data["name"],
        "name_kr": role_data["name_kr"],
        "icon": role_data["icon"],
        "config": role_data["ui_config"],
        "permissions": role_data["permissions"],
        "allowed_commit_types": role_data["allowed_commit_types"],
        "panels": {
            "action_buttons": role_data["permissions"]["can_action"] in [True, "auto"],
            "commit_create": role_data["permissions"]["can_commit"] in [True, "auto"],
            "audit_log": role_data["permissions"]["can_audit"] in ["read", "write"],
            "risk_chart": True,
            "survival_mass": True,
            "system_state": role.lower() in ["operator", "system"],
            "cluster_view": role.lower() in ["operator", "sponsor", "system"],
            "settings": role.lower() == "system"
        },
        "buttons": {
            "LOCK": role_data["permissions"]["can_action"] in [True, "auto"],
            "HOLD": role_data["permissions"]["can_action"] in [True, "auto"],
            "REJECT": role_data["permissions"]["can_action"] in [True, "auto"],
            "CREATE_COMMIT": role_data["permissions"]["can_commit"] in [True, "auto"],
            "CLOSE_COMMIT": role.lower() in ["operator", "system"],
            "OVERRIDE": role_data["permissions"]["can_override"]
        }
    }


@router.get("/permissions/{role}")
async def get_role_permissions(role: str):
    """역할별 권한"""
    role_data = ROLES.get(role.lower(), ROLES["subject"])
    return {
        "role": role,
        "priority": role_data["priority"],
        "permissions": role_data["permissions"],
        "allowed_commit_types": role_data["allowed_commit_types"]
    }


@router.get("/list")
@router.get("/all")
async def list_roles():
    """모든 역할 목록"""
    return {
        "roles": [
            {
                "id": role_id,
                "name": role_data["name"],
                "name_kr": role_data["name_kr"],
                "icon": role_data["icon"],
                "priority": role_data["priority"]
            }
            for role_id, role_data in ROLES.items()
        ],
        "priority_rule": "System > Institution > Sponsor > Employer > Operator > Subject"
    }


@router.post("/conflict")
async def resolve_conflict(role1: str, role2: str):
    """역할 충돌 해결"""
    r1_data = ROLES.get(role1.lower(), {"priority": 0})
    r2_data = ROLES.get(role2.lower(), {"priority": 0})
    
    winner = role1 if r1_data["priority"] >= r2_data["priority"] else role2
    
    return {
        "role1": role1,
        "role2": role2,
        "winner": winner,
        "reason": f"{winner} has higher priority"
    }


@router.get("/check/{role}/{action}")
async def check_permission(role: str, action: str):
    """역할 권한 확인"""
    role_data = ROLES.get(role.lower(), ROLES["subject"])
    
    # action 매핑
    action_map = {
        "view": "can_view",
        "commit": "can_commit",
        "action": "can_action",
        "audit": "can_audit",
        "override": "can_override"
    }
    
    perm_key = action_map.get(action.lower(), "can_view")
    perm_value = role_data["permissions"].get(perm_key, False)
    
    allowed = perm_value in [True, "auto", "read", "write", "self", "cluster", "all"]
    
    return {
        "role": role,
        "action": action,
        "allowed": allowed,
        "value": perm_value,
        "reason": "Permission granted" if allowed else "Permission denied"
    }
