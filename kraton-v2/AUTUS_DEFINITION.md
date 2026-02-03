# AUTUS 완전 정의서

> **AUTUS** = **AUT**omatic + **U**nified + **S**ystem
>
> "생산자 앱 생산기" - Owner의 V 목표를 달성하는 자동화된 통합 시스템

---

## 1. 핵심 공식

### V (Value) 공식
```
V = (M - T) × (1 + s)^t

M = Mint (생성 가치)
T = Tax (비용/손실)
s = synergy (시너지 계수: -0.3 ~ +0.5)
t = time (복리 기간)
```

### 물리적 한계 (불변)
```javascript
PHYSICS = {
  MAX_EVENTS_PER_HOUR_PER_PERSON: 12,  // 5분에 1건
  MAX_DECISIONS_PER_DAY_PER_OWNER: 20, // 집중력 한계
  MAX_AUTOMATION_RATE: 0.85,           // 15%는 인간 필요
  CONTEXT_SWITCH_COST: 0.15,           // 문맥 전환 비용
  COMMUNICATION_OVERHEAD: 0.10,         // 커뮤니케이션 오버헤드
}
```

---

## 2. 헌법 (Constitution) - K1~K5

> **절대 변경 불가한 핵심 원칙**

| 코드 | 원칙 | 설명 |
|------|------|------|
| K1 | Score-based promotion only | 점수 기반 승격만 허용 |
| K2 | User input is signal, not command | 사용자 입력은 신호지, 명령이 아님 |
| K3 | No action without proof | 증거 없이 행동 금지 |
| K4 | 24h waiting period | 주요 결정에 24시간 대기 |
| K5 | Standard ≤ 10% | 표준 10% 이하 유지 |

### Pain Signal 정의 (불변)
```
Pain Signal = 해결하면 V가 창출되는 사용자 입력
FILTER_TARGET = 90% (90%는 필터링되어야 함)
```

---

## 3. 3대 원리 (Amazon × Tesla × Palantir)

### 3.1 Amazon: Working Backwards
> "고객에게 필요한 것 → 그것을 만들기 위해 필요한 것"

- V 목표에서 역산하여 역할별 필요 활동량 계산
- OutcomeFact: 고객 이벤트를 사실(Fact)로 변환
- S-Tier 이벤트는 자동으로 프로세스 생성

```javascript
OUTCOME_TIERS = {
  S: { autoProcess: true, ttlHours: 48 },   // 즉시 프로세스 생성
  A: { autoProcess: false, ttlHours: 168 }, // 모니터링
  Terminal: { autoProcess: true, ttlHours: 0 }, // 종료
}
```

### 3.2 Tesla: First Principles + Shadow Mode
> "물리 법칙이 허용하는 한계까지"

- Shadow 관찰 → 신뢰도 축적 → 자동 Promotion
- 정책 모드: shadow → candidate → promoted → killed

```javascript
POLICY_MODES = {
  shadow: { execute: false, observe: true },
  candidate: { execute: false, observe: true },
  promoted: { execute: true, observe: true },
  killed: { execute: false, observe: false },
}

// 승격 조건
PROMOTION_THRESHOLD = 0.9    // 90% 신뢰도
MIN_OBSERVATIONS = 50        // 최소 50회 관찰
```

### 3.3 Palantir: Ontology + Blast Radius
> "모든 데이터 연결, 영향 범위 계산"

- 상태 전이 시 Blast Radius 계산
- 불변 로그 (Immutable Log)로 모든 행위 기록

```javascript
STATES = {
  S0: 'idle',
  S1: 'intake',       // S-Tier 발생 시 진입
  S2: 'eligible',
  S3: 'approval',
  S4: 'intervention',
  S5: 'monitor',
  S6: 'stable',
  S7: 'shadow',       // Tesla Shadow Mode
  S8: 'liability',
  S9: 'closed',       // Terminal
}
```

---

## 4. 역할 구조

### 4.1 내부 3티어 (Internal Tiers)

| Tier | 역할 | 자동화율 | 책임 |
|------|------|----------|------|
| **C-Level** | Owner/CEO | 20% | V 목표 설정, 자원 배분, 최종 결정 |
| **FSD** | 중간관리자/판단AI | 80% | 판단, 배정, 위험 예측 |
| **Optimus** | 실무자/KRATON | 98% | 실행, 자동 처리 |

### 4.2 외부 3사용자 (External Users)

| 역할 | 예시 | 자동화율 |
|------|------|----------|
| Primary Consumer | 고객/학생/사용자 | 95% |
| Regulatory Participant | 정부/행정 | 80% |
| Partner Collaborator | 공급자/파트너 | 90% |

### 4.3 흡수된 패시브 모듈

| 원래 명칭 | 흡수 위치 | 기능 |
|-----------|-----------|------|
| Opinion Shaper | Optimus | 여론/소셜 모니터링 |
| Ecosystem Observer | FSD | 경쟁/업계 분석 |
| Capital & Pressure | FSD + Optimus | 투자자/주주 관리 |
| Indirect Affected | Optimus | CSR/사회적 영향 |

---

## 5. 계약 규칙 (Contract Rules)

### C1: 행동 불가능성
```javascript
// 허용되지 않은 상태 전이는 UI에 존재하지 않음
ALLOWED_TRANSITIONS = {
  student: {
    registered: ['active'],
    active: ['paused', 'quit'],
    paused: ['active', 'quit'],
    quit: [],  // 전이 불가
  }
}
```

### C2: 자동 책임 분기
```javascript
LIABILITY_RULES = {
  'class.cancelled.coach_absent': { liability: 'coach', action: 'salary_deduction' },
  'class.cancelled.system_error': { liability: 'autus', action: 'credit_compensation' },
}
```

### C3: 사전 승인 게이트
```javascript
GATE_RULES = {
  'student.active': { required: ['payment.approved'], approver: 'owner' },
  'payment.refund': { approver: 'owner', condition: { withinDays: 7 } },
}
```

### C4: 되돌림 비용
```javascript
LOCK_IN_COSTS = {
  'student.quit': { rate: 0.1 },  // 10% 환불 수수료
  'class.cancelled.by_parent': { rate: 0.2, within_hours: 24 },  // 당일취소 20%
}
```

### C5: 자동 증빙
- 모든 행위 불변 기록
- 무결성 해시 생성

### C6: 보험 트리거
```javascript
INSURANCE_TRIGGERS = {
  'attendance.streak_broken': { condition: { consecutive_absences: 3 }, action: 'auto_pause' },
  'payment.overdue': { condition: { days_overdue: 30 }, action: 'auto_suspend' },
}
```

---

## 6. Pain Signal Engine (학습형)

### 분류 체계
```
PAIN (score ≥ 0.70)    → producer (해결 담당자)
REQUEST (score ≥ 0.30) → manager (관리자)
NOISE (score < 0.30)   → discard (폐기)
```

### 학습 메커니즘
1. **키워드 가중치 학습**: V 창출 확인 시 가중치 상향
2. **임계값 자동 조정**: 90% 필터링 목표 유지
3. **사용자 패턴 학습**: 높은 V 창출률 사용자 민감 처리
4. **산업별 조정**: 교육(0.65), 의료(0.60), 물류(0.75)

### 헌법 영역 vs 학습 영역
```
Constitutional (불변):     Adaptive (학습 가능):
├── K1-K5                  ├── 키워드 가중치
├── Pain Signal 정의       ├── 임계값
├── 90% 필터 목표          ├── 사용자 패턴
└── 증거 필수              └── 산업별 조정
```

---

## 7. 4단계 이벤트 흐름

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   일체화     │ → │   자동화     │ → │   승인화     │ → │   업무화     │
│  (Unified)  │    │ (Automated) │    │ (Approved)  │    │  (Tasked)   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     ↓                   ↓                  ↓                  ↓
 Pain Signal        Shadow Mode        Gate Check          Execution
   수집              정책 관찰          승인 대기           실제 실행
```

---

## 8. 엔진 파일 구조

```
src/
├── core/
│   ├── PainSignalEngine.js    # 학습형 Pain Signal 판단
│   └── VFactoryEngine.js      # V-Factory (Amazon×Tesla×Palantir)
├── engine/
│   └── AUTUSEngine.js         # 통합 엔진 (ImmutableLog, OutcomeFact, Policy, StateMachine)
├── contract/
│   ├── rules.js               # C1-C6 계약 규칙
│   ├── outcomeEngine.js       # Outcome 처리 엔진
│   └── synthesis_rules.json   # 합성 규칙
└── lib/
    └── autus/
        └── roles.js           # 역할 아키텍처 정의
```

---

## 9. UI 대시보드

| 해시 | 컴포넌트 | 기능 |
|------|----------|------|
| #vfactory | AUTUSVFactory | V-Factory 대시보드 (Working Backwards, Bottlenecks, Ontology) |
| #flowtune | AUTUSFlowTune | 실시간 플로우 최적화 |
| #producer | AUTUSProducer | 생산자 앱 (워크플로우 빌더, 차트, 통합) |
| #moltbot | AUTUSMoltBot | MoltBot × Claude 상호작용 |
| #blueprint | AUTUSBlueprint | 산업-상품-소비자-생산자 프레임워크 |
| #engine | AUTUS | 원리 기반 역할별 뷰 |
| #core | AUTUSCore | Amazon+Tesla+Palantir 통합 |
| #live | AUTUSLive | 실제 동작 엔진 |

---

## 10. 재검증 필요 항목

### ✅ 완성된 부분
- [x] V 공식 및 물리적 한계 정의
- [x] K1-K5 헌법
- [x] 3대 원리 (Amazon/Tesla/Palantir) 엔진
- [x] Pain Signal 학습 엔진
- [x] 계약 규칙 C1-C6
- [x] 역할 아키텍처 (3티어 + 3외부 + 흡수모듈)
- [x] V-Factory Working Backwards 역산
- [x] UI 대시보드들

### ⚠️ 보완 필요 항목
1. **실제 DB 연동**: 현재 인메모리 저장소, Supabase 완전 연동 필요
2. **엔진 간 연결**: PainSignalEngine ↔ VFactoryEngine ↔ AUTUSEngine 통합 미완성
3. **실시간 학습 파이프라인**: dailyUpdate() 자동 실행 스케줄러 미구현
4. **Blast Radius 시각화**: StateMachine의 Blast Radius UI 연동 필요
5. **Shadow → Promoted 자동화**: PolicyEngine의 자동 승격 로직 테스트 필요

### ❌ 미구현 항목
1. **ML 모델 연동**: 현재 규칙 기반, 실제 ML 예측 모델 없음
2. **외부 시스템 실제 연결**: Slack/Google Drive/Notion 등 실제 API 연동
3. **다중 Producer App 지원**: 현재 단일 App 기준
4. **결제 시스템 실제 연동**: PG사 연동 없음

---

## 11. 핵심 차별점

```
기존 시스템:               AUTUS:
───────────────────────────────────────────────────
입력 = 명령               입력 = 신호 (K2)
수동 판단                  자동 분류 + 학습
단일 규칙                  적응형 임계값
사후 분석                  실시간 Blast Radius
개별 기록                  불변 로그 + 해시
인간 승격                  신뢰도 기반 자동 승격
```

---

*Last Updated: 2026-02-02*
*Version: 1.0.0*
