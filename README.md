# AUTUS

**Universal Action Equation for Human Systems**

## The Equation
```
S(t+1) = S(t) + α·PRESSURE - β·RELEASE - k·e + D·(-γ·e + ΔStructure)
```

## Core Insight

> "Most people add force. Very few change the equation."
> — Elon Canon

- **PRESSURE/RELEASE**: Automatic physics (97% of humans)
- **DECISION**: Structure change (3% of humans)

## State Vector
```
S = { tick, cycle, entropy, boundary, stability }
```

| Symbol | Physics | Human |
|--------|---------|-------|
| tick | Time | Irreversible moments |
| cycle | Phase transition | Structural decisions |
| entropy | Disorder | Cognitive load |
| boundary | Threshold | Capacity limit |
| stability | State | STABLE/WARNING/COLLAPSE |

## Invariants
```
I1. cycle ≤ tick
I2. DECISION → cycle+1 (only)
I3. RESET → cycle unchanged
```

## API
```
GET  /autus/solar/status    → State
POST /autus/solar/pressure  → tick+1, entropy+α
POST /autus/solar/release   → tick+1, entropy-β
POST /autus/solar/reset     → tick+1, entropy=0
POST /autus/solar/decision  → tick+1, cycle+1, entropy×γ
```

## Live Demo

https://solar.autus-ai.com/frontend/index.html

---

## Physics UI

**Semantic Neutrality Compliant** 시각화 모듈

```
physics-ui/
├── backend/    # FastAPI (port 8000)
└── frontend/   # React + Vite (port 5173)
```

### 실행
```bash
# Backend
cd physics-ui/backend
pip install -r requirements.txt
python -m app.main

# Frontend
cd physics-ui/frontend
npm install
npm run dev
```

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/dashboard/state` | 6개 게이지 |
| GET | `/nav/route` | 경로 상태 |
| GET | `/physics/motions` | 모션 상태 |
| POST | `/action/apply` | hold/push/drift |

### SN 규칙
- Canvas 텍스트 렌더링 ✗
- from/to 노드 필드 ✗
- 금액/통화/이름 ✗
- 모션은 Goal 중심만 ✓
- Alternate는 점선으로만 ✓

---

## Philosophy

Reality = State  
Change = Event  
Law = Transition  
Choice = Decision

---

**AUTUS**: The physics of human systems.
