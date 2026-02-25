# 🏛️ AUTUS UI 구축 체크리스트 & 개발 프로세스

> AUTUS Scale v2.0 철학(책임 반경, 비가역성, 승인 주체)을 구동 가능한 소프트웨어로 전환하기 위한 표준 가이드

---

## ✅ 1. UI 설계 핵심 체크리스트

이 리스트는 '디자인'이 아니라 '작동 규칙'에 집중합니다.

### 🔍 가시성 & LOD (Level of Detail)

| 항목 | 설명 | 구현 파일 |
|------|------|-----------|
| ☑️ **고도별 UI 가시성** | K1은 텍스트 중심, K10은 수식/패턴 중심 | `schema.ts` → `ScaleConfig.lod` |
| ☑️ **시각적 계층(Z-Axis)** | 중요 데이터가 더 밝게/가깝게 표현 | `altitudeEngine.ts` → `cameraZ` |
| ☑️ **인지적 안개(Fog of War)** | 권한 밖 구역 쉐이더 효과로 은폐 | `schema.ts` → `ui.blur` |

### ⚡ Gravity Trigger & 비가역성

| 항목 | 설명 | 구현 파일 |
|------|------|-----------|
| ☑️ **중력 트리거** | 비가역적 결정 시 자동 고도 상승 | `gravitySystem.ts` → `forceScaleUp()` |
| ☑️ **실패 비용 알림** | 결정의 시간적/금액적 손실 정량 표시 | `schema.ts` → `FailureCost` |
| ☑️ **Undo 한계 명시** | 비가역적 로그로 남는 시점 표시 | `schema.ts` → `IrreversibilityMeta` |

### 👤 권한 & 승인

| 항목 | 설명 | 구현 파일 |
|------|------|-----------|
| ☑️ **승인 주체 명시** | 버튼 권한자 시각적 표시 | `schema.ts` → `ApprovalAuthority` |
| ☑️ **권한 기반 잠금** | 최대 허용 고도 제한 | `gravitySystem.ts` → `UserPermissions` |
| ☑️ **승인 워크플로우** | 고도 초과 시 승인 요청 생성 | `gravitySystem.ts` → `PendingApproval` |

---

## 🌀 2. 5-Step 개발 프로세스

### Step 1: The Soul (데이터 스키마)
```
frontend/src/core/schema.ts
```

**구현 완료:**
- `KScale`: K1~K10 타입 정의
- `AutusTask`: K·Ω·F·A 속성 포함 인터페이스
- `GravityTrigger`: 자동 고도 상승 조건
- `SCALE_CONFIGS`: K별 UI/LOD 설정 매핑

**Cursor 지시 예시:**
```
"모든 Task 객체에 K1~K10 스케일 속성과 승인 주체 ID를 포함한 인터페이스 작성"
```

---

### Step 2: The World (물리 엔진)
```
frontend/src/core/altitudeEngine.ts
```

**구현 완료:**
- `AltitudeEngine`: 줌/스크롤 → 고도 이동 매핑
- `useAltitude()`: React Hook
- `SCALE_Z_BOUNDARIES`: K별 Z좌표 경계
- Easing 애니메이션, 스냅 기능

**핵심 로직:**
```typescript
// 줌 레벨 → K-Scale 변환
handleWheel(deltaY) → zoomLevel → cameraZ → currentScale

// K-Scale → UI 컴포넌트 교체
if (scale <= 3) return <TacticalUI />
if (scale <= 6) return <StrategicUI />
return <UniversalUI />
```

---

### Step 3: The Body (고도별 컴포넌트)
```
frontend/src/pages/AutusMain.tsx
```

**구현 완료:**
- **K1-K3 (Tactical UI):** 리스트, 체크박스, 타이머
- **K4-K6 (Strategic UI):** 간트차트, 조직도, 승인 UI
- **K7-K10 (Universal UI):** 은하계 노드 맵, 헌법 수식

**LOD 설정:**
```typescript
K1-K3: { showMetrics: false, showGraph: false, detailLevel: 'minimal' }
K4-K6: { showMetrics: true, showGraph: true, detailLevel: 'standard' }
K7-K10: { showMetrics: true, showFormula: true, detailLevel: 'comprehensive' }
```

---

### Step 4: The Mind (Gravity System)
```
frontend/src/core/gravitySystem.ts
```

**구현 완료:**
- `GravitySystem`: 비가역성 분석 엔진
- `analyzeTask()`: Task 분석 → 필요 고도 반환
- `forceScaleUp()`: 자동 고도 상승
- `lockScale() / unlockScale()`: 고도 잠금

**트리거 예시:**
```typescript
{
  id: 'gt-money-100m',
  name: '1억 이상 결제',
  condition: { type: 'money_threshold', value: 100_000_000, currency: 'KRW' },
  targetScale: 4,  // → K4 경영진 승인
  isForced: true,
}
```

---

### Step 5: The Skin (시각적 최적화)
```
CommandCenterV2.tsx, GalaxyScene.tsx
```

**구현 완료:**
- 색온도 필터 (K별 시각적 분위기)
- Glassmorphism UI
- 발광 효과 (Glow Shader)
- 애니메이션 (Framer Motion)

**색온도 시스템:**
```typescript
K1-K3: 5500-6200K (중성)
K4-K6: 6800-3500K (점점 따뜻하게)
K7-K10: 7500-10000K (차가운 → 백열)
```

---

## 📊 3. 파일 구조

```
frontend/src/
├── core/                    # ⭐ 핵심 시스템
│   ├── schema.ts           # Step 1: 데이터 스키마
│   ├── altitudeEngine.ts   # Step 2: 물리 엔진
│   ├── gravitySystem.ts    # Step 4: Gravity System
│   └── index.ts            # Export
│
├── pages/
│   └── AutusMain.tsx       # Step 3+5: 통합 UI
│
└── components/
    ├── Scale/              # K-Scale UI
    ├── Galaxy/             # 3D 우주 뷰
    └── CommandCenter/      # Command Center V2
```

---

## 🚀 4. 실행 방법

```bash
cd frontend
npm run dev

# 접속
http://localhost:3000/autus.html  # 메인 (Step 1-5 통합)
http://localhost:3000/scale.html  # K-Scale 데모
http://localhost:3000/command.html # Command Center V2
http://localhost:3000/galaxy.html  # 3D Galaxy
```

---

## 📋 5. MVP 7일 로드맵 (진행 상태)

| 일차 | 목표 | 상태 | 산출물 |
|------|------|------|--------|
| 1~2일 | Core Logic | ✅ 완료 | `schema.ts` |
| 3~4일 | Zoom Engine | ✅ 완료 | `altitudeEngine.ts` |
| 5일 | Gravity Trigger | ✅ 완료 | `gravitySystem.ts` |
| 6~7일 | Polishing | ✅ 완료 | `AutusMain.tsx` |

---

## 🏁 결론

**철학 → 코드 매핑:**

| AUTUS 철학 | 코드 구현 |
|------------|-----------|
| 책임 반경 (K-Scale) | `KScale`, `SCALE_CONFIGS` |
| 비가역성 (Ω) | `IrreversibilityMeta`, `omega` |
| 실패 비용 (F) | `FailureCost` |
| 승인 주체 (A) | `ApprovalAuthority`, `UserPermissions` |
| Gravity Trigger | `GravitySystem.forceScaleUp()` |
| LOD | `AltitudeEngine`, 컴포넌트 교체 |

---

*"프로세스는 정립되었습니다. 이제 첫 번째 코드 라인을 생성하시겠습니까?"* 

**→ 생성 완료. 🚀🏛️🌀**
