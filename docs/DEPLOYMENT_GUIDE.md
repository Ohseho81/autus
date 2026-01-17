# AUTUS v14.0 배포 가이드

## 📋 체크리스트

### 1. Supabase 설정
- [ ] 프로젝트 생성: https://supabase.com
- [ ] SQL Editor에서 `backend/db/autus_full_schema.sql` 실행
- [ ] API Keys 복사 (anon, service_role)

### 2. Netlify 프론트엔드
- [ ] GitHub repo 연결
- [ ] Build settings:
  - Base directory: `frontend/deploy`
  - Publish directory: `frontend/deploy`
- [ ] 커스텀 도메인: `autus-ai.com`

### 3. Railway 백엔드
- [ ] GitHub repo 연결
- [ ] Environment Variables 설정 (`.env.example` 참조)
- [ ] Deploy

### 4. n8n Self-Evolution
- [ ] n8n Cloud 또는 Self-hosted 설정
- [ ] `backend/workflows/autus_self_evolution.json` 임포트
- [ ] Credentials 설정:
  - Gemini API Key
  - Supabase API
  - Slack Bot Token

---

## 🚀 빠른 배포

### Railway CLI
```bash
# 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# 배포
railway up
```

### Netlify CLI
```bash
# 설치
npm install -g netlify-cli

# 로그인
netlify login

# 배포
cd frontend/deploy
netlify deploy --prod
```

---

## 🔗 배포 URL

| 서비스 | URL |
|--------|-----|
| Frontend | https://autus-ai.com |
| Backend | https://autus-api.railway.app |
| API Docs | https://autus-api.railway.app/docs |
| n8n | https://n8n.autus-ai.com |

---

## 📊 환경별 설정

### Development
```
DEBUG=true
DATABASE_URL=postgresql://localhost:5432/autus_dev
```

### Production
```
DEBUG=false
DATABASE_URL=postgresql://...supabase.co/postgres
```

---

## 🔐 필수 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | ✅ | Supabase PostgreSQL |
| `SUPABASE_URL` | ✅ | Supabase API URL |
| `ANTHROPIC_API_KEY` | ✅ | Claude API |
| `GOOGLE_API_KEY` | ⚠️ | Gemini (Fallback) |
| `JWT_SECRET` | ✅ | 인증 시크릿 |
