# AUTUS × 올댓바스켓 × MoltBot 역할 정의

---

## 🔵 AUTUS가 하는 일 (System of Learning)

### AUTUS는 **보이지 않는 학습 엔진**이다

```
AUTUS = 판단 기록 + 패턴 학습 + 자동화 승급
```

| 역할 | 설명 |
|------|------|
| **Event 수집** | 기존 SaaS에서 결제/출석/등록 이벤트 수신 |
| **Intervention 기록** | 사람이 한 모든 개입(전화, 할인, 보강 등) 기록 |
| **Shadow 예측** | "이 상황에서 사람은 이렇게 할 것" 예측 |
| **정확도 측정** | Shadow 예측 vs 실제 사람 행동 비교 |
| **Rule 승급** | 정확도 70%+ → Auto 후보 → 승인 후 자동화 |
| **Derived State** | 회원별 위험도, 이탈 확률 계산 |

### AUTUS가 **하지 않는** 일

- ❌ UI 표시
- ❌ 브랜드 노출
- ❌ 고객과 직접 소통
- ❌ 결제/환불 직접 처리

---

## 🏀 올댓바스켓이 하는 일 (Brand OS)

### 올댓바스켓은 **AUTUS 위의 껍데기**이다

```
올댓바스켓 = AUTUS Core + 농구 학원 언어/UI
```

| 역할 | 담당자 | 기능 |
|------|--------|------|
| **원장 뷰** | 원장 | 상태 확인 (정상/경고/위험), 승인 카드 처리 |
| **관리자 뷰** | 실장 | 출석 모니터, 예외 감지, Intervention 기록 |
| **강사 뷰** | 코치 | 수업 시작/종료, QR 출석, Intervention 기록 |
| **학부모 뷰** | 학부모 | 일정 확인, 알림 수신 (입력 없음) |

### 올댓바스켓 UI 규칙

```
버튼 ≤ 3
입력 필드 = 0
설정 = 0
설명 = 0
AUTUS 노출 = 금지
```

### 올댓바스켓 자동화 (Auto)

| 규칙 | 트리거 | 액션 | 위험도 |
|------|--------|------|--------|
| 결제 실패 안내 | 결제 실패 | 카카오 메시지 | LOW |
| 연속 결석 알림 | 2회 연속 결석 | 카카오 메시지 | LOW |

**고위험 = 항상 승인 필요:**
- 할인 승인
- 환불 승인
- 강사 교체
- 정책 예외

---

## 🤖 MoltBot이 하는 일 (Evolver)

### MoltBot은 **학습 촉진제**이다

```
MoltBot = Intervention 감지 + Rule 후보 제안 + 승급 요청
```

| 역할 | 설명 |
|------|------|
| **Intervention 감지** | 사람이 한 개입 자동 감지/기록 |
| **패턴 분석** | 반복되는 개입 → Rule 후보 제안 |
| **Shadow 비교** | 시스템 예측 vs 사람 행동 비교 |
| **승급 요청** | 정확도 충족 시 Approval Card 생성 |
| **리포트** | 일일/주간 개입 현황 보고 |

### MoltBot이 **하지 않는** 일

- ❌ 코드 생성
- ❌ 기능 생성
- ❌ 프롬프트 생성
- ❌ 직접 액션 실행 (승인 없이)

---

## 📋 MoltBot 명령어

### Telegram에서 사용하는 명령어

```
/status              - 현재 AUTUS 상태
/interventions       - 오늘 개입 목록
/shadow              - Shadow 규칙 현황
/accuracy            - 규칙별 정확도
/promote <rule_id>   - 규칙 승급 요청
/report              - 일일 리포트
```

### MoltBot에게 줄 초기 명령

```
📋 MoltBot 초기 명령 (Telegram에서 전송)

/init allthatbasket

이 명령은:
1. allthatbasket 브랜드 활성화
2. Shadow Rule 2개 활성화
3. Intervention 감지 시작
4. 일일 리포트 스케줄링

---

/set threshold 70

승급 정확도 기준 70% 설정

---

/watch interventions

모든 Intervention 실시간 감지 시작

---

/enable shadow

Shadow 모드 활성화 (예측만, 실행 안 함)
```

---

## 🔄 전체 흐름

```
1. 코치가 수업 시작 → Fact 기록
2. 학생 결석 → Fact 기록
3. 코치가 "리마인드 발송" 버튼 클릭 → Intervention 기록
4. MoltBot이 감지 → Shadow 예측과 비교
5. 5회 이상 반복 → Rule 후보 제안
6. 30회 실행 + 70% 정확도 → 승급 요청
7. 원장이 승인 → Auto 모드 전환
8. 다음부터 자동 실행

이게 "흡수"다.
```

---

## ⚡ 즉시 실행

### 1. MoltBot 시작 (터미널)
```bash
cd ~/Desktop/autus/moltbot-bridge
node index.js
```

### 2. Telegram에서 초기화
```
/init allthatbasket
/enable shadow
/watch interventions
```

### 3. 올댓바스켓 앱 사용
- 강사가 수업 시작/종료
- 강사가 Intervention 버튼 사용
- 원장이 승인 카드 처리

### 4. 데이터 축적
- 30일간 Intervention 축적
- Shadow 정확도 측정
- 70% 이상이면 승급 요청

---

## 한 줄 요약

> **AUTUS**는 판단을 기록하고,
> **올댓바스켓**은 판단을 입력받고,
> **MoltBot**은 판단을 학습시킨다.
