# AUTUS LayerSet 규약 정본

> NAV/ALERT/CONTROL 상태 전환을 위한 7레이어 구조

---

## 📐 LayerSet 구조 (7 Layers)

```
┌─────────────────────────────────────────────────────┐
│ Layer 7: OVERLAY (모달/팝업/토스트)                   │
├─────────────────────────────────────────────────────┤
│ Layer 6: ALERT (경고/위험 오버레이)                   │
├─────────────────────────────────────────────────────┤
│ Layer 5: HUD (속도/배터리/시간 상단 바)               │
├─────────────────────────────────────────────────────┤
│ Layer 4: NAV (경로 안내/카드/턴바이턴)                │
├─────────────────────────────────────────────────────┤
│ Layer 3: CONTROL (좌측 제어 패널)                     │
├─────────────────────────────────────────────────────┤
│ Layer 2: MAP (지도/타일/경로선)                       │
├─────────────────────────────────────────────────────┤
│ Layer 1: STATUS (하단 상태 바/미니 정보)              │
└─────────────────────────────────────────────────────┘
```

---

## 🎯 상태별 레이어 조합

### G1_NAV (기본 내비 상태)

| Layer | 활성화 | 설명 |
|-------|--------|------|
| 7. OVERLAY | ❌ | 없음 |
| 6. ALERT | ❌ | 없음 |
| 5. HUD | ✅ | 속도/배터리/시간 |
| 4. NAV | ✅ | 경로 안내/목적지 카드 |
| 3. CONTROL | ❌ | 숨김 |
| 2. MAP | ✅ | 전체 지도 표시 |
| 1. STATUS | ✅ | 하단 상태 바 |

```typescript
const G1_NAV_LAYERS = {
  OVERLAY: false,
  ALERT: false,
  HUD: true,
  NAV: true,
  CONTROL: false,
  MAP: true,
  STATUS: true,
};
```

---

### G2_ALERT (위험 상태)

| Layer | 활성화 | 설명 |
|-------|--------|------|
| 7. OVERLAY | ✅ | 경고 액션 버튼 |
| 6. ALERT | ✅ | 빨간 경고 오버레이 |
| 5. HUD | ✅ | 속도/배터리/시간 (빨간 강조) |
| 4. NAV | ✅ | 경로 재탐색 중 표시 |
| 3. CONTROL | ❌ | 숨김 |
| 2. MAP | ✅ | 위험 영역 하이라이트 |
| 1. STATUS | ✅ | 하단 상태 바 |

```typescript
const G2_ALERT_LAYERS = {
  OVERLAY: true,
  ALERT: true,
  HUD: true,
  NAV: true,
  CONTROL: false,
  MAP: true,
  STATUS: true,
};
```

---

### G3_CONTROL (조작 집중 상태)

| Layer | 활성화 | 설명 |
|-------|--------|------|
| 7. OVERLAY | ❌ | 없음 |
| 6. ALERT | ❌ | 없음 |
| 5. HUD | ✅ | 속도/배터리/시간 |
| 4. NAV | ❌ | 축소/숨김 |
| 3. CONTROL | ✅ | 좌측 제어 패널 확장 |
| 2. MAP | ❌ | 숨김 (3D 차량 뷰로 대체) |
| 1. STATUS | ✅ | 하단 상태 바 |

```typescript
const G3_CONTROL_LAYERS = {
  OVERLAY: false,
  ALERT: false,
  HUD: true,
  NAV: false,
  CONTROL: true,
  MAP: false,
  STATUS: true,
};
```

---

## 🔄 상태 전환 규칙

### 전환 트리거

| From | To | Trigger | 애니메이션 |
|------|-----|---------|-----------|
| NAV | ALERT | 위험 감지 | 0.3s fade + pulse |
| NAV | CONTROL | 주차/정차 | 0.5s slide-left |
| ALERT | NAV | 위험 해제 | 0.3s fade-out |
| CONTROL | NAV | 출발 | 0.5s slide-right |

### 전환 코드

```typescript
interface LayerTransition {
  from: LayerState;
  to: LayerState;
  duration: number;
  easing: 'ease-out' | 'ease-in-out';
}

function transitionToState(
  currentState: 'G1_NAV' | 'G2_ALERT' | 'G3_CONTROL',
  targetState: 'G1_NAV' | 'G2_ALERT' | 'G3_CONTROL'
): LayerTransition {
  const TRANSITIONS: Record<string, LayerTransition> = {
    'G1_NAV→G2_ALERT': {
      from: G1_NAV_LAYERS,
      to: G2_ALERT_LAYERS,
      duration: 300,
      easing: 'ease-out',
    },
    'G1_NAV→G3_CONTROL': {
      from: G1_NAV_LAYERS,
      to: G3_CONTROL_LAYERS,
      duration: 500,
      easing: 'ease-in-out',
    },
    // ... 기타 전환
  };
  
  return TRANSITIONS[`${currentState}→${targetState}`];
}
```

---

## 🎨 레이어별 z-index

```css
:root {
  --z-status: 100;
  --z-map: 200;
  --z-control: 300;
  --z-nav: 400;
  --z-hud: 500;
  --z-alert: 600;
  --z-overlay: 700;
}
```

---

## 📦 레이어 컴포넌트 구조

```
frontend/
├── layers/
│   ├── StatusLayer.tsx      # Layer 1
│   ├── MapLayer.tsx         # Layer 2
│   ├── ControlLayer.tsx     # Layer 3
│   ├── NavLayer.tsx         # Layer 4
│   ├── HudLayer.tsx         # Layer 5
│   ├── AlertLayer.tsx       # Layer 6
│   └── OverlayLayer.tsx     # Layer 7
├── states/
│   ├── G1_NAV.ts
│   ├── G2_ALERT.ts
│   └── G3_CONTROL.ts
└── LayerManager.tsx         # 상태 기반 레이어 조합
```

---

## ✅ 검증 체크리스트

### Golden Capture 전 필수 확인

- [ ] 모든 레이어 z-index 정상
- [ ] 상태별 레이어 on/off 정확
- [ ] 애니메이션 완료 후 캡처
- [ ] 동적 데이터 고정값 적용
- [ ] 지도 타일 로컬 이미지 사용

### Diff 검증 시 필수 확인

- [ ] 레이어 누락 없음
- [ ] 레이어 겹침/투명도 정상
- [ ] 전환 중간 상태 아님
- [ ] 마스크 영역 3% 이내

---

## 🔒 LOCKED 규칙

1. **레이어 순서 변경 금지** — z-index 100~700 고정
2. **레이어 추가 시 신규 상태 정의 필수** — G4, G5... 확장
3. **전환 애니메이션 후 캡처** — 중간 상태 캡처 금지
4. **Golden은 상태 3종 고정** — NAV/ALERT/CONTROL

---

## 📋 다음 단계

1. `tesla-nav.html`에 LayerManager 적용
2. 상태 전환 함수 구현
3. Golden Set 3장 캡처
4. CI 파이프라인 연동
