# AUTUS 배포 가이드

> 상용화 버전 배포 절차

---

## 🚀 빠른 시작

### 1. 로컬 Docker 실행

```bash
# 1. 환경 변수 설정
cp .env.production .env
# .env 파일 편집하여 SECRET_KEY 변경

# 2. Docker Compose 실행
docker-compose -f docker-compose.prod.yml up -d

# 3. 확인
curl http://localhost:8001/health
open http://localhost:8080
```

### 2. Railway 배포 (권장)

```bash
# 1. Railway CLI 설치
npm install -g @railway/cli

# 2. 로그인
railway login

# 3. 프로젝트 생성
railway init

# 4. 환경 변수 설정
railway variables set SECRET_KEY="your-secret-key"
railway variables set ALLOWED_ORIGINS="https://your-domain.com"

# 5. 배포
railway up
```

### 3. Render 배포

1. [Render Dashboard](https://dashboard.render.com) 접속
2. New Web Service → Connect GitHub Repo
3. 설정:
   - **Environment**: Docker
   - **Build Command**: (자동)
   - **Start Command**: (자동)
4. Environment Variables 추가
5. Deploy

---

## 📋 환경 변수

| 변수 | 필수 | 설명 | 기본값 |
|------|------|------|--------|
| `SECRET_KEY` | ✅ | JWT 서명 키 | - |
| `DATABASE_URL` | ❌ | DB 연결 문자열 | `sqlite:///./data/autus.db` |
| `ALLOWED_ORIGINS` | ❌ | CORS 허용 도메인 | `localhost:*` |
| `LOG_LEVEL` | ❌ | 로그 레벨 | `INFO` |
| `PORT` | ❌ | 서버 포트 | `8001` |

### SECRET_KEY 생성

```bash
# Linux/Mac
openssl rand -hex 32

# Python
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## 🔒 보안 체크리스트

### 배포 전 필수 확인

- [ ] `SECRET_KEY` 변경됨
- [ ] HTTPS 활성화
- [ ] CORS 도메인 제한됨
- [ ] 에러 메시지에 민감 정보 없음
- [ ] 로그에 비밀번호 노출 없음
- [ ] `.env` 파일 `.gitignore`에 추가됨

### 권장 설정

```nginx
# Nginx HTTPS 설정
server {
    listen 443 ssl http2;
    ssl_certificate /etc/ssl/cert.pem;
    ssl_certificate_key /etc/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
}
```

---

## 📊 모니터링

### 헬스 체크

```bash
# API 상태
curl https://api.autus.app/health

# 예상 응답
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 로그 확인

```bash
# Docker
docker logs autus-api -f

# Railway
railway logs

# Render
render logs
```

---

## 🔄 CI/CD 파이프라인

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
# - main 브랜치 push 시 자동 배포
# - Release 생성 시 프로덕션 배포
```

### 수동 배포

```bash
# 1. 테스트 실행
cd kernel_service && pytest tests/ -v

# 2. Docker 이미지 빌드
docker build -t autus:latest .

# 3. 배포
docker push ghcr.io/your-org/autus:latest
```

---

## 🗄️ 데이터베이스

### SQLite (기본)

```bash
# 데이터 위치
./data/autus.db

# 백업
cp ./data/autus.db ./backups/autus_$(date +%Y%m%d).db
```

### PostgreSQL (프로덕션 권장)

```bash
# 환경 변수
DATABASE_URL=postgresql://user:pass@host:5432/autus

# 마이그레이션
alembic upgrade head
```

---

## 🔧 트러블슈팅

### 일반적인 문제

#### 1. 서버 시작 실패

```bash
# 로그 확인
docker logs autus-api

# 포트 충돌 확인
lsof -i :8001
```

#### 2. CORS 에러

```bash
# ALLOWED_ORIGINS 확인
echo $ALLOWED_ORIGINS

# 프론트엔드 도메인 추가
ALLOWED_ORIGINS=https://autus.app,https://www.autus.app
```

#### 3. 데이터베이스 연결 실패

```bash
# SQLite 권한 확인
ls -la ./data/

# PostgreSQL 연결 테스트
psql $DATABASE_URL -c "SELECT 1"
```

---

## 📞 지원

- GitHub Issues: [autus/issues](https://github.com/your-org/autus/issues)
- Email: support@autus.app

---

**"아우투스는 준비되었습니다."** 🔒





