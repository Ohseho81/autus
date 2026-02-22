# Supabase CSV 업로드 가이드

**목적**: 유비 Excel 데이터(868명)를 Supabase 테이블에 업로드

---

## 📊 생성된 CSV 파일

| 파일 | 설명 | 데이터 수 |
|------|------|---------|
| `students.csv` | 학생 정보 | 781명 (중복 제거) |
| `memberships.csv` | 회원권 정보 | 853개 |
| `payments.csv` | 결제 정보 | 776건 |

**파일 위치**: `/sessions/modest-bold-einstein/mnt/autus/`

---

## 🚀 업로드 절차

### 1️⃣ Supabase 대시보드 접속

```
🌐 https://supabase.com/dashboard
→ 프로젝트 선택: pphzvnaedmzcvpxjulti
```

### 2️⃣ Students 테이블 업로드

1. 좌측 메뉴 → **[Table Editor]** 클릭
2. `students` 테이블 선택
3. 우측 상단 **[...]** 메뉴 → **[Import data via spreadsheet]** 클릭
4. `students.csv` 파일 선택
5. 컬럼 매핑 확인:
   ```
   name → name
   parent_phone → parent_phone
   birth_date → birth_date
   school → school
   shuttle_required → shuttle_required
   status → status
   ```
6. **[Import Data]** 클릭
7. ✅ **781명 업로드 완료 확인**

---

### 3️⃣ Memberships 테이블 업로드

**⚠️ 주의**: `memberships.csv`의 `student_name` 컬럼은 실제 `student_id`로 변환해야 합니다.

#### 방법 A: SQL 쿼리로 업로드 (추천)

1. 좌측 메뉴 → **[SQL Editor]** 클릭
2. **[New Query]** 클릭
3. 아래 SQL 실행:

```sql
-- 임시 테이블 생성
CREATE TEMP TABLE temp_memberships (
  student_name VARCHAR(100),
  lesson_name VARCHAR(100),
  membership_type VARCHAR(50),
  coach_name VARCHAR(100),
  start_date DATE,
  end_date DATE,
  total_lessons INTEGER,
  lesson_fee INTEGER,
  status VARCHAR(20)
);

-- CSV 데이터 복사 (Supabase 대시보드 → Import로 temp_memberships에 업로드)
-- 또는 직접 INSERT...

-- student_name을 student_id로 변환하여 memberships 테이블에 삽입
INSERT INTO memberships (
  student_id,
  lesson_name,
  membership_type,
  coach_name,
  start_date,
  end_date,
  total_lessons,
  lesson_fee,
  status
)
SELECT
  s.id,
  tm.lesson_name,
  tm.membership_type,
  tm.coach_name,
  tm.start_date,
  tm.end_date,
  tm.total_lessons,
  tm.lesson_fee,
  tm.status
FROM temp_memberships tm
JOIN students s ON s.name = tm.student_name
WHERE s.id IS NOT NULL;

-- 임시 테이블 삭제
DROP TABLE temp_memberships;
```

#### 방법 B: Python 스크립트 사용 (대안)

로컬에서 `memberships.csv`를 수정하여 `student_name` → `student_id` 변환 후 업로드

---

### 4️⃣ Payments 테이블 업로드

Memberships와 동일하게 SQL 쿼리 사용:

```sql
-- 임시 테이블 생성
CREATE TEMP TABLE temp_payments (
  student_name VARCHAR(100),
  total_amount INTEGER,
  paid_amount INTEGER,
  payment_status VARCHAR(20)
);

-- CSV 업로드 후...

-- student_name을 student_id로 변환하여 payments 테이블에 삽입
INSERT INTO payments (
  student_id,
  total_amount,
  paid_amount,
  payment_status
)
SELECT
  s.id,
  tp.total_amount,
  tp.paid_amount,
  tp.payment_status
FROM temp_payments tp
JOIN students s ON s.name = tp.student_name
WHERE s.id IS NOT NULL;

-- 임시 테이블 삭제
DROP TABLE temp_payments;
```

---

## 🎯 간단한 방법 (권장)

### 1단계: Students만 먼저 업로드
```
Table Editor → students → Import CSV → students.csv 업로드
✅ 781명 등록 완료
```

### 2단계: Python 스크립트로 나머지 업로드

이미 students가 있으므로, SERVICE_ROLE_KEY를 사용하여 Python으로 memberships, payments 업로드

---

## 📋 업로드 후 검증

### 데이터 확인 쿼리

```sql
-- 학생 수 확인
SELECT COUNT(*) FROM students;
-- 예상: 781명

-- 회원권 수 확인
SELECT COUNT(*) FROM memberships;
-- 예상: 853개

-- 결제 건수 확인
SELECT COUNT(*) FROM payments;
-- 예상: 776건

-- 학생별 회원권 확인
SELECT
  s.name,
  m.lesson_name,
  m.start_date,
  m.end_date,
  p.outstanding_amount
FROM students s
LEFT JOIN memberships m ON m.student_id = s.id
LEFT JOIN payments p ON p.student_id = s.id
LIMIT 10;
```

---

## ⚠️ 주의사항

1. **Students 테이블 먼저 업로드** (다른 테이블이 student_id를 참조)
2. **중복 체크**: 같은 이름+전화번호가 이미 있으면 스킵
3. **NULL 값 처리**: 빈 값은 NULL로 자동 변환됨
4. **날짜 형식**: `YYYY-MM-DD` 형식 확인

---

## 🔧 문제 해결

### 에러: "Unique constraint violation"
→ 중복 데이터가 있음. 기존 데이터 확인 후 삭제 또는 UPDATE

### 에러: "Foreign key constraint"
→ student_id가 students 테이블에 없음. students 먼저 업로드 확인

### 에러: "Invalid date format"
→ 날짜 형식 확인 (`YYYY-MM-DD`)

---

**업로드 완료 후 알려주세요!** 🎉

---

*작성일: 2026-02-13*
