# 💳 결제선생 → AUTUS 통합 설계

**목표**: 결제선생의 청구·수납 시스템을 온리쌤 Supabase에 통합
**범위**: 8개 핵심 엔티티 동기화 + 이벤트 로깅

---

## 📊 현재 Supabase 스키마 vs 결제선생 요구사항

### 기존 스키마 (5개 테이블)
```
✅ profiles       → 학생/부모/코치 정보
✅ payments       → 기본 결제 정보 (총액, 납부액, 상태)
✅ schedules      → 수업 일정
✅ bookings       → 수업 예약
✅ notifications  → 알림 내역
```

### 결제선생 요구사항 (8개 엔티티)
```
1. 학생 데이터          → ✅ profiles (기존 활용)
2. 청구서 데이터        → ⚠️ payments 확장 필요
3. 결제 내역           → ❌ 신규 테이블 필요 (payment_transactions)
4. 발송·수납 내역      → ❌ 신규 테이블 필요 (invoices)
5. 현금영수증          → ❌ 신규 테이블 필요 (cash_receipts)
6. 매출 보고서         → ✅ VIEW로 구현 가능
7. 출결 데이터         → ✅ bookings + attendance 활용
8. 사업장 정보         → ❌ 신규 테이블 필요 (business_settings)
```

---

## 🔧 Supabase 스키마 확장 설계

### 1️⃣ invoices (청구서 테이블) - 신규

**목적**: 결제선생의 "청구서" 개념 구현

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 기본 정보
  invoice_number TEXT UNIQUE NOT NULL,        -- 청구서 번호 (INV-20260214-001)
  student_id UUID NOT NULL REFERENCES profiles(id),
  parent_id UUID REFERENCES profiles(id),     -- 실제 수신자

  -- 청구 내용
  items JSONB NOT NULL,                       -- [{name: "2월 수업료", amount: 200000, qty: 1}]
  total_amount INTEGER NOT NULL,
  discount_amount INTEGER DEFAULT 0,
  final_amount INTEGER NOT NULL,              -- total - discount

  -- 상태 관리
  status TEXT NOT NULL DEFAULT 'draft',       -- draft, sent, paid, partial, overdue, cancelled, destroyed

  -- 발송 정보
  sent_at TIMESTAMPTZ,                        -- 발송 시각
  sent_channel TEXT,                          -- kakao, sms, email
  sent_template_id TEXT,                      -- 결제선생 템플릿 ID

  -- 수납 정보
  paid_amount INTEGER DEFAULT 0,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,                        -- card, cash, transfer, virtual_account

  -- 예약 발송
  scheduled_send_at TIMESTAMPTZ,              -- 예약 발송 시각

  -- 메타데이터
  due_date DATE,                              -- 납부 기한
  memo TEXT,
  metadata JSONB DEFAULT '{}',                -- 결제선생 추가 필드

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  destroyed_at TIMESTAMPTZ                    -- 청구서 파기 시각
);

-- 인덱스
CREATE INDEX idx_invoices_student ON invoices(student_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_sent_at ON invoices(sent_at);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- 자동 업데이트 트리거
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 2️⃣ payment_transactions (결제 내역) - 신규

**목적**: 실제 결제 트랜잭션 기록 (카드사, 승인번호, 수수료 등)

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 연결
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id),

  -- 결제 정보
  payment_gateway TEXT NOT NULL,              -- 결제선생, 토스페이먼츠, 나이스페이, etc
  transaction_id TEXT UNIQUE NOT NULL,        -- PG사 거래 고유번호
  approval_number TEXT,                       -- 승인번호

  -- 금액
  amount INTEGER NOT NULL,
  fee INTEGER DEFAULT 0,                      -- 수수료
  net_amount INTEGER NOT NULL,                -- 실수령액 (amount - fee)

  -- 결제 수단
  payment_method TEXT NOT NULL,               -- card, cash, transfer, virtual_account
  card_company TEXT,                          -- 매입사 (신한, 국민, 삼성, etc)
  card_type TEXT,                             -- 개인, 법인, 체크
  installment_months INTEGER DEFAULT 0,       -- 할부 개월 (0 = 일시불)

  -- 상태
  status TEXT NOT NULL DEFAULT 'pending',     -- pending, completed, failed, cancelled, refunded

  -- 현금영수증
  cash_receipt_type TEXT,                     -- personal, business, none
  cash_receipt_number TEXT,                   -- 발급번호
  cash_receipt_issued_at TIMESTAMPTZ,

  -- 타임스탬프
  paid_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,

  -- 메타데이터
  metadata JSONB DEFAULT '{}',                -- PG사 raw response

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX idx_payment_transactions_student ON payment_transactions(student_id);
CREATE INDEX idx_payment_transactions_paid_at ON payment_transactions(paid_at);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
```

---

### 3️⃣ cash_receipts (현금영수증) - 신규

**목적**: 현금영수증 발급 내역 관리

```sql
CREATE TABLE cash_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 연결
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id),
  student_id UUID NOT NULL REFERENCES profiles(id),

  -- 발급 정보
  receipt_type TEXT NOT NULL,                 -- income (소득공제), expenditure (지출증빙)
  purpose TEXT NOT NULL,                      -- personal, business

  -- 수신자 정보
  recipient_number TEXT NOT NULL,             -- 휴대폰 번호 or 사업자번호
  recipient_name TEXT NOT NULL,

  -- 금액
  supply_amount INTEGER NOT NULL,             -- 공급가액
  tax_amount INTEGER DEFAULT 0,               -- 부가세
  total_amount INTEGER NOT NULL,

  -- 국세청 정보
  approval_number TEXT UNIQUE NOT NULL,       -- 국세청 승인번호
  issued_at TIMESTAMPTZ NOT NULL,

  -- 상태
  status TEXT NOT NULL DEFAULT 'issued',      -- issued, cancelled
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_cash_receipts_transaction ON cash_receipts(transaction_id);
CREATE INDEX idx_cash_receipts_student ON cash_receipts(student_id);
CREATE INDEX idx_cash_receipts_issued_at ON cash_receipts(issued_at);
```

---

### 4️⃣ business_settings (사업장 정보) - 신규

**목적**: 온리쌤 사업장 설정 (결제수단, 할부, PG 정보)

```sql
CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- 사업장 기본 정보
  business_name TEXT NOT NULL,                -- 온리쌤배구아카데미
  business_number TEXT UNIQUE,                -- 사업자등록번호
  owner_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,

  -- 결제 설정
  enabled_payment_methods JSONB DEFAULT '["card", "transfer"]',

  -- 카드 설정
  enabled_card_companies JSONB DEFAULT '[]',  -- ["신한", "국민", "삼성", ...]
  installment_options JSONB DEFAULT '[0, 2, 3, 6, 12]',  -- 할부 개월 옵션
  min_installment_amount INTEGER DEFAULT 50000,          -- 할부 최소 금액

  -- PG 설정
  pg_provider TEXT,                           -- 결제선생, 토스페이먼츠, etc
  pg_merchant_id TEXT,                        -- PG사 가맹점 ID
  pg_api_key_encrypted TEXT,                  -- 암호화된 API 키
  pg_test_mode BOOLEAN DEFAULT true,

  -- 수수료
  card_fee_rate DECIMAL(5,2) DEFAULT 0.8,     -- 카드 수수료율 (결제선생 평균 0.8%)
  cash_fee_rate DECIMAL(5,2) DEFAULT 0.0,

  -- 자동화 설정
  auto_send_invoice BOOLEAN DEFAULT false,    -- 자동 청구서 발송
  auto_send_day INTEGER DEFAULT 1,            -- 매월 X일 발송
  auto_reminder_enabled BOOLEAN DEFAULT true, -- 미납 자동 알림
  reminder_days_before_due INTEGER DEFAULT 3, -- 납부 기한 X일 전 알림

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 트리거
CREATE TRIGGER update_business_settings_updated_at
  BEFORE UPDATE ON business_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

### 5️⃣ payments 테이블 확장 (기존 테이블 수정)

**목적**: 기존 payments를 invoices와 연동

```sql
-- 기존 payments 테이블에 컬럼 추가
ALTER TABLE payments ADD COLUMN invoice_id UUID REFERENCES invoices(id);
ALTER TABLE payments ADD COLUMN latest_transaction_id UUID REFERENCES payment_transactions(id);

-- 인덱스 추가
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
```

---

## 📈 VIEW 설계 (매출 보고서)

### 1️⃣ daily_sales_report (일일 매출)

```sql
CREATE VIEW daily_sales_report AS
SELECT
  DATE(pt.paid_at) as sale_date,
  COUNT(DISTINCT pt.invoice_id) as invoice_count,
  COUNT(pt.id) as transaction_count,
  SUM(pt.amount) as total_sales,
  SUM(pt.fee) as total_fees,
  SUM(pt.net_amount) as net_sales,

  -- 결제수단별
  SUM(CASE WHEN pt.payment_method = 'card' THEN pt.amount ELSE 0 END) as card_sales,
  SUM(CASE WHEN pt.payment_method = 'cash' THEN pt.amount ELSE 0 END) as cash_sales,
  SUM(CASE WHEN pt.payment_method = 'transfer' THEN pt.amount ELSE 0 END) as transfer_sales,

  -- 카드사별 (TOP 5)
  SUM(CASE WHEN pt.card_company = '신한' THEN pt.amount ELSE 0 END) as shinhan_sales,
  SUM(CASE WHEN pt.card_company = '국민' THEN pt.amount ELSE 0 END) as kb_sales,
  SUM(CASE WHEN pt.card_company = '삼성' THEN pt.amount ELSE 0 END) as samsung_sales,
  SUM(CASE WHEN pt.card_company = '현대' THEN pt.amount ELSE 0 END) as hyundai_sales,
  SUM(CASE WHEN pt.card_company = '롯데' THEN pt.amount ELSE 0 END) as lotte_sales

FROM payment_transactions pt
WHERE pt.status = 'completed'
GROUP BY DATE(pt.paid_at)
ORDER BY sale_date DESC;
```

### 2️⃣ invoice_status_summary (청구서 현황)

```sql
CREATE VIEW invoice_status_summary AS
SELECT
  DATE_TRUNC('month', i.created_at) as month,

  -- 발송 현황
  COUNT(CASE WHEN i.status IN ('sent', 'paid', 'partial', 'overdue') THEN 1 END) as sent_count,
  SUM(CASE WHEN i.status IN ('sent', 'paid', 'partial', 'overdue') THEN i.final_amount ELSE 0 END) as sent_amount,

  -- 수납 현황
  COUNT(CASE WHEN i.status = 'paid' THEN 1 END) as paid_count,
  SUM(CASE WHEN i.status = 'paid' THEN i.paid_amount ELSE 0 END) as paid_amount,

  -- 미납 현황
  COUNT(CASE WHEN i.status IN ('sent', 'partial', 'overdue') THEN 1 END) as unpaid_count,
  SUM(CASE WHEN i.status IN ('sent', 'partial', 'overdue') THEN (i.final_amount - i.paid_amount) ELSE 0 END) as unpaid_amount,

  -- 수납률
  ROUND(
    100.0 * SUM(CASE WHEN i.status = 'paid' THEN i.paid_amount ELSE 0 END) /
    NULLIF(SUM(CASE WHEN i.status IN ('sent', 'paid', 'partial', 'overdue') THEN i.final_amount ELSE 0 END), 0),
    2
  ) as collection_rate

FROM invoices i
GROUP BY DATE_TRUNC('month', i.created_at)
ORDER BY month DESC;
```

---

## 🔄 결제선생 API 연동 설계

### API 엔드포인트 매핑

| 결제선생 기능 | AUTUS API | Supabase 테이블 |
|-------------|-----------|----------------|
| 청구서 생성 | `POST /invoices` | invoices |
| 청구서 발송 | `POST /invoices/{id}/send` | invoices.sent_at 업데이트 |
| 결제 처리 | `POST /payments/process` | payment_transactions 삽입 |
| 현금영수증 발급 | `POST /cash-receipts` | cash_receipts 삽입 |
| 매출 조회 | `GET /reports/sales` | daily_sales_report VIEW |
| 미납 목록 | `GET /invoices/unpaid` | invoices (status filter) |

### FastAPI 신규 엔드포인트

```python
# main.py에 추가

# 1. 청구서 생성
@app.post("/invoices")
async def create_invoice(
    student_id: str,
    items: List[Dict],
    due_date: str,
    scheduled_send_at: Optional[str] = None
):
    """
    청구서 생성 (결제선생 연동)

    items: [{"name": "2월 수업료", "amount": 200000, "qty": 1}]
    """
    pass

# 2. 청구서 발송
@app.post("/invoices/{invoice_id}/send")
async def send_invoice(invoice_id: str, channel: str = "kakao"):
    """
    카카오톡/SMS로 청구서 발송
    결제선생 API 호출 → Supabase invoices.sent_at 업데이트
    """
    pass

# 3. 결제 처리
@app.post("/payments/process")
async def process_payment(
    invoice_id: str,
    payment_method: str,
    amount: int,
    card_info: Optional[Dict] = None
):
    """
    결제 처리 (PG사 연동)
    → payment_transactions 삽입
    → invoices.paid_amount 업데이트
    → 카카오톡 영수증 발송
    """
    pass

# 4. 현금영수증 발급
@app.post("/cash-receipts")
async def issue_cash_receipt(
    transaction_id: str,
    receipt_type: str,
    recipient_number: str
):
    """
    국세청 현금영수증 발급
    → cash_receipts 삽입
    """
    pass

# 5. 매출 보고서
@app.get("/reports/sales/daily")
async def get_daily_sales(start_date: str, end_date: str):
    """
    일일 매출 보고서
    → daily_sales_report VIEW 조회
    """
    pass

# 6. 청구서 현황
@app.get("/invoices/status")
async def get_invoice_status(month: str):
    """
    월별 청구서 현황 (발송률, 수납률, 미납률)
    → invoice_status_summary VIEW 조회
    """
    pass

# 7. 미납 목록
@app.get("/invoices/unpaid")
async def get_unpaid_invoices(overdue_only: bool = False):
    """
    미납 청구서 목록
    → invoices WHERE status IN ('sent', 'partial', 'overdue')
    """
    pass
```

---

## 🔔 카카오톡 알림 통합

### 신규 알림 템플릿 (결제선생 연동)

| 템플릿명 | 트리거 | 내용 |
|---------|--------|------|
| **청구서 발송** | invoices.sent_at | "2월 수업료 청구서가 발송되었습니다. 금액: 200,000원, 납부기한: 2/28" |
| **결제 완료** | payment_transactions.paid_at | "결제가 완료되었습니다. 금액: 200,000원, 승인번호: 12345678" |
| **미납 알림** | cron (매일) | "납부기한이 3일 남았습니다. 미납금액: 200,000원" |
| **연체 알림** | cron (매일) | "납부기한이 7일 경과했습니다. 미납금액: 200,000원" |
| **현금영수증 발급** | cash_receipts.issued_at | "현금영수증이 발급되었습니다. 승인번호: CR-20260214-001" |

### Supabase Edge Function 자동화

```typescript
// supabase/functions/auto-invoice-reminder/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. 납부기한 3일 전 청구서 조회
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, profiles!student_id(*)')
    .eq('status', 'sent')
    .eq('due_date', threeDaysLater.toISOString().split('T')[0])

  // 2. 카카오톡 알림 발송
  for (const invoice of invoices || []) {
    await sendKakaoReminder(invoice)
  }

  return new Response('OK')
})
```

---

## 📊 이벤트 로깅 (ClickHouse)

### Event Ledger 스키마

```sql
-- ClickHouse events 테이블에 추가할 이벤트 타입

-- 1. 청구서 관련
invoice.created          -- 청구서 생성
invoice.sent             -- 청구서 발송
invoice.paid             -- 청구서 완납
invoice.partially_paid   -- 부분 납부
invoice.overdue          -- 연체 발생
invoice.cancelled        -- 청구서 취소
invoice.destroyed        -- 청구서 파기

-- 2. 결제 관련
payment.initiated        -- 결제 시작
payment.completed        -- 결제 완료
payment.failed           -- 결제 실패
payment.refunded         -- 결제 환불

-- 3. 현금영수증
cash_receipt.issued      -- 현금영수증 발급
cash_receipt.cancelled   -- 현금영수증 취소

-- 4. 알림
notification.invoice_sent         -- 청구서 발송 알림
notification.payment_reminder     -- 납부 독촉 알림
notification.payment_confirmed    -- 결제 완료 알림
notification.cash_receipt_issued  -- 현금영수증 발급 알림
```

### 이벤트 로깅 예시

```python
# FastAPI에서 이벤트 로깅

from clickhouse_driver import Client

clickhouse = Client(host='clickhouse.autus.io')

async def log_event(event_type: str, entity_id: str, metadata: dict):
    clickhouse.execute(
        'INSERT INTO events (event_type, entity_id, metadata, created_at) VALUES',
        [{
            'event_type': event_type,
            'entity_id': entity_id,
            'metadata': json.dumps(metadata),
            'created_at': datetime.now()
        }]
    )

# 사용 예시
await log_event(
    'invoice.sent',
    invoice_id,
    {
        'student_id': student_id,
        'amount': final_amount,
        'channel': 'kakao',
        'template_id': 'INV_001'
    }
)
```

---

## 🚀 마이그레이션 계획

### Phase 1: 스키마 확장 (Week 2)

```sql
-- 1. 신규 테이블 생성
CREATE TABLE invoices (...);
CREATE TABLE payment_transactions (...);
CREATE TABLE cash_receipts (...);
CREATE TABLE business_settings (...);

-- 2. 기존 테이블 확장
ALTER TABLE payments ADD COLUMN invoice_id UUID;
ALTER TABLE payments ADD COLUMN latest_transaction_id UUID;

-- 3. VIEW 생성
CREATE VIEW daily_sales_report AS ...;
CREATE VIEW invoice_status_summary AS ...;

-- 4. 초기 데이터
INSERT INTO business_settings (business_name, ...) VALUES (...);
```

### Phase 2: 기존 데이터 마이그레이션 (Week 2)

```python
# 기존 payments → invoices + payment_transactions 변환

async def migrate_existing_payments():
    # 1. 기존 payments 조회
    payments = supabase.table('payments').select('*').execute()

    for payment in payments.data:
        # 2. invoice 생성
        invoice = {
            'student_id': payment['student_id'],
            'items': [{'name': '수업료', 'amount': payment['total_amount']}],
            'total_amount': payment['total_amount'],
            'final_amount': payment['total_amount'],
            'status': 'paid' if payment['paid_amount'] >= payment['total_amount'] else 'partial',
            'paid_amount': payment['paid_amount']
        }

        invoice_result = supabase.table('invoices').insert(invoice).execute()
        invoice_id = invoice_result.data[0]['id']

        # 3. payment_transaction 생성 (수납이 있는 경우)
        if payment['paid_amount'] > 0:
            transaction = {
                'invoice_id': invoice_id,
                'student_id': payment['student_id'],
                'amount': payment['paid_amount'],
                'payment_method': payment.get('payment_method', 'unknown'),
                'status': 'completed',
                'paid_at': payment.get('payment_date', payment['created_at'])
            }

            supabase.table('payment_transactions').insert(transaction).execute()

        # 4. payments 테이블 업데이트
        supabase.table('payments').update({
            'invoice_id': invoice_id
        }).eq('id', payment['id']).execute()
```

### Phase 3: 결제선생 API 연동 (Week 3)

```python
# 결제선생 API 클라이언트

import requests

class PaymentTeacherAPI:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.paymentteacher.com/v1"

    def create_invoice(self, student_phone: str, amount: int, items: List[Dict]):
        """청구서 생성 & 발송"""
        response = requests.post(
            f"{self.base_url}/invoices",
            headers={'Authorization': f'Bearer {self.api_key}'},
            json={
                'recipient_phone': student_phone,
                'amount': amount,
                'items': items
            }
        )
        return response.json()

    def check_payment_status(self, invoice_id: str):
        """결제 상태 확인"""
        response = requests.get(
            f"{self.base_url}/invoices/{invoice_id}",
            headers={'Authorization': f'Bearer {self.api_key}'}
        )
        return response.json()
```

### Phase 4: 웹훅 수신 (Week 3)

```python
# 결제선생 웹훅 수신 엔드포인트

@app.post("/webhooks/payment-teacher")
async def payment_teacher_webhook(request: Request):
    """
    결제선생에서 결제 완료 시 호출
    → Supabase 동기화
    """
    payload = await request.json()

    # 1. 서명 검증
    if not verify_webhook_signature(payload):
        raise HTTPException(401, "Invalid signature")

    # 2. 이벤트 타입별 처리
    event_type = payload['event_type']

    if event_type == 'payment.completed':
        # 결제 완료
        invoice_id = payload['invoice_id']
        amount = payload['amount']

        # Supabase 업데이트
        supabase.table('invoices').update({
            'status': 'paid',
            'paid_amount': amount,
            'paid_at': datetime.now()
        }).eq('invoice_number', invoice_id).execute()

        # 트랜잭션 기록
        supabase.table('payment_transactions').insert({
            'invoice_id': invoice_id,
            'amount': amount,
            'payment_method': payload['payment_method'],
            'status': 'completed',
            'paid_at': payload['paid_at']
        }).execute()

        # 카카오톡 알림
        await send_payment_confirmation(invoice_id)

    return {'status': 'ok'}
```

---

## 💰 예상 비용

| 항목 | 월간 비용 | 비고 |
|------|----------|------|
| 결제선생 이용료 | **무료** | 가입비/월 이용료 없음 |
| 카드 결제 수수료 | **0.8%** | 월 1,000만원 매출 기준 **8만원** (일반 PG 3.3% 대비 75% 절감) |
| 현금영수증 발급 | 건당 20원 | 월 1,000건 = 2만원 |
| Supabase 스토리지 | 무료 | Free Tier 충분 |
| **합계** | **~10만원** | 매출의 1% 수준 (일반 PG 대비 30만원 절감) |

### 💡 결제선생 특장점
- **평균 수수료 0.8%**: 일반 PG사(2.2~3.3%)보다 60~75% 저렴
- **오프라인 방식**: 카드사 직접 정산 → 빠른 정산, 추가 수수료 없음
- **월 절감액**: 1,000만원 매출 기준 월 25만원 절감 (연 300만원)
- **가입비/월비 무료**: 고정비 부담 없음

---

## ✅ 다음 단계

### Week 2 목표
- [ ] Supabase 스키마 확장 (4개 테이블 추가)
- [ ] FastAPI 엔드포인트 7개 개발
- [ ] 기존 payments 데이터 마이그레이션
- [ ] 결제선생 API 연동 테스트

### Week 3 목표
- [ ] 웹훅 수신 개발
- [ ] 카카오톡 알림 5종 추가
- [ ] 자동 청구서 발송 Edge Function
- [ ] 관리자 대시보드 (매출 보고서)

---

**🎯 핵심**: 결제선생은 "결제 PG"가 아니라 "청구서 발송 + 수납 관리" 플랫폼
→ AUTUS는 Supabase에 모든 데이터 저장 + 결제선생은 발송 채널로 활용
