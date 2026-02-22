# Configuration Files

이 디렉토리는 온리쌤 앱의 모든 설정을 중앙 관리합니다.

## 📁 파일 구조

```
config/
├── env.ts              # 환경변수 중앙 관리
├── api-endpoints.ts    # API URL 중앙 관리
├── constants.ts        # 상수 및 매직넘버 관리
├── index.ts            # 통합 export
└── README.md           # 이 파일
```

## 🔧 사용법

### 1. 환경변수 (env.ts)

모든 `process.env` 접근을 중앙화하여 타입 안전성과 검증을 제공합니다.

```typescript
// ❌ 이전 방식 (직접 접근)
const apiKey = process.env.EXPO_PUBLIC_KAKAO_API_KEY || '';

// ✅ 새로운 방식 (중앙 관리)
import { env } from '@/config';
const apiKey = env.messaging.kakao.apiKey;
```

**장점:**
- TypeScript 타입 안전성
- 누락된 환경변수 조기 발견
- 단일 소스로 관리

### 2. API 엔드포인트 (api-endpoints.ts)

모든 하드코딩된 URL을 제거하고 중앙에서 관리합니다.

```typescript
// ❌ 이전 방식 (하드코딩)
const url = 'https://api.tosspayments.com/v1/payments/confirm';

// ✅ 새로운 방식 (중앙 관리)
import { EXTERNAL_APIS } from '@/config';
const url = `${EXTERNAL_APIS.toss.base}${EXTERNAL_APIS.toss.endpoints.confirmPayment}`;
```

**제공 API:**
- `API_BASE_URLS`: Supabase, Web, Portone 등 기본 URL
- `EXTERNAL_APIS`: Toss, Kakao, Solapi, Google, Slack
- `WEB_URLS`: 학부모 웹페이지 URL
- Helper 함수: `getSupabaseFunctionUrl()`, `getSupabaseRestUrl()`

### 3. 상수 (constants.ts)

매직넘버를 제거하고 의미있는 이름으로 관리합니다.

```typescript
// ❌ 이전 방식 (매직넘버)
setTimeout(() => setTs(p => ({...p, show: false})), 3000);

// ✅ 새로운 방식 (의미있는 상수)
import { TIMEOUTS } from '@/config';
setTimeout(() => setTs(p => ({...p, show: false})), TIMEOUTS.TOAST_DURATION);
```

**제공 카테고리:**
- `TIMEOUTS`: API 요청, UI 피드백, 디바운스 등
- `PAGINATION`: 페이지 크기, 검색 제한 등
- `VALIDATION`: 최대/최소 길이, 파일 크기 등
- `BUSINESS_RULES`: 결제 만료, 수업 리마인더 등
- `UI`: 패딩, 마진, 아이콘 크기 등
- `QR_CODE`: QR 코드 설정
- `VIDEO`: 녹화 시간, 품질 등
- `LESSON_PACKAGES`: 수업권 패키지 정보

## 🎯 마이그레이션 가이드

### Step 1: Import 추가

```typescript
import { env, EXTERNAL_APIS, TIMEOUTS } from '@/config';
// 또는 개별 import
import { env } from '@/config/env';
import { EXTERNAL_APIS } from '@/config/api-endpoints';
import { TIMEOUTS } from '@/config/constants';
```

### Step 2: 환경변수 교체

```typescript
// Before
const apiKey = process.env.EXPO_PUBLIC_KAKAO_API_KEY || '';

// After
const apiKey = env.messaging.kakao.apiKey;
```

### Step 3: URL 교체

```typescript
// Before
const url = 'https://api.tosspayments.com/v1';

// After
const url = EXTERNAL_APIS.toss.base;
```

### Step 4: 매직넘버 교체

```typescript
// Before
setTimeout(() => hide(), 3000);

// After
setTimeout(() => hide(), TIMEOUTS.TOAST_DURATION);
```

## ✅ 이미 업데이트된 파일

다음 파일들은 이미 중앙 설정을 사용하도록 업데이트되었습니다:

- ✅ `src/services/tossPayments.ts`
- ✅ `src/services/kakaoAlimtalk.ts`
- ✅ `src/services/kakaoChatbot.ts`
- ✅ `src/services/googleCalendar.ts`
- ✅ `src/services/slack.ts`
- ✅ `src/lib/supabase.ts`
- ✅ `src/lib/payment.ts`

## 🔍 검증

앱 시작 시 환경변수를 검증하려면:

```typescript
import { validateEnv } from '@/config/env';

// App.tsx에서
if (__DEV__) {
  validateEnv();
}
```

## 📝 새로운 설정 추가

### 환경변수 추가

1. `.env` 파일에 변수 추가
2. `env.ts`의 `EnvConfig` 인터페이스에 타입 추가
3. `env` 객체에 값 추가

### API 엔드포인트 추가

1. `api-endpoints.ts`의 적절한 섹션에 추가
2. 필요시 새로운 섹션 생성

### 상수 추가

1. `constants.ts`의 적절한 카테고리에 추가
2. 필요시 새로운 카테고리 생성

## 🚨 주의사항

1. **절대 직접 `process.env` 접근 금지** - 항상 `env` 객체 사용
2. **URL 하드코딩 금지** - 항상 `api-endpoints.ts` 사용
3. **매직넘버 금지** - 항상 `constants.ts` 사용
4. **환경변수 누락 시 에러** - 프로덕션에서는 누락된 환경변수가 에러를 발생시킴

## 🔗 관련 문서

- [온리쌤 CLAUDE.md](../../CLAUDE.md)
- [Input Laws](../../docs/INPUT_LAWS.md)
- [Zero Accumulation](../../docs/ZERO_ACCUMULATION.md)

---

*Last Updated: 2026-02-12*
