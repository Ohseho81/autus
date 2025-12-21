# AUTUS Brief Compliance Specification (LOCK)

> **"AUTUS는 설득하지 않는다. 측정만 한다."**

---

## 📋 절대 금지 사항

| 항목 | 상태 | 근거 |
|------|------|------|
| 추천 알고리즘 | ❌ 없음 | 설득 ❌ |
| "이게 더 좋다" 메시지 | ❌ 없음 | 비교 ❌ |
| 비교 UI | ❌ 없음 | 설득 ❌ |
| 설정/옵션 페이지 | ❌ 없음 | 복잡성 ❌ |
| 자동 결정 | ❌ 없음 | 인간 선택 ✅ |
| 사용자 설명 과다 | ❌ 없음 | 측정만 ✅ |

---

## 🔢 숫자 규칙

### 절대값 사용 (퍼센트 ❌)

```
AS-IS: 💰 -58%           ❌
TO-BE: ₩12,400,000       ✅

AS-IS: Risk: 58%         ❌
TO-BE: +₩41,000/일       ✅
```

### 상태 표시

```
SAFE        →  GREEN (기존 호환)
WARNING     →  AMBER
CRITICAL    →  RED
IRREVERSIBLE → RED (locked)
```

---

## 📊 7종 기회비용

| # | 유형 | 영문 | 색상 | 계산 |
|---|------|------|------|------|
| 1 | 시간 | TIME | #45B7D1 | 지연일 × 단가 |
| 2 | 위험 | RISK | #FF6B6B | 확률 × 손실액 |
| 3 | 자원 | RESOURCE | #96CEB4 | 초과 지출 |
| 4 | 위치 | POSITION | #FFEAA7 | 놓친 기회 × 가치 |
| 5 | 학습 | LEARNING | #DDA0DD | 학습지연 × 성장률 |
| 6 | 신뢰 | TRUST | #87CEEB | 신뢰손실 × 복구비용 |
| 7 | 비가역 | IRREVERSIBILITY | #FFB6C1 | 복구불가 손실 |

---

## 🚦 상태 머신

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE MACHINE                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   SAFE         →    WARNING      →    CRITICAL             │
│   (0-29%)           (30-59%)          (60-89%)             │
│                                            │                │
│                                            ▼                │
│                                     IRREVERSIBLE           │
│                                       (90%+)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 상태별 동작

| 상태 | ACTION | 복구 |
|------|--------|------|
| SAFE | 선택 가능 | 전체 복구 |
| WARNING | 선택 가능 | 부분 복구 |
| CRITICAL | 선택 가능 | 제한 복구 |
| IRREVERSIBLE | 선택 불가 | 복구 불가 |

---

## 🖥️ UI 구성요소

### 1. LOSS GAUGE (상단)

```html
<div class="loss-gauge">
  <span class="total">₩12,400,000</span>
  <span class="rate">+₩41,000/일</span>
</div>
```

### 2. EROSION LINE (중앙)

- 7개 궤도 (기회비용 7종)
- 크기 = 해당 비용 비율
- 속도 = 증가율
- 색상 = 유형별 고정

### 3. LOSS CARDS (하단 카드)

```html
<div class="loss-card">
  <span class="label">TIME</span>
  <span class="value">₩2,100,000</span>
  <span class="rate">+₩8,000/일</span>
</div>
```

### 4. PNR MARKER

```html
<div class="pnr-marker">
  <span class="days">14일</span>
  <span class="label">후 복구 불가</span>
</div>
```

### 5. ACTION BUTTON

```html
<button class="action-btn">선택</button>
```

**규칙:**
- 텍스트: "선택" (고정)
- 자동 실행 ❌
- 클릭 시: 기록 + 모든 애니메이션 정지

---

## 📡 API 응답

### `/api/v1/physics/solar-binding`

```json
{
  "state": "WARNING",
  "total_loss": 12400000,
  "loss_rate": 41000,
  "pnr_days": 14,
  "costs": {
    "time": 2100000,
    "risk": 3500000,
    "resource": 1200000,
    "position": 2000000,
    "learning": 1500000,
    "trust": 1600000,
    "irreversibility": 500000
  },
  "cost_rates": {
    "time": 8000,
    "risk": 12000,
    "resource": 5000,
    "position": 6000,
    "learning": 4000,
    "trust": 5000,
    "irreversibility": 1000
  },
  
  "risk": 42,
  "gate": "AMBER"
}
```

---

## ✅ QA 체크리스트

```
□ 설명 없이 3초 안에 "잃고 있다"가 느껴지는가
□ 추천 문장이 하나라도 존재하는가 → ❌ 이면 PASS
□ 숫자가 바뀌면 UI 전체가 반응하는가
□ 미뤄도 선택은 가능하지만, 비용은 커지는가
□ 임계점을 넘기면 복구 불가 상태가 명확한가
□ 자동 결정이 발생하는가 → ❌ 이면 PASS
□ 비교 UI가 있는가 → ❌ 이면 PASS
□ 설정 페이지가 있는가 → ❌ 이면 PASS
```

---

## 📁 구현 파일

| 파일 | 용도 |
|------|------|
| `frontend/solar-brief.html` | Brief 준수 UI |
| `app/api/v1/physics_api.py` | Brief 호환 API |
| `docs/BRIEF_COMPLIANCE.md` | 이 문서 |

---

## 🔒 LOCK 상태

| 항목 | 상태 |
|------|------|
| 금지 사항 | 🔒 LOCK |
| 숫자 규칙 | 🔒 LOCK |
| 7종 기회비용 | 🔒 LOCK |
| 상태 머신 | 🔒 LOCK |
| UI 구성요소 | 🔒 LOCK |
| API 응답 | 🔒 LOCK |

---

**Version**: 1.0
**Last Updated**: 2025-12-18
**Status**: LOCKED
