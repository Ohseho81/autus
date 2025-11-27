"""
policy_engine.py
- 상황별/사용자별 맞춤 자동화 정책 엔진
- 정책: 조건(사용자, 시간, 이벤트, 실패 등) → 자동화 액션/우선순위/대체/알림
"""
import datetime
from typing import Any, Dict

class PolicyEngine:
    def __init__(self):
        # 예시 정책: 사용자/시간/이벤트/실패 조건별 액션
        self.policies = [
            {"if": {"user": "admin"}, "then": {"priority": "high", "notify": True}},
            {"if": {"hour": lambda h: h < 9 or h > 18}, "then": {"action": "delay", "notify": True}},
            {"if": {"event": "failure"}, "then": {"action": "auto_recover", "notify": True}},
        ]

    def evaluate(self, context: Dict[str, Any]) -> Dict[str, Any]:
        now = datetime.datetime.now()
        for policy in self.policies:
            cond = policy["if"]
            match = True
            for k, v in cond.items():
                if k == "hour":
                    if not v(now.hour):
                        match = False
                        break
                elif k in context and context[k] != v:
                    match = False
                    break
                elif k not in context:
                    match = False
                    break
            if match:
                return policy["then"]
        return {"action": "default"}

policy_engine = PolicyEngine()
