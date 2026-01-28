# 🏛️ AUTUS 2.0

> **관계 유지력 OS (Relationship Retention Operating System)**
> 
> *"A = R^σ — 유지력은 관계(R)의 환경(σ) 제곱이다"*

---

## 🎯 Overview

AUTUS는 **관계 기반 비즈니스의 유지력을 물리 법칙으로 모델링**하는 시스템입니다.

```
┌─────────────────────────────────────────────────┐
│  AUTUS 2.0                                      │
│  ─────────────────────────────────────────────  │
│  Core Views:        8개 (Cockpit, Pulse, etc.)  │
│  Role Dashboards:   5개 (Owner, Manager, etc.)  │
│  KRATON Components: 12 Cycles                   │
│  API Endpoints:     50+                         │
└─────────────────────────────────────────────────┘
```

### 핵심 공식

```
A = R^σ (유지력 = 관계^환경)

R = TSEL 기반 관계지수
  - T: Trust (신뢰)
  - S: Satisfaction (만족)
  - E: Engagement (참여)
  - L: Loyalty (충성)

σ = 환경지수 (Internal + Voice + External)
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+ (또는 Supabase)

### Installation

```bash
# Clone
git clone https://github.com/Ohseho81/autus.git
cd autus

# Frontend
cd frontend && npm install

# Backend (선택)
pip install -r requirements.txt
```

### Run

```bash
# Frontend (Vite)
cd frontend && npm run dev
# → http://localhost:3000

# Backend (FastAPI)
uvicorn backend.main:app --reload
# → http://localhost:8000

# Vercel API (Next.js)
cd vercel-api && npm run dev
# → http://localhost:3001
```

---

## 📁 Project Structure

```
autus/
├── frontend/                 # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── views/v2/    # KRATON 12 Cycles UI ⭐
│   │   │   │   ├── kraton/  # Premium Components
│   │   │   │   └── design-system/
│   │   │   ├── shell/       # Role-based Shell
│   │   │   ├── Onboarding/  # 온보딩 시스템
│   │   │   └── ...
│   │   ├── hooks/           # Custom Hooks
│   │   ├── pages/           # Page Components
│   │   └── api/             # API Clients
│   └── public/
│
├── backend/                  # FastAPI Backend
│   ├── routers/             # API Routes
│   ├── database/            # SQL Schemas
│   └── workflows/           # JSON Workflows
│
├── vercel-api/              # Vercel Serverless API
│   ├── app/api/             # API Routes
│   └── lib/                 # Utilities
│
├── docs/                    # Documentation (28 files)
├── n8n/                     # N8N Workflows (20 files)
├── scripts/                 # Automation Scripts
└── tests/                   # Test Suite
```

---

## 🎨 KRATON 12 Cycles

프리미엄 UI 컴포넌트 시스템:

| Cycle | Component | Description |
|-------|-----------|-------------|
| 1 | NeonGauge3D | 3D 네온 게이지 |
| 2 | Real-time Binding | 실시간 데이터 바인딩 |
| 3 | ECGLine | 맥박 애니메이션 |
| 4 | AlertCard | 위험 알림 효과 |
| 5 | GlassCard | 글라스모피즘 카드 |
| 6 | ForecastCard | 시간 기반 그라데이션 |
| 7 | StudentCard | 프로필 카드 |
| 8 | TimelineItem | 무한 타임라인 |
| 9 | ActionCard | 드래그 앤 드롭 |
| 10 | MiniHeatmap | 히트맵 시각화 |
| 11 | Page Transitions | 페이지 전환 |
| 12 | Responsive Polish | 반응형 마감 |

---

## 🖥️ Core Views

| View | URL | Description |
|------|-----|-------------|
| Cockpit | `#cockpit` | 메인 대시보드 |
| Pulse | `#pulse` | 실시간 상태 |
| Microscope | `#microscope` | 개별 분석 |
| Forecast | `#forecast` | 예측 |
| Timeline | `#timeline` | 시간 흐름 |
| Actions | `#actions` | 액션 관리 |
| Map | `#map` | 지역 분포 |
| Crystal | `#crystal` | 결정화 뷰 |

---

## 👥 Role-based System

| Role | 권한 | First View |
|------|------|------------|
| Owner | 전체 접근 | Cockpit |
| Manager | 운영 관리 | Pulse |
| Teacher | 교육 관리 | Microscope |
| Parent | 자녀 정보 | Timeline |
| Student | 개인 정보 | Actions |

---

## 🔧 Commands

```bash
# Development
npm run dev           # Frontend dev server
npm run lint          # ESLint check
npm run build         # Production build

# Backend
make dev              # FastAPI server
make test             # Run tests

# Docker
make docker-up        # Start containers
make docker-down      # Stop containers
```

---

## 📊 Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Build**: Vite 5
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Icons**: Lucide React

### Backend
- **API**: FastAPI (Python)
- **Serverless**: Vercel (Next.js)
- **Database**: Supabase (PostgreSQL)

### Automation
- **Workflows**: N8N
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana

---

## 📚 Documentation

- [AUTUS Spec](docs/AUTUS_SPEC_v1.md)
- [Architecture](docs/ARCHITECTURE_FINAL.md)
- [API Reference](docs/API_SPEC.md)
- [KRATON Spec](docs/KRATON_SPEC.md)
- [User Guide](docs/USER_GUIDE.md)

---

## 🏛️ Philosophy

```
"목표를 던지고, 예외만 승인하고, 결과를 확인한다."

AUTUS는 오너의 조종석이다.
- 데이터는 Zero Meaning으로 변환
- 돈의 흐름은 물리 법칙으로 모델링
- 5-Tier 시스템으로 관계 분류
- 관찰자 모드로 자연 흐름 관찰
```

---

## 📄 License

MIT License

---

> **AUTUS 2.0 — 관계 유지력의 물리학**
