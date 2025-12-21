# AUTUS SOLAR HQ — UI SPEC

> **STATUS: LOCKED** 🔒  
> **DATE: 2025-12-17**  
> **VERSION: 1.0**

---

## 1. 레이어 배치 (LOCKED)

```yaml
UI_LAYOUT:
  L0_SOLAR:
    position: CENTER
    style: "SF Command Center"
    role: "지휘 중심, 항상 고정"
    elements:
      - 중앙 3D 태양계 (Reality)
      - 9행성 궤도
      - 와이어프레임 지구
    
  L1_CORE:
    position: OVERLAY (투명)
    style: "Minority Report Glass"
    role: "헌법/제약, 호출형"
    trigger: "[C] 키 또는 위반 시 자동"
    
  L2_SIMULATION:
    position: ORBIT (태양계 외곽)
    style: "Data Halo / Ring"
    role: "예측 링, 반투명"
    elements:
      - Inner Ring (Recovery/Stability)
      - Outer Ring (Shock/Friction)
    
  L3_ACTION:
    position: RIGHT BOTTOM
    style: "Cockpit HUD"
    role: "실행 버튼"
    elements:
      - RECOVER (녹색)
      - DEFRICTION (파랑)
      - SHOCK DAMP (주황)
    
  L4_AUDIT:
    position: CENTER OVERLAY (정지)
    style: "Command Center Judgment"
    role: "판정의 순간"
    animation: "전체 어둡게 + 중앙 집중"
    
  L5_MEMORY:
    position: LEFT SLIDE
    style: "Timeline Log"
    role: "과거 기록"
    trigger: "[M] 키"
    
  L7_SYSTEM:
    position: TOP BAR
    style: "Status Strip"
    role: "시스템 상태"
    elements:
      - API / DB / WORKER 상태
      - FPS / UPTIME / LATENCY
      - POLICY 버전
```

---

## 2. 색상 팔레트 (LOCKED)

```yaml
COLOR_PALETTE:
  background: "#020408"
  
  primary:
    cyan: "#00d4ff"      # 주 강조색
    green: "#00ff88"     # 성공/회복
    amber: "#ffb400"     # 경고
    red: "#ff4444"       # 위험/CRITICAL
    
  secondary:
    purple: "#8844ff"    # Stability
    pink: "#ff44aa"      # Cohesion
    orange: "#ff8800"    # Shock
    blue: "#44aaff"      # Transfer
    
  ui:
    panel_bg: "rgba(0,20,40,0.9)"
    border: "rgba(0,212,255,0.25)"
    text_dim: "#666"
    text_normal: "#aaa"
    text_bright: "#fff"
```

---

## 3. 9 Planets 색상 (LOCKED)

| Planet | Color | Hex |
|--------|-------|-----|
| RECOVERY | 녹색 | `#44ff44` |
| STABILITY | 보라 | `#8844ff` |
| COHESION | 핑크 | `#ff44aa` |
| SHOCK | 주황 | `#ff8800` |
| FRICTION | 빨강 | `#ff4444` |
| TRANSFER | 파랑 | `#44aaff` |
| TIME | 황금 | `#ffaa00` |
| QUALITY | 시안 | `#00d4ff` |
| OUTPUT | 에메랄드 | `#00ff88` |

---

## 4. GATE 배지 규칙 (LOCKED)

```yaml
GATE_RULES:
  GREEN:
    condition: "Recovery >= 60% AND risk < 0.6"
    color: "#00ff88"
    
  AMBER:
    condition: "Recovery < 60% OR risk >= 0.6 OR status === 'CRITICAL'"
    color: "#ffb400"
    
  RED:
    condition: "Recovery < 30%"
    color: "#ff4444"
```

---

## 5. SLA Strip 규칙 (LOCKED)

```yaml
SLA_RULES:
  WORKER:
    OK: "Recovery >= 50%"
    AT_RISK: "Recovery 35-50%"
    BREACH: "Recovery < 35%"
    
  EMPLOYER:
    OK: "Stability >= 20% AND Cohesion >= 25%"
    AT_RISK: "Otherwise"
    
  OPS:
    OK: "Shock < 60%"
    AT_RISK: "Shock 60-75%"
    BREACH: "Shock > 75%"
    
  REG:
    OK: "Shock < 85%"
    BREACH: "Shock > 85%"
```

---

## 6. L4 AUDIT 연출 (LOCKED)

```yaml
L4_AUDIT_SPEC:
  # 1. 배경 블랙아웃
  BLACKOUT:
    overlay: "rgba(0,0,0,0.92)"
    backdrop_filter: "blur(20px)"
    effect: "태양계 회전 정지"
    
  # 2. 중앙 집중
  CENTER_FOCUS:
    width: "400px"
    position: "center"
    shadow: "0 0 60px rgba(0,212,255,0.3)"
    border: "1px solid rgba(0,212,255,0.4)"
    
  # 3. 카운트다운 압박
  COUNTDOWN:
    duration: 30  # 초
    warning_at: 10  # 10초 이하 빨간색
    auto_reject_at: 0
    
  # 4. 버튼 배치
  BUTTONS:
    LOCK:
      color: "#00ff88"
      effect: "액션 실행 + API 호출"
    HOLD:
      color: "#ffb400"
      effect: "대기 (타이머 계속)"
    REJECT:
      color: "#ff4444"
      effect: "취소 + 닫기"
      
  # 5. 애니메이션
  ANIMATION:
    open: "fade-in 0.3s + scale 0.95→1"
    lock: "축소 → L5 방향 낙하"
    reject: "fade-out 0.2s"
```

---

## 7. 키보드 단축키 (LOCKED)

| 키 | 동작 |
|----|------|
| `C` | L1 CORE 토글 |
| `S` | L2 SIMULATION 토글 |
| `A` | L3 ACTION 토글 |
| `M` | L5 MEMORY 토글 |
| `ESC` | 모든 오버레이 닫기 |

---

## 8. 반응형 규칙

```yaml
RESPONSIVE:
  desktop:
    min_width: 1200px
    layout: "full"
    
  tablet:
    min_width: 768px
    layout: "compact"
    hide: ["L5_MEMORY auto"]
    
  mobile:
    max_width: 767px
    layout: "minimal"
    hide: ["L1_CORE", "L5_MEMORY"]
    stack: ["L3_ACTION bottom full-width"]
```

---

## 9. 성능 목표

```yaml
PERFORMANCE:
  FPS: ">= 60"
  first_paint: "< 1s"
  interactive: "< 2s"
  memory: "< 100MB"
```

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-17 | 1.0 | 최초 LOCK |

---

> **이 문서는 LOCKED 상태입니다.**  
> 변경 시 `dev_ops/freeze_control` 승인 필요.

