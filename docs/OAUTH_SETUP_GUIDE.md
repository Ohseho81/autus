# AUTUS OAuth 앱 설정 가이드

이 가이드는 AUTUS 관리자가 1회만 설정하면 됩니다.
설정 완료 후 모든 사용자는 버튼 클릭만으로 서비스를 연결할 수 있습니다.

---

## 1. Google OAuth 앱 설정

### 1.1 Google Cloud Console 접속
https://console.cloud.google.com/

### 1.2 프로젝트 생성
1. "새 프로젝트" 클릭
2. 프로젝트 이름: `AUTUS`
3. 생성 완료

### 1.3 OAuth 동의 화면 설정
1. APIs & Services → OAuth consent screen
2. User Type: External
3. 앱 이름: `AUTUS`
4. 사용자 지원 이메일 입력
5. 범위 추가:
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/drive.readonly`
6. 테스트 사용자 추가 (개발 중)
7. 프로덕션 배포 시 "앱 게시" 클릭

### 1.4 OAuth 클라이언트 ID 생성
1. APIs & Services → Credentials
2. "CREATE CREDENTIALS" → OAuth client ID
3. Application type: Web application
4. 이름: `AUTUS Web Client`
5. Authorized redirect URIs:
   - `https://api.autus-ai.com/integration/callback/google`
   - `http://localhost:8000/integration/callback/google`
6. 생성 후 Client ID와 Client Secret 복사

### 1.5 환경변수 설정
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## 2. Microsoft OAuth 앱 설정

### 2.1 Azure Portal 접속
https://portal.azure.com/

### 2.2 앱 등록
1. Azure Active Directory → App registrations
2. "New registration"
3. 이름: `AUTUS`
4. Supported account types: Accounts in any organizational directory and personal Microsoft accounts
5. Redirect URI: `https://api.autus-ai.com/integration/callback/microsoft`

### 2.3 API 권한 추가
1. API permissions → Add a permission
2. Microsoft Graph → Delegated permissions
   - `User.Read`
   - `Mail.Read`
   - `Calendars.ReadWrite`
   - `Files.Read.All`
3. "Grant admin consent" 클릭

### 2.4 Client Secret 생성
1. Certificates & secrets
2. "New client secret"
3. 만료: 24 months
4. 생성 후 Value 복사

### 2.5 환경변수 설정
```bash
MICROSOFT_CLIENT_ID=your-application-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
```

---

## 3. Slack OAuth 앱 설정

### 3.1 Slack API 접속
https://api.slack.com/apps

### 3.2 앱 생성
1. "Create New App" → From scratch
2. App Name: `AUTUS`
3. Workspace 선택

### 3.3 OAuth 설정
1. OAuth & Permissions
2. Redirect URLs 추가:
   - `https://api.autus-ai.com/integration/callback/slack`
3. Bot Token Scopes:
   - `channels:read`
   - `channels:history`
   - `chat:write`
   - `users:read`
   - `users:read.email`
4. User Token Scopes:
   - `identity.basic`
   - `identity.email`

### 3.4 앱 설치
1. Install App → Install to Workspace
2. 권한 허용

### 3.5 환경변수 설정
```bash
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret
```

---

## 4. Notion OAuth 앱 설정

### 4.1 Notion Integrations 접속
https://www.notion.so/my-integrations

### 4.2 통합 생성
1. "New integration"
2. 이름: `AUTUS`
3. Type: Public
4. Redirect URI: `https://api.autus-ai.com/integration/callback/notion`

### 4.3 Capabilities 설정
- Read content
- Update content
- Read user information including email addresses

### 4.4 환경변수 설정
```bash
NOTION_CLIENT_ID=your-client-id
NOTION_CLIENT_SECRET=your-client-secret
```

---

## 5. GitHub OAuth 앱 설정

### 5.1 GitHub Developer Settings 접속
https://github.com/settings/developers

### 5.2 OAuth App 생성
1. "New OAuth App"
2. Application name: `AUTUS`
3. Homepage URL: `https://autus-ai.com`
4. Authorization callback URL: `https://api.autus-ai.com/integration/callback/github`

### 5.3 환경변수 설정
```bash
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
```

---

## 6. 카카오 OAuth 앱 설정

### 6.1 Kakao Developers 접속
https://developers.kakao.com/

### 6.2 애플리케이션 등록
1. 내 애플리케이션 → 애플리케이션 추가
2. 앱 이름: `AUTUS`
3. 사업자명 입력

### 6.3 플랫폼 설정
1. 앱 설정 → 플랫폼
2. Web 플랫폼 등록
3. 사이트 도메인: `https://autus-ai.com`

### 6.4 카카오 로그인 설정
1. 제품 설정 → 카카오 로그인
2. 활성화 설정: ON
3. Redirect URI: `https://api.autus-ai.com/integration/callback/kakao`

### 6.5 동의항목 설정
- 닉네임
- 프로필 사진
- 카카오계정(이메일)

### 6.6 환경변수 설정
```bash
KAKAO_CLIENT_ID=your-rest-api-key
KAKAO_CLIENT_SECRET=your-client-secret
```

---

## 7. 네이버 OAuth 앱 설정

### 7.1 Naver Developers 접속
https://developers.naver.com/

### 7.2 애플리케이션 등록
1. Application → 애플리케이션 등록
2. 애플리케이션 이름: `AUTUS`
3. 사용 API: 네이버 로그인

### 7.3 환경설정
1. 서비스 URL: `https://autus-ai.com`
2. Callback URL: `https://api.autus-ai.com/integration/callback/naver`

### 7.4 환경변수 설정
```bash
NAVER_CLIENT_ID=your-client-id
NAVER_CLIENT_SECRET=your-client-secret
```

---

## 최종 환경변수 파일

```bash
# .env 파일

# Backend URL
BASE_URL=https://api.autus-ai.com

# Google
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Microsoft
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx

# Slack
SLACK_CLIENT_ID=xxx
SLACK_CLIENT_SECRET=xxx

# Notion
NOTION_CLIENT_ID=xxx
NOTION_CLIENT_SECRET=xxx

# GitHub
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Kakao
KAKAO_CLIENT_ID=xxx
KAKAO_CLIENT_SECRET=xxx

# Naver
NAVER_CLIENT_ID=xxx
NAVER_CLIENT_SECRET=xxx
```

---

## 설정 완료 후

1. 환경변수를 Railway/서버에 설정
2. 백엔드 재시작
3. 사용자는 버튼만 클릭하면 자동 연결!

```
관리자 1회 설정 → 모든 사용자 자동화
```
