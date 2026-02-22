# AUTUS 개발 환경 — 최적화 권고

현재 아키텍처(대화 기반 개발)보다 **더 좋은 최적의 환경**을 위한 권고 사항.

---

## 1. 브라우저 자동화

| 현재 | 권고 |
|------|------|
| Claude in Chrome (VPN/WSS 이슈) | **Playwright MCP를 기본**으로 사용. Cursor에서 브라우저 조작·스크린샷·테스트 일원화 |
| Chrome 프로필 의존 | 필요 시에만 Chrome 프로필 연결(카카오·Google Play 등). 기본은 Playwright 기본 launch |

- 규칙: `.cursor/rules/browser-automation.mdc` 참고

### Chrome 연결 안 될 때 (VPN / WebSocket)

- **원인**: VPN이 `wss://bridge.claudeusercontent.com` 차단 → Claude in Chrome 전부 끊김. Control Chrome은 탭/URL은 되지만 JS 실행 실패.
- **해결**: VPN 비활성화(확장 프로그램 OFF) → Chrome 완전 종료(Cmd+Q) → Chrome 재실행.
- 상세 진단표·절차: `.cursor/rules/browser-automation.mdc` 섹션 "Chrome 연결 문제 진단" 참고.

---

## 2. 갭 해소 우선순위

1. **HIGH**  
   - Chrome Extension 대체: Playwright MCP로 이미 대체 가능 → 문서/HTML에서 "기본 세팅"으로 반영  
   - 카카오 로그인: Playwright MCP로 개발/테스트 환경 자동화 또는 수동 1회 생성 후 재사용  

2. **MID**  
   - Sentry MCP: 에러 모니터링 자동 확인·이슈 링크 공유  
   - PostHog MCP: 유저 이벤트·퍼널 분석을 대화에서 바로 조회  
   - TestFlight: EAS 빌드 후 수동 업로드 → 가능하면 Fastlane/CI로 자동화 검토  

3. **LOW**  
   - Google Play 인증: 위임 진행 후 체크리스트에서 제거  

---

## 3. 문서·시각화 유지

- **단일 소스**: 아키텍처 뷰는 `docs/autus-dev-architecture.html`을 canonical으로 유지  
- **업데이트**: 노드 추가/상태 변경 시 HTML 내 해당 블록만 수정. 추후 레이어·노드·갭을 JSON/YAML로 분리하면 스크립트로 HTML 생성 가능  
- **링크**: 대시보드·내부 문서에서 "개발 아키텍처" 링크 시 위 HTML 또는 이 문서로 연결  

---

## 4. 파이프라인 일원화

- **대화 → Cursor → MCP → 인프라 → 출력** 흐름 유지  
- 배포 시: 테스트 통과 → 배포 명령 → **몰트봇 알림** 자동 추가(규칙 준수)  
- UI 변경 시: **Chrome(또는 Playwright MCP) 검증** 코멘트 추가  

---

## 5. 정리

**최적의 환경** =  
- Playwright MCP 기본 사용으로 브라우저 이슈 최소화  
- 갭을 HIGH → MID → LOW 순으로 해소  
- 아키텍처 문서(HTML)를 repo에 두고 필요 시 데이터(JSON/YAML) 분리로 확장  
- 배포·UI 검증 시 기존 Agent Chain 규칙 유지  

이 문서와 `autus-dev-architecture.html`을 주기적으로 맞춰 두면 "현재 구조 + 다음에 할 일"을 한눈에 유지할 수 있다.
