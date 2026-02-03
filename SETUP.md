# 🚀 AUTUS 설정 가이드

> 현실 작동까지 딱 3단계!

---

## 📋 전제 조건

- Node.js 18+
- Supabase 계정 (무료)
- Telegram 계정

---

## 🔧 1단계: 환경변수 설정

```bash
# .env 파일 생성
cp .env.example .env

# 편집
nano .env  # 또는 code .env
```

### 필수 환경변수

| 변수 | 설명 | 얻는 곳 |
|------|------|---------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | 공개 API 키 | 위와 같음 |
| `TELEGRAM_BOT_TOKEN` | 텔레그램 봇 토큰 | @BotFather |

---

## 🗄️ 2단계: 데이터베이스 설정

### Supabase 프로젝트 생성
1. https://supabase.com 접속
2. New Project 생성
3. Project Settings → API에서 URL과 키 복사

### 스키마 적용
```bash
# Supabase CLI 설치 (없으면)
npm install -g supabase

# 로그인
supabase login

# 스키마 적용
supabase db push
```

또는 Supabase Dashboard → SQL Editor에서 직접 실행:
```sql
-- supabase/migrations/001_allthatbasket_complete.sql 내용 붙여넣기
```

---

## 🤖 3단계: 서비스 시작

```bash
# 전체 시작 (Brain + Telegram)
./scripts/start.sh

# 또는 개별 시작
cd moltbot-brain && npm start    # Brain 서버
cd moltbot-bridge && node index.js  # Telegram 봇
```

### 확인
- Brain API: http://localhost:3030/api/moltbot/health
- Telegram: @autus_seho_bot에 /start 전송

---

## 📱 사용 방법

### Telegram 명령어

```
🧠 Brain (학원 관리)
/brain status     - 시스템 상태
/brain dashboard  - 대시보드
/brain risk       - 위험 학생
/brain rules      - 규칙 목록

💻 Claude (개발)
/claude [요청]    - Claude Code 실행
/build            - 빌드
/deploy           - 배포
/git status       - Git 상태
```

### 웹 대시보드

https://autus-ai.com/#allthatbasket

---

## 🏗️ 프로젝트 구조

```
autus/
├── .env.example          # 환경변수 템플릿
├── SETUP.md              # 이 파일
├── scripts/
│   ├── start.sh          # 서비스 시작
│   ├── stop.sh           # 서비스 중지
│   └── deploy.sh         # 배포
├── moltbot-brain/        # 🧠 AI 두뇌
│   ├── core/             # 핵심 로직
│   ├── adapters/         # 연동 어댑터
│   └── api/              # REST API
├── moltbot-bridge/       # 🤖 Telegram 봇
├── supabase/
│   ├── migrations/       # DB 스키마
│   └── functions/        # Edge Functions
└── kraton-v2/            # 🌐 웹 앱
    └── src/pages/allthatbasket/
```

---

## 🔌 Edge Functions 배포 (선택)

```bash
cd supabase

# 배포
supabase functions deploy attendance-chain
supabase functions deploy payment-webhook
supabase functions deploy moltbot-brain
```

---

## ❓ 문제 해결

### Telegram 봇 409 에러
```bash
pkill -f "node index.js"  # 기존 프로세스 종료
cd moltbot-bridge && node index.js
```

### Supabase 연결 안됨
1. `.env`에 올바른 URL/KEY 확인
2. Supabase Dashboard에서 프로젝트 상태 확인
3. 네트워크 방화벽 확인

### Brain API 응답 없음
```bash
# 포트 확인
lsof -i :3030

# 재시작
./scripts/stop.sh && ./scripts/start.sh
```

---

## 🎯 다음 단계

1. ✅ 환경변수 설정
2. ✅ DB 스키마 적용
3. ✅ 서비스 시작
4. ⏳ 테스트 데이터 입력
5. ⏳ 실제 학원에서 사용

---

💡 **질문?** Telegram @autus_seho_bot으로 `/claude [질문]` 보내세요!
