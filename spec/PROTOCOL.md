# AUTUS Protocol Specification
## Version 1.0.0

---

# 1. 개요

AUTUS는 프로토콜이다. 제품이 아니다.
누구나 구현할 수 있다. 누구도 소유할 수 없다.

---

# 2. 핵심 파일 포맷

## 2.1 Pack 포맷 (.autus.yaml)
```yaml
# 필수 필드
autus: "1.0"                    # 프로토콜 버전
name: "pack_name"               # Pack 이름 (영문, 소문자, 언더스코어)
version: "1.0.0"                # 시맨틱 버전

# 메타데이터
metadata:
  description: "Pack 설명"
  author: "익명 또는 이름"       # 선택
  license: "MIT"                # 권장: MIT, Apache-2.0, CC0

# 실행 정의
cells:
  - name: "cell_name"           # Cell 이름
    type: "llm | http | local"  # 실행 타입
    prompt: "프롬프트 내용"      # LLM용
    command: "명령어"            # local용
    url: "https://..."          # http용
    input: "이전_cell_output"   # 선택: 입력 소스
    output: "output_name"       # 출력 이름

# 액션 정의 (선택)
actions:
  - type: "write_file | log | notify"
    path: "파일 경로"
    content: "{템플릿}"
```

### 예시: 날씨 Pack
```yaml
autus: "1.0"
name: "weather_pack"
version: "1.0.0"

metadata:
  description: "날씨 정보 조회"
  license: "MIT"

cells:
  - name: "get_weather"
    type: "http"
    url: "https://api.weather.com/current?city={city}"
    output: "weather_data"

  - name: "format_response"
    type: "llm"
    prompt: "다음 날씨 데이터를 친근하게 요약해줘: {weather_data}"
    output: "friendly_weather"

actions:
  - type: "log"
    message: "{friendly_weather}"
```

---

## 2.2 Identity 포맷 (.autus.identity)
```yaml
# 로컬 전용 - 절대 서버 전송 금지
autus: "1.0"
type: "identity"

core:
  seed: "base64_encoded_32_bytes"  # 불변
  created_at: "2024-01-01T00:00:00Z"

surface:                           # 진화 가능
  preferences: {}
  patterns: {}
  history_hash: "sha256_hash"      # 개인 이력 해시 (내용 아님)
```

**규칙:**
- seed는 절대 외부 전송 금지
- surface만 익명 집계 가능
- 파일은 로컬에만 존재

---

## 2.3 Sync 포맷 (.autus.sync)
```yaml
# 기기 간 동기화용
autus: "1.0"
type: "sync"

payload:
  encrypted: true
  algorithm: "AES-256-GCM"
  data: "base64_encrypted_data"

verification:
  checksum: "sha256_hash"
  timestamp: "2024-01-01T00:00:00Z"
```

**규칙:**
- P2P 전송만 허용
- 서버 경유 금지
- QR 코드로 교환 가능

---

# 3. 프로토콜 규칙

## 3.1 필수 준수 (MUST)

| 규칙 | 설명 |
|------|------|
| Zero Identity | 서버에 PII 저장 금지 |
| Local First | 개인 데이터는 로컬만 |
| Open Format | 모든 포맷은 공개 |
| Interoperable | 모든 구현은 호환 |

## 3.2 권장 (SHOULD)

| 규칙 | 설명 |
|------|------|
| Offline First | 오프라인에서도 작동 |
| Minimal Core | 코어는 500줄 이하 |
| Pack Extension | 기능은 Pack으로 확장 |

## 3.3 금지 (MUST NOT)

| 규칙 | 설명 |
|------|------|
| No Tracking | 사용자 추적 금지 |
| No Analytics | 개인 분석 금지 |
| No Ads | 광고 금지 |
| No Lock-in | 종속 금지 |

---

# 4. API 표준

## 4.1 Pack 실행
```
POST /pack/run
Content-Type: application/json

{
  "pack": "weather_pack",
  "inputs": {
    "city": "Seoul"
  }
}
```

**응답:**
```json
{
  "success": true,
  "outputs": {
    "friendly_weather": "서울은 현재 맑고 22도입니다."
  },
  "execution_time_ms": 1234
}
```

## 4.2 Pack 목록
```
GET /packs

Response:
{
  "packs": [
    {
      "name": "weather_pack",
      "version": "1.0.0",
      "description": "날씨 정보 조회"
    }
  ]
}
```

## 4.3 헬스 체크
```
GET /health

Response:
{
  "status": "ok",
  "version": "1.0.0",
  "protocol": "autus"
}
```

---

# 5. 메트릭 표준

## 5.1 수집 허용 (익명만)
```yaml
allowed_metrics:
  - pack_name           # Pack 이름
  - execution_count     # 실행 횟수
  - success_rate        # 성공률
  - avg_execution_time  # 평균 실행 시간
  - error_types         # 에러 유형 (내용 아님)
```

## 5.2 수집 금지
```yaml
forbidden_metrics:
  - user_id
  - ip_address
  - device_id
  - location
  - personal_data
  - input_content
  - output_content
```

---

# 6. 호환성 검증

## 6.1 필수 테스트
```bash
# 1. 포맷 검증
autus validate pack.yaml

# 2. 실행 검증
autus run pack.yaml --test

# 3. 프라이버시 검증
autus audit pack.yaml --privacy
```

## 6.2 호환성 뱃지

| 레벨 | 조건 |
|------|------|
| ✅ AUTUS Compatible | 필수 규칙 준수 |
| ⭐ AUTUS Certified | 필수 + 권장 준수 |
| 🏆 AUTUS Official | 공식 인증 |

---

# 7. 버전 관리

## 7.1 프로토콜 버전

- Major: 호환성 깨지는 변경
- Minor: 하위 호환 기능 추가
- Patch: 버그 수정

## 7.2 하위 호환성

- autus: "1.x" 는 모든 1.x 구현에서 작동해야 함
- 2.0 이전까지 breaking change 금지

---

# 8. 라이선스

- 이 스펙: CC0 (퍼블릭 도메인)
- 누구나 자유롭게 구현 가능
- 상업적 사용 가능
- 수정 가능
- 저작권 표시 불필요

---

# 서명
```
AUTUS Protocol Specification

Version: 1.0.0
Status: Draft
License: CC0

"누구나 구현할 수 있다.
누구도 소유할 수 없다."
```
