# 🚀 온리쌤 개발 체크리스트 (최종)

> 시뮬레이션 기반 + 범위 축소 적용

---

## 🚫 핵심 원칙: Zero Accumulation

> **모든 과정과 수집이 쌓이지 않는 구조**

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ 기존: 데이터 → 쌓임 → 관리자 확인 → 처리                   │
│  ✅ 우리: 데이터 → 자동 처리 → 완료/에스컬레이션              │
│                                                                 │
│  "쌓이면 실패, 흐르면 성공"                                    │
└─────────────────────────────────────────────────────────────────┘
```

**7대 법칙:**
1. Flow, Not Stock - 모든 것은 흐른다
2. Auto-Resolve - 자동 해결 경로 필수
3. Escalate, Not Accumulate - 적체 대신 에스컬레이션
4. TTL on Everything - 모든 것에 만료 시간
5. Complete or Delete - 완료 아니면 삭제
6. Scheduled Cleanup - 정기 청소
7. Dashboard = Empty - 대시보드 = 비어있음

---

## 🎯 역할 미션

| 역할 | 미션 | 업무 |
|------|------|------|
| **코치** | 최고의 만족도를 이끌어낸다 | 수업 + 영상촬영 (그 외 없음) |
| **시스템** | 불만이 생기지 않는 관리 로직 | 나머지 전부 자동화 |

### 시스템 자동화 영역

| 영역 | 트리거 | 자동 액션 |
|------|--------|----------|
| **보충수업** | 결석 감지 | 보충 일정 자동 제안 알림톡 |
| **재등록** | 수업권 만료 D-14 | 재등록 안내 알림톡 |
| **홍보** | 만족도 4점 이상 | 후기 작성 요청 알림톡 |
| **상담** | V-Index 하락, 출석률 저하 | 상담 예약 권유 알림톡 |
| **제품판매** | 등록 6개월, 장비 교체 시기 | 용품 추천 알림톡 |

---

## ❌ 우리가 개발하지 않는 것

### 1. 외부 플랫폼 설정 (대시보드 작업)

| 항목 | 이유 | 담당 |
|------|------|------|
| 카카오 비즈니스 템플릿 등록 | 카카오 대시보드에서 설정 | 운영 |
| 토스 대시보드 웹훅 설정 | 토스 대시보드에서 설정 | 운영 |
| 솔라피 버튼 응답 설정 | 솔라피 대시보드에서 설정 | 운영 |
| 카카오 채널 생성 | 카카오 비즈니스에서 생성 | 운영 |

### 2. 이미 제공되는 것 (SDK/라이브러리)

| 항목 | 이유 | 사용할 것 |
|------|------|----------|
| 카카오 로그인 UI | Supabase Auth 제공 | `supabase.auth.signInWithOAuth()` |
| 토스 결제창 UI | 토스 SDK 제공 | `@tosspayments/widget-sdk` |
| QR 코드 생성 | 라이브러리 존재 | `qrcode` npm 패키지 |
| QR 스캐너 | expo-camera 제공 | `CameraView` 바코드 스캔 |

### 3. 하드웨어/인프라

| 항목 | 이유 | Phase |
|------|------|-------|
| NFC 태그 | 하드웨어 구매/설치 필요 | Tier 2 (Month 1) |
| BLE 비콘 | 하드웨어 구매/설치 필요 | Tier 3 (Quarter 1) |
| 키오스크 태블릿 | 하드웨어 구매 필요 | 현장 운영 |
| 체육관 WiFi 설정 | 인프라 | 현장 운영 |

### 4. 학부모 웹 → 카카오 알림톡으로 대체

| ~~기존 계획~~ | 대체 방법 |
|-------------|----------|
| ~~카카오 로그인 페이지~~ | 알림톡 버튼 클릭 → 인증 |
| ~~자녀 등록 폼~~ | 알림톡 버튼 선택 UI |
| ~~건강정보 폼~~ | `[없음]` `[유제품]` `[견과류]`... |
| ~~결제 내역 조회~~ | 결제 완료 알림톡 |
| ~~출석 현황 조회~~ | 월간 리포트 알림톡 |
| ~~상담 예약 웹~~ | `[토오전]` `[토오후]` `[다른시간]` |

**결론: 학부모 웹 = 0개 화면 개발**

### 5. 초기 불필요 AI

| 항목 | 이유 | 시기 |
|------|------|------|
| 이탈 예측 AI | 데이터 부족 (최소 6개월 필요) | Phase 3+ |
| 최적 수업 추천 | 데이터 부족 | Phase 3+ |
| 자동 상담 추천 | 규칙 기반으로 충분 | Phase 2 |
| 복잡한 V-Index | 단순 공식으로 시작 | Phase 1 |

### 6. Tier 3 연동 (Quarter 1 이후)

| 항목 | 이유 |
|------|------|
| 학교 알리미 API | 복잡한 인증, 낮은 ROI |
| 보험 API | 복잡한 계약 |
| 날씨 API | 우선순위 낮음 |
| 네이버 예약 연동 | 카카오 채널로 대체 |

---

## ✅ 실제 개발 범위

### 백엔드 (Supabase)

| 구분 | 항목 | 상태 |
|------|------|------|
| **SQL 스키마** | `EXECUTE_THIS.sql` | ✅ 완료 |
| **영상 스토리지** | `003_video_storage.sql` | ✅ 완료 |
| **Zero Accumulation** | `004_zero_accumulation.sql` | ✅ 완료 |
| **Edge Functions** | 3개 | 🟡 코드 작성됨 |
| **Triggers** | 7개 | ✅ SQL에 포함 |
| **Cleanup Functions** | 6개 | ✅ SQL에 포함 |

### Edge Functions (3개만)

| # | 함수 | 용도 | 상태 |
|---|------|------|------|
| 1 | `webhook-toss` | 결제 완료 처리 | ✅ 작성됨 |
| 2 | `webhook-kakao` | 버튼 응답 처리 | ✅ 작성됨 |
| 3 | `webhook-qr` | QR 출석 처리 | ✅ 작성됨 |

### Cron Jobs (자동화 트리거 + Zero Accumulation)

#### 🔴 고빈도 (매 5분)
| # | 함수 | 자동 액션 | 상태 |
|---|------|----------|------|
| 1 | `sync_pending_events` | 이벤트 동기화 | ✅ SQL |
| 2 | `process_notification_queue` | 알림톡 발송 | ✅ SQL |
| 3 | `retry_video_uploads` | 영상 업로드 재시도 | ✅ SQL |

#### 🟡 매시간
| # | 함수 | 자동 액션 | 상태 |
|---|------|----------|------|
| 4 | `expire_ttl_items` | TTL 만료 체크 | ✅ SQL |
| 5 | `update_payment_status` | 결제 상태 전환 | ❌ |
| 6 | `send_makeup_reminders` | 보충권 리마인드 | ✅ SQL |

#### 🟢 매일 00:00 (청소)
| # | 함수 | 자동 액션 | 상태 |
|---|------|----------|------|
| 7 | `fn_daily_cleanup` | 만료 데이터 삭제, 로그 정리 | ✅ SQL |
| 8 | `fn_expire_makeup_credits` | 보충권 소멸 | ✅ SQL |
| 9 | `aggregate_daily_stats` | 통계 집계 | ❌ |

#### 🔵 비즈니스 자동화
| # | 함수 | 트리거 | 자동 액션 | 상태 |
|---|------|--------|----------|------|
| 10 | `cron-attendance` | 매일 오전 | 전날 출석 확인 알림 | ❌ |
| 11 | `cron-payment` | 매일 오전 | D-7 결제 예정 알림 | ❌ |
| 12 | `cron-renewal` | 만료 D-14 | 재등록 안내 | ❌ |
| 13 | `cron-review` | 만족도 4+점 | 후기 요청 | ❌ |
| 14 | `cron-consultation` | V-Index 하락 | 상담 예약 권유 | ❌ |
| 15 | `cron-product` | 등록 6개월 | 용품 추천 | ❌ |

---

### 프론트엔드

#### 코치앱 (Spec v3.0+ 버튼3개+영상) - ✅ 100% 완료

| 화면 | 상태 |
|------|------|
| CoachHomeScreen | ✅ 완료 |
| 수업 시작 버튼 | ✅ 완료 |
| 수업 종료 버튼 | ✅ 완료 |
| 사고 신고 버튼 | ✅ 완료 |
| 🎬 영상촬영 버튼 | ✅ 완료 |
| CoachVideoScreen | ✅ 완료 |
| 오프라인 지원 | ✅ 완료 |
| 영상 자동 업로드 | ✅ 완료 |

#### 관리자앱 - 🟡 90% 완료

| 탭 | 화면 | 상태 |
|----|------|------|
| 대시보드 | HomeScreen | ✅ |
| 학생관리 | StudentListScreen | ✅ |
| | StudentDetailScreen | ✅ |
| | StudentCreateScreen | ✅ |
| | StudentEditScreen | ✅ |
| 스케줄 | AttendanceScreen | ✅ |
| 매출 | PaymentScreen | ✅ |
| 더보기 | SettingsScreen | ✅ |
| | ProfileSettingsScreen | ✅ |
| | AcademySettingsScreen | ✅ |
| | NotificationSettingsScreen | ✅ |
| | RiskSettingsScreen | ✅ |
| 상담 | ConsultationListScreen | ✅ |
| | ConsultationCreateScreen | ✅ |
| | ConsultationDetailScreen | ✅ |
| 리포트 | ReportsScreen | ✅ |
| | ForecastScreen | ✅ |
| 위험 | RiskScreen | ✅ |

**필요 작업: Supabase 연동만**

#### 학부모 웹 - ❌ 개발 안함

```
0개 화면 (알림톡 버튼으로 100% 대체)
```

---

### QR 시스템

| 항목 | 상태 | 설명 |
|------|------|------|
| QR 코드 생성 | ✅ | `qrcode` 라이브러리 사용 |
| QR 스캐너 화면 | ✅ | `QRScannerScreen.tsx` 존재 |
| webhook-qr | ✅ | 출석 처리 로직 |
| 중복 스캔 방지 | ✅ | SQL에 UNIQUE 제약 |

---

### 알림톡 템플릿 (운영팀 설정)

#### 기본 운영
| # | 템플릿 ID | 용도 | 버튼 |
|---|----------|------|------|
| 1 | ATB_WELCOME | 가입 환영 | - |
| 2 | ATB_ATTENDANCE_CONFIRM | 내일 출석 확인 | `[참석]` `[결석]` |
| 3 | ATB_ABSENCE_REASON | 결석 사유 | `[개인]` `[학교]` `[건강]` `[기타]` |
| 4 | ATB_ATTENDANCE_RESULT | 출석 결과 | - |
| 5 | ATB_SATISFACTION | 만족도 | `[😡]` `[😕]` `[😐]` `[🙂]` `[😄]` |

#### 학부모 정보 수집
| # | 템플릿 ID | 용도 | 버튼 |
|---|----------|------|------|
| 6 | ATB_PHOTO_REQUEST | 학생 사진 요청 | `[사진 보내기]` |
| 7 | ATB_HEALTH_INFO | 건강정보 | `[없음]` `[유제품]` `[견과류]` `[해산물]` `[기타]` |
| 8 | ATB_SHUTTLE_REQUEST | 셔틀 신청 | `[신청]` `[안함]` |

#### 결제
| # | 템플릿 ID | 용도 | 버튼 |
|---|----------|------|------|
| 9 | ATB_PAYMENT_REMIND | 결제 예정 | `[확인]` `[카드변경]` |
| 10 | ATB_PAYMENT_SUCCESS | 결제 완료 | - |
| 11 | ATB_PAYMENT_FAIL | 결제 실패 | `[재시도]` `[문의]` |
| 12 | ATB_LESSON_COUNT | 수업권 안내 | `[충전]` `[문의]` |

#### 🤖 자동화 (시스템이 트리거)
| # | 템플릿 ID | 트리거 | 버튼 |
|---|----------|--------|------|
| 13 | ATB_MAKEUP_SUGGEST | 결석 후 | `[이번주 토]` `[다음주 토]` `[안함]` |
| 14 | ATB_RENEWAL_REMIND | 만료 D-14 | `[재등록]` `[상담요청]` `[잠시쉼]` |
| 15 | ATB_REVIEW_REQUEST | 만족도 4+ | `[후기작성]` `[나중에]` |
| 16 | ATB_CONSULTATION_SUGGEST | V-Index 하락 | `[상담예약]` `[괜찮아요]` |
| 17 | ATB_PRODUCT_RECOMMEND | 등록 6개월 | `[구매하기]` `[관심없음]` |
| 18 | ATB_CLASS_CHANGE | 반 변경 안내 | `[확인]` `[문의]` |

**개발 작업 아님 - 카카오 비즈니스 대시보드에서 운영팀이 등록**

---

## 📊 최종 개발 범위 요약

### 기존 vs 축소

| 항목 | 기존 | 축소 | 절감 |
|------|------|------|------|
| 테이블 | 17개 | 17개 (동일) | - |
| Edge Functions | 6개 | 3개 | **50%** |
| Cron Jobs | 5개 | 3개 | **40%** |
| 알림톡 템플릿 | 15개 (개발) | 15개 (운영설정) | **100%** |
| 프론트 화면 | 25+개 | 11개 | **56%** |
| QR 시스템 | 5개 | 2개 | **60%** |
| AI 기능 | 5개 | 1개 | **80%** |
| 학부모 웹 | 6개 | 0개 | **100%** |

---

## 🎯 Phase 1 MVP 체크리스트

### Week 1: 인프라

- [ ] Supabase에서 `EXECUTE_THIS.sql` 실행
- [ ] 토스 대시보드에서 웹훅 URL 설정
- [ ] 솔라피 대시보드에서 웹훅 URL 설정
- [ ] Edge Functions 배포

### Week 2: 연동 테스트

- [ ] 코치앱 ↔ Supabase 연동 테스트
- [ ] 토스 테스트 결제
- [ ] QR 출석 테스트
- [ ] 기본 알림톡 발송 테스트

---

## 📈 진행률

```
┌─────────────────────────────────────────────────────┐
│           개발 진행률 (축소된 범위 기준)               │
├─────────────────────────────────────────────────────┤
│                                                     │
│  SQL 스키마         ████████████████████  100%      │
│  Edge Functions    ████████████████░░░░   80%      │
│  Cron Jobs         ░░░░░░░░░░░░░░░░░░░░    0%      │
│  코치앱            ████████████████████  100%      │
│  관리자앱          ██████████████████░░   90%      │
│  학부모 웹         ████████████████████  100% (안함)│
│  QR 시스템         ████████████████████  100%      │
│  AI (단순 V-Index) ░░░░░░░░░░░░░░░░░░░░    0%      │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  전체 진행률       ██████████████░░░░░░   70%      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔑 핵심 원칙

### 1. 외부 서비스가 하는 건 우리가 안 한다
- 토스 = 결제 UI
- 카카오 = 로그인 UI, 알림톡 UI
- Supabase = Auth, Realtime

### 2. 하드웨어는 나중에
- NFC, 비콘, 키오스크 = Phase 2+

### 3. AI는 데이터 쌓인 후
- 최소 6개월 운영 후 도입

### 4. 웹 대신 알림톡
- 학부모 웹 = 0개 화면
- 모든 입력 = 알림톡 버튼

---

## 📁 현재 파일 구조

```
온리쌤/
├── CLAUDE.md                    ✅ 프로젝트 가이드
├── docs/
│   ├── INPUT_LAWS.md            ✅ 6대 입력 법칙
│   ├── DEVELOPMENT_CHECKLIST.md ✅ 이 파일
│   ├── WEBHOOK_SETUP.md         ✅ 웹훅 설정
│   ├── COACH_APP_SPEC.md        ✅ 코치앱 스펙
│   └── ZERO_ACCUMULATION.md     ✅ Zero Accumulation 원칙
├── src/
│   ├── screens/coach/           ✅ 코치앱 (완료)
│   │   ├── CoachHomeScreen.tsx  ✅ 메인 화면
│   │   └── CoachVideoScreen.tsx ✅ 영상촬영 화면
│   ├── screens/home/            ✅ 관리자 대시보드
│   ├── screens/student/         ✅ 학생 관리
│   ├── screens/payment/         ✅ 결제 관리
│   ├── screens/attendance/      ✅ 출석 관리
│   ├── screens/settings/        ✅ 설정
│   ├── lib/
│   │   ├── supabase.ts          ✅ Supabase 클라이언트
│   │   ├── coachService.ts      ✅ 코치 서비스
│   │   └── videoService.ts      ✅ 영상 서비스
│   └── services/
│       ├── tossPayments.ts      ✅ 토스 연동
│       └── kakaoAlimtalk.ts     ✅ 알림톡 연동
└── supabase/
    ├── EXECUTE_THIS.sql         ✅ 통합 스키마
    └── migrations/
        ├── 003_video_storage.sql     ✅ 영상 스토리지
        ├── 004_zero_accumulation.sql ✅ Zero Accumulation
        └── functions/
            ├── webhook-toss/    ✅ 결제 웹훅
            ├── webhook-kakao/   ✅ 알림톡 웹훅
            └── webhook-qr/      ✅ QR 웹훅
```

---

*Updated: 2026-02-04*
*Version: 3.0 (Zero Accumulation + 영상촬영 추가)*
