# AUTUS Sync Format Specification
## Version 1.0.0

---

# 1. 개요

동기화는 기기 간 데이터 교환이다.
서버 없이, P2P로, 암호화되어 전송된다.

---

# 2. 핵심 원칙

| 원칙 | 설명 |
|------|------|
| P2P Only | 서버 경유 금지 |
| E2E Encryption | 종단간 암호화 필수 |
| Zero Knowledge | 중간자는 내용 모름 |
| User Control | 사용자가 완전 통제 |

---

# 3. 동기화 방식

## 3.1 QR 코드 동기화
```
기기 A                    기기 B
   │                         │
   │  1. QR 생성              │
   │  ┌─────────┐            │
   │  │ ▄▄▄ ▄▄▄│            │
   │  │ ▄▄▄ ▄▄▄│◄───────────┤ 2. QR 스캔
   │  └─────────┘            │
   │                         │
   │  3. 암호화 키 교환        │
   │◄────────────────────────►
   │                         │
   │  4. 데이터 암호화 전송    │
   │────────────────────────►│
   │                         │
```

## 3.2 로컬 네트워크 동기화
```
기기 A                    기기 B
   │                         │
   │  1. mDNS 발견            │
   │◄────────────────────────►
   │                         │
   │  2. 핸드셰이크            │
   │◄────────────────────────►
   │                         │
   │  3. 암호화 전송           │
   │────────────────────────►│
   │                         │
```

---

# 4. 파일 포맷

## 4.1 Sync Request (.autus.sync)
```yaml
autus: "1.0"
type: "sync_request"

header:
  id: "uuid-v4"
  timestamp: "2024-01-01T00:00:00Z"
  source_device: "device_hash"      # 기기 해시 (ID 아님)
  target_device: "device_hash"      # 선택
  
encryption:
  algorithm: "AES-256-GCM"
  key_exchange: "ECDH-P256"
  
payload:
  type: "full | incremental"
  items:
    - type: "pack"
      name: "weather_pack"
      version: "1.0.0"
      checksum: "sha256_hash"
    - type: "preference"
      key: "theme"
      checksum: "sha256_hash"

verification:
  signature: "ed25519_signature"
  checksum: "sha256_of_payload"
```

## 4.2 Sync Payload (암호화됨)
```yaml
# 복호화 후 내용
autus: "1.0"
type: "sync_payload"

data:
  packs:
    - name: "weather_pack"
      content: "base64_encoded_yaml"
      
  preferences:
    - key: "theme"
      value: "dark"
      
  identity_surface:    # core는 절대 포함 안됨
    preferences: {}
    patterns: {}

metadata:
  exported_at: "2024-01-01T00:00:00Z"
  autus_version: "1.0.0"
```

## 4.3 Sync Response
```yaml
autus: "1.0"
type: "sync_response"

header:
  request_id: "uuid-v4"
  status: "accepted | rejected | partial"
  timestamp: "2024-01-01T00:00:00Z"

result:
  received: 5
  applied: 5
  conflicts: 0
  errors: []

conflicts:            # 충돌 시
  - type: "pack"
    name: "weather_pack"
    local_version: "1.0.0"
    remote_version: "1.1.0"
    resolution: "keep_local | keep_remote | merge"
```

---

# 5. 암호화

## 5.1 키 교환
```
1. 기기 A: ECDH 키쌍 생성
   - private_a, public_a

2. 기기 B: ECDH 키쌍 생성
   - private_b, public_b

3. QR/로컬로 public 키 교환

4. 공유 비밀 계산
   - shared_secret = ECDH(private_a, public_b)
   - shared_secret = ECDH(private_b, public_a)
   - 둘은 동일

5. AES 키 유도
   - aes_key = HKDF(shared_secret, salt, info)
```

## 5.2 데이터 암호화
```
Algorithm: AES-256-GCM
IV: 12 bytes, random
Tag: 16 bytes

encrypted = AES-GCM(key, iv, plaintext)
output = iv || encrypted || tag
```

## 5.3 서명
```
Algorithm: Ed25519
Key: 기기별 고유 키쌍

signature = Ed25519.sign(private_key, payload_hash)
```

---

# 6. QR 코드 스펙

## 6.1 QR 내용
```json
{
  "autus": "1.0",
  "type": "sync_init",
  "device": "device_hash_short",
  "public_key": "base64_ecdh_public",
  "nonce": "random_12_bytes",
  "expires": "2024-01-01T00:05:00Z"
}
```

## 6.2 QR 설정
```
Error Correction: H (30%)
Version: Auto (최소)
Encoding: UTF-8
Max Size: 2KB
Expiry: 5분
```

---

# 7. 충돌 해결

## 7.1 자동 해결

| 상황 | 해결 |
|------|------|
| 버전 다름 | 높은 버전 선택 |
| 시간 다름 | 최신 선택 |
| 내용 동일 | 스킵 |

## 7.2 수동 해결 필요

| 상황 | 처리 |
|------|------|
| 양쪽 수정됨 | 사용자 선택 |
| 삭제 vs 수정 | 사용자 선택 |
| 스키마 충돌 | 사용자 선택 |

## 7.3 충돌 UI
```
⚠️ 충돌 발견: weather_pack

로컬: v1.0.0 (어제 수정)
원격: v1.1.0 (오늘 수정)

[로컬 유지] [원격 사용] [둘 다 유지]
```

---

# 8. 보안 규칙

## 8.1 전송 금지 항목
```yaml
never_sync:
  - identity.core.seed      # 절대 금지
  - api_keys                # 절대 금지
  - passwords               # 절대 금지
  - private_keys            # 절대 금지
```

## 8.2 전송 허용 항목
```yaml
allowed_sync:
  - packs                   # Pack 정의
  - preferences             # 설정
  - identity.surface        # 표면 특성만
  - workflows               # 워크플로우
```

## 8.3 검증
```bash
# 동기화 전 검증
autus sync validate payload.yaml

# 민감 정보 체크
autus sync audit payload.yaml --security
```

---

# 9. 오프라인 동기화

## 9.1 파일 내보내기
```bash
# 암호화된 파일로 내보내기
autus sync export --password "user_password" --output backup.autus.enc

# 내용:
# - 모든 Pack
# - 설정
# - identity.surface (core 제외)
```

## 9.2 파일 가져오기
```bash
# 암호화된 파일에서 가져오기
autus sync import backup.autus.enc --password "user_password"
```

---

# 10. API

## 10.1 동기화 시작
```
POST /sync/init
Content-Type: application/json

{
  "public_key": "base64_ecdh_public",
  "device_hash": "sha256_short"
}

Response:
{
  "session_id": "uuid",
  "public_key": "base64_ecdh_public",
  "expires_at": "2024-01-01T00:05:00Z"
}
```

## 10.2 데이터 전송
```
POST /sync/push
Content-Type: application/octet-stream
X-Session-ID: uuid
X-Signature: ed25519_signature

Body: encrypted_payload

Response:
{
  "received": 5,
  "applied": 5,
  "conflicts": []
}
```

---

# 서명
```
AUTUS Sync Format Specification

Version: 1.0.0
Status: Stable
License: CC0

"서버 없이, 안전하게, 내 기기끼리"
```
