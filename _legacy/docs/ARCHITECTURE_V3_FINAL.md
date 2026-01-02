# AUTUS-PRIME: Architecture v3.0 Final Specification
## 기생형 에지 컴퓨팅 (Parasitic Edge Computing)

**확정일**: 2025-12-18  
**상태**: LOCKED FOR MVP  
**핵심 원칙**: "비용은 유저가, 핵심 자산(피시스맵)은 우리가"

---

## 🏛 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER'S DEVICE (The Host)                            │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │  📱 Android   │  │  💻 PC/Mac    │  │  ☁️ Google    │                   │
│  │  Phone        │  │  Desktop      │  │  Drive/API   │                   │
│  │               │  │               │  │  (BYOC)      │                   │
│  │  • 통화기록   │  │  • 엑셀 파일  │  │  • Contacts  │                   │
│  │  • SMS 알림   │  │  • LMS 데이터 │  │  • Calendar  │                   │
│  │  • 카톡 키워드│  │  • File Watch │  │  • Gmail     │                   │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘                   │
│          │                  │                  │                           │
│          └──────────────────┼──────────────────┘                           │
│                             ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    LOCAL AGENT (The Parasite)                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │ Data        │  │ SQ          │  │ Auto-Action │  │ Vector      │ │   │
│  │  │ Collector   │→ │ Calculator  │→ │ Trigger     │→ │ Anonymizer  │ │   │
│  │  │ (Zero-API)  │  │ (Local CPU) │  │ (OS Intent) │  │ (Privacy)   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └──────┬──────┘ │   │
│  └──────────────────────────────────────────────────────────────┼───────┘   │
│                                                                  │           │
└──────────────────────────────────────────────────────────────────┼───────────┘
                                                                   │
                              ▼ (익명 벡터 전송 - Pro Only)        │
┌──────────────────────────────────────────────────────────────────┼───────────┐
│                      PHYSIS SERVER (The Hive)                    │           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐│
│  │ License     │  │ Vector      │  │ Physis Map  │  │ Global Insights      ││
│  │ Validator   │  │ Aggregator  │  │ Generator   │  │ (Pro Exclusive)      ││
│  │ (JWT)       │  │ (Anonymous) │  │ (Core IP)   │  │ "전국 상위 1% 패턴"  ││
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────────────────┘│
│                                                                              │
│  💰 서버 비용: 최소화 (데이터 저장 없음, 연산 없음, 벡터만 수집)             │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 7대 확정 사항

### 1. SQ 공식 가중치 (Local Calculation)

```python
# 유저 기기에서 계산, 가중치(W)는 서버에서 암호화 전송
SQ = (W_m × M) + (W_s × S) - (W_t × T)

# 변수 정의
M (Money)   = 로컬 SMS 파싱 → 입금 알림 금액 합계
S (Synergy) = 엑셀 LMS → 성적 변화율 + 등원율
T (Entropy) = 통화시간 + 부정 키워드("죄송", "환불", "취소") 빈도

# 초기 가중치 (서버 제어, 동적 조정 가능)
W_m = 0.4   # 돈 가중치
W_s = 0.4   # 시너지 가중치  
W_t = 0.2   # 엔트로피 가중치 (감점)
```

### 2. 티어 경계값 (Dual Ranking)

| 티어 | 로컬 SQ (내 학원 내) | 글로벌 보정 (Pro) |
|------|---------------------|-------------------|
| **Iron** | 하위 30% | 피시스맵 비교 제공 |
| **Steel** | 30~50% | "지역 평균 대비 +12%" |
| **Gold** | 50~75% | "전국 상위 40%" |
| **Platinum** | 75~90% | "전국 상위 15%" |
| **Diamond** | 상위 10% | "전국 상위 5%" |
| **Sovereign** | 상위 1% | "전국 1% - Golden Path 추천" |

### 3. 노드 데이터 소스 (Zero-Server-Cost)

| 소스 | 데이터 | 수집 방식 | API 비용 |
|------|--------|----------|---------|
| **Android Phone** | 통화기록, SMS(결제알림), 카톡 키워드 | Local App 가로채기 | **₩0** |
| **PC Desktop** | 학원 관리 엑셀, LMS 파일 | File Watcher | **₩0** |
| **Google (BYOC)** | Contacts, Calendar, Gmail | 유저가 `client_secret.json` 발급 | **유저 부담** |

### 4. 자동화 플랫폼 범위 (Client-Side Trigger)

```javascript
// 서버 경유 없음 - OS 직접 호출
const triggers = {
  kakao: "intent://send?text={msg}#Intent;package=com.kakao.talk;end",
  sms: "sms:{phone}?body={msg}",
  call: "tel:{phone}",
  email: "mailto:{email}?subject={subject}&body={body}"
};

// 법적 면책: "유저가 자기 기기에서 버튼을 눌러 앱을 실행한 것"
```

### 5. 수익 모델 (License & Map Access)

| 플랜 | 가격 | 기능 |
|------|------|------|
| **Free** | ₩0 | 데이터 수집, 기본 SQ 계산, 로컬 랭킹만 |
| **Pro** | ₩39,000/월 | 피시스맵 기여 + 글로벌 인사이트 열람 |
| **Enterprise** | 별도 협의 | 다중 지점, API 접근, 커스텀 인사이트 |

### 6. 타겟 사용자

```
1차 타겟: 학원/교습소 원장
  - 이유: 안드로이드 점유율 높음, 통화/문자 데이터 핵심
  - 페인포인트: 학부모 관리, 등록/환불 예측
  - 시장 규모: 약 10만 학원

확장 타겟: 보험 설계사, 부동산 중개사, 영업직
  - 동일 로직: 통화/문자 기반 고객 관리
```

### 7. MVP 범위 (4주 스프린트)

```
┌──────────────────────────────────────────────────────────────────┐
│  Week 1-2: Local Agent (The Parasite)                           │
│  ────────────────────────────────────────────────────────────── │
│  • [React Native] 안드로이드 앱 - 통화/SMS 수집                  │
│  • [Electron] 데스크톱 앱 - 엑셀 파일 감시                       │
│  • [Core] SQ 계산 엔진 (로컬 실행)                               │
│  • [Core] 익명 벡터 변환기                                       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Week 3-4: Physis Server (The Hive)                             │
│  ────────────────────────────────────────────────────────────── │
│  • [FastAPI] 라이선스 검증 API                                   │
│  • [FastAPI] 익명 벡터 수집 API                                  │
│  • [Core] 피시스 맵 생성기 (초기 버전)                           │
│  • [Frontend] 대시보드 (로컬 SQ + Pro 인사이트)                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 핵심 자산 보호

| 자산 | 위치 | 보호 방법 |
|------|------|----------|
| **SQ 가중치 공식** | 서버 | 암호화된 채로 전송, 클라이언트에서 복호화 후 실행 |
| **피시스 맵 알고리즘** | 서버 Only | 절대 클라이언트 노출 금지 |
| **글로벌 벡터 DB** | 서버 | 익명화된 집계 데이터만 저장 |
| **라이선스 키** | 서버 | JWT + 기기 바인딩 |

---

## 📁 프로젝트 구조 (MVP)

```
autus/
├── local-agent/                    # The Parasite
│   ├── mobile/                     # React Native (Android)
│   │   ├── src/
│   │   │   ├── collectors/         # 데이터 수집기
│   │   │   │   ├── CallLogCollector.ts
│   │   │   │   ├── SmsCollector.ts
│   │   │   │   └── KakaoKeywordWatcher.ts
│   │   │   ├── calculators/        # SQ 계산
│   │   │   │   └── SynergyCalculator.ts
│   │   │   ├── triggers/           # 자동화 트리거
│   │   │   │   └── IntentLauncher.ts
│   │   │   └── anonymizers/        # 벡터 익명화
│   │   │       └── VectorAnonymizer.ts
│   │   └── android/
│   │
│   └── desktop/                    # Electron (PC/Mac)
│       ├── src/
│       │   ├── watchers/           # 파일 감시
│       │   │   └── ExcelWatcher.ts
│       │   └── parsers/            # 엑셀 파싱
│       │       └── LmsParser.ts
│       └── electron/
│
├── physis-server/                  # The Hive
│   ├── api/
│   │   ├── license.py              # 라이선스 검증
│   │   ├── vectors.py              # 벡터 수집
│   │   └── insights.py             # Pro 인사이트
│   ├── core/
│   │   ├── physis_map.py           # 피시스 맵 생성
│   │   └── weight_manager.py       # 가중치 암호화 전송
│   └── main.py
│
└── dashboard/                      # 웹 대시보드
    └── src/
```

---

## ✅ 확정 완료

```
[x] 1. SQ 공식 가중치 - 로컬 계산, 서버 제어
[x] 2. 티어 경계값 - 로컬 상대평가 + 글로벌 보정
[x] 3. 노드 데이터 소스 - Zero-Server-Cost (BYOC)
[x] 4. 자동화 플랫폼 - Client-Side Intent Trigger
[x] 5. 수익 모델 - Free/Pro(₩39,000)/Enterprise
[x] 6. 타겟 사용자 - 학원 원장 → 영업직 확장
[x] 7. MVP 범위 - Local Agent + Physis Server
```

---

**Status: READY FOR DEVELOPMENT**
**Next: Turn 1 - Local Agent Core Logic**




