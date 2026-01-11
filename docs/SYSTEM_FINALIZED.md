# AUTUS 시스템 확정 문서

> **확정일**: 2026-01-06  
> **버전**: AUTUS Unified v2.0

---

## 📋 확정된 핵심 구조

### 1. AUTUS KERNEL v2.0 (불변)

```
┌────────────────────────────────────────────────────────┐
│                  6-12-6-5 구조                         │
├────────────────────────────────────────────────────────┤
│  6 Physics Nodes    │ BIO, CAPITAL, COGNITION,        │
│                     │ RELATION, ENVIRONMENT, SECURITY │
├─────────────────────┼──────────────────────────────────┤
│  12 Motions         │ INFLOW, OUTFLOW, TRANSFER,      │
│                     │ ACCUMULATE, DECAY, AMPLIFY,     │
│                     │ FRICTION_APPLY, STABILIZE,      │
│                     │ BUFFER, BREACH, RECOVER, LOCK   │
├─────────────────────┼──────────────────────────────────┤
│  6 Collectors       │ FINANCIAL, BIO_SENSOR,          │
│                     │ WORK_ACTIVITY, SYSTEM_PROCESS,  │
│                     │ EXTERNAL, RISK_COMPLIANCE       │
├─────────────────────┼──────────────────────────────────┤
│  5 UI Projections   │ HEXAGON, KPI, TREND,            │
│                     │ ALERT, COACH                    │
└─────────────────────┴──────────────────────────────────┘
```

### 2. ΔE 적용 순서 (고정)

```
1. decay      → 시간 감쇠 (중립점 0.5 수렴)
2. friction   → 저항 적용 (ENV 기반)
3. delta      → 변화량 적용 (±0.05 제한)
4. clamp      → [0, 1] 범위 제한
```

### 3. 핵심 원칙 (불변)

| 원칙 | 설명 |
|------|------|
| **물리 판별** | 의미 단어 배제, 물리 변화(Δ)로만 노드 판별 |
| **자동 할당** | Motion은 선택 불가, 조건 충족 시 자동 |
| **단일 출력** | Collector는 `MotionEvent(from, to, Δ, R, t)`만 출력 |
| **투영 세분화** | 커널 불변, UI에서만 세분화 허용 |

---

## 🖥️ 확정된 시스템 아키텍처

### 백엔드 구조

```
autus-unified/backend/
├── main.py                    # FastAPI 진입점
├── core/
│   └── kernel.py              # ✅ AUTUS KERNEL v2.0 (불변)
├── api/
│   ├── kernel_api.py          # ✅ Kernel API
│   ├── edge_api.py            # ✅ Edge Kernel API
│   ├── smb_api.py             # ✅ SMB API
│   └── audit_api.py           # Audit API
├── edge/
│   ├── kernel.py              # Arbutus Edge Kernel
│   └── hexagon_map.py         # Hexagon Map Engine
├── smb/
│   └── restaurant_mvp.py      # SMB MVP Engine
├── ontology/
│   └── smb_ontology.py        # SMB Ontology
└── agents/
    └── smb_agents.py          # AI Agents
```

### 프론트엔드 구조

```
autus-unified/frontend-react/src/
├── App.tsx                    # 라우팅 (#unified, #smb, #quantum)
├── components/
│   ├── SMB/
│   │   └── IntegratedDashboard.tsx  # ✅ 소상공인 대시보드 v2.0
│   └── Edge/
│       └── HexagonMap.tsx           # Quantum Hexagon Map
└── ...
```

---

## 🌐 확정된 API 엔드포인트

### Kernel API (`/api/kernel/*`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/kernel/` | 커널 정보 v2.0 |
| GET | `/api/kernel/structure` | 6-12-6-5 구조 |
| GET | `/api/kernel/state` | 전체 상태 |
| GET | `/api/kernel/nodes` | 6개 노드 |
| GET | `/api/kernel/motions` | 12개 모션 |
| GET | `/api/kernel/collectors` | 6개 Collector |
| POST | `/api/kernel/event` | 이벤트 적용 |
| POST | `/api/kernel/batch` | 배치 이벤트 |
| GET | `/api/kernel/projection/{type}` | UI 투영 |
| GET | `/api/kernel/matrix` | 6×12 매트릭스 |
| POST | `/api/kernel/lock` | 커널 잠금 |
| POST | `/api/kernel/unlock` | 잠금 해제 |

### Edge API (`/api/edge/*`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/edge/` | Edge Kernel 정보 |
| POST | `/api/edge/process` | 데이터 처리 |
| GET | `/api/edge/hexagon` | Hexagon Map |
| GET | `/api/edge/functions` | Audit Functions |
| WS | `/api/edge/ws` | WebSocket |

### SMB API (`/api/smb/*`)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/smb/industries` | 업종 목록 |
| GET | `/api/smb/dashboard/{industry}` | 대시보드 데이터 |
| POST | `/api/smb/agents/{industry}/{type}` | AI Agent 실행 |
| POST | `/api/smb/simulate/{industry}` | 시뮬레이션 |
| WS | `/api/smb/ws/{industry}` | WebSocket |

---

## 🎨 확정된 프론트엔드 라우트

| Route | 설명 | 컴포넌트 |
|-------|------|----------|
| `http://localhost:3000` | 기본 대시보드 | UnifiedDashboard |
| `http://localhost:3000#unified` | 통합 대시보드 | UnifiedDashboard |
| `http://localhost:3000#smb` | 소상공인 대시보드 | IntegratedDashboard |
| `http://localhost:3000#quantum` | Quantum Hexagon | HexagonMap |

---

## 📊 확정된 대시보드 컴포넌트

### 소상공인 대시보드 v2.0

| 컴포넌트 | 설명 |
|----------|------|
| **업종 선택** | 교육(🎓), 음식점(🍽️), 사우나(🧖) |
| **KPI 카드** | 4개 핵심 지표 + 스파크라인 |
| **바 차트** | 주간 매출 시각화 |
| **Physics 헥사곤** | 6축 레이더 차트 |
| **AI 에이전트** | 분석/예측/탐지/최적화/코칭 |
| **자연어 질의** | Snowflake 스타일 NLP |
| **실시간 피드** | 주문/결제/알림 스트림 |
| **알림 패널** | CRITICAL/WARNING/INFO |

---

## 📁 확정된 파일 목록

### 핵심 파일

| 파일 | 상태 | 설명 |
|------|------|------|
| `backend/core/kernel.py` | ✅ 확정 | AUTUS KERNEL v2.0 |
| `backend/api/kernel_api.py` | ✅ 확정 | Kernel API |
| `backend/api/edge_api.py` | ✅ 확정 | Edge API |
| `backend/api/smb_api.py` | ✅ 확정 | SMB API |
| `backend/edge/kernel.py` | ✅ 확정 | Arbutus Edge Kernel |
| `backend/edge/hexagon_map.py` | ✅ 확정 | Hexagon Map Engine |
| `frontend-react/src/App.tsx` | ✅ 확정 | 라우팅 |
| `frontend-react/src/components/SMB/IntegratedDashboard.tsx` | ✅ 확정 | SMB Dashboard |
| `frontend-react/src/components/Edge/HexagonMap.tsx` | ✅ 확정 | Quantum Map |

### 문서

| 파일 | 설명 |
|------|------|
| `docs/KERNEL_SPEC_V2.md` | Kernel v2.0 사양서 |
| `docs/SYSTEM_FINALIZED.md` | 시스템 확정 문서 (이 문서) |

---

## 🔒 불변 규칙

### 절대 변경 금지

1. **6-12-6-5 구조** - 카테고리 수 고정
2. **ΔE 적용 순서** - decay → friction → delta → clamp
3. **물리 판별 원칙** - 의미 단어 배제
4. **자동 할당 원칙** - Motion 선택 불가

### 확장 허용

1. **UI Projection** - 세분화 가능
2. **Collector 구현** - 새 데이터 소스 추가 가능
3. **API 엔드포인트** - 추가 가능 (기존 변경 금지)

---

## 🚀 접속 정보

| 서비스 | URL |
|--------|-----|
| **Frontend** | http://localhost:3000 |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |
| **Kernel API** | http://localhost:8000/api/kernel/ |
| **Edge API** | http://localhost:8000/api/edge/ |
| **SMB API** | http://localhost:8000/api/smb/ |

---

## ✅ 확정 서명

```
확정일: 2026-01-06
버전: AUTUS Unified v2.0
상태: FINALIZED (불변)
```

> **"AUTUS는 카테고리를 더 늘릴 필요가 없다.**  
> **대신 '어떻게 구분되는가'를 규칙으로 잠갔다."**

