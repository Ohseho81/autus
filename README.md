# 🏛️ AUTUS

> **비즈니스 물리학 엔진** - Money Physics 기반 통합 자동화 플랫폼

[![Build](https://img.shields.io/badge/build-passing-brightgreen)]()
[![Python](https://img.shields.io/badge/python-3.11+-blue)]()
[![React](https://img.shields.io/badge/react-18+-61DAFB)]()

---

## 📐 프로젝트 구조

```
autus/
├── autus-unified/           # 🎯 메인 프로젝트
│   ├── backend/             # FastAPI 백엔드
│   ├── frontend/            # HTML Physics Map
│   ├── frontend-react/      # React 앱 (메인 UI)
│   ├── simulator/           # Python 시뮬레이터 (72³ 엔진)
│   ├── n8n/                 # 워크플로우 자동화
│   └── tests/               # 테스트
│
├── docs/                    # 📚 문서
│   ├── spec/                # AUTUS 스펙 문서
│   └── *.md                 # API, 아키텍처 문서
│
├── tests/                   # ✅ 통합 테스트
├── scripts/                 # 🔧 스크립트
├── nginx/                   # 🌐 Nginx 설정
│
├── _archive/                # 📦 레거시 (gitignore)
└── _legacy/                 # 📦 레거시 (gitignore)
```

---

## 🚀 빠른 시작

### 1️⃣ 전체 설치

```bash
# 모든 의존성 설치 (Backend + React + Streamlit)
make install-all
```

### 2️⃣ 개발 서버 실행

```bash
# Backend API (http://localhost:8000)
make dev

# React 개발 서버 (http://localhost:5173)
make react

# HTML Physics Map (http://localhost:3000)
make frontend
```

### 3️⃣ 테스트

```bash
make test                # 백엔드 테스트
make simulator-test      # 시뮬레이터 테스트
make react-build         # React 빌드 테스트
```

---

## 📦 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `make help` | 전체 명령어 보기 |
| `make install` | Backend 의존성 설치 |
| `make install-all` | 전체 의존성 설치 |
| `make dev` | Backend API 서버 |
| `make react` | React 개발 서버 |
| `make react-build` | React 프로덕션 빌드 |
| `make frontend` | HTML Physics Map 서버 |
| `make test` | 테스트 실행 |
| `make clean` | 캐시 정리 |
| `make clean-all` | 전체 정리 (venv, node_modules) |

---

## 🧮 72³ Money Physics 엔진

### 핵심 공식

```python
# 가치 계산
V = (M - T) × (1 + s)^t

# SQ (Synergy Quotient)
SQ = (Mint - Burn) / Time × Synergy_Factor

# 신뢰도
Confidence = 1 - 1/(1 + √n)
```

### 5-Tier 시스템

| Tier | 이름 | 색상 | 설명 |
|------|------|------|------|
| T1 | Hub | 🟡 금색 | 핵심 허브 |
| T2 | Connector | 🔵 파랑 | 연결자 |
| T3 | Active | 🟢 초록 | 활성 노드 |
| T4 | Normal | ⚪ 회색 | 일반 노드 |
| Ghost | Inactive | ⚫ 진회색 | 비활성 |

---

## 📊 시뮬레이터 모듈

```
simulator/
├── variable_evolution.py    # 변수 고도화 엔진
├── notification_system.py   # 알림 시스템 (Slack/카카오톡/이메일)
├── multi_entity.py          # 다중 엔티티 관리
├── action_library.py        # 18개 액션 + 최적화 엔진
├── sensitivity_domain.py    # 민감도 분석 + 6개 도메인 템플릿
└── uncertainty_api.py       # 몬테카를로 + REST API (21개 엔드포인트)
```

### 사용 예시

```python
from simulator import ActionLibrary, OptimizationEngine, MonteCarloSimulator

# 최적 액션 추천
library = ActionLibrary()
engine = OptimizationEngine(library)
results = engine.find_optimal_actions(budget=5_000_000, target_node="n33", target_change=0.05)

# 몬테카를로 예측
mc = MonteCarloSimulator(simulate_fn)
result = mc.run(params, "income", months=6, n_simulations=1000)
print(f"95% 신뢰구간: {result.ci_95}")
```

---

## 🐳 Docker

```bash
make docker-build    # 이미지 빌드
make docker-up       # 컨테이너 실행
make docker-down     # 컨테이너 종료
make docker-logs     # 로그 확인
```

---

## 📚 문서

- [API 문서](http://localhost:8000/docs) - Swagger UI
- [Physics Map](http://localhost:3000) - 물리 맵 시각화
- [React 앱](http://localhost:5173) - 메인 대시보드

---

## 📄 라이선스

MIT License

---

*"측정할 수 없으면 관리할 수 없다" - Peter Drucker*  
*"단순함이 궁극의 정교함이다" - Steve Jobs*
AUTUS Unified Workspace
=======================

이 저장소는 AUTUS의 **주 개발 경로**입니다. 아래 구조/규칙을 기준으로 개발해 주세요.

핵심 경로
--------
- **Backend**: `autus-unified/backend/`
  - 엔진: `core/unified.py` (72 노드 통합 엔진, 모션 로그 롤링/압축)
  - 라우터: `api/`, `physics/`, `motion/collectors/`, `tests/`
  - 데이터/로그: 기본 `./autus_data` (`state.bin`, `motion*.jsonl(.gz)`)
    - 튜닝 env: `AUTUS_MOTION_FLUSH_THRESHOLD`, `AUTUS_MOTION_FLUSH_INTERVAL`, `AUTUS_STATE_SAVE_INTERVAL`, `AUTUS_MOTION_ASYNC`
- **Frontend (React)**: `autus-unified/frontend-react/`
  - Unified Dashboard, Physics-UI Bridge, 디자인 시스템 포함
- **Docs**: `autus-unified/docs/`
  - `MASTER_SPEC_v2.md`, `144_NODE_ONTOLOGY.md`, `MACHINE_SPEC.yaml` 필수 참조

프런트엔드 노트
--------------
- React(Vite) 우선. `frontend/`의 정적 HTML 지도들은 레거시 참고용으로 유지.

레거시/참고 트리 (루트에 위치)
-----------------------------
아래 디렉터리는 과거 버전·실험용으로 간주합니다. 프로덕션 경로로 사용하지 마세요.
- `app/`, `backend/`, `kernel/`, `machine/`, `autus_local/`, `autus_pipeline/`, `autus_realtime/`, `kernel_service/`, `physis-server/` 등

운영 가이드
-----------
- 서버 실행: `python3 main.py` (backend 디렉터리)
- API 문서: `http://localhost:8000/docs`
- 데이터 보존: `autus_data/` 디렉터리 백업 시 `state.bin` + `motion-*.jsonl(.gz)` 포함

테스트
------
- 백엔드 단위/회귀: `pytest`
- 엔진 빠른 자가 테스트: `python3 -c "from core.unified import test_unified_engine; test_unified_engine()"`
