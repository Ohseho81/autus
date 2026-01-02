# 🚀 AUTUS Production 배포 가이드

## 개요

AUTUS Realtime을 Production 환경에 배포하는 3가지 방법:

| 방법 | 난이도 | 예상 시간 | 권장 상황 |
|------|--------|-----------|-----------|
| **Docker Compose** | ⭐⭐ | 10분 | 자체 서버 운영 |
| **Railway** | ⭐ | 5분 | 빠른 배포, 관리형 |
| **Local Dev** | ⭐ | 3분 | 개발 테스트 |

---

## 🐳 방법 1: Docker Compose (권장)

### 사전 요구사항
- Docker & Docker Compose
- 최소 2GB RAM, 10GB 디스크

### 배포 단계

```bash
# 1. 프로젝트 디렉토리 이동
cd autus_realtime

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # 또는 vi .env

# 3. 원클릭 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh docker
```

### 환경 변수 설정 (.env)

```env
# 필수 설정
DB_PASSWORD=your_secure_password       # 데이터베이스 비밀번호
SECRET_KEY=your_32_char_secret_key     # 앱 비밀키
N8N_PASSWORD=your_n8n_password         # n8n 관리자 비밀번호

# Slack 연동 (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Anthropic API (AI 워크플로 생성용)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| API | http://localhost:8000 | FastAPI 백엔드 |
| Dashboard | http://localhost | 자동화 대시보드 |
| n8n | http://localhost:5678 | 워크플로 엔진 |
| Health | http://localhost:8000/health | 상태 확인 |

### 유용한 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 데이터 포함 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🚂 방법 2: Railway 배포

### 사전 요구사항
- Railway 계정 (https://railway.app)
- GitHub 연동

### 배포 단계

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성 & 배포
cd autus_realtime
railway init
railway up

# 4. 환경 변수 설정 (Railway 대시보드에서)
# - DATABASE_URL (자동 생성된 PostgreSQL 사용)
# - SLACK_WEBHOOK_URL
# - ANTHROPIC_API_KEY
```

### Railway 서비스 구성

1. **PostgreSQL** - 데이터베이스 (Add Plugin)
2. **Redis** - 캐시 (Add Plugin)
3. **AUTUS API** - FastAPI 앱 (자동 배포)

### 환경 변수 (Railway Dashboard)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-api03-...
SECRET_KEY=your_secret_key
```

---

## 💻 방법 3: Local 개발 환경

```bash
# 1. Python 의존성 설치
pip install -r requirements.prod.txt

# 2. 환경 변수 설정
export SLACK_WEBHOOK_URL="your_webhook_url"
export ANTHROPIC_API_KEY="your_api_key"

# 3. 서버 실행
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 4. n8n 별도 실행 (Docker)
docker run -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 🔧 Slack 연동 설정

### Webhook URL 생성

1. https://api.slack.com/apps 접속
2. **Create New App** > **From scratch**
3. App Name: `AUTUS Automation`
4. Workspace 선택
5. **Incoming Webhooks** > **Activate**
6. **Add New Webhook to Workspace**
7. 채널 선택 (예: `#autus-alerts`)
8. Webhook URL 복사 → `.env`에 설정

### 알림 유형

| 이벤트 | 채널 | 설명 |
|--------|------|------|
| 자동화 생성 | #autus-alerts | 새 자동화 생성됨 |
| 가치 경고 | #autus-alerts | 가치 임계값 이하 |
| 패턴 감지 | #autus-ai | AI가 새 패턴 감지 |
| 승인 요청 | #autus-approvals | 워크플로 승인 대기 |
| 시스템 오류 | #autus-errors | 오류 발생 |

---

## 🤖 Anthropic API 연동 설정

### API 키 생성

1. https://console.anthropic.com 접속
2. 로그인 또는 회원가입
3. **API Keys** > **Create Key**
4. 키 복사 → `.env`에 설정

### 사용 용도

| 기능 | 설명 | 모델 |
|------|------|------|
| 워크플로 생성 | 패턴 → n8n JSON | claude-sonnet-4-20250514 |
| 패턴 분석 | 이벤트 분석 | claude-sonnet-4-20250514 |
| 워크플로 개선 | 피드백 기반 수정 | claude-sonnet-4-20250514 |

### 예상 비용

- 워크플로 생성: ~$0.01/건
- 패턴 분석: ~$0.005/건
- 일일 예상: ~$0.50-2.00 (활발한 사용 시)

---

## 📦 n8n 워크플로 임포트

### 자동 임포트

```bash
# Docker 배포 후 자동 실행됨
# 수동 실행:
./scripts/import-n8n-workflows.sh
```

### 수동 임포트

1. n8n 접속 (http://localhost:5678)
2. **Settings** > **Import from File**
3. `workflows/n8n/*.json` 파일 선택
4. 각 워크플로 **Activate** 클릭

### 워크플로 목록

| 파일 | 이름 | 트리거 |
|------|------|--------|
| 01_student_registration.json | 학생 등록 자동화 | Webhook |
| 02_feedback_refinement.json | 피드백 수집 | Webhook |
| 03_ai_workflow_generator.json | AI 워크플로 생성기 | 매일 실행 |
| 04_value_cleanup.json | 가치 계산 + 정리 | 6시간마다 |
| 05_common_templates.json | 공통 템플릿 | 템플릿 |

---

## 🔒 보안 체크리스트

### Production 배포 전 확인

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 모든 비밀번호가 강력한 값으로 설정됨
- [ ] SSL 인증서 설정됨 (Let's Encrypt 권장)
- [ ] CORS_ORIGINS가 실제 도메인으로 제한됨
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 도구 연동됨 (Sentry 등)

### SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install certbot python3-certbot-nginx

# 인증서 발급
certbot --nginx -d autus.io -d api.autus.io -d n8n.autus.io

# 자동 갱신 설정
certbot renew --dry-run
```

---

## 📊 모니터링

### Health Check

```bash
curl http://localhost:8000/health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "n8n": "connected"
  }
}
```

### 메트릭 확인

```bash
curl http://localhost:8000/api/metrics
```

응답:
```json
{
  "total_automations": 5,
  "active_automations": 5,
  "total_executions": 150,
  "success_rate": 0.98,
  "total_value": 3500000
}
```

---

## 🆘 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|-----------|
| DB 연결 실패 | `docker-compose logs autus-db` 확인 |
| n8n 시작 안됨 | 포트 5678 충돌 확인 |
| Slack 알림 안옴 | Webhook URL 검증 |
| AI 생성 실패 | API 키 확인, 잔액 확인 |

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f autus-api
docker-compose -f docker-compose.prod.yml logs -f autus-n8n
```

### 데이터 백업

```bash
# 수동 백업
./scripts/backup.sh

# PostgreSQL 백업
docker exec autus-db pg_dump -U autus autus > backup.sql
```

---

## 🎯 배포 후 체크리스트

1. [ ] API Health 확인 (/health)
2. [ ] Dashboard 접속 확인
3. [ ] n8n 로그인 확인
4. [ ] 워크플로 임포트 확인
5. [ ] Slack 테스트 메시지 전송
6. [ ] 자동화 생성 테스트
7. [ ] 피드백 제출 테스트
8. [ ] AI 워크플로 생성 테스트

---

**♾️ 무한 순환 루프 시작!**

```
[사용자 활동] → [데이터 수집] → [학습·분석] → [자동화 생성] → [실행·피드백] → [보정·개선] → ♾️
```

# 🚀 AUTUS Production 배포 가이드

## 개요

AUTUS Realtime을 Production 환경에 배포하는 3가지 방법:

| 방법 | 난이도 | 예상 시간 | 권장 상황 |
|------|--------|-----------|-----------|
| **Docker Compose** | ⭐⭐ | 10분 | 자체 서버 운영 |
| **Railway** | ⭐ | 5분 | 빠른 배포, 관리형 |
| **Local Dev** | ⭐ | 3분 | 개발 테스트 |

---

## 🐳 방법 1: Docker Compose (권장)

### 사전 요구사항
- Docker & Docker Compose
- 최소 2GB RAM, 10GB 디스크

### 배포 단계

```bash
# 1. 프로젝트 디렉토리 이동
cd autus_realtime

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # 또는 vi .env

# 3. 원클릭 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh docker
```

### 환경 변수 설정 (.env)

```env
# 필수 설정
DB_PASSWORD=your_secure_password       # 데이터베이스 비밀번호
SECRET_KEY=your_32_char_secret_key     # 앱 비밀키
N8N_PASSWORD=your_n8n_password         # n8n 관리자 비밀번호

# Slack 연동 (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Anthropic API (AI 워크플로 생성용)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| API | http://localhost:8000 | FastAPI 백엔드 |
| Dashboard | http://localhost | 자동화 대시보드 |
| n8n | http://localhost:5678 | 워크플로 엔진 |
| Health | http://localhost:8000/health | 상태 확인 |

### 유용한 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 데이터 포함 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🚂 방법 2: Railway 배포

### 사전 요구사항
- Railway 계정 (https://railway.app)
- GitHub 연동

### 배포 단계

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성 & 배포
cd autus_realtime
railway init
railway up

# 4. 환경 변수 설정 (Railway 대시보드에서)
# - DATABASE_URL (자동 생성된 PostgreSQL 사용)
# - SLACK_WEBHOOK_URL
# - ANTHROPIC_API_KEY
```

### Railway 서비스 구성

1. **PostgreSQL** - 데이터베이스 (Add Plugin)
2. **Redis** - 캐시 (Add Plugin)
3. **AUTUS API** - FastAPI 앱 (자동 배포)

### 환경 변수 (Railway Dashboard)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-api03-...
SECRET_KEY=your_secret_key
```

---

## 💻 방법 3: Local 개발 환경

```bash
# 1. Python 의존성 설치
pip install -r requirements.prod.txt

# 2. 환경 변수 설정
export SLACK_WEBHOOK_URL="your_webhook_url"
export ANTHROPIC_API_KEY="your_api_key"

# 3. 서버 실행
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 4. n8n 별도 실행 (Docker)
docker run -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 🔧 Slack 연동 설정

### Webhook URL 생성

1. https://api.slack.com/apps 접속
2. **Create New App** > **From scratch**
3. App Name: `AUTUS Automation`
4. Workspace 선택
5. **Incoming Webhooks** > **Activate**
6. **Add New Webhook to Workspace**
7. 채널 선택 (예: `#autus-alerts`)
8. Webhook URL 복사 → `.env`에 설정

### 알림 유형

| 이벤트 | 채널 | 설명 |
|--------|------|------|
| 자동화 생성 | #autus-alerts | 새 자동화 생성됨 |
| 가치 경고 | #autus-alerts | 가치 임계값 이하 |
| 패턴 감지 | #autus-ai | AI가 새 패턴 감지 |
| 승인 요청 | #autus-approvals | 워크플로 승인 대기 |
| 시스템 오류 | #autus-errors | 오류 발생 |

---

## 🤖 Anthropic API 연동 설정

### API 키 생성

1. https://console.anthropic.com 접속
2. 로그인 또는 회원가입
3. **API Keys** > **Create Key**
4. 키 복사 → `.env`에 설정

### 사용 용도

| 기능 | 설명 | 모델 |
|------|------|------|
| 워크플로 생성 | 패턴 → n8n JSON | claude-sonnet-4-20250514 |
| 패턴 분석 | 이벤트 분석 | claude-sonnet-4-20250514 |
| 워크플로 개선 | 피드백 기반 수정 | claude-sonnet-4-20250514 |

### 예상 비용

- 워크플로 생성: ~$0.01/건
- 패턴 분석: ~$0.005/건
- 일일 예상: ~$0.50-2.00 (활발한 사용 시)

---

## 📦 n8n 워크플로 임포트

### 자동 임포트

```bash
# Docker 배포 후 자동 실행됨
# 수동 실행:
./scripts/import-n8n-workflows.sh
```

### 수동 임포트

1. n8n 접속 (http://localhost:5678)
2. **Settings** > **Import from File**
3. `workflows/n8n/*.json` 파일 선택
4. 각 워크플로 **Activate** 클릭

### 워크플로 목록

| 파일 | 이름 | 트리거 |
|------|------|--------|
| 01_student_registration.json | 학생 등록 자동화 | Webhook |
| 02_feedback_refinement.json | 피드백 수집 | Webhook |
| 03_ai_workflow_generator.json | AI 워크플로 생성기 | 매일 실행 |
| 04_value_cleanup.json | 가치 계산 + 정리 | 6시간마다 |
| 05_common_templates.json | 공통 템플릿 | 템플릿 |

---

## 🔒 보안 체크리스트

### Production 배포 전 확인

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 모든 비밀번호가 강력한 값으로 설정됨
- [ ] SSL 인증서 설정됨 (Let's Encrypt 권장)
- [ ] CORS_ORIGINS가 실제 도메인으로 제한됨
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 도구 연동됨 (Sentry 등)

### SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install certbot python3-certbot-nginx

# 인증서 발급
certbot --nginx -d autus.io -d api.autus.io -d n8n.autus.io

# 자동 갱신 설정
certbot renew --dry-run
```

---

## 📊 모니터링

### Health Check

```bash
curl http://localhost:8000/health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "n8n": "connected"
  }
}
```

### 메트릭 확인

```bash
curl http://localhost:8000/api/metrics
```

응답:
```json
{
  "total_automations": 5,
  "active_automations": 5,
  "total_executions": 150,
  "success_rate": 0.98,
  "total_value": 3500000
}
```

---

## 🆘 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|-----------|
| DB 연결 실패 | `docker-compose logs autus-db` 확인 |
| n8n 시작 안됨 | 포트 5678 충돌 확인 |
| Slack 알림 안옴 | Webhook URL 검증 |
| AI 생성 실패 | API 키 확인, 잔액 확인 |

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f autus-api
docker-compose -f docker-compose.prod.yml logs -f autus-n8n
```

### 데이터 백업

```bash
# 수동 백업
./scripts/backup.sh

# PostgreSQL 백업
docker exec autus-db pg_dump -U autus autus > backup.sql
```

---

## 🎯 배포 후 체크리스트

1. [ ] API Health 확인 (/health)
2. [ ] Dashboard 접속 확인
3. [ ] n8n 로그인 확인
4. [ ] 워크플로 임포트 확인
5. [ ] Slack 테스트 메시지 전송
6. [ ] 자동화 생성 테스트
7. [ ] 피드백 제출 테스트
8. [ ] AI 워크플로 생성 테스트

---

**♾️ 무한 순환 루프 시작!**

```
[사용자 활동] → [데이터 수집] → [학습·분석] → [자동화 생성] → [실행·피드백] → [보정·개선] → ♾️
```

# 🚀 AUTUS Production 배포 가이드

## 개요

AUTUS Realtime을 Production 환경에 배포하는 3가지 방법:

| 방법 | 난이도 | 예상 시간 | 권장 상황 |
|------|--------|-----------|-----------|
| **Docker Compose** | ⭐⭐ | 10분 | 자체 서버 운영 |
| **Railway** | ⭐ | 5분 | 빠른 배포, 관리형 |
| **Local Dev** | ⭐ | 3분 | 개발 테스트 |

---

## 🐳 방법 1: Docker Compose (권장)

### 사전 요구사항
- Docker & Docker Compose
- 최소 2GB RAM, 10GB 디스크

### 배포 단계

```bash
# 1. 프로젝트 디렉토리 이동
cd autus_realtime

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # 또는 vi .env

# 3. 원클릭 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh docker
```

### 환경 변수 설정 (.env)

```env
# 필수 설정
DB_PASSWORD=your_secure_password       # 데이터베이스 비밀번호
SECRET_KEY=your_32_char_secret_key     # 앱 비밀키
N8N_PASSWORD=your_n8n_password         # n8n 관리자 비밀번호

# Slack 연동 (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Anthropic API (AI 워크플로 생성용)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| API | http://localhost:8000 | FastAPI 백엔드 |
| Dashboard | http://localhost | 자동화 대시보드 |
| n8n | http://localhost:5678 | 워크플로 엔진 |
| Health | http://localhost:8000/health | 상태 확인 |

### 유용한 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 데이터 포함 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🚂 방법 2: Railway 배포

### 사전 요구사항
- Railway 계정 (https://railway.app)
- GitHub 연동

### 배포 단계

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성 & 배포
cd autus_realtime
railway init
railway up

# 4. 환경 변수 설정 (Railway 대시보드에서)
# - DATABASE_URL (자동 생성된 PostgreSQL 사용)
# - SLACK_WEBHOOK_URL
# - ANTHROPIC_API_KEY
```

### Railway 서비스 구성

1. **PostgreSQL** - 데이터베이스 (Add Plugin)
2. **Redis** - 캐시 (Add Plugin)
3. **AUTUS API** - FastAPI 앱 (자동 배포)

### 환경 변수 (Railway Dashboard)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-api03-...
SECRET_KEY=your_secret_key
```

---

## 💻 방법 3: Local 개발 환경

```bash
# 1. Python 의존성 설치
pip install -r requirements.prod.txt

# 2. 환경 변수 설정
export SLACK_WEBHOOK_URL="your_webhook_url"
export ANTHROPIC_API_KEY="your_api_key"

# 3. 서버 실행
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 4. n8n 별도 실행 (Docker)
docker run -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 🔧 Slack 연동 설정

### Webhook URL 생성

1. https://api.slack.com/apps 접속
2. **Create New App** > **From scratch**
3. App Name: `AUTUS Automation`
4. Workspace 선택
5. **Incoming Webhooks** > **Activate**
6. **Add New Webhook to Workspace**
7. 채널 선택 (예: `#autus-alerts`)
8. Webhook URL 복사 → `.env`에 설정

### 알림 유형

| 이벤트 | 채널 | 설명 |
|--------|------|------|
| 자동화 생성 | #autus-alerts | 새 자동화 생성됨 |
| 가치 경고 | #autus-alerts | 가치 임계값 이하 |
| 패턴 감지 | #autus-ai | AI가 새 패턴 감지 |
| 승인 요청 | #autus-approvals | 워크플로 승인 대기 |
| 시스템 오류 | #autus-errors | 오류 발생 |

---

## 🤖 Anthropic API 연동 설정

### API 키 생성

1. https://console.anthropic.com 접속
2. 로그인 또는 회원가입
3. **API Keys** > **Create Key**
4. 키 복사 → `.env`에 설정

### 사용 용도

| 기능 | 설명 | 모델 |
|------|------|------|
| 워크플로 생성 | 패턴 → n8n JSON | claude-sonnet-4-20250514 |
| 패턴 분석 | 이벤트 분석 | claude-sonnet-4-20250514 |
| 워크플로 개선 | 피드백 기반 수정 | claude-sonnet-4-20250514 |

### 예상 비용

- 워크플로 생성: ~$0.01/건
- 패턴 분석: ~$0.005/건
- 일일 예상: ~$0.50-2.00 (활발한 사용 시)

---

## 📦 n8n 워크플로 임포트

### 자동 임포트

```bash
# Docker 배포 후 자동 실행됨
# 수동 실행:
./scripts/import-n8n-workflows.sh
```

### 수동 임포트

1. n8n 접속 (http://localhost:5678)
2. **Settings** > **Import from File**
3. `workflows/n8n/*.json` 파일 선택
4. 각 워크플로 **Activate** 클릭

### 워크플로 목록

| 파일 | 이름 | 트리거 |
|------|------|--------|
| 01_student_registration.json | 학생 등록 자동화 | Webhook |
| 02_feedback_refinement.json | 피드백 수집 | Webhook |
| 03_ai_workflow_generator.json | AI 워크플로 생성기 | 매일 실행 |
| 04_value_cleanup.json | 가치 계산 + 정리 | 6시간마다 |
| 05_common_templates.json | 공통 템플릿 | 템플릿 |

---

## 🔒 보안 체크리스트

### Production 배포 전 확인

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 모든 비밀번호가 강력한 값으로 설정됨
- [ ] SSL 인증서 설정됨 (Let's Encrypt 권장)
- [ ] CORS_ORIGINS가 실제 도메인으로 제한됨
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 도구 연동됨 (Sentry 등)

### SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install certbot python3-certbot-nginx

# 인증서 발급
certbot --nginx -d autus.io -d api.autus.io -d n8n.autus.io

# 자동 갱신 설정
certbot renew --dry-run
```

---

## 📊 모니터링

### Health Check

```bash
curl http://localhost:8000/health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "n8n": "connected"
  }
}
```

### 메트릭 확인

```bash
curl http://localhost:8000/api/metrics
```

응답:
```json
{
  "total_automations": 5,
  "active_automations": 5,
  "total_executions": 150,
  "success_rate": 0.98,
  "total_value": 3500000
}
```

---

## 🆘 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|-----------|
| DB 연결 실패 | `docker-compose logs autus-db` 확인 |
| n8n 시작 안됨 | 포트 5678 충돌 확인 |
| Slack 알림 안옴 | Webhook URL 검증 |
| AI 생성 실패 | API 키 확인, 잔액 확인 |

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f autus-api
docker-compose -f docker-compose.prod.yml logs -f autus-n8n
```

### 데이터 백업

```bash
# 수동 백업
./scripts/backup.sh

# PostgreSQL 백업
docker exec autus-db pg_dump -U autus autus > backup.sql
```

---

## 🎯 배포 후 체크리스트

1. [ ] API Health 확인 (/health)
2. [ ] Dashboard 접속 확인
3. [ ] n8n 로그인 확인
4. [ ] 워크플로 임포트 확인
5. [ ] Slack 테스트 메시지 전송
6. [ ] 자동화 생성 테스트
7. [ ] 피드백 제출 테스트
8. [ ] AI 워크플로 생성 테스트

---

**♾️ 무한 순환 루프 시작!**

```
[사용자 활동] → [데이터 수집] → [학습·분석] → [자동화 생성] → [실행·피드백] → [보정·개선] → ♾️
```

# 🚀 AUTUS Production 배포 가이드

## 개요

AUTUS Realtime을 Production 환경에 배포하는 3가지 방법:

| 방법 | 난이도 | 예상 시간 | 권장 상황 |
|------|--------|-----------|-----------|
| **Docker Compose** | ⭐⭐ | 10분 | 자체 서버 운영 |
| **Railway** | ⭐ | 5분 | 빠른 배포, 관리형 |
| **Local Dev** | ⭐ | 3분 | 개발 테스트 |

---

## 🐳 방법 1: Docker Compose (권장)

### 사전 요구사항
- Docker & Docker Compose
- 최소 2GB RAM, 10GB 디스크

### 배포 단계

```bash
# 1. 프로젝트 디렉토리 이동
cd autus_realtime

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # 또는 vi .env

# 3. 원클릭 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh docker
```

### 환경 변수 설정 (.env)

```env
# 필수 설정
DB_PASSWORD=your_secure_password       # 데이터베이스 비밀번호
SECRET_KEY=your_32_char_secret_key     # 앱 비밀키
N8N_PASSWORD=your_n8n_password         # n8n 관리자 비밀번호

# Slack 연동 (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Anthropic API (AI 워크플로 생성용)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| API | http://localhost:8000 | FastAPI 백엔드 |
| Dashboard | http://localhost | 자동화 대시보드 |
| n8n | http://localhost:5678 | 워크플로 엔진 |
| Health | http://localhost:8000/health | 상태 확인 |

### 유용한 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 데이터 포함 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🚂 방법 2: Railway 배포

### 사전 요구사항
- Railway 계정 (https://railway.app)
- GitHub 연동

### 배포 단계

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성 & 배포
cd autus_realtime
railway init
railway up

# 4. 환경 변수 설정 (Railway 대시보드에서)
# - DATABASE_URL (자동 생성된 PostgreSQL 사용)
# - SLACK_WEBHOOK_URL
# - ANTHROPIC_API_KEY
```

### Railway 서비스 구성

1. **PostgreSQL** - 데이터베이스 (Add Plugin)
2. **Redis** - 캐시 (Add Plugin)
3. **AUTUS API** - FastAPI 앱 (자동 배포)

### 환경 변수 (Railway Dashboard)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-api03-...
SECRET_KEY=your_secret_key
```

---

## 💻 방법 3: Local 개발 환경

```bash
# 1. Python 의존성 설치
pip install -r requirements.prod.txt

# 2. 환경 변수 설정
export SLACK_WEBHOOK_URL="your_webhook_url"
export ANTHROPIC_API_KEY="your_api_key"

# 3. 서버 실행
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 4. n8n 별도 실행 (Docker)
docker run -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 🔧 Slack 연동 설정

### Webhook URL 생성

1. https://api.slack.com/apps 접속
2. **Create New App** > **From scratch**
3. App Name: `AUTUS Automation`
4. Workspace 선택
5. **Incoming Webhooks** > **Activate**
6. **Add New Webhook to Workspace**
7. 채널 선택 (예: `#autus-alerts`)
8. Webhook URL 복사 → `.env`에 설정

### 알림 유형

| 이벤트 | 채널 | 설명 |
|--------|------|------|
| 자동화 생성 | #autus-alerts | 새 자동화 생성됨 |
| 가치 경고 | #autus-alerts | 가치 임계값 이하 |
| 패턴 감지 | #autus-ai | AI가 새 패턴 감지 |
| 승인 요청 | #autus-approvals | 워크플로 승인 대기 |
| 시스템 오류 | #autus-errors | 오류 발생 |

---

## 🤖 Anthropic API 연동 설정

### API 키 생성

1. https://console.anthropic.com 접속
2. 로그인 또는 회원가입
3. **API Keys** > **Create Key**
4. 키 복사 → `.env`에 설정

### 사용 용도

| 기능 | 설명 | 모델 |
|------|------|------|
| 워크플로 생성 | 패턴 → n8n JSON | claude-sonnet-4-20250514 |
| 패턴 분석 | 이벤트 분석 | claude-sonnet-4-20250514 |
| 워크플로 개선 | 피드백 기반 수정 | claude-sonnet-4-20250514 |

### 예상 비용

- 워크플로 생성: ~$0.01/건
- 패턴 분석: ~$0.005/건
- 일일 예상: ~$0.50-2.00 (활발한 사용 시)

---

## 📦 n8n 워크플로 임포트

### 자동 임포트

```bash
# Docker 배포 후 자동 실행됨
# 수동 실행:
./scripts/import-n8n-workflows.sh
```

### 수동 임포트

1. n8n 접속 (http://localhost:5678)
2. **Settings** > **Import from File**
3. `workflows/n8n/*.json` 파일 선택
4. 각 워크플로 **Activate** 클릭

### 워크플로 목록

| 파일 | 이름 | 트리거 |
|------|------|--------|
| 01_student_registration.json | 학생 등록 자동화 | Webhook |
| 02_feedback_refinement.json | 피드백 수집 | Webhook |
| 03_ai_workflow_generator.json | AI 워크플로 생성기 | 매일 실행 |
| 04_value_cleanup.json | 가치 계산 + 정리 | 6시간마다 |
| 05_common_templates.json | 공통 템플릿 | 템플릿 |

---

## 🔒 보안 체크리스트

### Production 배포 전 확인

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 모든 비밀번호가 강력한 값으로 설정됨
- [ ] SSL 인증서 설정됨 (Let's Encrypt 권장)
- [ ] CORS_ORIGINS가 실제 도메인으로 제한됨
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 도구 연동됨 (Sentry 등)

### SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install certbot python3-certbot-nginx

# 인증서 발급
certbot --nginx -d autus.io -d api.autus.io -d n8n.autus.io

# 자동 갱신 설정
certbot renew --dry-run
```

---

## 📊 모니터링

### Health Check

```bash
curl http://localhost:8000/health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "n8n": "connected"
  }
}
```

### 메트릭 확인

```bash
curl http://localhost:8000/api/metrics
```

응답:
```json
{
  "total_automations": 5,
  "active_automations": 5,
  "total_executions": 150,
  "success_rate": 0.98,
  "total_value": 3500000
}
```

---

## 🆘 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|-----------|
| DB 연결 실패 | `docker-compose logs autus-db` 확인 |
| n8n 시작 안됨 | 포트 5678 충돌 확인 |
| Slack 알림 안옴 | Webhook URL 검증 |
| AI 생성 실패 | API 키 확인, 잔액 확인 |

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f autus-api
docker-compose -f docker-compose.prod.yml logs -f autus-n8n
```

### 데이터 백업

```bash
# 수동 백업
./scripts/backup.sh

# PostgreSQL 백업
docker exec autus-db pg_dump -U autus autus > backup.sql
```

---

## 🎯 배포 후 체크리스트

1. [ ] API Health 확인 (/health)
2. [ ] Dashboard 접속 확인
3. [ ] n8n 로그인 확인
4. [ ] 워크플로 임포트 확인
5. [ ] Slack 테스트 메시지 전송
6. [ ] 자동화 생성 테스트
7. [ ] 피드백 제출 테스트
8. [ ] AI 워크플로 생성 테스트

---

**♾️ 무한 순환 루프 시작!**

```
[사용자 활동] → [데이터 수집] → [학습·분석] → [자동화 생성] → [실행·피드백] → [보정·개선] → ♾️
```

# 🚀 AUTUS Production 배포 가이드

## 개요

AUTUS Realtime을 Production 환경에 배포하는 3가지 방법:

| 방법 | 난이도 | 예상 시간 | 권장 상황 |
|------|--------|-----------|-----------|
| **Docker Compose** | ⭐⭐ | 10분 | 자체 서버 운영 |
| **Railway** | ⭐ | 5분 | 빠른 배포, 관리형 |
| **Local Dev** | ⭐ | 3분 | 개발 테스트 |

---

## 🐳 방법 1: Docker Compose (권장)

### 사전 요구사항
- Docker & Docker Compose
- 최소 2GB RAM, 10GB 디스크

### 배포 단계

```bash
# 1. 프로젝트 디렉토리 이동
cd autus_realtime

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # 또는 vi .env

# 3. 원클릭 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh docker
```

### 환경 변수 설정 (.env)

```env
# 필수 설정
DB_PASSWORD=your_secure_password       # 데이터베이스 비밀번호
SECRET_KEY=your_32_char_secret_key     # 앱 비밀키
N8N_PASSWORD=your_n8n_password         # n8n 관리자 비밀번호

# Slack 연동 (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Anthropic API (AI 워크플로 생성용)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| API | http://localhost:8000 | FastAPI 백엔드 |
| Dashboard | http://localhost | 자동화 대시보드 |
| n8n | http://localhost:5678 | 워크플로 엔진 |
| Health | http://localhost:8000/health | 상태 확인 |

### 유용한 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 데이터 포함 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🚂 방법 2: Railway 배포

### 사전 요구사항
- Railway 계정 (https://railway.app)
- GitHub 연동

### 배포 단계

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성 & 배포
cd autus_realtime
railway init
railway up

# 4. 환경 변수 설정 (Railway 대시보드에서)
# - DATABASE_URL (자동 생성된 PostgreSQL 사용)
# - SLACK_WEBHOOK_URL
# - ANTHROPIC_API_KEY
```

### Railway 서비스 구성

1. **PostgreSQL** - 데이터베이스 (Add Plugin)
2. **Redis** - 캐시 (Add Plugin)
3. **AUTUS API** - FastAPI 앱 (자동 배포)

### 환경 변수 (Railway Dashboard)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-api03-...
SECRET_KEY=your_secret_key
```

---

## 💻 방법 3: Local 개발 환경

```bash
# 1. Python 의존성 설치
pip install -r requirements.prod.txt

# 2. 환경 변수 설정
export SLACK_WEBHOOK_URL="your_webhook_url"
export ANTHROPIC_API_KEY="your_api_key"

# 3. 서버 실행
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 4. n8n 별도 실행 (Docker)
docker run -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 🔧 Slack 연동 설정

### Webhook URL 생성

1. https://api.slack.com/apps 접속
2. **Create New App** > **From scratch**
3. App Name: `AUTUS Automation`
4. Workspace 선택
5. **Incoming Webhooks** > **Activate**
6. **Add New Webhook to Workspace**
7. 채널 선택 (예: `#autus-alerts`)
8. Webhook URL 복사 → `.env`에 설정

### 알림 유형

| 이벤트 | 채널 | 설명 |
|--------|------|------|
| 자동화 생성 | #autus-alerts | 새 자동화 생성됨 |
| 가치 경고 | #autus-alerts | 가치 임계값 이하 |
| 패턴 감지 | #autus-ai | AI가 새 패턴 감지 |
| 승인 요청 | #autus-approvals | 워크플로 승인 대기 |
| 시스템 오류 | #autus-errors | 오류 발생 |

---

## 🤖 Anthropic API 연동 설정

### API 키 생성

1. https://console.anthropic.com 접속
2. 로그인 또는 회원가입
3. **API Keys** > **Create Key**
4. 키 복사 → `.env`에 설정

### 사용 용도

| 기능 | 설명 | 모델 |
|------|------|------|
| 워크플로 생성 | 패턴 → n8n JSON | claude-sonnet-4-20250514 |
| 패턴 분석 | 이벤트 분석 | claude-sonnet-4-20250514 |
| 워크플로 개선 | 피드백 기반 수정 | claude-sonnet-4-20250514 |

### 예상 비용

- 워크플로 생성: ~$0.01/건
- 패턴 분석: ~$0.005/건
- 일일 예상: ~$0.50-2.00 (활발한 사용 시)

---

## 📦 n8n 워크플로 임포트

### 자동 임포트

```bash
# Docker 배포 후 자동 실행됨
# 수동 실행:
./scripts/import-n8n-workflows.sh
```

### 수동 임포트

1. n8n 접속 (http://localhost:5678)
2. **Settings** > **Import from File**
3. `workflows/n8n/*.json` 파일 선택
4. 각 워크플로 **Activate** 클릭

### 워크플로 목록

| 파일 | 이름 | 트리거 |
|------|------|--------|
| 01_student_registration.json | 학생 등록 자동화 | Webhook |
| 02_feedback_refinement.json | 피드백 수집 | Webhook |
| 03_ai_workflow_generator.json | AI 워크플로 생성기 | 매일 실행 |
| 04_value_cleanup.json | 가치 계산 + 정리 | 6시간마다 |
| 05_common_templates.json | 공통 템플릿 | 템플릿 |

---

## 🔒 보안 체크리스트

### Production 배포 전 확인

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 모든 비밀번호가 강력한 값으로 설정됨
- [ ] SSL 인증서 설정됨 (Let's Encrypt 권장)
- [ ] CORS_ORIGINS가 실제 도메인으로 제한됨
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 도구 연동됨 (Sentry 등)

### SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install certbot python3-certbot-nginx

# 인증서 발급
certbot --nginx -d autus.io -d api.autus.io -d n8n.autus.io

# 자동 갱신 설정
certbot renew --dry-run
```

---

## 📊 모니터링

### Health Check

```bash
curl http://localhost:8000/health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "n8n": "connected"
  }
}
```

### 메트릭 확인

```bash
curl http://localhost:8000/api/metrics
```

응답:
```json
{
  "total_automations": 5,
  "active_automations": 5,
  "total_executions": 150,
  "success_rate": 0.98,
  "total_value": 3500000
}
```

---

## 🆘 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|-----------|
| DB 연결 실패 | `docker-compose logs autus-db` 확인 |
| n8n 시작 안됨 | 포트 5678 충돌 확인 |
| Slack 알림 안옴 | Webhook URL 검증 |
| AI 생성 실패 | API 키 확인, 잔액 확인 |

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f autus-api
docker-compose -f docker-compose.prod.yml logs -f autus-n8n
```

### 데이터 백업

```bash
# 수동 백업
./scripts/backup.sh

# PostgreSQL 백업
docker exec autus-db pg_dump -U autus autus > backup.sql
```

---

## 🎯 배포 후 체크리스트

1. [ ] API Health 확인 (/health)
2. [ ] Dashboard 접속 확인
3. [ ] n8n 로그인 확인
4. [ ] 워크플로 임포트 확인
5. [ ] Slack 테스트 메시지 전송
6. [ ] 자동화 생성 테스트
7. [ ] 피드백 제출 테스트
8. [ ] AI 워크플로 생성 테스트

---

**♾️ 무한 순환 루프 시작!**

```
[사용자 활동] → [데이터 수집] → [학습·분석] → [자동화 생성] → [실행·피드백] → [보정·개선] → ♾️
```











# 🚀 AUTUS Production 배포 가이드

## 개요

AUTUS Realtime을 Production 환경에 배포하는 3가지 방법:

| 방법 | 난이도 | 예상 시간 | 권장 상황 |
|------|--------|-----------|-----------|
| **Docker Compose** | ⭐⭐ | 10분 | 자체 서버 운영 |
| **Railway** | ⭐ | 5분 | 빠른 배포, 관리형 |
| **Local Dev** | ⭐ | 3분 | 개발 테스트 |

---

## 🐳 방법 1: Docker Compose (권장)

### 사전 요구사항
- Docker & Docker Compose
- 최소 2GB RAM, 10GB 디스크

### 배포 단계

```bash
# 1. 프로젝트 디렉토리 이동
cd autus_realtime

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # 또는 vi .env

# 3. 원클릭 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh docker
```

### 환경 변수 설정 (.env)

```env
# 필수 설정
DB_PASSWORD=your_secure_password       # 데이터베이스 비밀번호
SECRET_KEY=your_32_char_secret_key     # 앱 비밀키
N8N_PASSWORD=your_n8n_password         # n8n 관리자 비밀번호

# Slack 연동 (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Anthropic API (AI 워크플로 생성용)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| API | http://localhost:8000 | FastAPI 백엔드 |
| Dashboard | http://localhost | 자동화 대시보드 |
| n8n | http://localhost:5678 | 워크플로 엔진 |
| Health | http://localhost:8000/health | 상태 확인 |

### 유용한 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 데이터 포함 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🚂 방법 2: Railway 배포

### 사전 요구사항
- Railway 계정 (https://railway.app)
- GitHub 연동

### 배포 단계

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성 & 배포
cd autus_realtime
railway init
railway up

# 4. 환경 변수 설정 (Railway 대시보드에서)
# - DATABASE_URL (자동 생성된 PostgreSQL 사용)
# - SLACK_WEBHOOK_URL
# - ANTHROPIC_API_KEY
```

### Railway 서비스 구성

1. **PostgreSQL** - 데이터베이스 (Add Plugin)
2. **Redis** - 캐시 (Add Plugin)
3. **AUTUS API** - FastAPI 앱 (자동 배포)

### 환경 변수 (Railway Dashboard)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-api03-...
SECRET_KEY=your_secret_key
```

---

## 💻 방법 3: Local 개발 환경

```bash
# 1. Python 의존성 설치
pip install -r requirements.prod.txt

# 2. 환경 변수 설정
export SLACK_WEBHOOK_URL="your_webhook_url"
export ANTHROPIC_API_KEY="your_api_key"

# 3. 서버 실행
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 4. n8n 별도 실행 (Docker)
docker run -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 🔧 Slack 연동 설정

### Webhook URL 생성

1. https://api.slack.com/apps 접속
2. **Create New App** > **From scratch**
3. App Name: `AUTUS Automation`
4. Workspace 선택
5. **Incoming Webhooks** > **Activate**
6. **Add New Webhook to Workspace**
7. 채널 선택 (예: `#autus-alerts`)
8. Webhook URL 복사 → `.env`에 설정

### 알림 유형

| 이벤트 | 채널 | 설명 |
|--------|------|------|
| 자동화 생성 | #autus-alerts | 새 자동화 생성됨 |
| 가치 경고 | #autus-alerts | 가치 임계값 이하 |
| 패턴 감지 | #autus-ai | AI가 새 패턴 감지 |
| 승인 요청 | #autus-approvals | 워크플로 승인 대기 |
| 시스템 오류 | #autus-errors | 오류 발생 |

---

## 🤖 Anthropic API 연동 설정

### API 키 생성

1. https://console.anthropic.com 접속
2. 로그인 또는 회원가입
3. **API Keys** > **Create Key**
4. 키 복사 → `.env`에 설정

### 사용 용도

| 기능 | 설명 | 모델 |
|------|------|------|
| 워크플로 생성 | 패턴 → n8n JSON | claude-sonnet-4-20250514 |
| 패턴 분석 | 이벤트 분석 | claude-sonnet-4-20250514 |
| 워크플로 개선 | 피드백 기반 수정 | claude-sonnet-4-20250514 |

### 예상 비용

- 워크플로 생성: ~$0.01/건
- 패턴 분석: ~$0.005/건
- 일일 예상: ~$0.50-2.00 (활발한 사용 시)

---

## 📦 n8n 워크플로 임포트

### 자동 임포트

```bash
# Docker 배포 후 자동 실행됨
# 수동 실행:
./scripts/import-n8n-workflows.sh
```

### 수동 임포트

1. n8n 접속 (http://localhost:5678)
2. **Settings** > **Import from File**
3. `workflows/n8n/*.json` 파일 선택
4. 각 워크플로 **Activate** 클릭

### 워크플로 목록

| 파일 | 이름 | 트리거 |
|------|------|--------|
| 01_student_registration.json | 학생 등록 자동화 | Webhook |
| 02_feedback_refinement.json | 피드백 수집 | Webhook |
| 03_ai_workflow_generator.json | AI 워크플로 생성기 | 매일 실행 |
| 04_value_cleanup.json | 가치 계산 + 정리 | 6시간마다 |
| 05_common_templates.json | 공통 템플릿 | 템플릿 |

---

## 🔒 보안 체크리스트

### Production 배포 전 확인

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 모든 비밀번호가 강력한 값으로 설정됨
- [ ] SSL 인증서 설정됨 (Let's Encrypt 권장)
- [ ] CORS_ORIGINS가 실제 도메인으로 제한됨
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 도구 연동됨 (Sentry 등)

### SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install certbot python3-certbot-nginx

# 인증서 발급
certbot --nginx -d autus.io -d api.autus.io -d n8n.autus.io

# 자동 갱신 설정
certbot renew --dry-run
```

---

## 📊 모니터링

### Health Check

```bash
curl http://localhost:8000/health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "n8n": "connected"
  }
}
```

### 메트릭 확인

```bash
curl http://localhost:8000/api/metrics
```

응답:
```json
{
  "total_automations": 5,
  "active_automations": 5,
  "total_executions": 150,
  "success_rate": 0.98,
  "total_value": 3500000
}
```

---

## 🆘 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|-----------|
| DB 연결 실패 | `docker-compose logs autus-db` 확인 |
| n8n 시작 안됨 | 포트 5678 충돌 확인 |
| Slack 알림 안옴 | Webhook URL 검증 |
| AI 생성 실패 | API 키 확인, 잔액 확인 |

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f autus-api
docker-compose -f docker-compose.prod.yml logs -f autus-n8n
```

### 데이터 백업

```bash
# 수동 백업
./scripts/backup.sh

# PostgreSQL 백업
docker exec autus-db pg_dump -U autus autus > backup.sql
```

---

## 🎯 배포 후 체크리스트

1. [ ] API Health 확인 (/health)
2. [ ] Dashboard 접속 확인
3. [ ] n8n 로그인 확인
4. [ ] 워크플로 임포트 확인
5. [ ] Slack 테스트 메시지 전송
6. [ ] 자동화 생성 테스트
7. [ ] 피드백 제출 테스트
8. [ ] AI 워크플로 생성 테스트

---

**♾️ 무한 순환 루프 시작!**

```
[사용자 활동] → [데이터 수집] → [학습·분석] → [자동화 생성] → [실행·피드백] → [보정·개선] → ♾️
```

# 🚀 AUTUS Production 배포 가이드

## 개요

AUTUS Realtime을 Production 환경에 배포하는 3가지 방법:

| 방법 | 난이도 | 예상 시간 | 권장 상황 |
|------|--------|-----------|-----------|
| **Docker Compose** | ⭐⭐ | 10분 | 자체 서버 운영 |
| **Railway** | ⭐ | 5분 | 빠른 배포, 관리형 |
| **Local Dev** | ⭐ | 3분 | 개발 테스트 |

---

## 🐳 방법 1: Docker Compose (권장)

### 사전 요구사항
- Docker & Docker Compose
- 최소 2GB RAM, 10GB 디스크

### 배포 단계

```bash
# 1. 프로젝트 디렉토리 이동
cd autus_realtime

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # 또는 vi .env

# 3. 원클릭 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh docker
```

### 환경 변수 설정 (.env)

```env
# 필수 설정
DB_PASSWORD=your_secure_password       # 데이터베이스 비밀번호
SECRET_KEY=your_32_char_secret_key     # 앱 비밀키
N8N_PASSWORD=your_n8n_password         # n8n 관리자 비밀번호

# Slack 연동 (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Anthropic API (AI 워크플로 생성용)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| API | http://localhost:8000 | FastAPI 백엔드 |
| Dashboard | http://localhost | 자동화 대시보드 |
| n8n | http://localhost:5678 | 워크플로 엔진 |
| Health | http://localhost:8000/health | 상태 확인 |

### 유용한 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 데이터 포함 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🚂 방법 2: Railway 배포

### 사전 요구사항
- Railway 계정 (https://railway.app)
- GitHub 연동

### 배포 단계

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성 & 배포
cd autus_realtime
railway init
railway up

# 4. 환경 변수 설정 (Railway 대시보드에서)
# - DATABASE_URL (자동 생성된 PostgreSQL 사용)
# - SLACK_WEBHOOK_URL
# - ANTHROPIC_API_KEY
```

### Railway 서비스 구성

1. **PostgreSQL** - 데이터베이스 (Add Plugin)
2. **Redis** - 캐시 (Add Plugin)
3. **AUTUS API** - FastAPI 앱 (자동 배포)

### 환경 변수 (Railway Dashboard)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-api03-...
SECRET_KEY=your_secret_key
```

---

## 💻 방법 3: Local 개발 환경

```bash
# 1. Python 의존성 설치
pip install -r requirements.prod.txt

# 2. 환경 변수 설정
export SLACK_WEBHOOK_URL="your_webhook_url"
export ANTHROPIC_API_KEY="your_api_key"

# 3. 서버 실행
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 4. n8n 별도 실행 (Docker)
docker run -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 🔧 Slack 연동 설정

### Webhook URL 생성

1. https://api.slack.com/apps 접속
2. **Create New App** > **From scratch**
3. App Name: `AUTUS Automation`
4. Workspace 선택
5. **Incoming Webhooks** > **Activate**
6. **Add New Webhook to Workspace**
7. 채널 선택 (예: `#autus-alerts`)
8. Webhook URL 복사 → `.env`에 설정

### 알림 유형

| 이벤트 | 채널 | 설명 |
|--------|------|------|
| 자동화 생성 | #autus-alerts | 새 자동화 생성됨 |
| 가치 경고 | #autus-alerts | 가치 임계값 이하 |
| 패턴 감지 | #autus-ai | AI가 새 패턴 감지 |
| 승인 요청 | #autus-approvals | 워크플로 승인 대기 |
| 시스템 오류 | #autus-errors | 오류 발생 |

---

## 🤖 Anthropic API 연동 설정

### API 키 생성

1. https://console.anthropic.com 접속
2. 로그인 또는 회원가입
3. **API Keys** > **Create Key**
4. 키 복사 → `.env`에 설정

### 사용 용도

| 기능 | 설명 | 모델 |
|------|------|------|
| 워크플로 생성 | 패턴 → n8n JSON | claude-sonnet-4-20250514 |
| 패턴 분석 | 이벤트 분석 | claude-sonnet-4-20250514 |
| 워크플로 개선 | 피드백 기반 수정 | claude-sonnet-4-20250514 |

### 예상 비용

- 워크플로 생성: ~$0.01/건
- 패턴 분석: ~$0.005/건
- 일일 예상: ~$0.50-2.00 (활발한 사용 시)

---

## 📦 n8n 워크플로 임포트

### 자동 임포트

```bash
# Docker 배포 후 자동 실행됨
# 수동 실행:
./scripts/import-n8n-workflows.sh
```

### 수동 임포트

1. n8n 접속 (http://localhost:5678)
2. **Settings** > **Import from File**
3. `workflows/n8n/*.json` 파일 선택
4. 각 워크플로 **Activate** 클릭

### 워크플로 목록

| 파일 | 이름 | 트리거 |
|------|------|--------|
| 01_student_registration.json | 학생 등록 자동화 | Webhook |
| 02_feedback_refinement.json | 피드백 수집 | Webhook |
| 03_ai_workflow_generator.json | AI 워크플로 생성기 | 매일 실행 |
| 04_value_cleanup.json | 가치 계산 + 정리 | 6시간마다 |
| 05_common_templates.json | 공통 템플릿 | 템플릿 |

---

## 🔒 보안 체크리스트

### Production 배포 전 확인

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 모든 비밀번호가 강력한 값으로 설정됨
- [ ] SSL 인증서 설정됨 (Let's Encrypt 권장)
- [ ] CORS_ORIGINS가 실제 도메인으로 제한됨
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 도구 연동됨 (Sentry 등)

### SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install certbot python3-certbot-nginx

# 인증서 발급
certbot --nginx -d autus.io -d api.autus.io -d n8n.autus.io

# 자동 갱신 설정
certbot renew --dry-run
```

---

## 📊 모니터링

### Health Check

```bash
curl http://localhost:8000/health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "n8n": "connected"
  }
}
```

### 메트릭 확인

```bash
curl http://localhost:8000/api/metrics
```

응답:
```json
{
  "total_automations": 5,
  "active_automations": 5,
  "total_executions": 150,
  "success_rate": 0.98,
  "total_value": 3500000
}
```

---

## 🆘 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|-----------|
| DB 연결 실패 | `docker-compose logs autus-db` 확인 |
| n8n 시작 안됨 | 포트 5678 충돌 확인 |
| Slack 알림 안옴 | Webhook URL 검증 |
| AI 생성 실패 | API 키 확인, 잔액 확인 |

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f autus-api
docker-compose -f docker-compose.prod.yml logs -f autus-n8n
```

### 데이터 백업

```bash
# 수동 백업
./scripts/backup.sh

# PostgreSQL 백업
docker exec autus-db pg_dump -U autus autus > backup.sql
```

---

## 🎯 배포 후 체크리스트

1. [ ] API Health 확인 (/health)
2. [ ] Dashboard 접속 확인
3. [ ] n8n 로그인 확인
4. [ ] 워크플로 임포트 확인
5. [ ] Slack 테스트 메시지 전송
6. [ ] 자동화 생성 테스트
7. [ ] 피드백 제출 테스트
8. [ ] AI 워크플로 생성 테스트

---

**♾️ 무한 순환 루프 시작!**

```
[사용자 활동] → [데이터 수집] → [학습·분석] → [자동화 생성] → [실행·피드백] → [보정·개선] → ♾️
```

# 🚀 AUTUS Production 배포 가이드

## 개요

AUTUS Realtime을 Production 환경에 배포하는 3가지 방법:

| 방법 | 난이도 | 예상 시간 | 권장 상황 |
|------|--------|-----------|-----------|
| **Docker Compose** | ⭐⭐ | 10분 | 자체 서버 운영 |
| **Railway** | ⭐ | 5분 | 빠른 배포, 관리형 |
| **Local Dev** | ⭐ | 3분 | 개발 테스트 |

---

## 🐳 방법 1: Docker Compose (권장)

### 사전 요구사항
- Docker & Docker Compose
- 최소 2GB RAM, 10GB 디스크

### 배포 단계

```bash
# 1. 프로젝트 디렉토리 이동
cd autus_realtime

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # 또는 vi .env

# 3. 원클릭 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh docker
```

### 환경 변수 설정 (.env)

```env
# 필수 설정
DB_PASSWORD=your_secure_password       # 데이터베이스 비밀번호
SECRET_KEY=your_32_char_secret_key     # 앱 비밀키
N8N_PASSWORD=your_n8n_password         # n8n 관리자 비밀번호

# Slack 연동 (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Anthropic API (AI 워크플로 생성용)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| API | http://localhost:8000 | FastAPI 백엔드 |
| Dashboard | http://localhost | 자동화 대시보드 |
| n8n | http://localhost:5678 | 워크플로 엔진 |
| Health | http://localhost:8000/health | 상태 확인 |

### 유용한 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 데이터 포함 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🚂 방법 2: Railway 배포

### 사전 요구사항
- Railway 계정 (https://railway.app)
- GitHub 연동

### 배포 단계

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성 & 배포
cd autus_realtime
railway init
railway up

# 4. 환경 변수 설정 (Railway 대시보드에서)
# - DATABASE_URL (자동 생성된 PostgreSQL 사용)
# - SLACK_WEBHOOK_URL
# - ANTHROPIC_API_KEY
```

### Railway 서비스 구성

1. **PostgreSQL** - 데이터베이스 (Add Plugin)
2. **Redis** - 캐시 (Add Plugin)
3. **AUTUS API** - FastAPI 앱 (자동 배포)

### 환경 변수 (Railway Dashboard)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-api03-...
SECRET_KEY=your_secret_key
```

---

## 💻 방법 3: Local 개발 환경

```bash
# 1. Python 의존성 설치
pip install -r requirements.prod.txt

# 2. 환경 변수 설정
export SLACK_WEBHOOK_URL="your_webhook_url"
export ANTHROPIC_API_KEY="your_api_key"

# 3. 서버 실행
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 4. n8n 별도 실행 (Docker)
docker run -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 🔧 Slack 연동 설정

### Webhook URL 생성

1. https://api.slack.com/apps 접속
2. **Create New App** > **From scratch**
3. App Name: `AUTUS Automation`
4. Workspace 선택
5. **Incoming Webhooks** > **Activate**
6. **Add New Webhook to Workspace**
7. 채널 선택 (예: `#autus-alerts`)
8. Webhook URL 복사 → `.env`에 설정

### 알림 유형

| 이벤트 | 채널 | 설명 |
|--------|------|------|
| 자동화 생성 | #autus-alerts | 새 자동화 생성됨 |
| 가치 경고 | #autus-alerts | 가치 임계값 이하 |
| 패턴 감지 | #autus-ai | AI가 새 패턴 감지 |
| 승인 요청 | #autus-approvals | 워크플로 승인 대기 |
| 시스템 오류 | #autus-errors | 오류 발생 |

---

## 🤖 Anthropic API 연동 설정

### API 키 생성

1. https://console.anthropic.com 접속
2. 로그인 또는 회원가입
3. **API Keys** > **Create Key**
4. 키 복사 → `.env`에 설정

### 사용 용도

| 기능 | 설명 | 모델 |
|------|------|------|
| 워크플로 생성 | 패턴 → n8n JSON | claude-sonnet-4-20250514 |
| 패턴 분석 | 이벤트 분석 | claude-sonnet-4-20250514 |
| 워크플로 개선 | 피드백 기반 수정 | claude-sonnet-4-20250514 |

### 예상 비용

- 워크플로 생성: ~$0.01/건
- 패턴 분석: ~$0.005/건
- 일일 예상: ~$0.50-2.00 (활발한 사용 시)

---

## 📦 n8n 워크플로 임포트

### 자동 임포트

```bash
# Docker 배포 후 자동 실행됨
# 수동 실행:
./scripts/import-n8n-workflows.sh
```

### 수동 임포트

1. n8n 접속 (http://localhost:5678)
2. **Settings** > **Import from File**
3. `workflows/n8n/*.json` 파일 선택
4. 각 워크플로 **Activate** 클릭

### 워크플로 목록

| 파일 | 이름 | 트리거 |
|------|------|--------|
| 01_student_registration.json | 학생 등록 자동화 | Webhook |
| 02_feedback_refinement.json | 피드백 수집 | Webhook |
| 03_ai_workflow_generator.json | AI 워크플로 생성기 | 매일 실행 |
| 04_value_cleanup.json | 가치 계산 + 정리 | 6시간마다 |
| 05_common_templates.json | 공통 템플릿 | 템플릿 |

---

## 🔒 보안 체크리스트

### Production 배포 전 확인

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 모든 비밀번호가 강력한 값으로 설정됨
- [ ] SSL 인증서 설정됨 (Let's Encrypt 권장)
- [ ] CORS_ORIGINS가 실제 도메인으로 제한됨
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 도구 연동됨 (Sentry 등)

### SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install certbot python3-certbot-nginx

# 인증서 발급
certbot --nginx -d autus.io -d api.autus.io -d n8n.autus.io

# 자동 갱신 설정
certbot renew --dry-run
```

---

## 📊 모니터링

### Health Check

```bash
curl http://localhost:8000/health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "n8n": "connected"
  }
}
```

### 메트릭 확인

```bash
curl http://localhost:8000/api/metrics
```

응답:
```json
{
  "total_automations": 5,
  "active_automations": 5,
  "total_executions": 150,
  "success_rate": 0.98,
  "total_value": 3500000
}
```

---

## 🆘 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|-----------|
| DB 연결 실패 | `docker-compose logs autus-db` 확인 |
| n8n 시작 안됨 | 포트 5678 충돌 확인 |
| Slack 알림 안옴 | Webhook URL 검증 |
| AI 생성 실패 | API 키 확인, 잔액 확인 |

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f autus-api
docker-compose -f docker-compose.prod.yml logs -f autus-n8n
```

### 데이터 백업

```bash
# 수동 백업
./scripts/backup.sh

# PostgreSQL 백업
docker exec autus-db pg_dump -U autus autus > backup.sql
```

---

## 🎯 배포 후 체크리스트

1. [ ] API Health 확인 (/health)
2. [ ] Dashboard 접속 확인
3. [ ] n8n 로그인 확인
4. [ ] 워크플로 임포트 확인
5. [ ] Slack 테스트 메시지 전송
6. [ ] 자동화 생성 테스트
7. [ ] 피드백 제출 테스트
8. [ ] AI 워크플로 생성 테스트

---

**♾️ 무한 순환 루프 시작!**

```
[사용자 활동] → [데이터 수집] → [학습·분석] → [자동화 생성] → [실행·피드백] → [보정·개선] → ♾️
```

# 🚀 AUTUS Production 배포 가이드

## 개요

AUTUS Realtime을 Production 환경에 배포하는 3가지 방법:

| 방법 | 난이도 | 예상 시간 | 권장 상황 |
|------|--------|-----------|-----------|
| **Docker Compose** | ⭐⭐ | 10분 | 자체 서버 운영 |
| **Railway** | ⭐ | 5분 | 빠른 배포, 관리형 |
| **Local Dev** | ⭐ | 3분 | 개발 테스트 |

---

## 🐳 방법 1: Docker Compose (권장)

### 사전 요구사항
- Docker & Docker Compose
- 최소 2GB RAM, 10GB 디스크

### 배포 단계

```bash
# 1. 프로젝트 디렉토리 이동
cd autus_realtime

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # 또는 vi .env

# 3. 원클릭 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh docker
```

### 환경 변수 설정 (.env)

```env
# 필수 설정
DB_PASSWORD=your_secure_password       # 데이터베이스 비밀번호
SECRET_KEY=your_32_char_secret_key     # 앱 비밀키
N8N_PASSWORD=your_n8n_password         # n8n 관리자 비밀번호

# Slack 연동 (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Anthropic API (AI 워크플로 생성용)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| API | http://localhost:8000 | FastAPI 백엔드 |
| Dashboard | http://localhost | 자동화 대시보드 |
| n8n | http://localhost:5678 | 워크플로 엔진 |
| Health | http://localhost:8000/health | 상태 확인 |

### 유용한 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 데이터 포함 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🚂 방법 2: Railway 배포

### 사전 요구사항
- Railway 계정 (https://railway.app)
- GitHub 연동

### 배포 단계

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성 & 배포
cd autus_realtime
railway init
railway up

# 4. 환경 변수 설정 (Railway 대시보드에서)
# - DATABASE_URL (자동 생성된 PostgreSQL 사용)
# - SLACK_WEBHOOK_URL
# - ANTHROPIC_API_KEY
```

### Railway 서비스 구성

1. **PostgreSQL** - 데이터베이스 (Add Plugin)
2. **Redis** - 캐시 (Add Plugin)
3. **AUTUS API** - FastAPI 앱 (자동 배포)

### 환경 변수 (Railway Dashboard)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-api03-...
SECRET_KEY=your_secret_key
```

---

## 💻 방법 3: Local 개발 환경

```bash
# 1. Python 의존성 설치
pip install -r requirements.prod.txt

# 2. 환경 변수 설정
export SLACK_WEBHOOK_URL="your_webhook_url"
export ANTHROPIC_API_KEY="your_api_key"

# 3. 서버 실행
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 4. n8n 별도 실행 (Docker)
docker run -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 🔧 Slack 연동 설정

### Webhook URL 생성

1. https://api.slack.com/apps 접속
2. **Create New App** > **From scratch**
3. App Name: `AUTUS Automation`
4. Workspace 선택
5. **Incoming Webhooks** > **Activate**
6. **Add New Webhook to Workspace**
7. 채널 선택 (예: `#autus-alerts`)
8. Webhook URL 복사 → `.env`에 설정

### 알림 유형

| 이벤트 | 채널 | 설명 |
|--------|------|------|
| 자동화 생성 | #autus-alerts | 새 자동화 생성됨 |
| 가치 경고 | #autus-alerts | 가치 임계값 이하 |
| 패턴 감지 | #autus-ai | AI가 새 패턴 감지 |
| 승인 요청 | #autus-approvals | 워크플로 승인 대기 |
| 시스템 오류 | #autus-errors | 오류 발생 |

---

## 🤖 Anthropic API 연동 설정

### API 키 생성

1. https://console.anthropic.com 접속
2. 로그인 또는 회원가입
3. **API Keys** > **Create Key**
4. 키 복사 → `.env`에 설정

### 사용 용도

| 기능 | 설명 | 모델 |
|------|------|------|
| 워크플로 생성 | 패턴 → n8n JSON | claude-sonnet-4-20250514 |
| 패턴 분석 | 이벤트 분석 | claude-sonnet-4-20250514 |
| 워크플로 개선 | 피드백 기반 수정 | claude-sonnet-4-20250514 |

### 예상 비용

- 워크플로 생성: ~$0.01/건
- 패턴 분석: ~$0.005/건
- 일일 예상: ~$0.50-2.00 (활발한 사용 시)

---

## 📦 n8n 워크플로 임포트

### 자동 임포트

```bash
# Docker 배포 후 자동 실행됨
# 수동 실행:
./scripts/import-n8n-workflows.sh
```

### 수동 임포트

1. n8n 접속 (http://localhost:5678)
2. **Settings** > **Import from File**
3. `workflows/n8n/*.json` 파일 선택
4. 각 워크플로 **Activate** 클릭

### 워크플로 목록

| 파일 | 이름 | 트리거 |
|------|------|--------|
| 01_student_registration.json | 학생 등록 자동화 | Webhook |
| 02_feedback_refinement.json | 피드백 수집 | Webhook |
| 03_ai_workflow_generator.json | AI 워크플로 생성기 | 매일 실행 |
| 04_value_cleanup.json | 가치 계산 + 정리 | 6시간마다 |
| 05_common_templates.json | 공통 템플릿 | 템플릿 |

---

## 🔒 보안 체크리스트

### Production 배포 전 확인

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 모든 비밀번호가 강력한 값으로 설정됨
- [ ] SSL 인증서 설정됨 (Let's Encrypt 권장)
- [ ] CORS_ORIGINS가 실제 도메인으로 제한됨
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 도구 연동됨 (Sentry 등)

### SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install certbot python3-certbot-nginx

# 인증서 발급
certbot --nginx -d autus.io -d api.autus.io -d n8n.autus.io

# 자동 갱신 설정
certbot renew --dry-run
```

---

## 📊 모니터링

### Health Check

```bash
curl http://localhost:8000/health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "n8n": "connected"
  }
}
```

### 메트릭 확인

```bash
curl http://localhost:8000/api/metrics
```

응답:
```json
{
  "total_automations": 5,
  "active_automations": 5,
  "total_executions": 150,
  "success_rate": 0.98,
  "total_value": 3500000
}
```

---

## 🆘 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|-----------|
| DB 연결 실패 | `docker-compose logs autus-db` 확인 |
| n8n 시작 안됨 | 포트 5678 충돌 확인 |
| Slack 알림 안옴 | Webhook URL 검증 |
| AI 생성 실패 | API 키 확인, 잔액 확인 |

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f autus-api
docker-compose -f docker-compose.prod.yml logs -f autus-n8n
```

### 데이터 백업

```bash
# 수동 백업
./scripts/backup.sh

# PostgreSQL 백업
docker exec autus-db pg_dump -U autus autus > backup.sql
```

---

## 🎯 배포 후 체크리스트

1. [ ] API Health 확인 (/health)
2. [ ] Dashboard 접속 확인
3. [ ] n8n 로그인 확인
4. [ ] 워크플로 임포트 확인
5. [ ] Slack 테스트 메시지 전송
6. [ ] 자동화 생성 테스트
7. [ ] 피드백 제출 테스트
8. [ ] AI 워크플로 생성 테스트

---

**♾️ 무한 순환 루프 시작!**

```
[사용자 활동] → [데이터 수집] → [학습·분석] → [자동화 생성] → [실행·피드백] → [보정·개선] → ♾️
```

# 🚀 AUTUS Production 배포 가이드

## 개요

AUTUS Realtime을 Production 환경에 배포하는 3가지 방법:

| 방법 | 난이도 | 예상 시간 | 권장 상황 |
|------|--------|-----------|-----------|
| **Docker Compose** | ⭐⭐ | 10분 | 자체 서버 운영 |
| **Railway** | ⭐ | 5분 | 빠른 배포, 관리형 |
| **Local Dev** | ⭐ | 3분 | 개발 테스트 |

---

## 🐳 방법 1: Docker Compose (권장)

### 사전 요구사항
- Docker & Docker Compose
- 최소 2GB RAM, 10GB 디스크

### 배포 단계

```bash
# 1. 프로젝트 디렉토리 이동
cd autus_realtime

# 2. 환경 변수 설정
cp .env.example .env
nano .env  # 또는 vi .env

# 3. 원클릭 배포
chmod +x scripts/deploy.sh
./scripts/deploy.sh docker
```

### 환경 변수 설정 (.env)

```env
# 필수 설정
DB_PASSWORD=your_secure_password       # 데이터베이스 비밀번호
SECRET_KEY=your_32_char_secret_key     # 앱 비밀키
N8N_PASSWORD=your_n8n_password         # n8n 관리자 비밀번호

# Slack 연동 (알림용)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Anthropic API (AI 워크플로 생성용)
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 서비스 접속

| 서비스 | URL | 설명 |
|--------|-----|------|
| API | http://localhost:8000 | FastAPI 백엔드 |
| Dashboard | http://localhost | 자동화 대시보드 |
| n8n | http://localhost:5678 | 워크플로 엔진 |
| Health | http://localhost:8000/health | 상태 확인 |

### 유용한 명령어

```bash
# 로그 확인
docker-compose -f docker-compose.prod.yml logs -f

# 서비스 재시작
docker-compose -f docker-compose.prod.yml restart

# 서비스 중지
docker-compose -f docker-compose.prod.yml down

# 데이터 포함 완전 삭제
docker-compose -f docker-compose.prod.yml down -v
```

---

## 🚂 방법 2: Railway 배포

### 사전 요구사항
- Railway 계정 (https://railway.app)
- GitHub 연동

### 배포 단계

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성 & 배포
cd autus_realtime
railway init
railway up

# 4. 환경 변수 설정 (Railway 대시보드에서)
# - DATABASE_URL (자동 생성된 PostgreSQL 사용)
# - SLACK_WEBHOOK_URL
# - ANTHROPIC_API_KEY
```

### Railway 서비스 구성

1. **PostgreSQL** - 데이터베이스 (Add Plugin)
2. **Redis** - 캐시 (Add Plugin)
3. **AUTUS API** - FastAPI 앱 (자동 배포)

### 환경 변수 (Railway Dashboard)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ANTHROPIC_API_KEY=sk-ant-api03-...
SECRET_KEY=your_secret_key
```

---

## 💻 방법 3: Local 개발 환경

```bash
# 1. Python 의존성 설치
pip install -r requirements.prod.txt

# 2. 환경 변수 설정
export SLACK_WEBHOOK_URL="your_webhook_url"
export ANTHROPIC_API_KEY="your_api_key"

# 3. 서버 실행
python -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload

# 4. n8n 별도 실행 (Docker)
docker run -d -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
```

---

## 🔧 Slack 연동 설정

### Webhook URL 생성

1. https://api.slack.com/apps 접속
2. **Create New App** > **From scratch**
3. App Name: `AUTUS Automation`
4. Workspace 선택
5. **Incoming Webhooks** > **Activate**
6. **Add New Webhook to Workspace**
7. 채널 선택 (예: `#autus-alerts`)
8. Webhook URL 복사 → `.env`에 설정

### 알림 유형

| 이벤트 | 채널 | 설명 |
|--------|------|------|
| 자동화 생성 | #autus-alerts | 새 자동화 생성됨 |
| 가치 경고 | #autus-alerts | 가치 임계값 이하 |
| 패턴 감지 | #autus-ai | AI가 새 패턴 감지 |
| 승인 요청 | #autus-approvals | 워크플로 승인 대기 |
| 시스템 오류 | #autus-errors | 오류 발생 |

---

## 🤖 Anthropic API 연동 설정

### API 키 생성

1. https://console.anthropic.com 접속
2. 로그인 또는 회원가입
3. **API Keys** > **Create Key**
4. 키 복사 → `.env`에 설정

### 사용 용도

| 기능 | 설명 | 모델 |
|------|------|------|
| 워크플로 생성 | 패턴 → n8n JSON | claude-sonnet-4-20250514 |
| 패턴 분석 | 이벤트 분석 | claude-sonnet-4-20250514 |
| 워크플로 개선 | 피드백 기반 수정 | claude-sonnet-4-20250514 |

### 예상 비용

- 워크플로 생성: ~$0.01/건
- 패턴 분석: ~$0.005/건
- 일일 예상: ~$0.50-2.00 (활발한 사용 시)

---

## 📦 n8n 워크플로 임포트

### 자동 임포트

```bash
# Docker 배포 후 자동 실행됨
# 수동 실행:
./scripts/import-n8n-workflows.sh
```

### 수동 임포트

1. n8n 접속 (http://localhost:5678)
2. **Settings** > **Import from File**
3. `workflows/n8n/*.json` 파일 선택
4. 각 워크플로 **Activate** 클릭

### 워크플로 목록

| 파일 | 이름 | 트리거 |
|------|------|--------|
| 01_student_registration.json | 학생 등록 자동화 | Webhook |
| 02_feedback_refinement.json | 피드백 수집 | Webhook |
| 03_ai_workflow_generator.json | AI 워크플로 생성기 | 매일 실행 |
| 04_value_cleanup.json | 가치 계산 + 정리 | 6시간마다 |
| 05_common_templates.json | 공통 템플릿 | 템플릿 |

---

## 🔒 보안 체크리스트

### Production 배포 전 확인

- [ ] `.env` 파일이 `.gitignore`에 포함됨
- [ ] 모든 비밀번호가 강력한 값으로 설정됨
- [ ] SSL 인증서 설정됨 (Let's Encrypt 권장)
- [ ] CORS_ORIGINS가 실제 도메인으로 제한됨
- [ ] 데이터베이스 백업 설정됨
- [ ] 모니터링 도구 연동됨 (Sentry 등)

### SSL 인증서 (Let's Encrypt)

```bash
# Certbot 설치
apt-get install certbot python3-certbot-nginx

# 인증서 발급
certbot --nginx -d autus.io -d api.autus.io -d n8n.autus.io

# 자동 갱신 설정
certbot renew --dry-run
```

---

## 📊 모니터링

### Health Check

```bash
curl http://localhost:8000/health
```

응답:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "n8n": "connected"
  }
}
```

### 메트릭 확인

```bash
curl http://localhost:8000/api/metrics
```

응답:
```json
{
  "total_automations": 5,
  "active_automations": 5,
  "total_executions": 150,
  "success_rate": 0.98,
  "total_value": 3500000
}
```

---

## 🆘 문제 해결

### 일반적인 문제

| 문제 | 해결 방법 |
|------|-----------|
| DB 연결 실패 | `docker-compose logs autus-db` 확인 |
| n8n 시작 안됨 | 포트 5678 충돌 확인 |
| Slack 알림 안옴 | Webhook URL 검증 |
| AI 생성 실패 | API 키 확인, 잔액 확인 |

### 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose.prod.yml logs -f autus-api
docker-compose -f docker-compose.prod.yml logs -f autus-n8n
```

### 데이터 백업

```bash
# 수동 백업
./scripts/backup.sh

# PostgreSQL 백업
docker exec autus-db pg_dump -U autus autus > backup.sql
```

---

## 🎯 배포 후 체크리스트

1. [ ] API Health 확인 (/health)
2. [ ] Dashboard 접속 확인
3. [ ] n8n 로그인 확인
4. [ ] 워크플로 임포트 확인
5. [ ] Slack 테스트 메시지 전송
6. [ ] 자동화 생성 테스트
7. [ ] 피드백 제출 테스트
8. [ ] AI 워크플로 생성 테스트

---

**♾️ 무한 순환 루프 시작!**

```
[사용자 활동] → [데이터 수집] → [학습·분석] → [자동화 생성] → [실행·피드백] → [보정·개선] → ♾️
```

















