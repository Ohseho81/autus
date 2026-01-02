# AUTUS 남은 개발 리스트

> 상용화 v1.0 릴리스까지 남은 작업

---

## 📊 현재 완료 상태

| 카테고리 | 상태 | 완료율 |
|----------|------|--------|
| 백엔드 API 코드 | ✅ 완료 | 100% |
| 프론트엔드 UI | ✅ 완료 | 100% |
| 물리 엔진 | ✅ LOCKED | 100% |
| 인증 시스템 코드 | ✅ 완료 | 100% |
| Docker/CI 코드 | ✅ 완료 | 100% |
| **의존성 설치** | ⚠️ 필요 | 0% |
| **통합 테스트** | ⚠️ 필요 | 50% |
| **실제 배포** | ⚠️ 필요 | 0% |

---

## 🔴 즉시 필요한 작업

### 1. 의존성 설치 (5분)

```bash
cd kernel_service
pip install sqlalchemy aiosqlite pyjwt passlib[bcrypt] python-multipart
```

또는 requirements.txt로:

```bash
pip install -r requirements.txt
```

### 2. 데이터베이스 초기화 (1분)

```bash
cd kernel_service
python -c "from app.db.repository import init_db; init_db()"
```

### 3. 서버 실행 테스트 (2분)

```bash
# 기존 서버 (개발용)
uvicorn app.main:app --port 8001 --reload

# 상용화 서버
uvicorn app.main_production:app --port 8001 --reload
```

---

## 🟠 선택적 작업 (권장)

### 4. 통합 테스트 실행

```bash
cd kernel_service
pytest tests/ -v
```

### 5. Docker 빌드 테스트

```bash
docker build -t autus:test .
docker run -p 8001:8001 autus:test
```

### 6. 프론트엔드-백엔드 연동 테스트

```bash
# 터미널 1: 백엔드
cd kernel_service && uvicorn app.main_production:app --port 8001

# 터미널 2: 프론트엔드
open frontend/autus-live.html
```

---

## 🟢 배포 전 체크리스트

### 보안

- [ ] `SECRET_KEY` 환경변수 설정
- [ ] HTTPS 활성화
- [ ] CORS 도메인 제한
- [ ] 비밀번호 정책 확인

### 데이터

- [ ] 데이터베이스 백업 설정
- [ ] 로그 저장소 설정

### 모니터링

- [ ] 헬스체크 엔드포인트 확인
- [ ] 에러 알림 설정 (선택)

---

## 📋 작업별 예상 시간

| 작업 | 시간 | 난이도 |
|------|------|--------|
| 의존성 설치 | 5분 | 🟢 쉬움 |
| DB 초기화 | 1분 | 🟢 쉬움 |
| 서버 테스트 | 5분 | 🟢 쉬움 |
| Docker 빌드 | 10분 | 🟠 보통 |
| 실제 배포 | 30분 | 🟠 보통 |
| **총계** | **~1시간** | - |

---

## 🚀 원클릭 설정 스크립트

아래 스크립트를 실행하면 모든 설정이 완료됩니다:

```bash
#!/bin/bash
# setup.sh

cd /Users/oseho/Desktop/autus/kernel_service

# 1. 의존성 설치
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# 2. DB 초기화
echo "🗄️ Initializing database..."
python -c "from app.db.repository import init_db; init_db()"

# 3. 테스트 실행
echo "🧪 Running tests..."
pytest tests/test_checklist.py -v

# 4. 서버 시작
echo "🚀 Starting server..."
uvicorn app.main_production:app --port 8001 --reload
```

---

## ✅ 완료된 파일 목록

### 백엔드 (kernel_service/app/)
- [x] `main.py` — 기본 API
- [x] `main_production.py` — 상용화 API
- [x] `autus_state.py` — 상태 관리
- [x] `commit_pipeline.py` — 커밋 파이프라인
- [x] `validators.py` — 입력 검증
- [x] `db/models.py` — DB 모델
- [x] `db/repository.py` — DB 레포지토리
- [x] `auth/jwt.py` — JWT 인증
- [x] `auth/middleware.py` — 인증 미들웨어
- [x] `middleware/error_handler.py` — 에러 핸들러
- [x] `middleware/logging_middleware.py` — 로깅

### 프론트엔드 (frontend/)
- [x] `autus-live.html` — 메인 UI
- [x] `js/api/AutusEngine.js` — API 클라이언트
- [x] `js/core/VisualFeedback.js` — 시각 효과
- [x] `sw.js` — Service Worker

### 인프라
- [x] `Dockerfile`
- [x] `docker-compose.prod.yml`
- [x] `nginx.conf`
- [x] `.github/workflows/ci.yml`
- [x] `.github/workflows/deploy.yml`

### 문서
- [x] `README.md`
- [x] `ROADMAP_TO_PRODUCTION.md`
- [x] `docs/DEPLOYMENT.md`

---

**남은 작업: 의존성 설치 + 실행 테스트**

**예상 소요 시간: ~15분** ⏱️





