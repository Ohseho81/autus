# Autus Constitution v1.0

## Article 1: Zero-Action Principle
Autus does nothing. The world does everything on Autus.

## Article 2: The Five Kernel Laws
1. Event Core - Records all inputs
2. Sovereign Interface - Validates ownership
3. Twin Meta-Model - Maintains state
4. Pack Runtime - Executes modules
5. Cell Registry - Registers entities

## Article 3: Participants
- Kernel Architect (1): Maintains laws only
- Module Contributors (∞): Create Packs
- Cell Owners: Operate on Autus
- Pass Holders: Move between Cells

## Article 4: Pass System
- LimePass: Employment mobility
- CityPass: Inter-city mobility
- MarsPass: Interplanetary mobility

## Article 5: Cell Sovereignty
Each Cell operates independently within Kernel constraints.

## Article 6: Transparency
All events recorded. All policies public. All decisions traceable.

## Article 7: ARL System (State/Event/Rule)
The foundational protocol for all Autus operations:

### State (상태)
- Immutable record of cell's data snapshot
- Versioned by timestamp
- Cryptographically signed
- Example: `{ cell_id, user_id, status, timestamp, hash }`

### Event (이벤트)
- Atomic action triggered by external input
- Recorded in append-only event log
- Contains: type, actor, payload, timestamp
- Example: `{ type: "form_submitted", actor: "user_id", payload: {...}, timestamp }`

### Rule (규칙)
- Deterministic condition → action mapping
- Evaluated in topological order
- Conditions are pure functions of State
- Actions modify State predictably
- Example: `if GPA >= 3.5 and LANGUAGE_SCORE > 100 then PROCEED_TO_NEXT_STEP`

#### Rule Types
1. **Validation Rules**: Verify data integrity
   - Syntax rules (format checks)
   - Schema rules (type checks)
   - Semantic rules (business logic)
   - Flow rules (process ordering)

2. **Action Rules**: Modify state transitions
   - Conditional progression
   - Automatic calculations
   - Dependency resolution
   - Error handling

3. **Policy Rules**: Enforce governance
   - Access control
   - Consent management
   - Audit logging
   - Rate limiting

## Article 8: Rule Engine (규칙 엔진)
All decisions in Autus flow through 4 validation layers:

- **V1 Syntax**: JSON/YAML 문법 검증
- **V2 Schema**: 필드 타입 및 필수값 검증
- **V3 Semantic**: 필드 간 정합성 및 의존성 검증
- **V4 Flow**: Step 순서 및 프로세스 흐름 검증

Each layer is independent and composable. Validators can be extended without affecting others.
