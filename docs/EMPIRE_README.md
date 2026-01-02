# 🏛️ AUTUS EMPIRE - Final Form v4.0.0

> **"아우투스 제국의 모든 것이 하나로"**

통합 매장 운영 시스템 - 고객 관리, 예측 AI, 인맥 분석, 직원 게이미피케이션을 하나로

---

## 📋 목차

1. [개요](#-개요)
2. [시스템 요구사항](#-시스템-요구사항)
3. [빠른 시작](#-빠른-시작)
4. [로컬 설치](#-로컬-설치)
5. [Docker 배포](#-docker-배포)
6. [Railway 배포](#-railway-배포)
7. [모듈 설명](#-모듈-설명)
8. [API 문서](#-api-문서)
9. [대시보드 실행](#-대시보드-실행)
10. [환경 변수](#-환경-변수)
11. [문제 해결](#-문제-해결)

---

## 🏛️ 개요

AUTUS Empire는 다음 기능을 통합한 매장 운영 시스템입니다:

| 모듈 | 설명 |
|------|------|
| 👁️ **Observer** | OCR 기반 고객 감지 |
| 🗺️ **Physis Map** | M-T-S 3차원 고객 분류 |
| 🕸️ **Human Network** | PageRank 기반 인맥 분석 |
| 🧠 **Oracle Engine** | 날씨/이벤트 기반 예측 AI |
| 🕵️ **Bounty Hunter** | 충성 고객 암행어사 시스템 |
| 👻 **War Game** | 의사결정 시뮬레이터 (Ghost UI) |
| 🎮 **RPG Dashboard** | 직원 게이미피케이션 |
| 👁️ **Gate Keeper** | 얼굴 인식 자동 출석 |
| 🛡️ **Legal Shield** | 전자 동의 시스템 |
| 📴 **Network Manager** | 오프라인 생존 모드 |

---

## 💻 시스템 요구사항

### 최소 요구사항

- **Python**: 3.9+
- **RAM**: 2GB+
- **디스크**: 1GB+
- **OS**: Windows/macOS/Linux

### 권장 요구사항

- **Python**: 3.11
- **RAM**: 4GB+
- **디스크**: 5GB+
- **카메라**: Gate Keeper 사용 시

---

## 🚀 빠른 시작

### 1분 설치 (로컬)

```bash
# 1. 클론
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main_final.py
```

브라우저에서 `http://localhost:8000/docs` 접속!

---

## 📦 로컬 설치 (상세)

### Step 1: Python 설치 확인

```bash
python --version
# Python 3.9+ 필요
```

### Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire
```

### Step 3: 가상환경 생성 및 활성화

```bash
# 생성
python -m venv venv

# 활성화 (Linux/macOS)
source venv/bin/activate

# 활성화 (Windows CMD)
venv\Scripts\activate

# 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### Step 4: 의존성 설치

```bash
# 기본 설치
pip install -r requirements.txt

# (선택) 얼굴 인식 기능 사용 시
pip install face_recognition  # dlib 필요
```

### Step 5: 서버 실행

```bash
# 방법 1: Python 직접 실행
python main_final.py

# 방법 2: uvicorn 사용
uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

# 방법 3: 백그라운드 실행
nohup python main_final.py > server.log 2>&1 &
```

### Step 6: 접속 확인

- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

---

## 🐳 Docker 배포

### 빠른 Docker 실행

```bash
# 빌드
docker build -t autus-empire .

# 실행
docker run -d -p 8000:8000 --name autus autus-empire

# 로그 확인
docker logs -f autus
```

### Docker Compose 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| API 서버 | 8000 | http://localhost:8000 |
| War Game | 8501 | http://localhost:8501 |

---

## 🚂 Railway 배포

### Step 1: Railway 계정 준비

1. [Railway](https://railway.app) 가입
2. GitHub 연동

### Step 2: 프로젝트 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init

# 배포
railway up
```

### Step 3: 환경 변수 설정

Railway 대시보드에서:

```
PORT=8000
ENV=production
```

### Step 4: 도메인 설정

Railway는 자동으로 `*.up.railway.app` 도메인을 제공합니다.

---

## 📚 모듈 설명

### 1. 👁️ Observer (OCR 수신)

POS/태블릿에서 OCR로 인식한 데이터를 수신하여 VIP/주의 고객을 실시간 감지합니다.

```bash
# API 엔드포인트
POST /api/v1/observer/ocr
```

### 2. 🗺️ Physis Map (M-T-S)

고객을 3차원 좌표로 분류합니다:
- **M (Money)**: 매출 기여도 (0-100)
- **T (Trouble)**: 민원/리스크 (0-100)
- **S (Synergy)**: 인맥 영향력 (0-100)

```bash
# 고객 등록
POST /api/v1/customers

# 점수 업데이트
PUT /api/v1/customers/{user_id}/scores?m=80&t=20&s=60
```

### 3. 🕸️ Human Network (PageRank)

고객 간 관계를 분석하여 영향력자를 탐지합니다.

```bash
# 관계 추가
POST /api/v1/network/relationship

# 영향력 순위
GET /api/v1/network/pagerank

# 여왕벌 탐색
GET /api/v1/network/queen-bees

# 이탈 영향 시뮬레이션
GET /api/v1/network/churn-impact/{user_id}
```

### 4. 🧠 Oracle Engine (예측 AI)

날씨, 요일, 이벤트를 분석하여 매출을 예측합니다.

```bash
# 내일 예측
GET /api/v1/oracle/tomorrow/{station_id}

# 주간 예보
GET /api/v1/oracle/weekly/{station_id}
```

### 5. 👻 War Game Simulator

의사결정 전 결과를 시뮬레이션합니다.

```bash
# 쿠폰 시뮬레이션
POST /api/v1/wargame/simulate/coupon

# 최적 할인율 탐색
GET /api/v1/wargame/optimal-discount
```

### 6. 🎮 RPG Dashboard

직원 게이미피케이션 시스템입니다.

```bash
# 플레이어 생성
POST /api/v1/rpg/player?employee_id=EMP001&name=홍길동

# 퀘스트 완료
POST /api/v1/rpg/quest/complete
```

---

## 📖 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Health | GET | `/health` | 헬스 체크 |
| Customers | POST | `/api/v1/customers` | 고객 등록 |
| Customers | GET | `/api/v1/customers` | 고객 목록 |
| Network | GET | `/api/v1/network/queen-bees` | 여왕벌 탐색 |
| Oracle | GET | `/api/v1/oracle/tomorrow/{station_id}` | 내일 예측 |
| War Game | POST | `/api/v1/wargame/simulate/coupon` | 쿠폰 시뮬레이션 |
| RPG | POST | `/api/v1/rpg/quest/complete` | 퀘스트 완료 |
| Gate | POST | `/api/v1/gate/entry` | 입장 기록 |
| Legal | POST | `/api/v1/legal/consent` | 동의 기록 |
| God Mode | GET | `/api/v1/godmode/overview` | 전체 현황 |

---

## 🖥️ 대시보드 실행

### War Game Simulator (Ghost UI)

```bash
cd client
streamlit run war_game_simulator.py
```
→ http://localhost:8501

### RPG Dashboard

```bash
cd client
streamlit run rpg_dashboard.py
```
→ http://localhost:8501

### Network Graph Map

```bash
pip install plotly networkx
cd client
streamlit run network_graph_map.py
```
→ http://localhost:8501

### Legal Kiosk

```bash
cd client
streamlit run legal_kiosk.py
```
→ http://localhost:8501

---

## ⚙️ 환경 변수

`.env` 파일을 생성하여 설정할 수 있습니다:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Database (선택)
DATABASE_URL=postgresql://user:pass@localhost:5432/autus

# Redis (선택)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택)
WEATHER_API_KEY=your_api_key
SMS_API_KEY=your_api_key
```

---

## 🔧 문제 해결

### 1. 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
uvicorn main_final:app --port 8080
```

### 2. 모듈 import 오류

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

### 3. 얼굴 인식 설치 실패

```bash
# macOS
brew install cmake
pip install dlib
pip install face_recognition

# Ubuntu
sudo apt-get install cmake
pip install dlib
pip install face_recognition
```

### 4. Streamlit 오류

```bash
# 캐시 클리어
streamlit cache clear

# 재실행
streamlit run app.py --server.port 8501
```

---

## 📞 지원

- **Issue**: GitHub Issues
- **Email**: autus@empire.io

---

## 📄 라이선스

MIT License

---

<div align="center">

**🏛️ AUTUS EMPIRE v4.0.0 FINAL FORM**

*"통제하지 말고, 예측하라. 감시하지 말고, 이해하라."*

</div>







# 🏛️ AUTUS EMPIRE - Final Form v4.0.0

> **"아우투스 제국의 모든 것이 하나로"**

통합 매장 운영 시스템 - 고객 관리, 예측 AI, 인맥 분석, 직원 게이미피케이션을 하나로

---

## 📋 목차

1. [개요](#-개요)
2. [시스템 요구사항](#-시스템-요구사항)
3. [빠른 시작](#-빠른-시작)
4. [로컬 설치](#-로컬-설치)
5. [Docker 배포](#-docker-배포)
6. [Railway 배포](#-railway-배포)
7. [모듈 설명](#-모듈-설명)
8. [API 문서](#-api-문서)
9. [대시보드 실행](#-대시보드-실행)
10. [환경 변수](#-환경-변수)
11. [문제 해결](#-문제-해결)

---

## 🏛️ 개요

AUTUS Empire는 다음 기능을 통합한 매장 운영 시스템입니다:

| 모듈 | 설명 |
|------|------|
| 👁️ **Observer** | OCR 기반 고객 감지 |
| 🗺️ **Physis Map** | M-T-S 3차원 고객 분류 |
| 🕸️ **Human Network** | PageRank 기반 인맥 분석 |
| 🧠 **Oracle Engine** | 날씨/이벤트 기반 예측 AI |
| 🕵️ **Bounty Hunter** | 충성 고객 암행어사 시스템 |
| 👻 **War Game** | 의사결정 시뮬레이터 (Ghost UI) |
| 🎮 **RPG Dashboard** | 직원 게이미피케이션 |
| 👁️ **Gate Keeper** | 얼굴 인식 자동 출석 |
| 🛡️ **Legal Shield** | 전자 동의 시스템 |
| 📴 **Network Manager** | 오프라인 생존 모드 |

---

## 💻 시스템 요구사항

### 최소 요구사항

- **Python**: 3.9+
- **RAM**: 2GB+
- **디스크**: 1GB+
- **OS**: Windows/macOS/Linux

### 권장 요구사항

- **Python**: 3.11
- **RAM**: 4GB+
- **디스크**: 5GB+
- **카메라**: Gate Keeper 사용 시

---

## 🚀 빠른 시작

### 1분 설치 (로컬)

```bash
# 1. 클론
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main_final.py
```

브라우저에서 `http://localhost:8000/docs` 접속!

---

## 📦 로컬 설치 (상세)

### Step 1: Python 설치 확인

```bash
python --version
# Python 3.9+ 필요
```

### Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire
```

### Step 3: 가상환경 생성 및 활성화

```bash
# 생성
python -m venv venv

# 활성화 (Linux/macOS)
source venv/bin/activate

# 활성화 (Windows CMD)
venv\Scripts\activate

# 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### Step 4: 의존성 설치

```bash
# 기본 설치
pip install -r requirements.txt

# (선택) 얼굴 인식 기능 사용 시
pip install face_recognition  # dlib 필요
```

### Step 5: 서버 실행

```bash
# 방법 1: Python 직접 실행
python main_final.py

# 방법 2: uvicorn 사용
uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

# 방법 3: 백그라운드 실행
nohup python main_final.py > server.log 2>&1 &
```

### Step 6: 접속 확인

- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

---

## 🐳 Docker 배포

### 빠른 Docker 실행

```bash
# 빌드
docker build -t autus-empire .

# 실행
docker run -d -p 8000:8000 --name autus autus-empire

# 로그 확인
docker logs -f autus
```

### Docker Compose 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| API 서버 | 8000 | http://localhost:8000 |
| War Game | 8501 | http://localhost:8501 |

---

## 🚂 Railway 배포

### Step 1: Railway 계정 준비

1. [Railway](https://railway.app) 가입
2. GitHub 연동

### Step 2: 프로젝트 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init

# 배포
railway up
```

### Step 3: 환경 변수 설정

Railway 대시보드에서:

```
PORT=8000
ENV=production
```

### Step 4: 도메인 설정

Railway는 자동으로 `*.up.railway.app` 도메인을 제공합니다.

---

## 📚 모듈 설명

### 1. 👁️ Observer (OCR 수신)

POS/태블릿에서 OCR로 인식한 데이터를 수신하여 VIP/주의 고객을 실시간 감지합니다.

```bash
# API 엔드포인트
POST /api/v1/observer/ocr
```

### 2. 🗺️ Physis Map (M-T-S)

고객을 3차원 좌표로 분류합니다:
- **M (Money)**: 매출 기여도 (0-100)
- **T (Trouble)**: 민원/리스크 (0-100)
- **S (Synergy)**: 인맥 영향력 (0-100)

```bash
# 고객 등록
POST /api/v1/customers

# 점수 업데이트
PUT /api/v1/customers/{user_id}/scores?m=80&t=20&s=60
```

### 3. 🕸️ Human Network (PageRank)

고객 간 관계를 분석하여 영향력자를 탐지합니다.

```bash
# 관계 추가
POST /api/v1/network/relationship

# 영향력 순위
GET /api/v1/network/pagerank

# 여왕벌 탐색
GET /api/v1/network/queen-bees

# 이탈 영향 시뮬레이션
GET /api/v1/network/churn-impact/{user_id}
```

### 4. 🧠 Oracle Engine (예측 AI)

날씨, 요일, 이벤트를 분석하여 매출을 예측합니다.

```bash
# 내일 예측
GET /api/v1/oracle/tomorrow/{station_id}

# 주간 예보
GET /api/v1/oracle/weekly/{station_id}
```

### 5. 👻 War Game Simulator

의사결정 전 결과를 시뮬레이션합니다.

```bash
# 쿠폰 시뮬레이션
POST /api/v1/wargame/simulate/coupon

# 최적 할인율 탐색
GET /api/v1/wargame/optimal-discount
```

### 6. 🎮 RPG Dashboard

직원 게이미피케이션 시스템입니다.

```bash
# 플레이어 생성
POST /api/v1/rpg/player?employee_id=EMP001&name=홍길동

# 퀘스트 완료
POST /api/v1/rpg/quest/complete
```

---

## 📖 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Health | GET | `/health` | 헬스 체크 |
| Customers | POST | `/api/v1/customers` | 고객 등록 |
| Customers | GET | `/api/v1/customers` | 고객 목록 |
| Network | GET | `/api/v1/network/queen-bees` | 여왕벌 탐색 |
| Oracle | GET | `/api/v1/oracle/tomorrow/{station_id}` | 내일 예측 |
| War Game | POST | `/api/v1/wargame/simulate/coupon` | 쿠폰 시뮬레이션 |
| RPG | POST | `/api/v1/rpg/quest/complete` | 퀘스트 완료 |
| Gate | POST | `/api/v1/gate/entry` | 입장 기록 |
| Legal | POST | `/api/v1/legal/consent` | 동의 기록 |
| God Mode | GET | `/api/v1/godmode/overview` | 전체 현황 |

---

## 🖥️ 대시보드 실행

### War Game Simulator (Ghost UI)

```bash
cd client
streamlit run war_game_simulator.py
```
→ http://localhost:8501

### RPG Dashboard

```bash
cd client
streamlit run rpg_dashboard.py
```
→ http://localhost:8501

### Network Graph Map

```bash
pip install plotly networkx
cd client
streamlit run network_graph_map.py
```
→ http://localhost:8501

### Legal Kiosk

```bash
cd client
streamlit run legal_kiosk.py
```
→ http://localhost:8501

---

## ⚙️ 환경 변수

`.env` 파일을 생성하여 설정할 수 있습니다:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Database (선택)
DATABASE_URL=postgresql://user:pass@localhost:5432/autus

# Redis (선택)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택)
WEATHER_API_KEY=your_api_key
SMS_API_KEY=your_api_key
```

---

## 🔧 문제 해결

### 1. 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
uvicorn main_final:app --port 8080
```

### 2. 모듈 import 오류

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

### 3. 얼굴 인식 설치 실패

```bash
# macOS
brew install cmake
pip install dlib
pip install face_recognition

# Ubuntu
sudo apt-get install cmake
pip install dlib
pip install face_recognition
```

### 4. Streamlit 오류

```bash
# 캐시 클리어
streamlit cache clear

# 재실행
streamlit run app.py --server.port 8501
```

---

## 📞 지원

- **Issue**: GitHub Issues
- **Email**: autus@empire.io

---

## 📄 라이선스

MIT License

---

<div align="center">

**🏛️ AUTUS EMPIRE v4.0.0 FINAL FORM**

*"통제하지 말고, 예측하라. 감시하지 말고, 이해하라."*

</div>







# 🏛️ AUTUS EMPIRE - Final Form v4.0.0

> **"아우투스 제국의 모든 것이 하나로"**

통합 매장 운영 시스템 - 고객 관리, 예측 AI, 인맥 분석, 직원 게이미피케이션을 하나로

---

## 📋 목차

1. [개요](#-개요)
2. [시스템 요구사항](#-시스템-요구사항)
3. [빠른 시작](#-빠른-시작)
4. [로컬 설치](#-로컬-설치)
5. [Docker 배포](#-docker-배포)
6. [Railway 배포](#-railway-배포)
7. [모듈 설명](#-모듈-설명)
8. [API 문서](#-api-문서)
9. [대시보드 실행](#-대시보드-실행)
10. [환경 변수](#-환경-변수)
11. [문제 해결](#-문제-해결)

---

## 🏛️ 개요

AUTUS Empire는 다음 기능을 통합한 매장 운영 시스템입니다:

| 모듈 | 설명 |
|------|------|
| 👁️ **Observer** | OCR 기반 고객 감지 |
| 🗺️ **Physis Map** | M-T-S 3차원 고객 분류 |
| 🕸️ **Human Network** | PageRank 기반 인맥 분석 |
| 🧠 **Oracle Engine** | 날씨/이벤트 기반 예측 AI |
| 🕵️ **Bounty Hunter** | 충성 고객 암행어사 시스템 |
| 👻 **War Game** | 의사결정 시뮬레이터 (Ghost UI) |
| 🎮 **RPG Dashboard** | 직원 게이미피케이션 |
| 👁️ **Gate Keeper** | 얼굴 인식 자동 출석 |
| 🛡️ **Legal Shield** | 전자 동의 시스템 |
| 📴 **Network Manager** | 오프라인 생존 모드 |

---

## 💻 시스템 요구사항

### 최소 요구사항

- **Python**: 3.9+
- **RAM**: 2GB+
- **디스크**: 1GB+
- **OS**: Windows/macOS/Linux

### 권장 요구사항

- **Python**: 3.11
- **RAM**: 4GB+
- **디스크**: 5GB+
- **카메라**: Gate Keeper 사용 시

---

## 🚀 빠른 시작

### 1분 설치 (로컬)

```bash
# 1. 클론
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main_final.py
```

브라우저에서 `http://localhost:8000/docs` 접속!

---

## 📦 로컬 설치 (상세)

### Step 1: Python 설치 확인

```bash
python --version
# Python 3.9+ 필요
```

### Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire
```

### Step 3: 가상환경 생성 및 활성화

```bash
# 생성
python -m venv venv

# 활성화 (Linux/macOS)
source venv/bin/activate

# 활성화 (Windows CMD)
venv\Scripts\activate

# 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### Step 4: 의존성 설치

```bash
# 기본 설치
pip install -r requirements.txt

# (선택) 얼굴 인식 기능 사용 시
pip install face_recognition  # dlib 필요
```

### Step 5: 서버 실행

```bash
# 방법 1: Python 직접 실행
python main_final.py

# 방법 2: uvicorn 사용
uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

# 방법 3: 백그라운드 실행
nohup python main_final.py > server.log 2>&1 &
```

### Step 6: 접속 확인

- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

---

## 🐳 Docker 배포

### 빠른 Docker 실행

```bash
# 빌드
docker build -t autus-empire .

# 실행
docker run -d -p 8000:8000 --name autus autus-empire

# 로그 확인
docker logs -f autus
```

### Docker Compose 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| API 서버 | 8000 | http://localhost:8000 |
| War Game | 8501 | http://localhost:8501 |

---

## 🚂 Railway 배포

### Step 1: Railway 계정 준비

1. [Railway](https://railway.app) 가입
2. GitHub 연동

### Step 2: 프로젝트 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init

# 배포
railway up
```

### Step 3: 환경 변수 설정

Railway 대시보드에서:

```
PORT=8000
ENV=production
```

### Step 4: 도메인 설정

Railway는 자동으로 `*.up.railway.app` 도메인을 제공합니다.

---

## 📚 모듈 설명

### 1. 👁️ Observer (OCR 수신)

POS/태블릿에서 OCR로 인식한 데이터를 수신하여 VIP/주의 고객을 실시간 감지합니다.

```bash
# API 엔드포인트
POST /api/v1/observer/ocr
```

### 2. 🗺️ Physis Map (M-T-S)

고객을 3차원 좌표로 분류합니다:
- **M (Money)**: 매출 기여도 (0-100)
- **T (Trouble)**: 민원/리스크 (0-100)
- **S (Synergy)**: 인맥 영향력 (0-100)

```bash
# 고객 등록
POST /api/v1/customers

# 점수 업데이트
PUT /api/v1/customers/{user_id}/scores?m=80&t=20&s=60
```

### 3. 🕸️ Human Network (PageRank)

고객 간 관계를 분석하여 영향력자를 탐지합니다.

```bash
# 관계 추가
POST /api/v1/network/relationship

# 영향력 순위
GET /api/v1/network/pagerank

# 여왕벌 탐색
GET /api/v1/network/queen-bees

# 이탈 영향 시뮬레이션
GET /api/v1/network/churn-impact/{user_id}
```

### 4. 🧠 Oracle Engine (예측 AI)

날씨, 요일, 이벤트를 분석하여 매출을 예측합니다.

```bash
# 내일 예측
GET /api/v1/oracle/tomorrow/{station_id}

# 주간 예보
GET /api/v1/oracle/weekly/{station_id}
```

### 5. 👻 War Game Simulator

의사결정 전 결과를 시뮬레이션합니다.

```bash
# 쿠폰 시뮬레이션
POST /api/v1/wargame/simulate/coupon

# 최적 할인율 탐색
GET /api/v1/wargame/optimal-discount
```

### 6. 🎮 RPG Dashboard

직원 게이미피케이션 시스템입니다.

```bash
# 플레이어 생성
POST /api/v1/rpg/player?employee_id=EMP001&name=홍길동

# 퀘스트 완료
POST /api/v1/rpg/quest/complete
```

---

## 📖 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Health | GET | `/health` | 헬스 체크 |
| Customers | POST | `/api/v1/customers` | 고객 등록 |
| Customers | GET | `/api/v1/customers` | 고객 목록 |
| Network | GET | `/api/v1/network/queen-bees` | 여왕벌 탐색 |
| Oracle | GET | `/api/v1/oracle/tomorrow/{station_id}` | 내일 예측 |
| War Game | POST | `/api/v1/wargame/simulate/coupon` | 쿠폰 시뮬레이션 |
| RPG | POST | `/api/v1/rpg/quest/complete` | 퀘스트 완료 |
| Gate | POST | `/api/v1/gate/entry` | 입장 기록 |
| Legal | POST | `/api/v1/legal/consent` | 동의 기록 |
| God Mode | GET | `/api/v1/godmode/overview` | 전체 현황 |

---

## 🖥️ 대시보드 실행

### War Game Simulator (Ghost UI)

```bash
cd client
streamlit run war_game_simulator.py
```
→ http://localhost:8501

### RPG Dashboard

```bash
cd client
streamlit run rpg_dashboard.py
```
→ http://localhost:8501

### Network Graph Map

```bash
pip install plotly networkx
cd client
streamlit run network_graph_map.py
```
→ http://localhost:8501

### Legal Kiosk

```bash
cd client
streamlit run legal_kiosk.py
```
→ http://localhost:8501

---

## ⚙️ 환경 변수

`.env` 파일을 생성하여 설정할 수 있습니다:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Database (선택)
DATABASE_URL=postgresql://user:pass@localhost:5432/autus

# Redis (선택)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택)
WEATHER_API_KEY=your_api_key
SMS_API_KEY=your_api_key
```

---

## 🔧 문제 해결

### 1. 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
uvicorn main_final:app --port 8080
```

### 2. 모듈 import 오류

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

### 3. 얼굴 인식 설치 실패

```bash
# macOS
brew install cmake
pip install dlib
pip install face_recognition

# Ubuntu
sudo apt-get install cmake
pip install dlib
pip install face_recognition
```

### 4. Streamlit 오류

```bash
# 캐시 클리어
streamlit cache clear

# 재실행
streamlit run app.py --server.port 8501
```

---

## 📞 지원

- **Issue**: GitHub Issues
- **Email**: autus@empire.io

---

## 📄 라이선스

MIT License

---

<div align="center">

**🏛️ AUTUS EMPIRE v4.0.0 FINAL FORM**

*"통제하지 말고, 예측하라. 감시하지 말고, 이해하라."*

</div>







# 🏛️ AUTUS EMPIRE - Final Form v4.0.0

> **"아우투스 제국의 모든 것이 하나로"**

통합 매장 운영 시스템 - 고객 관리, 예측 AI, 인맥 분석, 직원 게이미피케이션을 하나로

---

## 📋 목차

1. [개요](#-개요)
2. [시스템 요구사항](#-시스템-요구사항)
3. [빠른 시작](#-빠른-시작)
4. [로컬 설치](#-로컬-설치)
5. [Docker 배포](#-docker-배포)
6. [Railway 배포](#-railway-배포)
7. [모듈 설명](#-모듈-설명)
8. [API 문서](#-api-문서)
9. [대시보드 실행](#-대시보드-실행)
10. [환경 변수](#-환경-변수)
11. [문제 해결](#-문제-해결)

---

## 🏛️ 개요

AUTUS Empire는 다음 기능을 통합한 매장 운영 시스템입니다:

| 모듈 | 설명 |
|------|------|
| 👁️ **Observer** | OCR 기반 고객 감지 |
| 🗺️ **Physis Map** | M-T-S 3차원 고객 분류 |
| 🕸️ **Human Network** | PageRank 기반 인맥 분석 |
| 🧠 **Oracle Engine** | 날씨/이벤트 기반 예측 AI |
| 🕵️ **Bounty Hunter** | 충성 고객 암행어사 시스템 |
| 👻 **War Game** | 의사결정 시뮬레이터 (Ghost UI) |
| 🎮 **RPG Dashboard** | 직원 게이미피케이션 |
| 👁️ **Gate Keeper** | 얼굴 인식 자동 출석 |
| 🛡️ **Legal Shield** | 전자 동의 시스템 |
| 📴 **Network Manager** | 오프라인 생존 모드 |

---

## 💻 시스템 요구사항

### 최소 요구사항

- **Python**: 3.9+
- **RAM**: 2GB+
- **디스크**: 1GB+
- **OS**: Windows/macOS/Linux

### 권장 요구사항

- **Python**: 3.11
- **RAM**: 4GB+
- **디스크**: 5GB+
- **카메라**: Gate Keeper 사용 시

---

## 🚀 빠른 시작

### 1분 설치 (로컬)

```bash
# 1. 클론
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main_final.py
```

브라우저에서 `http://localhost:8000/docs` 접속!

---

## 📦 로컬 설치 (상세)

### Step 1: Python 설치 확인

```bash
python --version
# Python 3.9+ 필요
```

### Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire
```

### Step 3: 가상환경 생성 및 활성화

```bash
# 생성
python -m venv venv

# 활성화 (Linux/macOS)
source venv/bin/activate

# 활성화 (Windows CMD)
venv\Scripts\activate

# 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### Step 4: 의존성 설치

```bash
# 기본 설치
pip install -r requirements.txt

# (선택) 얼굴 인식 기능 사용 시
pip install face_recognition  # dlib 필요
```

### Step 5: 서버 실행

```bash
# 방법 1: Python 직접 실행
python main_final.py

# 방법 2: uvicorn 사용
uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

# 방법 3: 백그라운드 실행
nohup python main_final.py > server.log 2>&1 &
```

### Step 6: 접속 확인

- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

---

## 🐳 Docker 배포

### 빠른 Docker 실행

```bash
# 빌드
docker build -t autus-empire .

# 실행
docker run -d -p 8000:8000 --name autus autus-empire

# 로그 확인
docker logs -f autus
```

### Docker Compose 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| API 서버 | 8000 | http://localhost:8000 |
| War Game | 8501 | http://localhost:8501 |

---

## 🚂 Railway 배포

### Step 1: Railway 계정 준비

1. [Railway](https://railway.app) 가입
2. GitHub 연동

### Step 2: 프로젝트 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init

# 배포
railway up
```

### Step 3: 환경 변수 설정

Railway 대시보드에서:

```
PORT=8000
ENV=production
```

### Step 4: 도메인 설정

Railway는 자동으로 `*.up.railway.app` 도메인을 제공합니다.

---

## 📚 모듈 설명

### 1. 👁️ Observer (OCR 수신)

POS/태블릿에서 OCR로 인식한 데이터를 수신하여 VIP/주의 고객을 실시간 감지합니다.

```bash
# API 엔드포인트
POST /api/v1/observer/ocr
```

### 2. 🗺️ Physis Map (M-T-S)

고객을 3차원 좌표로 분류합니다:
- **M (Money)**: 매출 기여도 (0-100)
- **T (Trouble)**: 민원/리스크 (0-100)
- **S (Synergy)**: 인맥 영향력 (0-100)

```bash
# 고객 등록
POST /api/v1/customers

# 점수 업데이트
PUT /api/v1/customers/{user_id}/scores?m=80&t=20&s=60
```

### 3. 🕸️ Human Network (PageRank)

고객 간 관계를 분석하여 영향력자를 탐지합니다.

```bash
# 관계 추가
POST /api/v1/network/relationship

# 영향력 순위
GET /api/v1/network/pagerank

# 여왕벌 탐색
GET /api/v1/network/queen-bees

# 이탈 영향 시뮬레이션
GET /api/v1/network/churn-impact/{user_id}
```

### 4. 🧠 Oracle Engine (예측 AI)

날씨, 요일, 이벤트를 분석하여 매출을 예측합니다.

```bash
# 내일 예측
GET /api/v1/oracle/tomorrow/{station_id}

# 주간 예보
GET /api/v1/oracle/weekly/{station_id}
```

### 5. 👻 War Game Simulator

의사결정 전 결과를 시뮬레이션합니다.

```bash
# 쿠폰 시뮬레이션
POST /api/v1/wargame/simulate/coupon

# 최적 할인율 탐색
GET /api/v1/wargame/optimal-discount
```

### 6. 🎮 RPG Dashboard

직원 게이미피케이션 시스템입니다.

```bash
# 플레이어 생성
POST /api/v1/rpg/player?employee_id=EMP001&name=홍길동

# 퀘스트 완료
POST /api/v1/rpg/quest/complete
```

---

## 📖 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Health | GET | `/health` | 헬스 체크 |
| Customers | POST | `/api/v1/customers` | 고객 등록 |
| Customers | GET | `/api/v1/customers` | 고객 목록 |
| Network | GET | `/api/v1/network/queen-bees` | 여왕벌 탐색 |
| Oracle | GET | `/api/v1/oracle/tomorrow/{station_id}` | 내일 예측 |
| War Game | POST | `/api/v1/wargame/simulate/coupon` | 쿠폰 시뮬레이션 |
| RPG | POST | `/api/v1/rpg/quest/complete` | 퀘스트 완료 |
| Gate | POST | `/api/v1/gate/entry` | 입장 기록 |
| Legal | POST | `/api/v1/legal/consent` | 동의 기록 |
| God Mode | GET | `/api/v1/godmode/overview` | 전체 현황 |

---

## 🖥️ 대시보드 실행

### War Game Simulator (Ghost UI)

```bash
cd client
streamlit run war_game_simulator.py
```
→ http://localhost:8501

### RPG Dashboard

```bash
cd client
streamlit run rpg_dashboard.py
```
→ http://localhost:8501

### Network Graph Map

```bash
pip install plotly networkx
cd client
streamlit run network_graph_map.py
```
→ http://localhost:8501

### Legal Kiosk

```bash
cd client
streamlit run legal_kiosk.py
```
→ http://localhost:8501

---

## ⚙️ 환경 변수

`.env` 파일을 생성하여 설정할 수 있습니다:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Database (선택)
DATABASE_URL=postgresql://user:pass@localhost:5432/autus

# Redis (선택)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택)
WEATHER_API_KEY=your_api_key
SMS_API_KEY=your_api_key
```

---

## 🔧 문제 해결

### 1. 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
uvicorn main_final:app --port 8080
```

### 2. 모듈 import 오류

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

### 3. 얼굴 인식 설치 실패

```bash
# macOS
brew install cmake
pip install dlib
pip install face_recognition

# Ubuntu
sudo apt-get install cmake
pip install dlib
pip install face_recognition
```

### 4. Streamlit 오류

```bash
# 캐시 클리어
streamlit cache clear

# 재실행
streamlit run app.py --server.port 8501
```

---

## 📞 지원

- **Issue**: GitHub Issues
- **Email**: autus@empire.io

---

## 📄 라이선스

MIT License

---

<div align="center">

**🏛️ AUTUS EMPIRE v4.0.0 FINAL FORM**

*"통제하지 말고, 예측하라. 감시하지 말고, 이해하라."*

</div>







# 🏛️ AUTUS EMPIRE - Final Form v4.0.0

> **"아우투스 제국의 모든 것이 하나로"**

통합 매장 운영 시스템 - 고객 관리, 예측 AI, 인맥 분석, 직원 게이미피케이션을 하나로

---

## 📋 목차

1. [개요](#-개요)
2. [시스템 요구사항](#-시스템-요구사항)
3. [빠른 시작](#-빠른-시작)
4. [로컬 설치](#-로컬-설치)
5. [Docker 배포](#-docker-배포)
6. [Railway 배포](#-railway-배포)
7. [모듈 설명](#-모듈-설명)
8. [API 문서](#-api-문서)
9. [대시보드 실행](#-대시보드-실행)
10. [환경 변수](#-환경-변수)
11. [문제 해결](#-문제-해결)

---

## 🏛️ 개요

AUTUS Empire는 다음 기능을 통합한 매장 운영 시스템입니다:

| 모듈 | 설명 |
|------|------|
| 👁️ **Observer** | OCR 기반 고객 감지 |
| 🗺️ **Physis Map** | M-T-S 3차원 고객 분류 |
| 🕸️ **Human Network** | PageRank 기반 인맥 분석 |
| 🧠 **Oracle Engine** | 날씨/이벤트 기반 예측 AI |
| 🕵️ **Bounty Hunter** | 충성 고객 암행어사 시스템 |
| 👻 **War Game** | 의사결정 시뮬레이터 (Ghost UI) |
| 🎮 **RPG Dashboard** | 직원 게이미피케이션 |
| 👁️ **Gate Keeper** | 얼굴 인식 자동 출석 |
| 🛡️ **Legal Shield** | 전자 동의 시스템 |
| 📴 **Network Manager** | 오프라인 생존 모드 |

---

## 💻 시스템 요구사항

### 최소 요구사항

- **Python**: 3.9+
- **RAM**: 2GB+
- **디스크**: 1GB+
- **OS**: Windows/macOS/Linux

### 권장 요구사항

- **Python**: 3.11
- **RAM**: 4GB+
- **디스크**: 5GB+
- **카메라**: Gate Keeper 사용 시

---

## 🚀 빠른 시작

### 1분 설치 (로컬)

```bash
# 1. 클론
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main_final.py
```

브라우저에서 `http://localhost:8000/docs` 접속!

---

## 📦 로컬 설치 (상세)

### Step 1: Python 설치 확인

```bash
python --version
# Python 3.9+ 필요
```

### Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire
```

### Step 3: 가상환경 생성 및 활성화

```bash
# 생성
python -m venv venv

# 활성화 (Linux/macOS)
source venv/bin/activate

# 활성화 (Windows CMD)
venv\Scripts\activate

# 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### Step 4: 의존성 설치

```bash
# 기본 설치
pip install -r requirements.txt

# (선택) 얼굴 인식 기능 사용 시
pip install face_recognition  # dlib 필요
```

### Step 5: 서버 실행

```bash
# 방법 1: Python 직접 실행
python main_final.py

# 방법 2: uvicorn 사용
uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

# 방법 3: 백그라운드 실행
nohup python main_final.py > server.log 2>&1 &
```

### Step 6: 접속 확인

- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

---

## 🐳 Docker 배포

### 빠른 Docker 실행

```bash
# 빌드
docker build -t autus-empire .

# 실행
docker run -d -p 8000:8000 --name autus autus-empire

# 로그 확인
docker logs -f autus
```

### Docker Compose 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| API 서버 | 8000 | http://localhost:8000 |
| War Game | 8501 | http://localhost:8501 |

---

## 🚂 Railway 배포

### Step 1: Railway 계정 준비

1. [Railway](https://railway.app) 가입
2. GitHub 연동

### Step 2: 프로젝트 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init

# 배포
railway up
```

### Step 3: 환경 변수 설정

Railway 대시보드에서:

```
PORT=8000
ENV=production
```

### Step 4: 도메인 설정

Railway는 자동으로 `*.up.railway.app` 도메인을 제공합니다.

---

## 📚 모듈 설명

### 1. 👁️ Observer (OCR 수신)

POS/태블릿에서 OCR로 인식한 데이터를 수신하여 VIP/주의 고객을 실시간 감지합니다.

```bash
# API 엔드포인트
POST /api/v1/observer/ocr
```

### 2. 🗺️ Physis Map (M-T-S)

고객을 3차원 좌표로 분류합니다:
- **M (Money)**: 매출 기여도 (0-100)
- **T (Trouble)**: 민원/리스크 (0-100)
- **S (Synergy)**: 인맥 영향력 (0-100)

```bash
# 고객 등록
POST /api/v1/customers

# 점수 업데이트
PUT /api/v1/customers/{user_id}/scores?m=80&t=20&s=60
```

### 3. 🕸️ Human Network (PageRank)

고객 간 관계를 분석하여 영향력자를 탐지합니다.

```bash
# 관계 추가
POST /api/v1/network/relationship

# 영향력 순위
GET /api/v1/network/pagerank

# 여왕벌 탐색
GET /api/v1/network/queen-bees

# 이탈 영향 시뮬레이션
GET /api/v1/network/churn-impact/{user_id}
```

### 4. 🧠 Oracle Engine (예측 AI)

날씨, 요일, 이벤트를 분석하여 매출을 예측합니다.

```bash
# 내일 예측
GET /api/v1/oracle/tomorrow/{station_id}

# 주간 예보
GET /api/v1/oracle/weekly/{station_id}
```

### 5. 👻 War Game Simulator

의사결정 전 결과를 시뮬레이션합니다.

```bash
# 쿠폰 시뮬레이션
POST /api/v1/wargame/simulate/coupon

# 최적 할인율 탐색
GET /api/v1/wargame/optimal-discount
```

### 6. 🎮 RPG Dashboard

직원 게이미피케이션 시스템입니다.

```bash
# 플레이어 생성
POST /api/v1/rpg/player?employee_id=EMP001&name=홍길동

# 퀘스트 완료
POST /api/v1/rpg/quest/complete
```

---

## 📖 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Health | GET | `/health` | 헬스 체크 |
| Customers | POST | `/api/v1/customers` | 고객 등록 |
| Customers | GET | `/api/v1/customers` | 고객 목록 |
| Network | GET | `/api/v1/network/queen-bees` | 여왕벌 탐색 |
| Oracle | GET | `/api/v1/oracle/tomorrow/{station_id}` | 내일 예측 |
| War Game | POST | `/api/v1/wargame/simulate/coupon` | 쿠폰 시뮬레이션 |
| RPG | POST | `/api/v1/rpg/quest/complete` | 퀘스트 완료 |
| Gate | POST | `/api/v1/gate/entry` | 입장 기록 |
| Legal | POST | `/api/v1/legal/consent` | 동의 기록 |
| God Mode | GET | `/api/v1/godmode/overview` | 전체 현황 |

---

## 🖥️ 대시보드 실행

### War Game Simulator (Ghost UI)

```bash
cd client
streamlit run war_game_simulator.py
```
→ http://localhost:8501

### RPG Dashboard

```bash
cd client
streamlit run rpg_dashboard.py
```
→ http://localhost:8501

### Network Graph Map

```bash
pip install plotly networkx
cd client
streamlit run network_graph_map.py
```
→ http://localhost:8501

### Legal Kiosk

```bash
cd client
streamlit run legal_kiosk.py
```
→ http://localhost:8501

---

## ⚙️ 환경 변수

`.env` 파일을 생성하여 설정할 수 있습니다:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Database (선택)
DATABASE_URL=postgresql://user:pass@localhost:5432/autus

# Redis (선택)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택)
WEATHER_API_KEY=your_api_key
SMS_API_KEY=your_api_key
```

---

## 🔧 문제 해결

### 1. 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
uvicorn main_final:app --port 8080
```

### 2. 모듈 import 오류

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

### 3. 얼굴 인식 설치 실패

```bash
# macOS
brew install cmake
pip install dlib
pip install face_recognition

# Ubuntu
sudo apt-get install cmake
pip install dlib
pip install face_recognition
```

### 4. Streamlit 오류

```bash
# 캐시 클리어
streamlit cache clear

# 재실행
streamlit run app.py --server.port 8501
```

---

## 📞 지원

- **Issue**: GitHub Issues
- **Email**: autus@empire.io

---

## 📄 라이선스

MIT License

---

<div align="center">

**🏛️ AUTUS EMPIRE v4.0.0 FINAL FORM**

*"통제하지 말고, 예측하라. 감시하지 말고, 이해하라."*

</div>

















# 🏛️ AUTUS EMPIRE - Final Form v4.0.0

> **"아우투스 제국의 모든 것이 하나로"**

통합 매장 운영 시스템 - 고객 관리, 예측 AI, 인맥 분석, 직원 게이미피케이션을 하나로

---

## 📋 목차

1. [개요](#-개요)
2. [시스템 요구사항](#-시스템-요구사항)
3. [빠른 시작](#-빠른-시작)
4. [로컬 설치](#-로컬-설치)
5. [Docker 배포](#-docker-배포)
6. [Railway 배포](#-railway-배포)
7. [모듈 설명](#-모듈-설명)
8. [API 문서](#-api-문서)
9. [대시보드 실행](#-대시보드-실행)
10. [환경 변수](#-환경-변수)
11. [문제 해결](#-문제-해결)

---

## 🏛️ 개요

AUTUS Empire는 다음 기능을 통합한 매장 운영 시스템입니다:

| 모듈 | 설명 |
|------|------|
| 👁️ **Observer** | OCR 기반 고객 감지 |
| 🗺️ **Physis Map** | M-T-S 3차원 고객 분류 |
| 🕸️ **Human Network** | PageRank 기반 인맥 분석 |
| 🧠 **Oracle Engine** | 날씨/이벤트 기반 예측 AI |
| 🕵️ **Bounty Hunter** | 충성 고객 암행어사 시스템 |
| 👻 **War Game** | 의사결정 시뮬레이터 (Ghost UI) |
| 🎮 **RPG Dashboard** | 직원 게이미피케이션 |
| 👁️ **Gate Keeper** | 얼굴 인식 자동 출석 |
| 🛡️ **Legal Shield** | 전자 동의 시스템 |
| 📴 **Network Manager** | 오프라인 생존 모드 |

---

## 💻 시스템 요구사항

### 최소 요구사항

- **Python**: 3.9+
- **RAM**: 2GB+
- **디스크**: 1GB+
- **OS**: Windows/macOS/Linux

### 권장 요구사항

- **Python**: 3.11
- **RAM**: 4GB+
- **디스크**: 5GB+
- **카메라**: Gate Keeper 사용 시

---

## 🚀 빠른 시작

### 1분 설치 (로컬)

```bash
# 1. 클론
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main_final.py
```

브라우저에서 `http://localhost:8000/docs` 접속!

---

## 📦 로컬 설치 (상세)

### Step 1: Python 설치 확인

```bash
python --version
# Python 3.9+ 필요
```

### Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire
```

### Step 3: 가상환경 생성 및 활성화

```bash
# 생성
python -m venv venv

# 활성화 (Linux/macOS)
source venv/bin/activate

# 활성화 (Windows CMD)
venv\Scripts\activate

# 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### Step 4: 의존성 설치

```bash
# 기본 설치
pip install -r requirements.txt

# (선택) 얼굴 인식 기능 사용 시
pip install face_recognition  # dlib 필요
```

### Step 5: 서버 실행

```bash
# 방법 1: Python 직접 실행
python main_final.py

# 방법 2: uvicorn 사용
uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

# 방법 3: 백그라운드 실행
nohup python main_final.py > server.log 2>&1 &
```

### Step 6: 접속 확인

- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

---

## 🐳 Docker 배포

### 빠른 Docker 실행

```bash
# 빌드
docker build -t autus-empire .

# 실행
docker run -d -p 8000:8000 --name autus autus-empire

# 로그 확인
docker logs -f autus
```

### Docker Compose 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| API 서버 | 8000 | http://localhost:8000 |
| War Game | 8501 | http://localhost:8501 |

---

## 🚂 Railway 배포

### Step 1: Railway 계정 준비

1. [Railway](https://railway.app) 가입
2. GitHub 연동

### Step 2: 프로젝트 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init

# 배포
railway up
```

### Step 3: 환경 변수 설정

Railway 대시보드에서:

```
PORT=8000
ENV=production
```

### Step 4: 도메인 설정

Railway는 자동으로 `*.up.railway.app` 도메인을 제공합니다.

---

## 📚 모듈 설명

### 1. 👁️ Observer (OCR 수신)

POS/태블릿에서 OCR로 인식한 데이터를 수신하여 VIP/주의 고객을 실시간 감지합니다.

```bash
# API 엔드포인트
POST /api/v1/observer/ocr
```

### 2. 🗺️ Physis Map (M-T-S)

고객을 3차원 좌표로 분류합니다:
- **M (Money)**: 매출 기여도 (0-100)
- **T (Trouble)**: 민원/리스크 (0-100)
- **S (Synergy)**: 인맥 영향력 (0-100)

```bash
# 고객 등록
POST /api/v1/customers

# 점수 업데이트
PUT /api/v1/customers/{user_id}/scores?m=80&t=20&s=60
```

### 3. 🕸️ Human Network (PageRank)

고객 간 관계를 분석하여 영향력자를 탐지합니다.

```bash
# 관계 추가
POST /api/v1/network/relationship

# 영향력 순위
GET /api/v1/network/pagerank

# 여왕벌 탐색
GET /api/v1/network/queen-bees

# 이탈 영향 시뮬레이션
GET /api/v1/network/churn-impact/{user_id}
```

### 4. 🧠 Oracle Engine (예측 AI)

날씨, 요일, 이벤트를 분석하여 매출을 예측합니다.

```bash
# 내일 예측
GET /api/v1/oracle/tomorrow/{station_id}

# 주간 예보
GET /api/v1/oracle/weekly/{station_id}
```

### 5. 👻 War Game Simulator

의사결정 전 결과를 시뮬레이션합니다.

```bash
# 쿠폰 시뮬레이션
POST /api/v1/wargame/simulate/coupon

# 최적 할인율 탐색
GET /api/v1/wargame/optimal-discount
```

### 6. 🎮 RPG Dashboard

직원 게이미피케이션 시스템입니다.

```bash
# 플레이어 생성
POST /api/v1/rpg/player?employee_id=EMP001&name=홍길동

# 퀘스트 완료
POST /api/v1/rpg/quest/complete
```

---

## 📖 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Health | GET | `/health` | 헬스 체크 |
| Customers | POST | `/api/v1/customers` | 고객 등록 |
| Customers | GET | `/api/v1/customers` | 고객 목록 |
| Network | GET | `/api/v1/network/queen-bees` | 여왕벌 탐색 |
| Oracle | GET | `/api/v1/oracle/tomorrow/{station_id}` | 내일 예측 |
| War Game | POST | `/api/v1/wargame/simulate/coupon` | 쿠폰 시뮬레이션 |
| RPG | POST | `/api/v1/rpg/quest/complete` | 퀘스트 완료 |
| Gate | POST | `/api/v1/gate/entry` | 입장 기록 |
| Legal | POST | `/api/v1/legal/consent` | 동의 기록 |
| God Mode | GET | `/api/v1/godmode/overview` | 전체 현황 |

---

## 🖥️ 대시보드 실행

### War Game Simulator (Ghost UI)

```bash
cd client
streamlit run war_game_simulator.py
```
→ http://localhost:8501

### RPG Dashboard

```bash
cd client
streamlit run rpg_dashboard.py
```
→ http://localhost:8501

### Network Graph Map

```bash
pip install plotly networkx
cd client
streamlit run network_graph_map.py
```
→ http://localhost:8501

### Legal Kiosk

```bash
cd client
streamlit run legal_kiosk.py
```
→ http://localhost:8501

---

## ⚙️ 환경 변수

`.env` 파일을 생성하여 설정할 수 있습니다:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Database (선택)
DATABASE_URL=postgresql://user:pass@localhost:5432/autus

# Redis (선택)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택)
WEATHER_API_KEY=your_api_key
SMS_API_KEY=your_api_key
```

---

## 🔧 문제 해결

### 1. 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
uvicorn main_final:app --port 8080
```

### 2. 모듈 import 오류

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

### 3. 얼굴 인식 설치 실패

```bash
# macOS
brew install cmake
pip install dlib
pip install face_recognition

# Ubuntu
sudo apt-get install cmake
pip install dlib
pip install face_recognition
```

### 4. Streamlit 오류

```bash
# 캐시 클리어
streamlit cache clear

# 재실행
streamlit run app.py --server.port 8501
```

---

## 📞 지원

- **Issue**: GitHub Issues
- **Email**: autus@empire.io

---

## 📄 라이선스

MIT License

---

<div align="center">

**🏛️ AUTUS EMPIRE v4.0.0 FINAL FORM**

*"통제하지 말고, 예측하라. 감시하지 말고, 이해하라."*

</div>







# 🏛️ AUTUS EMPIRE - Final Form v4.0.0

> **"아우투스 제국의 모든 것이 하나로"**

통합 매장 운영 시스템 - 고객 관리, 예측 AI, 인맥 분석, 직원 게이미피케이션을 하나로

---

## 📋 목차

1. [개요](#-개요)
2. [시스템 요구사항](#-시스템-요구사항)
3. [빠른 시작](#-빠른-시작)
4. [로컬 설치](#-로컬-설치)
5. [Docker 배포](#-docker-배포)
6. [Railway 배포](#-railway-배포)
7. [모듈 설명](#-모듈-설명)
8. [API 문서](#-api-문서)
9. [대시보드 실행](#-대시보드-실행)
10. [환경 변수](#-환경-변수)
11. [문제 해결](#-문제-해결)

---

## 🏛️ 개요

AUTUS Empire는 다음 기능을 통합한 매장 운영 시스템입니다:

| 모듈 | 설명 |
|------|------|
| 👁️ **Observer** | OCR 기반 고객 감지 |
| 🗺️ **Physis Map** | M-T-S 3차원 고객 분류 |
| 🕸️ **Human Network** | PageRank 기반 인맥 분석 |
| 🧠 **Oracle Engine** | 날씨/이벤트 기반 예측 AI |
| 🕵️ **Bounty Hunter** | 충성 고객 암행어사 시스템 |
| 👻 **War Game** | 의사결정 시뮬레이터 (Ghost UI) |
| 🎮 **RPG Dashboard** | 직원 게이미피케이션 |
| 👁️ **Gate Keeper** | 얼굴 인식 자동 출석 |
| 🛡️ **Legal Shield** | 전자 동의 시스템 |
| 📴 **Network Manager** | 오프라인 생존 모드 |

---

## 💻 시스템 요구사항

### 최소 요구사항

- **Python**: 3.9+
- **RAM**: 2GB+
- **디스크**: 1GB+
- **OS**: Windows/macOS/Linux

### 권장 요구사항

- **Python**: 3.11
- **RAM**: 4GB+
- **디스크**: 5GB+
- **카메라**: Gate Keeper 사용 시

---

## 🚀 빠른 시작

### 1분 설치 (로컬)

```bash
# 1. 클론
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main_final.py
```

브라우저에서 `http://localhost:8000/docs` 접속!

---

## 📦 로컬 설치 (상세)

### Step 1: Python 설치 확인

```bash
python --version
# Python 3.9+ 필요
```

### Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire
```

### Step 3: 가상환경 생성 및 활성화

```bash
# 생성
python -m venv venv

# 활성화 (Linux/macOS)
source venv/bin/activate

# 활성화 (Windows CMD)
venv\Scripts\activate

# 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### Step 4: 의존성 설치

```bash
# 기본 설치
pip install -r requirements.txt

# (선택) 얼굴 인식 기능 사용 시
pip install face_recognition  # dlib 필요
```

### Step 5: 서버 실행

```bash
# 방법 1: Python 직접 실행
python main_final.py

# 방법 2: uvicorn 사용
uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

# 방법 3: 백그라운드 실행
nohup python main_final.py > server.log 2>&1 &
```

### Step 6: 접속 확인

- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

---

## 🐳 Docker 배포

### 빠른 Docker 실행

```bash
# 빌드
docker build -t autus-empire .

# 실행
docker run -d -p 8000:8000 --name autus autus-empire

# 로그 확인
docker logs -f autus
```

### Docker Compose 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| API 서버 | 8000 | http://localhost:8000 |
| War Game | 8501 | http://localhost:8501 |

---

## 🚂 Railway 배포

### Step 1: Railway 계정 준비

1. [Railway](https://railway.app) 가입
2. GitHub 연동

### Step 2: 프로젝트 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init

# 배포
railway up
```

### Step 3: 환경 변수 설정

Railway 대시보드에서:

```
PORT=8000
ENV=production
```

### Step 4: 도메인 설정

Railway는 자동으로 `*.up.railway.app` 도메인을 제공합니다.

---

## 📚 모듈 설명

### 1. 👁️ Observer (OCR 수신)

POS/태블릿에서 OCR로 인식한 데이터를 수신하여 VIP/주의 고객을 실시간 감지합니다.

```bash
# API 엔드포인트
POST /api/v1/observer/ocr
```

### 2. 🗺️ Physis Map (M-T-S)

고객을 3차원 좌표로 분류합니다:
- **M (Money)**: 매출 기여도 (0-100)
- **T (Trouble)**: 민원/리스크 (0-100)
- **S (Synergy)**: 인맥 영향력 (0-100)

```bash
# 고객 등록
POST /api/v1/customers

# 점수 업데이트
PUT /api/v1/customers/{user_id}/scores?m=80&t=20&s=60
```

### 3. 🕸️ Human Network (PageRank)

고객 간 관계를 분석하여 영향력자를 탐지합니다.

```bash
# 관계 추가
POST /api/v1/network/relationship

# 영향력 순위
GET /api/v1/network/pagerank

# 여왕벌 탐색
GET /api/v1/network/queen-bees

# 이탈 영향 시뮬레이션
GET /api/v1/network/churn-impact/{user_id}
```

### 4. 🧠 Oracle Engine (예측 AI)

날씨, 요일, 이벤트를 분석하여 매출을 예측합니다.

```bash
# 내일 예측
GET /api/v1/oracle/tomorrow/{station_id}

# 주간 예보
GET /api/v1/oracle/weekly/{station_id}
```

### 5. 👻 War Game Simulator

의사결정 전 결과를 시뮬레이션합니다.

```bash
# 쿠폰 시뮬레이션
POST /api/v1/wargame/simulate/coupon

# 최적 할인율 탐색
GET /api/v1/wargame/optimal-discount
```

### 6. 🎮 RPG Dashboard

직원 게이미피케이션 시스템입니다.

```bash
# 플레이어 생성
POST /api/v1/rpg/player?employee_id=EMP001&name=홍길동

# 퀘스트 완료
POST /api/v1/rpg/quest/complete
```

---

## 📖 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Health | GET | `/health` | 헬스 체크 |
| Customers | POST | `/api/v1/customers` | 고객 등록 |
| Customers | GET | `/api/v1/customers` | 고객 목록 |
| Network | GET | `/api/v1/network/queen-bees` | 여왕벌 탐색 |
| Oracle | GET | `/api/v1/oracle/tomorrow/{station_id}` | 내일 예측 |
| War Game | POST | `/api/v1/wargame/simulate/coupon` | 쿠폰 시뮬레이션 |
| RPG | POST | `/api/v1/rpg/quest/complete` | 퀘스트 완료 |
| Gate | POST | `/api/v1/gate/entry` | 입장 기록 |
| Legal | POST | `/api/v1/legal/consent` | 동의 기록 |
| God Mode | GET | `/api/v1/godmode/overview` | 전체 현황 |

---

## 🖥️ 대시보드 실행

### War Game Simulator (Ghost UI)

```bash
cd client
streamlit run war_game_simulator.py
```
→ http://localhost:8501

### RPG Dashboard

```bash
cd client
streamlit run rpg_dashboard.py
```
→ http://localhost:8501

### Network Graph Map

```bash
pip install plotly networkx
cd client
streamlit run network_graph_map.py
```
→ http://localhost:8501

### Legal Kiosk

```bash
cd client
streamlit run legal_kiosk.py
```
→ http://localhost:8501

---

## ⚙️ 환경 변수

`.env` 파일을 생성하여 설정할 수 있습니다:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Database (선택)
DATABASE_URL=postgresql://user:pass@localhost:5432/autus

# Redis (선택)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택)
WEATHER_API_KEY=your_api_key
SMS_API_KEY=your_api_key
```

---

## 🔧 문제 해결

### 1. 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
uvicorn main_final:app --port 8080
```

### 2. 모듈 import 오류

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

### 3. 얼굴 인식 설치 실패

```bash
# macOS
brew install cmake
pip install dlib
pip install face_recognition

# Ubuntu
sudo apt-get install cmake
pip install dlib
pip install face_recognition
```

### 4. Streamlit 오류

```bash
# 캐시 클리어
streamlit cache clear

# 재실행
streamlit run app.py --server.port 8501
```

---

## 📞 지원

- **Issue**: GitHub Issues
- **Email**: autus@empire.io

---

## 📄 라이선스

MIT License

---

<div align="center">

**🏛️ AUTUS EMPIRE v4.0.0 FINAL FORM**

*"통제하지 말고, 예측하라. 감시하지 말고, 이해하라."*

</div>







# 🏛️ AUTUS EMPIRE - Final Form v4.0.0

> **"아우투스 제국의 모든 것이 하나로"**

통합 매장 운영 시스템 - 고객 관리, 예측 AI, 인맥 분석, 직원 게이미피케이션을 하나로

---

## 📋 목차

1. [개요](#-개요)
2. [시스템 요구사항](#-시스템-요구사항)
3. [빠른 시작](#-빠른-시작)
4. [로컬 설치](#-로컬-설치)
5. [Docker 배포](#-docker-배포)
6. [Railway 배포](#-railway-배포)
7. [모듈 설명](#-모듈-설명)
8. [API 문서](#-api-문서)
9. [대시보드 실행](#-대시보드-실행)
10. [환경 변수](#-환경-변수)
11. [문제 해결](#-문제-해결)

---

## 🏛️ 개요

AUTUS Empire는 다음 기능을 통합한 매장 운영 시스템입니다:

| 모듈 | 설명 |
|------|------|
| 👁️ **Observer** | OCR 기반 고객 감지 |
| 🗺️ **Physis Map** | M-T-S 3차원 고객 분류 |
| 🕸️ **Human Network** | PageRank 기반 인맥 분석 |
| 🧠 **Oracle Engine** | 날씨/이벤트 기반 예측 AI |
| 🕵️ **Bounty Hunter** | 충성 고객 암행어사 시스템 |
| 👻 **War Game** | 의사결정 시뮬레이터 (Ghost UI) |
| 🎮 **RPG Dashboard** | 직원 게이미피케이션 |
| 👁️ **Gate Keeper** | 얼굴 인식 자동 출석 |
| 🛡️ **Legal Shield** | 전자 동의 시스템 |
| 📴 **Network Manager** | 오프라인 생존 모드 |

---

## 💻 시스템 요구사항

### 최소 요구사항

- **Python**: 3.9+
- **RAM**: 2GB+
- **디스크**: 1GB+
- **OS**: Windows/macOS/Linux

### 권장 요구사항

- **Python**: 3.11
- **RAM**: 4GB+
- **디스크**: 5GB+
- **카메라**: Gate Keeper 사용 시

---

## 🚀 빠른 시작

### 1분 설치 (로컬)

```bash
# 1. 클론
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main_final.py
```

브라우저에서 `http://localhost:8000/docs` 접속!

---

## 📦 로컬 설치 (상세)

### Step 1: Python 설치 확인

```bash
python --version
# Python 3.9+ 필요
```

### Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire
```

### Step 3: 가상환경 생성 및 활성화

```bash
# 생성
python -m venv venv

# 활성화 (Linux/macOS)
source venv/bin/activate

# 활성화 (Windows CMD)
venv\Scripts\activate

# 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### Step 4: 의존성 설치

```bash
# 기본 설치
pip install -r requirements.txt

# (선택) 얼굴 인식 기능 사용 시
pip install face_recognition  # dlib 필요
```

### Step 5: 서버 실행

```bash
# 방법 1: Python 직접 실행
python main_final.py

# 방법 2: uvicorn 사용
uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

# 방법 3: 백그라운드 실행
nohup python main_final.py > server.log 2>&1 &
```

### Step 6: 접속 확인

- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

---

## 🐳 Docker 배포

### 빠른 Docker 실행

```bash
# 빌드
docker build -t autus-empire .

# 실행
docker run -d -p 8000:8000 --name autus autus-empire

# 로그 확인
docker logs -f autus
```

### Docker Compose 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| API 서버 | 8000 | http://localhost:8000 |
| War Game | 8501 | http://localhost:8501 |

---

## 🚂 Railway 배포

### Step 1: Railway 계정 준비

1. [Railway](https://railway.app) 가입
2. GitHub 연동

### Step 2: 프로젝트 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init

# 배포
railway up
```

### Step 3: 환경 변수 설정

Railway 대시보드에서:

```
PORT=8000
ENV=production
```

### Step 4: 도메인 설정

Railway는 자동으로 `*.up.railway.app` 도메인을 제공합니다.

---

## 📚 모듈 설명

### 1. 👁️ Observer (OCR 수신)

POS/태블릿에서 OCR로 인식한 데이터를 수신하여 VIP/주의 고객을 실시간 감지합니다.

```bash
# API 엔드포인트
POST /api/v1/observer/ocr
```

### 2. 🗺️ Physis Map (M-T-S)

고객을 3차원 좌표로 분류합니다:
- **M (Money)**: 매출 기여도 (0-100)
- **T (Trouble)**: 민원/리스크 (0-100)
- **S (Synergy)**: 인맥 영향력 (0-100)

```bash
# 고객 등록
POST /api/v1/customers

# 점수 업데이트
PUT /api/v1/customers/{user_id}/scores?m=80&t=20&s=60
```

### 3. 🕸️ Human Network (PageRank)

고객 간 관계를 분석하여 영향력자를 탐지합니다.

```bash
# 관계 추가
POST /api/v1/network/relationship

# 영향력 순위
GET /api/v1/network/pagerank

# 여왕벌 탐색
GET /api/v1/network/queen-bees

# 이탈 영향 시뮬레이션
GET /api/v1/network/churn-impact/{user_id}
```

### 4. 🧠 Oracle Engine (예측 AI)

날씨, 요일, 이벤트를 분석하여 매출을 예측합니다.

```bash
# 내일 예측
GET /api/v1/oracle/tomorrow/{station_id}

# 주간 예보
GET /api/v1/oracle/weekly/{station_id}
```

### 5. 👻 War Game Simulator

의사결정 전 결과를 시뮬레이션합니다.

```bash
# 쿠폰 시뮬레이션
POST /api/v1/wargame/simulate/coupon

# 최적 할인율 탐색
GET /api/v1/wargame/optimal-discount
```

### 6. 🎮 RPG Dashboard

직원 게이미피케이션 시스템입니다.

```bash
# 플레이어 생성
POST /api/v1/rpg/player?employee_id=EMP001&name=홍길동

# 퀘스트 완료
POST /api/v1/rpg/quest/complete
```

---

## 📖 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Health | GET | `/health` | 헬스 체크 |
| Customers | POST | `/api/v1/customers` | 고객 등록 |
| Customers | GET | `/api/v1/customers` | 고객 목록 |
| Network | GET | `/api/v1/network/queen-bees` | 여왕벌 탐색 |
| Oracle | GET | `/api/v1/oracle/tomorrow/{station_id}` | 내일 예측 |
| War Game | POST | `/api/v1/wargame/simulate/coupon` | 쿠폰 시뮬레이션 |
| RPG | POST | `/api/v1/rpg/quest/complete` | 퀘스트 완료 |
| Gate | POST | `/api/v1/gate/entry` | 입장 기록 |
| Legal | POST | `/api/v1/legal/consent` | 동의 기록 |
| God Mode | GET | `/api/v1/godmode/overview` | 전체 현황 |

---

## 🖥️ 대시보드 실행

### War Game Simulator (Ghost UI)

```bash
cd client
streamlit run war_game_simulator.py
```
→ http://localhost:8501

### RPG Dashboard

```bash
cd client
streamlit run rpg_dashboard.py
```
→ http://localhost:8501

### Network Graph Map

```bash
pip install plotly networkx
cd client
streamlit run network_graph_map.py
```
→ http://localhost:8501

### Legal Kiosk

```bash
cd client
streamlit run legal_kiosk.py
```
→ http://localhost:8501

---

## ⚙️ 환경 변수

`.env` 파일을 생성하여 설정할 수 있습니다:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Database (선택)
DATABASE_URL=postgresql://user:pass@localhost:5432/autus

# Redis (선택)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택)
WEATHER_API_KEY=your_api_key
SMS_API_KEY=your_api_key
```

---

## 🔧 문제 해결

### 1. 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
uvicorn main_final:app --port 8080
```

### 2. 모듈 import 오류

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

### 3. 얼굴 인식 설치 실패

```bash
# macOS
brew install cmake
pip install dlib
pip install face_recognition

# Ubuntu
sudo apt-get install cmake
pip install dlib
pip install face_recognition
```

### 4. Streamlit 오류

```bash
# 캐시 클리어
streamlit cache clear

# 재실행
streamlit run app.py --server.port 8501
```

---

## 📞 지원

- **Issue**: GitHub Issues
- **Email**: autus@empire.io

---

## 📄 라이선스

MIT License

---

<div align="center">

**🏛️ AUTUS EMPIRE v4.0.0 FINAL FORM**

*"통제하지 말고, 예측하라. 감시하지 말고, 이해하라."*

</div>







# 🏛️ AUTUS EMPIRE - Final Form v4.0.0

> **"아우투스 제국의 모든 것이 하나로"**

통합 매장 운영 시스템 - 고객 관리, 예측 AI, 인맥 분석, 직원 게이미피케이션을 하나로

---

## 📋 목차

1. [개요](#-개요)
2. [시스템 요구사항](#-시스템-요구사항)
3. [빠른 시작](#-빠른-시작)
4. [로컬 설치](#-로컬-설치)
5. [Docker 배포](#-docker-배포)
6. [Railway 배포](#-railway-배포)
7. [모듈 설명](#-모듈-설명)
8. [API 문서](#-api-문서)
9. [대시보드 실행](#-대시보드-실행)
10. [환경 변수](#-환경-변수)
11. [문제 해결](#-문제-해결)

---

## 🏛️ 개요

AUTUS Empire는 다음 기능을 통합한 매장 운영 시스템입니다:

| 모듈 | 설명 |
|------|------|
| 👁️ **Observer** | OCR 기반 고객 감지 |
| 🗺️ **Physis Map** | M-T-S 3차원 고객 분류 |
| 🕸️ **Human Network** | PageRank 기반 인맥 분석 |
| 🧠 **Oracle Engine** | 날씨/이벤트 기반 예측 AI |
| 🕵️ **Bounty Hunter** | 충성 고객 암행어사 시스템 |
| 👻 **War Game** | 의사결정 시뮬레이터 (Ghost UI) |
| 🎮 **RPG Dashboard** | 직원 게이미피케이션 |
| 👁️ **Gate Keeper** | 얼굴 인식 자동 출석 |
| 🛡️ **Legal Shield** | 전자 동의 시스템 |
| 📴 **Network Manager** | 오프라인 생존 모드 |

---

## 💻 시스템 요구사항

### 최소 요구사항

- **Python**: 3.9+
- **RAM**: 2GB+
- **디스크**: 1GB+
- **OS**: Windows/macOS/Linux

### 권장 요구사항

- **Python**: 3.11
- **RAM**: 4GB+
- **디스크**: 5GB+
- **카메라**: Gate Keeper 사용 시

---

## 🚀 빠른 시작

### 1분 설치 (로컬)

```bash
# 1. 클론
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main_final.py
```

브라우저에서 `http://localhost:8000/docs` 접속!

---

## 📦 로컬 설치 (상세)

### Step 1: Python 설치 확인

```bash
python --version
# Python 3.9+ 필요
```

### Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire
```

### Step 3: 가상환경 생성 및 활성화

```bash
# 생성
python -m venv venv

# 활성화 (Linux/macOS)
source venv/bin/activate

# 활성화 (Windows CMD)
venv\Scripts\activate

# 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### Step 4: 의존성 설치

```bash
# 기본 설치
pip install -r requirements.txt

# (선택) 얼굴 인식 기능 사용 시
pip install face_recognition  # dlib 필요
```

### Step 5: 서버 실행

```bash
# 방법 1: Python 직접 실행
python main_final.py

# 방법 2: uvicorn 사용
uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

# 방법 3: 백그라운드 실행
nohup python main_final.py > server.log 2>&1 &
```

### Step 6: 접속 확인

- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

---

## 🐳 Docker 배포

### 빠른 Docker 실행

```bash
# 빌드
docker build -t autus-empire .

# 실행
docker run -d -p 8000:8000 --name autus autus-empire

# 로그 확인
docker logs -f autus
```

### Docker Compose 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| API 서버 | 8000 | http://localhost:8000 |
| War Game | 8501 | http://localhost:8501 |

---

## 🚂 Railway 배포

### Step 1: Railway 계정 준비

1. [Railway](https://railway.app) 가입
2. GitHub 연동

### Step 2: 프로젝트 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init

# 배포
railway up
```

### Step 3: 환경 변수 설정

Railway 대시보드에서:

```
PORT=8000
ENV=production
```

### Step 4: 도메인 설정

Railway는 자동으로 `*.up.railway.app` 도메인을 제공합니다.

---

## 📚 모듈 설명

### 1. 👁️ Observer (OCR 수신)

POS/태블릿에서 OCR로 인식한 데이터를 수신하여 VIP/주의 고객을 실시간 감지합니다.

```bash
# API 엔드포인트
POST /api/v1/observer/ocr
```

### 2. 🗺️ Physis Map (M-T-S)

고객을 3차원 좌표로 분류합니다:
- **M (Money)**: 매출 기여도 (0-100)
- **T (Trouble)**: 민원/리스크 (0-100)
- **S (Synergy)**: 인맥 영향력 (0-100)

```bash
# 고객 등록
POST /api/v1/customers

# 점수 업데이트
PUT /api/v1/customers/{user_id}/scores?m=80&t=20&s=60
```

### 3. 🕸️ Human Network (PageRank)

고객 간 관계를 분석하여 영향력자를 탐지합니다.

```bash
# 관계 추가
POST /api/v1/network/relationship

# 영향력 순위
GET /api/v1/network/pagerank

# 여왕벌 탐색
GET /api/v1/network/queen-bees

# 이탈 영향 시뮬레이션
GET /api/v1/network/churn-impact/{user_id}
```

### 4. 🧠 Oracle Engine (예측 AI)

날씨, 요일, 이벤트를 분석하여 매출을 예측합니다.

```bash
# 내일 예측
GET /api/v1/oracle/tomorrow/{station_id}

# 주간 예보
GET /api/v1/oracle/weekly/{station_id}
```

### 5. 👻 War Game Simulator

의사결정 전 결과를 시뮬레이션합니다.

```bash
# 쿠폰 시뮬레이션
POST /api/v1/wargame/simulate/coupon

# 최적 할인율 탐색
GET /api/v1/wargame/optimal-discount
```

### 6. 🎮 RPG Dashboard

직원 게이미피케이션 시스템입니다.

```bash
# 플레이어 생성
POST /api/v1/rpg/player?employee_id=EMP001&name=홍길동

# 퀘스트 완료
POST /api/v1/rpg/quest/complete
```

---

## 📖 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Health | GET | `/health` | 헬스 체크 |
| Customers | POST | `/api/v1/customers` | 고객 등록 |
| Customers | GET | `/api/v1/customers` | 고객 목록 |
| Network | GET | `/api/v1/network/queen-bees` | 여왕벌 탐색 |
| Oracle | GET | `/api/v1/oracle/tomorrow/{station_id}` | 내일 예측 |
| War Game | POST | `/api/v1/wargame/simulate/coupon` | 쿠폰 시뮬레이션 |
| RPG | POST | `/api/v1/rpg/quest/complete` | 퀘스트 완료 |
| Gate | POST | `/api/v1/gate/entry` | 입장 기록 |
| Legal | POST | `/api/v1/legal/consent` | 동의 기록 |
| God Mode | GET | `/api/v1/godmode/overview` | 전체 현황 |

---

## 🖥️ 대시보드 실행

### War Game Simulator (Ghost UI)

```bash
cd client
streamlit run war_game_simulator.py
```
→ http://localhost:8501

### RPG Dashboard

```bash
cd client
streamlit run rpg_dashboard.py
```
→ http://localhost:8501

### Network Graph Map

```bash
pip install plotly networkx
cd client
streamlit run network_graph_map.py
```
→ http://localhost:8501

### Legal Kiosk

```bash
cd client
streamlit run legal_kiosk.py
```
→ http://localhost:8501

---

## ⚙️ 환경 변수

`.env` 파일을 생성하여 설정할 수 있습니다:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Database (선택)
DATABASE_URL=postgresql://user:pass@localhost:5432/autus

# Redis (선택)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택)
WEATHER_API_KEY=your_api_key
SMS_API_KEY=your_api_key
```

---

## 🔧 문제 해결

### 1. 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
uvicorn main_final:app --port 8080
```

### 2. 모듈 import 오류

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

### 3. 얼굴 인식 설치 실패

```bash
# macOS
brew install cmake
pip install dlib
pip install face_recognition

# Ubuntu
sudo apt-get install cmake
pip install dlib
pip install face_recognition
```

### 4. Streamlit 오류

```bash
# 캐시 클리어
streamlit cache clear

# 재실행
streamlit run app.py --server.port 8501
```

---

## 📞 지원

- **Issue**: GitHub Issues
- **Email**: autus@empire.io

---

## 📄 라이선스

MIT License

---

<div align="center">

**🏛️ AUTUS EMPIRE v4.0.0 FINAL FORM**

*"통제하지 말고, 예측하라. 감시하지 말고, 이해하라."*

</div>







# 🏛️ AUTUS EMPIRE - Final Form v4.0.0

> **"아우투스 제국의 모든 것이 하나로"**

통합 매장 운영 시스템 - 고객 관리, 예측 AI, 인맥 분석, 직원 게이미피케이션을 하나로

---

## 📋 목차

1. [개요](#-개요)
2. [시스템 요구사항](#-시스템-요구사항)
3. [빠른 시작](#-빠른-시작)
4. [로컬 설치](#-로컬-설치)
5. [Docker 배포](#-docker-배포)
6. [Railway 배포](#-railway-배포)
7. [모듈 설명](#-모듈-설명)
8. [API 문서](#-api-문서)
9. [대시보드 실행](#-대시보드-실행)
10. [환경 변수](#-환경-변수)
11. [문제 해결](#-문제-해결)

---

## 🏛️ 개요

AUTUS Empire는 다음 기능을 통합한 매장 운영 시스템입니다:

| 모듈 | 설명 |
|------|------|
| 👁️ **Observer** | OCR 기반 고객 감지 |
| 🗺️ **Physis Map** | M-T-S 3차원 고객 분류 |
| 🕸️ **Human Network** | PageRank 기반 인맥 분석 |
| 🧠 **Oracle Engine** | 날씨/이벤트 기반 예측 AI |
| 🕵️ **Bounty Hunter** | 충성 고객 암행어사 시스템 |
| 👻 **War Game** | 의사결정 시뮬레이터 (Ghost UI) |
| 🎮 **RPG Dashboard** | 직원 게이미피케이션 |
| 👁️ **Gate Keeper** | 얼굴 인식 자동 출석 |
| 🛡️ **Legal Shield** | 전자 동의 시스템 |
| 📴 **Network Manager** | 오프라인 생존 모드 |

---

## 💻 시스템 요구사항

### 최소 요구사항

- **Python**: 3.9+
- **RAM**: 2GB+
- **디스크**: 1GB+
- **OS**: Windows/macOS/Linux

### 권장 요구사항

- **Python**: 3.11
- **RAM**: 4GB+
- **디스크**: 5GB+
- **카메라**: Gate Keeper 사용 시

---

## 🚀 빠른 시작

### 1분 설치 (로컬)

```bash
# 1. 클론
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire

# 2. 가상환경 생성
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. 의존성 설치
pip install -r requirements.txt

# 4. 서버 실행
python main_final.py
```

브라우저에서 `http://localhost:8000/docs` 접속!

---

## 📦 로컬 설치 (상세)

### Step 1: Python 설치 확인

```bash
python --version
# Python 3.9+ 필요
```

### Step 2: 프로젝트 다운로드

```bash
git clone https://github.com/your-repo/autus-empire.git
cd autus-empire
```

### Step 3: 가상환경 생성 및 활성화

```bash
# 생성
python -m venv venv

# 활성화 (Linux/macOS)
source venv/bin/activate

# 활성화 (Windows CMD)
venv\Scripts\activate

# 활성화 (Windows PowerShell)
.\venv\Scripts\Activate.ps1
```

### Step 4: 의존성 설치

```bash
# 기본 설치
pip install -r requirements.txt

# (선택) 얼굴 인식 기능 사용 시
pip install face_recognition  # dlib 필요
```

### Step 5: 서버 실행

```bash
# 방법 1: Python 직접 실행
python main_final.py

# 방법 2: uvicorn 사용
uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

# 방법 3: 백그라운드 실행
nohup python main_final.py > server.log 2>&1 &
```

### Step 6: 접속 확인

- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

---

## 🐳 Docker 배포

### 빠른 Docker 실행

```bash
# 빌드
docker build -t autus-empire .

# 실행
docker run -d -p 8000:8000 --name autus autus-empire

# 로그 확인
docker logs -f autus
```

### Docker Compose 실행

```bash
# 전체 스택 실행
docker-compose up -d

# 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 서비스 포트

| 서비스 | 포트 | URL |
|--------|------|-----|
| API 서버 | 8000 | http://localhost:8000 |
| War Game | 8501 | http://localhost:8501 |

---

## 🚂 Railway 배포

### Step 1: Railway 계정 준비

1. [Railway](https://railway.app) 가입
2. GitHub 연동

### Step 2: 프로젝트 배포

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
railway init

# 배포
railway up
```

### Step 3: 환경 변수 설정

Railway 대시보드에서:

```
PORT=8000
ENV=production
```

### Step 4: 도메인 설정

Railway는 자동으로 `*.up.railway.app` 도메인을 제공합니다.

---

## 📚 모듈 설명

### 1. 👁️ Observer (OCR 수신)

POS/태블릿에서 OCR로 인식한 데이터를 수신하여 VIP/주의 고객을 실시간 감지합니다.

```bash
# API 엔드포인트
POST /api/v1/observer/ocr
```

### 2. 🗺️ Physis Map (M-T-S)

고객을 3차원 좌표로 분류합니다:
- **M (Money)**: 매출 기여도 (0-100)
- **T (Trouble)**: 민원/리스크 (0-100)
- **S (Synergy)**: 인맥 영향력 (0-100)

```bash
# 고객 등록
POST /api/v1/customers

# 점수 업데이트
PUT /api/v1/customers/{user_id}/scores?m=80&t=20&s=60
```

### 3. 🕸️ Human Network (PageRank)

고객 간 관계를 분석하여 영향력자를 탐지합니다.

```bash
# 관계 추가
POST /api/v1/network/relationship

# 영향력 순위
GET /api/v1/network/pagerank

# 여왕벌 탐색
GET /api/v1/network/queen-bees

# 이탈 영향 시뮬레이션
GET /api/v1/network/churn-impact/{user_id}
```

### 4. 🧠 Oracle Engine (예측 AI)

날씨, 요일, 이벤트를 분석하여 매출을 예측합니다.

```bash
# 내일 예측
GET /api/v1/oracle/tomorrow/{station_id}

# 주간 예보
GET /api/v1/oracle/weekly/{station_id}
```

### 5. 👻 War Game Simulator

의사결정 전 결과를 시뮬레이션합니다.

```bash
# 쿠폰 시뮬레이션
POST /api/v1/wargame/simulate/coupon

# 최적 할인율 탐색
GET /api/v1/wargame/optimal-discount
```

### 6. 🎮 RPG Dashboard

직원 게이미피케이션 시스템입니다.

```bash
# 플레이어 생성
POST /api/v1/rpg/player?employee_id=EMP001&name=홍길동

# 퀘스트 완료
POST /api/v1/rpg/quest/complete
```

---

## 📖 API 문서

서버 실행 후 다음 URL에서 API 문서를 확인할 수 있습니다:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 주요 엔드포인트

| 카테고리 | 메서드 | 경로 | 설명 |
|----------|--------|------|------|
| Health | GET | `/health` | 헬스 체크 |
| Customers | POST | `/api/v1/customers` | 고객 등록 |
| Customers | GET | `/api/v1/customers` | 고객 목록 |
| Network | GET | `/api/v1/network/queen-bees` | 여왕벌 탐색 |
| Oracle | GET | `/api/v1/oracle/tomorrow/{station_id}` | 내일 예측 |
| War Game | POST | `/api/v1/wargame/simulate/coupon` | 쿠폰 시뮬레이션 |
| RPG | POST | `/api/v1/rpg/quest/complete` | 퀘스트 완료 |
| Gate | POST | `/api/v1/gate/entry` | 입장 기록 |
| Legal | POST | `/api/v1/legal/consent` | 동의 기록 |
| God Mode | GET | `/api/v1/godmode/overview` | 전체 현황 |

---

## 🖥️ 대시보드 실행

### War Game Simulator (Ghost UI)

```bash
cd client
streamlit run war_game_simulator.py
```
→ http://localhost:8501

### RPG Dashboard

```bash
cd client
streamlit run rpg_dashboard.py
```
→ http://localhost:8501

### Network Graph Map

```bash
pip install plotly networkx
cd client
streamlit run network_graph_map.py
```
→ http://localhost:8501

### Legal Kiosk

```bash
cd client
streamlit run legal_kiosk.py
```
→ http://localhost:8501

---

## ⚙️ 환경 변수

`.env` 파일을 생성하여 설정할 수 있습니다:

```env
# Server
PORT=8000
HOST=0.0.0.0
ENV=development

# Database (선택)
DATABASE_URL=postgresql://user:pass@localhost:5432/autus

# Redis (선택)
REDIS_URL=redis://localhost:6379/0

# API Keys (선택)
WEATHER_API_KEY=your_api_key
SMS_API_KEY=your_api_key
```

---

## 🔧 문제 해결

### 1. 포트 충돌

```bash
# 8000 포트 사용 중인 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
uvicorn main_final:app --port 8080
```

### 2. 모듈 import 오류

```bash
# 의존성 재설치
pip install -r requirements.txt --force-reinstall
```

### 3. 얼굴 인식 설치 실패

```bash
# macOS
brew install cmake
pip install dlib
pip install face_recognition

# Ubuntu
sudo apt-get install cmake
pip install dlib
pip install face_recognition
```

### 4. Streamlit 오류

```bash
# 캐시 클리어
streamlit cache clear

# 재실행
streamlit run app.py --server.port 8501
```

---

## 📞 지원

- **Issue**: GitHub Issues
- **Email**: autus@empire.io

---

## 📄 라이선스

MIT License

---

<div align="center">

**🏛️ AUTUS EMPIRE v4.0.0 FINAL FORM**

*"통제하지 말고, 예측하라. 감시하지 말고, 이해하라."*

</div>






















