# AUTUS Discovery System

> **AUTUS에서 발견할 수 있는 5가지 핵심 요소**

## 개요

AUTUS Discovery System은 시스템 내 모든 개체의 본질을 발견하고 분류하는 프레임워크입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTUS Discovery System                       │
├─────────────────────────────────────────────────────────────────┤
│  1. 사용자 상수 K        │ 책임 반경, 의사결정 고도             │
│  2. 상호 상수 I, Ω, r    │ 상호작용, 엔트로피, 성장률           │
│  3. 사용자 타입          │ 16가지 기본 타입 분류                 │
│  4. 업무 타입            │ 30가지 업무 유형 및 솔루션            │
│  5. 네트워크 예측        │ 구조적/행동적/리스크/기회 예측        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. 사용자 상수 K (User Constant K)

### 정의
개인이 감당할 수 있는 의사결정의 최대 고도

### 공식
```
K = 0.3×Innate + 0.3×log(Experience) + 0.2×Resilience + 0.2×TrackScore
```

### 구성 요소
| 요소 | 범위 | 설명 |
|------|------|------|
| Innate | 0~1 | 타고난 역량 |
| Experience | 0~∞ | 누적 결정 수 |
| Resilience | 0~∞ | 실패 후 회복 횟수 |
| TrackRecord | K별 | 고도별 성공 결정 수 |

### K 값 해석
| K | 책임 반경 | 예시 역할 |
|---|----------|----------|
| K1~K2 | 개인 업무 | 실행자, 지원자 |
| K3~K4 | 팀 업무 | 팀장, 매니저 |
| K5~K6 | 부서 업무 | 이사, 본부장 |
| K7~K8 | 조직 업무 | C-Level |
| K9~K10 | 시스템 업무 | 창업자, 이사회 |

---

## 2. 상호 상수 I, Ω, r

### I (상호작용 지수)
```typescript
I = ConnectionCount × 0.3 + Frequency × 0.3 + Depth × 20 + Reciprocity × 20
```
- **범위**: 0~100
- **해석**: 네트워크 활동 강도

### Ω (엔트로피)
```typescript
Ω = DecisionComplexity × 0.25 + IrreversibilityRatio × 0.35 
    + InformationLoss × 0.2 + StateChangeFrequency × 0.2
```
- **범위**: 0~1
- **구간**: low (< 0.25) → optimal (< 0.5) → high (< 0.75) → critical

### r (성장률)
```typescript
r = ValueGrowth × 0.3 + CapabilityGrowth × 0.3 
    + InfluenceGrowth × 0.2 + NetworkExpansion × 0.2
```
- **범위**: -1 ~ +1
- **단계**: declining → stagnant → growing → accelerating → explosive

---

## 3. 사용자 타입 (16 Types)

### 높은 K (리더형)
| 타입 | 조건 | 특징 |
|------|------|------|
| **ARCHITECT** | 높은K + 높은I + 낮은Ω + 높은r | 시스템 설계자 |
| **COMMANDER** | 높은K + 높은I + 높은Ω + 높은r | 위기 지휘관 |
| **STRATEGIST** | 높은K + 낮은I + 낮은Ω + 높은r | 은둔 전략가 |
| **GUARDIAN** | 높은K + 낮은I + 낮은Ω + 낮은r | 시스템 수호자 |

### 중간 K (전문가형)
| 타입 | 조건 | 특징 |
|------|------|------|
| **CONNECTOR** | 중간K + 높은I + 낮은Ω + 높은r | 네트워크 허브 |
| **CATALYST** | 중간K + 높은I + 높은Ω + 높은r | 변화 촉매 |
| **SPECIALIST** | 중간K + 낮은I + 낮은Ω + 높은r | 깊은 전문가 |
| **MAINTAINER** | 중간K + 낮은I + 낮은Ω + 낮은r | 안정 유지자 |

### 낮은 K (실행가형)
| 타입 | 조건 | 특징 |
|------|------|------|
| **EXECUTOR** | 낮은K + 높은I + 낮은Ω + 높은r | 빠른 실행자 |
| **ADAPTER** | 낮은K + 높은I + 높은Ω + 높은r | 유연한 적응자 |
| **CRAFTSMAN** | 낮은K + 낮은I + 낮은Ω + 높은r | 장인 |
| **SUPPORTER** | 낮은K + 낮은I + 낮은Ω + 낮은r | 조용한 지원자 |

### 특수 타입
| 타입 | 조건 | 특징 |
|------|------|------|
| **PHOENIX** | 높은Ω + 높은r | 회복 중 |
| **DORMANT** | 모두 낮음 | 잠복기 |
| **VOLATILE** | 불안정 | 변동성 |
| **EMERGING** | 빠른 K 성장 | 성장형 |

---

## 4. 업무 타입 (30 Types)

### 전략 업무 (K7~K10)
- SYSTEM_DESIGN (시스템 설계)
- STRATEGIC_PLANNING (전략 기획)
- GOVERNANCE (거버넌스)
- CONSTITUTIONAL (헌법 변경)
- CAPITAL_ALLOCATION (자본 배분)

### 관리 업무 (K4~K6)
- ORGANIZATIONAL_CHANGE (조직 변경)
- POLICY_MAKING (정책 수립)
- RESOURCE_PLANNING (자원 계획)
- RISK_MANAGEMENT (리스크 관리)
- COMPLIANCE (규정 준수)

### 전문 업무 (K3~K5)
- TECHNICAL (기술)
- RESEARCH (연구)
- DEVELOPMENT (개발)
- ANALYSIS (분석)
- QUALITY_CONTROL (품질 관리)

### 협업 업무 (K2~K4)
- TEAM_COORDINATION (팀 조정)
- PARTNERSHIP (파트너십)
- SALES (영업)
- CUSTOMER_SUCCESS (고객 성공)
- COMMUNICATION (커뮤니케이션)

### 실행 업무 (K1~K3)
- IMPLEMENTATION (구현)
- DELIVERY (딜리버리)
- DAILY_OPERATIONS (일상 운영)
- SUPPORT (지원)
- MAINTENANCE (유지보수)

### 위기/전환 업무
- CRISIS_RESPONSE (위기 대응)
- TURNAROUND (턴어라운드)
- TRANSFORMATION (트랜스포메이션)
- RECOVERY (회복)
- INNOVATION (혁신)

---

## 5. 네트워크 예측

### 예측 유형
```
NetworkPrediction
├── structural     # 구조적 예측 (노드 수, 밀도, 허브 변화)
├── behavioral     # 행동 예측 (K 궤적, 이탈 위험, 역할 전환)
├── risk           # 리스크 예측 (취약점, 충돌, 병목, 캐스케이드)
├── opportunity    # 기회 예측 (시너지, 성장 촉매, 효율성)
└── scenarios      # 시나리오 (낙관/기본/비관)
```

### 예측 시간 범위
| Horizon | 기간 | 용도 |
|---------|------|------|
| week | 1주 | 단기 조정 |
| month | 1개월 | 운영 계획 |
| quarter | 분기 | 전술 계획 |
| year | 1년 | 전략 계획 |

### 리스크/기회 레벨
```
Risk:        low → moderate → elevated → high → critical
Opportunity: low → moderate → promising → high → exceptional
```

---

## 사용법

### React Hook
```typescript
import { useDiscovery } from '@/core/discovery';

function MyComponent() {
  const { 
    discoverK,           // K 상수 발견
    discoverUserType,    // 사용자 타입 발견
    discoverTaskSolution,// 업무 솔루션 발견
    createProfile,       // 프로필 생성
    predictNetwork,      // 네트워크 예측
  } = useDiscovery();
  
  // K 값 계산
  const K = discoverK('user-001', {
    innate: 0.7,
    experience: 500,
    resilience: 15,
    trackRecord: { 3: 100, 4: 50, 5: 20 }
  });
  
  // 사용자 타입 판별
  const { type, profile } = discoverUserType(
    K.current,    // K
    65,           // I
    0.3,          // Ω
    0.4           // r
  );
  
  // 네트워크 예측
  const prediction = predictNetwork('quarter');
}
```

### 타입 임포트
```typescript
import {
  UserConstantK,
  InteractionConstantI,
  EntropyConstantOmega,
  GrowthConstantR,
  UserType,
  TaskType,
  NetworkPrediction,
} from '@/core/discovery';
```

---

## 파일 구조

```
frontend/src/core/discovery/
├── constants.ts        # K, I, Ω, r 상수 및 사용자 타입
├── taskTypes.ts        # 업무 타입 및 솔루션
├── networkPrediction.ts# 네트워크 예측 엔진
├── engine.ts           # 통합 Discovery Engine
└── index.ts            # 모듈 내보내기
```

---

## 철학

> **"측정할 수 없으면 관리할 수 없다"** - 피터 드러커

AUTUS Discovery System은 측정을 통해:
1. 개인의 **본질적 역량**을 수치화
2. **최적 배치**를 자동 계산
3. **미래 궤적**을 예측

이로써 조직은 "느낌"이 아닌 **현상**으로 운영된다.

---

*AUTUS v4.0 - Discovery System Documentation*
