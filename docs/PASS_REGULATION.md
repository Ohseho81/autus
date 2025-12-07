# Pass Regulation v1.0

**Autus Pass System - 이동성과 접근성 규칙**

---

## 📋 개요

Pass System은 Autus에서 개인의 이동성과 접근성을 관리하는 체계입니다.
각 Pass는 특정 domain과 cell에서의 권한을 부여합니다.

---

## 🎫 Pass 종류

### 1. LimePass (고용 이동성)
**목적**: 산업 간 경력 이동  
**유효 기간**: 1년  
**갱신 비용**: $100/year

#### 권한
- ✅ 교육 기관과의 커뮤니케이션
- ✅ 직무 기술 등록
- ✅ 경력 인증서 발급
- ✅ 고용주 추천서 수집
- ❌ 국경 통행 (CityPass 필요)

#### 신청 요건
- 신원 확인 (국가 ID / 여권)
- 최소 1년 경력 증명
- 신청국의 거주 증명

---

### 2. CityPass (도시 간 이동)
**목적**: 도시 간 거주 및 이동  
**유효 기간**: 6개월  
**갱신 비용**: $200/6month

#### 권한
- ✅ 다중 도시 거주 등록
- ✅ 도시 간 통행 기록 자동 동기화
- ✅ 위치 기반 서비스
- ✅ 도시별 Cell 접근
- ✅ LimePass의 모든 권한 포함

#### 신청 요건
- LimePass 소유
- 3개월 이상 같은 도시 거주
- 도시 정부 신원 확인

---

### 3. MarsPass (행성 간 이동)
**목적**: 우주 거주 및 행성 간 이동  
**유효 기간**: 2년  
**갱신 비용**: $5,000/2years

#### 권한
- ✅ 모든 CityPass 권한
- ✅ 행성 거주 등록
- ✅ 우주 정거장 접근
- ✅ 행성 간 통행 기록
- ✅ 우주 자원 거래 참여

#### 신청 요건
- CityPass 소유 (최소 2년)
- 우주 거주 의향서
- 국제 우주기구 승인

---

## 📊 Pass 비교표

| 기능 | LimePass | CityPass | MarsPass |
|------|----------|----------|----------|
| 신원 확인 | ✅ | ✅ | ✅ |
| 경력 관리 | ✅ | ✅ | ✅ |
| 도시 이동 | ❌ | ✅ | ✅ |
| 도시 다중 거주 | ❌ | ✅ | ✅ |
| 행성 이동 | ❌ | ❌ | ✅ |
| 유효 기간 | 1년 | 6개월 | 2년 |
| 비용 | $100 | $200 | $5,000 |

---

## 🔐 Pass 발급 프로세스

### Step 1: 신청
```
POST /api/v1/pass/apply/{pass_type}
{
  "applicant_id": "user_id",
  "pass_type": "limepass|citypass|marspass",
  "documents": [...]
}
```

### Step 2: 신원 검증
- Government ID 검증
- 거주지 확인
- 신원 이력 조회

### Step 3: 자격 심사
- Pass 타입별 필수 조건 확인
- 이전 Pass 이력 검증
- 거부 사유 없음 확인

### Step 4: 발급
```json
{
  "pass_id": "pass_20251207_xxxxx",
  "pass_type": "limepass",
  "applicant_id": "user_id",
  "issued_at": "2025-12-07T00:00:00Z",
  "expires_at": "2026-12-07T00:00:00Z",
  "status": "active",
  "permissions": [...]
}
```

---

## 🛡️ Pass 관리

### 유효성 검증
```python
def is_pass_valid(pass_id: str, action: str) -> bool:
    pass_data = get_pass(pass_id)
    
    # 1. 만료 확인
    if pass_data.expires_at < now():
        return False
    
    # 2. 상태 확인
    if pass_data.status != "active":
        return False
    
    # 3. 권한 확인
    if action not in pass_data.permissions:
        return False
    
    return True
```

### Pass 갱신
```
POST /api/v1/pass/{pass_id}/renew
{
  "payment_method": "credit_card|crypto|contract",
  "renewal_years": 1
}
```

### Pass 취소
```
POST /api/v1/pass/{pass_id}/revoke
{
  "reason": "voluntary_surrender|violation|fraud",
  "note": "..."
}
```

---

## 📋 Pass 권한 정의

### LimePass Permissions
```json
{
  "domain": "employment",
  "cells": ["education_cell", "industry_cell", "certification_cell"],
  "actions": [
    "read_institution_data",
    "create_skill_profile",
    "request_recommendation",
    "view_job_market"
  ],
  "restrictions": [
    "no_international_travel",
    "no_multi_city_residence"
  ]
}
```

### CityPass Permissions
```json
{
  "domain": "mobility",
  "cells": ["city_cell_*", "region_cell"],
  "actions": [
    "register_residence",
    "change_location",
    "access_city_services",
    "sync_multi_city_profile"
  ],
  "restrictions": [
    "no_interplanetary_travel"
  ]
}
```

### MarsPass Permissions
```json
{
  "domain": "space",
  "cells": ["planet_cell_*", "station_cell_*"],
  "actions": [
    "register_space_residence",
    "travel_between_planets",
    "access_space_station",
    "trade_space_resources",
    "participate_space_governance"
  ],
  "restrictions": []
}
```

---

## 🔄 Pass 전환 규칙

### LimePass → CityPass
- ✅ 자동 전환 가능 (LimePass 유효한 경우)
- 갱신 비용: CityPass 비용만
- 이전 권한 유지

### CityPass → MarsPass
- ✅ 자동 전환 가능 (2년 이상 CityPass 소유)
- 갱신 비용: MarsPass 비용만
- 이전 권한 유지

### 하위 Pass로 다운그레이드
- ⚠️ 수동 신청 필요
- 상위 Pass 취소 처리
- 환불 정책 적용

---

## 💰 비용 및 결제

### 결제 방법
1. **신용카드**: Visa, Mastercard, Amex
2. **암호화폐**: Bitcoin, Ethereum
3. **계약**: 기관 단체 계약

### 환불 정책
- 발급 후 7일 이내: 100% 환불
- 발급 후 7-30일: 50% 환불
- 발급 후 30일 이상: 환불 불가

### 할인
- 다중 Pass 번들: 15% 할인
- 연간 자동 갱신: 10% 할인
- 비영리 기관: 50% 할인

---

## 🚨 Pass 위반 및 취소

### 위반 사유
1. **신원 사기**: 허위 신원으로 신청
2. **권한 오용**: 허가되지 않은 동작 수행
3. **규칙 위반**: Pass 약관 위반
4. **미납**: 갱신료 미납

### 처리 절차
```
위반 신고 → 조사 (7일) → 청문 기회 (3일) → 판정 → 취소
```

### 취소 후 절차
- Pass ID 무효화
- 7년 간 재신청 금지 (경우에 따라 조정)
- 법적 책임 부담

---

## 📊 Pass 통계

### 2025년 발급 현황
- **LimePass**: 1,234,567명
- **CityPass**: 345,678명
- **MarsPass**: 12,345명

### 갱신률
- **LimePass**: 87.5%
- **CityPass**: 91.2%
- **MarsPass**: 98.7%

---

## 🔮 향후 계획

- Q1 2026: Pass API v2.0 출시
- Q2 2026: Biometric 인증 추가
- Q3 2026: 분산화 Pass 시스템 테스트
- Q4 2026: InterPass (다중 행성) 출시

---

**규정 개정 이력**
- v1.0: 2025-12-07 초판 발행
