# 폴더 통합 완료 — 2026-02-12

## 확정: 올댓바스켓/ = 온리쌤 메인 프로젝트

| 항목 | 올댓바스켓/ (메인) |
|------|------------------|
| Bundle ID | com.allthatbasket.academy |
| Slug | ssam |
| Scheme | onlyssam (추가됨) |
| Supabase | pphzvnaedmzcvpxjulti |
| EAS ProjectId | dadd6a08-5e51-4251-a125-076b24759755 |
| ascAppId | 6758763718 |
| Migrations | 25개 |
| Build Number | iOS 5 / Android 5 |
| Owner | autus |

## 완료된 작업

1. **올댓바스켓에 인프라 이식** (allthatbasket에서 가져옴)
   - jest.config.js + jest.setup.ts (테스트 환경)
   - @testing-library/react-native, jest-expo (테스트 패키지)
   - src/__tests__/ (authStore, supabaseClient 테스트)
   - .github/workflows/ci.yml (GitHub Actions CI/CD)
   - src/lib/sentry.ts (에러 모니터링 래퍼)

2. **올댓바스켓 설정 수정**
   - package.json name: allthatbasket-academy → onlyssam
   - app.json: scheme "onlyssam" 추가 (카카오 OAuth 필수)
   - 빈 store/, stores/ 디렉토리 삭제
   - 빌드/배포 스크립트 추가 (build:ios, submit:ios 등)

3. **allthatbasket 아카이브**
   - allthatbasket/ → _archive_allthatbasket/ 이동
   - 참고용으로만 보존

## 현재 폴더 구조

```
autus/
├── 올댓바스켓/          ← 온리쌤 메인 프로젝트
│   ├── .github/workflows/ci.yml
│   ├── src/
│   │   ├── __tests__/   ← NEW
│   │   ├── lib/sentry.ts ← NEW
│   │   ├── components/ (30)
│   │   ├── screens/ (25)
│   │   ├── services/ (15)
│   │   └── ...
│   ├── supabase/migrations/ (25)
│   ├── jest.config.js    ← NEW
│   ├── jest.setup.ts     ← NEW
│   └── eas.json
├── _archive_allthatbasket/  ← 아카이브 (참고용)
├── docs/
│   ├── ONLYSSAM_INTEGRATIONS.md
│   └── FOLDER_CONSOLIDATION.md
├── onlyssam_v2_definition.docx
└── onlyssam_architecture.html
```

## 로컬에서 할 일

```bash
# 1. 테스트 패키지 설치
cd ~/Desktop/autus/올댓바스켓
npm install

# 2. 테스트 실행 확인
npm test

# 3. Sentry 설치 (선택)
npx expo install @sentry/react-native
```
