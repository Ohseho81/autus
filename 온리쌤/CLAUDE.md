# 🏀 온리쌤 (OnlySsam) - AUTUS 2.0

> **피지컬 AI를 위한 초개인화 로그 플랫폼** — 로그를 모아서 클론을 만든다

---

## 🔑 핵심 식별 정보

| 항목 | 값 |
|------|-----|
| **Bundle ID** | `com.allthatbasket.atb` |
| **App Name / Slug** | `ATB` / `ssam` |
| **EAS Project ID** | `dadd6a08-5e51-4251-a125-076b24759755` |
| **ASC App ID** | `6758763718` |
| **Supabase Project** | `pphzvnaedmzcvpxjulti` |
| **Supabase URL** | `https://pphzvnaedmzcvpxjulti.supabase.co` |
| **OAuth Scheme** | `atb` (atb://auth/callback) |
| **Expo Owner** | `autus` |
| **웹 대시보드** | `autus-ai.com` (Vercel, icn1 서울) |
| **빌드 횟수** | iOS buildNumber: 1, Android versionCode: 1 (reset after rebrand) |

---

## 🧬 궁극 비전: 피지컬 AI → 클론

> **로그를 모아서 클론을 만든다.**

### 전체 체인
```
학원들 → 수업 → 로그 생산 → 학생에게 누적 → 임계점 → 클론 탄생 → 피지컬 AI
```

### 핵심 구조: 학생이 커널, 학원이 모듈
```
학원A (농구) ──→ 노션 + 유튜브 ──┐
학원B (수영) ──→ 노션 + 유튜브 ──┤──→ 학생 포트폴리오 ──→ 클론
학원C (수학) ──→ 노션 + 유튜브 ──┘
                                  ↑ 시간이 갈수록 누적
```

- 학원은 **모듈** — Truth를 생산하고 보낸다
- 학생은 **커널** — 모든 로그가 학생에게 수렴한다
- 학원을 옮기든, 졸업하든, **로그는 학생 것으로 남는다**
- 온리쌤은 학원 관리 도구가 아니라 **클론을 위한 로그 수집기**

### 클론에 필요한 5대 로그
| # | 로그 유형 | 소스 | 데이터 | 클론에서의 의미 |
|---|----------|------|--------|---------------|
| 1 | **움직임** | 유튜브 (비공개 링크) | 영상 원본 | 신체가 한 것 |
| 2 | **관찰** | 노션 | 텍스트 피드백 | 코치가 본 것 |
| 3 | **빈도** | 출결선생 | 출석/결석/지각 | 얼마나 자주 훈련하는가 |
| 4 | **지속** | 결제선생 | 수납/미납 | 얼마나 오래 지속하는가 |
| 5 | **패턴** | 상담선생 | 스케줄 배치 | 언제, 어떤 조합으로 |

> 5가지가 한 사람에게 충분히 쌓이면, 그 사람의 피지컬 클론이 가능해진다.

---

## 📐 핵심 철학

### 역할 정의
| 역할 | 미션 | 업무 |
|------|------|------|
| **코치** | 최고의 만족도를 이끌어낸다 | 수업 시작/종료 + 영상촬영 (버튼 3개) |
| **시스템** | 불만이 생기지 않는 관리 로직 | 보충, 재등록, 홍보, 상담, 제품판매 **자동화** |

### 표면 vs 실체
| 표면 (사용자가 보는 것) | 실체 (시스템이 하는 것) |
|----------------------|---------------------|
| 학원 관리 도구 | 피지컬 AI 데이터 파이프라인 |
| 출석 체크 | 존재 로그 수집 |
| 수납 관리 | 지속성 신호 수집 |
| 수업 영상 저장 | 움직임 로그 수집 |
| 코치 피드백 | 관찰 로그 수집 |
| V-Index 점수 | 클론의 첫 번째 파라미터 |

### Zero Accumulation (쌓이면 실패, 흐르면 성공)
- Flow, Not Stock — 모든 것은 흐른다
- Auto-Resolve — 자동 해결 경로 필수
- TTL on Everything — 모든 것에 만료 시간
- Escalate, Not Accumulate — 적체 대신 에스컬레이션

### 6대 입력 법칙
1. 연동 우선 (직접 입력 전 연동)
2. 원천 수집 (생성 원천에서 수집)
3. 1회 입력 (같은 정보 두 번 X)
4. 이벤트 기반 (적절한 타이밍)
5. 추론 우선 (알 수 있으면 추론)
6. 버튼 우선 (텍스트는 최후 수단)

---

## 🛠️ 기술 스택

| Layer | Tech | Status |
|-------|------|--------|
| **Mobile** | React Native + Expo SDK 50 | ✅ 운영중 |
| **State** | Zustand + React Query | ✅ |
| **Auth** | Kakao OAuth (Supabase Auth) | ✅ |
| **DB** | PostgreSQL (Supabase) | ✅ 34 migrations |
| **Functions** | Supabase Edge Functions | ✅ 16개 |
| **Storage** | Supabase Storage | ✅ |
| **Payment** | 토스페이먼츠 | ✅ |
| **Notification** | 카카오 알림톡 (솔라피) | ✅ |
| **CI/CD** | GitHub Actions → EAS Build/Submit | ✅ |
| **Web** | Vercel (kraton-v2 Vite + vercel-api Next.js) | ✅ |
| **Error** | Sentry (@sentry/react-native) | ✅ |

---

## ✅ 개발 완료 현황 (2026-02-14 기준)

### 모바일앱 — 17개 화면

**인증 & 온보딩 (7)**
- ✅ LoginScreen (카카오 OAuth)
- ✅ PasswordResetScreen
- ✅ Onboarding 6단계 (Splash → Welcome → Profile → Students → Academy → Complete)

**관리자 화면 (7)**
- ✅ AdminMonitorScreen — 실시간 모니터링
- ✅ DashboardScreen — V-Index, 매출 차트
- ✅ EntityListScreen — 학생 목록
- ✅ EntityDetailScreen — 학생 상세
- ✅ ScheduleScreen — 수업 일정
- ✅ SettingsScreen — 설정
- ✅ GratitudeScreen — 감사/기부 기록

**코치 화면 (3)**
- ✅ CoachHomeScreen — 버튼 3개 인터페이스
- ✅ AttendanceAutoScreen — QR 출석 체크
- ✅ VideoUploadScreen — 영상 촬영/업로드
- ✅ OnlySsamScreen (v5) — WebView 코치 대시보드

**학부모 화면 (5)**
- ✅ ParentSelfServiceScreen — 셀프 서비스 홈
- ✅ ReservationScreen — 수업 예약
- ✅ StatusScreen — 진도 확인
- ✅ HistoryScreen — 이력 조회
- ✅ PaymentScreen — 결제 (⚠️ 데이터 연동 TODO)

### 서비스 레이어 — 20+ 파일
- ✅ supabaseApi, kakaoAuth, kakaoAlimtalk, kakaoChatbot
- ✅ tossPayments, PaymentService (+Processor/Validator/Dunning)
- ✅ AttendanceService, OpenReservationService
- ✅ lessonFeedback, googleCalendar, slack
- ✅ PersonalAIService (⚠️ 스켈레톤)
- ✅ smartfitApi (⚠️ UI 미연동)

### 데이터베이스 — 34개 migration + EXECUTE_THIS.sql 통합 스키마
- 핵심 스키마 (QR출석, 코치근무, 조직역할, RBAC)
- 도메인 테이블 (결제, 알림톡, 일정, 피드백, 학생, 비디오)
- 자동화 (Zero Accumulation, V-Index 함수, automation_tables)
- Encounter Kernel (encounters, presence, ioo_trace, action_queue)
- Phase 2 (risk_flags, payment_invoices, consultation_sessions)
- Storage RLS (videos, photos, documents 버킷)
- RLS 정책 + 복합 인덱스

### Supabase Edge Functions — 16개
- Webhooks: webhook-qr, webhook-toss, webhook-kakao, webhook-payssam, payment-webhook
- Cron: attendance-reminder, daily-stats, payment-reminder, cron-record-sync
- Chain: attendance-chain-reaction, coach-clock-out-chain
- Analysis: vindex-analyzer, emergency-alert, session-complete-report
- AI: chat-ai (승원봇)

### 인프라
- ✅ GitHub Actions CI/CD (lint → test → EAS build → submit)
- ✅ EAS Build 3 profiles (dev/preview/production)
- ✅ Vercel 배포 (autus-ai.com)
- ✅ Jest 테스트 262개 (10개 테스트 파일)
- ✅ Sentry 에러 모니터링 (init + ErrorBoundary + user context + breadcrumbs + captureError)
- ✅ Pre-commit secret detection hook

---

## ⚠️ 미완료 / 개선 필요

| 항목 | 상태 | 우선순위 |
|------|------|----------|
| ~~테스트 커버리지~~ | ✅ 262개 테스트 (10 파일) | ~~P0~~ Done |
| ~~Sentry 패키지 설치~~ | ✅ @sentry/react-native — init + ErrorBoundary + user context + breadcrumbs + 데이터 레이어 연동 | ~~P1~~ Done |
| ~~Storage RLS 정책~~ | ✅ EXECUTE_THIS.sql에 통합 | ~~P1~~ Done |
| ~~Dead code 정리~~ | ✅ PremiumComponents (762줄) + StaffHomeScreen (1445줄) 삭제 | ~~P1~~ Done |
| ~~네비게이션 타입 안전~~ | ✅ 4개 화면 NativeStackNavigationProp 적용 | ~~P2~~ Done |
| ~~결제 스킴 오류~~ | ✅ atbhub:// → atb:// (app.json 스킴 일치) | ~~P1~~ Done |
| ~~Edge Function 응답 표준화~~ | ✅ 16개 전체 { ok, data, error, code } 통일 | ~~P1~~ Done |
| ~~any 타입 정리~~ | ✅ 프로덕션 코드 0 any — 서비스/화면/Edge Function/결제 전체 + vercel-api as any 13→0, catch 49→unknown | ~~P2~~ Done |
| ~~하드코딩 URL/시크릿 제거~~ | ✅ Edge Function + vercel-api 환경변수 전환 + n8n 시크릿/URL 정리 | ~~P0~~ Done |
| ~~PersonalAIService 에러 로깅~~ | ✅ 22 console.error → Sentry captureError 전환 | ~~P1~~ Done |
| **PaymentScreen 데이터 연동** | TODO 마커 (결제선생 파트너 대기중) | P1 |
| **Supabase 키 로테이션** | 이전 키 git 히스토리에 노출됨 + Telegram 토큰 노출 | P1 |
| **Google Calendar TODO** | 연동 불완전 | P2 |
| **PersonalAI 로직** | 스켈레톤만 | P2 |
| **SmartFit UI 연동** | API만 구현 | P3 |
| **Expo SDK 업그레이드** | 50 → 최신 | P2 |

---

## 📁 프로젝트 구조

```
autus/
├── 온리쌤/                    ← 메인 프로젝트 (이 폴더)
│   ├── App.tsx                 # 진입점 → AppProvider → AppNavigatorV2
│   ├── app.json                # Expo 설정
│   ├── eas.json                # EAS Build 설정
│   ├── package.json            # name: "onlyssam"
│   ├── src/
│   │   ├── navigation/
│   │   │   ├── AppNavigatorV2.tsx  # 역할별 라우팅 (Admin/Staff/Consumer)
│   │   │   └── OnboardingNavigator.tsx
│   │   ├── screens/
│   │   │   ├── auth/LoginScreen.tsx
│   │   │   ├── onboarding/     # 6개 온보딩 화면
│   │   │   ├── v2/             # 16개 프로덕션 화면
│   │   │   └── v5/OnlySsamScreen.tsx  # WebView 코치앱
│   │   ├── components/
│   │   │   ├── common/         # 11개 공통 UI (ErrorBoundary + Sentry 연동)
│   │   │   └── dashboard/      # OnlySsamDashboard (역할별)
│   │   ├── services/           # 20+ 비즈니스 로직
│   │   ├── lib/                # supabase, sentry, video
│   │   ├── config/             # env, constants, labelMap
│   │   ├── hooks/              # 5개 커스텀 훅
│   │   ├── types/              # attendance, lesson, personalAI
│   │   ├── context/            # IndustryContext
│   │   ├── providers/          # AppProvider
│   │   ├── utils/              # theme, haptics, offlineQueue
│   │   └── __tests__/          # 10개 테스트 (262 cases)
│   ├── supabase/
│   │   ├── migrations/         # 27개 SQL
│   │   ├── functions/          # 14개 Edge Functions
│   │   └── EXECUTE_THIS.sql    # 통합 스키마
│   ├── web/pages/              # 보충수업 선택 웹페이지
│   ├── scripts/                # 유틸리티 스크립트
│   ├── docs/                   # 20개 문서
│   └── .github/workflows/ci.yml
│
├── kraton-v2/                  # Vercel 웹 프론트엔드 (Vite SPA)
├── vercel-api/                 # Vercel API (Next.js)
├── _archive_allthatbasket/     # 아카이브 (참조용)
└── _archive_onlyssam/          # 아카이브 (중복 제거)
```

---

## 🔌 외부 연동 15개

| # | 서비스 | 상태 | 용도 |
|---|--------|------|------|
| 1 | Kakao Login | ✅ Live | OAuth 인증 |
| 2 | Apple Sign In | ✅ Ready | iOS 로그인 |
| 3 | Supabase | ✅ Live | BaaS 전체 |
| 4 | App Store | ✅ 5회 제출 | iOS 배포 |
| 5 | Play Store | ✅ Ready | Android 배포 |
| 6 | 카카오 알림톡 | 🟡 대기 | 학부모 알림 |
| 7 | FCM | 🟡 대기 | 푸시 알림 |
| 8 | 토스페이먼츠 | ✅ Ready | 결제 (대안) |
| 9 | **결제선생 API** | 🟡 파트너 신청 예정 | 청구서 발송/수납 (핵심) |
| 10 | YouTube API | 🟡 계획 | **움직임 로그** (비공개 링크 누적) |
| 11 | Notion API | 🟡 계획 | **관찰 로그** (코치 피드백 누적) |
| 12 | Vercel | ✅ Live | 웹 대시보드 |
| 13 | Domain | ✅ Live | autus-ai.com |
| 14 | Anthropic API | 🟡 계획 | 승원봇 AI |
| 15 | Sentry | ✅ Installed | 에러 모니터링 (@sentry/react-native) |

---

## 🚀 Quick Start

```bash
# 앱 실행
cd 온리쌤 && npm install && npx expo start

# 테스트
npm test

# 빌드
npm run build:ios    # EAS iOS 빌드
npm run build:android # EAS Android 빌드

# Supabase
supabase functions deploy --all
```

---

## 📊 데이터 수집 목표

```
Webhook 자동  ████████████████████████████████  40%
QR/NFC 자동   ██████████████████████            25%
AI 추론       ██████████████                    15%
학부모 셀프   ██████████                        15%
관리자 입력   ███                                5%
```

---

## 🧬 아키텍처 방향 (v3 — Encounter Kernel)

> 📄 상세: [docs/ARCHITECTURE_V3_ENCOUNTER_KERNEL.md](./docs/ARCHITECTURE_V3_ENCOUNTER_KERNEL.md)

**핵심 전환**: Session → **Encounter Kernel** (교육/케어/클리닉 공용)

```
Core Layer:     Encounter Kernel + Presence Module + IOO Trace + RLS
Execution Layer: Policy & Action Queue → Worker Gateway (Vercel)
Interface Layer: Expo 온리쌤 (Today 1화면, 입력 0, 2스텝)
```

**3대 설계 원칙:**
1. 정합성 — 단일 Truth (Encounter Kernel)
2. 감사추적 — IOO로 모든 행위의 입력/처리/출력 증빙
3. 장애/중복 방지 — dedupe_key + idempotency + action_queue

---

## 🗺️ 로드맵

### Phase 1 — MVP 안정화 + Encounter Kernel 전환 (현재)
- [x] Encounter + Presence + IOO 테이블 고정 (EXECUTE_THIS.sql Part 11-12)
- [ ] 온리쌤 버튼 3개 (PRESENT/ABSENT/LATE) → action_queue 연결
- [ ] 카톡 "결석 알림" 1개 정책을 action_queue → worker로 실행
- [ ] Trace Viewer (운영자용) — "왜 발송됐는지" 확인
- [x] 테스트 커버리지 — 262개 테스트 (10 파일)
- [x] Storage RLS 정책 이전 (EXECUTE_THIS.sql Part 14)
- [x] Sentry 패키지 설치 및 활성화
- [ ] 카카오 비즈니스 채널 승인 → 알림톡 활성화
- [ ] Supabase 키 로테이션 (이전 키 git history 노출)

### Phase 2 — 결제선생 + 상담선생 연동
> 📄 상세: [docs/STUDY_PAYSSAM_INTEGRATION.md](./docs/STUDY_PAYSSAM_INTEGRATION.md)
- [ ] 결제선생 파트너 등록 (poqdev@payletter.com)
- [ ] Worker Gateway (Vercel) — idempotency + retry + rate limit
- [ ] `payment_invoices` 테이블 + `paySSAMService.ts` 구현
- [ ] Webhook 엔드포인트 (`/api/webhooks/payssam`)
- [ ] 상담선생 MVP — `consultations` + `risk_flags` 테이블
- [ ] 위험 감지 Cron (출석률 + 미납 + V-Index → 자동 상담 예약)
- [ ] 3자 통합 체인 (출석 → 결제 → 상담 자동 흐름)
- [ ] 몰트봇 텔레그램 연동 (모바일 트리거)
- [ ] PII Vault 분리 (케어/클리닉 확장 대비)
- [ ] Expo SDK 업그레이드

### Phase 3 — 여러 학원 → 한 학생 (로그 수렴)
- [ ] 학생 독립 엔티티 전환 (org 초월)
- [ ] 복수 학원 → 한 학생 포트폴리오 구조
- [ ] 노션 API 연동 (관찰 로그)
- [ ] YouTube API 연동 (움직임 로그, 비공개 링크 누적)
- [ ] 종목별 로그 크로스 분석
- [ ] PersonalAI 활성화 (6개월 데이터 축적 후)

### Phase 4 — 클론 + 산업 확장
- [ ] 충분한 로그 → 피지컬 클론 생성
- [ ] 케어/클리닉 확장 (엔티티만 교체, 같은 로그 패턴)
- [ ] IoT/웨어러블 연동 (움직임 로그 정밀도 상승)
- [ ] 해외 확장 (SMS/WhatsApp 커넥터)

---

## 🤝 커널-모듈 비대칭 구조

> 📄 상세: [docs/STRATEGY_INTEGRATION_KERNEL.md](./docs/STRATEGY_INTEGRATION_KERNEL.md)

**Truth는 그들, 의사결정은 우리. 로그를 모아서 클론을 만든다.**

### 레이어 1: 학원 인프라 (Truth 생산)

| 선생 | 역할 | Truth | 클론 로그 |
|------|------|-------|----------|
| 결제선생 | 수납 | Payment Truth | 지속 로그 |
| 출결선생 | 출석 | Presence Truth | 빈도 로그 |
| 상담선생 | 스케줄 | Schedule Truth | 패턴 로그 |
| 노션 | 피드백 | Feedback Truth | 관찰 로그 |
| 유튜브 | 영상 | Performance Truth | 움직임 로그 |

### 레이어 2: AUTUS Kernel (로그 수렴 + 정책 실행)

```
학원A ──→ 노션+유튜브+출결+결제 ──┐
학원B ──→ 노션+유튜브+출결+결제 ──┤──→ 학생 포트폴리오
학원C ──→ 노션+유튜브+출결+결제 ──┘        ↓
                                    AUTUS Policy Engine
                                          ↓
                                ┌─→ 학부모 알림톡
                                ├─→ risk_flags (위험 감지)
                                ├─→ 상담선생 → 자동 상담 예약
                                ├─→ 결제선생 → 청구서 발송
                                └─→ IOO Trace (모든 것을 로그)
                                          ↓
                                    로그 임계점 도달
                                          ↓
                                     피지컬 클론
```

> "쌓이면 실패, 흐르면 성공" — 이벤트는 흐르고, 로그는 학생에게 쌓인다

*Last Updated: 2026-02-14*
