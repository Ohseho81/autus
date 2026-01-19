# 🚀 AUTUS 개발 효율화 도구 가이드

## 📋 효율화 스택 요약

| 도구 | 용도 | 효과 |
|------|------|------|
| **MCP 서버** | Cursor에서 외부 시스템 직접 제어 | 컨텍스트 스위칭 제거 |
| **Claude Code** | 터미널에서 AI 코딩 | 어디서든 Claude |
| **GitHub Actions** | CI/CD 자동화 | 배포/테스트 자동 |
| **Raycast AI** | 글로벌 단축키 Claude | 1초만에 AI 호출 |
| **Webhook 자동화** | 이벤트 기반 실행 | 수동 작업 제거 |
| **Supabase Edge** | 서버리스 함수 | 백엔드 확장 |

---

## 1️⃣ MCP 서버 (Cursor 확장)

### 설치
```bash
# 프로젝트 폴더에서
./scripts/setup-cursor.sh

# 또는 수동 설치
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-postgres
```

### 설정 위치
```
~/.cursor/mcp.json           # 글로벌 설정
./.cursor/mcp.json           # 프로젝트별 설정
```

### 사용 가능한 명령
| 명령 | MCP 서버 |
|------|----------|
| "students 테이블 조회해줘" | Supabase MCP |
| "새 이슈 만들어줘: 버그 수정" | GitHub MCP |
| "배포 상태 확인해줘" | Vercel MCP |
| "#general 채널에 메시지 보내줘" | Slack MCP |

---

## 2️⃣ Claude Code (CLI)

### 설치
```bash
npm install -g @anthropic-ai/claude-code
```

### 사용
```bash
# 단일 명령
claude "api/notification.ts에 새 템플릿 추가해줘"

# 대화형 모드
claude

# 파일 지정
claude --file src/index.ts "이 파일 리팩토링해줘"

# 프로젝트 전체 컨텍스트
claude --project . "전체 구조 설명해줘"
```

---

## 3️⃣ GitHub Actions (CI/CD)

### 자동 실행 트리거

| 트리거 | 실행 내용 |
|--------|----------|
| `push main` | Vercel 프로덕션 배포 |
| `pull_request` | Preview 배포 + URL 코멘트 |
| `schedule 매일 0시` | 위험 학생 스캔 |
| `[migrate] 커밋` | Supabase 마이그레이션 |

### Secrets 설정 (GitHub)
```
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
SUPABASE_URL
SUPABASE_SERVICE_KEY
ANTHROPIC_API_KEY
SLACK_WEBHOOK
N8N_WEBHOOK_URL
```

---

## 4️⃣ Raycast AI (macOS 전용)

### 설치
```bash
# Raycast 설치 후
Raycast → Extensions → AI → Enable
```

### 단축키 설정
```
⌥ + Space → Raycast 열기
⌘ + G     → AI Chat (Claude)
⌘ + K     → Quick AI
```

---

## 5️⃣ Webhook 자동화 (실시간)

### 이벤트 → 자동 실행 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   이벤트    │────▶│  Webhook    │────▶│   자동화    │
└─────────────┘     └─────────────┘     └─────────────┘

결제 실패      →   /webhook/payment   →  엔트로피 스파이크
학부모 문의    →   /webhook/inquiry   →  감정 분석 + 답변
출결 변화      →   /webhook/attend    →  위험도 재계산
```

### Supabase Database Webhook
```sql
-- 테이블 변경 시 자동 트리거
CREATE TRIGGER on_payment_change
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION supabase_functions.http_request(
    'https://your-n8n.com/webhook/payment',
    'POST',
    '{"Content-Type": "application/json"}',
    '{}',
    '5000'
  );
```

---

## 6️⃣ Supabase Edge Functions

### 생성
```bash
supabase functions new autus-daily-scan
```

### 코드 예시
```typescript
// supabase/functions/autus-daily-scan/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 위험 학생 조회
  const { data: riskStudents } = await supabase
    .from('organisms')
    .select('*')
    .gt('entropy', 0.5)

  return new Response(JSON.stringify({ 
    success: true, 
    count: riskStudents?.length 
  }))
})
```

---

## 7️⃣ 통합 워크플로우 예시

### "미납 학생 처리" 전체 자동화

```
1. 결제 실패
      ↓
2. Webhook → Vercel Edge Function
      ↓
3. Supabase 업데이트 (payment_status = 'unpaid')
      ↓
4. Database Trigger → n8n Webhook
      ↓
5. n8n → Claude AI 분석
      ↓
6. 엔트로피 스파이크 기록
      ↓
7. 알림톡 발송
      ↓
8. Slack → 관리자 알림
      ↓
9. GitHub Issue 자동 생성 (3회 이상 미납)
```

---

## 📊 효율화 비교

| 작업 | 수동 | 자동화 후 |
|------|------|----------|
| 위험 대상 조회 | 5분 | 0초 (자동) |
| 문의 답변 | 10분 | 30초 (추천 선택) |
| 주간 리포트 | 2시간 | 0초 (자동 발송) |
| 배포 | 3분 | 0초 (push → 자동) |
| DB 확인 | 2분 | 5초 (MCP 명령) |

**예상 절감: 일 2-3시간 → 월 40-60시간**

---

## 🎯 권장 설정 순서

1. **MCP 서버** (지금 바로) - 즉시 효과
2. **GitHub Actions** (30분) - 배포 자동화
3. **Webhook 연동** (1시간) - 실시간 자동화
4. **Claude Code** (5분) - 터미널 AI
5. **Raycast** (10분, Mac만) - 글로벌 단축키

---

## 🔧 빠른 설정 명령어

```bash
# 1. MCP 설치
./scripts/setup-cursor.sh

# 2. Claude Code 설치
npm install -g @anthropic-ai/claude-code

# 3. GitHub Actions secrets 설정
gh secret set VERCEL_TOKEN --body "xxx"
gh secret set SUPABASE_URL --body "xxx"
gh secret set ANTHROPIC_API_KEY --body "xxx"

# 4. Supabase Functions 배포
supabase functions deploy autus-daily-scan
```

---

**🎉 이 모든 것이 연동되면 AUTUS는 거의 자율 운영됩니다!**
