# ═══════════════════════════════════════════════════════════════════════════════
# 🏛️ AUTUS CONSTITUTION v2.0 — 운영 헌법
# ═══════════════════════════════════════════════════════════════════════════════
#
# 이 문서는 AUTUS 시스템의 핵심 원칙을 정의합니다.
# v2.0: 2026-02-23 — 현실 인프라에 맞게 개정
# v1.0: 2026-01-13 — 초기 제정
#
# ═══════════════════════════════════════════════════════════════════════════════

## 📜 제1조: 데이터 주권 (Data Sovereignty)

1. **Cloud-Managed**: 사용자 데이터는 Supabase(PostgreSQL) + RLS로 조직 단위 격리 저장한다
2. **No PII Leak**: 개인 식별 정보는 암호화 저장하며, 외부 유출하지 않는다
3. **User Ownership**: 데이터의 소유권은 100% 사용자에게 있다
4. **Export Freedom**: 사용자는 언제든 모든 데이터를 내보낼 수 있다

> **v1→v2 변경**: "Zero-Cloud(로컬 전용)" → "Cloud-Managed(RLS 격리)"
> 사유: SaaS 제품 특성상 클라우드 DB가 운영/확장에 필수. 데이터 주권은 RLS + Export로 보장.

## 📜 제2조: 자산 공식 (Value Formula)

### 이론 공식 (장기 목표)
```
V = P × Λ × e^(σt)

P = 관계 밀도 (0~1)
Λ = 상호 시간가치 (λ_A × t_A→B + λ_B × t_B→A)
σ = 시너지 계수 (-1~+1)
t = 관계 지속 기간
```

### 실행 공식 (현재 MVP)
```
V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t
```

이 공식은 AUTUS의 모든 가치 계산의 기반이다.
코드 수정 시 이론 공식 기준으로 수렴할 것.

## 📜 제3조: 물리 엔진 (Physics Engine)

### 6 Physics Laws
| # | Physics | 설명 |
|---|---------|------|
| 1 | Gravity | 중력 - 노드 간 인력 |
| 2 | Momentum | 관성 - 변화 저항 |
| 3 | Entropy | 엔트로피 - 무질서도 증가 |
| 4 | Synergy | 시너지 - 협업 효과 |
| 5 | Friction | 마찰 - 실행 저항 |
| 6 | Resonance | 공명 - 패턴 증폭 |

### 9 Motion Types
| # | Motion | 설명 |
|---|--------|------|
| 1 | MINT | 가치 생성 |
| 2 | BURN | 가치 소멸 |
| 3 | TRANSFER | 가치 이동 |
| 4 | STAKE | 가치 고정 |
| 5 | UNSTAKE | 가치 해제 |
| 6 | REWARD | 보상 |
| 7 | PENALTY | 페널티 |
| 8 | SYNC | 동기화 |
| 9 | OBSERVE | 관찰 |

## 📜 제4조: 계층 구조 (Hierarchy)

### K-Scale (1-3-9-27-81)
```
K1 (Owner)     : 1명 - 최종 의사결정권
K2 (Catalyst)  : 3명 - 핵심 파트너
K3 (Operator)  : 9명 - 운영진
K4 (Supporter) : 27명 - 서포터
K5 (Observer)  : 81명 - 관찰자
```

### 5-Tier Node System
```
T1 Hub      : 핵심 허브 노드 (금색)
T2 Connector: 연결자 노드 (파랑)
T3 Active   : 활성 노드 (초록)
T4 Normal   : 일반 노드 (회색)
Ghost       : 비활성 노드 (검정)
```

## 📜 제5조: 보안 (Security)

1. **RLS Isolation**: 모든 테이블은 org_id 기반 Row-Level Security 적용
2. **JWT Auth**: Clerk → HS256 JWT → Supabase PostgREST 인증 체인
3. **Service Role 분리**: 서버 측 작업만 service_role 키 사용
4. **Append-Only Audit**: 감사 로그는 INSERT 전용 (UPDATE/DELETE 금지)

> **v1→v2 변경**: "AES-256-GCM + 로컬 키 저장" → "RLS + JWT + Service Role 분리"
> 사유: SaaS 환경에서 실제 작동하는 보안 모델로 전환.

## 📜 제6조: Immutable Ledger

1. 모든 이벤트는 canonical_events 테이블에 append-only로 기록된다
2. 한번 기록된 이벤트는 삭제/수정 불가 (DELETE/UPDATE 금지)
3. 이벤트 체인은 시간순 무결성을 유지한다

```
Event = {
  id: UUID,
  event_type: string,
  payload: JSONB,
  created_at: TIMESTAMPTZ,
  org_id: UUID
}
```

> **v1→v2 변경**: "블록체인 해시 체인" → "PostgreSQL append-only 테이블"
> 사유: 현재 규모에서 블록체인은 과도. 동일한 불변성을 DB 정책으로 달성.

## 📜 제7조: 멀티 프로덕트 원칙 (Multi-Product)

1. **Shared Core**: AUTUS Physics Engine, V-Index, Event Ledger는 모든 프로덕트가 공유한다
2. **Domain Isolation**: 각 프로덕트(온리쌤, 뷰티 등)는 독립 테이블 접두사를 가진다
3. **Factory Pattern**: 새 프로덕트는 AUTUS 코어 위에 도메인 설정만으로 생성 가능해야 한다

> **v2.0 신설**: v1에 없던 조항. 실제로 온리쌤/뷰티/올댓바스켓 등 복수 프로덕트 운영 중이므로 원칙 필요.

## 📜 제8조: 관찰자 모드 (Observer Mode)

1. 시스템은 기본적으로 관찰만 한다
2. 사용자의 명시적 승인 없이 행동하지 않는다
3. 제안은 하되, 강제하지 않는다

## 📜 제9조: 개방성 (Openness)

1. 핵심 알고리즘은 공개한다
2. 사용자는 시스템 동작을 검증할 수 있다
3. 외부 감사를 허용한다

## 📜 제10조: 개정 절차

1. 이 헌법은 AUTUS의 근본 원칙을 정의한다
2. **개정은 가능하나, 반드시 변경 사유와 이전 버전을 기록한다**
3. 물리 엔진(제3조)과 관찰자 모드(제8조)는 불변이다
4. 새로운 기능은 이 헌법의 정신을 준수해야만 추가될 수 있다

> **v1→v2 변경**: "절대 불변" → "개정 가능, 변경 이력 필수"
> 사유: 실제 운영하면서 인프라가 진화함. 원칙의 정신은 유지하되 구현 방식은 현실에 맞춰야 함.

---

**서명**: AUTUS Constitution v2.0
**초기 제정**: 2026-01-13T00:00:00.000Z
**v2.0 개정**: 2026-02-23
**개정 사유**: 클라우드 인프라 현실 반영, 멀티 프로덕트 원칙 추가, 개정 절차 명시

═══════════════════════════════════════════════════════════════════════════════
