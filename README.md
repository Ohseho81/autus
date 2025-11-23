# AUTUS

> The Protocol for Personal AI Operating Systems

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)

---

## ðŸŽ¯ What is AUTUS?

AUTUS is not an app. **AUTUS is a protocol.**

Like HTTP for the web, AUTUS becomes the **standard protocol for personal AI automation** - where every company must integrate to remain competitive.

### The Vision
```
"ê³µê¸°ê°™ì€ ë…ì "
(Air-like Monopoly)

Everywhere
Essential
Invisible
Unownable
Impossible to replace
```

---

## ðŸ›ï¸ Constitution

AUTUS is built on **5 Immutable Principles**:

### Article I: Zero Identity
- No login system
- No user accounts
- 3D Living Form Identity (local-only)
- Privacy by impossibility, not policy

### Article II: Privacy by Architecture
- No `user_id`, `email`, `name` in databases
- All personal data: Local device only
- GDPR compliant by design

### Article III: Meta-Circular Development
- **AUTUS develops AUTUS**
- Development Packs generate code
- Self-evolving system
- AI-speed development

### Article IV: Minimal Core, Infinite Extension
- Core: < 500 lines
- Everything else: Packs
- LEGO-like modularity
- Open ecosystem

### Article V: Network Effect as Moat
- Protocol monopoly through necessity
- Companies must integrate AUTUS
- Becomes the HTTP of personal AI

[Read Full Constitution â†’](CONSTITUTION.md)

---

## ðŸ—ï¸ Architecture
```
autus/
â”œâ”€â”€ core/              # Minimal Core Engine
â”‚   â”œâ”€â”€ engine/       # PER Loop (Plan-Execute-Review)
â”‚   â”œâ”€â”€ pack/         # Pack System
â”‚   â””â”€â”€ llm/          # LLM Integration
â”‚
â”œâ”€â”€ protocols/         # AUTUS Protocols â­
â”‚   â”œâ”€â”€ workflow/     # Workflow Graph Standard
â”‚   â”œâ”€â”€ memory/       # Local Memory OS
â”‚   â”œâ”€â”€ identity/     # Zero Identity (3D Core)
â”‚   â””â”€â”€ auth/         # Zero Auth Protocol
â”‚
â”œâ”€â”€ packs/            # Pack Ecosystem
â”‚   â”œâ”€â”€ development/  # Meta-Circular Dev Packs
â”‚   â”œâ”€â”€ integration/  # SaaS Connectors
â”‚   â””â”€â”€ examples/     # Sample Packs
â”‚
â””â”€â”€ server/           # API Server
```

---

## ðŸš€ Quick Start

### Prerequisites

- Python 3.11+
- OpenAI API Key or Anthropic API Key

### Installation
```bash
# Clone
git clone https://github.com/yourusername/autus.git
cd autus

# Setup
python -m venv .venv311
source .venv311/bin/activate  # On Windows: .venv311\Scripts\activate
pip install -r requirements.txt

# Configure
echo 'OPENAI_API_KEY=your-key-here' > .env
# or
echo 'ANTHROPIC_API_KEY=your-key-here' > .env
```

### First Run: Meta-Circular Development
```bash
# Let AUTUS plan a feature
python core/pack/runner.py architect_pack \
  '{"feature_description": "3D Identity System"}'

# Generate actual code
python core/pack/runner.py codegen_pack \
  '{"file_path": "protocols/identity/surface.py", "purpose": "Evolving identity surface"}'

# Provider ì„ íƒ (ê¸°ë³¸: auto)
python core/pack/runner.py architect_pack \
  '{"feature_description": "..."}' --provider anthropic
```

**AUTUS just developed AUTUS.** ðŸŽ‰

---

## ðŸ”Œ Core Protocols

### 1. Workflow Graph Standard

Personal behavior pattern format that all SaaS must support.
```yaml
# .autus.graph.json
{
  "user_intent": "automate_emails",
  "pattern": "morning_routine",
  "nodes": [...],
  "edges": [...]
}
```

### 2. Local Memory OS

100% local-first personal memory engine.
```yaml
# .autus.memory.yaml
preferences:
  timezone: "Asia/Seoul"
  language: "ko"
patterns:
  work_hours: "09:00-18:00"
```

### 3. Zero Identity

3D identity with immutable core, evolving surface.
```python
from protocols.identity.core import IdentityCore

seed = secrets.token_bytes(32)
identity = IdentityCore(seed)
# Returns: 3D coordinates (X, Y, Z)
```

### 4. Zero Auth Protocol

QR-based device sync without accounts.

---

## ðŸ“¦ Development Packs

AUTUS includes **meta-circular development packs**:

| Pack | Purpose | Status |
|------|---------|--------|
| `architect_pack` | Generate development plans | âœ… Working |
| `codegen_pack` | Generate Python code | âœ… Working |
| `testgen_pack` | Generate pytest tests | âœ… Working |
| `pipeline_pack` | Orchestrate full workflow | âœ… Working |

### Example: Auto-Generate Feature
```bash
python core/pack/runner.py architect_pack \
  '{"feature_description": "User preference learning system"}'
```

Output:
- Complete file plan
- Implementation phases
- Dependency analysis
- Estimated complexity

---

## ðŸŽ¯ Roadmap

### Phase 1: Protocol Foundation (Current)
- [x] Constitution
- [x] Meta-Circular Development
- [x] Protocol-First Architecture
- [ ] Workflow Graph Standard
- [ ] Local Memory Engine
- [ ] Zero Auth Protocol

### Phase 2: Core Features
- [ ] 3D Identity Visualizer (Three.js)
- [ ] PER Loop Engine Enhancement
- [ ] Pack Validation System

### Phase 3: Ecosystem
- [ ] Pack Marketplace
- [ ] AUTUS SDK (Python, JavaScript)
- [ ] Company Integration Templates

---

## ðŸ¤ Contributing

AUTUS follows the **Constitution**. Any contribution that violates the 5 Principles will be rejected.

1. Fork the repository
2. Create your feature branch
3. Ensure it aligns with Constitution
4. Submit a Pull Request

---

## ðŸ“– Documentation

- [Constitution](CONSTITUTION.md) - 5 Immutable Principles
- [Protocols](docs/protocols/) - Technical Specs
- [Pack Development](docs/guides/pack-development.md) - Create Packs
- [API Reference](docs/api/) - Complete API Docs

---

## ðŸŒŸ Philosophy

### Not Just Software

AUTUS is:
- A **protocol**, not a product
- A **standard**, not a service
- A **movement**, not a company

### The Meta-Circular Loop
```
User Intent
    â†“
AUTUS analyzes
    â†“
Pack generates code
    â†“
Code becomes part of AUTUS
    â†“
AUTUS evolves
```

**AUTUS develops AUTUS develops AUTUS...**

This is the future of software.

---

## ðŸ“œ License

MIT License - See [LICENSE](LICENSE) file

---

## ðŸ”— Links

- Website: [autus.ai](https://autus.ai) (Coming Soon)
- Documentation: [docs.autus.ai](https://docs.autus.ai) (Coming Soon)
- Discord: [discord.gg/autus](https://discord.gg/autus) (Coming Soon)

---

## ðŸ’¬ Contact

- Issues: [GitHub Issues](https://github.com/yourusername/autus/issues)
- Email: hello@autus.ai

---

<p align="center">
  <strong>AUTUS: The Protocol for Personal AI Operating Systems</strong><br>
  Built with â¤ï¸ following the Constitution
</p>
