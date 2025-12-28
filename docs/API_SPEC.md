# AUTUS API 명세서 v2.0

## 개요

AUTUS 시스템의 19개 엔진에 대한 REST API 명세서입니다.

---

## 기본 정보

- **Base URL**: `https://api.autus.io/v2`
- **인증**: Bearer Token
- **Content-Type**: `application/json`

---

## 엔진 목록

### 8대 코어 엔진
1. ScreenScanner - 화면 스캔
2. VoiceListener - 음성 인식
3. BioMonitor - 바이오 모니터링
4. VideoAnalyzer - 비디오 분석
5. LogMining - 로그 마이닝
6. LinkMapper - 링크 매핑
7. IntuitionPredictor - 직관 예측
8. ContextAwareness - 컨텍스트 인식

### Bezos Edition V1 (9-11)
9. AnalysisEngine - 분석 엔진
10. SystemAutopilot - 시스템 오토파일럿
11. EducationIntegration - 교육 통합

### Bezos Edition V2 (12-15)
12. ChurnPreventionEngine - 이탈 방지
13. HybridStorageEngine - 하이브리드 스토리지
14. PhysicsToAdviceEngine - 물리→조언 변환
15. HighTicketTargetEngine - 고가치 타겟팅

### Bezos Edition V3 (16-19)
16. WaitlistGravityField - 대기자 중력장
17. NetworkEffectEngine - 네트워크 효과
18. MultiOrbitStrategyEngine - 다중 궤도 전략
19. EntropyCalculator - 엔트로피 계산

---

## API 엔드포인트

### 1. 대기자 중력장 (Waitlist Gravity Field)

#### 대기자 등록
```http
POST /api/v2/engines/waitlist/register
```

**Request Body**
```json
{
  "parent_name": "김부모",
  "student_name": "김학생",
  "contact": "kim@test.com",
  "source": "referral"
}
```

**Response**
```json
{
  "success": true,
  "node_id": "wl_20240115120000",
  "queue_position": 5,
  "estimated_entry": "2024-03-01",
  "message": "대기자 명단에 등록되었습니다."
}
```

#### 사전 진단 제출
```http
POST /api/v2/engines/waitlist/{node_id}/diagnostic
```

**Request Body**
```json
{
  "node_id": "wl_001",
  "responses": {
    "q1": "A",
    "q2": "B",
    "q3": 5
  }
}
```

#### 골든 링 현황
```http
GET /api/v2/engines/golden-ring/status
```

**Response**
```json
{
  "sealed": false,
  "capacity": {
    "used": 2,
    "total": 3
  },
  "waitlist_count": 15,
  "pending_pulses": 3
}
```

#### 펄스 예약
```http
POST /api/v2/engines/pulse/schedule
```

**Request Body**
```json
{
  "pulse_type": "SUCCESS_STORY",
  "subject": "이번 달 성공 스토리",
  "content": "김학생이 목표를 달성했습니다!",
  "target_orbit": "ALL",
  "scheduled_at": "2024-01-20T10:00:00Z"
}
```

---

### 2. 네트워크 효과 엔진 (Network Effect Engine)

#### 벡터 처리
```http
POST /api/v2/engines/network-effect/process
```

**Request Body**
```json
{
  "cluster_id": "cluster_A",
  "vectors": [
    {"attendance": 0.9, "engagement": 0.8, "progress": 0.75},
    {"attendance": 0.85, "engagement": 0.9, "progress": 0.8}
  ]
}
```

**Response**
```json
{
  "cluster_id": "cluster_A",
  "processed_vectors": 2,
  "network_value": 4,
  "autus_value": 8,
  "scaling_phase": "LINEAR",
  "synergy_factor": 1.02
}
```

#### 네트워크 현황
```http
GET /api/v2/engines/network-effect/status
```

**Response**
```json
{
  "total_nodes": 42,
  "total_clusters": 3,
  "scaling_phase": "QUADRATIC",
  "current_exponent": 2,
  "network_value": 1764,
  "singularity_probability": 0.35,
  "growth_rate": 0.15
}
```

#### 특이점 탐지
```http
GET /api/v2/engines/network-effect/singularity
```

---

### 3. 다중 궤도 전략 엔진 (Multi-Orbit Strategy)

#### 3궤도 스캔
```http
POST /api/v2/engines/multi-orbit/scan
```

**Request Body**
```json
{
  "nodes": [
    {"id": "s001", "mass": 80, "energy": 75, "attendance": 92},
    {"id": "s002", "mass": 65, "energy": 70, "attendance": 78}
  ],
  "leads": [
    {"id": "l001", "interestLevel": 0.85}
  ]
}
```

**Response**
```json
{
  "scan_id": "scan_20240115120000",
  "nodes_scanned": 2,
  "leads_scanned": 1,
  "results": {
    "safety": {
      "risk_count": 0,
      "urgent_actions": 0,
      "avg_continuity_score": 0.85
    },
    "acquisition": {
      "hot_leads": 1,
      "active_referral_chains": 0,
      "conversion_rate": 0.35
    },
    "revenue": {
      "projected_revenue": 5000000,
      "quantum_leap_candidates": 1,
      "micro_clinic_opportunities": 2
    }
  },
  "golden_targets": [
    {"node_id": "s001", "score": 92, "action": "즉시 접촉"}
  ]
}
```

#### 골든 타겟 목록
```http
GET /api/v2/engines/multi-orbit/golden-targets?limit=10
```

---

### 4. 엔트로피 계산기 (Entropy Calculator)

#### 엔트로피 계산
```http
POST /api/v2/engines/entropy/calculate
```

**Request Body**
```json
{
  "node_states": {
    "s001": {"STABLE": 0.7, "AT_RISK": 0.2, "CONFLICT": 0.1},
    "s002": {"STABLE": 0.8, "AT_RISK": 0.15, "CONFLICT": 0.05}
  },
  "conflict_pairs": [["s001", "s005"], ["s002", "s008"]],
  "mismatch_nodes": ["s005", "s006"]
}
```

**Response**
```json
{
  "total_entropy": 4.5,
  "entropy_level": "MEDIUM",
  "components": {
    "shannon": 1.5,
    "conflict": 1.0,
    "mismatch": 1.0,
    "churn": 0.5,
    "isolation": 0.5
  },
  "recommendations": [
    "🔥 2개 갈등 해소 필요",
    "⚙️ 2명 역할 최적화 필요"
  ],
  "money_efficiency": 40.66
}
```

#### 엔트로피 추세
```http
GET /api/v2/engines/entropy/trend?periods=10
```

#### 감소 시뮬레이션
```http
POST /api/v2/engines/entropy/simulate
```

**Request Body**
```json
{
  "actions": [
    {"type": "resolve_conflict", "count": 2},
    {"type": "fix_mismatch", "count": 3}
  ]
}
```

---

### 5. 이탈 경보 시스템 (Churn Alert)

#### 경보 목록
```http
GET /api/v2/engines/churn/alerts
```

**Response**
```json
{
  "alerts": [
    {
      "id": "alert_001",
      "node_id": "student_003",
      "level": "CRITICAL",
      "risk_score": 0.92,
      "reasons": ["출석률 45%", "14일간 비활성"],
      "suggested_action": "즉시 전화 상담"
    }
  ],
  "stats": {
    "critical": 1,
    "high": 2,
    "medium": 3,
    "low": 5
  }
}
```

#### 경보 해결
```http
POST /api/v2/engines/churn/alert/{alert_id}/resolve
```

---

### 6. 리포트 생성

#### 주간 리포트
```http
GET /api/v2/engines/reports/weekly/{student_id}
```

#### 월간 리포트
```http
GET /api/v2/engines/reports/monthly/{student_id}
```

---

## 에러 코드

| 코드 | 설명 |
|------|------|
| 400 | Bad Request - 잘못된 요청 |
| 401 | Unauthorized - 인증 필요 |
| 403 | Forbidden - 권한 없음 |
| 404 | Not Found - 리소스 없음 |
| 429 | Too Many Requests - 요청 제한 초과 |
| 500 | Internal Server Error - 서버 오류 |

---

## Rate Limits

| 엔드포인트 | 제한 |
|-----------|------|
| /waitlist/* | 100/min |
| /network-effect/* | 200/min |
| /multi-orbit/* | 50/min |
| /entropy/* | 100/min |
| /churn/* | 100/min |
| /reports/* | 30/min |

---

## 웹훅

### 이벤트 타입

- `waitlist.registered` - 대기자 등록
- `golden_ring.sealed` - 골든 링 봉인
- `churn.alert` - 이탈 경보
- `singularity.detected` - 특이점 감지

### 웹훅 설정
```http
POST /api/v2/webhooks
```

```json
{
  "url": "https://your-server.com/webhook",
  "events": ["churn.alert", "singularity.detected"],
  "secret": "your_webhook_secret"
}
```

---

## SDK

### JavaScript
```javascript
import { AutusClient } from '@autus/sdk';

const client = new AutusClient({ apiKey: 'YOUR_API_KEY' });

// 대기자 등록
const result = await client.waitlist.register({
  parentName: '김부모',
  studentName: '김학생',
  contact: 'kim@test.com'
});
```

### Python
```python
from autus import AutusClient

client = AutusClient(api_key='YOUR_API_KEY')

# 엔트로피 계산
result = client.entropy.calculate(
    node_states={'s001': {'STABLE': 0.7}},
    conflict_pairs=[['s001', 's002']],
    mismatch_nodes=['s003']
)
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 2.0.0 | 2024-01-15 | Bezos V3 엔진 추가 |
| 1.5.0 | 2024-01-01 | Bezos V2 엔진 추가 |
| 1.0.0 | 2023-12-01 | 초기 릴리즈 |

---

## 문의

- **Email**: api-support@autus.io
- **문서**: https://docs.autus.io
- **상태 페이지**: https://status.autus.io
