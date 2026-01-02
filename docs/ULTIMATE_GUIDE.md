# AUTUS TRINITY Ultimate Edition v3.2

> 10개 사업장 통합 제국 운영체제

## 🌟 주요 기능

### 서버 (main_ultimate.py)
- ✅ **OCR 데이터 수집** - Observer API를 통한 화면 데이터 수신
- ✅ **God Mode 대시보드** - 10개 매장 실시간 관제
- ✅ **자동 업데이트** - 클라이언트 버전 관리 및 원격 업데이트
- ✅ **게이미피케이션** - 날씨 기반 일일 미션 시스템
- ✅ **VIP/주의 감지** - 키워드 및 금액 기반 자동 분류

### 클라이언트 (autus_bridge_ultimate.py)
- ✅ **OCR 화면 캡처** - Tesseract 기반 텍스트 추출
- ✅ **다크 테마 UI** - 현대적인 다크 모드 인터페이스
- ✅ **알림 시스템** - VIP/주의 고객 사운드 + 토스트 알림
- ✅ **자동 업데이트** - 서버에서 새 버전 자동 확인 및 설치
- ✅ **게이미피케이션** - 일일 미션 및 보상 표시

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 의존성 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main_ultimate.py
```

**접속 주소:**
- 대시보드: http://localhost:8000/dashboard
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 2. 클라이언트 실행

```bash
# 의존성 설치
cd client
pip install -r requirements.txt

# Tesseract OCR 설치 필요!
# Windows: https://github.com/tesseract-ocr/tesseract/releases
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr tesseract-ocr-kor

# 클라이언트 시작
python autus_bridge_ultimate.py
```

---

## 🐳 Docker 배포

### Docker Compose (권장)

```bash
# Ultimate 버전 실행
docker compose -f docker-compose.ultimate.yml up -d

# 로그 확인
docker compose -f docker-compose.ultimate.yml logs -f
```

### Dockerfile 단독 실행

```bash
# 이미지 빌드
docker build -f Dockerfile.ultimate -t autus-ultimate .

# 컨테이너 실행
docker run -d -p 8000:8000 --name autus autus-ultimate
```

---

## 🚂 Railway 배포

1. **Railway 프로젝트 생성**
   ```bash
   railway login
   railway init
   ```

2. **설정 파일 사용**
   ```bash
   cp railway.ultimate.toml railway.toml
   ```

3. **배포**
   ```bash
   railway up
   ```

4. **환경 변수 설정** (Railway 대시보드)
   - `SECRET_KEY`: 보안 키
   - `ENVIRONMENT`: production
   - `UPDATE_URL`: 클라이언트 다운로드 URL

---

## 📦 클라이언트 EXE 빌드

```bash
cd client

# 빌드
python build_ultimate.py

# 결과: dist/AUTUS_Bridge_Ultimate.exe

# 캐시 정리
python build_ultimate.py --clean
```

---

## 🔌 API 엔드포인트

### 핵심 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/` | GET | 서버 정보 |
| `/health` | GET | 헬스체크 |
| `/ingest` | POST | OCR 데이터 수신 |
| `/dashboard` | GET | God Mode 대시보드 |
| `/version/check` | GET | 클라이언트 버전 확인 |

### Observer API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/observer/status` | GET | 옵저버 상태 |
| `/api/v1/observer/logs` | GET | 최근 로그 |
| `/api/v1/observer/stats` | GET | 통계 |

### 고객 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/customers` | GET | 고객 목록 |
| `/api/v1/customers/{phone}` | GET | 고객 상세 |
| `/api/v1/customers/{phone}` | PUT | 고객 정보 수정 |

### 스테이션 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/stations` | GET | 스테이션 목록 |

---

## ⚙️ 환경 변수

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 8000 | 서버 포트 |
| `ENVIRONMENT` | development | 환경 (development/production) |
| `SECRET_KEY` | autus-ultimate-secret | 보안 키 |
| `UPDATE_URL` | - | 클라이언트 업데이트 URL |

### 클라이언트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AUTUS_SERVER_URL` | http://localhost:8000 | 서버 URL |
| `AUTUS_STATION_ID` | TEST_PC_01 | 스테이션 ID |
| `AUTUS_BIZ_TYPE` | RESTAURANT | 업장 유형 |

---

## 🎮 게이미피케이션 시스템

### 날씨별 미션

| 날씨 | 미션 예시 | 보상 |
|------|----------|------|
| ☀️ Sunny | VIP 고객 3명 특별 인사 | 커피 쿠폰 |
| 🌧️ Rainy | 우산 없는 고객에게 비닐우산 제공 | +20P |
| ⛅ Cloudy | 따뜻한 음료 추천 | +15P |
| ❄️ Cold | 핫초코/따뜻한 물 제공 | 상품권 |

---

## 🔔 알림 시스템

### VIP 알림 (👑)
- **조건**: VIP/VVIP 키워드, 100만원 이상 금액
- **사운드**: 상승 멜로디 (C-E-G)
- **토스트**: 금색 배경

### 주의 알림 (⚠️)
- **조건**: 환불/불만/컴플레인 키워드
- **사운드**: 경고음 (3회 비프)
- **토스트**: 빨간 배경

---

## 📊 대시보드 기능

### 실시간 모니터링
- 5초마다 자동 새로고침
- 스테이션별 ONLINE/OFFLINE 상태
- 30초 이상 응답 없으면 OFFLINE 처리

### 통계
- 총 조회 수
- VIP 감지 수
- 주의 감지 수
- 활성 스테이션 수

### 알림 피드
- 최근 10개 알림 표시
- VIP/주의 고객 실시간 알림

---

## 🛠️ 트러블슈팅

### Tesseract 인식 오류
```bash
# 한글 언어 데이터 설치
# Windows: Tesseract 설치 시 추가 언어 선택
# macOS: brew install tesseract-lang
# Linux: sudo apt install tesseract-ocr-kor
```

### 서버 연결 실패
1. 서버가 실행 중인지 확인
2. 방화벽/포트 설정 확인
3. 서버 URL 확인 (http:// 포함)

### 화면 캡처 안됨
1. pyautogui 설치 확인
2. 화면 좌표 설정 재실행
3. 관리자 권한으로 실행 (Windows)

---

## 📝 버전 기록

### v3.2.0 (2024-12)
- ✨ God Mode 대시보드 추가
- ✨ 게이미피케이션 엔진 추가
- ✨ 자동 업데이트 시스템
- 🎨 다크 테마 UI
- 🔔 VIP/주의 알림 사운드

### v3.1.0
- Observer API 기본 구현
- VIP/주의 감지 로직

### v3.0.0
- 초기 릴리스
- OCR 기반 화면 캡처

---

## 📜 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 환영합니다!

"모든 것은 숫자이며, 답은 인적 구조 조정이다." 🏛️









# AUTUS TRINITY Ultimate Edition v3.2

> 10개 사업장 통합 제국 운영체제

## 🌟 주요 기능

### 서버 (main_ultimate.py)
- ✅ **OCR 데이터 수집** - Observer API를 통한 화면 데이터 수신
- ✅ **God Mode 대시보드** - 10개 매장 실시간 관제
- ✅ **자동 업데이트** - 클라이언트 버전 관리 및 원격 업데이트
- ✅ **게이미피케이션** - 날씨 기반 일일 미션 시스템
- ✅ **VIP/주의 감지** - 키워드 및 금액 기반 자동 분류

### 클라이언트 (autus_bridge_ultimate.py)
- ✅ **OCR 화면 캡처** - Tesseract 기반 텍스트 추출
- ✅ **다크 테마 UI** - 현대적인 다크 모드 인터페이스
- ✅ **알림 시스템** - VIP/주의 고객 사운드 + 토스트 알림
- ✅ **자동 업데이트** - 서버에서 새 버전 자동 확인 및 설치
- ✅ **게이미피케이션** - 일일 미션 및 보상 표시

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 의존성 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main_ultimate.py
```

**접속 주소:**
- 대시보드: http://localhost:8000/dashboard
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 2. 클라이언트 실행

```bash
# 의존성 설치
cd client
pip install -r requirements.txt

# Tesseract OCR 설치 필요!
# Windows: https://github.com/tesseract-ocr/tesseract/releases
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr tesseract-ocr-kor

# 클라이언트 시작
python autus_bridge_ultimate.py
```

---

## 🐳 Docker 배포

### Docker Compose (권장)

```bash
# Ultimate 버전 실행
docker compose -f docker-compose.ultimate.yml up -d

# 로그 확인
docker compose -f docker-compose.ultimate.yml logs -f
```

### Dockerfile 단독 실행

```bash
# 이미지 빌드
docker build -f Dockerfile.ultimate -t autus-ultimate .

# 컨테이너 실행
docker run -d -p 8000:8000 --name autus autus-ultimate
```

---

## 🚂 Railway 배포

1. **Railway 프로젝트 생성**
   ```bash
   railway login
   railway init
   ```

2. **설정 파일 사용**
   ```bash
   cp railway.ultimate.toml railway.toml
   ```

3. **배포**
   ```bash
   railway up
   ```

4. **환경 변수 설정** (Railway 대시보드)
   - `SECRET_KEY`: 보안 키
   - `ENVIRONMENT`: production
   - `UPDATE_URL`: 클라이언트 다운로드 URL

---

## 📦 클라이언트 EXE 빌드

```bash
cd client

# 빌드
python build_ultimate.py

# 결과: dist/AUTUS_Bridge_Ultimate.exe

# 캐시 정리
python build_ultimate.py --clean
```

---

## 🔌 API 엔드포인트

### 핵심 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/` | GET | 서버 정보 |
| `/health` | GET | 헬스체크 |
| `/ingest` | POST | OCR 데이터 수신 |
| `/dashboard` | GET | God Mode 대시보드 |
| `/version/check` | GET | 클라이언트 버전 확인 |

### Observer API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/observer/status` | GET | 옵저버 상태 |
| `/api/v1/observer/logs` | GET | 최근 로그 |
| `/api/v1/observer/stats` | GET | 통계 |

### 고객 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/customers` | GET | 고객 목록 |
| `/api/v1/customers/{phone}` | GET | 고객 상세 |
| `/api/v1/customers/{phone}` | PUT | 고객 정보 수정 |

### 스테이션 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/stations` | GET | 스테이션 목록 |

---

## ⚙️ 환경 변수

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 8000 | 서버 포트 |
| `ENVIRONMENT` | development | 환경 (development/production) |
| `SECRET_KEY` | autus-ultimate-secret | 보안 키 |
| `UPDATE_URL` | - | 클라이언트 업데이트 URL |

### 클라이언트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AUTUS_SERVER_URL` | http://localhost:8000 | 서버 URL |
| `AUTUS_STATION_ID` | TEST_PC_01 | 스테이션 ID |
| `AUTUS_BIZ_TYPE` | RESTAURANT | 업장 유형 |

---

## 🎮 게이미피케이션 시스템

### 날씨별 미션

| 날씨 | 미션 예시 | 보상 |
|------|----------|------|
| ☀️ Sunny | VIP 고객 3명 특별 인사 | 커피 쿠폰 |
| 🌧️ Rainy | 우산 없는 고객에게 비닐우산 제공 | +20P |
| ⛅ Cloudy | 따뜻한 음료 추천 | +15P |
| ❄️ Cold | 핫초코/따뜻한 물 제공 | 상품권 |

---

## 🔔 알림 시스템

### VIP 알림 (👑)
- **조건**: VIP/VVIP 키워드, 100만원 이상 금액
- **사운드**: 상승 멜로디 (C-E-G)
- **토스트**: 금색 배경

### 주의 알림 (⚠️)
- **조건**: 환불/불만/컴플레인 키워드
- **사운드**: 경고음 (3회 비프)
- **토스트**: 빨간 배경

---

## 📊 대시보드 기능

### 실시간 모니터링
- 5초마다 자동 새로고침
- 스테이션별 ONLINE/OFFLINE 상태
- 30초 이상 응답 없으면 OFFLINE 처리

### 통계
- 총 조회 수
- VIP 감지 수
- 주의 감지 수
- 활성 스테이션 수

### 알림 피드
- 최근 10개 알림 표시
- VIP/주의 고객 실시간 알림

---

## 🛠️ 트러블슈팅

### Tesseract 인식 오류
```bash
# 한글 언어 데이터 설치
# Windows: Tesseract 설치 시 추가 언어 선택
# macOS: brew install tesseract-lang
# Linux: sudo apt install tesseract-ocr-kor
```

### 서버 연결 실패
1. 서버가 실행 중인지 확인
2. 방화벽/포트 설정 확인
3. 서버 URL 확인 (http:// 포함)

### 화면 캡처 안됨
1. pyautogui 설치 확인
2. 화면 좌표 설정 재실행
3. 관리자 권한으로 실행 (Windows)

---

## 📝 버전 기록

### v3.2.0 (2024-12)
- ✨ God Mode 대시보드 추가
- ✨ 게이미피케이션 엔진 추가
- ✨ 자동 업데이트 시스템
- 🎨 다크 테마 UI
- 🔔 VIP/주의 알림 사운드

### v3.1.0
- Observer API 기본 구현
- VIP/주의 감지 로직

### v3.0.0
- 초기 릴리스
- OCR 기반 화면 캡처

---

## 📜 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 환영합니다!

"모든 것은 숫자이며, 답은 인적 구조 조정이다." 🏛️









# AUTUS TRINITY Ultimate Edition v3.2

> 10개 사업장 통합 제국 운영체제

## 🌟 주요 기능

### 서버 (main_ultimate.py)
- ✅ **OCR 데이터 수집** - Observer API를 통한 화면 데이터 수신
- ✅ **God Mode 대시보드** - 10개 매장 실시간 관제
- ✅ **자동 업데이트** - 클라이언트 버전 관리 및 원격 업데이트
- ✅ **게이미피케이션** - 날씨 기반 일일 미션 시스템
- ✅ **VIP/주의 감지** - 키워드 및 금액 기반 자동 분류

### 클라이언트 (autus_bridge_ultimate.py)
- ✅ **OCR 화면 캡처** - Tesseract 기반 텍스트 추출
- ✅ **다크 테마 UI** - 현대적인 다크 모드 인터페이스
- ✅ **알림 시스템** - VIP/주의 고객 사운드 + 토스트 알림
- ✅ **자동 업데이트** - 서버에서 새 버전 자동 확인 및 설치
- ✅ **게이미피케이션** - 일일 미션 및 보상 표시

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 의존성 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main_ultimate.py
```

**접속 주소:**
- 대시보드: http://localhost:8000/dashboard
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 2. 클라이언트 실행

```bash
# 의존성 설치
cd client
pip install -r requirements.txt

# Tesseract OCR 설치 필요!
# Windows: https://github.com/tesseract-ocr/tesseract/releases
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr tesseract-ocr-kor

# 클라이언트 시작
python autus_bridge_ultimate.py
```

---

## 🐳 Docker 배포

### Docker Compose (권장)

```bash
# Ultimate 버전 실행
docker compose -f docker-compose.ultimate.yml up -d

# 로그 확인
docker compose -f docker-compose.ultimate.yml logs -f
```

### Dockerfile 단독 실행

```bash
# 이미지 빌드
docker build -f Dockerfile.ultimate -t autus-ultimate .

# 컨테이너 실행
docker run -d -p 8000:8000 --name autus autus-ultimate
```

---

## 🚂 Railway 배포

1. **Railway 프로젝트 생성**
   ```bash
   railway login
   railway init
   ```

2. **설정 파일 사용**
   ```bash
   cp railway.ultimate.toml railway.toml
   ```

3. **배포**
   ```bash
   railway up
   ```

4. **환경 변수 설정** (Railway 대시보드)
   - `SECRET_KEY`: 보안 키
   - `ENVIRONMENT`: production
   - `UPDATE_URL`: 클라이언트 다운로드 URL

---

## 📦 클라이언트 EXE 빌드

```bash
cd client

# 빌드
python build_ultimate.py

# 결과: dist/AUTUS_Bridge_Ultimate.exe

# 캐시 정리
python build_ultimate.py --clean
```

---

## 🔌 API 엔드포인트

### 핵심 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/` | GET | 서버 정보 |
| `/health` | GET | 헬스체크 |
| `/ingest` | POST | OCR 데이터 수신 |
| `/dashboard` | GET | God Mode 대시보드 |
| `/version/check` | GET | 클라이언트 버전 확인 |

### Observer API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/observer/status` | GET | 옵저버 상태 |
| `/api/v1/observer/logs` | GET | 최근 로그 |
| `/api/v1/observer/stats` | GET | 통계 |

### 고객 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/customers` | GET | 고객 목록 |
| `/api/v1/customers/{phone}` | GET | 고객 상세 |
| `/api/v1/customers/{phone}` | PUT | 고객 정보 수정 |

### 스테이션 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/stations` | GET | 스테이션 목록 |

---

## ⚙️ 환경 변수

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 8000 | 서버 포트 |
| `ENVIRONMENT` | development | 환경 (development/production) |
| `SECRET_KEY` | autus-ultimate-secret | 보안 키 |
| `UPDATE_URL` | - | 클라이언트 업데이트 URL |

### 클라이언트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AUTUS_SERVER_URL` | http://localhost:8000 | 서버 URL |
| `AUTUS_STATION_ID` | TEST_PC_01 | 스테이션 ID |
| `AUTUS_BIZ_TYPE` | RESTAURANT | 업장 유형 |

---

## 🎮 게이미피케이션 시스템

### 날씨별 미션

| 날씨 | 미션 예시 | 보상 |
|------|----------|------|
| ☀️ Sunny | VIP 고객 3명 특별 인사 | 커피 쿠폰 |
| 🌧️ Rainy | 우산 없는 고객에게 비닐우산 제공 | +20P |
| ⛅ Cloudy | 따뜻한 음료 추천 | +15P |
| ❄️ Cold | 핫초코/따뜻한 물 제공 | 상품권 |

---

## 🔔 알림 시스템

### VIP 알림 (👑)
- **조건**: VIP/VVIP 키워드, 100만원 이상 금액
- **사운드**: 상승 멜로디 (C-E-G)
- **토스트**: 금색 배경

### 주의 알림 (⚠️)
- **조건**: 환불/불만/컴플레인 키워드
- **사운드**: 경고음 (3회 비프)
- **토스트**: 빨간 배경

---

## 📊 대시보드 기능

### 실시간 모니터링
- 5초마다 자동 새로고침
- 스테이션별 ONLINE/OFFLINE 상태
- 30초 이상 응답 없으면 OFFLINE 처리

### 통계
- 총 조회 수
- VIP 감지 수
- 주의 감지 수
- 활성 스테이션 수

### 알림 피드
- 최근 10개 알림 표시
- VIP/주의 고객 실시간 알림

---

## 🛠️ 트러블슈팅

### Tesseract 인식 오류
```bash
# 한글 언어 데이터 설치
# Windows: Tesseract 설치 시 추가 언어 선택
# macOS: brew install tesseract-lang
# Linux: sudo apt install tesseract-ocr-kor
```

### 서버 연결 실패
1. 서버가 실행 중인지 확인
2. 방화벽/포트 설정 확인
3. 서버 URL 확인 (http:// 포함)

### 화면 캡처 안됨
1. pyautogui 설치 확인
2. 화면 좌표 설정 재실행
3. 관리자 권한으로 실행 (Windows)

---

## 📝 버전 기록

### v3.2.0 (2024-12)
- ✨ God Mode 대시보드 추가
- ✨ 게이미피케이션 엔진 추가
- ✨ 자동 업데이트 시스템
- 🎨 다크 테마 UI
- 🔔 VIP/주의 알림 사운드

### v3.1.0
- Observer API 기본 구현
- VIP/주의 감지 로직

### v3.0.0
- 초기 릴리스
- OCR 기반 화면 캡처

---

## 📜 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 환영합니다!

"모든 것은 숫자이며, 답은 인적 구조 조정이다." 🏛️









# AUTUS TRINITY Ultimate Edition v3.2

> 10개 사업장 통합 제국 운영체제

## 🌟 주요 기능

### 서버 (main_ultimate.py)
- ✅ **OCR 데이터 수집** - Observer API를 통한 화면 데이터 수신
- ✅ **God Mode 대시보드** - 10개 매장 실시간 관제
- ✅ **자동 업데이트** - 클라이언트 버전 관리 및 원격 업데이트
- ✅ **게이미피케이션** - 날씨 기반 일일 미션 시스템
- ✅ **VIP/주의 감지** - 키워드 및 금액 기반 자동 분류

### 클라이언트 (autus_bridge_ultimate.py)
- ✅ **OCR 화면 캡처** - Tesseract 기반 텍스트 추출
- ✅ **다크 테마 UI** - 현대적인 다크 모드 인터페이스
- ✅ **알림 시스템** - VIP/주의 고객 사운드 + 토스트 알림
- ✅ **자동 업데이트** - 서버에서 새 버전 자동 확인 및 설치
- ✅ **게이미피케이션** - 일일 미션 및 보상 표시

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 의존성 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main_ultimate.py
```

**접속 주소:**
- 대시보드: http://localhost:8000/dashboard
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 2. 클라이언트 실행

```bash
# 의존성 설치
cd client
pip install -r requirements.txt

# Tesseract OCR 설치 필요!
# Windows: https://github.com/tesseract-ocr/tesseract/releases
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr tesseract-ocr-kor

# 클라이언트 시작
python autus_bridge_ultimate.py
```

---

## 🐳 Docker 배포

### Docker Compose (권장)

```bash
# Ultimate 버전 실행
docker compose -f docker-compose.ultimate.yml up -d

# 로그 확인
docker compose -f docker-compose.ultimate.yml logs -f
```

### Dockerfile 단독 실행

```bash
# 이미지 빌드
docker build -f Dockerfile.ultimate -t autus-ultimate .

# 컨테이너 실행
docker run -d -p 8000:8000 --name autus autus-ultimate
```

---

## 🚂 Railway 배포

1. **Railway 프로젝트 생성**
   ```bash
   railway login
   railway init
   ```

2. **설정 파일 사용**
   ```bash
   cp railway.ultimate.toml railway.toml
   ```

3. **배포**
   ```bash
   railway up
   ```

4. **환경 변수 설정** (Railway 대시보드)
   - `SECRET_KEY`: 보안 키
   - `ENVIRONMENT`: production
   - `UPDATE_URL`: 클라이언트 다운로드 URL

---

## 📦 클라이언트 EXE 빌드

```bash
cd client

# 빌드
python build_ultimate.py

# 결과: dist/AUTUS_Bridge_Ultimate.exe

# 캐시 정리
python build_ultimate.py --clean
```

---

## 🔌 API 엔드포인트

### 핵심 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/` | GET | 서버 정보 |
| `/health` | GET | 헬스체크 |
| `/ingest` | POST | OCR 데이터 수신 |
| `/dashboard` | GET | God Mode 대시보드 |
| `/version/check` | GET | 클라이언트 버전 확인 |

### Observer API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/observer/status` | GET | 옵저버 상태 |
| `/api/v1/observer/logs` | GET | 최근 로그 |
| `/api/v1/observer/stats` | GET | 통계 |

### 고객 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/customers` | GET | 고객 목록 |
| `/api/v1/customers/{phone}` | GET | 고객 상세 |
| `/api/v1/customers/{phone}` | PUT | 고객 정보 수정 |

### 스테이션 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/stations` | GET | 스테이션 목록 |

---

## ⚙️ 환경 변수

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 8000 | 서버 포트 |
| `ENVIRONMENT` | development | 환경 (development/production) |
| `SECRET_KEY` | autus-ultimate-secret | 보안 키 |
| `UPDATE_URL` | - | 클라이언트 업데이트 URL |

### 클라이언트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AUTUS_SERVER_URL` | http://localhost:8000 | 서버 URL |
| `AUTUS_STATION_ID` | TEST_PC_01 | 스테이션 ID |
| `AUTUS_BIZ_TYPE` | RESTAURANT | 업장 유형 |

---

## 🎮 게이미피케이션 시스템

### 날씨별 미션

| 날씨 | 미션 예시 | 보상 |
|------|----------|------|
| ☀️ Sunny | VIP 고객 3명 특별 인사 | 커피 쿠폰 |
| 🌧️ Rainy | 우산 없는 고객에게 비닐우산 제공 | +20P |
| ⛅ Cloudy | 따뜻한 음료 추천 | +15P |
| ❄️ Cold | 핫초코/따뜻한 물 제공 | 상품권 |

---

## 🔔 알림 시스템

### VIP 알림 (👑)
- **조건**: VIP/VVIP 키워드, 100만원 이상 금액
- **사운드**: 상승 멜로디 (C-E-G)
- **토스트**: 금색 배경

### 주의 알림 (⚠️)
- **조건**: 환불/불만/컴플레인 키워드
- **사운드**: 경고음 (3회 비프)
- **토스트**: 빨간 배경

---

## 📊 대시보드 기능

### 실시간 모니터링
- 5초마다 자동 새로고침
- 스테이션별 ONLINE/OFFLINE 상태
- 30초 이상 응답 없으면 OFFLINE 처리

### 통계
- 총 조회 수
- VIP 감지 수
- 주의 감지 수
- 활성 스테이션 수

### 알림 피드
- 최근 10개 알림 표시
- VIP/주의 고객 실시간 알림

---

## 🛠️ 트러블슈팅

### Tesseract 인식 오류
```bash
# 한글 언어 데이터 설치
# Windows: Tesseract 설치 시 추가 언어 선택
# macOS: brew install tesseract-lang
# Linux: sudo apt install tesseract-ocr-kor
```

### 서버 연결 실패
1. 서버가 실행 중인지 확인
2. 방화벽/포트 설정 확인
3. 서버 URL 확인 (http:// 포함)

### 화면 캡처 안됨
1. pyautogui 설치 확인
2. 화면 좌표 설정 재실행
3. 관리자 권한으로 실행 (Windows)

---

## 📝 버전 기록

### v3.2.0 (2024-12)
- ✨ God Mode 대시보드 추가
- ✨ 게이미피케이션 엔진 추가
- ✨ 자동 업데이트 시스템
- 🎨 다크 테마 UI
- 🔔 VIP/주의 알림 사운드

### v3.1.0
- Observer API 기본 구현
- VIP/주의 감지 로직

### v3.0.0
- 초기 릴리스
- OCR 기반 화면 캡처

---

## 📜 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 환영합니다!

"모든 것은 숫자이며, 답은 인적 구조 조정이다." 🏛️









# AUTUS TRINITY Ultimate Edition v3.2

> 10개 사업장 통합 제국 운영체제

## 🌟 주요 기능

### 서버 (main_ultimate.py)
- ✅ **OCR 데이터 수집** - Observer API를 통한 화면 데이터 수신
- ✅ **God Mode 대시보드** - 10개 매장 실시간 관제
- ✅ **자동 업데이트** - 클라이언트 버전 관리 및 원격 업데이트
- ✅ **게이미피케이션** - 날씨 기반 일일 미션 시스템
- ✅ **VIP/주의 감지** - 키워드 및 금액 기반 자동 분류

### 클라이언트 (autus_bridge_ultimate.py)
- ✅ **OCR 화면 캡처** - Tesseract 기반 텍스트 추출
- ✅ **다크 테마 UI** - 현대적인 다크 모드 인터페이스
- ✅ **알림 시스템** - VIP/주의 고객 사운드 + 토스트 알림
- ✅ **자동 업데이트** - 서버에서 새 버전 자동 확인 및 설치
- ✅ **게이미피케이션** - 일일 미션 및 보상 표시

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 의존성 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main_ultimate.py
```

**접속 주소:**
- 대시보드: http://localhost:8000/dashboard
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 2. 클라이언트 실행

```bash
# 의존성 설치
cd client
pip install -r requirements.txt

# Tesseract OCR 설치 필요!
# Windows: https://github.com/tesseract-ocr/tesseract/releases
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr tesseract-ocr-kor

# 클라이언트 시작
python autus_bridge_ultimate.py
```

---

## 🐳 Docker 배포

### Docker Compose (권장)

```bash
# Ultimate 버전 실행
docker compose -f docker-compose.ultimate.yml up -d

# 로그 확인
docker compose -f docker-compose.ultimate.yml logs -f
```

### Dockerfile 단독 실행

```bash
# 이미지 빌드
docker build -f Dockerfile.ultimate -t autus-ultimate .

# 컨테이너 실행
docker run -d -p 8000:8000 --name autus autus-ultimate
```

---

## 🚂 Railway 배포

1. **Railway 프로젝트 생성**
   ```bash
   railway login
   railway init
   ```

2. **설정 파일 사용**
   ```bash
   cp railway.ultimate.toml railway.toml
   ```

3. **배포**
   ```bash
   railway up
   ```

4. **환경 변수 설정** (Railway 대시보드)
   - `SECRET_KEY`: 보안 키
   - `ENVIRONMENT`: production
   - `UPDATE_URL`: 클라이언트 다운로드 URL

---

## 📦 클라이언트 EXE 빌드

```bash
cd client

# 빌드
python build_ultimate.py

# 결과: dist/AUTUS_Bridge_Ultimate.exe

# 캐시 정리
python build_ultimate.py --clean
```

---

## 🔌 API 엔드포인트

### 핵심 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/` | GET | 서버 정보 |
| `/health` | GET | 헬스체크 |
| `/ingest` | POST | OCR 데이터 수신 |
| `/dashboard` | GET | God Mode 대시보드 |
| `/version/check` | GET | 클라이언트 버전 확인 |

### Observer API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/observer/status` | GET | 옵저버 상태 |
| `/api/v1/observer/logs` | GET | 최근 로그 |
| `/api/v1/observer/stats` | GET | 통계 |

### 고객 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/customers` | GET | 고객 목록 |
| `/api/v1/customers/{phone}` | GET | 고객 상세 |
| `/api/v1/customers/{phone}` | PUT | 고객 정보 수정 |

### 스테이션 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/stations` | GET | 스테이션 목록 |

---

## ⚙️ 환경 변수

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 8000 | 서버 포트 |
| `ENVIRONMENT` | development | 환경 (development/production) |
| `SECRET_KEY` | autus-ultimate-secret | 보안 키 |
| `UPDATE_URL` | - | 클라이언트 업데이트 URL |

### 클라이언트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AUTUS_SERVER_URL` | http://localhost:8000 | 서버 URL |
| `AUTUS_STATION_ID` | TEST_PC_01 | 스테이션 ID |
| `AUTUS_BIZ_TYPE` | RESTAURANT | 업장 유형 |

---

## 🎮 게이미피케이션 시스템

### 날씨별 미션

| 날씨 | 미션 예시 | 보상 |
|------|----------|------|
| ☀️ Sunny | VIP 고객 3명 특별 인사 | 커피 쿠폰 |
| 🌧️ Rainy | 우산 없는 고객에게 비닐우산 제공 | +20P |
| ⛅ Cloudy | 따뜻한 음료 추천 | +15P |
| ❄️ Cold | 핫초코/따뜻한 물 제공 | 상품권 |

---

## 🔔 알림 시스템

### VIP 알림 (👑)
- **조건**: VIP/VVIP 키워드, 100만원 이상 금액
- **사운드**: 상승 멜로디 (C-E-G)
- **토스트**: 금색 배경

### 주의 알림 (⚠️)
- **조건**: 환불/불만/컴플레인 키워드
- **사운드**: 경고음 (3회 비프)
- **토스트**: 빨간 배경

---

## 📊 대시보드 기능

### 실시간 모니터링
- 5초마다 자동 새로고침
- 스테이션별 ONLINE/OFFLINE 상태
- 30초 이상 응답 없으면 OFFLINE 처리

### 통계
- 총 조회 수
- VIP 감지 수
- 주의 감지 수
- 활성 스테이션 수

### 알림 피드
- 최근 10개 알림 표시
- VIP/주의 고객 실시간 알림

---

## 🛠️ 트러블슈팅

### Tesseract 인식 오류
```bash
# 한글 언어 데이터 설치
# Windows: Tesseract 설치 시 추가 언어 선택
# macOS: brew install tesseract-lang
# Linux: sudo apt install tesseract-ocr-kor
```

### 서버 연결 실패
1. 서버가 실행 중인지 확인
2. 방화벽/포트 설정 확인
3. 서버 URL 확인 (http:// 포함)

### 화면 캡처 안됨
1. pyautogui 설치 확인
2. 화면 좌표 설정 재실행
3. 관리자 권한으로 실행 (Windows)

---

## 📝 버전 기록

### v3.2.0 (2024-12)
- ✨ God Mode 대시보드 추가
- ✨ 게이미피케이션 엔진 추가
- ✨ 자동 업데이트 시스템
- 🎨 다크 테마 UI
- 🔔 VIP/주의 알림 사운드

### v3.1.0
- Observer API 기본 구현
- VIP/주의 감지 로직

### v3.0.0
- 초기 릴리스
- OCR 기반 화면 캡처

---

## 📜 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 환영합니다!

"모든 것은 숫자이며, 답은 인적 구조 조정이다." 🏛️



















# AUTUS TRINITY Ultimate Edition v3.2

> 10개 사업장 통합 제국 운영체제

## 🌟 주요 기능

### 서버 (main_ultimate.py)
- ✅ **OCR 데이터 수집** - Observer API를 통한 화면 데이터 수신
- ✅ **God Mode 대시보드** - 10개 매장 실시간 관제
- ✅ **자동 업데이트** - 클라이언트 버전 관리 및 원격 업데이트
- ✅ **게이미피케이션** - 날씨 기반 일일 미션 시스템
- ✅ **VIP/주의 감지** - 키워드 및 금액 기반 자동 분류

### 클라이언트 (autus_bridge_ultimate.py)
- ✅ **OCR 화면 캡처** - Tesseract 기반 텍스트 추출
- ✅ **다크 테마 UI** - 현대적인 다크 모드 인터페이스
- ✅ **알림 시스템** - VIP/주의 고객 사운드 + 토스트 알림
- ✅ **자동 업데이트** - 서버에서 새 버전 자동 확인 및 설치
- ✅ **게이미피케이션** - 일일 미션 및 보상 표시

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 의존성 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main_ultimate.py
```

**접속 주소:**
- 대시보드: http://localhost:8000/dashboard
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 2. 클라이언트 실행

```bash
# 의존성 설치
cd client
pip install -r requirements.txt

# Tesseract OCR 설치 필요!
# Windows: https://github.com/tesseract-ocr/tesseract/releases
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr tesseract-ocr-kor

# 클라이언트 시작
python autus_bridge_ultimate.py
```

---

## 🐳 Docker 배포

### Docker Compose (권장)

```bash
# Ultimate 버전 실행
docker compose -f docker-compose.ultimate.yml up -d

# 로그 확인
docker compose -f docker-compose.ultimate.yml logs -f
```

### Dockerfile 단독 실행

```bash
# 이미지 빌드
docker build -f Dockerfile.ultimate -t autus-ultimate .

# 컨테이너 실행
docker run -d -p 8000:8000 --name autus autus-ultimate
```

---

## 🚂 Railway 배포

1. **Railway 프로젝트 생성**
   ```bash
   railway login
   railway init
   ```

2. **설정 파일 사용**
   ```bash
   cp railway.ultimate.toml railway.toml
   ```

3. **배포**
   ```bash
   railway up
   ```

4. **환경 변수 설정** (Railway 대시보드)
   - `SECRET_KEY`: 보안 키
   - `ENVIRONMENT`: production
   - `UPDATE_URL`: 클라이언트 다운로드 URL

---

## 📦 클라이언트 EXE 빌드

```bash
cd client

# 빌드
python build_ultimate.py

# 결과: dist/AUTUS_Bridge_Ultimate.exe

# 캐시 정리
python build_ultimate.py --clean
```

---

## 🔌 API 엔드포인트

### 핵심 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/` | GET | 서버 정보 |
| `/health` | GET | 헬스체크 |
| `/ingest` | POST | OCR 데이터 수신 |
| `/dashboard` | GET | God Mode 대시보드 |
| `/version/check` | GET | 클라이언트 버전 확인 |

### Observer API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/observer/status` | GET | 옵저버 상태 |
| `/api/v1/observer/logs` | GET | 최근 로그 |
| `/api/v1/observer/stats` | GET | 통계 |

### 고객 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/customers` | GET | 고객 목록 |
| `/api/v1/customers/{phone}` | GET | 고객 상세 |
| `/api/v1/customers/{phone}` | PUT | 고객 정보 수정 |

### 스테이션 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/stations` | GET | 스테이션 목록 |

---

## ⚙️ 환경 변수

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 8000 | 서버 포트 |
| `ENVIRONMENT` | development | 환경 (development/production) |
| `SECRET_KEY` | autus-ultimate-secret | 보안 키 |
| `UPDATE_URL` | - | 클라이언트 업데이트 URL |

### 클라이언트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AUTUS_SERVER_URL` | http://localhost:8000 | 서버 URL |
| `AUTUS_STATION_ID` | TEST_PC_01 | 스테이션 ID |
| `AUTUS_BIZ_TYPE` | RESTAURANT | 업장 유형 |

---

## 🎮 게이미피케이션 시스템

### 날씨별 미션

| 날씨 | 미션 예시 | 보상 |
|------|----------|------|
| ☀️ Sunny | VIP 고객 3명 특별 인사 | 커피 쿠폰 |
| 🌧️ Rainy | 우산 없는 고객에게 비닐우산 제공 | +20P |
| ⛅ Cloudy | 따뜻한 음료 추천 | +15P |
| ❄️ Cold | 핫초코/따뜻한 물 제공 | 상품권 |

---

## 🔔 알림 시스템

### VIP 알림 (👑)
- **조건**: VIP/VVIP 키워드, 100만원 이상 금액
- **사운드**: 상승 멜로디 (C-E-G)
- **토스트**: 금색 배경

### 주의 알림 (⚠️)
- **조건**: 환불/불만/컴플레인 키워드
- **사운드**: 경고음 (3회 비프)
- **토스트**: 빨간 배경

---

## 📊 대시보드 기능

### 실시간 모니터링
- 5초마다 자동 새로고침
- 스테이션별 ONLINE/OFFLINE 상태
- 30초 이상 응답 없으면 OFFLINE 처리

### 통계
- 총 조회 수
- VIP 감지 수
- 주의 감지 수
- 활성 스테이션 수

### 알림 피드
- 최근 10개 알림 표시
- VIP/주의 고객 실시간 알림

---

## 🛠️ 트러블슈팅

### Tesseract 인식 오류
```bash
# 한글 언어 데이터 설치
# Windows: Tesseract 설치 시 추가 언어 선택
# macOS: brew install tesseract-lang
# Linux: sudo apt install tesseract-ocr-kor
```

### 서버 연결 실패
1. 서버가 실행 중인지 확인
2. 방화벽/포트 설정 확인
3. 서버 URL 확인 (http:// 포함)

### 화면 캡처 안됨
1. pyautogui 설치 확인
2. 화면 좌표 설정 재실행
3. 관리자 권한으로 실행 (Windows)

---

## 📝 버전 기록

### v3.2.0 (2024-12)
- ✨ God Mode 대시보드 추가
- ✨ 게이미피케이션 엔진 추가
- ✨ 자동 업데이트 시스템
- 🎨 다크 테마 UI
- 🔔 VIP/주의 알림 사운드

### v3.1.0
- Observer API 기본 구현
- VIP/주의 감지 로직

### v3.0.0
- 초기 릴리스
- OCR 기반 화면 캡처

---

## 📜 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 환영합니다!

"모든 것은 숫자이며, 답은 인적 구조 조정이다." 🏛️









# AUTUS TRINITY Ultimate Edition v3.2

> 10개 사업장 통합 제국 운영체제

## 🌟 주요 기능

### 서버 (main_ultimate.py)
- ✅ **OCR 데이터 수집** - Observer API를 통한 화면 데이터 수신
- ✅ **God Mode 대시보드** - 10개 매장 실시간 관제
- ✅ **자동 업데이트** - 클라이언트 버전 관리 및 원격 업데이트
- ✅ **게이미피케이션** - 날씨 기반 일일 미션 시스템
- ✅ **VIP/주의 감지** - 키워드 및 금액 기반 자동 분류

### 클라이언트 (autus_bridge_ultimate.py)
- ✅ **OCR 화면 캡처** - Tesseract 기반 텍스트 추출
- ✅ **다크 테마 UI** - 현대적인 다크 모드 인터페이스
- ✅ **알림 시스템** - VIP/주의 고객 사운드 + 토스트 알림
- ✅ **자동 업데이트** - 서버에서 새 버전 자동 확인 및 설치
- ✅ **게이미피케이션** - 일일 미션 및 보상 표시

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 의존성 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main_ultimate.py
```

**접속 주소:**
- 대시보드: http://localhost:8000/dashboard
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 2. 클라이언트 실행

```bash
# 의존성 설치
cd client
pip install -r requirements.txt

# Tesseract OCR 설치 필요!
# Windows: https://github.com/tesseract-ocr/tesseract/releases
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr tesseract-ocr-kor

# 클라이언트 시작
python autus_bridge_ultimate.py
```

---

## 🐳 Docker 배포

### Docker Compose (권장)

```bash
# Ultimate 버전 실행
docker compose -f docker-compose.ultimate.yml up -d

# 로그 확인
docker compose -f docker-compose.ultimate.yml logs -f
```

### Dockerfile 단독 실행

```bash
# 이미지 빌드
docker build -f Dockerfile.ultimate -t autus-ultimate .

# 컨테이너 실행
docker run -d -p 8000:8000 --name autus autus-ultimate
```

---

## 🚂 Railway 배포

1. **Railway 프로젝트 생성**
   ```bash
   railway login
   railway init
   ```

2. **설정 파일 사용**
   ```bash
   cp railway.ultimate.toml railway.toml
   ```

3. **배포**
   ```bash
   railway up
   ```

4. **환경 변수 설정** (Railway 대시보드)
   - `SECRET_KEY`: 보안 키
   - `ENVIRONMENT`: production
   - `UPDATE_URL`: 클라이언트 다운로드 URL

---

## 📦 클라이언트 EXE 빌드

```bash
cd client

# 빌드
python build_ultimate.py

# 결과: dist/AUTUS_Bridge_Ultimate.exe

# 캐시 정리
python build_ultimate.py --clean
```

---

## 🔌 API 엔드포인트

### 핵심 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/` | GET | 서버 정보 |
| `/health` | GET | 헬스체크 |
| `/ingest` | POST | OCR 데이터 수신 |
| `/dashboard` | GET | God Mode 대시보드 |
| `/version/check` | GET | 클라이언트 버전 확인 |

### Observer API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/observer/status` | GET | 옵저버 상태 |
| `/api/v1/observer/logs` | GET | 최근 로그 |
| `/api/v1/observer/stats` | GET | 통계 |

### 고객 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/customers` | GET | 고객 목록 |
| `/api/v1/customers/{phone}` | GET | 고객 상세 |
| `/api/v1/customers/{phone}` | PUT | 고객 정보 수정 |

### 스테이션 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/stations` | GET | 스테이션 목록 |

---

## ⚙️ 환경 변수

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 8000 | 서버 포트 |
| `ENVIRONMENT` | development | 환경 (development/production) |
| `SECRET_KEY` | autus-ultimate-secret | 보안 키 |
| `UPDATE_URL` | - | 클라이언트 업데이트 URL |

### 클라이언트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AUTUS_SERVER_URL` | http://localhost:8000 | 서버 URL |
| `AUTUS_STATION_ID` | TEST_PC_01 | 스테이션 ID |
| `AUTUS_BIZ_TYPE` | RESTAURANT | 업장 유형 |

---

## 🎮 게이미피케이션 시스템

### 날씨별 미션

| 날씨 | 미션 예시 | 보상 |
|------|----------|------|
| ☀️ Sunny | VIP 고객 3명 특별 인사 | 커피 쿠폰 |
| 🌧️ Rainy | 우산 없는 고객에게 비닐우산 제공 | +20P |
| ⛅ Cloudy | 따뜻한 음료 추천 | +15P |
| ❄️ Cold | 핫초코/따뜻한 물 제공 | 상품권 |

---

## 🔔 알림 시스템

### VIP 알림 (👑)
- **조건**: VIP/VVIP 키워드, 100만원 이상 금액
- **사운드**: 상승 멜로디 (C-E-G)
- **토스트**: 금색 배경

### 주의 알림 (⚠️)
- **조건**: 환불/불만/컴플레인 키워드
- **사운드**: 경고음 (3회 비프)
- **토스트**: 빨간 배경

---

## 📊 대시보드 기능

### 실시간 모니터링
- 5초마다 자동 새로고침
- 스테이션별 ONLINE/OFFLINE 상태
- 30초 이상 응답 없으면 OFFLINE 처리

### 통계
- 총 조회 수
- VIP 감지 수
- 주의 감지 수
- 활성 스테이션 수

### 알림 피드
- 최근 10개 알림 표시
- VIP/주의 고객 실시간 알림

---

## 🛠️ 트러블슈팅

### Tesseract 인식 오류
```bash
# 한글 언어 데이터 설치
# Windows: Tesseract 설치 시 추가 언어 선택
# macOS: brew install tesseract-lang
# Linux: sudo apt install tesseract-ocr-kor
```

### 서버 연결 실패
1. 서버가 실행 중인지 확인
2. 방화벽/포트 설정 확인
3. 서버 URL 확인 (http:// 포함)

### 화면 캡처 안됨
1. pyautogui 설치 확인
2. 화면 좌표 설정 재실행
3. 관리자 권한으로 실행 (Windows)

---

## 📝 버전 기록

### v3.2.0 (2024-12)
- ✨ God Mode 대시보드 추가
- ✨ 게이미피케이션 엔진 추가
- ✨ 자동 업데이트 시스템
- 🎨 다크 테마 UI
- 🔔 VIP/주의 알림 사운드

### v3.1.0
- Observer API 기본 구현
- VIP/주의 감지 로직

### v3.0.0
- 초기 릴리스
- OCR 기반 화면 캡처

---

## 📜 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 환영합니다!

"모든 것은 숫자이며, 답은 인적 구조 조정이다." 🏛️









# AUTUS TRINITY Ultimate Edition v3.2

> 10개 사업장 통합 제국 운영체제

## 🌟 주요 기능

### 서버 (main_ultimate.py)
- ✅ **OCR 데이터 수집** - Observer API를 통한 화면 데이터 수신
- ✅ **God Mode 대시보드** - 10개 매장 실시간 관제
- ✅ **자동 업데이트** - 클라이언트 버전 관리 및 원격 업데이트
- ✅ **게이미피케이션** - 날씨 기반 일일 미션 시스템
- ✅ **VIP/주의 감지** - 키워드 및 금액 기반 자동 분류

### 클라이언트 (autus_bridge_ultimate.py)
- ✅ **OCR 화면 캡처** - Tesseract 기반 텍스트 추출
- ✅ **다크 테마 UI** - 현대적인 다크 모드 인터페이스
- ✅ **알림 시스템** - VIP/주의 고객 사운드 + 토스트 알림
- ✅ **자동 업데이트** - 서버에서 새 버전 자동 확인 및 설치
- ✅ **게이미피케이션** - 일일 미션 및 보상 표시

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 의존성 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main_ultimate.py
```

**접속 주소:**
- 대시보드: http://localhost:8000/dashboard
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 2. 클라이언트 실행

```bash
# 의존성 설치
cd client
pip install -r requirements.txt

# Tesseract OCR 설치 필요!
# Windows: https://github.com/tesseract-ocr/tesseract/releases
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr tesseract-ocr-kor

# 클라이언트 시작
python autus_bridge_ultimate.py
```

---

## 🐳 Docker 배포

### Docker Compose (권장)

```bash
# Ultimate 버전 실행
docker compose -f docker-compose.ultimate.yml up -d

# 로그 확인
docker compose -f docker-compose.ultimate.yml logs -f
```

### Dockerfile 단독 실행

```bash
# 이미지 빌드
docker build -f Dockerfile.ultimate -t autus-ultimate .

# 컨테이너 실행
docker run -d -p 8000:8000 --name autus autus-ultimate
```

---

## 🚂 Railway 배포

1. **Railway 프로젝트 생성**
   ```bash
   railway login
   railway init
   ```

2. **설정 파일 사용**
   ```bash
   cp railway.ultimate.toml railway.toml
   ```

3. **배포**
   ```bash
   railway up
   ```

4. **환경 변수 설정** (Railway 대시보드)
   - `SECRET_KEY`: 보안 키
   - `ENVIRONMENT`: production
   - `UPDATE_URL`: 클라이언트 다운로드 URL

---

## 📦 클라이언트 EXE 빌드

```bash
cd client

# 빌드
python build_ultimate.py

# 결과: dist/AUTUS_Bridge_Ultimate.exe

# 캐시 정리
python build_ultimate.py --clean
```

---

## 🔌 API 엔드포인트

### 핵심 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/` | GET | 서버 정보 |
| `/health` | GET | 헬스체크 |
| `/ingest` | POST | OCR 데이터 수신 |
| `/dashboard` | GET | God Mode 대시보드 |
| `/version/check` | GET | 클라이언트 버전 확인 |

### Observer API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/observer/status` | GET | 옵저버 상태 |
| `/api/v1/observer/logs` | GET | 최근 로그 |
| `/api/v1/observer/stats` | GET | 통계 |

### 고객 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/customers` | GET | 고객 목록 |
| `/api/v1/customers/{phone}` | GET | 고객 상세 |
| `/api/v1/customers/{phone}` | PUT | 고객 정보 수정 |

### 스테이션 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/stations` | GET | 스테이션 목록 |

---

## ⚙️ 환경 변수

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 8000 | 서버 포트 |
| `ENVIRONMENT` | development | 환경 (development/production) |
| `SECRET_KEY` | autus-ultimate-secret | 보안 키 |
| `UPDATE_URL` | - | 클라이언트 업데이트 URL |

### 클라이언트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AUTUS_SERVER_URL` | http://localhost:8000 | 서버 URL |
| `AUTUS_STATION_ID` | TEST_PC_01 | 스테이션 ID |
| `AUTUS_BIZ_TYPE` | RESTAURANT | 업장 유형 |

---

## 🎮 게이미피케이션 시스템

### 날씨별 미션

| 날씨 | 미션 예시 | 보상 |
|------|----------|------|
| ☀️ Sunny | VIP 고객 3명 특별 인사 | 커피 쿠폰 |
| 🌧️ Rainy | 우산 없는 고객에게 비닐우산 제공 | +20P |
| ⛅ Cloudy | 따뜻한 음료 추천 | +15P |
| ❄️ Cold | 핫초코/따뜻한 물 제공 | 상품권 |

---

## 🔔 알림 시스템

### VIP 알림 (👑)
- **조건**: VIP/VVIP 키워드, 100만원 이상 금액
- **사운드**: 상승 멜로디 (C-E-G)
- **토스트**: 금색 배경

### 주의 알림 (⚠️)
- **조건**: 환불/불만/컴플레인 키워드
- **사운드**: 경고음 (3회 비프)
- **토스트**: 빨간 배경

---

## 📊 대시보드 기능

### 실시간 모니터링
- 5초마다 자동 새로고침
- 스테이션별 ONLINE/OFFLINE 상태
- 30초 이상 응답 없으면 OFFLINE 처리

### 통계
- 총 조회 수
- VIP 감지 수
- 주의 감지 수
- 활성 스테이션 수

### 알림 피드
- 최근 10개 알림 표시
- VIP/주의 고객 실시간 알림

---

## 🛠️ 트러블슈팅

### Tesseract 인식 오류
```bash
# 한글 언어 데이터 설치
# Windows: Tesseract 설치 시 추가 언어 선택
# macOS: brew install tesseract-lang
# Linux: sudo apt install tesseract-ocr-kor
```

### 서버 연결 실패
1. 서버가 실행 중인지 확인
2. 방화벽/포트 설정 확인
3. 서버 URL 확인 (http:// 포함)

### 화면 캡처 안됨
1. pyautogui 설치 확인
2. 화면 좌표 설정 재실행
3. 관리자 권한으로 실행 (Windows)

---

## 📝 버전 기록

### v3.2.0 (2024-12)
- ✨ God Mode 대시보드 추가
- ✨ 게이미피케이션 엔진 추가
- ✨ 자동 업데이트 시스템
- 🎨 다크 테마 UI
- 🔔 VIP/주의 알림 사운드

### v3.1.0
- Observer API 기본 구현
- VIP/주의 감지 로직

### v3.0.0
- 초기 릴리스
- OCR 기반 화면 캡처

---

## 📜 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 환영합니다!

"모든 것은 숫자이며, 답은 인적 구조 조정이다." 🏛️









# AUTUS TRINITY Ultimate Edition v3.2

> 10개 사업장 통합 제국 운영체제

## 🌟 주요 기능

### 서버 (main_ultimate.py)
- ✅ **OCR 데이터 수집** - Observer API를 통한 화면 데이터 수신
- ✅ **God Mode 대시보드** - 10개 매장 실시간 관제
- ✅ **자동 업데이트** - 클라이언트 버전 관리 및 원격 업데이트
- ✅ **게이미피케이션** - 날씨 기반 일일 미션 시스템
- ✅ **VIP/주의 감지** - 키워드 및 금액 기반 자동 분류

### 클라이언트 (autus_bridge_ultimate.py)
- ✅ **OCR 화면 캡처** - Tesseract 기반 텍스트 추출
- ✅ **다크 테마 UI** - 현대적인 다크 모드 인터페이스
- ✅ **알림 시스템** - VIP/주의 고객 사운드 + 토스트 알림
- ✅ **자동 업데이트** - 서버에서 새 버전 자동 확인 및 설치
- ✅ **게이미피케이션** - 일일 미션 및 보상 표시

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 의존성 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main_ultimate.py
```

**접속 주소:**
- 대시보드: http://localhost:8000/dashboard
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 2. 클라이언트 실행

```bash
# 의존성 설치
cd client
pip install -r requirements.txt

# Tesseract OCR 설치 필요!
# Windows: https://github.com/tesseract-ocr/tesseract/releases
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr tesseract-ocr-kor

# 클라이언트 시작
python autus_bridge_ultimate.py
```

---

## 🐳 Docker 배포

### Docker Compose (권장)

```bash
# Ultimate 버전 실행
docker compose -f docker-compose.ultimate.yml up -d

# 로그 확인
docker compose -f docker-compose.ultimate.yml logs -f
```

### Dockerfile 단독 실행

```bash
# 이미지 빌드
docker build -f Dockerfile.ultimate -t autus-ultimate .

# 컨테이너 실행
docker run -d -p 8000:8000 --name autus autus-ultimate
```

---

## 🚂 Railway 배포

1. **Railway 프로젝트 생성**
   ```bash
   railway login
   railway init
   ```

2. **설정 파일 사용**
   ```bash
   cp railway.ultimate.toml railway.toml
   ```

3. **배포**
   ```bash
   railway up
   ```

4. **환경 변수 설정** (Railway 대시보드)
   - `SECRET_KEY`: 보안 키
   - `ENVIRONMENT`: production
   - `UPDATE_URL`: 클라이언트 다운로드 URL

---

## 📦 클라이언트 EXE 빌드

```bash
cd client

# 빌드
python build_ultimate.py

# 결과: dist/AUTUS_Bridge_Ultimate.exe

# 캐시 정리
python build_ultimate.py --clean
```

---

## 🔌 API 엔드포인트

### 핵심 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/` | GET | 서버 정보 |
| `/health` | GET | 헬스체크 |
| `/ingest` | POST | OCR 데이터 수신 |
| `/dashboard` | GET | God Mode 대시보드 |
| `/version/check` | GET | 클라이언트 버전 확인 |

### Observer API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/observer/status` | GET | 옵저버 상태 |
| `/api/v1/observer/logs` | GET | 최근 로그 |
| `/api/v1/observer/stats` | GET | 통계 |

### 고객 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/customers` | GET | 고객 목록 |
| `/api/v1/customers/{phone}` | GET | 고객 상세 |
| `/api/v1/customers/{phone}` | PUT | 고객 정보 수정 |

### 스테이션 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/stations` | GET | 스테이션 목록 |

---

## ⚙️ 환경 변수

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 8000 | 서버 포트 |
| `ENVIRONMENT` | development | 환경 (development/production) |
| `SECRET_KEY` | autus-ultimate-secret | 보안 키 |
| `UPDATE_URL` | - | 클라이언트 업데이트 URL |

### 클라이언트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AUTUS_SERVER_URL` | http://localhost:8000 | 서버 URL |
| `AUTUS_STATION_ID` | TEST_PC_01 | 스테이션 ID |
| `AUTUS_BIZ_TYPE` | RESTAURANT | 업장 유형 |

---

## 🎮 게이미피케이션 시스템

### 날씨별 미션

| 날씨 | 미션 예시 | 보상 |
|------|----------|------|
| ☀️ Sunny | VIP 고객 3명 특별 인사 | 커피 쿠폰 |
| 🌧️ Rainy | 우산 없는 고객에게 비닐우산 제공 | +20P |
| ⛅ Cloudy | 따뜻한 음료 추천 | +15P |
| ❄️ Cold | 핫초코/따뜻한 물 제공 | 상품권 |

---

## 🔔 알림 시스템

### VIP 알림 (👑)
- **조건**: VIP/VVIP 키워드, 100만원 이상 금액
- **사운드**: 상승 멜로디 (C-E-G)
- **토스트**: 금색 배경

### 주의 알림 (⚠️)
- **조건**: 환불/불만/컴플레인 키워드
- **사운드**: 경고음 (3회 비프)
- **토스트**: 빨간 배경

---

## 📊 대시보드 기능

### 실시간 모니터링
- 5초마다 자동 새로고침
- 스테이션별 ONLINE/OFFLINE 상태
- 30초 이상 응답 없으면 OFFLINE 처리

### 통계
- 총 조회 수
- VIP 감지 수
- 주의 감지 수
- 활성 스테이션 수

### 알림 피드
- 최근 10개 알림 표시
- VIP/주의 고객 실시간 알림

---

## 🛠️ 트러블슈팅

### Tesseract 인식 오류
```bash
# 한글 언어 데이터 설치
# Windows: Tesseract 설치 시 추가 언어 선택
# macOS: brew install tesseract-lang
# Linux: sudo apt install tesseract-ocr-kor
```

### 서버 연결 실패
1. 서버가 실행 중인지 확인
2. 방화벽/포트 설정 확인
3. 서버 URL 확인 (http:// 포함)

### 화면 캡처 안됨
1. pyautogui 설치 확인
2. 화면 좌표 설정 재실행
3. 관리자 권한으로 실행 (Windows)

---

## 📝 버전 기록

### v3.2.0 (2024-12)
- ✨ God Mode 대시보드 추가
- ✨ 게이미피케이션 엔진 추가
- ✨ 자동 업데이트 시스템
- 🎨 다크 테마 UI
- 🔔 VIP/주의 알림 사운드

### v3.1.0
- Observer API 기본 구현
- VIP/주의 감지 로직

### v3.0.0
- 초기 릴리스
- OCR 기반 화면 캡처

---

## 📜 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 환영합니다!

"모든 것은 숫자이며, 답은 인적 구조 조정이다." 🏛️









# AUTUS TRINITY Ultimate Edition v3.2

> 10개 사업장 통합 제국 운영체제

## 🌟 주요 기능

### 서버 (main_ultimate.py)
- ✅ **OCR 데이터 수집** - Observer API를 통한 화면 데이터 수신
- ✅ **God Mode 대시보드** - 10개 매장 실시간 관제
- ✅ **자동 업데이트** - 클라이언트 버전 관리 및 원격 업데이트
- ✅ **게이미피케이션** - 날씨 기반 일일 미션 시스템
- ✅ **VIP/주의 감지** - 키워드 및 금액 기반 자동 분류

### 클라이언트 (autus_bridge_ultimate.py)
- ✅ **OCR 화면 캡처** - Tesseract 기반 텍스트 추출
- ✅ **다크 테마 UI** - 현대적인 다크 모드 인터페이스
- ✅ **알림 시스템** - VIP/주의 고객 사운드 + 토스트 알림
- ✅ **자동 업데이트** - 서버에서 새 버전 자동 확인 및 설치
- ✅ **게이미피케이션** - 일일 미션 및 보상 표시

---

## 🚀 빠른 시작

### 1. 서버 실행

```bash
# 의존성 설치
cd backend
pip install -r requirements.txt

# 서버 시작
python main_ultimate.py
```

**접속 주소:**
- 대시보드: http://localhost:8000/dashboard
- API 문서: http://localhost:8000/docs
- 헬스체크: http://localhost:8000/health

### 2. 클라이언트 실행

```bash
# 의존성 설치
cd client
pip install -r requirements.txt

# Tesseract OCR 설치 필요!
# Windows: https://github.com/tesseract-ocr/tesseract/releases
# macOS: brew install tesseract
# Linux: sudo apt install tesseract-ocr tesseract-ocr-kor

# 클라이언트 시작
python autus_bridge_ultimate.py
```

---

## 🐳 Docker 배포

### Docker Compose (권장)

```bash
# Ultimate 버전 실행
docker compose -f docker-compose.ultimate.yml up -d

# 로그 확인
docker compose -f docker-compose.ultimate.yml logs -f
```

### Dockerfile 단독 실행

```bash
# 이미지 빌드
docker build -f Dockerfile.ultimate -t autus-ultimate .

# 컨테이너 실행
docker run -d -p 8000:8000 --name autus autus-ultimate
```

---

## 🚂 Railway 배포

1. **Railway 프로젝트 생성**
   ```bash
   railway login
   railway init
   ```

2. **설정 파일 사용**
   ```bash
   cp railway.ultimate.toml railway.toml
   ```

3. **배포**
   ```bash
   railway up
   ```

4. **환경 변수 설정** (Railway 대시보드)
   - `SECRET_KEY`: 보안 키
   - `ENVIRONMENT`: production
   - `UPDATE_URL`: 클라이언트 다운로드 URL

---

## 📦 클라이언트 EXE 빌드

```bash
cd client

# 빌드
python build_ultimate.py

# 결과: dist/AUTUS_Bridge_Ultimate.exe

# 캐시 정리
python build_ultimate.py --clean
```

---

## 🔌 API 엔드포인트

### 핵심 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/` | GET | 서버 정보 |
| `/health` | GET | 헬스체크 |
| `/ingest` | POST | OCR 데이터 수신 |
| `/dashboard` | GET | God Mode 대시보드 |
| `/version/check` | GET | 클라이언트 버전 확인 |

### Observer API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/observer/status` | GET | 옵저버 상태 |
| `/api/v1/observer/logs` | GET | 최근 로그 |
| `/api/v1/observer/stats` | GET | 통계 |

### 고객 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/customers` | GET | 고객 목록 |
| `/api/v1/customers/{phone}` | GET | 고객 상세 |
| `/api/v1/customers/{phone}` | PUT | 고객 정보 수정 |

### 스테이션 API

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/v1/stations` | GET | 스테이션 목록 |

---

## ⚙️ 환경 변수

### 서버

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | 8000 | 서버 포트 |
| `ENVIRONMENT` | development | 환경 (development/production) |
| `SECRET_KEY` | autus-ultimate-secret | 보안 키 |
| `UPDATE_URL` | - | 클라이언트 업데이트 URL |

### 클라이언트

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `AUTUS_SERVER_URL` | http://localhost:8000 | 서버 URL |
| `AUTUS_STATION_ID` | TEST_PC_01 | 스테이션 ID |
| `AUTUS_BIZ_TYPE` | RESTAURANT | 업장 유형 |

---

## 🎮 게이미피케이션 시스템

### 날씨별 미션

| 날씨 | 미션 예시 | 보상 |
|------|----------|------|
| ☀️ Sunny | VIP 고객 3명 특별 인사 | 커피 쿠폰 |
| 🌧️ Rainy | 우산 없는 고객에게 비닐우산 제공 | +20P |
| ⛅ Cloudy | 따뜻한 음료 추천 | +15P |
| ❄️ Cold | 핫초코/따뜻한 물 제공 | 상품권 |

---

## 🔔 알림 시스템

### VIP 알림 (👑)
- **조건**: VIP/VVIP 키워드, 100만원 이상 금액
- **사운드**: 상승 멜로디 (C-E-G)
- **토스트**: 금색 배경

### 주의 알림 (⚠️)
- **조건**: 환불/불만/컴플레인 키워드
- **사운드**: 경고음 (3회 비프)
- **토스트**: 빨간 배경

---

## 📊 대시보드 기능

### 실시간 모니터링
- 5초마다 자동 새로고침
- 스테이션별 ONLINE/OFFLINE 상태
- 30초 이상 응답 없으면 OFFLINE 처리

### 통계
- 총 조회 수
- VIP 감지 수
- 주의 감지 수
- 활성 스테이션 수

### 알림 피드
- 최근 10개 알림 표시
- VIP/주의 고객 실시간 알림

---

## 🛠️ 트러블슈팅

### Tesseract 인식 오류
```bash
# 한글 언어 데이터 설치
# Windows: Tesseract 설치 시 추가 언어 선택
# macOS: brew install tesseract-lang
# Linux: sudo apt install tesseract-ocr-kor
```

### 서버 연결 실패
1. 서버가 실행 중인지 확인
2. 방화벽/포트 설정 확인
3. 서버 URL 확인 (http:// 포함)

### 화면 캡처 안됨
1. pyautogui 설치 확인
2. 화면 좌표 설정 재실행
3. 관리자 권한으로 실행 (Windows)

---

## 📝 버전 기록

### v3.2.0 (2024-12)
- ✨ God Mode 대시보드 추가
- ✨ 게이미피케이션 엔진 추가
- ✨ 자동 업데이트 시스템
- 🎨 다크 테마 UI
- 🔔 VIP/주의 알림 사운드

### v3.1.0
- Observer API 기본 구현
- VIP/주의 감지 로직

### v3.0.0
- 초기 릴리스
- OCR 기반 화면 캡처

---

## 📜 라이선스

MIT License

---

## 🙏 기여

버그 리포트, 기능 제안, PR 환영합니다!

"모든 것은 숫자이며, 답은 인적 구조 조정이다." 🏛️
























