# RFC 0004: Zero Identity Protocol

Status: Proposed Standard
Version: 1.0.0
Published: 2024-11-23

## Abstract
3D behavioral identity without PII.

## 1. Purpose
Identity system that:
- Requires no login/accounts
- Stores no PII
- Uses 3D coordinates
- Remains 100% local

## 2. Architecture
- Core: 32-byte cryptographic seed
- Representation: SHA256(seed) -> (X,Y,Z)
- Surface: Behavioral characteristics
- Storage: Local device only

## 3. Generation
seed = secrets.token_bytes(32)
hash = sha256(seed)
x, y, z = coordinates from hash

## 4. Properties
- Deterministic: Same seed -> Same coords
- Unique: Different seeds -> Different coords
- Irreversible: Cannot derive seed from coords

## 5. Storage
identity.yaml: Core coordinates + surface
core.encrypted: Seed (AES-256-GCM)

## 6. Privacy
Never stored: name, email, phone
Only stored: (X,Y,Z), characteristics, patterns

## 7. Implementation
See: protocols/identity.md
Reference: protocols/identity/core.py

---
Version: 1.0.0
