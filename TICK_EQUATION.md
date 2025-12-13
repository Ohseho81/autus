# AUTUS Tick Equation v1.0
## LOCKED - DO NOT MODIFY

### Tick Equation
```
tick(t+1) = tick(t) + 1
  iff any state-changing event occurs
```

### State-changing Events
- CYCLE: tick += 1
- PRESSURE: tick += 1
- ENGINES: tick += 0 (no tick, instant effect)
- RESET: tick = 0

### Cycle Equation
```
cycle(t+1) = cycle(t) + 1
  iff (UNSTABLE → STABLE) sustained for T_HOLD ticks
```

### Invariants (MUST HOLD)
```
Invariant 1: HUD.tick == /status.tick == log.tick
Invariant 2: cycle <= tick (always)
Invariant 3: tick is monotonically increasing (except RESET)
```

### Physics Constants (LOCKED)
- S_CRIT = 0.20 (Entropy warning threshold)
- S_FAIL = 0.40 (Entropy unstable threshold)
- T_HOLD = 10 (Ticks to confirm stability for cycle increment)
- S_GAIN = 0.06 (Entropy gain per tick when B=0)
- S_REDUCE = 0.20 (Entropy reduction per ENGINES)

### Truth Authority
```
Backend /autus/solar/status = SINGLE SOURCE OF TRUTH
Frontend = DISPLAY ONLY (no calculation)
```

---
AUTUS Physics v2.3
Signed: Loop 15
