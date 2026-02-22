# 카카오톡 알림톡 완전 설정 가이드

## 📋 개요
ATB 앱에서 카카오톡 알림톡으로 학부모에게 자동 메시지를 보내기 위한 설정 가이드

---

## 🎯 알림톡이란?

카카오톡 알림톡은:
- ✅ **앱 설치 불필요** - 일반 카카오톡으로 수신
- ✅ **높은 도달률** - 문자보다 3배 이상
- ✅ **저렴한 비용** - 약 8~15원/건
- ✅ **템플릿 기반** - 사전 승인된 메시지만 발송

---

## 📊 ATB 알림톡 템플릿 (구현 완료 ✅)

코드에 이미 구현된 5가지 템플릿:

| 템플릿 ID | 용도 | 발송 시점 |
|----------|------|----------|
| `ATB_ATTENDANCE` | 출석 확인 | 수업 체크인 시 |
| `ATB_LESSON_REMIND` | 수업 리마인더 | 수업 1시간 전 |
| `ATB_PAYMENT_DUE` | 결제 독촉 | 미납 3일 후 |
| `ATB_FEEDBACK` | 피드백 요청 | 수업 종료 후 |
| `ATB_WELCOME` | 환영 메시지 | 신규 등록 시 |

---

## 🔧 설정 단계 (총 4단계)

### 1️⃣ 카카오 개발자 콘솔 설정

#### A. 카카오 개발자 계정 생성
```
🌐 https://developers.kakao.com
1. [로그인] 또는 [회원가입]
2. 사업자로 가입 (사업자등록증 필요)
```

#### B. 앱 생성
```
1. [내 애플리케이션] → [애플리케이션 추가하기]
2. 앱 이름: "ATB" 입력
3. 사업자명: "올댓바스켓" 입력
4. [저장]
```

#### C. 카카오톡 채널 연결
```
1. 생성한 앱 클릭
2. 좌측 [카카오 로그인] → [활성화 설정] ON
3. 좌측 [카카오톡 채널] → [채널 추가]
4. 카카오톡 채널 생성 (https://center-pf.kakao.com)
   - 채널명: "ATB" 또는 "올리쌤"
   - 검색용 ID: @atb 또는 유사
```

#### D. API 키 확인
```
1. 좌측 [앱 키]
2. 다음 키들을 복사:
   ✅ REST API 키
   ✅ JavaScript 키
   ✅ Admin 키 (선택)
```

---

### 2️⃣ 카카오톡 비즈니스 계정 설정

#### A. 카카오톡 비즈니스 계정 생성
```
🌐 https://business.kakao.com
1. [로그인] (카카오 계정 사용)
2. [새 비즈니스 계정 만들기]
3. 사업자 정보 입력
   - 사업자등록번호
   - 대표자명
   - 사업장 주소
```

#### B. 발신 프로필 등록
```
1. [비즈메시지] → [발신 프로필 관리]
2. [새 프로필 등록]
3. 프로필명: "ATB"
4. 카카오톡 채널 연결 (위에서 만든 채널)
5. 심사 신청 (1~2영업일 소요)
```

#### C. Sender Key 확인
```
1. 발신 프로필 승인 후
2. [발신 프로필 관리] → 프로필 클릭
3. "Sender Key" 복사 (예: @atb12345)
```

---

### 3️⃣ Solapi (문자 발송 서비스) 설정

카카오 알림톡은 직접 발송할 수 없고, **중계 서비스**를 통해야 합니다.

#### 옵션 1: Solapi (추천)
```
🌐 https://solapi.com
1. [회원가입]
2. [콘솔] → [API 키 관리]
3. [새 API 키 생성]
   - API Key 복사
   - API Secret 복사
4. [결제] → [충전] (10,000원 이상 권장)
```

#### 옵션 2: BizMsg
```
🌐 https://www.bizmsg.kr
1. [회원가입]
2. [API 관리] → [API Key 발급]
3. BizMsg ID, BizMsg Key 복사
```

---

### 4️⃣ 알림톡 템플릿 등록

#### A. 템플릿 등록 (Solapi 기준)
```
1. Solapi 콘솔 → [알림톡] → [템플릿 관리]
2. [새 템플릿 등록]
3. 아래 5개 템플릿 등록:
```

**템플릿 1: 출석 확인 (ATB_ATTENDANCE)**
```
안녕하세요, #{student_name} 학부모님!

오늘 #{date} #{time} 수업에 출석했습니다. ✅

#{coach_name} 코치님과 함께한 #{duration}분 수업이었습니다.

좋은 하루 되세요!
- ATB 팀
```

**템플릿 2: 수업 리마인더 (ATB_LESSON_REMIND)**
```
#{student_name} 학부모님,

1시간 후 #{time}에 #{lesson_name} 수업이 있습니다! 🏀

📍 장소: #{location}
👨‍🏫 코치: #{coach_name}

잊지 마세요!
- ATB 팀
```

**템플릿 3: 결제 독촉 (ATB_PAYMENT_DUE)**
```
#{student_name} 학부모님,

#{month}월 수업료 #{amount}원이 미납 상태입니다.

💳 납부 기한: #{due_date}까지
📱 결제하기: #{payment_link}

문의사항이 있으시면 언제든 연락주세요.
- ATB 팀
```

**템플릿 4: 피드백 요청 (ATB_FEEDBACK)**
```
#{student_name} 학부모님,

오늘 수업은 어떠셨나요? 💬

#{coach_name} 코치님의 피드백:
"#{feedback_message}"

다음 목표: #{next_goal}

응원합니다! 🎉
- ATB 팀
```

**템플릿 5: 환영 메시지 (ATB_WELCOME)**
```
#{student_name} 학부모님, 환영합니다! 🎊

ATB 가족이 되신 것을 진심으로 축하드립니다.

📱 앱 다운로드: #{app_link}
👨‍🏫 담당 코치: #{coach_name}
📅 첫 수업: #{first_lesson_date}

함께 성장해요!
- ATB 팀
```

#### B. 템플릿 심사
```
1. 각 템플릿 등록 후 [심사 요청]
2. 심사 기간: 1~2영업일
3. 승인 시 "템플릿 코드" 발급
```

---

## 🔑 환경 변수 설정

### A. .env 파일 수정

`/온리쌤/.env` 파일에 다음 추가:

```bash
# ═══════════════════════════════════════════════════════════════
# 카카오톡 알림톡 설정
# ═══════════════════════════════════════════════════════════════

# 카카오 개발자 콘솔 (1단계에서 발급)
EXPO_PUBLIC_KAKAO_API_KEY=your_rest_api_key_here
EXPO_PUBLIC_KAKAO_SENDER_KEY=@atb12345

# 카카오톡 오픈빌더 (챗봇용, 선택사항)
KAKAO_OPENBUILDER_BOT_ID=your_bot_id
KAKAO_OPENBUILDER_API_KEY=your_openbuilder_key

# Solapi 설정 (3단계에서 발급)
EXPO_PUBLIC_SOLAPI_API_KEY=your_solapi_api_key
EXPO_PUBLIC_SOLAPI_API_SECRET=your_solapi_secret
EXPO_PUBLIC_SOLAPI_PFID=@atb12345

# 알림톡 템플릿 코드 (4단계 승인 후)
KAKAO_BLOCK_ATTEND=ATB_ATTENDANCE
KAKAO_BLOCK_ABSENT=ATB_LESSON_REMIND
KAKAO_BLOCK_MAKEUP_SELECT=ATB_PAYMENT_DUE
KAKAO_BLOCK_MAKEUP_CONFIRM=ATB_FEEDBACK

# Slack 알림 (선택사항)
EXPO_PUBLIC_SLACK_WEBHOOK_URL=your_slack_webhook
EXPO_PUBLIC_SLACK_BOT_TOKEN=your_slack_bot_token
```

### B. Vercel API 환경 변수

Vercel 대시보드에서도 동일한 환경 변수 설정:
```
🌐 https://vercel.com/autus/vercel-api
→ [Settings] → [Environment Variables]
→ 위 변수들 추가
→ [Redeploy] 클릭
```

---

## 🧪 테스트 방법

### 1️⃣ 코드 레벨 테스트

```typescript
// ATB 앱에서 테스트
import { sendAlimtalk } from '@/services/kakaoAlimtalk';

const result = await sendAlimtalk({
  templateCode: 'ATB_WELCOME',
  to: '01012345678', // 본인 번호로 테스트
  variables: {
    student_name: '홍길동',
    coach_name: '김코치',
    app_link: 'https://atb.app',
    first_lesson_date: '2026-02-20',
  },
});

console.log(result); // { success: true, messageId: '...' }
```

### 2️⃣ 실제 시나리오 테스트

```
1. ATB 앱 → Admin 로그인
2. 학생 등록 → 환영 메시지 자동 발송 확인
3. 출석 체크 → 출석 확인 메시지 확인
4. 결제 미납 3일 경과 → 독촉 메시지 확인
```

---

## 💰 비용 정보

| 항목 | 비용 | 비고 |
|------|------|------|
| 카카오 개발자 계정 | 무료 | - |
| 카카오톡 채널 개설 | 무료 | - |
| 카카오톡 비즈니스 계정 | 무료 | - |
| Solapi 알림톡 발송 | 8~15원/건 | 사전 충전 |
| 템플릿 심사 | 무료 | 1~2영업일 |

**월 예상 비용 (학생 50명 기준)**:
- 출석 확인: 50명 × 20일 × 10원 = 10,000원/월
- 수업 리마인더: 50명 × 20일 × 10원 = 10,000원/월
- 총: 약 20,000원/월

---

## ⚠️ 주의사항

### 1. 템플릿 규칙
- ❌ 광고성 문구 금지
- ❌ 과장 표현 금지
- ✅ 서비스 정보만 포함
- ✅ 변수는 `#{variable_name}` 형식

### 2. 발송 제한
- 수신자가 채널 차단 시 발송 불가
- 1일 최대 1,000건 (초과 시 사전 승인 필요)
- 광고성 메시지는 오후 8시~오전 8시 발송 금지

### 3. 개인정보 보호
- 전화번호는 암호화하여 저장
- 발송 로그는 6개월 후 자동 삭제
- 수신 거부 요청 시 즉시 처리

---

## 🔄 연동 플로우

```
ATB 앱 (출석 체크)
    ↓
Vercel API (webhook)
    ↓
kakaoAlimtalk.ts (템플릿 선택)
    ↓
Solapi API (중계)
    ↓
카카오톡 서버
    ↓
학부모 카카오톡 수신 ✅
```

---

## 📞 문의처

- **카카오 개발자 지원**: https://devtalk.kakao.com
- **Solapi 고객센터**: 1661-5598
- **ATB 팀**: stiger0720@gmail.com

---

*작성일: 2026-02-13*
*작성자: Claude (AUTUS Project)*
