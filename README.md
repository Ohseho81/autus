# 🌌 AUTUS - 초개인 성장 OS

> The Protocol for Personal AI Operating Systems
> "AUTUS develops AUTUS" - 자기 자신을 개발하는 AI OS

[![Python](https://img.shields.io/badge/Python-94.5%25-blue)](https://python.org)
[![Tests](https://img.shields.io/badge/Tests-51%20passed-green)](tests/)
[![API](https://img.shields.io/badge/API-72%2B%20endpoints-cyan)](http://localhost:8003/docs)
[![Auto-Generated](https://img.shields.io/badge/Auto--Generated-47%20files-purple)](evolved/)

---

## 🎯 What is AUTUS?

AUTUS는 **자기 자신을 개발하는 AI Operating System**입니다.

- 🧬 **Meta-Circular Development**: AI가 코드를 자동 생성
- 🔐 **Zero Identity**: 로그인 없음, 프라이버시 보장
- 🌍 **Reality Events**: 현실 세계 이벤트를 디지털로 변환
- 👑 **Sovereign Data**: 데이터 주권을 사용자에게

---

## 📜 Constitution (헌법)

AUTUS는 5가지 불변의 원칙을 따릅니다:

| Article | Name | Rule |
|---------|------|------|
| I | **Zero Identity** | No login, no accounts, 3D Living Form only |
| II | **Privacy by Architecture** | No PII in databases |
| III | **Meta-Circular Development** | AUTUS develops AUTUS |
| IV | **Minimal Core** | Core < 500 lines, everything else is Packs |
| V | **Network Effect** | Protocol monopoly through necessity |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AUTUS Universe                         │
├─────────────────────────────────────────────────────────────┤
│  🆔 Layer 1: Zero Identity                                  │
│     └─ No login, 3D coordinates, QR sync                    │
├─────────────────────────────────────────────────────────────┤
│  🔐 Layer 2: Sovereign                                      │
│     └─ Data ownership, permissions, consent, audit          │
├─────────────────────────────────────────────────────────────┤
│  🌍 Layer 3: Digital Twin                                   │
│     └─ Reality events → State sync → Graph                  │
├─────────────────────────────────────────────────────────────┤
│  📦 Layer 4: Pack Engine                                    │
│     └─ Auto-evolution, self-development                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Stats

| Metric | Value |
|--------|-------|
| **API Endpoints** | 72+ |
| **Test Cases** | 51 (100% pass) |
| **Auto-Generated Files** | 47 |
| **Auto-Generated Lines** | ~17,000+ |
| **Protocols** | 4 (Reality, Auth, Memory, Rules) |
| **Constitution Articles** | 5 |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+ (for Dashboard)
- Anthropic API Key

### Installation

```bash
# Clone
git clone https://github.com/Ohseho81/autus.git
cd autus

# Python setup
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Environment
echo "ANTHROPIC_API_KEY=your-key-here" > .env

# Run API Server
uvicorn main:app --reload --port 8003

# Run Dashboard (separate terminal)
cd web
npm install
npm run dev
```

### Access
- **API Docs**: http://localhost:8003/docs
- **Dashboard**: http://localhost:5173

---

## 🖥️ Dashboard

### God Mode (Seho Only)

- 🏙️ Cities: 3
- 👥 Users: 5,420
- ⚡ Events/min: 45
- 💚 Health: 98%

### My Dashboard (Role-based)
- Student: 내 할일, 진행률
- Teacher: 내 반, 출석
- Facility: 내 구역, 점검

### Evolution Monitor
- 47 auto-generated files
- Real-time evolution status

---

## 🔌 API Overview

### Identity & Auth
```
GET  /twin/auth/identity
GET  /twin/auth/qr
GET  /twin/auth/coordinates/{id}
```

### Sovereign (18 endpoints)
```
POST /sovereign/token/generate
GET  /sovereign/token/validate/{id}
POST /sovereign/permission/check
POST /sovereign/data/sign
GET  /sovereign/audit/log
POST /sovereign/consent/grant
POST /sovereign/import
```

### Reality Events
```
POST /api/v1/reality-events/webhook/sensor
POST /api/v1/reality-events/webhook/sensor/batch
GET  /api/v1/reality-events/devices/{id}/status
GET  /api/v1/reality-events/twin/graph
```

### Role-based View
```
GET  /me?role=student
GET  /me?role=teacher
GET  /me?role=seho
GET  /god/universe?role=seho  # God Mode only
GET  /god/graph?role=seho
```

### Auto Evolution
```
POST /auto/analyze/simulate
GET  /auto/needs
POST /auto/generate
POST /auto/cycle
GET  /auto/status
```

---

## 🧬 Auto Evolution

AUTUS는 스스로 코드를 생성합니다:

```
Pattern Detected → Need Identified → Spec Generated → Code Evolved
```

### Generated Modules
- `growth_engine` - 1,858 lines
- `workflow_engine` - 1,200 lines
- `twin_realtime_sync` - 900 lines
- `sovereign_layer` - 2,612 lines
- ... and 43 more files

---

## 📁 Project Structure

```
autus/
├── api/                    # REST API (72+ endpoints)
├── core/                   # Core modules
├── engines/                # Telemetry, Pattern, Evolution
├── evolved/                # Auto-generated code (47 files)
├── packs/                  # Pack definitions
├── policies/               # Global & city policies
├── protocols/              # Reality, Auth, Memory, Rules
├── rules/                  # View & auth scopes
├── sovereign/              # Data sovereignty layer
├── specs/                  # Feature specifications
├── tests/                  # 51 test cases
├── web/                    # React Dashboard
├── constitution.yaml       # 5 Articles
├── main.py                 # FastAPI app
├── evolution_orchestrator.py
└── continuous_loop.py
```

---

## 🧪 Testing

```bash
# Run all tests
PYTHONPATH=. pytest tests/ -v

# Results: 51 passed, 4 warnings
```

---

## 🐳 Docker

```bash
# Build
docker build -t autus .

# Run
docker-compose up
```

---

## 🛣️ Roadmap

- [x] Constitution & Governance
- [x] Zero Identity Protocol
- [x] Sovereign Data Layer
- [x] Reality Event Engine
- [x] Role-based View System
- [x] Auto Evolution Engine
- [x] Dashboard UI
- [x] CI/CD Pipeline
- [ ] Mobile PWA
- [ ] Multi-city Deployment
- [ ] Real Device Integration

---

## 📄 License

MIT License - See [LICENSE](LICENSE)

---

## 👤 Author

**Seho Oh** - [@Ohseho81](https://github.com/Ohseho81)

---

<p align="center">
  <strong>🌌 AUTUS - The OS that develops itself</strong><br>
  Built with ❤️ following the Constitution
</p>

