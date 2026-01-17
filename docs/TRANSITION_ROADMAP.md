# 🏛️ AUTUS GRADUAL TRANSITION PLAN

> **Human-Readable → Physics-Driven**

---

## 전체 전략 요약

> **형태는 익숙하게 유지하고, 의미와 권한을 서서히 제거한다.**

---

## PHASE 현황

| 단계 | 상태 | 사람 인식 | AUTUS 실체 |
|------|------|----------|-----------|
| **Phase 0** | ✅ 완료 | 대시보드 | 50% |
| **Phase 1** | ✅ 완료 | 운영툴 | 60% |
| **Phase 2** | ✅ 완료 | 자동 제한 시스템 | 70% |
| **Phase 2.5** | ✅ 완료 | K-Scale 분리 | 75% |
| Phase 3 | 🔒 K10 전용 | 설명 없는 환경 | 80% |
| Phase 4 | 🔒 K10 전용 | 물리 시스템 | 90% |
| Phase 5 | 📋 출시 후 | AUTUS | 100% |

> ⚠️ **Phase 3/4는 출시 후 계급별 적용**
> K2: Phase 2 유지 → 90일 후 Phase 3
> K10: 즉시 Phase 3/4

---

## ✅ Phase 1 완료 내역 — "운영 도구" 위장

### K2 Operator UI 변경

| 이전 | 이후 |
|------|------|
| AUTUS K2 \| Action-Bound View | 업무 운영 시스템 |
| EXECUTE | 처리 |
| REPORT BLOCKAGE | 이슈 등록 |
| STABLE / DRIFTING / LOCKED | 정상 / 점검 중 / 제한 |
| GATE: OPEN / NEAR / LOCKED | 상태: 정상 / 점검 / 제한 |
| SCALE LOCK: K2 | 운영 모드 |
| K2 · ACTION-BOUND VIEW | 업무 운영 |

### K10 Observer UI 변경

| 이전 | 이후 |
|------|------|
| AUTUS K10 \| Closure View | 운영 모니터링 |
| OBSERVATION ALTITUDE: K10 | 모니터링 모드: 관측 |
| NO APPLY · AUTO CLOSURE ONLY | 자동 운영 · 실시간 모니터링 |
| CLOSURE STATE: OBSERVING | 시스템 상태: 모니터링 |
| CAUSAL NETWORK | 연결 현황 |
| AFTERIMAGE LOG | 시스템 로그 |
| What if... (hypothesis only) | 검색... |

### Portal UI 변경

| 이전 | 이후 |
|------|------|
| AUTUS | 운영 시스템 |
| DIGITAL TWIN | 통합 관리 |
| GATE CONSTITUTION | 운영 정책 |
| K2 OPERATOR / DIGITAL TWIN / K10 OBSERVER | 업무 운영 / 통합 현황 / 모니터링 |
| NO RECOMMENDATION · OBSERVATION ONLY | 실시간 모니터링 · 조회 전용 |
| CURRENT ALTITUDE | 현재 보기 |
| GRAVITY PRESETS | 지역 설정 |
| NODES | 운영 항목 |

---

## ✅ Phase 2 완료 — 권한 축소 체감

### 목표 달성
- ✅ 사용자가 결정을 덜 내리게 됨
- ✅ "왜 안 되는지"를 묻지 않게 만듦

### 변경 내역

**K2 Operator UI:**
- ✅ 실행 성공/실패 피드백 완전 제거
- ✅ 버튼 상태 변화만 표시 (opacity)
- ✅ 결과는 환경 변화로만 체감

**K10 Observer UI:**
- ✅ 시스템 통계 섹션 완전 제거
- ✅ 검색 placeholder 제거
- ✅ 힌트 텍스트 제거

**Portal UI:**
- ✅ 노드 카드에서 K/Ψ/I 수치 완전 제거
- ✅ 상태 표시만 유지 (정상/점검 중/조건 미충족)
- ✅ 시뮬레이션 엔트로피 수치 제거
- ✅ 시간 표시 제거

**정책 문구 전환:**
- ✅ READY → 정상
- ✅ SIMULATING → 처리 중
- ✅ HALTED → 완료
- ✅ GATE LOCKED → 조건 미충족
- ✅ Gate: NONE/RING/LOCK → 정상/점검 중/조건 미충족

---

## 📋 Phase 3 예정 — 설명 소멸

### 목표
- '이해'가 아니라 '적응'이 일어남

### 변경 예정
- 도움말 / FAQ 점진 제거
- "왜?"에 대한 문서 삭제
- 행동 가이드 → 0
- Afterimage 존재는 K10만 인지

---

## 📋 Phase 4 예정 — 물리 시스템 인식

### 목표
- 사용자가 시스템을 "규칙이 아니라 환경"으로 인식

### 변경 예정

**UI 체감 강화:**
- Gate RING 시: 지연·저항 더 강하게
- LOCK 시: 버튼 자체 비활성, 메시지 없음

**정책 문구 전환:**
- ❌ 정책 / 규칙
- ⭕ 환경 / 조건 / 상태

---

## 📋 Phase 5 예정 — AUTUS 명시 (선별적)

### 목표
- 소수(K10/핵심 사용자)만 AUTUS를 인식

### 노출 전략
- K2: 끝까지 "운영툴"
- K10: AUTUS 철학 문서 제공
- 외부: AUTUS 명칭 미사용 또는 추상화

---

## 정책 문구 가이드

### ❌ 금지 문구

- AI 판단
- 자동 의사결정
- 알고리즘 추천
- 머신러닝 예측
- AUTUS (Phase 5 전까지)

### ⭕ 허용 문구

- 운영 안정화 로직
- 리스크 방지 정책
- 시스템 조건
- 자동 처리
- 운영 환경

---

## 최종 고정 문장

> **AUTUS는 갑자기 드러나면 거부당한다.**
>
> **환경처럼 스며들면 아무도 거부하지 않는다.**
