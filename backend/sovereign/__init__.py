"""
═══════════════════════════════════════════════════════════════════════════════
🏛️ AUTUS Sovereign Module (주권 모듈)
═══════════════════════════════════════════════════════════════════════════════

데이터 주권을 보호하고, 베테랑의 노하우를 안전하게 관리하는 핵심 모듈

구성:
- zkp.py: 영지식 증명 공명 엔진
- poc.py: 기여 증명 알고리즘

"가두지 않으면서도 훔쳐갈 수 없게"
═══════════════════════════════════════════════════════════════════════════════
"""

from .zkp import (
    ZKResonanceEngine,
    PedersenCommitment,
    SchnorrProof,
    Commitment,
    ZKProof,
    ResonanceProof,
    ProofType,
    get_zkp_engine,
    register_knowledge,
    compute_resonance,
)

from .poc import (
    PoCEngine,
    Contribution,
    ContributorProfile,
    RewardAllocation,
    ContributionType,
    POC_WEIGHTS,
    LEVEL_MULTIPLIERS,
    DOMAIN_SCARCITY,
    get_poc_engine,
    register_contribution,
)


__all__ = [
    # ZKP
    "ZKResonanceEngine",
    "PedersenCommitment",
    "SchnorrProof",
    "Commitment",
    "ZKProof",
    "ResonanceProof",
    "ProofType",
    "get_zkp_engine",
    "register_knowledge",
    "compute_resonance",
    # PoC
    "PoCEngine",
    "Contribution",
    "ContributorProfile",
    "RewardAllocation",
    "ContributionType",
    "POC_WEIGHTS",
    "LEVEL_MULTIPLIERS",
    "DOMAIN_SCARCITY",
    "get_poc_engine",
    "register_contribution",
]
