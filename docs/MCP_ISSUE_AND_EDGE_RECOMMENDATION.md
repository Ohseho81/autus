# MCP 연결 끊김 + 자동화 아키텍처 권고

## 1. 현재 기술적 문제

**증상**: MCP(Model Context Protocol) 서버가 **Server disconnected** 상태로 멈춤.

**발생 맥락**: 온리쌤 자동화 로직을 코드로 구현·테스트하는 과정에서의 환경 설정 이슈.

**즉시 점검 사항**:
- `npx -y @anthropic-ai/claude-code-mcp` 실행 시 **로컬 Node.js 권한** 또는 **네트워크/방화벽**에 의해 차단되는지 확인.
- VPN/프록시 여부, 회사 방화벽, 로컬 방화벽(맥/윈도우) 예외 설정 검토.

---

## 2. 사업적 권고 (확장성)

**로컬 MCP에 의존하기보다**, 아래 방향을 권고함.

> **Supabase Edge Functions를 사용하여 클라우드 환경에서 직접 자동화 파이프라인을 구축하라.**

**이유**:
- 유저 증대에 따른 **확장성** 확보에 유리.
- 로컬 환경(권한/방화벽) 이슈와 분리된 **안정적인 실행**.
- 이미 온리쌤이 Supabase(DB + Auth)를 사용 중이므로 Edge Functions로 웹훅·스케줄·알림 파이프라인을 일원화하기 좋음.

---

## 3. 적용 방향 (온리쌤)

| 구분 | 로컬 MCP 의존 | 권고 (Edge Functions) |
|------|----------------|-------------------------|
| 자동화 트리거 | Cursor/로컬에서만 동작 | Supabase Cron / Webhook으로 24/7 실행 |
| 테스트/디버깅 | 로컬 네트워크 이슈 영향 | Edge 로그·모니터링으로 추적 |
| 확장 | 개발자 PC 부담 | 서버리스로 스케일 아웃 |

**예시**:
- 몰트봇 그림자 로그 → 이미 `moltbot-timeline` Edge Function 사용 중. 이 패턴을 다른 자동화(출석 알림, 리포트 생성 등)에도 확장.
- 정기 점검·리포트 → Supabase Cron으로 Edge Function 호출.

---

## 4. 즉시 조치 체크리스트

- [ ] `npx -y @anthropic-ai/claude-code-mcp` 재실행 후 터미널/방화벽 에러 메시지 확인
- [ ] VPN/프록시 비활성화 후 MCP 재연결 시도
- [ ] 신규 자동화는 **Supabase Edge Functions** 설계 우선 검토
- [ ] 기존 로컬 MCP 의존 플로우는 점진적으로 Edge/Cron/Webhook으로 이전 검토
