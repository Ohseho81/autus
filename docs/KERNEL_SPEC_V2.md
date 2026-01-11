# AUTUS KERNEL v2.0 사양서

> **확정일**: 2026-01-06  
> **버전**: v2.0.0 (불변 커널)  
> **파일**: `backend/core/kernel.py`

---

## 핵심 원칙

```
카테고리 수: 고정 (6-12-6-5)
구분 기준: 물리 변화 (Δ)
Motion: 자동 할당 (선택 불가)
Collector: 의미 무시 (단일 출력)
UI: 투영만 수행

ΔE 적용 순서 (고정):
1. decay (시간 감쇠)
2. friction (저항 적용)
3. motion delta (변화량)
4. clamp [0, 1]
```

---

## 전체 구조

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTUS KERNEL v2.0                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────────────┐
                        │      6 COLLECTORS           │
                        │   (의미 해석 없음)           │
                        ├─────────────────────────────┤
                        │ C0. FINANCIAL    (금융)     │
                        │ C1. BIO_SENSOR   (생체)     │
                        │ C2. WORK_ACTIVITY(업무)     │
                        │ C3. SYSTEM_PROCESS(시스템)  │
                        │ C4. EXTERNAL     (외부환경) │
                        │ C5. RISK_COMPLIANCE(리스크) │
                        └──────────────┬──────────────┘
                                       │
                                       ▼
                        ┌─────────────────────────────┐
                        │    MotionEvent (단일 출력)   │
                        │  (from, to, Δ, R, t)        │
                        └──────────────┬──────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           12 MOTIONS                                        │
│                    (자동 할당 - 선택 개념 아님)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌── 에너지 흐름 ────┐  ┌── 축적/감쇠 ───┐  ┌── 효율/저항 ───┐            │
│   │ M0. INFLOW       │  │ M3. ACCUMULATE │  │ M5. AMPLIFY     │            │
│   │ M1. OUTFLOW      │  │ M4. DECAY      │  │ M6. FRICTION    │            │
│   │ M2. TRANSFER     │  └────────────────┘  └─────────────────┘            │
│   └──────────────────┘                                                      │
│                                                                             │
│   ┌── 안정화 ────────┐  ┌── 임계 이벤트 ──┐  ┌── 강제 정지 ───┐            │
│   │ M7. STABILIZE    │  │ M9.  BREACH    │  │ M11. LOCK      │            │
│   │ M8. BUFFER       │  │ M10. RECOVER   │  └────────────────┘            │
│   └──────────────────┘  └────────────────┘                                 │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          6 PHYSICS NODES                                    │
│                    (물리 변화로만 판별)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌────────────────────────────────────────────────────────────────────┐   │
│   │                                                                    │   │
│   │           BIO (B)                       CAPITAL (C)                │   │
│   │      생존 가능 시간                      저장·축적 가능 값           │   │
│   │            ●                                ●                      │   │
│   │                                                                    │   │
│   │   SECURITY (S)       ●────────●       COGNITION (G)               │   │
│   │    리스크 완충          KERNEL         판단 정확도                  │   │
│   │                                                                    │   │
│   │                                                                    │   │
│   │      ENVIRONMENT (E)                   RELATION (R)                │   │
│   │        외부 저항                         협력 성공률                 │   │
│   │            ●                                ●                      │   │
│   │                                                                    │   │
│   └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          5 PROJECTIONS                                      │
│                    (세분화는 여기서만)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   P0. HEXAGON  ──→  6각형 Physics 맵                                       │
│   P1. KPI      ──→  생산성 / 자본력 / 인지력 / 관계력 / 안정성              │
│   P2. TREND    ──→  상승 / 하강 / 안정                                      │
│   P3. ALERT    ──→  CRITICAL / WARNING                                     │
│   P4. COACH    ──→  개선 우선순위 + 액션                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6 Physics Node 판별 규칙

> 입력 데이터는 **"무엇에 관한가"가 아니라**
> **"상태 벡터에 어떤 물리적 변화(Δ)를 주는가"**로만 판별

| # | Node | 판별 조건 (물리 변화) | 색상 |
|---|------|---------------------|------|
| 0 | **BIO** | 생체 에너지, 피로도, 회복률, 생존 가능 시간 변화 | #22c55e |
| 1 | **CAPITAL** | 시간에 걸쳐 저장·축적 가능한 값 변화 (잔고, 재고, 현금) | #3b82f6 |
| 2 | **COGNITION** | 판단 정확도, 자동화 성공률, 오류율 변화 | #8b5cf6 |
| 3 | **RELATION** | 상호작용 성공 확률, 거래 성사율, 협력 밀도 변화 | #ec4899 |
| 4 | **ENVIRONMENT** | 외부 조건에 의한 저항, 비용 증가, 속도 저하 | #f59e0b |
| 5 | **SECURITY** | 손실 방지, 붕괴 지연, 리스크 완충 능력 변화 | #ef4444 |

### ⚠️ 금지 규칙

- "건강 / 여가 / 업무 / 교육" 같은 **의미 단어 사용 금지**
- 하나의 데이터가 여러 노드로 나뉘지 않음
- **가장 큰 물리 Δ를 발생시킨 노드 1개만 선택**

---

## 12 Motion 자동 판별 규칙

> Motion은 **선택 개념이 아님**. 조건 충족 시 **자동 할당**

| # | Motion | 카테고리 | 방향 | 조건 |
|---|--------|---------|------|------|
| 0 | **INFLOW** | flow | in | from=∅, delta>0 |
| 1 | **OUTFLOW** | flow | out | to=∅, delta<0 |
| 2 | **TRANSFER** | flow | transfer | from≠to, both≠∅ |
| 3 | **ACCUMULATE** | storage | in | from=to, delta>0 |
| 4 | **DECAY** | storage | out | time_elapsed |
| 5 | **AMPLIFY** | efficiency | boost | COGNITION, delta>0 |
| 6 | **FRICTION_APPLY** | efficiency | resist | ENVIRONMENT, delta>0 |
| 7 | **STABILIZE** | stability | neutral | delta≈0 |
| 8 | **BUFFER** | stability | protect | SECURITY, delta>0 |
| 9 | **BREACH** | threshold | down | value < threshold |
| 10 | **RECOVER** | threshold | up | was_breached, value≥threshold |
| 11 | **LOCK** | control | stop | gate_locked=true |

---

## 6 Collector 매핑

| # | Collector | 설명 | 기본 Node |
|---|-----------|------|----------|
| 0 | **FINANCIAL** | 은행, 결제, POS | CAPITAL |
| 1 | **BIO_SENSOR** | 웨어러블, IoT | BIO |
| 2 | **WORK_ACTIVITY** | 업무 로그 | COGNITION |
| 3 | **SYSTEM_PROCESS** | 시스템 로그 | SECURITY |
| 4 | **EXTERNAL** | 날씨, 환율, 규제 | ENVIRONMENT |
| 5 | **RISK_COMPLIANCE** | 리스크, 규정 | SECURITY |

---

## 5 UI Projection 세분화

| 커널 Node | UI Projection |
|-----------|---------------|
| **BIO** | HEALTH, FATIGUE, RECOVERY, PERFORMANCE |
| **CAPITAL** | SAVINGS, ASSETS, CASHFLOW, INVESTMENT |
| **COGNITION** | SKILLS, KNOWLEDGE, DECISIONS, AUTOMATION |
| **RELATION** | FAMILY, FRIENDS, BUSINESS, COMMUNITY |
| **ENVIRONMENT** | WEATHER, ECONOMY, REGULATION, COMPETITION |
| **SECURITY** | INSURANCE, EMERGENCY, BACKUP, PROTECTION |

⚠️ **모두 커널 노드의 "투영값"** - 커널 상태는 변하지 않음

---

## ΔE 적용 공식 (불변)

```python
def apply_event(event):
    # 1. DECAY (시간 감쇠)
    for node in nodes:
        if elapsed > DECAY_INTERVAL:
            node.value → 0.5 (중립점 수렴)
    
    # 2. FRICTION (저항 계산)
    total_friction = event.friction + ENV.value * 0.8 + global_friction
    total_friction = min(0.9, total_friction)
    
    # 3. MOTION DELTA (변화량)
    clamped_delta = clamp(event.delta, -0.05, +0.05)
    effective_delta = clamped_delta * (1.0 - total_friction)
    
    # 4. CLAMP [0, 1]
    node.value = clamp(node.value + effective_delta, 0.0, 1.0)
```

---

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/kernel/` | 커널 정보 |
| GET | `/api/kernel/structure` | 6-12-6-5 구조 |
| GET | `/api/kernel/state` | 전체 상태 |
| GET | `/api/kernel/nodes` | 6개 노드 상태 |
| GET | `/api/kernel/motions` | 12개 모션 정보 |
| GET | `/api/kernel/collectors` | 6개 Collector 정보 |
| POST | `/api/kernel/event` | 이벤트 적용 |
| POST | `/api/kernel/batch` | 배치 이벤트 |
| GET | `/api/kernel/projection/{type}` | UI 투영 |
| GET | `/api/kernel/projections` | 모든 투영 |
| GET | `/api/kernel/matrix` | 6×12 매트릭스 |
| GET | `/api/kernel/summary` | 커널 요약 |
| POST | `/api/kernel/reset` | 커널 리셋 |
| POST | `/api/kernel/lock` | 커널 잠금 |
| POST | `/api/kernel/unlock` | 잠금 해제 |

---

## 한 줄 결론

> **AUTUS는 카테고리를 더 늘릴 필요가 없다.**  
> **대신 "어떻게 구분되는가"를 규칙으로 잠갔다.**

