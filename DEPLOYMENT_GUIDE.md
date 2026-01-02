# 🚀 AUTUS-PRIME 배포 & 테스트 가이드

## 📋 목차

1. [환경 설정](#1-환경-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Railway 배포 (백엔드)](#3-railway-배포-백엔드)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Dogfooding 테스트](#6-dogfooding-테스트)

---

## 1. 환경 설정

### 필수 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
AUTUS_MASTER_KEY=your-super-secret-master-key
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENV=production

# Frontend (.env)
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 정보 입력:
   - Name: `autus-prime`
   - Database Password: (안전한 비밀번호 생성)
   - Region: `Northeast Asia (Seoul)` 권장

### 2.2 연결 문자열 복사

1. Settings → Database
2. Connection string → URI 복사
3. `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### 2.3 무료 티어 제한

| 항목 | 제한 |
|-----|------|
| 저장소 | 500MB |
| 행 수 | 50,000 |
| API 요청 | 무제한 |
| 월 대역폭 | 2GB |

**학원 10곳(학생 1,000명) 충분히 커버!**

---

## 3. Railway 배포 (백엔드)

### 3.1 Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd backend
railway init

# 배포
railway up
```

### 3.2 환경 변수 설정

Railway Dashboard에서:
1. Variables 탭 클릭
2. 다음 변수 추가:

```
DATABASE_URL=postgresql://...  (Supabase 연결 문자열)
AUTUS_MASTER_KEY=your-master-key
JWT_SECRET=your-jwt-secret
ENV=production
```

### 3.3 도메인 설정

1. Settings → Domains
2. "Generate Domain" 클릭
3. 커스텀 도메인 연결 (선택)

---

## 4. Vercel 배포 (프론트엔드)

### 4.1 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

### 4.2 환경 변수 설정

Vercel Dashboard에서:
1. Settings → Environment Variables
2. 추가:

```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.3 빌드 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `AUTUS-PRIME`

### 5.2 OAuth 동의 화면

1. APIs & Services → OAuth consent screen
2. User Type: `External`
3. 앱 정보:
   - App name: `AUTUS-PRIME`
   - User support email: 본인 이메일
   - Authorized domains: `vercel.app`, `railway.app`

### 5.3 OAuth 클라이언트 ID 생성

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: `Web application`
4. 이름: `AUTUS-PRIME Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

### 5.4 API 활성화

1. APIs & Services → Library
2. 활성화할 API:
   - Google Calendar API
   - Google People API (Contacts)

---

## 6. Dogfooding 테스트

### 6.1 테스트용 엑셀 템플릿

아래 형식으로 엑셀 파일을 준비하세요:

| 이름 | 전화번호 | 학교 | 학년 | 수강료 | 입학점수 | 현재점수 | 상담횟수 | 학부모 |
|-----|---------|------|-----|--------|---------|---------|---------|-------|
| 김민수 | 010-1234-5678 | 서초중 | 중2 | 400000 | 70 | 85 | 1 | 김어머니 |
| 이영희 | 010-2345-6789 | 반포중 | 중3 | 350000 | 80 | 88 | 2 | 이어머니 |
| 박철수 | 010-3456-7890 | 서초고 | 고1 | 500000 | 65 | 75 | 0 | 박어머니 |
| 최진상 | 010-4567-8901 | 반포고 | 고2 | 200000 | 50 | 45 | 8 | 최어머니 |

### 6.2 테스트 시나리오

#### 시나리오 A: 데이터 업로드

1. 대시보드 접속
2. 엑셀 파일 드래그 앤 드롭
3. 확인:
   - 학생 목록 표시
   - SQ 점수 계산
   - 티어 분류 (Z-Score)

#### 시나리오 B: 히트맵 분석

1. Physis Map 확인
2. 우측 상단 (고수익, 저엔트로피) → 💎 VIP
3. 좌측 하단 (저수익, 고엔트로피) → ⚠️ 위험

#### 시나리오 C: 액션 실행

1. TierList에서 학생 선택
2. BOOST 또는 MSG 버튼 클릭
3. 확인:
   - 카카오톡 딥링크 동작 (모바일)
   - 클립보드 복사 (PC)

#### 시나리오 D: Google 동기화

1. Google 로그인
2. "Sync" 버튼 클릭
3. 캘린더에서 상담 일정 자동 추출

### 6.3 체크리스트

```
[ ] 엑셀 업로드 정상 작동
[ ] SQ 점수 계산 정확
[ ] Z-Score 티어 분류 정상
[ ] 히트맵 렌더링 정상
[ ] 액션 버튼 동작 확인
[ ] 모바일 반응형 확인
[ ] Google 로그인 동작
[ ] 경고 알림 표시
```

### 6.4 성능 기준

| 항목 | 목표 | 허용 범위 |
|-----|------|----------|
| 페이지 로드 | < 2초 | < 3초 |
| API 응답 | < 500ms | < 1초 |
| 엑셀 처리 (100명) | < 3초 | < 5초 |

---

## 🆘 트러블슈팅

### 문제: Railway 배포 실패

```bash
# 로그 확인
railway logs

# 일반적 원인: 환경 변수 누락
# 해결: DATABASE_URL 등 확인
```

### 문제: Supabase 연결 실패

```
# 원인: IP 차단
# 해결: Supabase Dashboard → Settings → Database → Connection Pooling 활성화
```

### 문제: Google OAuth 작동 안 함

```
# 원인: Authorized origins 누락
# 해결: Google Cloud Console에서 도메인 추가
```

### 문제: 카카오톡 딥링크 안 열림

```
# PC에서는 정상 동작 아님
# 해결: PC 환경 감지 → 클립보드 복사로 대체 (이미 구현됨)
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 등록
2. 로그 첨부 (Railway, Vercel)
3. 브라우저 콘솔 에러 캡처

---

**🎉 배포 완료 후, 실제 학원 데이터로 Dogfooding을 시작하세요!**










# 🚀 AUTUS-PRIME 배포 & 테스트 가이드

## 📋 목차

1. [환경 설정](#1-환경-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Railway 배포 (백엔드)](#3-railway-배포-백엔드)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Dogfooding 테스트](#6-dogfooding-테스트)

---

## 1. 환경 설정

### 필수 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
AUTUS_MASTER_KEY=your-super-secret-master-key
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENV=production

# Frontend (.env)
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 정보 입력:
   - Name: `autus-prime`
   - Database Password: (안전한 비밀번호 생성)
   - Region: `Northeast Asia (Seoul)` 권장

### 2.2 연결 문자열 복사

1. Settings → Database
2. Connection string → URI 복사
3. `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### 2.3 무료 티어 제한

| 항목 | 제한 |
|-----|------|
| 저장소 | 500MB |
| 행 수 | 50,000 |
| API 요청 | 무제한 |
| 월 대역폭 | 2GB |

**학원 10곳(학생 1,000명) 충분히 커버!**

---

## 3. Railway 배포 (백엔드)

### 3.1 Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd backend
railway init

# 배포
railway up
```

### 3.2 환경 변수 설정

Railway Dashboard에서:
1. Variables 탭 클릭
2. 다음 변수 추가:

```
DATABASE_URL=postgresql://...  (Supabase 연결 문자열)
AUTUS_MASTER_KEY=your-master-key
JWT_SECRET=your-jwt-secret
ENV=production
```

### 3.3 도메인 설정

1. Settings → Domains
2. "Generate Domain" 클릭
3. 커스텀 도메인 연결 (선택)

---

## 4. Vercel 배포 (프론트엔드)

### 4.1 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

### 4.2 환경 변수 설정

Vercel Dashboard에서:
1. Settings → Environment Variables
2. 추가:

```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.3 빌드 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `AUTUS-PRIME`

### 5.2 OAuth 동의 화면

1. APIs & Services → OAuth consent screen
2. User Type: `External`
3. 앱 정보:
   - App name: `AUTUS-PRIME`
   - User support email: 본인 이메일
   - Authorized domains: `vercel.app`, `railway.app`

### 5.3 OAuth 클라이언트 ID 생성

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: `Web application`
4. 이름: `AUTUS-PRIME Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

### 5.4 API 활성화

1. APIs & Services → Library
2. 활성화할 API:
   - Google Calendar API
   - Google People API (Contacts)

---

## 6. Dogfooding 테스트

### 6.1 테스트용 엑셀 템플릿

아래 형식으로 엑셀 파일을 준비하세요:

| 이름 | 전화번호 | 학교 | 학년 | 수강료 | 입학점수 | 현재점수 | 상담횟수 | 학부모 |
|-----|---------|------|-----|--------|---------|---------|---------|-------|
| 김민수 | 010-1234-5678 | 서초중 | 중2 | 400000 | 70 | 85 | 1 | 김어머니 |
| 이영희 | 010-2345-6789 | 반포중 | 중3 | 350000 | 80 | 88 | 2 | 이어머니 |
| 박철수 | 010-3456-7890 | 서초고 | 고1 | 500000 | 65 | 75 | 0 | 박어머니 |
| 최진상 | 010-4567-8901 | 반포고 | 고2 | 200000 | 50 | 45 | 8 | 최어머니 |

### 6.2 테스트 시나리오

#### 시나리오 A: 데이터 업로드

1. 대시보드 접속
2. 엑셀 파일 드래그 앤 드롭
3. 확인:
   - 학생 목록 표시
   - SQ 점수 계산
   - 티어 분류 (Z-Score)

#### 시나리오 B: 히트맵 분석

1. Physis Map 확인
2. 우측 상단 (고수익, 저엔트로피) → 💎 VIP
3. 좌측 하단 (저수익, 고엔트로피) → ⚠️ 위험

#### 시나리오 C: 액션 실행

1. TierList에서 학생 선택
2. BOOST 또는 MSG 버튼 클릭
3. 확인:
   - 카카오톡 딥링크 동작 (모바일)
   - 클립보드 복사 (PC)

#### 시나리오 D: Google 동기화

1. Google 로그인
2. "Sync" 버튼 클릭
3. 캘린더에서 상담 일정 자동 추출

### 6.3 체크리스트

```
[ ] 엑셀 업로드 정상 작동
[ ] SQ 점수 계산 정확
[ ] Z-Score 티어 분류 정상
[ ] 히트맵 렌더링 정상
[ ] 액션 버튼 동작 확인
[ ] 모바일 반응형 확인
[ ] Google 로그인 동작
[ ] 경고 알림 표시
```

### 6.4 성능 기준

| 항목 | 목표 | 허용 범위 |
|-----|------|----------|
| 페이지 로드 | < 2초 | < 3초 |
| API 응답 | < 500ms | < 1초 |
| 엑셀 처리 (100명) | < 3초 | < 5초 |

---

## 🆘 트러블슈팅

### 문제: Railway 배포 실패

```bash
# 로그 확인
railway logs

# 일반적 원인: 환경 변수 누락
# 해결: DATABASE_URL 등 확인
```

### 문제: Supabase 연결 실패

```
# 원인: IP 차단
# 해결: Supabase Dashboard → Settings → Database → Connection Pooling 활성화
```

### 문제: Google OAuth 작동 안 함

```
# 원인: Authorized origins 누락
# 해결: Google Cloud Console에서 도메인 추가
```

### 문제: 카카오톡 딥링크 안 열림

```
# PC에서는 정상 동작 아님
# 해결: PC 환경 감지 → 클립보드 복사로 대체 (이미 구현됨)
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 등록
2. 로그 첨부 (Railway, Vercel)
3. 브라우저 콘솔 에러 캡처

---

**🎉 배포 완료 후, 실제 학원 데이터로 Dogfooding을 시작하세요!**










# 🚀 AUTUS-PRIME 배포 & 테스트 가이드

## 📋 목차

1. [환경 설정](#1-환경-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Railway 배포 (백엔드)](#3-railway-배포-백엔드)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Dogfooding 테스트](#6-dogfooding-테스트)

---

## 1. 환경 설정

### 필수 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
AUTUS_MASTER_KEY=your-super-secret-master-key
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENV=production

# Frontend (.env)
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 정보 입력:
   - Name: `autus-prime`
   - Database Password: (안전한 비밀번호 생성)
   - Region: `Northeast Asia (Seoul)` 권장

### 2.2 연결 문자열 복사

1. Settings → Database
2. Connection string → URI 복사
3. `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### 2.3 무료 티어 제한

| 항목 | 제한 |
|-----|------|
| 저장소 | 500MB |
| 행 수 | 50,000 |
| API 요청 | 무제한 |
| 월 대역폭 | 2GB |

**학원 10곳(학생 1,000명) 충분히 커버!**

---

## 3. Railway 배포 (백엔드)

### 3.1 Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd backend
railway init

# 배포
railway up
```

### 3.2 환경 변수 설정

Railway Dashboard에서:
1. Variables 탭 클릭
2. 다음 변수 추가:

```
DATABASE_URL=postgresql://...  (Supabase 연결 문자열)
AUTUS_MASTER_KEY=your-master-key
JWT_SECRET=your-jwt-secret
ENV=production
```

### 3.3 도메인 설정

1. Settings → Domains
2. "Generate Domain" 클릭
3. 커스텀 도메인 연결 (선택)

---

## 4. Vercel 배포 (프론트엔드)

### 4.1 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

### 4.2 환경 변수 설정

Vercel Dashboard에서:
1. Settings → Environment Variables
2. 추가:

```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.3 빌드 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `AUTUS-PRIME`

### 5.2 OAuth 동의 화면

1. APIs & Services → OAuth consent screen
2. User Type: `External`
3. 앱 정보:
   - App name: `AUTUS-PRIME`
   - User support email: 본인 이메일
   - Authorized domains: `vercel.app`, `railway.app`

### 5.3 OAuth 클라이언트 ID 생성

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: `Web application`
4. 이름: `AUTUS-PRIME Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

### 5.4 API 활성화

1. APIs & Services → Library
2. 활성화할 API:
   - Google Calendar API
   - Google People API (Contacts)

---

## 6. Dogfooding 테스트

### 6.1 테스트용 엑셀 템플릿

아래 형식으로 엑셀 파일을 준비하세요:

| 이름 | 전화번호 | 학교 | 학년 | 수강료 | 입학점수 | 현재점수 | 상담횟수 | 학부모 |
|-----|---------|------|-----|--------|---------|---------|---------|-------|
| 김민수 | 010-1234-5678 | 서초중 | 중2 | 400000 | 70 | 85 | 1 | 김어머니 |
| 이영희 | 010-2345-6789 | 반포중 | 중3 | 350000 | 80 | 88 | 2 | 이어머니 |
| 박철수 | 010-3456-7890 | 서초고 | 고1 | 500000 | 65 | 75 | 0 | 박어머니 |
| 최진상 | 010-4567-8901 | 반포고 | 고2 | 200000 | 50 | 45 | 8 | 최어머니 |

### 6.2 테스트 시나리오

#### 시나리오 A: 데이터 업로드

1. 대시보드 접속
2. 엑셀 파일 드래그 앤 드롭
3. 확인:
   - 학생 목록 표시
   - SQ 점수 계산
   - 티어 분류 (Z-Score)

#### 시나리오 B: 히트맵 분석

1. Physis Map 확인
2. 우측 상단 (고수익, 저엔트로피) → 💎 VIP
3. 좌측 하단 (저수익, 고엔트로피) → ⚠️ 위험

#### 시나리오 C: 액션 실행

1. TierList에서 학생 선택
2. BOOST 또는 MSG 버튼 클릭
3. 확인:
   - 카카오톡 딥링크 동작 (모바일)
   - 클립보드 복사 (PC)

#### 시나리오 D: Google 동기화

1. Google 로그인
2. "Sync" 버튼 클릭
3. 캘린더에서 상담 일정 자동 추출

### 6.3 체크리스트

```
[ ] 엑셀 업로드 정상 작동
[ ] SQ 점수 계산 정확
[ ] Z-Score 티어 분류 정상
[ ] 히트맵 렌더링 정상
[ ] 액션 버튼 동작 확인
[ ] 모바일 반응형 확인
[ ] Google 로그인 동작
[ ] 경고 알림 표시
```

### 6.4 성능 기준

| 항목 | 목표 | 허용 범위 |
|-----|------|----------|
| 페이지 로드 | < 2초 | < 3초 |
| API 응답 | < 500ms | < 1초 |
| 엑셀 처리 (100명) | < 3초 | < 5초 |

---

## 🆘 트러블슈팅

### 문제: Railway 배포 실패

```bash
# 로그 확인
railway logs

# 일반적 원인: 환경 변수 누락
# 해결: DATABASE_URL 등 확인
```

### 문제: Supabase 연결 실패

```
# 원인: IP 차단
# 해결: Supabase Dashboard → Settings → Database → Connection Pooling 활성화
```

### 문제: Google OAuth 작동 안 함

```
# 원인: Authorized origins 누락
# 해결: Google Cloud Console에서 도메인 추가
```

### 문제: 카카오톡 딥링크 안 열림

```
# PC에서는 정상 동작 아님
# 해결: PC 환경 감지 → 클립보드 복사로 대체 (이미 구현됨)
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 등록
2. 로그 첨부 (Railway, Vercel)
3. 브라우저 콘솔 에러 캡처

---

**🎉 배포 완료 후, 실제 학원 데이터로 Dogfooding을 시작하세요!**










# 🚀 AUTUS-PRIME 배포 & 테스트 가이드

## 📋 목차

1. [환경 설정](#1-환경-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Railway 배포 (백엔드)](#3-railway-배포-백엔드)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Dogfooding 테스트](#6-dogfooding-테스트)

---

## 1. 환경 설정

### 필수 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
AUTUS_MASTER_KEY=your-super-secret-master-key
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENV=production

# Frontend (.env)
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 정보 입력:
   - Name: `autus-prime`
   - Database Password: (안전한 비밀번호 생성)
   - Region: `Northeast Asia (Seoul)` 권장

### 2.2 연결 문자열 복사

1. Settings → Database
2. Connection string → URI 복사
3. `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### 2.3 무료 티어 제한

| 항목 | 제한 |
|-----|------|
| 저장소 | 500MB |
| 행 수 | 50,000 |
| API 요청 | 무제한 |
| 월 대역폭 | 2GB |

**학원 10곳(학생 1,000명) 충분히 커버!**

---

## 3. Railway 배포 (백엔드)

### 3.1 Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd backend
railway init

# 배포
railway up
```

### 3.2 환경 변수 설정

Railway Dashboard에서:
1. Variables 탭 클릭
2. 다음 변수 추가:

```
DATABASE_URL=postgresql://...  (Supabase 연결 문자열)
AUTUS_MASTER_KEY=your-master-key
JWT_SECRET=your-jwt-secret
ENV=production
```

### 3.3 도메인 설정

1. Settings → Domains
2. "Generate Domain" 클릭
3. 커스텀 도메인 연결 (선택)

---

## 4. Vercel 배포 (프론트엔드)

### 4.1 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

### 4.2 환경 변수 설정

Vercel Dashboard에서:
1. Settings → Environment Variables
2. 추가:

```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.3 빌드 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `AUTUS-PRIME`

### 5.2 OAuth 동의 화면

1. APIs & Services → OAuth consent screen
2. User Type: `External`
3. 앱 정보:
   - App name: `AUTUS-PRIME`
   - User support email: 본인 이메일
   - Authorized domains: `vercel.app`, `railway.app`

### 5.3 OAuth 클라이언트 ID 생성

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: `Web application`
4. 이름: `AUTUS-PRIME Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

### 5.4 API 활성화

1. APIs & Services → Library
2. 활성화할 API:
   - Google Calendar API
   - Google People API (Contacts)

---

## 6. Dogfooding 테스트

### 6.1 테스트용 엑셀 템플릿

아래 형식으로 엑셀 파일을 준비하세요:

| 이름 | 전화번호 | 학교 | 학년 | 수강료 | 입학점수 | 현재점수 | 상담횟수 | 학부모 |
|-----|---------|------|-----|--------|---------|---------|---------|-------|
| 김민수 | 010-1234-5678 | 서초중 | 중2 | 400000 | 70 | 85 | 1 | 김어머니 |
| 이영희 | 010-2345-6789 | 반포중 | 중3 | 350000 | 80 | 88 | 2 | 이어머니 |
| 박철수 | 010-3456-7890 | 서초고 | 고1 | 500000 | 65 | 75 | 0 | 박어머니 |
| 최진상 | 010-4567-8901 | 반포고 | 고2 | 200000 | 50 | 45 | 8 | 최어머니 |

### 6.2 테스트 시나리오

#### 시나리오 A: 데이터 업로드

1. 대시보드 접속
2. 엑셀 파일 드래그 앤 드롭
3. 확인:
   - 학생 목록 표시
   - SQ 점수 계산
   - 티어 분류 (Z-Score)

#### 시나리오 B: 히트맵 분석

1. Physis Map 확인
2. 우측 상단 (고수익, 저엔트로피) → 💎 VIP
3. 좌측 하단 (저수익, 고엔트로피) → ⚠️ 위험

#### 시나리오 C: 액션 실행

1. TierList에서 학생 선택
2. BOOST 또는 MSG 버튼 클릭
3. 확인:
   - 카카오톡 딥링크 동작 (모바일)
   - 클립보드 복사 (PC)

#### 시나리오 D: Google 동기화

1. Google 로그인
2. "Sync" 버튼 클릭
3. 캘린더에서 상담 일정 자동 추출

### 6.3 체크리스트

```
[ ] 엑셀 업로드 정상 작동
[ ] SQ 점수 계산 정확
[ ] Z-Score 티어 분류 정상
[ ] 히트맵 렌더링 정상
[ ] 액션 버튼 동작 확인
[ ] 모바일 반응형 확인
[ ] Google 로그인 동작
[ ] 경고 알림 표시
```

### 6.4 성능 기준

| 항목 | 목표 | 허용 범위 |
|-----|------|----------|
| 페이지 로드 | < 2초 | < 3초 |
| API 응답 | < 500ms | < 1초 |
| 엑셀 처리 (100명) | < 3초 | < 5초 |

---

## 🆘 트러블슈팅

### 문제: Railway 배포 실패

```bash
# 로그 확인
railway logs

# 일반적 원인: 환경 변수 누락
# 해결: DATABASE_URL 등 확인
```

### 문제: Supabase 연결 실패

```
# 원인: IP 차단
# 해결: Supabase Dashboard → Settings → Database → Connection Pooling 활성화
```

### 문제: Google OAuth 작동 안 함

```
# 원인: Authorized origins 누락
# 해결: Google Cloud Console에서 도메인 추가
```

### 문제: 카카오톡 딥링크 안 열림

```
# PC에서는 정상 동작 아님
# 해결: PC 환경 감지 → 클립보드 복사로 대체 (이미 구현됨)
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 등록
2. 로그 첨부 (Railway, Vercel)
3. 브라우저 콘솔 에러 캡처

---

**🎉 배포 완료 후, 실제 학원 데이터로 Dogfooding을 시작하세요!**










# 🚀 AUTUS-PRIME 배포 & 테스트 가이드

## 📋 목차

1. [환경 설정](#1-환경-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Railway 배포 (백엔드)](#3-railway-배포-백엔드)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Dogfooding 테스트](#6-dogfooding-테스트)

---

## 1. 환경 설정

### 필수 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
AUTUS_MASTER_KEY=your-super-secret-master-key
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENV=production

# Frontend (.env)
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 정보 입력:
   - Name: `autus-prime`
   - Database Password: (안전한 비밀번호 생성)
   - Region: `Northeast Asia (Seoul)` 권장

### 2.2 연결 문자열 복사

1. Settings → Database
2. Connection string → URI 복사
3. `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### 2.3 무료 티어 제한

| 항목 | 제한 |
|-----|------|
| 저장소 | 500MB |
| 행 수 | 50,000 |
| API 요청 | 무제한 |
| 월 대역폭 | 2GB |

**학원 10곳(학생 1,000명) 충분히 커버!**

---

## 3. Railway 배포 (백엔드)

### 3.1 Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd backend
railway init

# 배포
railway up
```

### 3.2 환경 변수 설정

Railway Dashboard에서:
1. Variables 탭 클릭
2. 다음 변수 추가:

```
DATABASE_URL=postgresql://...  (Supabase 연결 문자열)
AUTUS_MASTER_KEY=your-master-key
JWT_SECRET=your-jwt-secret
ENV=production
```

### 3.3 도메인 설정

1. Settings → Domains
2. "Generate Domain" 클릭
3. 커스텀 도메인 연결 (선택)

---

## 4. Vercel 배포 (프론트엔드)

### 4.1 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

### 4.2 환경 변수 설정

Vercel Dashboard에서:
1. Settings → Environment Variables
2. 추가:

```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.3 빌드 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `AUTUS-PRIME`

### 5.2 OAuth 동의 화면

1. APIs & Services → OAuth consent screen
2. User Type: `External`
3. 앱 정보:
   - App name: `AUTUS-PRIME`
   - User support email: 본인 이메일
   - Authorized domains: `vercel.app`, `railway.app`

### 5.3 OAuth 클라이언트 ID 생성

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: `Web application`
4. 이름: `AUTUS-PRIME Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

### 5.4 API 활성화

1. APIs & Services → Library
2. 활성화할 API:
   - Google Calendar API
   - Google People API (Contacts)

---

## 6. Dogfooding 테스트

### 6.1 테스트용 엑셀 템플릿

아래 형식으로 엑셀 파일을 준비하세요:

| 이름 | 전화번호 | 학교 | 학년 | 수강료 | 입학점수 | 현재점수 | 상담횟수 | 학부모 |
|-----|---------|------|-----|--------|---------|---------|---------|-------|
| 김민수 | 010-1234-5678 | 서초중 | 중2 | 400000 | 70 | 85 | 1 | 김어머니 |
| 이영희 | 010-2345-6789 | 반포중 | 중3 | 350000 | 80 | 88 | 2 | 이어머니 |
| 박철수 | 010-3456-7890 | 서초고 | 고1 | 500000 | 65 | 75 | 0 | 박어머니 |
| 최진상 | 010-4567-8901 | 반포고 | 고2 | 200000 | 50 | 45 | 8 | 최어머니 |

### 6.2 테스트 시나리오

#### 시나리오 A: 데이터 업로드

1. 대시보드 접속
2. 엑셀 파일 드래그 앤 드롭
3. 확인:
   - 학생 목록 표시
   - SQ 점수 계산
   - 티어 분류 (Z-Score)

#### 시나리오 B: 히트맵 분석

1. Physis Map 확인
2. 우측 상단 (고수익, 저엔트로피) → 💎 VIP
3. 좌측 하단 (저수익, 고엔트로피) → ⚠️ 위험

#### 시나리오 C: 액션 실행

1. TierList에서 학생 선택
2. BOOST 또는 MSG 버튼 클릭
3. 확인:
   - 카카오톡 딥링크 동작 (모바일)
   - 클립보드 복사 (PC)

#### 시나리오 D: Google 동기화

1. Google 로그인
2. "Sync" 버튼 클릭
3. 캘린더에서 상담 일정 자동 추출

### 6.3 체크리스트

```
[ ] 엑셀 업로드 정상 작동
[ ] SQ 점수 계산 정확
[ ] Z-Score 티어 분류 정상
[ ] 히트맵 렌더링 정상
[ ] 액션 버튼 동작 확인
[ ] 모바일 반응형 확인
[ ] Google 로그인 동작
[ ] 경고 알림 표시
```

### 6.4 성능 기준

| 항목 | 목표 | 허용 범위 |
|-----|------|----------|
| 페이지 로드 | < 2초 | < 3초 |
| API 응답 | < 500ms | < 1초 |
| 엑셀 처리 (100명) | < 3초 | < 5초 |

---

## 🆘 트러블슈팅

### 문제: Railway 배포 실패

```bash
# 로그 확인
railway logs

# 일반적 원인: 환경 변수 누락
# 해결: DATABASE_URL 등 확인
```

### 문제: Supabase 연결 실패

```
# 원인: IP 차단
# 해결: Supabase Dashboard → Settings → Database → Connection Pooling 활성화
```

### 문제: Google OAuth 작동 안 함

```
# 원인: Authorized origins 누락
# 해결: Google Cloud Console에서 도메인 추가
```

### 문제: 카카오톡 딥링크 안 열림

```
# PC에서는 정상 동작 아님
# 해결: PC 환경 감지 → 클립보드 복사로 대체 (이미 구현됨)
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 등록
2. 로그 첨부 (Railway, Vercel)
3. 브라우저 콘솔 에러 캡처

---

**🎉 배포 완료 후, 실제 학원 데이터로 Dogfooding을 시작하세요!**




















# 🚀 AUTUS-PRIME 배포 & 테스트 가이드

## 📋 목차

1. [환경 설정](#1-환경-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Railway 배포 (백엔드)](#3-railway-배포-백엔드)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Dogfooding 테스트](#6-dogfooding-테스트)

---

## 1. 환경 설정

### 필수 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
AUTUS_MASTER_KEY=your-super-secret-master-key
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENV=production

# Frontend (.env)
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 정보 입력:
   - Name: `autus-prime`
   - Database Password: (안전한 비밀번호 생성)
   - Region: `Northeast Asia (Seoul)` 권장

### 2.2 연결 문자열 복사

1. Settings → Database
2. Connection string → URI 복사
3. `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### 2.3 무료 티어 제한

| 항목 | 제한 |
|-----|------|
| 저장소 | 500MB |
| 행 수 | 50,000 |
| API 요청 | 무제한 |
| 월 대역폭 | 2GB |

**학원 10곳(학생 1,000명) 충분히 커버!**

---

## 3. Railway 배포 (백엔드)

### 3.1 Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd backend
railway init

# 배포
railway up
```

### 3.2 환경 변수 설정

Railway Dashboard에서:
1. Variables 탭 클릭
2. 다음 변수 추가:

```
DATABASE_URL=postgresql://...  (Supabase 연결 문자열)
AUTUS_MASTER_KEY=your-master-key
JWT_SECRET=your-jwt-secret
ENV=production
```

### 3.3 도메인 설정

1. Settings → Domains
2. "Generate Domain" 클릭
3. 커스텀 도메인 연결 (선택)

---

## 4. Vercel 배포 (프론트엔드)

### 4.1 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

### 4.2 환경 변수 설정

Vercel Dashboard에서:
1. Settings → Environment Variables
2. 추가:

```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.3 빌드 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `AUTUS-PRIME`

### 5.2 OAuth 동의 화면

1. APIs & Services → OAuth consent screen
2. User Type: `External`
3. 앱 정보:
   - App name: `AUTUS-PRIME`
   - User support email: 본인 이메일
   - Authorized domains: `vercel.app`, `railway.app`

### 5.3 OAuth 클라이언트 ID 생성

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: `Web application`
4. 이름: `AUTUS-PRIME Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

### 5.4 API 활성화

1. APIs & Services → Library
2. 활성화할 API:
   - Google Calendar API
   - Google People API (Contacts)

---

## 6. Dogfooding 테스트

### 6.1 테스트용 엑셀 템플릿

아래 형식으로 엑셀 파일을 준비하세요:

| 이름 | 전화번호 | 학교 | 학년 | 수강료 | 입학점수 | 현재점수 | 상담횟수 | 학부모 |
|-----|---------|------|-----|--------|---------|---------|---------|-------|
| 김민수 | 010-1234-5678 | 서초중 | 중2 | 400000 | 70 | 85 | 1 | 김어머니 |
| 이영희 | 010-2345-6789 | 반포중 | 중3 | 350000 | 80 | 88 | 2 | 이어머니 |
| 박철수 | 010-3456-7890 | 서초고 | 고1 | 500000 | 65 | 75 | 0 | 박어머니 |
| 최진상 | 010-4567-8901 | 반포고 | 고2 | 200000 | 50 | 45 | 8 | 최어머니 |

### 6.2 테스트 시나리오

#### 시나리오 A: 데이터 업로드

1. 대시보드 접속
2. 엑셀 파일 드래그 앤 드롭
3. 확인:
   - 학생 목록 표시
   - SQ 점수 계산
   - 티어 분류 (Z-Score)

#### 시나리오 B: 히트맵 분석

1. Physis Map 확인
2. 우측 상단 (고수익, 저엔트로피) → 💎 VIP
3. 좌측 하단 (저수익, 고엔트로피) → ⚠️ 위험

#### 시나리오 C: 액션 실행

1. TierList에서 학생 선택
2. BOOST 또는 MSG 버튼 클릭
3. 확인:
   - 카카오톡 딥링크 동작 (모바일)
   - 클립보드 복사 (PC)

#### 시나리오 D: Google 동기화

1. Google 로그인
2. "Sync" 버튼 클릭
3. 캘린더에서 상담 일정 자동 추출

### 6.3 체크리스트

```
[ ] 엑셀 업로드 정상 작동
[ ] SQ 점수 계산 정확
[ ] Z-Score 티어 분류 정상
[ ] 히트맵 렌더링 정상
[ ] 액션 버튼 동작 확인
[ ] 모바일 반응형 확인
[ ] Google 로그인 동작
[ ] 경고 알림 표시
```

### 6.4 성능 기준

| 항목 | 목표 | 허용 범위 |
|-----|------|----------|
| 페이지 로드 | < 2초 | < 3초 |
| API 응답 | < 500ms | < 1초 |
| 엑셀 처리 (100명) | < 3초 | < 5초 |

---

## 🆘 트러블슈팅

### 문제: Railway 배포 실패

```bash
# 로그 확인
railway logs

# 일반적 원인: 환경 변수 누락
# 해결: DATABASE_URL 등 확인
```

### 문제: Supabase 연결 실패

```
# 원인: IP 차단
# 해결: Supabase Dashboard → Settings → Database → Connection Pooling 활성화
```

### 문제: Google OAuth 작동 안 함

```
# 원인: Authorized origins 누락
# 해결: Google Cloud Console에서 도메인 추가
```

### 문제: 카카오톡 딥링크 안 열림

```
# PC에서는 정상 동작 아님
# 해결: PC 환경 감지 → 클립보드 복사로 대체 (이미 구현됨)
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 등록
2. 로그 첨부 (Railway, Vercel)
3. 브라우저 콘솔 에러 캡처

---

**🎉 배포 완료 후, 실제 학원 데이터로 Dogfooding을 시작하세요!**










# 🚀 AUTUS-PRIME 배포 & 테스트 가이드

## 📋 목차

1. [환경 설정](#1-환경-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Railway 배포 (백엔드)](#3-railway-배포-백엔드)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Dogfooding 테스트](#6-dogfooding-테스트)

---

## 1. 환경 설정

### 필수 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
AUTUS_MASTER_KEY=your-super-secret-master-key
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENV=production

# Frontend (.env)
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 정보 입력:
   - Name: `autus-prime`
   - Database Password: (안전한 비밀번호 생성)
   - Region: `Northeast Asia (Seoul)` 권장

### 2.2 연결 문자열 복사

1. Settings → Database
2. Connection string → URI 복사
3. `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### 2.3 무료 티어 제한

| 항목 | 제한 |
|-----|------|
| 저장소 | 500MB |
| 행 수 | 50,000 |
| API 요청 | 무제한 |
| 월 대역폭 | 2GB |

**학원 10곳(학생 1,000명) 충분히 커버!**

---

## 3. Railway 배포 (백엔드)

### 3.1 Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd backend
railway init

# 배포
railway up
```

### 3.2 환경 변수 설정

Railway Dashboard에서:
1. Variables 탭 클릭
2. 다음 변수 추가:

```
DATABASE_URL=postgresql://...  (Supabase 연결 문자열)
AUTUS_MASTER_KEY=your-master-key
JWT_SECRET=your-jwt-secret
ENV=production
```

### 3.3 도메인 설정

1. Settings → Domains
2. "Generate Domain" 클릭
3. 커스텀 도메인 연결 (선택)

---

## 4. Vercel 배포 (프론트엔드)

### 4.1 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

### 4.2 환경 변수 설정

Vercel Dashboard에서:
1. Settings → Environment Variables
2. 추가:

```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.3 빌드 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `AUTUS-PRIME`

### 5.2 OAuth 동의 화면

1. APIs & Services → OAuth consent screen
2. User Type: `External`
3. 앱 정보:
   - App name: `AUTUS-PRIME`
   - User support email: 본인 이메일
   - Authorized domains: `vercel.app`, `railway.app`

### 5.3 OAuth 클라이언트 ID 생성

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: `Web application`
4. 이름: `AUTUS-PRIME Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

### 5.4 API 활성화

1. APIs & Services → Library
2. 활성화할 API:
   - Google Calendar API
   - Google People API (Contacts)

---

## 6. Dogfooding 테스트

### 6.1 테스트용 엑셀 템플릿

아래 형식으로 엑셀 파일을 준비하세요:

| 이름 | 전화번호 | 학교 | 학년 | 수강료 | 입학점수 | 현재점수 | 상담횟수 | 학부모 |
|-----|---------|------|-----|--------|---------|---------|---------|-------|
| 김민수 | 010-1234-5678 | 서초중 | 중2 | 400000 | 70 | 85 | 1 | 김어머니 |
| 이영희 | 010-2345-6789 | 반포중 | 중3 | 350000 | 80 | 88 | 2 | 이어머니 |
| 박철수 | 010-3456-7890 | 서초고 | 고1 | 500000 | 65 | 75 | 0 | 박어머니 |
| 최진상 | 010-4567-8901 | 반포고 | 고2 | 200000 | 50 | 45 | 8 | 최어머니 |

### 6.2 테스트 시나리오

#### 시나리오 A: 데이터 업로드

1. 대시보드 접속
2. 엑셀 파일 드래그 앤 드롭
3. 확인:
   - 학생 목록 표시
   - SQ 점수 계산
   - 티어 분류 (Z-Score)

#### 시나리오 B: 히트맵 분석

1. Physis Map 확인
2. 우측 상단 (고수익, 저엔트로피) → 💎 VIP
3. 좌측 하단 (저수익, 고엔트로피) → ⚠️ 위험

#### 시나리오 C: 액션 실행

1. TierList에서 학생 선택
2. BOOST 또는 MSG 버튼 클릭
3. 확인:
   - 카카오톡 딥링크 동작 (모바일)
   - 클립보드 복사 (PC)

#### 시나리오 D: Google 동기화

1. Google 로그인
2. "Sync" 버튼 클릭
3. 캘린더에서 상담 일정 자동 추출

### 6.3 체크리스트

```
[ ] 엑셀 업로드 정상 작동
[ ] SQ 점수 계산 정확
[ ] Z-Score 티어 분류 정상
[ ] 히트맵 렌더링 정상
[ ] 액션 버튼 동작 확인
[ ] 모바일 반응형 확인
[ ] Google 로그인 동작
[ ] 경고 알림 표시
```

### 6.4 성능 기준

| 항목 | 목표 | 허용 범위 |
|-----|------|----------|
| 페이지 로드 | < 2초 | < 3초 |
| API 응답 | < 500ms | < 1초 |
| 엑셀 처리 (100명) | < 3초 | < 5초 |

---

## 🆘 트러블슈팅

### 문제: Railway 배포 실패

```bash
# 로그 확인
railway logs

# 일반적 원인: 환경 변수 누락
# 해결: DATABASE_URL 등 확인
```

### 문제: Supabase 연결 실패

```
# 원인: IP 차단
# 해결: Supabase Dashboard → Settings → Database → Connection Pooling 활성화
```

### 문제: Google OAuth 작동 안 함

```
# 원인: Authorized origins 누락
# 해결: Google Cloud Console에서 도메인 추가
```

### 문제: 카카오톡 딥링크 안 열림

```
# PC에서는 정상 동작 아님
# 해결: PC 환경 감지 → 클립보드 복사로 대체 (이미 구현됨)
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 등록
2. 로그 첨부 (Railway, Vercel)
3. 브라우저 콘솔 에러 캡처

---

**🎉 배포 완료 후, 실제 학원 데이터로 Dogfooding을 시작하세요!**










# 🚀 AUTUS-PRIME 배포 & 테스트 가이드

## 📋 목차

1. [환경 설정](#1-환경-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Railway 배포 (백엔드)](#3-railway-배포-백엔드)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Dogfooding 테스트](#6-dogfooding-테스트)

---

## 1. 환경 설정

### 필수 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
AUTUS_MASTER_KEY=your-super-secret-master-key
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENV=production

# Frontend (.env)
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 정보 입력:
   - Name: `autus-prime`
   - Database Password: (안전한 비밀번호 생성)
   - Region: `Northeast Asia (Seoul)` 권장

### 2.2 연결 문자열 복사

1. Settings → Database
2. Connection string → URI 복사
3. `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### 2.3 무료 티어 제한

| 항목 | 제한 |
|-----|------|
| 저장소 | 500MB |
| 행 수 | 50,000 |
| API 요청 | 무제한 |
| 월 대역폭 | 2GB |

**학원 10곳(학생 1,000명) 충분히 커버!**

---

## 3. Railway 배포 (백엔드)

### 3.1 Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd backend
railway init

# 배포
railway up
```

### 3.2 환경 변수 설정

Railway Dashboard에서:
1. Variables 탭 클릭
2. 다음 변수 추가:

```
DATABASE_URL=postgresql://...  (Supabase 연결 문자열)
AUTUS_MASTER_KEY=your-master-key
JWT_SECRET=your-jwt-secret
ENV=production
```

### 3.3 도메인 설정

1. Settings → Domains
2. "Generate Domain" 클릭
3. 커스텀 도메인 연결 (선택)

---

## 4. Vercel 배포 (프론트엔드)

### 4.1 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

### 4.2 환경 변수 설정

Vercel Dashboard에서:
1. Settings → Environment Variables
2. 추가:

```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.3 빌드 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `AUTUS-PRIME`

### 5.2 OAuth 동의 화면

1. APIs & Services → OAuth consent screen
2. User Type: `External`
3. 앱 정보:
   - App name: `AUTUS-PRIME`
   - User support email: 본인 이메일
   - Authorized domains: `vercel.app`, `railway.app`

### 5.3 OAuth 클라이언트 ID 생성

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: `Web application`
4. 이름: `AUTUS-PRIME Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

### 5.4 API 활성화

1. APIs & Services → Library
2. 활성화할 API:
   - Google Calendar API
   - Google People API (Contacts)

---

## 6. Dogfooding 테스트

### 6.1 테스트용 엑셀 템플릿

아래 형식으로 엑셀 파일을 준비하세요:

| 이름 | 전화번호 | 학교 | 학년 | 수강료 | 입학점수 | 현재점수 | 상담횟수 | 학부모 |
|-----|---------|------|-----|--------|---------|---------|---------|-------|
| 김민수 | 010-1234-5678 | 서초중 | 중2 | 400000 | 70 | 85 | 1 | 김어머니 |
| 이영희 | 010-2345-6789 | 반포중 | 중3 | 350000 | 80 | 88 | 2 | 이어머니 |
| 박철수 | 010-3456-7890 | 서초고 | 고1 | 500000 | 65 | 75 | 0 | 박어머니 |
| 최진상 | 010-4567-8901 | 반포고 | 고2 | 200000 | 50 | 45 | 8 | 최어머니 |

### 6.2 테스트 시나리오

#### 시나리오 A: 데이터 업로드

1. 대시보드 접속
2. 엑셀 파일 드래그 앤 드롭
3. 확인:
   - 학생 목록 표시
   - SQ 점수 계산
   - 티어 분류 (Z-Score)

#### 시나리오 B: 히트맵 분석

1. Physis Map 확인
2. 우측 상단 (고수익, 저엔트로피) → 💎 VIP
3. 좌측 하단 (저수익, 고엔트로피) → ⚠️ 위험

#### 시나리오 C: 액션 실행

1. TierList에서 학생 선택
2. BOOST 또는 MSG 버튼 클릭
3. 확인:
   - 카카오톡 딥링크 동작 (모바일)
   - 클립보드 복사 (PC)

#### 시나리오 D: Google 동기화

1. Google 로그인
2. "Sync" 버튼 클릭
3. 캘린더에서 상담 일정 자동 추출

### 6.3 체크리스트

```
[ ] 엑셀 업로드 정상 작동
[ ] SQ 점수 계산 정확
[ ] Z-Score 티어 분류 정상
[ ] 히트맵 렌더링 정상
[ ] 액션 버튼 동작 확인
[ ] 모바일 반응형 확인
[ ] Google 로그인 동작
[ ] 경고 알림 표시
```

### 6.4 성능 기준

| 항목 | 목표 | 허용 범위 |
|-----|------|----------|
| 페이지 로드 | < 2초 | < 3초 |
| API 응답 | < 500ms | < 1초 |
| 엑셀 처리 (100명) | < 3초 | < 5초 |

---

## 🆘 트러블슈팅

### 문제: Railway 배포 실패

```bash
# 로그 확인
railway logs

# 일반적 원인: 환경 변수 누락
# 해결: DATABASE_URL 등 확인
```

### 문제: Supabase 연결 실패

```
# 원인: IP 차단
# 해결: Supabase Dashboard → Settings → Database → Connection Pooling 활성화
```

### 문제: Google OAuth 작동 안 함

```
# 원인: Authorized origins 누락
# 해결: Google Cloud Console에서 도메인 추가
```

### 문제: 카카오톡 딥링크 안 열림

```
# PC에서는 정상 동작 아님
# 해결: PC 환경 감지 → 클립보드 복사로 대체 (이미 구현됨)
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 등록
2. 로그 첨부 (Railway, Vercel)
3. 브라우저 콘솔 에러 캡처

---

**🎉 배포 완료 후, 실제 학원 데이터로 Dogfooding을 시작하세요!**










# 🚀 AUTUS-PRIME 배포 & 테스트 가이드

## 📋 목차

1. [환경 설정](#1-환경-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Railway 배포 (백엔드)](#3-railway-배포-백엔드)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Dogfooding 테스트](#6-dogfooding-테스트)

---

## 1. 환경 설정

### 필수 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
AUTUS_MASTER_KEY=your-super-secret-master-key
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENV=production

# Frontend (.env)
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 정보 입력:
   - Name: `autus-prime`
   - Database Password: (안전한 비밀번호 생성)
   - Region: `Northeast Asia (Seoul)` 권장

### 2.2 연결 문자열 복사

1. Settings → Database
2. Connection string → URI 복사
3. `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### 2.3 무료 티어 제한

| 항목 | 제한 |
|-----|------|
| 저장소 | 500MB |
| 행 수 | 50,000 |
| API 요청 | 무제한 |
| 월 대역폭 | 2GB |

**학원 10곳(학생 1,000명) 충분히 커버!**

---

## 3. Railway 배포 (백엔드)

### 3.1 Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd backend
railway init

# 배포
railway up
```

### 3.2 환경 변수 설정

Railway Dashboard에서:
1. Variables 탭 클릭
2. 다음 변수 추가:

```
DATABASE_URL=postgresql://...  (Supabase 연결 문자열)
AUTUS_MASTER_KEY=your-master-key
JWT_SECRET=your-jwt-secret
ENV=production
```

### 3.3 도메인 설정

1. Settings → Domains
2. "Generate Domain" 클릭
3. 커스텀 도메인 연결 (선택)

---

## 4. Vercel 배포 (프론트엔드)

### 4.1 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

### 4.2 환경 변수 설정

Vercel Dashboard에서:
1. Settings → Environment Variables
2. 추가:

```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.3 빌드 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `AUTUS-PRIME`

### 5.2 OAuth 동의 화면

1. APIs & Services → OAuth consent screen
2. User Type: `External`
3. 앱 정보:
   - App name: `AUTUS-PRIME`
   - User support email: 본인 이메일
   - Authorized domains: `vercel.app`, `railway.app`

### 5.3 OAuth 클라이언트 ID 생성

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: `Web application`
4. 이름: `AUTUS-PRIME Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

### 5.4 API 활성화

1. APIs & Services → Library
2. 활성화할 API:
   - Google Calendar API
   - Google People API (Contacts)

---

## 6. Dogfooding 테스트

### 6.1 테스트용 엑셀 템플릿

아래 형식으로 엑셀 파일을 준비하세요:

| 이름 | 전화번호 | 학교 | 학년 | 수강료 | 입학점수 | 현재점수 | 상담횟수 | 학부모 |
|-----|---------|------|-----|--------|---------|---------|---------|-------|
| 김민수 | 010-1234-5678 | 서초중 | 중2 | 400000 | 70 | 85 | 1 | 김어머니 |
| 이영희 | 010-2345-6789 | 반포중 | 중3 | 350000 | 80 | 88 | 2 | 이어머니 |
| 박철수 | 010-3456-7890 | 서초고 | 고1 | 500000 | 65 | 75 | 0 | 박어머니 |
| 최진상 | 010-4567-8901 | 반포고 | 고2 | 200000 | 50 | 45 | 8 | 최어머니 |

### 6.2 테스트 시나리오

#### 시나리오 A: 데이터 업로드

1. 대시보드 접속
2. 엑셀 파일 드래그 앤 드롭
3. 확인:
   - 학생 목록 표시
   - SQ 점수 계산
   - 티어 분류 (Z-Score)

#### 시나리오 B: 히트맵 분석

1. Physis Map 확인
2. 우측 상단 (고수익, 저엔트로피) → 💎 VIP
3. 좌측 하단 (저수익, 고엔트로피) → ⚠️ 위험

#### 시나리오 C: 액션 실행

1. TierList에서 학생 선택
2. BOOST 또는 MSG 버튼 클릭
3. 확인:
   - 카카오톡 딥링크 동작 (모바일)
   - 클립보드 복사 (PC)

#### 시나리오 D: Google 동기화

1. Google 로그인
2. "Sync" 버튼 클릭
3. 캘린더에서 상담 일정 자동 추출

### 6.3 체크리스트

```
[ ] 엑셀 업로드 정상 작동
[ ] SQ 점수 계산 정확
[ ] Z-Score 티어 분류 정상
[ ] 히트맵 렌더링 정상
[ ] 액션 버튼 동작 확인
[ ] 모바일 반응형 확인
[ ] Google 로그인 동작
[ ] 경고 알림 표시
```

### 6.4 성능 기준

| 항목 | 목표 | 허용 범위 |
|-----|------|----------|
| 페이지 로드 | < 2초 | < 3초 |
| API 응답 | < 500ms | < 1초 |
| 엑셀 처리 (100명) | < 3초 | < 5초 |

---

## 🆘 트러블슈팅

### 문제: Railway 배포 실패

```bash
# 로그 확인
railway logs

# 일반적 원인: 환경 변수 누락
# 해결: DATABASE_URL 등 확인
```

### 문제: Supabase 연결 실패

```
# 원인: IP 차단
# 해결: Supabase Dashboard → Settings → Database → Connection Pooling 활성화
```

### 문제: Google OAuth 작동 안 함

```
# 원인: Authorized origins 누락
# 해결: Google Cloud Console에서 도메인 추가
```

### 문제: 카카오톡 딥링크 안 열림

```
# PC에서는 정상 동작 아님
# 해결: PC 환경 감지 → 클립보드 복사로 대체 (이미 구현됨)
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 등록
2. 로그 첨부 (Railway, Vercel)
3. 브라우저 콘솔 에러 캡처

---

**🎉 배포 완료 후, 실제 학원 데이터로 Dogfooding을 시작하세요!**










# 🚀 AUTUS-PRIME 배포 & 테스트 가이드

## 📋 목차

1. [환경 설정](#1-환경-설정)
2. [Supabase 설정](#2-supabase-설정)
3. [Railway 배포 (백엔드)](#3-railway-배포-백엔드)
4. [Vercel 배포 (프론트엔드)](#4-vercel-배포-프론트엔드)
5. [Google OAuth 설정](#5-google-oauth-설정)
6. [Dogfooding 테스트](#6-dogfooding-테스트)

---

## 1. 환경 설정

### 필수 환경 변수

```bash
# Backend (.env)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
AUTUS_MASTER_KEY=your-super-secret-master-key
JWT_SECRET=your-jwt-secret-key-min-32-chars
ENV=production

# Frontend (.env)
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## 2. Supabase 설정

### 2.1 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "New Project" 클릭
3. 정보 입력:
   - Name: `autus-prime`
   - Database Password: (안전한 비밀번호 생성)
   - Region: `Northeast Asia (Seoul)` 권장

### 2.2 연결 문자열 복사

1. Settings → Database
2. Connection string → URI 복사
3. `[YOUR-PASSWORD]` 부분을 실제 비밀번호로 교체

```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

### 2.3 무료 티어 제한

| 항목 | 제한 |
|-----|------|
| 저장소 | 500MB |
| 행 수 | 50,000 |
| API 요청 | 무제한 |
| 월 대역폭 | 2GB |

**학원 10곳(학생 1,000명) 충분히 커버!**

---

## 3. Railway 배포 (백엔드)

### 3.1 Railway 프로젝트 생성

```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성
cd backend
railway init

# 배포
railway up
```

### 3.2 환경 변수 설정

Railway Dashboard에서:
1. Variables 탭 클릭
2. 다음 변수 추가:

```
DATABASE_URL=postgresql://...  (Supabase 연결 문자열)
AUTUS_MASTER_KEY=your-master-key
JWT_SECRET=your-jwt-secret
ENV=production
```

### 3.3 도메인 설정

1. Settings → Domains
2. "Generate Domain" 클릭
3. 커스텀 도메인 연결 (선택)

---

## 4. Vercel 배포 (프론트엔드)

### 4.1 Vercel 배포

```bash
# Vercel CLI 설치
npm install -g vercel

# 프론트엔드 폴더로 이동
cd frontend

# 배포
vercel
```

### 4.2 환경 변수 설정

Vercel Dashboard에서:
1. Settings → Environment Variables
2. 추가:

```
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 4.3 빌드 설정

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

---

## 5. Google OAuth 설정

### 5.1 Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) 접속
2. 새 프로젝트 생성: `AUTUS-PRIME`

### 5.2 OAuth 동의 화면

1. APIs & Services → OAuth consent screen
2. User Type: `External`
3. 앱 정보:
   - App name: `AUTUS-PRIME`
   - User support email: 본인 이메일
   - Authorized domains: `vercel.app`, `railway.app`

### 5.3 OAuth 클라이언트 ID 생성

1. APIs & Services → Credentials
2. Create Credentials → OAuth client ID
3. Application type: `Web application`
4. 이름: `AUTUS-PRIME Web`
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000
   https://your-app.vercel.app
   ```

### 5.4 API 활성화

1. APIs & Services → Library
2. 활성화할 API:
   - Google Calendar API
   - Google People API (Contacts)

---

## 6. Dogfooding 테스트

### 6.1 테스트용 엑셀 템플릿

아래 형식으로 엑셀 파일을 준비하세요:

| 이름 | 전화번호 | 학교 | 학년 | 수강료 | 입학점수 | 현재점수 | 상담횟수 | 학부모 |
|-----|---------|------|-----|--------|---------|---------|---------|-------|
| 김민수 | 010-1234-5678 | 서초중 | 중2 | 400000 | 70 | 85 | 1 | 김어머니 |
| 이영희 | 010-2345-6789 | 반포중 | 중3 | 350000 | 80 | 88 | 2 | 이어머니 |
| 박철수 | 010-3456-7890 | 서초고 | 고1 | 500000 | 65 | 75 | 0 | 박어머니 |
| 최진상 | 010-4567-8901 | 반포고 | 고2 | 200000 | 50 | 45 | 8 | 최어머니 |

### 6.2 테스트 시나리오

#### 시나리오 A: 데이터 업로드

1. 대시보드 접속
2. 엑셀 파일 드래그 앤 드롭
3. 확인:
   - 학생 목록 표시
   - SQ 점수 계산
   - 티어 분류 (Z-Score)

#### 시나리오 B: 히트맵 분석

1. Physis Map 확인
2. 우측 상단 (고수익, 저엔트로피) → 💎 VIP
3. 좌측 하단 (저수익, 고엔트로피) → ⚠️ 위험

#### 시나리오 C: 액션 실행

1. TierList에서 학생 선택
2. BOOST 또는 MSG 버튼 클릭
3. 확인:
   - 카카오톡 딥링크 동작 (모바일)
   - 클립보드 복사 (PC)

#### 시나리오 D: Google 동기화

1. Google 로그인
2. "Sync" 버튼 클릭
3. 캘린더에서 상담 일정 자동 추출

### 6.3 체크리스트

```
[ ] 엑셀 업로드 정상 작동
[ ] SQ 점수 계산 정확
[ ] Z-Score 티어 분류 정상
[ ] 히트맵 렌더링 정상
[ ] 액션 버튼 동작 확인
[ ] 모바일 반응형 확인
[ ] Google 로그인 동작
[ ] 경고 알림 표시
```

### 6.4 성능 기준

| 항목 | 목표 | 허용 범위 |
|-----|------|----------|
| 페이지 로드 | < 2초 | < 3초 |
| API 응답 | < 500ms | < 1초 |
| 엑셀 처리 (100명) | < 3초 | < 5초 |

---

## 🆘 트러블슈팅

### 문제: Railway 배포 실패

```bash
# 로그 확인
railway logs

# 일반적 원인: 환경 변수 누락
# 해결: DATABASE_URL 등 확인
```

### 문제: Supabase 연결 실패

```
# 원인: IP 차단
# 해결: Supabase Dashboard → Settings → Database → Connection Pooling 활성화
```

### 문제: Google OAuth 작동 안 함

```
# 원인: Authorized origins 누락
# 해결: Google Cloud Console에서 도메인 추가
```

### 문제: 카카오톡 딥링크 안 열림

```
# PC에서는 정상 동작 아님
# 해결: PC 환경 감지 → 클립보드 복사로 대체 (이미 구현됨)
```

---

## 📞 지원

문제 발생 시:
1. GitHub Issues 등록
2. 로그 첨부 (Railway, Vercel)
3. 브라우저 콘솔 에러 캡처

---

**🎉 배포 완료 후, 실제 학원 데이터로 Dogfooding을 시작하세요!**

























