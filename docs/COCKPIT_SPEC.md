# AUTUS Cockpit Lens Specification v1.0 (LOCK)

> 우주선 내부 계기판 스펙 — 동일 Shadow를 다른 스킨으로 렌더링

---

## 개요

Cockpit Lens는 **내면(Internal) UI**입니다.
Solar Lens가 태양계(외면)를 보여준다면, Cockpit Lens는 우주선 내부 계기판(내면)을 보여줍니다.

**핵심 원칙**: 동일한 `ShadowSnapshot`을 다른 시각적 표현으로 렌더링

---

## 계기판 구조

### 1. Primary Gauges (9행성 매핑)

| 계기판 | Planet | 의미 | 아이콘 |
|--------|--------|------|--------|
| ENGINE | OUTPUT | 엔진 출력 | 🔥 |
| SHIELD | QUALITY | 방어막 품질 | 🛡️ |
| CLOCK | TIME | 시간 효율 | ⏱️ |
| DRAG | FRICTION | 저항/마찰 | ⚡ |
| GYRO | STABILITY | 자세 안정 | 🎯 |
| SYNC | COHESION | 시스템 동기화 | 🔗 |
| REPAIR | RECOVERY | 자가 수리 | 🔧 |
| COMM | TRANSFER | 통신 대역폭 | 📡 |
| ALERT | SHOCK | 경고 수준 | ⚠️ |

### 2. Secondary Indicators (shadow32f 슬롯 매핑)

```
shadow32f[0:8]   → Primary Gauges (9행성과 동일)
shadow32f[8:16]  → Sub-system Health
shadow32f[16:24] → Resource Levels
shadow32f[24:31] → Environmental Sensors
shadow32f[31]    → Master Alert Level
```

### 3. Alert Thresholds

| 수준 | 범위 | 색상 | 표시 |
|------|------|------|------|
| NORMAL | 0.6 ~ 1.0 | Green | — |
| CAUTION | 0.3 ~ 0.6 | Yellow | ⚠️ |
| WARNING | 0.15 ~ 0.3 | Orange | ⚠️⚠️ |
| CRITICAL | 0 ~ 0.15 | Red | 🚨 |

---

## 레이아웃

```
┌────────────────────────────────────────────────────────────┐
│                    AUTUS COCKPIT v1.0                      │
├────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  ENGINE  │  │  SHIELD  │  │   GYRO   │  │  ALERT   │   │
│  │   🔥     │  │   🛡️    │  │    🎯    │  │    ⚠️    │   │
│  │  ████░░  │  │  █████░  │  │  ██████  │  │  ██░░░░  │   │
│  │   72%    │  │   85%    │  │   92%    │  │   28%    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  CENTRAL DISPLAY                     │  │
│  │                                                      │  │
│  │     ┌─────┐                          ┌─────┐        │  │
│  │     │CLOCK│         ╭───╮           │COMM │        │  │
│  │     │ 45% │        ╱     ╲          │ 67% │        │  │
│  │     └─────┘       │  SUN  │         └─────┘        │  │
│  │                    ╲     ╱                          │  │
│  │     ┌─────┐         ╰───╯           ┌─────┐        │  │
│  │     │DRAG │                         │SYNC │        │  │
│  │     │ 35% │                         │ 78% │        │  │
│  │     └─────┘                         └─────┘        │  │
│  │                                                      │  │
│  │                    ┌─────┐                          │  │
│  │                    │REPAIR│                         │  │
│  │                    │ 65%  │                         │  │
│  │                    └─────┘                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ STATUS: NORMAL  │  WS: LIVE  │  TS: 14:32:15        │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

## 컴포넌트 구조

```
lenses/cockpit/
├── CockpitCanvas.tsx       # 메인 캔버스 (Three.js)
├── CockpitHUD.tsx          # HUD 오버레이 (HTML)
├── gauges/
│   ├── PrimaryGauge.tsx    # 원형 게이지
│   ├── BarGauge.tsx        # 바 게이지
│   ├── AlertIndicator.tsx  # 경고 표시기
│   └── StatusPanel.tsx     # 상태 패널
├── displays/
│   ├── CentralDisplay.tsx  # 중앙 디스플레이
│   ├── RadarScope.tsx      # 레이더 스코프
│   └── OrbitMinimap.tsx    # 궤도 미니맵
└── mapping/
    └── cockpitMapping.ts   # Planet → Gauge 매핑
```

---

## LOCK 규칙

1. **동일 Shadow 사용**: Solar와 Cockpit은 같은 `ShadowSnapshot` 사용
2. **표현만 다름**: 물리 계산 없음, 매핑/스케일링만
3. **9행성 고정**: 게이지 9개 = Planet 9개 (1:1)
4. **32f 확장**: 보조 지표는 shadow32f 슬롯 사용
5. **스타일 분리**: 색상/애니메이션은 스킨 토큰으로 관리

---

## 스킨 토큰

```typescript
const CockpitSkinTokens = {
  // Colors
  bgPrimary: "#0a0a14",
  bgSecondary: "#111118",
  accentPrimary: "#00d4ff",
  accentSecondary: "#00ff88",
  
  // Alert Colors
  alertNormal: "#00ff88",
  alertCaution: "#ffaa00",
  alertWarning: "#ff8800",
  alertCritical: "#ff4444",
  
  // Gauge
  gaugeSize: 120,
  gaugeStroke: 8,
  gaugeBg: "#222",
  
  // Typography
  fontMono: "JetBrains Mono, monospace",
  fontDisplay: "Orbitron, sans-serif",
  
  // Animation
  pulseSpeed: 1.5,
  glowIntensity: 0.6,
};
```

---

v1.0 LOCK
