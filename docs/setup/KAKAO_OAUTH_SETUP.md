# 카카오 로그인 설정 가이드

앱 최초 로그인에 카카오 로그인을 사용하기 위한 설정 절차입니다.

---

## 1. 카카오 개발자 콘솔 설정

### 1.1 애플리케이션 등록

1. [Kakao Developers](https://developers.kakao.com/) 접속 및 로그인
2. **내 애플리케이션** → **애플리케이션 추가**
3. 앱 이름, 사업자명 등 입력 후 저장

### 1.2 플랫폼 등록

1. **앱 설정** → **플랫폼** → **Web 플랫폼 등록**
2. 사이트 도메인 추가:
   - 프로덕션: `https://your-domain.com`
   - 로컬: `http://localhost:5173` (Vite 기본)

### 1.3 카카오 로그인 활성화

1. **제품 설정** → **카카오 로그인**
2. **활성화 설정**: ON
3. **Redirect URI** 추가:

   Supabase 프로젝트의 콜백 URL을 등록합니다.

   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```

   - Supabase Dashboard → Authentication → Providers → Kakao
   - **Callback URL** 복사 후 카카오 Redirect URI에 붙여넣기

### 1.4 동의항목 설정

1. **카카오 로그인** → **동의항목**
2. 필수 동의:
   - **닉네임** (profile_nickname)
   - **프로필 사진** (profile_image)
3. 선택 동의:
   - **카카오계정(이메일)** (account_email)  
     → Biz 앱만 사용 가능. 개인 개발자면 생략 후 Supabase에서 "Allow users without email" 활성화

### 1.5 Client Secret 발급 (Supabase용)

1. **앱 설정** → **앱** → **플랫폼 키**
2. **REST API 키** 클릭
3. **카카오 로그인 Client Secret** → **코드 발급**
4. 발급된 Secret 복사 (Supabase에서 사용)

### 1.6 키 복사

- **REST API 키** → `client_id` (Supabase Kakao Client ID)
- **카카오 로그인 Client Secret** → `client_secret` (Supabase Kakao Client Secret)

---

## 2. Supabase 설정

### 2.1 Kakao Provider 활성화

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 선택
2. **Authentication** → **Providers**
3. **Kakao** 클릭 → **Enable** ON
4. 입력:
   - **Kakao Client ID**: REST API 키
   - **Kakao Client Secret**: 카카오 로그인 Client Secret

### 2.2 이메일 없음 허용 (선택)

이메일 동의가 없는 카카오 앱인 경우:
- **Allow users without email** 체크

### 2.3 Redirect URL 등록

1. **Authentication** → **URL Configuration**
2. **Redirect URLs**에 앱 URL 추가:
   - `https://your-domain.com`
   - `http://localhost:5173`

---

## 3. 앱 환경변수

`kraton-v2/.env` 또는 Vercel 환경변수:

```env
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY>
```

(카카오 키는 Supabase에만 등록, 앱에는 불필요)

---

## 4. 플로우 확인

1. 사용자가 **"카카오로 계속하기"** 클릭
2. 카카오 로그인 페이지로 리다이렉트
3. 로그인 후 Supabase 콜백으로 복귀
4. 앱으로 리다이렉트 (설정한 Redirect URL)
5. `ensureProfile`로 프로필 자동 생성 후 역할 선택

---

## 5. 트러블슈팅

| 증상 | 확인 사항 |
|------|----------|
| Redirect URI mismatch | 카카오 Redirect URI와 Supabase 콜백 URL이 정확히 일치하는지 |
| 401 Unauthorized | Client ID / Client Secret 재확인 |
| 이메일 없음 오류 | "Allow users without email" 활성화 |
| 프로필 생성 실패 | `profiles` 테이블 RLS에서 본인 insert 허용 여부 확인 |

---

*작성일: 2026-02-22*
