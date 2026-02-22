# 온리쌤 아키텍처 v3 — Success Stability 최우선

> Score: **92/100**
> 핵심 전환: Session → **Encounter Kernel** (교육/케어/클리닉 공용)

---

## 0. 목표

- **v1**: "출석"이 아니라 Check-in/Presence 기록 시스템
- **v2**: 케어/클리닉의 "내원/방문/복약/관찰"로 자연 확장

---

## 1. Core Layer (내부 소유, 절대 고정)

### A. Encounter Kernel (공통 커널)

개념: 교육의 "세션(Session)" = 케어/병원의 "방문(Encounter/Visit)"

최소 스키마:

| 필드 | 설명 |
|------|------|
| `encounter_id` | PK |
| `org_id` | 조직 |
| `site_id` | 지점/시설 |
| `subject_id` | 학생/환자/회원 |
| `staff_id` | 강사/케어기버/의료진 |
| `start_at` | 시작 시각 |
| `end_at` | 종료 시각 |
| `status` | SCHEDULED / IN_PROGRESS / COMPLETED / CANCELLED |

### B. Presence Module (온리쌤의 본체)

| 필드 | 설명 |
|------|------|
| `presence_id` | PK |
| `encounter_id` | FK → Encounter |
| `subject_id` | 대상자 |
| `presence_status` | PRESENT / ABSENT / LATE / LEFT_EARLY |
| `captured_by` | HUMAN / SENSOR / API |
| `captured_at` | 캡처 시각 |

- 변경 불변 로그(히스토리) 필수

### C. IOO Trace Module (감사·분쟁·학습)

- 모든 버튼/센서 기록을 IOO로 남김
- `trace_id`로 Input/Operation/Output 연결
- `dedupe_key`로 중복발송/중복기록 방지

### D. Identity & Access (RLS)

- 역할 최소: **OWNER / MANAGER / STAFF**
- 스코프: `org_id` + `site_id` 기준 분리
- 민감정보(PII)는 별도 Vault 테이블 분리

---

## 2. Execution Layer (안정성 담당)

### E. Policy & Action Queue (초기부터 최소 탑재)

- 출석 앱이라도 "실행"은 분리
- `action_queue`에 쌓고 Worker가 실행
- 기본 제공 액션 (안정성 높은 것만):
  - 메시지 발송 (카카오 알림톡)
  - 일정 상태 변경 요청
  - 관리자 알림 (내부)

### F. Worker Gateway (Vercel)

- 비밀키(카톡/결제/외부)는 전부 여기만
- **idempotency** + retry/backoff + rate limit
- 장애 시 재처리(Replay) 가능

---

## 3. Interface Layer (앱)

### G. OnlySsam (Expo) UI 원칙

- **Today 1화면**
- **입력 0** (버튼만)
- **작업 2스텝 이내**
- 오프라인 캐시(선택): 네트워크 불안정 대비 (케어 현장에 중요)

---

## 전체 구조도

```
┌─────────────────────────────┐
│  [Expo: 온리쌤]              │
│  - 체크인/출석 버튼           │
└──────────┬──────────────────┘
           │
           v
┌─────────────────────────────┐
│  [Supabase: Core Layer]      │
│  - Encounter Kernel          │
│  - Presence Module           │
│  - IOO Trace                 │
│  - RLS, 불변 로그             │
│  - action_queue 적재          │
└──────────┬──────────────────┘
           │
           v
┌─────────────────────────────┐
│  [Vercel: Worker Gateway]    │
│  - 카톡 발송                  │
│  - 결제선생/외부 연동          │
│  - 재시도/중복방지             │
└──────────┬──────────────────┘
           │
           v
┌─────────────────────────────┐
│  [외부 서비스]               │
│  카카오 / 결제선생 / QR/NFC   │
└─────────────────────────────┘
```

---

## MVP Plan (7일 / $1k 실험)

### 7일 목표 (안정성 중심)

1. **Encounter + Presence + IOO 테이블 고정**
2. **온리쌤 버튼 3개** (PRESENT / ABSENT / LATE)
3. **카톡 "결석 알림" 1개 정책**을 action_queue → worker로 실행
4. **Trace Viewer** (운영자용)로 "왜 발송됐는지" 확인 가능

### ROI

안정성: 누락/분쟁/중복 메시지 비용 감소 + 운영 인력 의존도 감소

---

## Modularity Map

| 구분 | 모듈 |
|------|------|
| **Core (소유)** | Encounter Kernel, Presence, IOO, RLS |
| **Outsource** | Expo UI, 템플릿 문구/운영, 리포트 |
| **Connector** | 카카오, 결제선생, QR/NFC/BLE, 캘린더 |

---

## Expansion & Globalization

- 교육(출석) → 케어(방문/관찰/복약 체크)로 **엔티티만 바꿔 재사용**
- 메시징 커넥터만 교체하면 해외(SMS/WhatsApp) 확장

---

## Risk Map

| 리스크 | 대응 |
|--------|------|
| **개인정보 (특히 케어)** | PII 분리 + 접근 감사 로그 + 최소수집 |
| **현장 네트워크 불안** | 오프라인 큐 + 재동기화 |
| **중복/오발송** | dedupe_key + Worker idempotency + rate limit |
| **규제 대응** | IOO/Proof Pack로 "누가/언제/무엇을" 증빙 |

---

## Score Sheet

| 항목 | 점수 |
|------|------|
| I (Innovation) | 9 |
| C (Completeness) | 8 |
| Axes | 9 |
| O (Operability) | 9 |
| P (Performance) | 9 |
| R (Reliability) | 9 |
| H (Habitability) | 9 |
| ROI | 8 |
| M (Modularity) | 10 |
| D (Durability) | 9 |
| G (Growability) | 9 |
| V (Visibility) | 9 |
| Risk | 6 |
| F (Flexibility) | 9 |
| W (Wideness) | 9 |
| **Total** | **92/100** |

---

## Next Loop Delta

다음 단계(모듈화 잠금)에서 바뀌어야 할 1개:

> "Session" 용어를 버리고 **Encounter Kernel**로 고정 (교육/케어/클리닉 공용)

그 다음: Presence(출석) → **Observation(관찰)** 모듈을 추가할 수 있는 슬롯을 미리 확보.

---

## 3대 설계 원칙 요약

1. **정합성** — 단일 Truth (Encounter Kernel)
2. **감사추적** — IOO로 모든 행위의 입력/처리/출력 증빙
3. **장애/중복 방지** — dedupe_key + idempotency + action_queue

---

*Created: 2026-02-12 — Score 92/100*
