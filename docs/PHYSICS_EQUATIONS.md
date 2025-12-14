# AUTUS Physics Equations v1.0

## 1. Core Signals

### Pressure (P)
```
P(t+1) = P(t) × 0.92 + ΔP
```

### Release (R)
```
R(t+1) = R(t) × 0.92 + ΔR
```

### Decision (D)
```
D(t+1) = D(t) × 0.85 + ΔD
```

### Entropy (E)
```
imbalance = max(0, P - R)
E(t+1) = clamp(E + 0.01 × imbalance - 0.008 × R, 0, 1)
```

### Gravity (G)
```
G(t+1) = clamp(0.70×G + 0.20×min(R,3)/3 + 0.10×D - 0.15×E, 0, 1)
```

## 2. Status Classification
```python
if E >= 0.70 or (G <= 0.15 and E >= 0.55):
    status = "RED"
elif E >= 0.45 or G <= 0.30 or bottleneck:
    status = "YELLOW"
else:
    status = "GREEN"
```

## 3. Bottleneck Detection

| Condition | Bottleneck | Action |
|-----------|------------|--------|
| E > 0.55 AND P > R + 0.5 | OVERLOAD | REMOVE |
| R < 0.20 AND P > 0.30 | NO_RELEASE | REMOVE |
| D < 0.15 AND P > 0.40 | DECISION_DELAY | DECIDE |

## 4. Failure Prediction
```
rate = 0.02 + 0.02×(P>R) + 0.01×(D<0.2) + 0.03×E
margin = max(0, 0.85 - E)
failure_in_ticks = clamp(margin / rate, 1, 60)
```

## 5. Execute Effects

| Action | P | R | D |
|--------|---|---|---|
| AUTO_STABILIZE | -1.0 | +1.5 | +0.6 |
| REMOVE_LOW_IMPACT | -0.8 | +1.0 | 0 |
| FORCE_DECISION | 0 | 0 | +1.0 |

## 6. Invariants

- tick: monotonically increasing
- E: bounded [0, 1]
- G: bounded [0, 1]
- status: deterministic
- audit: append-only
