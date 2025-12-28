# AUTUS - Autonomous Twin Universal System

> Physics-based Business Intelligence Platform

[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/release/python-3110/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Overview

AUTUS는 물리학 원리를 비즈니스 인텔리전스에 적용한 **혁신적인 시스템**입니다.

사람과 관계를 물리 입자와 힘으로 모델링하여 가치 흐름을 최적화합니다.

### 🌌 Core Concepts

```
x축 (돈)     → 순수익 기여도
y축 (시간)   → 소모 시간
z축 (시너지) → 결합 에너지 (-1 ~ +1)
```

### ⚛️ Physics Formulas

```
중력 가치:   V = G × Σ (m_i × m_j) / r_ij²
엔트로피:    S = k × ln(W)
AUTUS 엔트로피: S = ln(갈등 × 미스매치 × 이탈 × 비효율)
통합 가치:   V_total = G_value × e^(-S/5) × (1 + p)
양자 가치:   V_quantum = Σ p_i × V_i
```

### 🔮 Quantum-Inspired Variables

| 변수 | 설명 |
|------|------|
| **Superposition (중첩)** | 여러 역할 동시 가능성 |
| **Entanglement (얽힘)** | 비국소적 시너지 전파 |
| **Uncertainty (불확실성)** | Δ돈 × Δ시간 ≥ ℏ |

---

## 📦 Features

- ✅ **3D Physics Map** (x-y-z 좌표계)
- ✅ **5개 클러스터링** (GOLDEN, EFFICIENCY, HIGH_ENERGY, STABLE, REMOVAL)
- ✅ **4개 궤도** (SAFETY, ACQUISITION, REVENUE, EJECT)
- ✅ **엔트로피 계산** (볼츠만, 섀넌, AUTUS)
- ✅ **양자 영감 변수** (중첩, 얽힘, 불확실성)
- ✅ **자동 최적화 엔진**
- ✅ **실시간 WebSocket 업데이트**
- ✅ **Redis Pub/Sub 브로드캐스트**
- ✅ **PostgreSQL 영속 저장**
- ✅ **JWT 인증**
- ✅ **백그라운드 스케줄러**

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI, Uvicorn, Pydantic |
| Database | PostgreSQL, SQLAlchemy Async |
| Cache | Redis |
| Auth | JWT (python-jose) |
| Scheduler | APScheduler |
| Container | Docker, Docker Compose |
| Proxy | Nginx |
| Frontend | Vanilla JS, Canvas API |

---

## 🚀 Quick Start

### 1. Clone & Setup

```bash
git clone https://github.com/your-repo/autus.git
cd autus

# 환경 변수 설정
cp .env.example .env
# .env 파일 수정
```

### 2. Docker Compose (권장)

```bash
# 모든 서비스 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 3. Local Development

```bash
# 의존성 설치
pip install -r requirements.txt

# PostgreSQL & Redis 시작
docker-compose up -d postgres redis

# 개발 서버 실행
make dev
# 또는
uvicorn backend.main:app --reload --port 8000
```

### 4. Access

| URL | 설명 |
|-----|------|
| http://localhost:8000 | API 루트 |
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/redoc | ReDoc |
| http://localhost:8000/health | 헬스체크 |

---

## 📡 API Endpoints

### Nodes (노드)
```
GET    /api/nodes           # 모든 노드 조회
GET    /api/nodes/{id}      # 단일 노드 조회
POST   /api/nodes           # 노드 생성
PUT    /api/nodes/{id}      # 노드 업데이트
DELETE /api/nodes/{id}      # 노드 삭제
POST   /api/nodes/batch     # 일괄 생성
```

### Map (물리 맵)
```
GET    /api/map             # Physics Map 데이터
POST   /api/reposition      # 노드 재배치
GET    /api/clusters        # 클러스터 정보
GET    /api/golden-volume   # 골든 볼륨
```

### Entanglement (얽힘)
```
GET    /api/entanglements            # 모든 얽힘
POST   /api/entanglements            # 얽힘 생성
DELETE /api/entanglements/{a}/{b}    # 얽힘 삭제
```

### Physics (물리)
```
POST   /api/calculate-synergy    # 시너지 계산
GET    /api/entropy              # 엔트로피 조회
GET    /api/entropy/components   # 엔트로피 구성요소
GET    /api/value                # 시스템 가치
```

### Quantum (양자)
```
GET    /api/quantum/state              # 양자 상태
POST   /api/quantum/measure/{node_id}  # 상태 측정 (붕괴)
```

### Actions (액션)
```
GET    /api/actions/pending      # 대기 액션
GET    /api/actions/history      # 히스토리
POST   /api/actions              # 액션 추가
POST   /api/actions/execute      # 실행
```

### Optimization (최적화)
```
GET    /api/auto-optimize/recommendations  # 추천
POST   /api/auto-optimize/execute          # 실행
```

### WebSocket
```
ws://localhost:8000/ws/map    # 실시간 Map 업데이트
ws://localhost:8000/ws/stats  # 실시간 통계
```

---

## 📊 클러스터 분류

| 클러스터 | 조건 | 설명 |
|----------|------|------|
| **GOLDEN** | x≥0.7, z≥0.7 | 골든 볼륨 (최고 가치) |
| **EFFICIENCY** | x≥0.4, y≤0.3 | 고효율 지대 |
| **HIGH_ENERGY** | x≥0.6, z<0 | 잠재력 높음 |
| **STABLE** | 기본 | 안정 상태 |
| **REMOVAL** | x<0.2 또는 z<-0.5 | 제거 대상 |

---

## 🌀 시너지 공식

```python
z = tanh(0.35×fitness×2 + 0.25×density×2 + 0.20×frequency×2 - 0.20×penalty×3)
```

| 등급 | 범위 | 설명 |
|------|------|------|
| S | z ≥ 0.8 | 화이트홀 |
| A | 0.6 ≤ z < 0.8 | 핵심 연합 |
| B | 0.3 ≤ z < 0.6 | 시너지 |
| C | 0 ≤ z < 0.3 | 중립 |
| D | -0.3 ≤ z < 0 | 마찰 |
| F | z < -0.3 | 블랙홀 |

---

## 📁 Project Structure

```
autus/
├── backend/
│   ├── main.py              # FastAPI 메인
│   ├── config.py            # 설정
│   ├── auth.py              # JWT 인증
│   ├── database.py          # SQLAlchemy
│   ├── websocket_manager.py # WebSocket
│   ├── redis_client.py      # Redis
│   ├── scheduler.py         # 스케줄러
│   └── core/
│       ├── __init__.py
│       ├── unified_system.py     # 통합 엔진
│       ├── quantum_variables.py  # 양자 변수
│       └── physics_formulas.py   # 물리 공식
├── frontend/
│   ├── engines/             # JS 엔진
│   ├── dashboards/          # 대시보드
│   ├── visualizations/      # 시각화
│   └── index.html
├── tests/
│   └── test_all_engines.py
├── scripts/
│   └── init.sql
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── Makefile
└── README.md
```

---

## 🧪 Testing

```bash
# 모든 테스트
make test

# 커버리지 포함
pytest tests/ -v --cov=backend --cov-report=html

# 빠른 테스트
make test-fast
```

---

## 📊 Monitoring

```bash
# 헬스체크
curl http://localhost:8000/health

# 시스템 통계
curl http://localhost:8000/stats

# 클러스터 분포
curl http://localhost:8000/api/clusters
```

---

## 🚀 Production Deployment

```bash
# Nginx 포함 프로덕션 배포
docker-compose --profile production up -d --build

# 환경 변수 설정
export JWT_SECRET=your-super-secret-key
export DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db
```

---

## 🔧 Configuration

### 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `DATABASE_URL` | postgresql://... | DB 연결 |
| `REDIS_URL` | redis://localhost:6379/0 | Redis 연결 |
| `JWT_SECRET` | - | JWT 시크릿 |
| `SCHEDULER_ENABLED` | true | 스케줄러 활성화 |
| `DEBUG` | false | 디버그 모드 |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client                                │
│                  (Browser / Mobile)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                       Nginx                                  │
│                  (Load Balancer)                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
┌─────────────┐ ┌──────────┐ ┌─────────────┐
│  REST API   │ │WebSocket │ │   Static    │
│  /api/*     │ │  /ws/*   │ │   Files     │
└─────────────┘ └──────────┘ └─────────────┘
         │            │
         └────────────┼────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Unified  │ │ Quantum  │ │ Physics  │ │ Actions  │       │
│  │ Engine   │ │Variables │ │ Formulas │ │ Manager  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
┌─────────────┐ ┌──────────┐ ┌─────────────┐
│ PostgreSQL  │ │  Redis   │ │ Scheduler   │
│  (Persist)  │ │ (Cache)  │ │ (Jobs)      │
└─────────────┘ └──────────┘ └─────────────┘
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file.

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## 📞 Support

- Issues: GitHub Issues
- Email: support@autus.ai

---

**AUTUS** - Operating System of Reality

*"사람을 입자로, 관계를 중력으로, 가치를 에너지로"*

🚀 **Version 3.0.0** - Unified System Engine with Quantum Variables
