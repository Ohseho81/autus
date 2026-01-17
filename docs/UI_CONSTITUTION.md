# 🏛️ AUTUS UI CONSTITUTION

> **작동 헌법 - 디자인이 아닌 규칙**

---

## 📜 핵심 원칙

```
플랫폼 UI는 선택을 늘리고,
AGI UI는 답을 제시한다.
AUTUS UI는 임계에서 세계를 닫는다.
```

---

## K2 — 현상 체감 UI (Action-Bound View)

> **"K2는 이해하지 않는다. 느끼고 감속한다."**

### 채택 모듈

| 모듈 | 역할 | 상태 |
|------|------|------|
| **State UI** | Stable / Drifting / Locked | ✅ 필수 |
| **Constraint UI** | Gate / Scale Lock | ✅ 필수 |
| **Map UI** | 실제 좌표 고정 | ✅ 필수 |
| **Card UI** | 단일 업무 포커스 | ✅ 필수 |

### 배제 모듈

| 모듈 | 이유 |
|------|------|
| KPI | 숫자는 해석을 낳는다 |
| Graph | 선택 과잉 |
| Feed | 엔트로피 증폭기 |
| Timeline (미래) | 예측 정치화 |
| Form | 입력 과잉 |

### 인터랙션 규칙

```
버튼 ≤ 2 (Execute / Report Blockage)
숫자·예측·사유 = 전면 차단
Gate 접근 = 물리적 저항 체감 (느려짐/흐림)
```

---

## K10 — 헌법 관측 UI (Closure View)

> **"K10은 바꾸지 않는다. 닫힌 결과를 승인할 뿐이다."**

### 채택 모듈

| 모듈 | 역할 | 상태 |
|------|------|------|
| **Map × Simulation** | Geo-Causal | ✅ 핵심 |
| **Network** | 고차원 인과 | ✅ K6+ 전용 |
| **Event Log** | Afterimage | ✅ 필수 |
| **Constraint** | 자동 종결 | ✅ 필수 |
| **Command/Prompt** | 가정 입력 (Apply 없음) | 보조 |

### 인터랙션 규칙

```
수치 최소 (형상 중심)
Apply 버튼 = NULL
Gate 통과 후 자동 반영
```

---

## K2 ↔ K10 동시성 규칙

```
데이터 = 동일
표현 = 분기
K10 관측 → K2 행동 영향 없음
종결 = 환경 변화로만 하위 전달
```

---

## Gate 전환 애니메이션

### K2 → K10 (상승/Ascend)

```
Phase 1: DECELERATE (400ms)
  blur: 0 → 0, speed: 1 → 0.5
  
Phase 2: BLUR_GATE (300ms)
  blur: 0 → 8, opacity: 1 → 0.8, scale: 1 → 0.98
  
Phase 3: CONTRACT (400ms)
  blur: 8 → 15, opacity: 0.8 → 0.5, scale: 0.98 → 0.9
  
Phase 4: GATE_CROSS (200ms)
  blur: 15 → 20, opacity: 0.5 → 0, scale: 0.9 → 0.8
```

### K10 → K2 (하강/Descend)

```
Phase 1: EXPAND (300ms)
  blur: 20 → 20, opacity: 0 → 0, scale: 0.8 → 0.8
  
Phase 2: CLARIFY (400ms)
  blur: 20 → 8, opacity: 0 → 0.6, scale: 0.8 → 0.95
  
Phase 3: FOCUS (300ms)
  blur: 8 → 2, opacity: 0.6 → 0.9, scale: 0.95 → 1
  
Phase 4: ACCELERATE (300ms)
  blur: 2 → 0, opacity: 0.9 → 1, scale: 1 → 1, speed: 0.7 → 1
```

---

## Gate 저항 효과

| Gate State | Blur | Opacity | Speed | Filter |
|------------|------|---------|-------|--------|
| NONE | 0px | 1.0 | 1.0 | none |
| RING | 2px | 0.9 | 0.7 | saturate(0.8) |
| LOCK | 8px | 0.6 | 0.2 | saturate(0.5) brightness(0.8) |
| AFTERIMAGE | 12px | 0.4 | 0.0 | saturate(0.3) brightness(0.6) sepia(0.3) |

---

## TOP UI 흡수/대체 매핑

| 기존 UI | AUTUS 처리 | 이유 |
|---------|-----------|------|
| Card | K2 단일 카드 흡수 | 분절 유지, 선택 과잉 제거 |
| Timeline/간트 | 과거만 흡수, 미래 삭제 | 예측 정치화 방지 |
| KPI Dashboard | **완전 배제** | 숫자는 해석을 낳는다 |
| Map | **완전 흡수 + 확장** | 현실 앵커 + 설명 불필요 |
| Node/Graph | K6+ 전용 흡수 | K2 접근 불가 (인지 오염 방지) |
| Canvas/Whiteboard | 외부 격리 | 책임 기록 불가 |
| Simulation | **완전 흡수 + Gate** | 인과 학습 최강 |
| Command/Prompt | K10 보조 (실행 금지) | 언어는 입력, 결정은 물리 |
| Feed | **완전 배제** | 엔트로피 증폭기 |
| Event Log | **Afterimage 흡수** | 책임의 물리 흔적 |
| Constraint UI | **핵심 흡수 + 세계 폐쇄** | 실수 자체를 불가능하게 |

---

## UI 합성 공식 (최종)

```
K2 = State × Constraint × Map × Single Card

K10 = Map × Simulation × Network × Afterimage

숫자·권고·정책 = 0
```

---

## 파일 구조

```
frontend/
├── k2-operator.html      # K2 UI 구현
├── k10-observer.html     # K10 UI 구현
├── portal.html           # 통합 포탈
└── src/
    └── lib/
        └── gate-transition.ts  # Gate 전환 엔진
```

---

## 단축키

| 키 | 동작 |
|----|------|
| `Ctrl + K` | K2 ↔ K10 전환 |

---

> **"AUTUS UI는 임계에서 세계를 닫는다."**
