# AUTUS 전략→코드 구현 지시서 v1

> 작성일: 2026-02-23 | 대상: Claude Code (P1), Chrome (P3)
> 이 문서는 전략 보고서의 결정사항을 실행 가능한 코드 태스크로 변환한 것이다.
> 각 태스크는 독립 배포 가능하며, 의존성이 명시되어 있다.

---

## 현황 감사 결과

### 구현 완료 (코드 존재, 배포됨)

| 구분 | 자산 | 상태 |
|------|------|------|
| Edge Function | `coach-result-submit` v2 | leaf_hash 생성 포함, PII 차단 |
| Edge Function | `proof-generator` v1 | 독립 leaf_hash + proof_records 저장 |
| Edge Function | `proof-anchor` v1 | Merkle Tree 빌드 + L2 **시뮬레이션** |
| Edge Function | `aggregate-metrics` v1 | 전국 익명 통계 (org_id_hash 기반) |
| Edge Function | `evidence-package` v1 | 7종 증거 수집 → HTML 생성 |
| DB 테이블 | `proof_records` | id, org_id, report_id, leaf_hash, proof_payload, anchor_id |
| DB 테이블 | `proof_anchors` | id, anchor_date, merkle_root, tx_hash, chain_id(base-mainnet), leaf_count |
| RLS | proof_anchors | 공개 읽기 (누구나 검증 가능) |
| RLS | proof_records | org 멤버만 자기 org proof 조회 |
| 해싱 | SHA-256 canonical JSON | proof_payload → sorted keys → SHA-256 |
| PII 차단 | proof-generator | student_name, phone, email 등 8개 필드 reject |

### 미구현 (전략에서 결정됨, 코드 없음)

| # | 항목 | 의존성 | 우선순위 |
|---|------|--------|---------|
| G1 | `/verify?hash=xxx` 검증 페이지 | proof-generator GET 엔드포인트 | P0 |
| G2 | L2 실제 앵커링 (Base Mainnet) | proof-anchor의 `anchor_l2` 활성화 | P1 |
| G3 | 일일 배치 Cron (proof-anchor build_tree) | pg_cron 또는 Vercel Cron | P0 |
| G4 | coach-result-submit 실제 지표 연결 | attendance 집계 함수 | P1 |
| G5 | `aggregate_attendance_by_org` RPC 함수 | attendance 테이블 | P1 |
| G6 | org별 서명 키 분리 (Vault) | Supabase Vault | P2 |
| G7 | org_settings.branding 데이터 | 학원명, 로고, footer_text | P0 |
| G8 | 검증 배지 컴포넌트 (학부모 리포트용) | G1 완료 후 | P1 |
| G9 | 결과 페이지 proof 연동 | `/result?token=xxx` → proof 표시 | P1 |

---

## TASK G1: 검증 페이지 `/verify`

### 전략 결정
> "온체인 Proof → 검증 가능한 리포트"

### 요구사항
- URL: `https://autus-ai.com/verify?hash={leaf_hash}` 또는 `?id={proof_id}`
- 공개 접근 (로그인 불필요) — proof_anchors RLS가 이미 public read
- 학부모가 리포트의 알림톡 하단 "검증하기" 버튼을 눌렀을 때 도착하는 페이지

### 구현 위치
```
kraton-v2/src/pages/verify/index.tsx   ← 새로 생성
```

### 데이터 흐름
```
URL ?hash=xxx
  → supabase.from('proof_records')
      .select('*, proof_anchors(merkle_root, tx_hash, anchor_date, anchored_at)')
      .eq('leaf_hash', hash)
      .single()
  → 결과 렌더링
```

### UI 스펙
```
┌─────────────────────────────────────────┐
│  AUTUS 검증 리포트                       │
│                                          │
│  ✅ 이 리포트는 검증되었습니다            │
│                                          │
│  리포트 ID: abc123...                    │
│  생성일: 2026-02-23                      │
│  Leaf Hash: 0xfa3b...                    │
│                                          │
│  ── 앵커링 정보 ──                       │
│  Merkle Root: 0x8a1c...                  │
│  블록체인: Base Mainnet                  │
│  TX Hash: 0x9f2e... [Explorer 링크]      │
│  앵커링 일시: 2026-02-24 00:00 KST       │
│                                          │
│  ── 요약 지표 (PII 없음) ──              │
│  출석률: 92.3%                           │
│  성장 델타: +0.15                         │
│  MDI 밴드: 0.72-0.85                     │
│                                          │
│  [원본 리포트 보기] ← result_token 링크   │
│                                          │
│  powered by AUTUS                        │
└─────────────────────────────────────────┘
```

### 상태 분기
| 조건 | 표시 |
|------|------|
| proof 존재 + anchor 존재 + tx_hash 있음 | ✅ 검증 완료 (체인 확인) |
| proof 존재 + anchor 존재 + tx_hash 없음 | ⏳ 앵커링 대기 중 |
| proof 존재 + anchor 없음 | 📋 기록됨 (일일 배치 전) |
| proof 없음 | ❌ 유효하지 않은 해시 |

### CSS
- Tesla dark 테마 (#0a0a0a 배경, #00BFFF 액센트)
- glassmorphism 카드
- 모바일 반응형 (학부모가 폰에서 접속)

### 코드 의사결정
- React Router 라우트로 추가 (`/verify`)
- Supabase anon key로 직접 쿼리 (RLS public read)
- tx_hash가 있으면 `https://basescan.org/tx/{tx_hash}` 링크 자동 생성

---

## TASK G2: L2 실제 앵커링 활성화

### 전략 결정
> "leaf_hash → L2 앵커링 → 불변 증명"

### 현재 상태
`proof-anchor` Edge Function에 `anchorToL2()` 함수가 시뮬레이션 모드로 존재.
```typescript
// 현재 코드 (proof-anchor/index.ts 라인 ~80)
const simulatedTxHash = `0xsim_${await sha256(anchor.merkle_root + anchorDate)}`;
```

### 구현 방법
1. Base Mainnet에 단순 data-only 컨트랙트 배포 (또는 직접 calldata 전송)
2. Supabase Vault에 `L2_SIGNER_PRIVATE_KEY` 저장
3. `proof-anchor`의 주석 처리된 env 변수 활성화:
   ```
   L2_RPC_URL = "https://mainnet.base.org"
   L2_SIGNER_KEY = vault에서 조회
   L2_CONTRACT = 배포된 컨트랙트 주소
   ```

### 컨트랙트 스펙 (최소)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AutusAnchor {
    event Anchored(bytes32 indexed merkleRoot, uint256 leafCount, uint256 timestamp);

    address public immutable operator;

    constructor() { operator = msg.sender; }

    function anchor(bytes32 merkleRoot, uint256 leafCount) external {
        require(msg.sender == operator, "unauthorized");
        emit Anchored(merkleRoot, leafCount, block.timestamp);
    }
}
```

### proof-anchor 수정사항
```typescript
// anchorToL2 함수 교체
async function anchorToL2(supabase: any, targetDate?: string) {
  // ... anchor 조회 (기존 코드 유지)

  const rpcUrl = Deno.env.get("L2_RPC_URL");
  const signerKey = Deno.env.get("L2_SIGNER_PRIVATE_KEY");
  const contractAddr = Deno.env.get("L2_CONTRACT_ADDRESS");

  if (!rpcUrl || !signerKey || !contractAddr) {
    // env 미설정 → 시뮬레이션 폴백 (기존 로직)
    return { mode: "simulation", ... };
  }

  // ethers.js로 실제 트랜잭션 전송
  // anchor(bytes32 merkleRoot, uint256 leafCount)
  const merkleRootBytes = `0x${anchor.merkle_root}`;
  const txHash = await sendAnchorTx(rpcUrl, signerKey, contractAddr, merkleRootBytes, anchor.leaf_count);

  // DB 업데이트
  await supabase.from("proof_anchors").update({
    tx_hash: txHash,
    anchored_at: new Date().toISOString(),
  }).eq("id", anchor.id);

  return { success: true, mode: "live", tx_hash: txHash, ... };
}
```

### 비용 추정
- Base Mainnet gas: 하루 1 tx × ~$0.01 = 월 $0.30
- 배포 1회: ~$0.05

### 의존성
- `ethers` 또는 `viem` (Deno 호환 버전)
- Supabase Vault (G6)

### 실행 순서
1. ✅ proof-anchor v3 배포 완료 (noble/curves + RLP 기반 실제 서명)
2. ✅ AutusAnchor.sol 작성 완료 (`contracts/AutusAnchor.sol`)
3. ⏳ 컨트랙트 Base Mainnet 배포 (Remix/Foundry — 수동)
4. ⏳ Supabase Edge Function env 설정 (L2_RPC_URL, L2_SIGNER_PRIVATE_KEY, L2_CONTRACT_ADDRESS)
5. 시뮬레이션 tx_hash(`0xsim_`)를 가진 기존 anchors는 그대로 유지 (재앵커링 불필요)

---

## TASK G3: 일일 배치 Cron 설정

### 전략 결정
> "하루 1회 Merkle Tree → L2 앵커링"

### 현재 상태
proof-anchor가 수동 호출만 가능. 자동 배치 없음.

### 구현: pg_cron + Edge Function 호출

```sql
-- Cron: 매일 00:00 KST (= 15:00 UTC 전일)
SELECT cron.schedule(
  'daily-proof-anchor',
  '0 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/proof-anchor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{"action":"build_tree"}'::jsonb
  );
  $$
);

-- 2단계: build_tree 완료 5분 후 anchor_l2 실행
SELECT cron.schedule(
  'daily-proof-anchor-l2',
  '5 15 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/proof-anchor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{"action":"anchor_l2"}'::jsonb
  );
  $$
);
```

### 의존성
- `pg_net` 확장 (Supabase 기본 설치)
- service_role_key가 app.settings에 설정되어 있어야 함

---

## TASK G4: coach-result-submit 실제 지표 연결

### 전략 결정
> "코치 3분 — 출석 탭 + 키워드 + 한마디 = 3개 필드만"

### 현재 상태
coach-result-submit v2에서 proof_payload의 metrics_summary가 하드코딩:
```typescript
metrics_summary: {
  attendance_rate: 0,      // ← 하드코딩
  shooting_delta: 0,       // ← 하드코딩
  mdi_band: "0.00-0.00",   // ← 하드코딩
},
```

### 수정 내용
```typescript
// coach-result-submit 내부, proof 생성 직전에 추가
// 1. 해당 학생의 최근 30일 출석률 조회
const { data: recentAttendance } = await supabase
  .from('attendance')
  .select('status')
  .eq('org_id', org_id)
  .eq('student_id', student_sid)  // ⚠️ attendance는 student_id, not student_sid
  .gte('session_date', thirtyDaysAgo);

const totalSessions = recentAttendance?.length || 0;
const presentCount = recentAttendance?.filter(a => a.status === 'present').length || 0;
const attendanceRate = totalSessions > 0 ? presentCount / totalSessions : 0;

// 2. 성장 델타: 이전 result_log의 training_stage와 비교
const { data: prevResult } = await supabase
  .from('result_logs')
  .select('training_stage')
  .eq('student_sid', student_sid)
  .order('created_at', { ascending: false })
  .limit(2);

const STAGE_ORDER = ['motivation', 'basic', 'repetition', 'application', 'mastery'];
const currentIdx = STAGE_ORDER.indexOf(stage);
const prevIdx = prevResult?.[1] ? STAGE_ORDER.indexOf(prevResult[1].training_stage) : currentIdx;
const shootingDelta = (currentIdx - prevIdx) / STAGE_ORDER.length;

// 3. MDI 밴드: churn_risk 기반
const { data: studentData } = await supabase
  .from('students')
  .select('churn_risk, engagement_score')
  .eq('sid', student_sid)
  .single();

const risk = studentData?.churn_risk ?? 0;
const engagement = studentData?.engagement_score ?? 0;
const mdiBand = `${(risk * 0.01).toFixed(2)}-${(engagement * 0.01).toFixed(2)}`;
```

### 주의사항 (DB 검증 완료 2026-02-23)
- attendance 테이블: `student_id` (UUID) + `org_id` + `session_date` + `status` ✅
- students 테이블: `id` (UUID), `sid` 컬럼 없음 ❗ → coach-result-submit의 `student_sid`는 실제로 students.id
- students 테이블: `churn_risk`, `engagement_score` 존재 ✅
- result_logs: `result_token` (text) 존재 ✅
- proof_records FK: `anchor_id → proof_anchors.id`, `org_id → organizations.id` ✅
- proof_records에 report_id FK 없음 (참조 무결성은 앱 레벨)
- pg_cron 1.6.4 + pg_net 0.19.5 설치됨 ✅
- 쿼리 실패 시 기존 하드코딩(0) 폴백 유지 — proof 생성 실패가 결과 저장을 막으면 안 됨

---

## TASK G5: aggregate_attendance_by_org RPC 함수

### 현재 상태
`aggregate-metrics` Edge Function이 호출하지만 함수가 존재하지 않음.

### 구현
```sql
CREATE OR REPLACE FUNCTION aggregate_attendance_by_org(
  start_date date,
  end_date date
)
RETURNS TABLE (
  org_id uuid,
  total_sessions bigint,
  present_count bigint,
  absent_count bigint,
  late_count bigint,
  attendance_rate numeric
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT
    a.org_id,
    count(*) as total_sessions,
    count(*) FILTER (WHERE a.status = 'present') as present_count,
    count(*) FILTER (WHERE a.status = 'absent') as absent_count,
    count(*) FILTER (WHERE a.status = 'late') as late_count,
    ROUND(
      count(*) FILTER (WHERE a.status IN ('present', 'late'))::numeric
      / NULLIF(count(*), 0),
      4
    ) as attendance_rate
  FROM attendance a
  WHERE a.session_date BETWEEN start_date AND end_date
  GROUP BY a.org_id;
$$;
```

---

## TASK G6: org별 서명 키 분리 (Vault)

### 전략 결정
> "데이터 소버린 — 지점별 org_id 격리"
> "키 관리 — 지점별 서명 키 분리"

### 현재 상태
서명 키 관련 테이블 없음. Supabase Vault 미사용.

### 설계
Supabase Vault의 `vault.secrets` 테이블 활용:

```sql
-- org별 서명 키 저장 (Vault encrypted)
-- 저장
SELECT vault.create_secret(
  'org_signing_key_' || '0219d7f2-5875-4bab-b921-f8593df126b8',
  '{"algorithm":"Ed25519","private_key":"base64...","public_key":"base64..."}',
  'OnlySSem signing key'
);

-- 조회 (Edge Function에서 service_role로)
SELECT decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'org_signing_key_' || org_id;
```

### 용도
- proof_payload를 org 서명키로 서명 → `proof_records.signature` 컬럼 추가
- 검증 페이지에서 org의 public_key로 서명 검증
- 향후 org 간 위임/연합 시 키 교환 기반

### 스키마 변경
```sql
ALTER TABLE proof_records ADD COLUMN IF NOT EXISTS signature text;
ALTER TABLE proof_records ADD COLUMN IF NOT EXISTS signed_by_org uuid REFERENCES organizations(id);
```

### 우선순위: P2 (MVP에서는 SHA-256 해시만으로 충분)

---

## TASK G7: org_settings.branding 데이터

### 전략 결정
> "academy_name, footer_text 별도 분리"
> "검수 없이 즉시 적용"

### 현재 상태
`org_settings` 테이블에 `branding` JSONB 컬럼 존재하지만 데이터 없음.

### 데이터 구조
```json
{
  "academy_name": "OnlySSem 배구 아카데미",
  "academy_name_short": "온리쌤",
  "logo_url": null,
  "primary_color": "#00BFFF",
  "footer_text": "온리쌤 | 배구 전문 교육",
  "kakao_sender_name": "온리쌤",
  "report_header": "훈련 결과 리포트",
  "badge_enabled": false,
  "badge_text": "AUTUS 검증됨"
}
```

### 실행
```sql
UPDATE org_settings
SET branding = '{
  "academy_name": "OnlySSem 배구 아카데미",
  "academy_name_short": "온리쌤",
  "logo_url": null,
  "primary_color": "#00BFFF",
  "footer_text": "온리쌤 | 배구 전문 교육",
  "kakao_sender_name": "온리쌤",
  "report_header": "훈련 결과 리포트",
  "badge_enabled": false,
  "badge_text": "AUTUS 검증됨"
}'::jsonb,
updated_at = now()
WHERE org_id = '0219d7f2-5875-4bab-b921-f8593df126b8';
```

### 연동 포인트
- `coach-result-submit` → 알림톡 메시지에 `branding.academy_name` 사용
- `evidence-package` → HTML 헤더에 `branding.academy_name` + `footer_text`
- 검증 페이지(G1) → `branding.badge_text` 표시
- 대시보드 → 학원명 표시

### badge_enabled 플래그
- `false`: 검증 배지 노출하지 않음 (현재 기본값)
- `true`: 학부모 리포트, 검증 페이지에 배지 표시
- org 관리자가 대시보드 설정에서 토글 가능

---

## TASK G8: 검증 배지 컴포넌트

### 전략 결정 (외부 공개 레이어)
> "학부모에게: 검증 배지 노출할지 → badge_enabled 플래그로 org별 제어"

### 컴포넌트 스펙
```
kraton-v2/src/components/proof/VerifyBadge.tsx
```

```tsx
interface VerifyBadgeProps {
  proofId?: string;
  leafHash?: string;
  size?: 'sm' | 'md' | 'lg';
}

// 표시 조건:
// 1. org_settings.branding.badge_enabled === true
// 2. proof_record가 존재
// 3. proof_record.anchor_id가 존재 (Merkle Tree에 포함됨)

// 상태별 UI:
// anchored + tx_hash → 🟢 "검증됨" + 클릭 시 /verify?hash=xxx
// anchored + no tx   → 🟡 "기록됨" + 툴팁 "24시간 내 블록체인 확인"
// no anchor          → 🔵 "처리 중" + 스피너
```

### 적용 위치
- `/result?token=xxx` 페이지 상단
- 학부모 알림톡 웹뷰 (카카오 인앱브라우저)
- 대시보드 학생 상세 → 최근 리포트

---

## TASK G9: 결과 페이지에 proof 연동

### 현재 상태
`/result?token=xxx` 페이지가 `result_logs.result_token`으로 조회하는 구조.
coach-result-submit이 이미 `proof_id`와 `leaf_hash`를 반환.

### 수정 내용
1. result_logs에서 result_token으로 조회 시, 해당 result의 proof_record도 join
2. VerifyBadge 컴포넌트 삽입
3. "검증 상세 보기" 링크 → `/verify?hash={leaf_hash}`

### 쿼리
```typescript
const { data } = await supabase
  .from('result_logs')
  .select(`
    *,
    proof_records!proof_records_report_id_fkey(
      id, leaf_hash, anchor_id,
      proof_anchors(merkle_root, tx_hash, anchored_at)
    )
  `)
  .eq('result_token', token)
  .single();
```

---

## 실행 순서 (의존성 그래프)

```
Phase 0 (즉시 실행, 의존성 없음)
├── G7: branding 데이터 INSERT
├── G5: aggregate_attendance_by_org 함수 생성
└── G3: pg_cron 배치 등록

Phase 1 (Phase 0 완료 후)
├── G1: /verify 페이지 생성
├── G4: coach-result-submit 실제 지표 연결
└── G8: VerifyBadge 컴포넌트

Phase 2 (Phase 1 완료 후)
├── G9: 결과 페이지 proof 연동 (G1 + G8 필요)
└── G2: L2 실제 앵커링 (G3이 정상 동작 확인 후)

Phase 3 (장기)
└── G6: org별 서명 키 분리 (MVP 이후)
```

---

## 외부 공개 레이어 의사결정 매트릭스

| 대상 | 노출 범위 | 시점 | 제어 방식 |
|------|-----------|------|-----------|
| 학원장 | "검증 가능한 리포트" 기능 전체 | Phase 1 완료 시 | 기본 ON |
| 학부모 | 검증 배지 + /verify 링크 | Phase 1 완료 + org 설정 | `badge_enabled` 플래그 |
| 투자자 | proof-anchor 아키텍처 + 비용 구조 | Phase 2 완료 시 | 별도 기술 문서 |
| 공개 | "AUTUS 검증" 브랜드 | 파일럿 3개월 후 | 마케팅 결정 |

### 용어 결정
| 내부 용어 | 외부 표현 (학원장) | 외부 표현 (학부모) |
|-----------|-------------------|-------------------|
| leaf_hash | 리포트 지문 | 검증 코드 |
| Merkle Root | 일일 묶음 검증 | (노출 안 함) |
| L2 Anchor | 블록체인 기록 | "변조 불가 기록" |
| proof_record | 검증 이력 | (노출 안 함) |
| badge_enabled | 검증 배지 켜기/끄기 | (자동, 설정 없음) |

---

## 내부 기술 레이어 (AUTUS 코어)

> 아래는 외부에 설명하지 않는 내부 작동 원리이다.

### V-Index 연동 (향후)
```
proof_payload.metrics_summary → V-Index 실행 공식의 Motions 입력
attendance_rate → Motion[출석]
shooting_delta → Motion[성장]
mdi_band → Motion[관계밀도]
```
이론 공식의 `Λ(상호 시간가치)`는 proof 시계열 데이터에서 역산 가능.

### 물리 엔진 연동 (향후)
```
proof_anchors.leaf_count → 일일 총 관계 이벤트 수
aggregate-metrics.national_stats → 전국 노드 밀도
→ Physics Engine의 γ(중력계수) 보정에 사용
```

### 소버린 구조 검증
- org_id별 RLS 격리: ✅ (proof_records는 org 멤버만)
- 공개 검증 레이어: ✅ (proof_anchors는 public read)
- PII 온체인 금지: ✅ (proof-generator에서 8개 필드 reject)
- 중앙 통계 익명화: ✅ (aggregate-metrics에서 org_id → sha256 해시)

---

## 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| v1 | 2026-02-23 | 초기 작성. 9개 태스크 정의, 3 Phase 실행 순서 |
| v1.1 | 2026-02-23 | Phase 0 + Phase 1 실행 완료. 아래 실행 로그 참조 |
| v1.2 | 2026-02-23 | Phase 2: G2 proof-anchor v3 배포 (실제 L2 서명 코드), AutusAnchor.sol 작성 |

---

## 실행 로그

### Phase 0 (2026-02-23 완료)
| 태스크 | 결과 | 비고 |
|--------|------|------|
| G7 branding | ✅ 이미 존재 | org_settings에 9개 필드 모두 입력됨 |
| G5 aggregate_attendance_by_org | ✅ 생성 + 테스트 | 52건 / 출석률 90.38% 반환 확인 |
| G3 pg_cron | ✅ 이미 존재 | daily-proof-anchor-build(15:00UTC), daily-proof-anchor-l2(15:05UTC) |

### Phase 1 (2026-02-23 진행 중)
| 태스크 | 결과 | 비고 |
|--------|------|------|
| G1 verify-page | ✅ Edge Function 배포 | JWT 불필요, 공개 접근, HTML 직접 반환 |
| G4 coach-result-submit v4 | ✅ 배포 | 실제 출석률 + 성장 델타 + MDI 밴드 조회 |
| G8 VerifyBadge | ⏳ 대기 | kraton-v2 코드베이스 접근 필요 |

### 검증 페이지 URL
```
https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/verify-page?hash={leaf_hash}
https://pphzvnaedmzcvpxjulti.supabase.co/functions/v1/verify-page?id={proof_id}
```

### 테스트 proof (삭제 가능)
- leaf_hash: `a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2`
- proof_id: `b8b6c940-8434-48b3-bdc2-61351c3e1f74`

### Phase 2 (2026-02-23 진행 중)
| 태스크 | 결과 | 비고 |
|--------|------|------|
| G2 proof-anchor v3 | ✅ 배포 완료 | 실제 L2 서명/전송 코드 포함 (noble/curves + RLP) |
| G2 AutusAnchor.sol | ✅ 작성 완료 | `contracts/AutusAnchor.sol` — 배포 대기 |
| G9 결과 페이지 proof 연동 | ⏳ 대기 | kraton-v2 접근 필요 (G8 의존) |

### G2 상세 — proof-anchor v3 변경사항
- **v2 → v3 차이점**:
  - `pending_live` 모드 제거 → `live` 모드로 직접 전환
  - `@noble/curves` + `@noble/hashes` (esm.sh) 사용하여 secp256k1 서명
  - `@ethereumjs/rlp` (esm.sh) 사용하여 EIP-1559 트랜잭션 인코딩
  - 자체 JSON-RPC 호출 (ethers.js 미사용 — 의존성 최소화)
  - `chain_id` 컬럼 자동 업데이트 (`eip155:8453`)
  - 기존 `0xsim_` 앵커는 그대로 유지 (재앵커링 불필요)

- **활성화 조건** (3개 env 모두 설정 시 live 모드):
  ```
  L2_RPC_URL=https://mainnet.base.org
  L2_SIGNER_PRIVATE_KEY=0x...
  L2_CONTRACT_ADDRESS=0x...
  ```

- **AutusAnchor.sol 배포 순서**:
  1. Remix IDE 또는 Foundry/Hardhat으로 Base Mainnet에 배포
  2. 배포 지갑 = operator (anchor 호출 권한)
  3. 배포된 contract address를 Supabase env에 설정
  4. signer private key를 Supabase env에 설정
  5. L2_RPC_URL을 Base Mainnet RPC로 설정

- **Gas 비용**: 하루 1 tx × ~50,000 gas ≈ $0.01/일, 월 $0.30
