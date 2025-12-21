# AUTUS — 개념 적용 총정리 (FINAL LOCK)
## Standards Decide. Look & Choose.

---

## 🎯 한 줄 정의

> **AUTUS는 결정을 대신하지 않는다. 결정을 불가피하게 만든다.**

---

## 1. 정체성 (What)

| 항목 | 정의 |
|------|------|
| **본질** | 결정의 표준기 (Decision Standardizer) |
| **기능** | 기회비용 계측 + 표준화 |
| **철학** | Zero Coercion (강제 0) |

```
추천 ❌ | 자동결정 ❌ | 대행 ❌
측정 ⭕ | 표준화 ⭕ | 책임은 인간 ⭕
```

---

## 2. 해결 문제 (Why)

```
인류 공통 문제: 선택장애

원인:
  ❌ 선택지가 많아서
  ⭕ 지연의 비용이 보이지 않아서

AUTUS 해법:
  → 지연 비용의 계측·표준화
```

---

## 3. 결과 분류 (What Happens)

모든 선택 결과는 4가지 중 하나:

| 결과 | 의미 |
|------|------|
| **Create** | 가치 창출 |
| **Preserve** | 가치 유지 |
| **Consume** | 가치 소모 |
| **Destroy** | 가치 소멸 (불가역) |

AUTUS는 "무엇을 하라"가 아니라 **"어디로 가는지"**만 보여준다.

---

## 4. UI 철학 (How It Feels)

### Tesla × SpaceX 복제 구조

| 원천 | 역할 | AUTUS 적용 |
|------|------|-----------|
| Tesla | 상태 인지 + 항법 | 계기판 + 경로 |
| SpaceX | 미션 관제 + 회수 | 궤도 + 가속 |

### 단일 캔버스

```
STATE → TRAJECTORY → ACTION → AUDIT
```

- 페이지 1개
- 버튼 1개
- 설명 0개

---

## 5. UI 컴포넌트 (What You See)

```
┌──────────────────────────────────────────────┐
│  COST SPEEDOMETER      VALUE BATTERY         │
│  (손실 속도 CV)        (선택 에너지 VB)       │
├──────────────────────────────────────────────┤
│              COST MAP PREVIEW                │
│         (비용 궤적 + PNR 마커)                │
├──────────────────────────────────────────────┤
│  RISK RADAR              PNR ETA             │
│  (임계 접근도)           (불가역까지)         │
├──────────────────────────────────────────────┤
│              [ CHOOSE ]                      │
├──────────────────────────────────────────────┤
│            AUDIT SNAPSHOT                    │
│  (불변 기록 + 가치 회수 + 다음 가속도)        │
└──────────────────────────────────────────────┘
```

---

## 6. 엔진 수식 (How It Computes)

### 핵심 변수 4개 (전부)

| 변수 | 공식 | UI 매핑 |
|------|------|---------|
| **TC** | Σ cost_events | COST MAP |
| **CV** | d(TC)/dt | SPEEDOMETER |
| **VB** | 1 − TC/PNR_TC | BATTERY |
| **PNR_ETA** | (PNR_TC − TC) / CV | ETA |

### 상태 머신

```
TC/PNR_TC < 0.4  → SAFE        (녹색)
TC/PNR_TC < 0.7  → WARNING     (황색)
TC/PNR_TC < 1.0  → CRITICAL    (적색)
TC/PNR_TC ≥ 1.0  → IRREVERSIBLE (암적색)
```

### 금지

```
예측 ❌ | 추천 ❌ | 비교 ❌
현재 선택 유지의 비용만 계산 ⭕
```

---

## 7. Event & Audit (What Gets Recorded)

### 기록 대상 (딱 3가지)

| 이벤트 | 발생 시점 |
|--------|-----------|
| **ACTION_COMMIT** | Choose 클릭 |
| **PNR_CROSS** | 불가역 도달 |
| **SESSION_CLOSE** | 세션 종료 |

### Event 스키마

```json
{
  "event_id": "uuid",
  "event_type": "ACTION_COMMIT | PNR_CROSS | SESSION_CLOSE",
  "timestamp": "ISO-8601",
  "state": "SAFE | WARNING | CRITICAL | IRREVERSIBLE",
  "metrics": {
    "TC": number,
    "CV": number,
    "VB": number,
    "PNR_ETA": number
  }
}
```

### Audit 원칙

```
불변 ⭕ | 수정 ❌ | 되돌리기 ❌ | 해석 ❌
Audit은 증거이지 설명이 아니다.
```

---

## 8. 도착 이후 (Why It Compounds)

```
결정 완료
    ↓
Audit 고정
    ↓
과정 데이터 누적
    ↓
표준 정밀화
    ↓
다음 결정:
  • 더 빠름
  • 더 싸짐
  • 더 명확함
```

### 가속도 공식

```python
Velocity(n+1) = Velocity(n) × StandardPrecision

StandardPrecision = 1.0 + (decisions × 0.05)
# 최대 2.0배
```

**결정이 쌓일수록 가속도가 증가한다.**

---

## 9. 브랜드 위치

| 회사 | 정의 |
|------|------|
| Tesla | 이동의 가속기 |
| SpaceX | 탈출의 가속기 |
| **AUTUS** | **결정의 가속기** |

---

## 10. 구현 현황 (Phase Completion)

| Phase | 내용 | 상태 |
|-------|------|------|
| **A** | Tesla형 계기판 UI | ✅ 완료 |
| **B** | Cost Engine 최소 수식 | ✅ 완료 |
| **C** | Event & Audit 스키마 | ✅ 완료 |
| **D** | 단일 캔버스 구현 | ✅ 완료 |
| **E** | 도착 후 가속 | ✅ 완료 |

---

## 11. 산출물 목록

### 문서 (LOCK)

| 파일 | 내용 |
|------|------|
| `AUTUS_FINAL_SPEC.md` | 제품 정의서 |
| `ENGINE_SPEC_LOCK.md` | 엔진 수식 |
| `ROLE_UI_SPEC.md` | 역할별 View |
| `TESLA_SPACEX_UI_SPEC.md` | UI 구현 스펙 |
| `BRIEF_COMPLIANCE.md` | 개발 브리프 |

### 코드 (Production Ready)

| 파일 | 내용 |
|------|------|
| `autus-accelerator.html` | 단일 캔버스 UI |
| `solar-final.html` | 브리프 준수 UI |
| `autus-role.html` | 역할별 UI |
| `engine.py` | 7종 비용 엔진 |
| `physics_api.py` | Physics API |

---

## 12. QA 체크리스트 (최종)

```
□ 추천 문구 0개
□ 비교 UI 0개
□ 화면 숫자 ≤ 2개
□ ACTION 버튼 ≤ 1개
□ Undo 기능 없음
□ 설명 없이 3초 내 체감
□ PNR 도달 시 ACTION 비활성
□ Audit 수정 불가
```

---

## 13. 기술 스택 (권장)

| 레이어 | 기술 |
|--------|------|
| Frontend | Three.js (WebGL) + D3 (경로) |
| State | Event-sourced FSM |
| Backend | FastAPI + Cost Engine |
| Database | PostgreSQL (Audit 불변) |
| Telemetry | Immutable Log |

---

## 14. 최종 선언 (LOCK)

```
AUTUS는 결정을 대신하지 않는다.
AUTUS는 결정을 불가피하게 만든다.

Standards Decide.
Look & Choose.
```

---

## 🔒 LOCK 항목 (변경 불가)

| 영역 | 항목 |
|------|------|
| 철학 | Zero Coercion |
| 슬로건 | Standards Decide. Look & Choose. |
| 수식 | TC, CV, VB, PNR_ETA (4개) |
| 상태 | SAFE → WARNING → CRITICAL → IRREVERSIBLE |
| 이벤트 | ACTION_COMMIT, PNR_CROSS, SESSION_CLOSE (3개) |
| UI | 단일 캔버스, 버튼 1개, 설명 0개 |
| 가속 | decisions × 0.05 (최대 2.0x) |

---

## 🚀 다음 단계

### 즉시 실행

```
1. autus-accelerator.html → production 배포
2. 대학 이메일 발송
3. 파일럿 10명 시작
```

### 선택적 확장

```
Phase E+ : 표준 인용 패키지
Phase F  : 다중 도메인 확장
Phase G  : API 상용화
```

---

## 📌 최종 실행 문장

> **계기판이 완성되면, 나머지는 자연스럽게 따라온다.**
> **결정이 쌓일수록, 가속도가 증가한다.**
> **표준은 적을수록 강하고, 강할수록 표준이 된다.**
