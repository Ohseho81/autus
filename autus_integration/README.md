# AUTUS 연동 시스템 v2.0

> **Delete to Accelerate + Parasitic Flywheel Absorption**  
> 삭제 70% + 자동화 20% + 시너지 10% = **최대 가속**

## 🏗️ 완성형 아키텍처

```
autus_integration/
├── backend/
│   ├── main.py                    # FastAPI 통합 API
│   ├── config.py                  # 환경변수 설정
│   ├── models.py                  # Pydantic 스키마
│   ├── database.py                # PostgreSQL 클라이언트
│   ├── requirements.txt           # Python 의존성
│   ├── Dockerfile
│   ├── webhooks/
│   │   ├── stripe_webhook.py      # Stripe
│   │   ├── shopify_webhook.py     # Shopify
│   │   ├── toss_webhook.py        # 토스 (수수료 0%)
│   │   └── universal_webhook.py   # 범용 (30+ SaaS 자동 감지)
│   ├── integrations/
│   │   ├── zero_meaning.py        # Zero Meaning 정제
│   │   └── neo4j_client.py        # Neo4j 연동
│   ├── crewai/
│   │   ├── agents.py              # AI 에이전트 (삭제/자동화/외부용역)
│   │   └── api.py                 # CrewAI API
│   ├── parasitic/
│   │   ├── absorber.py            # 기생 → 흡수 → 대체 엔진
│   │   └── api.py                 # Parasitic API
│   └── autosync/
│       ├── detector.py            # SaaS 자동 감지
│       ├── transformer.py         # Universal Transform
│       ├── api.py                 # AutoSync API
│       └── registry/              # 30+ 시스템 설정
│           ├── payment.py         # 결제 (Stripe, 토스, 카카오페이)
│           ├── erp.py             # 교육 ERP (하이클래스, 클래스101)
│           ├── crm.py             # CRM (HubSpot, Salesforce)
│           └── others.py          # POS, 예약, 회계
├── n8n/
│   ├── stripe_webhook.json        # Stripe → Neo4j
│   ├── toss_virtual_account.json  # 토스 가상계좌 (수수료 0%)
│   ├── universal_webhook.json     # 범용 Webhook
│   ├── crewai_analysis.json       # 6시간 자동 분석
│   ├── parasitic_sync.json        # Parasitic 동기화
│   ├── erp_universal_webhook.json # ERP 범용
│   ├── crm_universal_webhook.json # CRM 범용
│   └── error_handler.json         # 에러 핸들링
├── neo4j/
│   └── schema_and_queries.cypher  # Neo4j 스키마
├── monitoring/
│   ├── docker-compose.monitoring.yml
│   ├── prometheus.yml
│   ├── README.md
│   └── grafana/
│       ├── datasources/prometheus.yml
│       └── dashboards/
│           ├── dashboard.yml
│           └── n8n-dashboard.json
├── nginx/
│   └── nginx.conf                 # 리버스 프록시
├── scripts/
│   ├── deploy.sh                  # 배포 스크립트
│   └── backup.sh                  # 백업 스크립트
├── tests/
│   ├── conftest.py
│   └── test_api.py                # API 테스트
├── docker-compose.yml
└── env-template.txt               # 환경변수 템플릿
```

## 🚀 빠른 시작

### 1단계: 환경변수 설정
```bash
cp env-template.txt .env
# 필수 값 수정:
# - STRIPE_SECRET_KEY
# - NEO4J_PASSWORD
# - OPENAI_API_KEY (CrewAI용)
```

### 2단계: 원클릭 배포
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# 모니터링 포함
./scripts/deploy.sh --with-monitoring
```

### 3단계: 확인
```
📡 AUTUS API:   http://localhost:8000
📚 Swagger:     http://localhost:8000/docs
🔄 n8n:         http://localhost:5678
🔵 Neo4j:       http://localhost:7474
📊 Grafana:     http://localhost:3001 (모니터링 시)
```

---

## 💡 핵심 철학

### 1. Zero Meaning (의미 제거)
```
모든 데이터 → { node_id, value, timestamp }

❌ 금지 필드: name, email, phone, description, metadata
✅ 허용 필드: 숫자 ID, 금액, 시간

결과: 완벽한 호환성, 무한 확장
```

### 2. Money Physics (돈 물리학)
```
사람 = Node (에너지 저장소)
돈 = Energy (흐름)

가치 공식: V = (DirectMoney + Synergy) × (1 + FlywheelMultiplier)^t
```

### 3. Delete to Accelerate (삭제로 가속)
```
┌────────────────────────────────────┐
│  삭제 70%  │  가치 ≤ 0 노드 제거  │
│  자동화 20% │  반복 모션 기계화   │
│  시너지 10% │  고가치 연결 확장   │
└────────────────────────────────────┘
```

---

## 💰 수수료 0% 결제

```
카드 결제: 3% 수수료
가상계좌:  0% 수수료  ← AUTUS

월 매출 1억 기준:
├─ 기존: 연 3,600만원 수수료
└─ AUTUS: 0원
   → 100% 절감!
```

**API:**
```bash
POST /webhook/toss
# 가상계좌 입금 완료 시 자동 처리
# fee: 0, fee_saved: 원래금액의 3%
```

---

## 🤖 CrewAI 분석

3명의 AI 에이전트가 24시간 자동 분석:

| 에이전트 | 역할 | 작업 |
|----------|------|------|
| 🗑️ Delete | 삭제 전문가 | 가치 ≤ 0 노드 식별 |
| ⚙️ Automate | 자동화 전문가 | 반복 모션 패턴 탐지 |
| 👥 Outsource | 외부용역 전문가 | 고ROI 도입 추천 |

**API:**
```bash
# 전체 분석
POST /crewai/analyze
{"nodes": [...], "motions": [...]}

# 빠른 삭제 분석
POST /crewai/quick-delete
{"nodes": [...]}

# 빠른 자동화 분석
POST /crewai/quick-automate
{"motions": [...]}
```

**응답:**
```json
{
  "delete": {"targets": [...], "monthly_savings": 500000},
  "automate": {"targets": [...], "time_saved_hours": 40},
  "outsource": {"recommendations": [...]},
  "total_monthly_impact": 4500000
}
```

---

## 🔄 AutoSync (Zero-Input 연동)

### 30+ 지원 시스템

| 분류 | 시스템 |
|------|--------|
| **결제** | Stripe, 토스페이먼츠, 카카오페이, Shopify |
| **교육 ERP** | 하이클래스, 클래스101, 아카데미플러스, 클래스메이트, 짐박스 |
| **CRM** | HubSpot, Salesforce, Zoho, Pipedrive |
| **예약** | 네이버예약, 테이블매니저 |
| **POS** | 토스 POS, 배민포스 |
| **회계** | QuickBooks, Xero |

### Universal Transform
```
Stripe: {customer: "cus_123", amount: 5000}
   ↓ Zero Meaning
{node_id: "cus_123", value: 50, timestamp: "..."}

모든 SaaS → 동일 포맷 → 완벽 호환
```

**API:**
```bash
# 지원 시스템 목록
GET /autosync/systems

# 자동 감지 (쿠키/도메인/API키)
POST /autosync/detect
{"cookies": "stripe_session=...", "domains": ["app.hubspot.com"]}

# 데이터 변환
POST /autosync/transform
{"system_id": "stripe", "data": {...}}

# 연동 시작
POST /autosync/connect
{"system_id": "hubspot", "credentials": {...}}
```

---

## 🦠 Parasitic Absorption

기존 SaaS를 단계적으로 흡수하여 100% 대체:

```
┌─────────────────────────────────────────────────────────────┐
│ PARASITIC (기생)  →  Webhook 연동, 데이터 미러링           │
│       ↓ 동기화 10회+                                        │
│ ABSORBING (흡수)  →  기능 복제, 데이터 100% 이전           │
│       ↓ 검증 완료                                           │
│ REPLACING (대체)  →  기존 SaaS 해지 안내                   │
│       ↓                                                      │
│ REPLACED (완료)   →  AUTUS 단일 운영, 100% 비용 절감       │
└─────────────────────────────────────────────────────────────┘
```

**API:**
```bash
# 기생 시작
POST /parasitic/connect
{"saas_type": "toss_pos"}

# 상태 확인
GET /parasitic/status

# 흡수 진행
POST /parasitic/absorb/{connector_id}

# 대체 시작
POST /parasitic/replace/{connector_id}

# 플라이휠 상태
GET /parasitic/flywheel
```

---

## 📊 모니터링

### 실행
```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### 접속
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/autus123)
- **Uptime Kuma**: http://localhost:3002

### 주요 메트릭
- n8n 워크플로우 실행률/실패율
- API 응답 시간
- Neo4j 연결 수
- 시스템 CPU/메모리

---

## 🧪 테스트

```bash
# 의존성 설치
pip install pytest pytest-asyncio httpx

# 테스트 실행
cd tests
pytest test_api.py -v

# 특정 테스트만
pytest test_api.py::TestZeroMeaning -v
```

---

## 🔐 보안

### API 키 인증 (선택)
```python
# config.py
API_KEY_HEADER = "X-API-Key"
SECRET_KEY = "your-secret-key"
```

### Nginx 리버스 프록시
```bash
# nginx/nginx.conf 사용
# Rate limiting: API 100r/s, Webhook 1000r/s
docker run -d --name nginx -p 80:80 -v ./nginx/nginx.conf:/etc/nginx/nginx.conf nginx
```

---

## 📈 예상 ROI

```
초기 가치: 6천만원

┌──────────┬───────────────────┬──────────┐
│   기간   │       가치        │   배수   │
├──────────┼───────────────────┼──────────┤
│  3개월   │   1억 8천만원     │   3.0x   │
│  6개월   │   4억원           │   6.7x   │
│  12개월  │   13억원          │  21.7x   │
└──────────┴───────────────────┴──────────┘

공식: V = (M - T) × (1 + s)^t
M = 직접 돈
T = 시간 비용
s = 시너지율
t = 경과 기간
```

---

## 🛠️ 개발

### 로컬 개발
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Docker 빌드
```bash
docker build -t autus-api ./backend
docker-compose up -d
```

### 백업
```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
# 결과: backups/autus_backup_YYYYMMDD_HHMMSS.tar.gz
```

---

## 📚 API 문서

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

---

## 🆘 문제 해결

### Docker 네트워크 오류
```bash
docker network create autus-network
```

### Neo4j 연결 실패
```bash
# 로그 확인
docker logs autus-neo4j
# 포트 확인: 7474 (HTTP), 7687 (Bolt)
```

### n8n 워크플로우 실패
```bash
# 1. 환경변수 확인
echo $AUTUS_API_URL

# 2. error_handler.json 워크플로우 활성화
# 3. Slack 알림 설정
```

---

## 📝 라이선스

MIT License

---

**🚀 AUTUS: 삭제하여 가속하라**

# AUTUS 연동 시스템 v2.0

> **Delete to Accelerate + Parasitic Flywheel Absorption**  
> 삭제 70% + 자동화 20% + 시너지 10% = **최대 가속**

## 🏗️ 완성형 아키텍처

```
autus_integration/
├── backend/
│   ├── main.py                    # FastAPI 통합 API
│   ├── config.py                  # 환경변수 설정
│   ├── models.py                  # Pydantic 스키마
│   ├── database.py                # PostgreSQL 클라이언트
│   ├── requirements.txt           # Python 의존성
│   ├── Dockerfile
│   ├── webhooks/
│   │   ├── stripe_webhook.py      # Stripe
│   │   ├── shopify_webhook.py     # Shopify
│   │   ├── toss_webhook.py        # 토스 (수수료 0%)
│   │   └── universal_webhook.py   # 범용 (30+ SaaS 자동 감지)
│   ├── integrations/
│   │   ├── zero_meaning.py        # Zero Meaning 정제
│   │   └── neo4j_client.py        # Neo4j 연동
│   ├── crewai/
│   │   ├── agents.py              # AI 에이전트 (삭제/자동화/외부용역)
│   │   └── api.py                 # CrewAI API
│   ├── parasitic/
│   │   ├── absorber.py            # 기생 → 흡수 → 대체 엔진
│   │   └── api.py                 # Parasitic API
│   └── autosync/
│       ├── detector.py            # SaaS 자동 감지
│       ├── transformer.py         # Universal Transform
│       ├── api.py                 # AutoSync API
│       └── registry/              # 30+ 시스템 설정
│           ├── payment.py         # 결제 (Stripe, 토스, 카카오페이)
│           ├── erp.py             # 교육 ERP (하이클래스, 클래스101)
│           ├── crm.py             # CRM (HubSpot, Salesforce)
│           └── others.py          # POS, 예약, 회계
├── n8n/
│   ├── stripe_webhook.json        # Stripe → Neo4j
│   ├── toss_virtual_account.json  # 토스 가상계좌 (수수료 0%)
│   ├── universal_webhook.json     # 범용 Webhook
│   ├── crewai_analysis.json       # 6시간 자동 분석
│   ├── parasitic_sync.json        # Parasitic 동기화
│   ├── erp_universal_webhook.json # ERP 범용
│   ├── crm_universal_webhook.json # CRM 범용
│   └── error_handler.json         # 에러 핸들링
├── neo4j/
│   └── schema_and_queries.cypher  # Neo4j 스키마
├── monitoring/
│   ├── docker-compose.monitoring.yml
│   ├── prometheus.yml
│   ├── README.md
│   └── grafana/
│       ├── datasources/prometheus.yml
│       └── dashboards/
│           ├── dashboard.yml
│           └── n8n-dashboard.json
├── nginx/
│   └── nginx.conf                 # 리버스 프록시
├── scripts/
│   ├── deploy.sh                  # 배포 스크립트
│   └── backup.sh                  # 백업 스크립트
├── tests/
│   ├── conftest.py
│   └── test_api.py                # API 테스트
├── docker-compose.yml
└── env-template.txt               # 환경변수 템플릿
```

## 🚀 빠른 시작

### 1단계: 환경변수 설정
```bash
cp env-template.txt .env
# 필수 값 수정:
# - STRIPE_SECRET_KEY
# - NEO4J_PASSWORD
# - OPENAI_API_KEY (CrewAI용)
```

### 2단계: 원클릭 배포
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# 모니터링 포함
./scripts/deploy.sh --with-monitoring
```

### 3단계: 확인
```
📡 AUTUS API:   http://localhost:8000
📚 Swagger:     http://localhost:8000/docs
🔄 n8n:         http://localhost:5678
🔵 Neo4j:       http://localhost:7474
📊 Grafana:     http://localhost:3001 (모니터링 시)
```

---

## 💡 핵심 철학

### 1. Zero Meaning (의미 제거)
```
모든 데이터 → { node_id, value, timestamp }

❌ 금지 필드: name, email, phone, description, metadata
✅ 허용 필드: 숫자 ID, 금액, 시간

결과: 완벽한 호환성, 무한 확장
```

### 2. Money Physics (돈 물리학)
```
사람 = Node (에너지 저장소)
돈 = Energy (흐름)

가치 공식: V = (DirectMoney + Synergy) × (1 + FlywheelMultiplier)^t
```

### 3. Delete to Accelerate (삭제로 가속)
```
┌────────────────────────────────────┐
│  삭제 70%  │  가치 ≤ 0 노드 제거  │
│  자동화 20% │  반복 모션 기계화   │
│  시너지 10% │  고가치 연결 확장   │
└────────────────────────────────────┘
```

---

## 💰 수수료 0% 결제

```
카드 결제: 3% 수수료
가상계좌:  0% 수수료  ← AUTUS

월 매출 1억 기준:
├─ 기존: 연 3,600만원 수수료
└─ AUTUS: 0원
   → 100% 절감!
```

**API:**
```bash
POST /webhook/toss
# 가상계좌 입금 완료 시 자동 처리
# fee: 0, fee_saved: 원래금액의 3%
```

---

## 🤖 CrewAI 분석

3명의 AI 에이전트가 24시간 자동 분석:

| 에이전트 | 역할 | 작업 |
|----------|------|------|
| 🗑️ Delete | 삭제 전문가 | 가치 ≤ 0 노드 식별 |
| ⚙️ Automate | 자동화 전문가 | 반복 모션 패턴 탐지 |
| 👥 Outsource | 외부용역 전문가 | 고ROI 도입 추천 |

**API:**
```bash
# 전체 분석
POST /crewai/analyze
{"nodes": [...], "motions": [...]}

# 빠른 삭제 분석
POST /crewai/quick-delete
{"nodes": [...]}

# 빠른 자동화 분석
POST /crewai/quick-automate
{"motions": [...]}
```

**응답:**
```json
{
  "delete": {"targets": [...], "monthly_savings": 500000},
  "automate": {"targets": [...], "time_saved_hours": 40},
  "outsource": {"recommendations": [...]},
  "total_monthly_impact": 4500000
}
```

---

## 🔄 AutoSync (Zero-Input 연동)

### 30+ 지원 시스템

| 분류 | 시스템 |
|------|--------|
| **결제** | Stripe, 토스페이먼츠, 카카오페이, Shopify |
| **교육 ERP** | 하이클래스, 클래스101, 아카데미플러스, 클래스메이트, 짐박스 |
| **CRM** | HubSpot, Salesforce, Zoho, Pipedrive |
| **예약** | 네이버예약, 테이블매니저 |
| **POS** | 토스 POS, 배민포스 |
| **회계** | QuickBooks, Xero |

### Universal Transform
```
Stripe: {customer: "cus_123", amount: 5000}
   ↓ Zero Meaning
{node_id: "cus_123", value: 50, timestamp: "..."}

모든 SaaS → 동일 포맷 → 완벽 호환
```

**API:**
```bash
# 지원 시스템 목록
GET /autosync/systems

# 자동 감지 (쿠키/도메인/API키)
POST /autosync/detect
{"cookies": "stripe_session=...", "domains": ["app.hubspot.com"]}

# 데이터 변환
POST /autosync/transform
{"system_id": "stripe", "data": {...}}

# 연동 시작
POST /autosync/connect
{"system_id": "hubspot", "credentials": {...}}
```

---

## 🦠 Parasitic Absorption

기존 SaaS를 단계적으로 흡수하여 100% 대체:

```
┌─────────────────────────────────────────────────────────────┐
│ PARASITIC (기생)  →  Webhook 연동, 데이터 미러링           │
│       ↓ 동기화 10회+                                        │
│ ABSORBING (흡수)  →  기능 복제, 데이터 100% 이전           │
│       ↓ 검증 완료                                           │
│ REPLACING (대체)  →  기존 SaaS 해지 안내                   │
│       ↓                                                      │
│ REPLACED (완료)   →  AUTUS 단일 운영, 100% 비용 절감       │
└─────────────────────────────────────────────────────────────┘
```

**API:**
```bash
# 기생 시작
POST /parasitic/connect
{"saas_type": "toss_pos"}

# 상태 확인
GET /parasitic/status

# 흡수 진행
POST /parasitic/absorb/{connector_id}

# 대체 시작
POST /parasitic/replace/{connector_id}

# 플라이휠 상태
GET /parasitic/flywheel
```

---

## 📊 모니터링

### 실행
```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### 접속
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/autus123)
- **Uptime Kuma**: http://localhost:3002

### 주요 메트릭
- n8n 워크플로우 실행률/실패율
- API 응답 시간
- Neo4j 연결 수
- 시스템 CPU/메모리

---

## 🧪 테스트

```bash
# 의존성 설치
pip install pytest pytest-asyncio httpx

# 테스트 실행
cd tests
pytest test_api.py -v

# 특정 테스트만
pytest test_api.py::TestZeroMeaning -v
```

---

## 🔐 보안

### API 키 인증 (선택)
```python
# config.py
API_KEY_HEADER = "X-API-Key"
SECRET_KEY = "your-secret-key"
```

### Nginx 리버스 프록시
```bash
# nginx/nginx.conf 사용
# Rate limiting: API 100r/s, Webhook 1000r/s
docker run -d --name nginx -p 80:80 -v ./nginx/nginx.conf:/etc/nginx/nginx.conf nginx
```

---

## 📈 예상 ROI

```
초기 가치: 6천만원

┌──────────┬───────────────────┬──────────┐
│   기간   │       가치        │   배수   │
├──────────┼───────────────────┼──────────┤
│  3개월   │   1억 8천만원     │   3.0x   │
│  6개월   │   4억원           │   6.7x   │
│  12개월  │   13억원          │  21.7x   │
└──────────┴───────────────────┴──────────┘

공식: V = (M - T) × (1 + s)^t
M = 직접 돈
T = 시간 비용
s = 시너지율
t = 경과 기간
```

---

## 🛠️ 개발

### 로컬 개발
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Docker 빌드
```bash
docker build -t autus-api ./backend
docker-compose up -d
```

### 백업
```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
# 결과: backups/autus_backup_YYYYMMDD_HHMMSS.tar.gz
```

---

## 📚 API 문서

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/openapi.json

---

## 🆘 문제 해결

### Docker 네트워크 오류
```bash
docker network create autus-network
```

### Neo4j 연결 실패
```bash
# 로그 확인
docker logs autus-neo4j
# 포트 확인: 7474 (HTTP), 7687 (Bolt)
```

### n8n 워크플로우 실패
```bash
# 1. 환경변수 확인
echo $AUTUS_API_URL

# 2. error_handler.json 워크플로우 활성화
# 3. Slack 알림 설정
```

---

## 📝 라이선스

MIT License

---

**🚀 AUTUS: 삭제하여 가속하라**






