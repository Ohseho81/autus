# AUTUS v1.0 시범 운영 릴리즈

> **출시일**: 2026-02-02
> **시범 운영 기간**: 1개월

---

## 🚀 접속 방법

```
http://localhost:3001/#ops
```

### 모든 대시보드
| URL | 기능 |
|-----|------|
| `#ops` | **시범운영 메인** (Pain 처리, V 추적) |
| `#vfactory` | V-Factory (Working Backwards) |
| `#producer` | 워크플로우 빌더 |
| `#flowtune` | 플로우 최적화 |
| `#moltbot` | MoltBot 채팅 |

---

## ✅ 구현 완료 (v1.0)

### 1. Core Architecture
```
src/core/
├── EventBus.js        ✅ 이벤트 기반 통신
├── Persistence.js     ✅ LocalStorage + Supabase 폴백
├── ConstitutionEnforcer.js  ✅ K1-K5 실시간 검증
├── VFactoryEngine.js  ✅ V 계산 및 추적
├── AUTUSRuntime.js    ✅ 통합 런타임
└── index.js           ✅ 모듈 Export
```

### 2. EventBus (이벤트 기반 통신)
```javascript
// 이벤트 발행
EventBus.emit('USER:INPUT', { text: '환불 요청', userId: 'user-1' });

// 이벤트 구독
EventBus.on('PAIN:CLASSIFIED', (event) => {
  console.log(event.payload.classification); // 'PAIN' | 'REQUEST' | 'NOISE'
});

// 미들웨어 (모든 이벤트 거침)
EventBus.use(async (event) => {
  // Constitution 검사
  return event; // 또는 null로 차단
});
```

### 3. Persistence (영속성)
```javascript
// 저장 (LocalStorage + Supabase 동기화)
await Persistence.save('pain_queue', { text: '환불', score: 0.8 });

// 로드
const data = await Persistence.load('pain_queue');

// 불변 로그 (체이닝 해시)
await Persistence.appendLog('v_creation', { amount: 50000 });

// 무결성 검증
const result = await Persistence.verifyLogIntegrity('v_creation');
// { valid: true, count: 150 }
```

### 4. Constitution Enforcer (K1-K5 강제)
```javascript
// 모든 이벤트는 자동으로 검사됨
// 위반 시 이벤트 차단 + CONSTITUTION_VIOLATION 이벤트 발행

// K2 예시: 사용자 입력 직접 실행 차단
{
  type: 'USER_INPUT',
  payload: { text: '환불해줘', executeDirectly: true }
}
// → 차단됨: "K2 위반: 사용자 입력은 직접 실행할 수 없습니다"

// K3 예시: 증거 없는 환불 차단
{
  type: 'REFUND',
  payload: { amount: 100000 } // proof 없음
}
// → 차단됨: "K3 위반: REFUND에는 증거가 필요합니다"

// K4 예시: 24시간 대기
{
  type: 'TERMINATION',
  payload: { requestedAt: Date.now() } // 방금 요청
}
// → 차단됨: "K4 위반: 24시간 더 대기해야 합니다"
```

### 5. Pain Signal (학습형)
```javascript
// 자동 분류
const result = PainSignalProcessor.classify({
  text: '환불 요청합니다 급함'
}, 'user-123');

// result:
{
  classification: 'PAIN',  // 'PAIN' | 'REQUEST' | 'NOISE'
  score: 0.82,
  timestamp: 1738447200000
}

// V 생성 피드백 → 자동 학습
PainSignalProcessor.recordVCreation(signalId, 50000, 'user-123');

// 임계값 자동 조정 (90% 필터 목표)
// 100건 이후 자동으로 thresholds.pain/request 조정
```

### 6. AUTUSRuntime (통합 런타임)
```javascript
import { AUTUSRuntime, useAUTUS } from './core';

// 초기화
await AUTUSRuntime.init({
  appName: '온리쌤',
  industry: 'education',
  vTarget: { monthly: 10000000 }
});

// React Hook
function MyComponent() {
  const { processInput, recordV, getDashboardData } = useAUTUS();

  // 사용자 입력 처리
  await processInput({ text: '환불 요청' }, 'user-123');

  // V 기록
  await recordV(50000, { source: 'pain_resolution', fromPain: true });

  // 대시보드 데이터
  const data = getDashboardData();
}
```

---

## 📊 데이터 흐름

```
사용자 입력
    ↓
[EventBus.emit('USER:INPUT')]
    ↓
[ConstitutionEnforcer] → K1-K5 검사
    ↓ (통과)
[PainSignalProcessor.classify()] → PAIN | REQUEST | NOISE
    ↓
[EventBus.emit('PAIN:CLASSIFIED')]
    ↓
┌─────────────────────────────────────┐
│ PAIN → pain_queue (producer 처리)   │
│ REQUEST → request_queue (manager)   │
│ NOISE → 기록만 하고 폐기            │
└─────────────────────────────────────┘
    ↓ (해결 시)
[EventBus.emit('V:CREATED')]
    ↓
[VFactory.trackVContribution()]
    ↓
[Persistence.appendLog('v_creation')]
    ↓
[PainSignalProcessor.recordVCreation()] → 학습
```

---

## 🔒 헌법 (K1-K5)

| 코드 | 검사 내용 | 적용 대상 |
|------|----------|----------|
| K1 | 점수 기반 승격만 | PROMOTION, ROLE_CHANGE |
| K2 | 입력은 신호 (직접 실행 불가) | USER_INPUT |
| K3 | 증거 없이 행동 금지 | PAYMENT, REFUND, SUSPENSION, TERMINATION 등 |
| K4 | 24시간 대기 | TERMINATION, LARGE_REFUND, CONTRACT_CANCEL 등 |
| K5 | 영향 범위 10% 이하 | STANDARD_CHANGE, POLICY_UPDATE |

---

## 📈 메트릭

### 실시간 추적
- V 창출량 (시간/일/월)
- Pain Signal 분류 비율 (PAIN/REQUEST/NOISE)
- 헌법 통과율
- 이벤트 처리량

### 자동 저장
- 5분마다 상태 저장
- 페이지 종료 시 저장
- 오프라인 시 LocalStorage 폴백
- 온라인 복귀 시 자동 동기화

---

## 🧪 테스트 방법

### 1. #ops 대시보드 접속
```
http://localhost:3000/#ops
```

### 2. 테스트 입력
- "환불 요청합니다 급함" → PAIN 분류 예상
- "수업 시간 문의드립니다" → REQUEST 분류 예상
- "오늘 날씨 좋네요" → NOISE 분류 예상

### 3. Pain 해결
- Pain 카드에서 V 금액 입력 → 해결 버튼
- V 창출 기록 및 학습 반영 확인

### 4. 통계 확인
- Pain Signal 통계 패널
- 필터율 목표(90%) 대비 현황

---

## ⚠️ 알려진 제한사항

1. **Supabase 미연결**: 현재 LocalStorage만 사용
   - 환경변수 설정 시 자동 연동됨:
   ```
   VITE_SUPABASE_URL=your_url
   VITE_SUPABASE_ANON_KEY=your_key
   ```

2. **결제 시스템 미연동**: 실제 PG사 연결 없음

3. **ML 모델 없음**: 규칙 기반 분류만

---

## 📁 파일 구조

```
src/
├── core/                     # 핵심 엔진
│   ├── EventBus.js           # 이벤트 통신
│   ├── Persistence.js        # 영속성 (Local + Supabase)
│   ├── ConstitutionEnforcer.js # K1-K5 강제
│   ├── VFactoryEngine.js     # V 계산
│   ├── AUTUSRuntime.js       # 통합 런타임
│   └── index.js              # Export
│
├── pages/allthatbasket/
│   ├── AUTUSOperations.jsx   # 시범운영 대시보드 (메인)
│   ├── AUTUSVFactory.jsx     # V-Factory 대시보드
│   ├── AUTUSProducer.jsx     # 워크플로우 빌더
│   └── ...
│
└── AllThatBasket.jsx         # 라우터
```

---

## 🎯 시범 운영 목표

### 1주차
- [ ] Pain Signal 100건 이상 수집
- [ ] 분류 정확도 검증
- [ ] 필터율 90% 목표 확인

### 2주차
- [ ] V 창출 추적 정확도
- [ ] 헌법 위반 케이스 분석
- [ ] 학습 효과 측정

### 3주차
- [ ] 실제 업무 흐름 반영
- [ ] 병목 지점 식별
- [ ] 최적화 제안 생성

### 4주차
- [ ] 종합 리포트
- [ ] v1.1 개선 사항 도출
- [ ] 정식 운영 준비

---

---

## 🔧 v1.0.1 수정사항 (2026-02-02)

### Bug Fixes
1. **K2 헌법 검사 수정**: USER:INPUT 이벤트가 분류 전에 차단되던 버그 수정
   - USER:INPUT은 분류 과정의 시작점이므로 통과 허용
   - USER:ACTION만 분류 후 체크하도록 변경

2. **샘플 버튼 즉시 제출**: 테스트 편의를 위해 샘플 버튼 클릭 시 바로 입력 제출

3. **디버그 로깅 추가**: processInput, _routeToPain 등에 콘솔 로그 추가

### 파일 변경
- `src/core/ConstitutionEnforcer.js` - K2 체크 로직 수정
- `src/core/AUTUSRuntime.js` - 디버그 로깅 추가
- `src/pages/allthatbasket/AUTUSOperations.jsx` - 샘플 버튼 자동 제출

---

*AUTUS v1.0.1 - 2026-02-02*
