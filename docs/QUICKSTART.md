# AUTUS 빠른 시작 가이드

## 🚀 1분 배포 (Railway)

### Step 1: Railway CLI 설치

```bash
# npm 사용
npm install -g @railway/cli

# 또는 Mac
brew install railway
```

### Step 2: 로그인 & 배포

```bash
railway login        # 브라우저가 열리면 GitHub/Google로 로그인
cd autus-unified     # 프로젝트 루트로 이동
./deploy.sh railway  # 자동 배포
```

또는 수동 배포:

```bash
cd autus-unified
railway init -n autus-unified
railway up
```

### Step 3: 도메인 생성

1. https://railway.app/dashboard 접속
2. autus-unified 프로젝트 클릭
3. Settings → Domains → Generate Domain
4. URL 복사 (예: `autus-unified-xxx.up.railway.app`)

### Step 4: 확인

```bash
curl https://autus-unified-xxx.up.railway.app/health
```

---

## 💻 로컬 실행

### Step 1: 의존성 설치

```bash
cd autus-unified/backend
pip install -r requirements.txt
```

### Step 2: 환경설정

```bash
cp .env.example .env
# .env 파일 수정 (필요시)
```

### Step 3: 서버 실행

```bash
./deploy.sh local
# 또는
cd backend && uvicorn main:app --reload
```

서버: http://localhost:8000
API 문서: http://localhost:8000/docs

---

## 📱 개인 로거 설정

### Step 1: 환경변수 설정

```bash
# Mac/Linux
export AUTUS_API_URL=https://autus-unified-xxx.up.railway.app

# Windows CMD
set AUTUS_API_URL=https://autus-unified-xxx.up.railway.app

# Windows PowerShell
$env:AUTUS_API_URL="https://autus-unified-xxx.up.railway.app"
```

### Step 2: 초기 설정

```bash
python client/autus_seho_v2.py setup
```

### Step 3: 매일 사용

```bash
# 기록
python client/autus_seho_v2.py log

# 대시보드
python client/autus_seho_v2.py dashboard

# 추천 확인
python client/autus_seho_v2.py recs
```

---

## 📋 클라이언트 명령어

| 명령 | 설명 |
|------|------|
| `setup` | 초기 설정 |
| `log` | 오늘 기록 |
| `sync` | 서버 동기화 |
| `dashboard` | 대시보드 |
| `recs` | 추천 확인 |
| `feedback` | 발견 피드백 |
| `analyze` | 로컬 분석 |
| `export` | 학습용 내보내기 |
| `open` | AUTUS 폴더 열기 |

---

## 🐳 Docker 배포

```bash
cd autus-unified
docker-compose up -d --build
```

---

## 🔧 트러블슈팅

### "서버 연결 실패"

```bash
# URL 확인
echo $AUTUS_API_URL

# 서버 상태 확인
curl $AUTUS_API_URL/health
```

### "railway 명령어 없음"

```bash
npm install -g @railway/cli
```

### "배포 실패"

```bash
# 로그 확인
railway logs

# 재배포
railway up
```

### 포트 충돌 (로컬)

```bash
# 8000 포트 사용 중인 프로세스 종료
lsof -ti:8000 | xargs kill -9
```
