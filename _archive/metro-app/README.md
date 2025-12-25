# AUTUS METRO OS

> Decision Physics Interface — 서울 지하철 노선도 기반 AUTUS 시뮬레이션 엔진

## 🚇 Overview

AUTUS METRO OS는 서울 지하철 노선도 UI를 1:1로 복제하면서, AUTUS 의사결정 물리 엔진을 통합한 시각화 도구입니다.

- **역 (Station)** = AUTUS Event Label
- **환승역 (Transfer)** = Decision / Choice
- **하차 (Exit)** = Abort State
- **이동 (Movement)** = Physics Simulation

## 🏃 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎮 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `0-4` | Visibility Level |
| `H` | Toggle Heatmap |
| `G` | Toggle Ghost Trail |
| `T` | Cycle Time Compression (×1, ×10, ×100) |
| `O` | Toggle Dev Reference Overlay |
| `Space` | Step Simulation |

## 📊 Visibility Levels

- **Level 0**: Base map only
- **Level 1**: Most recent event overlay
- **Level 2**: +Transfer overlays & animations
- **Level 3**: +Critical highlights & heatmap
- **Level 4**: Analysis mode (all overlays)

## ⚙️ Physics Kernel

### Core State Variables
- `t` — Time
- `E` — Energy (0-1)
- `S` — Entropy (0-1)
- `R` — Risk (0-1)

### Equations (LOCKED)

```typescript
dt_step = (distance / velocity) * (1 + S)
E(t+1) = E(t) - friction - transfer_loss
S(t+1) = S(t) + complexity * uncertainty
R = 1 - exp(-sum(shock_i))
PNR = f(E, S, R, dt)  // Point of No Return
```

## 🎯 Event Categories (12 LOCKED)

| Category | Shape | Description |
|----------|-------|-------------|
| Init | ● | 시작점 |
| Progress | ▶ | 진행 |
| Delay | ⏸ | 지연 |
| Discovery | ✦ | 발견 |
| Collision | ✖ | 충돌 |
| Decision | ⬡ | 결정 |
| Validation | ✓ | 검증 |
| Shock | ⚡ | 충격 |
| Deal | ⬌ | 거래 |
| Org | ⬢ | 조직 |
| External | ◐ | 외부 |
| EndAbort | ⊘ | 종료 |

## 🔧 Feature Flags (ALL ON by default)

- `multiEntity` — 다중 엔티티 시뮬레이션
- `collision` — 충돌 이벤트 감지
- `autoReroute` — 위기 시 자동 우회 경로
- `ghostLine` — 이동 히스토리 트레일
- `timeCompression` — 시간 압축 (×1, ×10, ×100)
- `externalField` — 외부 충격 주입기
- `aiRecommend` — AI 환승 추천 (Rule-based)
- `entropyHeatmap` — 엔트로피 히트맵
- `successLoopHighlight` — 안정 루프 강조
- `exportEnabled` — JSON/SVG 내보내기
- `devOverlay` — 개발용 레퍼런스 오버레이

## 📁 Project Structure

```
metro-app/
├── public/
│   └── assets/metro/
│       └── reference.png      # 레퍼런스 이미지
├── src/
│   ├── core/
│   │   ├── types.ts           # Type definitions
│   │   ├── physics_kernel.ts  # Physics equations
│   │   ├── event_engine.ts    # Event generation
│   │   └── simulator.ts       # Simulation logic
│   ├── data/
│   │   └── metro_model.json   # Station/Line data
│   ├── store/
│   │   └── metroStore.ts      # Zustand state
│   ├── ui/
│   │   ├── icons.tsx          # Category icons
│   │   ├── MetroMap.tsx       # Main map
│   │   ├── ControlPanel.tsx   # Controls
│   │   └── StationPanel.tsx   # Station details
│   └── App.tsx
└── README.md
```

## ➕ How to Add a New Mission

1. Define mission in your code:

```typescript
const newMission: Mission = {
  mission_id: 'MISSION_001',
  name: 'Sample Mission',
  description: 'Navigate from Hongdae to Gangnam',
  start_station_id: 'S_HONGDAE',
  end_station_id: 'S_GANGNAM',
  events: [],
};
```

2. Start mission via store:

```typescript
const { startMission } = useMetroStore();
startMission(newMission);
```

3. Mission will auto-create entity at start station.

## 🗺️ How to Map Events to Stations

Edit `metro_model.json`:

```json
{
  "station_id": "S_GANGNAM",
  "label": "강남 · EPICENTER",
  "category": "Decision",   // <-- Set default category
  "is_transfer": true,
  "transfer_lines": ["L2", "SB"]
}
```

Available categories: `Init`, `Progress`, `Delay`, `Discovery`, `Collision`, `Decision`, `Validation`, `Shock`, `Deal`, `Org`, `External`, `EndAbort`

## 🔒 LOCK RULES (NON-NEGOTIABLE)

1. Visual UI must match reference 1:1
2. SVG-first rendering (no canvas for base map)
3. Animations must derive from physics outputs
4. Shape = Category (discrete), Color = Intensity (continuous)
5. All features ON by default

## 📜 License

AUTUS Internal Use
