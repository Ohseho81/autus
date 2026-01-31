# AUTUS Core Kernel

> "사람의 판단이 개입되는 순간, 시스템은 오염된다"

## 철학

AUTUS Core Kernel은 **완전한 자동 의사결정 시스템**입니다.
모든 결정은 공식으로 이루어지며, 사람의 개입이 없습니다.

## 5대 헌법 (K1-K5)

| 코드 | 이름 | 규칙 |
|------|------|------|
| K1 | PROMOTION_BY_SCORE_ONLY | 어떤 앱/모듈도 Score ≥ Threshold 일 때만 승격 가능 |
| K2 | USER_INPUT_IS_SIGNAL | 사용자 피드백 = 입력값, 판단 = 공식 |
| K3 | NO_PROOF_NO_RESULT | Proof Pack 5종 미완성 → 자동 탈락 |
| K4 | CORE_NEVER_REACTS_DIRECTLY | 모든 변화는: 입력 → 대기(24h) → 평가 → 적용 |
| K5 | STANDARD_IS_RARE | Standard ≤ 10% of total modules |

## 핵심 공식

### Quality Score
```
Q = 0.4×UserSatisfaction + 0.2×ReuseRate + 0.2×(100-FailureRate) + 0.2×OutcomeImpact
```

### Trust Weight
```
WeightedScore = UserScore × (TrustScore / 100)
```

### 승격 임계값
- EXPERIMENTAL: 0점 이상
- STABLE: 60점 이상
- STANDARD: 85점 이상

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      AUTUS Core Kernel                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐ │
│  │  MoltBot     │────▶│   Core       │────▶│  Execution   │ │
│  │  Filter      │     │   Enforcer   │     │  Queue       │ │
│  │              │     │              │     │              │ │
│  │  (압력정제)  │     │  (헌법집행)  │     │  (실행대기)  │ │
│  └──────────────┘     └──────────────┘     └──────────────┘ │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Pipeline                           │   │
│  │  Input → Filter → Evaluate → Approve/Reject → Queue   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 파일 구조

```
kernel/
├── CONSTITUTION.ts    # 5대 헌법 + 공식 (불변)
├── Enforcer.ts        # 헌법 집행자
├── MoltBotFilter.ts   # 압력 정제기 (90% 버림)
├── Pipeline.ts        # 전체 흐름 오케스트레이터
├── ProofPack.ts       # K3 증거 생성기
├── index.ts           # 메인 진입점
└── README.md          # 이 문서
```

## MoltBot: 압력 정제기

MoltBot의 진짜 임무:
- ❌ 고도화
- ✅ 압력 정제기

### 성공 KPI
**"얼마나 많은 제안을 버렸는가"** (90%+ 목표)

### 4단계 파이프라인
1. **노이즈 제거** - 감정 배출, 모호한 불평, 중복 제거
2. **Pain Signal 수치화** - 강도, 빈도, 영향자 수, 실행 가능성
3. **중복 병합** - 같은 카테고리 신호 통합
4. **상위 10% Proposal 생성** - 임계값 70점 이상만

## 사용법

### 기본 사용

```typescript
import { processUserInputs, KERNEL_INFO } from './kernel';

// 사용자 입력 처리
const result = processUserInputs([
  {
    id: '1',
    userId: 'user123',
    type: 'COMPLAINT',
    content: '로딩이 너무 느립니다',
    timestamp: Date.now(),
    sentiment: -60,
    urgency: 70,
    specificity: 80,
  },
  // ... 더 많은 입력
]);

console.log(`Discard Rate: ${result.summary.discardRate * 100}%`);
console.log(`Approved: ${result.summary.approved}`);
console.log(`Rejected: ${result.summary.rejected}`);
```

### Quality Score 계산

```typescript
import { calculateQualityScore, canPromote } from './kernel';

const score = calculateQualityScore({
  userSatisfaction: 85,
  reuseRate: 70,
  failureRate: 5,
  outcomeImpact: 80,
});

console.log(`Quality Score: ${score}`); // 79
console.log(`Can promote to STABLE: ${canPromote(score, 'STABLE')}`); // true
console.log(`Can promote to STANDARD: ${canPromote(score, 'STANDARD')}`); // false
```

### ProofPack 생성 (K3 준수)

```typescript
import { ProofPackBuilder, validateProofPack } from './kernel';

const proofPack = ProofPackBuilder.create()
  .recordInput({
    source: 'AllThatBasket',
    inputId: 'input_001',
    inputType: 'FEATURE_REQUEST',
    content: '출석 알림 기능 추가 요청',
  })
  .addStage('FILTER', 'PASSED')
  .addStage('EVALUATE', 'APPROVED')
  .complete('APPROVED', ['K1', 'K3', 'K5'])
  .build();

console.log(`Valid: ${validateProofPack(proofPack)}`); // true
```

## 금지된 표현들

K1에 의해 다음 표현으로 승격 불가:
- "좋아 보인다"
- "대표가 원한다"
- "전략적으로 필요하다"
- "급하다"
- "경쟁사가 한다"

**오직 Score ≥ Threshold 일 때만 승격 가능**

## 라이센스

AUTUS Internal - 수정 금지 (특히 CONSTITUTION.ts)
