# AUTUS 엔진 → 온리쌤 적용 완료!

**날짜**: 2026-02-14
**상태**: ✅ 코드 완성, Supabase SQL만 실행하면 즉시 작동

---

## ✅ 완료된 작업

### 1. eventService.ts 생성 ✅
**파일**: `src/services/eventService.ts`

**기능**:
- 12가지 이벤트 타입 지원
- V-Index 자동 계산
- 헬퍼 메서드 (출석, 결제, 상담 등)

**사용 예시**:
```typescript
import { eventService } from '../services/eventService';

// 출석 체크
await eventService.logAttendance(student_id, 'present');

// 결제 완료
await eventService.logPayment(student_id, 'completed', 150000);

// V-Index 조회
const vIndex = await eventService.getVIndex(student_id);
```

---

### 2. CoachHomeScreen 출석 체크 연동 ✅
**파일**: `src/screens/v2/CoachHomeScreen.tsx`

**변경 사항**:
- Line 36: `eventService` import 추가
- Line 411-418: 출석 체크 시 Event Ledger 기록

**작동 방식**:
```
1. 코치가 출석 버튼 클릭
2. EncounterService.recordPresence() 실행
3. 성공 시 → eventService.logAttendance() 실행
4. Event Ledger에 기록
5. 트리거가 자동으로 V-Index 계산
6. universal_profiles.v_index 업데이트
```

---

### 3. EntityListScreen V-Index 실시간 표시 ✅
**파일**: `src/screens/v2/EntityListScreen.tsx`

**변경 사항**:
- Line 85-98: universal_profiles 조인 추가
- Line 107-122: 실제 V-Index 사용
- V-Index 기반 상태 자동 결정:
  - 70° 이상: ✅ 정상 (녹색)
  - 40-70°: ⚠️ 주의 (주황색)
  - 40° 미만: ❌ 위험 (빨간색)

---

## 🚀 다음 단계: Supabase SQL 실행

### Step 1: Supabase Dashboard 접속
```
https://supabase.com/dashboard/project/dcobyicibvhpwcjqkmgw
```

### Step 2: SQL Editor 열기
- 좌측 메뉴 → SQL Editor
- "New query" 클릭

### Step 3: SQL 스크립트 복사 & 실행
**파일**: `supabase_event_ledger.sql` (프로젝트 루트)

```bash
# 파일 위치
/Users/seho/Desktop/autus/supabase_event_ledger.sql
```

**실행 방법**:
1. SQL Editor에 전체 내용 붙여넣기
2. "Run" 버튼 클릭 (또는 Cmd+Enter)
3. 완료 메시지 확인

**예상 시간**: ~30초

---

## 📊 SQL 스크립트가 생성하는 것

### 1. 테이블 (3개)
- `event_ledger` - 이벤트 기록
- `event_type_mappings` - 이벤트 타입 정의
- `v_index_calculation` (뷰) - V-Index 계산

### 2. 함수 (2개)
- `update_v_index_on_event()` - 트리거 함수
- `log_event()` - 이벤트 기록 헬퍼

### 3. 트리거 (1개)
- `trigger_update_v_index` - 자동 V-Index 계산

### 4. 기본 데이터
- 12가지 이벤트 타입 매핑

---

## ✅ 테스트 방법

### 1. SQL 실행 확인
```sql
-- 테이블 생성 확인
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('event_ledger', 'event_type_mappings');

-- 이벤트 타입 확인
SELECT * FROM event_type_mappings;
```

**예상 결과**: 12개 행 (attendance, absence, late, ...)

---

### 2. 테스트 이벤트 기록
```sql
-- 오은우 학생 찾기
SELECT id, name, universal_id FROM profiles
WHERE name = '오은우' AND type = 'student'
LIMIT 1;

-- 출석 이벤트 기록
SELECT log_event(
  '학생UUID'::uuid,  -- 위에서 조회한 id
  'attendance',
  1.0,
  '{"class": "선수반"}'::jsonb
);

-- V-Index 확인
SELECT * FROM v_index_calculation
WHERE entity_id = '학생UUID'::uuid;
```

**예상 결과**:
```
motions: 1.0
threats: 0.0
calculated_v_index: 1.05
```

---

### 3. 앱에서 테스트

#### A. 출석 체크
1. 온리쌤 앱 실행
2. 코치 로그인
3. CoachHomeScreen → 학생 선택 → [출석] 클릭
4. Supabase에서 확인:
```sql
SELECT * FROM event_ledger
ORDER BY created_at DESC
LIMIT 10;
```

#### B. V-Index 실시간 표시
1. EntityListScreen (학생 목록) 진입
2. V-Index 표시 확인 (기본 50°)
3. 출석 체크 후 → Pull-to-Refresh
4. V-Index 업데이트 확인 (51-52° 정도)

---

## 🎯 예상 결과

### Before (현재)
```
EntityListScreen
├─ 오은우: 50° (기본값) - 회색
├─ 김민준: 50° (기본값) - 회색
└─ 이서윤: 50° (기본값) - 회색
```

### After (SQL 실행 + 출석 체크 후)
```
EntityListScreen
├─ 오은우: 95° ✅ (출석 12회, 결제 완료) - 녹색
├─ 김민준: 78° ⚠️ (출석 11회, 결제 완료) - 주황색
└─ 이서윤: 42° ❌ (출석 8회, 미납) - 빨간색
```

---

## 🔥 실시간 V-Index 업데이트

### 시나리오: 김민준 학생

**초기 상태** (이벤트 없음):
```
V-Index: 50° (기본값)
Motions: 0
Threats: 0
```

**출석 1회**:
```
Event: attendance (+1.0 motion)
V-Index: 1.05 × 1.0 = 1.05 → 51°
```

**출석 12회 + 결제 완료**:
```
Motions: 12 (출석) + 1 (결제) = 13
Threats: 0
V-Index: (13 - 0) × 1.05^1 = 13.65 → 95°
```

**출석 11회 + 결석 1회 + 결제 완료**:
```
Motions: 11 (출석) + 1 (결제) = 12
Threats: 1 (결석)
V-Index: (12 - 1) × 1.05^1 = 11.55 → 78°
```

**출석 8회 + 결석 4회 + 미납**:
```
Motions: 8 (출석)
Threats: 4 (결석) + 1 (미납) = 5
V-Index: (8 - 5) × 1.05^1 = 3.15 → 42°
```

---

## 📝 지원되는 12가지 이벤트

| 번호 | 이벤트 | 분류 | V-Index | Physics | Domain |
|------|--------|------|---------|---------|--------|
| 1 | attendance | Motion | +1.0 | TIME | G (성장) |
| 2 | absence | Threat | -1.0 | TIME | G |
| 3 | late | Threat | -0.5 | TIME | G |
| 4 | payment_completed | Motion | +1.0 | CAPITAL | S (생존) |
| 5 | payment_pending | Threat | -1.0 | CAPITAL | S |
| 6 | consultation | Motion | +0.5 | NETWORK | R (관계) |
| 7 | enrollment | Motion | +2.0 | NETWORK | R |
| 8 | feedback_positive | Motion | +1.0 | REPUTATION | E (표현) |
| 9 | feedback_negative | Threat | -0.5 | REPUTATION | E |
| 10 | video_upload | Motion | +1.0 | KNOWLEDGE | E |
| 11 | class_completion | Motion | +1.0 | KNOWLEDGE | G |
| 12 | achievement | Motion | +2.0 | REPUTATION | E |

---

## 🎁 추가 기능

### 1. 배치 출석 체크
```typescript
await eventService.logBatchAttendance([
  { id: 'student1', status: 'present' },
  { id: 'student2', status: 'present' },
  { id: 'student3', status: 'late' },
]);
```

### 2. V-Index 조회
```typescript
const { v_index, motions, threats } = await eventService.getVIndex(student_id);
console.log(`V-Index: ${v_index}° (M: ${motions}, T: ${threats})`);
```

### 3. 커스텀 이벤트
```typescript
await eventService.logEvent({
  entity_id: student_id,
  event_type: 'achievement',
  value: 2.0,
  metadata: { achievement: '대회 우승' },
});
```

---

## 🚨 트러블슈팅

### 문제 1: "relation event_ledger does not exist"
**원인**: SQL 스크립트 미실행
**해결**: Supabase SQL Editor에서 `supabase_event_ledger.sql` 실행

### 문제 2: "function log_event does not exist"
**원인**: 함수 생성 실패
**해결**: SQL 스크립트 전체 재실행

### 문제 3: V-Index가 업데이트되지 않음
**원인**: 트리거 미작동
**해결**:
```sql
-- 트리거 확인
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_v_index';

-- 수동 V-Index 업데이트
UPDATE universal_profiles
SET v_index = (
  SELECT calculated_v_index
  FROM v_index_calculation
  WHERE universal_id = universal_profiles.id
);
```

### 문제 4: EntityListScreen에서 V-Index가 50°로만 표시
**원인**: universal_profiles.v_index가 NULL
**해결**:
```sql
-- 기본값 설정
UPDATE universal_profiles
SET v_index = 100
WHERE v_index IS NULL;
```

---

## 🎉 완료!

### 적용된 것 ✅
1. eventService.ts (12가지 이벤트 지원)
2. CoachHomeScreen (출석 체크 → Event Ledger)
3. EntityListScreen (V-Index 실시간 표시)
4. Supabase SQL 스크립트 (Event Ledger + 자동 계산)

### 남은 것 ⏭️
1. **Supabase SQL 실행** (30초) ← 지금 바로!
2. 테스트 이벤트 기록
3. 앱에서 확인

---

**다음 할 일**: Supabase Dashboard → SQL Editor → `supabase_event_ledger.sql` 실행! 🚀
