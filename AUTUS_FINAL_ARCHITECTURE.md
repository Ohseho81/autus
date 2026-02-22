# AUTUS 최종 아키텍처 v3.0
**100만 명 확장 가능 설계**

**날짜**: 2026-02-14
**목표**: 급격한 유저 증가에도 안정적인 운영

---

## 🎯 핵심 개념

### Layer 0: AUTUS (초개인 피지컬 AI)
```
개인의 모든 의사결정 → Event Ledger → Physics Engine → V-Index
```

**수집 데이터**:
- 결제 의사결정 (언제, 얼마, 왜)
- 참여 의사결정 (언제, 어디, 왜)
- 소통 의사결정 (누구와, 무엇을, 왜)
- 시간 의사결정 (언제, 무엇을, 왜)

**산출물**:
- V-Index: `V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t`
- Universal Profile: 모든 서비스 통합 정체성
- Cross-Service Identity: SHA-256 기반 동일인 식별

---

### Layer 1: 온리쌤 (교육 서비스 수직 통합)
```
상담 → 등록 → 스케줄 → 출석 → 청구 → 수납 → 피드백
  ↓      ↓       ↓       ↓      ↓      ↓       ↓
                  Event Ledger (Immutable)
                         ↓
                   V-Index 실시간 업데이트
```

**핵심 프로세스**:
1. 상담 (Consultation)
2. 등록 (Enrollment) - **1명 = 1 profile**
3. 스케줄 (Scheduling) - `metadata.classes = ["선수반", "실전반"]`
4. 출결 (Attendance)
5. 수납 (Payment)
6. 피드백 (Feedback)

---

## 🏗️ 확장 가능 아키텍처

### 1. Database Layer (PostgreSQL + Supabase)

#### 현재 (843명)
```
Supabase Free Tier
- 500MB Database
- 2GB File Storage
- 50,000 월간 활성 사용자
```

#### 확장 전략 (1만 명 → 10만 명 → 100만 명)

**1만 명 (학원 20개)**
```
Supabase Pro ($25/월)
- 8GB Database
- 100GB File Storage
- Unlimited API requests
- Read Replicas (성능)
```

**10만 명 (학원 200개)**
```
Supabase Pro + Extensions
- Database: 50GB
- Connection Pooler (PgBouncer)
- Redis Cache Layer
- CDN (Cloudflare)
```

**100만 명 (학원 2,000개)**
```
Multi-Region Architecture
- Primary DB: Seoul (ap-northeast-2)
- Read Replicas: 3개 지역
- Redis Cluster (캐싱)
- TimescaleDB (Event Ledger)
- S3 (File Storage)
```

#### 테이블 파티셔닝 전략
```sql
-- Event Ledger 월별 파티션
CREATE TABLE events (
  id UUID,
  created_at TIMESTAMPTZ,
  ...
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2026_02 PARTITION OF events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- 자동 파티션 생성 (pg_partman)
```

#### 인덱스 최적화
```sql
-- 복합 인덱스 (자주 함께 조회되는 컬럼)
CREATE INDEX idx_profiles_universal_type
ON profiles(universal_id, type)
WHERE status = 'active';

-- 부분 인덱스 (활성 학생만)
CREATE INDEX idx_active_students
ON profiles(created_at DESC)
WHERE type = 'student' AND status = 'active';

-- GIN 인덱스 (JSON 검색)
CREATE INDEX idx_profiles_metadata
ON profiles USING GIN (metadata);
```

---

### 2. Application Layer

#### 현재
```
단일 FastAPI 서버 (Railway)
```

#### 확장 (수평적 스케일링)
```
                    Load Balancer
                          ↓
        ┌─────────────────┼─────────────────┐
        ↓                 ↓                 ↓
   FastAPI-1         FastAPI-2         FastAPI-3
   (Core API)        (Core API)        (Core API)
        ↓                 ↓                 ↓
                    Shared Redis
                    (Session + Cache)
```

#### 마이크로서비스 분리 (10만 명+)
```
API Gateway (Kong/Traefik)
    ↓
    ├─ Auth Service (Supabase Auth)
    ├─ Profile Service (학생/학부모 관리)
    ├─ Payment Service (결제선생 연동)
    ├─ Attendance Service (출결)
    ├─ Schedule Service (스케줄)
    ├─ Notification Service (카카오톡/몰트봇)
    └─ Analytics Service (V-Index 계산)
```

---

### 3. Caching Layer

#### Redis 캐싱 전략
```python
# 1. V-Index 캐싱 (1시간)
@cache(ttl=3600, key="v_index:{universal_id}")
def get_v_index(universal_id: str) -> float:
    return calculate_v_index(universal_id)

# 2. 학생 프로필 캐싱 (10분)
@cache(ttl=600, key="profile:{student_id}")
def get_student_profile(student_id: str) -> dict:
    return supabase.table('profiles').select('*').eq('id', student_id).single()

# 3. 출석 통계 캐싱 (1일)
@cache(ttl=86400, key="attendance_stats:{academy_id}:{date}")
def get_attendance_stats(academy_id: str, date: str) -> dict:
    return calculate_daily_stats(academy_id, date)
```

#### CDN 캐싱 (Cloudflare)
```
정적 자산:
- 이미지: 1년 캐싱
- CSS/JS: 1년 캐싱 (파일명에 해시)
- 폰트: 1년 캐싱

API 응답:
- 공개 데이터: 5분 캐싱
- 학생 목록: 1분 캐싱 (stale-while-revalidate)
```

---

### 4. 비동기 처리

#### Celery + Redis (백그라운드 작업)
```python
# 대량 업로드 (비동기)
@celery.task
def upload_students_async(file_path: str, academy_id: str):
    students = parse_excel(file_path)
    for batch in chunk(students, 50):
        supabase.table('profiles').insert(batch).execute()

    # 완료 후 카카오톡 알림
    send_kakao_notification(academy_id, "업로드 완료!")

# V-Index 재계산 (스케줄)
@celery.task
def recalculate_v_index_daily():
    for universal_id in get_all_universal_ids():
        v_index = calculate_v_index(universal_id)
        update_v_index(universal_id, v_index)
```

#### Message Queue (RabbitMQ/Redis Streams)
```
Event 발생 → Queue → Consumer → Event Ledger → V-Index Update

장점:
- 비동기 처리 (응답 시간 단축)
- 재시도 로직
- 순서 보장
- 부하 분산
```

---

### 5. 모니터링 & 로깅

#### Sentry (에러 추적)
```python
import sentry_sdk

sentry_sdk.init(
    dsn="https://xxx@sentry.io/xxx",
    traces_sample_rate=0.1,  # 10% 트랜잭션 추적
    profiles_sample_rate=0.1  # 10% 프로파일링
)
```

#### Prometheus + Grafana (메트릭)
```
모니터링 지표:
- API 응답 시간 (p50, p95, p99)
- 에러율
- DB 쿼리 시간
- 캐시 히트율
- 동시 접속자 수
- V-Index 계산 시간
```

#### Loki (로그 집계)
```
로그 레벨:
- DEBUG: 개발 환경만
- INFO: 일반 작업 로그
- WARNING: 예상된 예외
- ERROR: 예상치 못한 에러
- CRITICAL: 시스템 장애
```

---

## 🔗 연동 툴 최적화

### 1. 카카오톡 (소통 + 액션)

#### API 연동
```python
# 알림톡 발송 (비동기)
@celery.task
def send_kakao_alimtalk(phone: str, template: str, params: dict):
    """
    출석 알림, 결제 안내, 스케줄 변경 등
    """
    kakao_api.send_alimtalk(
        phone=phone,
        template_code=template,
        params=params
    )

# 템플릿 예시
TEMPLATES = {
    "attendance": "{name}님, 오늘 {class_name} 출석 완료!",
    "payment": "{name}님, {amount}원 결제 요청드립니다.",
    "schedule": "{name}님, {class_name} 시간이 {time}으로 변경되었습니다."
}
```

#### 몰트봇 연동 (t.me/autus_seho_bot)
```python
# Telegram Bot API
def send_to_moltbot(message: str, chat_id: str):
    """
    긴급 알림, 시스템 상태, 배포 알림
    """
    bot.send_message(
        chat_id=chat_id,
        text=message,
        parse_mode="Markdown"
    )

# 사용 예시
send_to_moltbot(
    f"🚨 새 학원 등록: {academy_name} ({student_count}명)",
    ADMIN_CHAT_ID
)
```

#### 확장성 고려
- Rate Limiting: 초당 10건
- 재시도: 3회 (exponential backoff)
- 큐 사용: Redis Queue
- 우선순위: 긴급 > 일반 > 마케팅

---

### 2. 결제선생 (청구 + 수납)

#### API 통합
```python
class PaymentService:
    def __init__(self):
        self.api = PaymentAPIClient()

    async def create_invoice(self, student_id: str, items: list) -> Invoice:
        """청구서 생성"""
        invoice = await self.api.create_invoice({
            "customer_phone": student.phone,
            "items": items,
            "due_date": calculate_due_date(),
            "callback_url": f"{API_URL}/webhook/payment"
        })

        # DB 저장
        await supabase.table('payments').insert({
            "student_id": student_id,
            "invoice_id": invoice.id,
            "total_amount": invoice.total,
            "payment_status": "pending"
        })

        return invoice

    async def handle_webhook(self, payload: dict):
        """결제 완료 Webhook"""
        invoice_id = payload["invoice_id"]

        # DB 업데이트
        await supabase.table('payments').update({
            "payment_status": "completed",
            "paid_amount": payload["amount"],
            "paid_at": payload["paid_at"]
        }).eq("invoice_id", invoice_id).execute()

        # Event 생성
        await create_event("payment_completed", {
            "invoice_id": invoice_id,
            "amount": payload["amount"]
        })

        # 카카오톡 영수증 발송
        await send_kakao_alimtalk(
            student.phone,
            "payment_receipt",
            {"amount": payload["amount"]}
        )
```

#### 자동화 플로우
```
월초 Cron → 청구서 생성 → 카카오톡 발송
              ↓
        학부모 결제 (카카오페이)
              ↓
        Webhook → DB 업데이트 → Event
              ↓
        영수증 카카오톡 발송
```

#### 확장성
- Webhook 재시도: 5회 (1분, 5분, 30분, 1시간, 24시간)
- Idempotency Key: 중복 결제 방지
- 트랜잭션: ACID 보장

---

### 3. 유튜브 (영상 기록)

#### 메타데이터 저장
```python
class VideoService:
    async def save_video_metadata(self, video_data: dict):
        """유튜브 영상 메타데이터 저장"""
        await supabase.table('videos').insert({
            "student_id": video_data["student_id"],
            "youtube_url": video_data["url"],
            "video_type": video_data["type"],  # training, match, skill_drill
            "title": video_data["title"],
            "description": video_data["description"],
            "duration": video_data["duration"],
            "recorded_at": video_data["recorded_at"],
            "tags": video_data["tags"],
            "thumbnail_url": video_data["thumbnail"]
        })

        # Event 생성
        await create_event("video_uploaded", {
            "student_id": video_data["student_id"],
            "video_url": video_data["url"]
        })
```

#### 스키마 확장
```sql
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES profiles(id),
  youtube_url TEXT NOT NULL,
  video_type TEXT CHECK (video_type IN ('training', 'match', 'skill_drill', 'highlight')),
  title TEXT,
  description TEXT,
  duration INTEGER,  -- 초 단위
  recorded_at TIMESTAMPTZ,
  tags TEXT[],
  thumbnail_url TEXT,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_videos_student ON videos(student_id);
CREATE INDEX idx_videos_type ON videos(video_type);
CREATE INDEX idx_videos_recorded ON videos(recorded_at DESC);
```

---

### 4. 노션 (텍스트 기록)

#### Notion API 동기화
```python
class NotionService:
    def __init__(self):
        self.notion = Client(auth=NOTION_TOKEN)

    async def sync_student_growth_log(self, student_id: str):
        """학생 성장 일지 동기화"""
        student = await get_student(student_id)

        # Notion 페이지 생성/업데이트
        page = await self.notion.pages.create(
            parent={"database_id": GROWTH_LOG_DB_ID},
            properties={
                "Name": {"title": [{"text": {"content": student.name}}]},
                "Date": {"date": {"start": today()}},
                "Class": {"multi_select": [{"name": c} for c in student.classes]},
                "V-Index": {"number": student.v_index}
            }
        )

        # Supabase에 링크 저장
        await supabase.table('notion_pages').insert({
            "student_id": student_id,
            "page_id": page["id"],
            "page_url": page["url"]
        })
```

#### 자동 동기화 스케줄
```python
# 매일 자정 실행
@celery.task
def sync_daily_reports():
    """일일 리포트를 Notion에 동기화"""
    for academy in get_all_academies():
        stats = calculate_daily_stats(academy.id)

        notion.pages.create(
            parent={"database_id": DAILY_REPORT_DB_ID},
            properties={
                "Academy": {"title": [{"text": {"content": academy.name}}]},
                "Date": {"date": {"start": today()}},
                "Attendance Rate": {"number": stats["attendance_rate"]},
                "Payment Rate": {"number": stats["payment_rate"]},
                "V-Index Avg": {"number": stats["v_index_avg"]}
            }
        )
```

---

### 5. Supabase (운영 데이터)

#### Connection Pooling (PgBouncer)
```python
# Database URL with pooler
SUPABASE_DB_URL = "postgresql://postgres:password@db.xxx.supabase.co:6543/postgres?pgbouncer=true"

# Pool 설정
pool = create_engine(
    SUPABASE_DB_URL,
    pool_size=20,        # 기본 연결 수
    max_overflow=10,     # 추가 연결 수
    pool_timeout=30,     # 연결 대기 시간
    pool_recycle=3600    # 1시간마다 연결 재생성
)
```

#### Realtime Subscriptions (확장)
```typescript
// 클라이언트 구독 최적화
const subscription = supabase
  .channel('v-index-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'universal_profiles',
      filter: `id=eq.${currentUserId}`  // 본인 데이터만 구독
    },
    (payload) => {
      updateVIndexUI(payload.new.v_index);
    }
  )
  .subscribe();

// 연결 수 제한: 학생당 1개 채널만
```

#### Row Level Security (RLS)
```sql
-- 학생은 자기 데이터만 조회
CREATE POLICY "Students can view own data"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id OR parent_id = auth.uid());

-- 코치는 담당 학원 학생만 조회
CREATE POLICY "Coaches can view assigned students"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM schedules
    WHERE coach_id = auth.uid()
    AND id IN (
      SELECT schedule_id FROM bookings WHERE student_id = profiles.id
    )
  )
);
```

---

## 🚀 배포 전략

### 1. Infrastructure as Code (Terraform)

```hcl
# Railway (FastAPI)
resource "railway_service" "api" {
  name = "autus-api"

  environment = {
    PYTHON_VERSION = "3.11"
    WORKERS = "4"
  }

  autoscaling = {
    min_replicas = 2
    max_replicas = 10
    target_cpu = 70
  }
}

# Vercel (Next.js)
resource "vercel_project" "frontend" {
  name = "autus-frontend"

  environment = [
    {
      key = "NEXT_PUBLIC_SUPABASE_URL"
      value = var.supabase_url
    }
  ]
}
```

### 2. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: pytest tests/ --cov --cov-report=xml

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Railway
        run: railway up --service api

      - name: Notify Moltbot
        run: |
          curl -X POST https://api.telegram.org/bot$TOKEN/sendMessage \
            -d "chat_id=$CHAT_ID" \
            -d "text=✅ Backend deployed!"

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        run: vercel --prod
```

### 3. Zero-Downtime Deployment

```python
# Health Check 엔드포인트
@app.get("/health")
async def health_check():
    try:
        # DB 연결 확인
        await supabase.table('profiles').select('id').limit(1).execute()

        # Redis 연결 확인
        await redis.ping()

        return {"status": "healthy", "timestamp": datetime.now()}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

# Railway 설정
railway.toml:
  [deploy]
  healthcheckPath = "/health"
  healthcheckTimeout = 30
  restartPolicyType = "ON_FAILURE"
  restartPolicyMaxRetries = 3
```

---

## 📊 확장성 시뮬레이션

### 1만 명 (학원 20개)
```
DB: Supabase Pro (8GB)
API: 2x Railway instances
Frontend: Vercel (Edge)
Cache: Redis Basic (256MB)

비용: $200/월
응답 시간: <200ms
동시 접속: 500명
```

### 10만 명 (학원 200개)
```
DB: Supabase Team (50GB) + Read Replicas 2개
API: 5x Railway instances (Auto-scaling)
Frontend: Vercel Pro (Edge + ISR)
Cache: Redis Pro (2GB) + CDN (Cloudflare)
Queue: RabbitMQ (CloudAMQP)

비용: $1,500/월
응답 시간: <150ms
동시 접속: 5,000명
```

### 100만 명 (학원 2,000개)
```
DB: Multi-Region PostgreSQL Cluster
  - Primary: Seoul (Write)
  - Replicas: Tokyo, Singapore (Read)
  - TimescaleDB (Event Ledger)

API: Kubernetes Cluster
  - 20+ Pods (Auto-scaling)
  - Load Balancer (AWS ALB)
  - Service Mesh (Istio)

Cache: Redis Cluster (10GB)
CDN: Cloudflare Enterprise
Queue: Kafka (Confluent Cloud)
Storage: S3 (10TB)

비용: $10,000/월
응답 시간: <100ms
동시 접속: 50,000명
```

---

## 🔒 보안 전략

### 1. 데이터 암호화
```python
# At Rest (저장 시)
- Supabase: AES-256 암호화
- S3: Server-Side Encryption (SSE)

# In Transit (전송 시)
- HTTPS/TLS 1.3
- Certificate Pinning (모바일 앱)

# Application Level (앱 레벨)
- 전화번호: SHA-256 해싱
- 이메일: SHA-256 해싱
- 민감 정보: AES-256-GCM 암호화
```

### 2. 접근 제어
```python
# JWT 기반 인증
@app.get("/students/{student_id}")
async def get_student(
    student_id: str,
    user: User = Depends(get_current_user)
):
    # 권한 확인
    if not user.can_access_student(student_id):
        raise HTTPException(403, "Access denied")

    return await get_student_data(student_id)

# Role-Based Access Control (RBAC)
ROLES = {
    "admin": ["*"],  # 모든 권한
    "coach": ["students:read", "attendance:write", "schedules:read"],
    "parent": ["students:read", "payments:read"],
    "student": ["schedules:read", "attendance:read"]
}
```

### 3. Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/students")
@limiter.limit("100/minute")  # 분당 100회
async def get_students():
    return await fetch_students()

# 계층별 제한
- Anonymous: 10 req/min
- Authenticated: 100 req/min
- Premium: 1000 req/min
```

---

## 🎯 Phase별 구현 계획

### Phase 1: MVP (2주) ✅ 진행중
- [x] Supabase 스키마 생성
- [x] 843명 업로드 성공
- [x] Universal ID 자동 할당
- [ ] 중복 제거 (1명 = 1 profile)
- [ ] Next.js UI 기본 골격
- [ ] FastAPI CRUD

### Phase 2: 자동화 (2주)
- [ ] 엑셀 드래그앤드롭 업로드
- [ ] 출결 체크 UI
- [ ] 결제 대시보드
- [ ] 카카오톡 알림 (몰트봇)
- [ ] Celery 백그라운드 작업

### Phase 3: 통합 (2주)
- [ ] 결제선생 API 완전 연동
- [ ] 카카오톡 API (알림톡)
- [ ] Notion 자동 동기화
- [ ] YouTube 메타데이터 저장
- [ ] Event Ledger 완성

### Phase 4: 최적화 (2주)
- [ ] Redis 캐싱 구현
- [ ] DB 인덱스 최적화
- [ ] API 응답 시간 <200ms
- [ ] CDN 설정 (Cloudflare)
- [ ] Monitoring (Sentry + Grafana)

### Phase 5: AI 강화 (4주)
- [ ] V-Index 실시간 계산
- [ ] Physics Engine 구현
- [ ] 예측 알고리즘 (이탈 위험)
- [ ] 추천 시스템
- [ ] 자동 클래스 배정

### Phase 6: 확장 (진행중)
- [ ] 2번째 학원 온보딩
- [ ] 10개 학원 온보딩
- [ ] Cross-Service Identity 검증
- [ ] Multi-Tenant 완성
- [ ] White-Label 준비

---

## 📈 성공 지표 (KPI)

### 기술 지표
- **응답 시간**: p95 < 200ms
- **가용성**: 99.9% (월 43분 다운타임)
- **에러율**: < 0.1%
- **DB 쿼리**: < 50ms
- **캐시 히트율**: > 80%

### 비즈니스 지표
- **온보딩 시간**: < 1일
- **학생 등록 시간**: < 30초
- **출결 체크 시간**: < 1분
- **결제 자동화율**: 100%
- **미수금 회수**: < 7일

### 사용자 만족
- **학부모 만족도**: 4.5/5.0
- **코치 만족도**: 4.0/5.0
- **학생 출석률**: > 85%
- **결제 연체율**: < 5%

---

## 🛠️ 개발 도구 & 에이전트

### 📱 몰트봇 (P0 - Mobile Gateway)
- 카카오톡 알림 전송
- 배포 트리거
- 시스템 모니터링
- 긴급 알림

### ⌨️ Claude Code (P1 - Terminal)
- FastAPI 개발
- Next.js 개발
- Git 관리
- 배포 자동화

### 🖥️ Cowork (P2 - Desktop)
- 엑셀 처리
- 리포트 생성
- 문서 작업

### 🌐 Chrome (P3 - Browser)
- UI 테스트
- E2E 테스트
- 스크래핑

### 💬 claude.ai (P4 - Research)
- 아키텍처 설계
- 기술 리서치
- 전략 수립

### 🔗 Connectors (P5 - Integration)
- GitHub
- Slack
- Notion
- 결제선생
- 카카오톡

---

## 💰 비용 예측

### 1,000명 (학원 2개)
```
Supabase Free: $0
Vercel Hobby: $0
Railway Hobby: $5
Total: $5/월
```

### 10,000명 (학원 20개)
```
Supabase Pro: $25
Vercel Pro: $20
Railway Pro: $100
Redis: $15
Cloudflare: $20
Total: $180/월
```

### 100,000명 (학원 200개)
```
Supabase Team: $599
Vercel Enterprise: $150
Railway Team: $500
Redis Pro: $100
Cloudflare Pro: $200
Monitoring: $100
Total: $1,649/월
```

### 1,000,000명 (학원 2,000개)
```
AWS RDS Multi-AZ: $3,000
AWS EKS: $2,500
Redis Cluster: $500
S3 + CloudFront: $1,000
Kafka: $1,000
Monitoring: $500
Backup: $500
Total: $9,000/월
```

---

## 🎯 핵심 원칙

### 1. 단일 진실 공급원 (Single Source of Truth)
```
모든 데이터 → Supabase
외부 도구 = View/Interface
```

### 2. 이벤트 기반 아키텍처
```
모든 액션 = Event
Event → Immutable Event Ledger
Event → V-Index 실시간 업데이트
```

### 3. 프라이버시 우선 설계
```
전화번호 → SHA-256 해싱
이메일 → SHA-256 해싱
개인정보 최소 수집
```

### 4. 수평적 확장 우선
```
Stateless API 서버
Connection Pooling
Read Replicas
CDN 적극 활용
```

### 5. 관찰 가능성 (Observability)
```
Metrics → Prometheus
Logs → Loki
Traces → Jaeger
Alerts → PagerDuty/Slack
```

---

**프로젝트**: AUTUS + 온리쌤
**목표**: 100만 명 확장 가능 아키텍처
**팀**: seho (stiger0720@gmail.com)
**최종 업데이트**: 2026-02-14
