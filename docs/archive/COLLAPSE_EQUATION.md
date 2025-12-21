# AUTUS Collapse Equation v1.0
## LOCKED - DO NOT MODIFY

### Status Thresholds
```
S_CRIT     = 0.20  →  STABLE → WARNING
S_FAIL     = 0.40  →  WARNING → UNSTABLE
S_COLLAPSE = 0.80  →  UNSTABLE → COLLAPSED
```

### State Transitions
```
STABLE   : Entropy ≤ 0.20
WARNING  : 0.20 < Entropy ≤ 0.40
UNSTABLE : 0.40 < Entropy < 0.80
COLLAPSED: Entropy ≥ 0.80 (FROZEN - only RESET recovers)
```

### Entropy Dynamics
```
Per tick:    Entropy += 0.04 × (1 - Boundary)
PRESSURE:    Entropy += 0.08 (direct injection)
ENGINES:     Entropy -= 0.25
```

### Recovery Path
```
COLLAPSED → RESET → STABLE
UNSTABLE  → ENGINES × N → STABLE
```

### Invariants
```
1. COLLAPSED → all inputs frozen except RESET
2. Entropy is bounded [0, ∞)
3. RESET always succeeds
```

---
AUTUS Physics v2.5
Collapse Equation v1.0 LOCKED
