# AUTUS Physics UI

의사결정 지원을 위한 물리 기반 상태 시각화 시스템.

## 핵심 개념

### 🎯 목표
사용자의 의사결정 상태를 **물리적 비유**로 표현하여, 판단이나 지시 없이 **현재 상태를 인지**하도록 돕는다.

### 📊 6개 게이지 (Gauges)

| 게이지 | 의미 | 높음 | 낮음 |
|--------|------|------|------|
| **Stability** | 안정성 | 예측 가능, 일관성 | 불확실, 변화 가능 |
| **Pressure** | 압력 | 변화 필요성, 긴장 | 여유, 완화 |
| **Drag** | 저항 | 진행 어려움 | 순조로운 진행 |
| **Momentum** | 모멘텀 | 빠른 진행, 가속 | 느린 진행, 정체 |
| **Volatility** | 변동성 | 급격한 변화 가능 | 점진적 변화 |
| **Recovery** | 회복력 | 빠른 회복 | 느린 회복 |

### 🎮 3가지 Action

| Action | 효과 | 적합한 상황 |
|--------|------|-------------|
| **Hold** | Stability↑ Pressure↓ Momentum↓ | 안정화가 필요할 때 |
| **Push** | Momentum↑ Pressure↑ Stability↓ | 진행을 가속할 때 |
| **Drift** | Recovery↑ Volatility↓ Pressure↓ | 자연스러운 회복이 필요할 때 |

### 🛤️ Route 진행

```
s1(align) → s2(acquire) → s3(commit) → s4(build) → s5(verify) → s6(deploy) → Origin
```

- **Momentum ≥ 60%** 이고 **Drag < 70%** 이면 진행 가능
- 진행 점수 누적 → 1.0 도달 시 다음 스테이션으로 이동

### 🔄 상호작용 규칙

- Stability ↔ Volatility: 반비례 (안정 ↔ 변동)
- Momentum ↔ Drag: 반비례 (추진 ↔ 저항)
- Pressure → Volatility: 압력 증가 → 변동성 전이
- Recovery → Stability: 회복력이 안정성 복구 지원

---

## 실행 방법

### Backend

```bash
cd physics-ui/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd physics-ui/frontend
npm install
VITE_API_BASE=http://localhost:8000 npm run dev
```

- Frontend: http://localhost:5173/
- Backend API: http://localhost:8000/

---

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/physics/view` | 전체 UI 데이터 (단일 fetch) |
| POST | `/action/apply` | Action 적용 |
| POST | `/selfcheck/submit` | Selfcheck 제출 (60초 윈도우) |
| POST | `/state/reset` | 상태 초기화 |
| GET | `/replay/events` | 이벤트 기록 조회 |
| POST | `/replay/run` | 이벤트 리플레이 |

### `/physics/view` 응답 예시

```json
{
  "gauges": {
    "stability": 0.55,
    "pressure": 0.35,
    "drag": 0.30,
    "momentum": 0.45,
    "volatility": 0.25,
    "recovery": 0.50
  },
  "route": {
    "destination": {"x": 0.0, "y": 0.0},
    "current_station": {"id": "s1", "x": -0.80, "y": 0.30, "kind": "align"},
    "next_station": {"id": "s2", "x": -0.65, "y": 0.20, "kind": "acquire"},
    "primary_route": [...],
    "alternates": [...]
  },
  "motions": [...],
  "actions": [
    {"id": "hold", "label": "Hold"},
    {"id": "push", "label": "Push"},
    {"id": "drift", "label": "Drift"}
  ],
  "render": {
    "line_opacity": 0.52,
    "motion_speed": 0.95,
    ...
  }
}
```

---

## 프로젝트 구조

```
physics-ui/
├── backend/
│   └── app/
│       ├── core/
│       │   ├── physics_model.py  # 물리 모델 정의
│       │   ├── state.py          # 상태 엔진
│       │   ├── store.py          # 이벤트 저장소
│       │   ├── render_mapping.py # 렌더 파라미터
│       │   └── replay.py         # 리플레이 엔진
│       ├── models/               # Pydantic 모델
│       ├── api/routes/           # API 엔드포인트
│       └── main.py
└── frontend/
    └── src/
        ├── api/
        │   ├── physics.ts        # API 클라이언트
        │   └── viewTypes.ts      # 타입 정의
        ├── components/
        │   └── PhysicsView.tsx   # 메인 UI
        └── styles/
            └── physics.css
```

---

## 설계 원칙

### Semantic Neutrality (의미적 중립성)

1. **판단 금지**: "좋음/나쁨", "위험/안전" 같은 가치 판단 배제
2. **지시 금지**: "해야 한다", "추천" 같은 행동 지시 배제
3. **숫자와 시각화**: 상태를 숫자와 기하학적 형태로만 표현
4. **사용자 해석**: 의미 해석은 사용자의 몫

### Non-coercive Policy (비강압 정책)

API 응답에서 금지되는 필드/패턴:
- `name`, `entity_type`, `amount`, `currency`
- `from`, `to`, `edges`, `links`
- `recommendation`, `advice`, `warning`
- "you should", "you must", "because" 등

---

## 라이센스

MIT License
