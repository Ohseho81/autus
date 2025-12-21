# AUTUS PILOT SYSTEM — CURSOR COMMAND
# Philippine Workforce Development × 10 Subjects
# Version: FINAL UNIFIED

---

## 🎯 ONE-LINE MISSION

```
"76개 결정을 5개 노선 × 12개 환승선으로 계측하여
10명 파일럿의 PNR을 실시간 감지하고
인간만 CHOOSE 버튼을 누르게 하라"
```

---

## 🔒 ABSOLUTE LOCKS

```yaml
FORBIDDEN:
  - 추천 알고리즘: ❌
  - 비교 UI: ❌
  - 자동 결정: ❌
  - Undo: ❌
  - 설정/옵션: ❌

MANDATORY:
  - 자동 계측: ⭕
  - PNR 감지: ⭕
  - 인간만 ACTION: ⭕
  - Audit 불변: ⭕
  - Tesla Main / SpaceX Sub: ⭕
```

---

## 📐 SYSTEM ARCHITECTURE

### 1. 5 LINES (노선)

```
┌─────────────────────────────────────────────────────────┐
│ LINE   │ COLOR   │ DECISIONS  │ ENTITY                 │
├─────────────────────────────────────────────────────────┤
│ S      │ #00ff88 │ #1-20      │ Subject (학생)         │
│ O      │ #00aaff │ #21-36     │ Operator (송출기관)     │
│ E      │ #ff66ff │ #37-45     │ Education (교육기관)    │
│ P      │ #ffaa00 │ #46-55     │ Sponsor (기업)         │
│ G      │ #888888 │ #66-71     │ Government (정부)       │
└─────────────────────────────────────────────────────────┘
```

### 2. 12 TRANSFERS (환승선)

```
┌─────────────────────────────────────────────────────────┐
│ ID  │ FROM → TO      │ EXCHANGE        │ PNR           │
├─────────────────────────────────────────────────────────┤
│ T1  │ S#9 → O#23     │ 학비→교육투자    │ -             │
│ T2  │ S#10 ↔ O#28   │ 탈락판정        │ ⚠️ WARNING    │
│ T3  │ O#29 ↔ E#37   │ 제휴계약        │ -             │
│ T4  │ S#11 ← G#66   │ 비자발급        │ ⚠️ WARNING    │
│ T5  │ S#16 ↔ E#44   │ 학위완료        │ ⚠️ WARNING    │
│ T6  │ E#45 → P#46   │ 인력추천        │ -             │
│ T7  │ S#17 → P#46   │ 노동력제공      │ -             │
│ T8  │ O#31 ↔ P#49   │ 고용조건        │ -             │
│ T9  │ S#18 ↔ P#50   │ 직무매칭        │ -             │
│ T10 │ S#19 ↔ P#54   │ 고용관계        │ ⚠️ WARNING    │
│ T11 │ S#20 ↔ P#55   │ 장기정착        │ 🔴 PNR        │
│ T12 │ O#33 ↔ P#54   │ 이탈관리        │ 🔴 PNR        │
└─────────────────────────────────────────────────────────┘
```

### 3. STATE MACHINE

```
SAFE (PNR > 21d)
  │
  │ PNR ≤ 21d
  ▼
WARNING (PNR 7-21d)
  │
  │ PNR ≤ 7d
  ▼
CRITICAL (PNR ≤ 7d) ──→ [SpaceX Docking Mode 자동 전환]
  │
  │ PNR crossed
  ▼
IRREVERSIBLE (Audit Only)
```

---

## 🗄️ DATABASE SCHEMA

### Core Tables

```sql
-- 개체 (Entity)
CREATE TABLE entities (
  id UUID PRIMARY KEY,
  type ENUM('subject', 'operator', 'education', 'sponsor', 'government'),
  name VARCHAR(100),
  current_decision INT,
  current_phase VARCHAR(50),
  overall_state ENUM('SAFE', 'WARNING', 'CRITICAL', 'IRREVERSIBLE'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 결정 (Decision)
CREATE TABLE decisions (
  id SERIAL PRIMARY KEY,
  number INT UNIQUE,           -- 1-76
  name VARCHAR(100),
  phase VARCHAR(50),
  line CHAR(1),                -- S/O/E/P/G
  is_pnr BOOLEAN DEFAULT FALSE,
  pnr_days_default INT
);

-- 개체별 결정 상태
CREATE TABLE entity_decisions (
  id UUID PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  decision_id INT REFERENCES decisions(id),
  status ENUM('pending', 'active', 'completed', 'skipped'),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  choice_made VARCHAR(100),
  UNIQUE(entity_id, decision_id)
);

-- 환승선 (Transfer)
CREATE TABLE transfers (
  id VARCHAR(10) PRIMARY KEY,  -- T1-T12
  from_decision INT,
  to_decision INT,
  from_line CHAR(1),
  to_line CHAR(1),
  exchange_type VARCHAR(50),
  is_pnr BOOLEAN DEFAULT FALSE
);

-- 환승 인스턴스 (개체 간 연결)
CREATE TABLE transfer_instances (
  id UUID PRIMARY KEY,
  transfer_id VARCHAR(10) REFERENCES transfers(id),
  from_entity_id UUID REFERENCES entities(id),
  to_entity_id UUID REFERENCES entities(id),
  status ENUM('pending', 'active', 'completed', 'failed'),
  exchange_value JSONB,
  pnr_date DATE,
  days_to_pnr INT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- PNR 로그 (불변)
CREATE TABLE pnr_audit_log (
  id UUID PRIMARY KEY,
  entity_id UUID REFERENCES entities(id),
  transfer_id VARCHAR(10),
  decision_number INT,
  pnr_crossed_at TIMESTAMP,
  final_state JSONB,
  is_irreversible BOOLEAN DEFAULT TRUE
);
```

---

## 🔢 PNR FORMULAS

```python
def determine_state(days: int) -> str:
    """일수 → 상태"""
    if days <= 0:
        return "IRREVERSIBLE"
    elif days <= 7:
        return "CRITICAL"
    elif days <= 21:
        return "WARNING"
    else:
        return "SAFE"
```

---

## 📌 ONE FINAL REMINDER

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   AUTUS는 결정하지 않는다.                               │
│   AUTUS는 보여주기만 한다.                               │
│                                                         │
│   길을 보여주고, 임계에서 정렬하고,                       │
│   선택은 인간이 한다.                                    │
│                                                         │
│   STANDARDS DECIDE. LOOK & CHOOSE.                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```
