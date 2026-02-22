# 🔒 AUTUS 본질 선언 (Essence Lock)

> **AUTUS는 일을 관리하지 않는다.**
> **사람의 '좋은 변화'만을 끝까지 책임진다.**

이 문장은 변경 대상이 아니다.

---

## 1. 핵심 통찰 (Insight Cards)

### Insight 1 — 직업의 목적은 '행위'가 아니라 '상태 변화'

| 직업 | ❌ 행위 중심 | ✅ 상태 변화 중심 |
|------|-------------|------------------|
| 코치 | 수업 진행 | **학생의 성장** |
| 소장 | 공정 관리 | **현장의 완성** |
| 의사 | 진료 | **환자의 치료** |
| 트레이너 | 운동 지도 | **고객의 건강** |

**→ AUTUS는 행동을 관리하지 않고, 상태 변화를 증명한다.**

### Insight 2 — 소비자는 결과 이전에 '경험의 질'을 산다

- 성장·완성·치료·건강은 **고통의 정당화가 아니다**
- 소비자가 원하는 것:
  **행복한 시간 + 결과 달성의 동시 충족**

### Insight 3 — 시스템의 책임은 '본질 외 요소 제거'

- 설명, 판단, 행정, 방어는 모두 **본질이 아님**
- AUTUS는 본질만 남기기 위해 **나머지를 시스템이 흡수**

---

## 2. Outcome 정의 (업종별)

```typescript
// outcomeConfig.ts
const OUTCOME_DEFINITIONS = {
  'SERVICE.EDU.SPORTS.BASKETBALL': {
    outcome: '학생의 성장',
    metric: 'growth_index',
    unit: '%',
  },
  'SERVICE.CONSTRUCTION.RESIDENTIAL.HOUSE': {
    outcome: '현장의 완성',
    metric: 'completion_rate',
    unit: '%',
  },
  'SERVICE.HEALTH.CLINIC': {
    outcome: '환자의 치료',
    metric: 'recovery_index',
    unit: '%',
  },
  'SERVICE.EDU.SPORTS.FITNESS': {
    outcome: '고객의 건강',
    metric: 'health_index',
    unit: 'score',
  },
};
```

---

## 3. 코드 규칙 (Code Rules)

### 3.1 금지어 (Banned Words)

UI 어디에도 다음 단어 사용 금지:

```
❌ 업무, 작업, 관리, 처리, 진행
✅ 성장, 변화, 달성, 완성, 치료, 건강
```

### 3.2 상태 문장 (State Sentence)

모든 화면에서 소비자에게 보여줄 3줄:

```
1. 지금 상태 (Where you are)
2. 다음 단계 (What's next)
3. 걱정할 필요 없음 (Don't worry)
```

### 3.3 관리자 지표

관리자 대시보드에서 허용되는 지표:

```
✅ 결과 변화율 (Outcome Change Rate)
✅ 상태 전이 성공률 (State Transition Success)
❌ 업무 처리량
❌ 작업 시간
```

---

## 4. Modularity Map

### 🔒 Core (절대 고정)

- Outcome 정의 (성장/완성/치료/건강)
- 상태 전이 로그 (State Transition Log)
- Proof 기반 결과 확인 (Evidence-based Verification)

### 🔄 Edge (유연)

- 산업별 결과 측정 방식
- 표현 언어 (라벨)
- 보조 KPI

---

## 5. 개발자 체크리스트

새 기능/화면 개발 시 확인:

```
□ 이 기능이 "좋은 변화"에 기여하는가?
□ 불필요한 "행위" 기록을 요구하지 않는가?
□ 소비자의 "행복한 시간"을 방해하지 않는가?
□ 관리자에게 "결과 변화율"만 보여주는가?
□ 금지어를 사용하지 않았는가?
```

---

## 6. SehoOS 점수

| 항목 | 점수 |
|------|------|
| I (Insight) | 10 |
| C (Core) | 10 |
| O (Outcome) | 10 |
| P (Philosophy) | 9 |
| R (ROI) | 9 |
| H (Happiness) | 10 |
| M (Modularity) | 9 |
| D (Delta) | 9 |
| G (Global) | 9 |
| V (Vision) | 10 |
| Risk | 2 |
| **Total** | **99/100** |

---

## 7. Next Loop Delta

1. 모든 SERVICE에 **Outcome Sentence 강제 삽입**
2. UI 어디에도 **'업무'라는 단어 사용 금지**
3. 관리자 지표 = **결과 변화율만 허용**
4. **"행복한 시간"을 방해하는 UX 제거**

---

## 8. 최종 정의문 (헌장)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   AUTUS는 일을 관리하지 않는다.                          │
│   사람의 '좋은 변화'만을 끝까지 책임진다.                  │
│                                                         │
│   이 문장은 변경 대상이 아니다.                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

*SehoOS · EP10 (Full Loop) 기준*
*버전: 1.0.0*
*상태: LOCKED 🔒*
