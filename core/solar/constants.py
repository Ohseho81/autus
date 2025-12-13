"""
AUTUS Physics Constants - Universal Action Equation
LOCKED - DO NOT MODIFY
"""

# Event Coefficients
ALPHA = 0.12    # PRESSURE: entropy gain (자극/업무)
BETA = 0.25     # RELEASE: entropy reduction (휴식/방출)
GAMMA = 0.9     # DECISION: entropy damping (구조 전이 시)
K = 0.01        # Natural entropy decay per tick

# Initial Values
E0 = 0.0        # Initial entropy
B0 = 1.0        # Initial boundary

# Stability Thresholds (% of boundary)
B1_RATIO = 0.25  # STABLE → WARNING (25%)
B2_RATIO = 0.80  # WARNING → COLLAPSE (80%)

# Gravity Components (G = f(T, E, C))
W_TALENT = 0.4
W_EFFORT = 0.4
W_CONTEXT = 0.2
