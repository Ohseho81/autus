# AUTUS Core Architecture

## 핵심 가치
- **미래예측**: 현재 상태에서 미래 상태 계산
- **자동화**: 조건 충족 시 자동 실행/잠금

## 디렉토리 구조

```
frontend/src/core/
│
├── autus-core.ts          # 🎯 핵심 엔진 (미래예측 + 자동화)
│
├── layers/                # 8단계 계층 (헌법)
│   └── index.ts           # Layer 0-7 정의
│
├── tasks/                 # 업무 시스템
│   ├── physicsClassification.ts  # 7대 물리 법칙 분류
│   └── ...
│
├── physics/               # 물리 엔진
│   ├── inertia-debt-engine.ts    # 관성 부채
│   └── k2-scale-lock.ts          # Scale Lock
│
├── decision/              # 의사결정
│   ├── gate.ts                   # Decision Gate
│   ├── regulationEngine.ts       # 규제 엔진
│   └── FogOfWarUI.tsx           # Fog of War
│
├── causality/             # 인과관계
│   ├── engine.ts                 # Causality Engine
│   └── types.ts                  # 타입 정의
│
├── discovery/             # 발견 시스템
│   ├── constants.ts              # K, I, Ω, r
│   ├── networkPrediction.ts      # 네트워크 예측
│   └── engine.ts                 # Discovery Engine
│
└── [레거시 - 정리 예정]
    ├── altitudeEngine.ts
    ├── gravitySystem.ts
    ├── schema.ts
    └── ...
```

## 사용법

```typescript
import { useAutusCore } from '@/core/autus-core';

function MyComponent() {
  const { predict, evaluate } = useAutusCore();
  
  // 미래예측
  const prediction = predict({
    taskId: 1,
    currentState: {...},
    horizonHours: 24
  });
  
  // 자동화 평가
  const logs = evaluate(1, state);
}
```

## 레거시 파일 처리

다음 파일들은 autus-core.ts로 통합되어 삭제 예정:
- altitudeEngine.ts → layers/
- gravitySystem.ts → autus-core.ts
- schema.ts → layers/

## 불변 규칙

1. 하위 계층은 상위 계층을 수정할 수 없다
2. 모든 노드에 좌표(lat/lng) 필수
3. 비가역적 결정은 자동 잠금
4. Afterimage는 변경 불가
