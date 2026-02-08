# 온리쌤 앱스토어 / 플레이스토어 제출 가이드

## 사전 준비

### 1. Apple Developer (iOS)
- [Apple Developer Program](https://developer.apple.com/programs/) 가입 (연 $99)
- App Store Connect에서 앱 생성 후 **App ID** 확인
- **Team ID**, **Bundle ID** (`kr.onlysam.app`) 일치 확인

### 2. Google Play (Android)
- [Google Play Console](https://play.google.com/console) 개발자 등록 (일회 $25)
- 서비스 계정 JSON 키 발급 (EAS Submit용)

### 3. Expo / EAS
- [Expo](https://expo.dev) 계정 생성
- EAS CLI 설치: `npm i -g eas-cli`
- 로그인: `eas login`

---

## 1. EAS 프로젝트 연결

```bash
cd allthatbasket
npm install
eas login
eas build:configure
```

- 첫 빌드 시 **Create a new project** 선택 시 `app.json`의 `extra.eas.projectId`가 자동 채워짐.
- 이미 프로젝트가 있으면: [expo.dev](https://expo.dev) → 프로젝트 설정에서 **Project ID** 복사 후 `app.json` → `expo.extra.eas.projectId`에 넣기.

---

## 2. iOS 앱스토어 빌드 & 제출

### 2.1 프로덕션 빌드

```bash
eas build --platform ios --profile production
```

- Apple Developer 계정으로 로그인하라는 창이 뜨면 로그인.
- **Credentials**: **Let EAS manage** 선택 권장 (자동 인증서/프로비저닝).

### 2.2 제출 (빌드 완료 후)

`eas.json`의 `submit.production.ios`에 본인 정보로 수정:

```json
"ios": {
  "appleId": "본인_애플ID_이메일",
  "ascAppId": "App Store Connect 앱 ID (숫자)",
  "appleTeamId": "Apple Team ID (10자)"
}
```

그 다음:

```bash
eas submit --platform ios --profile production --latest
```

- `--latest`: 방금 만든 iOS 빌드 사용.
- App Store Connect에서 **TestFlight** → 검수 후 **제출 for Review** 하면 앱스토어 노출.

---

## 3. Android 플레이스토어 빌드 & 제출

### 3.1 프로덕션 빌드

```bash
eas build --platform android --profile production
```

- AAB(Android App Bundle)가 생성됨.

### 3.2 제출

1. Google Play Console → **설정** → **API 액세스**에서 서비스 계정 생성.
2. 서비스 계정 키(JSON) 다운로드 → 프로젝트 루트에 `google-service-account.json`으로 저장.
3. `eas.json`의 `submit.production.android` 확인:

```json
"android": {
  "serviceAccountKeyPath": "./google-service-account.json",
  "track": "internal"
}
```

4. 제출:

```bash
eas submit --platform android --profile production --latest
```

- `track`: `internal`(내부 테스트) / `alpha` / `beta` / `production` 중 선택.

---

## 4. 추가 설정 (선택)

### 앱 아이콘 / 스플래시
- `assets/icon.png`: 1024×1024 (iOS), 1024×1024 (Android adaptive icon용)
- `assets/splash.png`: 1284×2778 권장
- `assets/adaptive-icon.png`: 1024×1024 (Android 전용)
- 추가 후 `app.json`의 `expo.icon`, `expo.splash.image`, `expo.android.adaptiveIcon.foregroundImage` 다시 지정.

### 버전 올리기
- `app.json`: `version` (예: "1.0.1"), `ios.buildNumber`, `android.versionCode` 증가.
- 또는 `eas build --auto-increment` 사용 (eas.json에 `autoIncrement: true` 있음).

---

## 5. 스크립트 (package.json)

이미 사용 가능한 명령어:

- `npm run ios` / `npm run android`: 로컬 실행
- EAS 빌드/제출은 위의 `eas build` / `eas submit` 사용

필요 시 예:

```json
"scripts": {
  "build:ios": "eas build --platform ios --profile production",
  "build:android": "eas build --platform android --profile production",
  "submit:ios": "eas submit --platform ios --profile production --latest",
  "submit:android": "eas submit --platform android --profile production --latest"
}
```

---

## 요약 체크리스트

- [ ] Expo 로그인 (`eas login`)
- [ ] `eas build:configure`로 EAS 프로젝트 연결
- [ ] iOS: Apple Developer 가입, App Store Connect에 앱 생성
- [ ] `eas build --platform ios --profile production`
- [ ] `eas.json`의 `submit.production.ios` 수정 후 `eas submit --platform ios --profile production --latest`
- [ ] Android: Play Console 등록, 서비스 계정 키 저장
- [ ] `eas build --platform android --profile production`
- [ ] `eas submit --platform android --profile production --latest`

이후 앱스토어/플레이스토어에서 각각 검수 완료되면 **온리쌤** 앱을 다운로드할 수 있습니다.
