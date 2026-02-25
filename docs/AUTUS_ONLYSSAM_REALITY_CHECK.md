# AUTUS × 온리쌤 — 현실 파악 리포트

**작성일**: 2026-02-23
**방법**: 핵심 문서 6개 정독 + 실제 DB/코드/Edge Function 대조

---

## 1. AUTUS는 뭔가

**한 줄**: "시간 기반 관계 가치 측정 OS" — 서비스업(학원, 미용실 등)의 인간관계를 물리 공식으로 자산화하는 플랫폼

**핵심 공식**: `V = P × Λ × e^(σt)`

| 변수 | 의미 | 범위 |
|------|------|------|
| λ (Lambda) | 사람의 시간 가치 (원장 5.0, 학생 1.0) | 0.5~10.0 |
| σ (Sigma) | 두 사람 간 시너지 | -1.0~+1.0 |
| P (Density) | 관계 밀도 (빈도×깊이) | 0~1 |
| t | 시간 | 월 단위 |

**비전**: META가 "연결의 수"를 팔았다면, AUTUS는 "관계의 질량"을 측정한다.

**사업 모델**: SaaS 구독(70%) + 가치 증분 수수료(20%) + API(10%)
- Starter ₩99K/월, Growth ₩299K/월, Pro ₩599K/월, Enterprise ₩999K+/월
- 목표 LTV/CAC = 16.7x

**시장**: TAM $150B → SAM $8B(아시아 서비스업) → SOM $20M(한국 학원 3년)

---

## 2. 온리쌤은 뭔가

**한 줄**: AUTUS 플랫폼의 첫 번째 제품 — 학원 관리 시스템 (출결, 성장 추적, 학부모 소통, 상담 트리거)

**4대 핵심 문제 해결**:
1. 수업/스케줄 관리
2. 학부모 카카오 알림톡 자동 소통
3. 학생 데이터(출결, 수업 결과) 통합 관리
4. 미수금 자동 추적

**Navigation v2 (성장 추적)**:
- Destination = 분기/연간 방향 (변경에 합의 필요)
- Next Move = 주간/세션 단위 키워드 기반 추적
- 학부모 메시지는 **단어 중심** (숫자/순위/비교 절대 금지)

---

## 3. 실제 인프라 현황

### 3-1. Supabase DB: 121개 테이블

| 접두사 | 수 | 역할 |
|--------|-----|------|
| atb_* | 7개 | 올댓바스켓(체육학원) 원본 |
| sw_* | 9개 | 숙제/과제 시스템 |
| zf_* | 5개 | 시설 관리 |
| beauty_* (Edge) | 7개 | 미용실 프로덕트 (Edge Function만) |
| 나머지 | ~93개 | 온리쌤 코어 + AUTUS 공통 |

### 3-2. Edge Functions: 27개

**온리쌤 계열 (14개)**: chat-ai, kakao-webhook-receiver, message-sender, message-worker, automation-engine, attendance-check, invoice-generate, overdue-check, notification-dispatch, payment-webhook, event-replay, growth-report, contract-expire, escalation-batch

**뷰티(미용실) 계열 (7개)**: beauty-reservation-check, beauty-commission-calc, beauty-noshow-processor, beauty-revisit-predictor, beauty-membership-billing, beauty-reminder-sender, beauty-daily-settlement

**공통/기타 (6개)**: telegram-webhook, signature-request, moodusign-webhook, kakao-send, consent-link, evidence-package

### 3-3. Vercel API: 42개 라우트 디렉토리

주요: v1(11개 뷰 API), growth, kakao, cron, messaging, auth, autus, brain, moltbot 등

### 3-4. pg_cron: 10개 활성

월간 인보이스, 10분 알림 발송, 21시 일일배치(pay7 스코어링), 연체 체크, 에스컬레이션, 계약 만료, 미수금 연체 마킹, 만료 임박 계약, 90일 정리

---

## 4. 문서 vs 현실 — 불일치 6건

### 불일치 #1: V-Index 공식이 두 개

| 위치 | 공식 |
|------|------|
| AUTUS_SPEC_v1.md | `V = P × Λ × e^(σt)` |
| CLAUDE.md | `V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t` |

→ **두 공식의 관계 정의가 필요.** 하나는 이론 스펙, 하나는 실행 코드용인지, 아니면 버전 차이인지.

### 불일치 #2: Constitution vs 현실

| 헌법 | 실제 |
|------|------|
| "Zero-Cloud: 모든 데이터 로컬 저장" | Supabase 클라우드 DB 사용 |
| "P2P: 중앙 서버 없이 직접 연결" | Vercel + Railway + Supabase 중앙 서버 |
| "블록체인 형태 Immutable Ledger" | PostgreSQL append-only 테이블 (canonical_events) |
| "AES-256-GCM, SHA-256 블록 해시" | 구현 증거 없음 |
| "BLE Discovery, QR Handshake" | 미구현 |

→ **헌법은 장기 비전이지, 현재 구현 상태가 아님.** 혼동 가능.

### 불일치 #3: `customer_temperatures` — 유령 테이블

- REMAINING_TASKS.md: "생성 필요" 목록에 있음
- backend/routers/views_api.py: 이 테이블을 참조하여 404 에러 발생
- 실제 DB(121개 테이블): **존재하지 않음**
- 초기 온도 측정 시스템은 아직 미구현

### 불일치 #4: DEVELOPMENT_STATUS.md 날짜

- 문서 날짜: 2026-01-28 (약 1개월 전)
- 그 이후 추가된 것: 온리쌤 Phase 1 코드(growth, pre-attendance, consultation-trigger, monthly-report), 메시징 파이프라인 전체, beauty-* Edge Functions 7개
- **현재 진행률 68%는 outdated**

### 불일치 #5: Beauty(미용실) 제품 — 문서화 부재

- Edge Function 7개가 이미 배포됨 (beauty-reservation-check 외 6개)
- signature-request, moodusign-webhook, consent-link 등 전자서명 관련도 배포
- **docs/에 미용실 관련 스펙 문서가 없음**

### 불일치 #6: 멀티 프로덕트 전략 미정리

CLAUDE.md에 "Multi-project (온리쌤, K-Work)"이라고만 적혀 있으나, 실제로는:
- 온리쌤 (학원 관리)
- 뷰티 제품 (미용실 관리)
- 올댓바스켓 (체육학원 — atb_* 테이블)
- 시설관리 (zf_* 테이블)
- 숙제 시스템 (sw_* 테이블)

이 5개 프로덕트/모듈의 관계와 공유 구조가 문서화되어 있지 않음.

---

## 5. 요약 — "정확히 파악한 현실"

**AUTUS** = AI 시대 인간관계 자산화 플랫폼 (비전·공식·사업모델은 잘 정의됨)

**온리쌤** = AUTUS의 첫 제품. 학원 관리 SaaS. **배포 완료, 런타임 에러 수정 단계.**
- 코어: 출결 + 메시징(카카오) + 성장 추적 + 상담 트리거 + 미수금
- 인프라: Supabase 121테이블 + 27 Edge Functions + 42 API 라우트 + 10 cron

**현재 위치**:
- 온리쌤: **배포 완료 → 안정화 단계** (런타임 에러 3건 수정 완료, 카카오 외부 연동 미완)
- 뷰티 제품: **Edge Function 배포 완료, 문서 없음**
- AUTUS 플랫폼화: **아키텍처만 정의, 실행은 초기**

**핵심 리스크**:
1. 문서 120+개가 시점별로 흩어져 있어 "현재 진실"이 불분명
2. Constitution(헌법)과 실제 구현의 괴리가 큼
3. 멀티 프로덕트(온리쌤/뷰티/올댓바스켓)의 공유 구조 미정리
4. V-Index 공식이 문서마다 다름
