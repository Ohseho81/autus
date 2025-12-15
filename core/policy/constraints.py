"""Policy Constraint - 물리 제약 정의"""
from pydantic import BaseModel

class PolicyConstraint(BaseModel):
    max_energy: float = 1.0
    max_flow: float = 1.0
    risk_cap: float = 1.0
    friction: float = 0.0  # 0~1, 흐름 감소 계수
