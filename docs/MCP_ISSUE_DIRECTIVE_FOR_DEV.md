# 🛠 MCP 서버 오류 해결 지시서 (개발팀용)

> Claude Code MCP(Model Context Protocol) 서버 오류 해결 및 서비스 개발 본궤도 복귀를 위한 이슈 리포트·지시서.  
> 단톡방·이슈 트래커에 그대로 전달 가능.

---

## 1. 현상 파악 (Issue Summary)

| 항목 | 내용 |
|------|------|
| **오류 메시지** | `Server disconnected` (failed 상태) |
| **대상 서비스** | `claude-code` (`npx -y @anthropic-ai/claude-code-mcp`) |
| **증상** | Claude 데스크톱 앱 또는 IDE 환경에서 MCP 서버가 실행되지 않거나 즉시 연결 끊김 |

---

## 2. 기술적 원인 추정 (Root Cause Hypothesis)

아래 **3가지 포인트를 우선 점검**할 것.

1. **Node.js 실행 권한 문제**  
   `npx` 실행 시 필요한 권한 부족, 또는 해당 패키지 미설치/손상.

2. **네트워크 및 방화벽**  
   로컬 포트 기반 서버–클라이언트 통신 차단, 또는 외부 라이브러리 로딩 시 타임아웃.

3. **환경 변수 및 경로 오류**  
   MCP 설정 파일(`claude_desktop_config.json` 등)의 `command`/`args` 경로가 실제 환경과 불일치.

---

## 3. 해결 단계 지시 (Action Items)

**아래 순서대로 조치 후 보고할 것.**

| # | 조치 | 상세 |
|---|------|------|
| 1 | **로그 분석** | "로그 보기"에서 **Error Stack** 및 **Exit Code** 확인 후 기록. |
| 2 | **독립 실행 테스트** | 터미널에서 `npx -y @anthropic-ai/claude-code-mcp` 직접 실행 → 서버 단독 구동 여부 확인. |
| 3 | **환경 재설정** | `node -v`, `npm -v`로 **LTS 여부** 확인. MCP 설정에서 `npx` 대신 해당 패키지 **절대 경로**로 재시도. |
| 4 | **대안 전환** | 로컬 MCP 구축에 **2시간 이상** 소요 시, **Supabase Edge Functions** 기반 클라우드 자동화로 즉시 전환. |

---

## 4. 사업적 코멘트 (우선순위 안내)

> 현재 온리쌤 프로젝트의 핵심은 **[6초 영상 클리핑]**과 **[AI 리포트 자동화]**입니다.  
> 로컬 MCP 세팅에 과도한 시간을 쓰지 말고, **학생 역량(점수, 방향성, 성향, 속도, 전인적 관점)을 데이터 로그로 변환하는 핵심 로직 구현**에 집중할 것.

---

## 5. 참고 문서

- MCP 이슈·Edge 권고 요약: `docs/MCP_ISSUE_AND_EDGE_RECOMMENDATION.md`
- Supabase Edge 예시: `allthatbasket/supabase/functions/` (e.g. `moltbot-timeline`, `session-end`)

---

**전달처:** 개발팀 단톡방 / 이슈 트래커  
**다음 단계 제안:** MCP 해결 대기 중 **AI 리포트 5대 지표 자동 생성 프롬프트** 기획·설계 진행 시 개발 복귀 후 연동 속도 확보 가능.
