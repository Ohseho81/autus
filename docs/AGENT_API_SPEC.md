# 📡 AUTUS 2.0 Agent API Specification

---

## API 개요

```
Base URL: https://api.autus.ai/v1/agent
Authentication: Bearer Token (JWT)
Header: Authorization: Bearer {token}

Common Headers:
- X-Org-ID: {organization_id}
- X-Industry: academy | fnb | fitness | ...

Response Format: JSON
Error Format: { error: string, code: string, details?: any }
```

---

## POST /agent/reason

ReAct Reason 단계 - 상황 분석 및 원인 추론

### Request
```json
{
  "triggerId": "alert-001",
  "customerId": "cust-123",
  "context": {
    "source": "temperature_drop",
    "currentTemperature": 38,
    "previousTemperature": 55
  }
}
```

### Response
```json
{
  "reasoningId": "reason-001",
  "reasoning": {
    "situation": "김민수 학생 온도가 55°에서 38°로 급락",
    "rootCauses": [
      "최근 성적 하락 (-5점)",
      "학부모 Voice: 비용 부담 언급",
      "경쟁사 D학원 프로모션 노출"
    ],
    "urgency": "high",
    "confidence": 0.85
  }
}
```

---

## POST /agent/decide

ReAct Decide 단계 - 전략 및 액션 결정

### Request
```json
{
  "reasoningId": "reason-001",
  "customerId": "cust-123"
}
```

### Response
```json
{
  "decisionId": "decision-001",
  "strategy": {
    "id": "value_reinforcement",
    "name": "가치 재인식 상담",
    "reasoning": "비용 민감 + 경쟁사 노출 → 가치 강조 필요"
  },
  "actions": [
    {
      "id": "action-001",
      "type": "create_consultation",
      "description": "학부모 상담 예약",
      "params": {
        "datetime": "2025-01-30T14:00:00",
        "type": "value_demonstration"
      },
      "automationLevel": "L5_full_auto",
      "requiresApproval": false
    },
    {
      "id": "action-002",
      "type": "generate_report",
      "description": "성적 향상 리포트 생성",
      "params": {
        "reportType": "value_comparison"
      },
      "automationLevel": "L5_full_auto",
      "requiresApproval": false
    },
    {
      "id": "action-003",
      "type": "send_kakao_message",
      "description": "상담 초대 메시지 발송",
      "params": {
        "template": "consultation_invite"
      },
      "automationLevel": "L5_full_auto",
      "requiresApproval": false
    }
  ]
}
```

---

## POST /agent/verify

ReAct Verify 단계 - 과거 케이스 검색 및 검증 (Agentic RAG)

### Request
```json
{
  "decisionId": "decision-001",
  "strategy": "value_reinforcement",
  "context": {
    "customerTemperature": 38,
    "voiceStage": "wish",
    "competitorExposure": true
  }
}
```

### Response
```json
{
  "verificationId": "verify-001",
  "similarCases": [
    {
      "caseId": "case-2023-09-001",
      "similarity": 0.85,
      "outcome": "success",
      "details": {
        "customerName": "이준호",
        "initialTemperature": 35,
        "finalTemperature": 68,
        "strategy": "value_reinforcement",
        "resultDate": "2023-09-15"
      }
    },
    {
      "caseId": "case-2024-02-012",
      "similarity": 0.72,
      "outcome": "partial",
      "details": {
        "customerName": "박서연",
        "initialTemperature": 42,
        "finalTemperature": 55,
        "strategy": "value_reinforcement"
      }
    }
  ],
  "validation": {
    "policyConflicts": [],
    "riskAssessment": "low",
    "confidence": 0.85
  },
  "recommendation": "proceed"
}
```

---

## POST /agent/authorize

Authority Gate - 실행 권한 확인 및 승인

### Request
```json
{
  "decisionId": "decision-001",
  "actions": ["action-001", "action-002", "action-003"],
  "requesterId": "user-456"
}
```

### Response
```json
{
  "authorizationId": "auth-001",
  "authorizations": [
    {
      "actionId": "action-001",
      "status": "approved",
      "approver": "system",
      "reason": "L5 자동 승인"
    },
    {
      "actionId": "action-002",
      "status": "approved",
      "approver": "system",
      "reason": "L5 자동 승인"
    },
    {
      "actionId": "action-003",
      "status": "approved",
      "approver": "system",
      "reason": "L5 자동 승인"
    }
  ],
  "approvedPlan": {
    "planId": "plan-001",
    "actions": ["action-001", "action-002", "action-003"],
    "createdAt": "2025-01-28T10:00:00Z"
  }
}
```

---

## POST /agent/execute

CodeAct Execute - Action 실행

### Request
```json
{
  "planId": "plan-001",
  "mode": "live"
}
```

### Response
```json
{
  "executionId": "exec-001",
  "results": [
    {
      "actionId": "action-001",
      "type": "create_consultation",
      "status": "success",
      "output": {
        "consultationId": "consult-123",
        "datetime": "2025-01-30T14:00:00",
        "calendarEventId": "cal-456"
      }
    },
    {
      "actionId": "action-002",
      "type": "generate_report",
      "status": "success",
      "output": {
        "reportId": "report-789",
        "path": "/reports/kim_minsu_value_20250128.pdf"
      }
    },
    {
      "actionId": "action-003",
      "type": "send_kakao_message",
      "status": "success",
      "output": {
        "messageId": "kakao-abc",
        "deliveredAt": "2025-01-28T10:01:23Z"
      }
    }
  ],
  "proofPackId": "proof-001"
}
```

---

## GET /agent/proof/{id}

Proof Pack 조회

### Response
```json
{
  "id": "proof-001",
  "reasoning": {
    "reasoningId": "reason-001",
    "situation": "김민수 학생 온도 급락",
    "rootCauses": ["성적 하락", "비용 민감", "경쟁사 노출"],
    "timestamp": "2025-01-28T10:00:00Z"
  },
  "decision": {
    "decisionId": "decision-001",
    "strategy": "value_reinforcement",
    "actions": 3,
    "timestamp": "2025-01-28T10:00:05Z"
  },
  "verification": {
    "verificationId": "verify-001",
    "similarCases": 2,
    "confidence": 0.85,
    "recommendation": "proceed",
    "timestamp": "2025-01-28T10:00:08Z"
  },
  "authorization": {
    "authorizationId": "auth-001",
    "approved": 3,
    "pending": 0,
    "rejected": 0,
    "timestamp": "2025-01-28T10:00:10Z"
  },
  "execution": {
    "executionId": "exec-001",
    "success": 3,
    "failed": 0,
    "timestamp": "2025-01-28T10:01:30Z"
  },
  "timestamp": "2025-01-28T10:01:30Z",
  "signature": "AUTUS-v2.0-proof-sha256:abc123..."
}
```

---

## POST /agent/run

전체 파이프라인 실행 (원샷)

### Request
```json
{
  "trigger": {
    "type": "alert",
    "id": "alert-001"
  },
  "customerId": "cust-123",
  "mode": "live",
  "autoApprove": true
}
```

### Response
```json
{
  "pipelineId": "pipeline-001",
  "status": "completed",
  "steps": {
    "reason": {
      "status": "completed",
      "reasoningId": "reason-001",
      "duration": 1200
    },
    "decide": {
      "status": "completed",
      "decisionId": "decision-001",
      "actionsCount": 3,
      "duration": 800
    },
    "verify": {
      "status": "completed",
      "verificationId": "verify-001",
      "confidence": 0.85,
      "duration": 1500
    },
    "authorize": {
      "status": "completed",
      "authorizationId": "auth-001",
      "approved": 3,
      "duration": 200
    },
    "execute": {
      "status": "completed",
      "executionId": "exec-001",
      "success": 3,
      "duration": 3000
    }
  },
  "proofPackId": "proof-001",
  "totalDuration": 6700,
  "pendingApprovals": []
}
```

---

## 에러 코드

| Code | Description |
|------|-------------|
| AGENT_001 | 추론 실패 |
| AGENT_002 | 전략 결정 실패 |
| AGENT_003 | 검증 실패 |
| AGENT_004 | 권한 부족 |
| AGENT_005 | 실행 실패 |
| AGENT_006 | 롤백 실패 |
| AGENT_007 | Proof Pack 생성 실패 |

---

## 자동화 레벨 정의

| Level | Name | Description |
|-------|------|-------------|
| L5 | full_auto | 완전 자동 실행 |
| L4 | approved_auto | 승인 후 자동 실행 |
| L3 | suggest | 제안만 (실행은 인간) |
| L2 | human | 인간 실행 필수 |
