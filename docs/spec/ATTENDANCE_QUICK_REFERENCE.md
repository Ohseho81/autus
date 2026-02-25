# 온리쌤 출석 관리 - 빠른 참조 가이드

## 🎯 한눈에 보기

```
프로젝트:   온리쌤 (OnlySsaem) - 농구 아카데미 강사용 출석 관리 앱
메인앱:     /allthatbasket/  (mobile-app은 백업)
프레임워크: Expo (React Native) + TypeScript
상태:       UI 90% 완성, 데이터 연동 5% (미완성)
```

---

## 📍 출석 관리 핵심 화면 3가지

### 1. AttendanceScreen (출석 관리)
```
경로:       /allthatbasket/src/screens/attendance/AttendanceScreen.tsx
역할:       날짜별 학생 출석 상태 관리 (수동)
기능:
  - 날짜 선택
  - 학생별 상태 변경 (출석/결석/지각/사유)
  - 일일 통계 표시
  - API 호출: api.getAttendance(), api.recordAttendance()
상태:       ✅ UI 100% | 🟡 API 준비 | ❌ DB 미생성
```

### 2. QRScannerScreen (QR 스캔)
```
경로:       /allthatbasket/src/screens/attendance/QRScannerScreen.tsx
역할:       코치/키오스크용 QR 코드 스캔 → 자동 출석
기능:
  - QR 코드 실시간 스캔
  - 학생 정보 + 수납 상태 확인
  - 자동 출석 기록 + 레슨비 차감
  - 체인 반응 (알림, 성장 기록, 피드백)
Supabase 쿼리:
  - students (수납 상태)
  - lesson_slots (오늘 레슨)
  - attendance_records (출석 기록)
상태:       ✅ UI 95% | 🟡 쿼리 작성됨 | ❌ 테이블 미생성
```

### 3. SmartAttendanceScreen (스마트 출석)
```
경로:       /allthatbasket/src/screens/lesson/SmartAttendanceScreen.tsx
역할:       오늘의 레슨별 실시간 출석 관리
기능:
  - 레슨 목록 (예정/진행중/완료)
  - 출석 체크인 (Alert)
  - V-Index 표시
  - 피드백/채팅 연결
Mock 데이터: mockTodayLessons (4개 학생)
상태:       ✅ UI 100% | ❌ 모든 데이터 Mock
```

---

## 🔌 데이터 연동 체크리스트

### 필요한 Supabase 테이블

```
❌ students
   - id, name, grade, school, subjects[]
   - parent_name, parent_phone, parent_email
   - status, created_at

❌ lesson_slots
   - id, class_id, date, start_time, end_time
   - max_count, current_count
   - coach_id, location

❌ attendance_records
   - id, student_id, lesson_slot_id
   - check_in_time, status ('present'|'absent'|'late'|'excused')
   - check_in_method ('qr'|'nfc'|'manual'|'auto')
   - verified_by, created_at

❌ lesson_packages
   - id, student_id
   - type ('count'|'period'), total_count, used_count
   - payment_status ('paid'|'unpaid'|'overdue')
   - start_date, end_date

❌ student_payments
   - id, student_id, package_id
   - paid, remaining_lessons, amount
   - payment_method, due_date

❌ coaches
   - id, name, phone, email, academy_id

❌ academies
   - id, name, address, phone
   - owner_id
```

### 필요한 API 엔드포인트

```
백엔드 (vercel-api 또는 FastAPI):

❌ GET    /attendance?date=YYYY-MM-DD&student_id=...
❌ POST   /attendance  (body: { student_id, date, status, note })
❌ GET    /students/{id}
❌ POST   /students
❌ GET    /lesson-slots?date=today
❌ POST   /attendance/qr-scan  (QR → 자동 처리)
❌ POST   /lessons/{id}/deduct  (레슨 차감)
❌ GET    /v-index/{student_id}

Supabase Edge Functions:

❌ attendance-chain-reaction
   - send_parent_notification
   - update_growth_log
   - prepare_feedback_session
```

---

## 🛠️ 주요 코드 위치

### API 서비스
```typescript
// /allthatbasket/src/services/api.ts

// 출석 관련 메서드 (라인 166-182)
async getAttendance(params?: { date?: string; student_id?: string })
async recordAttendance(data: { student_id, date, status, note? })

// 💡 현황: 메서드만 정의됨, 백엔드 구현 필요
```

### Supabase 클라이언트
```typescript
// /allthatbasket/src/lib/supabase.ts

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { storage: AsyncStorage, ... } }
);

// 💡 현황: 클라이언트는 설정됨, 테이블 없음
```

### 타입 정의
```typescript
// /allthatbasket/src/types/lesson.ts (252줄)

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  checkInMethod: 'qr' | 'nfc' | 'manual' | 'auto';
  deducted: boolean;
  vIndexImpact?: number;
  createdAt: string;
}

// 💡 현황: 타입은 완벽하게 정의됨, 실제 사용 안됨
```

---

## 🚨 현재 상태별 해결 방법

### 문제 1: QRScannerScreen에서 Supabase 쿼리 실패
```typescript
// 라인 114-121: lesson_slots 테이블이 없음
const { data, error } = await supabase
  .from('lesson_slots')  // ❌ 존재하지 않음
  .select('*')
  .eq('date', today);

// 해결책:
1. Supabase에 lesson_slots 테이블 생성
2. 샘플 데이터 INSERT
3. Row Level Security (RLS) 설정
```

### 문제 2: SmartAttendanceScreen이 Mock 데이터만 사용
```typescript
// 라인 45-96: mockTodayLessons 하드코딩됨
const mockTodayLessons: TodayLesson[] = [
  { id: '1', studentName: '김민수', ... },
  // ...
];

// 해결책:
1. React Query로 API 호출
const { data: lessons } = useQuery({
  queryKey: ['today-lessons'],
  queryFn: () => api.getTodayLessons(),
});
```

### 문제 3: 출석 상태가 메모리에만 저장됨
```typescript
// AttendanceScreen: useState로 상태 관리
const [records, setRecords] = useState(data?.data?.records || []);

// 새로고침하면 사라짐 ❌

// 해결책:
1. useMutation으로 DB에 저장
2. useQuery로 최신 데이터 조회
3. React Query의 invalidateQueries 사용
```

---

## 📊 의존성 및 설정

### 설치된 주요 라이브러리
```json
{
  "expo-barcode-scanner": "~12.9.0",      // ✅ QR 스캔
  "expo-camera": "~14.1.3",               // ✅ 카메라
  "@supabase/supabase-js": "^2.39.0",    // ✅ DB
  "@tanstack/react-query": "^5.17.0",    // ✅ 데이터 페칭
  "axios": "^1.13.4",                     // ✅ HTTP
  "zustand": "^4.4.0",                    // ⚠️ 설치됨, 미사용
  "expo-notifications": "~0.27.0"         // ✅ 알림
}
```

### 환경 변수 (필요)
```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=xxx
EXPO_PUBLIC_API_URL=https://api.autus.ai/v1
```

---

## 🎯 즉시 할 수 있는 작업

### 우선순위 1 (1일) - DB 준비
```bash
# Supabase 콘솔에서 실행
1. lesson_slots 테이블 생성
2. attendance_records 테이블 생성
3. students 테이블 생성 (있으면 확인)
4. RLS 정책 설정

# SQL 참고:
# /sessions/confident-eager-ritchie/mnt/autus/AUTUS_CORE_V1.sql
```

### 우선순위 2 (2일) - API 구현
```typescript
// /allthatbasket/src/services/api.ts를 기반으로
// 실제 엔드포인트 구현

// 예: GET /attendance
async getAttendance(params?: { date: string; student_id?: string }) {
  // 현재: HTTP 요청만 정의
  // 필요: 백엔드에서 실제 구현
}
```

### 우선순위 3 (1일) - QRScanner 통합
```typescript
// QRScannerScreen.tsx 라인 114-121 테스트
// Supabase에서 실제로 데이터 조회되는지 확인

// 테스트:
1. 실제 QR 데이터 생성
2. lesson_slots 테이블 조회 성공 확인
3. attendance_records 삽입 확인
```

---

## 🔗 관련 문서

| 문서 | 경로 |
|------|------|
| 전체 분석 | `/mnt/autus/ATTENDANCE_ANALYSIS.md` |
| DB 스키마 | `/mnt/autus/AUTUS_CORE_V1.sql` (라인 24-37) |
| 현재 상태 | `/mnt/autus/REALITY_CHECK.md` |
| 프로젝트 개요 | `/mnt/autus/AUTUS_CURRENT_STATUS.md` |

---

## ✅ 체크리스트

### 데이터베이스
- [ ] Supabase 프로젝트 생성
- [ ] lesson_slots 테이블 생성
- [ ] attendance_records 테이블 생성
- [ ] students 테이블 생성/확인
- [ ] student_payments 테이블 생성
- [ ] RLS 정책 설정
- [ ] 샘플 데이터 INSERT

### 백엔드 API
- [ ] GET /attendance 구현
- [ ] POST /attendance 구현
- [ ] GET /lesson-slots?date=today 구현
- [ ] POST /attendance/qr-scan 구현
- [ ] CORS 설정
- [ ] 인증 미들웨어

### 프론트엔드
- [ ] AttendanceScreen: api.getAttendance() 실제 호출 확인
- [ ] QRScannerScreen: Supabase 쿼리 테스트
- [ ] SmartAttendanceScreen: Mock → API 변경
- [ ] 에러 핸들링 개선
- [ ] 로딩 상태 표시

### 테스트
- [ ] QR 스캔 엔드-투-엔드 테스트
- [ ] 출석 기록 저장/조회 테스트
- [ ] 레슨 차감 트랜잭션 테스트
- [ ] 오프라인 동작 테스트

---

## 📱 화면 흐름도

```
로그인 화면
    ↓
메인 대시보드
    ├── 출석 관리 화면
    │   └── 날짜 선택 → 학생 목록 → 상태 변경
    │
    ├── 스마트 출석 화면
    │   └── 오늘 레슨 → 출석 체크인 → 피드백
    │
    └── QR 스캔 화면
        └── 스캔 → 학생 정보 → 결과 표시
```

---

## 💬 핵심 메시지

> **온리쌤**은 **화면과 디자인**은 95% 완성되었지만,
> **데이터베이스와 백엔드**는 0% 준비된 상태입니다.
>
> 다음 단계: **DB 스키마 생성** → **API 구현** → **프론트엔드 통합**
