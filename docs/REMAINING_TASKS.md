# 📋 AUTUS × 크라톤 남은 작업 상세

> 작성일: 2026-01-28
> 현재 진행률: 68%

---

## 🔴 우선순위 1: Supabase 실제 데이터 연동

### 현재 상태
- DB 스키마: ✅ 준비됨 (11개 SQL 파일)
- Seed 데이터: ✅ 준비됨
- API: ⚠️ Mock 데이터 반환 중

### 필요한 작업

#### 1.1 Supabase 테이블 생성
```bash
# 실행할 SQL 파일 (순서대로)
backend/database/autus_v2_views_schema.sql  # 15+ 테이블
backend/database/autus_v2_seed_data.sql     # KRATON 샘플 데이터
```

| 테이블 | 용도 | 상태 |
|--------|------|------|
| `organizations` | 조직 정보 | 🔄 생성 필요 |
| `users` | 사용자 | 🔄 생성 필요 |
| `customers` | 고객 (학생) | 🔄 생성 필요 |
| `customer_temperatures` | 온도 데이터 | 🔄 생성 필요 |
| `tsel_factors` | TSEL 요인 | 🔄 생성 필요 |
| `voices` | 고객 소리 | 🔄 생성 필요 |
| `alerts` | 알림 | 🔄 생성 필요 |
| `actions` | 할일 | 🔄 생성 필요 |
| `automation_logs` | 자동화 로그 | 🔄 생성 필요 |
| `approval_queue` | 승인 대기 | 🔄 생성 필요 |

#### 1.2 환경변수 설정
```bash
# vercel-api/.env.local
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

#### 1.3 API Mock → 실제 데이터 전환
```
수정할 파일:
- vercel-api/app/api/v1/cockpit/route.ts
- vercel-api/app/api/v1/radar/route.ts
- vercel-api/app/api/v1/radar/monitor/route.ts
- vercel-api/app/api/v1/automation/route.ts
```

### 예상 소요: 2-3시간

---

## 🟠 우선순위 2: n8n 워크플로우 활성화

### 현재 상태
- 워크플로우 JSON: ✅ 20개 준비됨
- n8n 서버: ⏸️ 미실행

### 준비된 워크플로우 (20개)

| 워크플로우 | 파일 | 용도 | 우선순위 |
|------------|------|------|----------|
| **daily_content_assistant** | daily_content_assistant.json | 일일 브리핑 자동 생성 | 🔴 높음 |
| **weekly_v_report** | weekly_v_report.json | 주간 V 리포트 | 🔴 높음 |
| **autus_agent_executor** | autus_agent_executor.json | Moltbot 연동 실행 | 🔴 높음 |
| **community_monitoring** | community_monitoring.json | 여론 모니터링 | 🟠 중간 |
| **classting_sync** | classting_sync.json | 클래스팅 동기화 | 🟠 중간 |
| **erp_sync_workflow** | erp_sync_workflow.json | ERP 데이터 동기화 | 🟠 중간 |
| **toss_payment_webhook** | toss_payment_webhook.json | 토스 결제 웹훅 | 🟡 낮음 |
| **stripe_webhook** | stripe_webhook.json | Stripe 결제 웹훅 | 🟡 낮음 |
| 기타 12개 | ... | ... | 🟡 낮음 |

### 필요한 작업

#### 2.1 n8n 서버 시작
```bash
# Docker로 실행
docker run -d --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# 또는 npm으로 실행
npm install -g n8n
n8n start
```

#### 2.2 핵심 워크플로우 import
```
1. http://localhost:5678 접속
2. Settings > Import from File
3. n8n/daily_content_assistant.json 선택
4. Credentials 설정 (Supabase, Telegram)
5. Active 토글 ON
```

#### 2.3 AUTUS API 연동
```json
// 워크플로우에서 호출할 엔드포인트
POST /api/v1/automation
{
  "role": "manager",
  "source": "n8n",
  "action_type": "daily_report",
  "is_automated": true
}
```

### 예상 소요: 1-2시간

---

## 🟠 우선순위 3: 학원 파일럿 (KRATON 영어학원)

### 현재 상태
- 기본 조직 ID: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`
- Seed 데이터: ✅ 준비됨
- 실제 데이터: ❌ 미연동

### 필요한 작업

#### 3.1 실제 학원 데이터 연동
```
필요 데이터:
- 학생 목록 (이름, 학년, 반)
- 출결 기록
- 상담 기록
- 학부모 정보
```

#### 3.2 담당자 배정
```
역할별 계정:
- Owner: 원장님
- Manager: 부원장/실장
- Teacher: 담임 선생님
- Parent: 학부모 (앱 사용)
```

#### 3.3 초기 온도 측정
```sql
-- 각 학생별 초기 온도 계산
INSERT INTO customer_temperatures (customer_id, temperature, zone, ...)
SELECT id, 
  CASE 
    WHEN 출석률 > 90 AND 성적변화 > 0 THEN 75
    WHEN 출석률 > 80 THEN 60
    ELSE 45
  END as temperature,
  ...
FROM customers WHERE org_id = '...';
```

### 예상 소요: 3-4시간 (데이터 수집 포함)

---

## 🟠 우선순위 4: 카카오톡 알림 연동

### 현재 상태
- Telegram: ✅ 연동 완료
- 카카오톡: ❌ 미연동

### 필요한 작업

#### 4.1 카카오 비즈니스 설정
```
1. https://business.kakao.com 가입
2. 채널 생성 (KRATON 영어학원)
3. 알림톡 템플릿 등록
```

#### 4.2 알림톡 템플릿 예시
```
[위험 알림]
안녕하세요, #{학원명}입니다.

#{학생명} 학생의 최근 출결/학습 상태가 
평소와 다르게 확인되어 안내드립니다.

📊 현재 상태: #{온도}° (#{상태})
📅 최근 결석: #{결석일수}일

담당 선생님과 상담을 원하시면 
아래 링크를 눌러주세요.
#{상담예약링크}
```

#### 4.3 API 연동
```typescript
// vercel-api/lib/kakao.ts
export async function sendKakaoAlert(params: {
  phone: string;
  templateCode: string;
  variables: Record<string, string>;
}) {
  // 카카오 알림톡 API 호출
}
```

### 예상 소요: 2-3시간

---

## 🟡 우선순위 5: 추가 기능

### 5.1 학부모 앱 UI
```
- 자녀 V-Index 확인
- 출결/성적 조회
- 상담 예약
- 알림 수신
```

### 5.2 학생 앱 UI
```
- 본인 V-Index 확인
- 출석 체크
- 과제 확인
- 배지/리워드
```

### 5.3 Voice 감지 자동화
```
- 카카오톡 채팅 분석
- 불만 키워드 감지
- 자동 알림 생성
```

### 5.4 일일 리포트 자동 생성
```
- 매일 오전 8시 자동 실행
- 전날 요약 + 오늘 할일
- Telegram/이메일 발송
```

---

## 📊 작업 요약

| 작업 | 우선순위 | 예상 시간 | 의존성 |
|------|----------|----------|--------|
| Supabase 연동 | 🔴 1 | 2-3시간 | 없음 |
| n8n 활성화 | 🟠 2 | 1-2시간 | Supabase |
| 학원 파일럿 | 🟠 3 | 3-4시간 | Supabase, n8n |
| 카카오톡 연동 | 🟠 4 | 2-3시간 | 없음 |
| 학부모/학생 앱 | 🟡 5 | 1-2주 | 전체 |
| Voice 감지 | 🟡 5 | 3-4시간 | Supabase |
| 일일 리포트 | 🟡 5 | 2시간 | n8n |

---

## 🚀 즉시 실행 가능한 명령어

### Supabase 스키마 적용
```bash
# Supabase SQL Editor에서 실행
cat backend/database/autus_v2_views_schema.sql | pbcopy
# Supabase Dashboard > SQL Editor > 붙여넣기 > Run
```

### n8n 시작
```bash
docker run -d --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n n8nio/n8n
open http://localhost:5678
```

### 환경변수 확인
```bash
cat ~/.moltbot/moltbot.json | jq '.env'
```

---

## 다음 추천 액션

**지금 바로 할 수 있는 것:**

1. **Supabase 테이블 생성** (5분)
   - Supabase Dashboard 열기
   - SQL Editor에서 스키마 실행

2. **n8n 서버 시작** (2분)
   - Docker 명령어 실행
   - 일일 브리핑 워크플로우 import

어떤 작업부터 진행할까요?
