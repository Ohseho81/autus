# app/mandala_transform.py
"""
Mandala Transform (정본)
========================

Page3 allocations → Physics 변환

Version: 1.0.0
Status: 🔒 LOCKED

8방향 만다라 배분 → 물리량 변환 수식

┌────────────────────────────────────────────────────────────────┐
│  N  : Constraint → Volume ↓ (k=0.35)                          │
│  NE : Risk → σ ↑ (k=0.70)                                     │
│  E  : Energy → E ↑ (k=0.65)                                   │
│  SE : Leak → Leak ↑ (k=0.60)                                  │
│  S  : Pattern → Pressure ↑, σ ↓ (k=0.55, -0.40)               │
│  SW : Drag → Pressure ↓ (k=0.50)                              │
│  W  : Connection → Leak ↓, σ ↓ (k=0.45, -0.25)                │
│  NW : Compression → Volume ↓↓ (k=0.55)                        │
└────────────────────────────────────────────────────────────────┘
"""

from __future__ import annotations
from typing import Dict
from .autus_state import clamp01

SLOTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

# ================================================================
# BASE VALUES (LOCKED)
# ================================================================
E_BASE = 0.35
P_BASE = 0.40
L_BASE = 0.35
V_BASE = 0.70
SIGMA_BASE = 0.30

# ================================================================
# K COEFFICIENTS (LOCKED)
# ================================================================
K_E = 0.65          # E slot → Energy

K_S = 0.55          # S slot → Pressure+
K_SW = 0.50         # SW slot → Pressure-

K_SE = 0.60         # SE slot → Leak+
K_W = 0.45          # W slot → Leak-

K_N = 0.35          # N slot → Volume-
K_NW = 0.55         # NW slot → Volume--

K_NE = 0.70         # NE slot → σ+
K_S_SIGMA = 0.40    # S slot → σ-
K_W_SIGMA = 0.25    # W slot → σ-


def normalize_allocations(a: Dict[str, float]) -> Dict[str, float]:
    """
    Allocations 정규화 (sum = 1.0)
    
    LOCK: 합이 0이면 E=1, 나머지=0
    """
    total = sum(max(0.0, float(a.get(k, 0.0))) for k in SLOTS)
    if total <= 0.0:
        return {k: (1.0 if k == "E" else 0.0) for k in SLOTS}
    return {k: (max(0.0, float(a.get(k, 0.0))) / total) for k in SLOTS}


def mandala_to_physics(alloc: Dict[str, float]) -> Dict[str, float]:
    """
    만다라 배분 → 물리량 변환 (정본)
    
    LOCKED FORMULAS:
    - E = E_BASE + K_E * a["E"]
    - Pressure = P_BASE + K_S * a["S"] - K_SW * a["SW"]
    - Leak = L_BASE + K_SE * a["SE"] - K_W * a["W"]
    - Volume = V_BASE - K_N * a["N"] - K_NW * a["NW"]
    - σ = SIGMA_BASE + K_NE * a["NE"] - K_S_SIGMA * a["S"] - K_W_SIGMA * a["W"]
    
    Derived:
    - E_eff = E × (1 - Leak)
    - Density = (E_eff × Pressure) / Volume
    - Stability = 1 - σ
    
    Args:
        alloc: 정규화된 allocations (sum=1)
    
    Returns:
        {E, pressure, leak, volume, sigma, density, stability}
    """
    # Normalize first
    a = normalize_allocations(alloc)
    
    # Energy
    E = clamp01(E_BASE + K_E * a.get("E", 0))
    
    # Pressure (집중/반복)
    pressure = clamp01(P_BASE + K_S * a.get("S", 0) - K_SW * a.get("SW", 0))
    
    # Leak (누수)
    leak = clamp01(L_BASE + K_SE * a.get("SE", 0) - K_W * a.get("W", 0))
    
    # Volume (목표 부피)
    volume = clamp01(V_BASE - K_N * a.get("N", 0) - K_NW * a.get("NW", 0))
    volume = max(0.05, volume)  # Prevent division by zero
    
    # Entropy (σ)
    sigma = clamp01(
        SIGMA_BASE 
        + K_NE * a.get("NE", 0) 
        - K_S_SIGMA * a.get("S", 0) 
        - K_W_SIGMA * a.get("W", 0)
    )
    
    # Effective Energy (누수 반영)
    E_eff = E * (1 - leak)
    
    # Density
    density = clamp01((E_eff * pressure) / volume)
    
    # Stability
    stability = clamp01(1 - sigma)
    
    return {
        "E": E,
        "pressure": pressure,
        "leak": leak,
        "volume": volume,
        "sigma": sigma,
        "density": density,
        "stability": stability
    }





