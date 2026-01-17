# n8n AUTUS Self-Evolution 워크플로우 설정 가이드

## Step 1: 워크플로우 Import

### 1.1 n8n 대시보드 접속
```
https://your-n8n-instance.com
또는
https://app.n8n.cloud (클라우드 버전)
```

### 1.2 Import 방법

1. 좌측 메뉴에서 **Workflows** 클릭
2. 우측 상단 **⋮** (점 3개) 클릭
3. **Import from File** 선택
4. `n8n-autus-evolution-workflow.json` 파일 선택
5. **Import** 클릭

---

## Step 2: Credentials 설정 (4개)

### 2.1 Gemini API Key

1. **Settings** → **Credentials** → **Add Credential**
2. **HTTP Request** 선택
3. **Generic Credential Type**: `Query Auth`
4. 설정:
   ```
   Name: Gemini API Key
   Query Auth:
     Name: key
     Value: YOUR_GEMINI_API_KEY
   ```

**Gemini API Key 발급:**
- https://makersuite.google.com/app/apikey
- "Create API Key" 클릭
- 키 복사

---

### 2.2 Netlify Token

1. **Add Credential** → **HTTP Request**
2. **Generic Credential Type**: `Header Auth`
3. 설정:
   ```
   Name: Netlify Token
   Header Auth:
     Name: Authorization
     Value: Bearer YOUR_NETLIFY_TOKEN
   ```

**Netlify Token 발급:**
- https://app.netlify.com/user/applications#personal-access-tokens
- "New access token" 클릭
- 토큰 복사

**Site ID 확인:**
- Netlify 대시보드 → 사이트 선택
- Site settings → General → Site ID 복사

---

### 2.3 Supabase API

1. **Add Credential** → **Supabase**
2. 설정:
   ```
   Name: AUTUS Supabase
   Host: https://YOUR_PROJECT_ID.supabase.co
   Service Role Key: YOUR_SERVICE_ROLE_KEY
   ```

**Supabase 정보 확인:**
- Supabase 대시보드 → Project Settings → API
- **Project URL**: Host에 입력
- **service_role** key (secret): Service Role Key에 입력

---

### 2.4 Slack Bot

1. **Add Credential** → **Slack API**
2. 설정:
   ```
   Name: AUTUS Slack Bot
   Access Token: xoxb-YOUR-BOT-TOKEN
   ```

**Slack Bot 생성:**
1. https://api.slack.com/apps 접속
2. "Create New App" → "From scratch"
3. App Name: `AUTUS Evolution Bot`
4. Workspace 선택
5. **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**:
   - `chat:write`
   - `chat:write.public`
6. **Install to Workspace** 클릭
7. **Bot User OAuth Token** 복사 (xoxb-로 시작)

**채널 생성:**
- Slack에서 `#autus-evolution` 채널 생성
- 봇을 채널에 초대: `/invite @AUTUS Evolution Bot`

---

## Step 3: 환경변수 설정

n8n에서 환경변수 설정 (Settings → Variables):

```
NETLIFY_SITE_ID = your-netlify-site-id
```

또는 워크플로우 내에서 직접 수정:
- `🚀 Deploy to Netlify` 노드 열기
- URL에서 `{{ $env.NETLIFY_SITE_ID }}` 부분을 실제 Site ID로 교체

---

## Step 4: Credentials 연결

각 노드에 Credential 연결:

| 노드 | Credential |
|------|------------|
| 🤖 Gemini Generate | Gemini API Key |
| 🚀 Deploy to Netlify | Netlify Token |
| 💾 Log to Supabase | AUTUS Supabase |
| 💬 Slack Notify | AUTUS Slack Bot |
| 💬 Slack (No Gaps) | AUTUS Slack Bot |

**연결 방법:**
1. 노드 더블클릭
2. **Credential to connect with** 드롭다운
3. 해당 Credential 선택
4. **Save**

---

## Step 5: 테스트 실행

1. 워크플로우 상단 **Execute Workflow** 클릭
2. 각 노드 실행 결과 확인
3. 에러 발생시 해당 노드 클릭하여 상세 로그 확인

**예상 결과:**
- 🌐 Fetch: autus-ai.com HTML 반환
- 🔍 Analyze: gaps 배열 + score 반환
- ❓ IF: true면 Generate 경로, false면 No Gaps 경로
- 🤖 Gemini: 생성된 코드 반환
- 🚀 Deploy: Netlify 배포 응답
- 💬 Slack: 메시지 전송 완료

---

## Step 6: 워크플로우 활성화

1. 워크플로우 우측 상단 **Active** 토글 ON
2. 초록색으로 변경되면 활성화 완료
3. 6시간마다 자동 실행됨

**실행 확인:**
- **Executions** 탭에서 실행 히스토리 확인
- Slack `#autus-evolution` 채널에서 알림 확인

---

## 트러블슈팅

### "Invalid API Key" 에러
- Gemini API 키 확인
- Query Auth 설정에서 Name이 `key`인지 확인

### "401 Unauthorized" (Netlify)
- Netlify Token 앞에 `Bearer ` 포함 확인
- Header Auth Name이 `Authorization`인지 확인

### "Channel not found" (Slack)
- `#autus-evolution` 채널 존재 확인
- 봇이 채널에 초대되었는지 확인

### "Table not found" (Supabase)
- `evolution_logs` 테이블이 생성되었는지 확인
- Service Role Key 사용 확인 (anon key 아님)
