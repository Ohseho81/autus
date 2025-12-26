# AUTUS Physics UI

**Semantic Neutrality Compliant** Physics Visualization

---

## 빠른 시작

### Backend

```bash
cd backend
pip install -r requirements.txt
python -m app.main
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

**Backend**: http://localhost:8000  
**Frontend**: http://localhost:5173

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | 상태 확인 |
| GET | `/dashboard/state` | 6개 게이지 값 |
| GET | `/nav/route` | 경로 상태 |
| GET | `/physics/motions` | 모션 상태 |
| POST | `/action/apply` | 액션 적용 |
| POST | `/goal/set` | Goal 설정 |
| GET | `/goal/get` | Goal 조회 |

---

## UI 구조

```
┌─────────────────────────────────────┐
│  ● Goal                        67%  │
├─────────────────────────────────────┤
│  Stability   ████████░░░░░░░   67%  │
│  Pressure    █████░░░░░░░░░░   42%  │  Dashboard
│  Drag        ████░░░░░░░░░░░   31%  │  Gauges
│  Momentum    ██████░░░░░░░░░   55%  │
│  Volatility  ███░░░░░░░░░░░░   28%  │
│  Recovery    ███████░░░░░░░░   61%  │
├─────────────────────────────────────┤
│                                     │
│        ●───○                        │
│         ╲                           │  Route Map
│    ~~~>  ◎ ←── Destination          │  Canvas
│         (Origin)                    │
│        ........ ←── Alternate       │
│                                     │
├─────────────────────────────────────┤
│   [ Hold ]  [ Push ]  [ Drift ]     │
└─────────────────────────────────────┘
```

---

## Semantic Neutrality 규칙

| 규칙 | 상태 |
|------|------|
| Canvas 내 텍스트 렌더링 | ✓ 없음 |
| from/to 노드 필드 | ✓ 없음 |
| 금액/통화/이름 필드 | ✓ 없음 |
| 모션 방향 | ✓ Goal 중심만 |
| Station kind | ✓ 내부 enum (UI 노출 X) |
| Alternate trigger | ✓ 점선으로만 |

---

## 색상 팔레트 (Neutral Only)

```css
rgba(180, 180, 170, 0.55)  /* Primary */
rgba(180, 180, 170, 0.30)  /* Fill */
rgba(180, 180, 170, 0.20)  /* Route */
rgba(180, 180, 170, 0.10)  /* Alternate */
rgba(180, 180, 170, 0.08)  /* Background */
#070910                     /* Screen BG */
```

---

## 게이지 설명

| Gauge | 설명 |
|-------|------|
| Stability | 시스템 안정성 |
| Pressure | 외부 압력 |
| Drag | 저항/마찰 |
| Momentum | 진행 모멘텀 |
| Volatility | 변동성 |
| Recovery | 회복력 |

---

## 액션 효과

| Action | 효과 |
|--------|------|
| Hold | +stability, -pressure, -drag, -momentum |
| Push | +momentum, +pressure, +volatility, -stability |
| Drift | -pressure, -volatility, +recovery, +drag |

---

**AUTUS Physics UI v1 / SN**
