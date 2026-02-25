# 카카오 개발자 콘솔 — 수동 설정 체크리스트

로그인은 직접 했고, **카카오 로그인 활성화 / Redirect URI / 동의항목 / 플랫폼**만 채우면 될 때 사용.  
(Claude in Chrome 연결이 끊겨도 이대로 화면만 보고 순서대로 하면 됨.)

**앱 콘솔**: https://developers.kakao.com/console/app/ (본인 앱 선택)  
→ 온리쌤/사용 중 앱: https://developers.kakao.com/console/app/1384323

---

## 1. 플랫폼

- [ ] **앱 설정** → **플랫폼**
- [ ] **Web** 추가
  - 사이트 도메인: `https://your-domain.com` (실서비스 도메인)
  - 개발용: `http://localhost:3000` 등 필요 시 추가
- [ ] **Android** 추가 시 **키 해시** 등록 (카카오 로그인용)
  - 디버그: 아래 "Android 키 해시" 참고
  - 릴리즈: `eas credentials -p android` 로 확인 후 등록

---

## 2. 카카오 로그인 활성화

- [ ] **제품 설정** → **카카오 로그인**
- [ ] **활성화 설정** → **ON**

---

## 3. Redirect URI

- [ ] **카카오 로그인** 화면에서 **Redirect URI** 등록
- [ ] 아래 중 사용하는 것만 추가 (예시)
  - AUTUS API: `https://api.autus-ai.com/integration/callback/kakao`
  - 올댓/온리쌤 등: 실제 백엔드 callback URL (예: `https://api.xxx.com/auth/kakao/callback`)
  - 로컬: `http://localhost:3000/auth/kakao/callback` (개발 시)

---

## 4. 동의항목

- [ ] **제품 설정** → **카카오 로그인** → **동의항목**
- [ ] 필요한 항목 **필수 동의** 또는 **선택 동의**로 설정
  - 예: 닉네임, 프로필 사진, 카카오계정(이메일)

---

## 5. 저장

- [ ] 각 화면에서 **저장** 버튼 눌러 반영 확인

---

## 참고

- OAuth 전체 가이드: `docs/OAUTH_SETUP_GUIDE.md` (6. 카카오 OAuth 앱 설정)
- 앱 키(REST API 키 등)는 **앱 설정** → **앱 키**에서 확인 후 백엔드 `.env`에 설정

---

## Android 키 해시

카카오 콘솔 **플랫폼 → Android** 에서 키 해시 등록할 때 사용.

**디버그 (로컬/개발 빌드):**
```bash
keytool -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore -storepass android | openssl dgst -sha1 -binary | openssl base64
```
→ 예시 결과: `cEd2RUK6i9TouHMP/jgMQcB2q7Y=` (기기/맥마다 다를 수 있음. 본인 환경에서 한 번 더 실행해 넣기.)

**릴리즈 (EAS 빌드):**
```bash
eas credentials -p android
```
→ Keystore / 키 해시 확인 후, 카카오 콘솔 Android 플랫폼에 **릴리즈 키 해시** 추가.
