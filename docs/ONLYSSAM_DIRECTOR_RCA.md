# /onlyssam/director 접근 불가 — 원인 분석 (RCA)

**분석일:** 2026-02-25  
**증상:** super_admin 권한임에도 `/onlyssam/director` 페이지 접근 불가

---

## 1. 요약

| 구분 | 결론 |
|------|------|
| **근본 원인** | `/onlyssam/director` 라우트가 **코드베이스에 존재하지 않음** |
| **2차 원인** | `super_admin` 역할이 이 코드베이스의 권한 체계에 정의되어 있지 않음 |

---

## 2. 상세 분석

### 2-1. 라우팅 구조

**vercel.json 기준 배포:**
```
/api/*     → vercel-api (Next.js)
/*         → kraton-v2/index.html (Vite SPA)
```

- 경로 `/onlyssam`, `/onlyssam/director` 등은 **vercel-api** (Next.js)로 라우팅됨.
- (이전) kraton-v2는 해시 기반 라우팅 사용 → 2026-02 kraton 제거, vercel-api로 통합.
  - `#allthatbasket`, `#autus-ai`, `#coach`, `#dashboard` 등
  - **pathname 기반** `/onlyssam/*` 처리는 코드에 없음.

### 2-2. onlyssam 라우트 현황 (문서 vs 코드)

**문서(AUTUS_SYSTEM_REPORT, CODE_DIRECTIVE) 상:**
| 라우트 | 문서 상태 |
|--------|----------|
| `/onlyssam` | OK |
| `/onlyssam/students` | OK |
| `/onlyssam/attendance` | OK |
| `/onlyssam/schedule` | OK |
| `/onlyssam/billing` | OK |
| `/onlyssam/more` | 404 (미구현) |
| `/onlyssam/director` | **문서에 없음** |

**실제 코드베이스 검색 결과:**
- `/onlyssam/director`: **참조 없음**
- `onlyssam` pathname 처리: **없음**
- hash 라우트만 존재 (`#allthatbasket` → AllThatBasketApp)

### 2-3. 권한·역할 체계

**코드에 정의된 역할:**
- `app_members.role`: `owner`, `director`, `teacher`, `staff`, `parent`, `student`
- kraton-v2 INTERNAL_ROLES: `c_level`, `fsd`, `optimus`, `consumer`
- **`super_admin`**: 이 프로젝트 코드베이스에 정의 없음 (Clerk 등 외부 IdP 용어 가능)

**director의 의미:**
- DB/app_members: `director` = 실장/부원장
- 문서: owner/director/teacher 등 학원 조직 역할로 사용

### 2-4. 구현 위치

| 구성요소 | 위치 | 비고 |
|---------|------|------|
| onlyssam 네비게이션 카드 | `vercel-api/components/onlyssam/NavigationCard.tsx` | 목표 나침반 UI만 |
| onlyssam API | `vercel-api/app/api/growth/session/` 등 | URL 생성 시 `/onlyssam/consultation` 참조 |
| onlyssam 서비스 | `frontend/src/services/onlyssam.ts` | getDashboardStats, fetchStudents 등 |
| **onlyssam 페이지 라우트** | **미확인** | `src/app/onlyssam/` 구조는 CODE_DIRECTIVE에만 있고 실제 파일 없음 |

---

## 3. 원인 정리

### 3-1. 1순위: 라우트 미구현

`/onlyssam/director` 페이지가 **한 번도 구현되지 않음**.

- kraton-v2: hash만 사용, pathname 기반 라우팅 없음
- vercel-api: `app/` 하위에 `onlyssam/` 디렉터리 없음
- frontend: onlyssam 전용 App Router 구조 없음

### 3-2. 2순위: 배포와 문서 불일치 가능성

- AUTUS_SYSTEM_REPORT 등에서 `/onlyssam` “OK”로 되어 있으나, **실제 서빙 위치가 이 리포와 다를 수 있음**
- 별도 Vercel 프로젝트, 다른 브랜치, 다른 리포에서만 `/onlyssam`이 구현되었을 가능성 존재

### 3-3. 3순위: 권한 매핑

- `super_admin`은 이 코드베이스 권한 모델에 없음
- director 페이지가 있더라도, `super_admin` → director 접근 매핑은 **구현·설정되지 않은 상태**

---

## 4. 권장 조치

1. **라우트 신규 구현**  
   - kraton-v2 또는 해당하는 프론트에 `/onlyssam/director` 페이지 및 라우트 추가
   - 또는 vercel-api(Next.js)에 `app/onlyssam/director/page.tsx` 형태로 구현

2. **권한 정의**  
   - `super_admin`이 어느 시스템(Clerk, Supabase RLS, 커스텀 미들웨어 등)에서 오는지 확인
   - director 페이지 접근 규칙에 `super_admin` 포함 여부 결정 후, 해당 시스템에 반영

3. **임시 우회**  
   - director 전용 대시보드가 없으므로, `/onlyssam` 또는 `#allthatbasket`의 분석/대시보드에서 매출·출석 등 지표 확인

---

## 5. 해결 완료 (2026-02-25)

**구현 내용:**
- vercel-api app/onlyssam/director/page.tsx → / 리다이렉트 (kraton 제거 후)
- `pathname === '/onlyssam'` 또는 `pathname.startsWith('/onlyssam/')`일 때 `AllThatBasketAppV2` 렌더링
- `popstate` 리스너로 브라우저 뒤로가기/앞으로가기 지원

**접근 URL:** `https://autus-ai.com/onlyssam` 또는 `https://autus-ai.com/onlyssam/director`

**super_admin:** 이 프로젝트 권한 모델에 정의되지 않음. 클라이언트 SPA이므로 별도 권한 체크 없이 접근 가능.

---

## 6. 참고

- CODE_DIRECTIVE: `src/app/onlyssam/more/page.tsx` 생성 예정(현재 미구현)
- `director`는 `app_members.role` 및 `vercel-api` 일부 API에서 “실장/부원장” 역할로 사용됨
