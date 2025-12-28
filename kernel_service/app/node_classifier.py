# app/node_classifier.py
"""
Node Type Classifier (정본)
===========================

물리량 기반 노드 타입 판정

Version: 1.0.0
Status: 🔒 LOCKED

NodeType 정의:
┌─────────────────────────────────────────────────────────────────┐
│  THRESHOLD        : Density > 0.75 AND σ < 0.25                │
│  ENTROPY_DOMINANT : σ > 0.60                                   │
│  STABLE           : Stability > 0.70                           │
│  MASS_DOMINANT    : M > 0.60 AND σ < 0.40                      │
│  FLOW_DOMINANT    : E > 0.50                                   │
│  KINETIC          : E > M                                      │
│  POTENTIAL        : E < 0.30 AND σ < 0.50                      │
│  DIFFUSE          : 기타                                        │
└─────────────────────────────────────────────────────────────────┘
"""


def classify_node(
    M: float,
    E: float,
    sigma: float,
    density: float,
    stability: float = None
) -> str:
    """
    노드 타입 분류 (정본)
    
    판정 순서 (LOCKED):
    1. THRESHOLD: Density > 0.75 AND σ < 0.25
    2. ENTROPY_DOMINANT: σ > 0.60
    3. STABLE: Stability > 0.70
    4. MASS_DOMINANT: M > 0.60 AND σ < 0.40
    5. FLOW_DOMINANT: E > 0.50
    6. KINETIC: E > M
    7. POTENTIAL: E < 0.30 AND σ < 0.50
    8. DIFFUSE: 기타
    
    Args:
        M: Mass
        E: Energy
        sigma: Entropy (σ)
        density: Density
        stability: Stability (optional, computed from sigma)
    
    Returns:
        NodeType string
    """
    # Compute stability if not provided
    if stability is None:
        stability = 1.0 - sigma
    
    # 1. THRESHOLD (임계 상태)
    if density > 0.75 and sigma < 0.25:
        return "THRESHOLD"
    
    # 2. ENTROPY_DOMINANT (엔트로피 지배)
    if sigma > 0.60:
        return "ENTROPY_DOMINANT"
    
    # 3. STABLE (안정 상태)
    if stability > 0.70:
        return "STABLE"
    
    # 4. MASS_DOMINANT (질량 지배)
    if M > 0.60 and sigma < 0.40:
        return "MASS_DOMINANT"
    
    # 5. FLOW_DOMINANT (흐름 지배)
    if E > 0.50:
        return "FLOW_DOMINANT"
    
    # 6. KINETIC (운동 상태)
    if E > M:
        return "KINETIC"
    
    # 7. POTENTIAL (잠재 상태)
    if E < 0.30 and sigma < 0.50:
        return "POTENTIAL"
    
    # 8. DIFFUSE (확산 상태)
    return "DIFFUSE"





