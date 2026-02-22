# 🏀 온리쌤 관리 시스템 아키텍처

## 📋 시간표 분석 결과

### 코치 명단 (17명)
| ID | 이름 | 역할 |
|----|------|------|
| 1 | 오세호 | 대표/관리자 |
| 2 | 심재혁 | 코치 |
| 3 | 김용우 | 코치 (리그/이벤트 관리) |
| 4 | 윤홍규 | 코치 |
| 5 | 최민기 | 코치 |
| 6 | 이윤우 | 코치 |
| 7 | 정은지 | 코치 |
| 8 | 최준 | 코치 |
| 9 | 김민정 | 코치 |
| 10 | 박진규 | 코치 |
| 11 | 김권민 | 코치 |
| 12 | 위정우 | 코치 |
| 13 | 임묘희 | 골프 |
| 14 | 오윤혁 | 코치 (포스터 제작) |
| 15 | 오승원 | 코치 |

### 수업 유형 분류
```
┌─────────────────────────────────────────────────────────────┐
│                        수업 유형                             │
├─────────────────────────────────────────────────────────────┤
│ 1. 정규반 (부별)                                             │
│    - 유치,초1부 / 초1,2부 / 초2,3부 / 초3,4부                │
│    - 초4,5부 / 초5,6부 / 초6,중1 / 중등부 / 여중부 / 고등부  │
├─────────────────────────────────────────────────────────────┤
│ 2. 선수반 (출생연도별)                                       │
│    - 2011 선수반 / 2012 선수반 / 2013 선수반 / 2014 선수반   │
│    - 고등선수반                                              │
├─────────────────────────────────────────────────────────────┤
│ 3. 오픈반 (자유 참가)                                        │
│    - 초2,3오픈 / 초4,5오픈 / 초5,6오픈                       │
├─────────────────────────────────────────────────────────────┤
│ 4. 팀 수업 (그룹)                                            │
│    - 소녀시대, 라이온스, TS스타즈, 대표팀                     │
│    - 레벨업, 라이징TS, 경복초 헬리오스                        │
│    - 대현걸스, 드림걸스, 한양클리퍼스 등                      │
├─────────────────────────────────────────────────────────────┤
│ 5. 개인/소그룹 레슨                                          │
│    - 4:1 / 3:1 / 2:1 / 1:1 비율                              │
│    - 학생이름P (개인레슨 표시)                                │
├─────────────────────────────────────────────────────────────┤
│ 6. 대관 수업                                                 │
│    - 세인트폴 서울 대관 / SAIS                                │
│    - 코트맥스 / 우촌팀 등                                     │
└─────────────────────────────────────────────────────────────┘
```

### 업무 유형
- **인포**: 안내 데스크 업무
- **상담실**: 학부모 상담
- **업무**: 일반 행정업무
- **코트정리**: 코트 청소 및 정리
- **식사**: 휴식 시간
- **셔틀**: 학생 픽업/하차

---

## 🎯 6대 핵심 기능 설계

### 1️⃣ 강사 학생관리 (출결 + 성과영상)

```typescript
// 기능 요약
interface CoachFeatures {
  attendance: {
    quickCheck: '원터치 출석체크',
    photoGrid: '5열 사진 그리드',
    statusToggle: '출석/결석/대기 토글',
    autoNotify: '결석시 학부모 자동 알림'
  },
  performance: {
    videoUpload: '수업 영상 업로드',
    skillAssessment: '기술 평가 기록',
    progressTracking: '성장 추적',
    parentShare: '학부모 공유'
  }
}
```

**UI 화면:**
- 오늘의 수업 대시보드 (Classting 스타일)
- 출석체크 모달 (5열 사진 그리드)
- 영상 업로드 화면 (YouTube 연동)
- 학생 성과 리포트

### 2️⃣ 관리자 스케줄 관리 (상담 + 결제연동)

```typescript
interface AdminFeatures {
  schedule: {
    weeklyView: '주간 시간표 뷰 (엑셀 스타일)',
    coachAssignment: '코치 배정',
    courtAllocation: '코트 배정 (블랙/레드/게이트)',
    conflictDetection: '충돌 감지 알고리즘'
  },
  consultation: {
    booking: '상담 예약 관리',
    history: '상담 이력 조회',
    followUp: '후속 조치 관리'
  },
  payment: {
    integration: '결제 연동',
    invoice: '청구서 발행',
    receipt: '수납 확인'
  }
}
```

**UI 화면:**
- 주간 스케줄 보드 (시간표 PDF 형태)
- 상담 예약 캘린더
- 결제 대시보드

### 3️⃣ 카카오톡 채널 알림

```typescript
interface KakaoNotification {
  triggers: {
    attendance: '출결 알림 (출석/결석/지각)',
    schedule: '스케줄 변경 알림',
    payment: '결제 안내 및 확인',
    event: '이벤트/공지 알림'
  },
  templates: {
    attendanceConfirm: '[출석완료] {학생명}님이 {수업명}에 출석했습니다.',
    absenceAlert: '[결석알림] {학생명}님이 {수업명}에 결석했습니다.',
    paymentReminder: '[결제안내] {월}월 수강료 {금액}원 납부 바랍니다.',
    scheduleChange: '[스케줄변경] {변경내용}'
  }
}
```

### 4️⃣ 학부모 요청 실시간 처리 (알고리즘 100%)

```typescript
interface ParentRequestSystem {
  requestTypes: {
    scheduleChange: '스케줄 변경 요청',
    makeupClass: '보강 신청',
    absence: '결석 신고',
    consultation: '상담 요청',
    feedback: '피드백/건의'
  },
  algorithm: {
    autoRouting: '자동 담당자 배정',
    priorityQueue: '우선순위 큐',
    slaTracking: 'SLA 추적 (24시간 내 응답)',
    escalation: '자동 에스컬레이션'
  },
  status: ['접수', '처리중', '완료', '보류']
}
```

**알고리즘 흐름:**
```
학부모 요청 → 자동 분류 → 담당자 배정 → 알림 발송 → 처리 → 완료 알림
     ↓
  [AI 분석]
  - 요청 유형 자동 감지
  - 긴급도 판단
  - 최적 담당자 매칭
```

### 5️⃣ 결제/수납 출석부 연동

```typescript
interface PaymentAttendanceSync {
  billing: {
    monthlyFee: '월 수강료',
    additionalClass: '추가 수업료',
    uniform: '유니폼/장비',
    event: '이벤트 참가비'
  },
  attendance: {
    countBasedBilling: '출석 횟수 기반 청구',
    makeupTracking: '보강 횟수 추적',
    refundCalculation: '환불 자동 계산'
  },
  sync: {
    realTimeUpdate: '실시간 출석-수납 연동',
    autoInvoice: '자동 청구서 생성',
    paymentReminder: '미납 알림'
  }
}
```

**연동 로직:**
```
출석 완료 → 회차 차감 → 잔여 회차 확인 → 부족시 결제 안내
     ↓
  [자동 계산]
  - 정규반: 월 정액
  - 오픈반: 회차제 (건당 차감)
  - 선수반: 월 정액 + 대회비
```

### 6️⃣ 오픈팀 스케줄 알고리즘 (100% 자동화)

```typescript
interface OpenTeamScheduler {
  constraints: {
    maxCapacity: '정원 제한 (15명)',
    coachRatio: '코치:학생 비율',
    courtAvailability: '코트 가용성',
    timeSlot: '시간대별 제한'
  },
  algorithm: {
    firstComeFirstServed: '선착순 기본',
    waitlistManagement: '대기자 관리',
    autoConfirmation: '자동 확정',
    cancellationHandling: '취소 시 대기자 자동 승격'
  },
  features: {
    realTimeAvailability: '실시간 잔여석 표시',
    instantBooking: '즉시 예약',
    reminderNotification: '수업 전 리마인더'
  }
}
```

**알고리즘:**
```
예약 요청 → 정원 확인 → 충돌 검사 → 결제 확인 → 예약 확정
     ↓              ↓
  [정원 초과]    [충돌 발생]
     ↓              ↓
  대기자 등록    대체 시간 제안
```

---

## 📊 데이터베이스 스키마

### 핵심 테이블

```sql
-- 1. 사용자 (코치, 관리자, 학부모)
CREATE TABLE atb_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'coach', 'parent')),
  kakao_channel_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 코치 상세정보
CREATE TABLE atb_coaches (
  id UUID PRIMARY KEY REFERENCES atb_users(id),
  employee_id TEXT,
  specialties TEXT[],
  color_code TEXT, -- 시간표 표시 색상
  is_active BOOLEAN DEFAULT true
);

-- 3. 학생
CREATE TABLE atb_students (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date DATE,
  birth_year INT, -- 선수반 분류용 (2011, 2012, 2013...)
  phone TEXT,
  photo_url TEXT,
  parent_id UUID REFERENCES atb_users(id),
  grade_level TEXT, -- 초1, 초2, 중1...
  skill_level TEXT, -- beginner, intermediate, advanced
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 클래스/수업 유형
CREATE TABLE atb_classes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  class_type TEXT CHECK (class_type IN ('regular', 'player', 'open', 'team', 'private', 'rental')),
  target_grades TEXT[], -- 대상 학년
  target_birth_years INT[], -- 선수반용 출생연도
  max_students INT,
  coach_ratio TEXT, -- '4:1', '3:1'...
  monthly_fee INT,
  per_session_fee INT, -- 오픈반 회차당 금액
  is_active BOOLEAN DEFAULT true
);

-- 5. 세션 (개별 수업)
CREATE TABLE atb_sessions (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES atb_classes(id),
  coach_id UUID REFERENCES atb_coaches(id),
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  court TEXT, -- '블랙', '레드', '게이트', 'GX룸'
  status TEXT DEFAULT 'scheduled',
  max_students INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 세션-학생 연결 (출석부)
CREATE TABLE atb_session_students (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES atb_sessions(id),
  student_id UUID REFERENCES atb_students(id),
  attendance_status TEXT DEFAULT 'pending',
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  notes TEXT,
  UNIQUE(session_id, student_id)
);

-- 7. 성과 기록 (영상 포함)
CREATE TABLE atb_performance_records (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES atb_students(id),
  coach_id UUID REFERENCES atb_coaches(id),
  session_id UUID REFERENCES atb_sessions(id),
  record_type TEXT, -- 'video', 'assessment', 'note'
  video_url TEXT,
  thumbnail_url TEXT,
  skill_category TEXT, -- 'dribbling', 'shooting', 'defense'...
  score INT,
  feedback TEXT,
  is_shared_to_parent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 상담 기록
CREATE TABLE atb_consultations (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES atb_users(id),
  student_id UUID REFERENCES atb_students(id),
  staff_id UUID REFERENCES atb_users(id),
  scheduled_at TIMESTAMPTZ,
  consultation_type TEXT, -- 'enrollment', 'progress', 'complaint', 'other'
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  outcome TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 학부모 요청
CREATE TABLE atb_parent_requests (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES atb_users(id),
  student_id UUID REFERENCES atb_students(id),
  request_type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  description TEXT,
  assigned_to UUID REFERENCES atb_users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 결제/수납
CREATE TABLE atb_payments (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES atb_students(id),
  parent_id UUID REFERENCES atb_users(id),
  payment_type TEXT, -- 'monthly', 'per_session', 'event', 'equipment'
  amount INT NOT NULL,
  billing_month TEXT, -- '2026-02'
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  status TEXT DEFAULT 'pending',
  sessions_included INT, -- 포함된 회차 수
  sessions_remaining INT, -- 잔여 회차
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. 알림 기록
CREATE TABLE atb_notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES atb_users(id),
  notification_type TEXT,
  channel TEXT, -- 'kakao', 'push', 'sms'
  title TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  metadata JSONB
);

-- 12. 오픈 수업 예약
CREATE TABLE atb_open_reservations (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES atb_sessions(id),
  student_id UUID REFERENCES atb_students(id),
  status TEXT DEFAULT 'confirmed', -- 'confirmed', 'waitlist', 'cancelled'
  waitlist_position INT,
  reserved_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);
```

---

## 🎨 UI/UX 가이드라인

### 색상 팔레트
```css
/* Primary - 온리쌤 오렌지 */
--primary: #FF9500;
--primary-dark: #FF7B00;
--primary-light: #FFF3E0;

/* Status Colors */
--success: #4CAF50;  /* 출석/완료 */
--warning: #FF9800;  /* 진행중/대기 */
--danger: #F44336;   /* 결석/미납 */
--info: #2196F3;     /* 정보 */

/* Neutral */
--bg-primary: #F5F6F8;
--bg-card: #FFFFFF;
--text-primary: #1A1A1A;
--text-secondary: #666666;
```

### 컴포넌트 스타일
- **카드**: 둥근 모서리 (16-20px), 부드러운 그림자
- **버튼**: 둥근 모서리 (12-14px), 충분한 터치 영역 (48px+)
- **아이콘**: Ionicons 사용, 일관된 크기
- **타이포그래피**: 명확한 계층 구조

---

## 📱 화면 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    온리쌤 앱                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [코치 앱]                    [관리자 앱]                    │
│  ├── 홈 (대시보드)            ├── 홈 (대시보드)              │
│  ├── 오늘 수업                ├── 스케줄 관리                │
│  ├── 출석 체크                ├── 상담 관리                  │
│  ├── 학생 관리                ├── 결제 관리                  │
│  ├── 성과 기록                ├── 학부모 요청                │
│  └── 알림                     ├── 코치 관리                  │
│                               └── 보고서                    │
│                                                             │
│  [학부모 앱]                                                 │
│  ├── 홈 (아이 현황)                                          │
│  ├── 스케줄 확인                                             │
│  ├── 출석 내역                                               │
│  ├── 성과 영상                                               │
│  ├── 결제/수납                                               │
│  └── 요청/문의                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 시스템 연동 흐름

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  코치앱   │────▶│ Supabase │◀────│ 관리자앱  │
└──────────┘     └──────────┘     └──────────┘
                      │
                      ▼
              ┌──────────────┐
              │ Kakao Channel │
              │   API        │
              └──────────────┘
                      │
                      ▼
              ┌──────────────┐
              │   학부모앱    │
              └──────────────┘
```

---

## 🚀 개발 우선순위

### Phase 1: 핵심 기능 (2주)
1. 코치 출석 체크 완성
2. 대시보드 통계
3. 기본 스케줄 뷰

### Phase 2: 확장 기능 (2주)
4. 성과 영상 업로드
5. 결제 연동
6. 카카오 알림

### Phase 3: 고급 기능 (2주)
7. 학부모 요청 시스템
8. 오픈팀 예약 알고리즘
9. 보고서/분석

---

*문서 작성: 2026-02-05*
*버전: 1.0*
