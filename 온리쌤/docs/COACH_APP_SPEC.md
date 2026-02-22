# 🏀 온리쌤 강사앱 스펙 v1.0

## 📋 개요

강사(코치)가 수업을 진행하고 학생 출석을 관리하며, 레슨 영상을 촬영하여 학부모에게 공유하는 앱

---

## 🎯 핵심 목적

1. **수업 진행 관리**: 수업 시작/종료, 상태 관리
2. **출석 체크**: QR 스캔으로 학생 출석 확인
3. **영상 피드백**: 레슨 영상 촬영 및 학부모 공유

---

## 📱 화면 구성

### 단일 화면 (TodayScreen)

```
┌─────────────────────────────────────┐
│  🏀 오늘의 수업                      │
│  2026년 2월 4일 (화)                │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🟢 10:00 초등 기초반         │   │
│  │    대치 Red Court            │   │
│  │    학생 8명                  │   │
│  │    [수업 시작]               │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🟡 14:00 중등 심화반         │   │
│  │    IN_PROGRESS              │   │
│  │    출석 5/8명                │   │
│  │    [QR 스캔] [영상 촬영]     │   │
│  │    [수업 종료]               │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ✅ 09:00 유아반 완료         │   │
│  │    COMPLETED                 │   │
│  │    출석 6/6명                │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  🚨 [사고 신고]                     │
└─────────────────────────────────────┘
```

---

## 🔄 상태 머신

```
SCHEDULED ──[수업 시작]──▶ IN_PROGRESS ──[수업 종료]──▶ COMPLETED
    │                           │
    │                           ├── QR 출석 스캔 가능
    │                           ├── 영상 촬영 가능
    │                           └── 사고 신고 가능
    │
    └── 대기 상태 (버튼 비활성)
```

| 상태 | 설명 | 가능한 액션 |
|------|------|-------------|
| `SCHEDULED` | 수업 예정 | 수업 시작 버튼만 |
| `IN_PROGRESS` | 수업 진행 중 | QR 스캔, 영상 촬영, 수업 종료 |
| `COMPLETED` | 수업 완료 | 없음 (조회만) |

---

## 🚫 금지 정보

강사에게 보여주면 안 되는 정보:

| 금지 항목 | 이유 |
|-----------|------|
| `parentPhone` | 학부모 전화번호 - 개인정보 보호 |
| `parentEmail` | 학부모 이메일 - 개인정보 보호 |
| `parentContact` | 학부모 연락처 전체 |

### 허용 정보

| 허용 항목 | 용도 |
|-----------|------|
| `remainingLessons` | 잔여 수업 횟수 표시 가능 |
| `skillLevel` | 학생 스킬 레벨 표시 가능 |
| `paymentStatus` | 결제 상태 표시 가능 |

---

## ✨ 추가 기능

### 1. 사고 신고 버튼 (IncidentButton)

```typescript
// 화면 하단 고정
<IncidentButton
  onPress={() => openIncidentModal()}
  style={{ backgroundColor: '#E74C3C' }}
/>

// 모달 옵션
const incidentTypes = [
  '부상 발생',
  '시설 문제',
  '학생 분쟁',
  '기타 긴급상황'
];
```

### 2. 오프라인 지원 (Local Outbox)

```typescript
// 네트워크 없을 때 로컬 저장
const eventOutbox = {
  queue: [] as Event[],

  enqueue(event: Event) {
    this.queue.push(event);
    AsyncStorage.setItem('outbox', JSON.stringify(this.queue));
  },

  async syncWhenOnline() {
    // 네트워크 복구 시 자동 동기화
  }
};
```

### 3. 알림톡 자동 발송

출석 체크 시 학부모에게 자동 알림톡 발송

```typescript
// 출석 완료 시 자동 실행
await sendAttendanceNotification({
  parentPhone: student.parentPhone, // 서버에서만 사용, UI에 노출 안함
  studentName: student.name,
  lessonName: lesson.name,
  checkInTime: new Date().toLocaleTimeString(),
  location: lesson.location,
});
```

---

## 🎨 UI 컴포넌트

### 허용된 컴포넌트

| 컴포넌트 | 용도 |
|----------|------|
| `PrimaryButton` | 수업 시작/종료 |
| `SecondaryButton` | QR 스캔, 영상 촬영 |
| `IncidentButton` | 사고 신고 |
| `LessonCard` | 수업 카드 표시 |
| `StudentAvatar` | 학생 프로필 |
| `StatusBadge` | 상태 표시 |

### 금지된 컴포넌트

| 컴포넌트 | 이유 |
|----------|------|
| `ParentContactButton` | 학부모 연락처 노출 |
| `DirectCallButton` | 직접 통화 기능 |

---

## 📊 데이터 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Coach     │────▶│  Local      │────▶│  Server     │
│   Action    │     │  Outbox     │     │  Sync       │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      │                   │                   │
      ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Optimistic  │     │  Offline    │     │  Alimtalk   │
│ UI Update   │     │  Storage    │     │  to Parent  │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 📝 Audit 체크리스트

코드 검증 시 확인할 항목:

```bash
# 금지 패턴 검사
- [ ] parentPhone 사용 금지 (UI에서)
- [ ] parentEmail 사용 금지 (UI에서)
- [ ] ParentContactButton 컴포넌트 금지

# 필수 패턴 검사
- [ ] 상태 머신 구현 (SCHEDULED | IN_PROGRESS | COMPLETED)
- [ ] IncidentButton 포함
- [ ] Local Outbox 구현
```

---

## 🚀 구현 우선순위

1. **P0 (필수)**
   - 단일 화면 (TodayScreen)
   - 상태 머신
   - 수업 시작/종료 버튼
   - QR 출석 스캔

2. **P1 (중요)**
   - 사고 신고 버튼
   - 알림톡 자동 발송
   - 영상 촬영

3. **P2 (선택)**
   - 오프라인 지원
   - 푸시 알림

---

*버전: 1.0*
*최종 수정: 2026-02-04*
