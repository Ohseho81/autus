# 온리쌤 시스템 설정 가이드

**버전**: 1.0
**작성일**: 2026-02-14
**대상**: 시스템 관리자, 강사, 개발자

---

## 📋 개요

온리쌤 학원 관리 시스템을 원활하게 운영하기 위해 필요한 브라우저, 시스템 환경, 네트워크 설정을 정리한 문서입니다.

---

## 🖥️ 1. 관리자용 데스크톱 환경

### 1.1 Supabase 대시보드 접근

**목적**: 데이터베이스 관리, SQL 실행, 테이블 조회

**필수 브라우저**:
- Google Chrome (권장) - 최신 버전
- Firefox 또는 Safari (대안)

**필요 설정**:
1. **JavaScript 활성화**
   - Chrome: 설정 → 개인정보 및 보안 → 사이트 설정 → JavaScript → 허용

2. **쿠키 허용**
   - `supabase.co` 도메인 쿠키 허용
   - 서드파티 쿠키 차단 시 로그인 불가

3. **팝업 차단 해제**
   - `supabase.com` 팝업 허용 (OAuth 로그인용)

4. **네트워크**
   - 포트: HTTPS (443)
   - 방화벽: `*.supabase.co` 허용

**접속 URL**:
```
https://supabase.com/dashboard/project/pphzvnaedmzcvpxjulti
```

**필수 권한**:
- 관리자: Owner 또는 Admin
- 강사: Viewer (읽기 전용)

---

### 1.2 카카오 개발자 콘솔

**목적**: API 키 관리, 메시지 템플릿 설정

**접속 URL**:
```
https://developers.kakao.com/console/app
```

**필요 설정**:
1. **내 애플리케이션** 등록
   - 앱 이름: "온리쌤 학원 관리"
   - 플랫폼: Web, REST API

2. **카카오톡 메시지** 활성화
   - 제품 설정 → 카카오톡 메시지 → 활성화
   - 템플릿 등록 (학부모 알림용)

3. **토큰 발급**
   - REST API 키 복사
   - 현재 토큰: `YOUR_KAKAO_REST_API_TOKEN_HERE`

4. **Redirect URI 설정**
   ```
   https://localhost:8000/oauth
   https://payssam.kr/oauth
   ```

**브라우저 요구사항**:
- Chrome 또는 Safari
- 쿠키 허용 (developers.kakao.com)

---

## 🖥️ 2. 로컬 개발 환경 (Python)

### 2.1 Python 설치

**필수 버전**: Python 3.9 이상

**설치 확인**:
```bash
python3 --version
```

### 2.2 필수 라이브러리

**설치 명령**:
```bash
pip install requests supabase openpyxl --break-system-packages
```

**필요 패키지**:
- `requests`: 카카오톡 API 호출
- `supabase`: Supabase Python 클라이언트
- `openpyxl`: Excel 파일 처리 (데이터 업로드용)

**설치 검증**:
```python
import requests
import supabase
import openpyxl
print("✅ 모든 패키지 설치 완료")
```

---

## 📱 3. 강사용 모바일 환경

### 3.1 수업 결과 입력 폼 (개발 예정)

**목적**: 강사가 수업 후 즉시 결과 입력

**지원 브라우저**:
- **iOS**: Safari 14 이상
- **Android**: Chrome 90 이상

**필요 설정**:
1. **위치 정보** (선택)
   - 수업 장소 자동 기록용

2. **알림 권한**
   - 수업 시작 30분 전 알림

3. **카메라 권한** (선택)
   - 수업 사진 첨부용

**네트워크**:
- WiFi 또는 4G/5G
- 최소 속도: 1Mbps

**폼 접속 URL** (예정):
```
https://payssam.kr/coach/class-log
```

---

## 🌐 4. Claude 플러그인 환경

### 4.1 Claude Code (터미널)

**목적**: 데이터 자동 업로드, 스크립트 실행

**설치**:
```bash
# macOS/Linux
brew install anthropic/tap/claude

# Windows
winget install Anthropic.Claude
```

**플러그인 설치**:
```bash
cd ~/.claude/plugins
# autus-supabase-uploader.plugin 복사
```

**환경 변수 설정**:
```bash
export SUPABASE_URL="https://pphzvnaedmzcvpxjulti.supabase.co"
export SUPABASE_SERVICE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"
export KAKAO_API_KEY="YOUR_KAKAO_API_KEY_HERE"
```

**실행 예시**:
```bash
# 수업 결과 알림 발송
cd /path/to/autus
python3 send_class_log_notifications.py
```

---

## 🔗 5. 네트워크 및 보안 설정

### 5.1 방화벽 규칙

**허용해야 할 도메인**:
```
*.supabase.co         # 데이터베이스
kapi.kakao.com        # 카카오톡 API
developers.kakao.com  # 카카오 개발자 콘솔
payssam.kr           # 온리쌤 웹앱 (예정)
```

**필요 포트**:
- HTTPS: 443 (아웃바운드)
- HTTP: 80 (리다이렉트용)

### 5.2 프록시 환경

**프록시 사용 시** Python 스크립트 수정:
```python
import os
os.environ['HTTP_PROXY'] = 'http://proxy.example.com:8080'
os.environ['HTTPS_PROXY'] = 'http://proxy.example.com:8080'
```

**브라우저 프록시** (회사 네트워크):
- Chrome: 설정 → 시스템 → 컴퓨터의 프록시 설정 열기
- Supabase, Kakao 도메인 프록시 예외 추가

---

## 🔐 6. 보안 및 권한 관리

### 6.1 API 키 보안

**절대 금지**:
- ❌ GitHub에 API 키 커밋
- ❌ 클라이언트(브라우저)에 Service Role Key 노출
- ❌ 공개 채팅방에 키 공유

**권장 사항**:
- ✅ 환경 변수로 관리
- ✅ `.env` 파일 사용 (`.gitignore` 추가)
- ✅ Service Role Key는 서버에서만 사용
- ✅ Anon Key는 클라이언트에서 사용

**`.env` 예시**:
```env
SUPABASE_URL=https://pphzvnaedmzcvpxjulti.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
KAKAO_API_KEY=YOUR_KAKAO_API_KEY_HERE
```

### 6.2 Supabase RLS (Row Level Security)

**현재 상태**: RLS 활성화됨

**정책**:
- `atb_students`: 인증된 사용자만 접근
- `class_logs`: 강사/관리자만 수정 가능
- 학부모: 본인 자녀 데이터만 조회 (예정)

---

## 📊 7. 대안 실행 환경

### 7.1 Google Colab (네트워크 제약 시)

**목적**: VM 네트워크 차단 시 대안

**접속**: https://colab.research.google.com

**사용법**:
1. 새 노트북 생성
2. 첫 셀에 라이브러리 설치:
   ```python
   !pip install requests supabase openpyxl
   ```
3. 스크립트 복사 & 실행

**장점**:
- Google 서버에서 실행 (네트워크 제약 없음)
- 무료
- 브라우저만 있으면 됨

**단점**:
- 세션 타임아웃 (90분)
- API 키를 매번 입력해야 함

---

## 🧪 8. 테스트 체크리스트

### 8.1 Supabase 연결 테스트

```python
from supabase import create_client

SUPABASE_URL = "https://pphzvnaedmzcvpxjulti.supabase.co"
SUPABASE_KEY = "service_role_key"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
result = supabase.table('atb_students').select('*').limit(1).execute()
print(f"✅ 연결 성공: {len(result.data)}건 조회")
```

### 8.2 카카오톡 API 테스트

```python
import requests

KAKAO_API_KEY = "your_api_key"
url = "https://kapi.kakao.com/v2/api/talk/memo/default/send"
headers = {"Authorization": f"Bearer {KAKAO_API_KEY}"}

response = requests.post(url, headers=headers, data={
    "template_object": '{"object_type":"text","text":"테스트 메시지"}'
})

print(f"✅ 카카오톡 발송: {response.status_code}")
```

---

## 🚨 9. 문제 해결 (Troubleshooting)

### 9.1 Supabase 접속 불가

**증상**: `403 Forbidden` 또는 `401 Unauthorized`

**해결**:
1. API 키 확인 (Service Role Key 사용 중인지)
2. RLS 정책 확인
3. 네트워크/방화벽 확인
4. 브라우저 쿠키 삭제 후 재로그인

### 9.2 카카오톡 발송 실패

**증상**: `401 Unauthorized`

**해결**:
1. 토큰 유효기간 확인 (갱신 필요)
2. 앱 활성화 상태 확인
3. 메시지 템플릿 등록 확인

### 9.3 Python 스크립트 실행 오류

**증상**: `ModuleNotFoundError`

**해결**:
```bash
pip install [패키지명] --break-system-packages
```

**증상**: `DNS resolution failure`

**해결**:
- 로컬 터미널에서 실행 (VM 외부)
- Google Colab 사용
- 프록시 설정 확인

---

## 📞 10. 지원 및 연락처

**시스템 관리자**: AUTUS Team
**카카오 개발자 센터**: https://devtalk.kakao.com
**Supabase 문서**: https://supabase.com/docs

---

## 📝 체크리스트

### 관리자 초기 설정
- [ ] Supabase 대시보드 로그인 확인
- [ ] 카카오 개발자 콘솔 앱 등록
- [ ] Python 환경 설치 (3.9+)
- [ ] 필수 라이브러리 설치
- [ ] API 키 환경 변수 설정
- [ ] 테스트 스크립트 실행 (연결 확인)
- [ ] 방화벽 규칙 설정

### 강사용 설정 (개발 완료 후)
- [ ] 모바일 브라우저 업데이트
- [ ] 수업 결과 입력 폼 접속 테스트
- [ ] 알림 권한 허용
- [ ] 교육 이수 (폼 사용법)

---

**문서 버전**: 1.0
**최종 수정**: 2026-02-14
**작성자**: AUTUS Team
