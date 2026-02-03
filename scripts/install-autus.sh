#!/bin/bash
# ============================================================
#  🚀 AUTUS 6-Agent Dev Environment — One-Shot Installer
#  
#  Usage:
#    curl -sL [URL] | bash
#    또는
#    bash install-autus.sh
#    또는 특정 프로젝트:
#    bash install-autus.sh /path/to/project
# ============================================================

set -e

ROOT="${1:-.}"
cd "$ROOT"

echo ""
echo "  ┌───────────────────────────────────────┐"
echo "  │  🚀 AUTUS 6-Agent Environment Setup   │"
echo "  │  Signal → Score → Route → Chain       │"
echo "  └───────────────────────────────────────┘"
echo ""

# ── 폴더 생성 ──────────────────────────────────────────────
mkdir -p .cursor/rules .claude/commands
echo "  📁 폴더 생성 완료"

# ============================================================
# ① CLAUDE.md
# ============================================================
cat > CLAUDE.md << 'AUTUS_EOF'
# AUTUS 6-Agent Routing System

## Overview
- **Type**: Multi-project (AUTUS, 올댓바스켓, K-Work)
- **Stack**: Next.js 14+ / FastAPI / PostgreSQL / Railway / Vercel
- **Architecture**: Physics-based 48-node L0-L4 hierarchy
- **Agent System**: 6-Layer Task Router

---

## Task Router Algorithm

Every task MUST be classified before execution.

### Signal Detection
Extract from task:
- location: mobile | desktop | browser | cloud
- type: code | document | research | automation | communication
- needs: [deploy, test, debug, file_ops, web_nav, research, notify]
- output: api | ui | document | notification | data

### Scoring Formula
```
Score = Trigger(0.3) + Capability(0.5) + Constraint(0.2)
```

### Routing Table

| Signal | Primary Agent | Auto-Add |
|--------|--------------|----------|
| code + deploy | Claude Code | +몰트봇(알림) |
| code + ui | Claude Code | +Chrome(검증) |
| file + non-code | Cowork | - |
| browser + data | Chrome | - |
| research + strategy | claude.ai | - |
| external service | Connectors | +Primary |
| mobile trigger | 몰트봇 | +해당 agent |

### Chain Rules
1. mobile context → 몰트봇 항상 첫 번째
2. 최고 Score 에이전트가 메인
3. Score > 0.3 에이전트들 서포트
4. deploy → 몰트봇 알림 자동 추가
5. UI 작업 → Chrome 검증 자동 추가
6. 외부 서비스 → Connectors 자동 추가

---

## Agent Specs

### 📱 몰트봇 (P0 - Mobile Gateway)
- Triggers: 모바일, 원격, 알림, 상태확인
- Can: remote_trigger, notification, status_check
- Cannot: file_access, code_execution

### ⌨️ Claude Code (P1 - Terminal Agent)
- Triggers: 코딩, 디버깅, 배포, git, 테스트, API, 빌드
- Can: code_write, code_execute, git_ops, deploy, test, debug
- Cannot: browser_ui, document_creation

### 🖥️ Cowork (P2 - Desktop Agent)
- Triggers: 문서, 정리, 리포트, PPT, 엑셀, 분석
- Can: file_organize, document_create, research, sub_agents
- Cannot: code_deploy, browser_control

### 🌐 Chrome (P3 - Browser Agent)
- Triggers: 브라우저, 웹, UI테스트, 스크래핑, 모니터링
- Can: web_navigate, form_fill, console_read, schedule
- Cannot: file_system, code_execution

### 💬 claude.ai (P4 - Research Agent)
- Triggers: 리서치, 전략, 아이디어, 설계, 아키텍처
- Can: web_search, deep_research, memory, artifacts
- Cannot: local_file, deploy

### 🔗 Connectors (P5 - Bridge)
- Triggers: GitHub, Slack, Notion, Gmail, 캘린더
- Can: api_bridge, data_sync, service_integration
- Cannot: standalone_execution, code_logic

---

## Code Conventions

### Style
- TypeScript: strict, no any
- Python: type hints, black formatting
- React: functional + hooks only
- CSS: Tailwind, Tesla dark (#0a0a0a, #1a1a2e)

### Git
- Branch: feature/[agent]-[task]
- Commit: [emoji] type(scope): desc
  - ⌨️ feat / 🖥️ docs / 🌐 test / 📱 ops / 🔗 chore

### Deploy
- Frontend → Vercel
- API → Railway
- DB → Supabase/PostgreSQL

---

## AUTUS Context

### V-Index
```
V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t
```

### Data Flow
OAuth → Event Ledger → Physics Engine → V-Index → Dashboard → 몰트봇

### Critical Rules
1. NEVER deploy without tests
2. ALWAYS route mobile tasks through 몰트봇
3. ALWAYS Chrome verify UI changes
4. ALWAYS 몰트봇 notify after deploy
5. NEVER modify physics model without plan mode
6. Event Ledger = append only (no UPDATE/DELETE)
AUTUS_EOF
echo "  ✅ ① CLAUDE.md"

# ============================================================
# ② .cursor/rules/task-router.mdc
# ============================================================
cat > .cursor/rules/task-router.mdc << 'AUTUS_EOF'
---
description: AUTUS 6-Agent Task Router - 모든 작업의 라우팅 판별 규칙
globs: ["**/*"]
alwaysApply: true
---

# Task Routing Rules

## 작업 수신 시 반드시 수행

### Step 1: Signal 추출
- location: mobile / desktop / browser / cloud
- type: code / document / research / automation
- needs: deploy, test, debug, file_ops, web_nav, research, notify
- output: api, ui, document, notification, data

### Step 2: Agent 매칭
| 조건 | Agent | 역할 |
|------|-------|------|
| 코드 수정/생성 | Claude Code (여기) | Primary |
| 로컬 파일 + 비코딩 | → Cowork 안내 | Redirect |
| 브라우저 필요 | → Chrome 안내 | Redirect |
| 리서치/전략 | → claude.ai 안내 | Redirect |
| 모바일 트리거 | → 몰트봇 필요 | Entry |
| 외부 서비스 | Connectors 활용 | Bridge |

### Step 3: Chain 구성
현재 Agent(Claude Code/Cursor)가 Primary일 때:
1. 코드 작성/수정 → 실행
2. UI 변경 포함? → "Chrome에서 검증 필요" 코멘트 추가
3. 배포 포함? → 배포 명령 + "몰트봇 알림 전송" 코멘트 추가
4. 외부 서비스? → MCP/Connector 호출

### Step 4: 완료 리포트
```
## Task Complete
- Agent: Claude Code (Cursor)
- Chain: [실행된 에이전트 체인]
- Next: [다음 에이전트 액션 필요시]
- Notify: [몰트봇 알림 필요시]
```
AUTUS_EOF
echo "  ✅ ② task-router.mdc"

# ============================================================
# ③ .cursor/rules/code-style.mdc
# ============================================================
cat > .cursor/rules/code-style.mdc << 'AUTUS_EOF'
---
description: AUTUS 코드 스타일 및 아키텍처 규칙
globs: ["**/*.ts", "**/*.tsx", "**/*.py", "**/*.js", "**/*.jsx"]
alwaysApply: true
---

# Code Style Rules

## TypeScript / React
- strict mode 필수, any 금지
- functional components + hooks only
- Tailwind utility-first
- Tesla dark theme: bg-[#0a0a0a], text-white, accent-[#3b82f6]
- 컴포넌트: PascalCase.tsx / 유틸: camelCase.ts

## Python / FastAPI
- type hints 필수 (모든 함수)
- black formatting (line-length 88)
- async/await 우선
- Pydantic v2 모델
- EP10 Postgres LOCK 패턴

## Import Order
1. stdlib
2. third-party
3. local modules
4. type imports (맨 아래)

## Naming
- TS: camelCase / Python: snake_case
- 상수: UPPER_SNAKE_CASE
- 컴포넌트: PascalCase
- V-Index 변수: vIndex, motionScore, threatLevel, relationFactor

## Error Handling
- try/catch 구체적 에러 타입
- API 에러 = V-Index 메타데이터 포함
- 사용자 에러 = 한국어 메시지

## 금지
- console.log (prod) → logger
- inline styles → Tailwind
- class components → hooks
- any → 구체적 타입
- var → const/let
AUTUS_EOF
echo "  ✅ ③ code-style.mdc"

# ============================================================
# ④ .cursor/rules/git-deploy.mdc
# ============================================================
cat > .cursor/rules/git-deploy.mdc << 'AUTUS_EOF'
---
description: Git 워크플로우 및 배포 규칙
globs: ["**/*"]
alwaysApply: true
---

# Git & Deploy Rules

## Branch
```
feature/[agent]-[task-name]
bugfix/[agent]-[task-name]
hotfix/[agent]-[task-name]
```
Agent: cc=Claude Code, cw=Cowork, ch=Chrome, mb=몰트봇, ai=claude.ai

## Commit
```
⌨️ feat(api): add V-Index endpoint
⌨️ fix(dashboard): correct node rendering
🖥️ docs(report): weekly sprint report
🌐 test(ui): verify dashboard
📱 ops(deploy): trigger Railway
🔗 chore(mcp): update connector
```

## PR Rules
- Title: [Agent Chain] Description
  - 예: [⌨️→🌐→📱] Add monitoring widget
- Body: Agent Chain + V-Index 영향 + 스크린샷(UI)
- Tests 필수

## Deploy Checklist
- [ ] 테스트 통과 (vitest + pytest)
- [ ] TypeScript 에러 없음
- [ ] 환경변수 확인
- [ ] DB 마이그레이션 확인
- [ ] V-Index 정합성

## Deploy Commands
```bash
vercel --prod          # Frontend
railway up             # API
curl -X POST $MOLTBOT_WEBHOOK/deploy/all  # Full
```

## Post-Deploy
1. Chrome UI 검증
2. API 헬스체크
3. 몰트봇 알림
4. Git tag
AUTUS_EOF
echo "  ✅ ④ git-deploy.mdc"

# ============================================================
# ⑤ .cursor/rules/autus-physics.mdc
# ============================================================
cat > .cursor/rules/autus-physics.mdc << 'AUTUS_EOF'
---
description: AUTUS 물리 모델 및 도메인 컨텍스트
globs: ["**/autus/**", "**/physics/**", "**/model/**", "**/v-index/**"]
alwaysApply: false
---

# AUTUS Domain Context

## Physics Model
48-node hierarchy:
- L0 (World): 글로벌 경제/시장
- L1 (Nation): 국가 규제/정책
- L2 (Org): 조직 성과/건강
- L3 (Team): 팀 협업/동역학
- L4 (Block): 개인 행동/패턴

## V-Index
```
V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t
```
- Base: 기본 건강도 (0-100)
- Motions: 긍정 동작
- Threats: 위협/리스크
- 상호지수: 관계 계수 (0-1)
- Relations: 네트워크 밀도
- t: 시간 계수

## Data Flow
```
OAuth (Gmail,Calendar,Slack,GitHub,Notion)
→ Event Ledger (Immutable PostgreSQL)
→ Physics Engine (48-node)
→ V-Index
→ Dashboard (3D Force-directed)
→ Alert (몰트봇→Telegram)
```

## API Response Pattern
```json
{
  "data": { },
  "meta": {
    "vIndex": 73.4,
    "timestamp": "...",
    "nodeLevel": "L2",
    "confidence": 0.89
  }
}
```

## Rules
1. 물리 모델 변경 = Plan Mode 승인
2. V-Index 로직 변경 = L0-L4 전체 테스트
3. Event Ledger = append only
4. 대시보드 = Tesla dark theme
5. Force graph = 60fps 미만이면 노드 축소
AUTUS_EOF
echo "  ✅ ⑤ autus-physics.mdc"

# ============================================================
# ⑥ .claude/commands/route.md
# ============================================================
cat > .claude/commands/route.md << 'AUTUS_EOF'
# Route Task

## Variables
TASK_DESCRIPTION: $ARGUMENTS

## Instructions
Analyze the following task and determine the optimal 6-agent chain.

Task: "$TASK_DESCRIPTION"

Use the AUTUS Task Router:
1. Extract signals (location, type, needs, output)
2. Score each agent (Trigger×0.3 + Capability×0.5 + Constraint×0.2)
3. Build chain (Entry → Primary → Support → Auto-add)

Output:
```
📍 Chain: [emoji] Agent(role) → [emoji] Agent(role) → ...
📋 Plan:
  1. [Primary action]
  2. [Support action]
  3. [Verify/Notify]
🔍 Signal: location=X, type=Y, needs=[...], output=[...]
```

If I (Claude Code) am Primary → proceed with execution.
If another agent is Primary → explain what to do and where.
AUTUS_EOF
echo "  ✅ ⑥ route.md"

# ============================================================
# ⑦ .claude/commands/deploy.md
# ============================================================
cat > .claude/commands/deploy.md << 'AUTUS_EOF'
# Deploy

## Variables
TARGET: $ARGUMENTS

## Instructions
Execute deployment:

- vercel / frontend: `vercel --prod`
- railway / api: `railway up`
- all / full:
  1. Run all tests first
  2. Deploy API → Railway
  3. Deploy Frontend → Vercel
  4. 몰트봇 notification (if webhook set)

Post-deploy:
- [ ] Health check
- [ ] Chrome verification needed? → Note
- [ ] 몰트봇 → curl $MOLTBOT_WEBHOOK if set
AUTUS_EOF
echo "  ✅ ⑦ deploy.md"

# ============================================================
# ⑧ .claude/commands/status.md
# ============================================================
cat > .claude/commands/status.md << 'AUTUS_EOF'
# System Status

Check all AUTUS systems:

1. Git: branch, uncommitted changes, recent commits
2. Tests: run suite, report pass/fail
3. Deploy: Railway/Vercel CLI available?
4. Env: .env files present?
5. Agents: which are available?

Output:
```
🟢/🔴 Git: branch, status
🟢/🔴 Tests: X passed, Y failed
🟢/🔴 Railway: available/not found
🟢/🔴 Vercel: available/not found
🟢/🔴 Env: present/missing
📱 몰트봇: configured/not set
```
AUTUS_EOF
echo "  ✅ ⑧ status.md"

# ============================================================
# ⑨ .claude/commands/agent.md
# ============================================================
cat > .claude/commands/agent.md << 'AUTUS_EOF'
# Direct Agent Command

## Variables
AGENT_AND_TASK: $ARGUMENTS

## Instructions
Parse first word = agent, rest = task:
- chrome <task> → Chrome agent instructions
- cowork <task> → Cowork instructions
- moltbot <task> → 몰트봇 action
- web <task> → claude.ai action
- code / cc <task> → Execute directly (that's me)

For other agents, output clear instructions for user to follow in that tool.
AUTUS_EOF
echo "  ✅ ⑨ agent.md"

# ============================================================
# ⑩ .claude/commands/chain.md
# ============================================================
cat > .claude/commands/chain.md << 'AUTUS_EOF'
# Task Complete - Chain Report

Generate completion report:

```
## Task Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Agent: Claude Code (Cursor)
- Task: [what was done]
- Files: [changed files]
- Tests: [pass/fail]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Next Steps
- [ ] Chrome: [UI verify?]
- [ ] 몰트봇: [notify?]
- [ ] Cowork: [docs?]
- [ ] Connectors: [PR/issue?]
```
AUTUS_EOF
echo "  ✅ ⑩ chain.md"

# ============================================================
# 완료
# ============================================================
echo ""
echo "  ┌───────────────────────────────────────┐"
echo "  │  ✅ 설치 완료! (10 files)             │"
echo "  ├───────────────────────────────────────┤"
echo "  │                                       │"
echo "  │  📝 CLAUDE.md                         │"
echo "  │  📋 .cursor/rules/ (4 rules)         │"
echo "  │  ⌨️  .claude/commands/ (5 commands)   │"
echo "  │                                       │"
echo "  │  시작하기:                             │"
echo "  │  Cursor → Claude Code →               │"
echo "  │  /route "작업 설명"                   │"
echo "  │                                       │"
echo "  └───────────────────────────────────────┘"
echo ""
echo "  사용 가능 명령어:"
echo "    /route  \"작업\"  → 에이전트 라우팅"
echo "    /deploy all     → 풀스택 배포"
echo "    /status         → 시스템 상태"
echo "    /agent chrome   → 에이전트 직접 지시"
echo "    /chain          → 완료 리포트"
echo ""
