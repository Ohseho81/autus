# 🏛️ AUTUS v1.0

> **Physics-Driven Decision System**
> 
> *"v1.0의 세계는 물리로만 움직인다. 기록은 남고, 설명은 남지 않는다."*

---

## 🎯 Overview

AUTUS는 **의사결정 도구가 아니라, 의사결정이 닫히는 조건을 현실 위에 드러내는 시스템**입니다.

```
┌─────────────────────────────────────────────────┐
│  AUTUS v1.0 RC                                  │
│  ─────────────────────────────────────────────  │
│  User Pages:      2                             │
│  User Functions:  3                             │
│  Explanations:    0 (K10) / Min (K2)            │
│  Decisions Given: 0                             │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Installation

```bash
# Clone
git clone https://github.com/your-org/autus.git
cd autus

# Backend
pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### Run

```bash
# Backend
make dev
# or
uvicorn backend.main:app --reload

# Frontend
cd frontend && npm run dev
```

### Access

- **Portal**: http://localhost:3000/portal.html
- **K2 (Operator)**: http://localhost:3000/k2-operator.html
- **K10 (Observer)**: http://localhost:3000/k10-observer.html
- **API Docs**: http://localhost:8000/docs

---

## 📐 Core Principles

### Physics-Only

| Constant | Range | Description |
|----------|-------|-------------|
| M | 0.0-10.0 | Mass (질량) |
| Ψ | 0.0-1.0 | Irreversibility (비가역성) |
| R | 0.0-10.0 | Responsibility Radius (책임 반경) |
| F₀ | 0.0-10.0 | Failure Floor (실패 바닥) |

### Gate System

```
PASS:   S < 3.0   (통과)
RING:   3.0 ≤ S < 5.0   (경고)
BOUNCE: 5.0 ≤ S < 7.0   (반발)
LOCK:   S ≥ 7.0   (잠금)
```

### K-Scale

| Scale | Role | Phase |
|-------|------|-------|
| K2 | Operator (실행자) | Phase 2 |
| K4-K6 | Manager (운영자) | Phase 2.5 |
| K10 | Observer (관측자) | Phase 3 |

---

## 📁 Structure

```
autus/
├── backend/           # FastAPI Backend
│   ├── api/          # REST Endpoints (26)
│   ├── physics/      # Physics Engine
│   ├── core/         # Core Logic
│   └── db/           # Database Schemas
│
├── frontend/          # Vite + React
│   ├── portal.html   # Main Portal
│   ├── k2-operator.html
│   ├── k10-observer.html
│   └── src/          # React Components
│
├── docs/              # Documentation (28)
│   ├── AUTUS_V1_FINAL.md
│   ├── KSCALE_UI_POLICY.md
│   └── LAUNCH_DAY_OPS.md
│
└── tests/             # Test Suite (19)
```

---

## 📊 RC Status

| Check | Status |
|-------|--------|
| Feature Freeze | ✅ |
| UI Silence | ✅ |
| Gate Physical Feel | ✅ |
| K-Scale Routing | ✅ |
| Auto Transition | ✅ |
| Audit Integrity | ✅ |
| Performance | ✅ |
| Release Guard | ✅ |

---

## 🔧 Commands

```bash
# Development
make dev          # Run backend
make frontend     # Run frontend
make test         # Run tests

# Build
make build        # Build frontend
make docker-up    # Start Docker

# Check
make check        # Browser check
```

---

## 📚 Documentation

- [AUTUS V1 Final](docs/AUTUS_V1_FINAL.md)
- [K-Scale UI Policy](docs/KSCALE_UI_POLICY.md)
- [Launch Day Ops](docs/LAUNCH_DAY_OPS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)

---

## 🏛️ Philosophy

```
AUTUS는 설명하지 않는다.
AUTUS는 권고하지 않는다.
AUTUS는 기록만 한다.

결정은 Gate와 환경에서 닫힌다.
UI는 보여주고, 느끼게 할 뿐이다.
```

---

## 📄 License

MIT License

---

> **AUTUS v1.0 — Release Ready**
# Auto-deploy test Sat Jan 17 15:59:26 KST 2026
