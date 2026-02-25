# AUTUS 코드 지시서 — 2026-02-25 (v2 Updated)

> **대상:** Claude Code (⌨️ P1 Terminal Agent)
> **프로젝트:** autus-ai.com (Next.js 14+ / Vercel)
> **Supabase:** `pphzvnaedmzcvpxjulti` (ap-northeast-2)
> **Git:** `feature/⌨️-org-routing-fix` 브랜치에서 작업

## 진행 상태
| 항목 | 상태 | 비고 |
|------|------|------|
| P0-1 org 선택 로직 | ✅ 완료 | 라이브 검증 — 802명 데이터 정상 표시 |
| P0-2 org switcher UI | ✅ 완료 | 빌드 통과 |
| P1-1 온보딩 중복방지 (DB) | ✅ 완료 | `prevent_duplicate_org_creation` 트리거 설치 |
| P1-1 온보딩 중복방지 (프론트) | 🔲 미완 | `route.ts` 수정 필요 — 아래 참조 |
| P1-2 /onlyssam/more | 🔲 미완 | `page.tsx` 생성 + 배포 필요 — 아래 참조 |
| P1-3 notification_schedule | ✅ 완료 | 스키마 이미 일치, v4 정합성 검증 완료 |

---

## P0-1. 프론트엔드 org 선택 로직 수정

### 문제

Clerk user가 다중 조직에 소속되어 있을 때, 프론트엔드가 **학생이 0명인 올댓바스켓**을 선택하여 전체 대시보드가 빈 데이터로 렌더링됨.

### 현재 상태 (DB 기준)

```
app_members (active, Clerk user IDs)
┌──────────────────────────────────────┬────────────────────┬──────────┬─────────┐
│ user_id (Clerk)                      │ org_name           │ role     │students │
├──────────────────────────────────────┼────────────────────┼──────────┼─────────┤
│ user_39hJ1k6oB378zjN8sWfDCLHjAkR    │ 온리쌤 아카데미     │ director │ 802     │
│ user_3A9bVaMo6PWg3UKnbUoV2foaC7f    │ 올댓바스켓          │ director │ 0       │
│ user_3A9gGYlZDOqxyF2r4hzAo3SH2lV    │ 올댓바스켓          │ director │ 0       │
│ user_3A9NaweBHvIKYTNofaPP08a2r2x    │ 올댓바스켓          │ director │ 0       │
└──────────────────────────────────────┴────────────────────┴──────────┴─────────┘

organizations (정리 후 6개)
┌──────────────────────────────────────┬────────────────────┬──────────┬──────┬──────────┐
│ id                                   │ name               │ slug     │ tier │ students │
├──────────────────────────────────────┼────────────────────┼──────────┼──────┼──────────┤
│ 0219d7f2-5875-4bab-b921-f8593df126b8│ 온리쌤 아카데미     │ onlyssam │ pro  │ 802      │
│ edd8988b-14d6-4512-ba51-10e04e013711│ 테스트 학원         │ org-...  │ free │ 0        │
│ 7461b23d-ac9f-438f-8906-ab9f701d654b│ 올댓바스켓          │ org-...  │ free │ 0        │
│ 04df1b0b-555f-41bb-ad06-91337adc134b│ 올댓바스켓          │ org-...  │ free │ 0        │
│ e4291771-8a85-4aa7-bcf5-5411344473e8│ 올댓바스켓          │ org-...  │ free │ 0        │
│ a7f4789f-b619-4691-a6bc-3d213a6848e9│ 올댓바스켓          │ org-...  │ free │ 0        │
└──────────────────────────────────────┴────────────────────┴──────────┴──────┴──────────┘
```

### 수정 지시

**파일: `src/hooks/useAuth.ts` (또는 org 선택 로직이 있는 hook/context)**

현재 로직 (추정):
```typescript
// ❌ 현재: 첫 번째 active 멤버십을 무조건 선택
const { data: members } = await supabase
  .from('app_members')
  .select('*, organizations(*)')
  .eq('user_id', clerkUserId)
  .eq('is_active', true)
  .order('role', { ascending: true });

const currentOrg = members?.[0]?.organizations; // ← 잘못된 org 선택 가능
```

수정 로직 — **3단계 우선순위 기반 org 선택:**

```typescript
// ✅ 수정: URL slug → localStorage → 데이터 우선 순위
function selectOrganization(
  members: AppMember[],
  pathname: string
): Organization | null {
  if (!members?.length) return null;

  // 1단계: URL pathname에서 slug 매칭
  // /onlyssam/* → slug 'onlyssam' 인 org 선택
  const slugFromPath = extractSlugFromPath(pathname);
  if (slugFromPath) {
    const bySlug = members.find(m => m.organizations?.slug === slugFromPath);
    if (bySlug) return bySlug.organizations;
  }

  // 2단계: localStorage에 저장된 선호 org
  const savedOrgId = localStorage.getItem('autus_preferred_org');
  if (savedOrgId) {
    const bySaved = members.find(m => m.org_id === savedOrgId);
    if (bySaved) return bySaved.organizations;
  }

  // 3단계: tier가 높은 org 우선 (pro > free), 같으면 created_at 오래된 것
  const sorted = [...members].sort((a, b) => {
    const tierOrder: Record<string, number> = { pro: 0, basic: 1, free: 2 };
    const tierA = tierOrder[a.organizations?.tier || 'free'] ?? 99;
    const tierB = tierOrder[b.organizations?.tier || 'free'] ?? 99;
    if (tierA !== tierB) return tierA - tierB;
    return new Date(a.organizations?.created_at || 0).getTime()
         - new Date(b.organizations?.created_at || 0).getTime();
  });

  return sorted[0]?.organizations ?? null;
}

function extractSlugFromPath(pathname: string): string | null {
  // /onlyssam → 'onlyssam'
  // /onlyssam/students → 'onlyssam'
  // /facility → 'facility'
  const segments = pathname.split('/').filter(Boolean);
  const appSlugs = ['onlyssam', 'facility', 'factory'];
  return appSlugs.find(slug => segments[0] === slug) ?? null;
}
```

**Supabase 쿼리도 organizations 조인 필수:**
```typescript
const { data: members } = await supabase
  .from('app_members')
  .select('*, organizations(id, name, slug, type, status, tier, created_at)')
  .eq('user_id', clerkUserId)
  .eq('is_active', true);
```

### 검증 기준

- [ ] `/onlyssam` 접속 시 slug='onlyssam'인 org(`0219d7f2-...`) 자동 선택
- [ ] 대시보드에 학생 802명, 출석률, 매출 등 실데이터 표시
- [ ] 다른 Clerk user ID로 로그인해도 slug 기반으로 정확한 org 선택

---

## P0-2. Org Switcher UI

### 요구사항

다중 조직 멤버인 사용자가 조직을 전환할 수 있는 UI 컴포넌트.

### 구현 위치

**파일: `src/components/OrgSwitcher.tsx` (신규)**

### 스펙

```
위치: 사이드바 상단 또는 헤더 좌측
동작:
  - 현재 org 이름 + 드롭다운 화살표 표시
  - 클릭 시 멤버십 목록 표시 (org name, role, type badge)
  - 선택 시 localStorage('autus_preferred_org') 저장 + 페이지 리로드
  - org가 1개면 드롭다운 비활성화 (이름만 표시)
디자인:
  - Tesla dark (#0a0a0a, #1a1a2e) 기반
  - Tailwind only
```

```tsx
// OrgSwitcher.tsx 구조
'use client';
import { useState } from 'react';

interface OrgSwitcherProps {
  organizations: {
    id: string;
    name: string;
    slug: string;
    type: string;
    tier: string;
  }[];
  currentOrgId: string;
  onSwitch: (orgId: string) => void;
}

export function OrgSwitcher({ organizations, currentOrgId, onSwitch }: OrgSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const current = organizations.find(o => o.id === currentOrgId);

  if (organizations.length <= 1) {
    return (
      <div className="px-3 py-2 text-sm text-gray-400">
        {current?.name ?? '조직 없음'}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg
                   bg-[#1a1a2e] hover:bg-[#2a2a3e] transition-colors w-full"
      >
        <span className="text-sm font-medium text-white truncate">
          {current?.name}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
             fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a2e]
                        border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {organizations.map(org => (
            <button
              key={org.id}
              onClick={() => {
                onSwitch(org.id);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-[#2a2a3e]
                         transition-colors flex items-center justify-between
                         ${org.id === currentOrgId ? 'text-blue-400' : 'text-gray-300'}`}
            >
              <span className="truncate">{org.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 ml-2">
                {org.tier}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**onSwitch 핸들러 (부모 컴포넌트에서):**
```typescript
const handleOrgSwitch = (orgId: string) => {
  localStorage.setItem('autus_preferred_org', orgId);
  window.location.reload(); // 전체 데이터 리페치
};
```

### 검증 기준

- [ ] 1개 org: 이름만 표시, 드롭다운 없음
- [ ] 2개+ org: 드롭다운으로 전환 가능
- [ ] 전환 시 localStorage 저장 + 데이터 리페치
- [ ] 새로고침해도 선택 유지

---

## P1-1. 온보딩 중복 생성 방지

### 문제

`/api/onlyssam/onboarding` POST 호출 시 기존 org 확인 없이 매번 새 org + app_member 생성.
결과: "올댓바스켓" 조직이 최대 36개까지 중복 생성됨 (현재 6개로 정리됨).

### 수정 파일

**`src/app/api/onlyssam/onboarding/route.ts`**

### 수정 로직

```typescript
export async function POST(req: Request) {
  const { userId, orgName, ownerName, ...rest } = await req.json();

  // ✅ 1단계: 기존 멤버십 확인
  const { data: existingMembers } = await supabase
    .from('app_members')
    .select('id, org_id, role, is_active, organizations(id, name, slug, status)')
    .eq('user_id', userId)
    .eq('is_active', true);

  // ✅ 2단계: 이미 active org가 있으면 재사용
  if (existingMembers && existingMembers.length > 0) {
    // 가장 오래된 active org 반환 (중복 생성 방지)
    const primaryMember = existingMembers[0];
    return NextResponse.json({
      success: true,
      isExisting: true,
      orgId: primaryMember.org_id,
      organization: primaryMember.organizations,
    });
  }

  // ✅ 3단계: 같은 이름의 org가 이미 존재하는지 확인
  if (orgName) {
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('name', orgName)
      .eq('status', 'active')
      .limit(1)
      .single();

    if (existingOrg) {
      // 기존 org에 멤버로 추가
      await supabase.from('app_members').insert({
        org_id: existingOrg.id,
        user_id: userId,
        role: 'director',
        display_name: ownerName || '원장님',
        is_active: true,
      });

      return NextResponse.json({
        success: true,
        isExisting: true,
        orgId: existingOrg.id,
        organization: existingOrg,
      });
    }
  }

  // ✅ 4단계: 진짜 새 org 생성 (최초 1회만)
  const slug = generateSlug(orgName);
  const { data: newOrg } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug,
      type: 'academy',
      status: 'active',
      tier: 'free',
      owner_name: ownerName,
      owner_user_id: userId,
    })
    .select()
    .single();

  await supabase.from('app_members').insert({
    org_id: newOrg.id,
    user_id: userId,
    role: 'director',
    display_name: ownerName || '원장님',
    is_active: true,
  });

  return NextResponse.json({
    success: true,
    isExisting: false,
    orgId: newOrg.id,
    organization: newOrg,
  });
}
```

### DB 안전장치 (이미 적용됨)

DB 트리거 `trg_prevent_duplicate_org`가 설치되어 있어, 같은 user_id가 같은 이름의 org에 director로 중복 등록 시 `unique_violation (23505)` 에러를 반환합니다. 프론트엔드 코드에서 이 에러를 catch해서 기존 org로 리다이렉트하면 됩니다.

```typescript
// onboarding route.ts 에서 INSERT 실패 시 처리
try {
  await supabase.from('app_members').insert({ ... });
} catch (err: any) {
  if (err.code === '23505') {
    // 이미 존재하는 멤버십 → 기존 org 반환
    const { data: existing } = await supabase
      .from('app_members')
      .select('*, organizations(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .single();
    return NextResponse.json({ success: true, isExisting: true, orgId: existing.org_id });
  }
  throw err;
}
```

### 검증 기준

- [ ] 기존 멤버십이 있는 user가 onboarding 호출 → 새 org 생성되지 않음
- [ ] 새 user가 onboarding → 정상적으로 1개 org 생성
- [ ] 같은 이름 org 존재 시 → 기존 org에 멤버 추가
- [ ] DB 트리거 23505 에러 발생 시 → graceful fallback

---

## P1-2. `/onlyssam/more` 라우트 구현

### 수정 파일

**`src/app/onlyssam/more/page.tsx` (신규)**

### 스펙

더보기 페이지 — 부가 기능 및 설정 메뉴 허브.

```tsx
// src/app/onlyssam/more/page.tsx
'use client';

const menuItems = [
  { label: '학원 설정', href: '/onlyssam/settings', icon: '⚙️', desc: '학원 정보, 수업 시간, 과목 관리' },
  { label: '직원 관리', href: '/onlyssam/staff', icon: '👥', desc: '코치/강사 등록 및 권한 설정' },
  { label: '상담 관리', href: '/onlyssam/consultations', icon: '💬', desc: '상담 내역 조회 및 후속 관리' },
  { label: '보강 관리', href: '/onlyssam/makeup', icon: '🔄', desc: '보강 신청 및 스케줄 관리' },
  { label: '알림 설정', href: '/onlyssam/notifications', icon: '🔔', desc: '알림톡, SMS 발송 관리' },
  { label: '계약/동의서', href: '/onlyssam/contracts', icon: '📄', desc: '전자계약, 동의서 관리' },
  { label: '리포트', href: '/onlyssam/reports', icon: '📊', desc: '매출, 출석, 성장 리포트' },
  { label: '데이터 관리', href: '/onlyssam/data', icon: '💾', desc: '학생 일괄 등록, 내보내기' },
];

export default function MorePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">더보기</h1>
      <div className="space-y-2">
        {menuItems.map(item => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 p-4 rounded-xl bg-[#1a1a2e]
                       hover:bg-[#2a2a3e] transition-colors"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <div className="text-white font-medium">{item.label}</div>
              <div className="text-sm text-gray-400">{item.desc}</div>
            </div>
            <svg className="w-5 h-5 text-gray-500 ml-auto" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
```

> 각 하위 페이지(`/settings`, `/staff` 등)는 아직 미구현 — 이 라우트가 404를 반환하지 않도록 메뉴 허브만 먼저 구현.

### 검증 기준

- [ ] `/onlyssam/more` 접속 시 404 아닌 메뉴 목록 표시
- [ ] 각 메뉴 항목 클릭 시 해당 경로로 이동 (하위 페이지 없으면 404 허용)

---

## P1-3. 미사용 테이블 파이프라인 연결

### 현황

| 테이블 | 현재 건수 | 연결해야 할 곳 |
|--------|----------|--------------|
| `notifications` | 0 | notification-dispatch v4 → INSERT |
| `payments` | 0 | 수납 UI → invoice 결제 시 INSERT |
| `kakao_outbox` | 0 | kakao-send v2 → 알림톡 발송 시 INSERT |
| `notification_schedule` | 0 | 수업 전 자동 알림 스케줄링 |
| `class_definitions` | 0 | 스케줄 UI → 수업 정의 등록 |

### notification-dispatch v4 스키마 불일치 수정

**문제:** Edge Function v4가 참조하는 컬럼이 실제 `notification_schedule` 테이블과 다름.

```
v4 코드가 기대하는 컬럼     실제 테이블 컬럼
─────────────────────    ─────────────────
status = 'pending'       sent (boolean)
scheduled_at             send_at
message                  (없음)
metadata                 (없음)
student_id               (없음)
channel                  (없음)
```

**수정 방향 (택 1):**

- **A안 (DB 맞추기):** `notification_schedule` 테이블에 컬럼 추가 마이그레이션
  ```sql
  ALTER TABLE notification_schedule
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
    ADD COLUMN IF NOT EXISTS message text,
    ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES students(id),
    ADD COLUMN IF NOT EXISTS channel text DEFAULT 'kakao';

  -- send_at → scheduled_at 통일
  UPDATE notification_schedule SET scheduled_at = send_at WHERE scheduled_at IS NULL;
  ```

- **B안 (코드 맞추기):** Edge Function v4를 실제 컬럼에 맞게 수정
  ```typescript
  // sent (boolean) 기준으로 필터
  .eq('sent', false)
  .lte('send_at', new Date().toISOString())
  ```

> **권장: A안** — notification_schedule이 아직 0건이므로 스키마 확장이 안전. 향후 알림 파이프라인에 필요한 컬럼을 미리 준비.

---

## 보너스: notification-dispatch v4 스키마 정합성 수정

notification-dispatch v4를 배포했으나 `notification_schedule` 테이블 스키마와 맞지 않는 상태.
현재 cron이 배치 모드에서 "No pending notifications"를 반환하는 건 정상이지만, 실제 알림이 등록되면 에러 발생 예상.

**위 P1-3의 A안을 적용한 후** Edge Function 재배포는 불필요 (v4 코드가 새 컬럼에 맞춰져 있으므로).

---

## 작업 순서 권장

```
1. P0-1 (org 선택 로직)     ← 이것만 고치면 802명 데이터 즉시 복구
2. P0-2 (org switcher)      ← 1과 함께 작업
3. P1-1 (온보딩 중복 방지)   ← 추가 오염 차단
4. P1-2 (/more 라우트)      ← 10분 작업
5. P1-3 (파이프라인)         ← DB 마이그레이션 + 검증
```

---

## DB 참조 정보

### organizations 테이블 컬럼
```
id (uuid PK), name, slug, type, status, tier, owner_name, owner_user_id,
created_at, updated_at, phone, address, kakao_channel_id, business_number,
representative_name, logo_url
```

### app_members 테이블 컬럼
```
id (uuid PK), org_id (uuid FK→organizations), user_id (text),
role (text), display_name, email, phone, avatar_url,
is_active (boolean), permissions (jsonb),
invited_at, joined_at, created_at, updated_at,
onboarding_completed (boolean), invitation_id, deleted_at, deletion_reason
```

### students 테이블 org 연결
```
organization_id (uuid FK→organizations)  ← 주의: 다른 테이블은 org_id 사용
```

### 주요 org ID 참조
```
온리쌤 아카데미: 0219d7f2-5875-4bab-b921-f8593df126b8 (slug: onlyssam, tier: pro)
```

### 주요 Clerk user ID
```
seho 메인: user_39hJ1k6oB378zjN8sWfDCLHjAkR (온리쌤 아카데미 director)
```
