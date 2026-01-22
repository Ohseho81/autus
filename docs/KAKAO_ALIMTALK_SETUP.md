# 📱 카카오 알림톡 연동 가이드

> AUTUS에서 카카오 알림톡을 자동 발송하기 위한 설정 가이드

## 🎯 개요

AUTUS Agent가 카카오 알림톡을 자동 발송하려면 **비즈엠(BizMsg)** 또는 **알리고 알림톡**을 사용해야 합니다.

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  AUTUS Brain    │ ───→ │   n8n Webhook   │ ───→ │   비즈엠 API    │
│  (액션 생성)     │      │   (라우팅)       │      │   (알림톡 발송)  │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## 📋 사전 준비

### 1. 카카오 비즈니스 채널 개설
1. [카카오 비즈니스](https://business.kakao.com) 접속
2. 비즈니스 채널 생성
3. 프로필 키 발급받기

### 2. 알림톡 발송 대행사 선택

| 대행사 | 가격 | 특징 | 추천 |
|--------|------|------|------|
| **비즈엠** | 8원/건 | 카카오 공식 파트너, 안정적 | ⭐ 추천 |
| **알리고** | 8-9원/건 | SMS 연동 쉬움 | 이미 알리고 사용 시 |
| **센드버드** | 10원/건 | 글로벌 서비스 연동 | 해외 확장 시 |

---

## 🔧 비즈엠 설정 (추천)

### Step 1: 비즈엠 가입

1. [비즈엠](https://www.bizmsg.kr) 접속
2. 회원가입 및 사업자 인증
3. 카카오 비즈니스 채널 연동

### Step 2: API 키 발급

```
비즈엠 콘솔 → 설정 → API 연동 → API Key 발급
```

발급받을 정보:
- **User ID**: `autus_academy`
- **Profile Key**: `@autus`
- **API Key**: `xxxxxxxxxxxxxxxx`

### Step 3: 알림톡 템플릿 등록

카카오 심사가 필요합니다 (1-3일 소요)

#### 템플릿 예시: 미납 안내

```
템플릿 ID: AUTUS_OVERDUE_001
템플릿 내용:
━━━━━━━━━━━━━━━━━━━━
[#{학원명}] 수강료 안내

안녕하세요, #{학생명} 학부모님.

#{월}월 수강료 #{금액}원이 
아직 납부되지 않았습니다.

납부 기한: #{기한}
계좌: #{계좌}

문의: #{연락처}
━━━━━━━━━━━━━━━━━━━━
```

#### 템플릿 예시: 상담 예약 안내

```
템플릿 ID: AUTUS_CONSULT_001
템플릿 내용:
━━━━━━━━━━━━━━━━━━━━
[#{학원명}] 상담 예약 확인

#{학부모명}님, 상담이 예약되었습니다.

📅 일시: #{상담일시}
👩‍🏫 상담 선생님: #{선생님}
📍 장소: #{장소}

※ 일정 변경은 하루 전 연락 부탁드립니다.
━━━━━━━━━━━━━━━━━━━━
```

### Step 4: n8n 환경변수 설정

n8n 대시보드 → Settings → Variables에 추가:

```env
BIZM_USER_ID=autus_academy
BIZM_PROFILE_KEY=@autus
BIZM_API_KEY=xxxxxxxxxxxxxxxxxx
```

---

## 🔧 알리고 알림톡 설정 (대안)

이미 알리고 SMS를 사용 중이라면 알림톡도 추가 가능합니다.

### Step 1: 알리고 알림톡 신청

1. [알리고](https://smartsms.aligo.in) 로그인
2. 알림톡 서비스 신청
3. 카카오 비즈니스 채널 연동

### Step 2: 환경변수 설정

```env
ALIGO_API_KEY=your_aligo_key
ALIGO_USER_ID=your_user_id
ALIGO_SENDER=0212345678
ALIGO_ALIMTALK_TOKEN=kakao_token_here
```

---

## 🧪 테스트 방법

### 1. n8n 직접 테스트

n8n 워크플로우에서 "Test Workflow" 실행:

```json
{
  "action": "send_kakao",
  "data": {
    "target": "01012345678",
    "template_id": "AUTUS_OVERDUE_001",
    "message": "테스트 메시지입니다."
  },
  "execution_id": "test-001"
}
```

### 2. AUTUS API 통해 테스트

```bash
curl -X POST "https://vercel-api-ohsehos-projects.vercel.app/api/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "send_kakao",
    "payload": {
      "target": "01012345678",
      "template_id": "AUTUS_OVERDUE_001",
      "message": "테스트 메시지"
    },
    "approved_by": "test-user"
  }'
```

### 3. Agent Dashboard에서 테스트

1. http://localhost:8080/agent-dashboard.html 접속
2. 역할: 원장, 고민: 미납 관리 선택
3. [카드 생성하기] 클릭
4. 카카오 알림톡 버튼 클릭

---

## 💰 비용 안내

| 서비스 | 단가 | 월 1000건 예상 |
|--------|------|---------------|
| 알림톡 | 8원 | 8,000원 |
| SMS | 15원 | 15,000원 |
| LMS | 30원 | 30,000원 |

**Tip**: 알림톡이 SMS보다 저렴하고 도달률도 높습니다!

---

## 🚨 주의사항

1. **템플릿 심사**: 카카오 심사 1-3일 소요
2. **야간 발송 제한**: 20:50 ~ 08:00 발송 불가
3. **수신 거부 관리**: 080 수신거부 번호 필수
4. **개인정보**: 전화번호는 암호화 저장 권장

---

## 📊 AUTUS V 공식 적용

알림톡 자동화로 절감되는 비용(T):

```
V = (M - T) × (1 + s)^t

T 감소 요인:
- 수동 문자 발송 시간: 10분 → 0분
- 미납 추심 인건비: 월 50만원 → 0원
- 상담 일정 확인 전화: 월 100건 × 5분 = 500분 절감

s 증가 요인:
- 학부모 만족도 증가 → s +5%
- 정시 알림으로 미납률 감소 → M +10%
```

---

## 🔗 참고 링크

- [비즈엠 API 문서](https://alimtalk-api.bizmsg.kr/v2/doc)
- [알리고 API 문서](https://smartsms.aligo.in/admin/api/info.html)
- [카카오 비즈니스](https://business.kakao.com)
- [AUTUS n8n 워크플로우](/n8n/autus_agent_executor.json)

---

*"자동화된 소통은 신뢰를 쌓는다" - AUTUS*
