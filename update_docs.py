#!/usr/bin/env python3
import os

faq = """# AUTUS FAQ

## What is AUTUS?
Protocol for personal AI sovereignty.

## Different from ChatGPT?
- 100% local vs server
- Learns YOUR style vs generic
- Multiple AI vs single

## Is it free?
Core: Yes forever (MIT)

## Status?
Week 1-3 complete (25% MVP)

GitHub: github.com/autus
"""

rfc = """# RFC 0001: AUTUS Constitution

Status: Proposed Standard
Version: 1.0.0

## The Five Articles

### I. Zero Identity
No login, no accounts.

### II. Privacy by Architecture
No PII in databases, 100% local.

### III. Meta-Circular Development
AUTUS develops AUTUS.

### IV. Minimal Core
Core < 500 lines.

### V. Network Effect
Protocol standard through necessity.

## Enforcement
These articles are IMMUTABLE.
"""

wp = """# AUTUS Whitepaper

Version 1.0 | November 2024

## Executive Summary
AUTUS captures $50B+ AI market via protocol-first approach.

## Market
- TAM: $150B
- SAM: $50B
- SOM: $5B

## Technology
Week 1-3: 70% differentiation proven
- Multi-AI: 100% success
- Learning: 90% confidence
- Data: 100% local

## Business Model
- Freemium: $9.99/mo
- Enterprise: $99-999/user/mo
- Protocol: $10K-1M/year

## Projections
Year 1: $1.2M
Year 2: $9M
Year 3: $42M

## Ask
$2M seed round

Contact: invest@autus.ai
"""

def_c = """# AUTUS: Definitive Concept

Version 1.0 | 2024-11-23

## Core Statement
AUTUS is not technology. AUTUS is ORDER.

## The 10 Principles

1. Order: New social order
2. Local Sovereignty: 100% local
3. Pattern Standard: Workflow Protocol
4. Multi-AI: Always best
5. Meta-Circular: Self-developing
6. Four Protocols: Complete stack
7. Ecosystem: Protocol-driven
8. Air-Like Monopoly: Dependency
9. Open Source = Control
10. Philosophy to Order

## Comparison

Traditional AI: Tech/Product, Server, Company-owned
AUTUS: Order/Protocol, 100% Local, User sovereignty

## Why This Works
No other AI project can reach this level.
Built on philosophy, not just technology.

Status: Foundation Complete
"""

with open("docs/public/AUTUS-FAQ.md", "w") as f:
    f.write(faq)
print("✅ FAQ")

with open("docs/rfc/RFC-0001-CONSTITUTION.md", "w") as f:
    f.write(rfc)
print("✅ RFC")

with open("docs/business/AUTUS-WHITEPAPER.md", "w") as f:
    f.write(wp)
print("✅ Whitepaper")

with open("docs/concepts/AUTUS_DEFINITIVE.md", "w") as f:
    f.write(def_c)
print("✅ Definitive")

print("")
print("🎉 4개 문서 업데이트 완료!")
