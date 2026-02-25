# AUTUS 개발 현황

> 최종 업데이트: 2026-02-23
> 프로젝트: AUTUS 멀티 프로덕트 플랫폼

---

## 전체 구조

```
AUTUS Platform (공유 코어)
├── 온리쌤 (학원 관리)      ← 배포 완료, 안정화 중
├── 뷰티 (미용실 관리)      ← Edge Function 배포, 연동 초기
├── 올댓바스켓 (체육학원)   ← DB 테이블 존재, 레거시
├── 숙제 시스템 (sw_*)      ← 테이블 존재
└── 시설관리 (zf_*)         ← 테이블 존재
```

---

## 프로덕트별 현황

### 1. 온리쌤 (학원 관리) — 80%

**상태**: 배포 완료 → 런타임 에러 수정 → 카카오 외부 연동 대기

| 영역 | 진행률 | 상태 |
|------|--------|------|
| DB 스키마 (121 테이블) | 95% | customer_temperatures 생성 완료 |
| Vercel API (42 라우트) | 85% | Phase 1 코드 작성 완료, TS에러 258개 레거시 잔존 |
| Edge Functions (14개) | 90% | 모두 배포 완료 |
| pg_cron (10개) | 100% | 정상 동작 (job 9~16 제거 완료) |
| 메시징 파이프라인 | 80% | outbound-worker + template-engine 코드 완료, 카카오 API 미연결 |
| 성장 추적 (Navigation v2) | 70% | API 작성 완료, UI 미연결 |
| 프론트엔드 (kraton-v2) | 75% | 대시보드 라이브, 성장 UI 미작업 |
| 카카오 알림톡 | 30% | 코드 구조 완료, 비즈 채널/템플릿 승인 필요 |

**최근 수정 (2026-02-22)**:
- pg_cron job 9~16 비활성화 (JSON parse 에러 해결)
- RLS 미적용 3테이블 보안 적용 (message_templates, academies, message_variants)
- SECURITY DEFINER 뷰 7개 → SECURITY INVOKER 전환

### 2. 뷰티 (미용실 관리) — 30%

**상태**: Edge Function 7개 배포 완료, 스펙 문서 미작성

| Edge Function | 용도 |
|--------------|------|
| beauty-reservation-check | 예약 확인 |
| beauty-commission-calc | 수수료 계산 |
| beauty-noshow-processor | 노쇼 처리 |
| beauty-revisit-predictor | 재방문 예측 |
| beauty-membership-billing | 멤버십 빌링 |
| beauty-reminder-sender | 리마인더 발송 |
| beauty-daily-settlement | 일일 정산 |

**필요**: 스펙 문서, DB 테이블, 프론트엔드, 카카오 연동

### 3. 올댓바스켓 (체육학원) — 레거시

**상태**: atb_* 테이블 7개 + 뷰 7개 존재. 온리쌤으로 흡수/전환 대상.

### 4. 숙제/시설관리 — 모듈

**상태**: sw_* 9테이블, zf_* 5테이블 존재. 온리쌤 확장 모듈로 활용 가능.

---

## 인프라

### 배포 환경

| 서비스 | 플랫폼 | URL |
|--------|--------|-----|
| 프론트엔드 + API | Vercel | vercel-2fwqnod3d-ohsehos-projects.vercel.app |
| 메인 사이트 | Vercel | autus-ai.com |
| Railway 백엔드 | Railway | (FastAPI — 레거시, 점진적 제거) |
| DB | Supabase | pphzvnaedmzcvpxjulti |
| 텔레그램 봇 | Supabase Edge | t.me/autus_seho_bot |

### 비용

| 서비스 | 월 비용 |
|--------|---------|
| Vercel (Hobby) | $0 |
| Supabase (Free) | $0 |
| Railway | 사용량 |
| **합계** | **$0 ~ $10** |

---

## 에이전트 시스템 (6-Agent)

| Agent | 역할 | 상태 |
|-------|------|------|
| 몰트봇 (P0) | 텔레그램 모바일 게이트웨이 | 배포됨 |
| Claude Code (P1) | 터미널 개발 | 활성 |
| Cowork (P2) | 문서/리서치 | 활성 |
| Chrome (P3) | 브라우저 자동화 | 활성 |
| claude.ai (P4) | 리서치/전략 | 활성 |
| Connectors (P5) | 외부 서비스 연결 | GitHub, Supabase MCP |

---

## 남은 작업 (우선순위)

### 즉시 (온리쌤 안정화)
1. `git push origin main` — 로컬 2커밋 미푸시
2. 카카오 비즈니스 채널 개설 + 알림톡 템플릿 승인
3. unstaged 변경사항 7개 파일 정리/커밋

### 단기 (1~2주)
4. 성장 추적 UI 연결 (growth/state, growth/session)
5. 상담 트리거 대시보드 UI
6. 월간 리포트 Notion 연동
7. Railway 백엔드 customer_temperatures 404 해결 (테이블 생성 완료, 코드 검증 필요)

### 중기 (1개월)
8. 뷰티 프로덕트 스펙 문서 작성
9. Security Advisory WARN 28건 처리 (org_id 기반 RLS 강화)
10. 레거시 TypeScript 에러 258개 점진적 수정

---

**이전 버전**: 이 문서는 2026-01-28 버전을 전면 교체합니다.
