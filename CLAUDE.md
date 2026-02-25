# AUTUS 6-Agent Routing System

## Overview
- **Type**: Multi-product Platform
- **Products**: 온리쌤(학원), 뷰티(미용실), 올댓바스켓(체육학원), 숙제(sw_*), 시설관리(zf_*)
- **Stack**: Next.js 14+ / FastAPI / PostgreSQL / Supabase / Vercel
- **Architecture**: Physics-based 48-node L0-L4 hierarchy
- **Agent System**: 6-Layer Task Router
- **DB**: Supabase `pphzvnaedmzcvpxjulti` (121 tables, 27 Edge Functions)
- **Current Focus**: 온리쌤 안정화 → 뷰티 스펙 정리

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
- **Channel**: t.me/autus_seho_bot (@autus_seho_bot)
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

### V-Index (이중 공식 체계)

**이론 공식 (AUTUS_SPEC — 장기/학술용)**
```
V = P × Λ × e^(σt)

P = 관계 밀도 (0~1)
Λ = 상호 시간가치 (λ_A × t_A→B + λ_B × t_B→A)
σ = 시너지 계수 (-1~+1)
t = 관계 지속 기간
```

**실행 공식 (Dashboard/MVP — 현재 코드 기준)**
```
V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t

Base = 노드 기본 가치
Motions = 9가지 가치 이동 합산
Threats = 위협 요소 (이탈, 미수금 등)
```

> 두 공식은 같은 모델의 다른 해상도.
> 이론 공식은 관계 단위(edge), 실행 공식은 노드 단위(node) 집계.
> 코드 수정 시 이론 공식 기준으로 수렴할 것.

### Data Flow
OAuth → Event Ledger → Physics Engine → V-Index → Dashboard → 몰트봇

### Critical Rules
1. NEVER deploy without tests
2. ALWAYS route mobile tasks through 몰트봇
3. ALWAYS Chrome verify UI changes
4. ALWAYS 몰트봇 notify after deploy
5. NEVER modify physics model without plan mode
6. Event Ledger = append only (no UPDATE/DELETE)
