# autus-ai.com Supabase 연결 가이드

autus-ai.com 사이트가 Supabase(올댓바스켓 atb_* 데이터)에 연결되도록 설정하는 방법입니다.

## 1. 배포 구조

| 구성요소 | 역할 | Supabase 사용 |
|---------|------|---------------|
| **kraton-v2** | autus-ai.com 메인 앱 | `VITE_SUPABASE_*` (클라이언트) |
| **vercel-api** | /api/* 백엔드 | `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` |

## 2. Vercel 환경변수 설정

Vercel Dashboard → 프로젝트 → **Settings** → **Environment Variables**에서 추가:

### kraton-v2 빌드용 (필수)
| 변수명 | 값 | 적용 환경 |
|--------|-----|----------|
| `VITE_SUPABASE_URL` | `https://dcobyicibvhpwcjqkmgw.supabase.co` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key (공개 키) | Production, Preview |

### vercel-api용 (선택 - API에서 DB 접근 시)
| 변수명 | 값 | 적용 환경 |
|--------|-----|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dcobyicibvhpwcjqkmgw.supabase.co` | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (비공개, 서버 전용) | Production, Preview |

## 3. Supabase 키 확인

1. [Supabase Dashboard](https://supabase.com/dashboard) → 프로젝트 `dcobyicibvhpwcjqkmgw` (Ohseho81's Project) 선택
2. **Settings** → **API**
3. **Project URL**: `VITE_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`에 입력
4. **anon public**: `VITE_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력
5. **service_role**: `SUPABASE_SERVICE_ROLE_KEY`에 입력 (API 서버용)

## 4. 배포 반영

환경변수 추가/수정 후:
- **Redeploy** 실행 (Deployments → … → Redeploy)
- 또는 새 커밋 푸시

## 5. 연결 확인

배포 완료 후:
- autus-ai.com 접속 → 올댓바스켓/온리쌤 화면에서 KPI·학생 데이터 표시되는지 확인
- API 헬스체크: `https://autus-ai.com/api/health/supabase` (설정되어 있다면)

## 6. 배포 실행 (선택)

로컬에서 배포하려면:
```bash
# Vercel CLI 로그인 후
vercel --prod

# 또는 Git 푸시로 트리거 (Vercel ↔ GitHub 연동된 경우)
git push origin main
```

## 7. 다른 Supabase 프로젝트 사용 시

atb_* 데이터가 **다른 Supabase 프로젝트**에 있다면, 해당 프로젝트의 URL과 Anon Key를 사용하세요.

> ⚠️ `dcobyicibvhpwcjqkmgw`(Ohseho81)와 `pphzvnaedmzcvpxjulti`는 서로 다른 프로젝트입니다.  
> atb_* 마이그레이션(`supabase/migrations/001_allthatbasket_complete.sql`)을 실행한 프로젝트의 URL·키를 사용하세요.
