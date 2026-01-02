# 🔗 AUTUS Physics Map 외부 서비스 연동 가이드

> 로그인만 해두시면 자동 연동됩니다!

---

## 📋 목차

1. [Google Sheets](#1-google-sheets)
2. [Make (Integromat)](#2-make-integromat)
3. [OpenAI GPT](#3-openai-gpt)
4. [카카오톡 알림톡](#4-카카오톡-알림톡)
5. [통합 사용법](#5-통합-사용법)

---

## 1. Google Sheets

### 용도
- Physics Map 데이터 자동 저장
- 엑셀 대체 데이터 입력
- 팀 공유 대시보드

### 설정 방법 (5분)

```
1️⃣ Google Cloud Console 접속
   https://console.cloud.google.com

2️⃣ 프로젝트 생성 또는 선택

3️⃣ APIs & Services → Library
   "Google Sheets API" 검색 → 사용 설정

4️⃣ APIs & Services → Credentials
   Create Credentials → Service Account
   
5️⃣ 서비스 계정 생성 후
   Keys → Add Key → Create new key → JSON
   
6️⃣ 다운로드한 JSON을 credentials.json으로 저장
   /Users/oseho/Desktop/autus/integrations/credentials.json

7️⃣ Google Sheets 열기
   서비스 계정 이메일(xxxxx@xxxxx.iam.gserviceaccount.com)에
   편집자 권한 공유
```

### 테스트

```python
from integrations import GoogleSheetsClient

sheets = GoogleSheetsClient("credentials.json")
sheets.create_physics_template("your-spreadsheet-id")
```

---

## 2. Make (Integromat)

### 용도
- 고급 자동화 워크플로우
- 5000+ 앱 연동
- 조건부 분기 처리

### 설정 방법 (10분)

```
1️⃣ Make.com 접속 및 회원가입
   https://make.com

2️⃣ Create a new scenario

3️⃣ 첫 번째 모듈 추가
   Webhooks → Custom webhook → Add
   
4️⃣ Webhook 이름 입력 → Save
   생성된 URL 복사 (https://hook.us1.make.com/xxxxx)

5️⃣ Router 추가 (선택)
   조건별 분기 설정

6️⃣ 액션 모듈 추가
   - Slack: Send a Message
   - Google Sheets: Add a Row
   - Email: Send an Email
   - Notion: Create a Database Item

7️⃣ 시나리오 활성화 (ON)
```

### 추천 시나리오 구조

```
Webhook 수신
    │
    ├── event_type = "bottleneck_alert"
    │   └── Slack 알림 + 이메일 발송
    │
    ├── event_type = "weekly_report"
    │   └── Google Docs 생성 + 이메일 발송
    │
    └── event_type = "physics_update"
        └── Google Sheets 저장
```

### 테스트

```python
from integrations import MakeIntegration

make = MakeIntegration("https://hook.us1.make.com/xxxxx")
make.test_connection()
```

---

## 3. OpenAI GPT

### 용도
- Physics Map 데이터 AI 분석
- 병목 원인 진단
- 전략 조언
- 자연어 질문 답변

### 설정 방법 (2분)

```
1️⃣ OpenAI 플랫폼 접속
   https://platform.openai.com

2️⃣ API Keys 메뉴

3️⃣ Create new secret key
   이름 입력 → Create

4️⃣ 키 복사 (sk-...)
   ⚠️ 이 화면 벗어나면 다시 볼 수 없음!

5️⃣ 환경변수 설정
   export OPENAI_API_KEY="sk-..."
```

### 권장 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 가성비 최고, 빠름 | $0.01/분석 |
| `gpt-4-turbo` | 최고 성능 | $0.03/분석 |
| `gpt-3.5-turbo` | 가장 저렴 | $0.002/분석 |

### 테스트

```python
from integrations import PhysicsMapAdvisor

advisor = PhysicsMapAdvisor()

# 전체 분석
result = advisor.analyze_physics_map(physics_data)
print(result)

# 질문하기
answer = advisor.ask("시너지를 높이려면 어떻게 해야 할까요?")
print(answer)
```

---

## 4. 카카오톡 알림톡

### 용도
- 모바일 즉시 알림
- 병목 감지 알림
- 주간 리포트 발송
- 마일스톤 축하 메시지

### 설정 방법 - Solapi 사용 (권장, 15분)

```
1️⃣ Solapi 가입
   https://solapi.com

2️⃣ 본인 인증 완료

3️⃣ 채널 관리 → 카카오톡 채널 연동
   - 카카오톡 채널이 없으면 먼저 생성
   - https://center.kakao.com

4️⃣ 발신 프로필 등록

5️⃣ 템플릿 등록 (검수 1-2일 소요)
   아래 템플릿 코드 사용:
   - AUTUS_BOTTLENECK_001
   - AUTUS_WEEKLY_001
   - AUTUS_MILESTONE_001
   - AUTUS_PREDICTION_001

6️⃣ API 키 발급
   대시보드 → 개발/연동 → API Key

7️⃣ 환경변수 설정
   export ALIMTALK_API_KEY="your-key"
   export ALIMTALK_API_SECRET="your-secret"
   export ALIMTALK_SENDER_KEY="your-sender-key"
```

### 템플릿 예시 (검수용)

**병목 감지 (AUTUS_BOTTLENECK_001)**
```
⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉
```

### 비용

- Solapi: **월 50건 무료**, 이후 건당 약 8원
- 직접 연동: 건당 약 6-7원

### 테스트

```python
from integrations import KakaoAlimtalk

kakao = KakaoAlimtalk()

# 병목 알림 테스트
kakao.send_bottleneck_alert("01012345678", bottleneck_node)
```

---

## 5. 통합 사용법

### 환경변수 설정

```bash
# .env.example을 .env로 복사
cp integrations/.env.example integrations/.env

# .env 파일 편집하여 실제 값 입력
```

### 통합 클라이언트 사용

```python
from integrations import AutusIntegrations

# 모든 서비스 초기화
autus = AutusIntegrations(
    google_credentials="credentials.json",
    make_webhook_url="https://hook.us1.make.com/xxxxx",
    openai_api_key="sk-...",
    kakao_api_key="your-api-key"
)

# 병목 감지 시 모든 채널로 알림
autus.send_everywhere(
    event_type="bottleneck",
    data=bottleneck_node,
    phone_number="01012345678"
)

# AI 분석
analysis = autus.get_ai_analysis(physics_data)
print(analysis)
```

### 자동화 예시

```python
# Physics Map 분석 후 자동 알림
def on_bottleneck_detected(node):
    # 1. AI가 원인 분석
    diagnosis = autus.ai.diagnose_bottleneck(node)
    
    # 2. Make로 워크플로우 트리거
    autus.make.send_bottleneck_alert(node)
    
    # 3. 카카오톡으로 즉시 알림
    autus.kakao.send_bottleneck_alert("01012345678", node)
    
    # 4. Google Sheets에 기록
    autus.sheets.export_physics_data(spreadsheet_id, {"nodes": [node]})
```

---

## 💡 팁

### 비용 최적화

| 서비스 | 무료 티어 | 권장 사용량 |
|--------|----------|-------------|
| Google Sheets | 무제한 | 제한 없음 |
| Make | 1,000 ops/월 | 병목 알림만 |
| OpenAI | 없음 ($5 크레딧) | 주 1-2회 분석 |
| Solapi | 50건/월 | 중요 알림만 |

### 우선순위

1. **필수**: Google Sheets (데이터 저장)
2. **강추**: OpenAI (AI 분석)
3. **편리**: Make (자동화)
4. **선택**: 카카오톡 (모바일 알림)

---

## 🆘 문제 해결

### Google Sheets 권한 오류
```
→ 서비스 계정 이메일에 편집자 권한 부여 확인
```

### Make Webhook 응답 없음
```
→ 시나리오가 ON 상태인지 확인
→ Webhook URL이 정확한지 확인
```

### OpenAI API 오류
```
→ API 키가 유효한지 확인
→ 잔액이 있는지 확인 (Usage 메뉴)
```

### 알림톡 발송 실패
```
→ 템플릿 검수 완료 확인
→ 발신 프로필 승인 확인
→ 수신 번호 형식 확인 (01012345678)
```

---

**도움이 필요하시면 언제든 물어보세요!** 🚀





# 🔗 AUTUS Physics Map 외부 서비스 연동 가이드

> 로그인만 해두시면 자동 연동됩니다!

---

## 📋 목차

1. [Google Sheets](#1-google-sheets)
2. [Make (Integromat)](#2-make-integromat)
3. [OpenAI GPT](#3-openai-gpt)
4. [카카오톡 알림톡](#4-카카오톡-알림톡)
5. [통합 사용법](#5-통합-사용법)

---

## 1. Google Sheets

### 용도
- Physics Map 데이터 자동 저장
- 엑셀 대체 데이터 입력
- 팀 공유 대시보드

### 설정 방법 (5분)

```
1️⃣ Google Cloud Console 접속
   https://console.cloud.google.com

2️⃣ 프로젝트 생성 또는 선택

3️⃣ APIs & Services → Library
   "Google Sheets API" 검색 → 사용 설정

4️⃣ APIs & Services → Credentials
   Create Credentials → Service Account
   
5️⃣ 서비스 계정 생성 후
   Keys → Add Key → Create new key → JSON
   
6️⃣ 다운로드한 JSON을 credentials.json으로 저장
   /Users/oseho/Desktop/autus/integrations/credentials.json

7️⃣ Google Sheets 열기
   서비스 계정 이메일(xxxxx@xxxxx.iam.gserviceaccount.com)에
   편집자 권한 공유
```

### 테스트

```python
from integrations import GoogleSheetsClient

sheets = GoogleSheetsClient("credentials.json")
sheets.create_physics_template("your-spreadsheet-id")
```

---

## 2. Make (Integromat)

### 용도
- 고급 자동화 워크플로우
- 5000+ 앱 연동
- 조건부 분기 처리

### 설정 방법 (10분)

```
1️⃣ Make.com 접속 및 회원가입
   https://make.com

2️⃣ Create a new scenario

3️⃣ 첫 번째 모듈 추가
   Webhooks → Custom webhook → Add
   
4️⃣ Webhook 이름 입력 → Save
   생성된 URL 복사 (https://hook.us1.make.com/xxxxx)

5️⃣ Router 추가 (선택)
   조건별 분기 설정

6️⃣ 액션 모듈 추가
   - Slack: Send a Message
   - Google Sheets: Add a Row
   - Email: Send an Email
   - Notion: Create a Database Item

7️⃣ 시나리오 활성화 (ON)
```

### 추천 시나리오 구조

```
Webhook 수신
    │
    ├── event_type = "bottleneck_alert"
    │   └── Slack 알림 + 이메일 발송
    │
    ├── event_type = "weekly_report"
    │   └── Google Docs 생성 + 이메일 발송
    │
    └── event_type = "physics_update"
        └── Google Sheets 저장
```

### 테스트

```python
from integrations import MakeIntegration

make = MakeIntegration("https://hook.us1.make.com/xxxxx")
make.test_connection()
```

---

## 3. OpenAI GPT

### 용도
- Physics Map 데이터 AI 분석
- 병목 원인 진단
- 전략 조언
- 자연어 질문 답변

### 설정 방법 (2분)

```
1️⃣ OpenAI 플랫폼 접속
   https://platform.openai.com

2️⃣ API Keys 메뉴

3️⃣ Create new secret key
   이름 입력 → Create

4️⃣ 키 복사 (sk-...)
   ⚠️ 이 화면 벗어나면 다시 볼 수 없음!

5️⃣ 환경변수 설정
   export OPENAI_API_KEY="sk-..."
```

### 권장 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 가성비 최고, 빠름 | $0.01/분석 |
| `gpt-4-turbo` | 최고 성능 | $0.03/분석 |
| `gpt-3.5-turbo` | 가장 저렴 | $0.002/분석 |

### 테스트

```python
from integrations import PhysicsMapAdvisor

advisor = PhysicsMapAdvisor()

# 전체 분석
result = advisor.analyze_physics_map(physics_data)
print(result)

# 질문하기
answer = advisor.ask("시너지를 높이려면 어떻게 해야 할까요?")
print(answer)
```

---

## 4. 카카오톡 알림톡

### 용도
- 모바일 즉시 알림
- 병목 감지 알림
- 주간 리포트 발송
- 마일스톤 축하 메시지

### 설정 방법 - Solapi 사용 (권장, 15분)

```
1️⃣ Solapi 가입
   https://solapi.com

2️⃣ 본인 인증 완료

3️⃣ 채널 관리 → 카카오톡 채널 연동
   - 카카오톡 채널이 없으면 먼저 생성
   - https://center.kakao.com

4️⃣ 발신 프로필 등록

5️⃣ 템플릿 등록 (검수 1-2일 소요)
   아래 템플릿 코드 사용:
   - AUTUS_BOTTLENECK_001
   - AUTUS_WEEKLY_001
   - AUTUS_MILESTONE_001
   - AUTUS_PREDICTION_001

6️⃣ API 키 발급
   대시보드 → 개발/연동 → API Key

7️⃣ 환경변수 설정
   export ALIMTALK_API_KEY="your-key"
   export ALIMTALK_API_SECRET="your-secret"
   export ALIMTALK_SENDER_KEY="your-sender-key"
```

### 템플릿 예시 (검수용)

**병목 감지 (AUTUS_BOTTLENECK_001)**
```
⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉
```

### 비용

- Solapi: **월 50건 무료**, 이후 건당 약 8원
- 직접 연동: 건당 약 6-7원

### 테스트

```python
from integrations import KakaoAlimtalk

kakao = KakaoAlimtalk()

# 병목 알림 테스트
kakao.send_bottleneck_alert("01012345678", bottleneck_node)
```

---

## 5. 통합 사용법

### 환경변수 설정

```bash
# .env.example을 .env로 복사
cp integrations/.env.example integrations/.env

# .env 파일 편집하여 실제 값 입력
```

### 통합 클라이언트 사용

```python
from integrations import AutusIntegrations

# 모든 서비스 초기화
autus = AutusIntegrations(
    google_credentials="credentials.json",
    make_webhook_url="https://hook.us1.make.com/xxxxx",
    openai_api_key="sk-...",
    kakao_api_key="your-api-key"
)

# 병목 감지 시 모든 채널로 알림
autus.send_everywhere(
    event_type="bottleneck",
    data=bottleneck_node,
    phone_number="01012345678"
)

# AI 분석
analysis = autus.get_ai_analysis(physics_data)
print(analysis)
```

### 자동화 예시

```python
# Physics Map 분석 후 자동 알림
def on_bottleneck_detected(node):
    # 1. AI가 원인 분석
    diagnosis = autus.ai.diagnose_bottleneck(node)
    
    # 2. Make로 워크플로우 트리거
    autus.make.send_bottleneck_alert(node)
    
    # 3. 카카오톡으로 즉시 알림
    autus.kakao.send_bottleneck_alert("01012345678", node)
    
    # 4. Google Sheets에 기록
    autus.sheets.export_physics_data(spreadsheet_id, {"nodes": [node]})
```

---

## 💡 팁

### 비용 최적화

| 서비스 | 무료 티어 | 권장 사용량 |
|--------|----------|-------------|
| Google Sheets | 무제한 | 제한 없음 |
| Make | 1,000 ops/월 | 병목 알림만 |
| OpenAI | 없음 ($5 크레딧) | 주 1-2회 분석 |
| Solapi | 50건/월 | 중요 알림만 |

### 우선순위

1. **필수**: Google Sheets (데이터 저장)
2. **강추**: OpenAI (AI 분석)
3. **편리**: Make (자동화)
4. **선택**: 카카오톡 (모바일 알림)

---

## 🆘 문제 해결

### Google Sheets 권한 오류
```
→ 서비스 계정 이메일에 편집자 권한 부여 확인
```

### Make Webhook 응답 없음
```
→ 시나리오가 ON 상태인지 확인
→ Webhook URL이 정확한지 확인
```

### OpenAI API 오류
```
→ API 키가 유효한지 확인
→ 잔액이 있는지 확인 (Usage 메뉴)
```

### 알림톡 발송 실패
```
→ 템플릿 검수 완료 확인
→ 발신 프로필 승인 확인
→ 수신 번호 형식 확인 (01012345678)
```

---

**도움이 필요하시면 언제든 물어보세요!** 🚀





# 🔗 AUTUS Physics Map 외부 서비스 연동 가이드

> 로그인만 해두시면 자동 연동됩니다!

---

## 📋 목차

1. [Google Sheets](#1-google-sheets)
2. [Make (Integromat)](#2-make-integromat)
3. [OpenAI GPT](#3-openai-gpt)
4. [카카오톡 알림톡](#4-카카오톡-알림톡)
5. [통합 사용법](#5-통합-사용법)

---

## 1. Google Sheets

### 용도
- Physics Map 데이터 자동 저장
- 엑셀 대체 데이터 입력
- 팀 공유 대시보드

### 설정 방법 (5분)

```
1️⃣ Google Cloud Console 접속
   https://console.cloud.google.com

2️⃣ 프로젝트 생성 또는 선택

3️⃣ APIs & Services → Library
   "Google Sheets API" 검색 → 사용 설정

4️⃣ APIs & Services → Credentials
   Create Credentials → Service Account
   
5️⃣ 서비스 계정 생성 후
   Keys → Add Key → Create new key → JSON
   
6️⃣ 다운로드한 JSON을 credentials.json으로 저장
   /Users/oseho/Desktop/autus/integrations/credentials.json

7️⃣ Google Sheets 열기
   서비스 계정 이메일(xxxxx@xxxxx.iam.gserviceaccount.com)에
   편집자 권한 공유
```

### 테스트

```python
from integrations import GoogleSheetsClient

sheets = GoogleSheetsClient("credentials.json")
sheets.create_physics_template("your-spreadsheet-id")
```

---

## 2. Make (Integromat)

### 용도
- 고급 자동화 워크플로우
- 5000+ 앱 연동
- 조건부 분기 처리

### 설정 방법 (10분)

```
1️⃣ Make.com 접속 및 회원가입
   https://make.com

2️⃣ Create a new scenario

3️⃣ 첫 번째 모듈 추가
   Webhooks → Custom webhook → Add
   
4️⃣ Webhook 이름 입력 → Save
   생성된 URL 복사 (https://hook.us1.make.com/xxxxx)

5️⃣ Router 추가 (선택)
   조건별 분기 설정

6️⃣ 액션 모듈 추가
   - Slack: Send a Message
   - Google Sheets: Add a Row
   - Email: Send an Email
   - Notion: Create a Database Item

7️⃣ 시나리오 활성화 (ON)
```

### 추천 시나리오 구조

```
Webhook 수신
    │
    ├── event_type = "bottleneck_alert"
    │   └── Slack 알림 + 이메일 발송
    │
    ├── event_type = "weekly_report"
    │   └── Google Docs 생성 + 이메일 발송
    │
    └── event_type = "physics_update"
        └── Google Sheets 저장
```

### 테스트

```python
from integrations import MakeIntegration

make = MakeIntegration("https://hook.us1.make.com/xxxxx")
make.test_connection()
```

---

## 3. OpenAI GPT

### 용도
- Physics Map 데이터 AI 분석
- 병목 원인 진단
- 전략 조언
- 자연어 질문 답변

### 설정 방법 (2분)

```
1️⃣ OpenAI 플랫폼 접속
   https://platform.openai.com

2️⃣ API Keys 메뉴

3️⃣ Create new secret key
   이름 입력 → Create

4️⃣ 키 복사 (sk-...)
   ⚠️ 이 화면 벗어나면 다시 볼 수 없음!

5️⃣ 환경변수 설정
   export OPENAI_API_KEY="sk-..."
```

### 권장 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 가성비 최고, 빠름 | $0.01/분석 |
| `gpt-4-turbo` | 최고 성능 | $0.03/분석 |
| `gpt-3.5-turbo` | 가장 저렴 | $0.002/분석 |

### 테스트

```python
from integrations import PhysicsMapAdvisor

advisor = PhysicsMapAdvisor()

# 전체 분석
result = advisor.analyze_physics_map(physics_data)
print(result)

# 질문하기
answer = advisor.ask("시너지를 높이려면 어떻게 해야 할까요?")
print(answer)
```

---

## 4. 카카오톡 알림톡

### 용도
- 모바일 즉시 알림
- 병목 감지 알림
- 주간 리포트 발송
- 마일스톤 축하 메시지

### 설정 방법 - Solapi 사용 (권장, 15분)

```
1️⃣ Solapi 가입
   https://solapi.com

2️⃣ 본인 인증 완료

3️⃣ 채널 관리 → 카카오톡 채널 연동
   - 카카오톡 채널이 없으면 먼저 생성
   - https://center.kakao.com

4️⃣ 발신 프로필 등록

5️⃣ 템플릿 등록 (검수 1-2일 소요)
   아래 템플릿 코드 사용:
   - AUTUS_BOTTLENECK_001
   - AUTUS_WEEKLY_001
   - AUTUS_MILESTONE_001
   - AUTUS_PREDICTION_001

6️⃣ API 키 발급
   대시보드 → 개발/연동 → API Key

7️⃣ 환경변수 설정
   export ALIMTALK_API_KEY="your-key"
   export ALIMTALK_API_SECRET="your-secret"
   export ALIMTALK_SENDER_KEY="your-sender-key"
```

### 템플릿 예시 (검수용)

**병목 감지 (AUTUS_BOTTLENECK_001)**
```
⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉
```

### 비용

- Solapi: **월 50건 무료**, 이후 건당 약 8원
- 직접 연동: 건당 약 6-7원

### 테스트

```python
from integrations import KakaoAlimtalk

kakao = KakaoAlimtalk()

# 병목 알림 테스트
kakao.send_bottleneck_alert("01012345678", bottleneck_node)
```

---

## 5. 통합 사용법

### 환경변수 설정

```bash
# .env.example을 .env로 복사
cp integrations/.env.example integrations/.env

# .env 파일 편집하여 실제 값 입력
```

### 통합 클라이언트 사용

```python
from integrations import AutusIntegrations

# 모든 서비스 초기화
autus = AutusIntegrations(
    google_credentials="credentials.json",
    make_webhook_url="https://hook.us1.make.com/xxxxx",
    openai_api_key="sk-...",
    kakao_api_key="your-api-key"
)

# 병목 감지 시 모든 채널로 알림
autus.send_everywhere(
    event_type="bottleneck",
    data=bottleneck_node,
    phone_number="01012345678"
)

# AI 분석
analysis = autus.get_ai_analysis(physics_data)
print(analysis)
```

### 자동화 예시

```python
# Physics Map 분석 후 자동 알림
def on_bottleneck_detected(node):
    # 1. AI가 원인 분석
    diagnosis = autus.ai.diagnose_bottleneck(node)
    
    # 2. Make로 워크플로우 트리거
    autus.make.send_bottleneck_alert(node)
    
    # 3. 카카오톡으로 즉시 알림
    autus.kakao.send_bottleneck_alert("01012345678", node)
    
    # 4. Google Sheets에 기록
    autus.sheets.export_physics_data(spreadsheet_id, {"nodes": [node]})
```

---

## 💡 팁

### 비용 최적화

| 서비스 | 무료 티어 | 권장 사용량 |
|--------|----------|-------------|
| Google Sheets | 무제한 | 제한 없음 |
| Make | 1,000 ops/월 | 병목 알림만 |
| OpenAI | 없음 ($5 크레딧) | 주 1-2회 분석 |
| Solapi | 50건/월 | 중요 알림만 |

### 우선순위

1. **필수**: Google Sheets (데이터 저장)
2. **강추**: OpenAI (AI 분석)
3. **편리**: Make (자동화)
4. **선택**: 카카오톡 (모바일 알림)

---

## 🆘 문제 해결

### Google Sheets 권한 오류
```
→ 서비스 계정 이메일에 편집자 권한 부여 확인
```

### Make Webhook 응답 없음
```
→ 시나리오가 ON 상태인지 확인
→ Webhook URL이 정확한지 확인
```

### OpenAI API 오류
```
→ API 키가 유효한지 확인
→ 잔액이 있는지 확인 (Usage 메뉴)
```

### 알림톡 발송 실패
```
→ 템플릿 검수 완료 확인
→ 발신 프로필 승인 확인
→ 수신 번호 형식 확인 (01012345678)
```

---

**도움이 필요하시면 언제든 물어보세요!** 🚀





# 🔗 AUTUS Physics Map 외부 서비스 연동 가이드

> 로그인만 해두시면 자동 연동됩니다!

---

## 📋 목차

1. [Google Sheets](#1-google-sheets)
2. [Make (Integromat)](#2-make-integromat)
3. [OpenAI GPT](#3-openai-gpt)
4. [카카오톡 알림톡](#4-카카오톡-알림톡)
5. [통합 사용법](#5-통합-사용법)

---

## 1. Google Sheets

### 용도
- Physics Map 데이터 자동 저장
- 엑셀 대체 데이터 입력
- 팀 공유 대시보드

### 설정 방법 (5분)

```
1️⃣ Google Cloud Console 접속
   https://console.cloud.google.com

2️⃣ 프로젝트 생성 또는 선택

3️⃣ APIs & Services → Library
   "Google Sheets API" 검색 → 사용 설정

4️⃣ APIs & Services → Credentials
   Create Credentials → Service Account
   
5️⃣ 서비스 계정 생성 후
   Keys → Add Key → Create new key → JSON
   
6️⃣ 다운로드한 JSON을 credentials.json으로 저장
   /Users/oseho/Desktop/autus/integrations/credentials.json

7️⃣ Google Sheets 열기
   서비스 계정 이메일(xxxxx@xxxxx.iam.gserviceaccount.com)에
   편집자 권한 공유
```

### 테스트

```python
from integrations import GoogleSheetsClient

sheets = GoogleSheetsClient("credentials.json")
sheets.create_physics_template("your-spreadsheet-id")
```

---

## 2. Make (Integromat)

### 용도
- 고급 자동화 워크플로우
- 5000+ 앱 연동
- 조건부 분기 처리

### 설정 방법 (10분)

```
1️⃣ Make.com 접속 및 회원가입
   https://make.com

2️⃣ Create a new scenario

3️⃣ 첫 번째 모듈 추가
   Webhooks → Custom webhook → Add
   
4️⃣ Webhook 이름 입력 → Save
   생성된 URL 복사 (https://hook.us1.make.com/xxxxx)

5️⃣ Router 추가 (선택)
   조건별 분기 설정

6️⃣ 액션 모듈 추가
   - Slack: Send a Message
   - Google Sheets: Add a Row
   - Email: Send an Email
   - Notion: Create a Database Item

7️⃣ 시나리오 활성화 (ON)
```

### 추천 시나리오 구조

```
Webhook 수신
    │
    ├── event_type = "bottleneck_alert"
    │   └── Slack 알림 + 이메일 발송
    │
    ├── event_type = "weekly_report"
    │   └── Google Docs 생성 + 이메일 발송
    │
    └── event_type = "physics_update"
        └── Google Sheets 저장
```

### 테스트

```python
from integrations import MakeIntegration

make = MakeIntegration("https://hook.us1.make.com/xxxxx")
make.test_connection()
```

---

## 3. OpenAI GPT

### 용도
- Physics Map 데이터 AI 분석
- 병목 원인 진단
- 전략 조언
- 자연어 질문 답변

### 설정 방법 (2분)

```
1️⃣ OpenAI 플랫폼 접속
   https://platform.openai.com

2️⃣ API Keys 메뉴

3️⃣ Create new secret key
   이름 입력 → Create

4️⃣ 키 복사 (sk-...)
   ⚠️ 이 화면 벗어나면 다시 볼 수 없음!

5️⃣ 환경변수 설정
   export OPENAI_API_KEY="sk-..."
```

### 권장 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 가성비 최고, 빠름 | $0.01/분석 |
| `gpt-4-turbo` | 최고 성능 | $0.03/분석 |
| `gpt-3.5-turbo` | 가장 저렴 | $0.002/분석 |

### 테스트

```python
from integrations import PhysicsMapAdvisor

advisor = PhysicsMapAdvisor()

# 전체 분석
result = advisor.analyze_physics_map(physics_data)
print(result)

# 질문하기
answer = advisor.ask("시너지를 높이려면 어떻게 해야 할까요?")
print(answer)
```

---

## 4. 카카오톡 알림톡

### 용도
- 모바일 즉시 알림
- 병목 감지 알림
- 주간 리포트 발송
- 마일스톤 축하 메시지

### 설정 방법 - Solapi 사용 (권장, 15분)

```
1️⃣ Solapi 가입
   https://solapi.com

2️⃣ 본인 인증 완료

3️⃣ 채널 관리 → 카카오톡 채널 연동
   - 카카오톡 채널이 없으면 먼저 생성
   - https://center.kakao.com

4️⃣ 발신 프로필 등록

5️⃣ 템플릿 등록 (검수 1-2일 소요)
   아래 템플릿 코드 사용:
   - AUTUS_BOTTLENECK_001
   - AUTUS_WEEKLY_001
   - AUTUS_MILESTONE_001
   - AUTUS_PREDICTION_001

6️⃣ API 키 발급
   대시보드 → 개발/연동 → API Key

7️⃣ 환경변수 설정
   export ALIMTALK_API_KEY="your-key"
   export ALIMTALK_API_SECRET="your-secret"
   export ALIMTALK_SENDER_KEY="your-sender-key"
```

### 템플릿 예시 (검수용)

**병목 감지 (AUTUS_BOTTLENECK_001)**
```
⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉
```

### 비용

- Solapi: **월 50건 무료**, 이후 건당 약 8원
- 직접 연동: 건당 약 6-7원

### 테스트

```python
from integrations import KakaoAlimtalk

kakao = KakaoAlimtalk()

# 병목 알림 테스트
kakao.send_bottleneck_alert("01012345678", bottleneck_node)
```

---

## 5. 통합 사용법

### 환경변수 설정

```bash
# .env.example을 .env로 복사
cp integrations/.env.example integrations/.env

# .env 파일 편집하여 실제 값 입력
```

### 통합 클라이언트 사용

```python
from integrations import AutusIntegrations

# 모든 서비스 초기화
autus = AutusIntegrations(
    google_credentials="credentials.json",
    make_webhook_url="https://hook.us1.make.com/xxxxx",
    openai_api_key="sk-...",
    kakao_api_key="your-api-key"
)

# 병목 감지 시 모든 채널로 알림
autus.send_everywhere(
    event_type="bottleneck",
    data=bottleneck_node,
    phone_number="01012345678"
)

# AI 분석
analysis = autus.get_ai_analysis(physics_data)
print(analysis)
```

### 자동화 예시

```python
# Physics Map 분석 후 자동 알림
def on_bottleneck_detected(node):
    # 1. AI가 원인 분석
    diagnosis = autus.ai.diagnose_bottleneck(node)
    
    # 2. Make로 워크플로우 트리거
    autus.make.send_bottleneck_alert(node)
    
    # 3. 카카오톡으로 즉시 알림
    autus.kakao.send_bottleneck_alert("01012345678", node)
    
    # 4. Google Sheets에 기록
    autus.sheets.export_physics_data(spreadsheet_id, {"nodes": [node]})
```

---

## 💡 팁

### 비용 최적화

| 서비스 | 무료 티어 | 권장 사용량 |
|--------|----------|-------------|
| Google Sheets | 무제한 | 제한 없음 |
| Make | 1,000 ops/월 | 병목 알림만 |
| OpenAI | 없음 ($5 크레딧) | 주 1-2회 분석 |
| Solapi | 50건/월 | 중요 알림만 |

### 우선순위

1. **필수**: Google Sheets (데이터 저장)
2. **강추**: OpenAI (AI 분석)
3. **편리**: Make (자동화)
4. **선택**: 카카오톡 (모바일 알림)

---

## 🆘 문제 해결

### Google Sheets 권한 오류
```
→ 서비스 계정 이메일에 편집자 권한 부여 확인
```

### Make Webhook 응답 없음
```
→ 시나리오가 ON 상태인지 확인
→ Webhook URL이 정확한지 확인
```

### OpenAI API 오류
```
→ API 키가 유효한지 확인
→ 잔액이 있는지 확인 (Usage 메뉴)
```

### 알림톡 발송 실패
```
→ 템플릿 검수 완료 확인
→ 발신 프로필 승인 확인
→ 수신 번호 형식 확인 (01012345678)
```

---

**도움이 필요하시면 언제든 물어보세요!** 🚀





# 🔗 AUTUS Physics Map 외부 서비스 연동 가이드

> 로그인만 해두시면 자동 연동됩니다!

---

## 📋 목차

1. [Google Sheets](#1-google-sheets)
2. [Make (Integromat)](#2-make-integromat)
3. [OpenAI GPT](#3-openai-gpt)
4. [카카오톡 알림톡](#4-카카오톡-알림톡)
5. [통합 사용법](#5-통합-사용법)

---

## 1. Google Sheets

### 용도
- Physics Map 데이터 자동 저장
- 엑셀 대체 데이터 입력
- 팀 공유 대시보드

### 설정 방법 (5분)

```
1️⃣ Google Cloud Console 접속
   https://console.cloud.google.com

2️⃣ 프로젝트 생성 또는 선택

3️⃣ APIs & Services → Library
   "Google Sheets API" 검색 → 사용 설정

4️⃣ APIs & Services → Credentials
   Create Credentials → Service Account
   
5️⃣ 서비스 계정 생성 후
   Keys → Add Key → Create new key → JSON
   
6️⃣ 다운로드한 JSON을 credentials.json으로 저장
   /Users/oseho/Desktop/autus/integrations/credentials.json

7️⃣ Google Sheets 열기
   서비스 계정 이메일(xxxxx@xxxxx.iam.gserviceaccount.com)에
   편집자 권한 공유
```

### 테스트

```python
from integrations import GoogleSheetsClient

sheets = GoogleSheetsClient("credentials.json")
sheets.create_physics_template("your-spreadsheet-id")
```

---

## 2. Make (Integromat)

### 용도
- 고급 자동화 워크플로우
- 5000+ 앱 연동
- 조건부 분기 처리

### 설정 방법 (10분)

```
1️⃣ Make.com 접속 및 회원가입
   https://make.com

2️⃣ Create a new scenario

3️⃣ 첫 번째 모듈 추가
   Webhooks → Custom webhook → Add
   
4️⃣ Webhook 이름 입력 → Save
   생성된 URL 복사 (https://hook.us1.make.com/xxxxx)

5️⃣ Router 추가 (선택)
   조건별 분기 설정

6️⃣ 액션 모듈 추가
   - Slack: Send a Message
   - Google Sheets: Add a Row
   - Email: Send an Email
   - Notion: Create a Database Item

7️⃣ 시나리오 활성화 (ON)
```

### 추천 시나리오 구조

```
Webhook 수신
    │
    ├── event_type = "bottleneck_alert"
    │   └── Slack 알림 + 이메일 발송
    │
    ├── event_type = "weekly_report"
    │   └── Google Docs 생성 + 이메일 발송
    │
    └── event_type = "physics_update"
        └── Google Sheets 저장
```

### 테스트

```python
from integrations import MakeIntegration

make = MakeIntegration("https://hook.us1.make.com/xxxxx")
make.test_connection()
```

---

## 3. OpenAI GPT

### 용도
- Physics Map 데이터 AI 분석
- 병목 원인 진단
- 전략 조언
- 자연어 질문 답변

### 설정 방법 (2분)

```
1️⃣ OpenAI 플랫폼 접속
   https://platform.openai.com

2️⃣ API Keys 메뉴

3️⃣ Create new secret key
   이름 입력 → Create

4️⃣ 키 복사 (sk-...)
   ⚠️ 이 화면 벗어나면 다시 볼 수 없음!

5️⃣ 환경변수 설정
   export OPENAI_API_KEY="sk-..."
```

### 권장 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 가성비 최고, 빠름 | $0.01/분석 |
| `gpt-4-turbo` | 최고 성능 | $0.03/분석 |
| `gpt-3.5-turbo` | 가장 저렴 | $0.002/분석 |

### 테스트

```python
from integrations import PhysicsMapAdvisor

advisor = PhysicsMapAdvisor()

# 전체 분석
result = advisor.analyze_physics_map(physics_data)
print(result)

# 질문하기
answer = advisor.ask("시너지를 높이려면 어떻게 해야 할까요?")
print(answer)
```

---

## 4. 카카오톡 알림톡

### 용도
- 모바일 즉시 알림
- 병목 감지 알림
- 주간 리포트 발송
- 마일스톤 축하 메시지

### 설정 방법 - Solapi 사용 (권장, 15분)

```
1️⃣ Solapi 가입
   https://solapi.com

2️⃣ 본인 인증 완료

3️⃣ 채널 관리 → 카카오톡 채널 연동
   - 카카오톡 채널이 없으면 먼저 생성
   - https://center.kakao.com

4️⃣ 발신 프로필 등록

5️⃣ 템플릿 등록 (검수 1-2일 소요)
   아래 템플릿 코드 사용:
   - AUTUS_BOTTLENECK_001
   - AUTUS_WEEKLY_001
   - AUTUS_MILESTONE_001
   - AUTUS_PREDICTION_001

6️⃣ API 키 발급
   대시보드 → 개발/연동 → API Key

7️⃣ 환경변수 설정
   export ALIMTALK_API_KEY="your-key"
   export ALIMTALK_API_SECRET="your-secret"
   export ALIMTALK_SENDER_KEY="your-sender-key"
```

### 템플릿 예시 (검수용)

**병목 감지 (AUTUS_BOTTLENECK_001)**
```
⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉
```

### 비용

- Solapi: **월 50건 무료**, 이후 건당 약 8원
- 직접 연동: 건당 약 6-7원

### 테스트

```python
from integrations import KakaoAlimtalk

kakao = KakaoAlimtalk()

# 병목 알림 테스트
kakao.send_bottleneck_alert("01012345678", bottleneck_node)
```

---

## 5. 통합 사용법

### 환경변수 설정

```bash
# .env.example을 .env로 복사
cp integrations/.env.example integrations/.env

# .env 파일 편집하여 실제 값 입력
```

### 통합 클라이언트 사용

```python
from integrations import AutusIntegrations

# 모든 서비스 초기화
autus = AutusIntegrations(
    google_credentials="credentials.json",
    make_webhook_url="https://hook.us1.make.com/xxxxx",
    openai_api_key="sk-...",
    kakao_api_key="your-api-key"
)

# 병목 감지 시 모든 채널로 알림
autus.send_everywhere(
    event_type="bottleneck",
    data=bottleneck_node,
    phone_number="01012345678"
)

# AI 분석
analysis = autus.get_ai_analysis(physics_data)
print(analysis)
```

### 자동화 예시

```python
# Physics Map 분석 후 자동 알림
def on_bottleneck_detected(node):
    # 1. AI가 원인 분석
    diagnosis = autus.ai.diagnose_bottleneck(node)
    
    # 2. Make로 워크플로우 트리거
    autus.make.send_bottleneck_alert(node)
    
    # 3. 카카오톡으로 즉시 알림
    autus.kakao.send_bottleneck_alert("01012345678", node)
    
    # 4. Google Sheets에 기록
    autus.sheets.export_physics_data(spreadsheet_id, {"nodes": [node]})
```

---

## 💡 팁

### 비용 최적화

| 서비스 | 무료 티어 | 권장 사용량 |
|--------|----------|-------------|
| Google Sheets | 무제한 | 제한 없음 |
| Make | 1,000 ops/월 | 병목 알림만 |
| OpenAI | 없음 ($5 크레딧) | 주 1-2회 분석 |
| Solapi | 50건/월 | 중요 알림만 |

### 우선순위

1. **필수**: Google Sheets (데이터 저장)
2. **강추**: OpenAI (AI 분석)
3. **편리**: Make (자동화)
4. **선택**: 카카오톡 (모바일 알림)

---

## 🆘 문제 해결

### Google Sheets 권한 오류
```
→ 서비스 계정 이메일에 편집자 권한 부여 확인
```

### Make Webhook 응답 없음
```
→ 시나리오가 ON 상태인지 확인
→ Webhook URL이 정확한지 확인
```

### OpenAI API 오류
```
→ API 키가 유효한지 확인
→ 잔액이 있는지 확인 (Usage 메뉴)
```

### 알림톡 발송 실패
```
→ 템플릿 검수 완료 확인
→ 발신 프로필 승인 확인
→ 수신 번호 형식 확인 (01012345678)
```

---

**도움이 필요하시면 언제든 물어보세요!** 🚀















# 🔗 AUTUS Physics Map 외부 서비스 연동 가이드

> 로그인만 해두시면 자동 연동됩니다!

---

## 📋 목차

1. [Google Sheets](#1-google-sheets)
2. [Make (Integromat)](#2-make-integromat)
3. [OpenAI GPT](#3-openai-gpt)
4. [카카오톡 알림톡](#4-카카오톡-알림톡)
5. [통합 사용법](#5-통합-사용법)

---

## 1. Google Sheets

### 용도
- Physics Map 데이터 자동 저장
- 엑셀 대체 데이터 입력
- 팀 공유 대시보드

### 설정 방법 (5분)

```
1️⃣ Google Cloud Console 접속
   https://console.cloud.google.com

2️⃣ 프로젝트 생성 또는 선택

3️⃣ APIs & Services → Library
   "Google Sheets API" 검색 → 사용 설정

4️⃣ APIs & Services → Credentials
   Create Credentials → Service Account
   
5️⃣ 서비스 계정 생성 후
   Keys → Add Key → Create new key → JSON
   
6️⃣ 다운로드한 JSON을 credentials.json으로 저장
   /Users/oseho/Desktop/autus/integrations/credentials.json

7️⃣ Google Sheets 열기
   서비스 계정 이메일(xxxxx@xxxxx.iam.gserviceaccount.com)에
   편집자 권한 공유
```

### 테스트

```python
from integrations import GoogleSheetsClient

sheets = GoogleSheetsClient("credentials.json")
sheets.create_physics_template("your-spreadsheet-id")
```

---

## 2. Make (Integromat)

### 용도
- 고급 자동화 워크플로우
- 5000+ 앱 연동
- 조건부 분기 처리

### 설정 방법 (10분)

```
1️⃣ Make.com 접속 및 회원가입
   https://make.com

2️⃣ Create a new scenario

3️⃣ 첫 번째 모듈 추가
   Webhooks → Custom webhook → Add
   
4️⃣ Webhook 이름 입력 → Save
   생성된 URL 복사 (https://hook.us1.make.com/xxxxx)

5️⃣ Router 추가 (선택)
   조건별 분기 설정

6️⃣ 액션 모듈 추가
   - Slack: Send a Message
   - Google Sheets: Add a Row
   - Email: Send an Email
   - Notion: Create a Database Item

7️⃣ 시나리오 활성화 (ON)
```

### 추천 시나리오 구조

```
Webhook 수신
    │
    ├── event_type = "bottleneck_alert"
    │   └── Slack 알림 + 이메일 발송
    │
    ├── event_type = "weekly_report"
    │   └── Google Docs 생성 + 이메일 발송
    │
    └── event_type = "physics_update"
        └── Google Sheets 저장
```

### 테스트

```python
from integrations import MakeIntegration

make = MakeIntegration("https://hook.us1.make.com/xxxxx")
make.test_connection()
```

---

## 3. OpenAI GPT

### 용도
- Physics Map 데이터 AI 분석
- 병목 원인 진단
- 전략 조언
- 자연어 질문 답변

### 설정 방법 (2분)

```
1️⃣ OpenAI 플랫폼 접속
   https://platform.openai.com

2️⃣ API Keys 메뉴

3️⃣ Create new secret key
   이름 입력 → Create

4️⃣ 키 복사 (sk-...)
   ⚠️ 이 화면 벗어나면 다시 볼 수 없음!

5️⃣ 환경변수 설정
   export OPENAI_API_KEY="sk-..."
```

### 권장 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 가성비 최고, 빠름 | $0.01/분석 |
| `gpt-4-turbo` | 최고 성능 | $0.03/분석 |
| `gpt-3.5-turbo` | 가장 저렴 | $0.002/분석 |

### 테스트

```python
from integrations import PhysicsMapAdvisor

advisor = PhysicsMapAdvisor()

# 전체 분석
result = advisor.analyze_physics_map(physics_data)
print(result)

# 질문하기
answer = advisor.ask("시너지를 높이려면 어떻게 해야 할까요?")
print(answer)
```

---

## 4. 카카오톡 알림톡

### 용도
- 모바일 즉시 알림
- 병목 감지 알림
- 주간 리포트 발송
- 마일스톤 축하 메시지

### 설정 방법 - Solapi 사용 (권장, 15분)

```
1️⃣ Solapi 가입
   https://solapi.com

2️⃣ 본인 인증 완료

3️⃣ 채널 관리 → 카카오톡 채널 연동
   - 카카오톡 채널이 없으면 먼저 생성
   - https://center.kakao.com

4️⃣ 발신 프로필 등록

5️⃣ 템플릿 등록 (검수 1-2일 소요)
   아래 템플릿 코드 사용:
   - AUTUS_BOTTLENECK_001
   - AUTUS_WEEKLY_001
   - AUTUS_MILESTONE_001
   - AUTUS_PREDICTION_001

6️⃣ API 키 발급
   대시보드 → 개발/연동 → API Key

7️⃣ 환경변수 설정
   export ALIMTALK_API_KEY="your-key"
   export ALIMTALK_API_SECRET="your-secret"
   export ALIMTALK_SENDER_KEY="your-sender-key"
```

### 템플릿 예시 (검수용)

**병목 감지 (AUTUS_BOTTLENECK_001)**
```
⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉
```

### 비용

- Solapi: **월 50건 무료**, 이후 건당 약 8원
- 직접 연동: 건당 약 6-7원

### 테스트

```python
from integrations import KakaoAlimtalk

kakao = KakaoAlimtalk()

# 병목 알림 테스트
kakao.send_bottleneck_alert("01012345678", bottleneck_node)
```

---

## 5. 통합 사용법

### 환경변수 설정

```bash
# .env.example을 .env로 복사
cp integrations/.env.example integrations/.env

# .env 파일 편집하여 실제 값 입력
```

### 통합 클라이언트 사용

```python
from integrations import AutusIntegrations

# 모든 서비스 초기화
autus = AutusIntegrations(
    google_credentials="credentials.json",
    make_webhook_url="https://hook.us1.make.com/xxxxx",
    openai_api_key="sk-...",
    kakao_api_key="your-api-key"
)

# 병목 감지 시 모든 채널로 알림
autus.send_everywhere(
    event_type="bottleneck",
    data=bottleneck_node,
    phone_number="01012345678"
)

# AI 분석
analysis = autus.get_ai_analysis(physics_data)
print(analysis)
```

### 자동화 예시

```python
# Physics Map 분석 후 자동 알림
def on_bottleneck_detected(node):
    # 1. AI가 원인 분석
    diagnosis = autus.ai.diagnose_bottleneck(node)
    
    # 2. Make로 워크플로우 트리거
    autus.make.send_bottleneck_alert(node)
    
    # 3. 카카오톡으로 즉시 알림
    autus.kakao.send_bottleneck_alert("01012345678", node)
    
    # 4. Google Sheets에 기록
    autus.sheets.export_physics_data(spreadsheet_id, {"nodes": [node]})
```

---

## 💡 팁

### 비용 최적화

| 서비스 | 무료 티어 | 권장 사용량 |
|--------|----------|-------------|
| Google Sheets | 무제한 | 제한 없음 |
| Make | 1,000 ops/월 | 병목 알림만 |
| OpenAI | 없음 ($5 크레딧) | 주 1-2회 분석 |
| Solapi | 50건/월 | 중요 알림만 |

### 우선순위

1. **필수**: Google Sheets (데이터 저장)
2. **강추**: OpenAI (AI 분석)
3. **편리**: Make (자동화)
4. **선택**: 카카오톡 (모바일 알림)

---

## 🆘 문제 해결

### Google Sheets 권한 오류
```
→ 서비스 계정 이메일에 편집자 권한 부여 확인
```

### Make Webhook 응답 없음
```
→ 시나리오가 ON 상태인지 확인
→ Webhook URL이 정확한지 확인
```

### OpenAI API 오류
```
→ API 키가 유효한지 확인
→ 잔액이 있는지 확인 (Usage 메뉴)
```

### 알림톡 발송 실패
```
→ 템플릿 검수 완료 확인
→ 발신 프로필 승인 확인
→ 수신 번호 형식 확인 (01012345678)
```

---

**도움이 필요하시면 언제든 물어보세요!** 🚀





# 🔗 AUTUS Physics Map 외부 서비스 연동 가이드

> 로그인만 해두시면 자동 연동됩니다!

---

## 📋 목차

1. [Google Sheets](#1-google-sheets)
2. [Make (Integromat)](#2-make-integromat)
3. [OpenAI GPT](#3-openai-gpt)
4. [카카오톡 알림톡](#4-카카오톡-알림톡)
5. [통합 사용법](#5-통합-사용법)

---

## 1. Google Sheets

### 용도
- Physics Map 데이터 자동 저장
- 엑셀 대체 데이터 입력
- 팀 공유 대시보드

### 설정 방법 (5분)

```
1️⃣ Google Cloud Console 접속
   https://console.cloud.google.com

2️⃣ 프로젝트 생성 또는 선택

3️⃣ APIs & Services → Library
   "Google Sheets API" 검색 → 사용 설정

4️⃣ APIs & Services → Credentials
   Create Credentials → Service Account
   
5️⃣ 서비스 계정 생성 후
   Keys → Add Key → Create new key → JSON
   
6️⃣ 다운로드한 JSON을 credentials.json으로 저장
   /Users/oseho/Desktop/autus/integrations/credentials.json

7️⃣ Google Sheets 열기
   서비스 계정 이메일(xxxxx@xxxxx.iam.gserviceaccount.com)에
   편집자 권한 공유
```

### 테스트

```python
from integrations import GoogleSheetsClient

sheets = GoogleSheetsClient("credentials.json")
sheets.create_physics_template("your-spreadsheet-id")
```

---

## 2. Make (Integromat)

### 용도
- 고급 자동화 워크플로우
- 5000+ 앱 연동
- 조건부 분기 처리

### 설정 방법 (10분)

```
1️⃣ Make.com 접속 및 회원가입
   https://make.com

2️⃣ Create a new scenario

3️⃣ 첫 번째 모듈 추가
   Webhooks → Custom webhook → Add
   
4️⃣ Webhook 이름 입력 → Save
   생성된 URL 복사 (https://hook.us1.make.com/xxxxx)

5️⃣ Router 추가 (선택)
   조건별 분기 설정

6️⃣ 액션 모듈 추가
   - Slack: Send a Message
   - Google Sheets: Add a Row
   - Email: Send an Email
   - Notion: Create a Database Item

7️⃣ 시나리오 활성화 (ON)
```

### 추천 시나리오 구조

```
Webhook 수신
    │
    ├── event_type = "bottleneck_alert"
    │   └── Slack 알림 + 이메일 발송
    │
    ├── event_type = "weekly_report"
    │   └── Google Docs 생성 + 이메일 발송
    │
    └── event_type = "physics_update"
        └── Google Sheets 저장
```

### 테스트

```python
from integrations import MakeIntegration

make = MakeIntegration("https://hook.us1.make.com/xxxxx")
make.test_connection()
```

---

## 3. OpenAI GPT

### 용도
- Physics Map 데이터 AI 분석
- 병목 원인 진단
- 전략 조언
- 자연어 질문 답변

### 설정 방법 (2분)

```
1️⃣ OpenAI 플랫폼 접속
   https://platform.openai.com

2️⃣ API Keys 메뉴

3️⃣ Create new secret key
   이름 입력 → Create

4️⃣ 키 복사 (sk-...)
   ⚠️ 이 화면 벗어나면 다시 볼 수 없음!

5️⃣ 환경변수 설정
   export OPENAI_API_KEY="sk-..."
```

### 권장 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 가성비 최고, 빠름 | $0.01/분석 |
| `gpt-4-turbo` | 최고 성능 | $0.03/분석 |
| `gpt-3.5-turbo` | 가장 저렴 | $0.002/분석 |

### 테스트

```python
from integrations import PhysicsMapAdvisor

advisor = PhysicsMapAdvisor()

# 전체 분석
result = advisor.analyze_physics_map(physics_data)
print(result)

# 질문하기
answer = advisor.ask("시너지를 높이려면 어떻게 해야 할까요?")
print(answer)
```

---

## 4. 카카오톡 알림톡

### 용도
- 모바일 즉시 알림
- 병목 감지 알림
- 주간 리포트 발송
- 마일스톤 축하 메시지

### 설정 방법 - Solapi 사용 (권장, 15분)

```
1️⃣ Solapi 가입
   https://solapi.com

2️⃣ 본인 인증 완료

3️⃣ 채널 관리 → 카카오톡 채널 연동
   - 카카오톡 채널이 없으면 먼저 생성
   - https://center.kakao.com

4️⃣ 발신 프로필 등록

5️⃣ 템플릿 등록 (검수 1-2일 소요)
   아래 템플릿 코드 사용:
   - AUTUS_BOTTLENECK_001
   - AUTUS_WEEKLY_001
   - AUTUS_MILESTONE_001
   - AUTUS_PREDICTION_001

6️⃣ API 키 발급
   대시보드 → 개발/연동 → API Key

7️⃣ 환경변수 설정
   export ALIMTALK_API_KEY="your-key"
   export ALIMTALK_API_SECRET="your-secret"
   export ALIMTALK_SENDER_KEY="your-sender-key"
```

### 템플릿 예시 (검수용)

**병목 감지 (AUTUS_BOTTLENECK_001)**
```
⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉
```

### 비용

- Solapi: **월 50건 무료**, 이후 건당 약 8원
- 직접 연동: 건당 약 6-7원

### 테스트

```python
from integrations import KakaoAlimtalk

kakao = KakaoAlimtalk()

# 병목 알림 테스트
kakao.send_bottleneck_alert("01012345678", bottleneck_node)
```

---

## 5. 통합 사용법

### 환경변수 설정

```bash
# .env.example을 .env로 복사
cp integrations/.env.example integrations/.env

# .env 파일 편집하여 실제 값 입력
```

### 통합 클라이언트 사용

```python
from integrations import AutusIntegrations

# 모든 서비스 초기화
autus = AutusIntegrations(
    google_credentials="credentials.json",
    make_webhook_url="https://hook.us1.make.com/xxxxx",
    openai_api_key="sk-...",
    kakao_api_key="your-api-key"
)

# 병목 감지 시 모든 채널로 알림
autus.send_everywhere(
    event_type="bottleneck",
    data=bottleneck_node,
    phone_number="01012345678"
)

# AI 분석
analysis = autus.get_ai_analysis(physics_data)
print(analysis)
```

### 자동화 예시

```python
# Physics Map 분석 후 자동 알림
def on_bottleneck_detected(node):
    # 1. AI가 원인 분석
    diagnosis = autus.ai.diagnose_bottleneck(node)
    
    # 2. Make로 워크플로우 트리거
    autus.make.send_bottleneck_alert(node)
    
    # 3. 카카오톡으로 즉시 알림
    autus.kakao.send_bottleneck_alert("01012345678", node)
    
    # 4. Google Sheets에 기록
    autus.sheets.export_physics_data(spreadsheet_id, {"nodes": [node]})
```

---

## 💡 팁

### 비용 최적화

| 서비스 | 무료 티어 | 권장 사용량 |
|--------|----------|-------------|
| Google Sheets | 무제한 | 제한 없음 |
| Make | 1,000 ops/월 | 병목 알림만 |
| OpenAI | 없음 ($5 크레딧) | 주 1-2회 분석 |
| Solapi | 50건/월 | 중요 알림만 |

### 우선순위

1. **필수**: Google Sheets (데이터 저장)
2. **강추**: OpenAI (AI 분석)
3. **편리**: Make (자동화)
4. **선택**: 카카오톡 (모바일 알림)

---

## 🆘 문제 해결

### Google Sheets 권한 오류
```
→ 서비스 계정 이메일에 편집자 권한 부여 확인
```

### Make Webhook 응답 없음
```
→ 시나리오가 ON 상태인지 확인
→ Webhook URL이 정확한지 확인
```

### OpenAI API 오류
```
→ API 키가 유효한지 확인
→ 잔액이 있는지 확인 (Usage 메뉴)
```

### 알림톡 발송 실패
```
→ 템플릿 검수 완료 확인
→ 발신 프로필 승인 확인
→ 수신 번호 형식 확인 (01012345678)
```

---

**도움이 필요하시면 언제든 물어보세요!** 🚀





# 🔗 AUTUS Physics Map 외부 서비스 연동 가이드

> 로그인만 해두시면 자동 연동됩니다!

---

## 📋 목차

1. [Google Sheets](#1-google-sheets)
2. [Make (Integromat)](#2-make-integromat)
3. [OpenAI GPT](#3-openai-gpt)
4. [카카오톡 알림톡](#4-카카오톡-알림톡)
5. [통합 사용법](#5-통합-사용법)

---

## 1. Google Sheets

### 용도
- Physics Map 데이터 자동 저장
- 엑셀 대체 데이터 입력
- 팀 공유 대시보드

### 설정 방법 (5분)

```
1️⃣ Google Cloud Console 접속
   https://console.cloud.google.com

2️⃣ 프로젝트 생성 또는 선택

3️⃣ APIs & Services → Library
   "Google Sheets API" 검색 → 사용 설정

4️⃣ APIs & Services → Credentials
   Create Credentials → Service Account
   
5️⃣ 서비스 계정 생성 후
   Keys → Add Key → Create new key → JSON
   
6️⃣ 다운로드한 JSON을 credentials.json으로 저장
   /Users/oseho/Desktop/autus/integrations/credentials.json

7️⃣ Google Sheets 열기
   서비스 계정 이메일(xxxxx@xxxxx.iam.gserviceaccount.com)에
   편집자 권한 공유
```

### 테스트

```python
from integrations import GoogleSheetsClient

sheets = GoogleSheetsClient("credentials.json")
sheets.create_physics_template("your-spreadsheet-id")
```

---

## 2. Make (Integromat)

### 용도
- 고급 자동화 워크플로우
- 5000+ 앱 연동
- 조건부 분기 처리

### 설정 방법 (10분)

```
1️⃣ Make.com 접속 및 회원가입
   https://make.com

2️⃣ Create a new scenario

3️⃣ 첫 번째 모듈 추가
   Webhooks → Custom webhook → Add
   
4️⃣ Webhook 이름 입력 → Save
   생성된 URL 복사 (https://hook.us1.make.com/xxxxx)

5️⃣ Router 추가 (선택)
   조건별 분기 설정

6️⃣ 액션 모듈 추가
   - Slack: Send a Message
   - Google Sheets: Add a Row
   - Email: Send an Email
   - Notion: Create a Database Item

7️⃣ 시나리오 활성화 (ON)
```

### 추천 시나리오 구조

```
Webhook 수신
    │
    ├── event_type = "bottleneck_alert"
    │   └── Slack 알림 + 이메일 발송
    │
    ├── event_type = "weekly_report"
    │   └── Google Docs 생성 + 이메일 발송
    │
    └── event_type = "physics_update"
        └── Google Sheets 저장
```

### 테스트

```python
from integrations import MakeIntegration

make = MakeIntegration("https://hook.us1.make.com/xxxxx")
make.test_connection()
```

---

## 3. OpenAI GPT

### 용도
- Physics Map 데이터 AI 분석
- 병목 원인 진단
- 전략 조언
- 자연어 질문 답변

### 설정 방법 (2분)

```
1️⃣ OpenAI 플랫폼 접속
   https://platform.openai.com

2️⃣ API Keys 메뉴

3️⃣ Create new secret key
   이름 입력 → Create

4️⃣ 키 복사 (sk-...)
   ⚠️ 이 화면 벗어나면 다시 볼 수 없음!

5️⃣ 환경변수 설정
   export OPENAI_API_KEY="sk-..."
```

### 권장 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 가성비 최고, 빠름 | $0.01/분석 |
| `gpt-4-turbo` | 최고 성능 | $0.03/분석 |
| `gpt-3.5-turbo` | 가장 저렴 | $0.002/분석 |

### 테스트

```python
from integrations import PhysicsMapAdvisor

advisor = PhysicsMapAdvisor()

# 전체 분석
result = advisor.analyze_physics_map(physics_data)
print(result)

# 질문하기
answer = advisor.ask("시너지를 높이려면 어떻게 해야 할까요?")
print(answer)
```

---

## 4. 카카오톡 알림톡

### 용도
- 모바일 즉시 알림
- 병목 감지 알림
- 주간 리포트 발송
- 마일스톤 축하 메시지

### 설정 방법 - Solapi 사용 (권장, 15분)

```
1️⃣ Solapi 가입
   https://solapi.com

2️⃣ 본인 인증 완료

3️⃣ 채널 관리 → 카카오톡 채널 연동
   - 카카오톡 채널이 없으면 먼저 생성
   - https://center.kakao.com

4️⃣ 발신 프로필 등록

5️⃣ 템플릿 등록 (검수 1-2일 소요)
   아래 템플릿 코드 사용:
   - AUTUS_BOTTLENECK_001
   - AUTUS_WEEKLY_001
   - AUTUS_MILESTONE_001
   - AUTUS_PREDICTION_001

6️⃣ API 키 발급
   대시보드 → 개발/연동 → API Key

7️⃣ 환경변수 설정
   export ALIMTALK_API_KEY="your-key"
   export ALIMTALK_API_SECRET="your-secret"
   export ALIMTALK_SENDER_KEY="your-sender-key"
```

### 템플릿 예시 (검수용)

**병목 감지 (AUTUS_BOTTLENECK_001)**
```
⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉
```

### 비용

- Solapi: **월 50건 무료**, 이후 건당 약 8원
- 직접 연동: 건당 약 6-7원

### 테스트

```python
from integrations import KakaoAlimtalk

kakao = KakaoAlimtalk()

# 병목 알림 테스트
kakao.send_bottleneck_alert("01012345678", bottleneck_node)
```

---

## 5. 통합 사용법

### 환경변수 설정

```bash
# .env.example을 .env로 복사
cp integrations/.env.example integrations/.env

# .env 파일 편집하여 실제 값 입력
```

### 통합 클라이언트 사용

```python
from integrations import AutusIntegrations

# 모든 서비스 초기화
autus = AutusIntegrations(
    google_credentials="credentials.json",
    make_webhook_url="https://hook.us1.make.com/xxxxx",
    openai_api_key="sk-...",
    kakao_api_key="your-api-key"
)

# 병목 감지 시 모든 채널로 알림
autus.send_everywhere(
    event_type="bottleneck",
    data=bottleneck_node,
    phone_number="01012345678"
)

# AI 분석
analysis = autus.get_ai_analysis(physics_data)
print(analysis)
```

### 자동화 예시

```python
# Physics Map 분석 후 자동 알림
def on_bottleneck_detected(node):
    # 1. AI가 원인 분석
    diagnosis = autus.ai.diagnose_bottleneck(node)
    
    # 2. Make로 워크플로우 트리거
    autus.make.send_bottleneck_alert(node)
    
    # 3. 카카오톡으로 즉시 알림
    autus.kakao.send_bottleneck_alert("01012345678", node)
    
    # 4. Google Sheets에 기록
    autus.sheets.export_physics_data(spreadsheet_id, {"nodes": [node]})
```

---

## 💡 팁

### 비용 최적화

| 서비스 | 무료 티어 | 권장 사용량 |
|--------|----------|-------------|
| Google Sheets | 무제한 | 제한 없음 |
| Make | 1,000 ops/월 | 병목 알림만 |
| OpenAI | 없음 ($5 크레딧) | 주 1-2회 분석 |
| Solapi | 50건/월 | 중요 알림만 |

### 우선순위

1. **필수**: Google Sheets (데이터 저장)
2. **강추**: OpenAI (AI 분석)
3. **편리**: Make (자동화)
4. **선택**: 카카오톡 (모바일 알림)

---

## 🆘 문제 해결

### Google Sheets 권한 오류
```
→ 서비스 계정 이메일에 편집자 권한 부여 확인
```

### Make Webhook 응답 없음
```
→ 시나리오가 ON 상태인지 확인
→ Webhook URL이 정확한지 확인
```

### OpenAI API 오류
```
→ API 키가 유효한지 확인
→ 잔액이 있는지 확인 (Usage 메뉴)
```

### 알림톡 발송 실패
```
→ 템플릿 검수 완료 확인
→ 발신 프로필 승인 확인
→ 수신 번호 형식 확인 (01012345678)
```

---

**도움이 필요하시면 언제든 물어보세요!** 🚀





# 🔗 AUTUS Physics Map 외부 서비스 연동 가이드

> 로그인만 해두시면 자동 연동됩니다!

---

## 📋 목차

1. [Google Sheets](#1-google-sheets)
2. [Make (Integromat)](#2-make-integromat)
3. [OpenAI GPT](#3-openai-gpt)
4. [카카오톡 알림톡](#4-카카오톡-알림톡)
5. [통합 사용법](#5-통합-사용법)

---

## 1. Google Sheets

### 용도
- Physics Map 데이터 자동 저장
- 엑셀 대체 데이터 입력
- 팀 공유 대시보드

### 설정 방법 (5분)

```
1️⃣ Google Cloud Console 접속
   https://console.cloud.google.com

2️⃣ 프로젝트 생성 또는 선택

3️⃣ APIs & Services → Library
   "Google Sheets API" 검색 → 사용 설정

4️⃣ APIs & Services → Credentials
   Create Credentials → Service Account
   
5️⃣ 서비스 계정 생성 후
   Keys → Add Key → Create new key → JSON
   
6️⃣ 다운로드한 JSON을 credentials.json으로 저장
   /Users/oseho/Desktop/autus/integrations/credentials.json

7️⃣ Google Sheets 열기
   서비스 계정 이메일(xxxxx@xxxxx.iam.gserviceaccount.com)에
   편집자 권한 공유
```

### 테스트

```python
from integrations import GoogleSheetsClient

sheets = GoogleSheetsClient("credentials.json")
sheets.create_physics_template("your-spreadsheet-id")
```

---

## 2. Make (Integromat)

### 용도
- 고급 자동화 워크플로우
- 5000+ 앱 연동
- 조건부 분기 처리

### 설정 방법 (10분)

```
1️⃣ Make.com 접속 및 회원가입
   https://make.com

2️⃣ Create a new scenario

3️⃣ 첫 번째 모듈 추가
   Webhooks → Custom webhook → Add
   
4️⃣ Webhook 이름 입력 → Save
   생성된 URL 복사 (https://hook.us1.make.com/xxxxx)

5️⃣ Router 추가 (선택)
   조건별 분기 설정

6️⃣ 액션 모듈 추가
   - Slack: Send a Message
   - Google Sheets: Add a Row
   - Email: Send an Email
   - Notion: Create a Database Item

7️⃣ 시나리오 활성화 (ON)
```

### 추천 시나리오 구조

```
Webhook 수신
    │
    ├── event_type = "bottleneck_alert"
    │   └── Slack 알림 + 이메일 발송
    │
    ├── event_type = "weekly_report"
    │   └── Google Docs 생성 + 이메일 발송
    │
    └── event_type = "physics_update"
        └── Google Sheets 저장
```

### 테스트

```python
from integrations import MakeIntegration

make = MakeIntegration("https://hook.us1.make.com/xxxxx")
make.test_connection()
```

---

## 3. OpenAI GPT

### 용도
- Physics Map 데이터 AI 분석
- 병목 원인 진단
- 전략 조언
- 자연어 질문 답변

### 설정 방법 (2분)

```
1️⃣ OpenAI 플랫폼 접속
   https://platform.openai.com

2️⃣ API Keys 메뉴

3️⃣ Create new secret key
   이름 입력 → Create

4️⃣ 키 복사 (sk-...)
   ⚠️ 이 화면 벗어나면 다시 볼 수 없음!

5️⃣ 환경변수 설정
   export OPENAI_API_KEY="sk-..."
```

### 권장 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 가성비 최고, 빠름 | $0.01/분석 |
| `gpt-4-turbo` | 최고 성능 | $0.03/분석 |
| `gpt-3.5-turbo` | 가장 저렴 | $0.002/분석 |

### 테스트

```python
from integrations import PhysicsMapAdvisor

advisor = PhysicsMapAdvisor()

# 전체 분석
result = advisor.analyze_physics_map(physics_data)
print(result)

# 질문하기
answer = advisor.ask("시너지를 높이려면 어떻게 해야 할까요?")
print(answer)
```

---

## 4. 카카오톡 알림톡

### 용도
- 모바일 즉시 알림
- 병목 감지 알림
- 주간 리포트 발송
- 마일스톤 축하 메시지

### 설정 방법 - Solapi 사용 (권장, 15분)

```
1️⃣ Solapi 가입
   https://solapi.com

2️⃣ 본인 인증 완료

3️⃣ 채널 관리 → 카카오톡 채널 연동
   - 카카오톡 채널이 없으면 먼저 생성
   - https://center.kakao.com

4️⃣ 발신 프로필 등록

5️⃣ 템플릿 등록 (검수 1-2일 소요)
   아래 템플릿 코드 사용:
   - AUTUS_BOTTLENECK_001
   - AUTUS_WEEKLY_001
   - AUTUS_MILESTONE_001
   - AUTUS_PREDICTION_001

6️⃣ API 키 발급
   대시보드 → 개발/연동 → API Key

7️⃣ 환경변수 설정
   export ALIMTALK_API_KEY="your-key"
   export ALIMTALK_API_SECRET="your-secret"
   export ALIMTALK_SENDER_KEY="your-sender-key"
```

### 템플릿 예시 (검수용)

**병목 감지 (AUTUS_BOTTLENECK_001)**
```
⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉
```

### 비용

- Solapi: **월 50건 무료**, 이후 건당 약 8원
- 직접 연동: 건당 약 6-7원

### 테스트

```python
from integrations import KakaoAlimtalk

kakao = KakaoAlimtalk()

# 병목 알림 테스트
kakao.send_bottleneck_alert("01012345678", bottleneck_node)
```

---

## 5. 통합 사용법

### 환경변수 설정

```bash
# .env.example을 .env로 복사
cp integrations/.env.example integrations/.env

# .env 파일 편집하여 실제 값 입력
```

### 통합 클라이언트 사용

```python
from integrations import AutusIntegrations

# 모든 서비스 초기화
autus = AutusIntegrations(
    google_credentials="credentials.json",
    make_webhook_url="https://hook.us1.make.com/xxxxx",
    openai_api_key="sk-...",
    kakao_api_key="your-api-key"
)

# 병목 감지 시 모든 채널로 알림
autus.send_everywhere(
    event_type="bottleneck",
    data=bottleneck_node,
    phone_number="01012345678"
)

# AI 분석
analysis = autus.get_ai_analysis(physics_data)
print(analysis)
```

### 자동화 예시

```python
# Physics Map 분석 후 자동 알림
def on_bottleneck_detected(node):
    # 1. AI가 원인 분석
    diagnosis = autus.ai.diagnose_bottleneck(node)
    
    # 2. Make로 워크플로우 트리거
    autus.make.send_bottleneck_alert(node)
    
    # 3. 카카오톡으로 즉시 알림
    autus.kakao.send_bottleneck_alert("01012345678", node)
    
    # 4. Google Sheets에 기록
    autus.sheets.export_physics_data(spreadsheet_id, {"nodes": [node]})
```

---

## 💡 팁

### 비용 최적화

| 서비스 | 무료 티어 | 권장 사용량 |
|--------|----------|-------------|
| Google Sheets | 무제한 | 제한 없음 |
| Make | 1,000 ops/월 | 병목 알림만 |
| OpenAI | 없음 ($5 크레딧) | 주 1-2회 분석 |
| Solapi | 50건/월 | 중요 알림만 |

### 우선순위

1. **필수**: Google Sheets (데이터 저장)
2. **강추**: OpenAI (AI 분석)
3. **편리**: Make (자동화)
4. **선택**: 카카오톡 (모바일 알림)

---

## 🆘 문제 해결

### Google Sheets 권한 오류
```
→ 서비스 계정 이메일에 편집자 권한 부여 확인
```

### Make Webhook 응답 없음
```
→ 시나리오가 ON 상태인지 확인
→ Webhook URL이 정확한지 확인
```

### OpenAI API 오류
```
→ API 키가 유효한지 확인
→ 잔액이 있는지 확인 (Usage 메뉴)
```

### 알림톡 발송 실패
```
→ 템플릿 검수 완료 확인
→ 발신 프로필 승인 확인
→ 수신 번호 형식 확인 (01012345678)
```

---

**도움이 필요하시면 언제든 물어보세요!** 🚀





# 🔗 AUTUS Physics Map 외부 서비스 연동 가이드

> 로그인만 해두시면 자동 연동됩니다!

---

## 📋 목차

1. [Google Sheets](#1-google-sheets)
2. [Make (Integromat)](#2-make-integromat)
3. [OpenAI GPT](#3-openai-gpt)
4. [카카오톡 알림톡](#4-카카오톡-알림톡)
5. [통합 사용법](#5-통합-사용법)

---

## 1. Google Sheets

### 용도
- Physics Map 데이터 자동 저장
- 엑셀 대체 데이터 입력
- 팀 공유 대시보드

### 설정 방법 (5분)

```
1️⃣ Google Cloud Console 접속
   https://console.cloud.google.com

2️⃣ 프로젝트 생성 또는 선택

3️⃣ APIs & Services → Library
   "Google Sheets API" 검색 → 사용 설정

4️⃣ APIs & Services → Credentials
   Create Credentials → Service Account
   
5️⃣ 서비스 계정 생성 후
   Keys → Add Key → Create new key → JSON
   
6️⃣ 다운로드한 JSON을 credentials.json으로 저장
   /Users/oseho/Desktop/autus/integrations/credentials.json

7️⃣ Google Sheets 열기
   서비스 계정 이메일(xxxxx@xxxxx.iam.gserviceaccount.com)에
   편집자 권한 공유
```

### 테스트

```python
from integrations import GoogleSheetsClient

sheets = GoogleSheetsClient("credentials.json")
sheets.create_physics_template("your-spreadsheet-id")
```

---

## 2. Make (Integromat)

### 용도
- 고급 자동화 워크플로우
- 5000+ 앱 연동
- 조건부 분기 처리

### 설정 방법 (10분)

```
1️⃣ Make.com 접속 및 회원가입
   https://make.com

2️⃣ Create a new scenario

3️⃣ 첫 번째 모듈 추가
   Webhooks → Custom webhook → Add
   
4️⃣ Webhook 이름 입력 → Save
   생성된 URL 복사 (https://hook.us1.make.com/xxxxx)

5️⃣ Router 추가 (선택)
   조건별 분기 설정

6️⃣ 액션 모듈 추가
   - Slack: Send a Message
   - Google Sheets: Add a Row
   - Email: Send an Email
   - Notion: Create a Database Item

7️⃣ 시나리오 활성화 (ON)
```

### 추천 시나리오 구조

```
Webhook 수신
    │
    ├── event_type = "bottleneck_alert"
    │   └── Slack 알림 + 이메일 발송
    │
    ├── event_type = "weekly_report"
    │   └── Google Docs 생성 + 이메일 발송
    │
    └── event_type = "physics_update"
        └── Google Sheets 저장
```

### 테스트

```python
from integrations import MakeIntegration

make = MakeIntegration("https://hook.us1.make.com/xxxxx")
make.test_connection()
```

---

## 3. OpenAI GPT

### 용도
- Physics Map 데이터 AI 분석
- 병목 원인 진단
- 전략 조언
- 자연어 질문 답변

### 설정 방법 (2분)

```
1️⃣ OpenAI 플랫폼 접속
   https://platform.openai.com

2️⃣ API Keys 메뉴

3️⃣ Create new secret key
   이름 입력 → Create

4️⃣ 키 복사 (sk-...)
   ⚠️ 이 화면 벗어나면 다시 볼 수 없음!

5️⃣ 환경변수 설정
   export OPENAI_API_KEY="sk-..."
```

### 권장 모델

| 모델 | 특징 | 비용 |
|------|------|------|
| `gpt-4o` | 가성비 최고, 빠름 | $0.01/분석 |
| `gpt-4-turbo` | 최고 성능 | $0.03/분석 |
| `gpt-3.5-turbo` | 가장 저렴 | $0.002/분석 |

### 테스트

```python
from integrations import PhysicsMapAdvisor

advisor = PhysicsMapAdvisor()

# 전체 분석
result = advisor.analyze_physics_map(physics_data)
print(result)

# 질문하기
answer = advisor.ask("시너지를 높이려면 어떻게 해야 할까요?")
print(answer)
```

---

## 4. 카카오톡 알림톡

### 용도
- 모바일 즉시 알림
- 병목 감지 알림
- 주간 리포트 발송
- 마일스톤 축하 메시지

### 설정 방법 - Solapi 사용 (권장, 15분)

```
1️⃣ Solapi 가입
   https://solapi.com

2️⃣ 본인 인증 완료

3️⃣ 채널 관리 → 카카오톡 채널 연동
   - 카카오톡 채널이 없으면 먼저 생성
   - https://center.kakao.com

4️⃣ 발신 프로필 등록

5️⃣ 템플릿 등록 (검수 1-2일 소요)
   아래 템플릿 코드 사용:
   - AUTUS_BOTTLENECK_001
   - AUTUS_WEEKLY_001
   - AUTUS_MILESTONE_001
   - AUTUS_PREDICTION_001

6️⃣ API 키 발급
   대시보드 → 개발/연동 → API Key

7️⃣ 환경변수 설정
   export ALIMTALK_API_KEY="your-key"
   export ALIMTALK_API_SECRET="your-secret"
   export ALIMTALK_SENDER_KEY="your-sender-key"
```

### 템플릿 예시 (검수용)

**병목 감지 (AUTUS_BOTTLENECK_001)**
```
⚠️ AUTUS 병목 감지

#{name}님의 돈 흐름에서 병목이 감지되었습니다.

📍 위치: #{location}
💰 유입: #{inflow}
🔴 유출: #{outflow}
📊 유출비율: #{ratio}%

💡 권장 조치:
#{recommendation}

확인하기 👉
```

### 비용

- Solapi: **월 50건 무료**, 이후 건당 약 8원
- 직접 연동: 건당 약 6-7원

### 테스트

```python
from integrations import KakaoAlimtalk

kakao = KakaoAlimtalk()

# 병목 알림 테스트
kakao.send_bottleneck_alert("01012345678", bottleneck_node)
```

---

## 5. 통합 사용법

### 환경변수 설정

```bash
# .env.example을 .env로 복사
cp integrations/.env.example integrations/.env

# .env 파일 편집하여 실제 값 입력
```

### 통합 클라이언트 사용

```python
from integrations import AutusIntegrations

# 모든 서비스 초기화
autus = AutusIntegrations(
    google_credentials="credentials.json",
    make_webhook_url="https://hook.us1.make.com/xxxxx",
    openai_api_key="sk-...",
    kakao_api_key="your-api-key"
)

# 병목 감지 시 모든 채널로 알림
autus.send_everywhere(
    event_type="bottleneck",
    data=bottleneck_node,
    phone_number="01012345678"
)

# AI 분석
analysis = autus.get_ai_analysis(physics_data)
print(analysis)
```

### 자동화 예시

```python
# Physics Map 분석 후 자동 알림
def on_bottleneck_detected(node):
    # 1. AI가 원인 분석
    diagnosis = autus.ai.diagnose_bottleneck(node)
    
    # 2. Make로 워크플로우 트리거
    autus.make.send_bottleneck_alert(node)
    
    # 3. 카카오톡으로 즉시 알림
    autus.kakao.send_bottleneck_alert("01012345678", node)
    
    # 4. Google Sheets에 기록
    autus.sheets.export_physics_data(spreadsheet_id, {"nodes": [node]})
```

---

## 💡 팁

### 비용 최적화

| 서비스 | 무료 티어 | 권장 사용량 |
|--------|----------|-------------|
| Google Sheets | 무제한 | 제한 없음 |
| Make | 1,000 ops/월 | 병목 알림만 |
| OpenAI | 없음 ($5 크레딧) | 주 1-2회 분석 |
| Solapi | 50건/월 | 중요 알림만 |

### 우선순위

1. **필수**: Google Sheets (데이터 저장)
2. **강추**: OpenAI (AI 분석)
3. **편리**: Make (자동화)
4. **선택**: 카카오톡 (모바일 알림)

---

## 🆘 문제 해결

### Google Sheets 권한 오류
```
→ 서비스 계정 이메일에 편집자 권한 부여 확인
```

### Make Webhook 응답 없음
```
→ 시나리오가 ON 상태인지 확인
→ Webhook URL이 정확한지 확인
```

### OpenAI API 오류
```
→ API 키가 유효한지 확인
→ 잔액이 있는지 확인 (Usage 메뉴)
```

### 알림톡 발송 실패
```
→ 템플릿 검수 완료 확인
→ 발신 프로필 승인 확인
→ 수신 번호 형식 확인 (01012345678)
```

---

**도움이 필요하시면 언제든 물어보세요!** 🚀





















