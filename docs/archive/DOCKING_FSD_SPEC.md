# AUTUS — SpaceX Docking × Tesla FSD 통합 구현 (LOCK)

## Standards Decide. Look & Choose.

> "+ 를 ◇에 맞추는 것. 그게 전부다. 맞추지 못하면 비용이 증가한다."

---

## 1. 핵심 원칙 (LOCK)

### 금지 사항

```
❌ 추천 알고리즘
❌ "이게 더 좋다" 메시지
❌ 비교 UI
❌ 설정/옵션 페이지
❌ 자동 결정 / 자동 실행
❌ Undo 버튼
```

### 필수 사항

```
⭕ 자동 계측
⭕ 임계 자동 감지
⭕ 인간만 ACTION 클릭
⭕ Audit 불변
```

---

## 2. UI 구조

### 단일 HTML: `autus-docking.html`

```
┌─────────────────────────────────────────────────────────────┐
│                    ALIGNMENT HUD (중앙)                      │
│                                                             │
│              ◇ ← Optimal Cost Alignment Point               │
│              +  ← Current State (Self)                      │
│                                                             │
│     Roll: 0.0°    Pitch: 0.0°    Yaw: 0.0°                 │
│     RATE: 0.00    RANGE: 14d                               │
├─────────────────────────────────────────────────────────────┤
│  SPEEDOMETER    │    TRAJECTORY    │    BATTERY            │
│  (Cost Velocity)│  (Cost Curve)    │  (Value Energy)       │
├─────────────────────────────────────────────────────────────┤
│  PRECISION MODE: [AUTO] ← 임계 접근 시 자동 활성화           │
├─────────────────────────────────────────────────────────────┤
│                    [ CHOOSE ]                               │
│              ← 실행 즉시 되돌릴 수 없음                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. SpaceX Docking → AUTUS 치환표

### 중앙 HUD

| SpaceX | AUTUS | 구현 |
|--------|-------|------|
| 그린 다이아몬드 | Optimal Cost Alignment Point | 중앙 고정 ◇ |
| 크로스헤어 | Current State (Self) | 움직이는 + |
| 중앙 정렬 | 비용/가치 균형점 | +가 ◇에 접근 |

### 수치 패널

| SpaceX | AUTUS | 안전 조건 |
|--------|-------|----------|
| Roll | Time Cost Deviation | < 0.2 |
| Pitch | Risk Cost Deviation | < 0.2 |
| Yaw | Position Cost Deviation | < 0.2 |
| RATE | Cost Velocity | < 0.2 |
| RANGE | PNR ETA | > 0 |

### 정밀 모드

| SpaceX | AUTUS |
|--------|-------|
| Precision Mode | Decision Precision Mode |
| 근접 시 필수 | PNR 7일 이내 자동 강제 |

### Abort

| SpaceX | AUTUS |
|--------|-------|
| Abort 버튼 | CHOOSE 버튼 |
| 실행 즉시 불가역 | Audit 고정 |

---

## 4. Tesla FSD → AUTUS 치환표

| Tesla FSD | AUTUS |
|-----------|-------|
| Ego Vehicle (중앙 3D 차량) | Current State (Self) |
| 파란 네온 글로우 | State Glow (진행 중) |
| 주행 경로 예측 | Cost Trajectory |
| 주변 객체 | Risk Density |
| 충돌 가능성 | PNR 접근도 |
| FSD 사용 비율 | Decision Accumulation |
| Strike 시스템 | Irreversibility History |
| Supervised | CHOOSE 책임 고정 |

---

## 5. 상태 머신

```
SAFE (녹색)       : deviation < 0.4, PNR > 21d
WARNING (황색)    : deviation < 0.7, PNR 7-21d
CRITICAL (적색)   : deviation < 1.0, PNR < 7d
IRREVERSIBLE (암적색): deviation ≥ 1.0, PNR ≤ 0

CRITICAL 진입 시 → Precision Mode 자동 활성화
IRREVERSIBLE 진입 시 → CHOOSE 비활성화
```

---

## 6. 핵심 수식 (4개만)

```javascript
// Total Cost (누적 기회비용)
TC = Σ cost_events

// Cost Velocity (비용 증가 속도)
CV = d(TC) / dt

// Value Battery (남은 선택 에너지)
VB = max(0, 1 - TC / PNR_TC)

// PNR ETA (불가역까지 남은 시간)
PNR_ETA = (PNR_TC - TC) / CV
```

---

## 7. Deviation 계산 (SpaceX 스타일)

```javascript
// 각 축의 편차 (0에 가까울수록 안전)
Roll = |timeCost - optimalTime| / optimalTime
Pitch = |riskCost - optimalRisk| / optimalRisk  
Yaw = |positionCost - optimalPosition| / optimalPosition

// 전체 편차
totalDeviation = sqrt(Roll² + Pitch² + Yaw²) / sqrt(3)

// 안전 조건: 모든 값 < 0.2
isSafe = Roll < 0.2 && Pitch < 0.2 && Yaw < 0.2
```

---

## 8. CSS 색상 (Tesla + SpaceX)

```css
:root {
  --safe: #00ff88;        /* 녹색 - 안전 */
  --warning: #ffaa00;     /* 황색 - 주의 */
  --critical: #ff4444;    /* 적색 - 위험 */
  --irreversible: #660000; /* 암적색 - 불가역 */
  
  --alignment-optimal: #00ff88;  /* 최적 정렬점 */
  --alignment-current: #ffffff;  /* 현재 위치 */
  --precision-active: #00aaff;   /* 정밀 모드 */
  
  --glow-active: 0 0 20px rgba(0, 255, 136, 0.5);
  --glow-warning: 0 0 20px rgba(255, 170, 0, 0.5);
  --glow-critical: 0 0 20px rgba(255, 68, 68, 0.5);
}
```

---

## 9. 이벤트 (3개만)

### ACTION_COMMIT (CHOOSE 클릭 시)

```json
{
  "type": "ACTION_COMMIT",
  "timestamp": "ISO-8601",
  "state": "SAFE|WARNING|CRITICAL",
  "metrics": { "TC": n, "CV": n, "VB": n, "PNR_ETA": n, "deviation": n }
}
```

### PNR_CROSS (불가역 도달 시)

```json
{
  "type": "PNR_CROSS",
  "timestamp": "ISO-8601",
  "state": "IRREVERSIBLE",
  "metrics": { "TC": n, "CV": n, "VB": 0, "PNR_ETA": 0 }
}
```

### SESSION_CLOSE (세션 종료 시)

```json
{
  "type": "SESSION_CLOSE",
  "timestamp": "ISO-8601",
  "state": "current_state",
  "metrics": { "TC": n, "CV": n, "VB": n, "PNR_ETA": n }
}
```

---

## 10. Audit (불변)

```json
{
  "audit_id": "AUD-{timestamp}",
  "event_type": "ACTION_COMMIT|PNR_CROSS",
  "final_state": "state",
  "deviation": { "roll": n, "pitch": n, "yaw": n },
  "value_gained": "number",
  "timestamp": "ISO-8601"
}
```

**수정 불가, 삭제 불가, 되돌리기 불가**

---

## 11. 가속도 시스템 (도착 이후)

```javascript
// 결정 완료 후 → 다음 결정 가속
nextVelocityMultiplier = 1.0 + (totalDecisions * 0.05)
// 최대 2.0배

// 표시
"다음 결정 정밀도: ×{nextVelocityMultiplier}"
```

---

## 12. QA 체크리스트

```
□ 설명 없이 3초 내 "위험하다" 체감
□ + 가 ◇에서 벗어나면 불안함 느낌
□ 숫자가 0.2 넘으면 경고색
□ CHOOSE 클릭 후 되돌리기 불가
□ 추천 문구 0개
□ 비교 UI 0개
□ 설정 메뉴 0개
```

---

## 13. 파일 구조

```
frontend/
└── autus-docking.html      # 단일 HTML (전체 UI)
```

---

## 🔒 LOCK 항목

| 항목 | 상태 |
|------|------|
| SpaceX HUD 구조 | 🔒 LOCK |
| Tesla Dashboard | 🔒 LOCK |
| 치환표 | 🔒 LOCK |
| 상태 머신 | 🔒 LOCK |
| 수식 4개 | 🔒 LOCK |
| 이벤트 3개 | 🔒 LOCK |
| Audit 불변 | 🔒 LOCK |

---

## 🚀 최종 명령

> "+ 를 ◇에 맞추는 것. 그게 전부다."
> 
> **Standards Decide. Look & Choose.**
