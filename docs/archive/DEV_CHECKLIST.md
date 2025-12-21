# AUTUS UI — DEV CHECKLIST (LOCK)

> **"이 UI는 멋있어 보이면 실패다. 사용자가 '끝났다'고 느끼면 성공이다."**

---

## 목표

- **프레임 안정 (60 FPS)**
- **설명 없는 인지**
- **Action 1회 → Audit 침묵**

---

## 0) 공통 환경 세팅

| 항목 | 스펙 |
|------|------|
| Framework | Next.js (App Router) |
| 3D Engine | Three.js r160+ |
| Renderer | WebGLRenderer |
| Loop | requestAnimationFrame |
| CSS | Layout only (motion 금지) |

---

## 1️⃣ SOLAR — Three.js 체크리스트

### Scene 기본
- [ ] `Scene` 1개
- [ ] `PerspectiveCamera` (FOV 45)
- [ ] `AmbientLight` (intensity 0.6)
- [ ] `DirectionalLight` (soft)

### Sun (중앙)
- [ ] `SphereGeometry(16, 32, 32)`
- [ ] `MeshStandardMaterial`
  - color: off-white (`#f5f5f5`)
  - roughness: 0.9
  - metalness: 0
- [ ] 미세 pulse (scale 1.0 → 1.03 / 3s)

### Orbit Objects (최대 3)
- [ ] `SphereGeometry(6, 16, 16)`
- [ ] `MeshStandardMaterial` (same palette)
- [ ] 회전은 **각자 다른 속도**
- [ ] **텍스트/아이콘 없음**

### 상태 애니메이션

| 상태 | 애니메이션 |
|------|-----------|
| GREEN | smooth rotation only |
| YELLOW | `Math.sin(time)` 기반 진동 (1.5px) |
| RED | 지속 진동 (3px) + 다른 궤도 점진 정지 |

---

## 2️⃣ RISK % — CSS 체크리스트

- [ ] 위치 고정 (`position: fixed`)
- [ ] 숫자 1개만 렌더
- [ ] 폰트: `system-ui`, SF Pro, Inter
- [ ] 색상 상태 연동 (즉시 변경)
- [ ] `transition: none` (애니메이션 금지)

```css
#risk-value {
  position: fixed;
  bottom: 80px;
  left: 80px;
  font-size: 72px;
  font-weight: 700;
  font-family: system-ui, 'SF Pro Display', 'Inter', sans-serif;
}

#risk-value.safe { color: #6EDC9A; }
#risk-value.warning { color: #FFD166; }
#risk-value.danger { color: #EF476F; }
```

---

## 3️⃣ ACTION 버튼 — Motion 체크리스트

### 버튼 생성
- [ ] **조건부 렌더링**
  - `risk >= 60`
  - `system != RED` (시스템 장애 시 숨김)
- [ ] Circle (56px / mobile 64px)
- [ ] 배경: off-white
- [ ] 문구: "지금 조치"

### 인터랙션
- [ ] hover 효과 ❌
- [ ] click 1회 제한 (debounce)
- [ ] 클릭 시:
  1. `freezeAllAnimations()`
  2. `setTimeout(300ms)`
  3. → AUDIT 화면 전환

```javascript
let actionClicked = false;

function handleAction() {
  if (actionClicked) return;
  actionClicked = true;
  
  freezeAllAnimations();
  setTimeout(() => showAudit(), 300);
}
```

---

## 4️⃣ AUDIT — Physics & Motion 체크리스트

### Token
- [ ] `SphereGeometry(14, 24, 24)`
- [ ] material: rough ceramic (`roughness: 0.95`)
- [ ] rotation ❌

### Drop Physics
| 항목 | 값 |
|------|-----|
| 시작 위치 | Sun position (Y ≈ 38%) |
| 거리 | viewport height × 0.38 |
| duration | **0.9s (고정)** |
| easing | ease-in only (`cubic-bezier(0.4, 0, 1, 1)`) |
| bounce | ❌ |

```javascript
// 물리 수식: y(t) = y0 + 0.5 × g × t²
// 체감 g = 2.4

function calculateTokenPosition(t, startY, endY) {
  const progress = t / 0.9; // 0.9초 고정
  const easedProgress = progress * progress; // ease-in
  return startY + (endY - startY) * easedProgress;
}
```

### Impact Frame
- [ ] 화면 진동 (2px / 60ms)
- [ ] 저주파 사운드 (30Hz / 80ms) or haptic
- [ ] 모든 animation stop

```javascript
function triggerImpact() {
  // 1. 화면 진동
  document.body.style.animation = 'shake 60ms';
  
  // 2. 사운드 (desktop)
  if (!isMobile) {
    playSound(30, 80); // 30Hz, 80ms
  } else {
    navigator.vibrate?.(80);
  }
  
  // 3. 모든 애니메이션 정지
  cancelAnimationFrame(animationId);
}
```

### After State
- [ ] 토큰 정지 (완전 무반응)
- [ ] UI 추가 반응 없음
- [ ] 추가 렌더 ❌

---

## 5️⃣ Mobile Responsive — 필수 체크

| 항목 | Desktop | Mobile (≤480px) |
|------|---------|-----------------|
| SOLAR 반경 | 220px | 140px |
| 태양 크기 | 32px | 22px |
| 궤도 수 | 3 | 2 |
| RISK 위치 | 좌하단 | 중앙 하단 |
| RISK 크기 | 72px | 56px |
| ACTION 버튼 | 56px | 64px |
| 진동 강도 | 1.0× | 0.6× |

```css
@media (max-width: 480px) {
  #solar-canvas { width: 280px; height: 280px; }
  #orbit-3 { display: none; }
  #risk-display { 
    left: 50%; 
    transform: translateX(-50%);
    text-align: center;
  }
  .action-btn {
    width: 64px;
    height: 64px;
    border-radius: 50%;
  }
}
```

---

## 6️⃣ 성능 & 안정성 체크

| 항목 | 기준 |
|------|------|
| FPS (desktop) | ≥ 60 |
| FPS (mobile) | ≥ 45 |
| Memory | < 100MB |
| WebGL context | loss 대비 필수 |

### 오류 대응
```javascript
renderer.context.canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  // ACTION 버튼 숨김
  hideActionButton();
  // 상태 동결
  freezeState();
});
```

---

## 7️⃣ 금지 사항 (BREAK 시 실패)

| 금지 항목 | 이유 |
|----------|------|
| ❌ GSAP/Framer 과잉 | 성능 저하 |
| ❌ 파티클 | 시각적 노이즈 |
| ❌ 글로우 과다 | 인지 방해 |
| ❌ 설명 텍스트 | 1초 인지 위반 |
| ❌ 로딩 스피너 | 불안감 유발 |
| ❌ 반복 애니메이션 | "끝" 인지 방해 |

---

## 파일 구조 (권장)

```
app/
├── solar/
│   ├── page.tsx           # SOLAR 메인
│   ├── components/
│   │   ├── SolarCanvas.tsx    # Three.js 캔버스
│   │   ├── RiskDisplay.tsx    # RISK %
│   │   ├── ActionButton.tsx   # ACTION 버튼
│   │   └── AuditOverlay.tsx   # AUDIT 토큰 낙하
│   ├── hooks/
│   │   ├── useThree.ts        # Three.js 초기화
│   │   ├── useOrbitAnimation.ts
│   │   └── useAuditPhysics.ts
│   └── lib/
│       ├── physics.ts         # 물리 계산
│       └── audio.ts           # 저주파 사운드
```

---

## 성공 기준 체크리스트

### SOLAR
- [ ] 1초 내 위험 인지
- [ ] 설명 없이 이해
- [ ] 클릭 욕구 없음

### ACTION
- [ ] 조건부 출현
- [ ] 1클릭 실행
- [ ] 즉시 피드백

### AUDIT
- [ ] 물리적 무게감
- [ ] 충돌 시 "끝" 체감
- [ ] 이후 완전 침묵

### Mobile
- [ ] 한 손 사용 가능
- [ ] 엄지 도달 영역
- [ ] 의미 보존 (축소 아님)

---

## 버전 관리

| 버전 | 날짜 | 변경 사항 |
|------|------|----------|
| v1.0 | 2025-12-18 | 초기 LOCK |

---

**문서 끝 — 이 체크리스트대로 구현하면 AUTUS UI 완성**
