# AUTUS Core Schema Specification

## LOCKED: Do not modify without LOCK review

### State
```typescript
State(subject_type, status, computed_at)
```
- `subject_type`: Entity classification (student, payment, rule, etc.)
- `status`: Current state value
- `computed_at`: ISO timestamp

### Eligibility  
```typescript
Eligibility(subject_type, action_type, eligible, evaluated_at)
```
- `subject_type`: What is being evaluated
- `action_type`: What action is being considered
- `eligible`: **YES/NO only** (no scores exposed)
- `evaluated_at`: ISO timestamp

### Approval
```typescript
Approval(subject_id, action_type, decision, decided_at, decision_cost, reversibility, blast_radius, deadline)
```
- `subject_id`: Unique identifier
- `action_type`: Type of action requiring approval
- `decision`: APPROVED | DENIED | DEFERRED
- `decided_at`: ISO timestamp (null if pending)
- `decision_cost`: LOW | MED | HIGH
- `reversibility`: easy | hard
- `blast_radius`: local | segment | global
- `deadline`: TTL expiry timestamp

### Fact (APPEND-ONLY)
```typescript
Fact(event_type, subject_id, value, timestamp, source)
```
- `event_type`: One of ≤20 defined events
- `subject_id`: Related entity ID
- `value`: JSON payload
- `timestamp`: ISO timestamp
- `source`: Origin system

## Rules
1. **Fact is append-only**: NO updates, NO deletes
2. **No reasons, no feelings, no interpretations**
3. **UI must read only Fact-derived view models**
