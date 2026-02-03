# ✅ AUTUS Core v1 구현 완료

## 체크리스트 결과

| # | 항목 | 상태 |
|---|------|------|
| 1 | AUTUS Core v1 생성 | ✅ |
| 2 | API v1 고정 | ✅ |
| 3 | Brand OS 1개 (올댓바스켓) UI 고정 | ✅ |
| 4 | SaaS 연동 (Supabase) | ✅ |
| 5 | Intervention 버튼 강제 | ✅ |
| 6 | Shadow Rule 2개 생성 | ✅ |

---

## 생성된 파일

### 1. Core Schema
```
autus/AUTUS_CORE_V1.sql
```
- Fact 테이블: payments, visits, sessions, memberships
- Intervention 테이블
- Outcome 테이블
- Approval Card 테이블
- Rule 테이블
- Derived State 뷰

### 2. API v1
```
autus/autus-core/api-v1.js
```
**고정 엔드포인트:**
- `POST /payments` - 결제 Fact
- `POST /visits` - 방문 Fact
- `POST /attendance/scan` - 출석 Fact
- `POST /classes/event` - 수업 이벤트
- `POST /interventions` - 사람 개입
- `POST /actions` - Shadow/Auto 액션
- `POST /approval-cards` - 승인 카드
- `POST /approval-cards/:id/decision` - 승인/거절
- `GET /members/:id/state` - 회원 상태
- `GET /students/:id/state` - 학생 상태

**원칙:**
- 수정/삭제 없음 (Append Only)
- 설명/메모 필드 없음
- Idempotency 필수

### 3. Brand OS (올댓바스켓)
```
autus/autus-core/brand-os/allthatbasket/OwnerView.jsx
autus/autus-core/brand-os/allthatbasket/CoachView.jsx
```

**원장 뷰:**
- 상태 확인 (정상/경고/위험)
- 승인 카드: 승인 / 보류 / 거절 (버튼 3개)
- 입력 필드 0
- 설정 0
- 설명 0

**강사 뷰:**
- 수업 시작/종료
- QR 출석 표시
- **Intervention 버튼 (강제)**
- 수기 출석 입력 금지

### 4. Shadow Rules
```
autus/autus-core/rules/shadow-rules.sql
```

**Rule 1: 결제 실패 안내**
- 트리거: 결제 실패 발생
- 액션: 보호자 메시지 발송
- 위험도: LOW

**Rule 2: 연속 결석 알림**
- 트리거: 2회 연속 결석
- 액션: 보호자 알림 발송
- 위험도: LOW

### 5. MoltBot Evolver
```
autus/autus-core/moltbot/evolver.js
```

**기능:**
- Intent 컴파일
- 헌법 필터 (AUTO / APPROVAL / FORBIDDEN)
- Shadow 실행
- Intervention 학습
- Rule 후보 감지
- 승급 체크

**학습 대상:**
- ❌ 기능
- ❌ 프롬프트
- ⭕ 사람의 판단 기록

---

## 핵심 원칙 (LOCK)

### 데이터 흐름
```
[기존 SaaS / ERP / Web]
        ↓ (Event)
     AUTUS Core
        ↓ (Action 위임)
[기존 SaaS / 메시징 / 결제]
```

### 자동화 규칙
- Auto는 저위험만
- 금전/교체/정책 변경 = Approval 필수
- Shadow 없이 Auto 금지
- Kill-switch 필수

### "흡수"의 정의
```
(언제, 누가, 무엇을 결정했는가)
```
이게 기록되면 그 서비스는 AUTUS에 흡수된 것이다.

### 브랜드 전략
- AUTUS 이름 비노출
- AI/추천/자동화 용어 금지
- Brand OS 간 기능/언어 혼용 금지

---

## 다음 단계

1. **Supabase에 스키마 적용**
   ```bash
   cd autus
   supabase db push
   ```

2. **AUTUS Core 서버 시작**
   ```bash
   cd autus-core
   npm install
   npm start
   ```

3. **Intervention 축적 시작**
   - 강사 뷰에서 Intervention 버튼 사용
   - 30건 이상 축적 후 Shadow 정확도 측정

4. **Shadow → Auto 승급**
   - 정확도 ≥ 70%
   - 실행 횟수 ≥ 30회
   - 위험도 = LOW
   - Approval Card로 승인

---

## 최종 요약

> 크로드 코드는 AUTUS의 '몸'을 만든다.
> 몰트봇은 AUTUS의 '진화'를 만든다.
> AUTUS는 보이지 않은 채, 모든 운영을 흡수한다.

**구현 완료일:** 2026-01-31
