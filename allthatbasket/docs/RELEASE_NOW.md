# 지금 출시하기 (온리쌤)

EAS 프로젝트는 이미 연결되어 있습니다. **로컬 터미널**에서 아래만 실행하면 됩니다.

---

## 1. 터미널에서 실행

```bash
cd /Users/oseho/Desktop/autus/allthatbasket
./scripts/release.sh
```

**이전에 iOS 빌드가 "Install pods"에서 실패했다면** 한 번 캐시를 지우고 빌드하세요:

```bash
cd /Users/oseho/Desktop/autus/allthatbasket
npx eas-cli build --platform ios --profile production --clear-cache
```

또는 단계별로:

```bash
cd /Users/oseho/Desktop/autus/allthatbasket

# iOS 빌드 (첫 실행 시 Apple ID 로그인·인증서 생성)
# Pod 설치 실패 시: --clear-cache 추가
npx eas-cli build --platform ios --profile production

# Android 빌드 (첫 실행 시 Keystore 생성 시 Y)
npx eas-cli build --platform android --profile production
```

- **iOS**: "Do you want to log in to your Apple account?" → **Y** 입력 후 Apple ID 로그인
- **Android**: Keystore 생성 물음 → **Y** (Expo가 자동 생성)

빌드는 Expo 클라우드에서 진행됩니다. 완료까지 약 10~20분 소요됩니다.

---

## 2. 빌드 상태 확인

- https://expo.dev/accounts/ohseho/projects/onlysam/builds

---

## 3. 빌드 완료 후 스토어 제출

### eas.json 수정 (한 번만)

`eas.json` → `submit.production.ios` 에 본인 정보 입력:

- `appleId`: Apple ID 이메일
- `ascAppId`: App Store Connect 앱 ID (숫자)
- `appleTeamId`: Apple Team ID (10자)

### 제출 명령

```bash
# iOS (앱스토어)
npm run submit:ios

# Android (플레이스토어, google-service-account.json 필요 시)
npm run submit:android
```

---

## 요약

| 단계 | 명령 | 비고 |
|------|------|------|
| 1 | `./scripts/release.sh` | 터미널에서 실행, Apple/Keystore 입력 |
| 2 | expo.dev 빌드 페이지에서 완료 대기 | 10~20분 |
| 3 | `eas.json` submit 값 수정 | Apple ID, ascAppId, teamId |
| 4 | `npm run submit:ios` / `submit:android` | 스토어 제출 |

이미 진행하신 부분이 있으면 해당 단계부터 이어서 하시면 됩니다.
