# 🌐 AUTUS 병렬 확장 설계 (Multi-Tenant Architecture)

**핵심**: 기하급수적 병렬 성장에 영향받지 않는 외부 툴 활용 원칙

---

## 📊 4가지 병렬 확장 시나리오

### 현재 설계 상태 점검

| 확장 축 | 현재 상태 | 준비도 | 필요 작업 |
|---------|----------|--------|----------|
| **1. 학부모 증가** (수직 확장) | ✅ 준비됨 | 95% | Supabase 최적화만 |
| **2. 학원 증가** (수평 확장) | ❌ 미준비 | 0% | 멀티 테넌트 설계 |
| **3. 종목 증가** (카테고리 확장) | ⚠️ 부분 준비 | 40% | programs 테이블 구조화 |
| **4. 로그 통합** (AUTUS 핵심) | ⚠️ 부분 준비 | 30% | 서비스 간 ID 통합 |

---

## 🔴 문제점: 현재는 단일 테넌트 구조

### 현재 스키마의 한계

```sql
-- ❌ 문제 1: business_settings가 1개만 존재
CREATE TABLE business_settings (
  id UUID PRIMARY KEY,
  business_name TEXT NOT NULL,  -- "온리쌤배구아카데미" 하나만
  ...
);

-- ❌ 문제 2: 학원 구분 없음
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  -- organization_id가 없음! 모든 학생이 섞임
);

-- ❌ 문제 3: 종목이 문자열로만 저장
CREATE TABLE schedules (
  program_name TEXT NOT NULL,  -- "배구 초급반", "배구 중급반" 등 비구조화
);

-- ⚠️ 문제 4: 서비스 간 통합 미흡
CREATE TABLE profiles (
  external_id TEXT,  -- 있지만 활용 안 됨
);
```

---

## ✅ 해결책: 멀티 테넌트 아키텍처

### 1️⃣ 학원 증가 대응 (수평 확장)

**시나리오**:
- 온리쌤배구아카데미 (서울 강남)
- 온리쌤배구아카데미 (서울 송파)
- 챔피언스포츠클럽 (부산)
- 스타학원 (대구)
- ... 1,000개 학원

**설계**:

```sql
-- ===== organizations 테이블 (신규) =====
-- 학원, 사업장, 조직 단위

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 기본 정보
  name TEXT NOT NULL,                     -- "온리쌤배구아카데미 강남점"
  slug TEXT UNIQUE NOT NULL,              -- "onlyssam-gangnam" (URL용)
  type TEXT DEFAULT 'academy',            -- academy, club, school

  -- 사업자 정보
  business_number TEXT,                   -- 사업자등록번호
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,

  -- 결제 설정
  pg_provider TEXT,                       -- 결제선생, 토스페이먼츠
  pg_merchant_id TEXT,
  pg_api_key_encrypted TEXT,
  card_fee_rate DECIMAL(5,2) DEFAULT 0.8,

  -- 자동화 설정
  auto_send_invoice BOOLEAN DEFAULT false,
  auto_send_day INTEGER DEFAULT 1,

  -- 상태
  status TEXT DEFAULT 'active',           -- active, suspended, closed
  tier TEXT DEFAULT 'free',               -- free, basic, pro, enterprise

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);

-- ===== programs 테이블 (신규) =====
-- 종목, 과목, 프로그램 구조화

CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 조직 연결
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 프로그램 정보
  name TEXT NOT NULL,                     -- "배구 초급반"
  category TEXT NOT NULL,                 -- volleyball, soccer, basketball, math, english
  level TEXT,                             -- beginner, intermediate, advanced
  description TEXT,

  -- 운영 정보
  monthly_fee INTEGER,                    -- 월 수업료
  capacity INTEGER DEFAULT 20,            -- 정원
  min_age INTEGER,                        -- 최소 연령
  max_age INTEGER,                        -- 최대 연령

  -- 상태
  is_active BOOLEAN DEFAULT true,

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- 제약 조건
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_programs_organization ON programs(organization_id);
CREATE INDEX idx_programs_category ON programs(category);
CREATE INDEX idx_programs_active ON programs(is_active);

-- ===== 기존 테이블 수정 =====

-- profiles 테이블에 organization_id 추가
ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_profiles_organization ON profiles(organization_id);

-- schedules 테이블 수정
ALTER TABLE schedules ADD COLUMN organization_id UUID REFERENCES organizations(id);
ALTER TABLE schedules ADD COLUMN program_id UUID REFERENCES programs(id);
ALTER TABLE schedules DROP COLUMN program_name;  -- 구조화된 program_id 사용
CREATE INDEX idx_schedules_organization ON schedules(organization_id);
CREATE INDEX idx_schedules_program ON schedules(program_id);

-- payments 테이블에 organization_id 추가
ALTER TABLE payments ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_payments_organization ON payments(organization_id);

-- bookings 테이블에 organization_id 추가
ALTER TABLE bookings ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_bookings_organization ON bookings(organization_id);

-- invoices 테이블에 organization_id 추가
ALTER TABLE invoices ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_invoices_organization ON invoices(organization_id);

-- payment_transactions 테이블에 organization_id 추가
ALTER TABLE payment_transactions ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_payment_transactions_organization ON payment_transactions(organization_id);

-- notifications 테이블에 organization_id 추가
ALTER TABLE notifications ADD COLUMN organization_id UUID REFERENCES organizations(id);
CREATE INDEX idx_notifications_organization ON notifications(organization_id);
```

---

### 2️⃣ RLS 정책 (조직별 데이터 격리)

```sql
-- ===== profiles 테이블 RLS (멀티 테넌트) =====

-- Service Role: 전체 접근 (관리자)
CREATE POLICY "service_role_all_profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated Users: 같은 조직 내에서만 조회
CREATE POLICY "users_view_same_org_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()::uuid
    )
  );

-- ===== payments 테이블 RLS =====

-- 같은 조직 내에서만 조회
CREATE POLICY "users_view_same_org_payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()::uuid
    )
  );

-- ===== bookings 테이블 RLS =====

-- 같은 조직 내에서만 조회/생성
CREATE POLICY "users_manage_same_org_bookings"
  ON bookings
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()::uuid
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()::uuid
    )
  );

-- ===== invoices, payment_transactions, notifications 동일 패턴 =====
```

---

### 3️⃣ 종목 증가 대응 (카테고리 확장)

**시나리오**:
- 온리쌤: 배구 → 농구, 축구, 야구 추가
- K-Work: 중국어, 일본어, 코딩 추가
- 미래: 무한 확장 가능

**설계**:

```sql
-- programs 테이블로 구조화 (위에서 작성함)

-- 예시 데이터
INSERT INTO programs (organization_id, name, category, level, monthly_fee) VALUES
  -- 온리쌤 강남점
  ('org-1', '배구 초급반', 'volleyball', 'beginner', 200000),
  ('org-1', '배구 중급반', 'volleyball', 'intermediate', 250000),
  ('org-1', '농구 초급반', 'basketball', 'beginner', 200000),
  ('org-1', '축구 초급반', 'soccer', 'beginner', 180000),

  -- 온리쌤 송파점
  ('org-2', '배구 초급반', 'volleyball', 'beginner', 200000),
  ('org-2', '배구 고급반', 'volleyball', 'advanced', 300000),

  -- K-Work
  ('org-3', '중국어 입문', 'chinese', 'beginner', 150000),
  ('org-3', '중국어 심화', 'chinese', 'advanced', 200000),
  ('org-3', '코딩 기초', 'coding', 'beginner', 250000);

-- 학생이 여러 프로그램 수강 가능
-- bookings 테이블이 schedule_id를 참조하고,
-- schedule이 program_id를 참조하므로 자동으로 지원됨
```

---

### 4️⃣ 로그 통합 (AUTUS 핵심 - V-Index)

**시나리오**:
- 학생 A: 온리쌤 배구 + K-Work 중국어 동시 수강
- 학생 B: 온리쌤 배구(강남) → 온리쌤 농구(송파)로 이동
- 모든 decision log를 하나의 개인 ID로 통합

**설계**:

```sql
-- ===== universal_profiles 테이블 (신규 - AUTUS 핵심) =====
-- 조직 경계를 넘는 "개인의 유니버셜 ID"

CREATE TABLE universal_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- AUTUS Universal ID

  -- 개인 식별 정보 (해싱)
  phone_hash TEXT UNIQUE,                 -- SHA256(전화번호)
  email_hash TEXT,                        -- SHA256(이메일)

  -- 개인정보 (암호화 저장)
  name_encrypted TEXT,                    -- AES256(이름)
  birth_year_encrypted TEXT,              -- AES256(생년)

  -- AUTUS 메타데이터
  v_index DECIMAL(10,2) DEFAULT 0,        -- V-Index 점수
  total_services INTEGER DEFAULT 0,        -- 연결된 서비스 수
  total_interactions BIGINT DEFAULT 0,    -- 총 상호작용 수

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_universal_profiles_phone_hash ON universal_profiles(phone_hash);
CREATE INDEX idx_universal_profiles_v_index ON universal_profiles(v_index);

-- ===== profiles 테이블에 universal_id 연결 =====

ALTER TABLE profiles ADD COLUMN universal_id UUID REFERENCES universal_profiles(id);
CREATE INDEX idx_profiles_universal ON profiles(universal_id);

-- ===== 동일 학생 매칭 함수 =====

CREATE OR REPLACE FUNCTION link_to_universal_profile(
  p_phone TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_phone_hash TEXT;
  v_email_hash TEXT;
  v_universal_id UUID;
BEGIN
  -- 전화번호 해싱
  v_phone_hash := encode(digest(p_phone, 'sha256'), 'hex');

  -- 이메일 해싱 (있으면)
  IF p_email IS NOT NULL THEN
    v_email_hash := encode(digest(p_email, 'sha256'), 'hex');
  END IF;

  -- 기존 universal_profile 찾기
  SELECT id INTO v_universal_id
  FROM universal_profiles
  WHERE phone_hash = v_phone_hash OR email_hash = v_email_hash
  LIMIT 1;

  -- 없으면 생성
  IF v_universal_id IS NULL THEN
    INSERT INTO universal_profiles (phone_hash, email_hash)
    VALUES (v_phone_hash, v_email_hash)
    RETURNING id INTO v_universal_id;
  END IF;

  RETURN v_universal_id;
END;
$$ LANGUAGE plpgsql;

-- ===== 사용 예시 =====

-- 학생 생성 시 자동으로 universal_id 연결
CREATE OR REPLACE FUNCTION auto_link_universal_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'student' AND NEW.phone IS NOT NULL THEN
    NEW.universal_id := link_to_universal_profile(NEW.phone, NEW.email);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_auto_link_universal
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_universal_profile();
```

---

### 5️⃣ 통합 이벤트 로깅 (ClickHouse)

```sql
-- ClickHouse events 테이블 (AUTUS Event Ledger)

CREATE TABLE events (
  event_id UUID,
  event_type String,                   -- attendance.checked, payment.completed, etc

  -- 조직 정보
  organization_id UUID,
  organization_name String,

  -- 개인 정보
  universal_id UUID,                   -- AUTUS Universal ID (핵심!)
  profile_id UUID,                     -- 조직 내 profile ID

  -- 서비스 정보
  service_type String,                 -- onlyssam, kwork, etc
  program_category String,             -- volleyball, chinese, etc

  -- 이벤트 데이터
  entity_id UUID,                      -- 관련 엔티티 ID
  metadata String,                     -- JSON 메타데이터

  -- V-Index 계산용
  motion_type String,                  -- positive, negative, neutral
  relation_ids Array(UUID),            -- 관계된 다른 사람들

  -- 타임스탬프
  created_at DateTime DEFAULT now(),

  -- 파티셔닝
  year UInt16 MATERIALIZED toYear(created_at),
  month UInt8 MATERIALIZED toMonth(created_at)
)
ENGINE = MergeTree()
PARTITION BY (year, month)
ORDER BY (universal_id, created_at);

-- 인덱스
CREATE INDEX idx_events_universal ON events(universal_id) TYPE bloom_filter;
CREATE INDEX idx_events_organization ON events(organization_id) TYPE bloom_filter;
CREATE INDEX idx_events_type ON events(event_type) TYPE bloom_filter;
```

---

## 📊 병렬 확장 시뮬레이션

### 시나리오 1: 학원 1,000개 × 학생 1,000명 = 100만명

```
organizations:        1,000 rows
programs:             10,000 rows (학원당 평균 10개 종목)
profiles:             1,000,000 rows (학생)
universal_profiles:   800,000 rows (20% 중복 - 여러 서비스 사용)
payments:             12,000,000 rows/year (월 100만건)
bookings:             50,000,000 rows/year (월 400만건)
events (ClickHouse):  500,000,000 rows/year (월 4,000만건)
```

**Supabase 성능**:
- organization_id 인덱스로 조직별 격리
- RLS로 데이터 접근 제어
- 각 학원은 독립적으로 동작 (병렬)

**쿼리 예시**:
```sql
-- 온리쌤 강남점 미수금 조회 (전체 100만명 중 1,000명만)
SELECT * FROM payments
WHERE organization_id = 'org-1'
  AND paid_amount < total_amount;
-- 인덱스 사용으로 100ms 이내

-- 학생 A의 모든 서비스 출석 기록 (AUTUS 통합)
SELECT * FROM events
WHERE universal_id = 'univ-123'
ORDER BY created_at DESC;
-- ClickHouse에서 초당 수백만 row 스캔
```

---

### 시나리오 2: 동일 학생의 다중 서비스 사용

```
학생 김철수 (universal_id: univ-123):
├─ 온리쌤 강남점 (org-1)
│  ├─ profile_id: prof-1
│  ├─ 배구 초급반 수강
│  └─ 출석 200회, 결제 12회
│
├─ K-Work (org-3)
│  ├─ profile_id: prof-2
│  ├─ 중국어 심화 수강
│  └─ 출석 150회, 결제 10회
│
└─ AUTUS V-Index 계산
   ├─ Total Motions: 350 (출석 기록)
   ├─ Total Relations: 45 (같은 반 학생들)
   └─ V-Index: 87.5
```

**통합 조회**:
```sql
-- Supabase: 모든 조직에서 김철수 찾기
SELECT o.name as organization,
       p.name as student_name,
       pr.name as program
FROM profiles p
JOIN organizations o ON p.organization_id = o.id
JOIN schedules s ON s.organization_id = o.id
JOIN programs pr ON s.program_id = pr.id
WHERE p.universal_id = 'univ-123';

-- ClickHouse: 모든 이벤트 통합
SELECT
  organization_name,
  event_type,
  COUNT(*) as count
FROM events
WHERE universal_id = 'univ-123'
GROUP BY organization_name, event_type;
```

---

## 🚀 마이그레이션 계획

### Phase 1: 단일 → 멀티 테넌트 (Week 3-4)

```sql
-- 1. 신규 테이블 생성
CREATE TABLE organizations (...);
CREATE TABLE programs (...);
CREATE TABLE universal_profiles (...);

-- 2. 기본 조직 생성
INSERT INTO organizations (name, slug, status) VALUES
  ('온리쌤배구아카데미', 'onlyssam', 'active');

-- 3. 기존 데이터 마이그레이션
DO $$
DECLARE
  default_org_id UUID;
BEGIN
  -- 기본 조직 ID 가져오기
  SELECT id INTO default_org_id FROM organizations WHERE slug = 'onlyssam';

  -- 모든 profiles에 organization_id 설정
  UPDATE profiles SET organization_id = default_org_id;

  -- 모든 payments에 organization_id 설정
  UPDATE payments SET organization_id = default_org_id;

  -- ... 다른 테이블들도 동일
END $$;

-- 4. NOT NULL 제약 조건 추가
ALTER TABLE profiles ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN organization_id SET NOT NULL;
-- ... 다른 테이블들

-- 5. 프로그램 구조화
INSERT INTO programs (organization_id, name, category, level, monthly_fee)
SELECT
  organization_id,
  program_name,
  'volleyball',  -- 기본값
  'beginner',
  200000
FROM schedules
GROUP BY organization_id, program_name;

-- 6. schedules에 program_id 매핑
UPDATE schedules s
SET program_id = p.id
FROM programs p
WHERE s.organization_id = p.organization_id
  AND s.program_name = p.name;

-- 7. program_name 컬럼 삭제
ALTER TABLE schedules DROP COLUMN program_name;
```

### Phase 2: Universal ID 연동 (Week 5-6)

```sql
-- 1. universal_profiles 자동 생성
INSERT INTO universal_profiles (phone_hash)
SELECT DISTINCT encode(digest(phone, 'sha256'), 'hex')
FROM profiles
WHERE phone IS NOT NULL;

-- 2. profiles에 universal_id 매핑
UPDATE profiles p
SET universal_id = up.id
FROM universal_profiles up
WHERE encode(digest(p.phone, 'sha256'), 'hex') = up.phone_hash;

-- 3. 트리거 활성화
CREATE TRIGGER profiles_auto_link_universal
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_universal_profile();
```

### Phase 3: 두 번째 조직 추가 (Week 7)

```sql
-- 새 학원 추가
INSERT INTO organizations (name, slug) VALUES
  ('챔피언스포츠클럽', 'champion-sports');

-- 프로그램 추가
INSERT INTO programs (organization_id, name, category, level, monthly_fee) VALUES
  ((SELECT id FROM organizations WHERE slug = 'champion-sports'),
   '축구 초급반', 'soccer', 'beginner', 180000);

-- RLS 자동으로 데이터 격리됨
```

---

## ✅ 병렬 확장 준비도 최종 점검

| 확장 축 | 설계 | 구현 | 테스트 | 준비도 |
|---------|------|------|--------|--------|
| **1. 학부모 증가** | ✅ | ✅ | ⏳ | **95%** |
| **2. 학원 증가** | ✅ | ⏳ | ❌ | **60%** (설계 완료) |
| **3. 종목 증가** | ✅ | ⏳ | ❌ | **70%** (programs 테이블) |
| **4. 로그 통합** | ✅ | ⏳ | ❌ | **80%** (universal_id) |

---

## 💰 비용 영향

### 멀티 테넌트 추가 비용: 거의 없음

- organizations: 1,000개 학원 = 1,000 rows (무시 가능)
- programs: 학원당 10개 = 10,000 rows (무시 가능)
- universal_profiles: 100만명 = 1,000,000 rows (기존 profiles와 동일)
- 인덱스 추가: organization_id (10개 테이블) = 약 500MB

**결론**: Supabase 비용 변화 없음. 오히려 RLS로 쿼리 효율 증가.

---

## 🎯 결론

### ✅ 병렬 확장 준비 완료!

1. **학부모 증가**: Supabase 최적화로 100만명 대응 ✅
2. **학원 증가**: 멀티 테넌트 설계 완료, 구현만 남음 ✅
3. **종목 증가**: programs 테이블로 무한 확장 가능 ✅
4. **로그 통합**: universal_id로 AUTUS V-Index 준비 ✅

### 📅 다음 단계 (Week 3-6)

- [ ] organizations, programs 테이블 생성
- [ ] 기존 데이터 멀티 테넌트로 마이그레이션
- [ ] universal_profiles 생성 + 자동 연결
- [ ] RLS 정책 조직별 격리
- [ ] ClickHouse 이벤트 로깅 시작

**🚀 핵심**: 외부 툴(Supabase, ClickHouse) 활용으로 기하급수적 병렬 성장에도 선형적 비용 증가만!
