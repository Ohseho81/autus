# AUTUS Self-Evolution 활성화 체크리스트

## 🎯 최종 활성화 단계

### Step 1: 모든 Credentials 연결 확인

워크플로우를 열고 각 노드 확인:

```
[ ] 🤖 Gemini Generate    → Gemini API Key 연결됨
[ ] 🚀 Deploy to Netlify  → Netlify Token 연결됨
[ ] 💾 Log to Supabase    → AUTUS Supabase 연결됨
[ ] 💬 Slack Notify       → AUTUS Slack Bot 연결됨
[ ] 💬 Slack (No Gaps)    → AUTUS Slack Bot 연결됨
```

### Step 2: 환경변수/하드코딩 확인

`🚀 Deploy to Netlify` 노드에서:

```
URL에 NETLIFY_SITE_ID가 설정되어 있는지 확인
- 환경변수 사용: {{ $env.NETLIFY_SITE_ID }}
- 또는 직접 입력: your-actual-site-id
```

### Step 3: 테스트 실행

1. 워크플로우 상단 **Execute Workflow** 클릭
2. 실행 진행 상황 확인 (각 노드가 초록색으로 완료)
3. 결과 확인:

**성공시:**
- 모든 노드 초록색 ✅
- Slack에 알림 도착
- Supabase `evolution_logs`에 레코드 추가

**실패시:**
- 빨간색 노드 클릭 → 에러 메시지 확인
- 아래 트러블슈팅 참조

### Step 4: 워크플로우 활성화

1. 워크플로우 우측 상단의 **Active** 토글 클릭
2. 토글이 **초록색**으로 변경되면 완료
3. 상태: `Active` 표시 확인

```
┌─────────────────────────────────────┐
│  AUTUS Self-Evolution    [● Active] │
└─────────────────────────────────────┘
```

---

## ✅ 전체 설정 체크리스트

### 1. n8n 워크플로우

```
[ ] 워크플로우 Import 완료
[ ] Gemini API Key credential 생성
[ ] Netlify Token credential 생성
[ ] Supabase credential 생성
[ ] Slack Bot credential 생성
[ ] 모든 노드에 credential 연결
[ ] NETLIFY_SITE_ID 설정
[ ] 테스트 실행 성공
[ ] 워크플로우 Active ON
```

### 2. Supabase

```
[ ] evolution_logs 테이블 생성
[ ] feature_registry 테이블 생성
[ ] 기본 기능 6개 데이터 삽입
[ ] get_current_score() 함수 생성
[ ] evolution_stats 뷰 생성
[ ] service_role key n8n에 등록
```

### 3. 외부 서비스

```
[ ] Gemini API key 발급 (makersuite.google.com)
[ ] Netlify Personal Access Token 발급
[ ] Netlify Site ID 확인
[ ] Slack App 생성 + Bot Token 발급
[ ] #autus-evolution 채널 생성
[ ] Slack Bot 채널 초대
```

### 4. 최종 확인

```
[ ] 수동 실행 테스트 성공
[ ] Slack 알림 수신 확인
[ ] Supabase 로그 기록 확인
[ ] 워크플로우 Active 상태
```

---

## 🕐 실행 스케줄

활성화 후 자동 실행 스케줄:

```
Every 6 hours:
├── 00:00 (자정)
├── 06:00 (아침)
├── 12:00 (점심)
└── 18:00 (저녁)
```

**다음 실행 시간 확인:**
- n8n → Workflows → AUTUS Self-Evolution
- "Next execution" 표시 확인

---

## 📊 모니터링 방법

### 1. n8n Executions

- Workflows → AUTUS Self-Evolution → Executions
- 실행 히스토리 + 성공/실패 상태

### 2. Slack 채널

`#autus-evolution`에서 알림:

```
🔄 AUTUS Self-Evolution Complete!

📊 Score: 85 → 100
✨ Features Added: Template Marketplace, Collective Intelligence
📝 Lines Added: 1247
🚀 Deploy Status: Success
⏰ Time: 2025-01-16T14:32:00Z

View Updated Site: https://autus-ai.com
```

### 3. Supabase 대시보드

```sql
-- 최근 진화 확인
SELECT * FROM evolution_logs ORDER BY timestamp DESC LIMIT 5;

-- 현재 점수
SELECT get_current_score();

-- 통계
SELECT * FROM evolution_stats;
```

---

## 🔧 트러블슈팅

### n8n 관련

| 문제 | 해결 |
|------|------|
| "Workflow could not be activated" | 모든 credential 연결 확인 |
| "Invalid API Key" | Gemini key 재발급 |
| "401 Unauthorized" | Netlify token `Bearer ` 접두사 확인 |
| "Channel not found" | Slack 채널명 확인, 봇 초대 확인 |

### Supabase 관련

| 문제 | 해결 |
|------|------|
| "Table not found" | SQL 스키마 재실행 |
| "Permission denied" | service_role key 사용 확인 |
| "Connection refused" | Host URL 확인 (https 포함) |

### 일반

| 문제 | 해결 |
|------|------|
| 실행은 되지만 배포 안됨 | Netlify Site ID 확인 |
| 코드 생성 품질 낮음 | Gemini 프롬프트 수정 |
| 알림 안옴 | Slack Bot scope 확인 |

---

## 🎉 완료!

모든 체크리스트 완료시:

1. **6시간마다** 자동으로 autus-ai.com 스캔
2. **누락 기능 감지**시 Gemini로 코드 생성
3. **자동 배포** 후 Slack 알림
4. **Supabase에 로그** 기록

**AUTUS가 스스로 진화합니다!** 🔄✨
