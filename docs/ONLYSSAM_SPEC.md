# 온리쌤 시스템 핵심 기능 정의서

**버전**: 2.0
**작성일**: 2026-02-14
**프로젝트**: AUTUS - 온리쌤 학원 관리 시스템

---

## 🎯 핵심 문제 정의

### 해결해야 할 4대 문제

1. **수업/스케줄 관리** 📚
   - 수업 시간표 자동 생성
   - 강사-학생 매칭
   - 시설/코트 예약 관리

2. **학부모 소통** 💬
   - 자동 알림 발송 (카카오톡)
   - 수업 결과 자동 전송
   - 공지사항 일괄 발송

3. **학생 데이터 관리** 👥
   - 학생 정보 통합 관리
   - 출석 기록
   - 수업 결과 로그

4. **결제/수익 관리** 💰
   - 미수금 자동 추적
   - 수납 내역 자동 기록
   - 매출 리포트 생성

---

## 🔧 핵심 기능 우선순위

### P0 (최우선) - 즉시 해결 필요

#### 1. 미수금 자동 추적 시스템
**문제**: 누가 미납인지, 얼마를 내야 하는지 파악 어려움

**해결책**:
- 실시간 미수금 대시보드
- 자동 미수금 알림 (카카오톡)
- 결제 완료 시 자동 업데이트

**기술**:
- Supabase `payments` 테이블 실시간 조회
- 카카오톡 API 자동 알림
- 대시보드 UI (Next.js)

---

#### 2. 학부모 자동 알림 시스템
**문제**: 일일이 개별 메시지 보내기 번거로움

**해결책**:
- 수업 시작 30분 전 자동 알림
- 수업 완료 후 결과 자동 전송
- 미수금 정기 알림

**기술**:
- 카카오톡 알림톡 API (이미 구축됨)
- 자동화 스케줄러 (cron 또는 Supabase Edge Function)

---

#### 3. 수업 결과 로그 기록
**문제**: 수업 후 학생 상태, 코멘트 기록 누락

**해결책**:
- 간편한 수업 결과 입력 폼
- 자동으로 학부모에게 전송
- 히스토리 누적 관리

**기술**:
- 새 테이블: `class_logs`
- 모바일 친화적 입력 폼
- 자동 알림톡 발송

---

### P1 (중요) - 2주 내 구현

#### 4. 수업 스케줄 자동 관리
**문제**: 강사/학생 시간 매칭, 충돌 확인 어려움

**해결책**:
- 시간표 자동 생성
- 충돌 자동 감지
- 변경 사항 자동 알림

**기술**:
- 새 테이블: `schedules`, `classes`
- 알고리즘: 시간 충돌 감지
- 캘린더 UI

---

#### 5. 데이터 자동 동기화
**문제**: Excel 수동 입력, 중복 작업

**해결책**:
- 유비 자료 → Supabase 자동 업로드
- 중복 자동 제거
- 변경 사항 자동 반영

**기술**:
- Supabase Uploader 플러그인 (이미 구축됨)
- 자동 스케줄 업로드

---

### P2 (개선) - 1개월 내 구현

#### 6. 출석 관리
- QR 체크인
- 자동 출결 기록
- 미출석 자동 알림

#### 7. 매출 리포트
- 일/주/월 매출 자동 집계
- 강사별 매출 분석
- 예측 매출

---

## 🗂️ 데이터베이스 구조 (재정의)

### 기존 테이블

#### students (학생 기본 정보)
```sql
- id (UUID, PK)
- name (TEXT)
- parent_phone (TEXT)
- birth_date (DATE)
- school (TEXT)
- shuttle_required (BOOLEAN)
- status (TEXT)
- created_at (TIMESTAMPTZ)
```

#### memberships (회원권/수업)
```sql
- id (UUID, PK)
- student_id (UUID, FK → students)
- lesson_name (TEXT)
- membership_type (TEXT)
- coach_name (TEXT)
- start_date (DATE)
- end_date (DATE)
- total_lessons (INTEGER)
- lesson_fee (INTEGER)
- status (TEXT)
```

#### payments (결제)
```sql
- id (UUID, PK)
- student_id (UUID, FK → students)
- membership_id (UUID, FK → memberships)
- total_amount (INTEGER)
- paid_amount (INTEGER)
- payment_status (TEXT)
- payment_date (DATE)
- created_at (TIMESTAMPTZ)
```

---

### 새로 추가할 테이블

#### class_logs (수업 결과 로그) 🆕
```sql
CREATE TABLE class_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  membership_id UUID REFERENCES memberships(id),
  class_date DATE NOT NULL,
  attendance_status TEXT, -- 'present', 'absent', 'late'
  skill_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  coach_comment TEXT,
  parent_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**용도**: 수업 후 학생 상태, 코멘트 기록 → 학부모 자동 전송

---

#### schedules (수업 스케줄) 🆕
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id UUID REFERENCES memberships(id),
  coach_name TEXT,
  day_of_week INTEGER, -- 0=월, 1=화, ...
  start_time TIME,
  end_time TIME,
  facility TEXT, -- 코트 번호
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**용도**: 정규 수업 시간표

---

#### classes (실제 수업 세션) 🆕
```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES schedules(id),
  class_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status TEXT, -- 'scheduled', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**용도**: 스케줄 기반 실제 수업 생성

---

#### notifications (알림 발송 기록) 🆕
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id),
  notification_type TEXT, -- 'lesson_reminder', 'payment_due', 'class_log'
  message TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT, -- 'sent', 'failed'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**용도**: 알림 이력 추적, 재발송

---

## 🔄 핵심 워크플로우

### 1. 수업 시작 전 (자동)
```
30분 전
  ↓
schedules 조회
  ↓
학생/학부모에게 카카오톡 알림
  ↓
notifications 기록
```

### 2. 수업 완료 후 (강사 입력)
```
강사가 수업 결과 입력
  ↓
class_logs 저장
  ↓
학부모에게 자동 카카오톡 발송
  ↓
출석 기록 업데이트
```

### 3. 결제일 도래 (자동)
```
매일 아침 9시
  ↓
payments 테이블 조회 (미수금)
  ↓
미수금 학부모에게 알림
  ↓
notifications 기록
```

### 4. 유비 자료 업데이트 (수동 트리거)
```
유비 Excel 파일 첨부
  ↓
Supabase Uploader 플러그인 실행
  ↓
자동 파싱 + 중복 제거
  ↓
students, memberships, payments 업데이트
```

---

## 📱 UI/UX 우선순위

### 모바일 우선 (강사용)
1. **수업 결과 입력** - 간편 폼
2. **출석 체크** - 원터치
3. **스케줄 확인** - 오늘/이번주

### 데스크톱 (관리자용)
1. **미수금 대시보드** - 실시간
2. **학생 관리** - 상세 정보
3. **매출 리포트** - 분석

---

## 🚀 구현 로드맵

### Week 1-2: P0 완성
- [x] 카카오톡 자동 알림 (완료)
- [x] Supabase 업로더 (완료)
- [ ] class_logs 테이블 생성
- [ ] 수업 결과 입력 폼
- [ ] 미수금 대시보드

### Week 3-4: P1 완성
- [ ] schedules 테이블 생성
- [ ] 수업 자동 생성 로직
- [ ] 스케줄 UI

### Week 5-8: P2 개선
- [ ] 출석 QR 체크인
- [ ] 매출 리포트
- [ ] 예측 분석

---

## 🎯 성공 지표

### 단기 (1개월)
- ✅ 미수금 알림 자동화율 100%
- ✅ 수업 결과 전송 자동화율 80%+
- ✅ 데이터 입력 시간 70% 단축

### 중기 (3개월)
- ✅ 학부모 만족도 향상
- ✅ 강사 업무 효율 50% 개선
- ✅ 매출 가시성 100%

---

## 📞 다음 단계

1. **class_logs 테이블 생성** (Supabase)
2. **수업 결과 입력 폼** 제작 (모바일)
3. **자동 알림 연동** (class_logs → 카카오톡)

---

**문서 작성**: AUTUS Team
**최종 수정**: 2026-02-14
