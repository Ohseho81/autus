# AUTUS 역할별 정보 매트릭스

## 🎭 역할 구조 (5개 역할)

| 역할 | 한글명 | 레벨 | 핵심 질문 | 도파민 설계 |
|-----|-------|------|----------|------------|
| **DECIDER** | 원장 | K5~K7 | "앞으로 어떻게 될까요?" | 자기 효능감 |
| **OPERATOR** | 매니저 | K3~K5 | "전체 상황이 어때요?" | 통제감/안정감 |
| **EXECUTOR** | 선생님 | K1~K2 | "지금 뭐 해야 해요?" | 성취감/연속성 |
| **CONSUMER** | 학부모 | External | "우리 아이 얼마나 성장?" | 안심/자부심 |
| **STUDENT** | 학생 | External | "오늘 뭐 해?" | 재미/보상 |

---

## 📊 역할별 필요 정보

### 👑 DECIDER (원장)

**First View 우선순위:**
1. 목표 달성률 게이지
2. 30일 예측 그래프
3. 결정 필요 항목
4. 매출 현황/예상

| 정보 요소 | 데이터 | 표시 형태 |
|----------|-------|----------|
| 목표 달성률 | current, target, prediction | 게이지 + 예측일 |
| 예측 그래프 | 30일 값 배열 | 라인 차트 |
| 결정 항목 | 제목, 긍정/부정 결과, AI 권장 | 카드 + 승인/거부 |
| 결정 기록 | 과거 결정, 날짜, 결과 | 타임라인 |
| 유산 | 배출학생, SKY, 의대, 추천율 | 숫자 카드 |
| KPI | 결정 성공률 | 퍼센트 뱃지 |

**데이터 타입:**
```typescript
Goal { id, title, current, target, unit, prediction, trend, hasWarning }
Decision { id, title, positiveOutcome, negativeOutcome, recommendation }
Legacy { totalStudents, skyAdmissions, medicalAdmissions, recommendationRate }
```

---

### ⚙️ OPERATOR (매니저)

**First View 우선순위:**
1. 핵심 KPI 4개
2. 이번 주 변화량
3. 관심 필요 학생 목록
4. 선생님별 현황

| 정보 요소 | 데이터 | 표시 형태 |
|----------|-------|----------|
| 핵심 KPI | 전체학생, 관심필요, 평균온도, 이탈 | 4개 스탯 카드 |
| 주간 변화 | before → after | 비교 카드 |
| 관심 학생 | 이름, 온도, 담당, 상태 | 리스트 |
| 선생님 현황 | 이름, 학생수, 평균온도, 기록수 | 테이블 |
| 방어 성공 | 방지 인원, 손실 방지 금액 | 축하 배너 |

**데이터 타입:**
```typescript
KPIStat { icon, label, value, change, isGood, subtext, isAlert }
WeeklyChange { metric, before, after, unit, isGood }
AttentionStudent { id, name, temperature, emoji, reason, teacherName, status }
TeacherStatus { name, studentCount, avgTemperature, attentionCount, recordCount }
```

---

### 🔨 EXECUTOR (선생님)

**First View 우선순위:**
1. 관심 필요 학생 (바로 조치)
2. 오늘 수업 일정
3. 바로 기록 버튼
4. 연속 기록 뱃지

| 정보 요소 | 데이터 | 표시 형태 |
|----------|-------|----------|
| 관심 학생 | 이름, 온도, 이유, AI 추천 | 액션 카드 |
| 오늘 일정 | 시간, 반이름, 인원, 알림 | 타임라인 |
| 진행률 | 완료/전체 | 링 차트 |
| 연속 기록 | 일수, 다음 마일스톤 | 뱃지 |
| 주간 효과 | 학생별 온도 변화 | 피드백 카드 |

**데이터 타입:**
```typescript
AttentionStudent { id, name, temperature, emoji, reason, suggestion }
ClassSchedule { time, name, studentCount, alerts }
StreakInfo { days, nextMilestone }
```

---

### 👨‍👩‍👧 CONSUMER (학부모)

**First View 우선순위:**
1. 성장 곡선
2. 현재 상태 (별점)
3. 이번 주 리포트
4. 선생님 메시지

| 정보 요소 | 데이터 | 표시 형태 |
|----------|-------|----------|
| 성장 곡선 | 월별 점수 배열 | 라인 차트 |
| 현재 상태 | 3개 항목 별점 | 별점 (⭐) |
| 안정성 | 상태, 메시지 | 컬러 배지 |
| 이번 주 | 출석, 숙제, 테스트 | 숫자 카드 |
| 또래 비교 | 평균 대비 점수 | 비교 텍스트 |
| 선생님 메시지 | 이름, 내용, 시간 | 말풍선 |

**데이터 타입:**
```typescript
GrowthData { month, score }
StatusItem { label, stars, description }
WeeklyReport { attendance, homework, testScore }
TeacherMessage { teacherName, message, time }
```

---

### 🎒 STUDENT (학생)

**First View 우선순위:**
1. 오늘 미션
2. 획득 뱃지/포인트
3. 랭킹
4. 보상 상점

| 정보 요소 | 데이터 | 표시 형태 |
|----------|-------|----------|
| 오늘 미션 | 미션명, 보상, 진행도 | 체크리스트 |
| 포인트 | 현재, 다음레벨까지 | 프로그레스 |
| 뱃지 | 획득 뱃지 목록 | 아이콘 그리드 |
| 랭킹 | 순위, 점수, 변화 | 리더보드 |
| 보상 | 상품, 필요포인트 | 상점 카드 |

---

## 🔧 UI 최적화 원칙

### 1. 카드 1장 규칙
- 메인 콘텐츠: `max-w-lg` (512px)
- 한 번에 1개 카드만 표시
- 스크롤/스와이프로 다음 카드

### 2. 역할별 깊이 차등
| 역할 | 정보 깊이 | 숨기는 것 |
|-----|---------|----------|
| Owner | 전략 수준 | 과정, 세부 실행 |
| Manager | 관리 수준 | 원인, 해결법 |
| Teacher | 실행 수준 | 분석, 예측 |
| Parent | 소비자 수준 | 학원 내부 운영 |

### 3. 2대 엔진 시스템
- **ENGINE A**: 역할별 UI 컴포넌트
- **ENGINE B**: 예측/결론/경고 표시 여부

| 역할 | ENGINE A (UI) | ENGINE B (표시) |
|-----|--------------|-----------------|
| DECIDER | AssetStatusCard | 결론 O |
| OPERATOR | TaskMatrix | 예측 O |
| EXECUTOR | NextActionCard | 경고 O |
| CONSUMER | ProofViewer | 모두 X |

---

## 📡 데이터 소스

### Supabase 테이블 (예상)
- `students` - 학생 정보, 온도
- `teachers` - 선생님 정보
- `records` - 기록/상담 이력
- `goals` - 목표 설정
- `decisions` - 의사결정 기록
- `notifications` - 알림

### 실시간 데이터
- 학생 온도 변화
- 오늘 수업 일정
- 관심 필요 학생 알림

### 집계 데이터
- 주간/월간 통계
- 목표 달성률
- 이탈 예측

---

*Generated: 2026-01-29*
