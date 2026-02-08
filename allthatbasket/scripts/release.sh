#!/usr/bin/env bash
# 온리쌤 앱스토어/플레이스토어 출시 스크립트
# ⚠️ 반드시 로컬 터미널에서 실행하세요. (첫 실행 시 Apple/Android 인증 입력 필요)

set -e
cd "$(dirname "$0")/.."

echo "▶ EAS 로그인 확인..."
npx eas-cli whoami || { echo "먼저 npx eas-cli login 하세요."; exit 1; }

echo ""
read -p "iOS 빌드 제출할까요? [Y/n] " -n 1 -r; echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  echo "▶ iOS 빌드 (Apple 로그인 창이 뜨면 입력하세요)"
  npx eas-cli build --platform ios --profile production
fi

echo ""
read -p "Android 빌드 제출할까요? [Y/n] " -n 1 -r; echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  echo "▶ Android 빌드 (Keystore 생성 시 Y 입력)"
  npx eas-cli build --platform android --profile production
fi

echo ""
echo "✔ 빌드 상태: https://expo.dev/accounts/ohseho/projects/onlysam/builds"
echo "  완료 후 제출: npm run submit:ios  또는  npm run submit:android"
