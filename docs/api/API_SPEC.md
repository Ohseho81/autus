# 🔌 AUTUS API 스펙 문서

> Version: 1.0.0 (MVP)  
> Base URL: `https://api.autus.app/v1`

---

## 📋 목차

1. [인증](#1-인증)
2. [학생 관리](#2-학생-관리)
3. [기록 (Quick Tag)](#3-기록-quick-tag)
4. [Risk Queue](#4-risk-queue)
5. [메시지](#5-메시지)
6. [리포트](#6-리포트)
7. [게이미피케이션](#7-게이미피케이션)
8. [알림](#8-알림)

---

## 1. 인증

### 1.1 로그인

```http
POST /auth/login
```

**Request:**
```json
{
  "email": "teacher@academy.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "YOUR_ACCESS_TOKEN_HERE",
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE",
    "expiresIn": 3600,
    "user": {
      "id": "user_123",
      "email": "teacher@academy.com",
      "name": "김선생님",
      "role": "EXECUTOR",
      "academyId": "academy_001"
    }
  }
}
```

### 1.2 토큰 갱신

```http
POST /auth/refresh
```

**Request:**
```json
{
  "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
}
```

### 1.3 로그아웃

```http
POST /auth/logout
Authorization: Bearer {accessToken}
```

---

## 2. 학생 관리

### 2.1 학생 목록 조회

```http
GET /students
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | 페이지 번호 (default: 1) |
| limit | number | 페이지당 항목 수 (default: 20) |
| search | string | 이름 검색 |
| classId | string | 반 필터 |
| temperatureMin | number | 최소 온도 필터 |
| temperatureMax | number | 최대 온도 필터 |
| status | string | 상태 필터 (active, at_risk, stable) |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "student_001",
        "name": "김민수",
        "grade": "초등 5학년",
        "classId": "class_001",
        "className": "초등 3반",
        "temperature": 78,
        "temperatureEmoji": "😊",
        "sigma": 0.85,
        "status": "stable",
        "streak": 15,
        "lastRecordAt": "2026-01-24T09:30:00Z",
        "parentName": "김영희",
        "parentPhone": "010-1234-5678",
        "createdAt": "2025-03-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 132,
      "totalPages": 7
    }
  }
}
```

### 2.2 학생 상세 조회

```http
GET /students/{studentId}
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "student_001",
    "name": "김민수",
    "grade": "초등 5학년",
    "birthday": "2015-05-15",
    "dream": "게임 개발자",
    "temperature": 78,
    "temperatureHistory": [
      { "date": "2026-01-17", "value": 72 },
      { "date": "2026-01-18", "value": 74 },
      { "date": "2026-01-19", "value": 75 },
      { "date": "2026-01-20", "value": 76 },
      { "date": "2026-01-21", "value": 78 }
    ],
    "sigma": 0.85,
    "sigmaFactors": {
      "attendance": 0.95,
      "homework": 0.80,
      "attitude": 0.90,
      "parentEngagement": 0.75,
      "paymentHistory": 1.0
    },
    "stats": {
      "level": 12,
      "xp": 1850,
      "streak": 15,
      "badgeCount": 8,
      "homeworkCompletionRate": 0.85
    },
    "recentRecords": [...],
    "parent": {
      "id": "parent_001",
      "name": "김영희",
      "phone": "010-1234-5678",
      "email": "parent@email.com"
    }
  }
}
```

### 2.3 학생 등록

```http
POST /students
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "name": "박지민",
  "grade": "초등 4학년",
  "birthday": "2016-03-20",
  "classId": "class_002",
  "parent": {
    "name": "박철수",
    "phone": "010-9876-5432",
    "email": "parent2@email.com"
  }
}
```

### 2.4 학생 정보 수정

```http
PATCH /students/{studentId}
Authorization: Bearer {accessToken}
```

---

## 3. 기록 (Quick Tag)

### 3.1 기록 생성

```http
POST /records
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "studentId": "student_001",
  "emotion": 15,
  "bond": "strong",
  "tags": ["attitude", "progress"],
  "memo": "오늘 수업에서 질문을 많이 했어요. 적극적인 모습이 보여요!",
  "isPositive": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "record_001",
    "studentId": "student_001",
    "teacherId": "teacher_001",
    "emotion": 15,
    "bond": "strong",
    "tags": ["attitude", "progress"],
    "memo": "오늘 수업에서 질문을 많이 했어요...",
    "isPositive": true,
    "temperatureChange": 3,
    "newTemperature": 81,
    "xpEarned": 50,
    "createdAt": "2026-01-24T15:30:00Z"
  },
  "rewards": {
    "xp": 50,
    "streakUpdate": { "before": 14, "after": 15 },
    "badge": null
  }
}
```

### 3.2 기록 목록 조회

```http
GET /records
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| studentId | string | 학생 필터 |
| teacherId | string | 선생님 필터 |
| startDate | string | 시작 날짜 (YYYY-MM-DD) |
| endDate | string | 종료 날짜 (YYYY-MM-DD) |
| tags | string[] | 태그 필터 |

### 3.3 오늘 기록 현황

```http
GET /records/today
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "count": 5,
    "students": ["student_001", "student_002", ...],
    "streak": 15,
    "streakAtRisk": false,
    "xpToday": 250
  }
}
```

---

## 4. Risk Queue

### 4.1 관심 필요 학생 목록

```http
GET /risk-queue
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | pending, in_progress, resolved |
| teacherId | string | 담당 선생님 필터 |
| priority | string | critical, high, medium |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "id": "risk_001",
        "studentId": "student_001",
        "studentName": "김민수",
        "temperature": 36,
        "temperatureEmoji": "🥶",
        "reason": "비용 고민 언급",
        "detectedAt": "2026-01-23T10:00:00Z",
        "status": "pending",
        "priority": "critical",
        "churnProbability": 75,
        "suggestedAction": "오늘 수업 전 5분 대화 추천",
        "assignedTeacher": {
          "id": "teacher_001",
          "name": "김선생님"
        }
      }
    ],
    "summary": {
      "total": 5,
      "pending": 2,
      "inProgress": 2,
      "resolved": 1
    }
  }
}
```

### 4.2 조치 기록

```http
POST /risk-queue/{riskId}/action
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "action": "shield",
  "note": "어머니와 통화 완료. 다음 달까지 지켜보기로 함.",
  "followUpDate": "2026-02-01"
}
```

**Action Types:**
- `shield`: 먼저 챙기기 (Active Shield)
- `resolve`: 해결됨
- `escalate`: 상위 보고
- `dismiss`: 오탐 처리

---

## 5. 메시지

### 5.1 메시지 발송

```http
POST /messages
Authorization: Bearer {accessToken}
```

**Request:**
```json
{
  "recipientType": "parent",
  "recipientId": "parent_001",
  "studentId": "student_001",
  "templateId": "praise_general",
  "subject": "민수가 오늘 정말 잘했어요!",
  "body": "어머니 안녕하세요...",
  "channel": "push"
}
```

### 5.2 메시지 템플릿 목록

```http
GET /messages/templates
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | praise, update, concern, etc. |
| category | string | academic, behavior, attendance, etc. |

---

## 6. 리포트

### 6.1 학생 주간 리포트

```http
GET /reports/student/{studentId}/weekly
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "studentId": "student_001",
    "studentName": "김민수",
    "period": {
      "start": "2026-01-18",
      "end": "2026-01-24"
    },
    "attendance": {
      "total": 5,
      "present": 5,
      "late": 0,
      "absent": 0,
      "rate": 100
    },
    "homework": {
      "total": 5,
      "completed": 4,
      "rate": 80
    },
    "tests": [
      { "name": "단원평가", "score": 88, "change": 5 }
    ],
    "temperatureChange": {
      "start": 72,
      "end": 78,
      "change": 6
    },
    "teacherComment": "이번 주 민수가 정말 열심히 했어요!",
    "highlights": ["숙제 제출률 향상", "수업 태도 좋음"]
  }
}
```

### 6.2 학원 대시보드 데이터

```http
GET /reports/academy/dashboard
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "kpi": {
      "totalStudents": 132,
      "studentsChange": 3,
      "atRiskCount": 5,
      "atRiskChange": 2,
      "avgTemperature": 78,
      "temperatureChange": -3,
      "churnThisMonth": 2,
      "churnTarget": 5
    },
    "weeklyChange": {
      "atRisk": { "before": 5, "after": 3 },
      "avgTemperature": { "before": 74, "after": 78 },
      "recordRate": { "before": 65, "after": 82 },
      "unresolvedRisk": { "before": 8, "after": 2 }
    },
    "teacherStats": [...],
    "prediction": {
      "nextMonthChurn": 3,
      "revenueAtRisk": 1200000
    }
  }
}
```

---

## 7. 게이미피케이션

### 7.1 사용자 게임 상태

```http
GET /gamification/status
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userId": "user_001",
    "level": 12,
    "levelName": "전설",
    "xp": 8100,
    "xpToNextLevel": 150,
    "nextLevelXP": 2000,
    "streak": 25,
    "badges": [
      { "id": "streak_30", "name": "한 달의 기적", "earnedAt": "2026-01-15" }
    ],
    "recentXP": [
      { "action": "student_record", "xp": 50, "at": "2026-01-24T15:30:00Z" }
    ]
  }
}
```

### 7.2 뱃지 목록

```http
GET /gamification/badges
Authorization: Bearer {accessToken}
```

### 7.3 리더보드

```http
GET /gamification/leaderboard
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| period | string | daily, weekly, monthly, all_time |
| scope | string | class, academy, global |

---

## 8. 알림

### 8.1 알림 목록

```http
GET /notifications
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| unreadOnly | boolean | 읽지 않은 것만 |
| type | string | risk_alert, praise, milestone, etc. |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_001",
        "type": "risk_alert",
        "priority": "critical",
        "title": "🥶 김민수 학생 관심 필요",
        "body": "온도가 36°로 떨어졌어요.",
        "actionUrl": "/students/student_001",
        "readAt": null,
        "createdAt": "2026-01-24T10:00:00Z"
      }
    ],
    "unreadCount": 3
  }
}
```

### 8.2 알림 읽음 처리

```http
POST /notifications/{notificationId}/read
Authorization: Bearer {accessToken}
```

### 8.3 모든 알림 읽음

```http
POST /notifications/read-all
Authorization: Bearer {accessToken}
```

---

## 🔐 에러 응답

모든 에러는 다음 형식을 따릅니다:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증이 필요합니다.",
    "details": {}
  }
}
```

**에러 코드:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | 인증 필요 |
| FORBIDDEN | 403 | 권한 없음 |
| NOT_FOUND | 404 | 리소스 없음 |
| VALIDATION_ERROR | 400 | 입력 검증 실패 |
| RATE_LIMITED | 429 | 요청 제한 초과 |
| INTERNAL_ERROR | 500 | 서버 에러 |

---

## 📡 웹소켓 API

### 연결

```javascript
const ws = new WebSocket('wss://api.autus.app/v1/ws?token={accessToken}');
```

### 이벤트 타입

| Event | Description |
|-------|-------------|
| `student:temperature_changed` | 학생 온도 변경 |
| `risk:new` | 새 관심 필요 학생 |
| `risk:resolved` | 관심 필요 해결 |
| `notification:new` | 새 알림 |
| `gamification:xp_earned` | XP 획득 |
| `gamification:level_up` | 레벨업 |

---

*Build on the Rock. 🏛️*
