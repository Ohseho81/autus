# AUTUS UI v1 설정 가이드

## 빠른 시작

```bash
cd autus-ui-v1
npm install
npm run dev
```

## Claude API 연동 설정

### 1. API 키 발급
1. [Anthropic Console](https://console.anthropic.com/) 접속
2. 로그인 또는 회원가입
3. API Keys → Create Key
4. 키 복사 (sk-ant-api03-xxxxx 형태)

### 2. 환경 변수 설정
```bash
# .env.example을 복사
cp .env.example .env

# .env 파일 편집
nano .env  # 또는 원하는 에디터로
```

`.env` 파일 내용:
```
VITE_CLAUDE_API_KEY=sk-ant-api03-여기에-실제-키-입력
VITE_ENABLE_AI_ASSIST=true
```

### 3. 확인
개발 서버 재시작 후 AI 기능이 활성화됩니다:
- Decision 자동 분류 (cost/reversibility/blast_radius)
- 리스크 자동 평가
- 승인/거부 추천

## 기능 플래그

| 환경변수 | 기본값 | 설명 |
|---------|--------|------|
| `VITE_ENABLE_AI_ASSIST` | true | AI 보조 기능 전체 on/off |
| `VITE_ENABLE_AUTO_CLASSIFY` | true | 자동 분류 |
| `VITE_ENABLE_RISK_SCORING` | true | 리스크 점수 |

## Supabase 연동 (선택)

실시간 데이터 동기화가 필요한 경우:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

## 보안 주의사항

- `.env` 파일은 **절대 git에 커밋하지 마세요**
- `.gitignore`에 이미 `.env`가 포함되어 있습니다
- API 키는 주기적으로 교체하세요

## 테스트

```bash
npm test  # 시뮬레이션 테스트 실행
```

## 트러블슈팅

### AI가 동작하지 않음
1. `.env` 파일이 존재하는지 확인
2. API 키가 올바른지 확인
3. 개발 서버 재시작

### CORS 에러
- 브라우저에서 직접 Claude API 호출 시 발생
- 프로덕션에서는 백엔드 프록시 필요

---

문의: AUTUS 개발팀
