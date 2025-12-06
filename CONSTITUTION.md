# AUTUS Constitution

The foundational principles governing the AUTUS Personal Operating System.

---

## Article 0: Purpose of the Digital Twin

### Principle
**AUTUS Digital Twin expresses four pillars: Information, Context, Intent, and Impact.**

### The Four Pillars

| Pillar | Definition | Layer |
|--------|------------|-------|
| **Information** | Facts, states, events collected from reality | 3_worlds |
| **Context** | Relationships, structure, time between information | 2_sovereign + 3_worlds |
| **Intent** | Goals, policies, strategies to achieve | 1_identity + 4_packs |
| **Impact** | Results, effects, feedback on the world | 4_packs + universe |

### The Operational Loop
```
Information → Context → Intent → Impact → Information ...
```

### Layer Mapping
- **Layer 1 (Identity)**: Intent - Who drives change?
- **Layer 2 (Sovereign)**: Context + Intent - What are my values?
- **Layer 3 (Worlds)**: Information + Context - Where do I belong?
- **Layer 4 (Packs)**: Intent + Impact - How do I act?
- **Universe**: Impact - What is the result?

### Rationale
The Digital Twin is not a copy of reality—it is the **decision engine** that observes, understands, and changes reality through the continuous loop of these four pillars.

---

## Article I: Zero Identity

### Principle
**No login system. No email collection. No accounts.**

### Implementation
- Identity is a 32-byte local seed
- Zero ID is derived via SHA-256 hash
- QR-based device-to-device sync only
- Seed never transmitted to servers

### File
`protocols/auth/zero_auth.py`

---

## Article II: Privacy by Architecture

### Principle
**All personal data stored locally only. No server transmission. No PII in any database.**

### Implementation
- Local YAML storage (`~/.autus.memory.yaml`)
- Preferences, patterns, workflows stored on device
- Data policy: `local_only`

### File
`protocols/memory/local_memory.py`

---

## Article III: Meta-Circular Development

### Principle
**AUTUS develops AUTUS. The system builds itself at AI speed.**

### Implementation
- Architect Pack: Plans features
- Codegen Pack: Generates code
- Testgen Pack: Writes tests
- Pipeline Pack: Orchestrates workflow

### Dev Packs
- School Pack
- Visa Pack
- CMMS Pack
- Admissions Pack

---

## Article IV: 1-2-3-4-Universe Model

### Layers

| Layer | Name | Question |
|-------|------|----------|
| 1 | Identity | Who am I? |
| 2 | Sovereign | What do I value? |
| 3 | Worlds | Where do I belong? |
| 4 | Packs | How do I act? |
| U | Universe | What am I changing? |

### Philosophy
Your Personal Operating System - a decision engine for life.

---

## Article V: Standard Workflow

### Principle
**All workflows follow the WorkflowGraph standard.**

### Implementation
- Nodes: Entities with id, type, properties
- Edges: Relationships with source, target, type
- Validation: Graph integrity checks

### File
`standard.py`

---

*AUTUS Protocol v1.0.0*



---

## Article II: Data Sovereignty (Extended)

### Principle
**AUTUS never stores raw data. All data is processed locally, and servers receive only summarized 'results' for Twin/Universe prediction.**

### Data Processing Levels

| Level | Name | Description | Location |
|-------|------|-------------|----------|
| **L0** | Raw | Immediately deleted, never transmitted | Device only |
| **L1** | Processed | First-stage local processing | Sovereign Memory |
| **L2** | Summary | Aggregated/anonymized statistics | User-controlled |
| **L3** | Impact Metrics | Final metrics for Universe | AUTUS receives |

### What AUTUS Never Receives
- Original text/files
- Browser input/history
- Personal identifiable information
- OS logs
- GPS precise location
- Voice/video/photos
- External app activity

### Data Collection Sources (5 Legal Paths)

1. **AUTUS App** - Local behavior observation
2. **Browser Extension** - Domain categories only (with consent)
3. **OS Signals** - Summarized patterns only (with permission)
4. **Pack Telemetry** - Execution success/failure metrics
5. **City/School API** - Aggregated institutional data

### Twin Pillar Mapping

| Pillar | Data Flow Role |
|--------|----------------|
| **Information** | L0 → L1 (Reality input summarized) |
| **Context** | L1 → L2 (Relationships/patterns formed) |
| **Intent** | Pack goals / User objectives |
| **Impact** | L3 (Final metrics to Universe) |

### Official Statement
> "AUTUS는 raw data를 절대 저장하지 않으며, 모든 데이터는 디바이스에서 1차 가공되고, 서버는 요약된 '결과'만 받아 Twin·Universe의 미래 예측에 사용한다."



