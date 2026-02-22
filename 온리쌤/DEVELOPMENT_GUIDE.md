# 🛠️ 온리쌤 실시간 개발 환경 가이드

## 🎯 목표
코드 변경 후 **실시간으로** 스마트폰에서 확인하기 (Hot Reload)

---

## 📱 현재 상황 vs 목표

| 현재 (TestFlight) | 목표 (Development Build) |
|------------------|-------------------------|
| ❌ 코드 수정 후 빌드 필요 | ✅ 코드 수정 즉시 반영 |
| ❌ 20-30분 빌드 시간 | ✅ 1-2초 Hot Reload |
| ❌ 프로덕션 환경만 | ✅ 개발 도구 접근 가능 |

---

## 🚀 빠른 시작 (3단계)

### **1단계: Development Build 생성**

```bash
cd 온리쌤

# iOS Development Build
npx eas build --platform ios --profile dev

# Android Development Build
npx eas build --platform android --profile dev
```

⏱️ **예상 시간**: 15-20분 (한 번만 하면 됨)

---

### **2단계: 개발용 앱 설치**

#### **iOS (TestFlight 또는 직접 설치)**
빌드 완료 후 EAS에서 제공하는 링크 클릭:
1. 다운로드 링크가 이메일로 전송됨
2. 아이폰에서 링크 열기
3. "Install" 클릭

#### **Android (APK 다운로드)**
1. EAS 빌드 완료 후 APK 다운로드
2. 안드로이드에서 APK 설치

---

### **3단계: 실시간 개발 시작**

```bash
cd 온리쌤

# 개발 서버 시작
npx expo start --dev-client

# QR 코드가 터미널에 표시됨
```

#### **스마트폰에서:**
1. 설치한 개발용 앱 실행
2. "Enter URL manually" 클릭
3. 터미널에 표시된 URL 입력
   - 예: `exp://192.168.0.10:8081`

✅ **완료!** 이제 코드 수정 시 자동으로 앱에 반영됩니다.

---

## 🔥 Hot Reload 사용법

### **자동 새로고침**
- `.tsx`, `.ts` 파일 저장 → 1-2초 후 자동 반영
- 빠른 반복 테스트 가능

### **수동 새로고침**
- 스마트폰에서 앱 흔들기 (Shake) → Developer Menu
- "Reload" 클릭

---

## 📋 eas.json 확인

Development Build 프로필이 이미 설정되어 있습니다:

```json
{
  "build": {
    "dev": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    }
  }
}
```

---

## 🐛 문제 해결

### **"Unable to resolve module"**
```bash
# 캐시 삭제
npx expo start --dev-client --clear

# 노드 모듈 재설치
rm -rf node_modules
npm install
```

### **네트워크 연결 문제**
- PC와 스마트폰이 **같은 Wi-Fi**에 연결되어 있는지 확인
- 방화벽 설정 확인 (포트 8081 열기)

### **빌드 실패**
```bash
# EAS CLI 업데이트
npm install -g eas-cli

# 다시 빌드
npx eas build --platform ios --profile dev --clear-cache
```

---

## ⚡ 추가 개발 팁

### **React Native Debugger**
```bash
# Chrome DevTools 사용
Developer Menu → "Debug JS Remotely"
```

### **로그 확인**
```bash
# iOS 로그
npx react-native log-ios

# Android 로그
npx react-native log-android
```

---

## 🎉 완료!

이제 코드를 수정하고 저장하면 1-2초 내에 스마트폰에서 변경사항을 확인할 수 있습니다!

**다음 작업:**
1. ✅ Development Build 생성 및 설치
2. ✅ 개발 서버 시작 (`npx expo start --dev-client`)
3. ✅ 코드 수정 → 자동 반영 확인
4. 🚀 빠른 개발 사이클 시작!

---

*마지막 업데이트: 2026-02-13*
