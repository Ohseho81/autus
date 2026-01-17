# 🏛️ AUTUS K-Scale UI 정책 매트릭스

> **"문명적 UI는 출시 전에 강요하는 게 아니라,**
> **출시 이후에 '자격이 생긴 사람'에게 열린다."**

---

## 핵심 원칙

| 시점 | 무엇을 | 누구에게 |
|------|--------|----------|
| **지금** | 구조 완성 | 전 계급 |
| **지금** | Phase 3 체험 | K10 / 내부 |
| **출시** | Phase 2 유지 | 일반 사용자 |
| **출시 후** | Phase 3 전환 | 숙련 사용자 |
| **안정화** | Phase 4 | 핵심 계급 |

---

## K-Scale별 UI 정책 매트릭스

| 요소 | K2 (일반) | K4 (운영) | K6 (설계) | K10 (관측) |
|------|----------|----------|----------|-----------|
| **Phase** | Phase 2 | Phase 2.5 | Phase 3 | Phase 3/4 |
| **숫자 표시** | ❌ | ❌ | ❌ | ❌ |
| **설명 표시** | ✅ 최소 | ✅ 의미없음 | ❌ | ❌ |
| **도움말** | ✅ | ❌ | ❌ | ❌ |
| **실행 피드백** | ❌ | ❌ | ❌ | ❌ |
| **Gate 저항** | Light | Medium | Heavy | None |
| **Gate 피드백** | Visual | Physical | Physical | None |
| **용어** | 시스템 | 시스템 | 물리 | 물리 |
| **Afterimage** | ❌ | ❌ | ✅ | ✅ |
| **Simulation** | ❌ | ✅ | ✅ | ✅ |
| **Genome** | ❌ | ❌ | ✅ | ✅ |

---

## Phase 자동 전환 조건

### K2 (일반 사용자)

| 조건 | Phase 2 | Phase 3 |
|------|---------|---------|
| 사용 일수 | 0일+ | 90일+ |
| Gate 경험 | 0회+ | 50회+ |
| 총 실행 | 0회+ | 200회+ |

### K4 이상 (운영/설계/관측)

| 계급 | 초기 Phase |
|------|------------|
| K4 | Phase 3 즉시 |
| K6 | Phase 3 즉시 |
| K10 | Phase 4 즉시 |

---

## 용어 변환표

| 키 | Human (Phase 1) | System (Phase 2) | Physics (Phase 3+) |
|----|-----------------|------------------|--------------------|
| gate_locked | 접근이 제한되었습니다 | 시스템 조건 미충족 | *(없음)* |
| execute | 실행 | 처리 | *(없음)* |
| blockage | 문제 신고 | 이슈 등록 | *(없음)* |
| status_normal | 정상 작동 중 | 정상 | *(없음)* |
| status_checking | 시스템 점검 중 | 점검 | *(없음)* |
| status_locked | 일시적으로 사용 불가 | 제한 | *(없음)* |

---

## Gate 저항 설정

| 저항 레벨 | 클릭 지연 | 드래그 저항 | 블러 | 투명도 |
|----------|----------|------------|------|--------|
| None | 0ms | 0 | 0px | 100% |
| Light | 50ms | 0.1 | 1px | 95% |
| Medium | 150ms | 0.3 | 3px | 85% |
| Heavy | 300ms | 0.6 | 8px | 70% |

---

## 계급 인지 상태

| 계급 | 인지 상태 | 시스템 인식 |
|------|----------|-------------|
| K2 | 도구 인식 | "이건 관리 툴이야" |
| K4 | 시스템 인식 | "시스템이 알아서 해" |
| K6 | 환경 인식 | "이렇게 되는 구조야" |
| K10 | 물리 인식 | "이건 법칙이야" |

---

## 구현 파일

```
frontend/src/lib/ui-policy.ts  ← K-Scale UI 정책 시스템
```

### 사용 방법

```typescript
import { 
  getCurrentPolicy, 
  calculateCurrentPhase,
  getTerminology,
  getGateResistanceConfig 
} from '@/lib/ui-policy';

// 현재 사용자의 정책 가져오기
const policy = getCurrentPolicy('K2');

// Phase 자동 계산
const phase = calculateCurrentPhase({
  kScale: 'K2',
  daysUsed: 45,
  gateExperiences: 20,
  totalExecutions: 100,
});

// 용어 변환
const text = getTerminology('gate_locked', policy.terminology);

// Gate 저항 설정
const resistance = getGateResistanceConfig(policy.gateResistance);
```

---

## Phase 전환 시각화

```
K2 사용자 여정:

Day 0 ────────────────── Day 30 ────────────────── Day 90
  │                        │                        │
  ▼                        ▼                        ▼
[Phase 2]              [Phase 2]              [Phase 3]
 숫자 ❌                 숫자 ❌                 숫자 ❌
 설명 ✅                 설명 ✅                 설명 ❌
 도움말 ✅               도움말 ✅               도움말 ❌
 
 "운영 도구"            "자동 시스템"          "환경"
```

---

## 최종 판단

> **방향은 정확하다.**
> **다만 "문명적 UI"는**
> **출시 전에 강요하는 게 아니라**
> **출시 이후에 '자격이 생긴 사람'에게 열린다.**

---

## 다음 단계

- [ ] K2 → K4 승급 시 UI 변화 애니메이션
- [ ] Phase 전환 조건 백엔드 연동
- [ ] A/B 테스트 시스템 구축
