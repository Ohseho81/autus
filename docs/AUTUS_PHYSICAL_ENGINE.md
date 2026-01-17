# AUTUS v2.0 Physical Engine

> **의견 없이 움직이고, 설명 없이 기록되며, 현상으로만 증명된다.**

## 개요

AUTUS Physical Engine은 두 가지 핵심 시스템으로 구성됩니다:

```
┌─────────────────────────────────────────────────────────────────┐
│                  AUTUS v2.0 Physical Engine                     │
├─────────────────────────────────────────────────────────────────┤
│  1. Inertia Debt Engine    │ 관성 부채 계산 (D = m × Δt × ψ)   │
│  2. K2 Scale Lock          │ 오퍼레이터 관측 제한 시스템        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Inertia Debt Engine (관성 부채 엔진)

### 핵심 공식

```
D = m × Δt × ψ
```

| 변수 | 의미 | 범위 |
|------|------|------|
| **D** | Inertia Debt (관성 부채) | 0~∞ |
| **m** | Mass (업무 중요도) | 1~10 |
| **Δt** | Delta Time (지연 시간) | hours |
| **ψ** | Psi (비가역성 상수) | 0~1 |

### 상태 결정

| 부채 | 상태 | 효과 |
|------|------|------|
| D < 50 | `normal` | 정상 운영 |
| 50 ≤ D < 150 | `warning` | 1.5x 지연 |
| 150 ≤ D < 300 | `critical` | 2.5x 지연, 30% 액션만 가능 |
| D ≥ 300 | `dark_matter` | 5x 지연, 개입 요청만 가능 |

### Drag Coefficient (항력 계수)

```typescript
drag = tanh(D / 300) × 0.95
```

- 부채가 증가할수록 모든 작업에 "마찰"이 증가
- 최대 95%까지 속도 저하

### Decay (감쇠)

```typescript
if (entropyReduced && noNewViolations) {
  D_new = D × (1 - 0.05)  // 5% 감소
}
```

조건:
1. 엔트로피 감소 행동 수행
2. 최근 24시간 위반 없음

---

## 2. K2 Scale Lock (관측 제한 시스템)

### 목적

**"K2 오퍼레이터는 K2까지만 본다"**

상위 고도(K3+)의 정보는 의도적으로 제한/왜곡됩니다.

### 카메라 Z축 제한

| Scale | Z 범위 |
|-------|--------|
| K1 | 0~10 |
| K2 | 10~25 |
| K3 | 25~50 |
| K4 | 50~100 |
| K5 | 100~200 |
| K6 | 200~400 |
| K7 | 400~700 |
| K8 | 700~1000 |
| K9 | 1000~1500 |
| K10 | 1500~2000 |

K2 오퍼레이터: **Z = 0~25**만 이동 가능

### 노드 가시성

| 노드 Scale | K2 오퍼레이터 기준 |
|------------|-------------------|
| K1~K2 | `full` - 완전 가시, 조작 가능 |
| K3 | `shape_only` - 형체만, 조작 불가 |
| K4+ | `hidden` - 완전 숨김 |

### 엔트로피 트렌드

```
▲▲ = increasing (high)
▲  = increasing (medium)
△  = increasing (low)
○  = stable
▽  = decreasing (low)
▼  = decreasing (medium)
▼▼ = decreasing (high)
```

### 권한 체크

**CAN SEE:**
- 로컬 노드 (K1-K2)
- 실행 로그
- 개인 메트릭

**CANNOT SEE:**
- 글로벌 그래프
- 전략적 흐름
- 미래 예측
- K3+ 상세 정보

**CAN AFFECT:**
- 로컬 노드 상태
- 실행 로그

**CANNOT AFFECT:**
- 상위 궤도 노드
- 시스템 메트릭

---

## API Reference

### InertiaDebtEngine

```typescript
class InertiaDebtEngine {
  // 노드 처리 및 부채 계산
  processNode(node: Node): InertiaDebtResult
  
  // 엔트로피 감소 기록
  recordEntropyReduction(nodeId: string, amount: number): void
  
  // 위반 기록
  recordViolation(nodeId: string): void
  
  // 감쇠 사이클 실행
  runDecayCycle(entropyReducedNodes: Set<string>): Map<string, number>
  
  // 지연 배수 조회
  getLatencyModifier(nodeId: string): number
  
  // 가능한 액션 조회
  getAvailableActions(nodeId: string, allActions: string[]): string[]
  
  // 부채 조회
  getDebt(nodeId: string): number
}
```

### K2ScaleLockController

```typescript
class K2ScaleLockController {
  // 카메라 이동 요청
  requestCameraMove(targetZ: number): { allowed: boolean; finalZ: number }
  
  // 노드 상호작용 요청
  requestNodeInteraction(node: ScaleNode): { allowed: boolean; visibility: NodeVisibility }
  
  // 액션 기록
  recordAction(operatorId: string, node: ScaleNode, action: string): ActionResult
  
  // 엔트로피 트렌드 조회
  getCurrentEntropyTrend(): EntropyTrend
  
  // 권한 체크
  canSee(feature: string): boolean
  canAffect(target: string): boolean
}
```

---

## 사용법

### React Hook

```typescript
import { useAUTUSv2 } from '@/core/physics';

function MyComponent() {
  const {
    processNode,           // 노드 부채 계산
    requestCameraMove,     // 카메라 이동
    requestNodeInteraction,// 노드 상호작용
    recordAction,          // 액션 기록
    getEntropyTrend,      // 엔트로피 트렌드
    getDebt,              // 부채 조회
    canSee,               // 가시성 권한
    canAffect,            // 조작 권한
  } = useAUTUSv2('K2');
  
  // 노드 처리
  const result = processNode({
    id: 'task-001',
    mass: 5,
    createdAt: Date.now() - 86400000,
    lastActionAt: Date.now() - 3600000,
    psi: 0.5,
    status: 'active',
  });
  
  console.log(result.status);        // 'warning'
  console.log(result.dragCoefficient); // 0.32...
}
```

### Factory 함수

```typescript
import { createAUTUSv2System } from '@/core/physics';

const system = createAUTUSv2System('K3');

// Inertia Engine 직접 접근
system.inertiaEngine.processNode(node);

// Scale Lock 직접 접근
system.scaleLock.requestCameraMove(50);
```

---

## 파일 구조

```
frontend/src/core/physics/
├── inertia-debt-engine.ts  # 관성 부채 엔진
├── k2-scale-lock.ts        # K2 스케일 락
├── test-runner.ts          # 테스트 슈트
└── index.ts                # 모듈 내보내기
```

---

## 테스트

### 실행

```typescript
import { runAllTests } from '@/core/physics/test-runner';

runAllTests();
```

### 출력 예시

```
╔════════════════════════════════════════════╗
║   AUTUS v2.0 Physical Engine Test Suite    ║
╚════════════════════════════════════════════╝

=== Inertia Debt Engine Tests ===
--- Test Case 1: Low Debt Node ---
Node: node-001
Inertia Debt: 0.30
Drag Coefficient: 0.0009
Status: normal

--- Test Case 2: High Debt Node ---
Inertia Debt: 345.60
Drag Coefficient: 0.7823
Status: dark_matter
Flags: [DARK_MATTER_VISUAL, INTERACTION_BLOCKED, ...]

=== K2 Scale Lock Tests ===
--- Test 1: Camera Movement ---
Move to Z=20: ALLOWED → 20
Move to Z=100: BLOCKED → 15

╔════════════════════════════════════════════╗
║   AUTUS v2.0 Engine Ready for Deployment   ║
╚════════════════════════════════════════════╝
```

---

## 철학

### 관성 부채 (Inertia Debt)

> **"하지 않은 일은 시간이 지날수록 무거워진다"**

미루어진 업무는 물리적 관성을 획득합니다.
- 중요도(m) × 지연 시간(Δt) × 되돌림 불가능성(ψ)
- 부채가 쌓이면 시스템 전체가 느려집니다

### 스케일 락 (Scale Lock)

> **"보지 말아야 할 것은 보이지 않는다"**

K2 오퍼레이터에게 K7 전략은 존재하지 않습니다.
- 이것은 제한이 아니라 **보호**입니다
- 불필요한 정보는 혼란을 야기합니다
- 각 고도에서 최적의 결정을 내리도록 설계됨

---

## 시스템 정보

```typescript
{
  version: '2.0.0',
  name: 'AUTUS Physical Engine',
  modules: ['InertiaDebtEngine', 'K2ScaleLockController'],
  description: 'Phenomenological Operating System - Physical Engine Layer'
}
```

---

*AUTUS v2.0 - Physical Engine Documentation*
