# AUTUS UI — API 연동 포인트

> **원칙: UI는 API의 '거울'일 뿐, 로직은 백엔드에서만**

---

## API 베이스 URL

```javascript
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://autus-production.up.railway.app'
  : 'http://localhost:8000';
```

---

## 1️⃣ SOLAR — 상태 조회

### GET /state

**용도**: RISK % 및 시스템 상태 조회

**호출 시점**:
- 페이지 로드 시
- 10초 폴링
- SSE 대체 가능

**응답 예시**:
```json
{
  "engine": {
    "entropy": 0.65,
    "pressure": 0.42,
    "mass": 850,
    "velocity": 12
  },
  "system_state": "yellow",
  "timestamp": "2025-12-18T10:30:00Z"
}
```

**UI 매핑**:
```javascript
function mapStateToUI(data) {
  const { entropy, pressure } = data.engine;
  
  // RISK 계산
  const risk = Math.min(100, Math.max(0, 
    (entropy * 50) + (pressure * 30)
  ));
  
  // 상태 결정
  let status = 'safe';
  if (risk >= 70) status = 'danger';
  else if (risk >= 40) status = 'warning';
  
  return { risk, status };
}
```

---

## 2️⃣ SOLAR — 실시간 업데이트 (SSE)

### GET /stream

**용도**: 실시간 상태 변화 수신

**호출 시점**:
- 페이지 로드 시 연결
- 자동 재연결

**구현**:
```javascript
function connectSSE() {
  const eventSource = new EventSource(`${API_BASE}/stream`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updateUI(mapStateToUI(data));
  };
  
  eventSource.onerror = () => {
    setTimeout(connectSSE, 5000); // 5초 후 재연결
  };
  
  return eventSource;
}
```

---

## 3️⃣ ACTION — 실행

### POST /execute

**용도**: ACTION 버튼 클릭 시 결정 실행

**호출 시점**:
- ACTION 버튼 클릭 시 (1회만)

**요청**:
```json
{
  "action": "recover",  // recover | defriction | shock_damp
  "risk": 78
}
```

**응답**:
```json
{
  "success": true,
  "action_id": "ACT_20251218_001",
  "before": { "entropy": 0.65, "pressure": 0.42 },
  "after": { "entropy": 0.32, "pressure": 0.21 },
  "audit_id": "AUD_20251218_001"
}
```

**UI 흐름**:
```javascript
async function executeAction(actionType) {
  // 1. 즉시 애니메이션 정지
  freezeAllAnimations();
  
  // 2. API 호출
  const response = await fetch(`${API_BASE}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: actionType, risk: currentRisk })
  });
  
  // 3. AUDIT 화면 전환
  if (response.ok) {
    setTimeout(() => showAudit(), 300);
  }
}
```

---

## 4️⃣ AUDIT — 봉인 확인

### POST /audit/seal

**용도**: AUDIT 완료 후 봉인 확인

**호출 시점**:
- 토큰 낙하 완료 시 (Impact Frame)

**요청**:
```json
{
  "action_id": "ACT_20251218_001",
  "impact_timestamp": "2025-12-18T10:30:01Z"
}
```

**응답**:
```json
{
  "sealed": true,
  "audit_id": "AUD_20251218_001",
  "hash": "a1b2c3d4e5f6..."
}
```

**UI 흐름**:
```javascript
async function sealAudit(actionId) {
  await fetch(`${API_BASE}/audit/seal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action_id: actionId,
      impact_timestamp: new Date().toISOString()
    })
  });
  
  // 봉인 완료 — 이후 추가 API 호출 없음
}
```

---

## 5️⃣ Commit — 개인 대시보드

### GET /api/v1/commit/person/{person_id}

**용도**: 특정 사용자의 Commit 상태 조회

**호출 시점**:
- 개인 SOLAR 페이지 로드 시
- 역할이 'student'일 때

**응답**:
```json
{
  "person": {
    "person_id": "STU_001",
    "name": "김유학",
    "role": "subject"
  },
  "commits": [
    {
      "commit_id": "CMT_TUI_001",
      "commit_type": "tuition",
      "amount": 4500000,
      "status": "active",
      "mass": 4.5,
      "gravity": 0.8
    }
  ],
  "survival": {
    "survival_mass": 8.2
  },
  "risk": {
    "risk_score": 35,
    "worst_case_label": "학업 유지 가능"
  }
}
```

**RISK 매핑**:
```javascript
function mapCommitToRisk(data) {
  return {
    risk: data.risk.risk_score,
    status: data.risk.risk_score >= 70 ? 'danger' 
          : data.risk.risk_score >= 40 ? 'warning' 
          : 'safe'
  };
}
```

---

## 6️⃣ Role — UI 설정

### GET /api/v1/role/ui/{role}

**용도**: 역할별 UI 표시 설정

**호출 시점**:
- 역할 전환 시
- 페이지 로드 시 (기본 역할)

**응답**:
```json
{
  "role": "student",
  "show": {
    "risk_display": true,
    "action_button": true,
    "task_panel": false,
    "commit_panel": true
  },
  "allowed_actions": ["recover", "defriction"]
}
```

---

## API 호출 타이밍 요약

| 시점 | API | 메소드 |
|------|-----|--------|
| 페이지 로드 | `/state` | GET |
| 10초마다 | `/state` 또는 `/stream` | GET |
| ACTION 클릭 | `/execute` | POST |
| AUDIT 완료 | `/audit/seal` | POST |
| 역할 전환 | `/api/v1/role/ui/{role}` | GET |
| 개인 조회 | `/api/v1/commit/person/{id}` | GET |

---

## 에러 핸들링

### 네트워크 오류
```javascript
async function fetchWithFallback(url, options) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error('API Error');
    return await response.json();
  } catch (error) {
    // UI: 상태 동결, ACTION 숨김
    freezeUI();
    hideActionButton();
    return null;
  }
}
```

### 타임아웃
```javascript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);
} catch (error) {
  if (error.name === 'AbortError') {
    // 타임아웃: 안전 모드로 전환
    setRisk(0);
  }
}
```

---

## 인증 (선택)

### Magic Link 플로우

```javascript
// 1. 링크 요청
await fetch('/api/v1/auth/magic-link/request', {
  method: 'POST',
  body: JSON.stringify({ email: userEmail })
});

// 2. 링크 클릭 후 검증 (리다이렉트)
// /api/v1/auth/magic-link/verify?token=xxx

// 3. 세션 저장
const session = await response.json();
localStorage.setItem('autus_session', session.session_token);
```

---

## 요약 흐름도

```
[페이지 로드]
    │
    ├─→ GET /state → RISK % 표시
    │
    ├─→ GET /api/v1/role/ui/{role} → UI 설정
    │
    └─→ SSE /stream 연결 → 실시간 업데이트
    
[10초마다]
    │
    └─→ GET /state → RISK % 갱신
    
[ACTION 클릭]
    │
    ├─→ freezeAllAnimations()
    │
    ├─→ POST /execute → 결정 실행
    │
    └─→ showAudit() → AUDIT 화면
    
[AUDIT 완료]
    │
    ├─→ POST /audit/seal → 봉인
    │
    └─→ UI 침묵 (추가 호출 없음)
```

---

**문서 끝 — 이 포인트대로 연동하면 UI↔API 완성**
