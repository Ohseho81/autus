# 🎯 AUTUS 품질 우선 개발 원칙

**우선순위**: 1. 품질 > 2. 속도 > 3. 비용

---

## 📐 품질의 정의

### 온리쌤에서 품질이란?

```
❌ 빠르게 출시했지만 출석 기록이 틀린 시스템
❌ 저렴하게 만들었지만 결제가 누락되는 시스템
❌ 최신 기술을 썼지만 학부모가 이해 못하는 시스템

✅ 느려도 출석 기록이 100% 정확한 시스템
✅ 비싸도 결제가 절대 누락되지 않는 시스템
✅ 단순해도 학부모가 쉽게 쓸 수 있는 시스템
```

---

## 🎯 7가지 품질 지표

### 1. 정확성 (Accuracy) - **최우선**

**정의**: 데이터가 100% 정확해야 함

**필수 영역**:
```
출석 체크    → 한 명이라도 누락되면 안 됨
결제 금액    → 1원이라도 틀리면 안 됨
미수금 계산  → 100% 정확해야 함
학생 정보    → 전화번호, 이름 오류 불가
```

**품질 기준**:
- 출석 정확도: **100%** (99.9%도 불합격)
- 결제 정확도: **100%** (오차 허용 0원)
- 미수금 정확도: **100%**
- 데이터 무결성: **100%**

**구현**:
```python
# ❌ 나쁜 예시
def check_attendance(student_id):
    try:
        record = db.query(...)
        return record
    except:
        return None  # 에러 무시 - 데이터 누락 가능

# ✅ 좋은 예시
def check_attendance(student_id):
    try:
        record = db.query(...)

        # 이중 검증
        verification = db.query_verify(...)
        if record != verification:
            raise DataInconsistencyError()

        # 로그 기록
        audit_log.write(student_id, record)

        return record
    except Exception as e:
        # 에러 알림 (몰트봇)
        alert_admin(f"출석 체크 실패: {student_id}, {e}")
        raise  # 에러 전파 - 사용자에게 명확히 알림
```

---

### 2. 신뢰성 (Reliability)

**정의**: 24/7 안정적으로 동작

**품질 기준**:
- Uptime: **99.9%** (월 43분 이하 다운타임)
- MTBF (평균 고장 시간): **720시간** (30일)
- MTTR (평균 복구 시간): **15분 이내**

**구현**:
- Health Check: 1분마다
- Auto Restart: 3회 실패 시
- Failover: Read Replica 자동 전환
- Backup: 1시간마다 자동

---

### 3. 사용성 (Usability)

**정의**: 학부모, 코치가 교육 없이 사용 가능

**품질 기준**:
- 첫 사용 성공률: **>90%** (교육 없이)
- 작업 완료 시간: **<30초** (출석 체크, 결제 확인 등)
- 에러 발생 시 이해도: **>95%** (에러 메시지 명확)
- 만족도: **>85%**

**구현 원칙**:
```
❌ "Internal Server Error"
✅ "출석 체크에 실패했습니다. 관리자에게 문의하세요. (오류 코드: ATT-001)"

❌ "Invalid input"
✅ "전화번호는 010-0000-0000 형식으로 입력해주세요."

❌ 복잡한 관리자 대시보드
✅ 한눈에 보이는 "오늘 미수금", "오늘 출석률"
```

---

### 4. 성능 (Performance)

**정의**: 빠른 응답으로 사용자 경험 향상

**품질 기준**:
- API 응답: **<200ms** (95 percentile)
- 페이지 로딩: **<1초**
- 검색 결과: **<500ms**
- 대시보드 렌더링: **<2초**

**구현**:
- 인덱스 최적화 (30개)
- Materialized View (집계 데이터)
- Redis 캐싱 (자주 조회)
- CDN (정적 자산)

---

### 5. 보안 (Security)

**정의**: 개인정보 및 결제 정보 철저 보호

**품질 기준**:
- 데이터 유출: **0건**
- 무단 접근: **0건**
- RLS 정책 적용: **100%**
- 암호화: **전송/저장 모두**

**구현**:
```sql
-- RLS 정책 (조직별 격리)
CREATE POLICY "users_view_same_org_only"
  ON profiles FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

-- 민감 정보 암호화
CREATE TABLE universal_profiles (
  phone_hash TEXT,              -- SHA256 해싱
  name_encrypted TEXT,          -- AES256 암호화
  birth_year_encrypted TEXT
);
```

**금지 사항**:
```python
# ❌ 절대 금지
- API 키를 코드에 하드코딩
- 비밀번호 평문 저장
- SQL Injection 취약점
- XSS 취약점
- CORS 전체 허용

# ✅ 필수
- 환경 변수로 API 키 관리
- bcrypt로 비밀번호 해싱
- Prepared Statement 사용
- HTML Escape
- 특정 도메인만 CORS 허용
```

---

### 6. 유지보수성 (Maintainability)

**정의**: 코드가 읽기 쉽고 수정이 쉬워야 함

**품질 기준**:
- 코드 리뷰 커버리지: **100%**
- 문서화 커버리지: **>80%**
- 함수 복잡도: **<10** (Cyclomatic Complexity)
- 중복 코드: **<5%**

**구현 원칙**:
```python
# ❌ 나쁜 예시
def f(x,y,z):
    if x>0:
        if y>0:
            if z>0:
                return x+y+z
            else:
                return x+y
        else:
            return x
    else:
        return 0

# ✅ 좋은 예시
def calculate_total_amount(
    base_amount: int,
    discount_amount: int,
    tax_amount: int
) -> int:
    """
    총 금액 계산

    Args:
        base_amount: 기본 금액
        discount_amount: 할인 금액
        tax_amount: 세금

    Returns:
        최종 금액 (음수 불가)
    """
    if base_amount < 0:
        raise ValueError("기본 금액은 0 이상이어야 합니다")

    total = base_amount - discount_amount + tax_amount
    return max(0, total)
```

---

### 7. 확장성 (Scalability)

**정의**: 3,000명 → 100만명까지 품질 유지

**품질 기준**:
- 3,000명: API <100ms
- 10,000명: API <150ms
- 100,000명: API <200ms
- 1,000,000명: API <300ms

**구현**:
- Phase 1: 인덱스 + Materialized View
- Phase 2: Redis + 파티셔닝
- Phase 3: Read Replica + 샤딩

---

## 🧪 테스트 전략 (품질 보장)

### 1. 단위 테스트 (Unit Tests)

**목표**: 모든 함수가 정확히 동작

**커버리지**: **>90%**

```python
# test_payments.py

def test_calculate_unpaid_amount():
    """미수금 계산 정확도 테스트"""
    # Given
    total = 200000
    paid = 150000

    # When
    unpaid = calculate_unpaid_amount(total, paid)

    # Then
    assert unpaid == 50000

def test_calculate_unpaid_amount_edge_cases():
    """엣지 케이스 테스트"""
    # 전액 납부
    assert calculate_unpaid_amount(200000, 200000) == 0

    # 초과 납부
    assert calculate_unpaid_amount(200000, 250000) == 0

    # 음수 입력
    with pytest.raises(ValueError):
        calculate_unpaid_amount(-100000, 0)
```

**필수 테스트**:
- 출석 체크 로직: 20개 테스트
- 결제 계산 로직: 30개 테스트
- 미수금 계산: 15개 테스트
- 날짜 계산: 10개 테스트

---

### 2. 통합 테스트 (Integration Tests)

**목표**: API + DB 통합 동작 검증

```python
# test_api_integration.py

def test_create_invoice_and_payment():
    """청구서 생성 → 결제 → 미수금 갱신 통합 테스트"""
    # 1. 청구서 생성
    invoice = create_invoice({
        'student_id': 'student-1',
        'amount': 200000
    })
    assert invoice.status == 'draft'

    # 2. 청구서 발송
    send_invoice(invoice.id)
    updated = get_invoice(invoice.id)
    assert updated.status == 'sent'
    assert updated.sent_at is not None

    # 3. 결제 처리
    payment = process_payment({
        'invoice_id': invoice.id,
        'amount': 200000,
        'method': 'card'
    })
    assert payment.status == 'completed'

    # 4. 청구서 상태 확인
    final = get_invoice(invoice.id)
    assert final.status == 'paid'
    assert final.paid_amount == 200000

    # 5. 미수금 0인지 확인
    unpaid = get_unpaid_invoices()
    assert invoice.id not in [u.id for u in unpaid]
```

---

### 3. E2E 테스트 (End-to-End Tests)

**목표**: 실제 사용자 시나리오 검증

```python
# test_e2e.py

def test_parent_checks_payment_status():
    """학부모가 결제 상태 확인하는 전체 플로우"""
    # 1. 학부모 로그인
    session = login_as_parent('010-1234-5678')

    # 2. 자녀 목록 조회
    children = session.get_children()
    assert len(children) == 2

    # 3. 첫 번째 자녀 선택
    child = children[0]

    # 4. 미수금 조회
    unpaid = session.get_unpaid_invoices(child.id)
    assert len(unpaid) == 1
    assert unpaid[0].amount == 200000

    # 5. 결제 진행
    payment_url = session.get_payment_url(unpaid[0].id)
    assert 'payssam.kr' in payment_url

    # 6. 결제 완료 (시뮬레이션)
    webhook_callback({
        'invoice_id': unpaid[0].id,
        'status': 'completed',
        'amount': 200000
    })

    # 7. 미수금 다시 확인
    unpaid_after = session.get_unpaid_invoices(child.id)
    assert len(unpaid_after) == 0
```

---

### 4. 성능 테스트 (Load Tests)

**목표**: 목표 성능 달성 검증

```python
# test_performance.py

def test_api_response_time():
    """API 응답 시간 < 200ms"""
    response_times = []

    for _ in range(100):
        start = time.time()
        response = requests.get('/api/profiles?type=student')
        end = time.time()

        response_times.append((end - start) * 1000)

    p95 = np.percentile(response_times, 95)
    assert p95 < 200, f"95 percentile: {p95}ms > 200ms"

def test_concurrent_requests():
    """100명 동시 접속"""
    with ThreadPoolExecutor(max_workers=100) as executor:
        futures = [
            executor.submit(requests.get, '/api/dashboard')
            for _ in range(100)
        ]

        results = [f.result() for f in futures]

        # 모든 요청 성공
        assert all(r.status_code == 200 for r in results)

        # 평균 응답 시간 < 500ms
        avg_time = sum(r.elapsed.total_seconds() for r in results) / len(results)
        assert avg_time < 0.5
```

---

## 🚨 에러 처리 표준

### 1. 에러 분류

```python
# errors.py

class AutousError(Exception):
    """AUTUS 기본 에러"""
    def __init__(self, message: str, code: str, details: dict = None):
        self.message = message
        self.code = code
        self.details = details or {}
        super().__init__(self.message)

class DataError(AutousError):
    """데이터 관련 에러 (치명적)"""
    pass

class ValidationError(AutousError):
    """입력 검증 에러 (사용자 수정 가능)"""
    pass

class ExternalServiceError(AutousError):
    """외부 서비스 에러 (재시도 가능)"""
    pass

# 사용 예시
if paid_amount > total_amount:
    raise ValidationError(
        "납부 금액이 청구 금액보다 큽니다",
        code="PAY-001",
        details={
            'total_amount': total_amount,
            'paid_amount': paid_amount
        }
    )
```

---

### 2. 에러 코드 체계

```
ATT-xxx: 출석 관련
PAY-xxx: 결제 관련
INV-xxx: 청구서 관련
STU-xxx: 학생 관련
ORG-xxx: 조직 관련

예시:
- ATT-001: 출석 체크 실패
- ATT-002: 중복 출석 체크
- PAY-001: 납부 금액 초과
- PAY-002: 결제 처리 실패
- INV-001: 청구서 생성 실패
```

---

### 3. 에러 로깅 및 알림

```python
# logging_config.py

import logging
from pythonjsonlogger import jsonlogger

# JSON 포맷 로깅
logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)

# 에러 발생 시
try:
    result = process_payment(...)
except DataError as e:
    # 치명적 에러 - 즉시 알림
    logger.error(
        "결제 처리 실패",
        extra={
            'error_code': e.code,
            'student_id': student_id,
            'amount': amount,
            'details': e.details
        }
    )

    # 몰트봇 즉시 알림
    send_telegram_alert(
        f"🚨 치명적 에러\n"
        f"코드: {e.code}\n"
        f"학생: {student_id}\n"
        f"금액: {amount:,}원"
    )

    raise
```

---

## 📊 품질 모니터링

### 1. 실시간 대시보드

**필수 메트릭**:
```
시스템 건강도
├─ Uptime: 99.95%
├─ 에러율: 0.01%
├─ API P95: 145ms
└─ DB 연결: 23/100

데이터 정확성
├─ 출석 누락: 0건
├─ 결제 오류: 0건
├─ 미수금 불일치: 0건
└─ 데이터 무결성: 100%

사용자 경험
├─ 만족도: 92%
├─ 첫 사용 성공: 94%
└─ 작업 완료 시간: 23초
```

---

### 2. 일일 품질 리포트

```python
# daily_quality_report.py

async def generate_daily_report():
    """매일 새벽 2시 품질 리포트 생성"""

    report = {
        # 정확성
        'accuracy': {
            'attendance_errors': count_attendance_errors(),
            'payment_errors': count_payment_errors(),
            'data_inconsistencies': check_data_integrity()
        },

        # 신뢰성
        'reliability': {
            'uptime': calculate_uptime(),
            'error_rate': calculate_error_rate(),
            'incident_count': count_incidents()
        },

        # 성능
        'performance': {
            'api_p95': get_api_percentile(95),
            'api_p99': get_api_percentile(99),
            'slow_queries': find_slow_queries()
        },

        # 보안
        'security': {
            'failed_logins': count_failed_logins(),
            'suspicious_activities': detect_suspicious_activities()
        }
    }

    # 몰트봇으로 전송
    send_telegram_report(format_report(report))

    # 기준 미달 시 알람
    if report['accuracy']['attendance_errors'] > 0:
        send_urgent_alert("출석 에러 발생!")
```

---

## ✅ 품질 체크리스트

### Week 2 (기초 품질)

**배포 전 필수**:
- [ ] 단위 테스트 커버리지 >80%
- [ ] 출석/결제/미수금 통합 테스트 통과
- [ ] API 응답 시간 <200ms (P95)
- [ ] RLS 정책 100% 적용
- [ ] 에러 핸들링 모든 API에 적용
- [ ] 로깅 시스템 구축
- [ ] 몰트봇 알림 연동
- [ ] Health Check 엔드포인트

---

### Week 4 (중급 품질)

**100명 베타 테스트 전**:
- [ ] E2E 테스트 5개 시나리오 통과
- [ ] 성능 테스트 (100 concurrent users)
- [ ] 데이터 백업 자동화 (1시간마다)
- [ ] 에러 모니터링 대시보드
- [ ] 사용자 만족도 >85%
- [ ] 출석/결제 정확도 100%
- [ ] 사용 설명서 작성
- [ ] 고객 지원 프로세스

---

### Week 8 (출시 품질)

**3,000명 론칭 전**:
- [ ] 단위 테스트 커버리지 >90%
- [ ] 통합 테스트 커버리지 >80%
- [ ] 부하 테스트 (1,000 concurrent users)
- [ ] 재해 복구 계획 (DR Plan)
- [ ] 보안 감사 (Security Audit)
- [ ] 성능 목표 100% 달성
- [ ] Uptime >99.9% (베타 기간)
- [ ] 에러율 <0.1%

---

## 💰 품질 vs 비용 트레이드오프

### 품질에 투자할 영역 (비용 상관없이)

```
✅ 절대 타협 불가:
1. 출석 기록 정확도 → 100% (비용 무제한)
2. 결제 데이터 정확도 → 100% (비용 무제한)
3. 개인정보 보안 → 최고 수준 (비용 무제한)
4. 데이터 백업 → 1시간마다 (비용 무제한)

✅ 높은 우선순위:
5. API 성능 → <200ms (비용 합리적 범위)
6. 사용자 경험 → 직관적 UI (개발 시간 투자)
7. 에러 모니터링 → 실시간 알림 (도구 비용 OK)
```

### 품질 타협 가능 영역 (속도/비용 우선)

```
⚠️ 타협 가능 (품질 70% 수준):
1. 통계/분석 기능 → 정확하지만 실시간 아닐 수 있음
2. 관리자 UI 디자인 → 기능 우선, 미려함은 나중
3. 알림 전송 속도 → 5분 지연 허용
4. 검색 기능 → 기본 검색만 (고급 검색은 나중)
```

---

## 🎯 결론

### 품질 우선 원칙

```
1. 정확성 > 속도
   - 느려도 정확한 시스템
   - 빠르지만 틀린 시스템은 무용지물

2. 신뢰성 > 기능
   - 기능 10개가 불안정한 것보다
   - 기능 5개가 완벽한 것이 낫다

3. 사용성 > 최신 기술
   - 최신 기술보다
   - 학부모가 쓸 수 있는 기술

4. 보안 > 편의성
   - 편리하지만 불안전한 것보다
   - 조금 불편해도 안전한 것
```

**온리쌤의 품질 = 학부모의 신뢰 = 장기적 성공**
