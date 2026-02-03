# AUTUS Navigation Specification

## LOCKED: Do not modify without LOCK review

## Pages (9 Total)
| Page | Name | Access | Purpose |
|------|------|--------|---------|
| P1 | Decision Inbox | Manual/Auto | Single decision card + A/K/D |
| P2 | Friction Delta | Auto-jump | Δ only: questions, interventions, exceptions |
| P3 | Kill Board | Manual | Running rules + one-click KILL |
| P4 | Approval Filter | System-only | Allowed categories + blocked log |
| P5 | Eligibility Engine | Manual | YES/NO list only |
| P6 | Fact Ledger | Manual | Append-only timeline |
| P7 | Long-Term Check | Forced | UP/DOWN/UNKNOWN toggle |
| P8 | Decision Cost Budget | Forced | Weekly HIGH cap display |
| P9 | Input Channel Rule | System-only | Schema + ignored logs |

## Entry Point
- **Always P1**

## Auto Transitions
```
APPROVE: P1 → P7 (must choose) → P8 (budget check) → DONE → P1
DEFER: P1 → set TTL(24h) → on expiry → AUTO KILL → P1
KILL: anywhere → P3 (confirm) → DONE → P1
RISK: on escalation.raised OR Δ threshold → P2 → back to P1
```

## Global Keybindings
| Key | Action |
|-----|--------|
| A | APPROVE (P1 only) |
| K | KILL (global) |
| D | DEFER (P1 only) |
| ESC | Go to P1 |
| 1 | Go to P1 |
| 2 | Go to P2 |
| 3 | Go to P3 |
| 5 | Go to P5 |
| 6 | Go to P6 |

## Blocked Navigation
- P4, P7, P8, P9 are NOT reachable via manual navigation
- No tabs, no sidebar
- One page visible at a time
