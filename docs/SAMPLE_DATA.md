# 📊 AUTUS 샘플 데이터 & 데모 시나리오

> 영업/데모용 샘플 데이터 세트

---

## 🏫 가상 학원: "AUTUS 수학학원"

### 기본 정보

```json
{
  "academy": {
    "id": "academy_demo",
    "name": "AUTUS 수학학원",
    "location": "서울시 강남구",
    "foundedYear": 2018,
    "totalStudents": 132,
    "totalTeachers": 5,
    "monthlyRevenue": 15200000,
    "owner": "김원장",
    "manager": "이실장"
  }
}
```

---

## 👨‍🏫 선생님 데이터

```json
{
  "teachers": [
    {
      "id": "teacher_001",
      "name": "김선생님",
      "role": "EXECUTOR",
      "studentCount": 35,
      "avgTemperature": 82,
      "streak": 25,
      "level": 6,
      "xp": 8500,
      "recordCount": 156,
      "riskResolved": 12
    },
    {
      "id": "teacher_002",
      "name": "이선생님",
      "role": "EXECUTOR",
      "studentCount": 42,
      "avgTemperature": 76,
      "streak": 3,
      "level": 4,
      "xp": 4200,
      "recordCount": 89,
      "riskResolved": 5,
      "warning": "기록률 저조"
    },
    {
      "id": "teacher_003",
      "name": "박선생님",
      "role": "EXECUTOR",
      "studentCount": 28,
      "avgTemperature": 85,
      "streak": 40,
      "level": 7,
      "xp": 12000,
      "recordCount": 245,
      "riskResolved": 18
    },
    {
      "id": "teacher_004",
      "name": "최선생님",
      "role": "EXECUTOR",
      "studentCount": 15,
      "avgTemperature": 79,
      "streak": 12,
      "level": 3,
      "xp": 2800,
      "recordCount": 67,
      "riskResolved": 4
    },
    {
      "id": "teacher_005",
      "name": "정선생님",
      "role": "EXECUTOR",
      "studentCount": 12,
      "avgTemperature": 80,
      "streak": 8,
      "level": 2,
      "xp": 1500,
      "recordCount": 45,
      "riskResolved": 2
    }
  ]
}
```

---

## 🎒 학생 데이터 (주요 케이스)

### Case 1: 🥶 위험 학생 (김민수)

```json
{
  "id": "student_001",
  "name": "김민수",
  "grade": "초등 5학년",
  "className": "초등 3반",
  "teacherId": "teacher_001",
  "temperature": 36,
  "emoji": "🥶",
  "sigma": 0.45,
  "status": "at_risk",
  "churnProbability": 75,
  
  "temperatureHistory": [
    { "date": "2026-01-10", "value": 72 },
    { "date": "2026-01-11", "value": 68 },
    { "date": "2026-01-12", "value": 65 },
    { "date": "2026-01-13", "value": 58 },
    { "date": "2026-01-14", "value": 52 },
    { "date": "2026-01-15", "value": 45 },
    { "date": "2026-01-16", "value": 40 },
    { "date": "2026-01-17", "value": 36 }
  ],
  
  "sigmaFactors": {
    "attendance": 0.60,
    "homework": 0.40,
    "attitude": 0.35,
    "parentEngagement": 0.30,
    "paymentHistory": 0.80
  },
  
  "recentRecords": [
    {
      "date": "2026-01-17",
      "emotion": -15,
      "bond": "cold",
      "tags": ["비용", "태도"],
      "memo": "어머니가 학원비 부담스럽다고 언급. 민수도 의욕 없어 보임."
    }
  ],
  
  "riskReasons": [
    "학부모가 비용 고민 언급 (1/17)",
    "3회 연속 지각",
    "숙제 미제출 증가 (4건/주)",
    "수업 태도 변화 (소극적)"
  ],
  
  "suggestedAction": "오늘 수업 전 5분 대화 추천. 어머니께 긍정적인 피드백 메시지 발송.",
  
  "parent": {
    "name": "김영희",
    "phone": "010-1234-5678",
    "lastContact": "2026-01-10"
  }
}
```

### Case 2: 😊 안정 학생 (이서연)

```json
{
  "id": "student_002",
  "name": "이서연",
  "grade": "초등 4학년",
  "className": "초등 2반",
  "teacherId": "teacher_003",
  "temperature": 88,
  "emoji": "😊",
  "sigma": 0.92,
  "status": "stable",
  "churnProbability": 5,
  
  "temperatureHistory": [
    { "date": "2026-01-10", "value": 82 },
    { "date": "2026-01-11", "value": 83 },
    { "date": "2026-01-12", "value": 85 },
    { "date": "2026-01-13", "value": 85 },
    { "date": "2026-01-14", "value": 86 },
    { "date": "2026-01-15", "value": 87 },
    { "date": "2026-01-16", "value": 88 },
    { "date": "2026-01-17", "value": 88 }
  ],
  
  "sigmaFactors": {
    "attendance": 0.98,
    "homework": 0.95,
    "attitude": 0.90,
    "parentEngagement": 0.85,
    "paymentHistory": 1.0
  },
  
  "stats": {
    "level": 15,
    "xp": 12500,
    "streak": 45,
    "badgeCount": 12,
    "homeworkCompletionRate": 0.95
  },
  
  "recentRecords": [
    {
      "date": "2026-01-17",
      "emotion": 18,
      "bond": "strong",
      "tags": ["성적향상", "태도좋음"],
      "memo": "오늘 단원평가 95점! 본인도 뿌듯해하며 다음 목표 세움."
    }
  ],
  
  "parent": {
    "name": "이정희",
    "phone": "010-2345-6789",
    "lastContact": "2026-01-17"
  }
}
```

### Case 3: 😰 관심 필요 (박준혁)

```json
{
  "id": "student_003",
  "name": "박준혁",
  "grade": "초등 6학년",
  "className": "초등 4반",
  "teacherId": "teacher_002",
  "temperature": 52,
  "emoji": "😰",
  "sigma": 0.55,
  "status": "attention",
  "churnProbability": 45,
  
  "temperatureHistory": [
    { "date": "2026-01-10", "value": 70 },
    { "date": "2026-01-11", "value": 68 },
    { "date": "2026-01-12", "value": 65 },
    { "date": "2026-01-13", "value": 60 },
    { "date": "2026-01-14", "value": 58 },
    { "date": "2026-01-15", "value": 55 },
    { "date": "2026-01-16", "value": 53 },
    { "date": "2026-01-17", "value": 52 }
  ],
  
  "sigmaFactors": {
    "attendance": 0.70,
    "homework": 0.55,
    "attitude": 0.50,
    "parentEngagement": 0.40,
    "paymentHistory": 0.95
  },
  
  "riskReasons": [
    "2주간 온도 하락 추세 (-18°)",
    "수업 중 집중력 저하",
    "학부모 연락 2주간 없음"
  ],
  
  "suggestedAction": "학부모 연락 시도 + 다음 수업 시 개별 면담 5분",
  
  "parent": {
    "name": "박철수",
    "phone": "010-3456-7890",
    "lastContact": "2026-01-03"
  }
}
```

---

## 🚨 Risk Queue 샘플

```json
{
  "riskQueue": [
    {
      "id": "risk_001",
      "studentId": "student_001",
      "studentName": "김민수",
      "temperature": 36,
      "emoji": "🥶",
      "churnProbability": 75,
      "status": "pending",
      "priority": "critical",
      "detectedAt": "2026-01-17T09:00:00Z",
      "reason": "비용 고민 + 연속 지각 + 숙제 미제출",
      "suggestedAction": "오늘 수업 전 5분 대화 추천",
      "assignedTeacher": "김선생님"
    },
    {
      "id": "risk_002",
      "studentId": "student_003",
      "studentName": "박준혁",
      "temperature": 52,
      "emoji": "😰",
      "churnProbability": 45,
      "status": "in_progress",
      "priority": "high",
      "detectedAt": "2026-01-16T14:00:00Z",
      "reason": "온도 하락 추세 + 학부모 연락 두절",
      "suggestedAction": "학부모 연락 시도",
      "assignedTeacher": "이선생님",
      "action": {
        "type": "shield",
        "note": "어머니께 전화 완료. 다음 주 상담 예약.",
        "actionAt": "2026-01-17T10:30:00Z"
      }
    },
    {
      "id": "risk_003",
      "studentId": "student_007",
      "studentName": "최유진",
      "temperature": 58,
      "emoji": "😰",
      "churnProbability": 35,
      "status": "pending",
      "priority": "medium",
      "detectedAt": "2026-01-17T11:00:00Z",
      "reason": "숙제 미제출 3회 연속",
      "suggestedAction": "수업 중 숙제 이유 확인",
      "assignedTeacher": "박선생님"
    }
  ],
  "summary": {
    "total": 5,
    "pending": 3,
    "inProgress": 1,
    "resolved": 1
  }
}
```

---

## 📊 대시보드 KPI 샘플

```json
{
  "kpi": {
    "totalStudents": {
      "value": 132,
      "change": 3,
      "trend": "up"
    },
    "atRiskCount": {
      "value": 5,
      "change": 2,
      "trend": "up",
      "isAlert": true
    },
    "avgTemperature": {
      "value": 78,
      "change": -3,
      "trend": "down"
    },
    "churnThisMonth": {
      "value": 2,
      "target": 5,
      "status": "on_track"
    }
  },
  
  "weeklyChange": {
    "atRisk": { "before": 5, "after": 3, "isGood": true },
    "avgTemperature": { "before": 74, "after": 78, "isGood": true },
    "recordRate": { "before": 65, "after": 82, "isGood": true },
    "unresolvedRisk": { "before": 8, "after": 2, "isGood": true }
  },
  
  "teacherStats": [
    { "name": "김선생님", "studentCount": 35, "avgTemp": 82, "attention": 2, "records": 12 },
    { "name": "이선생님", "studentCount": 42, "avgTemp": 76, "attention": 2, "records": 3, "warning": true },
    { "name": "박선생님", "studentCount": 28, "avgTemp": 85, "attention": 1, "records": 18 },
    { "name": "최선생님", "studentCount": 15, "avgTemp": 79, "attention": 0, "records": 8 },
    { "name": "정선생님", "studentCount": 12, "avgTemp": 80, "attention": 0, "records": 5 }
  ],
  
  "weekDefense": {
    "prevented": 3,
    "revenueProtected": 1200000
  }
}
```

---

## 🎒 학생용 샘플 데이터

```json
{
  "studentView": {
    "id": "student_002",
    "name": "서연",
    "level": 15,
    "levelName": "베테랑",
    "currentXP": 12500,
    "nextLevelXP": 15000,
    "streak": 45,
    
    "todayMission": {
      "what": "분수 복습 문제 15개 풀기",
      "how": [
        "먼저 통분하기",
        "분자끼리 계산하기",
        "약분해서 정리하기"
      ],
      "why": "이거 완전히 마스터하면 다음 주부터 방정식 시작할 수 있어!",
      "estimatedTime": "40분",
      "xpReward": 75,
      "badgeReward": "분수 마스터"
    },
    
    "dreamRoadmap": {
      "dream": "수의사",
      "dreamIcon": "🐾",
      "steps": [
        { "title": "수학 기초", "timeline": "완료", "isCompleted": true },
        { "title": "중학교 수학", "timeline": "지금", "isCurrent": true },
        { "title": "과학 심화", "timeline": "6개월 후", "isCompleted": false },
        { "title": "생물학 기초", "timeline": "1년 후", "isCompleted": false }
      ],
      "motivationMessage": "이 속도면 중학교 가기 전에 선행 완료 가능해!"
    },
    
    "badges": [
      { "id": "streak_30", "name": "한 달의 기적", "icon": "🔥", "rarity": "epic", "earnedAt": "2026-01-10" },
      { "id": "homework_master", "name": "숙제왕", "icon": "📝", "rarity": "rare", "earnedAt": "2026-01-05" },
      { "id": "score_improver", "name": "성장의 증거", "icon": "📈", "rarity": "rare", "earnedAt": "2025-12-20" },
      { "id": "perfect_attendance", "name": "개근상", "icon": "🏅", "rarity": "epic", "earnedAt": "2025-12-31" }
    ],
    
    "weeklyRanking": [
      { "rank": 1, "name": "이서연", "xp": 450, "isMe": true },
      { "rank": 2, "name": "박지민", "xp": 380, "isMe": false },
      { "rank": 3, "name": "김태희", "xp": 320, "isMe": false }
    ]
  }
}
```

---

## 📈 영업용 데모 시나리오

### 시나리오 1: "이탈 방지 데모"

```
1. 대시보드 열기
   → KPI 4개 확인 (관심 필요 5명 강조)

2. Risk Queue 클릭
   → 김민수 학생 카드 확인 (온도 36°, 이탈 확률 75%)
   → "비용 고민 + 연속 지각" 이유 확인
   → AI 추천: "오늘 수업 전 5분 대화"

3. Quick Tag 데모
   → 김민수 선택 → 감정/유대관계 입력 → 30초 완료
   → "+50 XP" 애니메이션
   → "기록 완료! 온도가 +3° 올랐어요"

4. 결과 강조
   → "이 학생을 지금 챙기지 않았다면?"
   → "월 30만원 × 12개월 = 360만원 손실"
   → "AUTUS가 2주 전에 알려드렸어요"
```

### 시나리오 2: "선생님 동기부여 데모"

```
1. 선생님 대시보드 열기
   → 🔥 25일 연속 기록! 강조
   → "오늘 할 일 3/5 완료" 프로그레스 바

2. "이번 주 나의 효과" 섹션
   → 김민수 36° → 68° (+32°)
   → "선생님 덕분에 3명이 안정됐어요!"

3. 학부모 감사 메시지
   → "민수가 요즘 학원 가기 좋아해요" - 김영희 어머니

4. 결과 강조
   → "선생님의 30초 기록이 이런 결과를 만들었어요"
   → "내 행동 → 학생 변화 = 보람"
```

### 시나리오 3: "원장 의사결정 데모"

```
1. 원장 대시보드 열기
   → 목표 달성률 게이지 (88%)
   → 30일 예측 그래프

2. 결정 필요 항목
   → "수강료 10% 인상 제안"
   → AI 시뮬레이션: +12% 매출, -8명 이탈 예상
   → [승인] 버튼 클릭

3. 지난 결정 결과
   → "신규 반 개설" → 18명 등록, +720만 → "좋은 결정!"
   → 결정 성공률: 87%

4. 결과 강조
   → "데이터 기반 의사결정"
   → "예측 → 결정 → 검증 사이클"
```

---

## 🔑 데모 핵심 메시지

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  "AUTUS는 이탈을 예측하고, 행동을 유도하고, 결과를 증명합니다" │
│                                                                 │
│  예측: 김민수 이탈 확률 75% (2주 전 알림)                      │
│  행동: Quick Tag 30초 기록 + AI 추천 조치                      │
│  결과: 이탈 방지 = ₩360만 매출 유지                            │
│                                                                 │
│  "학원의 미래를 예측하고, 지금 행동하세요"                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*Build on the Rock. 🏛️*
