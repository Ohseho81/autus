# 온리쌤 앱 - 엔드투엔드 시뮬레이션

**목적**: 실제 학원 운영 시나리오로 앱 완성도 검증
**대상**: 유비 배구 아카데미 (780명 학생)
**날짜**: 2026-02-14

---

## 📋 7단계 사용자 여정

```
1. 학원 관리자가 앱 다운
   ↓
2. 인증 (사업자, 위치, 관리자 본인)
   ↓
3. 전달 (원장, 강사 등)
   ↓
4. 온보딩
   ↓
5. 상담, 스케줄, 출석부, 수업결과
   ↓
6. 전달(카톡) - 상담, 청구, 수납확인, 스케줄연동, 출석, 보충수업, 로그
   ↓
7. 다각도 분석
```

---

## 🎬 Stage 1: 앱 다운로드

### 시나리오
> 유비 배구 아카데미 원장님이 "온리쌤" 앱을 처음 설치한다.

### 필요한 것
1. **App Store / Google Play 등록**
   - 앱 이름: "온리쌤"
   - 카테고리: 교육 > 학원 관리
   - 스크린샷 (6.5", 5.5")
   - 앱 아이콘 (1024x1024)
   - 개인정보 처리방침 URL

2. **첫 실행 화면**
   - Splash Screen (로고)
   - 권한 요청 (카메라, 알림, 위치)

### 현재 구현 상태

#### ✅ 있는 것
- `App.tsx` - 앱 진입점
- Expo SDK 50 - 크로스플랫폼 지원
- Sentry 모니터링
- OTA 업데이트

#### ❌ 없는 것
- App Store 등록 (미완료)
- Google Play 등록 (미완료)
- Onboarding/Splash Screen (없음)
- 권한 요청 플로우 (기본만 있음)

#### 📝 해야 할 것
1. EAS Build 설정 완료
2. TestFlight 베타 등록
3. Onboarding Screen 개발 (3-4개 슬라이드)
4. 첫 실행 권한 요청 화면

---

## 🔐 Stage 2: 인증 (사업자, 위치, 관리자 본인)

### 시나리오
> 원장님이 학원 정보와 본인 인증을 완료한다.

### 필요한 플로우

#### 2-1. 학원 등록
```
[학원명 입력] 유비 배구 아카데미
[사업자 번호] 123-45-67890
[주소] 서울시 강남구 테헤란로 123
[대표자명] 김원장
[연락처] 010-1234-5678
[카테고리] 스포츠 > 배구
```

#### 2-2. 관리자 인증
```
[이름] 김원장
[이메일] director@uvivolleyball.com
[전화번호] 010-1234-5678
[역할] 원장
[SMS 인증] 6자리 코드
```

#### 2-3. 위치 권한
```
[GPS 활성화] 학원 위치 자동 감지
[출퇴근 기록] 자동 (선택)
[출석 체크] QR 코드 위치 기반
```

### 현재 구현 상태

#### ✅ 있는 것
- Supabase Auth (이메일/비밀번호)
- Kakao Login 준비됨
- `PasswordResetScreen.tsx` (비밀번호 재설정)

#### ❌ 없는 것
- 학원 등록 화면 (없음)
- 사업자 번호 검증 (없음)
- SMS 인증 (없음)
- 역할 선택 (원장/강사/직원) (없음)
- 위치 권한 설정 화면 (없음)

#### 📝 해야 할 것
1. **AcademyRegistrationScreen** 개발
   - 학원 정보 입력
   - 사업자 번호 검증 (공공 API)
   - 주소 검색 (카카오 주소 API)

2. **PhoneVerificationScreen** 개발
   - SMS 인증 (Solapi or 알리고)
   - 6자리 코드 입력

3. **RoleSelectionScreen** 개발
   - 원장 / 강사 / 직원 선택
   - 권한 설정

4. **Supabase 테이블 추가**
```sql
CREATE TABLE academies (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  business_number TEXT UNIQUE,
  address TEXT,
  category TEXT,
  owner_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE academy_members (
  id UUID PRIMARY KEY,
  academy_id UUID REFERENCES academies(id),
  user_id UUID REFERENCES profiles(id),
  role TEXT CHECK (role IN ('owner', 'coach', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(academy_id, user_id)
);
```

---

## 👥 Stage 3: 전달 (원장, 강사 등)

### 시나리오
> 원장님이 강사 3명과 직원 1명을 초대한다.

### 필요한 플로우

#### 3-1. 팀원 초대
```
[초대 화면]
├─ 이메일 입력
├─ 전화번호 입력
├─ 역할 선택 (강사/직원)
└─ [초대 링크 전송] → 카카오톡 or SMS

[초대받은 사람]
├─ 링크 클릭
├─ 온리쌤 앱 다운
├─ 계정 생성
└─ 학원 자동 연결
```

#### 3-2. 권한 설정
| 역할 | 학생관리 | 출석체크 | 결제관리 | 통계조회 |
|------|----------|----------|----------|----------|
| 원장 | ✅ | ✅ | ✅ | ✅ |
| 강사 | ✅ (담당만) | ✅ | ❌ | ✅ (담당만) |
| 직원 | ✅ | ✅ | ✅ | ❌ |

### 현재 구현 상태

#### ✅ 있는 것
- `SettingsScreen.tsx` (설정 화면)
- Supabase Auth (이메일 초대 가능)

#### ❌ 없는 것
- 팀원 초대 화면 (없음)
- 초대 링크 생성 (없음)
- 역할별 권한 관리 (없음)
- 카카오톡 초대 메시지 (없음)

#### 📝 해야 할 것
1. **TeamInviteScreen** 개발
   - 이메일/전화번호 입력
   - 역할 선택
   - 초대 링크 생성

2. **Supabase Edge Function**
```typescript
// functions/send-invite/index.ts
export default async (req: Request) => {
  const { email, phone, role, academy_id } = await req.json();

  // 초대 토큰 생성
  const token = crypto.randomUUID();

  // Supabase에 저장
  await supabase.from('invites').insert({
    academy_id,
    email,
    phone,
    role,
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
  });

  // 카카오톡 or SMS 전송
  const message = `온리쌤 초대: ${DEEP_LINK}?invite=${token}`;
  await sendKakaoMessage(phone, message);

  return new Response(JSON.stringify({ success: true }));
};
```

3. **Row Level Security (RLS) 정책**
```sql
-- 강사는 자기 담당 학생만 조회
CREATE POLICY "coaches_own_students" ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT user_id FROM academy_members
      WHERE role = 'coach' AND academy_id = profiles.academy_id
    )
    AND profiles.coach_id = auth.uid()
  );
```

---

## 🎓 Stage 4: 온보딩

### 시나리오
> 강사가 앱을 처음 실행하고, 사용법을 배운다.

### 필요한 플로우

#### 4-1. 역할별 온보딩 (3-4개 슬라이드)

**원장님용**:
```
Slide 1: 환영합니다! 📊
- 학생 관리부터 결제까지 한 번에

Slide 2: 실시간 대시보드 📈
- 출석률, 매출, 미납금 한눈에

Slide 3: 카카오톡 자동 전송 💬
- 청구서, 출석 알림 자동

Slide 4: 시작하기 🚀
- 학생 등록 → 출석 체크 → 청구서 발송
```

**강사용**:
```
Slide 1: 환영합니다, 코치님! 🏀
- 출석 체크가 이렇게 쉬워졌어요

Slide 2: QR로 간편 출석 📱
- 학생이 QR 찍으면 자동 출석

Slide 3: 수업 결과 빠른 입력 📝
- 오늘의 훈련, 피드백 기록

Slide 4: 시작하기 🚀
- 수업 시작 → QR 체크 → 결과 입력
```

#### 4-2. 초기 데이터 설정
```
[기존 학생 불러오기]
├─ Excel 업로드 (이미 구현됨! ✅)
├─ 780명 자동 등록
└─ 클래스별 분류

[수업 스케줄 설정]
├─ 선수반: 월/수/금 18:00-20:00
├─ 실전반: 화/목 19:00-21:00
└─ 개인레슨: 예약제

[청구 설정]
├─ 선수반: 월 15만원
├─ 실전반: 월 12만원
└─ 개인레슨: 회당 5만원
```

### 현재 구현 상태

#### ✅ 있는 것
- Excel 업로드 기능 (`deduplicate_and_upload.py` ✅)
- 780명 학생 데이터 (`profiles` 테이블)
- `metadata.classes` 배열 (수강 클래스)

#### ❌ 없는 것
- 온보딩 슬라이드 화면 (없음)
- 역할별 튜토리얼 (없음)
- 수업 스케줄 설정 화면 (없음)
- 요금제 설정 화면 (없음)

#### 📝 해야 할 것
1. **OnboardingScreen** 개발
   - React Native Swiper
   - 역할별 슬라이드
   - Skip / Next / Get Started

2. **InitialSetupScreen** 개발
   - 수업 스케줄 입력
   - 요금제 설정
   - 청구일 설정 (매월 1일)

3. **Supabase 테이블 추가**
```sql
CREATE TABLE classes (
  id UUID PRIMARY KEY,
  academy_id UUID REFERENCES academies(id),
  name TEXT NOT NULL, -- "선수반", "실전반"
  schedule JSONB, -- [{"day": "mon", "start": "18:00", "end": "20:00"}]
  price INTEGER, -- 150000
  max_students INTEGER,
  coach_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE class_enrollments (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES profiles(id),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('active', 'paused', 'completed')),
  UNIQUE(class_id, student_id)
);
```

---

## 📝 Stage 5: 상담, 스케줄, 출석부, 수업결과

### 시나리오
> 일상적인 학원 운영: 상담 → 등록 → 스케줄 → 출석 → 수업 결과

### 5-1. 상담 관리

#### 플로우
```
[신규 상담 등록]
└─ EntityDetailScreen (mode: 'create')
   ├─ 이름: 박민수
   ├─ 전화번호: 010-9999-8888
   ├─ 학부모: 박엄마 (010-9999-7777)
   ├─ 상담 메모: "중학교 2학년, 배구 경험 1년"
   ├─ 관심 클래스: 실전반
   └─ [저장]

[상담 후 등록]
└─ EntityDetailScreen (mode: 'edit')
   ├─ 상태: 상담 → 등록
   ├─ 클래스: 실전반
   ├─ 시작일: 2026-03-01
   └─ [저장]
```

#### 현재 구현 상태
- ✅ **EntityDetailScreen.tsx** (있음)
- ✅ `mode: 'create'` / `'view'` / `'edit'` 지원
- ⚠️ 상담 메모 필드 (확인 필요)
- ❌ 상담 → 등록 상태 전환 (없음)

---

### 5-2. 스케줄 관리

#### 플로우
```
[이번 주 스케줄]
└─ ScheduleScreen
   ├─ 월: 선수반 (18:00-20:00) - 42명
   ├─ 화: 실전반 (19:00-21:00) - 35명
   ├─ 수: 선수반 (18:00-20:00) - 42명
   ├─ 목: 실전반 (19:00-21:00) - 35명
   └─ 금: 선수반 (18:00-20:00) - 42명

[수업 상세]
└─ 선수반 (월 18:00)
   ├─ 강사: 김코치
   ├─ 코트: A코트
   ├─ 등록 학생: 42명
   └─ [출석 체크 시작]
```

#### 현재 구현 상태
- ✅ **ScheduleScreen.tsx** (있음)
- ⚠️ 실제 스케줄 데이터 연동 (확인 필요)
- ❌ 수업 등록/수정 기능 (없음)
- ❌ 강사 배정 (없음)

---

### 5-3. 출석 체크

#### 플로우 A: 코치 수동 체크
```
[CoachHomeScreen]
└─ 현재 수업: 선수반 (18:00-20:00)
   ├─ 학생 42명
   └─ [출석 체크 시작]
      ├─ 김민준 [출석] [결석] [지각]
      ├─ 이서윤 [출석] [결석] [지각]
      ├─ 박지호 [출석] [결석] [지각]
      └─ ...
```

#### 플로우 B: QR 자동 체크
```
[AttendanceAutoScreen]
└─ QR 코드 표시
   ├─ 학생이 QR 스캔
   ├─ 자동 출석 처리
   ├─ Haptic 피드백
   └─ "김민준 출석 완료 ✅"
```

#### 현재 구현 상태
- ✅ **CoachHomeScreen.tsx** (수동 체크)
- ✅ **AttendanceAutoScreen.tsx** (QR 자동)
- ✅ Haptic 피드백
- ✅ EncounterService (출석 로직)
- ⚠️ Supabase 저장 (확인 필요)
- ❌ 학부모 카카오톡 알림 (없음)

---

### 5-4. 수업 결과 입력

#### 플로우
```
[수업 종료 후]
└─ VideoUploadScreen or 결과 입력
   ├─ 오늘의 훈련: "서브 연습, 리시브 훈련"
   ├─ 특이사항: "김민준 - 서브 자세 개선 필요"
   ├─ 영상 촬영: [YouTube 업로드]
   └─ [저장]

[자동 전송]
└─ 카카오톡 → 학부모
   "🏐 오늘 수업 완료!
   훈련: 서브 연습, 리시브 훈련
   피드백: 서브 자세 개선 필요
   영상: youtube.com/watch?v=xxx"
```

#### 현재 구현 상태
- ✅ **VideoUploadScreen.tsx** (있음)
- ⚠️ 수업 결과 입력 필드 (확인 필요)
- ❌ YouTube 연동 (없음)
- ❌ 카카오톡 자동 전송 (없음)

---

## 💬 Stage 6: 전달(카톡) - 청구, 수납, 스케줄, 출석, 로그

### 시나리오
> 자동화된 커뮤니케이션: 모든 정보가 학부모에게 자동 전달된다.

### 6-1. 청구서 발송 (매월 1일)

#### 플로우
```
[Supabase Cron - 매월 1일 00:00]
└─ Edge Function: monthly-billing
   ├─ 활성 학생 780명 조회
   ├─ 클래스별 금액 계산
   ├─ 결제선생 청구서 생성
   ├─ Supabase payments 저장
   └─ 카카오톡 발송 (780건)

[카카오톡 메시지]
"📋 2월 수강료 청구서

이름: 김민준
클래스: 선수반
금액: 150,000원
마감: 2/10 (금)

💳 결제하기: [링크]
❓ 문의: 010-1234-5678"
```

#### 현재 구현 상태
- ✅ 780명 학생 데이터 (`profiles`)
- ✅ 클래스 정보 (`metadata.classes`)
- ❌ 결제선생 API 연동 (없음)
- ❌ Supabase Edge Function (준비만 됨, 미배포)
- ❌ 카카오톡 알림톡 템플릿 (없음)
- ❌ 매월 1일 Cron (없음)

---

### 6-2. 수납 확인 (실시간)

#### 플로우
```
[학부모가 결제]
└─ 결제선생 웹훅 → Supabase
   ├─ payments 테이블 업데이트
   ├─ payment_status: 'completed'
   ├─ V-Index +1
   └─ 카카오톡 영수증 발송 (5초 이내)

[카카오톡 메시지]
"✅ 결제 완료

이름: 김민준
금액: 150,000원
일시: 2/3 (월) 14:23
방법: 카드 (1234)

영수증: [PDF 링크]
감사합니다 🙏"
```

#### 현재 구현 상태
- ❌ 결제선생 웹훅 (없음)
- ❌ payments 테이블 실시간 업데이트 (없음)
- ❌ 영수증 PDF 생성 (없음)
- ❌ 카카오톡 자동 발송 (없음)

---

### 6-3. 스케줄 연동 (주간)

#### 플로우
```
[매주 일요일 20:00]
└─ Edge Function: weekly-schedule
   ├─ 다음 주 스케줄 조회
   ├─ 학생별 수업 시간 필터링
   └─ 카카오톡 발송

[카카오톡 메시지]
"📅 이번 주 수업 일정

김민준님 - 선수반
월: 18:00-20:00 (A코트)
수: 18:00-20:00 (A코트)
금: 18:00-20:00 (A코트)

📍 위치: 유비 배구 아카데미
🏐 준비물: 운동화, 수건"
```

#### 현재 구현 상태
- ⚠️ `ScheduleScreen.tsx` (화면만 있음)
- ❌ 스케줄 데이터베이스 (없음)
- ❌ 주간 알림 Cron (없음)

---

### 6-4. 출석 알림 (실시간)

#### 플로우
```
[학생이 QR 스캔]
└─ AttendanceAutoScreen
   ├─ Supabase bookings 저장
   ├─ V-Index +1
   └─ 카카오톡 발송 (5초 이내)

[카카오톡 메시지]
"✅ 출석 완료

이름: 김민준
수업: 선수반
시간: 18:03 (정상 출석)
누적: 이번달 12회 / 12회

🏐 오늘도 화이팅!"
```

#### 현재 구현 상태
- ✅ AttendanceAutoScreen (QR 스캔)
- ⚠️ Supabase bookings 저장 (확인 필요)
- ❌ 학부모 카카오톡 알림 (없음)

---

### 6-5. 보충 수업 안내

#### 플로우
```
[결석 처리 후]
└─ CoachHomeScreen
   ├─ 김민준 [결석] 클릭
   ├─ 사유: "감기"
   └─ [보충 수업 안내]
      └─ 카카오톡 발송

[카카오톡 메시지]
"📢 보충 수업 안내

이름: 김민준
결석일: 2/3 (월)
사유: 감기

보충 가능일:
- 2/5 (수) 16:00-17:00
- 2/7 (금) 16:00-17:00

💬 예약하기: [링크]"
```

#### 현재 구현 상태
- ✅ CoachHomeScreen (출석 체크)
- ❌ 보충 수업 예약 시스템 (없음)
- ❌ 카카오톡 자동 안내 (없음)

---

### 6-6. 로그 전달 (YouTube, Notion)

#### 플로우
```
[영상 업로드]
└─ VideoUploadScreen
   ├─ 영상 촬영 or 선택
   ├─ YouTube 비공개 업로드
   ├─ 링크 저장
   └─ 카카오톡 발송

[Notion 동기화]
└─ Edge Function: sync-notion
   ├─ 매일 23:00 실행
   ├─ 오늘의 출석 데이터
   ├─ 수업 결과
   └─ Notion Database 업데이트

[카카오톡 메시지]
"🎥 오늘 수업 영상

클래스: 선수반
일시: 2/3 (월) 18:00

📹 영상: youtube.com/watch?v=xxx
📝 기록: notion.so/xxx

※ 영상은 7일 후 자동 삭제됩니다"
```

#### 현재 구현 상태
- ✅ VideoUploadScreen (화면)
- ❌ YouTube API 연동 (없음)
- ❌ Notion API 연동 (없음)
- ❌ 카카오톡 영상 링크 발송 (없음)

---

## 📊 Stage 7: 다각도 분석

### 시나리오
> 원장님이 대시보드에서 학원 운영 현황을 한눈에 파악한다.

### 7-1. 대시보드 KPI

#### 필요한 지표
```
[DashboardScreen]
├─ 🎯 오늘
│  ├─ 출석률: 92% (35/38명)
│  ├─ 결석: 3명 (김민준, 이서윤, 박지호)
│  └─ 수업: 2개 진행 중
│
├─ 💰 이번 달 (2월)
│  ├─ 매출: 11,250만원 (목표: 12,000만원)
│  ├─ 수납률: 94% (732/780명)
│  ├─ 미납: 48명 (7,200만원)
│  └─ 신규 등록: 12명
│
├─ 📈 지난 달 대비
│  ├─ 매출: +8% ↑
│  ├─ 출석률: -2% ↓
│  └─ 학생 수: +5명 ↑
│
└─ 🏆 Best Performers (V-Index)
   ├─ 1위: 김민준 (95°) - 선수반
   ├─ 2위: 이서윤 (92°) - 선수반
   └─ 3위: 박지호 (89°) - 실전반
```

### 7-2. 상세 분석

#### A. 학생별 분석
```
[EntityDetailScreen]
└─ 김민준 프로필
   ├─ V-Index: 95° (상위 3%)
   ├─ 출석률: 98% (이번달 12/12)
   ├─ 수납 현황: ✅ 정상
   ├─ 성장 그래프 📈
   │  └─ 1월: 87° → 2월: 95° (+8°)
   └─ 수업 노트
      ├─ 2/3: "서브 자세 개선 필요"
      ├─ 2/1: "리시브 실력 향상"
      └─ 1/29: "팀워크 우수"
```

#### B. 클래스별 분석
```
[StatusScreen]
└─ 선수반 (42명)
   ├─ 평균 출석률: 95%
   ├─ 평균 V-Index: 78°
   ├─ 수납률: 100%
   ├─ 강사: 김코치
   └─ 월 매출: 630만원
```

#### C. 강사별 분석
```
[AdminMonitorScreen]
└─ 김코치
   ├─ 담당 클래스: 선수반, 개인레슨
   ├─ 담당 학생: 42명
   ├─ 평균 만족도: 4.8/5.0
   ├─ 출석률: 95%
   └─ 월 수업: 48회
```

#### D. 재무 분석
```
[PaymentScreen]
└─ 2월 재무 현황
   ├─ 총 청구: 12,000만원 (780명)
   ├─ 수납 완료: 11,250만원 (732명)
   ├─ 미납: 750만원 (48명)
   │  ├─ D+1: 12명 (180만원)
   │  ├─ D+7: 18명 (270만원)
   │  └─ D+30: 18명 (300만원)
   └─ 예상 매출: 11,700만원 (예측)
```

### 현재 구현 상태

#### ✅ 있는 것
- **DashboardScreen.tsx** (화면)
- **StatusScreen.tsx** (상태 모니터링)
- **AdminMonitorScreen.tsx** (관리자 모니터링)
- **PaymentScreen.tsx** (결제 관리)
- **HistoryScreen.tsx** (히스토리)

#### ❌ 없는 것
- 실시간 KPI 계산 (없음)
- 그래프/차트 (없음)
- 출석률 집계 (없음)
- 매출 통계 (없음)
- V-Index 랭킹 (없음)
- 성장 추이 그래프 (없음)

#### 📝 해야 할 것
1. **Supabase SQL Views** (통계 집계)
```sql
-- 오늘의 출석률
CREATE VIEW today_attendance AS
SELECT
  COUNT(*) FILTER (WHERE attended_at IS NOT NULL) AS attended,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE attended_at IS NOT NULL)::NUMERIC / COUNT(*) * 100, 1) AS rate
FROM bookings
WHERE DATE(attended_at) = CURRENT_DATE;

-- 이번 달 매출
CREATE VIEW monthly_revenue AS
SELECT
  SUM(amount) FILTER (WHERE payment_status = 'completed') AS collected,
  SUM(amount) AS total,
  COUNT(*) FILTER (WHERE payment_status = 'completed') AS paid_count,
  COUNT(*) AS total_count
FROM payments
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

-- V-Index 랭킹
CREATE VIEW v_index_ranking AS
SELECT
  p.id,
  p.name,
  up.v_index,
  p.metadata->>'classes' AS classes,
  RANK() OVER (ORDER BY up.v_index DESC) AS rank
FROM profiles p
JOIN universal_profiles up ON p.universal_id = up.id
WHERE p.type = 'student'
ORDER BY up.v_index DESC
LIMIT 100;
```

2. **Chart 라이브러리 추가**
```bash
npm install react-native-chart-kit
npm install react-native-svg
```

3. **DashboardScreen 데이터 연결**
```typescript
// src/screens/v2/DashboardScreen.tsx
const { data: todayStats } = useQuery({
  queryKey: ['today-attendance'],
  queryFn: async () => {
    const { data } = await supabase.from('today_attendance').select('*').single();
    return data;
  },
});

const { data: monthlyRevenue } = useQuery({
  queryKey: ['monthly-revenue'],
  queryFn: async () => {
    const { data } = await supabase.from('monthly_revenue').select('*').single();
    return data;
  },
});
```

---

## 🎯 Gap Analysis (현재 vs 필요)

### 구현 완료 ✅
1. **데이터베이스**
   - ✅ 780명 학생 데이터
   - ✅ profiles 테이블
   - ✅ 클래스 정보 (metadata)

2. **핵심 화면**
   - ✅ EntityListScreen (학생 목록)
   - ✅ CoachHomeScreen (출석 체크)
   - ✅ AttendanceAutoScreen (QR 스캔)
   - ✅ DashboardScreen (화면만)

3. **최적화**
   - ✅ 검색 디바운싱
   - ✅ 오프라인 캐시
   - ✅ ErrorBoundary
   - ✅ React Query

---

### Critical Gap ⚠️ (Stage 1-2)

1. **인증 & 온보딩**
   - ❌ 학원 등록 화면
   - ❌ SMS 인증
   - ❌ 역할 선택
   - ❌ 온보딩 슬라이드

**영향**: 앱을 시작할 수 없음
**우선순위**: **P0**
**예상 작업**: 3일

---

### Major Gap ⚠️ (Stage 3-5)

2. **팀 관리**
   - ❌ 팀원 초대
   - ❌ 권한 관리
   - ❌ RLS 정책

**영향**: 강사 초대 불가
**우선순위**: **P1**
**예상 작업**: 2일

3. **스케줄 & 클래스**
   - ❌ 클래스 등록
   - ❌ 스케줄 설정
   - ❌ 강사 배정

**영향**: 출석 체크 시 수업 선택 불가
**우선순위**: **P1**
**예상 작업**: 3일

---

### High Priority Gap ⚠️ (Stage 6)

4. **결제 자동화**
   - ❌ 결제선생 API
   - ❌ 청구서 자동 생성
   - ❌ 웹훅 처리

**영향**: 수동 청구 필요
**우선순위**: **P1**
**예상 작업**: 3일

5. **카카오톡 알림**
   - ❌ 알림톡 템플릿 12개
   - ❌ 자동 발송 로직
   - ❌ Edge Functions 배포

**영향**: 수동 연락 필요
**우선순위**: **P1**
**예상 작업**: 2일

---

### Medium Priority Gap (Stage 7)

6. **통계 & 분석**
   - ❌ SQL Views
   - ❌ 차트/그래프
   - ❌ KPI 계산

**영향**: 수동 집계 필요
**우선순위**: **P2**
**예상 작업**: 3일

7. **외부 연동**
   - ❌ YouTube API
   - ❌ Notion API

**영향**: 수동 업로드 필요
**우선순위**: **P2**
**예상 작업**: 2일

---

## 📅 구현 로드맵

### Week 1 (2/17-2/23) - P0 Critical
- [ ] AcademyRegistrationScreen (1일)
- [ ] PhoneVerificationScreen (1일)
- [ ] RoleSelectionScreen (0.5일)
- [ ] OnboardingScreen (1일)
- [ ] InitialSetupScreen (1일)
- [ ] academies, academy_members 테이블 (0.5일)

**목표**: 앱 설치 → 학원 등록 → 첫 사용 가능

---

### Week 2 (2/24-3/2) - P1 Core Features
- [ ] TeamInviteScreen (1일)
- [ ] ClassManagementScreen (1.5일)
- [ ] ScheduleScreen 데이터 연결 (1일)
- [ ] RLS 정책 설정 (0.5일)
- [ ] classes, class_enrollments 테이블 (1일)

**목표**: 팀 구성 → 클래스 설정 → 스케줄 관리

---

### Week 3 (3/3-3/9) - P1 Automation
- [ ] 결제선생 API 연동 (2일)
- [ ] PaymentService.ts 완성 (1일)
- [ ] 카카오톡 알림톡 템플릿 등록 (1일)
- [ ] Edge Functions 16개 배포 (1일)
- [ ] Cron 설정 (매월 1일, 매주 일요일) (1일)

**목표**: 청구 자동화 → 알림 자동화

---

### Week 4 (3/10-3/16) - P2 Analytics
- [ ] SQL Views 생성 (1일)
- [ ] DashboardScreen 데이터 연결 (1일)
- [ ] Chart 라이브러리 통합 (1일)
- [ ] StatusScreen 통계 추가 (0.5일)
- [ ] AdminMonitorScreen 강사별 분석 (0.5일)

**목표**: 실시간 분석 → 의사결정 지원

---

### Week 5 (3/17-3/23) - P2 Integrations
- [ ] YouTube API 연동 (1일)
- [ ] Notion API 연동 (1일)
- [ ] 영상 자동 업로드 (1일)
- [ ] 일일 로그 동기화 (1일)

**목표**: 외부 서비스 연동 완료

---

### Week 6 (3/24-3/30) - Testing & Polish
- [ ] 유비 배구 아카데미 내부 테스트 (3일)
- [ ] 버그 수정 (2일)
- [ ] UI/UX 개선 (1일)
- [ ] 문서화 (1일)

**목표**: 안정화 → 정식 출시 준비

---

## ✅ 다음 단계

### 즉시 (오늘)
1. 이 시뮬레이션 문서 리뷰
2. 우선순위 확정
3. Week 1 작업 시작 결정

### 이번 주
- AcademyRegistrationScreen 개발
- Supabase 테이블 추가
- 첫 사용 플로우 완성

### 다음 주
- 팀 관리 기능
- 클래스 & 스케줄
- 출석 체크 완성

---

**결론**: 온리쌤 앱은 **60% 완성**되었습니다.

- ✅ 핵심 데이터 (780명)
- ✅ 핵심 화면 (16개)
- ⚠️ 인증 & 온보딩 (0%)
- ⚠️ 자동화 (20%)
- ⚠️ 분석 (30%)

**6주 작업으로 100% 완성 가능!** 🚀

---

**작성**: 2026-02-14
**예상 완성**: 2026-03-30 (6주 후)
**첫 배포**: 2026-04-01 (유비 배구 아카데미)
