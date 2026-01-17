# 🏛️ AUTUS POST-UI CHECKLIST

> UI 이후 필수 실행 목록

---

## ✅ 구현 완료

### I. UI → Core Engine 연결

- [x] K2 UI → Physics 상태 조회 (Read-only)
- [x] K10 UI → Simulation Frame 조회 (Read-only)
- [x] UI에서 Gate 판정 로직 실행 금지
- [x] UI는 GateState만 수신

**파일:** `backend/api/readonly_api.py`

---

### II. Read-Only Backend API

- [x] `GET /physics/state`
- [x] `GET /simulation/frame`
- [x] `GET /afterimage/{id}`
- [x] `GET /afterimage/replay/{hash}`
- [x] 금지: POST /apply, PUT /update, PATCH /override

**파일:** `backend/api/readonly_api.py`

---

### III. K-Scale Auth/AuthZ

- [x] K2 / K4 / K10 Role 분리
- [x] API 레벨 접근 차단
- [x] K10만 Afterimage Replay 접근 가능
- [x] K2는 Afterimage 존재 자체 인지 불가
- [x] Admin override / Superuser bypass 금지

**파일:** `backend/auth/k_scale_auth.py`

---

### IV. Afterimage Ledger 인프라

- [x] Append-only 테이블 설계
- [x] Hash chaining (이전 해시 포함)
- [x] DB 레벨 UPDATE/DELETE 권한 제거
- [x] 환경 버전 포함

**파일:** `backend/db/afterimage_schema.sql`

---

### V. Simulation Worker

- [x] Worker/Job Queue 분리
- [x] UI thread 차단 금지
- [x] 타임아웃 설정 (30초)
- [x] 실패 시 관측 유지

**파일:** `backend/workers/simulation_worker.py`

---

### VI. 필수 테스트

- [x] 동일 입력 → 동일 Gate
- [x] Gate 전이 (역전이 금지)
- [x] Afterimage 불변성
- [x] Replay 결정론
- [x] K-Scale 권한 격리
- [x] 금지된 작업 검증

**파일:** `tests/test_autus_core.py`

---

## 📁 생성된 파일 목록

```
backend/
├── api/
│   └── readonly_api.py      # Read-Only API
├── auth/
│   └── k_scale_auth.py      # K-Scale 인증/인가
├── db/
│   └── afterimage_schema.sql # Afterimage DB 스키마
└── workers/
    └── simulation_worker.py  # 시뮬레이션 워커

tests/
└── test_autus_core.py       # 필수 테스트
```

---

## 🚀 실행 명령어

### 테스트 실행

```bash
cd /Users/oseho/Desktop/autus
pytest tests/test_autus_core.py -v
```

### DB 스키마 적용 (PostgreSQL)

```bash
psql -d autus -f backend/db/afterimage_schema.sql
```

---

## ⚠️ Go-Live 전 체크리스트

| 항목 | 상태 |
|------|------|
| Apply 버튼 존재 | ❌ 없음 |
| 관리자 우회 가능성 | ❌ 없음 |
| 설명/권고 텍스트 | ❌ 없음 |
| Afterimage 수정 가능성 | ❌ 없음 |
| Replay 불일치 | ❌ 없음 |

---

## 📊 전체 흐름

```
UI (체감/관측)
 → Read-Only API
   → Core Engine
     → Gate 자동 종결
       → Gravity 적용
         → Afterimage 기록
           → Replay / 감사
```

---

> **"AUTUS는 기능을 늘릴수록 위험해지고,
> 제약을 고정할수록 강해진다."**
