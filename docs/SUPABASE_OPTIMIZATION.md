# 🚀 Supabase 최적화 스펙 (3K → 100만명 대응)

**목표**: 100만명 규모에서도 99.9% 가용성, 100ms 이하 응답 속도 달성

---

## 📊 현재 스키마 분석

### 기존 테이블 (5개)
```
profiles          - 학생/부모/코치 (3,000 → 100,000 → 1,000,000 rows)
payments          - 결제 기본 정보 (월 3,000 → 100,000건)
schedules         - 수업 일정 (50 → 500개 고정)
bookings          - 수업 예약 (월 10,000 → 500,000건)
notifications     - 알림 (7일 TTL, 항상 ~10,000건 유지)
```

### 신규 테이블 (4개) - 결제선생 통합
```
invoices              - 청구서 (월 3,000 → 100,000건)
payment_transactions  - 결제 내역 (월 3,000 → 100,000건)
cash_receipts         - 현금영수증 (월 500 → 20,000건)
business_settings     - 사업장 정보 (1건 고정)
```

---

## 🎯 성능 목표 (규모별)

| 규모 | 학생 수 | 월간 트랜잭션 | API 응답 | DB 응답 | 동시 접속 |
|------|--------|-------------|---------|---------|----------|
| **Phase 1** | 3,000명 | 10,000건 | <100ms | <50ms | 100 |
| **Phase 2** | 10,000명 | 50,000건 | <150ms | <75ms | 500 |
| **Phase 3** | 100,000명 | 500,000건 | <200ms | <100ms | 5,000 |
| **Phase 4** | 1,000,000명 | 5,000,000건 | <300ms | <150ms | 50,000 |

---

## 🔧 최적화 전략 (단계별)

### Phase 1: 기본 최적화 (3K → 10K) - Week 2-3

#### 1️⃣ 인덱스 최적화

```sql
-- ===== profiles 테이블 =====
CREATE INDEX idx_profiles_type ON profiles(type);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_parent ON profiles(parent_id);
CREATE INDEX idx_profiles_phone ON profiles(phone);  -- 전화번호 검색 (카카오톡 발송)
CREATE INDEX idx_profiles_external_id ON profiles(external_id);  -- 외부 시스템 연동

-- Composite Index (복합 검색)
CREATE INDEX idx_profiles_type_status ON profiles(type, status);

-- ===== payments 테이블 =====
CREATE INDEX idx_payments_student ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_invoice_date ON payments(invoice_date);

-- 미수금 조회 최적화
CREATE INDEX idx_payments_unpaid ON payments(payment_status, due_date)
  WHERE paid_amount < total_amount;

-- ===== bookings 테이블 =====
CREATE INDEX idx_bookings_student ON bookings(student_id);
CREATE INDEX idx_bookings_schedule ON bookings(schedule_id);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);

-- 복합 인덱스: 특정 날짜 특정 학생 조회
CREATE INDEX idx_bookings_student_date ON bookings(student_id, booking_date);
CREATE INDEX idx_bookings_schedule_date ON bookings(schedule_id, booking_date);

-- ===== invoices 테이블 =====
CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE INDEX idx_invoices_parent ON invoices(parent_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_sent_at ON invoices(sent_at);

-- 미납 청구서 조회 최적화
CREATE INDEX idx_invoices_unpaid ON invoices(status, due_date)
  WHERE status IN ('sent', 'partial', 'overdue');

-- ===== payment_transactions 테이블 =====
CREATE INDEX idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX idx_payment_transactions_student ON payment_transactions(student_id);
CREATE INDEX idx_payment_transactions_paid_at ON payment_transactions(paid_at);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_card_company ON payment_transactions(card_company);

-- 매출 조회 최적화 (일자별)
CREATE INDEX idx_payment_transactions_paid_date ON payment_transactions(DATE(paid_at));

-- ===== notifications 테이블 =====
CREATE INDEX idx_notifications_profile ON notifications(profile_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at);

-- 만료된 알림 자동 삭제용
CREATE INDEX idx_notifications_expired ON notifications(expires_at)
  WHERE status = 'delivered';
```

#### 2️⃣ RLS (Row Level Security) 정책

```sql
-- ===== profiles 테이블 RLS =====

-- Service Role: 전체 접근
CREATE POLICY "service_role_all_profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated Users: 본인 및 자녀만 조회
CREATE POLICY "users_view_own_profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid()::text = id::text OR
    auth.uid()::text = parent_id::text
  );

-- Coach: 담당 학생만 조회
CREATE POLICY "coaches_view_students"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    type = 'student' AND
    EXISTS (
      SELECT 1 FROM schedules
      WHERE coach_id = auth.uid()::uuid
    )
  );

-- ===== payments 테이블 RLS =====

-- Service Role: 전체 접근
CREATE POLICY "service_role_all_payments"
  ON payments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 학생/부모: 본인 결제만 조회
CREATE POLICY "users_view_own_payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM profiles
      WHERE id = auth.uid()::uuid OR parent_id = auth.uid()::uuid
    )
  );

-- ===== bookings 테이블 RLS =====

-- Service Role: 전체 접근
CREATE POLICY "service_role_all_bookings"
  ON bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 학생/부모: 본인 예약만 조회/생성
CREATE POLICY "users_manage_own_bookings"
  ON bookings
  FOR ALL
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM profiles
      WHERE id = auth.uid()::uuid OR parent_id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    student_id IN (
      SELECT id FROM profiles
      WHERE id = auth.uid()::uuid OR parent_id = auth.uid()::uuid
    )
  );

-- ===== invoices 테이블 RLS =====

-- Service Role: 전체 접근
CREATE POLICY "service_role_all_invoices"
  ON invoices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 학생/부모: 본인 청구서만 조회
CREATE POLICY "users_view_own_invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    student_id IN (
      SELECT id FROM profiles
      WHERE id = auth.uid()::uuid OR parent_id = auth.uid()::uuid
    )
  );
```

#### 3️⃣ 쿼리 최적화

```sql
-- ===== Materialized View: 자주 조회되는 집계 데이터 =====

-- 1. 학생별 미수금 현황
CREATE MATERIALIZED VIEW mv_student_unpaid_summary AS
SELECT
  p.student_id,
  prof.name,
  prof.phone,
  COUNT(p.id) as unpaid_count,
  SUM(p.total_amount - p.paid_amount) as total_unpaid,
  MIN(p.due_date) as earliest_due_date,
  MAX(p.due_date) as latest_due_date
FROM payments p
JOIN profiles prof ON p.student_id = prof.id
WHERE p.paid_amount < p.total_amount
  AND p.payment_status != 'cancelled'
GROUP BY p.student_id, prof.name, prof.phone;

CREATE UNIQUE INDEX idx_mv_student_unpaid_student ON mv_student_unpaid_summary(student_id);

-- 2. 일별 매출 집계
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT
  DATE(pt.paid_at) as sale_date,
  COUNT(DISTINCT pt.invoice_id) as invoice_count,
  COUNT(pt.id) as transaction_count,
  SUM(pt.amount) as total_sales,
  SUM(pt.fee) as total_fees,
  SUM(pt.net_amount) as net_sales,
  SUM(CASE WHEN pt.payment_method = 'card' THEN pt.amount ELSE 0 END) as card_sales,
  SUM(CASE WHEN pt.payment_method = 'cash' THEN pt.amount ELSE 0 END) as cash_sales,
  SUM(CASE WHEN pt.card_company = '신한' THEN pt.amount ELSE 0 END) as shinhan_sales,
  SUM(CASE WHEN pt.card_company = '국민' THEN pt.amount ELSE 0 END) as kb_sales,
  SUM(CASE WHEN pt.card_company = '삼성' THEN pt.amount ELSE 0 END) as samsung_sales
FROM payment_transactions pt
WHERE pt.status = 'completed'
GROUP BY DATE(pt.paid_at);

CREATE UNIQUE INDEX idx_mv_daily_sales_date ON mv_daily_sales(sale_date);

-- 3. 월별 청구서 현황
CREATE MATERIALIZED VIEW mv_monthly_invoice_summary AS
SELECT
  DATE_TRUNC('month', i.created_at) as month,
  COUNT(CASE WHEN i.status IN ('sent', 'paid', 'partial', 'overdue') THEN 1 END) as sent_count,
  SUM(CASE WHEN i.status IN ('sent', 'paid', 'partial', 'overdue') THEN i.final_amount ELSE 0 END) as sent_amount,
  COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_count,
  SUM(CASE WHEN i.status = 'paid' THEN i.paid_amount ELSE 0 END) as paid_amount,
  COUNT(CASE WHEN i.status IN ('sent', 'partial', 'overdue') THEN 1 END) as unpaid_count,
  SUM(CASE WHEN i.status IN ('sent', 'partial', 'overdue') THEN (i.final_amount - i.paid_amount) ELSE 0 END) as unpaid_amount
FROM invoices i
GROUP BY DATE_TRUNC('month', i.created_at);

CREATE UNIQUE INDEX idx_mv_monthly_invoice_month ON mv_monthly_invoice_summary(month);

-- ===== Materialized View 자동 갱신 =====

-- 매일 새벽 3시 갱신
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'refresh-mv-daily-sales',
  '0 3 * * *',  -- 매일 03:00
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales$$
);

SELECT cron.schedule(
  'refresh-mv-monthly-invoice',
  '0 3 1 * *',  -- 매월 1일 03:00
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_invoice_summary$$
);

-- 미수금은 1시간마다 갱신
SELECT cron.schedule(
  'refresh-mv-student-unpaid',
  '0 * * * *',  -- 매시간
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_unpaid_summary$$
);
```

#### 4️⃣ 자동 정리 (TTL)

```sql
-- ===== 만료된 알림 자동 삭제 =====

-- 매일 새벽 2시 실행
SELECT cron.schedule(
  'cleanup-expired-notifications',
  '0 2 * * *',
  $$
    DELETE FROM notifications
    WHERE expires_at < NOW()
      AND status IN ('delivered', 'failed');
  $$
);

-- ===== 오래된 결제 트랜잭션 아카이브 =====

-- 1년 이상 된 트랜잭션을 ClickHouse로 이동 (선택)
SELECT cron.schedule(
  'archive-old-transactions',
  '0 4 1 * *',  -- 매월 1일 04:00
  $$
    -- ClickHouse로 복사 후 삭제
    WITH archived AS (
      SELECT * FROM payment_transactions
      WHERE paid_at < NOW() - INTERVAL '1 year'
    )
    DELETE FROM payment_transactions
    WHERE id IN (SELECT id FROM archived);
  $$
);
```

---

### Phase 2: 중급 최적화 (10K → 100K) - Month 3-6

#### 1️⃣ 연결 풀링 (Connection Pooling)

```python
# FastAPI에 PgBouncer 연동

from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

# Supabase Pooler URL 사용
SUPABASE_POOLER_URL = "postgresql://postgres.pphzvnaedmzcvpxjulti:password@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"

engine = create_engine(
    SUPABASE_POOLER_URL,
    poolclass=QueuePool,
    pool_size=20,          # 기본 연결 수
    max_overflow=10,       # 최대 추가 연결
    pool_timeout=30,       # 연결 대기 시간
    pool_recycle=3600,     # 1시간마다 재생성
    pool_pre_ping=True     # 연결 체크
)
```

#### 2️⃣ 캐싱 전략 (Redis)

```python
# Redis 캐싱 추가

import redis
from functools import wraps
import json

redis_client = redis.Redis(
    host='redis-supabase.ap-northeast-2.cache.amazonaws.com',
    port=6379,
    db=0,
    decode_responses=True
)

def cache_result(ttl=300):
    """결과를 Redis에 캐싱 (기본 5분)"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 캐시 키 생성
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"

            # 캐시 확인
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            # 캐시 없으면 실행
            result = await func(*args, **kwargs)

            # 결과 캐싱
            redis_client.setex(cache_key, ttl, json.dumps(result))

            return result
        return wrapper
    return decorator

# 사용 예시
@app.get("/profiles/{profile_id}")
@cache_result(ttl=600)  # 10분 캐싱
async def get_profile(profile_id: str):
    return supabase.table('profiles').select('*').eq('id', profile_id).execute()

@app.get("/stats/dashboard")
@cache_result(ttl=300)  # 5분 캐싱
async def get_dashboard():
    # Materialized View 조회 (이미 집계된 데이터)
    return supabase.table('mv_daily_sales').select('*').limit(30).execute()
```

#### 3️⃣ 파티셔닝 (Partitioning)

```sql
-- ===== payment_transactions 파티셔닝 (월별) =====

-- 기존 테이블을 파티션 테이블로 변환
-- 주의: 프로덕션에서는 데이터 마이그레이션 필요

-- 1. 새 파티션 테이블 생성
CREATE TABLE payment_transactions_partitioned (
  LIKE payment_transactions INCLUDING ALL
) PARTITION BY RANGE (paid_at);

-- 2. 월별 파티션 자동 생성 함수
CREATE OR REPLACE FUNCTION create_monthly_partition(table_name TEXT, start_date DATE)
RETURNS VOID AS $$
DECLARE
  partition_name TEXT;
  start_ts TIMESTAMPTZ;
  end_ts TIMESTAMPTZ;
BEGIN
  partition_name := table_name || '_' || TO_CHAR(start_date, 'YYYY_MM');
  start_ts := start_date::TIMESTAMPTZ;
  end_ts := (start_date + INTERVAL '1 month')::TIMESTAMPTZ;

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
    partition_name, table_name, start_ts, end_ts
  );
END;
$$ LANGUAGE plpgsql;

-- 3. 향후 12개월 파티션 미리 생성
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 0..11 LOOP
    PERFORM create_monthly_partition(
      'payment_transactions_partitioned',
      DATE_TRUNC('month', NOW() + (i || ' months')::INTERVAL)::DATE
    );
  END LOOP;
END $$;

-- 4. 매월 자동으로 다음 달 파티션 생성
SELECT cron.schedule(
  'create-next-month-partition',
  '0 0 1 * *',  -- 매월 1일 00:00
  $$
    SELECT create_monthly_partition(
      'payment_transactions_partitioned',
      DATE_TRUNC('month', NOW() + INTERVAL '12 months')::DATE
    );
  $$
);
```

#### 4️⃣ 쿼리 병렬 처리

```python
# FastAPI에서 병렬 쿼리

import asyncio

@app.get("/dashboard/summary")
async def get_dashboard_summary():
    """여러 통계를 병렬로 조회"""

    async def get_student_count():
        return supabase.table('profiles').select('id', count='exact').eq('type', 'student').execute()

    async def get_unpaid_summary():
        return supabase.table('mv_student_unpaid_summary').select('*').execute()

    async def get_daily_sales():
        return supabase.table('mv_daily_sales').select('*').order('sale_date', desc=True).limit(7).execute()

    async def get_monthly_invoices():
        return supabase.table('mv_monthly_invoice_summary').select('*').order('month', desc=True).limit(3).execute()

    # 병렬 실행
    results = await asyncio.gather(
        get_student_count(),
        get_unpaid_summary(),
        get_daily_sales(),
        get_monthly_invoices()
    )

    return {
        'student_count': results[0].count,
        'unpaid_summary': results[1].data,
        'daily_sales': results[2].data,
        'monthly_invoices': results[3].data
    }
```

---

### Phase 3: 고급 최적화 (100K → 1M) - Month 6-12

#### 1️⃣ Read Replica (읽기 전용 복제본)

```python
# Supabase Read Replica 활용

from supabase import create_client

# Write (Primary)
supabase_write = create_client(
    "https://pphzvnaedmzcvpxjulti.supabase.co",
    SUPABASE_SERVICE_KEY
)

# Read (Replica) - 조회 전용
supabase_read = create_client(
    "https://pphzvnaedmzcvpxjulti-read.supabase.co",  # Read Replica URL
    SUPABASE_SERVICE_KEY
)

# 사용 분리
@app.get("/profiles")
async def get_profiles():
    # 조회는 Read Replica
    return supabase_read.table('profiles').select('*').execute()

@app.post("/profiles")
async def create_profile(data: dict):
    # 쓰기는 Primary
    return supabase_write.table('profiles').insert(data).execute()
```

#### 2️⃣ Full-Text Search (전문 검색)

```sql
-- ===== profiles 테이블에 전문 검색 추가 =====

-- 1. tsvector 컬럼 추가
ALTER TABLE profiles ADD COLUMN search_vector tsvector;

-- 2. 검색 벡터 생성 함수
CREATE OR REPLACE FUNCTION profiles_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.email, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.metadata::text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 트리거 생성
CREATE TRIGGER profiles_search_vector_trigger
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_search_vector_update();

-- 4. 기존 데이터 업데이트
UPDATE profiles SET search_vector = NULL;  -- 트리거 실행

-- 5. GIN 인덱스 생성
CREATE INDEX idx_profiles_search ON profiles USING GIN(search_vector);

-- 6. 검색 쿼리
SELECT * FROM profiles
WHERE search_vector @@ to_tsquery('simple', '김철수 | 010-1234-5678')
ORDER BY ts_rank(search_vector, to_tsquery('simple', '김철수')) DESC;
```

#### 3️⃣ 데이터베이스 샤딩 (Sharding)

```sql
-- ===== 학생 ID 기반 샤딩 준비 =====

-- 샤드 키 함수 (해시 기반)
CREATE OR REPLACE FUNCTION get_shard_id(student_id UUID, num_shards INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
BEGIN
  RETURN (hashtext(student_id::text) % num_shards);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 샤드별 라우팅 테이블
CREATE TABLE shard_routing (
  shard_id INTEGER PRIMARY KEY,
  db_host TEXT NOT NULL,
  db_port INTEGER DEFAULT 5432,
  db_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 샤드 정보 입력 (예시)
INSERT INTO shard_routing (shard_id, db_host, db_name) VALUES
  (0, 'shard-0.supabase.co', 'postgres'),
  (1, 'shard-1.supabase.co', 'postgres'),
  (2, 'shard-2.supabase.co', 'postgres');
```

```python
# FastAPI에서 샤딩 라우팅

from typing import Dict
from supabase import create_client

class ShardManager:
    def __init__(self):
        self.shards: Dict[int, Client] = {}
        self._load_shards()

    def _load_shards(self):
        """샤드 정보 로드"""
        # 실제로는 shard_routing 테이블에서 조회
        self.shards = {
            0: create_client("https://shard-0.supabase.co", key),
            1: create_client("https://shard-1.supabase.co", key),
            2: create_client("https://shard-2.supabase.co", key),
        }

    def get_shard(self, student_id: str) -> Client:
        """학생 ID로 샤드 결정"""
        # 해시 기반 샤딩
        shard_id = hash(student_id) % len(self.shards)
        return self.shards[shard_id]

shard_manager = ShardManager()

@app.get("/profiles/{student_id}")
async def get_student(student_id: str):
    # 올바른 샤드로 라우팅
    shard = shard_manager.get_shard(student_id)
    return shard.table('profiles').select('*').eq('id', student_id).execute()
```

#### 4️⃣ CDC (Change Data Capture) → ClickHouse

```sql
-- ===== Supabase Realtime으로 변경 감지 → ClickHouse 전송 =====

-- 1. 테이블별 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- 2. FastAPI에서 Realtime 구독
```

```python
# FastAPI에서 Realtime 구독 → ClickHouse 전송

from supabase import create_client, RealtimeChannel
from clickhouse_driver import Client

clickhouse = Client(host='clickhouse.autus.io')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def on_payment_insert(payload):
    """결제 트랜잭션 발생 시 ClickHouse에 이벤트 로깅"""
    data = payload['new']

    clickhouse.execute(
        'INSERT INTO events (event_type, entity_id, metadata, created_at) VALUES',
        [{
            'event_type': 'payment.completed',
            'entity_id': data['id'],
            'metadata': json.dumps(data),
            'created_at': datetime.now()
        }]
    )

# Realtime 구독
channel: RealtimeChannel = supabase.channel('payment-events')
channel.on_postgres_changes(
    event='INSERT',
    schema='public',
    table='payment_transactions',
    callback=on_payment_insert
).subscribe()
```

---

## 📊 모니터링 및 알람

### 1️⃣ Supabase Dashboard 메트릭

```sql
-- 느린 쿼리 감지
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100  -- 100ms 이상
ORDER BY mean_time DESC
LIMIT 20;

-- 테이블 크기 모니터링
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY size_bytes DESC;

-- 인덱스 사용률
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE idx_scan < 100  -- 거의 사용 안 되는 인덱스
ORDER BY idx_scan;
```

### 2️⃣ 성능 알람 (FastAPI)

```python
# 느린 쿼리 로깅

import time
from fastapi import Request

@app.middleware("http")
async def log_slow_requests(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time

    # 500ms 이상 걸린 요청 로깅
    if duration > 0.5:
        logger.warning(
            f"Slow request: {request.method} {request.url.path} - {duration:.2f}s"
        )

        # 몰트봇으로 알림
        await send_telegram_alert(
            f"⚠️ Slow API: {request.url.path} ({duration:.2f}s)"
        )

    return response
```

---

## 💰 규모별 인프라 비용

| 규모 | Supabase | Redis | Read Replica | ClickHouse | 합계/월 |
|------|----------|-------|--------------|------------|---------|
| **3K** | Free | - | - | - | **무료** |
| **10K** | $25 | $20 | - | - | **$45** |
| **100K** | $125 | $50 | $125 | $100 | **$400** |
| **1M** | $750 | $200 | $750 | $500 | **$2,200** |

---

## ✅ 실행 체크리스트

### Week 2-3 (Phase 1)
- [ ] 인덱스 30개 생성
- [ ] RLS 정책 5개 테이블 적용
- [ ] Materialized View 3개 생성
- [ ] pg_cron 자동화 4개 설정
- [ ] TTL 정리 작업 2개 설정

### Month 3-6 (Phase 2)
- [ ] PgBouncer 연결 풀링
- [ ] Redis 캐싱 (10분 TTL)
- [ ] 파티셔닝 (payment_transactions)
- [ ] 병렬 쿼리 적용

### Month 6-12 (Phase 3)
- [ ] Read Replica 설정
- [ ] Full-Text Search 구현
- [ ] 샤딩 준비 (10 shards)
- [ ] CDC → ClickHouse 연동

---

**🎯 핵심**: 최적화는 단계적으로 진행. Phase 1만으로도 10만명까지 충분히 대응 가능합니다.
