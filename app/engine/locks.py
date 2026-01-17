"""
AUTUS 잠금 프로파일
==================

상위 역할 활성 시 하위 자동화 잠금
"""

from app.core.roles import Role


def lock_profile(role: Role) -> dict:
    """
    역할별 UI 잠금 프로파일
    
    locks는 UI에서 비활성화해야 하는 기능을 정의
    """
    
    if role == Role.DECIDER:
        # DECIDER: 결정만 가능, 실행/조율 잠금
        return {
            "executor_execute": True,
            "executor_automate": True,
            "operator_reschedule": True,
            "operator_reassign": True,
            "operator_prepare": True,
            "decider_only": False,
        }
    
    if role == Role.OPERATOR:
        # OPERATOR: 조율 가능, 자동화 제한, 결정 잠금
        return {
            "executor_execute": False,
            "executor_automate": True,  # 자동화 깊이 제한
            "operator_reschedule": False,
            "operator_reassign": False,
            "operator_prepare": False,
            "decider_only": True,
        }
    
    # EXECUTOR: 실행/자동화 가능, 조율/결정 잠금
    return {
        "executor_execute": False,
        "executor_automate": False,
        "operator_reschedule": True,
        "operator_reassign": True,
        "operator_prepare": True,
        "decider_only": True,
    }
