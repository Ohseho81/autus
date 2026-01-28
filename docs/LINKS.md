# 🔗 AUTUS 전체 링크 모음

> 생성일: 2026-01-28
> 마지막 업데이트: 자동 생성

---

## 🌐 배포된 서비스 (Production)

| 서비스 | URL | 설명 |
|--------|-----|------|
| **AUTUS 메인** | https://autus-ai.com | 메인 랜딩 페이지 |
| **AUTUS Dashboard** | https://vercel-dfrncqgjm-ohsehos-projects.vercel.app | Tesla Grade BI 대시보드 |
| **AUTUS API** | https://api.autus-ai.com | API 서브도메인 (DNS 전파 중) |
| **AUTUS Dashboard (백업)** | https://autus-dashboard.vercel.app | 대시보드 백업 |

---

## 🤖 봇 & 메신저

| 서비스 | URL | 설명 |
|--------|-----|------|
| **크라톤 (Telegram)** | https://t.me/autus_kraton_bot | AUTUS AI 비서 |
| **Bot ID** | `6733089824` | 허용된 사용자 ID |

---

## 💻 로컬 서비스 (localhost)

| 서비스 | URL | 포트 | 상태 |
|--------|-----|------|------|
| **Ollama** | http://localhost:11434 | 11434 | ✅ 실행 중 |
| **Moltbot Gateway** | http://localhost:18789 | 18789 | ✅ 실행 중 |
| **Frontend Dev 1** | http://localhost:5173 | 5173 | ✅ 실행 중 |
| **Frontend Dev 2** | http://localhost:5174 | 5174 | ✅ 실행 중 |
| **Frontend Dev 3** | http://localhost:5175 | 5175 | ✅ 실행 중 |
| **FastAPI Backend** | http://localhost:8000 | 8000 | ⏸️ 필요 시 실행 |
| **n8n** | http://localhost:5678 | 5678 | ⏸️ 필요 시 실행 |

---

## 📡 API 엔드포인트

### 기본 URL
```
Production: https://api.autus-ai.com/api
Vercel: https://vercel-dfrncqgjm-ohsehos-projects.vercel.app/api
Local: http://localhost:8000/api
```

### 11개 뷰 API (v1)

| 뷰 | 엔드포인트 | 설명 |
|----|------------|------|
| 조종석 | `/api/v1/cockpit` | 전체 현황 |
| 지도 | `/api/v1/map` | 고객 분포 |
| 날씨 | `/api/v1/weather` | 외부 환경 |
| 레이더 | `/api/v1/radar` | 이탈 위험 |
| 스코어 | `/api/v1/score` | 순위 |
| 조류 | `/api/v1/tide` | 흐름 |
| 심전도 | `/api/v1/heartbeat` | 실시간 신호 |
| 현미경 | `/api/v1/microscope` | 고객 상세 |
| 네트워크 | `/api/v1/network` | 관계망 |
| 퍼널 | `/api/v1/funnel` | 전환 분석 |
| 수정구 | `/api/v1/crystal` | 시뮬레이션 |

### 기타 API

| 엔드포인트 | 설명 |
|------------|------|
| `/api/health` | 헬스 체크 |
| `/api/moltbot` | 크라톤 봇 API |
| `/api/moltbot/webhook` | 웹훅 수신 |
| `/api/v1/automation` | 자동화 통계 |
| `/api/brain` | Claude AI |
| `/api/physics` | V-Engine |
| `/api/consensus` | 자동 합의 |

---

## 🗄️ 데이터베이스

| 서비스 | URL | 설명 |
|--------|-----|------|
| **Supabase Dashboard** | https://supabase.com/dashboard | DB 관리 |
| **Supabase API** | `SUPABASE_URL` 환경변수 참조 | PostgreSQL |

---

## 📂 로컬 프로젝트 경로

```
/Users/oseho/Desktop/autus/
├── frontend/          # React 프론트엔드
├── backend/           # FastAPI 백엔드
├── vercel-api/        # Vercel Edge API
├── clawdbot/          # Moltbot 오픈소스
├── n8n/               # n8n 워크플로우
├── docs/              # 문서
└── kraton-v2/         # Kraton UI v2
```

---

## ⚙️ 설정 파일

| 파일 | 경로 |
|------|------|
| **Moltbot 설정** | `~/.moltbot/moltbot.json` |
| **AUTUS Skill** | `~/.moltbot/skills/autus/SKILL.md` |
| **환경변수 예시** | `/Users/oseho/Desktop/autus/.env.example` |

---

## 🚀 빠른 실행 명령어

### 로컬 서비스 시작
```bash
# Ollama
ollama serve

# Moltbot Gateway
cd ~/Desktop/autus/clawdbot && pnpm moltbot gateway --port 18789 --force

# Frontend
cd ~/Desktop/autus/frontend && pnpm dev

# Backend
cd ~/Desktop/autus/backend && uvicorn main:app --reload
```

### API 테스트
```bash
# V-Index 조회
curl "https://api.autus-ai.com/api/v1/cockpit?org_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"

# Moltbot 상태
curl "https://api.autus-ai.com/api/moltbot"
```

---

## 📊 모니터링

| 서비스 | URL |
|--------|-----|
| **Vercel Logs** | https://vercel.com/ohsehos-projects/vercel-api |
| **Supabase Logs** | Supabase Dashboard > Logs |

---

## 🔑 기본 값

| 항목 | 값 |
|------|-----|
| **기본 조직 ID** | `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` |
| **기본 조직명** | KRATON 영어학원 |
| **Telegram 허용 ID** | `6733089824` |

---

*"측정할 수 없으면 관리할 수 없다" - 피터 드러커*
