# ═══════════════════════════════════════════════════════════════════════════════
# 🏛️ AUTUS CONSTITUTION v1.0 — 불변 헌법
# ═══════════════════════════════════════════════════════════════════════════════
#
# 이 문서는 AUTUS 시스템의 핵심 원칙을 정의합니다.
# ⚠️ 이 파일의 내용은 절대 변경할 수 없습니다.
# SHA-256: [자동 생성됨]
#
# ═══════════════════════════════════════════════════════════════════════════════

## 📜 제1조: 데이터 주권 (Data Sovereignty)

1. **Zero-Cloud**: 모든 사용자 데이터는 로컬에 저장된다
2. **No PII Collection**: 개인 식별 정보를 수집하지 않는다
3. **User Ownership**: 데이터의 소유권은 100% 사용자에게 있다
4. **Export Freedom**: 사용자는 언제든 모든 데이터를 내보낼 수 있다

## 📜 제2조: 자산 공식 (Value Formula)

```
V = (M - T) × (1 + s)^t

- V: 자산 (Value)
- M: Mint (생성된 가치)
- T: Tax (소모된 비용)
- s: Synergy (협업 계수, 0 ≤ s ≤ 1)
- t: Time (시간)
```

이 공식은 AUTUS의 모든 가치 계산의 기반이다.

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

## 📜 제5조: 암호화 (Encryption)

1. **AES-256-GCM**: 모든 P2P 전송에 적용
2. **SHA-256**: 블록 해시 체인
3. **Local Key**: 암호화 키는 사용자 기기에만 저장

## 📜 제6조: Immutable Ledger

1. 모든 결정은 블록체인 형태로 기록된다
2. 한번 기록된 블록은 삭제/수정 불가
3. 각 블록은 이전 블록의 해시를 포함한다

```
Block = {
  hash: SHA-256(prev_hash + timestamp + type + payload),
  prev_hash: string,
  timestamp: ISO-8601,
  type: 'decision' | 'sync' | 'genesis',
  payload: object
}
```

## 📜 제7조: P2P 원칙

1. **Direct Connection**: 중앙 서버 없이 기기 간 직접 연결
2. **QR Handshake**: 3초 내 연결 완료
3. **BLE Discovery**: 근거리 자동 탐색
4. **Proof Pack**: 검증 가능한 데이터 패키지 교환

## 📜 제8조: 관찰자 모드 (Observer Mode)

1. 시스템은 기본적으로 관찰만 한다
2. 사용자의 명시적 승인 없이 행동하지 않는다
3. 제안은 하되, 강제하지 않는다

## 📜 제9조: 개방성 (Openness)

1. 핵심 알고리즘은 공개한다
2. 사용자는 시스템 동작을 검증할 수 있다
3. 외부 감사를 허용한다

## 📜 제10조: 불변성 선언

**이 헌법은 AUTUS의 근본 원칙을 정의한다.**
**어떠한 상황에서도 이 원칙들은 변경될 수 없다.**
**새로운 기능은 이 헌법을 준수해야만 추가될 수 있다.**

---

**서명**: AUTUS Genesis Block
**일시**: 2026-01-13T00:00:00.000Z
**해시**: AUTUS_CONSTITUTION_V1_IMMUTABLE

═══════════════════════════════════════════════════════════════════════════════
