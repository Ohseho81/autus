# 올댓바스켓/온리쌤 Supabase 데이터 연동 가이드

데이터가 0으로 보일 때 확인할 사항입니다.

## 1. 환경변수 설정

### kraton-v2 (웹)
`kraton-v2/.env` 생성:
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### mobile-app (모바일/온리캠)
`mobile-app/.env` 생성:
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# atb_* 스키마 강제 사용 (올댓바스켓 데이터)
EXPO_PUBLIC_USE_ATB_SCHEMA=true
```

### frontend (온리쌤 페이지)
`frontend/.env`:
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 2. Supabase 스키마 적용

`supabase/migrations/001_allthatbasket_complete.sql` 실행 필요.

- Supabase Dashboard → SQL Editor에서 파일 내용 붙여넣기 후 실행
- 또는 `supabase db push` (마이그레이션 히스토리 일치 시)

필수 테이블/뷰: `atb_students`, `atb_classes`, `atb_payments`, `atb_attendance`, `atb_student_dashboard`, `atb_monthly_payments`, `atb_today_attendance`

## 3. 데이터 확인

Supabase Table Editor에서:
- `atb_students`에 학생 데이터 있는지
- `atb_payments`에 결제 데이터 있는지
- `atb_attendance`에 출석 데이터 있는지

## 4. 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| 모두 0 | env 미설정 | .env 파일 확인, 서버 재시작 |
| 모두 0 | atb_* 미생성 | 001_allthatbasket_complete.sql 실행 |
| 모두 0 | RLS 차단 | Supabase RLS 비활성화 또는 정책 수정 |
| 모바일만 0 | 기존 스키마 사용 | EXPO_PUBLIC_USE_ATB_SCHEMA=true 추가 |
