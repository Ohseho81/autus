# n8n → Vercel Edge Webhook 설정 가이드

> AUTUS Day 2: n8n 직결 설정

---

## 🎯 개요

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   n8n Workflow  ──→  Vercel Edge API  ──→  Supabase        │
│                      (HMAC 검증)           (데이터 저장)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Vercel 환경변수 설정

### Vercel Dashboard에서 설정

```
N8N_WEBHOOK_SECRET = autus-n8n-secret-2026
```

**설정 방법:**
1. Vercel Dashboard → Project Settings → Environment Variables
2. `N8N_WEBHOOK_SECRET` 추가
3. 값: 원하는 비밀키 입력 (예: `autus-n8n-secret-2026`)
4. Save → Redeploy

---

## 2. n8n HTTP Request 노드 설정

### 기본 설정

```json
{
  "method": "POST",
  "url": "https://vercel-ozjbzhkf1-ohsehos-projects.vercel.app/api/webhook/n8n",
  "authentication": "none",
  "sendHeaders": true,
  "headerParameters": {
    "parameters": [
      {
        "name": "Content-Type",
        "value": "application/json"
      },
      {
        "name": "X-Webhook-Secret",
        "value": "={{$env.N8N_WEBHOOK_SECRET}}"
      }
    ]
  },
  "sendBody": true,
  "bodyParameters": {
    "parameters": []
  },
  "options": {
    "timeout": 30000
  }
}
```

### n8n 환경변수 설정

n8n Dashboard → Settings → Variables에서:

```
N8N_WEBHOOK_SECRET = autus-n8n-secret-2026
```

---

## 3. 이벤트 타입별 Payload 형식

### 3.1 ERP 동기화 (erp_sync)

```json
{
  "event_type": "erp_sync",
  "source": "hagnara_sync_workflow",
  "timestamp": "2026-01-20T12:00:00Z",
  "data": {
    "academy_id": "uuid-xxx",
    "students": [
      {
        "id": "student-uuid",
        "name": "김민준",
        "grade": "중2",
        "attendance_rate": 95.0,
        "homework_rate": 90.0
      }
    ],
    "academy_metrics": {
      "revenue": 5000000,
      "costs": 3000000,
      "satisfaction": 85
    }
  }
}
```

### 3.2 결제 완료 (payment_received)

```json
{
  "event_type": "payment_received",
  "source": "toss_payment_webhook",
  "timestamp": "2026-01-20T12:00:00Z",
  "data": {
    "academy_id": "uuid-xxx",
    "student_id": "student-uuid",
    "amount": 350000,
    "payment_method": "card",
    "transaction_id": "toss-tx-123"
  }
}
```

### 3.3 미납 발생 (payment_overdue)

```json
{
  "event_type": "payment_overdue",
  "source": "payment_check_workflow",
  "timestamp": "2026-01-20T12:00:00Z",
  "data": {
    "academy_id": "uuid-xxx",
    "student_id": "student-uuid",
    "student_name": "강민서",
    "amount_due": 350000,
    "days_overdue": 15,
    "due_date": "2026-01-05"
  }
}
```

### 3.4 출결 업데이트 (attendance_update)

```json
{
  "event_type": "attendance_update",
  "source": "daily_attendance_sync",
  "timestamp": "2026-01-20T12:00:00Z",
  "data": {
    "student_id": "student-uuid",
    "attendance_rate": 75.0,
    "recent_absences": 3,
    "period": "2026-01-13 ~ 2026-01-20"
  }
}
```

### 3.5 성적 업데이트 (grade_update)

```json
{
  "event_type": "grade_update",
  "source": "exam_result_sync",
  "timestamp": "2026-01-20T12:00:00Z",
  "data": {
    "student_id": "student-uuid",
    "exam_name": "1월 모의고사",
    "previous_score": 85,
    "current_score": 72,
    "grade_trend": -13
  }
}
```

### 3.6 퇴원 위험 알림 (churn_alert)

```json
{
  "event_type": "churn_alert",
  "source": "daily_churn_check",
  "timestamp": "2026-01-20T12:00:00Z",
  "data": {
    "academy_id": "uuid-xxx",
    "student_id": "student-uuid",
    "student_name": "윤지우",
    "risk_score": 202,
    "risk_level": "critical",
    "risk_factors": ["출석률 60%", "숙제제출 30%", "미납 30일+"]
  }
}
```

### 3.7 경쟁사 변화 (competitor_change)

```json
{
  "event_type": "competitor_change",
  "source": "competitor_monitor",
  "timestamp": "2026-01-20T12:00:00Z",
  "data": {
    "name": "ABC 영어학원",
    "change_type": "new_opening",
    "category": "영어",
    "latitude": 37.4970,
    "longitude": 127.0700,
    "rating": 4.3,
    "review_count": 15,
    "threat_score": 0.7
  }
}
```

### 3.8 뉴스 알림 (news_alert)

```json
{
  "event_type": "news_alert",
  "source": "edu_news_monitor",
  "timestamp": "2026-01-20T12:00:00Z",
  "data": {
    "title": "2027학년도 수능 개편안 발표",
    "link": "https://news.example.com/...",
    "source": "교육부",
    "published_at": "2026-01-20T09:00:00Z",
    "category": "policy",
    "sentiment": 0.2,
    "impact_score": 0.8
  }
}
```

---

## 4. n8n 워크플로우 예시

### 학원나라 → AUTUS 동기화

```
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│  Schedule  │───▶│  학원나라  │───▶│  Transform │───▶│ HTTP POST  │
│  (매일)    │    │  API 호출  │    │  to AUTUS  │    │ to Vercel  │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
```

### 워크플로우 JSON

```json
{
  "name": "학원나라 → AUTUS 동기화",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{ "field": "hours", "hoursInterval": 1 }]
        }
      },
      "name": "매시간 실행",
      "type": "n8n-nodes-base.scheduleTrigger"
    },
    {
      "parameters": {
        "url": "https://api.hagnara.com/students",
        "authentication": "predefinedCredentialType",
        "method": "GET"
      },
      "name": "학원나라 학생 데이터",
      "type": "n8n-nodes-base.httpRequest"
    },
    {
      "parameters": {
        "functionCode": "return items.map(item => ({\n  json: {\n    event_type: 'erp_sync',\n    source: 'hagnara_sync',\n    timestamp: new Date().toISOString(),\n    data: {\n      students: item.json.students,\n      academy_id: $env.ACADEMY_ID\n    }\n  }\n}));"
      },
      "name": "AUTUS 형식 변환",
      "type": "n8n-nodes-base.function"
    },
    {
      "parameters": {
        "url": "https://vercel-ozjbzhkf1-ohsehos-projects.vercel.app/api/webhook/n8n",
        "method": "POST",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            { "name": "Content-Type", "value": "application/json" },
            { "name": "X-Webhook-Secret", "value": "={{$env.N8N_WEBHOOK_SECRET}}" }
          ]
        },
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            { "name": "={{JSON.stringify($json)}}", "value": "" }
          ]
        }
      },
      "name": "AUTUS Webhook",
      "type": "n8n-nodes-base.httpRequest"
    }
  ]
}
```

---

## 5. 에러 처리 & Dead Letter Queue

### 실패 시 자동 DLQ 저장

실패한 웹훅은 자동으로 `dead_letter_queue` 테이블에 저장됩니다.

### DLQ 확인 쿼리

```sql
-- 미해결 실패 이벤트 확인
SELECT 
    event_type,
    source,
    error_message,
    retry_count,
    created_at
FROM dead_letter_queue
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### DLQ 재시도

```sql
-- 수동 재시도를 위해 상태 변경
UPDATE dead_letter_queue
SET status = 'retrying', next_retry_at = NOW()
WHERE id = 'dlq-uuid';
```

---

## 6. 테스트

### cURL 테스트

```bash
# 1. Webhook 상태 확인
curl https://vercel-ozjbzhkf1-ohsehos-projects.vercel.app/api/webhook/n8n

# 2. ERP 동기화 테스트
curl -X POST https://vercel-ozjbzhkf1-ohsehos-projects.vercel.app/api/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: autus-n8n-secret-2026" \
  -d '{
    "event_type": "erp_sync",
    "source": "test",
    "timestamp": "2026-01-20T12:00:00Z",
    "data": {
      "academy_id": "test-academy",
      "students": [
        {"id": "s1", "name": "테스트학생", "attendance_rate": 95}
      ]
    }
  }'

# 3. 미납 알림 테스트
curl -X POST https://vercel-ozjbzhkf1-ohsehos-projects.vercel.app/api/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: autus-n8n-secret-2026" \
  -d '{
    "event_type": "payment_overdue",
    "source": "test",
    "timestamp": "2026-01-20T12:00:00Z",
    "data": {
      "student_id": "test-student",
      "student_name": "테스트학생",
      "days_overdue": 15,
      "amount_due": 350000
    }
  }'
```

---

## 7. 모니터링

### Webhook 로그 확인

```sql
SELECT 
    event_type,
    status,
    processing_time_ms,
    created_at
FROM webhook_logs
ORDER BY created_at DESC
LIMIT 20;
```

### 일일 통계

```sql
SELECT 
    DATE(created_at) as date,
    event_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'success') as success,
    COUNT(*) FILTER (WHERE status = 'failed') as failed,
    AVG(processing_time_ms) as avg_time_ms
FROM webhook_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), event_type
ORDER BY date DESC, total DESC;
```

---

## 8. 체크리스트

```
□ Vercel 환경변수 N8N_WEBHOOK_SECRET 설정
□ n8n 환경변수 N8N_WEBHOOK_SECRET 설정
□ n8n HTTP Request 노드 설정
□ cURL 테스트 성공
□ 실제 워크플로우 연결
□ DLQ 모니터링 설정
```

---

*AUTUS - n8n → Edge 직결 완료*
