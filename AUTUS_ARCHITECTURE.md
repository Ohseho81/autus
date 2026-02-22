# AUTUS 전체 아키텍처

**날짜**: 2026-02-14
**버전**: 2.0

---

## 🎯 핵심 개념

### 1. AUTUS (Layer 0 - 초개인 AI)
**목적**: 개인 의사결정 로그 기록

```
개인의 모든 의사결정 → Event Ledger → Physics Engine → V-Index
```

**수집 데이터**:
- 결제 의사결정 (언제, 얼마, 왜 결제했나)
- 참여 의사결정 (언제, 어디, 왜 참여했나)
- 소통 의사결정 (누구와, 무엇을, 왜 대화했나)
- 시간 의사결정 (언제, 무엇을, 왜 했나)

**산출물**:
- V-Index: `V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t`
- Universal Profile: 모든 서비스에서의 통합 정체성
- Cross-Service Identity: 다른 학원/서비스에서도 동일인 인식

---

### 2. 온리쌤 (Layer 1 - 교육 서비스 수직 통합)
**목적**: 교육 서비스 상품화 (상담 → 스케줄 → 수납 → 출결)

```
상담 → 등록 → 스케줄 배정 → 출석 체크 → 결제 청구 → 수납 확인
  ↓       ↓         ↓            ↓            ↓            ↓
Event  Event     Event        Event        Event        Event
  ↓       ↓         ↓            ↓            ↓            ↓
                    V-Index 실시간 업데이트
```

**핵심 프로세스**:
1. **상담**: 첫 접촉, 니즈 파악
2. **등록**: 학생 정보 입력, 클래스 배정
3. **스케줄**: 시간표 생성, 예약 관리
4. **출결**: 출석 체크, 결석/지각 관리
5. **수납**: 청구서 발행, 결제 추적, 미수금 관리

**결과 로그**:
- 출석 로그 (Attendance Log)
- 결제 로그 (Payment Log)
- 상담 로그 (Consultation Log)
- 소통 로그 (Communication Log)

---

## 🔗 통합 도구 (Integration Layer)

### 카카오톡 (소통 + 액션)
**역할**: 실시간 소통 및 즉각 액션

```
학부모 ←→ 카카오톡 ←→ 학원
  │                      │
  ├─ 출결 알림 자동 발송  │
  ├─ 결제 청구서 발송     │
  ├─ 일정 변경 공지       │
  └─ 1:1 상담 채팅        └─ Event → AUTUS
```

**주요 기능**:
- 출석 알림 자동 발송
- 결제 안내/독촉
- 스케줄 변경 공지
- 1:1 상담
- 긴급 연락

**몰트봇 연동**:
- 카카오톡 → 몰트봇 (t.me/autus_seho_bot)
- 모바일 알림 허브
- 원격 모니터링

---

### 결제선생 (청구 + 수납)
**역할**: 결제 프로세스 자동화

```
온리쌤 → 결제선생 API → 청구서 생성 → 카카오톡 발송
                           ↓
                    결제 완료 시 Webhook
                           ↓
                    Supabase 자동 업데이트
                           ↓
                       Event → AUTUS
```

**주요 기능**:
- 정기 청구서 자동 발행
- 카카오페이/네이버페이 연동
- 미수금 자동 추적
- 입금 확인 자동화
- 결제 내역 대시보드

**API 연동**:
```typescript
// 청구서 발행
POST /api/payment/invoice
{
  student_id: "uuid",
  amount: 150000,
  due_date: "2026-03-01",
  items: ["선수반 월회비", "개인레슨 10회"]
}

// Webhook 수신
POST /webhook/payment-complete
{
  invoice_id: "inv_123",
  paid_amount: 150000,
  paid_at: "2026-02-15T10:30:00Z"
}
```

---

### 유튜브 (영상 기록)
**역할**: 훈련 영상 기록 및 피드백

```
훈련 영상 촬영 → 유튜브 비공개 업로드 → 링크 → Supabase
                                              ↓
                                    학생 프로필에 연결
                                              ↓
                                    학부모에게 공유
```

**주요 용도**:
- 개인 레슨 영상 기록
- 경기 영상 분석
- 기술 교정 before/after
- 성장 포트폴리오
- 학부모 피드백

**메타데이터 저장**:
```json
{
  "student_id": "uuid",
  "video_url": "https://youtu.be/xxx",
  "video_type": "training", // training, match, skill_drill
  "recorded_at": "2026-02-14",
  "notes": "서브 기술 교정",
  "tags": ["serve", "technique", "improvement"]
}
```

---

### 노션 (텍스트 기록)
**역할**: 구조화된 문서 및 지식 관리

```
학생별 성장 일지 → 노션 페이지
월별 운영 리포트 → 노션 데이터베이스
코치 교육 자료 → 노션 위키
```

**주요 용도**:
- 학생별 성장 일지 (개인 노트)
- 월별 운영 리포트
- 코치 교육 자료 wiki
- 회의록/의사결정 기록
- 학원 운영 매뉴얼

**Supabase 연동**:
- Notion API로 자동 동기화
- 주요 데이터는 Supabase에 백업
- 노션 = 사람이 읽는 뷰
- Supabase = 기계가 처리하는 데이터

---

### Supabase (운영 데이터)
**역할**: Single Source of Truth

```
PostgreSQL Database
├── universal_profiles (Layer 0 - AUTUS)
├── profiles (Layer 1 - 학원별)
├── payments (결제)
├── schedules (스케줄)
├── bookings (출석)
├── communications (소통 로그)
├── videos (영상 메타데이터)
└── events (Event Ledger)
```

**데이터 플로우**:
```
모든 액션 → Supabase → Event Ledger → Physics Engine → V-Index 업데이트
```

**API 계층**:
- FastAPI (백엔드)
- Next.js (프론트엔드)
- Supabase REST API
- Realtime subscriptions

---

## 🤖 6-Agent 라우팅 시스템

### 📱 몰트봇 (P0 - Mobile Gateway)
**역할**: 모바일 알림 및 원격 트리거

- 카카오톡 알림 → 몰트봇 → 사용자 폰
- 원격 배포 트리거
- 상태 모니터링
- 긴급 알림

**채널**: t.me/autus_seho_bot

---

### ⌨️ Claude Code (P1 - Terminal Agent)
**역할**: 코딩, 디버깅, 배포

- 백엔드 개발 (FastAPI)
- 프론트엔드 개발 (Next.js)
- Git 관리
- Railway/Vercel 배포
- 테스트 실행

---

### 🖥️ Cowork (P2 - Desktop Agent)
**역할**: 문서 작업, 데이터 분석

- 엑셀 업로드 처리
- 리포트 생성
- PPT 생성
- 데이터 정리

---

### 🌐 Chrome (P3 - Browser Agent)
**역할**: 웹 자동화, UI 테스트

- UI 테스트
- 스크래핑
- 폼 자동 작성
- 모니터링

---

### 💬 claude.ai (P4 - Research Agent)
**역할**: 리서치, 전략, 설계

- 아키텍처 설계
- 경쟁사 분석
- 기술 리서치
- 전략 수립

---

### 🔗 Connectors (P5 - Bridge)
**역할**: 외부 서비스 연동

- GitHub
- Slack
- Notion API
- Gmail
- Google Calendar
- 결제선생 API
- 카카오톡 API

---

## 📊 데이터 플로우 (End-to-End)

### 1. 신규 학생 등록
```
엑셀 업로드 (Cowork)
  ↓
FastAPI 파싱 + 검증
  ↓
Supabase Insert
  ↓
Trigger: auto_link_universal_profile()
  ↓
Universal ID 자동 할당
  ↓
Event Ledger 기록
  ↓
카카오톡 환영 메시지 발송 (몰트봇)
```

### 2. 출석 체크
```
코치가 앱에서 출석 체크
  ↓
POST /api/attendance/check
  ↓
Supabase: bookings 테이블 업데이트
  ↓
Event 생성: "attendance_checked"
  ↓
V-Index 업데이트 (Motions +1)
  ↓
카카오톡 알림: "오늘 출석 완료" (몰트봇)
  ↓
학부모 카카오톡 수신
```

### 3. 결제 프로세스
```
월초 자동 실행 (Cron)
  ↓
청구서 생성 (결제선생 API)
  ↓
카카오톡 발송
  ↓
학부모 결제 (카카오페이)
  ↓
Webhook → FastAPI
  ↓
Supabase: payments 테이블 업데이트
  ↓
Event: "payment_completed"
  ↓
V-Index 업데이트
  ↓
영수증 카카오톡 발송
```

### 4. V-Index 업데이트 (실시간)
```
모든 이벤트 발생
  ↓
Event Ledger 기록
  ↓
Physics Engine 실행
  ↓
V-Index 재계산
  ↓
Realtime broadcast (Supabase)
  ↓
대시보드 실시간 업데이트
```

---

## 🏗️ 기술 스택

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS (Tesla Dark Theme)
- **State**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Realtime**: Supabase Realtime

### Backend
- **API**: FastAPI (Python)
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Queue**: Celery + Redis (optional)

### Infrastructure
- **Frontend Deploy**: Vercel
- **Backend Deploy**: Railway
- **Database**: Supabase (PostgreSQL)
- **CDN**: Cloudflare
- **Monitoring**: Sentry

### External APIs
- 결제선생 API (결제)
- 카카오톡 API (메시징)
- Notion API (문서 동기화)
- YouTube Data API (영상 메타데이터)

---

## 🎯 Phase별 구현 계획

### Phase 1: MVP (2주) ✅ 진행중
- [x] Supabase 스키마 생성
- [x] 유비 843명 업로드
- [x] Universal ID 자동 할당
- [ ] 웹 UI (Next.js)
- [ ] FastAPI 백엔드
- [ ] 기본 CRUD

### Phase 2: 자동화 (2주)
- [ ] 엑셀 드래그앤드롭 업로드
- [ ] 자동 컬럼 매핑
- [ ] 출결 체크 UI
- [ ] 결제 대시보드
- [ ] 카카오톡 알림 (몰트봇)

### Phase 3: 통합 (2주)
- [ ] 결제선생 API 연동
- [ ] 카카오톡 API 연동
- [ ] Notion API 동기화
- [ ] YouTube 메타데이터 저장
- [ ] Event Ledger 완성

### Phase 4: AI 강화 (4주)
- [ ] V-Index 실시간 계산
- [ ] Physics Engine 구현
- [ ] 예측 알고리즘
- [ ] 추천 시스템
- [ ] 이탈 위험 감지

### Phase 5: 확장 (진행중)
- [ ] 2번째 학원 온보딩
- [ ] 3번째 학원 온보딩
- [ ] Cross-Service Identity 검증
- [ ] Multi-Tenant Architecture
- [ ] White-Label 준비

---

## 💡 핵심 원칙

### 1. Single Source of Truth
```
모든 데이터 → Supabase
외부 도구 = View/Interface
진짜 데이터 = Supabase
```

### 2. Event-Driven Architecture
```
모든 액션 = Event
Event → Event Ledger (Immutable)
Event → V-Index 업데이트
```

### 3. Privacy by Design
```
전화번호 → SHA-256 해싱
이메일 → SHA-256 해싱
개인정보 최소 수집
암호화 저장
```

### 4. Universal Identity
```
한 사람 = 한 Universal ID
여러 학원 = 같은 Universal ID
크로스 서비스 = 통합 프로필
```

### 5. Agent Orchestration
```
작업 분석 → 최적 Agent 선택
모바일 → 몰트봇 우선
코딩 → Claude Code
문서 → Cowork
웹 → Chrome
```

---

## 📈 성공 지표 (KPI)

### 운영 효율
- 학생 등록 시간: 5분 → 30초
- 출결 체크 시간: 10분 → 1분
- 결제 독촉 자동화율: 100%
- 미수금 회수 기간: 30일 → 7일

### 사용자 만족
- 학부모 앱 만족도: 4.5/5.0 이상
- 코치 업무 만족도: 4.0/5.0 이상
- 학생 출석률: 85% 이상
- 결제 연체율: 5% 이하

### 비즈니스
- 학원당 온보딩 시간: 1일 이내
- 월 활성 학원: 10개 (6개월)
- 학생 이탈률: 10% 이하
- ARR 성장: 월 20%

---

**프로젝트**: AUTUS + 온리쌤
**팀**: seho (stiger0720@gmail.com)
**최종 업데이트**: 2026-02-14
