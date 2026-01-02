# 🔧 AUTUS 미구현 시스템 기술 스펙

> **실제 구현을 위한 완전한 기술 명세서**

---

## 📋 Table of Contents

1. [시스템 아키텍처](#1-시스템-아키텍처)
2. [백엔드 서버 스펙](#2-백엔드-서버-스펙)
3. [데이터베이스 스펙](#3-데이터베이스-스펙)
4. [물리 엔진 스펙](#4-물리-엔진-스펙)
5. [데이터 수집 스펙](#5-데이터-수집-스펙)
6. [시각화 스펙](#6-시각화-스펙)
7. [2버튼 시스템 스펙](#7-2버튼-시스템-스펙)
8. [인증/보안 스펙](#8-인증보안-스펙)
9. [API 명세](#9-api-명세)
10. [인프라 스펙](#10-인프라-스펙)
11. [성능 요구사항](#11-성능-요구사항)

---

## 1. 시스템 아키텍처

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTUS Architecture                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │   Client    │     │   Client    │     │   Client    │           │
│  │  (Browser)  │     │  (Mobile)   │     │   (API)     │           │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘           │
│         │                   │                   │                   │
│         └───────────────────┼───────────────────┘                   │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Load Balancer (Nginx)                     │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│         ┌──────────────────────┼──────────────────────┐            │
│         │                      │                      │             │
│         ▼                      ▼                      ▼             │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │  API Server │       │  API Server │       │  API Server │       │
│  │  (FastAPI)  │       │  (FastAPI)  │       │  (FastAPI)  │       │
│  └──────┬──────┘       └──────┬──────┘       └──────┬──────┘       │
│         │                     │                     │               │
│         └─────────────────────┼─────────────────────┘               │
│                               │                                     │
│         ┌─────────────────────┼─────────────────────┐              │
│         │                     │                     │               │
│         ▼                     ▼                     ▼               │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │    Redis    │       │ PostgreSQL  │       │   Neo4j     │       │
│  │   (Cache)   │       │   (Main)    │       │  (Graph)    │       │
│  └─────────────┘       └─────────────┘       └─────────────┘       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Background Workers                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │ Value    │  │ Synergy  │  │ ETL      │  │ Entropy  │    │   │
│  │  │ Calc     │  │ Calc     │  │ Pipeline │  │ Manager  │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 기술 스택 요약

| 레이어 | 기술 | 버전 | 용도 |
|--------|------|------|------|
| **Frontend** | React + TypeScript | 18.x | SPA |
| **UI Library** | Leaflet + D3.js | 1.9.x | 지도/시각화 |
| **API Server** | FastAPI | 0.104+ | REST API |
| **Realtime** | WebSocket | - | 실시간 동기화 |
| **Main DB** | PostgreSQL | 15+ | 관계형 데이터 |
| **Graph DB** | Neo4j | 5.x | 노드 관계 |
| **Cache** | Redis | 7.x | 캐싱/세션 |
| **Queue** | Celery + Redis | 5.x | 비동기 작업 |
| **Container** | Docker | 24+ | 컨테이너화 |
| **Orchestration** | Docker Compose | 2.x | 로컬 개발 |
| **CI/CD** | GitHub Actions | - | 자동화 |
| **Hosting** | Railway / Vercel | - | 클라우드 |

---

## 2. 백엔드 서버 스펙

### 2.1 프로젝트 구조

```
backend/
├── main.py                 # FastAPI 앱 진입점
├── config.py               # 환경 설정
├── database.py             # DB 연결
│
├── models/                 # SQLAlchemy 모델
│   ├── __init__.py
│   ├── node.py
│   ├── motion.py
│   ├── user.py
│   └── action_log.py
│
├── schemas/                # Pydantic 스키마
│   ├── __init__.py
│   ├── node.py
│   ├── motion.py
│   ├── user.py
│   └── response.py
│
├── routers/                # API 라우터
│   ├── __init__.py
│   ├── auth.py
│   ├── nodes.py
│   ├── motions.py
│   ├── actions.py
│   ├── import_export.py
│   └── stats.py
│
├── engines/                # 물리 엔진
│   ├── __init__.py
│   ├── value_calculator.py
│   ├── synergy_calculator.py
│   ├── entropy_manager.py
│   └── predictor.py
│
├── services/               # 비즈니스 로직
│   ├── __init__.py
│   ├── node_service.py
│   ├── motion_service.py
│   ├── action_service.py
│   └── zero_meaning.py
│
├── workers/                # Celery 태스크
│   ├── __init__.py
│   ├── calculation_tasks.py
│   ├── etl_tasks.py
│   └── cleanup_tasks.py
│
├── utils/                  # 유틸리티
│   ├── __init__.py
│   ├── validators.py
│   ├── converters.py
│   └── helpers.py
│
├── tests/                  # 테스트
│   ├── __init__.py
│   ├── test_nodes.py
│   ├── test_motions.py
│   └── test_engines.py
│
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### 2.2 핵심 의존성

```txt
# requirements.txt

# Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.23
asyncpg==0.29.0
psycopg2-binary==2.9.9
alembic==1.12.1

# Neo4j
neo4j==5.14.0

# Cache
redis==5.0.1
aioredis==2.0.1

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Validation
pydantic==2.5.2
email-validator==2.1.0

# Background Tasks
celery==5.3.4

# Data Processing
pandas==2.1.3
numpy==1.26.2
openpyxl==3.1.2

# WebSocket
websockets==12.0

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2

# Utils
python-dotenv==1.0.0
loguru==0.7.2
```

### 2.3 환경 설정

```python
# config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "AUTUS API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "autus"
    POSTGRES_PASSWORD: str = "autus_password"
    POSTGRES_DB: str = "autus_db"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "neo4j_password"
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    # Physics Engine
    SYNERGY_RATE: float = 0.1          # 시너지율 기본값
    ENTROPY_THRESHOLD: float = 0.0     # 엔트로피 컷 기준
    TIME_COST_RATE: float = 50000      # 시급 (원)
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

---

## 3. 데이터베이스 스펙

### 3.1 PostgreSQL 스키마

```sql
-- 001_initial_schema.sql

-- 확장 설치
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ═══════════════════════════════════════════════════════════
-- USERS (인증용)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ═══════════════════════════════════════════════════════════
-- NODES (사람/자산) - Zero Meaning 적용
-- ═══════════════════════════════════════════════════════════
CREATE TABLE nodes (
    id SERIAL PRIMARY KEY,
    
    -- Zero Meaning: 위치와 가치만
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    value DECIMAL(20, 2) DEFAULT 0,
    
    -- 계산된 필드
    direct_money DECIMAL(20, 2) DEFAULT 0,      -- M
    time_cost DECIMAL(20, 2) DEFAULT 0,          -- T
    synergy_money DECIMAL(20, 2) DEFAULT 0,      -- S
    
    -- 상태
    status VARCHAR(20) DEFAULT 'STABLE',  -- STABLE, OVERHEATED, DECAYING
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 소유자 (옵션)
    owner_id INTEGER REFERENCES users(id),
    
    -- 메타
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_at TIMESTAMP,
    
    -- Zero Meaning 강제: 의미 필드 없음
    -- ❌ name, role, country, category, description 없음
    
    CONSTRAINT valid_status CHECK (status IN ('STABLE', 'OVERHEATED', 'DECAYING'))
);

-- 인덱스
CREATE INDEX idx_nodes_value ON nodes(value DESC);
CREATE INDEX idx_nodes_location ON nodes(lat, lon);
CREATE INDEX idx_nodes_status ON nodes(status);
CREATE INDEX idx_nodes_owner ON nodes(owner_id);
CREATE INDEX idx_nodes_active ON nodes(is_active) WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════════════════
-- MOTIONS (돈 흐름) - Zero Meaning 적용
-- ═══════════════════════════════════════════════════════════
CREATE TABLE motions (
    id SERIAL PRIMARY KEY,
    
    -- Zero Meaning: 출발, 도착, 금액만
    source_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    amount DECIMAL(20, 2) NOT NULL,
    
    -- 시간 정보
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 메타
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Zero Meaning 강제
    -- ❌ reason, type, label, description 없음
    
    CONSTRAINT different_nodes CHECK (source_id != target_id),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- 인덱스
CREATE INDEX idx_motions_source ON motions(source_id);
CREATE INDEX idx_motions_target ON motions(target_id);
CREATE INDEX idx_motions_amount ON motions(amount DESC);
CREATE INDEX idx_motions_time ON motions(occurred_at DESC);

-- ═══════════════════════════════════════════════════════════
-- ACTION_LOGS (2버튼 히스토리)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE action_logs (
    id SERIAL PRIMARY KEY,
    
    action_type VARCHAR(20) NOT NULL,  -- CUT, LINK
    node_id INTEGER REFERENCES nodes(id),
    target_node_id INTEGER REFERENCES nodes(id),
    
    -- 실행 전후 상태
    before_value DECIMAL(20, 2),
    after_value DECIMAL(20, 2),
    
    -- 메타
    executed_by INTEGER REFERENCES users(id),
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_action CHECK (action_type IN ('CUT', 'LINK'))
);

CREATE INDEX idx_action_logs_type ON action_logs(action_type);
CREATE INDEX idx_action_logs_node ON action_logs(node_id);
CREATE INDEX idx_action_logs_time ON action_logs(executed_at DESC);

-- ═══════════════════════════════════════════════════════════
-- CALCULATION_CACHE (계산 캐시)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE calculation_cache (
    id SERIAL PRIMARY KEY,
    node_id INTEGER UNIQUE REFERENCES nodes(id) ON DELETE CASCADE,
    
    cached_value DECIMAL(20, 2),
    cached_synergy DECIMAL(20, 2),
    connected_count INTEGER DEFAULT 0,
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_cache_expires ON calculation_cache(expires_at);

-- ═══════════════════════════════════════════════════════════
-- IMPORT_JOBS (데이터 Import 추적)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL,  -- CSV, XLSX
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, PROCESSING, COMPLETED, FAILED
    
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    
    error_message TEXT,
    
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    uploaded_by INTEGER REFERENCES users(id)
);

-- ═══════════════════════════════════════════════════════════
-- 트리거: updated_at 자동 갱신
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_nodes_updated_at
    BEFORE UPDATE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### 3.2 Neo4j 그래프 스키마

```cypher
// Neo4j 스키마 및 제약조건

// 제약조건
CREATE CONSTRAINT node_id_unique IF NOT EXISTS
FOR (n:Node) REQUIRE n.id IS UNIQUE;

// 인덱스
CREATE INDEX node_value_index IF NOT EXISTS
FOR (n:Node) ON (n.value);

CREATE INDEX node_status_index IF NOT EXISTS
FOR (n:Node) ON (n.status);

// 시너지 쿼리
MATCH (n:Node {id: $node_id})-[:MOTION]-(connected:Node)
RETURN SUM(connected.value) AS total_connected_value,
       COUNT(connected) AS connection_count
```

---

## 4. 물리 엔진 스펙

### 4.1 가치 계산 엔진

```python
# engines/value_calculator.py

class ValueCalculator:
    """
    AUTUS 가치 계산 엔진
    
    핵심 공식: V = M - T + S
    
    V = 최종 가치 (Value)
    M = 직접 돈 (Money) - 유입 금액 합계
    T = 시간 비용 (Time) - 소요 시간 × 시급
    S = 시너지 돈 (Synergy) - 연결 노드로부터의 간접 수익
    """
    
    def calculate_value(self, db: Session, node_id: int) -> Decimal:
        # M: 직접 돈 계산
        direct_money = self._calculate_direct_money(db, node_id)
        
        # T: 시간 비용
        time_cost = node.time_cost
        
        # S: 시너지 돈 계산
        synergy_money = self._calculate_synergy(db, node_id)
        
        # V = M - T + S
        value = direct_money - time_cost + synergy_money
        
        return value
    
    def predict_future_value(self, current_value, synergy_rate, months):
        """복리 예측: Future V = V × (1 + s)^t"""
        return current_value * ((1 + synergy_rate) ** months)
```

---

## 5. API 명세 (주요)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/login` | 로그인 + JWT 발급 |
| GET | `/nodes` | 노드 목록 조회 |
| POST | `/nodes` | 노드 생성 (Zero Meaning) |
| POST | `/nodes/{id}/calculate` | 가치 재계산 |
| GET | `/nodes/{id}/predict` | 복리 예측 |
| POST | `/motions` | 모션 생성 |
| POST | `/actions/cut` | CUT 버튼 실행 |
| POST | `/actions/link` | LINK 버튼 실행 |
| POST | `/import/nodes` | CSV/Excel Import |
| GET | `/stats` | 시스템 통계 |

---

## 6. 성능 요구사항

| 메트릭 | 목표 |
|--------|------|
| 응답 시간 | P95 < 200ms |
| 처리량 | 1,000 req/s |
| 노드 처리 | 100만+ |
| 실시간 지연 | < 100ms |
| 가용성 | 99.9% |
| 시각화 FPS | 60fps |

---

## 📊 스펙 요약

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  AUTUS 기술 스펙 요약                                       │
│                                                             │
│  백엔드: FastAPI + SQLAlchemy + Celery                     │
│  데이터: PostgreSQL + Neo4j + Redis                        │
│  프론트: React + TypeScript + Leaflet                      │
│  인프라: Docker + Railway/Vercel                           │
│                                                             │
│  핵심 엔진:                                                 │
│  • ValueCalculator: V = M - T + S                          │
│  • SynergyCalculator: 그래프 알고리즘                      │
│  • EntropyManager: 자동 정화                               │
│  • ZeroMeaningValidator: 의미 필터링                       │
│                                                             │
│  API: 25+ 엔드포인트                                       │
│  테이블: 6개 (nodes, motions, users, ...)                  │
│  성능: 100만 노드, 1000 req/s, P95 < 200ms                │
│                                                             │
│  예상 개발 기간: 6주 (1인 풀타임)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*AUTUS 기술 스펙 문서 © 2025*





# 🔧 AUTUS 미구현 시스템 기술 스펙

> **실제 구현을 위한 완전한 기술 명세서**

---

## 📋 Table of Contents

1. [시스템 아키텍처](#1-시스템-아키텍처)
2. [백엔드 서버 스펙](#2-백엔드-서버-스펙)
3. [데이터베이스 스펙](#3-데이터베이스-스펙)
4. [물리 엔진 스펙](#4-물리-엔진-스펙)
5. [데이터 수집 스펙](#5-데이터-수집-스펙)
6. [시각화 스펙](#6-시각화-스펙)
7. [2버튼 시스템 스펙](#7-2버튼-시스템-스펙)
8. [인증/보안 스펙](#8-인증보안-스펙)
9. [API 명세](#9-api-명세)
10. [인프라 스펙](#10-인프라-스펙)
11. [성능 요구사항](#11-성능-요구사항)

---

## 1. 시스템 아키텍처

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTUS Architecture                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐           │
│  │   Client    │     │   Client    │     │   Client    │           │
│  │  (Browser)  │     │  (Mobile)   │     │   (API)     │           │
│  └──────┬──────┘     └──────┬──────┘     └──────┬──────┘           │
│         │                   │                   │                   │
│         └───────────────────┼───────────────────┘                   │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Load Balancer (Nginx)                     │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│         ┌──────────────────────┼──────────────────────┐            │
│         │                      │                      │             │
│         ▼                      ▼                      ▼             │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │  API Server │       │  API Server │       │  API Server │       │
│  │  (FastAPI)  │       │  (FastAPI)  │       │  (FastAPI)  │       │
│  └──────┬──────┘       └──────┬──────┘       └──────┬──────┘       │
│         │                     │                     │               │
│         └─────────────────────┼─────────────────────┘               │
│                               │                                     │
│         ┌─────────────────────┼─────────────────────┐              │
│         │                     │                     │               │
│         ▼                     ▼                     ▼               │
│  ┌─────────────┐       ┌─────────────┐       ┌─────────────┐       │
│  │    Redis    │       │ PostgreSQL  │       │   Neo4j     │       │
│  │   (Cache)   │       │   (Main)    │       │  (Graph)    │       │
│  └─────────────┘       └─────────────┘       └─────────────┘       │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Background Workers                        │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │ Value    │  │ Synergy  │  │ ETL      │  │ Entropy  │    │   │
│  │  │ Calc     │  │ Calc     │  │ Pipeline │  │ Manager  │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 기술 스택 요약

| 레이어 | 기술 | 버전 | 용도 |
|--------|------|------|------|
| **Frontend** | React + TypeScript | 18.x | SPA |
| **UI Library** | Leaflet + D3.js | 1.9.x | 지도/시각화 |
| **API Server** | FastAPI | 0.104+ | REST API |
| **Realtime** | WebSocket | - | 실시간 동기화 |
| **Main DB** | PostgreSQL | 15+ | 관계형 데이터 |
| **Graph DB** | Neo4j | 5.x | 노드 관계 |
| **Cache** | Redis | 7.x | 캐싱/세션 |
| **Queue** | Celery + Redis | 5.x | 비동기 작업 |
| **Container** | Docker | 24+ | 컨테이너화 |
| **Orchestration** | Docker Compose | 2.x | 로컬 개발 |
| **CI/CD** | GitHub Actions | - | 자동화 |
| **Hosting** | Railway / Vercel | - | 클라우드 |

---

## 2. 백엔드 서버 스펙

### 2.1 프로젝트 구조

```
backend/
├── main.py                 # FastAPI 앱 진입점
├── config.py               # 환경 설정
├── database.py             # DB 연결
│
├── models/                 # SQLAlchemy 모델
│   ├── __init__.py
│   ├── node.py
│   ├── motion.py
│   ├── user.py
│   └── action_log.py
│
├── schemas/                # Pydantic 스키마
│   ├── __init__.py
│   ├── node.py
│   ├── motion.py
│   ├── user.py
│   └── response.py
│
├── routers/                # API 라우터
│   ├── __init__.py
│   ├── auth.py
│   ├── nodes.py
│   ├── motions.py
│   ├── actions.py
│   ├── import_export.py
│   └── stats.py
│
├── engines/                # 물리 엔진
│   ├── __init__.py
│   ├── value_calculator.py
│   ├── synergy_calculator.py
│   ├── entropy_manager.py
│   └── predictor.py
│
├── services/               # 비즈니스 로직
│   ├── __init__.py
│   ├── node_service.py
│   ├── motion_service.py
│   ├── action_service.py
│   └── zero_meaning.py
│
├── workers/                # Celery 태스크
│   ├── __init__.py
│   ├── calculation_tasks.py
│   ├── etl_tasks.py
│   └── cleanup_tasks.py
│
├── utils/                  # 유틸리티
│   ├── __init__.py
│   ├── validators.py
│   ├── converters.py
│   └── helpers.py
│
├── tests/                  # 테스트
│   ├── __init__.py
│   ├── test_nodes.py
│   ├── test_motions.py
│   └── test_engines.py
│
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### 2.2 핵심 의존성

```txt
# requirements.txt

# Framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6

# Database
sqlalchemy==2.0.23
asyncpg==0.29.0
psycopg2-binary==2.9.9
alembic==1.12.1

# Neo4j
neo4j==5.14.0

# Cache
redis==5.0.1
aioredis==2.0.1

# Auth
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4

# Validation
pydantic==2.5.2
email-validator==2.1.0

# Background Tasks
celery==5.3.4

# Data Processing
pandas==2.1.3
numpy==1.26.2
openpyxl==3.1.2

# WebSocket
websockets==12.0

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.25.2

# Utils
python-dotenv==1.0.0
loguru==0.7.2
```

### 2.3 환경 설정

```python
# config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "AUTUS API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "autus"
    POSTGRES_PASSWORD: str = "autus_password"
    POSTGRES_DB: str = "autus_db"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Neo4j
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USER: str = "neo4j"
    NEO4J_PASSWORD: str = "neo4j_password"
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # JWT
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    
    # Physics Engine
    SYNERGY_RATE: float = 0.1          # 시너지율 기본값
    ENTROPY_THRESHOLD: float = 0.0     # 엔트로피 컷 기준
    TIME_COST_RATE: float = 50000      # 시급 (원)
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
```

---

## 3. 데이터베이스 스펙

### 3.1 PostgreSQL 스키마

```sql
-- 001_initial_schema.sql

-- 확장 설치
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ═══════════════════════════════════════════════════════════
-- USERS (인증용)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- ═══════════════════════════════════════════════════════════
-- NODES (사람/자산) - Zero Meaning 적용
-- ═══════════════════════════════════════════════════════════
CREATE TABLE nodes (
    id SERIAL PRIMARY KEY,
    
    -- Zero Meaning: 위치와 가치만
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    value DECIMAL(20, 2) DEFAULT 0,
    
    -- 계산된 필드
    direct_money DECIMAL(20, 2) DEFAULT 0,      -- M
    time_cost DECIMAL(20, 2) DEFAULT 0,          -- T
    synergy_money DECIMAL(20, 2) DEFAULT 0,      -- S
    
    -- 상태
    status VARCHAR(20) DEFAULT 'STABLE',  -- STABLE, OVERHEATED, DECAYING
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 소유자 (옵션)
    owner_id INTEGER REFERENCES users(id),
    
    -- 메타
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    calculated_at TIMESTAMP,
    
    -- Zero Meaning 강제: 의미 필드 없음
    -- ❌ name, role, country, category, description 없음
    
    CONSTRAINT valid_status CHECK (status IN ('STABLE', 'OVERHEATED', 'DECAYING'))
);

-- 인덱스
CREATE INDEX idx_nodes_value ON nodes(value DESC);
CREATE INDEX idx_nodes_location ON nodes(lat, lon);
CREATE INDEX idx_nodes_status ON nodes(status);
CREATE INDEX idx_nodes_owner ON nodes(owner_id);
CREATE INDEX idx_nodes_active ON nodes(is_active) WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════════════════
-- MOTIONS (돈 흐름) - Zero Meaning 적용
-- ═══════════════════════════════════════════════════════════
CREATE TABLE motions (
    id SERIAL PRIMARY KEY,
    
    -- Zero Meaning: 출발, 도착, 금액만
    source_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    target_id INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    amount DECIMAL(20, 2) NOT NULL,
    
    -- 시간 정보
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 메타
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Zero Meaning 강제
    -- ❌ reason, type, label, description 없음
    
    CONSTRAINT different_nodes CHECK (source_id != target_id),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- 인덱스
CREATE INDEX idx_motions_source ON motions(source_id);
CREATE INDEX idx_motions_target ON motions(target_id);
CREATE INDEX idx_motions_amount ON motions(amount DESC);
CREATE INDEX idx_motions_time ON motions(occurred_at DESC);

-- ═══════════════════════════════════════════════════════════
-- ACTION_LOGS (2버튼 히스토리)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE action_logs (
    id SERIAL PRIMARY KEY,
    
    action_type VARCHAR(20) NOT NULL,  -- CUT, LINK
    node_id INTEGER REFERENCES nodes(id),
    target_node_id INTEGER REFERENCES nodes(id),
    
    -- 실행 전후 상태
    before_value DECIMAL(20, 2),
    after_value DECIMAL(20, 2),
    
    -- 메타
    executed_by INTEGER REFERENCES users(id),
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_action CHECK (action_type IN ('CUT', 'LINK'))
);

CREATE INDEX idx_action_logs_type ON action_logs(action_type);
CREATE INDEX idx_action_logs_node ON action_logs(node_id);
CREATE INDEX idx_action_logs_time ON action_logs(executed_at DESC);

-- ═══════════════════════════════════════════════════════════
-- CALCULATION_CACHE (계산 캐시)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE calculation_cache (
    id SERIAL PRIMARY KEY,
    node_id INTEGER UNIQUE REFERENCES nodes(id) ON DELETE CASCADE,
    
    cached_value DECIMAL(20, 2),
    cached_synergy DECIMAL(20, 2),
    connected_count INTEGER DEFAULT 0,
    
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX idx_cache_expires ON calculation_cache(expires_at);

-- ═══════════════════════════════════════════════════════════
-- IMPORT_JOBS (데이터 Import 추적)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE import_jobs (
    id SERIAL PRIMARY KEY,
    
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL,  -- CSV, XLSX
    status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING, PROCESSING, COMPLETED, FAILED
    
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    failed_rows INTEGER DEFAULT 0,
    
    error_message TEXT,
    
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    uploaded_by INTEGER REFERENCES users(id)
);

-- ═══════════════════════════════════════════════════════════
-- 트리거: updated_at 자동 갱신
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_nodes_updated_at
    BEFORE UPDATE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
```

### 3.2 Neo4j 그래프 스키마

```cypher
// Neo4j 스키마 및 제약조건

// 제약조건
CREATE CONSTRAINT node_id_unique IF NOT EXISTS
FOR (n:Node) REQUIRE n.id IS UNIQUE;

// 인덱스
CREATE INDEX node_value_index IF NOT EXISTS
FOR (n:Node) ON (n.value);

CREATE INDEX node_status_index IF NOT EXISTS
FOR (n:Node) ON (n.status);

// 시너지 쿼리
MATCH (n:Node {id: $node_id})-[:MOTION]-(connected:Node)
RETURN SUM(connected.value) AS total_connected_value,
       COUNT(connected) AS connection_count
```

---

## 4. 물리 엔진 스펙

### 4.1 가치 계산 엔진

```python
# engines/value_calculator.py

class ValueCalculator:
    """
    AUTUS 가치 계산 엔진
    
    핵심 공식: V = M - T + S
    
    V = 최종 가치 (Value)
    M = 직접 돈 (Money) - 유입 금액 합계
    T = 시간 비용 (Time) - 소요 시간 × 시급
    S = 시너지 돈 (Synergy) - 연결 노드로부터의 간접 수익
    """
    
    def calculate_value(self, db: Session, node_id: int) -> Decimal:
        # M: 직접 돈 계산
        direct_money = self._calculate_direct_money(db, node_id)
        
        # T: 시간 비용
        time_cost = node.time_cost
        
        # S: 시너지 돈 계산
        synergy_money = self._calculate_synergy(db, node_id)
        
        # V = M - T + S
        value = direct_money - time_cost + synergy_money
        
        return value
    
    def predict_future_value(self, current_value, synergy_rate, months):
        """복리 예측: Future V = V × (1 + s)^t"""
        return current_value * ((1 + synergy_rate) ** months)
```

---

## 5. API 명세 (주요)

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/auth/login` | 로그인 + JWT 발급 |
| GET | `/nodes` | 노드 목록 조회 |
| POST | `/nodes` | 노드 생성 (Zero Meaning) |
| POST | `/nodes/{id}/calculate` | 가치 재계산 |
| GET | `/nodes/{id}/predict` | 복리 예측 |
| POST | `/motions` | 모션 생성 |
| POST | `/actions/cut` | CUT 버튼 실행 |
| POST | `/actions/link` | LINK 버튼 실행 |
| POST | `/import/nodes` | CSV/Excel Import |
| GET | `/stats` | 시스템 통계 |

---

## 6. 성능 요구사항

| 메트릭 | 목표 |
|--------|------|
| 응답 시간 | P95 < 200ms |
| 처리량 | 1,000 req/s |
| 노드 처리 | 100만+ |
| 실시간 지연 | < 100ms |
| 가용성 | 99.9% |
| 시각화 FPS | 60fps |

---

## 📊 스펙 요약

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  AUTUS 기술 스펙 요약                                       │
│                                                             │
│  백엔드: FastAPI + SQLAlchemy + Celery                     │
│  데이터: PostgreSQL + Neo4j + Redis                        │
│  프론트: React + TypeScript + Leaflet                      │
│  인프라: Docker + Railway/Vercel                           │
│                                                             │
│  핵심 엔진:                                                 │
│  • ValueCalculator: V = M - T + S                          │
│  • SynergyCalculator: 그래프 알고리즘                      │
│  • EntropyManager: 자동 정화                               │
│  • ZeroMeaningValidator: 의미 필터링                       │
│                                                             │
│  API: 25+ 엔드포인트                                       │
│  테이블: 6개 (nodes, motions, users, ...)                  │
│  성능: 100만 노드, 1000 req/s, P95 < 200ms                │
│                                                             │
│  예상 개발 기간: 6주 (1인 풀타임)                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*AUTUS 기술 스펙 문서 © 2025*










