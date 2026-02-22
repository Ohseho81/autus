# 온리쌤 연동 구조 (확정 v1)

> 25개 → 14개. 관리 포인트 44% 감소.
> 원칙: 하나의 서비스가 여러 역할 → 연동 수 최소화

---

## 확정 연동 목록 (14개)

| # | 서비스 | 역할 | Phase | 직원 가능 |
|---|--------|------|-------|-----------|
| 1 | 카카오 로그인 | 인증 + 전화번호 + 프로필 | 1 | ✅ |
| 2 | Apple Sign In | iOS 필수 대체 로그인 | 1 | ❌ |
| 3 | Supabase | DB + Auth + Storage + CDN + 로그 | 1 | ✅ |
| 4 | App Store | iOS 배포 | 1 | - |
| 5 | Play Store | Android 배포 | 1 | ✅ |
| 6 | 카카오 알림톡 | 학부모 알림 (출석/성장/수납) | 1 | ✅ |
| 7 | Firebase (FCM) | 코치 푸시 알림 | 1 | ❌ |
| 8 | 결제선생 | 수납 + 청구 + 세금계산서 | 1 | ✅ |
| 9 | YouTube API | 수업 영상 저장/재생 | 1 | ✅ |
| 10 | Notion API | 텍스트 로그/문서 | 1 | ✅ |
| 11 | Vercel | 웹 리포트 호스팅 | 1 | ❌ |
| 12 | 도메인 (onlyssam.com) | 웹 주소 | 1 | ✅ |
| 13 | Anthropic API | AI 성장 리포트 | 2 | ❌ |
| 14 | Sentry | 에러 모니터링 + 사용 분석 | 2 | ❌ |

---

## 핵심 구조

```
인증:    카카오 + Apple (2개)
DB:      Supabase (DB + Storage + Auth + 로그)
알림:    카카오 알림톡 (학부모) + FCM (코치)
결제:    결제선생
미디어:  영상 = YouTube, 사진 = Supabase Storage
로그:    텍스트 = Notion, 행동 = Supabase action_logs
AI:      Anthropic
```

---

## 제거된 서비스 (11개)

| 서비스 | 제거 이유 | 대체 |
|--------|-----------|------|
| NHN SMS | 알림톡이면 충분, SMS 거의 안 씀 | 카카오 알림톡 |
| Cloudinary | Supabase Storage + CDN으로 충분 | Supabase Storage |
| Resend (이메일) | 학부모는 카톡만 봄 | 카카오 알림톡 |
| Google Calendar | 앱 내 스케줄로 충분 | 앱 내 lesson_slots |
| Google Sheets | Supabase CSV 내보내기로 충분 | Supabase DB 뷰 |
| Branch.io | 알림톡 링크로 앱 열기 가능 | 카카오 알림톡 링크 |
| PASS 본인인증 | 카카오 로그인 시 전화번호 수집 가능 | 카카오 동의항목 |
| 카카오맵 | Phase 1~2에 불필요 | 텍스트 주소 |
| 팝빌 | 결제선생이 세금계산서 포함 | 결제선생 |
| Mixpanel | Supabase action_logs + Sentry로 충분 | Supabase action_logs |

---

## 카카오 + Supabase 설정 체크리스트

### STEP 1: 카카오톡 채널 (center.kakao.com)
- [x] 채널 확인/생성 (온리쌤)
- [ ] 비즈니스 채널 인증 신청 (승인 대기 중)

### STEP 2: 카카오 개발자 앱 (developers.kakao.com)
- [ ] REST API 키 복사 (앱 ID: 1384323)
- [ ] Client Secret 생성 + 복사
- [ ] Web 도메인 등록: `https://pphzvnaedmzcvpxjulti.supabase.co`
- [ ] Redirect URI 추가: `https://pphzvnaedmzcvpxjulti.supabase.co/auth/v1/callback`
- [ ] 비즈 앱 전환 + 채널 연결
- [ ] 동의항목: 이메일/전화번호 선택 동의 ON
- [ ] 카카오톡 채널 연결

### STEP 3: Supabase 카카오 Provider
- [ ] Authentication → Providers → Kakao ON
- [ ] Client ID (REST API 키) 입력
- [ ] Client Secret 입력
- [ ] Callback URL 확인

### STEP 4: Storage Buckets
- [ ] avatars (Public) — 프로필 이미지
- [ ] growth-media (Private) — 수업 사진/영상
- [ ] academy-assets (Private) — 학원 로고/문서

---

*확정일: 2026-02-11*
