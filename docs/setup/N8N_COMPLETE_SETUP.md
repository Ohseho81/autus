# n8n 완전 설정 가이드 (AUTUS)

## 🎯 목표
n8n을 통해 AUTUS의 자동화 파이프라인 완성:
- 네이버 API 연동 (경쟁사/뉴스 자동 수집)
- 카카오 알림톡 연동 (위험 감지 알림)
- SMS 연동 (알리고)

---

## 📋 사전 준비물

| 항목 | 값 | 발급처 |
|------|-----|--------|
| NAVER_CLIENT_ID | `uQrQOz78KOPuzKZhX4nS` | ✅ 발급 완료 |
| NAVER_CLIENT_SECRET | `wYsuS7vvtw` | ✅ 발급 완료 |
| ALIGO_API_KEY | (직접 발급) | https://smartsms.aligo.in |
| ALIGO_USER_ID | (직접 발급) | https://smartsms.aligo.in |
| ALIGO_SENDER | 발신번호 | 알리고 등록 |
| BIZM_PROFILE_KEY | (직접 발급) | https://www.bizmsg.kr |

---

## 🔧 Step 1: n8n 환경변수 설정

### n8n Cloud 사용 시
1. https://toncaw-watkic-6cozsu.app.n8n.cloud 접속
2. Settings → Variables 이동
3. 아래 변수 추가:

```
NAVER_CLIENT_ID = uQrQOz78KOPuzKZhX4nS
NAVER_CLIENT_SECRET = wYsuS7vvtw
ALIGO_API_KEY = (발급 후 입력)
ALIGO_USER_ID = (발급 후 입력)
ALIGO_SENDER = (등록된 발신번호)
BIZM_PROFILE_KEY = (발급 후 입력)
```

### Self-hosted n8n 사용 시
`.env` 파일에 추가:
```env
NAVER_CLIENT_ID=uQrQOz78KOPuzKZhX4nS
NAVER_CLIENT_SECRET=wYsuS7vvtw
ALIGO_API_KEY=your_aligo_key
ALIGO_USER_ID=your_aligo_id
ALIGO_SENDER=01012345678
BIZM_PROFILE_KEY=your_bizm_key
```

---

## 🔧 Step 2: 워크플로우 Import

### 워크플로우 파일 위치
```
autus/n8n/
├── autus_agent_executor.json    # 에이전트 실행
├── geo_intelligence.json        # 지리 정보 수집
├── erp_to_autus_engine.json     # ERP 연동
├── weekly_v_report.json         # 주간 보고서
└── consensus_auto_standard.json # 자동 합의
```

### Import 방법
1. n8n 대시보드 → Workflows
2. Import from File 클릭
3. 각 JSON 파일 업로드
4. Activate 토글 ON

---

## 🔧 Step 3: Webhook URL 확인

워크플로우 Import 후 Webhook 노드의 URL 확인:

### autus_agent_executor
```
https://toncaw-watkic-6cozsu.app.n8n.cloud/webhook/autus-action
```

### geo_intelligence
```
https://toncaw-watkic-6cozsu.app.n8n.cloud/webhook/geo-collect
```

이 URL들을 Vercel 환경변수에 설정:
```bash
cd vercel-api
npx vercel env add N8N_WEBHOOK_URL production
# 값: https://toncaw-watkic-6cozsu.app.n8n.cloud/webhook/autus-action
```

---

## 🔧 Step 4: 카카오 알림톡 설정 (Bizm)

### 4.1 비즈엠 가입 및 채널 연동
1. https://www.bizmsg.kr 회원가입
2. 발신프로필 등록 (기존 카카오톡 채널 연동)
3. API Key 발급

### 4.2 템플릿 등록 (카카오 승인 필요)

**템플릿 1: 위험 감지 알림**
```
템플릿 코드: AUTUS_RISK_001
제목: AUTUS 위험 감지
내용:
⚠️ [AUTUS 위험 감지]

#{이름}님 관련 이상 신호가 감지되었습니다.

• 긴급도: #{긴급도}%
• 상태: #{상태}
• 감지 시각: #{시각}

즉시 확인이 필요합니다.

[대시보드 확인하기]
```

**템플릿 2: 수강료 안내**
```
템플릿 코드: AUTUS_PAY_001
제목: 수강료 안내
내용:
💳 [#{학원명}] 수강료 안내

#{이름}님, 안녕하세요.

#{월}월 수강료 안내드립니다.
• 금액: #{금액}원
• 납부기한: #{기한}

편리한 납부 부탁드립니다.

[납부하기]
```

### 4.3 n8n HTTP Request 노드 설정

```json
{
  "method": "POST",
  "url": "https://alimtalk-api.bizmsg.kr/v2/sender/send",
  "headers": {
    "Content-Type": "application/json",
    "userId": "={{$env.BIZM_USER_ID}}"
  },
  "body": {
    "senderKey": "={{$env.BIZM_PROFILE_KEY}}",
    "templateCode": "AUTUS_RISK_001",
    "receiver": "={{$json.body.data.target}}",
    "message": "위험 감지 알림입니다.",
    "variables": {
      "이름": "={{$json.body.data.name}}",
      "긴급도": "={{$json.body.data.urgency}}",
      "상태": "={{$json.body.data.status}}",
      "시각": "={{$now.format('YYYY-MM-DD HH:mm')}}"
    }
  }
}
```

---

## 🔧 Step 5: SMS 설정 (알리고)

### 5.1 알리고 가입
1. https://smartsms.aligo.in 회원가입
2. 발신번호 등록 (사업자/통신서비스 이용증명원 필요)
3. API Key 발급

### 5.2 n8n HTTP Request 노드 설정

```json
{
  "method": "POST",
  "url": "https://apis.aligo.in/send/",
  "headers": {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  "body": {
    "key": "={{$env.ALIGO_API_KEY}}",
    "userid": "={{$env.ALIGO_USER_ID}}",
    "sender": "={{$env.ALIGO_SENDER}}",
    "receiver": "={{$json.body.data.target}}",
    "msg": "={{$json.body.data.message}}",
    "testmode_yn": "N"
  }
}
```

---

## 🧪 테스트

### 1. Webhook 테스트
```bash
curl -X POST https://toncaw-watkic-6cozsu.app.n8n.cloud/webhook/autus-action \
  -H "Content-Type: application/json" \
  -d '{
    "origin": "AUTUS_TEST",
    "action": "send_sms",
    "data": {
      "target": "01012345678",
      "message": "AUTUS 테스트 메시지입니다."
    }
  }'
```

### 2. API 테스트
```bash
# 알림 발송 테스트
curl -X POST https://vercel-api-xxx.vercel.app/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "sms",
    "template": "risk_detected",
    "recipients": [
      {"phone": "01012345678", "name": "테스트"}
    ],
    "variables": {
      "urgency": "85",
      "link": "https://autus.ai/dashboard"
    }
  }'
```

---

## 📊 자동화 스케줄

| 워크플로우 | 실행 주기 | 설명 |
|-----------|----------|------|
| geo_intelligence | 매 6시간 | 경쟁사/뉴스 수집 |
| erp_to_autus_engine | 매일 06:00 | ERP 데이터 동기화 |
| weekly_v_report | 매주 월요일 09:00 | V 보고서 생성 |
| risk_alert | 실시간 | 위험 감지 시 즉시 알림 |

---

## ✅ 체크리스트

- [ ] n8n 환경변수 설정 완료
- [ ] 워크플로우 Import 완료
- [ ] Webhook 테스트 성공
- [ ] 알리고 발신번호 등록
- [ ] 비즈엠 템플릿 승인
- [ ] 카카오 알림톡 테스트 성공
- [ ] 자동화 스케줄 활성화

---

## 🆘 문제 해결

### "Invalid API Key" 오류
→ 환경변수가 올바르게 설정되었는지 확인

### "발신번호 미등록" 오류
→ 알리고에서 발신번호 등록 및 승인 필요

### "템플릿 미승인" 오류
→ 카카오 비즈니스에서 템플릿 승인 대기 (1-3일 소요)

### n8n Webhook 응답 없음
→ 워크플로우가 Active 상태인지 확인

---

*문서 작성일: 2026-01-20*
*AUTUS v2.0*
