# 🚀 Cursor에서 AUTUS 실행하기

## Step 1: 폴더 열기

```
Cursor → File → Open Folder → Desktop/autus 선택
```

---

## Step 2: 터미널 열기

```
Ctrl + ` (백틱) 또는 View → Terminal
```

---

## Step 3: 환경 변수 설정

터미널에서:
```bash
cp .env.example .env
```

그 다음 `.env` 파일 열어서 실제 값 입력:

```env
# Supabase (supabase.com 대시보드에서 복사)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...

# Telegram (BotFather에서 받은 토큰)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=-100123456789

# MoltBot Brain
MOLTBOT_BRAIN_PORT=3001
```

---

## Step 4: Supabase 스키마 적용

### 옵션 A: Supabase CLI (추천)
```bash
# Supabase CLI 설치 (처음만)
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref your-project-id

# 스키마 적용
supabase db push
```

### 옵션 B: 수동 SQL 실행
1. [supabase.com](https://supabase.com) → 프로젝트 → SQL Editor
2. `supabase/migrations/001_allthatbasket_complete.sql` 내용 복붙 → Run
3. `supabase/migrations/002_phase0_lock.sql` 내용 복붙 → Run

---

## Step 5: MoltBot Brain 서버 시작

```bash
cd moltbot-brain
npm install
node server.js
```

성공하면:
```
🧠 MoltBot Brain Server running on port 3001
📊 Dashboard: http://localhost:3001/api/dashboard
```

---

## Step 6: 테스트 확인

새 터미널 탭에서:
```bash
cd moltbot-brain
node test.js
```

결과:
```
📊 테스트 결과: 27/27 통과 ✅
```

---

## Step 7: Telegram Bridge 시작 (선택)

새 터미널 탭에서:
```bash
cd moltbot-bridge
npm install
npm start
```

---

## 🎯 확인 포인트

| 항목 | 확인 방법 |
|------|----------|
| Brain 서버 | http://localhost:3001/api/health |
| 대시보드 | http://localhost:3001/api/dashboard |
| 테스트 | `node test.js` → 27/27 통과 |
| Telegram | `/brain status` 명령어 |

---

## ❓ 자주 발생하는 문제

### "Cannot find module" 에러
```bash
npm install
```

### "SUPABASE_URL is not defined" 에러
```bash
# .env 파일 확인
cat .env
```

### 포트 3001 이미 사용 중
```bash
# 다른 포트로 시작
MOLTBOT_BRAIN_PORT=3002 node server.js
```

---

## 📁 주요 파일 위치

```
autus/
├── .env                    ← 환경변수 (직접 작성)
├── moltbot-brain/
│   ├── server.js          ← 여기서 시작
│   ├── test.js            ← 테스트
│   └── index.js           ← Brain 메인 클래스
├── moltbot-bridge/
│   └── index.js           ← Telegram 봇
└── supabase/
    └── migrations/        ← DB 스키마
```

---

**준비 완료되면 실제 운영 데이터 수집 시작!** 🚀
