# 카카오 계정 상태 웹훅 설정 가이드

**목표**: 카카오 개발자 콘솔 "계정 상태 변경 웹훅" 수신 성공 (200 OK + payload 로그)

---

## 1. 엔드포인트

| 항목 | 값 |
|------|-----|
| Method | POST |
| URL (로컬) | `http://localhost:8000/api/webhook/kakao` |
| URL (터널) | `https://xxxx.trycloudflare.com/api/webhook/kakao` |

**주의**: 카카오 서버가 접근하려면 **공개 HTTPS URL** 필요 (로컬만으로 불가)

---

## 2. Step-by-Step (10분)

### Step 1: Backend 실행

```bash
cd /Users/oseho/Desktop/autus
make dev
```

또는:

```bash
cd backend
python -m venv venv  # 없으면
source venv/bin/activate
pip install fastapi uvicorn
uvicorn main:app --reload --port 8000
```

### Step 2: 공개 URL 생성 (Cloudflare Tunnel)

**새 터미널**에서:

```bash
brew install cloudflared   # 없으면
cloudflared tunnel --url http://localhost:8000
```

출력 예시:
```
Your quick Tunnel has been created! Visit it at:
https://xxxx-xx-xx-xx-xx.trycloudflare.com
```

**웹훅 URL** = `https://xxxx-xx-xx-xx-xx.trycloudflare.com/api/webhook/kakao`

### Step 3: 카카오 콘솔에 등록

1. [카카오 개발자 콘솔](https://developers.kakao.com) → 앱 선택
2. **도구** → **웹훅** → **계정 상태 변경 웹훅**
3. "웹훅 등록" 클릭
4. URL에 `https://xxxx.trycloudflare.com/api/webhook/kakao` 입력
5. 저장
6. **"웹훅 테스트"** 클릭

### Step 4: 수신 확인

- 터미널에 `KAKAO_WEBHOOK_PAYLOAD:` 로그 출력
- `autus_data/kakao_webhook/webhook_*.json` 파일 생성

---

## 3. MVP 동작

| 기능 | 상태 |
|------|------|
| POST 수신 | ✅ |
| 200 OK 응답 | ✅ |
| payload 로그 (콘솔) | ✅ |
| payload 저장 (파일) | ✅ |
| Secret 검증 | ❌ (2단계) |
| DB 저장 | ❌ (2단계) |
| User Unlinked 처리 | ❌ (2단계) |

---

## 4. 로그 위치

```
autus/autus_data/kakao_webhook/
├── webhook_20260220_123456.json
├── webhook_20260220_123512.json
└── ...
```

---

## 5. 트러블슈팅

| 증상 | 대응 |
|------|------|
| 404 | URL에 `/api/webhook/kakao` 포함 확인 |
| 타임아웃 | 3초 내 200 응답 필수 → 즉시 200 OK 후 비동기 처리 |
| 터널 끊김 | cloudflared 재실행 (URL 변경됨 → 콘솔 재등록) |
| payload 안 보임 | Content-Type: application/json 또는 application/secevent+jwt 지원 |

---

## 6. 다음 루프 (2단계)

- [ ] Secret 기반 서명 검증
- [ ] DB 저장 (event_ledger 등)
- [ ] User Unlinked 자동 처리 (개인정보 삭제/차단)
