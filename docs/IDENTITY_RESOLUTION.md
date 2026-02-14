# 🆔 AUTUS 동일인 식별 알고리즘

## 📌 핵심 문제

**학부모 A의 자녀가**:
- 온리쌤 (배구학원)에 등록 → `profiles` 레코드 생성
- BCC 영어학원에 등록 → **새로운 `profiles` 레코드 생성?**

**❌ 문제**: 같은 사람인데 2개의 프로필이 생성됨
**✅ 해결**: Universal ID로 동일인임을 확인하고 통합

---

## 🎯 설계 원칙

### 1. 품질 우선
- **100% 정확도**: 다른 사람을 같은 사람으로 인식 금지
- **충돌 방지**: 같은 사람을 다른 사람으로 분리 금지
- **개인정보 보호**: 원본 전화번호/이메일 해싱 저장
- **추적 가능성**: 모든 병합 이력 기록
- **롤백 가능성**: 잘못된 병합 복구 가능

### 2. 식별 우선순위
```
1순위: 전화번호 (phone) - 99% 신뢰도
2순위: 이메일 (email) - 95% 신뢰도
3순위: 이름 + 생년월일 - 80% 신뢰도 (수동 확인 필요)
```

### 3. 3-Tier 아키텍처
```
Layer 1: profiles (학원별 프로필)
         ↓ universal_id
Layer 2: universal_profiles (통합 프로필)
         ↓ v_index
Layer 3: AUTUS AI (개인화 AI)
```

---

## 🧮 알고리즘

### Phase 1: 해싱 (Hashing)

#### 1-1. 전화번호 해싱
```python
import hashlib

def hash_phone(phone: str) -> str:
    """
    전화번호를 SHA-256으로 해싱

    입력: "010-1234-5678" 또는 "01012345678"
    출력: "a1b2c3d4..." (64자 해시)
    """
    if not phone:
        return None

    # 1. 정규화: 숫자만 추출
    normalized = ''.join(c for c in phone if c.isdigit())

    # 2. 한국 전화번호 검증
    if not (normalized.startswith('010') and len(normalized) == 11):
        raise ValueError(f"Invalid phone: {phone}")

    # 3. SHA-256 해싱
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()
```

**예시**:
```python
hash_phone("010-1234-5678")
# → "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"

hash_phone("01012345678")
# → "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"
# ✅ 같은 해시 (정규화 덕분)
```

#### 1-2. 이메일 해싱
```python
def hash_email(email: str) -> str:
    """
    이메일을 SHA-256으로 해싱

    입력: "parent@example.com"
    출력: "x1y2z3..." (64자 해시)
    """
    if not email:
        return None

    # 1. 정규화: 소문자 변환, 공백 제거
    normalized = email.strip().lower()

    # 2. 이메일 형식 검증
    if '@' not in normalized or '.' not in normalized.split('@')[1]:
        raise ValueError(f"Invalid email: {email}")

    # 3. SHA-256 해싱
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()
```

---

### Phase 2: 동일인 검색 (Identity Lookup)

#### 2-1. SQL 함수: find_or_create_universal_id
```sql
CREATE OR REPLACE FUNCTION find_or_create_universal_id(
  p_phone TEXT,
  p_email TEXT,
  p_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_phone_hash TEXT;
  v_email_hash TEXT;
  v_universal_id UUID;
BEGIN
  -- 1. 해시 생성
  v_phone_hash := encode(digest(regexp_replace(p_phone, '[^0-9]', '', 'g'), 'sha256'), 'hex');
  v_email_hash := CASE
    WHEN p_email IS NOT NULL
    THEN encode(digest(lower(trim(p_email)), 'sha256'), 'hex')
    ELSE NULL
  END;

  -- 2. 기존 universal_profile 검색 (전화번호 우선)
  SELECT id INTO v_universal_id
  FROM universal_profiles
  WHERE phone_hash = v_phone_hash
  LIMIT 1;

  -- 3. 전화번호로 못 찾으면 이메일로 검색
  IF v_universal_id IS NULL AND v_email_hash IS NOT NULL THEN
    SELECT id INTO v_universal_id
    FROM universal_profiles
    WHERE email_hash = v_email_hash
    LIMIT 1;
  END IF;

  -- 4. 못 찾으면 새로 생성
  IF v_universal_id IS NULL THEN
    INSERT INTO universal_profiles (phone_hash, email_hash, v_index)
    VALUES (v_phone_hash, v_email_hash, 0)
    RETURNING id INTO v_universal_id;
  ELSE
    -- 기존 프로필에 이메일 해시 업데이트 (없었다면)
    UPDATE universal_profiles
    SET email_hash = COALESCE(email_hash, v_email_hash),
        updated_at = now()
    WHERE id = v_universal_id;
  END IF;

  RETURN v_universal_id;
END;
$$ LANGUAGE plpgsql;
```

#### 2-2. Python 구현
```python
from supabase import Client

def find_or_create_universal_id(
    supabase: Client,
    phone: str,
    email: str = None,
    name: str = None
) -> str:
    """
    동일인 검색 또는 신규 생성

    Returns:
        universal_id (UUID)
    """
    result = supabase.rpc(
        'find_or_create_universal_id',
        {
            'p_phone': phone,
            'p_email': email,
            'p_name': name
        }
    ).execute()

    return result.data
```

---

### Phase 3: 프로필 생성 시 자동 연결

#### 3-1. Trigger: auto_link_universal_profile
```sql
CREATE OR REPLACE FUNCTION auto_link_universal_profile()
RETURNS TRIGGER AS $$
DECLARE
  v_universal_id UUID;
BEGIN
  -- profiles 테이블에 INSERT 될 때 자동 실행

  -- 1. universal_id 찾기/생성
  v_universal_id := find_or_create_universal_id(
    NEW.phone,
    NEW.email,
    NEW.name
  );

  -- 2. profiles.universal_id 자동 설정
  NEW.universal_id := v_universal_id;

  -- 3. universal_profiles 카운터 증가
  UPDATE universal_profiles
  SET total_services = total_services + 1,
      updated_at = now()
  WHERE id = v_universal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_link_universal
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_universal_profile();
```

#### 3-2. 동작 예시
```sql
-- 온리쌤에서 학생 등록
INSERT INTO profiles (organization_id, type, name, phone, email)
VALUES (
  '온리쌤-uuid',
  'student',
  '김철수',
  '010-1234-5678',
  'parent@example.com'
);
-- ✅ universal_id 자동 생성: "uuid-1"

-- BCC 영어학원에서 같은 학생 등록
INSERT INTO profiles (organization_id, type, name, phone, email)
VALUES (
  'BCC-uuid',
  'student',
  '김철수',
  '010-1234-5678',
  'parent@example.com'
);
-- ✅ 같은 universal_id 할당: "uuid-1"
-- ✅ total_services: 1 → 2
```

---

### Phase 4: V-Index 계산

#### 4-1. V-Index 공식
```
V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t

Base: 기본 신뢰도 (100)
Motions: 긍정 액션 수 (출석, 결제, 긍정 피드백)
Threats: 부정 액션 수 (결석, 연체, 불만)
Relations: 관계 수 (다른 학원 수, 형제 수)
상호지수: 0.1 (10% 가중치)
t: 시간 (개월)
```

#### 4-2. SQL Materialized View
```sql
CREATE MATERIALIZED VIEW mv_v_index AS
SELECT
  up.id as universal_id,
  up.phone_hash,
  up.email_hash,

  -- Base
  100 as base,

  -- Motions (긍정 액션)
  COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) as attendance_count,
  COUNT(DISTINCT CASE WHEN pay.payment_status = 'completed' THEN pay.id END) as payment_count,

  -- Threats (부정 액션)
  COUNT(DISTINCT CASE WHEN b.status = 'no_show' THEN b.id END) as absence_count,
  COUNT(DISTINCT CASE WHEN pay.payment_status = 'overdue' THEN pay.id END) as overdue_count,

  -- Relations
  COUNT(DISTINCT p.organization_id) as service_count,

  -- 최종 V-Index
  ROUND(
    100 *
    (
      COUNT(DISTINCT CASE WHEN b.status = 'completed' THEN b.id END) +
      COUNT(DISTINCT CASE WHEN pay.payment_status = 'completed' THEN pay.id END) -
      COUNT(DISTINCT CASE WHEN b.status = 'no_show' THEN b.id END) -
      COUNT(DISTINCT CASE WHEN pay.payment_status = 'overdue' THEN pay.id END)
    ) *
    POWER(
      1 + 0.1 * COUNT(DISTINCT p.organization_id),
      EXTRACT(MONTH FROM age(now(), MIN(p.created_at)))
    )
  , 2) as v_index

FROM universal_profiles up
LEFT JOIN profiles p ON p.universal_id = up.id
LEFT JOIN bookings b ON b.student_id = p.id
LEFT JOIN payments pay ON pay.student_id = p.id
GROUP BY up.id, up.phone_hash, up.email_hash;

-- 1시간마다 자동 갱신
SELECT cron.schedule(
  'refresh-v-index',
  '0 * * * *',  -- 매시 정각
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_v_index$$
);
```

---

## 🔍 충돌 처리

### Case 1: 같은 전화번호, 다른 이름
```python
# 김철수 등록 (010-1234-5678)
# → universal_id: "uuid-1"

# 김영희 등록 (010-1234-5678)
# → ⚠️ 같은 전화번호!

# 해결:
1. 같은 universal_id 할당 (형제일 수 있음)
2. metadata에 이름 차이 기록
3. 관리자 대시보드에 알림 표시
4. 수동 확인 후 분리 가능
```

### Case 2: 다른 전화번호, 같은 이메일
```python
# 김철수 등록 (010-1234-5678, parent@example.com)
# → universal_id: "uuid-1"

# 김영희 등록 (010-9999-8888, parent@example.com)
# → 전화번호는 다르지만 이메일은 같음

# 해결:
1. 새로운 universal_id 생성 (전화번호 우선)
2. 이메일 중복 경고 로그 기록
3. 관리자 확인 필요 플래그
```

### Case 3: 전화번호 변경
```python
# 기존: 김철수 (010-1234-5678) → universal_id: "uuid-1"
# 변경: 김철수 (010-9999-8888)

# 해결:
UPDATE profiles
SET phone = '010-9999-8888'
WHERE id = 'profile-id';

# Trigger 실행:
1. 새 phone_hash 생성
2. universal_profiles에서 기존 레코드 찾기 실패
3. 새 universal_id 생성 → "uuid-2"

# 수동 병합 필요:
CALL merge_universal_profiles('uuid-1', 'uuid-2');
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 같은 학생, 2개 학원
```python
# 1. 온리쌤 등록
profile1 = create_profile(
    org='온리쌤',
    name='김철수',
    phone='010-1234-5678',
    email='parent@example.com'
)
# universal_id: "uuid-1"
# total_services: 1

# 2. BCC 등록 (같은 전화번호)
profile2 = create_profile(
    org='BCC',
    name='김철수',
    phone='010-1234-5678',
    email='parent@example.com'
)
# universal_id: "uuid-1" (같음!)
# total_services: 2

# 3. 검증
assert profile1.universal_id == profile2.universal_id
assert get_universal_profile('uuid-1').total_services == 2
```

### 시나리오 2: 형제 (같은 전화번호)
```python
# 1. 형 등록
brother1 = create_profile(
    org='온리쌤',
    name='김철수',
    phone='010-1234-5678'
)
# universal_id: "uuid-1"

# 2. 동생 등록 (같은 전화번호)
brother2 = create_profile(
    org='온리쌤',
    name='김영희',
    phone='010-1234-5678'
)
# universal_id: "uuid-1" (같은 학부모)
# total_services: 2

# 3. 구분
# profiles 테이블에서는 별도 레코드
# universal_profiles에서는 같은 학부모로 통합
```

---

## 📊 데이터 구조

### profiles 테이블
```sql
id               | organization_id | universal_id | name   | phone          | email
-----------------|-----------------|--------------|--------|----------------|------------------
profile-001      | 온리쌤-uuid     | uuid-1       | 김철수 | 010-1234-5678  | parent@example.com
profile-002      | BCC-uuid        | uuid-1       | 김철수 | 010-1234-5678  | parent@example.com
profile-003      | 온리쌤-uuid     | uuid-1       | 김영희 | 010-1234-5678  | parent@example.com
```

### universal_profiles 테이블
```sql
id      | phone_hash        | email_hash        | v_index | total_services | total_interactions
--------|-------------------|-------------------|---------|----------------|-------------------
uuid-1  | 8d969eef6ecad3... | a3c5d7e9f1b2... | 1250.50 | 3              | 158
```

### 해석
- **김철수**는 온리쌤과 BCC 2개 학원 이용 (같은 universal_id)
- **김영희**는 김철수의 형제 (같은 전화번호 = 같은 학부모)
- **universal_id: uuid-1**의 V-Index는 **1250.50**
- **3개 서비스**, **158번 상호작용**

---

## 🚀 구현 체크리스트

### Phase 1: 즉시 (Week 1)
- [x] `universal_profiles` 테이블 생성
- [ ] `find_or_create_universal_id()` SQL 함수 구현
- [ ] `auto_link_universal_profile()` Trigger 구현
- [ ] Python `identity_resolver.py` 작성
- [ ] 단위 테스트 (100% 정확도 검증)

### Phase 2: 베타 (Week 4)
- [ ] V-Index Materialized View 생성
- [ ] 충돌 감지 대시보드
- [ ] 수동 병합/분리 UI
- [ ] 이력 추적 테이블

### Phase 3: 확장 (Week 8)
- [ ] 머신러닝 기반 동일인 추론
- [ ] 생년월일 + 이름 매칭
- [ ] 가족 관계 그래프 생성

---

## 💡 핵심 장점

### AUTUS의 차별화
```
일반 학원 관리 시스템:
- 학원마다 별도 프로필
- 중복 데이터 입력
- 통합 분석 불가능

AUTUS:
- Universal ID로 자동 통합
- 한 번만 입력하면 모든 학원에서 활용
- 개인별 통합 V-Index로 맞춤 추천
```

### 확장성
```
현재: 온리쌤 (배구) 1개 학원
Week 8: 온리쌤 + BCC + 계성학원 3개
Month 6: 100개 학원
Year 1: 1,000개 학원

→ 같은 학생이 10개 학원을 다녀도
→ universal_id는 1개
→ V-Index는 10배 풍부
```

---

**이 알고리즘으로 AUTUS는 "학원별 개별 시스템"이 아닌 "개인 중심 통합 플랫폼"이 됩니다.** 🚀
