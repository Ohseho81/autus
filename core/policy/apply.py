"""Policy Apply - 물리 제약 적용"""
from .constraints import PolicyConstraint

def apply_policy(energy: float, flow: float, risk: float, policy: PolicyConstraint):
    """Policy 제약을 물리량에 적용"""
    energy = min(energy, policy.max_energy)
    flow = flow * (1.0 - policy.friction)
    risk = min(risk, policy.risk_cap)
    return energy, flow, risk
