# AUTUS — 결정론적 물리 엔진 시스템

> "목표를 바꾸지 않고 나를 변형시킨다"

---

## 🔒 프로젝트 구조 (LOCKED)

```
autus/
│
├── 📁 kernel_service/        # FastAPI 백엔드 (포트 8001)
│   ├── app/
│   │   ├── main.py           # API 엔드포인트
│   │   ├── autus_state.py    # 상태 계약 (State Contract)
│   │   ├── commit_pipeline.py # Commit Pipeline (Page 3→1→2)
│   │   ├── validators.py     # 입력 검증
│   │   └── mandala_transform.py
│   ├── config/
│   │   └── draft_limits.json
│   └── tests/
│       ├── test_state_pipeline.py
│       ├── test_node_ops.py
│       └── test_api_integration.py
│
├── 📁 frontend/              # Three.js UI
│   ├── autus-live.html       # ⭐ 메인 통합 인터페이스
│   ├── autus-page1.html      # Page 1: Goal Calibration
│   ├── autus-page2.html      # Page 2: Route / Topology
│   ├── autus-page3.html      # Page 3: Mandala Investment
│   ├── test.html             # 렌더 테스트
│   ├── js/
│   │   ├── api/
│   │   │   └── AutusEngine.js  # API 통신 엔진
│   │   └── core/
│   │       ├── CoreLayer.js    # A-1: 구형 Mesh + 글로우
│   │       ├── GraphLayer.js   # A-2: NodeInstances + EdgeLines
│   │       ├── FlowLayer.js    # A-3: Points 파티클
│   │       ├── StateUniform.js # A-4: State → Uniform
│   │       ├── DeterminismSampler.js # A-5: 결정론적 샘플링
│   │       └── AutusRenderer.js
│   └── ts/                   # TypeScript 정본 모듈
│       ├── core/
│       ├── uniforms/
│       ├── time/
│       └── types/
│
├── 📁 spec/                  # 설계 문서 (LOCKED)
│   ├── SYSTEM_DEFINITION_LOCK.md
│   ├── PHILOSOPHY_LOCK.md
│   ├── tokens.autus.json     # 디자인 토큰
│   ├── state_contract.json   # 상태 계약
│   ├── api_spec.json         # API 명세
│   └── ethics_security.json  # 윤리/보안 규칙
│
├── 📁 kernel/                # 물리 엔진 코어
├── 📁 core/                  # 핵심 로직
├── 📁 config/                # 설정
├── 📁 docs/                  # 문서
└── 📁 _archive/              # 레거시 파일
```

---

## 🚀 빠른 시작

```bash
# 1. 백엔드 서버 시작
cd kernel_service
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload

# 2. 프론트엔드 실행
open frontend/autus-live.html
```

---

## 📡 API 엔드포인트

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/state` | GET | 현재 물리 상태 조회 |
| `/draft/update` | POST | Draft 수정 (SIM 모드) |
| `/commit` | POST | Draft → LIVE 확정 |
| `/replay/marker` | POST | Hash Chain 마커 생성 |

---

## 🔧 Commit Pipeline (LOCKED)

```
STAGE 1: Page 3 (Mandala Transform) → 자원 배분
STAGE 2: Page 1 (Mass/Volume)       → 역량/목표
STAGE 3: Page 2 (NodeOps)           → 관계 조작
STAGE 4: Kernel Recalc              → Density, Stability
STAGE 5: Forecast Update            → P_outcome
STAGE 6: Finalize Marker            → Hash Chain
```

---

## 🎨 3페이지 구조

| Page | 이름 | 기능 |
|------|------|------|
| **1** | Goal Calibration | 자기 역량 조정 (Mass, Volume, Horizon) |
| **2** | Route / Topology | 관계 조작 (NodeOps, Flow Filter) |
| **3** | Mandala Investment | 자원 배분 (8슬롯 Allocation) |

---

## ⚠️ Commit Gate 규칙

- `σ (Sigma) > 0.7` → COMMIT 불가
- `Mode = LIVE` → COMMIT 불가
- Page 3에서 투자 조정으로 물리량 변경 필요

---

## 🔒 핵심 원칙

1. **Physics Only** — 판단/추천 없음, 물리량만 표시
2. **Determinism** — 동일 입력 → 동일 출력
3. **User Decides** — 시스템은 결과만 보여줌
4. **Local Only** — 모든 데이터는 사용자 소유

---

## 📄 라이선스

AUTUS v1.0 — LOCKED
