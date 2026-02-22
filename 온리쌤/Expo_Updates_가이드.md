# 📱 Expo Updates 가이드 - 앱 기능 업데이트

> **완성!** 앱에서 JavaScript 코드를 앱스토어 재배포 없이 업데이트할 수 있습니다.

---

## 🎯 개요

### 추가된 기능
- **앱 업데이트 확인**: 설정 → 시스템 관리 → "앱 업데이트 확인"
- **자동 업데이트**: 앱 시작 시 자동으로 최신 버전 확인 및 다운로드
- **수동 업데이트**: 버튼 클릭으로 언제든 업데이트 가능

### 업데이트 가능한 것
- ✅ JavaScript 코드 (React Native)
- ✅ UI 변경 (화면, 컴포넌트)
- ✅ 새로운 기능 추가
- ✅ 버그 수정
- ✅ 비즈니스 로직 변경

### 업데이트 불가능한 것
- ❌ 네이티브 모듈 (iOS/Android 코드)
- ❌ 앱 권한 추가 (카메라, 위치 등)
- ❌ SDK 버전 변경
- ❌ 새로운 네이티브 라이브러리 추가

---

## 🔧 설정 확인

### 1. app.json 설정 (이미 완료 ✅)
```json
{
  "expo": {
    "runtimeVersion": {
      "policy": "sdkVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/dadd6a08-5e51-4251-a125-076b24759755",
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 3000
    },
    "plugins": [
      ["expo-updates", { "username": "autus" }]
    ]
  }
}
```

### 2. updateService.ts (이미 완료 ✅)
- 업데이트 확인: `checkForUpdates()`
- 업데이트 다운로드 및 적용: `downloadAndApplyUpdate()`
- 버전 정보: `getVersionInfo()`

### 3. SettingsScreen 버튼 (이미 완료 ✅)
```
🔧 시스템 관리
├── 📥 앱 업데이트 확인      [NEW]
├── 🔄 데이터베이스 업데이트
└── 📊 시스템 상태
```

---

## 🚀 업데이트 배포 방법

### 방법 1: EAS Update (권장)

**1단계: EAS CLI 설치**
```bash
npm install -g eas-cli
```

**2단계: 로그인**
```bash
eas login
```

**3단계: 업데이트 배포**
```bash
# 코드 수정 후
eas update --branch production --message "버그 수정: 출석 체크 오류 해결"
```

**옵션:**
- `--branch production`: 프로덕션 채널
- `--branch preview`: 미리보기 채널
- `--branch development`: 개발 채널
- `--message`: 업데이트 설명 (필수)

**4단계: 확인**
- Expo Dashboard: https://expo.dev/accounts/autus/projects/ssam/updates
- 배포 후 **즉시 반영** (앱 재시작 시)

---

### 방법 2: EAS Build + Update (앱스토어 배포용)

**프로덕션 빌드 후 업데이트:**
```bash
# 1. 프로덕션 빌드
eas build --platform all --profile production

# 2. 앱스토어 제출

# 3. 이후 코드 수정 시
eas update --branch production --message "기능 추가: 결제 알림"
```

---

## 🧪 테스트 방법

### 테스트 1: 개발 모드 (Dev)
**목적:** 개발 중 업데이트 불가 확인

**절차:**
1. `npm start` (개발 모드)
2. 앱 실행 → 설정 → 시스템 관리
3. "앱 업데이트 확인" 클릭

**예상 결과:**
```
알림
개발 모드에서는 업데이트를 확인할 수 없습니다.
```

---

### 테스트 2: Preview 빌드 업데이트

**목적:** 실제 업데이트 프로세스 테스트

**절차:**

**Step 1: Preview 빌드**
```bash
# 1. 빌드 생성
eas build --platform android --profile preview

# 2. 빌드 완료 후 APK 다운로드 및 설치
```

**Step 2: 코드 수정**
```typescript
// 예: SettingsScreen.tsx
{
  id: 'version',
  label: '버전',
  value: 'v1.0.1', // v1.0.0 → v1.0.1 변경
  type: 'value',
  icon: 'information-circle-outline',
},
```

**Step 3: 업데이트 배포**
```bash
eas update --branch preview --message "버전 표시 수정"
```

**Step 4: 앱에서 확인**
1. 앱 실행
2. 설정 → 시스템 관리 → "앱 업데이트 확인"
3. "업데이트 가능" 다이얼로그 확인
4. "업데이트" 클릭
5. 앱 자동 재시작
6. 설정 → 앱 정보 → 버전: v1.0.1 확인

**예상 결과:**
```
업데이트 가능
새로운 버전이 있습니다!

현재 버전: <old-update-id>
최신 버전: <new-update-id>

업데이트를 다운로드하고 적용하시겠습니까?
(앱이 자동으로 재시작됩니다)

[취소] [업데이트]
```

---

### 테스트 3: 자동 업데이트 (앱 시작 시)

**목적:** 앱 시작 시 자동 업데이트 확인

**절차:**
1. 코드 수정
2. `eas update --branch preview`
3. 앱 완전 종료 (백그라운드에서도 제거)
4. 앱 재실행

**예상 동작:**
- 앱이 시작되면서 백그라운드에서 업데이트 확인
- 업데이트 있으면 자동 다운로드
- 다음 앱 재시작 시 자동 적용

---

### 테스트 4: 이미 최신 버전인 경우

**목적:** 최신 버전일 때 메시지 확인

**절차:**
1. 업데이트 없이 "앱 업데이트 확인" 클릭

**예상 결과:**
```
최신 버전
이미 최신 버전을 사용 중입니다.

앱 버전: 1.0.0
Update ID: <update-id>
채널: preview
```

---

## 📊 업데이트 모니터링

### Expo Dashboard
https://expo.dev/accounts/autus/projects/ssam/updates

**확인 가능 정보:**
- 배포된 업데이트 목록
- 브랜치별 업데이트 (production, preview, development)
- 업데이트 다운로드 수
- 적용률 (사용자 수)
- 에러율

### Event Ledger (Supabase)
```sql
-- 앱 업데이트 이력
SELECT
  created_at,
  entity_id,
  metadata->>'platform' as platform,
  metadata->>'update_id' as update_id,
  metadata->>'success' as success
FROM event_ledger
WHERE event_type = 'system_update'
  AND metadata->>'type' = 'app_update'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 🔄 업데이트 시나리오

### 시나리오 1: 긴급 버그 수정

**상황:** 출석 체크 시 앱이 크래시하는 버그 발견

**대응:**
```bash
# 1. 버그 수정
# src/screens/v2/CoachHomeScreen.tsx 수정

# 2. 즉시 배포
eas update --branch production --message "긴급 수정: 출석 체크 크래시 버그"

# 3. 5분 이내 모든 사용자에게 반영
```

---

### 시나리오 2: 새 기능 추가 (단계적 배포)

**상황:** 새로운 결제 알림 기능 추가

**대응:**
```bash
# 1. 개발 완료 후 미리보기 배포
eas update --branch preview --message "새 기능: 결제 알림"

# 2. 테스터들 확인 (preview 빌드 사용자)

# 3. 문제 없으면 프로덕션 배포
eas update --branch production --message "새 기능: 결제 알림"
```

---

### 시나리오 3: A/B 테스트

**상황:** 두 가지 UI 버전 테스트

**대응:**
```bash
# 1. 버전 A 배포 (50% 사용자)
eas update --branch production-a --message "UI 버전 A"

# 2. 버전 B 배포 (50% 사용자)
eas update --branch production-b --message "UI 버전 B"

# 3. 성과 측정 후 최종 버전 선택
eas update --branch production --message "최종 UI (버전 A 기반)"
```

---

## 🐛 트러블슈팅

### 문제 1: "업데이트를 확인할 수 없습니다"

**원인:** 개발 모드에서 실행

**해결:**
- EAS Build로 빌드된 앱 사용
- `__DEV__` 모드가 아닌지 확인

---

### 문제 2: 업데이트가 적용되지 않음

**원인 1:** 앱이 완전히 재시작되지 않음

**해결:**
```typescript
// 강제 재시작
await Updates.reloadAsync();
```

**원인 2:** runtimeVersion 불일치

**확인:**
```bash
# 현재 runtimeVersion
expo config --type public | grep runtimeVersion
```

**해결:**
- 네이티브 코드 변경 시 새 빌드 필요
- `eas build` 다시 실행

---

### 문제 3: "Already up to date"

**원인:** 이미 최신 버전

**확인:**
```bash
# Expo Dashboard에서 최신 업데이트 확인
open https://expo.dev/accounts/autus/projects/ssam/updates
```

---

### 문제 4: 업데이트 다운로드 실패

**원인:** 네트워크 오류 또는 서버 문제

**로그 확인:**
```typescript
// updateService.ts에서 에러 로그 확인
console.error('[UpdateService] Failed to download update:', error);
```

**해결:**
- 네트워크 연결 확인
- Expo 서버 상태 확인: https://status.expo.dev
- 재시도

---

## 📋 체크리스트

### 개발자
- [ ] 코드 수정 완료
- [ ] 로컬 테스트 완료
- [ ] `eas update` 명령 실행
- [ ] Expo Dashboard에서 배포 확인
- [ ] Event Ledger에서 사용자 업데이트 확인

### 사용자
- [ ] 앱 시작 시 자동 업데이트 (자동)
- [ ] 또는 설정에서 수동 업데이트
- [ ] 업데이트 후 앱 재시작
- [ ] 새 기능/버그 수정 확인

---

## 🎯 베스트 프랙티스

### 1. 명확한 메시지
```bash
# 좋은 예
eas update --message "버그 수정: 출석 체크 시 앱 크래시 (고객 보고 #124)"

# 나쁜 예
eas update --message "fix"
```

### 2. 브랜치 전략
- `production`: 프로덕션 사용자 (앱스토어 빌드)
- `preview`: 내부 테스터 (Preview 빌드)
- `development`: 개발팀 (Dev Client)

### 3. 업데이트 주기
- **긴급 버그**: 즉시
- **신규 기능**: 주 1회
- **마이너 개선**: 2주 1회

### 4. 테스트
- Preview 브랜치에서 먼저 테스트
- 최소 1시간 모니터링 후 Production 배포

---

## 💰 비용

**Expo Updates: 무료**
- 무제한 업데이트
- 무제한 다운로드
- 무제한 사용자

**EAS Build (선택):**
- Free: 30 builds/월
- Production: $29/월 (무제한)

---

## 📚 참고 자료

- Expo Updates 공식 문서: https://docs.expo.dev/versions/latest/sdk/updates/
- EAS Update 가이드: https://docs.expo.dev/eas-update/introduction/
- Expo Dashboard: https://expo.dev/accounts/autus/projects/ssam

---

## ✅ 완료!

**앱 기능 업데이트 시스템이 완성되었습니다!**

이제 다음이 가능합니다:
- ✅ 앱스토어 재배포 없이 코드 업데이트
- ✅ 긴급 버그 수정 즉시 배포
- ✅ 새 기능 단계적 배포
- ✅ A/B 테스트
- ✅ 앱 내에서 수동 업데이트 확인

**다음 업데이트 배포:**
```bash
# 코드 수정 후
eas update --branch production --message "당신의 업데이트 메시지"
```

**생성일:** 2026-02-14
**버전:** v1.0
**작성자:** Claude Sonnet 4.5 (Cowork Mode)
