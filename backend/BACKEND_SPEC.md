# AUTUS 72³ 백엔드 스펙

## 데이터베이스 스키마 (Supabase/PostgreSQL)

### 1. node_snapshots - 월간 상태 스냅샷

```sql
CREATE TABLE node_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id TEXT NOT NULL,                    -- 학원 ID
  entity_type TEXT NOT NULL,                  -- 'ACADEMY' | 'RETAIL' | 'FREELANCER'
  timestamp TIMESTAMPTZ NOT NULL,             -- 기록 시점
  period TEXT NOT NULL,                       -- '2025-01' 형식
  
  -- 72개 노드 값 (JSONB)
  values JSONB NOT NULL,
  /*
  {
    "n01": 23000000,   -- 현금
    "n05": 52000000,   -- 수입
    "n06": 41000000,   -- 지출
    "n09": 127,        -- 고객수
    "n17": 0.98,       -- 수입흐름
    "n21": 0.05,       -- 신규율
    "n33": 0.78,       -- 충성도
    "n34": 0.75,       -- 강사근속
    "n41": -0.03,      -- 수입가속
    "n45": -0.01,      -- 고객가속
    "n47": 0.15,       -- 경쟁압력
    "n57": 45000,      -- CAC
    "n69": 0.35,       -- 추천율
    "n70": 0.38        -- 의존도
  }
  */
  
  metadata JSONB,                             -- 추가 정보
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_snapshots_entity ON node_snapshots(entity_id, timestamp);
CREATE INDEX idx_snapshots_period ON node_snapshots(period);
```

### 2. learning_history - 학습 히스토리

```sql
CREATE TABLE learning_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id TEXT NOT NULL,
  step INTEGER NOT NULL,                      -- 학습 스텝
  timestamp TIMESTAMPTZ NOT NULL,
  
  mse DECIMAL(10,8) NOT NULL,                 -- Mean Squared Error
  mae DECIMAL(10,8) NOT NULL,                 -- Mean Absolute Error
  adjustments_count INTEGER NOT NULL,         -- 조정된 계수 수
  
  -- 조정 상세 (JSONB)
  adjustments JSONB NOT NULL,
  /*
  [
    {
      "from": "n33",
      "to": "n09",
      "oldCoef": 0.5,
      "newCoef": 0.52,
      "delta": 0.02
    }
  ]
  */
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_learning_entity ON learning_history(entity_id, step);
```

### 3. causal_coefficients - 학습된 인과 계수

```sql
CREATE TABLE causal_coefficients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id TEXT NOT NULL,
  
  from_node TEXT NOT NULL,                    -- 'n33'
  to_node TEXT NOT NULL,                      -- 'n09'
  
  prior_value DECIMAL(10,6) NOT NULL,         -- 초기값 (Prior)
  current_value DECIMAL(10,6) NOT NULL,       -- 현재값 (Posterior)
  
  total_adjustment DECIMAL(10,6) NOT NULL,    -- 총 조정량
  adjustment_count INTEGER NOT NULL,          -- 조정 횟수
  
  last_updated TIMESTAMPTZ NOT NULL,
  
  UNIQUE(entity_id, from_node, to_node)
);

CREATE INDEX idx_coef_entity ON causal_coefficients(entity_id);
```

### 4. predictions - 예측 기록

```sql
CREATE TABLE predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id TEXT NOT NULL,
  
  prediction_date TIMESTAMPTZ NOT NULL,       -- 예측 생성일
  target_period TEXT NOT NULL,                -- 예측 대상 기간 '2025-03'
  
  predicted_values JSONB NOT NULL,            -- 예측값
  actual_values JSONB,                        -- 실제값 (검증 후)
  
  mse DECIMAL(10,8),                          -- 검증 후 MSE
  verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pred_entity ON predictions(entity_id, target_period);
```

### 5. entities - 개체 정보

```sql
CREATE TABLE entities (
  id TEXT PRIMARY KEY,                        -- 'academy-001'
  
  name TEXT NOT NULL,                         -- '세호학원'
  type TEXT NOT NULL,                         -- 'ACADEMY'
  owner_id UUID REFERENCES auth.users(id),
  
  config JSONB DEFAULT '{}',                  -- 설정
  /*
  {
    "learningRate": 0.1,
    "activeNodes": ["n01", "n05", "n06", "n09", "n33"],
    "thresholds": {
      "n33": { "warning": 0.7, "critical": 0.6 }
    }
  }
  */
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## API 엔드포인트

### 인증

```
POST /auth/signup          - 회원가입
POST /auth/login           - 로그인
POST /auth/logout          - 로그아웃
GET  /auth/me              - 현재 사용자
```

### 개체 (Entity)

```
POST   /entities                    - 개체 생성
GET    /entities                    - 내 개체 목록
GET    /entities/:id                - 개체 상세
PATCH  /entities/:id                - 개체 수정
DELETE /entities/:id                - 개체 삭제
```

### 스냅샷 (월간 데이터)

```
POST   /entities/:id/snapshots      - 스냅샷 추가
GET    /entities/:id/snapshots      - 스냅샷 목록
GET    /entities/:id/snapshots/:period  - 특정 기간 스냅샷
DELETE /entities/:id/snapshots/:period  - 스냅샷 삭제
```

### 학습

```
POST   /entities/:id/learn          - 학습 실행
GET    /entities/:id/learning-history  - 학습 히스토리
GET    /entities/:id/coefficients   - 학습된 계수
```

### 예측

```
POST   /entities/:id/predict        - 예측 생성
GET    /entities/:id/predictions    - 예측 목록
POST   /entities/:id/predictions/:predId/verify  - 예측 검증
```

### Pressure

```
GET    /entities/:id/pressure       - 현재 압력 상태
GET    /entities/:id/pressure/history  - 압력 히스토리
```

---

## API 요청/응답 예시

### 스냅샷 추가

**Request:**
```http
POST /entities/academy-001/snapshots
Content-Type: application/json
Authorization: Bearer {token}

{
  "period": "2025-01",
  "values": {
    "n01": 23000000,
    "n05": 52000000,
    "n06": 41000000,
    "n09": 127,
    "n33": 0.78,
    "n34": 0.75,
    "n57": 45000,
    "n70": 0.38
  },
  "metadata": {
    "newCustomers": 8,
    "churnCustomers": 5,
    "marketingCost": 500000
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "entityId": "academy-001",
    "period": "2025-01",
    "values": { ... },
    "createdAt": "2025-01-08T12:00:00Z"
  }
}
```

### 학습 실행

**Request:**
```http
POST /entities/academy-001/learn
Content-Type: application/json
Authorization: Bearer {token}

{
  "epochs": 10,
  "learningRate": 0.1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dataMonths": 6,
    "learningSteps": 50,
    "initialMse": 0.0234,
    "finalMse": 0.0089,
    "improvement": 62.0,
    "topAdjustments": [
      { "from": "n33", "to": "n09", "delta": 0.05 },
      { "from": "n05", "to": "n01", "delta": 0.03 }
    ]
  }
}
```

### 예측 생성

**Request:**
```http
POST /entities/academy-001/predict
Content-Type: application/json
Authorization: Bearer {token}

{
  "periods": 3
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "predictions": [
      {
        "period": "2025-02",
        "values": {
          "n01": 26000000,
          "n05": 55000000,
          "n09": 132,
          "n33": 0.76
        }
      },
      {
        "period": "2025-03",
        "values": { ... }
      },
      {
        "period": "2025-04",
        "values": { ... }
      }
    ]
  }
}
```

### Pressure 조회

**Request:**
```http
GET /entities/academy-001/pressure
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overallState": "PRESSURING",
    "items": [
      {
        "nodeId": "n33",
        "nodeName": "고객 충성도",
        "value": 0.72,
        "state": "PRESSURING",
        "threshold": { "warning": 0.7, "critical": 0.6 },
        "deadline": "2025-01-31",
        "estimatedLoss": 5200000,
        "costType": "FINANCIAL"
      },
      {
        "nodeId": "n70",
        "nodeName": "핵심강사 의존도",
        "value": 0.42,
        "state": "PRESSURING",
        "threshold": { "warning": 0.4, "critical": 0.55 },
        "costType": "TALENT"
      }
    ],
    "summary": {
      "pressuring": 2,
      "ignorable": 8,
      "totalEstimatedLoss": 5200000
    }
  }
}
```

---

## 환경 변수

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# API
API_PORT=8000
API_HOST=0.0.0.0

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# 학습
DEFAULT_LEARNING_RATE=0.1
DEFAULT_EPOCHS=10
MIN_DATA_MONTHS=2
```

---

## 디렉토리 구조

```
backend/
├── src/
│   ├── main.py              # FastAPI 진입점
│   ├── config.py            # 설정
│   ├── database.py          # Supabase 연결
│   │
│   ├── auth/
│   │   ├── router.py        # 인증 라우터
│   │   └── service.py       # 인증 서비스
│   │
│   ├── entities/
│   │   ├── router.py        # 개체 라우터
│   │   ├── service.py       # 개체 서비스
│   │   └── schemas.py       # Pydantic 스키마
│   │
│   ├── snapshots/
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   │
│   ├── learning/
│   │   ├── router.py
│   │   ├── service.py
│   │   ├── engine.py        # LearningLoop72 Python 버전
│   │   └── schemas.py
│   │
│   ├── predictions/
│   │   ├── router.py
│   │   ├── service.py
│   │   └── schemas.py
│   │
│   └── pressure/
│       ├── router.py
│       ├── service.py
│       └── schemas.py
│
├── tests/
│   └── ...
│
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

---

## 빠른 시작

### 1. Supabase 테이블 생성

Supabase SQL Editor에서 위 스키마 실행

### 2. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일 수정
```

### 3. 실행

```bash
# 개발
uvicorn src.main:app --reload --port 8000

# Docker
docker-compose up -d
```

### 4. API 문서

```
http://localhost:8000/docs     # Swagger UI
http://localhost:8000/redoc    # ReDoc
```
