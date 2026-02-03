# 🎯 AUTUS - AllThatBasket 최종 디자인

## 핵심 철학
```
고객이 없으면 아무것도 없다
고객 행위 → 프로세스 자동생성 → 재등록률 극대화
```

---

## 📦 Core Architecture

### 1. OutcomeFact (10개 LOCKED)
```
고객이 만들어내는 모든 로그 = OutcomeFact
```

| Type | 한글 | Priority |
|------|------|----------|
| inquiry.created | 문의 발생 | normal |
| renewal.failed | 재등록 실패 | 🔴 high |
| renewal.succeeded | 재등록 성공 | none |
| attendance.drop | 출석률 하락 | normal |
| payment.friction | 결제 마찰 | 🔴 high |
| makeup.requested | 보강 요청 | normal |
| discount.requested | 할인 요청 | 🔴 high |
| teacher.change_requested | 강사 변경 요청 | 🔴 high |
| complaint.mismatch | 불만 제기 | medium |
| notification.ignored | 알림 무시 | none |

### 2. Synthesis 5 Loops
```
A = Attendance (출석)
P = Payment (결제)
Ap = Approval (승인)
N = Notification (알림)
F = Feedback (피드백)
```

### 3. Routing Table (8줄)
```javascript
'inquiry.created':           { screen: 'dashboard', role: 'admin' }
'renewal.failed':            { screen: 'dashboard', role: 'owner' }
'renewal.succeeded':         { screen: null,        role: null }
'attendance.drop':           { screen: 'classes',   role: 'coach' }
'payment.friction':          { screen: 'payments',  role: 'admin' }
'makeup.requested':          { screen: 'classes',   role: 'admin' }
'discount.requested':        { screen: 'payments',  role: 'owner' }
'teacher.change_requested':  { screen: 'dashboard', role: 'owner' }
'complaint.mismatch':        { screen: 'students',  role: 'admin' }
'notification.ignored':      { screen: null,        role: null }
```

---

## 🗺️ 페이지 구조

### Hash Routes
| Hash | 이름 | 설명 |
|------|------|------|
| `#hub` | Process Hub | 전체 맵 네비게이션 |
| `#flow` | Living Flow Graph | Sankey + 펄스 + AI 제안 |
| `#editor` | Node Editor | 드래그 + 역할 설정 |
| `#processv10` | 고객 중심 Map | 고객 → 재등록 흐름 |
| `#decision` | Decision Dashboard | 결정 카드 대시보드 |

### 역할별 화면 (기본)
| 역할 | 접근 |
|------|------|
| 원장 (owner) | 모든 승인, 인사이트, 팀 관리 |
| 관리자 (admin) | 학생 현황, 코치 관리, 시스템 연결 |
| 코치 (coach) | 수업, 출석 체크, 촬영 |
| 학부모 (parent) | 자녀 성장, 일정 |

---

## 🎨 KRATON Design System

```javascript
colors: {
  primary: '#F97316',    // AllThatBasket Orange
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  dark: '#1F2937',
}

rules: {
  버튼: '≤3개',
  입력: '0개 (데이터 연동)',
  설정: '0개',
  AUTUS 노출: '금지'
}
```

---

## 📊 시각화 맵 목록

| Version | 이름 | 특징 |
|---------|------|------|
| V1-V4 | Legacy | 초기 프로토타입 |
| V5 | 고객 노드 맵 | 고객 중심 시작 |
| V6 | 진화 맵 | 상태 전이 |
| V7 | 타임테이블 | 시간 기반 |
| V8 | 상태 머신 | S0-S9 상태 |
| V9 | Master World Map | 전체 통합 |
| V10 | 고객 중심 World Map | **FINAL** |
| V11 | Interactive Node Editor | 드래그 + 역할 |
| V12 | Living Flow Graph | **NEW** Sankey + AI |

---

## 🚀 실행 방법

```bash
cd /sessions/sleepy-quirky-planck/mnt/Desktop/autus/kraton-v2
npm run dev
```

### 접속 URL
- 메인: http://localhost:5173/
- Hub: http://localhost:5173/#hub
- Flow: http://localhost:5173/#flow
- Editor: http://localhost:5173/#editor
- Decision: http://localhost:5173/#decision

---

## 🎯 성공 지표

**단일 목표: 재등록률 (Re-enrollment Rate)**

```
모든 기능은 재등록률 향상에 기여해야 함
측정 불가능한 기능 = 삭제
```

---

*Last Updated: 2026-02-01*
