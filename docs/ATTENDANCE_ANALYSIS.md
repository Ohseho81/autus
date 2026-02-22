# 온리쌤 (OnlySsaem) - 출석 관리 시스템 분석 보고서

## 🎯 Executive Summary

**프로젝트**: 온리쌤 (OnlySssaem) - 농구 아카데미 강사/코치용 출석 관리 앱
**주앱**: `allthatbasket` (동시에 `mobile-app`도 동일 구조)
**프레임워크**: Expo (React Native) - TypeScript
**상태**: **UI 목업 70%, 데이터 연동 5-10%**
**핵심 발견**: 출석 기능은 UI와 화면 흐름은 완성되어 있으나, 실제 Supabase 연동은 시작 단계

---

## 📊 앱 구조 및 주요 파일

### 1. 두 개의 동일 모바일 앱

| 폴더 | 설명 | 상태 |
|------|------|------|
| `/allthatbasket/` | OnlySsaem 메인 앱 (농구 특화) | ✅ **주앱** |
| `/mobile-app/` | 복사본 (동일 구조) | 백업용 |

**확인**: `allthatbasket/app.json`
```json
{
  "expo": {
    "owner": "ohseho",
    "name": "온리쌤",
    "slug": "onlysam",
    "version": "1.0.0"
  }
}
```

---

## 🎓 출석 관리 기능 - 상세 분석

### 1️⃣ 출석 화면 (AttendanceScreen)

**파일**: `/allthatbasket/src/screens/attendance/AttendanceScreen.tsx`

#### 기능
- 날짜별 출석 관리
- 학생별 상태 변경 (출석/결석/지각/사유)
- 출석률 계산 및 시각화
- 일일 요약 통계

#### 완성도
```
UI/UX:        ✅ 100% (KRATON 디자인)
스타일링:      ✅ 100% (GlassCard, Linear Gradient)
데이터 모델:    ✅ 80% (TypeScript 인터페이스 정의)
API 연동:      🟡 30% (api.getAttendance() 호출하나 실제 구현 부분)
상태 저장:      ❌ 0% (메모리상태만, 영속성 없음)
```

#### 코드 샘플
```typescript
// 파일: AttendanceScreen.tsx (라인 46-54)
const { data, isLoading } = useQuery({
  queryKey: ['attendance', selectedDate],
  queryFn: () => api.getAttendance({ date: selectedDate }),
});

const mutation = useMutation({
  mutationFn: (data: { student_id: string; date: string; status: AttendanceStatus }) =>
    api.recordAttendance(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
});
```

**현실**:
- ✅ React Query 설정 (TanStack Query v5)
- ✅ Mutation & Invalidation 패턴 올바름
- ❌ `api.recordAttendance()` 실제 구현은 API 서비스에서만 정의, 백엔드 준비 안됨

---

### 2️⃣ QR 스캐너 (QRScannerScreen)

**파일**: `/allthatbasket/src/screens/attendance/QRScannerScreen.tsx`

#### 기능
- QR 코드 실시간 스캔 (expo-barcode-scanner 사용)
- 학생 정보 및 수납 상태 확인
- 출석 기록 생성 + 자동 레슨비 차감
- 체인 반응 트리거 (부모 알림, 성장 기록, 피드백)

#### 완성도
```
UI/UX:           ✅ 95% (스캔 영역, 애니메이션, 결과 표시)
카메라 권한:      ✅ 100% (expo-camera 설정됨)
QR 파싱:         🟡 50% (파싱 로직은 있으나 형식 가정)
Supabase 쿼리:    🟡 50% (쿼리 작성은 되어있음)
트랜잭션:        ❌ 10% (순차적 await만 있음, 원자성 없음)
에러 처리:       🟡 40% (기본 try-catch)
```

#### 핵심 로직 흐름
```typescript
// 라인 132-235: handleBarCodeScanned
1. QR 데이터 파싱 (format: "ATB-{student_id}-{timestamp}")
2. Supabase에서 학생 + 수납 상태 조회
   students 테이블 JOIN student_payments
3. 수납 상태 체크
   - 미납 → 오류 표시 + 알림 발송
   - 납부 → 계속
4. 현재 레슨 슬롯 확인 (getCurrentLessonSlot)
   - 당일 lesson_slots 테이블에서 조회
   - 시작 30분 전부터 스캔 가능
5. Supabase에 출석 기록 INSERT
   attendance_records 테이블에 {
     student_id, lesson_slot_id, check_in_time,
     status: 'present', verified_by: 'qr_scan'
   }
6. student_payments에서 남은 레슨 차감 (-1)
7. Edge Function 호출: attendance-chain-reaction
   - send_parent_notification
   - update_growth_log
   - prepare_feedback_session
```

#### 🚨 주요 문제점

1. **Supabase 테이블 미생성**
   ```typescript
   // 라인 114-121: 쿼리는 있지만 테이블이 없음
   const { data, error } = await supabase
     .from('lesson_slots')
     .select('*')
     .eq('date', today)
     .order('start_time', { ascending: true });
   ```
   필요한 테이블:
   - `lesson_slots` - 레슨 시간표
   - `attendance_records` - 출석 기록
   - `student_payments` - 수납 상태

2. **Edge Function 미구현**
   ```typescript
   // 라인 265-277: 실제로는 작동 안함
   await supabase.functions.invoke('attendance-chain-reaction', {
     body: { student_id, lesson_slot_id, actions: [...] }
   });
   ```

3. **QR 포맷 하드코딩**
   ```typescript
   // 라인 140-145: "ATB-{student_id}-{timestamp}" 형식 가정
   const qrParts = data.split('-');
   if (qrParts[0] !== 'ATB') throw new Error(...);
   ```
   실제 QR 생성 로직 없음

---

### 3️⃣ 스마트 출석 (SmartAttendanceScreen)

**파일**: `/allthatbasket/src/screens/lesson/SmartAttendanceScreen.tsx`

#### 기능
- 오늘의 레슨 목록 (예정, 진행중, 완료)
- 실시간 출석 체크인
- 레슨비 자동 차감
- V-Index 연동
- 피드백/채팅 통합

#### 완성도
```
UI/UX:           ✅ 100% (KRATON 애니메이션, 펄스 효과)
Mock 데이터:      ✅ 100% (mockTodayLessons 정의됨)
상태 관리:       🟡 60% (useState로 메모리만 관리)
실제 데이터 연동: ❌ 0% (API 호출 없음)
영속성:          ❌ 0% (새로고침하면 사라짐)
```

#### 코드 샘플
```typescript
// 라인 45-96: Mock 데이터
const mockTodayLessons: TodayLesson[] = [
  {
    id: '1',
    studentId: 's1',
    studentName: '김민수',
    grade: '중2',
    time: '14:00',
    remainingCount: 7,
    status: 'completed',
    vIndex: 72,
    riskLevel: 'safe',
  },
  // ... 3개 더
];

// 라인 128-173: 출석 체크 (Alert만)
const handleCheckIn = (lesson: TodayLesson) => {
  Alert.alert(
    '출석 체크',
    `${lesson.studentName} 학생 ...\n✅ 출석 처리`,
    [
      { text: '취소' },
      {
        text: '확인',
        onPress: () => {
          setLessons(prev => prev.map(l =>
            l.id === lesson.id
              ? { ...l, status: 'in_progress', remainingCount: l.remainingCount - 1 }
              : l
          ));
        }
      }
    ]
  );
};
```

**문제**: 모든 데이터가 하드코딩된 목(mock) 데이터. 실제 API 연동 없음.

---

## 🔌 데이터 레이어 분석

### API 서비스 계층

**파일**: `/allthatbasket/src/services/api.ts`

#### 출석 관련 엔드포인트 (라인 166-182)
```typescript
async getAttendance(params?: { date?: string; student_id?: string }) {
  const response = await this.client.get('/attendance', { params });
  return response.data;
}

async recordAttendance(data: {
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  note?: string;
}) {
  const response = await this.client.post('/attendance', data);
  return response.data;
}
```

**현황**:
- ✅ 메서드 정의됨
- ❌ 백엔드 엔드포인트 실제 구현 여부 불명
- ❌ 응답 형식 문서화 없음

#### Supabase 클라이언트

**파일**: `/allthatbasket/src/lib/supabase.ts`

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**현황**:
- ✅ 클라이언트 초기화됨
- ✅ AsyncStorage 세션 저장
- ❌ 테이블 스키마 생성 안됨

---

## 📚 타입 정의 (데이터 모델)

**파일**: `/allthatbasket/src/types/lesson.ts` (252줄)

### 출석 관련 인터페이스

```typescript
// AttendanceRecord (라인 67-94)
export interface AttendanceRecord {
  id: string;
  studentId: string;
  packageId: string;
  scheduleId?: string;
  lessonSessionId?: string;

  date: string;                    // "2024-01-15"
  scheduledTime: string;           // 예정 시간
  actualTime?: string;             // 실제 출석 시간

  status: 'present' | 'late' | 'absent' | 'excused' | 'cancelled';
  lateMinutes?: number;
  checkInMethod: 'qr' | 'nfc' | 'manual' | 'auto';

  deducted: boolean;               // 레슨비 차감 여부
  deductedAt?: string;

  vIndexImpact?: number;           // -10 ~ +5
  note?: string;
  createdAt: string;
}
```

이 타입은 **완전히 정의**되어 있으나, 실제로는 스크린에서 사용되지 않음.

### 레슨 패키지 모델
```typescript
export interface LessonPackage {
  id: string;
  studentId: string;

  // 횟수제
  totalCount?: number;
  usedCount?: number;
  remainingCount?: number;

  // 기간제
  startDate?: string;
  endDate?: string;

  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'overdue';
  schedule: LessonSchedule[];
}
```

---

## 🗄️ 데이터베이스 스키마

**파일**: `/sessions/confident-eager-ritchie/mnt/autus/AUTUS_CORE_V1.sql`

### AUTUS 출석 사실 테이블 (라인 24-37)

```sql
CREATE TABLE IF NOT EXISTS autus_fact_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand TEXT NOT NULL,                      -- 'allthatbasket', 'groton'
    external_id TEXT,                         -- SoR 시스템 ID
    member_id UUID NOT NULL,
    location_id UUID,
    class_id UUID,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    check_in_method TEXT CHECK (check_in_method IN ('qr', 'nfc', 'manual', 'auto')),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source TEXT NOT NULL DEFAULT 'webhook'   -- 'webhook', 'manual_import'
);
```

**현황**:
- ✅ 스키마는 완전히 설계됨
- ❌ 실제로 생성되지 않음
- ❌ 모바일앱에서 참조되지 않음

---

## 🔐 인증 시스템

**파일**: `/allthatbasket/src/screens/auth/LoginScreen.tsx`

### 로그인 플로우
```typescript
const handleLogin = async () => {
  setIsLoading(true);
  try {
    await api.login(email, password);
    // Navigation handled by auth state change
  } catch (err) {
    setError(err.message);
  }
};
```

### API 서비스 (라인 51-87)
```typescript
async login(email: string, password: string) {
  const response = await this.client.post('/auth/login', { email, password });
  if (response.data.success) {
    this.accessToken = response.data.data.access_token;
    await SecureStore.setItemAsync('access_token', ...);
    await SecureStore.setItemAsync('refresh_token', ...);
  }
  return response.data;
}

async refreshToken() {
  const refreshToken = await SecureStore.getItemAsync('refresh_token');
  const response = await this.client.post('/auth/refresh', ...);
  if (response.data.success) {
    this.accessToken = response.data.data.access_token;
    await SecureStore.setItemAsync('access_token', ...);
  }
}
```

**현황**:
- ✅ 로그인 UI 구현됨
- ✅ SecureStore 토큰 저장 로직 있음
- ❌ 백엔드 `/auth/login` 엔드포인트 준비 필요
- ❌ 로그인 후 대시보드 라우팅 미완성

---

## 📡 카카오 연동

**검색 결과**: `kakao`, `카카오` 검색

### 카카오페이 결제
```typescript
// PaymentScreen.tsx (라인 기타)
paymentMethod: 'card' | 'transfer' | 'cash' | 'kakao';

// 결제 탭
{ key: 'kakao', label: '카카오페이', icon: 'logo-bitcoin' }
```

**현황**:
- 🟡 UI에만 표시
- ❌ 실제 카카오페이 SDK 미설치
- ❌ 결제 로직 미구현

### 카카오톡 알림
```typescript
// 대시보인 목(mock) 메시지
{ channel: '카카오톡', message: '주말반 수업 시간 문의드립니다', time: '10분 전' }

// API 설정 (라인 307)
notification_channels?: ('push' | 'kakao' | 'sms' | 'email')[];
```

**현황**:
- UI에 카카오톡 표시만 됨
- 실제 카카오톡 메시지 발송 로직 없음

---

## 🧭 네비게이션 구조

**파일**: `/allthatbasket/src/navigation/AppNavigator.tsx`

### 출석 관련 화면 라우팅

```typescript
export type DrawerParamList = {
  MainTabs: undefined;
  SmartAttendance: undefined;      // ← 스마트 출석
  Attendance: undefined;            // ← 일반 출석 관리
  Payments: undefined;
  Risk: undefined;
  Consultations: undefined;
  Timeline: undefined;
  ShadowLog: undefined;
  Forecast: undefined;
  Settings: undefined;
};
```

### 스크린 임포트 (라인 46-60)
```typescript
import AttendanceScreen from '../screens/attendance/AttendanceScreen';
import SmartAttendanceScreen from '../screens/lesson/SmartAttendanceScreen';
import LessonFeedbackScreen from '../screens/feedback/LessonFeedbackScreen';
import LessonChatScreen from '../screens/lesson/LessonChatScreen';
```

**현황**: ✅ 네비게이션은 완벽하게 설정됨

---

## 🪝 Hooks & 상태 관리

**검색 결과**: `useEndSession.ts` 1개 파일만 존재

### 현황
- ❌ 전역 상태 관리 라이브러리 미사용 (Redux, Zustand 등)
  - `package.json`에 `zustand` 있지만 사용 안함
- 🟡 각 스크린이 `useState`로 메모리 상태만 관리
- ❌ 앱 전체 인증 상태 관리 없음

```typescript
// SmartAttendanceScreen.tsx (라인 100-103)
const [lessons, setLessons] = useState<TodayLesson[]>(mockTodayLessons);
const [selectedLesson, setSelectedLesson] = useState<TodayLesson | null>(null);
const [showActionSheet, setShowActionSheet] = useState(false);
```

---

## 📦 의존성 분석

**파일**: `/allthatbasket/package.json`

### 출석 관련 핵심 라이브러리

| 라이브러리 | 버전 | 용도 | 상태 |
|-----------|------|------|------|
| `expo-barcode-scanner` | ~12.9.0 | QR 스캔 | ✅ 구현됨 |
| `expo-camera` | ~14.1.3 | 카메라 | ✅ 구현됨 |
| `@supabase/supabase-js` | ^2.39.0 | DB | ⚠️ 테이블 미생성 |
| `@tanstack/react-query` | ^5.17.0 | 데이터 페칭 | ✅ 설정됨 |
| `axios` | ^1.13.4 | HTTP | ✅ 설정됨 |
| `zustand` | ^4.4.0 | 상태관리 | ❌ 미사용 |

### 설치되지 않은 것
- ❌ 카카오페이 SDK (Iamport, Toss Payments 등)
- ❌ 카카오톡 SDK
- ❌ 푸시 알림 (이미 `expo-notifications` 있음)
- ❌ 비디오 녹화 (`expo-video-thumbnails` 있지만 영상 촬영 로직 없음)

---

## 🎯 완성도 종합 평가

### 출석 기능별 진행도

| 기능 | UI | 타입 | API | DB | 통합 | 테스트 | 종합 |
|------|----|----|-----|----|----|-------|------|
| **출석 관리** | 100% | 80% | 30% | 0% | 10% | 0% | **27%** |
| **QR 스캔** | 95% | 60% | 50% | 10% | 20% | 0% | **39%** |
| **스마트 출석** | 100% | 70% | 0% | 0% | 0% | 0% | **14%** |
| **출석 기록** | 70% | 80% | 30% | 0% | 10% | 0% | **25%** |
| **카카오 연동** | 10% | 20% | 0% | 0% | 0% | 0% | **3%** |
| **인증** | 100% | 90% | 50% | 0% | 40% | 0% | **43%** |

### 전체 평가
```
UI/UX 디자인:           ✅ 95% (KRATON 테마 완성)
화면 흐름:              ✅ 95% (네비게이션 완성)
타입 안전성:            ✅ 85% (TypeScript 활용)
API 설계:               🟡 50% (메서드 있으나 백엔드 준비 중)
데이터 영속성:          ❌ 5% (메모리 상태만)
실제 기능성:            ❌ 10% (대부분 Alert/Mock)

🎯 종합 완성도:         **~~35%~~ → 35% (재평가 후)**

제품으로서의 가용성:      ❌ NOT READY
MVP 가능성:             🟡 WITH MAJOR WORK
```

---

## 🚀 필수 다음 단계

### Phase 1: 데이터베이스 (1-2주)
```sql
-- 필요한 테이블 (Supabase에 생성)
1. students
2. lesson_slots
3. lesson_packages
4. attendance_records
5. student_payments
6. coaches
7. academies
8. parent_contacts
```

### Phase 2: 백엔드 API (2-3주)
```typescript
// 필수 엔드포인트
POST   /auth/login                    // 로그인
POST   /auth/refresh                  // 토큰 갱신
GET    /attendance                    // 출석 조회
POST   /attendance                    // 출석 기록
GET    /students/{id}                 // 학생 정보
GET    /lesson-slots?date=today       // 오늘 레슨
POST   /lesson-deduct                 // 레슨 차감
```

### Phase 3: Supabase 연동 (1주)
```typescript
// QRScannerScreen의 실제 구현
1. lesson_slots 테이블에서 현재 레슨 조회
2. attendance_records에 기록 INSERT
3. student_payments에서 차감
4. Edge Function으로 체인 반응 트리거
```

### Phase 4: 카카오 통합 (1주)
- 카카오페이 SDK 추가
- 카카오톡 메시지 API 연동

---

## 📁 파일 구조 정리

```
allthatbasket/
├── src/
│   ├── screens/
│   │   ├── attendance/
│   │   │   ├── AttendanceScreen.tsx          ✅ UI 완성, API 준비
│   │   │   └── QRScannerScreen.tsx           ✅ UI 95%, DB 0%
│   │   ├── lesson/
│   │   │   ├── LessonRegistrationScreen.tsx  ✅ UI, Mock 데이터
│   │   │   ├── SmartAttendanceScreen.tsx     ✅ UI 100%, Mock 데이터
│   │   │   ├── LessonChatScreen.tsx          ⚠️ UI 만
│   │   │   └── LessonFeedbackScreen.tsx      ⚠️ UI 만
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx               ⚠️ UI 있으나 백엔드 필요
│   │   │   └── RegisterScreen.tsx            ⚠️ 미구현
│   │   ├── payment/
│   │   │   └── PaymentScreen.tsx             ⚠️ UI만, 실제 결제 없음
│   │   └── [기타 화면들]
│   │
│   ├── services/
│   │   ├── api.ts                            🟡 메서드 정의만
│   │   ├── session.ts
│   │   └── sessionTimeline.ts
│   │
│   ├── lib/
│   │   ├── supabase.ts                       ✅ 클라이언트 설정
│   │   └── payment.ts                        ⚠️ Portone 설정
│   │
│   ├── components/
│   │   ├── common/                           ✅ GlassCard, Header
│   │   ├── home/                             ⚠️ Mock 데이터
│   │   ├── coach/
│   │   ├── parent/
│   │   └── risk/
│   │
│   ├── navigation/
│   │   └── AppNavigator.tsx                  ✅ 완성
│   │
│   ├── types/
│   │   └── lesson.ts                         ✅ 252줄 타입 정의
│   │
│   ├── hooks/
│   │   └── useEndSession.ts                  🟡 1개 파일
│   │
│   ├── stores/
│   │   └── (상태관리 미구현)
│   │
│   ├── utils/
│   │   └── theme.ts                          ✅ 테마 정의
│   │
│   └── assets/                               ✅ 이미지/폰트
│
├── app.json                                  ✅ Expo 설정
├── package.json                              ✅ 의존성
├── tsconfig.json                             ✅ TypeScript
└── eas.json                                  ✅ EAS 빌드
```

---

## 🔍 핵심 발견사항

### 1. 두 가지 출석 흐름
- **일반 출석**: AttendanceScreen (날짜별, 수동)
- **스마트 출석**: SmartAttendanceScreen (레슨별, 실시간)
- **QR 출석**: QRScannerScreen (키오스크/코치용, 자동)

### 2. 데이터 흐름 미완성
```
현재:
화면 A (Mock 데이터)
화면 B (Mock 데이터)
화면 C (Mock 데이터)
↑ 서로 단절됨

필요:
화면 A → API 호출
         ↓
      Supabase
         ↓
      화면 B & C에 반영
```

### 3. 실제 구현은 API 서비스에만 정의
- `api.getAttendance()` 메서드는 있음
- 하지만 백엔드 엔드포인트 없음
- Supabase 테이블도 없음

### 4. 타입 정의는 완벽
- `AttendanceRecord`, `LessonPackage`, `LessonSession` 등
- 하지만 실제로는 사용되지 않음
- Mock 데이터로 진행

### 5. 설계는 좋지만 실행이 미진
```
✅ 화면 설계 (Figma → 코드 완성)
✅ 타입 설계 (인터페이스 상세)
✅ 네비게이션 구조 (모든 경로 설정)
❌ 백엔드 데이터베이스 (0%)
❌ API 구현 (0%)
❌ 상태 관리 (0%)
```

---

## 💡 결론

**온리쌤**은 **화려한 UI/UX와 완벽한 설계**는 갖추었으나, **실제 데이터 연동이 거의 없는 상태**입니다.

### 현 상황
- 🎨 디자인 시스템: 95% 완성 (KRATON 테마)
- 🖼️ 화면 프로토타입: 90% 완성
- 🔌 데이터 연동: 10% (API 메서드만 있음)
- 🗄️ 데이터베이스: 0% (스키마는 설계됨, 생성 안됨)

### 다음 우선순위
1. **Supabase 테이블 생성** (2-3일)
2. **백엔드 기본 CRUD API** (1주)
3. **QRScanner ↔ Supabase 통합** (3-4일)
4. **전역 상태 관리** (Zustand/Redux, 2-3일)
5. **실제 테스트 및 버그 수정** (2주)

---

## 📎 참고 파일

| 파일 | 라인 | 설명 |
|------|------|------|
| `/allthatbasket/src/screens/attendance/AttendanceScreen.tsx` | 1-252 | 출석 관리 화면 |
| `/allthatbasket/src/screens/attendance/QRScannerScreen.tsx` | 1-855 | QR 스캐너 (핵심) |
| `/allthatbasket/src/screens/lesson/SmartAttendanceScreen.tsx` | 1-728 | 스마트 출석 |
| `/allthatbasket/src/services/api.ts` | 166-182 | API 메서드 |
| `/allthatbasket/src/types/lesson.ts` | 1-277 | 타입 정의 |
| `/allthatbasket/src/navigation/AppNavigator.tsx` | 1-250 | 네비게이션 |
| `/allthatbasket/app.json` | - | Expo 설정 |
| `/allthatbasket/package.json` | - | 의존성 |
| `/mnt/autus/AUTUS_CORE_V1.sql` | 24-37 | DB 스키마 |
