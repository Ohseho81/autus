# AUTUS Architecture

> "왜 이 구조인지 즉시 답변 가능"

---

## 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTUS SOLAR SYSTEM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │   LAYER 0   │     │   LAYER 1   │     │   LAYER 2   │           │
│  │  IMMUTABLE  │────▶│   SYSTEM    │────▶│ FUNCTIONAL  │           │
│  │    CORE     │     │ COMPLETENESS│     │ COMPLETENESS│           │
│  └─────────────┘     └─────────────┘     └─────────────┘           │
│        │                   │                   │                    │
│        ▼                   ▼                   ▼                    │
│  ┌───────────┐       ┌───────────┐       ┌───────────┐             │
│  │PHYSICS.md │       │  memory   │       │  hq_ui    │             │
│  │CONSTITUTION│      │governance │       │state_engine│            │
│  │  spec/*   │       │consistency│       │learning_loop│           │
│  └───────────┘       │explain... │       │multi_entity│            │
│                      │extensib...│       │  safety   │             │
│                      └───────────┘       └───────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

                              ▲
                              │
                    ┌─────────┴─────────┐
                    │     LAYER 3       │
                    │   DEVELOPMENT     │
                    │   OPERABILITY     │
                    ├───────────────────┤
                    │  slot_map         │
                    │  freeze_control   │
                    │  resume_system    │
                    │  decision_log     │
                    └───────────────────┘
```

---

## 데이터 흐름

```
┌──────────────────────────────────────────────────────────────────┐
│                        EVENT FLOW                                │
└──────────────────────────────────────────────────────────────────┘

  Human Action          Engine Processing         UI Update
       │                      │                       │
       ▼                      ▼                       ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  add_work   │───────▶│   Engine    │───────▶│  Solar HQ   │
│ remove_work │        │   ._tick()  │        │   3D Globe  │
│   decide    │        │             │        │             │
└─────────────┘        └──────┬──────┘        └─────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │   SQLite    │
                       │   Memory    │
                       │             │
                       │ • state     │
                       │ • actors    │
                       │ • audit     │
                       └─────────────┘
```

---

## 9 Planets 구조

```
                    ┌─────────────────────────────────────┐
                    │          PRIORITY ORDER             │
                    │      (CRITICAL 시 숨김 대상)         │
                    └─────────────────────────────────────┘

     1st              2nd              3rd              4th
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ RECOVERY │    │ STABILITY│    │ COHESION │    │  SHOCK   │
│    🔧    │    │    🎯    │    │    🔗    │    │    ⚠️    │
│ 회복력   │    │ 장기안정  │    │ 결속력   │    │ 불확실성  │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
     ↑
  Always
  Visible          5th              6th              7th
                ┌──────────┐    ┌──────────┐    ┌──────────┐
                │ FRICTION │    │ TRANSFER │    │   TIME   │ ← Hidden
                │    ⚡    │    │    📡    │    │    ⏱️   │   in
                │ 마찰/저항 │    │ 전파/이동 │    │ 시간압박  │   CRITICAL
                └──────────┘    └──────────┘    └──────────┘

                     8th              9th
                ┌──────────┐    ┌──────────┐
                │ QUALITY  │    │  OUTPUT  │ ← Hidden in CRITICAL
                │    🛡️    │    │    🔥    │
                │ 품질/완성도│    │ 산출/실행 │
                └──────────┘    └──────────┘
```

---

## GATE 시스템

```
┌─────────────────────────────────────────────────────────────┐
│                      GATE LOGIC                             │
└─────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  Recovery < 30% │──────▶ 🔴 RED
                    └────────┬────────┘
                             │ No
                             ▼
                    ┌─────────────────┐
                    │  Recovery < 60% │──────▶ 🟡 AMBER
                    │       OR        │
                    │ Status=CRITICAL │
                    └────────┬────────┘
                             │ No
                             ▼
                         🟢 GREEN


┌─────────────────────────────────────────────────────────────┐
│                      SLA STRIP                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  WORKER     │  EMPLOYER   │    OPS      │    REG           │
│  ─────────  │  ─────────  │  ─────────  │  ─────────       │
│  Recovery   │  Stability  │   Shock     │   Shock          │
│   < 35%     │   < 20%     │   > 75%     │   > 85%          │
│  = BREACH   │  = AT_RISK  │  = BREACH   │  = BREACH        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 슬롯 기반 개발

```
┌─────────────────────────────────────────────────────────────┐
│                   SLOT LIFECYCLE                            │
└─────────────────────────────────────────────────────────────┘

    NEW SLOT          WORK IN PROGRESS        COMPLETED
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │ PARTIAL │────────▶│ PARTIAL │────────▶│ FILLED  │
   │         │         │         │         │         │
   │ Created │         │ Working │         │  Done   │
   └─────────┘         └─────────┘         └─────────┘
        │                                        │
        │                                        │
        ▼                                        │
   ┌─────────┐                                   │
   │   OFF   │◀──────────────────────────────────┘
   │         │     (Explicitly disabled)
   │ Skipped │
   └─────────┘


┌─────────────────────────────────────────────────────────────┐
│                   AUTUS-PM FLOW                             │
└─────────────────────────────────────────────────────────────┘

   ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
   │  start  │────▶│  focus  │────▶│  done   │────▶│   end   │
   └─────────┘     └─────────┘     └─────────┘     └─────────┘
       │               │               │               │
       ▼               ▼               ▼               ▼
   Load state     Set current     Mark FILLED     Save state
   Show progress  Show checklist  Next suggest    Update today.md
```

---

## API 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    API ENDPOINTS                            │
└─────────────────────────────────────────────────────────────┘

  Frontend (Solar HQ)              Backend (FastAPI)
         │                               │
         │  GET /api/state               │
         │◀─────────────────────────────▶│ SolarHQState
         │                               │ • ts, entity_id
         │                               │ • status (STABLE/WARNING/CRITICAL)
         │                               │ • planets (9개)
         │                               │ • twin (entropy, pressure, risk, flow)
         │                               │ • system (uptime, latency)
         │                               │
         │  GET /stream (SSE)            │
         │◀═════════════════════════════▶│ Real-time updates
         │                               │
         │  POST /event/*                │
         │─────────────────────────────▶│ add_work, remove_work, decide
         │                               │
         │  POST /execute                │
         │─────────────────────────────▶│ AUTO_STABILIZE, etc.
         │                               │
```

---

## 파일 구조

```
/autus
├── 📄 PHYSICS.md           # 물리 수식 (IMMUTABLE)
├── 📄 CONSTITUTION.md      # 거버넌스 원칙 (IMMUTABLE)
├── 📄 slot_map.yaml        # 전체 진도판
│
├── 📁 spec/                # LAYER 0 - Core Spec
│
├── 📁 slots/               # 슬롯 정의
│   ├── 📁 system/          # 시스템 완전성
│   ├── 📁 functional/      # 기능 완전성
│   └── 📁 dev_ops/         # 개발 운영성
│
├── 📁 dev/                 # 개발 상태
│   ├── 📄 state.json       # 현재 세션
│   ├── 📄 roadmap.yaml     # 종료 조건
│   └── 📄 today.md         # 일일 기록
│
├── 📁 app/                 # 백엔드
│   └── 📄 main.py          # FastAPI
│
├── 📁 frontend/            # 프론트엔드
│   └── 📄 solar-globe-*.html
│
├── 📁 scripts/             # 도구
│   └── 📄 autus_pm.py      # PM CLI
│
└── 📁 docs/                # 문서
    └── 📄 ARCHITECTURE.md  # 이 파일
```

