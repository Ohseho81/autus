# 온리쌤 출석 관리 - 데이터 흐름 및 아키텍처

## 🏗️ 현재 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    온리쌤 Mobile App                          │
│                  (Expo React Native)                         │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
    ┌───────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │ Attendance   │  │ QRScanner   │  │SmartAttend  │
    │   Screen     │  │   Screen    │  │   Screen    │
    └───────┬──────┘  └──────┬──────┘  └──────┬──────┘
            │                 │                │
            └─────────────────┼────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  API Service      │
                    │  (axios + methods)│
                    └─────────┬─────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
      ❌ 연동안됨    ❌ 연동안됨    ❌ 연동안됨
            │                 │                 │
    ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
    │ Backend API │  │  Supabase   │  │   (미정)     │
    │ (준비중)     │  │  DB (미생성)│  │              │
    └──────────────┘  └─────────────┘  └──────────────┘
```

---

## 📊 출석 기록 작성 흐름

### 현재 상태 (작동 안함)
```
사용자 입력
    ↓
[Attendance Screen]
    setState (메모리)
    ↓
화면에만 표시
    ↓
새로고침 → 초기화 ❌
```

### 필요한 상태 (목표)
```
사용자 입력
    ↓
[Attendance Screen]
    ↓
useMutation {
    mutationFn: api.recordAttendance(data)
}
    ↓
[Backend API]
    ↓
[Supabase: attendance_records]
    INSERT { student_id, date, status, ... }
    ↓
[useQuery invalidateQueries]
    ↓
화면 자동 업데이트
    ↓
영속성 ✅
```

---

## 🔄 QR 스캔 상세 흐름 (설계도)

```
┌────────────────────────────────────────────────────────┐
│ 1. QR 스캔 시작                                          │
│    - BarCodeScanner from 'expo-barcode-scanner'       │
│    - 리얼타임 카메라 피드                                 │
└────────────────────┬───────────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────────┐
│ 2. QR 데이터 파싱                                        │
│    Format: "ATB-{student_id}-{timestamp}"             │
│    예: "ATB-s123-1707000123"                           │
└────────────────────┬───────────────────────────────────┘
                     │
┌────────────────────▼───────────────────────────────────┐
│ 3. Supabase 쿼리 1: 학생 + 수납 정보                    │
│                                                         │
│  SELECT *                                             │
│  FROM students                                        │
│  WHERE id = '${studentId}'                            │
│  JOIN student_payments ON students.id = student_id   │
└────────────────────┬───────────────────────────────────┘
                     │
        ┌────────────▼──────────────┐
        │ 수납 상태 체크            │
        └────────────┬──────────────┘
                     │
        ┌────────────▼─────────────┐
        │ paid === true?            │
        └─┬──────────────────────┬─┘
          │ NO                   │ YES
      ❌ 미납                  ✅ 납부
          │                       │
    ┌─────▼──────┐        ┌───────▼──────┐
    │ 오류 표시   │        │ 계속 진행     │
    │ 부모 알림   │        │              │
    └─────────────┘        └───────┬──────┘
                                   │
        ┌──────────────────────────▼──┐
        │ 4. Supabase 쿼리 2: 오늘 레슨│
        │                               │
        │  SELECT *                    │
        │  FROM lesson_slots           │
        │  WHERE date = TODAY()        │
        │  ORDER BY start_time         │
        └──────────────┬───────────────┘
                       │
        ┌──────────────▼────────────────┐
        │ 5. 현재 시간 확인             │
        │    현재 >= (레슨시작-30분)    │
        │    현재 <= 레슨종료           │
        └──────────────┬────────────────┘
                       │
    ┌──────────────────▼────────────────────┐
    │ 6. Supabase INSERT: 출석 기록         │
    │                                        │
    │  INSERT INTO attendance_records       │
    │  VALUES (                             │
    │    student_id: string,               │
    │    lesson_slot_id: string,           │
    │    check_in_time: NOW(),             │
    │    status: 'present',                │
    │    verified_by: 'qr_scan'            │
    │  )                                   │
    └──────────────┬──────────────────────┘
                   │
    ┌──────────────▼──────────────────────┐
    │ 7. Supabase UPDATE: 레슨 차감        │
    │                                       │
    │  UPDATE student_payments             │
    │  SET remaining_lessons = remaining - 1
    │  WHERE student_id = '...'           │
    └──────────────┬──────────────────────┘
                   │
    ┌──────────────▼──────────────────────┐
    │ 8. Supabase Edge Function 호출      │
    │    attendance-chain-reaction        │
    │                                       │
    │    Actions:                          │
    │    - send_parent_notification       │
    │    - update_growth_log              │
    │    - prepare_feedback_session       │
    └──────────────┬──────────────────────┘
                   │
    ┌──────────────▼──────────────────────┐
    │ 9. 결과 표시 (Animated)              │
    │                                       │
    │    ✅ 출석 완료!                      │
    │    학생명: 김민수                     │
    │    시간: 14:03                       │
    │    잔여: 6회                         │
    │                                       │
    │    자동 처리:                        │
    │    ✓ 출석 기록                       │
    │    ✓ 레슨 -1회                      │
    │    ✓ 부모 알림                       │
    └──────────────────────────────────────┘
```

---

## 🗂️ 데이터 모델 간 관계

```
┌──────────────────┐
│    academies     │
│                  │
│ id (PK)          │
│ name             │
│ address          │
│ owner_id         │
└────────┬─────────┘
         │
         │ 1:N
         │
┌────────▼──────────────┐
│     students          │
│                       │
│ id (PK)               │
│ academy_id (FK)       │ ◄──── 현재 상태: 타입만 정의
│ name                  │       실제 테이블 없음
│ grade, school         │
│ parent_name           │
│ parent_phone          │
└────────┬──────────────┘
         │
         │ 1:N
         │
  ┌──────┴──────────────────────────┐
  │                                  │
  │                                  │
┌─▼──────────────────┐   ┌──────────▼────────┐
│  lesson_packages    │   │ attendance_records│
│                     │   │                   │
│ id (PK)             │   │ id (PK)           │
│ student_id (FK)     │   │ student_id (FK)   │
│ type: 'count'       │   │ lesson_slot_id(FK)│
│ total_count         │   │ check_in_time     │
│ used_count          │   │ status            │
│ remaining_count     │   │ check_in_method   │
│ price, paid_amount  │   │ created_at        │
└──────┬──────────────┘   └───────────────────┘
       │
       │ 1:N
       │
┌──────▼───────────────┐
│ student_payments      │
│                       │
│ id (PK)               │
│ student_id (FK)       │
│ package_id (FK)       │
│ paid (boolean)        │
│ remaining_lessons     │
│ amount, due_date      │
└───────────────────────┘

┌──────────────────────────────┐
│      lesson_slots            │
│                              │
│ id (PK)                      │
│ academy_id (FK)              │
│ class_id (FK)                │
│ date, start_time, end_time   │
│ coach_id (FK)                │
│ max_count, current_count     │
│ created_at                   │
└──────────────────────────────┘
```

---

## 🔌 API 엔드포인트 설계

### Attendance 관련 엔드포인트

```
1️⃣ GET /attendance
   ├─ Query: date, student_id, status
   ├─ Response: {
   │    data: [
   │      { id, student_id, student_name, date, status, checkInTime, ... }
   │    ],
   │    summary: {
   │      total: 10,
   │      present: 8,
   │      absent: 1,
   │      late: 1,
   │      presentRate: 80
   │    }
   │  }
   └─ 현황: ❌ 백엔드 미구현

2️⃣ POST /attendance
   ├─ Body: {
   │    student_id: string,
   │    date: string (YYYY-MM-DD),
   │    status: 'present' | 'absent' | 'late' | 'excused',
   │    note?: string
   │  }
   ├─ Response: { success: true, id: uuid }
   └─ 현황: ❌ 백엔드 미구현

3️⃣ POST /attendance/qr-scan
   ├─ Body: {
   │    qr_data: string (ATB-{id}-{ts}),
   │    location_id: string,
   │    coach_id?: string
   │  }
   ├─ Response: {
   │    success: boolean,
   │    student: { id, name, grade, ... },
   │    lesson: { id, name, time, ... },
   │    remaining_lessons: number,
   │    message: string
   │  }
   └─ 현황: ❌ 백엔드 미구현

4️⃣ GET /lessons/today
   ├─ Query: date (optional)
   ├─ Response: [
   │    {
   │      id, class_id, date, start_time, end_time,
   │      max_count, current_count, coach_name, location
   │    }
   │  ]
   └─ 현황: ❌ 백엔드 미구현

5️⃣ POST /lessons/{id}/deduct
   ├─ Body: {
   │    student_id: string,
   │    count: number (default: 1)
   │  }
   ├─ Response: {
   │    remaining_lessons: number,
   │    amount_deducted: number
   │  }
   └─ 현황: ❌ 백엔드 미구현
```

---

## 🔐 Supabase RLS 정책 (필요)

```sql
-- attendance_records 테이블 RLS
CREATE POLICY "Coaches can insert attendance"
ON attendance_records
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = current_user_id);

CREATE POLICY "View own attendance"
ON attendance_records
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT id FROM students
    WHERE academy_id = current_user_academy_id
  )
);

-- student_payments 테이블 RLS
CREATE POLICY "Update remaining lessons"
ON student_payments
FOR UPDATE
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM students
    WHERE id = student_id
    AND academy_id = current_user_academy_id
  )
);
```

---

## ⚡ 체인 반응 (Chain Reaction) 구현

### Edge Function: `attendance-chain-reaction`

```typescript
// 필요한 로직 (현재 미구현)

export default async (req: Request) => {
  const { student_id, lesson_slot_id, actions } = await req.json();

  const chainReactions = [];

  // 1. 부모 알림 전송
  if (actions.includes('send_parent_notification')) {
    const result = await sendNotification({
      type: 'attendance_confirmed',
      student_id,
      message: `${studentName} 학생의 출석이 확인되었습니다.`,
      channel: ['push', 'kakao', 'sms']
    });
    chainReactions.push(result);
  }

  // 2. 성장 로그 업데이트
  if (actions.includes('update_growth_log')) {
    const result = await updateGrowthLog({
      student_id,
      event: 'attendance_checked',
      vIndexImpact: +2
    });
    chainReactions.push(result);
  }

  // 3. 피드백 세션 준비
  if (actions.includes('prepare_feedback_session')) {
    const result = await prepareFeedback({
      student_id,
      lesson_slot_id,
      status: 'pending'
    });
    chainReactions.push(result);
  }

  return new Response(
    JSON.stringify({ success: true, reactions: chainReactions }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};
```

---

## 📱 상태 관리 전략 (현재 vs 목표)

### 현재 상태
```typescript
// AttendanceScreen.tsx
const [records, setRecords] = useState<AttendanceRecord[]>([]);
const [selectedDate, setSelectedDate] = useState<string>(today);

// 문제:
// - 메모리에만 저장
// - 새로고침하면 소실
// - 다른 화면과 공유 불가
```

### 목표 상태 (Zustand 권장)
```typescript
// store/attendanceStore.ts
export const useAttendanceStore = create((set) => ({
  records: [],
  selectedDate: today,

  // Actions
  setRecords: (records) => set({ records }),
  setSelectedDate: (date) => set({ selectedDate: date }),

  // Async actions
  fetchRecords: async (date) => {
    const data = await api.getAttendance({ date });
    set({ records: data.records });
  },

  recordAttendance: async (studentId, status) => {
    const result = await api.recordAttendance({
      student_id: studentId,
      date: selectedDate,
      status
    });
    // Refetch
    const updated = await api.getAttendance({ date: selectedDate });
    set({ records: updated.records });
  }
}));

// 사용:
const AttendanceScreen = () => {
  const { records, fetchRecords } = useAttendanceStore();

  useEffect(() => {
    fetchRecords(selectedDate);
  }, [selectedDate]);

  return <FlatList data={records} ... />;
};
```

---

## 📊 데이터 흐름 시간 흐름도

```
t=0     QR 스캔
        ↓
t=50ms  파싱 완료
        ↓
t=100ms Supabase 쿼리 (학생+수납)
        ↓
t=150ms 현재 레슨 확인
        ↓
t=200ms INSERT attendance_records
        ↓
t=250ms UPDATE student_payments (차감)
        ↓
t=300ms Edge Function 호출
        ├── send_parent_notification
        ├── update_growth_log
        └── prepare_feedback_session
        ↓
t=500ms 결과 애니메이션 표시
        ↓
t=1000ms 리셋 가능
```

---

## 🎯 우선순위별 구현 순서

### Phase 1: Database Foundation (3일)
```
1. Supabase 테이블 생성
   - students
   - lesson_slots
   - attendance_records
   - student_payments
   - academies
   - coaches

2. 샘플 데이터 INSERT (테스트용)
3. RLS 정책 설정
```

### Phase 2: Backend API (1주)
```
1. GET /attendance 구현
2. POST /attendance 구현
3. GET /lessons/today 구현
4. POST /attendance/qr-scan 구현
5. POST /lessons/{id}/deduct 구현
```

### Phase 3: Frontend Integration (1주)
```
1. AttendanceScreen: API 연동
2. QRScannerScreen: Supabase 쿼리 테스트
3. SmartAttendanceScreen: Mock → API 변경
4. 에러 핸들링 추가
5. 로딩 상태 표시
```

### Phase 4: Chain Reactions (3-5일)
```
1. Edge Function 구현
2. 부모 알림 전송
3. V-Index 업데이트
4. 성장 로그 기록
```

---

## 📚 참고 코드 위치

| 항목 | 파일 | 라인 | 상태 |
|------|------|------|------|
| API 메서드 | `/allthatbasket/src/services/api.ts` | 166-182 | 🟡 메서드만 |
| QR 스캔 로직 | `/allthatbasket/src/screens/attendance/QRScannerScreen.tsx` | 132-235 | 🟡 쿼리 작성됨 |
| Supabase 설정 | `/allthatbasket/src/lib/supabase.ts` | - | ✅ 준비됨 |
| 타입 정의 | `/allthatbasket/src/types/lesson.ts` | 1-277 | ✅ 완성됨 |
| DB 스키마 | `/mnt/autus/AUTUS_CORE_V1.sql` | 24-37 | ✅ 설계됨 |

